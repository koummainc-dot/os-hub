-- Health OS H4: daily wellness check-ins, personal factors, and an optional owner-only cycle tracker.
alter table public.health_profiles
  add column if not exists cycle_tracking_enabled boolean not null default false;

create table if not exists public.health_daily_checkins (
 id uuid primary key default gen_random_uuid(),
 profile_id uuid not null references public.health_profiles(id) on delete cascade,
 entry_date date not null,
 mood_score smallint check(mood_score between 1 and 5),
 energy_score smallint check(energy_score between 1 and 5),
 stress_score smallint check(stress_score between 1 and 5),
 sleep_hours numeric(4,2) check(sleep_hours between 0 and 24),
 sleep_quality smallint check(sleep_quality between 1 and 5),
 digestion_status text check(digestion_status in ('normal','bloating','constipation','diarrhea','nausea','reflux','pain','other','unknown')),
 digestion_severity smallint check(digestion_severity between 0 and 10),
 notes text check(notes is null or char_length(notes)<=3000),
 recorded_at timestamptz not null default now(),
 created_by uuid not null references auth.users(id) on delete restrict,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint health_daily_checkins_profile_date_key unique(profile_id,entry_date),
 constraint health_daily_checkins_profile_id_id_key unique(profile_id,id),
 constraint health_daily_checkins_nonempty_check check (
   mood_score is not null or energy_score is not null or stress_score is not null or
   sleep_hours is not null or sleep_quality is not null or digestion_status is not null or
   digestion_severity is not null or nullif(trim(notes),'') is not null
 )
);
create index if not exists health_daily_checkins_profile_date_idx on public.health_daily_checkins(profile_id,entry_date desc);

create table if not exists public.health_factors (
 id uuid primary key default gen_random_uuid(),
 profile_id uuid not null references public.health_profiles(id) on delete cascade,
 name text not null check(char_length(trim(name)) between 1 and 120),
 category text not null default 'general' check(category in ('general','mood','sleep','digestion','environment','symptom','other')),
 value_type text not null check(value_type in ('scale','number','boolean','text','choice')),
 unit text check(unit is null or char_length(unit)<=32),
 scale_min numeric(12,4),
 scale_max numeric(12,4),
 choice_options jsonb not null default '[]'::jsonb check(jsonb_typeof(choice_options)='array' and jsonb_array_length(choice_options)<=30),
 is_sensitive boolean not null default false,
 status text not null default 'active' check(status in ('active','archived')),
 created_by uuid not null references auth.users(id) on delete restrict,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint health_factors_profile_id_id_key unique(profile_id,id),
 constraint health_factors_scale_range_check check(
   (value_type='scale' and scale_min is not null and scale_max is not null and scale_max>scale_min)
   or (value_type<>'scale' and scale_min is null and scale_max is null)
 ),
 constraint health_factors_choice_check check(
   (value_type='choice' and jsonb_array_length(choice_options)>=1)
   or (value_type<>'choice' and jsonb_array_length(choice_options)=0)
 )
);
create index if not exists health_factors_profile_status_idx on public.health_factors(profile_id,status,created_at desc);

create table if not exists public.health_factor_logs (
 id uuid primary key default gen_random_uuid(),
 profile_id uuid not null,
 factor_id uuid not null,
 recorded_at timestamptz not null default now(),
 value_numeric numeric(14,4),
 value_boolean boolean,
 value_text text check(value_text is null or char_length(value_text)<=3000),
 value_choice text check(value_choice is null or char_length(value_choice)<=200),
 notes text check(notes is null or char_length(notes)<=2000),
 created_by uuid not null references auth.users(id) on delete restrict,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint health_factor_logs_factor_fk foreign key(profile_id,factor_id) references public.health_factors(profile_id,id) on delete cascade,
 constraint health_factor_logs_profile_id_id_key unique(profile_id,id),
 constraint health_factor_logs_exactly_one_value check(num_nonnulls(value_numeric,value_boolean,value_text,value_choice)=1)
);
create index if not exists health_factor_logs_profile_recorded_idx on public.health_factor_logs(profile_id,recorded_at desc);
create index if not exists health_factor_logs_factor_recorded_idx on public.health_factor_logs(profile_id,factor_id,recorded_at desc);

