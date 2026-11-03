-- Health OS H3: medication plans with immutable dose versions, actual dose events,
-- side effects, flare episodes, and in-app reminders (no background push in this phase).
create table if not exists public.health_medications (
 id uuid primary key default gen_random_uuid(),
 profile_id uuid not null references public.health_profiles(id) on delete cascade,
 name text not null check(char_length(trim(name)) between 1 and 180),
 brand text check(brand is null or char_length(brand)<=120),
 medication_type text not null default 'medication' check(medication_type in ('medication','supplement','therapy','other')),
 status text not null default 'active' check(status in ('active','paused','stopped')),
 instructions text check(instructions is null or char_length(instructions)<=2000),
 prescribed_by text check(prescribed_by is null or char_length(prescribed_by)<=180),
 start_date date,
 end_date date,
 created_by uuid not null references auth.users(id) on delete restrict,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint health_medications_profile_id_id_key unique(profile_id,id),
 constraint health_medications_dates_check check(end_date is null or start_date is null or end_date>=start_date)
);
create index if not exists health_medications_profile_status_idx on public.health_medications(profile_id,status,created_at desc);

create table if not exists public.health_medication_versions (
 id uuid primary key default gen_random_uuid(),
 profile_id uuid not null,
 medication_id uuid not null,
 version_no integer not null check(version_no>0),
 dose_amount numeric(12,4) not null check(dose_amount>0 and dose_amount<=1000000),
 dose_unit text not null check(char_length(trim(dose_unit)) between 1 and 40),
 route text not null default 'unknown' check(route in ('oral','topical','inhaled','injection','ophthalmic','otic','nasal','rectal','sublingual','other','unknown')),
 frequency text not null default 'as_directed' check(frequency in ('once_daily','twice_daily','three_times_daily','four_times_daily','weekly','as_needed','as_directed','custom')),
 schedule_times jsonb not null default '[]'::jsonb check(jsonb_typeof(schedule_times)='array' and jsonb_array_length(schedule_times)<=12),
 effective_from date not null default current_date,
 effective_to date,
 instructions text check(instructions is null or char_length(instructions)<=2000),
 created_by uuid not null references auth.users(id) on delete restrict,
 created_at timestamptz not null default now(),
 constraint health_medication_versions_med_fk foreign key(profile_id,medication_id) references public.health_medications(profile_id,id) on delete cascade,
 constraint health_medication_versions_profile_id_id_key unique(profile_id,id),
 constraint health_medication_versions_no_key unique(medication_id,version_no),
 constraint health_medication_versions_dates_check check(effective_to is null or effective_to>=effective_from)
);
create index if not exists health_medication_versions_med_created_idx on public.health_medication_versions(profile_id,medication_id,version_no desc);

create table if not exists public.health_medication_events (
 id uuid primary key default gen_random_uuid(),
 profile_id uuid not null,
 medication_id uuid not null,
 medication_version_id uuid not null,
 event_status text not null check(event_status in ('taken','skipped','missed','held','unknown')),
 scheduled_for timestamptz,
 occurred_at timestamptz,
 dose_amount numeric(12,4) check(dose_amount is null or (dose_amount>0 and dose_amount<=1000000)),
 dose_unit text not null check(char_length(trim(dose_unit)) between 1 and 40),
 medication_name_snapshot text not null check(char_length(trim(medication_name_snapshot)) between 1 and 180),
 notes text check(notes is null or char_length(notes)<=2000),
 created_by uuid not null references auth.users(id) on delete restrict,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint health_medication_events_med_fk foreign key(profile_id,medication_id) references public.health_medications(profile_id,id) on delete cascade,
 constraint health_medication_events_version_fk foreign key(profile_id,medication_version_id) references public.health_medication_versions(profile_id,id) on delete restrict,
 constraint health_medication_events_profile_id_id_key unique(profile_id,id)
);
create index if not exists health_medication_events_profile_occurred_idx on public.health_medication_events(profile_id,coalesce(occurred_at,scheduled_for) desc);
create index if not exists health_medication_events_med_idx on public.health_medication_events(profile_id,medication_id,created_at desc);

create table if not exists public.health_medication_side_effects (
 id uuid primary key default gen_random_uuid(),
 profile_id uuid not null,
 medication_id uuid not null,
 medication_event_id uuid,
 name text not null check(char_length(trim(name)) between 1 and 180),
 severity text not null default 'unknown' check(severity in ('mild','moderate','severe','unknown')),
 occurred_at timestamptz not null default now(),
 notes text check(notes is null or char_length(notes)<=2000),
 created_by uuid not null references auth.users(id) on delete restrict,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint health_medication_side_effects_med_fk foreign key(profile_id,medication_id) references public.health_medications(profile_id,id) on delete cascade,
 constraint health_medication_side_effects_event_fk foreign key(profile_id,medication_event_id) references public.health_medication_events(profile_id,id) on delete restrict,
 constraint health_medication_side_effects_profile_id_id_key unique(profile_id,id)
);
create index if not exists health_medication_side_effects_profile_occurred_idx on public.health_medication_side_effects(profile_id,occurred_at desc);

