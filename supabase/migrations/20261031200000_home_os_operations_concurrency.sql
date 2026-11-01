-- Home OS: optimistic concurrency contract for multi-session operations editing.
begin;

create or replace function public.home_operations_load_v2(p_workspace_id uuid)
returns jsonb language plpgsql security invoker set search_path = public
as $$
declare
  v_data jsonb;
  v_version integer;
begin
  v_data := public.home_operations_load(p_workspace_id);
  select version into v_version from public.home_operations_snapshot where workspace_id=p_workspace_id;
  return jsonb_set(coalesce(v_data,'{}'::jsonb),'{_version}',to_jsonb(coalesce(v_version,0)),true);
end $$;

create or replace function public.home_operations_save_v2(
  p_workspace_id uuid,
  p_data jsonb,
  p_expected_version integer
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_current_version integer;
  v_updated_at timestamptz;
begin
  if auth.uid() is null or public.ws_access_level(p_workspace_id, 'home', 'main') <> 'edit' then
    raise exception 'HOME_ACCESS_DENIED' using errcode = '42501';
  end if;
  if jsonb_typeof(p_data) <> 'object' then raise exception 'HOME_INVALID_OPERATIONS_SNAPSHOT'; end if;
  if p_expected_version is null or p_expected_version < 0 then
    raise exception 'HOME_OPERATIONS_VERSION_REQUIRED' using errcode = '22023';
  end if;

  -- Serialize even the first save, where the snapshot row does not exist yet.
  perform pg_advisory_xact_lock(hashtextextended(p_workspace_id::text, 0));
  select version into v_current_version
    from public.home_operations_snapshot
    where workspace_id=p_workspace_id
    for update;

  if not found then
    if p_expected_version <> 0 then
      raise exception 'HOME_OPERATIONS_CONFLICT' using errcode = '40001';
    end if;
  elsif p_expected_version <> v_current_version then
    raise exception 'HOME_OPERATIONS_CONFLICT' using errcode = '40001';
  end if;

  v_updated_at := public.home_operations_save(p_workspace_id, p_data - '_version');
  select version into v_current_version
    from public.home_operations_snapshot where workspace_id=p_workspace_id;
  return jsonb_build_object('updatedAt',v_updated_at,'version',v_current_version);
end $$;

revoke all on function public.home_operations_load_v2(uuid) from public, anon;
grant execute on function public.home_operations_load_v2(uuid) to authenticated;
revoke all on function public.home_operations_save_v2(uuid,jsonb,integer) from public, anon;
grant execute on function public.home_operations_save_v2(uuid,jsonb,integer) to authenticated;

commit;
