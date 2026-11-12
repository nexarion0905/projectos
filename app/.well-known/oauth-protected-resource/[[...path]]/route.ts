import { remoteMcpAuth } from '@/lib/server/remote-mcp';

function metadata(request: Request) {
  return remoteMcpAuth()?.handleMetadataRequest(request) ?? new Response(null, { status: 404 });
}

export { metadata as GET, metadata as OPTIONS };
