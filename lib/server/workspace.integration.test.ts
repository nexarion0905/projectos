import { readFile } from 'node:fs/promises';
import { generateKeyPairSync, sign } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { addMember, createWorkspace, ensurePersonalWorkspace, listWorkspaces, readWorkspaceSnapshot, registerAccount, removeMember, writeWorkspaceSnapshot } from './workspace';
import { consumeMcpRequest, setMcpAccess } from './remote-mcp';
import { POST as remoteMcp } from '../../app/mcp/route';
import { GET as resourceMetadata } from '../../app/.well-known/oauth-protected-resource/[[...path]]/route';

// Real PostgreSQL runs every application statement and RLS policy. Only the
// Neon HTTP transport is replaced with the disposable in-process database.
const fixture = vi.hoisted(() => ({ db: undefined as PGlite | undefined }));
vi.mock('./db', () => ({
  asActor: async (actor: string, query: (sql: (strings: TemplateStringsArray, ...values: unknown[]) => Promise<unknown>) => Promise<unknown>) => {
    return fixture.db!.transaction(async (tx) => {
      await tx.exec('set local role projectos_runtime');
      await tx.query("select set_config('projectos.actor', $1, true)", [actor]);
      return query(async (strings, ...values) => {
        const sql = strings.reduce((output, segment, index) => output + (index ? `$${index}` : '') + segment, '');
        return (await tx.query(sql, values)).rows;
      });
    });
  },
}));

const backup = {
  app: 'ProjectOS', schemaVersion: 1, exportedAt: new Date().toISOString(),
  data: { projects: [], tasks: [], milestones: [], research: [], nodes: [], edges: [] },
};

beforeAll(async () => {
  fixture.db = new PGlite();
  await fixture.db.exec(await readFile(new URL('../../db/migrations/0001_neon_projectos.sql', import.meta.url), 'utf8'));
  for (const actor of ['alice', 'bob', 'owner', 'stranger', 'reviewer', 'viewer', 'editor', 'admin']) {
    await registerAccount(actor);
    await registerAccount(actor);
  }
}, 30_000);
afterAll(async () => { await fixture.db?.close(); });

