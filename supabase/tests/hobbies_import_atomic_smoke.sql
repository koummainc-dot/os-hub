-- Atomic import contract: a late failure must roll back earlier rows in the same RPC call.
insert into public.workspaces(id) values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');

set request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
set role authenticated;

-- Seed a collision. The first row in the following batch must roll back when
-- the second row hits the existing primary key.
insert into public.workspace_records(workspace_id,system_id,collection,id,data,visible_to)
values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','hobbies','habits','taken','{"name":"existing"}',
 array['11111111-1111-4111-8111-111111111111'::uuid]);

do $test$
begin
  perform * from public.hobbies_import_records_batch(
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    '[
      {"collection":"habits","id":"must-rollback","data":{"name":"first"},"visible_to":["11111111-1111-4111-8111-111111111111"]},
      {"collection":"habits","id":"taken","data":{"name":"collision"},"visible_to":["11111111-1111-4111-8111-111111111111"]}
    ]'::jsonb
  );
  raise exception 'unique conflict unexpectedly succeeded';
exception when unique_violation then
  null;
end
$test$;

do $test$
declare v_count integer;
begin
  select count(*) into v_count from public.workspace_records
  where workspace_id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
    and system_id='hobbies' and collection='habits' and id='must-rollback';
  if v_count <> 0 then raise exception 'partial import row survived a later unique conflict'; end if;
end
$test$;

-- A forged shared audience must also abort the complete batch.
do $test$
begin
  perform * from public.hobbies_import_records_batch(
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    '[
      {"collection":"books","id":"private-first","data":{"title":"first"},"visible_to":["11111111-1111-4111-8111-111111111111"]},
      {"collection":"books","id":"private-forged","data":{"title":"second"},"visible_to":["11111111-1111-4111-8111-111111111111","22222222-2222-4222-8222-222222222222"]}
    ]'::jsonb
  );
  raise exception 'forged private audience unexpectedly succeeded';
exception when insufficient_privilege then
  null;
end
$test$;

do $test$
declare v_count integer;
begin
  select count(*) into v_count from public.workspace_records
  where workspace_id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
    and system_id='hobbies' and collection='books' and id in ('private-first','private-forged');
  if v_count <> 0 then raise exception 'privacy failure left partial import rows'; end if;
end
$test$;

-- Successful import returns one confirmation row per persisted record.
do $test$
declare v_count integer;
begin
  select count(*) into v_count from public.hobbies_import_records_batch(
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    '[
      {"collection":"habits","id":"habit-ok","data":{"name":"reading"},"visible_to":["11111111-1111-4111-8111-111111111111"]},
      {"collection":"habitLogs","id":"log-ok","data":{"habitId":"habit-ok","status":"done"},"visible_to":["11111111-1111-4111-8111-111111111111"]}
    ]'::jsonb
  );
  if v_count <> 2 then raise exception 'expected two confirmed import rows, got %',v_count; end if;
end
$test$;

reset role;
set request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';
set role authenticated;
do $privacy$
declare v_count integer;
begin
  select count(*) into v_count from public.workspace_records
  where workspace_id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
    and system_id='hobbies' and collection in ('habits','habitLogs')
    and id in ('habit-ok','log-ok');
  if v_count <> 0 then raise exception 'another member can read imported private habit records'; end if;
end
$privacy$;
reset role;

select 'Hobbies atomic import rollback, success, and privacy tests passed.' as result;
