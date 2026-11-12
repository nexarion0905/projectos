import { apiError, HttpError, json, readJson } from '@/lib/server/http';
import { mcpAccess, remoteMcpAuth, setMcpAccess } from '@/lib/server/remote-mcp';
import { currentUser, registerAccount } from '@/lib/server/workspace';

export async function GET() {
  try {
    const user = await currentUser();
    return json({ available: Boolean(remoteMcpAuth()), enabled: await mcpAccess(user.id) });
  } catch (error) {
    return apiError(error, 'mcp.access.read');
  }
}

export async function PUT(request: Request) {
  try {
    const user = await currentUser();
    const { enabled } = await readJson(request);
    if (typeof enabled !== 'boolean') throw new HttpError(400, 'Choose whether to allow remote MCP.');
    if (enabled && !remoteMcpAuth()) throw new HttpError(503, 'Remote MCP is unavailable.');
    await registerAccount(user.id);
    await setMcpAccess(user.id, enabled);
    return json({ enabled });
  } catch (error) {
    return apiError(error, 'mcp.access.write');
  }
}
