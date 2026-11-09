\set ON_ERROR_STOP on
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);

do $template_okrs$
declare
  ws uuid := '11111111-1111-4111-8111-111111111111';
  result jsonb;
  project_data jsonb;
  task_data jsonb;
  objective_data jsonb;
  kr_data jsonb;
begin
  -- The app writes the complete template package in dependency order.
  result := public.projects_apply_records_batch(ws, jsonb_build_array(
    jsonb_build_object('collection','projects','id','template-okr-project','data',
      '{"name":"Template OKR Project","status":"Planned"}'::jsonb,'deleted',false,'expected_updated_at',null),
    jsonb_build_object('collection','tasks','id','template-okr-task','data',
      '{"title":"Template execution task","project_id":"template-okr-project","status":"Not Started"}'::jsonb,'deleted',false,'expected_updated_at',null),
    jsonb_build_object('collection','objectives','id','template-okr-objective','data',
      '{"name":"Template Objective","why":"Validate the atomic template package","period_start":"2026-11-01","period_end":"2026-12-01","status":"Active"}'::jsonb,'deleted',false,'expected_updated_at',null),
    jsonb_build_object('collection','krs','id','template-okr-kr','data',
      '{"name":"Template Key Result","objective_id":"template-okr-objective","type":"Numeric","unit":"items","initial_value":0,"target_value":12,"current_value":0,"project_ids":["template-okr-project"],"task_ids":["template-okr-task"]}'::jsonb,'deleted',false,'expected_updated_at',null)
  ));
  if jsonb_array_length(result) <> 4 then
    raise exception 'Atomic Objective/KR template batch did not confirm all four records';
  end if;

  select data into project_data from public.workspace_records
   where workspace_id=ws and system_id='projects' and collection='projects' and id='template-okr-project';
  select data into task_data from public.workspace_records
   where workspace_id=ws and system_id='projects' and collection='tasks' and id='template-okr-task';
  select data into objective_data from public.workspace_records
   where workspace_id=ws and system_id='projects' and collection='objectives' and id='template-okr-objective';
  select data into kr_data from public.workspace_records
   where workspace_id=ws and system_id='projects' and collection='krs' and id='template-okr-kr';

  if project_data is null or task_data is null or objective_data is null or kr_data is null then
    raise exception 'Create → Reload did not return the complete template package';
  end if;
  if objective_data ? 'project_ids' then
    raise exception 'Objective must not receive the deprecated direct project_ids relation';
  end if;
  if kr_data->>'objective_id' <> 'template-okr-objective'
     or kr_data->'project_ids' <> '["template-okr-project"]'::jsonb
     or kr_data->'task_ids' <> '["template-okr-task"]'::jsonb then
    raise exception 'Canonical Objective ← KR.project_ids → Project → Task links were not persisted';
  end if;
end
$template_okrs$;

-- Reject a deprecated Objective relation after earlier records were inserted;
-- the entire project/task/Objective/KR batch must roll back.
do $template_rollback$
declare
  ws uuid := '11111111-1111-4111-8111-111111111111';
begin
  begin
    perform public.projects_apply_records_batch(ws, jsonb_build_array(
      jsonb_build_object('collection','projects','id','template-rollback-project','data',
        '{"name":"Must Roll Back"}'::jsonb,'deleted',false,'expected_updated_at',null),
      jsonb_build_object('collection','tasks','id','template-rollback-task','data',
        '{"title":"Must Roll Back","project_id":"template-rollback-project"}'::jsonb,'deleted',false,'expected_updated_at',null),
      jsonb_build_object('collection','objectives','id','template-rollback-objective','data',
        '{"name":"Invalid Objective","status":"Active","project_ids":["template-rollback-project"]}'::jsonb,'deleted',false,'expected_updated_at',null),
      jsonb_build_object('collection','krs','id','template-rollback-kr','data',
        '{"name":"Must Roll Back","objective_id":"template-rollback-objective","project_ids":["template-rollback-project"],"task_ids":["template-rollback-task"],"type":"Project Based"}'::jsonb,'deleted',false,'expected_updated_at',null)
    ));
    raise exception 'expected deprecated Objective.project_ids rejection';
  exception when sqlstate '22023' then null;
  end;

  if exists(select 1 from public.workspace_records where workspace_id=ws and system_id='projects'
    and collection in ('projects','tasks','objectives','krs')
    and id in ('template-rollback-project','template-rollback-task','template-rollback-objective','template-rollback-kr')) then
    raise exception 'Rejected Objective/KR template batch left partial records behind';
  end if;
end
$template_rollback$;

-- A denied collection must fail during the preflight phase before writing the Project.
do $template_permission$
declare
  ws uuid := '11111111-1111-4111-8111-111111111111';
begin
  perform set_config('test.deny_collection','krs',false);
  begin
    perform public.projects_apply_records_batch(ws, jsonb_build_array(
      jsonb_build_object('collection','projects','id','template-denied-project','data',
        '{"name":"Must Not Persist"}'::jsonb,'deleted',false,'expected_updated_at',null),
      jsonb_build_object('collection','objectives','id','template-denied-objective','data',
        '{"name":"Must Not Persist","status":"Active"}'::jsonb,'deleted',false,'expected_updated_at',null),
      jsonb_build_object('collection','krs','id','template-denied-kr','data',
        '{"name":"Denied KR","objective_id":"template-denied-objective","project_ids":["template-denied-project"],"task_ids":[],"type":"Project Based"}'::jsonb,'deleted',false,'expected_updated_at',null)
    ));
    raise exception 'expected KR collection permission denial';
  exception when sqlstate '42501' then null;
  end;
  perform set_config('test.deny_collection','',false);
  if exists(select 1 from public.workspace_records where workspace_id=ws and system_id='projects'
    and collection in ('projects','objectives','krs')
    and id in ('template-denied-project','template-denied-objective','template-denied-kr')) then
    raise exception 'KR permission denial left a partial template package';
  end if;
end
$template_permission$;

select 'Projects Objective/KR template atomic batch smoke passed' as result;
