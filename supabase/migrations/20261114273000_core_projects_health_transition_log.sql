begin;

create table if not exists public.core_project_health_state (
  workspace_id uuid not null,
  project_id text not null,
  health_state text not null,
  reasons jsonb not null default '[]'::jsonb,
  observed_at timestamptz not null default now(),
  primary key (workspace_id,project_id)
);

create table if not exists public.core_project_health_transitions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  project_id text not null,
  previous_state text,
  next_state text not null,
  reasons jsonb not null default '[]'::jsonb,
  occurred_at timestamptz not null default now(),
  is_baseline boolean not null default false
);

create index if not exists core_project_health_transitions_lookup_idx
  on public.core_project_health_transitions(workspace_id,project_id,occurred_at desc);

revoke all on public.core_project_health_state from public,anon,authenticated;
revoke all on public.core_project_health_transitions from public,anon,authenticated;


CREATE OR REPLACE FUNCTION public.core_projects_emit_daily_notifications_worker()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  r record;
  member_row record;
  v_created integer := 0;
  v_skipped integer := 0;
  v_today date;
  v_due_date date;
  v_week_start date;
  v_week_start_day integer;
  v_due_soon_days integer;
  v_yellow_days integer;
  v_risk_high numeric;
  v_yellow_progress numeric;
  v_stale_days integer;
  v_timer_max_hours numeric;
  v_timezone text;
  v_reminder_time text;
  v_auto jsonb;
  v_event text;
  v_title text;
  v_body text;
  v_dedupe text;
  v_deep_link jsonb;
  v_recipient uuid;
  v_recipients uuid[];
  v_health text;
  v_has_critical boolean;
  v_has_overdue boolean;
  v_has_high_risk boolean;
  v_active_leaf integer;
  v_done_leaf integer;
  v_checkin_date date;
  v_last_checkin_text text;
  v_started_at timestamptz;
  v_target_date_text text;
  v_contact_project_id text;
  v_elapsed_hours numeric;
