-- H3 integrity correction: preserve profile_id on linked-record deletion and make dose versions immutable.
alter table public.health_medication_side_effects drop constraint if exists health_medication_side_effects_event_fk;
alter table public.health_medication_side_effects add constraint health_medication_side_effects_event_fk
 foreign key(profile_id,medication_event_id) references public.health_medication_events(profile_id,id) on delete restrict;
alter table public.health_medication_reminders drop constraint if exists health_medication_reminders_event_fk;
alter table public.health_medication_reminders add constraint health_medication_reminders_event_fk
 foreign key(profile_id,linked_event_id) references public.health_medication_events(profile_id,id) on delete restrict;
alter table public.health_medication_versions drop constraint if exists health_medication_versions_dates_check;
alter table public.health_medication_versions drop column if exists effective_to;
