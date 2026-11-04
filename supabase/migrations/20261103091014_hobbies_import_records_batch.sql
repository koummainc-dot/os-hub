-- Import up to 500 new Hobbies/Habits records as one PostgreSQL statement.
-- Any failed row aborts the entire function call; no partial import is committed.
create or replace function public.hobbies_import_records_batch(
  p_workspace_id uuid,
  p_changes jsonb
)
returns table(collection text, id text, updated_at timestamptz)
language plpgsql
security invoker
set search_path = public
as $function$
declare
  v_item jsonb;
  v_collection text;
  v_id text;
  v_data jsonb;
  v_visible_to uuid[];
  v_deleted boolean;
  v_private_collections constant text[] := array[
    'journalEntries','habits','habitLogs','relapses','books',
    'readingSessions','weeklyFocus','habitReminders','habitAchievementRecords'
  ];
  v_allowed_collections constant text[] := array[
    'hobbies','sessions','skills','skillLogs','milestones','goals','plans',
    'resources','equipmentLinks','journalEntries','habits','habitLogs',
    'relapses','books','readingSessions','weeklyFocus','habitReminders',
    'habitAchievementRecords'
  ];
begin
  if auth.uid() is null then
    raise exception 'HOBBIES_IMPORT_AUTH_REQUIRED' using errcode = '42501';
  end if;
  if p_workspace_id is null then
    raise exception 'HOBBIES_IMPORT_WORKSPACE_REQUIRED' using errcode = '22023';
  end if;
  if p_changes is null or jsonb_typeof(p_changes) <> 'array'
     or jsonb_array_length(p_changes) < 1
     or jsonb_array_length(p_changes) > 500 then
    raise exception 'HOBBIES_IMPORT_BATCH_SIZE_INVALID' using errcode = '22023';
  end if;

  -- Reject malformed or duplicate keys before writing anything.
  if exists (
    select 1
    from jsonb_array_elements(p_changes) as x(item)
    where jsonb_typeof(x.item) <> 'object'
       or coalesce(x.item->>'collection','') = ''
       or coalesce(x.item->>'id','') = ''
       or coalesce(jsonb_typeof(x.item->'data'),'') <> 'object'
  ) then
    raise exception 'HOBBIES_IMPORT_ROW_INVALID' using errcode = '22023';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(p_changes) as x(item)
    group by x.item->>'collection', x.item->>'id'
    having count(*) > 1
  ) then
    raise exception 'HOBBIES_IMPORT_DUPLICATE_ID' using errcode = '22023';
  end if;

  for v_item in select value from jsonb_array_elements(p_changes)
  loop
    v_collection := v_item->>'collection';
    v_id := v_item->>'id';
    v_data := v_item->'data';

    if not (v_collection = any(v_allowed_collections)) then
      raise exception 'HOBBIES_IMPORT_COLLECTION_NOT_ALLOWED' using errcode = '42501';
    end if;
    if v_item ? 'deleted' and jsonb_typeof(v_item->'deleted') <> 'boolean' then
      raise exception 'HOBBIES_IMPORT_DELETED_FLAG_INVALID' using errcode = '22023';
    end if;
    v_deleted := coalesce((v_item->>'deleted')::boolean, false);

    -- Imported private records always belong to the importing user.
    -- Never accept a client-supplied audience containing another member.
    if v_item ? 'visible_to' and v_item->'visible_to' <> 'null'::jsonb then
      if jsonb_typeof(v_item->'visible_to') <> 'array'
         or jsonb_array_length(v_item->'visible_to') <> 1
         or (v_item->'visible_to'->>0)::uuid <> auth.uid() then
        raise exception 'HOBBIES_IMPORT_VISIBILITY_INVALID' using errcode = '42501';
      end if;
    end if;
    if v_collection = any(v_private_collections) then
      v_visible_to := array[auth.uid()];
    elsif v_item->'visible_to' is null or v_item->'visible_to' = 'null'::jsonb then
      v_visible_to := null;
    else
      v_visible_to := array[auth.uid()];
    end if;

    -- SECURITY INVOKER is intentional: workspace_records RLS and grants apply
    -- to the caller. A denied row or uniqueness conflict aborts this whole call.
    insert into public.workspace_records(
      workspace_id, system_id, collection, id, data, deleted, updated_by, visible_to
    ) values (
      p_workspace_id, 'hobbies', v_collection, v_id, v_data,
      v_deleted, auth.uid(), v_visible_to
    )
    returning workspace_records.updated_at into updated_at;

    collection := v_collection;
    id := v_id;
    return next;
  end loop;
end
$function$;

revoke all on function public.hobbies_import_records_batch(uuid,jsonb) from public, anon;
grant execute on function public.hobbies_import_records_batch(uuid,jsonb) to authenticated;
