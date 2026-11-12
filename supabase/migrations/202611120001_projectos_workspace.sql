-- ProjectOS cloud-ready schema. This migration is a template for a dedicated
-- ProjectOS development project. It has not been applied to any remote database.
create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  owner_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'editor', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 160),
  description text not null default '',
  category text not null default 'Other',
  status text not null default 'Idea' check (status in ('Idea','Defined','Prototyping','Validating','Active','Paused','Archived','Completed')),
  priority text not null default 'Medium' check (priority in ('Low','Medium','High','Critical')),
  objectives jsonb not null default '[]'::jsonb,
  tags text[] not null default '{}',
  target_date date,
  progress integer not null default 0 check (progress between 0 and 100),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 240),
  description text not null default '',
  status text not null default 'To Do' check (status in ('Backlog','To Do','In Progress','Blocked','Review','Done')),
  priority text not null default 'Medium' check (priority in ('Low','Medium','High','Critical')),
  due_date date,
  labels text[] not null default '{}',
  depends_on uuid[] not null default '{}',
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.milestones (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 240),
  description text not null default '',
  due_date date not null,
  completed_at timestamptz,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.research_records (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  title text not null check (char_length(title) between 1 and 240),
  research_question text not null default '',
  summary text not null default '',
  category text not null default 'General',
  hypothesis text not null default '',
  methodology text not null default '',
  observations text not null default '',
  evidence_scope text not null default 'Speculation' check (evidence_scope in ('Speculation','Hypothesis','Simulation','Experiment','Observation','Independently validated')),
  confidence smallint not null default 0 check (confidence between 0 and 100),
  status text not null default 'Draft' check (status in ('Draft','In progress','Reviewed')),
  source_urls text[] not null default '{}',
  tags text[] not null default '{}',
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.knowledge_nodes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  label text not null check (char_length(label) between 1 and 160),
  category text not null,
  record_type text,
  record_id uuid,
  description text not null default '',
  position jsonb not null default '{"x":50,"y":50}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.knowledge_edges (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  source_id uuid not null references public.knowledge_nodes(id) on delete cascade,
  target_id uuid not null references public.knowledge_nodes(id) on delete cascade,
  relationship text not null check (relationship in ('Depends on','Related to','Part of','Derived from','Supports','Contradicts','Integrates with','Investigates','Implements')),
  description text not null default '',
  created_at timestamptz not null default now(),
  unique (workspace_id, source_id, target_id, relationship),
  check (source_id <> target_id)
);

