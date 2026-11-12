import { McpServer } from '@modelcontextprotocol/server';
import { StdioServerTransport } from '@modelcontextprotocol/server/stdio';
import { z } from 'zod';
import { parseManifest } from './manifest.js';
import { readRegistry } from './registry.js';

const server = new McpServer({ name: 'projectos-local-agent', version: '1.0.0' });
server.registerTool('projectos_list_projects', {
  description: 'List up to 25 local projects at a time. Increase offset to retrieve another page.',
  inputSchema: { offset: z.number().int().min(0).max(500).optional(), limit: z.number().int().min(1).max(25).optional() },
}, async ({ offset = 0, limit = 25 }) => {
  const projects = await readRegistry();
  const text = JSON.stringify(projects.slice(offset, offset + limit).map(({ id, name, root, manifest }) => {
    const parsed = parseManifest(manifest);
    return { id, name, root, repository: parsed.repository, runtime: parsed.runtime, requiredEnvironment: parsed.requiredEnvironment };
  }));
  if (Buffer.byteLength(text) > 256_000) {
    return { content: [{ type: 'text', text: 'This page is too large. Retry with a smaller limit.' }], isError: true };
  }
  return { content: [{ type: 'text', text }] };
});
server.registerTool('projectos_get_manifest', { description: 'Return the portable manifest for one locally registered project.', inputSchema: { projectId: z.string().uuid() } }, async ({ projectId }) => {
  const entry = (await readRegistry()).find((item) => item.id === projectId);
  if (!entry) return { content: [{ type: 'text', text: 'Project is not registered on this device.' }], isError: true };
  const text = JSON.stringify(parseManifest(entry.manifest), null, 2);
  if (Buffer.byteLength(text) > 512_000) return { content: [{ type: 'text', text: 'This manifest exceeds the MCP response limit.' }], isError: true };
  return { content: [{ type: 'text', text }] };
});

await server.connect(new StdioServerTransport());
