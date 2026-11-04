\set ON_ERROR_STOP on
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);

-- A real conversion batch must update the discovery and insert its destination
-- task in one RPC call.
do $block$
declare
  v_workspace uuid := '11111111-1111-4111-8111-111111111111';
  v_discovery_updated_at timestamptz;
  v_result jsonb;
begin
  insert into public.workspace_records
    (workspace_id, system_id, collection, id, data)
  values
    (v_workspace, 'projects', 'discovery', 'discovery-success',
     '{"title":"Discovery to convert","status":"Open"}')
  returning updated_at into v_discovery_updated_at;

  v_result := public.projects_apply_records_batch(
    v_workspace,
    jsonb_build_array(
      jsonb_build_object(
        'collection','tasks','id','task-from-discovery',
        'data',jsonb_build_object('title','Created from discovery','project_id','project-1','discovery_ids',jsonb_build_array('discovery-success')),
        'deleted',false,'expected_updated_at',null
      ),
      jsonb_build_object(
        'collection','discovery','id','discovery-success',
        'data',jsonb_build_object('title','Discovery to convert','status','Completed','resolution_links',jsonb_build_array(jsonb_build_object('kind','task','id','task-from-discovery'))),
        'deleted',false,'expected_updated_at',v_discovery_updated_at
      )
    )
  );

  if jsonb_array_length(v_result) <> 2 then
    raise exception 'expected both records in atomic RPC result';
  end if;
  if not exists (
    select 1 from public.workspace_records
     where workspace_id = v_workspace and system_id = 'projects'
       and collection = 'tasks' and id = 'task-from-discovery'
  ) then
    raise exception 'destination task was not inserted';
  end if;
  if not exists (
    select 1 from public.workspace_records
     where workspace_id = v_workspace and system_id = 'projects'
       and collection = 'discovery' and id = 'discovery-success'
       and data->>'status' = 'Completed'
  ) then
    raise exception 'source discovery was not updated';
  end if;
end
$block$;

-- The database permission check must reject discovery writes for a viewer,
-- and the other item in the same batch must remain untouched.
do $block$
declare
  v_workspace uuid := '11111111-1111-4111-8111-111111111111';
  v_discovery_updated_at timestamptz;
begin
  select updated_at into v_discovery_updated_at
    from public.workspace_records
   where workspace_id = v_workspace and system_id = 'projects'
     and collection = 'discovery' and id = 'discovery-success';

  perform set_config('test.deny_collection','discovery',false);
  begin
    perform public.projects_apply_records_batch(
      v_workspace,
      jsonb_build_array(
        jsonb_build_object(
          'collection','tasks','id','task-must-not-write',
          'data',jsonb_build_object('title','Must roll back'),
          'deleted',false,'expected_updated_at',null
        ),
        jsonb_build_object(
          'collection','discovery','id','discovery-success',
          'data',jsonb_build_object('title','Unauthorized change'),
          'deleted',false,'expected_updated_at',v_discovery_updated_at
        )
      )
    );
    raise exception 'expected discovery edit permission rejection';
  exception when sqlstate '42501' then
    null;
  end;
  perform set_config('test.deny_collection','',false);

  if exists (
    select 1 from public.workspace_records
     where workspace_id = v_workspace and system_id = 'projects'
       and collection = 'tasks' and id = 'task-must-not-write'
  ) then
    raise exception 'permission failure left a partial task write';
  end if;
end
$block$;

-- Force a failure after the first write to prove PostgreSQL rolls the entire
-- RPC statement back, not merely the failing discovery update.
create or replace function public.projects_test_fail_discovery_write()
returns trigger language plpgsql as $trigger$
begin
  if new.data->>'force_test_failure' = 'true' then
    raise exception 'forced atomic batch rollback test failure';
  end if;
  return new;
end
$trigger$;
create trigger projects_test_fail_discovery_write
before insert or update on public.workspace_records
for each row execute function public.projects_test_fail_discovery_write();

do $block$
declare
  v_workspace uuid := '11111111-1111-4111-8111-111111111111';
  v_discovery_updated_at timestamptz;
begin
  select updated_at into v_discovery_updated_at
    from public.workspace_records
   where workspace_id = v_workspace and system_id = 'projects'
     and collection = 'discovery' and id = 'discovery-success';

  begin
    perform public.projects_apply_records_batch(
      v_workspace,
      jsonb_build_array(
        jsonb_build_object(
          'collection','tasks','id','task-must-rollback',
          'data',jsonb_build_object('title','First write in failing batch'),
          'deleted',false,'expected_updated_at',null
        ),
        jsonb_build_object(
          'collection','discovery','id','discovery-success',
          'data',jsonb_build_object('title','Fail after task insert','force_test_failure',true),
          'deleted',false,'expected_updated_at',v_discovery_updated_at
        )
      )
    );
    raise exception 'expected forced mid-batch failure';
  exception when sqlstate 'P0001' then
    if sqlerrm = 'expected forced mid-batch failure' then
      raise;
    end if;
  end;

  if exists (
    select 1 from public.workspace_records
     where workspace_id = v_workspace and system_id = 'projects'
       and collection = 'tasks' and id = 'task-must-rollback'
  ) then
    raise exception 'atomic batch left the first task write after second write failed';
  end if;
  if not exists (
    select 1 from public.workspace_records
     where workspace_id = v_workspace and system_id = 'projects'
       and collection = 'discovery' and id = 'discovery-success'
       and data->>'status' = 'Completed'
  ) then
    raise exception 'failed batch changed the source discovery';
  end if;
end
$block$;

drop trigger projects_test_fail_discovery_write on public.workspace_records;
drop function public.projects_test_fail_discovery_write();

select 'Projects atomic discovery RPC smoke tests passed' as result;