create or replace function public.health_validate_factor_log()
returns trigger
language plpgsql
set search_path = ''
as $$
declare f public.health_factors%rowtype;
begin
 select * into f from public.health_factors where id=new.factor_id and profile_id=new.profile_id;
 if not found then raise exception 'Health factor not found for this profile'; end if;
 if tg_op='INSERT' and f.status<>'active' then raise exception 'Archived factors cannot receive new entries'; end if;
 if f.value_type='scale' then
   if new.value_numeric is null or new.value_numeric<f.scale_min or new.value_numeric>f.scale_max or num_nonnulls(new.value_boolean,new.value_text,new.value_choice)<>0 then
     raise exception 'Value must be numeric and within the configured scale';
   end if;
 elsif f.value_type='number' then
   if new.value_numeric is null or num_nonnulls(new.value_boolean,new.value_text,new.value_choice)<>0 then raise exception 'Value must be numeric'; end if;
 elsif f.value_type='boolean' then
   if new.value_boolean is null or num_nonnulls(new.value_numeric,new.value_text,new.value_choice)<>0 then raise exception 'Value must be boolean'; end if;
 elsif f.value_type='text' then
   if new.value_text is null or num_nonnulls(new.value_numeric,new.value_boolean,new.value_choice)<>0 then raise exception 'Value must be text'; end if;
 elsif f.value_type='choice' then
   if new.value_choice is null or num_nonnulls(new.value_numeric,new.value_boolean,new.value_text)<>0 or not (f.choice_options ? new.value_choice) then
     raise exception 'Value must match one of the configured choices';
   end if;
 end if;
 return new;
end;
$$;
drop trigger if exists health_factor_logs_validate_value on public.health_factor_logs;
create trigger health_factor_logs_validate_value before insert or update of profile_id,factor_id,value_numeric,value_boolean,value_text,value_choice on public.health_factor_logs
for each row execute function public.health_validate_factor_log();

create table if not exists public.health_cycle_entries (
 id uuid primary key default gen_random_uuid(),
 profile_id uuid not null references public.health_profiles(id) on delete cascade,
 entry_date date not null,
 flow_intensity text not null default 'unknown' check(flow_intensity in ('none','spotting','light','medium','heavy','unknown')),
 period_start date,
 period_end date,
 symptoms text check(symptoms is null or char_length(symptoms)<=2000),
 notes text check(notes is null or char_length(notes)<=2000),
 created_by uuid not null references auth.users(id) on delete restrict,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint health_cycle_entries_profile_date_key unique(profile_id,entry_date),
 constraint health_cycle_entries_profile_id_id_key unique(profile_id,id),
 constraint health_cycle_entries_period_dates_check check(period_end is null or period_start is null or period_end>=period_start)
);
create index if not exists health_cycle_entries_profile_date_idx on public.health_cycle_entries(profile_id,entry_date desc);

alter table public.health_daily_checkins enable row level security;
alter table public.health_factors enable row level security;
alter table public.health_factor_logs enable row level security;
alter table public.health_cycle_entries enable row level security;
revoke all on table public.health_daily_checkins,public.health_factors,public.health_factor_logs,public.health_cycle_entries from anon,public;
grant select,insert,update,delete on table public.health_daily_checkins,public.health_factors,public.health_factor_logs,public.health_cycle_entries to authenticated;
grant select,update on table public.health_profiles to authenticated;

drop policy if exists h4_checkins_select on public.health_daily_checkins;
create policy h4_checkins_select on public.health_daily_checkins for select to authenticated using (public.health_has_access(profile_id,'checkins','read'));
drop policy if exists h4_checkins_insert on public.health_daily_checkins;
create policy h4_checkins_insert on public.health_daily_checkins for insert to authenticated with check (created_by=(select auth.uid()) and public.health_has_access(profile_id,'checkins','create'));
drop policy if exists h4_checkins_update on public.health_daily_checkins;
create policy h4_checkins_update on public.health_daily_checkins for update to authenticated using (public.health_has_access(profile_id,'checkins','update')) with check (public.health_has_access(profile_id,'checkins','update'));
drop policy if exists h4_checkins_delete on public.health_daily_checkins;
create policy h4_checkins_delete on public.health_daily_checkins for delete to authenticated using (public.health_has_access(profile_id,'checkins','delete'));

