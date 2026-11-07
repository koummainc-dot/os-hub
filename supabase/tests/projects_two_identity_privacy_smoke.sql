\set ON_ERROR_STOP on
-- Two isolated identities exercise the same workspace_records RLS policy.
\c projects_test
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);

set role authenticated;
insert into public.workspace_records (workspace_id,system_id,collection,id,data,visible_to)
values
 ('11111111-1111-4111-8111-111111111111','projects','projects','private-project',
  '{"name":"Private Project","lead_id":"22222222-2222-4222-8222-222222222222"}',array['22222222-2222-4222-8222-222222222222'::uuid]),
 ('11111111-1111-4111-8111-111111111111','projects','tasks','private-task',
  '{"project_id":"private-project","title":"Private Task","status":"Not Started"}',array['22222222-2222-4222-8222-222222222222'::uuid]),
 ('11111111-1111-4111-8111-111111111111','projects','risks','private-risk',
  '{"project_id":"private-project","title":"Private Risk","task_ids":["private-task"]}',array['22222222-2222-4222-8222-222222222222'::uuid]),
 ('11111111-1111-4111-8111-111111111111','projects','decisions','private-decision',
  '{"project_id":"private-project","title":"Private Decision","affected_task_ids":["private-task"],"affected_risk_ids":["private-risk"]}',array['22222222-2222-4222-8222-222222222222'::uuid]),
 ('11111111-1111-4111-8111-111111111111','projects','projects','public-project',
  '{"name":"Workspace-visible Project"}',null);
do $owner$
begin
  if (select count(*) from public.workspace_records where workspace_id='11111111-1111-4111-8111-111111111111' and system_id='projects' and id like 'private-%') <> 4 then
    raise exception 'Owner A cannot read all private project records';
  end if;
end
$owner$;

select set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',false);
do $member$
begin
  if (select count(*) from public.workspace_records where workspace_id='11111111-1111-4111-8111-111111111111' and system_id='projects' and id like 'private-%') <> 0 then
    raise exception 'Account B can read records private to Account A';
  end if;
  if (select count(*) from public.workspace_records where workspace_id='11111111-1111-4111-8111-111111111111' and system_id='projects' and id='public-project') <> 1 then
    raise exception 'Account B cannot read a workspace-visible project';
  end if;
  update public.workspace_records set data=jsonb_set(data,'{name}','"Tampered"')
   where workspace_id='11111111-1111-4111-8111-111111111111'
     and system_id='projects' and collection='projects' and id='private-project';
  if found then raise exception 'Account B updated a private Project'; end if;
end
$member$;
reset role;
select 'Projects two-identity record privacy smoke passed' as result;