begin
  -- Every workspace runs at its configured local reminder time. The Cron job
  -- wakes once per minute; this function emits only once per local day/time.
  -- Timezone values are validated before use and default to Africa/Cairo.
  -- All events are references to Projects-owned records; no record data is copied.

  -- 1) Task due reminders and overdue digest. Parent Tasks are excluded exactly
  -- as in the in-app alert engine; only active leaf Tasks are eligible.
  for r in
    select task.workspace_id, task.id as task_id, task.data as task_data,
           project.id as project_id, project.data as project_data,
           workspace.owner_id, settings.data as settings_data,
           case
             when exists (
               select 1 from pg_catalog.pg_timezone_names tz
                where tz.name=coalesce(nullif(settings.data->>'timezone',''),'Africa/Cairo')
             ) then coalesce(nullif(settings.data->>'timezone',''),'Africa/Cairo')
             else 'Africa/Cairo'
           end as timezone_name
      from public.workspace_records task
      join public.workspace_records project
        on project.workspace_id=task.workspace_id
       and project.system_id='projects' and project.collection='projects'
       and project.id=task.data->>'project_id'
       and project.deleted=false
       and coalesce(project.data->>'deleted_at','')=''
       and coalesce(project.data->>'archived_at','')=''
      join public.workspaces workspace on workspace.id=task.workspace_id
      left join public.workspace_records settings
        on settings.workspace_id=task.workspace_id and settings.system_id='projects'
       and settings.collection='settings' and settings.id='ws' and settings.deleted=false
     where task.system_id='projects' and task.collection='tasks'
       and task.deleted=false
       and coalesce(task.data->>'deleted_at','')=''
       and coalesce(task.data->>'archived_at','')=''
       and coalesce(task.data->>'status','') not in ('Completed','Cancelled')
       and nullif(task.data->>'assignee_id','') is not null
       and task.data->>'due_date' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
       and to_char(to_date(task.data->>'due_date','YYYY-MM-DD'),'YYYY-MM-DD')=task.data->>'due_date'
       and not exists (
         select 1 from public.workspace_records child
          where child.workspace_id=task.workspace_id
            and child.system_id='projects' and child.collection='tasks'
            and child.deleted=false
            and coalesce(child.data->>'deleted_at','')=''
            and coalesce(child.data->>'archived_at','')=''
            and child.data->>'parent_task_id'=task.id
       )
  loop
    v_timezone := r.timezone_name;
    v_today := (now() at time zone v_timezone)::date;
    v_reminder_time := coalesce(nullif(r.settings_data->>'defaultReminderTime',''),'09:00');
    if v_reminder_time !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
       or to_char(now() at time zone v_timezone,'HH24:MI')<>v_reminder_time then
      continue;
    end if;
    v_auto := coalesce(r.settings_data->'automations','{}'::jsonb);
    v_due_soon_days := case when coalesce(r.settings_data->>'dueSoonDays','') ~ '^[0-9]+$'
      then least(30,(r.settings_data->>'dueSoonDays')::integer) else 1 end;
    v_due_date := to_date(r.task_data->>'due_date','YYYY-MM-DD');
    v_recipient := nullif(r.task_data->>'assignee_id','')::uuid;
    if v_due_date < v_today and v_auto->>'overdueDigest' is distinct from 'false' then
      v_event := 'task_overdue';
      v_title := 'مهمة متأخرة: ' || coalesce(nullif(r.task_data->>'title',''),'مهمة');
    elsif v_due_date <= v_today + v_due_soon_days and v_auto->>'dueReminders' is distinct from 'false' then
      v_event := case when v_due_date=v_today then 'task_due_today' else 'task_due_soon' end;
      v_title := case when v_due_date=v_today then 'المهمة مستحقة اليوم: ' else 'المهمة تقترب من موعدها: ' end
        || coalesce(nullif(r.task_data->>'title',''),'مهمة');
    else
      continue;
    end if;
    v_dedupe := v_event||':'||r.task_id||':'||v_recipient::text||':'||v_today::text;
    v_deep_link := jsonb_build_object('system','projects','projectId',r.project_id,'tab','tasks',
      'recordKind','task','recordId',r.task_id,'taskId',r.task_id);
    if public.core_projects_enqueue_notification(r.workspace_id,v_recipient,'tasks',r.task_id,
      v_event,v_title,'المشروع: '||coalesce(r.project_data->>'name','مشروع'),v_deep_link,v_dedupe)
    then v_created:=v_created+1; else v_skipped:=v_skipped+1; end if;
  end loop;

  -- 2) Project target dates and health (Red/Orange only). Health is recomputed
  -- from the same active-leaf, Critical Issue, overdue Task and high-Risk rules
  -- as Projects domain; notification does not persist a second health value.
  for r in
    select project.workspace_id, project.id as project_id, project.data as project_data,
           workspace.owner_id, settings.data as settings_data,
           case
             when exists (
               select 1 from pg_catalog.pg_timezone_names tz
                where tz.name=coalesce(nullif(settings.data->>'timezone',''),'Africa/Cairo')
             ) then coalesce(nullif(settings.data->>'timezone',''),'Africa/Cairo')
             else 'Africa/Cairo'
           end as timezone_name
      from public.workspace_records project
      join public.workspaces workspace on workspace.id=project.workspace_id
      left join public.workspace_records settings
        on settings.workspace_id=project.workspace_id and settings.system_id='projects'
       and settings.collection='settings' and settings.id='ws' and settings.deleted=false
     where project.system_id='projects' and project.collection='projects'
       and project.deleted=false
       and coalesce(project.data->>'deleted_at','')=''
       and coalesce(project.data->>'archived_at','')=''
       and coalesce(project.data->>'status','') not in ('Idea','On Hold','Completed','Cancelled','Archived')
  loop
    v_timezone:=r.timezone_name;
    v_today:=(now() at time zone v_timezone)::date;
    v_reminder_time:=coalesce(nullif(r.settings_data->>'defaultReminderTime',''),'09:00');
    if v_reminder_time !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
       or to_char(now() at time zone v_timezone,'HH24:MI')<>v_reminder_time then
      continue;
    end if;
    v_auto:=coalesce(r.settings_data->'automations','{}'::jsonb);
    v_deep_link:=jsonb_build_object('system','projects','projectId',r.project_id,'tab','overview');

    v_target_date_text:=r.project_data->>'target_date';
    if v_target_date_text ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
       and to_char(to_date(v_target_date_text,'YYYY-MM-DD'),'YYYY-MM-DD')=v_target_date_text then
      v_due_date:=to_date(v_target_date_text,'YYYY-MM-DD');
      if v_due_date<v_today and v_auto->>'overdueDigest' is distinct from 'false' then
        v_event:='project_target_overdue';
        v_title:='الموعد المستهدف للمشروع متأخر: '||coalesce(nullif(r.project_data->>'name',''),'مشروع');
      elsif v_due_date between v_today and v_today+7 and v_auto->>'dueReminders' is distinct from 'false' then
        v_event:='project_target_soon';
        v_title:='موعد المشروع يقترب: '||coalesce(nullif(r.project_data->>'name',''),'مشروع');
      else
        v_event:=null;
      end if;
      if v_event is not null then
        v_recipients:=array[]::uuid[];
        if nullif(r.project_data->>'lead_id','') is not null then
          v_recipients:=array_append(v_recipients,(r.project_data->>'lead_id')::uuid);
        end if;
        if jsonb_typeof(r.project_data->'members')='array' then
          for member_row in select value from jsonb_array_elements(r.project_data->'members')
          loop
            if nullif(member_row.value->>'member_id','') is not null then
              v_recipient:=(member_row.value->>'member_id')::uuid;
              if not v_recipient=any(v_recipients) then v_recipients:=array_append(v_recipients,v_recipient); end if;
            end if;
          end loop;
        end if;
        foreach v_recipient in array v_recipients loop
          v_dedupe:=v_event||':'||r.project_id||':'||v_recipient::text||':'||v_today::text;
          if public.core_projects_enqueue_notification(r.workspace_id,v_recipient,'projects',r.project_id,
            v_event,v_title,'راجع خطة المشروع وموعده المستهدف.',v_deep_link,v_dedupe)
          then v_created:=v_created+1; else v_skipped:=v_skipped+1; end if;
        end loop;
      end if;
    end if;


  end loop;

  -- 3) High assigned Risks and Critical Issues.
  for r in
    select risk.workspace_id,risk.id,risk.data,settings.data as settings_data,
           case when exists(select 1 from pg_catalog.pg_timezone_names tz
             where tz.name=coalesce(nullif(settings.data->>'timezone',''),'Africa/Cairo'))
             then coalesce(nullif(settings.data->>'timezone',''),'Africa/Cairo') else 'Africa/Cairo' end as timezone_name
      from public.workspace_records risk
      left join public.workspace_records settings
        on settings.workspace_id=risk.workspace_id and settings.system_id='projects'
       and settings.collection='settings' and settings.id='ws' and settings.deleted=false
     where risk.system_id='projects' and risk.collection='risks'
       and risk.deleted=false and coalesce(risk.data->>'deleted_at','')=''
       and coalesce(risk.data->>'archived_at','')=''
       and risk.data->>'status' in ('Open','In Mitigation')
       and nullif(risk.data->>'owner_id','') is not null
       and coalesce(nullif(risk.data->>'probability','')::numeric,0)
         * coalesce(nullif(risk.data->>'impact','')::numeric,0) >= 12
  loop
    v_timezone:=r.timezone_name; v_today:=(now() at time zone v_timezone)::date;
    v_reminder_time:=coalesce(nullif(r.settings_data->>'defaultReminderTime',''),'09:00');
    if v_reminder_time !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' or to_char(now() at time zone v_timezone,'HH24:MI')<>v_reminder_time then continue; end if;
    v_auto:=coalesce(r.settings_data->'automations','{}'::jsonb);
    if v_auto->>'governanceAlerts' is distinct from 'false' then
      v_recipient:=(r.data->>'owner_id')::uuid;
      v_dedupe:='high_risk_daily:'||r.id||':'||v_recipient::text||':'||v_today::text;
      if public.core_projects_enqueue_notification(r.workspace_id,v_recipient,'risks',r.id,
        'high_risk_daily','خطر مرتفع يحتاج مراجعتك: '||coalesce(nullif(r.data->>'title',''),'خطر'),
        'توجد مخاطرة مفتوحة ذات درجة مرتفعة ومسندة إليك.',
        jsonb_build_object('system','projects','projectId',r.data->>'project_id','tab','risks','recordKind','risk','recordId',r.id),v_dedupe)
      then v_created:=v_created+1; else v_skipped:=v_skipped+1; end if;
    end if;
  end loop;

  for r in
    select issue.workspace_id,issue.id,issue.data,settings.data as settings_data,
           case when exists(select 1 from pg_catalog.pg_timezone_names tz
             where tz.name=coalesce(nullif(settings.data->>'timezone',''),'Africa/Cairo'))
             then coalesce(nullif(settings.data->>'timezone',''),'Africa/Cairo') else 'Africa/Cairo' end as timezone_name
      from public.workspace_records issue
      left join public.workspace_records settings
        on settings.workspace_id=issue.workspace_id and settings.system_id='projects'
       and settings.collection='settings' and settings.id='ws' and settings.deleted=false
     where issue.system_id='projects' and issue.collection='issues'
       and issue.deleted=false and coalesce(issue.data->>'deleted_at','')=''
       and coalesce(issue.data->>'archived_at','')=''
       and issue.data->>'status' in ('Open','In Progress')
       and issue.data->>'severity'='Critical'
       and nullif(issue.data->>'owner_id','') is not null
  loop
    v_timezone:=r.timezone_name; v_today:=(now() at time zone v_timezone)::date;
    v_reminder_time:=coalesce(nullif(r.settings_data->>'defaultReminderTime',''),'09:00');
    if v_reminder_time !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' or to_char(now() at time zone v_timezone,'HH24:MI')<>v_reminder_time then continue; end if;
    v_recipient:=(r.data->>'owner_id')::uuid;
    v_dedupe:='critical_issue_daily:'||r.id||':'||v_recipient::text||':'||v_today::text;
    if public.core_projects_enqueue_notification(r.workspace_id,v_recipient,'issues',r.id,
      'critical_issue_daily','مشكلة حرجة تحتاج متابعتك: '||coalesce(nullif(r.data->>'title',''),'مشكلة'),
      'توجد مشكلة حرجة مفتوحة ومسندة إليك.',
      jsonb_build_object('system','projects','projectId',r.data->>'project_id','tab','issues','recordKind','issue','recordId',r.id),v_dedupe)
    then v_created:=v_created+1; else v_skipped:=v_skipped+1; end if;
  end loop;

  -- 4) PRD and Output approvals awaiting action.
  for r in
    select prd.workspace_id,prd.id,prd.data,settings.data as settings_data,
           case when exists(select 1 from pg_catalog.pg_timezone_names tz
             where tz.name=coalesce(nullif(settings.data->>'timezone',''),'Africa/Cairo'))
             then coalesce(nullif(settings.data->>'timezone',''),'Africa/Cairo') else 'Africa/Cairo' end as timezone_name
      from public.workspace_records prd
      left join public.workspace_records settings
        on settings.workspace_id=prd.workspace_id and settings.system_id='projects'
       and settings.collection='settings' and settings.id='ws' and settings.deleted=false
     where prd.system_id='projects' and prd.collection='prds'
       and prd.deleted=false and coalesce(prd.data->>'deleted_at','')=''
       and coalesce(prd.data->>'archived_at','')=''
       and prd.data->>'status'='Ready for Review'
       and jsonb_typeof(prd.data->'reviewer_ids')='array'
  loop
    v_timezone:=r.timezone_name; v_today:=(now() at time zone v_timezone)::date;
    v_reminder_time:=coalesce(nullif(r.settings_data->>'defaultReminderTime',''),'09:00');
    if v_reminder_time !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' or to_char(now() at time zone v_timezone,'HH24:MI')<>v_reminder_time then continue; end if;
    v_auto:=coalesce(r.settings_data->'automations','{}'::jsonb);
    if v_auto->>'prdReview' is distinct from 'false' then
      for member_row in select value from jsonb_array_elements_text(r.data->'reviewer_ids')
      loop
        v_recipient:=member_row.value::uuid;
        v_dedupe:='prd_review_daily:'||r.id||':'||v_recipient::text||':'||coalesce(r.data->>'updated_at','');
        if public.core_projects_enqueue_notification(r.workspace_id,v_recipient,'prds',r.id,
          'prd_review_reminder','مواصفة بانتظار مراجعتك: '||coalesce(nullif(r.data->>'title',''),'PRD'),
          'يوجد طلب مراجعة مفتوح في Projects.',
          jsonb_build_object('system','projects','projectId',r.data->>'project_id','tab','prds','recordKind','prd','recordId',r.id),v_dedupe)
        then v_created:=v_created+1; else v_skipped:=v_skipped+1; end if;
      end loop;
    end if;
  end loop;

  for r in
    select output.workspace_id,output.id,output.data,project.data as project_data,settings.data as settings_data,
           case when exists(select 1 from pg_catalog.pg_timezone_names tz
             where tz.name=coalesce(nullif(settings.data->>'timezone',''),'Africa/Cairo'))
             then coalesce(nullif(settings.data->>'timezone',''),'Africa/Cairo') else 'Africa/Cairo' end as timezone_name
      from public.workspace_records output
      join public.workspace_records project
        on project.workspace_id=output.workspace_id and project.system_id='projects'
       and project.collection='projects' and project.id=output.data->>'project_id'
       and project.deleted=false and coalesce(project.data->>'deleted_at','')=''
       and coalesce(project.data->>'archived_at','')=''
      left join public.workspace_records settings
        on settings.workspace_id=output.workspace_id and settings.system_id='projects'
       and settings.collection='settings' and settings.id='ws' and settings.deleted=false
     where output.system_id='projects' and output.collection='outputs'
       and output.deleted=false and coalesce(output.data->>'deleted_at','')=''
       and coalesce(output.data->>'archived_at','')=''
       and output.data->>'approval'='Review'
       and nullif(project.data->>'lead_id','') is not null
  loop
    v_timezone:=r.timezone_name; v_today:=(now() at time zone v_timezone)::date;
    v_reminder_time:=coalesce(nullif(r.settings_data->>'defaultReminderTime',''),'09:00');
    if v_reminder_time !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' or to_char(now() at time zone v_timezone,'HH24:MI')<>v_reminder_time then continue; end if;
    v_auto:=coalesce(r.settings_data->'automations','{}'::jsonb);
    if v_auto->>'outputReview' is distinct from 'false' then
      v_recipient:=(r.project_data->>'lead_id')::uuid;
      v_dedupe:='output_review_daily:'||r.id||':'||v_recipient::text||':'||coalesce(r.data->>'updated_at','');
      if public.core_projects_enqueue_notification(r.workspace_id,v_recipient,'outputs',r.id,
        'output_review_reminder','مخرج بانتظار اعتماد المشروع: '||coalesce(nullif(r.data->>'name',''),'مخرج'),
        'يوجد مخرج بانتظار المراجعة أو الاعتماد.',
        jsonb_build_object('system','projects','projectId',r.data->>'project_id','tab','outputs','recordKind','output','recordId',r.id),v_dedupe)
      then v_created:=v_created+1; else v_skipped:=v_skipped+1; end if;
    end if;
  end loop;

  -- 5) Discovery triage (uses the configured stale-inbox threshold).
  for r in
    select discovery.workspace_id,discovery.id,discovery.data,settings.data as settings_data,
           case when exists(select 1 from pg_catalog.pg_timezone_names tz
             where tz.name=coalesce(nullif(settings.data->>'timezone',''),'Africa/Cairo'))
             then coalesce(nullif(settings.data->>'timezone',''),'Africa/Cairo') else 'Africa/Cairo' end as timezone_name
      from public.workspace_records discovery
      left join public.workspace_records settings
        on settings.workspace_id=discovery.workspace_id and settings.system_id='projects'
       and settings.collection='settings' and settings.id='ws' and settings.deleted=false
     where discovery.system_id='projects' and discovery.collection='discovery'
       and discovery.deleted=false and coalesce(discovery.data->>'deleted_at','')=''
       and coalesce(discovery.data->>'archived_at','')=''
       and discovery.data->>'status'='Inbox'
       and discovery.data->>'logged_at' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
       and to_char(to_date(discovery.data->>'logged_at','YYYY-MM-DD'),'YYYY-MM-DD')=discovery.data->>'logged_at'
  loop
    v_timezone:=r.timezone_name; v_today:=(now() at time zone v_timezone)::date;
    v_reminder_time:=coalesce(nullif(r.settings_data->>'defaultReminderTime',''),'09:00');
    if v_reminder_time !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' or to_char(now() at time zone v_timezone,'HH24:MI')<>v_reminder_time then continue; end if;
    v_auto:=coalesce(r.settings_data->'automations','{}'::jsonb);
    v_stale_days:=case when coalesce(r.settings_data->>'inboxStaleDays','') ~ '^[0-9]+$'
      then greatest(1,least(365,(r.settings_data->>'inboxStaleDays')::integer)) else 14 end;
    if v_auto->>'staleInbox' is distinct from 'false' and to_date(r.data->>'logged_at','YYYY-MM-DD') < v_today-v_stale_days then
      v_recipient:=coalesce(nullif(r.data->>'owner_id','')::uuid,nullif(r.data->>'raised_by_member_id','')::uuid);
      v_dedupe:='discovery_triage:'||r.id||':'||coalesce(v_recipient::text,'unassigned')||':'||v_today::text;
      if v_recipient is not null and public.core_projects_enqueue_notification(r.workspace_id,v_recipient,'discovery',r.id,
        'discovery_triage_overdue','عنصر اكتشاف يحتاج فرزًا: '||coalesce(nullif(r.data->>'title',''),'عنصر اكتشاف'),
        'تجاوز العنصر مهلة الفرز المحددة في إعدادات المساحة.',
        jsonb_build_object('system','projects','tab','discovery','recordKind','discovery','recordId',r.id),v_dedupe)
      then v_created:=v_created+1; else v_skipped:=v_skipped+1; end if;
    end if;
  end loop;

  -- 6) Contact follow-ups belong to their creator (or the first linked Project
  -- lead when no creator is present); Projects never duplicates Contacts data.
  for r in
    select contact.workspace_id,contact.id,contact.data,workspace.owner_id,settings.data as settings_data,
           case when exists(select 1 from pg_catalog.pg_timezone_names tz
             where tz.name=coalesce(nullif(settings.data->>'timezone',''),'Africa/Cairo'))
             then coalesce(nullif(settings.data->>'timezone',''),'Africa/Cairo') else 'Africa/Cairo' end as timezone_name
      from public.workspace_records contact
      join public.workspaces workspace on workspace.id=contact.workspace_id
      left join public.workspace_records settings
        on settings.workspace_id=contact.workspace_id and settings.system_id='projects'
       and settings.collection='settings' and settings.id='ws' and settings.deleted=false
     where contact.system_id='projects' and contact.collection='contacts'
       and contact.deleted=false and coalesce(contact.data->>'deleted_at','')=''
       and coalesce(contact.data->>'archived_at','')=''
       and contact.data->>'follow_up_date' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
       and to_char(to_date(contact.data->>'follow_up_date','YYYY-MM-DD'),'YYYY-MM-DD')=contact.data->>'follow_up_date'
  loop
    v_timezone:=r.timezone_name; v_today:=(now() at time zone v_timezone)::date;
    v_reminder_time:=coalesce(nullif(r.settings_data->>'defaultReminderTime',''),'09:00');
    if v_reminder_time !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' or to_char(now() at time zone v_timezone,'HH24:MI')<>v_reminder_time then continue; end if;
    if to_date(r.data->>'follow_up_date','YYYY-MM-DD')>v_today then continue; end if;
    v_recipient:=nullif(r.data->>'created_by','')::uuid;
    if v_recipient is null and jsonb_typeof(r.data->'project_ids')='array' then
      select nullif(project.data->>'lead_id','')::uuid into v_recipient
        from jsonb_array_elements_text(r.data->'project_ids') linked(value)
        join public.workspace_records project
          on project.workspace_id=r.workspace_id and project.system_id='projects'
         and project.collection='projects' and project.id=linked.value and project.deleted=false
       where nullif(project.data->>'lead_id','') is not null
       limit 1;
    end if;
    if v_recipient is null then v_recipient:=r.owner_id; end if;
    v_dedupe:='contact_follow_up:'||r.id||':'||v_recipient::text||':'||r.data->>'follow_up_date';
    if public.core_projects_enqueue_notification(r.workspace_id,v_recipient,'contacts',r.id,
      'contact_follow_up_due','موعد متابعة جهة اتصال: '||coalesce(nullif(r.data->>'name',''),'جهة اتصال'),
      'حان موعد المتابعة المسجّل في جهة الاتصال.',
      jsonb_build_object('system','projects','tab','contacts','recordKind','contact','recordId',r.id),v_dedupe)
    then v_created:=v_created+1; else v_skipped:=v_skipped+1; end if;
  end loop;

  -- 7) Weekly review reminder and numeric KR check-in. Reviews stay private:
  -- the source record's visible_to must include the same member who receives it.
  for r in
    select review.workspace_id,review.id,review.data,settings.data as settings_data,
           case when exists(select 1 from pg_catalog.pg_timezone_names tz
             where tz.name=coalesce(nullif(settings.data->>'timezone',''),'Africa/Cairo'))
             then coalesce(nullif(settings.data->>'timezone',''),'Africa/Cairo') else 'Africa/Cairo' end as timezone_name
      from public.workspace_records review
      left join public.workspace_records settings
        on settings.workspace_id=review.workspace_id and settings.system_id='projects'
       and settings.collection='settings' and settings.id='ws' and settings.deleted=false
     where review.system_id='projects' and review.collection='reviews'
       and review.deleted=false and coalesce(review.data->>'deleted_at','')=''
       and review.data->>'status'='Draft'
       and nullif(review.data->>'member_id','') is not null
  loop
    v_timezone:=r.timezone_name; v_today:=(now() at time zone v_timezone)::date;
    v_reminder_time:=coalesce(nullif(r.settings_data->>'defaultReminderTime',''),'09:00');
    if v_reminder_time !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' or to_char(now() at time zone v_timezone,'HH24:MI')<>v_reminder_time then continue; end if;
    v_week_start_day:=case when coalesce(r.settings_data->>'weekStartDay','') ~ '^[0-6]$'
      then (r.settings_data->>'weekStartDay')::integer else 6 end;
    v_week_start:=v_today-((extract(dow from v_today)::integer-v_week_start_day+7)%7);
    if r.data->>'week_start'=v_week_start::text
       and coalesce(r.settings_data->'automations'->>'reviewDraft','true')<>'false' then
      v_recipient:=(r.data->>'member_id')::uuid;
      v_dedupe:='weekly_review:'||r.id||':'||v_week_start::text;
      if public.core_projects_enqueue_notification(r.workspace_id,v_recipient,'reviews',r.id,
        'weekly_review_reminder','مراجعتك الأسبوعية ما زالت مسودة',
        'خصص وقتًا لإغلاق مراجعة الأسبوع أو استكمالها؛ تبقى خاصة بك.',
        jsonb_build_object('system','projects','tab','reviews','recordKind','review','recordId',r.id),v_dedupe)
      then v_created:=v_created+1; else v_skipped:=v_skipped+1; end if;
    end if;
  end loop;

  for r in
    select kr.workspace_id,kr.id,kr.data,settings.data as settings_data,
           case when exists(select 1 from pg_catalog.pg_timezone_names tz
             where tz.name=coalesce(nullif(settings.data->>'timezone',''),'Africa/Cairo'))
             then coalesce(nullif(settings.data->>'timezone',''),'Africa/Cairo') else 'Africa/Cairo' end as timezone_name
      from public.workspace_records kr
      left join public.workspace_records settings
        on settings.workspace_id=kr.workspace_id and settings.system_id='projects'
       and settings.collection='settings' and settings.id='ws' and settings.deleted=false
     where kr.system_id='projects' and kr.collection='krs'
       and kr.deleted=false and coalesce(kr.data->>'deleted_at','')=''
       and coalesce(kr.data->>'archived_at','')=''
       and kr.data->>'type'='Numeric'
       and nullif(kr.data->>'owner_id','') is not null
  loop
    v_timezone:=r.timezone_name; v_today:=(now() at time zone v_timezone)::date;
    v_reminder_time:=coalesce(nullif(r.settings_data->>'defaultReminderTime',''),'09:00');
    if v_reminder_time !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' or to_char(now() at time zone v_timezone,'HH24:MI')<>v_reminder_time then continue; end if;
    v_auto:=coalesce(r.settings_data->'automations','{}'::jsonb);
    if v_auto->>'krCheckin' is distinct from 'false' then
      select max(
        case
          when checkin.data->>'checked_at' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
            and to_char(to_date(checkin.data->>'checked_at','YYYY-MM-DD'),'YYYY-MM-DD')=checkin.data->>'checked_at'
            then to_date(checkin.data->>'checked_at','YYYY-MM-DD')
          when checkin.data->>'checked_at' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T'
            then (checkin.data->>'checked_at')::timestamptz at time zone v_timezone
          else null
        end
      )::date into v_checkin_date
        from public.workspace_records checkin
       where checkin.workspace_id=r.workspace_id and checkin.system_id='projects'
         and checkin.collection='checkins' and checkin.deleted=false
         and checkin.data->>'kr_id'=r.id;
      if v_checkin_date is null or v_checkin_date<=v_today-7 then
        v_recipient:=(r.data->>'owner_id')::uuid;
        v_week_start_day:=case when coalesce(r.settings_data->>'weekStartDay','') ~ '^[0-6]$'
          then (r.settings_data->>'weekStartDay')::integer else 6 end;
        v_week_start:=v_today-((extract(dow from v_today)::integer-v_week_start_day+7)%7);
        v_dedupe:='kr_checkin:'||r.id||':'||v_recipient::text||':'||v_week_start::text;
        if public.core_projects_enqueue_notification(r.workspace_id,v_recipient,'krs',r.id,
          'kr_checkin_due','حان موعد تحديث النتيجة الرئيسية: '||coalesce(nullif(r.data->>'name',''),'KR'),
          'لم يتم تسجيل Check-in خلال الأيام السبعة الماضية.',
          jsonb_build_object('system','projects','tab','okrs','recordKind','kr','recordId',r.id),v_dedupe)
        then v_created:=v_created+1; else v_skipped:=v_skipped+1; end if;
      end if;
    end if;
  end loop;

  -- Long-running personal timer reminder; source timer and linked task stay private.
  for r in
    select timer.workspace_id,timer.id,timer.data,timer.visible_to,settings.data as settings_data,
           case when exists(select 1 from pg_catalog.pg_timezone_names tz
             where tz.name=coalesce(nullif(settings.data->>'timezone',''),'Africa/Cairo'))
             then coalesce(nullif(settings.data->>'timezone',''),'Africa/Cairo') else 'Africa/Cairo' end as timezone_name,
           task.data->>'project_id' as project_id
      from public.workspace_records timer
      join public.workspace_records task
        on task.workspace_id=timer.workspace_id and task.system_id='projects'
       and task.collection='tasks' and task.id=timer.data->>'task_id'
       and task.deleted=false and coalesce(task.data->>'deleted_at','')=''
       and coalesce(task.data->>'archived_at','')=''
      left join public.workspace_records settings
        on settings.workspace_id=timer.workspace_id and settings.system_id='projects'
       and settings.collection='settings' and settings.id='ws' and settings.deleted=false
     where timer.system_id='projects' and timer.collection='timers'
       and timer.deleted=false
       and nullif(timer.data->>'member_id','') is not null
       and nullif(timer.data->>'task_id','') is not null
       and nullif(timer.data->>'ended_at','') is null
       and pg_input_is_valid(timer.data->>'started_at','timestamptz')
  loop
    v_timezone:=r.timezone_name;
    v_today:=(now() at time zone v_timezone)::date;
    v_reminder_time:=coalesce(nullif(r.settings_data->>'defaultReminderTime',''),'09:00');
    if v_reminder_time !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
       or to_char(now() at time zone v_timezone,'HH24:MI')<>v_reminder_time then continue; end if;
    v_auto:=coalesce(r.settings_data->'automations','{}'::jsonb);
    if v_auto->>'timerLong' is distinct from 'false' then
      v_timer_max_hours:=case
        when coalesce(r.settings_data->>'timerMaxHours','') ~ '^[0-9]+([.][0-9]+)?$'
          then greatest(0.25,least(72,(r.settings_data->>'timerMaxHours')::numeric))
        else 8
      end;
      v_elapsed_hours:=extract(epoch from (now()-(r.data->>'started_at')::timestamptz))/3600;
      if v_elapsed_hours >= v_timer_max_hours then
        v_recipient:=(r.data->>'member_id')::uuid;
        v_dedupe:='timer_long:'||r.id||':'||coalesce(r.data->>'started_at','');
        v_deep_link:=jsonb_build_object('system','projects','projectId',r.project_id,'tab','tasks',
          'taskId',r.data->>'task_id','recordKind','task','recordId',r.data->>'task_id');
        if public.core_projects_enqueue_notification(r.workspace_id,v_recipient,'timers',r.id,
          'timer_long_running','المؤقّت يعمل منذ مدة طويلة',
          'المؤقّت لمهمة ما زال يعمل بعد تجاوز الحد المحدد ('||v_timer_max_hours::text||' ساعة).',
          v_deep_link,v_dedupe)
        then v_created:=v_created+1; else v_skipped:=v_skipped+1; end if;
      end if;
    end if;
  end loop;

  return jsonb_build_object('created',v_created,'skipped',v_skipped,'ran_at',clock_timestamp());
