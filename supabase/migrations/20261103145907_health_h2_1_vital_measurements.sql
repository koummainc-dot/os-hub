-- Health OS H2.1: normalized vital and body measurements.
create table if not exists public.health_measurements (
 id uuid primary key default gen_random_uuid(),
 profile_id uuid not null references public.health_profiles(id) on delete cascade,
 measurement_type text not null check(measurement_type in ('weight','height','blood_pressure','heart_rate','body_temperature','oxygen_saturation','respiratory_rate','waist_circumference','body_fat_percentage')),
 value_primary numeric(12,4) not null,
 value_secondary numeric(12,4),
 unit text not null,
 recorded_at timestamptz not null default now(),
 source text not null default 'manual' check(source in ('manual','device','imported','other')),
 context text check(context is null or char_length(context)<=80),
 notes text check(notes is null or char_length(notes)<=2000),
 created_by uuid not null references auth.users(id) on delete restrict,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint health_measurements_profile_id_id_key unique(profile_id,id),
 constraint health_measurements_value_unit_check check(
  (measurement_type='weight' and value_primary between 0.1 and 1000 and value_secondary is null and unit='kg') or
  (measurement_type='height' and value_primary between 20 and 300 and value_secondary is null and unit='cm') or
  (measurement_type='blood_pressure' and value_primary between 20 and 300 and value_secondary between 10 and 200 and value_primary>value_secondary and unit='mmHg') or
  (measurement_type='heart_rate' and value_primary between 1 and 300 and value_secondary is null and unit='bpm') or
  (measurement_type='body_temperature' and value_primary between 25 and 45 and value_secondary is null and unit='°C') or
  (measurement_type='oxygen_saturation' and value_primary between 0 and 100 and value_secondary is null and unit='%') or
  (measurement_type='respiratory_rate' and value_primary between 1 and 100 and value_secondary is null and unit='breaths/min') or
  (measurement_type='waist_circumference' and value_primary between 10 and 300 and value_secondary is null and unit='cm') or
  (measurement_type='body_fat_percentage' and value_primary between 0 and 80 and value_secondary is null and unit='%')
 )
);
create index if not exists health_measurements_profile_recorded_idx on public.health_measurements(profile_id,recorded_at desc);
create index if not exists health_measurements_profile_type_recorded_idx on public.health_measurements(profile_id,measurement_type,recorded_at desc);
alter table public.health_measurements enable row level security;
revoke all on table public.health_measurements from anon,public;
grant select,insert,update,delete on table public.health_measurements to authenticated;
drop policy if exists h2_health_measurements_select on public.health_measurements;
create policy h2_health_measurements_select on public.health_measurements for select to authenticated using (public.health_has_access(profile_id,'measurements','read'));
drop policy if exists h2_health_measurements_insert on public.health_measurements;
create policy h2_health_measurements_insert on public.health_measurements for insert to authenticated with check (created_by=(select auth.uid()) and public.health_has_access(profile_id,'measurements','create'));
drop policy if exists h2_health_measurements_update on public.health_measurements;
create policy h2_health_measurements_update on public.health_measurements for update to authenticated using (public.health_has_access(profile_id,'measurements','update')) with check (public.health_has_access(profile_id,'measurements','update'));
drop policy if exists h2_health_measurements_delete on public.health_measurements;
create policy h2_health_measurements_delete on public.health_measurements for delete to authenticated using (public.health_has_access(profile_id,'measurements','delete'));
alter table public.health_audit_events drop constraint if exists health_audit_events_action_check;
alter table public.health_audit_events add constraint health_audit_events_action_check check(action in (
 'profile_created','profile_updated','grant_created','grant_updated','grant_revoked','document_uploaded','document_deleted','export_requested','export_completed',
 'condition_created','condition_updated','condition_deleted','allergy_created','allergy_updated','allergy_deleted',
 'symptom_definition_created','symptom_definition_updated','symptom_definition_deleted','symptom_log_created','symptom_log_updated','symptom_log_deleted',
 'medication_created','medication_updated','medication_version_created','medication_event_created','medication_event_updated','medication_event_deleted',
 'medication_side_effect_created','medication_side_effect_updated','medication_side_effect_deleted','medication_reminder_created','medication_reminder_updated','medication_reminder_deleted',
 'flare_event_created','flare_event_updated','flare_event_deleted','daily_checkin_created','daily_checkin_updated','daily_checkin_deleted',
 'health_factor_created','health_factor_updated','health_factor_deleted','health_factor_log_created','health_factor_log_updated','health_factor_log_deleted',
 'cycle_tracking_enabled','cycle_tracking_disabled','cycle_entry_created','cycle_entry_updated','cycle_entry_deleted',
 'measurement_created','measurement_updated','measurement_deleted'
));
drop policy if exists health_audit_events_insert_authorized_actor on public.health_audit_events;
create policy health_audit_events_insert_authorized_actor on public.health_audit_events for insert to authenticated with check (
 actor_user_id=(select auth.uid()) and (
  exists(select 1 from public.health_profiles hp where hp.id=health_audit_events.profile_id and hp.owner_user_id=(select auth.uid()))
  or public.health_has_access(profile_id,
   case when resource_type in ('condition','allergy') then 'conditions'
        when resource_type in ('symptom_definition','symptom_log') then 'symptoms'
        when resource_type='measurement' then 'measurements'
        when resource_type='flare_event' then 'flare_events'
        when resource_type='daily_checkin' then 'checkins'
        when resource_type in ('health_factor','health_factor_log') then 'trackers'
        else 'profile' end,
   case when action like '%_created' then 'create' when action like '%_deleted' then 'delete' else 'update' end)
 )
);
