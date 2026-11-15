\set ON_ERROR_STOP on
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);

do $$
declare
  ws uuid := '11111111-1111-4111-8111-111111111111';
  discovery_ts timestamptz;
  result jsonb;
begin
  insert into public.workspace_records(workspace_id,system_id,collection,id,data)
  values(ws,'projects','projects','discovery-project','{"name":"Discovery Project"}');

  insert into public.workspace_records(workspace_id,system_id,collection,id,data)
  values(ws,'projects','discovery','d1','{"title":"D1","status":"Open","project_ids":["discovery-project"]}')
  returning updated_at into discovery_ts;

  result := public.projects_apply_records_batch(
    ws,
    jsonb_build_array(
      jsonb_build_object('collection','tasks','id','t1','data','{"title":"From D1","project_id":"discovery-project","discovery_ids":["d1"]}'::jsonb,'deleted',false,'expected_updated_at',null),
      jsonb_build_object('collection','discovery','id','d1','data','{"title":"D1","status":"Completed"}'::jsonb,'deleted',false,'expected_updated_at',discovery_ts)
    )
  );

  if jsonb_array_length(result) <> 2 then raise exception 'atomic success result incomplete'; end if;
  if not exists(select 1 from public.workspace_records where workspace_id=ws and collection='tasks' and id='t1') then
    raise exception 'discovery conversion did not create task';
  end if;
  if not exists(select 1 from public.workspace_records where workspace_id=ws and collection='discovery' and id='d1' and data->>'status'='Completed') then
    raise exception 'discovery was not completed';
  end if;
end $$;

do $$
declare
  ws uuid := '11111111-1111-4111-8111-111111111111';
  discovery_ts timestamptz;
begin
  select updated_at into discovery_ts from public.workspace_records
   where workspace_id=ws and collection='discovery' and id='d1';

  perform set_config('test.deny_collection','discovery',false);
  begin
    perform public.projects_apply_records_batch(
      ws,
      jsonb_build_array(
        jsonb_build_object('collection','tasks','id','viewer-must-not-write','data','{"title":"blocked","project_id":"discovery-project"}'::jsonb,'deleted',false,'expected_updated_at',null),
        jsonb_build_object('collection','discovery','id','d1','data','{"status":"Blocked"}'::jsonb,'deleted',false,'expected_updated_at',discovery_ts)
      )
    );
    raise exception 'expected permission denial';
  exception when sqlstate '42501' then null;
  end;
  perform set_config('test.deny_collection','',false);

  if exists(select 1 from public.workspace_records where workspace_id=ws and collection='tasks' and id='viewer-must-not-write') then
    raise exception 'permission denial left a partial task write';
  end if;
end $$;

create or replace function public.projects_test_force_failure()
returns trigger language plpgsql as $$
begin
  if new.data->>'force_test_failure' = 'true' then
    raise exception 'forced atomic rollback';
  end if;
  return new;
end $$;

create trigger projects_test_force_failure
before insert or update on public.workspace_records
for each row execute function public.projects_test_force_failure();

do $$
declare
  ws uuid := '11111111-1111-4111-8111-111111111111';
  discovery_ts timestamptz;
begin
  select updated_at into discovery_ts from public.workspace_records
   where workspace_id=ws and collection='discovery' and id='d1';

  begin
    perform public.projects_apply_records_batch(
      ws,
      jsonb_build_array(
        jsonb_build_object('collection','tasks','id','rollback-task','data','{"title":"must rollback","project_id":"discovery-project","discovery_ids":["d1"]}'::jsonb,'deleted',false,'expected_updated_at',null),
        jsonb_build_object('collection','discovery','id','d1','data','{"status":"Completed","force_test_failure":"true"}'::jsonb,'deleted',false,'expected_updated_at',discovery_ts)
      )
    );
    raise exception 'expected forced rollback';
  exception when sqlstate 'P0001' then
    if sqlerrm='expected forced rollback' then raise; end if;
  end;

  if exists(select 1 from public.workspace_records where workspace_id=ws and collection='tasks' and id='rollback-task') then
    raise exception 'partial task write survived rollback';
  end if;
  if not exists(select 1 from public.workspace_records where workspace_id=ws and collection='discovery' and id='d1' and data->>'status'='Completed') then
    raise exception 'source discovery changed despite rollback';
  end if;
end $$;

drop trigger projects_test_force_failure on public.workspace_records;
drop function public.projects_test_force_failure();

select 'Projects atomic discovery RPC smoke tests passed' as result;
