-- H3 integrity constraints: safe JSON schedule validation and truthful event/reminder states.
alter table public.health_medication_versions drop constraint if exists health_medication_versions_schedule_times_check;
alter table public.health_medication_versions add constraint health_medication_versions_schedule_times_check
 check(case when jsonb_typeof(schedule_times)='array' then jsonb_array_length(schedule_times)<=12 else false end);
alter table public.health_medication_events drop constraint if exists health_medication_events_taken_snapshot_check;
alter table public.health_medication_events add constraint health_medication_events_taken_snapshot_check
 check(event_status<>'taken' or (occurred_at is not null and dose_amount is not null));
alter table public.health_medication_reminders drop constraint if exists health_medication_reminders_completion_check;
alter table public.health_medication_reminders add constraint health_medication_reminders_completion_check
 check((status='completed' and completed_at is not null) or (status<>'completed' and completed_at is null));
