-- Ventures OS V5: server-side Projects import/undo boundary
-- Uses the existing Projects atomic batch RPC so Projects authorization and
-- optimistic concurrency remain enforced by the Projects source of truth.

create or replace function public.ventures_import_apply(
  p_workspace_id uuid,
  p_import_id text,
  p_changes jsonb,
  p_traceability_decision jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $function$
declare
  item jsonb;
  transformed jsonb := '[]'::jsonb;
  before_rows jsonb := '[]'::jsonb;
  applied jsonb;
  collection_name text;
  record_id text;
  record_data jsonb;
  previous jsonb;
  seen_keys text[] := array[]::text[];
  manifest jsonb;
  existing jsonb;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_workspace_id is null or public.ws_access_level(p_workspace_id,'ventures','import') is distinct from 'edit' then
    raise exception 'Edit access required for Ventures import' using errcode = '42501';
  end if;
  if nullif(trim(p_import_id),'') is null or length(p_import_id) > 160 then
    raise exception 'A valid import_id is required' using errcode = '22023';
  end if;
  if jsonb_typeof(p_changes) is distinct from 'array'
     or jsonb_array_length(p_changes) = 0
     or jsonb_array_length(p_changes) > 1000 then
    raise exception 'Changes must be a non-empty array of at most 1000 records' using errcode = '22023';
  end if;
  if jsonb_typeof(p_traceability_decision) is distinct from 'object'
     or nullif(trim(p_traceability_decision->>'reason'),'') is null then
    raise exception 'A recorded traceability decision reason is required' using errcode = '22023';
  end if;

  select wr.data into existing
  from public.workspace_records wr
  where wr.workspace_id=p_workspace_id
    and wr.system_id='ventures'
    and wr.collection='imports'
    and wr.id=p_import_id
    and wr.deleted=false
  limit 1;
  if existing is not null then
    return jsonb_build_object('ok',true,'reused',true,'import_id',p_import_id,'manifest',existing);
  end if;

  for item in select value from jsonb_array_elements(p_changes)
  loop
    collection_name := item->>'collection';
    record_id := item->>'id';
    record_data := item->'data';
    if collection_name not in ('tasks','outputs','projects','risks','issues','decisions','prds','updates')
       or nullif(record_id,'') is null
       or jsonb_typeof(record_data) is distinct from 'object'
       or jsonb_typeof(item->'deleted') is distinct from 'boolean'
       or (item ? 'visible_to' and jsonb_typeof(item->'visible_to') not in ('array','null')) then
      raise exception 'Invalid Projects import item' using errcode = '22023';
    end if;
    if public.ws_access_level(p_workspace_id,'projects',collection_name) is distinct from 'edit' then
      raise exception 'Edit access required for Projects collection %',collection_name using errcode = '42501';
    end if;
    if (collection_name || '/' || record_id)=any(seen_keys) then
      raise exception 'Duplicate record in import: %/%',collection_name,record_id using errcode = '22023';
    end if;
    seen_keys := array_append(seen_keys,collection_name || '/' || record_id);

    select jsonb_build_object(
      'exists',true,
      'data',wr.data,
      'deleted',wr.deleted,
      'visible_to',to_jsonb(wr.visible_to),
      'updated_at',wr.updated_at
    ) into previous
    from public.workspace_records wr
    where wr.workspace_id=p_workspace_id
      and wr.system_id='projects'
      and wr.collection=collection_name
      and wr.id=record_id
    for update;

    before_rows := before_rows || jsonb_build_array(
      jsonb_build_object(
        'collection',collection_name,
        'id',record_id,
        'previous',coalesce(previous,jsonb_build_object('exists',false))
      )
    );

    record_data := jsonb_set(
      record_data,
      '{_ventures_import}',
      jsonb_build_object(
        'import_id',p_import_id,
        'traceability_decision',p_traceability_decision,
        'imported_at',clock_timestamp()
      ),
      true
    );

    transformed := transformed || jsonb_build_array(
      jsonb_build_object(
        'collection',collection_name,
        'id',record_id,
        'data',record_data,
        'deleted',(item->>'deleted')::boolean,
        'visible_to',coalesce(item->'visible_to','null'::jsonb),
        'expected_updated_at',coalesce(item->>'expected_updated_at','')
      )
    );
  end loop;

  applied := public.projects_apply_records_batch(p_workspace_id,transformed);

  manifest := jsonb_build_object(
    'import_id',p_import_id,
    'status','applied',
    'applied_at',clock_timestamp(),
    'expires_at',clock_timestamp()+interval '14 days',
    'traceability_decision',p_traceability_decision,
    'before',before_rows,
    'after',applied
  );

  insert into public.workspace_records(
    workspace_id,system_id,collection,id,data,deleted,visible_to,updated_at,updated_by
  ) values (
    p_workspace_id,'ventures','imports',p_import_id,manifest,false,null,clock_timestamp(),auth.uid()
  );

  return jsonb_build_object('ok',true,'reused',false,'import_id',p_import_id,'applied',applied);
end;
$function$;

create or replace function public.ventures_import_undo(
  p_workspace_id uuid,
  p_import_id text
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $function$
declare
  manifest jsonb;
  item jsonb;
  previous jsonb;
  after_item jsonb;
  collection_name text;
  record_id text;
  current_updated_at timestamptz;
  expected_after timestamptz;
  rollback jsonb := '[]'::jsonb;
  restored jsonb;
  conflicts jsonb := '[]'::jsonb;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_workspace_id is null or public.ws_access_level(p_workspace_id,'ventures','import') is distinct from 'edit' then
    raise exception 'Edit access required for Ventures import undo' using errcode = '42501';
  end if;

  select wr.data into manifest
  from public.workspace_records wr
  where wr.workspace_id=p_workspace_id
    and wr.system_id='ventures'
    and wr.collection='imports'
    and wr.id=p_import_id
    and wr.deleted=false
  limit 1;

  if manifest is null then
    raise exception 'Import manifest not found' using errcode = '22023';
  end if;
  if manifest->>'status' <> 'applied' then
    return jsonb_build_object('ok',true,'status',manifest->>'status','import_id',p_import_id);
  end if;
  if (manifest->>'expires_at')::timestamptz < clock_timestamp() then
    raise exception 'Import undo window expired' using errcode = '22023';
  end if;

  for item in select value from jsonb_array_elements(manifest->'before')
  loop
    collection_name := item->>'collection';
    record_id := item->>'id';
    previous := item->'previous';
    after_item := (
      select value
      from jsonb_array_elements(manifest->'after')
      where value->>'collection'=collection_name and value->>'id'=record_id
      limit 1
    );

    if after_item is null then
      raise exception 'Import manifest is incomplete for %/%',collection_name,record_id using errcode = '22023';
    end if;

    if public.ws_access_level(p_workspace_id,'projects',collection_name) is distinct from 'edit' then
      raise exception 'Edit access required for Projects collection %',collection_name using errcode = '42501';
    end if;

    expected_after := nullif(after_item->>'updated_at','')::timestamptz;
    select wr.updated_at into current_updated_at
    from public.workspace_records wr
    where wr.workspace_id=p_workspace_id
      and wr.system_id='projects'
      and wr.collection=collection_name
      and wr.id=record_id;

    if current_updated_at is distinct from expected_after then
      conflicts := conflicts || jsonb_build_array(jsonb_build_object(
        'collection',collection_name,
        'id',record_id,
        'expected_updated_at',expected_after,
        'actual_updated_at',current_updated_at
      ));
      continue;
    end if;

    if (previous->>'exists')::boolean then
      rollback := rollback || jsonb_build_array(jsonb_build_object(
        'collection',collection_name,
        'id',record_id,
        'data',previous->'data',
        'deleted',(previous->>'deleted')::boolean,
        'visible_to',coalesce(previous->'visible_to','null'::jsonb),
        'expected_updated_at',current_updated_at
      ));
    else
      rollback := rollback || jsonb_build_array(jsonb_build_object(
        'collection',collection_name,
        'id',record_id,
        'data','{}'::jsonb,
        'deleted',true,
        'visible_to','null'::jsonb,
        'expected_updated_at',current_updated_at
      ));
    end if;
  end loop;

  if jsonb_array_length(conflicts)>0 then
    return jsonb_build_object('ok',false,'status','conflict','import_id',p_import_id,'conflicts',conflicts);
  end if;

  restored := public.projects_apply_records_batch(p_workspace_id,rollback);

  update public.workspace_records
     set data=jsonb_set(jsonb_set(manifest,'{status}','"undone"'::jsonb,true),'{undone_at}',to_jsonb(clock_timestamp()),true),
         updated_at=clock_timestamp(),
         updated_by=auth.uid()
   where workspace_id=p_workspace_id
     and system_id='ventures'
     and collection='imports'
     and id=p_import_id;

  return jsonb_build_object('ok',true,'status','undone','import_id',p_import_id,'restored',restored,'conflicts',jsonb_build_array());
end;
$function$;

grant execute on function public.ventures_import_apply(uuid,text,jsonb,jsonb) to authenticated;
grant execute on function public.ventures_import_undo(uuid,text) to authenticated;
revoke execute on function public.ventures_import_apply(uuid,text,jsonb,jsonb) from anon, public;
revoke execute on function public.ventures_import_undo(uuid,text) from anon, public;
