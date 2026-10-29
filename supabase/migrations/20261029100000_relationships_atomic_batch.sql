-- Atomic batch writes for Relationships OS imports and person merges.
-- SECURITY INVOKER is intentional: workspace_records RLS and ws_access_level remain authoritative.
create or replace function public.relationships_apply_batch(
  p_workspace_id uuid,
  p_upserts jsonb,
  p_soft_deletes jsonb
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
  record_data jsonb;
  affected integer := 0;
  upsert_count integer := 0;
  delete_count integer := 0;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_workspace_id is null then
    raise exception 'Workspace is required' using errcode = '22023';
  end if;
  if jsonb_typeof(coalesce(p_upserts, '[]'::jsonb)) <> 'array'
     or jsonb_typeof(coalesce(p_soft_deletes, '[]'::jsonb)) <> 'array' then
    raise exception 'Upserts and soft deletes must be arrays' using errcode = '22023';
  end if;

  -- Validate the complete batch before writing any rows.
  for item in select value from jsonb_array_elements(coalesce(p_upserts, '[]'::jsonb))
  loop
    collection_name := item->>'collection';
    record_id := item->>'id';
    record_data := item->'data';
    if jsonb_typeof(item) <> 'object'
       or collection_name not in ('people','timeline','followups','occasions','gifts','circles','settings')
       or nullif(record_id, '') is null
       or jsonb_typeof(record_data) <> 'object' then
      raise exception 'Invalid Relationships upsert item' using errcode = '22023';
    end if;
    if public.ws_access_level(p_workspace_id, 'relationships', collection_name) <> 'edit' then
      raise exception 'Edit access required for Relationships collection %', collection_name using errcode = '42501';
    end if;
  end loop;

  for item in select value from jsonb_array_elements(coalesce(p_soft_deletes, '[]'::jsonb))
  loop
    collection_name := item->>'collection';
    record_id := item->>'id';
    if jsonb_typeof(item) <> 'object'
       or collection_name not in ('people','timeline','followups','occasions','gifts','circles','settings')
       or nullif(record_id, '') is null then
      raise exception 'Invalid Relationships soft-delete item' using errcode = '22023';
    end if;
    if public.ws_access_level(p_workspace_id, 'relationships', collection_name) <> 'edit' then
      raise exception 'Edit access required for Relationships collection %', collection_name using errcode = '42501';
    end if;
  end loop;

  for item in select value from jsonb_array_elements(coalesce(p_upserts, '[]'::jsonb))
  loop
    collection_name := item->>'collection';
    record_id := item->>'id';
    record_data := item->'data';
    insert into public.workspace_records (
      workspace_id, system_id, collection, id, data, deleted, updated_at, updated_by
    ) values (
      p_workspace_id, 'relationships', collection_name, record_id, record_data,
      false, now(), auth.uid()
    )
    on conflict (workspace_id, system_id, collection, id)
    do update set
      data = excluded.data,
      deleted = false,
      updated_at = now(),
      updated_by = auth.uid();
    upsert_count := upsert_count + 1;
  end loop;

  for item in select value from jsonb_array_elements(coalesce(p_soft_deletes, '[]'::jsonb))
  loop
    collection_name := item->>'collection';
    record_id := item->>'id';
    update public.workspace_records
       set deleted = true, updated_at = now(), updated_by = auth.uid()
     where workspace_id = p_workspace_id
       and system_id = 'relationships'
       and collection = collection_name
       and id = record_id
       and deleted = false;
    get diagnostics affected = row_count;
    if affected <> 1 then
      raise exception 'Expected one active record to archive in collection %', collection_name using errcode = 'P0002';
    end if;
    delete_count := delete_count + 1;
  end loop;

  return jsonb_build_object('ok', true, 'upserted', upsert_count, 'archived', delete_count);
end;
$function$;

revoke all on function public.relationships_apply_batch(uuid, jsonb, jsonb) from public, anon;
grant execute on function public.relationships_apply_batch(uuid, jsonb, jsonb) to authenticated;