create table if not exists public.activity_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  actor_id uuid default auth.uid() references auth.users(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id uuid not null,
  summary text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists projects_workspace_updated_idx on public.projects(workspace_id, updated_at desc);
create index if not exists tasks_workspace_status_due_idx on public.tasks(workspace_id, status, due_date);
create index if not exists tasks_project_idx on public.tasks(project_id);
create index if not exists milestones_workspace_due_idx on public.milestones(workspace_id, due_date);
create index if not exists research_workspace_updated_idx on public.research_records(workspace_id, updated_at desc);
create index if not exists graph_nodes_workspace_idx on public.knowledge_nodes(workspace_id);
create index if not exists graph_edges_workspace_idx on public.knowledge_edges(workspace_id);
create index if not exists activity_workspace_created_idx on public.activity_events(workspace_id, created_at desc);

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.milestones enable row level security;
alter table public.research_records enable row level security;
alter table public.knowledge_nodes enable row level security;
alter table public.knowledge_edges enable row level security;
alter table public.activity_events enable row level security;

-- A workspace owner can read their workspace. Membership-based reads use the
-- user's own membership row; user_metadata is never used for authorization.
create policy "workspace_owner_or_member_read" on public.workspaces for select to authenticated using (
  owner_id = (select auth.uid()) or exists (
    select 1 from public.workspace_members m where m.workspace_id = id and m.user_id = (select auth.uid())
  )
);
create policy "workspace_owner_create" on public.workspaces for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "workspace_owner_update" on public.workspaces for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "workspace_owner_delete" on public.workspaces for delete to authenticated using (owner_id = (select auth.uid()));

create policy "member_read_own_membership" on public.workspace_members for select to authenticated using (user_id = (select auth.uid()));
create policy "owner_manage_memberships" on public.workspace_members for all to authenticated using (
  exists (select 1 from public.workspaces w where w.id = workspace_id and w.owner_id = (select auth.uid()))
) with check (
  exists (select 1 from public.workspaces w where w.id = workspace_id and w.owner_id = (select auth.uid()))
);

create or replace function public.is_workspace_member(target_workspace uuid)
returns boolean language sql stable security invoker set search_path = '' as $$
  select exists (
    select 1 from public.workspaces w where w.id = target_workspace and w.owner_id = (select auth.uid())
  ) or exists (
    select 1 from public.workspace_members m where m.workspace_id = target_workspace and m.user_id = (select auth.uid())
  );
$$;
create or replace function public.can_edit_workspace(target_workspace uuid)
returns boolean language sql stable security invoker set search_path = '' as $$
  select exists (
    select 1 from public.workspaces w where w.id = target_workspace and w.owner_id = (select auth.uid())
  ) or exists (
    select 1 from public.workspace_members m where m.workspace_id = target_workspace and m.user_id = (select auth.uid()) and m.role in ('owner','admin','editor')
  );
$$;
revoke all on function public.is_workspace_member(uuid) from public, anon;
revoke all on function public.can_edit_workspace(uuid) from public, anon;
grant execute on function public.is_workspace_member(uuid) to authenticated;
grant execute on function public.can_edit_workspace(uuid) to authenticated;

create policy "workspace_member_read" on public.projects for select to authenticated using (public.is_workspace_member(workspace_id));
create policy "workspace_editor_insert" on public.projects for insert to authenticated with check (public.can_edit_workspace(workspace_id));
create policy "workspace_editor_update" on public.projects for update to authenticated using (public.can_edit_workspace(workspace_id)) with check (public.can_edit_workspace(workspace_id));
create policy "workspace_editor_delete" on public.projects for delete to authenticated using (public.can_edit_workspace(workspace_id));

create policy "workspace_member_read" on public.tasks for select to authenticated using (public.is_workspace_member(workspace_id));
create policy "workspace_editor_insert" on public.tasks for insert to authenticated with check (public.can_edit_workspace(workspace_id));
create policy "workspace_editor_update" on public.tasks for update to authenticated using (public.can_edit_workspace(workspace_id)) with check (public.can_edit_workspace(workspace_id));
create policy "workspace_editor_delete" on public.tasks for delete to authenticated using (public.can_edit_workspace(workspace_id));
create policy "workspace_member_read" on public.milestones for select to authenticated using (public.is_workspace_member(workspace_id));
create policy "workspace_editor_insert" on public.milestones for insert to authenticated with check (public.can_edit_workspace(workspace_id));
create policy "workspace_editor_update" on public.milestones for update to authenticated using (public.can_edit_workspace(workspace_id)) with check (public.can_edit_workspace(workspace_id));
create policy "workspace_editor_delete" on public.milestones for delete to authenticated using (public.can_edit_workspace(workspace_id));
create policy "workspace_member_read" on public.research_records for select to authenticated using (public.is_workspace_member(workspace_id));
create policy "workspace_editor_insert" on public.research_records for insert to authenticated with check (public.can_edit_workspace(workspace_id));
create policy "workspace_editor_update" on public.research_records for update to authenticated using (public.can_edit_workspace(workspace_id)) with check (public.can_edit_workspace(workspace_id));
create policy "workspace_editor_delete" on public.research_records for delete to authenticated using (public.can_edit_workspace(workspace_id));
create policy "workspace_member_read" on public.knowledge_nodes for select to authenticated using (public.is_workspace_member(workspace_id));
create policy "workspace_editor_insert" on public.knowledge_nodes for insert to authenticated with check (public.can_edit_workspace(workspace_id));
create policy "workspace_editor_update" on public.knowledge_nodes for update to authenticated using (public.can_edit_workspace(workspace_id)) with check (public.can_edit_workspace(workspace_id));
create policy "workspace_editor_delete" on public.knowledge_nodes for delete to authenticated using (public.can_edit_workspace(workspace_id));
create policy "workspace_member_read" on public.knowledge_edges for select to authenticated using (public.is_workspace_member(workspace_id));
create policy "workspace_editor_insert" on public.knowledge_edges for insert to authenticated with check (public.can_edit_workspace(workspace_id));
create policy "workspace_editor_update" on public.knowledge_edges for update to authenticated using (public.can_edit_workspace(workspace_id)) with check (public.can_edit_workspace(workspace_id));
create policy "workspace_editor_delete" on public.knowledge_edges for delete to authenticated using (public.can_edit_workspace(workspace_id));
create policy "workspace_member_read" on public.activity_events for select to authenticated using (public.is_workspace_member(workspace_id));
create policy "workspace_editor_insert" on public.activity_events for insert to authenticated with check (actor_id = (select auth.uid()) and public.can_edit_workspace(workspace_id));

grant select, insert, update, delete on public.workspaces, public.workspace_members, public.projects, public.tasks, public.milestones, public.research_records, public.knowledge_nodes, public.knowledge_edges, public.activity_events to authenticated;