describe('workspace persistence and PostgreSQL permissions', () => {
  it('creates personal workspaces idempotently and independently of team ownership', async () => {
    const team = await createWorkspace('alice', 'Team');
    const personal = await ensurePersonalWorkspace('alice', 'Personal');
    expect(await ensurePersonalWorkspace('alice', 'Again')).toBe(personal);
    expect(team).not.toBe(personal);
    expect(await listWorkspaces('alice')).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: team, kind: 'team', role: 'owner' }),
      expect.objectContaining({ id: personal, kind: 'personal', role: 'owner' }),
    ]));
    await expect(addMember('alice', personal, 'bob', 'viewer')).rejects.toMatchObject({ status: 403 });
    expect(await listWorkspaces('bob')).toEqual([]);
  });

  it('enforces isolation, write permissions, ownership, removal and version conflicts', async () => {
    const team = await createWorkspace('owner', 'Testing isolation');
    const unrelated = await createWorkspace('stranger', 'Separate team');
    await writeWorkspaceSnapshot('owner', team, { ...backup, unknownSecret: 'must-not-be-stored' }, 0);
    await expect(readWorkspaceSnapshot('stranger', team)).rejects.toMatchObject({ status: 403 });
    await expect(writeWorkspaceSnapshot('stranger', team, backup, 1)).rejects.toMatchObject({ status: 403 });
    await expect(removeMember('stranger', team, 'owner')).rejects.toMatchObject({ status: 403 });
    await expect(readWorkspaceSnapshot('owner', unrelated)).rejects.toMatchObject({ status: 403 });
    await addMember('owner', team, 'reviewer', 'reviewer');
    await addMember('owner', team, 'viewer', 'viewer');
    await addMember('owner', team, 'editor', 'editor');
    await addMember('owner', team, 'admin', 'admin');
    await expect(readWorkspaceSnapshot('reviewer', team)).resolves.toMatchObject({ version: 1 });
    await expect(writeWorkspaceSnapshot('viewer', team, backup, 1)).rejects.toMatchObject({ status: 403 });
    await expect(addMember('editor', team, 'editor', 'admin')).rejects.toMatchObject({ status: 403 });
    await expect(addMember('admin', team, 'owner', 'viewer')).rejects.toMatchObject({ status: 403 });
    await expect(addMember('owner', team, 'unregistered', 'viewer')).rejects.toMatchObject({ code: '23503' });
    await expect(addMember('admin', team, 'viewer', 'admin')).rejects.toMatchObject({ status: 403 });
    await expect(removeMember('admin', team, 'owner')).rejects.toMatchObject({ status: 403 });
    await expect(writeWorkspaceSnapshot('editor', team, backup, 0)).rejects.toMatchObject({ status: 409 });
    await expect(writeWorkspaceSnapshot('editor', team, backup, 1)).resolves.toMatchObject({ version: 2 });
    await expect(writeWorkspaceSnapshot('owner', team, backup, 1)).rejects.toMatchObject({ status: 409 });
    await removeMember('admin', team, 'editor');
    await expect(readWorkspaceSnapshot('editor', team)).rejects.toMatchObject({ status: 403 });
    const rows = await fixture.db!.query("select data ? 'unknownSecret' as extra from public.projectos_workspace_snapshots");
    expect(rows.rows).toEqual([{ extra: false }]);
  });

  it('denies direct reads without an actor and direct deletes under the runtime role', async () => {
    await fixture.db!.transaction(async (tx) => {
      await tx.exec('set local role projectos_runtime');
      expect((await tx.query('select id from public.projectos_workspaces')).rows).toEqual([]);
    });
    await expect(fixture.db!.transaction(async (tx) => {
      await tx.exec('set local role projectos_runtime');
      await tx.query('delete from public.projectos_workspace_snapshots');
    })).rejects.toMatchObject({ code: '42501' });
  });

  it('requires MCP opt-in and applies a shared per-actor request budget', async () => {
    await registerAccount('mcp-limit-fixture');
    expect(await consumeMcpRequest('mcp-limit-fixture')).toBe('disabled');
    await setMcpAccess('mcp-limit-fixture', true);
    await fixture.db!.exec(`
      update public.projectos_accounts set mcp_window = date_trunc('minute', statement_timestamp()), mcp_requests = 59
      where user_id = 'mcp-limit-fixture'
    `);
    expect(await consumeMcpRequest('mcp-limit-fixture')).toBe('allowed');
    expect(await consumeMcpRequest('mcp-limit-fixture')).toBe('limited');
    await setMcpAccess('mcp-limit-fixture', false);
    expect(await consumeMcpRequest('mcp-limit-fixture')).toBe('disabled');
  });

  it('validates MCP tokens and exposes only authorized metadata over Streamable HTTP', async () => {
    const issuer = 'https://auth.example.invalid/db/auth';
    const resource = 'https://projectos.example.invalid/mcp';
    const jwks = `${issuer}/.well-known/jwks.json`;
    const { privateKey, publicKey } = generateKeyPairSync('ed25519');
    const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'fixture', alg: 'EdDSA', use: 'sig' };
    const encode = (input: object) => Buffer.from(JSON.stringify(input)).toString('base64url');
    const now = Math.floor(Date.now() / 1000);
    function token(overrides: Record<string, unknown> = {}) {
      const payload = encode({ iss: issuer, aud: resource, sub: 'mcp-user', iat: now, exp: now + 300, scope: 'openid', ...overrides });
      const message = `${encode({ alg: 'EdDSA', kid: 'fixture' })}.${payload}`;
      return `${message}.${sign(null, Buffer.from(message), privateKey).toString('base64url')}`;
    }
    vi.stubEnv('PROJECTOS_MCP_RESOURCE', resource);
    vi.stubEnv('NEON_AUTH_BASE_URL', issuer);
    vi.stubGlobal('fetch', async (input: URL | string) => {
      if (String(input) === `${issuer}/.well-known/oauth-authorization-server`) return Response.json({ issuer, jwks_uri: jwks });
      if (String(input) === jwks) return Response.json({ keys: [jwk] });
      throw new Error('Unexpected network request');
    });
    const client = new Client({ name: 'ProjectOS remote fixture', version: '1.0.0' });
    try {
      const discovery = resourceMetadata(new Request('https://projectos.example.invalid/.well-known/oauth-protected-resource/mcp'));
      expect(await discovery.json()).toMatchObject({ resource, authorization_servers: [issuer], scopes_supported: ['openid'] });
      const post = (bearer?: string) => remoteMcp(new Request(resource, {
        method: 'POST', headers: bearer ? { Authorization: `Bearer ${bearer}` } : {},
      }));
      const missing = await post();
      expect(missing.status).toBe(401);
      expect(missing.headers.get('www-authenticate')).toContain('oauth-protected-resource');
      expect((await post('invalid')).status).toBe(401);
      expect((await post(token({ exp: now - 10 }))).status).toBe(401);
      expect((await post(token({ aud: 'https://elsewhere.example.invalid' }))).status).toBe(401);
      expect((await post(token({ iss: `${issuer}-other` }))).status).toBe(401);
      expect((await post(token({ scope: 'profile' }))).status).toBe(403);
      expect((await post(token())).status).toBe(403);

      await registerAccount('mcp-user');
      await setMcpAccess('mcp-user', true);
      const mine = await createWorkspace('mcp-user', 'MCP fixture');
      const other = await createWorkspace('stranger', 'Private fixture');
      await writeWorkspaceSnapshot('mcp-user', mine, backup, 0);
      await client.connect(new StreamableHTTPClientTransport(new URL(resource), {
        requestInit: { headers: { Authorization: `Bearer ${token()}` } },
        fetch: (input, init) => remoteMcp(new Request(input, init)),
      }));
      expect((await client.listTools()).tools.map((tool) => tool.name)).toEqual(['projectos_list_workspaces', 'projectos_list_projects']);
      const own = await client.callTool({ name: 'projectos_list_projects', arguments: { workspaceId: mine } });
      expect(own).toMatchObject({ content: [{ type: 'text', text: '{"projects":[],"version":1}' }] });
      const denied = await client.callTool({ name: 'projectos_list_projects', arguments: { workspaceId: other } });
      expect(denied).toMatchObject({ isError: true });
      await setMcpAccess('mcp-user', false);
      expect((await post(token())).status).toBe(403);
    } finally {
      await client.close();
      vi.unstubAllGlobals();
      vi.unstubAllEnvs();
    }
  });
});
