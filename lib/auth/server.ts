import { createNeonAuth } from '@neon/auth/next/server';

const baseUrl = process.env.NEON_AUTH_BASE_URL;
const cookieSecret = process.env.NEON_AUTH_COOKIE_SECRET;

export const auth = baseUrl && cookieSecret
  ? createNeonAuth({
      baseUrl,
      cookies: { secret: cookieSecret, sessionDataTtl: 300 },
      logger: {
        error: () => console.error(JSON.stringify({ event: 'projectos_auth_upstream_error' })),
        warn: () => console.warn(JSON.stringify({ event: 'projectos_auth_upstream_warning' })),
      },
    })
  : null;


