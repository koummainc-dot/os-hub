begin;

create or replace function public.core_projects_emit_update_due_notifications()
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  r record;
  v_today date;
  v_timezone text;
  v_reminder_time text;
  v_due_soon_days integer;
  v_auto jsonb;
  v_recipient uuid;
  v_recipients uuid[];
  v_event text;
  v_title text;
  v_dedupe text;
  v_created integer := 0;
  v_skipped integer := 0;
begin
  -- Draft Stakeholder Updates are due at period_end. Notify both the author
  -- and project lead, but only when Core confirms each recipient can read the
  -- Update and its Project.
  for r in
    select upd.workspace_id,upd.id,upd.data as update_data,
           project.id as project_id,project.data as project_data,
           settings.data as settings_data,
           case when exists (
             select 1 from pg_catalog.pg_timezone_names tz
              where tz.name=coalesce(nullif(settings.data->>'timezone',''),'Africa/Cairo')
           ) then coalesce(nullif(settings.data->>'timezone',''),'Africa/Cairo')
           else 'Africa/Cairo' end as timezone_name
      from public.workspace_records upd
      join public.workspace_records project
        on project.workspace_id=upd.workspace_id
       and project.system_id='projects' and project.collection='projects'
       and project.id=upd.data->>'project_id'
       and project.deleted=false
       and coalesce(project.data->>'deleted_at','')=''
       and coalesce(project.data->>'archived_at','')=''
      left join public.workspace_records settings
        on settings.workspace_id=upd.workspace_id and settings.system_id='projects'
       and settings.collection='settings' and settings.id='ws' and settings.deleted=false
     where upd.system_id='projects' and upd.collection='updates'
       and upd.deleted=false
       and coalesce(upd.data->>'deleted_at','')=''
       and coalesce(upd.data->>'archived_at','')=''
       and upd.data->>'status'='Draft'
       and upd.data->>'period_end' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
       and to_char(to_date(upd.data->>'period_end','YYYY-MM-DD'),'YYYY-MM-DD')=upd.data->>'period_end'
  loop
    v_timezone:=r.timezone_name;
    v_today:=(now() at time zone v_timezone)::date;
    v_reminder_time:=coalesce(nullif(r.settings_data->>'defaultReminderTime',''),'09:00');
    if v_reminder_time !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
       or to_char(now() at time zone v_timezone,'HH24:MI')<>v_reminder_time then
      continue;
    end if;
    v_auto:=coalesce(r.settings_data->'automations','{}'::jsonb);
    if v_auto->>'updateDue' is distinct from 'false' then
      v_due_soon_days:=case
        when coalesce(r.settings_data->>'dueSoonDays','') ~ '^[0-9]+$'
          then least(30,(r.settings_data->>'dueSoonDays')::integer)
        else 1
      end;
      if to_date(r.update_data->>'period_end','YYYY-MM-DD')<v_today then
        v_event:='update_overdue';
        v_title:='تحديث مشروع متأخر عن موعده: '||coalesce(nullif(r.update_data->>'title',''),'تحديث');
      elsif to_date(r.update_data->>'period_end','YYYY-MM-DD')<=v_today+v_due_soon_days then
        v_event:='update_due_soon';
        v_title:='اقترب موعد التحديث: '||coalesce(nullif(r.update_data->>'title',''),'تحديث');
      else
        continue;
      end if;

      v_recipients:=array[]::uuid[];
      if nullif(r.update_data->>'author_id','') is not null then
        v_recipients:=array_append(v_recipients,(r.update_data->>'author_id')::uuid);
      end if;
      if nullif(r.project_data->>'lead_id','') is not null
         and not ((r.project_data->>'lead_id')::uuid=any(v_recipients)) then
        v_recipients:=array_append(v_recipients,(r.project_data->>'lead_id')::uuid);
      end if;

      foreach v_recipient in array v_recipients loop
        v_dedupe:=v_event||':'||r.id||':'||v_recipient::text||':'||r.update_data->>'period_end'||':'||v_today::text;
        if public.core_projects_enqueue_notification(
          r.workspace_id,v_recipient,'updates',r.id,v_event,v_title,
          'الفترة المحددة للتحديث تنتهي في '||r.update_data->>'period_end'||'. افتح المسودة وراجعها أو انشرها عند جاهزيتها.',
          jsonb_build_object('system','projects','projectId',r.project_id,'tab','updates',
            'recordKind','update','recordId',r.id),v_dedupe
        ) then
          v_created:=v_created+1;
        else
          v_skipped:=v_skipped+1;
        end if;
      end loop;
    end if;
  end loop;

  return jsonb_build_object('created',v_created,'skipped',v_skipped,'ran_at',clock_timestamp());
end;
$function$;

revoke all on function public.core_projects_emit_update_due_notifications() from public,anon,authenticated;
grant execute on function public.core_projects_emit_update_due_notifications() to postgres;


create or replace function public.core_projects_emit_daily_notifications()
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_due_now boolean := false;
  v_main jsonb;
  v_updates jsonb;
begin
  select exists (
    select 1
      from public.workspaces w
      left join public.workspace_records settings
        on settings.workspace_id=w.id
       and settings.system_id='projects'
       and settings.collection='settings'
       and settings.id='ws'
       and settings.deleted=false
     where coalesce(nullif(settings.data->>'defaultReminderTime',''),'09:00')
             ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
       and to_char(
         now() at time zone case
           when exists (
             select 1 from pg_catalog.pg_timezone_names tz
              where tz.name=coalesce(nullif(settings.data->>'timezone',''),'Africa/Cairo')
           ) then coalesce(nullif(settings.data->>'timezone',''),'Africa/Cairo')
           else 'Africa/Cairo'
         end,
         'HH24:MI'
       ) = coalesce(nullif(settings.data->>'defaultReminderTime',''),'09:00')
  ) into v_due_now;

  if not v_due_now then
    return jsonb_build_object('created',0,'skipped',0,'reason','outside-workspace-reminder-time','ran_at',clock_timestamp());
  end if;

  v_main:=public.core_projects_emit_daily_notifications_worker();
  v_updates:=public.core_projects_emit_update_due_notifications();
  return jsonb_build_object(
    'created',coalesce((v_main->>'created')::integer,0)+coalesce((v_updates->>'created')::integer,0),
    'skipped',coalesce((v_main->>'skipped')::integer,0)+coalesce((v_updates->>'skipped')::integer,0),
    'main',v_main,'updates',v_updates,'ran_at',clock_timestamp()
  );
end;
$function$;

revoke all on function public.core_projects_emit_daily_notifications() from public,anon,authenticated;
grant execute on function public.core_projects_emit_daily_notifications() to postgres;


commit;