end;
$function$;
create or replace function public.core_projects_emit_health_transitions()
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  r record;
  member_row record;
  v_today date;
  v_timezone text;
  v_reminder_time text;
  v_auto jsonb;
  v_status text;
  v_previous text;
  v_health text;
  v_reasons jsonb;
  v_active_leaf integer;
  v_done_leaf integer;
  v_overdue integer;
  v_critical integer;
  v_high_risk integer;
  v_progress numeric;
  v_risk_high numeric;
  v_yellow_days integer;
  v_yellow_progress numeric;
  v_target_date date;
  v_date_text text;
  v_transition_id uuid;
  v_recipients uuid[];
  v_recipient uuid;
  v_title text;
  v_body text;
  v_dedupe text;
  v_created integer := 0;
  v_skipped integer := 0;
begin
  if not pg_try_advisory_xact_lock(hashtextextended('core_projects_health_transitions',0)) then
    return jsonb_build_object('created',0,'skipped',0,'reason','health-scan-already-running');
  end if;

  for r in
    select project.workspace_id,project.id as project_id,project.data as project_data,
           settings.data as settings_data,
           case when exists (
             select 1 from pg_catalog.pg_timezone_names tz
              where tz.name=coalesce(nullif(settings.data->>'timezone',''),'Africa/Cairo')
           ) then coalesce(nullif(settings.data->>'timezone',''),'Africa/Cairo')
           else 'Africa/Cairo' end as timezone_name
      from public.workspace_records project
      left join public.workspace_records settings
        on settings.workspace_id=project.workspace_id and settings.system_id='projects'
       and settings.collection='settings' and settings.id='ws' and settings.deleted=false
     where project.system_id='projects' and project.collection='projects'
       and project.deleted=false
       and coalesce(project.data->>'deleted_at','')=''
  loop
    v_timezone:=r.timezone_name;
    v_today:=(now() at time zone v_timezone)::date;
    v_reminder_time:=coalesce(nullif(r.settings_data->>'defaultReminderTime',''),'09:00');
    if v_reminder_time !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
       or to_char(now() at time zone v_timezone,'HH24:MI')<>v_reminder_time then
      continue;
    end if;

    v_auto:=coalesce(r.settings_data->'automations','{}'::jsonb);
    v_status:=coalesce(r.project_data->>'status','');
    v_date_text:=r.project_data->>'target_date';
    v_target_date:=case
      when v_date_text ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
       and to_char(to_date(v_date_text,'YYYY-MM-DD'),'YYYY-MM-DD')=v_date_text
      then to_date(v_date_text,'YYYY-MM-DD') else null end;

    select
      count(*) filter (where coalesce(task.data->>'status','') <> 'Cancelled'),
      count(*) filter (where task.data->>'status' = 'Completed'),
      count(*) filter (
        where task.data->>'status' not in ('Completed','Cancelled')
          and task.data->>'due_date' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
          and to_char(to_date(task.data->>'due_date','YYYY-MM-DD'),'YYYY-MM-DD')=task.data->>'due_date'
          and to_date(task.data->>'due_date','YYYY-MM-DD')<v_today
      )
      into v_active_leaf,v_done_leaf,v_overdue
      from public.workspace_records task
     where task.workspace_id=r.workspace_id and task.system_id='projects'
       and task.collection='tasks' and task.deleted=false
       and coalesce(task.data->>'deleted_at','')=''
       and coalesce(task.data->>'archived_at','')=''
       and task.data->>'project_id'=r.project_id
       and not exists (
         select 1 from public.workspace_records child
          where child.workspace_id=task.workspace_id and child.system_id='projects'
            and child.collection='tasks' and child.deleted=false
            and coalesce(child.data->>'deleted_at','')=''
            and coalesce(child.data->>'archived_at','')=''
            and child.data->>'parent_task_id'=task.id
       );

    v_progress:=case when coalesce(v_active_leaf,0)>0
      then coalesce(v_done_leaf,0)::numeric/v_active_leaf::numeric else null end;

    select count(*) into v_critical
      from public.workspace_records issue
     where issue.workspace_id=r.workspace_id and issue.system_id='projects'
       and issue.collection='issues' and issue.deleted=false
       and coalesce(issue.data->>'deleted_at','')=''
       and coalesce(issue.data->>'archived_at','')=''
       and issue.data->>'project_id'=r.project_id
       and issue.data->>'severity'='Critical'
       and issue.data->>'status' in ('Open','In Progress');

    v_risk_high:=case when coalesce(r.settings_data->>'riskHigh','') ~ '^[0-9]+([.][0-9]+)?$'
      then greatest(1,(r.settings_data->>'riskHigh')::numeric) else 15 end;
    select count(*) into v_high_risk
      from public.workspace_records risk
     where risk.workspace_id=r.workspace_id and risk.system_id='projects'
       and risk.collection='risks' and risk.deleted=false
       and coalesce(risk.data->>'deleted_at','')=''
       and coalesce(risk.data->>'archived_at','')=''
       and risk.data->>'project_id'=r.project_id
       and risk.data->>'status' in ('Open','In Mitigation')
       and (case when risk.data->>'probability' ~ '^[0-9]+([.][0-9]+)?$'
                 then (risk.data->>'probability')::numeric else 0 end)
         * (case when risk.data->>'impact' ~ '^[0-9]+([.][0-9]+)?$'
                 then (risk.data->>'impact')::numeric else 0 end) >= v_risk_high;

    v_yellow_days:=case when coalesce(r.settings_data->>'yellowDays','') ~ '^[0-9]+$'
      then greatest(0,least(90,(r.settings_data->>'yellowDays')::integer)) else 14 end;
    v_yellow_progress:=case when coalesce(r.settings_data->>'yellowProgress','') ~ '^[0-9]+([.][0-9]+)?$'
      then greatest(0,least(1,(r.settings_data->>'yellowProgress')::numeric)) else 0.7 end;

    v_reasons:='[]'::jsonb;
    if v_status in ('Idea','Cancelled','Archived') or coalesce(r.project_data->>'archived_at','')<>'' then
      v_health:='NotEvaluated';
    elsif v_status='On Hold' then
      v_health:='OnHold';
    elsif v_status='Completed' then
      v_health:='Completed';
    else
      if v_critical>0 then v_reasons:=v_reasons||jsonb_build_array(jsonb_build_object('code','CRITICAL_ISSUE_OPEN','level','Red','count',v_critical)); end if;
      if coalesce(v_overdue,0)>0 then v_reasons:=v_reasons||jsonb_build_array(jsonb_build_object('code','OVERDUE_TASKS','level','Red','count',v_overdue)); end if;
      if v_target_date is not null and v_target_date<v_today then v_reasons:=v_reasons||jsonb_build_array(jsonb_build_object('code','PAST_DEADLINE','level','Red')); end if;
      if coalesce(v_high_risk,0)>0 then v_reasons:=v_reasons||jsonb_build_array(jsonb_build_object('code','HIGH_RISK_OPEN','level','Orange','count',v_high_risk)); end if;
      if v_target_date is not null and v_target_date between v_today and v_today+v_yellow_days
         and coalesce(v_progress,0)<v_yellow_progress then
        v_reasons:=v_reasons||jsonb_build_array(jsonb_build_object('code','DEADLINE_NEAR_LOW_PROGRESS','level','Yellow'));
      end if;

      if v_critical>0 or coalesce(v_overdue,0)>0 or (v_target_date is not null and v_target_date<v_today) then v_health:='Red';
      elsif coalesce(v_high_risk,0)>0 then v_health:='Orange';
      elsif v_target_date is not null and v_target_date between v_today and v_today+v_yellow_days
            and coalesce(v_progress,0)<v_yellow_progress then v_health:='Yellow';
      else v_health:='Green'; end if;
    end if;

    v_previous:=null;
    select health_state into v_previous
      from public.core_project_health_state
     where workspace_id=r.workspace_id and project_id=r.project_id
     for update;

    if not found then
      insert into public.core_project_health_state(workspace_id,project_id,health_state,reasons,observed_at)
      values (r.workspace_id,r.project_id,v_health,v_reasons,clock_timestamp())
      on conflict(workspace_id,project_id) do nothing;
      insert into public.core_project_health_transitions(
        workspace_id,project_id,previous_state,next_state,reasons,occurred_at,is_baseline
      ) values (r.workspace_id,r.project_id,null,v_health,v_reasons,clock_timestamp(),true);
      continue;
    end if;

    if v_previous is distinct from v_health then
      insert into public.core_project_health_transitions(
        workspace_id,project_id,previous_state,next_state,reasons,occurred_at,is_baseline
      ) values (r.workspace_id,r.project_id,v_previous,v_health,v_reasons,clock_timestamp(),false)
      returning id into v_transition_id;

      update public.core_project_health_state
         set health_state=v_health,reasons=v_reasons,observed_at=clock_timestamp()
       where workspace_id=r.workspace_id and project_id=r.project_id;

      if v_auto->>'healthAlerts' is distinct from 'false' then
        v_recipients:=array[]::uuid[];
        if nullif(r.project_data->>'lead_id','') is not null
           and r.project_data->>'lead_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
          v_recipients:=array_append(v_recipients,(r.project_data->>'lead_id')::uuid);
        end if;
        if jsonb_typeof(r.project_data->'members')='array' then
          for member_row in select value from jsonb_array_elements(r.project_data->'members')
          loop
            if nullif(member_row.value->>'member_id','') is not null
               and member_row.value->>'member_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
              v_recipient:=(member_row.value->>'member_id')::uuid;
              if not (v_recipient=any(v_recipients)) then v_recipients:=array_append(v_recipients,v_recipient); end if;
            end if;
          end loop;
        end if;

        foreach v_recipient in array v_recipients loop
          v_dedupe:='project_health_transition:'||v_transition_id::text||':'||v_recipient::text;
          v_title:='تغيّرت صحة المشروع: '||coalesce(v_previous,'—')||' ← '||v_health;
          v_body:='تم تسجيل انتقال الحالة. الأسباب: '||v_reasons::text;
          if public.core_projects_enqueue_notification(
            r.workspace_id,v_recipient,'projects',r.project_id,
            'project_health_changed',v_title,v_body,
            jsonb_build_object('system','projects','projectId',r.project_id,'tab','overview','recordKind','project','recordId',r.project_id),
            v_dedupe
          ) then v_created:=v_created+1; else v_skipped:=v_skipped+1; end if;
        end loop;
      end if;
    else
      update public.core_project_health_state
         set reasons=v_reasons,observed_at=clock_timestamp()
       where workspace_id=r.workspace_id and project_id=r.project_id;
    end if;
  end loop;

  return jsonb_build_object('created',v_created,'skipped',v_skipped,'ran_at',clock_timestamp());
