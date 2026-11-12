import { neon } from '@neondatabase/serverless';

let client: ReturnType<typeof neon> | undefined;

export function database() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not configured.');
  client ??= neon(url);
  return client;
}

export async function asActor<T>(actor: string, query: (sql: ReturnType<typeof neon>) => ReturnType<ReturnType<typeof neon>>) {
  const sql = database();
  const [, , rows] = await sql.transaction([
    sql`set local role projectos_runtime`,
    sql`select set_config('projectos.actor', ${actor}, true)`,
    query(sql),
  ]);
  return rows as T[];
}

