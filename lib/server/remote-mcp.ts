import { McpServer, WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/server';
import { createMcpAuth } from '@neon/oauth/mcp';
import { z } from 'zod';
import { asActor } from './db';
import { HttpError } from './http';
import { listWorkspaces, readWorkspaceSnapshot } from './workspace';

export const mcpScope = 'openid';
let auth: ReturnType<typeof createMcpAuth> | undefined;

export function remoteMcpAuth() {
  const { PROJECTOS_MCP_RESOURCE: resource, NEON_AUTH_BASE_URL: baseUrl } = process.env;
  if (!resource || !baseUrl) return undefined;
  const url = new URL(resource);
  if (resource !== `${url.origin}/mcp` || url.protocol !== 'https:') throw new Error('Invalid MCP resource configuration.');
  auth ??= createMcpAuth({ baseUrl, resource, scopesSupported: [mcpScope], clockTolerance: 0 });
  return auth;
}

export async function mcpAccess(actor: string) {
  const [row] = await asActor<{ mcp_enabled: boolean }>(actor, (sql) => sql`
    select mcp_enabled from public.projectos_accounts where user_id = public.projectos_actor()
  `);
  return row?.mcp_enabled ?? false;
}

export async function setMcpAccess(actor: string, enabled: boolean) {
  await asActor(actor, (sql) => sql`
    update public.projectos_accounts set mcp_enabled = ${enabled} where user_id = public.projectos_actor()
  `);
}

export async function consumeMcpRequest(actor: string) {
  const [row] = await asActor<{ access: 'allowed' | 'limited' | 'disabled' }>(actor, (sql) => sql`
    select public.projectos_consume_mcp_request() as access
  `);
  return row.access;
}

const pageInput = { offset: z.number().int().min(0).max(10_000).default(0) };
const pageSize = 25;
const annotations = { readOnlyHint: true, destructiveHint: false, openWorldHint: false };

export async function handleRemoteMcp(request: Request, actor: string) {
  const server = new McpServer({ name: 'projectos-cloud-metadata', version: '1.0.0' });
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined, enableJsonResponse: true, maxRequestBodySize: 8192,
  });
  const content = (value: unknown) => ({ content: [{ type: 'text' as const, text: JSON.stringify(value) }] });

  server.registerTool('projectos_list_workspaces', {
    description: 'List cloud workspace names and membership roles for the signed-in user.',
    inputSchema: pageInput, annotations,
  }, async ({ offset }) => content(await listWorkspaces(actor, pageSize, offset)));

  server.registerTool('projectos_list_projects', {
    description: 'List project names and lifecycle metadata from the latest authorized workspace backup.',
    inputSchema: { workspaceId: z.uuid(), ...pageInput }, annotations,
  }, async ({ workspaceId, offset }) => {
    try {
      const { data, version } = await readWorkspaceSnapshot(actor, workspaceId);
      const projects = data?.projects.slice(offset, offset + pageSize).map(({ id, name, status, updatedAt }) => ({
        id, name, status, updatedAt,
      })) ?? [];
      return content({ projects, version });
    } catch (error) {
      if (!(error instanceof HttpError) || error.status !== 403) {
        console.error(JSON.stringify({ event: 'projectos_api_failure', operation: 'mcp.projects' }));
      }
      return { ...content({ error: 'Workspace metadata unavailable.' }), isError: true };
    }
  });
  await server.connect(transport);
  try {
    return await transport.handleRequest(request);
  } finally {
    await server.close();
  }
}
