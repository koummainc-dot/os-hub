\set ON_ERROR_STOP on
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);

do $lifecycle$
declare
  ws uuid := '11111111-1111-4111-8111-111111111111';
  result jsonb;
  project_data jsonb;
  task_data jsonb;
  risk_data jsonb;
  decision_data jsonb;
  project_ts timestamptz;
  task_ts timestamptz;
begin
  -- Create the Project and related records through the same atomic batch RPC used by the app.
  result := public.projects_apply_records_batch(ws, jsonb_build_array(
    jsonb_build_object('collection','projects','id','lifecycle-project','data',
      jsonb_build_object('name','Lifecycle Project','status','Planned'),'deleted',false),
    jsonb_build_object('collection','tasks','id','lifecycle-task','data',
      jsonb_build_object('title','Lifecycle Task','project_id','lifecycle-project','status','Not Started'),'deleted',false),
    jsonb_build_object('collection','risks','id','lifecycle-risk','data',
      jsonb_build_object('title','Lifecycle Risk','project_id','lifecycle-project','task_ids',jsonb_build_array('lifecycle-task')),'deleted',false),
    jsonb_build_object('collection','decisions','id','lifecycle-decision','data',
      jsonb_build_object('title','Lifecycle Decision','project_id','lifecycle-project','affected_task_ids',jsonb_build_array('lifecycle-task'),'affected_risk_ids',jsonb_build_array('lifecycle-risk')),'deleted',false)
  ));
  if jsonb_array_length(result) <> 4 then raise exception 'Create did not persist all four lifecycle records'; end if;

  -- Simulated reload: read the committed record representation back from workspace_records.
  select data, updated_at into project_data, project_ts
    from public.workspace_records where workspace_id=ws and system_id='projects' and collection='projects' and id='lifecycle-project';
  select data, updated_at into task_data, task_ts
    from public.workspace_records where workspace_id=ws and system_id='projects' and collection='tasks' and id='lifecycle-task';
  select data into risk_data from public.workspace_records where workspace_id=ws and system_id='projects' and collection='risks' and id='lifecycle-risk';
  select data into decision_data from public.workspace_records where workspace_id=ws and system_id='projects' and collection='decisions' and id='lifecycle-decision';
  if project_data->>'name' <> 'Lifecycle Project' or task_data->>'title' <> 'Lifecycle Task'
     or risk_data->>'title' <> 'Lifecycle Risk' or decision_data->>'title' <> 'Lifecycle Decision' then
    raise exception 'Create → Reload did not return the saved records';
  end if;

  -- Edit, then reload again and verify the new values.
  result := public.projects_apply_records_batch(ws, jsonb_build_array(
    jsonb_build_object('collection','projects','id','lifecycle-project','data',
      jsonb_set(project_data,'{name}','"Lifecycle Project Edited"'::jsonb),'deleted',false,'expected_updated_at',project_ts),
    jsonb_build_object('collection','tasks','id','lifecycle-task','data',
      jsonb_set(task_data,'{title}','"Lifecycle Task Edited"'::jsonb),'deleted',false,'expected_updated_at',task_ts)
  ));
  select data, updated_at into project_data, project_ts
    from public.workspace_records where workspace_id=ws and system_id='projects' and collection='projects' and id='lifecycle-project';
  select data, updated_at into task_data, task_ts
    from public.workspace_records where workspace_id=ws and system_id='projects' and collection='tasks' and id='lifecycle-task';
  if project_data->>'name' <> 'Lifecycle Project Edited' or task_data->>'title' <> 'Lifecycle Task Edited' then
    raise exception 'Edit → Reload did not return the updated records';
  end if;

  -- Archive and restore the Project through the same repository batch endpoint.
  result := public.projects_apply_records_batch(ws, jsonb_build_array(
    jsonb_build_object('collection','projects','id','lifecycle-project','data',
      project_data || jsonb_build_object('status','Archived','archived_at',clock_timestamp()),'deleted',false,'expected_updated_at',project_ts)
  ));
  select data, updated_at into project_data, project_ts
    from public.workspace_records where workspace_id=ws and system_id='projects' and collection='projects' and id='lifecycle-project';
  if project_data->>'archived_at' is null or project_data->>'status' <> 'Archived' then
    raise exception 'Archive did not persist';
  end if;

  result := public.projects_apply_records_batch(ws, jsonb_build_array(
    jsonb_build_object('collection','projects','id','lifecycle-project','data',
      (project_data - 'archived_at') || jsonb_build_object('status','Planned'),'deleted',false,'expected_updated_at',project_ts)
  ));
  select data into project_data
    from public.workspace_records where workspace_id=ws and system_id='projects' and collection='projects' and id='lifecycle-project';
  if project_data->>'archived_at' is not null or project_data->>'status' <> 'Planned' then
    raise exception 'Restore → Reload did not return an active Project';
  end if;

  -- Stale edits must be rejected rather than overwriting a newer persisted value.
  begin
    perform public.projects_apply_records_batch(ws, jsonb_build_array(
      jsonb_build_object('collection','projects','id','lifecycle-project','data',
        project_data || jsonb_build_object('name','Stale overwrite'),'deleted',false,'expected_updated_at','2000-01-01T00:00:00Z')
    ));
    raise exception 'Expected stale lifecycle write rejection';
  exception when sqlstate '40001' then null;
  end;
end
$lifecycle$;

select 'Projects DB lifecycle smoke passed: Create → Reload → Edit → Reload → Archive → Restore → Reload' as result;
