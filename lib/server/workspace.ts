import { asActor } from './db';
import { HttpError } from './http';
import { parseBackup } from '../../features/core/validation';

export type WorkspaceRole = 'owner' | 'admin' | 'editor' | 'reviewer' | 'viewer';
export const memberRoles = ['admin', 'editor', 'reviewer', 'viewer'] as const;
type MemberRole = typeof memberRoles[number];
export const snapshotLimit = 900_000;

export async function currentUser() {
  const { auth } = await import('../auth/server');
  if (!auth) throw new HttpError(503, 'Cloud accounts are unavailable.');
  const { data } = await auth.getSession({ query: { disableCookieCache: 'true' } });
  if (!data?.user) throw new HttpError(401, 'Sign in to continue.');
  if (!data.user.emailVerified) throw new HttpError(403, 'Verify your email to use cloud workspaces.');
  return data.user;
}

export async function registerAccount(userId: string) {
  await asActor(userId, (sql) => sql`
    insert into public.projectos_accounts (user_id) values (${userId}) on conflict do nothing
  `);
}

export function listWorkspaces(userId: string, limit: number | null = null, offset = 0) {
  return asActor<{ id: string; name: string; kind: string; role: WorkspaceRole }>(userId, (sql) => sql`
    select id, name, kind, public.projectos_role(id) as role
    from public.projectos_workspaces order by created_at asc, id limit ${limit} offset ${offset}
  `);
}

export async function createWorkspace(userId: string, name: string, kind: 'personal' | 'team' = 'team') {
  const [row] = await asActor<{ id: string }>(userId, (sql) => sql`
    select public.projectos_create_workspace(${name}, ${kind}) as id
  `);
  return row.id;
}

export function ensurePersonalWorkspace(userId: string, name: string) {
  return createWorkspace(userId, name, 'personal');
}

export async function assertWorkspaceAccess(userId: string, workspaceId: string, minimum: WorkspaceRole = 'viewer') {
  const [row] = await asActor<{ role: WorkspaceRole | null }>(userId, (sql) => sql`
    select public.projectos_role(${workspaceId}) as role
  `);
  const rank: Record<WorkspaceRole, number> = { viewer: 1, reviewer: 1, editor: 2, admin: 3, owner: 4 };
  if (!row?.role || rank[row.role] < rank[minimum]) throw new HttpError(403, 'Workspace access denied.');
  return row.role;
}

export async function listMembers(userId: string, workspaceId: string) {
  await assertWorkspaceAccess(userId, workspaceId, 'admin');
  return asActor<{ user_id: string; role: WorkspaceRole }>(userId, (sql) => sql`
    select user_id, role from public.projectos_workspace_members
    where workspace_id = ${workspaceId} order by created_at asc
  `);
}

export async function addMember(userId: string, workspaceId: string, memberId: string, role: MemberRole) {
  const [row] = await asActor<{ user_id: string }>(userId, (sql) => sql`
    insert into public.projectos_workspace_members (workspace_id, user_id, role)
    select ${workspaceId}::uuid, ${memberId}, ${role}
    where public.projectos_can_manage_member(${workspaceId}, ${memberId}, ${role})
      and not exists (
        select 1 from public.projectos_workspace_members m
        where m.workspace_id = ${workspaceId} and m.user_id = ${memberId}
          and not public.projectos_can_manage_member(m.workspace_id, m.user_id, m.role)
      )
    on conflict (workspace_id, user_id) do update set role = excluded.role
    returning user_id
  `);
  if (!row) throw new HttpError(403, 'Membership change denied.');
}

export async function removeMember(userId: string, workspaceId: string, memberId: string) {
  const [row] = await asActor<{ user_id: string }>(userId, (sql) => sql`
    delete from public.projectos_workspace_members where workspace_id = ${workspaceId} and user_id = ${memberId}
    returning user_id
  `);
  if (!row) throw new HttpError(403, 'Membership change denied.');
}

export async function readWorkspaceSnapshot(userId: string, workspaceId: string) {
  await assertWorkspaceAccess(userId, workspaceId);
  const [row] = await asActor<{ data: unknown; version: number; updated_at: string }>(userId, (sql) => sql`
    select data, version, updated_at from public.projectos_workspace_snapshots where workspace_id = ${workspaceId}
  `);
  return row ? { data: parseBackup(row.data), version: row.version, updatedAt: row.updated_at } : { data: null, version: 0 };
}

export async function writeWorkspaceSnapshot(userId: string, workspaceId: string, input: unknown, expectedVersion: number) {
  await assertWorkspaceAccess(userId, workspaceId, 'editor');
  let serialized: string;
  try {
    const data = parseBackup(input);
    serialized = JSON.stringify({ app: 'ProjectOS', schemaVersion: 1, exportedAt: new Date().toISOString(), data });
  } catch {
    throw new HttpError(400, 'Invalid ProjectOS backup.');
  }
  if (Buffer.byteLength(serialized) > snapshotLimit) throw new HttpError(413, 'Workspace backup is too large.');
  const [row] = await asActor<{ version: number; updated_at: string }>(userId, (sql) => expectedVersion === 0
    ? sql`insert into public.projectos_workspace_snapshots (workspace_id, data)
           values (${workspaceId}, ${serialized}::jsonb) on conflict (workspace_id) do nothing returning version, updated_at`
    : sql`update public.projectos_workspace_snapshots set data = ${serialized}::jsonb,
           version = version + 1, updated_at = now()
           where workspace_id = ${workspaceId} and version = ${expectedVersion} returning version, updated_at`);
  if (!row) throw new HttpError(409, 'A newer cloud backup exists. Read the latest version before uploading.');
  return { version: row.version, updatedAt: row.updated_at };
}

export function isWorkspaceName(value: string) {
  return value.trim().length >= 1 && value.trim().length <= 120;
}

export function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function isUserId(value: string) {
  return /^[a-zA-Z0-9._:@-]{1,180}$/.test(value);
}
