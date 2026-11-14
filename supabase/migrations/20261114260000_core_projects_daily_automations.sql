begin;

-- Core-owned daily automation. Notifications are references to source records;
-- read access remains recipient-specific and source-record RLS is rechecked on read.
create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

create or replace function public.core_projects_emit_daily_notifications()
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  r record;
  v_created integer := 0;
  v_skipped integer := 0;
  v_local_today date;
  v_due_date date;
  v_event text;
  v_title text;
  v_dedupe text;
begin
  -- The job runs once per day. Compute each workspace's local date from its
  -- Projects settings instead of assuming the database/session timezone.
  for r in
    select
      task.workspace_id,
      task.id as task_id,
      task.data as task_data,
      task.visible_to as task_visible_to,
      project.id as project_id,
      project.data as project_data,
      project.visible_to as project_visible_to,
      workspace.owner_id,
      case
        when exists (
          select 1 from pg_catalog.pg_timezone_names tz
           where tz.name = coalesce(nullif(project_settings.data->>'timezone',''),'Africa/Cairo')
        ) then coalesce(nullif(project_settings.data->>'timezone',''),'Africa/Cairo')
        else 'Africa/Cairo'
      end as timezone_name,
      nullif(task.data->>'assignee_id','')::uuid as recipient_id
    from public.workspace_records task
    join public.workspace_records project
      on project.workspace_id = task.workspace_id
     and project.system_id = 'projects'
     and project.collection = 'projects'
     and project.id = task.data->>'project_id'
     and project.deleted = false
     and coalesce(project.data->>'deleted_at','') = ''
     and coalesce(project.data->>'archived_at','') = ''
    join public.workspaces workspace on workspace.id = task.workspace_id
    left join public.workspace_records project_settings
      on project_settings.workspace_id = task.workspace_id
     and project_settings.system_id = 'projects'
     and project_settings.collection = 'settings'
     and project_settings.id = 'ws'
     and project_settings.deleted = false
    where task.system_id = 'projects'
      and task.collection = 'tasks'
      and task.deleted = false
      and coalesce(task.data->>'deleted_at','') = ''
      and coalesce(task.data->>'archived_at','') = ''
      and coalesce(task.data->>'status','') not in ('Completed','Cancelled')
      and nullif(task.data->>'assignee_id','') is not null
      and task.data->>'due_date' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
  loop
    v_local_today := (now() at time zone r.timezone_name)::date;
    v_due_date := (r.task_data->>'due_date')::date;
    if v_due_date = v_local_today then
      v_event := 'task_due_today';
      v_title := 'المهمة مستحقة اليوم: ' || coalesce(nullif(r.task_data->>'title',''),'مهمة');
    elsif v_due_date = v_local_today + 1 then
      v_event := 'task_due_tomorrow';
      v_title := 'المهمة مستحقة غدًا: ' || coalesce(nullif(r.task_data->>'title',''),'مهمة');
    elsif v_due_date < v_local_today then
      v_event := 'task_overdue';
      v_title := 'مهمة متأخرة: ' || coalesce(nullif(r.task_data->>'title',''),'مهمة');
    else
      continue;
    end if;

    -- Do not enqueue for users who are no longer workspace members or cannot
    -- see the Projects Tasks section. Private project/task visibility is checked
    -- independently from workspace/system membership.
    if not (
      r.recipient_id = r.owner_id
      or exists (
        select 1
          from public.workspace_members member_row
         where member_row.workspace_id = r.workspace_id
           and member_row.user_id = r.recipient_id
           and member_row.status = 'active'
           and member_row.access->'systems'->'projects'->>'level' in ('view','edit')
           and coalesce(member_row.access->'systems'->'projects'->'sections'->>'tasks','view') <> 'none'
      )
    ) then
      v_skipped := v_skipped + 1;
      continue;
    end if;
    if r.task_visible_to is not null and not (r.recipient_id = any(r.task_visible_to)) then
      v_skipped := v_skipped + 1;
      continue;
    end if;
    if r.project_visible_to is not null and not (r.recipient_id = any(r.project_visible_to)) then
      v_skipped := v_skipped + 1;
      continue;
    end if;

    v_dedupe := v_event || ':' || r.task_id || ':' || r.recipient_id::text || ':' || v_local_today::text;
    insert into public.core_notifications(
      workspace_id, recipient_id, source_system, entity_collection, entity_id,
      event_type, title, body, deep_link, dedupe_key
    ) values (
      r.workspace_id, r.recipient_id, 'projects', 'tasks', r.task_id,
      v_event, v_title, 'المشروع: ' || coalesce(r.project_data->>'name','مشروع'),
      jsonb_build_object(
        'system','projects',
        'projectId',r.project_id,
        'tab','tasks',
        'recordKind','task',
        'recordId',r.task_id,
        'taskId',r.task_id
      ),
      v_dedupe
    )
    on conflict(workspace_id, recipient_id, dedupe_key) do nothing;
    if found then v_created := v_created + 1; else v_skipped := v_skipped + 1; end if;
  end loop;

  -- Discovery triage SLA: notify only the source owner/raiser. Do not copy
  -- project names or other project data into the notification body.
  for r in
    select discovery.workspace_id, discovery.id, discovery.data, discovery.visible_to,
           workspace.owner_id,
           case
             when exists (
               select 1 from pg_catalog.pg_timezone_names tz
                where tz.name = coalesce(nullif(settings.data->>'timezone',''),'Africa/Cairo')
             ) then coalesce(nullif(settings.data->>'timezone',''),'Africa/Cairo')
             else 'Africa/Cairo'
           end as timezone_name,
           case
             when nullif(discovery.data->>'owner_id','') is not null then (discovery.data->>'owner_id')::uuid
             else nullif(discovery.data->>'raised_by_member_id','')::uuid
           end as recipient_id,
           case
             when coalesce(settings.data->>'inboxStaleDays','') ~ '^[0-9]+$'
               then greatest(1,(settings.data->>'inboxStaleDays')::integer)
             else 3
           end as stale_days
      from public.workspace_records discovery
      join public.workspaces workspace on workspace.id = discovery.workspace_id
      left join public.workspace_records settings
        on settings.workspace_id = discovery.workspace_id
       and settings.system_id = 'projects'
       and settings.collection = 'settings'
       and settings.id = 'ws'
       and settings.deleted = false
     where discovery.system_id = 'projects'
       and discovery.collection = 'discovery'
       and discovery.deleted = false
       and coalesce(discovery.data->>'deleted_at','') = ''
       and coalesce(discovery.data->>'archived_at','') = ''
       and discovery.data->>'status' = 'Inbox'
       and discovery.data->>'logged_at' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
  loop
    v_local_today := (now() at time zone r.timezone_name)::date;
    if r.recipient_id is null
       or (r.data->>'logged_at')::date > v_local_today - r.stale_days then
      continue;
    end if;
    if not (
      r.recipient_id = r.owner_id
      or exists (
        select 1
          from public.workspace_members member_row
         where member_row.workspace_id = r.workspace_id
           and member_row.user_id = r.recipient_id
           and member_row.status = 'active'
           and member_row.access->'systems'->'projects'->>'level' in ('view','edit')
           and coalesce(member_row.access->'systems'->'projects'->'sections'->>'discovery','view') <> 'none'
      )
    ) then
      v_skipped := v_skipped + 1;
      continue;
    end if;
    if r.visible_to is not null and not (r.recipient_id = any(r.visible_to)) then
      v_skipped := v_skipped + 1;
      continue;
    end if;
    v_dedupe := 'discovery_triage:' || r.id || ':' || r.recipient_id::text || ':' || v_local_today::text;
    insert into public.core_notifications(
      workspace_id, recipient_id, source_system, entity_collection, entity_id,
      event_type, title, body, deep_link, dedupe_key
    ) values (
      r.workspace_id, r.recipient_id, 'projects', 'discovery', r.id,
      'discovery_triage_overdue',
      'عنصر اكتشاف يحتاج فرزًا: ' || coalesce(nullif(r.data->>'title',''),'عنصر اكتشاف'),
      'تجاوز عنصر الاكتشاف مهلة الفرز المحددة في إعدادات المساحة.',
      jsonb_build_object('system','projects','tab','discovery','recordKind','discovery','recordId',r.id),
      v_dedupe
    )
    on conflict(workspace_id, recipient_id, dedupe_key) do nothing;
    if found then v_created := v_created + 1; else v_skipped := v_skipped + 1; end if;
  end loop;

  return jsonb_build_object('created',v_created,'skipped',v_skipped,'ran_at',clock_timestamp());
end;
$function$;

revoke all on function public.core_projects_emit_daily_notifications() from public, anon, authenticated;
grant execute on function public.core_projects_emit_daily_notifications() to postgres;

-- Supabase Cron runs at 05:00 UTC; local dates are calculated per workspace.
select cron.schedule(
  'os_hub_projects_daily_notifications',
  '0 5 * * *',
  'select public.core_projects_emit_daily_notifications();'
);

commit;