create table if not exists public.health_flare_events (
 id uuid primary key default gen_random_uuid(),
 profile_id uuid not null references public.health_profiles(id) on delete cascade,
 title text not null check(char_length(trim(title)) between 1 and 180),
 status text not null default 'ongoing' check(status in ('ongoing','resolved')),
 severity smallint not null check(severity between 1 and 10),
 started_at timestamptz not null,
 ended_at timestamptz,
 symptoms text check(symptoms is null or char_length(symptoms)<=3000),
 suspected_triggers text check(suspected_triggers is null or char_length(suspected_triggers)<=3000),
 relief_actions text check(relief_actions is null or char_length(relief_actions)<=3000),
 notes text check(notes is null or char_length(notes)<=4000),
 created_by uuid not null references auth.users(id) on delete restrict,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint health_flare_events_profile_id_id_key unique(profile_id,id),
 constraint health_flare_events_dates_check check(ended_at is null or ended_at>=started_at),
 constraint health_flare_events_status_date_check check((status='ongoing' and ended_at is null) or (status='resolved' and ended_at is not null))
);
create index if not exists health_flare_events_profile_started_idx on public.health_flare_events(profile_id,started_at desc,status);

create table if not exists public.health_medication_reminders (
 id uuid primary key default gen_random_uuid(),
 profile_id uuid not null,
 medication_id uuid not null,
 medication_version_id uuid not null,
 remind_at timestamptz not null,
 status text not null default 'pending' check(status in ('pending','completed','dismissed')),
 completed_at timestamptz,
 linked_event_id uuid,
 created_by uuid not null references auth.users(id) on delete restrict,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint health_medication_reminders_med_fk foreign key(profile_id,medication_id) references public.health_medications(profile_id,id) on delete cascade,
 constraint health_medication_reminders_version_fk foreign key(profile_id,medication_version_id) references public.health_medication_versions(profile_id,id) on delete restrict,
 constraint health_medication_reminders_event_fk foreign key(profile_id,linked_event_id) references public.health_medication_events(profile_id,id) on delete restrict,
 constraint health_medication_reminders_profile_id_id_key unique(profile_id,id)
);
create index if not exists health_medication_reminders_profile_due_idx on public.health_medication_reminders(profile_id,status,remind_at);

alter table public.health_medications enable row level security;
alter table public.health_medication_versions enable row level security;
alter table public.health_medication_events enable row level security;
alter table public.health_medication_side_effects enable row level security;
alter table public.health_flare_events enable row level security;
alter table public.health_medication_reminders enable row level security;
revoke all on table public.health_medications,public.health_medication_versions,public.health_medication_events,public.health_medication_side_effects,public.health_flare_events,public.health_medication_reminders from anon,public;
grant select,insert,update,delete on table public.health_medications,public.health_medication_versions,public.health_medication_events,public.health_medication_side_effects,public.health_flare_events,public.health_medication_reminders to authenticated;

do $$
declare tbl text; scp text; op text;
begin
 foreach tbl in array array['health_medications','health_medication_versions','health_medication_events','health_medication_side_effects','health_medication_reminders','health_flare_events'] loop
  scp:=case when tbl='health_flare_events' then 'flare_events' else 'medications' end;
  foreach op in array array['select','insert','update','delete'] loop
   execute format('drop policy if exists %I on public.%I','h3_'||tbl||'_'||op,tbl);
  end loop;
  execute format('create policy %I on public.%I for select to authenticated using (public.health_has_access(profile_id,%L,''read''))','h3_'||tbl||'_select',tbl,scp);
  execute format('create policy %I on public.%I for insert to authenticated with check (created_by=(select auth.uid()) and public.health_has_access(profile_id,%L,''create''))','h3_'||tbl||'_insert',tbl,scp);
  execute format('create policy %I on public.%I for update to authenticated using (public.health_has_access(profile_id,%L,''update'')) with check (public.health_has_access(profile_id,%L,''update''))','h3_'||tbl||'_update',tbl,scp,scp);
  execute format('create policy %I on public.%I for delete to authenticated using (public.health_has_access(profile_id,%L,''delete''))','h3_'||tbl||'_delete',tbl,scp);
 end loop;
 drop policy if exists h3_health_medication_versions_update on public.health_medication_versions;
 drop policy if exists h3_health_medication_versions_delete on public.health_medication_versions;
end $$;

alter table public.health_audit_events drop constraint if exists health_audit_events_action_check;
alter table public.health_audit_events add constraint health_audit_events_action_check check(action in (
 'profile_created','profile_updated','grant_created','grant_updated','grant_revoked','document_uploaded','document_deleted','export_requested','export_completed',
 'condition_created','condition_updated','condition_deleted','allergy_created','allergy_updated','allergy_deleted',
 'symptom_definition_created','symptom_definition_updated','symptom_definition_deleted','symptom_log_created','symptom_log_updated','symptom_log_deleted',
 'medication_created','medication_updated','medication_version_created',
 'medication_event_created','medication_event_updated','medication_event_deleted',
 'medication_side_effect_created','medication_side_effect_updated','medication_side_effect_deleted',
 'medication_reminder_created','medication_reminder_updated','medication_reminder_deleted',
 'flare_event_created','flare_event_updated','flare_event_deleted'
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
        else 'profile' end,
   case when action like '%_created' or action like '%_uploaded' then 'create' when action like '%_deleted' then 'delete' else 'update' end)
 )
);
