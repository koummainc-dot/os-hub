-- Personal Inventory OS — P0 foundation
-- Prepared for review only. DO NOT apply to production before approval and isolated testing.
-- Access model: shared workspace data; system/section permissions enforced by ws_access_level().
-- Offline-sensitive local storage is intentionally NOT enabled by this migration.

begin;

create table if not exists public.inventory_settings (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  default_currency text not null default 'EGP'
    check (default_currency ~ '^[A-Z]{3}$'),
  timezone text not null default 'Africa/Cairo',
  week_start_day smallint not null default 6 check (week_start_day between 0 and 6),
  warranty_reminder_days integer[] not null default array[30, 7, 1],
  warranty_expiring_window_days integer not null default 30
    check (warranty_expiring_window_days between 0 and 3650),
  replacement_reminder_days integer not null default 30
    check (replacement_reminder_days between 0 and 3650),
  loan_reminder_days integer not null default 1
    check (loan_reminder_days between 0 and 3650),
  lost_followup_days integer not null default 7
    check (lost_followup_days between 0 and 3650),
  preferences jsonb not null default '{}'::jsonb
    check (jsonb_typeof(preferences) = 'object'),
  version integer not null default 1 check (version > 0),
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null
);

create table if not exists public.inventory_sync_operations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  actor_id uuid not null references auth.users(id) on delete cascade,
  idempotency_key text not null check (length(idempotency_key) between 8 and 200),
  operation_type text not null check (operation_type in ('create','update','delete','move','link','unlink')),
  entity_type text not null check (length(entity_type) between 1 and 80),
  entity_id uuid not null,
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  status text not null default 'pending'
    check (status in ('pending','syncing','synced','conflict','failed')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  last_error_code text,
  client_created_at timestamptz,
  processed_at timestamptz,
  version integer not null default 1 check (version > 0),
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  unique (workspace_id, actor_id, idempotency_key),
  unique (workspace_id, id)
);
create index if not exists inventory_sync_queue_idx
  on public.inventory_sync_operations(workspace_id, status, created_at);
create index if not exists inventory_sync_entity_idx
  on public.inventory_sync_operations(workspace_id, entity_type, entity_id, created_at desc);

create table if not exists public.inventory_sync_conflicts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  operation_id uuid not null,
  entity_type text not null check (length(entity_type) between 1 and 80),
  entity_id uuid not null,
  base_version integer check (base_version is null or base_version > 0),
  server_version integer check (server_version is null or server_version > 0),
  local_snapshot jsonb not null default '{}'::jsonb
    check (jsonb_typeof(local_snapshot) = 'object'),
  server_snapshot jsonb not null default '{}'::jsonb
    check (jsonb_typeof(server_snapshot) = 'object'),
  resolution_status text not null default 'open'
    check (resolution_status in ('open','local_kept','server_kept','merged','dismissed')),
  resolved_by uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  version integer not null default 1 check (version > 0),
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  foreign key (workspace_id, operation_id)
    references public.inventory_sync_operations(workspace_id, id) on delete cascade
);
create index if not exists inventory_sync_conflicts_open_idx
  on public.inventory_sync_conflicts(workspace_id, created_at desc)
  where resolution_status = 'open';

create table if not exists public.inventory_audit_log (
  id bigint generated always as identity primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null check (length(action) between 1 and 100),
  entity_type text not null check (length(entity_type) between 1 and 80),
  entity_id uuid,
  occurred_at timestamptz not null default clock_timestamp(),
  request_id text,
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  sensitivity text not null default 'Normal'
    check (sensitivity in ('Normal','Sensitive','Secret')),
  is_demo boolean not null default false
);
create index if not exists inventory_audit_log_workspace_time_idx
  on public.inventory_audit_log(workspace_id, occurred_at desc);
create index if not exists inventory_audit_log_entity_idx
  on public.inventory_audit_log(workspace_id, entity_type, entity_id, occurred_at desc);

