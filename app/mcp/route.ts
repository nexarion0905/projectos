import { apiError, json } from '@/lib/server/http';
import { consumeMcpRequest, handleRemoteMcp, mcpScope, remoteMcpAuth } from '@/lib/server/remote-mcp';

async function handle(request: Request) {
  try {
    const auth = remoteMcpAuth();
    if (!auth) return json({ error: 'Remote MCP is unavailable.' }, 404);
    const origin = request.headers.get('origin');
    if (origin && origin !== new URL(auth.resource).origin) return json({ error: 'Request origin denied.' }, 403);
    const verified = await auth.requireBearerAuth({ requiredScopes: [mcpScope] })(request);
    if (verified instanceof Response) {
      verified.headers.set('Cache-Control', 'private, no-store');
      return verified;
    }
    if (request.method !== 'POST') return new Response(null, { status: 405, headers: { Allow: 'POST', 'Cache-Control': 'no-store' } });
    const access = await consumeMcpRequest(verified.sub);
    if (access === 'disabled') return json({ error: 'Enable remote MCP access in ProjectOS cloud settings.' }, 403);
    if (access === 'limited') return new Response(null, { status: 429, headers: { 'Retry-After': '60', 'Cache-Control': 'no-store' } });
    const response = await handleRemoteMcp(request, verified.sub);
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  } catch (error) {
    return apiError(error, 'mcp.request');
  }
}

export { handle as POST, handle as GET, handle as DELETE };
