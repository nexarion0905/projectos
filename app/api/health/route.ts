import { asActor } from '@/lib/server/db';
import { json } from '@/lib/server/http';

export async function GET() {
  if (!process.env.DATABASE_URL || !process.env.NEON_AUTH_BASE_URL || !process.env.NEON_AUTH_COOKIE_SECRET) {
    const required = process.env.PROJECTOS_CLOUD_REQUIRED === 'true';
    return json({ status: required ? 'unavailable' : 'ok', mode: 'local' }, required ? 503 : 200);
  }
  try {
    await asActor('', (sql) => sql`select id from public.projectos_workspaces limit 1`);
    return json({ status: 'ok', mode: 'cloud' });
  } catch {
    console.error(JSON.stringify({ event: 'projectos_api_failure', operation: 'health.database' }));
    return json({ status: 'unavailable', mode: 'cloud' }, 503);
  }
}