create table if not exists public.inventory_external_links (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  source_entity_type text not null check (length(source_entity_type) between 1 and 80),
  source_entity_id uuid not null,
  target_system text not null check (length(target_system) between 1 and 80),
  target_entity_type text not null check (length(target_entity_type) between 1 and 80),
  target_entity_id text not null check (length(target_entity_id) between 1 and 200),
  target_snapshot jsonb not null default '{}'::jsonb
    check (jsonb_typeof(target_snapshot) = 'object'),
  reference_state text not null default 'Valid'
    check (reference_state in ('Valid','Missing','NoAccess')),
  sensitivity text not null default 'Normal'
    check (sensitivity in ('Normal','Sensitive','Secret')),
  version integer not null default 1 check (version > 0),
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  unique (workspace_id, source_entity_type, source_entity_id, target_system, target_entity_type, target_entity_id)
);
create index if not exists inventory_external_links_source_idx
  on public.inventory_external_links(workspace_id, source_entity_type, source_entity_id);
create index if not exists inventory_external_links_target_idx
  on public.inventory_external_links(workspace_id, target_system, target_entity_type, target_entity_id);

-- Server-owned actor/timestamp metadata and immutable workspace boundary.
create or replace function public.inventory_stamp_row()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    if new.workspace_id is distinct from old.workspace_id then
      raise exception 'INVENTORY_WORKSPACE_IMMUTABLE' using errcode = '42501';
    end if;
    new.created_at := old.created_at;
    new.created_by := old.created_by;
    new.updated_at := clock_timestamp();
    new.updated_by := auth.uid();
  else
    new.created_at := coalesce(new.created_at, clock_timestamp());
    new.updated_at := new.created_at;
    new.created_by := auth.uid();
    new.updated_by := auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists inventory_settings_stamp on public.inventory_settings;
create trigger inventory_settings_stamp before insert or update on public.inventory_settings
for each row execute function public.inventory_stamp_row();

drop trigger if exists inventory_sync_operations_stamp on public.inventory_sync_operations;
create trigger inventory_sync_operations_stamp before insert or update on public.inventory_sync_operations
for each row execute function public.inventory_stamp_row();

drop trigger if exists inventory_sync_conflicts_stamp on public.inventory_sync_conflicts;
create trigger inventory_sync_conflicts_stamp before insert or update on public.inventory_sync_conflicts
for each row execute function public.inventory_stamp_row();

drop trigger if exists inventory_external_links_stamp on public.inventory_external_links;
create trigger inventory_external_links_stamp before insert or update on public.inventory_external_links
for each row execute function public.inventory_stamp_row();

-- Append-only audit log: no update/delete policy and a defensive trigger.
create or replace function public.inventory_reject_audit_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'INVENTORY_AUDIT_APPEND_ONLY' using errcode = '42501';
end;
$$;
drop trigger if exists inventory_audit_no_mutation on public.inventory_audit_log;
create trigger inventory_audit_no_mutation before update or delete on public.inventory_audit_log
for each row execute function public.inventory_reject_audit_mutation();

alter table public.inventory_settings enable row level security;
alter table public.inventory_sync_operations enable row level security;
alter table public.inventory_sync_conflicts enable row level security;
alter table public.inventory_audit_log enable row level security;
alter table public.inventory_external_links enable row level security;

-- Permissions are workspace/system-level: view can read; edit can write.
-- Workspace membership alone grants no Inventory access; ws_access_level must say view/edit.
drop policy if exists inventory_settings_select on public.inventory_settings;
create policy inventory_settings_select on public.inventory_settings
for select to authenticated
using (public.ws_access_level(workspace_id, 'inventory', 'main') in ('view','edit'));
drop policy if exists inventory_settings_insert on public.inventory_settings;
create policy inventory_settings_insert on public.inventory_settings
for insert to authenticated
with check (public.ws_access_level(workspace_id, 'inventory', 'main') = 'edit');
drop policy if exists inventory_settings_update on public.inventory_settings;
create policy inventory_settings_update on public.inventory_settings
for update to authenticated
using (public.ws_access_level(workspace_id, 'inventory', 'main') = 'edit')
with check (public.ws_access_level(workspace_id, 'inventory', 'main') = 'edit');

