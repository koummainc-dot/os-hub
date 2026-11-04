-- Permanently purge a trashed project and the exact child records deleted in the same batch.
-- SECURITY INVOKER preserves workspace_records RLS; all validation happens before deletion.
create or replace function public.projects_purge_records_batch(
  p_workspace_id uuid,
  p_project_id text,
  p_deleted_at timestamptz,
  p_deleted_by uuid,
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
  actual_data jsonb;
  affected integer;
  project_count integer := 0;
  seen_keys text[] := array[]::text[];
  result jsonb := '[]'::jsonb;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_workspace_id is null or nullif(p_project_id, '') is null or p_deleted_at is null then
    raise exception 'Workspace, project, and deletion marker are required' using errcode = '22023';
  end if;
  if jsonb_typeof(p_changes) is distinct from 'array'
     or jsonb_array_length(p_changes) = 0
     or jsonb_array_length(p_changes) > 1000 then
    raise exception 'Changes must be a non-empty array of at most 1000 records' using errcode = '22023';
  end if;

  -- Lock and validate every row first. Any mismatch aborts the whole transaction.
  for item in select value from jsonb_array_elements(p_changes)
  loop
    if jsonb_typeof(item) is distinct from 'object' then
      raise exception 'Invalid purge item' using errcode = '22023';
    end if;
    collection_name := item->>'collection';
    record_id := item->>'id';
    expected_ts := nullif(item->>'expected_updated_at', '')::timestamptz;
    if collection_name not in ('tasks','outputs','projects','risks','issues','decisions','prds','updates')
       or nullif(record_id, '') is null
       or expected_ts is null
       or (item->>'deleted_at')::timestamptz is distinct from p_deleted_at
       or nullif(item->>'project_id', '') is distinct from p_project_id
       or nullif(item->>'deleted_by', '')::uuid is distinct from p_deleted_by then
      raise exception 'Invalid purge marker for %/%', collection_name, record_id using errcode = '22023';
    end if;
    if public.ws_access_level(p_workspace_id, 'projects', collection_name) is distinct from 'edit' then
      raise exception 'Edit access required for Projects collection %', collection_name using errcode = '42501';
    end if;
    if (collection_name || '/' || record_id) = any(seen_keys) then
      raise exception 'Duplicate purge record: %/%', collection_name, record_id using errcode = '22023';
    end if;
    seen_keys := array_append(seen_keys, collection_name || '/' || record_id);
    if collection_name = 'projects' then
      project_count := project_count + 1;
      if record_id <> p_project_id then
        raise exception 'Project id does not match purge target' using errcode = '22023';
      end if;
    end if;

    actual_ts := null;
    actual_data := null;
    select wr.updated_at, wr.data into actual_ts, actual_data
      from public.workspace_records wr
     where wr.workspace_id = p_workspace_id
       and wr.system_id = 'projects'
       and wr.collection = collection_name
       and wr.id = record_id
     for update;
    if actual_ts is null then
      raise exception 'Purge record %/% no longer exists', collection_name, record_id using errcode = '40001';
    end if;
    if actual_ts is distinct from expected_ts then
      raise exception 'Purge record %/% changed; reload and retry', collection_name, record_id using errcode = '40001';
    end if;
    if (actual_data->>'deleted_at')::timestamptz is distinct from p_deleted_at
       or nullif(actual_data->>'deleted_by', '')::uuid is distinct from p_deleted_by then
      raise exception 'Purge record %/% is not part of this deletion batch', collection_name, record_id using errcode = '22023';
    end if;
    if collection_name = 'projects' then
      if actual_data->>'id' is distinct from p_project_id then
        raise exception 'Project record marker mismatch' using errcode = '22023';
      end if;
    elsif actual_data->>'project_id' is distinct from p_project_id then
      raise exception 'Child record %/% belongs to another project', collection_name, record_id using errcode = '22023';
    end if;
  end loop;
  if project_count <> 1 then
    raise exception 'Purge batch must contain the project exactly once' using errcode = '22023';
  end if;

  for item in select value from jsonb_array_elements(p_changes)
  loop
    collection_name := item->>'collection';
    record_id := item->>'id';
    expected_ts := (item->>'expected_updated_at')::timestamptz;
    delete from public.workspace_records
     where workspace_id = p_workspace_id
       and system_id = 'projects'
       and collection = collection_name
       and id = record_id
       and updated_at = expected_ts;
    get diagnostics affected = row_count;
    if affected <> 1 then
      raise exception 'Purge record %/% changed during deletion', collection_name, record_id using errcode = '40001';
    end if;
    result := result || jsonb_build_array(jsonb_build_object('collection', collection_name, 'id', record_id));
  end loop;
  return result;
end;
$function$;

revoke all on function public.projects_purge_records_batch(uuid, text, timestamptz, uuid, jsonb) from public, anon;
grant execute on function public.projects_purge_records_batch(uuid, text, timestamptz, uuid, jsonb) to authenticated;
