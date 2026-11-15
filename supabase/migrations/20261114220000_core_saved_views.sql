begin;

create table if not exists public.core_saved_views (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  system_id text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 80),
  scope text not null default 'personal' check (scope in ('personal','workspace')),
  definition jsonb not null check (jsonb_typeof(definition) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint core_saved_views_owner_name_unique unique (workspace_id, system_id, owner_id, name)
);

create index if not exists core_saved_views_workspace_system_scope_idx
  on public.core_saved_views (workspace_id, system_id, scope, updated_at desc);

alter table public.core_saved_views enable row level security;

drop policy if exists core_saved_views_select on public.core_saved_views;
create policy core_saved_views_select
on public.core_saved_views
for select
to authenticated
using (
  public.ws_access_level(workspace_id, system_id, 'projects') in ('view','edit')
  and (owner_id = auth.uid() or scope = 'workspace')
);

drop policy if exists core_saved_views_insert on public.core_saved_views;
create policy core_saved_views_insert
on public.core_saved_views
for insert
to authenticated
with check (
  owner_id = auth.uid()
  and public.ws_access_level(workspace_id, system_id, 'projects') in ('view','edit')
  and (scope = 'personal' or public.ws_access_level(workspace_id, system_id, 'projects') = 'edit')
);

drop policy if exists core_saved_views_update on public.core_saved_views;
create policy core_saved_views_update
on public.core_saved_views
for update
to authenticated
using (
  owner_id = auth.uid()
  and public.ws_access_level(workspace_id, system_id, 'projects') in ('view','edit')
)
with check (
  owner_id = auth.uid()
  and public.ws_access_level(workspace_id, system_id, 'projects') in ('view','edit')
  and (scope = 'personal' or public.ws_access_level(workspace_id, system_id, 'projects') = 'edit')
);

drop policy if exists core_saved_views_delete on public.core_saved_views;
create policy core_saved_views_delete
on public.core_saved_views
for delete
to authenticated
using (
  owner_id = auth.uid()
  and public.ws_access_level(workspace_id, system_id, 'projects') in ('view','edit')
);

grant select, insert, update, delete on public.core_saved_views to authenticated;
revoke all on public.core_saved_views from anon, public;

commit;
