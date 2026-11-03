-- H2.2: structured anatomical location on existing symptom logs (no duplicate symptom records).
alter table public.health_symptom_logs
 add column if not exists body_region_code text,
 add column if not exists body_view text,
 add column if not exists body_x numeric(5,2),
 add column if not exists body_y numeric(5,2);

alter table public.health_symptom_logs
 drop constraint if exists health_symptom_logs_body_map_region_check,
 drop constraint if exists health_symptom_logs_body_map_view_check,
 drop constraint if exists health_symptom_logs_body_map_coordinates_check,
 drop constraint if exists health_symptom_logs_body_map_complete_check;

alter table public.health_symptom_logs
 add constraint health_symptom_logs_body_map_region_check check (
  body_region_code is null or body_region_code in (
   'head','neck','chest','abdomen','pelvis',
   'shoulder_left','shoulder_right','upper_arm_left','upper_arm_right',
   'elbow_left','elbow_right','forearm_left','forearm_right',
   'wrist_left','wrist_right','hand_left','hand_right',
   'upper_back','lower_back','hip_left','hip_right',
   'thigh_left','thigh_right','knee_left','knee_right',
   'lower_leg_left','lower_leg_right','ankle_left','ankle_right',
   'foot_left','foot_right','custom_point'
  )
 ),
 add constraint health_symptom_logs_body_map_view_check check (body_view is null or body_view in ('front','back')),
 add constraint health_symptom_logs_body_map_coordinates_check check (
  (body_x is null and body_y is null) or (body_x between 0 and 100 and body_y between 0 and 100)
 ),
 add constraint health_symptom_logs_body_map_complete_check check (
  (body_region_code is null and body_view is null and body_x is null and body_y is null)
  or (body_region_code is not null and body_view is not null and body_x is not null and body_y is not null)
 );
create index if not exists health_symptom_logs_profile_body_region_recorded_idx
 on public.health_symptom_logs(profile_id,body_region_code,recorded_at desc)
 where body_region_code is not null;
