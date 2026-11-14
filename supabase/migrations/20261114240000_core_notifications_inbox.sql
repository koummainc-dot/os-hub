begin;

create table if not exists public.core_notifications (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  source_system text not null,
  entity_collection text not null,
  entity_id text not null,
  event_type text not null,
  title text not null,
  body text not null default '',
  deep_link jsonb not null default '{}'::jsonb,
  dedupe_key text not null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint core_notifications_dedupe unique(workspace_id,recipient_id,dedupe_key)
);

create index if not exists core_notifications_recipient_unread_idx
  on public.core_notifications(workspace_id,recipient_id,created_at desc)
  where read_at is null;

alter table public.core_notifications enable row level security;

drop policy if exists core_notifications_select on public.core_notifications;
create policy core_notifications_select
on public.core_notifications
for select
to authenticated
using (
  recipient_id = auth.uid()
  and public.ws_access_level(workspace_id, source_system, entity_collection) in ('view','edit')
  and exists (
    select 1 from public.workspace_records source_record
     where source_record.workspace_id = core_notifications.workspace_id
       and source_record.system_id = core_notifications.source_system
       and source_record.collection = core_notifications.entity_collection
       and source_record.id = core_notifications.entity_id
       and source_record.deleted = false
       and (source_record.visible_to is null or auth.uid() = any(source_record.visible_to))
       and (
         nullif(source_record.data->>'project_id','') is null
         or exists (
           select 1 from public.workspace_records project_record
            where project_record.workspace_id = source_record.workspace_id
              and project_record.system_id = source_record.system_id
              and project_record.collection = 'projects'
              and project_record.id = source_record.data->>'project_id'
              and project_record.deleted = false
              and (project_record.visible_to is null or auth.uid() = any(project_record.visible_to))
         )
       )
  )
);

drop policy if exists core_notifications_update_read on public.core_notifications;
create policy core_notifications_update_read
on public.core_notifications
for update
to authenticated
using (recipient_id = auth.uid())
with check (recipient_id = auth.uid());

grant select on public.core_notifications to authenticated;
grant update(read_at) on public.core_notifications to authenticated;
revoke insert, delete on public.core_notifications from public, anon, authenticated;

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
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'UNAUTHENTICATED' using errcode = '42501'; end if;
  if v_ws is null or v_recipient is null or v_system is null or v_collection is null or v_entity is null
     or v_event is null or v_dedupe is null or v_title is null then
    raise exception 'NOTIFICATION_FIELDS_REQUIRED' using errcode = '22023';
  end if;
  if v_recipient = auth.uid() then return jsonb_build_object('ok',true,'skipped','self'); end if;
  if public.ws_access_level(v_ws,v_system,v_collection) is distinct from 'edit' then
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

  insert into public.core_notifications(workspace_id,recipient_id,source_system,entity_collection,entity_id,event_type,title,body,deep_link,dedupe_key)
  values(v_ws,v_recipient,v_system,v_collection,v_entity,v_event,v_title,v_body,v_link,v_dedupe)
  on conflict(workspace_id,recipient_id,dedupe_key) do nothing
  returning id into v_id;
  return jsonb_build_object('ok',true,'created',v_id is not null,'id',v_id);
end;
$function$;

revoke all on function public.core_notification_emit(jsonb) from public, anon;
grant execute on function public.core_notification_emit(jsonb) to authenticated;

commit;
