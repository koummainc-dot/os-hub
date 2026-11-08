\set ON_ERROR_STOP on
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);

-- Simulate an Objective created by the pre-v4 model. The existing guard accepts
-- the direct relation so the forward migration can prove it preserves the IDs.
insert into public.workspace_records (workspace_id,system_id,collection,id,data)
values
 ('11111111-1111-4111-8111-111111111111','projects','projects','legacy-project',
  '{"name":"Legacy linked project","lead_id":"22222222-2222-4222-8222-222222222222"}'),
 ('11111111-1111-4111-8111-111111111111','projects','objectives','legacy-objective',
  '{"name":"Legacy Objective","status":"Active","project_ids":["legacy-project"]}');

-- Trash records are reconciled too; restoring one must not resurrect the legacy link.
insert into public.workspace_records (workspace_id,system_id,collection,id,data,deleted)
values ('11111111-1111-4111-8111-111111111111','projects','objectives','legacy-objective-trash',
  '{"name":"Trashed Legacy Objective","status":"Archived","project_ids":["legacy-project"]}',true);