end;
$function$;

revoke all on function public.core_projects_emit_health_transitions() from public,anon,authenticated;
grant execute on function public.core_projects_emit_health_transitions() to postgres;

create or replace function public.core_projects_list_health_transitions(
  p_workspace_id uuid,p_project_id text,p_limit integer default 30
)
returns table(id uuid,previous_state text,next_state text,reasons jsonb,occurred_at timestamptz,is_baseline boolean)
language plpgsql
security definer
set search_path = public
as $function$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if p_workspace_id is null or nullif(trim(p_project_id),'') is null then raise exception 'Workspace and Project are required' using errcode='22023'; end if;
  if public.ws_access_level(p_workspace_id,'projects','projects') not in ('view','edit') then raise exception 'Projects read access required' using errcode='42501'; end if;
  if not exists(
    select 1 from public.workspace_records project
     where project.workspace_id=p_workspace_id and project.system_id='projects'
       and project.collection='projects' and project.id=p_project_id and project.deleted=false
       and coalesce(project.data->>'deleted_at','')=''
       and (project.visible_to is null or auth.uid()=any(project.visible_to))
  ) then raise exception 'Project not found or not visible' using errcode='42501'; end if;
  return query
  select transition.id,transition.previous_state,transition.next_state,transition.reasons,transition.occurred_at,transition.is_baseline
    from public.core_project_health_transitions transition
   where transition.workspace_id=p_workspace_id and transition.project_id=p_project_id
   order by transition.occurred_at desc limit greatest(1,least(100,coalesce(p_limit,30)));
end;
$function$;

revoke all on function public.core_projects_list_health_transitions(uuid,text,integer) from public,anon;
grant execute on function public.core_projects_list_health_transitions(uuid,text,integer) to authenticated;


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
  v_health jsonb;
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
  v_health:=public.core_projects_emit_health_transitions();
  return jsonb_build_object(
    'created',coalesce((v_main->>'created')::integer,0)+coalesce((v_updates->>'created')::integer,0)+coalesce((v_health->>'created')::integer,0),
    'skipped',coalesce((v_main->>'skipped')::integer,0)+coalesce((v_updates->>'skipped')::integer,0)+coalesce((v_health->>'skipped')::integer,0),
    'main',v_main,'updates',v_updates,'health',v_health,'ran_at',clock_timestamp()
  );
end;
$function$;

commit;
