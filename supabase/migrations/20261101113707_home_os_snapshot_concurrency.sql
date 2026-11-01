-- Home OS: optimistic concurrency for properties, rooms and inventory snapshot writes.
begin;

create table if not exists public.home_snapshot_versions (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  version integer not null default 0 check (version >= 0),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
alter table public.home_snapshot_versions enable row level security;
revoke all on public.home_snapshot_versions from anon, authenticated;

create or replace function public.home_load_snapshot_v2(p_workspace_id uuid)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  v_snapshot jsonb;
  v_version integer;
begin
  if auth.uid() is null or public.ws_access_level(p_workspace_id, 'home', 'main') not in ('view','edit') then
    raise exception 'HOME_ACCESS_DENIED' using errcode = '42501';
  end if;
  v_snapshot := public.home_load_snapshot(p_workspace_id);
  select version into v_version from public.home_snapshot_versions where workspace_id=p_workspace_id;
  return jsonb_set(coalesce(v_snapshot,'{}'::jsonb),'{_version}',to_jsonb(coalesce(v_version,0)),true);
end $$;

create or replace function public.home_save_snapshot_v2(
  p_workspace_id uuid,
  p_snapshot jsonb,
  p_expected_version integer
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_current integer;
  v_updated_at timestamptz;
begin
  if auth.uid() is null or public.ws_access_level(p_workspace_id, 'home', 'main') <> 'edit' then
    raise exception 'HOME_ACCESS_DENIED' using errcode = '42501';
  end if;
  if p_expected_version is null or p_expected_version < 0 then
    raise exception 'HOME_VERSION_REQUIRED' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_workspace_id::text, 1));
  select version into v_current from public.home_snapshot_versions where workspace_id=p_workspace_id for update;
  if not found then
    if p_expected_version <> 0 then raise exception 'HOME_SNAPSHOT_CONFLICT' using errcode = '40001'; end if;
  elsif p_expected_version <> v_current then
    raise exception 'HOME_SNAPSHOT_CONFLICT' using errcode = '40001';
  end if;

  v_updated_at := public.home_save_snapshot(p_workspace_id, p_snapshot - '_version');
  insert into public.home_snapshot_versions(workspace_id,version,updated_at,updated_by)
  values(p_workspace_id,1,now(),auth.uid())
  on conflict(workspace_id) do update set version=public.home_snapshot_versions.version+1,
    updated_at=now(),updated_by=auth.uid()
  returning version into v_current;
  return jsonb_build_object('updatedAt',v_updated_at,'version',v_current);
end $$;

-- Legacy write entry points stay internal; authenticated clients must use version-checked wrappers.
revoke all on function public.home_save_snapshot(uuid,jsonb) from public, anon, authenticated;
revoke all on function public.home_operations_save(uuid,jsonb) from public, anon, authenticated;

revoke all on function public.home_load_snapshot_v2(uuid) from public, anon;
grant execute on function public.home_load_snapshot_v2(uuid) to authenticated;
revoke all on function public.home_save_snapshot_v2(uuid,jsonb,integer) from public, anon;
grant execute on function public.home_save_snapshot_v2(uuid,jsonb,integer) to authenticated;

commit;
