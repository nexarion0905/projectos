-- Unapplied baseline. Run as a migration owner separate from the runtime login.
begin;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'projectos_runtime') then
    create role projectos_runtime nologin nobypassrls;
  end if;
end $$;

create table public.projectos_accounts (
  user_id text primary key check (char_length(user_id) between 1 and 180),
  mcp_enabled boolean not null default false,
  mcp_window timestamptz,
  mcp_requests integer not null default 0 check (mcp_requests between 0 and 60),
  created_at timestamptz not null default now()
);

create table public.projectos_workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 120),
  owner_id text not null references public.projectos_accounts(user_id) on delete restrict,
  kind text not null check (kind in ('personal', 'team')),
  created_at timestamptz not null default now()
);
create unique index projectos_one_personal_workspace
  on public.projectos_workspaces(owner_id) where kind = 'personal';

create table public.projectos_workspace_members (
  workspace_id uuid not null references public.projectos_workspaces(id) on delete cascade,
  user_id text not null references public.projectos_accounts(user_id) on delete restrict,
  role text not null check (role in ('owner', 'admin', 'editor', 'reviewer', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);
create index projectos_workspace_members_user_idx on public.projectos_workspace_members(user_id);
create unique index projectos_one_workspace_owner
  on public.projectos_workspace_members(workspace_id) where role = 'owner';

create table public.projectos_workspace_snapshots (
  workspace_id uuid primary key references public.projectos_workspaces(id) on delete cascade,
  data jsonb not null check (jsonb_typeof(data) = 'object' and octet_length(data::text) <= 1048576),
  version integer not null default 1 check (version > 0),
  updated_at timestamptz not null default now()
);

-- These helpers use fully-qualified names and a fixed search path. The runtime
-- gets only explicit grants. Never grant this role to a browser or Data API.
create function public.projectos_actor() returns text
language sql stable set search_path = pg_catalog
as $$ select nullif(current_setting('projectos.actor', true), '') $$;

create function public.projectos_consume_mcp_request() returns text
language plpgsql security definer set search_path = pg_catalog
as $$
declare
  actor text := public.projectos_actor();
  window_start timestamptz := date_trunc('minute', statement_timestamp());
begin
  update public.projectos_accounts a
    set mcp_window = window_start,
        mcp_requests = case when a.mcp_window = window_start then a.mcp_requests + 1 else 1 end
    where a.user_id = actor and a.mcp_enabled
      and (a.mcp_window is distinct from window_start or a.mcp_requests < 60);
  if found then return 'allowed'; end if;
  if exists (select 1 from public.projectos_accounts a where a.user_id = actor and a.mcp_enabled) then
    return 'limited';
  end if;
  return 'disabled';
end $$;

create function public.projectos_role(target uuid) returns text
language sql stable security definer set search_path = pg_catalog
as $$
  select m.role from public.projectos_workspace_members m
  where m.workspace_id = target and m.user_id = public.projectos_actor()
$$;

create function public.projectos_create_workspace(label text, workspace_kind text) returns uuid
language plpgsql security definer set search_path = pg_catalog
as $$
declare
  actor text := public.projectos_actor();
  target uuid;
begin
  if actor is null then raise insufficient_privilege; end if;
  insert into public.projectos_workspaces (name, owner_id, kind)
    values (label, actor, workspace_kind)
    on conflict (owner_id) where kind = 'personal' do nothing
    returning id into target;
  if target is null then
    select id into strict target from public.projectos_workspaces where owner_id = actor and kind = 'personal';
  end if;
  insert into public.projectos_workspace_members (workspace_id, user_id, role)
    values (target, actor, 'owner') on conflict (workspace_id, user_id) do nothing;
  return target;
end $$;

create function public.projectos_can_manage_member(target uuid, member text, member_role text) returns boolean
language sql stable security definer set search_path = pg_catalog
as $$
  select exists (
    select 1 from public.projectos_workspaces w
    where w.id = target and w.kind = 'team' and member <> w.owner_id
      and member_role in ('admin', 'editor', 'reviewer', 'viewer')
      and (public.projectos_role(target) = 'owner'
        or (public.projectos_role(target) = 'admin' and member_role <> 'admin'))
  )
$$;

alter table public.projectos_workspaces enable row level security;
alter table public.projectos_accounts enable row level security;
alter table public.projectos_workspace_members enable row level security;
alter table public.projectos_workspace_snapshots enable row level security;

create policy projectos_workspace_read on public.projectos_workspaces for select
  using (public.projectos_role(id) is not null);
create policy projectos_account_register on public.projectos_accounts for insert
  with check (user_id = public.projectos_actor());
create policy projectos_account_self_read on public.projectos_accounts for select
  using (user_id = public.projectos_actor());
create policy projectos_account_self_update on public.projectos_accounts for update
  using (user_id = public.projectos_actor()) with check (user_id = public.projectos_actor());
create policy projectos_member_read on public.projectos_workspace_members for select
  using (user_id = public.projectos_actor() or public.projectos_role(workspace_id) in ('owner', 'admin'));
create policy projectos_member_add on public.projectos_workspace_members for insert
  with check (public.projectos_can_manage_member(workspace_id, user_id, role));
create policy projectos_member_update on public.projectos_workspace_members for update
  using (public.projectos_can_manage_member(workspace_id, user_id, role))
  with check (public.projectos_can_manage_member(workspace_id, user_id, role));
create policy projectos_member_remove on public.projectos_workspace_members for delete
  using (public.projectos_can_manage_member(workspace_id, user_id, role));
create policy projectos_snapshot_read on public.projectos_workspace_snapshots for select
  using (public.projectos_role(workspace_id) is not null);
create policy projectos_snapshot_create on public.projectos_workspace_snapshots for insert
  with check (public.projectos_role(workspace_id) in ('owner', 'admin', 'editor'));
create policy projectos_snapshot_update on public.projectos_workspace_snapshots for update
  using (public.projectos_role(workspace_id) in ('owner', 'admin', 'editor'))
  with check (public.projectos_role(workspace_id) in ('owner', 'admin', 'editor'));

revoke all on public.projectos_accounts, public.projectos_workspaces, public.projectos_workspace_members, public.projectos_workspace_snapshots from public;
revoke all on function public.projectos_actor(), public.projectos_role(uuid),
  public.projectos_create_workspace(text, text), public.projectos_can_manage_member(uuid, text, text),
  public.projectos_consume_mcp_request() from public;
grant usage on schema public to projectos_runtime;
grant execute on function public.projectos_actor(), public.projectos_role(uuid),
  public.projectos_create_workspace(text, text), public.projectos_can_manage_member(uuid, text, text),
  public.projectos_consume_mcp_request() to projectos_runtime;
grant select on public.projectos_workspaces, public.projectos_workspace_members, public.projectos_workspace_snapshots to projectos_runtime;
grant insert (user_id) on public.projectos_accounts to projectos_runtime;
grant select (user_id, mcp_enabled), update (mcp_enabled) on public.projectos_accounts to projectos_runtime;
grant insert (workspace_id, user_id, role), update (role), delete on public.projectos_workspace_members to projectos_runtime;
grant insert (workspace_id, data), update (data, version, updated_at) on public.projectos_workspace_snapshots to projectos_runtime;

commit;