drop policy if exists h4_factors_select on public.health_factors;
create policy h4_factors_select on public.health_factors for select to authenticated using (
 public.health_has_access(profile_id,case when is_sensitive then 'sensitive_trackers' else 'trackers' end,'read')
);
drop policy if exists h4_factors_insert on public.health_factors;
create policy h4_factors_insert on public.health_factors for insert to authenticated with check (
 created_by=(select auth.uid()) and public.health_has_access(profile_id,case when is_sensitive then 'sensitive_trackers' else 'trackers' end,'create')
);
drop policy if exists h4_factors_update on public.health_factors;
create policy h4_factors_update on public.health_factors for update to authenticated using (
 public.health_has_access(profile_id,case when is_sensitive then 'sensitive_trackers' else 'trackers' end,'update')
) with check (
 public.health_has_access(profile_id,case when is_sensitive then 'sensitive_trackers' else 'trackers' end,'update')
);
drop policy if exists h4_factors_delete on public.health_factors;
create policy h4_factors_delete on public.health_factors for delete to authenticated using (
 public.health_has_access(profile_id,case when is_sensitive then 'sensitive_trackers' else 'trackers' end,'delete')
);

drop policy if exists h4_factor_logs_select on public.health_factor_logs;
create policy h4_factor_logs_select on public.health_factor_logs for select to authenticated using (
 exists(select 1 from public.health_factors f where f.id=factor_id and f.profile_id=health_factor_logs.profile_id
   and public.health_has_access(f.profile_id,case when f.is_sensitive then 'sensitive_trackers' else 'trackers' end,'read'))
);
drop policy if exists h4_factor_logs_insert on public.health_factor_logs;
create policy h4_factor_logs_insert on public.health_factor_logs for insert to authenticated with check (
 created_by=(select auth.uid()) and exists(select 1 from public.health_factors f where f.id=factor_id and f.profile_id=health_factor_logs.profile_id
   and f.status='active' and public.health_has_access(f.profile_id,case when f.is_sensitive then 'sensitive_trackers' else 'trackers' end,'create'))
);
drop policy if exists h4_factor_logs_update on public.health_factor_logs;
create policy h4_factor_logs_update on public.health_factor_logs for update to authenticated using (
 exists(select 1 from public.health_factors f where f.id=factor_id and f.profile_id=health_factor_logs.profile_id
   and public.health_has_access(f.profile_id,case when f.is_sensitive then 'sensitive_trackers' else 'trackers' end,'update'))
) with check (
 exists(select 1 from public.health_factors f where f.id=factor_id and f.profile_id=health_factor_logs.profile_id
   and public.health_has_access(f.profile_id,case when f.is_sensitive then 'sensitive_trackers' else 'trackers' end,'update'))
);
drop policy if exists h4_factor_logs_delete on public.health_factor_logs;
create policy h4_factor_logs_delete on public.health_factor_logs for delete to authenticated using (
 exists(select 1 from public.health_factors f where f.id=factor_id and f.profile_id=health_factor_logs.profile_id
   and public.health_has_access(f.profile_id,case when f.is_sensitive then 'sensitive_trackers' else 'trackers' end,'delete'))
);

