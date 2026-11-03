-- Preserve all existing audit authorization scopes and add measurement audit scope.
drop policy if exists health_audit_events_insert_authorized_actor on public.health_audit_events;
create policy health_audit_events_insert_authorized_actor on public.health_audit_events
 for insert to authenticated with check (
  actor_user_id=(select auth.uid()) and (
   exists(select 1 from public.health_profiles hp where hp.id=health_audit_events.profile_id and hp.owner_user_id=(select auth.uid()))
   or public.health_has_access(profile_id,
    case
     when resource_type in ('condition','allergy') then 'conditions'
     when resource_type in ('symptom_definition','symptom_log') then 'symptoms'
     when resource_type in ('medication','medication_version','medication_event','medication_side_effect','medication_reminder') then 'medications'
     when resource_type='flare_event' then 'flare_events'
     when resource_type='document' then 'documents'
     when resource_type='daily_checkin' then 'checkins'
     when resource_type='measurement' then 'measurements'
     when resource_type='health_factor' then (select case when f.is_sensitive then 'sensitive_trackers' else 'trackers' end from public.health_factors f where f.id=resource_id and f.profile_id=health_audit_events.profile_id)
     when resource_type='health_factor_log' then (select case when f.is_sensitive then 'sensitive_trackers' else 'trackers' end from public.health_factor_logs l join public.health_factors f on f.id=l.factor_id and f.profile_id=l.profile_id where l.id=resource_id and l.profile_id=health_audit_events.profile_id)
     else 'profile' end,
    case when action like '%_created' or action like '%_enabled' then 'create'
         when action like '%_deleted' or action like '%_disabled' then 'delete'
         else 'update' end)
  )
 );
create or replace function public.health_measurements_guard()
returns trigger language plpgsql set search_path='' as $$
begin
 if new.id is distinct from old.id
    or new.profile_id is distinct from old.profile_id
    or new.created_by is distinct from old.created_by
    or new.created_at is distinct from old.created_at then
  raise exception 'Health measurement identity fields are immutable';
 end if;
 new.updated_at=now();
 return new;
end;
$$;
revoke all on function public.health_measurements_guard() from public,anon,authenticated;
drop trigger if exists health_measurements_guard_before_update on public.health_measurements;
create trigger health_measurements_guard_before_update before update on public.health_measurements
 for each row execute function public.health_measurements_guard();
