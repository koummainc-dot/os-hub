\set ON_ERROR_STOP on
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);

do $block$
declare legacy jsonb;
begin
  select data into legacy from public.workspace_records
   where workspace_id='11111111-1111-4111-8111-111111111111'
     and system_id='projects' and collection='objectives' and id='legacy-objective';
  if legacy is null then raise exception 'legacy Objective missing after reconciliation'; end if;
  if legacy ? 'project_ids' then raise exception 'legacy direct Objective.project_ids was not removed'; end if;
  if legacy->'legacy_project_ids' <> '["legacy-project"]'::jsonb then
    raise exception 'legacy Project IDs were not preserved for manual KR mapping';
  end if;
  if nullif(legacy->>'okr_v4_reconciled_at','') is null then
    raise exception 'reconciliation timestamp missing';
  end if;
  select data into legacy from public.workspace_records
   where workspace_id='11111111-1111-4111-8111-111111111111'
     and system_id='projects' and collection='objectives' and id='legacy-objective-trash';
  if legacy is null or legacy ? 'project_ids' or legacy->'legacy_project_ids' <> '["legacy-project"]'::jsonb then
    raise exception 'trashed Objective legacy links were not reconciled and preserved';
  end if;
end
$block$;

-- OKR v4 allows Project links on the KR, not on the Objective.
insert into public.workspace_records (workspace_id,system_id,collection,id,data)
values
 ('11111111-1111-4111-8111-111111111111','projects','projects','v4-project',
  '{"name":"V4 Project","lead_id":"22222222-2222-4222-8222-222222222222"}'),
 ('11111111-1111-4111-8111-111111111111','projects','objectives','v4-objective',
  '{"name":"V4 Objective","status":"Active"}'),
 ('11111111-1111-4111-8111-111111111111','projects','krs','v4-kr',
  '{"name":"V4 KR","objective_id":"v4-objective","project_ids":["v4-project"],"type":"Project Based","status":"Active"}'),
 ('11111111-1111-4111-8111-111111111111','projects','tasks','v4-task',
  '{"name":"V4 Task","title":"V4 Task","project_id":"v4-project","status":"Not Started"}');

do $block$ begin
  begin
    insert into public.workspace_records (workspace_id,system_id,collection,id,data)
    values ('11111111-1111-4111-8111-111111111111','projects','objectives','invalid-v4-objective',
      '{"name":"Invalid Objective","status":"Active","project_ids":["v4-project"]}');
    raise exception 'expected deprecated Objective.project_ids rejection';
  exception when sqlstate '22023' then null;
  end;
end $block$;

do $block$
declare kr_data jsonb;
begin
  select data into kr_data from public.workspace_records
   where workspace_id='11111111-1111-4111-8111-111111111111'
     and system_id='projects' and collection='krs' and id='v4-kr';
  if kr_data->'project_ids' <> '["v4-project"]'::jsonb then
    raise exception 'KR.project_ids canonical relation was not retained';
  end if;
end
$block$;

select 'Projects OKR v4 migration reconciliation smoke passed' as result;
