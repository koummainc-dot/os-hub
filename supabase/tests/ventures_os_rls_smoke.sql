-- Ventures OS RLS acceptance smoke.
-- Runs on a disposable PostgreSQL database after platform core + record visibility migrations.

insert into auth.users(id) values
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
 ('cccccccc-cccc-4ccc-8ccc-cccccccccccc');

insert into public.workspaces(id, owner_id, owner_name, name) values
 ('11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Owner A','Workspace A');

insert into public.workspace_members(workspace_id,user_id,email,display_name,access,status) values
 ('11111111-1111-4111-8111-111111111111','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','b@example.com','Member B',
  '{"systems":{"ventures":{"level":"edit"}}}'::jsonb,'active');

insert into public.workspace_data(workspace_id,system_id,part,data)
values ('11111111-1111-4111-8111-111111111111','ventures','main','{"owner":"A"}'::jsonb);

insert into public.workspace_records(workspace_id,system_id,collection,id,data)
values ('11111111-1111-4111-8111-111111111111','ventures','profiles','r1','{"name":"A"}'::jsonb);

-- Owner: full access.
set role authenticated;
select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',false);
do $$
declare n integer;
begin
  select count(*) into n from public.workspace_data where workspace_id='11111111-1111-4111-8111-111111111111';
  if n<>1 then raise exception 'Owner cannot read Ventures workspace_data'; end if;
  select count(*) into n from public.workspace_records where workspace_id='11111111-1111-4111-8111-111111111111';
  if n<>1 then raise exception 'Owner cannot read Ventures workspace_records'; end if;
end $$;

-- Edit member: can read/write only the permitted workspace.
select set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',false);
do $$
begin
  insert into public.workspace_data(workspace_id,system_id,part,data)
  values ('11111111-1111-4111-8111-111111111111','ventures','main','{"member":"B"}'::jsonb)
  on conflict (workspace_id,system_id,part) do update set data=excluded.data;
  insert into public.workspace_records(workspace_id,system_id,collection,id,data)
  values ('11111111-1111-4111-8111-111111111111','ventures','profiles','r2','{"name":"B"}'::jsonb);
end $$;

-- Unrelated user: no visibility and no writes.
select set_config('request.jwt.claim.sub','cccccccc-cccc-4ccc-8ccc-cccccccccccc',false);
do $$
declare n integer;
begin
  select count(*) into n from public.workspace_data where workspace_id='11111111-1111-4111-8111-111111111111';
  if n<>0 then raise exception 'Unrelated user can read Ventures workspace_data'; end if;
  select count(*) into n from public.workspace_records where workspace_id='11111111-1111-4111-8111-111111111111';
  if n<>0 then raise exception 'Unrelated user can read Ventures workspace_records'; end if;
  begin
    insert into public.workspace_data(workspace_id,system_id,part,data)
    values ('11111111-1111-4111-8111-111111111111','ventures','other','{"bad":true}'::jsonb);
    raise exception 'Unrelated user unexpectedly wrote Ventures workspace_data';
  exception when insufficient_privilege then
    null;
  end;
  begin
    insert into public.workspace_records(workspace_id,system_id,collection,id,data)
    values ('11111111-1111-4111-8111-111111111111','ventures','profiles','r3','{"bad":true}'::jsonb);
    raise exception 'Unrelated user unexpectedly wrote Ventures workspace_records';
  exception when insufficient_privilege then
    null;
  end;
end $$;

reset role;
