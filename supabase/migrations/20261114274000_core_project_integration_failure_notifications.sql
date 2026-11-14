begin;

-- Permit only the three non-sensitive Project integration failure events to be
-- emitted by an authenticated Project viewer. Recipients must independently
-- have Projects read access; normal notification emission still requires edit.
create or replace function public.core_notification_emit(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_ws uuid := nullif(p->>'workspace_id','')::uuid;
  v_recipient uuid := nullif(p->>'recipient_id','')::uuid;
  v_system text := nullif(trim(p->>'source_system'),'');
  v_collection text := nullif(trim(p->>'entity_collection'),'');
  v_entity text := nullif(trim(p->>'entity_id'),'');
  v_event text := nullif(trim(p->>'event_type'),'');
  v_dedupe text := nullif(trim(p->>'dedupe_key'),'');
  v_title text := nullif(trim(p->>'title'),'');
  v_body text := coalesce(p->>'body','');
  v_link jsonb := coalesce(p->'deep_link','{}'::jsonb);
  v_data jsonb;
  v_visible uuid[];
  v_project_id text;
  v_project_visible uuid[];
  v_linked_project_id text;
  v_linked_project_visible uuid[];
  v_id uuid;
  v_project_integration_failure boolean :=
    v_event in ('finance_sync_failed','knowledge_meetings_sync_failed','knowledge_resources_sync_failed');
begin
  if auth.uid() is null then raise exception 'UNAUTHENTICATED' using errcode = '42501'; end if;
  if v_ws is null or v_recipient is null or v_system is null or v_collection is null or v_entity is null
     or v_event is null or v_dedupe is null or v_title is null then
    raise exception 'NOTIFICATION_FIELDS_REQUIRED' using errcode = '22023';
  end if;
  if v_recipient = auth.uid() then return jsonb_build_object('ok',true,'skipped','self'); end if;

  -- Read-only integration failures are the only events a Project viewer may
  -- emit. Normal user-authored notifications still require edit permission.
  -- Both sender and recipient must be eligible to see the Projects section.
  if v_project_integration_failure then
    if v_system <> 'projects' or v_collection <> 'projects' then
      raise exception 'PROJECT_INTEGRATION_NOTIFICATION_SOURCE_INVALID' using errcode = '22023';
    end if;
    if public.ws_access_level(v_ws,'projects','projects') not in ('view','edit') then
      raise exception 'NOTIFICATION_EMIT_FORBIDDEN' using errcode = '42501';
    end if;
    if not public.core_projects_member_has_section(v_ws,v_recipient,'projects') then
      return jsonb_build_object('ok',true,'skipped','recipient-no-project-access');
    end if;
  elsif public.ws_access_level(v_ws,v_system,v_collection) is distinct from 'edit' then
    raise exception 'NOTIFICATION_EMIT_FORBIDDEN' using errcode = '42501';
  end if;
  select wr.data, wr.visible_to into v_data, v_visible
    from public.workspace_records wr
   where wr.workspace_id=v_ws and wr.system_id=v_system and wr.collection=v_collection
     and wr.id=v_entity and wr.deleted=false and coalesce(wr.data->>'deleted_at','')=''
   for share;
  if not found then raise exception 'NOTIFICATION_SOURCE_NOT_FOUND' using errcode = 'P0002'; end if;
  if v_visible is not null and not (auth.uid()=any(v_visible)) then
    raise exception 'NOTIFICATION_SOURCE_FORBIDDEN' using errcode = '42501';
  end if;
  if v_visible is not null and not (v_recipient=any(v_visible)) then
    return jsonb_build_object('ok',true,'skipped','recipient-not-visible');
  end if;
  v_project_id := nullif(v_data->>'project_id','');
  if v_collection='projects' then v_project_id := v_entity; end if;
  if v_project_id is not null then
    select pr.visible_to into v_project_visible
      from public.workspace_records pr
     where pr.workspace_id=v_ws and pr.system_id=v_system and pr.collection='projects'
       and pr.id=v_project_id and pr.deleted=false and coalesce(pr.data->>'deleted_at','')='';
    if not found then raise exception 'NOTIFICATION_PROJECT_NOT_FOUND' using errcode = 'P0002'; end if;
    if v_project_visible is not null and not (auth.uid()=any(v_project_visible)) then
      raise exception 'NOTIFICATION_PROJECT_FORBIDDEN' using errcode = '42501';
    end if;
    if v_project_visible is not null and not (v_recipient=any(v_project_visible)) then
      return jsonb_build_object('ok',true,'skipped','recipient-not-project-member');
    end if;
  end if;
  if jsonb_typeof(v_data->'project_ids') = 'array' then
    for v_linked_project_id in
      select value from jsonb_array_elements_text(v_data->'project_ids')
    loop
      select pr.visible_to into v_linked_project_visible
        from public.workspace_records pr
       where pr.workspace_id=v_ws and pr.system_id=v_system and pr.collection='projects'
         and pr.id=v_linked_project_id and pr.deleted=false
         and coalesce(pr.data->>'deleted_at','')='';
      if not found then raise exception 'NOTIFICATION_PROJECT_NOT_FOUND' using errcode = 'P0002'; end if;
      if v_linked_project_visible is not null and not (auth.uid()=any(v_linked_project_visible)) then
        raise exception 'NOTIFICATION_PROJECT_FORBIDDEN' using errcode = '42501';
      end if;
      if v_linked_project_visible is not null and not (v_recipient=any(v_linked_project_visible)) then
        return jsonb_build_object('ok',true,'skipped','recipient-not-project-member');
      end if;
    end loop;
  end if;

  insert into public.core_notifications(workspace_id,recipient_id,source_system,entity_collection,entity_id,event_type,title,body,deep_link,dedupe_key)
  values(v_ws,v_recipient,v_system,v_collection,v_entity,v_event,v_title,v_body,v_link,v_dedupe)
  on conflict(workspace_id,recipient_id,dedupe_key) do nothing
  returning id into v_id;
  return jsonb_build_object('ok',true,'created',v_id is not null,'id',v_id);
end;
$function$;

revoke all on function public.core_notification_emit(jsonb) from public,anon;
grant execute on function public.core_notification_emit(jsonb) to authenticated;

commit;
