-- Run only against tests/home_os_sql_bootstrap.sql + the three Home OS migrations.
\set ON_ERROR_STOP on
insert into public.workspaces(id) values ('10000000-0000-4000-8000-000000000001');
insert into auth.users(id) values ('20000000-0000-4000-8000-000000000001');
select set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000001',false);
select set_config('test.allowed_workspace_id','10000000-0000-4000-8000-000000000001',false);
select set_config('test.access_level','edit',false);
set role authenticated;

select public.home_save_snapshot(
  '10000000-0000-4000-8000-000000000001',
  '{
    "schemaVersion":1,
    "properties":[{"id":"30000000-0000-4000-8000-000000000001","name":"Test home","address":"","notes":"","isDefault":true,"createdAt":"2026-10-31T00:00:00Z"}],
    "rooms":[{"id":"40000000-0000-4000-8000-000000000001","propertyId":"30000000-0000-4000-8000-000000000001","name":"General","type":"general","floor":"","notes":"","createdAt":"2026-10-31T00:00:00Z"}],
    "items":[{"id":"50000000-0000-4000-8000-000000000001","propertyId":"30000000-0000-4000-8000-000000000001","roomId":"40000000-0000-4000-8000-000000000001","name":"Test item","type":"misc","condition":"good","unit":"piece","quantity":2,"minimumQuantity":1,"unitPrice":12,"currency":"EGP","createdAt":"2026-10-31T00:00:00Z"}],
    "movements":[{"id":"60000000-0000-4000-8000-000000000001","itemId":"50000000-0000-4000-8000-000000000001","type":"receive","quantity":2,"occurredAt":"2026-10-31T00:00:00Z","note":"opening","idempotencyKey":"smoke-opening-item-0001"}],
    "settings":{"currency":"EGP","timezone":"Africa/Cairo","preferences":{}}
  }'::jsonb
);
-- Replaying the same opening movement must not create a second inventory movement.
select public.home_save_snapshot(
  '10000000-0000-4000-8000-000000000001',
  '{
    "schemaVersion":1,
    "properties":[{"id":"30000000-0000-4000-8000-000000000001","name":"Test home","isDefault":true}],
    "rooms":[{"id":"40000000-0000-4000-8000-000000000001","propertyId":"30000000-0000-4000-8000-000000000001","name":"General","type":"general"}],
    "items":[{"id":"50000000-0000-4000-8000-000000000001","propertyId":"30000000-0000-4000-8000-000000000001","roomId":"40000000-0000-4000-8000-000000000001","name":"Test item","type":"misc","condition":"good","unit":"piece","quantity":2,"minimumQuantity":1,"currency":"EGP"}],
    "movements":[{"id":"60000000-0000-4000-8000-000000000001","itemId":"50000000-0000-4000-8000-000000000001","type":"receive","quantity":2,"idempotencyKey":"smoke-opening-item-0001"}],
    "settings":{"currency":"EGP","timezone":"Africa/Cairo","preferences":{}}
  }'::jsonb
);
do $$
begin
  if (select count(*) from public.home_inventory_movements where workspace_id='10000000-0000-4000-8000-000000000001') <> 1 then
    raise exception 'HOME_MOVEMENT_IDEMPOTENCY_FAILED';
  end if;
  if jsonb_array_length(public.home_load_snapshot('10000000-0000-4000-8000-000000000001')->'properties') <> 1 then
    raise exception 'HOME_SNAPSHOT_LOAD_FAILED';
  end if;
end $$;

select public.home_operations_save(
  '10000000-0000-4000-8000-000000000001',
  '{"tasks":[],"completions":[],"providers":[],"maintenance":[],"purchaseRequests":[],"purchaseItems":[],"bills":[],"events":[]}'::jsonb
);
do $$
declare snapshot jsonb;
begin
  snapshot := public.home_operations_load('10000000-0000-4000-8000-000000000001');
  if jsonb_typeof(snapshot->'tasks') <> 'array' or jsonb_typeof(snapshot->'events') <> 'array' then
    raise exception 'HOME_OPERATIONS_LOAD_FAILED';
  end if;
end $$;

select set_config('test.access_level','view',false);
do $$
begin
  perform public.home_operations_save(
    '10000000-0000-4000-8000-000000000001',
    '{"tasks":[],"completions":[],"providers":[],"maintenance":[],"purchaseRequests":[],"purchaseItems":[],"bills":[],"events":[]}'::jsonb
  );
  raise exception 'HOME_VIEW_ROLE_WRITE_SHOULD_FAIL';
exception when insufficient_privilege then
  null;
end $$;
reset role;
