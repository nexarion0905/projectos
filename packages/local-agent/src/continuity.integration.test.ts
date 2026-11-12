import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { pathToFileURL } from 'node:url';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { expect, it, vi } from 'vitest';
import { inspectProject, parseManifest } from './manifest.js';
import { registerProject } from './registry.js';
import { restoreManifest } from './restore.js';

const run = promisify(execFile);
const origin = 'https://projectos-fixture.invalid/repo.git';
const git = (root: string, ...args: string[]) => run('git', ['-C', root, ...args]);

it('registers and restores a pinned commit, then connects a metadata-only MCP client', async () => {
  const temp = await mkdtemp(path.join(os.tmpdir(), 'projectos-continuity-'));
  const client = new Client({ name: 'projectos-fixture', version: '1.0.0' });
  try {
    const source = path.join(temp, 'source');
    const home = path.join(temp, 'registry');
    const destination = path.join(temp, 'restored');
    await mkdir(source);
    vi.stubEnv('PROJECTOS_HOME', home);
    await git(source, 'init');
    await git(source, 'remote', 'add', 'origin', origin);
    await writeFile(path.join(source, 'README.md'), 'Pinned content\n');
    await git(source, 'add', 'README.md');
    await git(source, '-c', 'user.name=ProjectOS Test', '-c', 'user.email=test@example.invalid', '-c', 'commit.gpgsign=false', 'commit', '-m', 'fixture');
    await writeFile(path.join(source, '.env'), 'TEST_TOKEN=local-secret-sentinel');
    const manifest = await inspectProject(source, 'Pinned fixture');
    expect(manifest.repository?.url).toBe(origin);
    await registerProject(source, manifest);
    await writeFile(path.join(source, 'README.md'), 'Later content\n');
    await git(source, 'add', 'README.md');
    await git(source, '-c', 'user.name=ProjectOS Test', '-c', 'user.email=test@example.invalid', '-c', 'commit.gpgsign=false', 'commit', '-m', 'later');
    // Route the fixture URL to disposable Git storage without remote credentials.
    vi.stubEnv('GIT_CONFIG_COUNT', '1');
    vi.stubEnv('GIT_CONFIG_KEY_0', `url.${pathToFileURL(source).href}.insteadOf`);
    vi.stubEnv('GIT_CONFIG_VALUE_0', origin);
    await expect(restoreManifest(manifest, destination)).resolves.toMatchObject({ verified: true, commit: manifest.repository?.commit });
    expect((await readFile(path.join(destination, 'README.md'), 'utf8')).replaceAll('\r\n', '\n')).toBe('Pinned content\n');
    await expect(restoreManifest({ ...manifest, repository: { ...manifest.repository, commit: 'f'.repeat(40) } }, path.join(temp, 'missing-commit'))).rejects.toThrow(/pinned commit/);
    await expect(restoreManifest({ ...manifest, schemaVersion: 99 }, path.join(temp, 'corrupt'))).rejects.toThrow();

    await client.connect(new StdioClientTransport({
      command: process.execPath, args: ['--import', 'tsx', 'packages/local-agent/src/mcp.ts'],
      cwd: process.cwd(), env: { PROJECTOS_HOME: home }, stderr: 'pipe',
    }));
    expect((await client.listTools()).tools.map((tool) => tool.name)).toEqual(['projectos_list_projects', 'projectos_get_manifest']);
    const listing = await client.callTool({ name: 'projectos_list_projects', arguments: { limit: 1 } });
    expect(JSON.stringify(listing)).toContain('Pinned fixture');
    const empty = await client.callTool({ name: 'projectos_list_projects', arguments: { offset: 1 } });
    expect(empty).toMatchObject({ content: [{ type: 'text', text: '[]' }] });
    const response = await client.callTool({ name: 'projectos_get_manifest', arguments: { projectId: manifest.id } });
    expect(response).toMatchObject({ content: [{ type: 'text' }] });
    const content = response.content;
    if (!Array.isArray(content) || content[0]?.type !== 'text') throw new Error('Expected MCP manifest text');
    expect(parseManifest(JSON.parse(content[0].text)).id).toBe(manifest.id);
    expect(content[0].text).not.toContain('local-secret-sentinel');
    await expect(client.callTool({ name: 'projectos_get_manifest', arguments: { projectId: crypto.randomUUID() } })).resolves.toMatchObject({ isError: true });
    await expect(client.callTool({ name: 'projectos_get_manifest', arguments: { projectId: '../escape' } })).resolves.toMatchObject({ isError: true });
    await expect(client.callTool({ name: 'projectos_read_file', arguments: {} })).rejects.toThrow(/not found/i);
  } finally {
    await client.close();
    vi.unstubAllEnvs();
    await rm(temp, { recursive: true, force: true });
  }
}, 30_000);
