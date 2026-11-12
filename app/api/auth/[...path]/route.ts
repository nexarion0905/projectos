import { auth } from '@/lib/auth/server';
import { apiError, assertSameOrigin, json } from '@/lib/server/http';
import { remoteMcpAuth } from '@/lib/server/remote-mcp';

type Context = { params: Promise<{ path: string[] }> };

const getPaths = new Set(['get-session', 'verify-email']);
const postPaths = new Set([
  'sign-in/email', 'sign-up/email', 'sign-out', 'update-user',
  'send-verification-email', 'request-password-reset', 'reset-password',
]);
const oauthPostPaths = new Set(['oauth2/continue', 'oauth2/consent', 'oauth2/public-client-prelogin']);

export async function GET(request: Request, context: Context) {
  const path = (await context.params).path.join('/');
  const oauthClient = path === 'oauth2/public-client' && remoteMcpAuth();
  if (!oauthClient && !getPaths.has(path) && !/^reset-password\/[a-zA-Z0-9_-]+$/.test(path)) {
    return json({ error: 'Account operation unavailable.' }, 404);
  }
  if (!auth) return json({ error: 'Cloud accounts are unavailable.' }, 503);
  return auth.handler().GET(request, context);
}

export async function POST(request: Request, context: Context) {
  try {
    const path = (await context.params).path.join('/');
    if (!postPaths.has(path) && !(oauthPostPaths.has(path) && remoteMcpAuth())) return json({ error: 'Account operation unavailable.' }, 404);
    if (!auth) return json({ error: 'Cloud accounts are unavailable.' }, 503);
    assertSameOrigin(request);
    return await auth.handler().POST(request, context);
  } catch (error) {
    return apiError(error, 'auth.request');
  }
}