drop policy if exists h4_cycle_entries_select on public.health_cycle_entries;
create policy h4_cycle_entries_select on public.health_cycle_entries for select to authenticated using (
 exists(select 1 from public.health_profiles hp where hp.id=health_cycle_entries.profile_id and hp.owner_user_id=(select auth.uid()) and hp.cycle_tracking_enabled)
);
drop policy if exists h4_cycle_entries_insert on public.health_cycle_entries;
create policy h4_cycle_entries_insert on public.health_cycle_entries for insert to authenticated with check (
 created_by=(select auth.uid()) and exists(select 1 from public.health_profiles hp where hp.id=health_cycle_entries.profile_id and hp.owner_user_id=(select auth.uid()) and hp.cycle_tracking_enabled)
);
drop policy if exists h4_cycle_entries_update on public.health_cycle_entries;
create policy h4_cycle_entries_update on public.health_cycle_entries for update to authenticated using (
 exists(select 1 from public.health_profiles hp where hp.id=health_cycle_entries.profile_id and hp.owner_user_id=(select auth.uid()) and hp.cycle_tracking_enabled)
) with check (
 exists(select 1 from public.health_profiles hp where hp.id=health_cycle_entries.profile_id and hp.owner_user_id=(select auth.uid()) and hp.cycle_tracking_enabled)
);
drop policy if exists h4_cycle_entries_delete on public.health_cycle_entries;
create policy h4_cycle_entries_delete on public.health_cycle_entries for delete to authenticated using (
 exists(select 1 from public.health_profiles hp where hp.id=health_cycle_entries.profile_id and hp.owner_user_id=(select auth.uid()) and hp.cycle_tracking_enabled)
);

alter table public.health_audit_events drop constraint if exists health_audit_events_action_check;
alter table public.health_audit_events add constraint health_audit_events_action_check check(action in (
 'profile_created','profile_updated','grant_created','grant_updated','grant_revoked','document_uploaded','document_deleted','export_requested','export_completed',
 'condition_created','condition_updated','condition_deleted','allergy_created','allergy_updated','allergy_deleted',
 'symptom_definition_created','symptom_definition_updated','symptom_definition_deleted','symptom_log_created','symptom_log_updated','symptom_log_deleted',
 'medication_created','medication_updated','medication_version_created',
 'medication_event_created','medication_event_updated','medication_event_deleted',
 'medication_side_effect_created','medication_side_effect_updated','medication_side_effect_deleted',
 'medication_reminder_created','medication_reminder_updated','medication_reminder_deleted',
 'flare_event_created','flare_event_updated','flare_event_deleted',
 'daily_checkin_created','daily_checkin_updated','daily_checkin_deleted',
 'health_factor_created','health_factor_updated','health_factor_deleted',
 'health_factor_log_created','health_factor_log_updated','health_factor_log_deleted',
 'cycle_tracking_enabled','cycle_tracking_disabled','cycle_entry_created','cycle_entry_updated','cycle_entry_deleted'
));
drop policy if exists health_audit_events_insert_authorized_actor on public.health_audit_events;
create policy health_audit_events_insert_authorized_actor on public.health_audit_events for insert to authenticated with check (
 actor_user_id=(select auth.uid()) and (
  exists(select 1 from public.health_profiles hp where hp.id=health_audit_events.profile_id and hp.owner_user_id=(select auth.uid()))
  or public.health_has_access(profile_id,
   case when resource_type in ('condition','allergy') then 'conditions'
        when resource_type in ('symptom_definition','symptom_log') then 'symptoms'
        when resource_type in ('medication','medication_version','medication_event','medication_side_effect','medication_reminder') then 'medications'
        when resource_type='flare_event' then 'flare_events'
        when resource_type='document' then 'documents'
        when resource_type='daily_checkin' then 'checkins'
        when resource_type='health_factor' then (select case when f.is_sensitive then 'sensitive_trackers' else 'trackers' end from public.health_factors f where f.id=resource_id and f.profile_id=health_audit_events.profile_id)
        when resource_type='health_factor_log' then (select case when f.is_sensitive then 'sensitive_trackers' else 'trackers' end from public.health_factor_logs l join public.health_factors f on f.id=l.factor_id and f.profile_id=l.profile_id where l.id=resource_id and l.profile_id=health_audit_events.profile_id)
        else 'profile' end,
   case when action like '%_created' or action like '%_enabled' then 'create' when action like '%_deleted' or action like '%_disabled' then 'delete' else 'update' end)
 )
);