drop policy if exists inventory_sync_operations_select on public.inventory_sync_operations;
create policy inventory_sync_operations_select on public.inventory_sync_operations
for select to authenticated
using (public.ws_access_level(workspace_id, 'inventory', 'sync') in ('view','edit'));
drop policy if exists inventory_sync_operations_insert on public.inventory_sync_operations;
create policy inventory_sync_operations_insert on public.inventory_sync_operations
for insert to authenticated
with check (
  public.ws_access_level(workspace_id, 'inventory', 'sync') = 'edit'
  and actor_id = auth.uid()
);
drop policy if exists inventory_sync_operations_update on public.inventory_sync_operations;
create policy inventory_sync_operations_update on public.inventory_sync_operations
for update to authenticated
using (public.ws_access_level(workspace_id, 'inventory', 'sync') = 'edit')
with check (public.ws_access_level(workspace_id, 'inventory', 'sync') = 'edit');
drop policy if exists inventory_sync_operations_delete on public.inventory_sync_operations;
create policy inventory_sync_operations_delete on public.inventory_sync_operations
for delete to authenticated
using (public.ws_access_level(workspace_id, 'inventory', 'sync') = 'edit');

drop policy if exists inventory_sync_conflicts_select on public.inventory_sync_conflicts;
create policy inventory_sync_conflicts_select on public.inventory_sync_conflicts
for select to authenticated
using (public.ws_access_level(workspace_id, 'inventory', 'sync') in ('view','edit'));
drop policy if exists inventory_sync_conflicts_insert on public.inventory_sync_conflicts;
create policy inventory_sync_conflicts_insert on public.inventory_sync_conflicts
for insert to authenticated
with check (public.ws_access_level(workspace_id, 'inventory', 'sync') = 'edit');
drop policy if exists inventory_sync_conflicts_update on public.inventory_sync_conflicts;
create policy inventory_sync_conflicts_update on public.inventory_sync_conflicts
for update to authenticated
using (public.ws_access_level(workspace_id, 'inventory', 'sync') = 'edit')
with check (public.ws_access_level(workspace_id, 'inventory', 'sync') = 'edit');

drop policy if exists inventory_audit_log_select on public.inventory_audit_log;
create policy inventory_audit_log_select on public.inventory_audit_log
for select to authenticated
using (public.ws_access_level(workspace_id, 'inventory', 'history') in ('view','edit'));
drop policy if exists inventory_audit_log_insert on public.inventory_audit_log;
create policy inventory_audit_log_insert on public.inventory_audit_log
for insert to authenticated
with check (
  public.ws_access_level(workspace_id, 'inventory', 'history') = 'edit'
  and (actor_id is null or actor_id = auth.uid())
);

drop policy if exists inventory_external_links_select on public.inventory_external_links;
create policy inventory_external_links_select on public.inventory_external_links
for select to authenticated
using (public.ws_access_level(workspace_id, 'inventory', 'links') in ('view','edit'));
drop policy if exists inventory_external_links_insert on public.inventory_external_links;
create policy inventory_external_links_insert on public.inventory_external_links
for insert to authenticated
with check (public.ws_access_level(workspace_id, 'inventory', 'links') = 'edit');
drop policy if exists inventory_external_links_update on public.inventory_external_links;
create policy inventory_external_links_update on public.inventory_external_links
for update to authenticated
using (public.ws_access_level(workspace_id, 'inventory', 'links') = 'edit')
with check (public.ws_access_level(workspace_id, 'inventory', 'links') = 'edit');
drop policy if exists inventory_external_links_delete on public.inventory_external_links;
create policy inventory_external_links_delete on public.inventory_external_links
for delete to authenticated
using (public.ws_access_level(workspace_id, 'inventory', 'links') = 'edit');

-- Explicit Data API grants; RLS remains the row-level authorization boundary.
grant select, insert, update on public.inventory_settings to authenticated;
grant select, insert, update, delete on public.inventory_sync_operations to authenticated;
grant select, insert, update on public.inventory_sync_conflicts to authenticated;
grant select, insert on public.inventory_audit_log to authenticated;
grant select, insert, update, delete on public.inventory_external_links to authenticated;
revoke all on public.inventory_settings, public.inventory_sync_operations,
  public.inventory_sync_conflicts, public.inventory_audit_log,
  public.inventory_external_links from anon;

commit;
