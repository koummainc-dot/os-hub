-- Atomically apply a Projects OS multi-record operation across project and approved child collections.
-- SECURITY INVOKER keeps workspace_records RLS and ws_access_level authoritative.
create or replace function public.projects_apply_records_batch(
  p_workspace_id uuid,
  p_changes jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $function$
declare
  item jsonb;
  collection_name text;
  record_id text;
  expected_ts timestamptz;
  actual_ts timestamptz;
  record_data jsonb;
  visibility uuid[];
  is_deleted boolean;
  affected integer;
  result jsonb := '[]'::jsonb;
  seen_keys text[] := array[]::text[];
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_workspace_id is null then
    raise exception 'Workspace is required' using errcode = '22023';
  end if;
  if jsonb_typeof(p_changes) is distinct from 'array'
     or jsonb_array_length(p_changes) = 0
     or jsonb_array_length(p_changes) > 1000 then
    raise exception 'Changes must be a non-empty array of at most 1000 records' using errcode = '22023';
  end if;

  -- Validate permissions and optimistic-concurrency tokens before writing any row.
  for item in select value from jsonb_array_elements(p_changes)
  loop
    if jsonb_typeof(item) is distinct from 'object' then
      raise exception 'Invalid batch item' using errcode = '22023';
    end if;
    collection_name := item->>'collection';
    record_id := item->>'id';
    record_data := item->'data';
    if collection_name not in ('tasks','outputs','projects','risks','issues','decisions','prds','updates','discovery')
       or nullif(record_id, '') is null
       or jsonb_typeof(record_data) is distinct from 'object'
       or (item ? 'visible_to' and jsonb_typeof(item->'visible_to') not in ('array','null'))
       or jsonb_typeof(item->'deleted') is distinct from 'boolean' then
      raise exception 'Invalid Projects batch item' using errcode = '22023';
    end if;
    if public.ws_access_level(p_workspace_id, 'projects', collection_name) is distinct from 'edit' then
      raise exception 'Edit access required for Projects collection %', collection_name using errcode = '42501';
    end if;
    if (collection_name || '/' || record_id) = any(seen_keys) then
      raise exception 'Duplicate record in batch: %/%', collection_name, record_id using errcode = '22023';
    end if;
    seen_keys := array_append(seen_keys, collection_name || '/' || record_id);

    expected_ts := nullif(item->>'expected_updated_at', '')::timestamptz;
    actual_ts := null;
    select wr.updated_at into actual_ts
      from public.workspace_records wr
     where wr.workspace_id = p_workspace_id
       and wr.system_id = 'projects'
       and wr.collection = collection_name
       and wr.id = record_id
     for update;
    if expected_ts is null then
      if actual_ts is not null then
        raise exception 'Concurrent insert detected for %/%; reload and retry', collection_name, record_id using errcode = '40001';
      end if;
    elsif actual_ts is distinct from expected_ts then
      raise exception 'Record %/% changed since it was loaded; reload and retry', collection_name, record_id using errcode = '40001';
    end if;
  end loop;

  for item in select value from jsonb_array_elements(p_changes)
  loop
    collection_name := item->>'collection';
    record_id := item->>'id';
    record_data := item->'data';
    expected_ts := nullif(item->>'expected_updated_at', '')::timestamptz;
    is_deleted := (item->>'deleted')::boolean;
    visibility := null;
    if jsonb_typeof(item->'visible_to') = 'array' then
      select array_agg(value::uuid) into visibility
        from jsonb_array_elements_text(item->'visible_to') as values(value);
    end if;

    if expected_ts is null then
      insert into public.workspace_records
        (workspace_id, system_id, collection, id, data, deleted, visible_to, updated_at, updated_by)
      values
        (p_workspace_id, 'projects', collection_name, record_id, record_data, is_deleted, visibility, clock_timestamp(), auth.uid())
      returning updated_at into actual_ts;
    else
      update public.workspace_records
         set data = record_data,
             deleted = is_deleted,
             visible_to = visibility,
             updated_at = clock_timestamp(),
             updated_by = auth.uid()
       where workspace_id = p_workspace_id
         and system_id = 'projects'
         and collection = collection_name
         and id = record_id
         and updated_at = expected_ts
      returning updated_at into actual_ts;
      get diagnostics affected = row_count;
      if affected <> 1 then
        raise exception 'Record %/% changed during batch; retry', collection_name, record_id using errcode = '40001';
      end if;
    end if;
    result := result || jsonb_build_array(jsonb_build_object(
      'collection', collection_name, 'id', record_id, 'updated_at', actual_ts
    ));
  end loop;
  return result;
end;
$function$;

revoke all on function public.projects_apply_records_batch(uuid, jsonb) from public, anon;
grant execute on function public.projects_apply_records_batch(uuid, jsonb) to authenticated;
