begin;

-- Cron polls every minute, but the notification worker should only scan
-- Projects records when at least one workspace has reached its local reminder
-- time. Keep the worker body intact and wrap it with an inexpensive gate.
alter function public.core_projects_emit_daily_notifications()
  rename to core_projects_emit_daily_notifications_worker;

create or replace function public.core_projects_emit_daily_notifications()
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_due_now boolean := false;
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

  return public.core_projects_emit_daily_notifications_worker();
end;
$function$;

revoke all on function public.core_projects_emit_daily_notifications() from public,anon,authenticated;
grant execute on function public.core_projects_emit_daily_notifications() to postgres;

commit;
