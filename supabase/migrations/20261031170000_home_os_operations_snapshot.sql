-- Home OS phase 3: persist operations workflows and household bills.
begin;
create table if not exists public.home_operations_snapshot (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  data jsonb not null default '{"tasks":[],"completions":[],"providers":[],"maintenance":[],"purchaseRequests":[],"purchaseItems":[],"bills":[]}'::jsonb
    check (jsonb_typeof(data) = 'object'),
  version integer not null default 1 check (version > 0),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
alter table public.home_operations_snapshot enable row level security;
drop policy if exists home_operations_snapshot_select on public.home_operations_snapshot;
create policy home_operations_snapshot_select on public.home_operations_snapshot for select to authenticated
  using (public.ws_access_level(workspace_id, 'home', 'main') in ('view','edit'));
drop policy if exists home_operations_snapshot_insert on public.home_operations_snapshot;
create policy home_operations_snapshot_insert on public.home_operations_snapshot for insert to authenticated
  with check (public.ws_access_level(workspace_id, 'home', 'main') = 'edit');
drop policy if exists home_operations_snapshot_update on public.home_operations_snapshot;
create policy home_operations_snapshot_update on public.home_operations_snapshot for update to authenticated
  using (public.ws_access_level(workspace_id, 'home', 'main') = 'edit')
  with check (public.ws_access_level(workspace_id, 'home', 'main') = 'edit');
grant select, insert, update on public.home_operations_snapshot to authenticated;
revoke all on public.home_operations_snapshot from anon;

create or replace function public.home_operations_load(p_workspace_id uuid)
returns jsonb language plpgsql security invoker set search_path = public
as $$
declare result jsonb;
begin
  if auth.uid() is null or public.ws_access_level(p_workspace_id, 'home', 'main') not in ('view','edit') then
    raise exception 'HOME_ACCESS_DENIED' using errcode = '42501';
  end if;
  select data into result from public.home_operations_snapshot where workspace_id=p_workspace_id;
  return coalesce(result, '{"tasks":[],"completions":[],"providers":[],"maintenance":[],"purchaseRequests":[],"purchaseItems":[],"bills":[]}'::jsonb);
end $$;

create or replace function public.home_operations_save(p_workspace_id uuid, p_data jsonb)
returns timestamptz language plpgsql security invoker set search_path = public
as $$
begin
  if auth.uid() is null or public.ws_access_level(p_workspace_id, 'home', 'main') <> 'edit' then
    raise exception 'HOME_ACCESS_DENIED' using errcode = '42501';
  end if;
  if jsonb_typeof(p_data) <> 'object' then raise exception 'HOME_INVALID_OPERATIONS_SNAPSHOT'; end if;
  if jsonb_typeof(p_data->'tasks') is distinct from 'array'
    or jsonb_typeof(p_data->'completions') is distinct from 'array'
    or jsonb_typeof(p_data->'providers') is distinct from 'array'
    or jsonb_typeof(p_data->'maintenance') is distinct from 'array'
    or jsonb_typeof(p_data->'purchaseRequests') is distinct from 'array'
    or jsonb_typeof(p_data->'purchaseItems') is distinct from 'array'
    or jsonb_typeof(p_data->'bills') is distinct from 'array'
  then raise exception 'HOME_INVALID_OPERATIONS_COLLECTIONS'; end if;
  insert into public.home_operations_snapshot(workspace_id,data,version,updated_at,updated_by)
  values(p_workspace_id,p_data,1,now(),auth.uid())
  on conflict (workspace_id) do update set data=excluded.data,version=home_operations_snapshot.version+1,updated_at=now(),updated_by=auth.uid();
  insert into public.home_audit_log(workspace_id,actor_id,action,entity_type,metadata)
  values(p_workspace_id,auth.uid(),'operations_snapshot_saved','home_operations',jsonb_build_object(
    'tasks',jsonb_array_length(p_data->'tasks'),
    'maintenance',jsonb_array_length(p_data->'maintenance'),
    'purchaseRequests',jsonb_array_length(p_data->'purchaseRequests'),
    'bills',jsonb_array_length(p_data->'bills')));
  return now();
end $$;
revoke all on function public.home_operations_load(uuid) from public, anon;
revoke all on function public.home_operations_save(uuid,jsonb) from public, anon;
grant execute on function public.home_operations_load(uuid) to authenticated;
grant execute on function public.home_operations_save(uuid,jsonb) to authenticated;
commit;
