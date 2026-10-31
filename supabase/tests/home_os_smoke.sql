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

-- Atomic purchase receipt: request status, inventory quantity/movement, receipt and outbox commit together.
-- Seed the purchase through the same legacy snapshot API used by the current UI.
-- The receipt RPC must hydrate relational purchase rows transactionally before receiving.
select public.home_operations_save(
  '10000000-0000-4000-8000-000000000001',
  '{
    "tasks":[],
    "completions":[],
    "providers":[],
    "maintenance":[],
    "purchaseRequests":[{
      "id":"70000000-0000-4000-8000-000000000001",
      "propertyId":"30000000-0000-4000-8000-000000000001",
      "title":"Atomic receipt smoke test",
      "status":"ordered",
      "priority":"normal",
      "currency":"EGP",
      "createdAt":"2026-10-31T00:00:00Z"
    }],
    "purchaseItems":[{
      "id":"71000000-0000-4000-8000-000000000001",
      "requestId":"70000000-0000-4000-8000-000000000001",
      "name":"Receipt smoke item",
      "quantity":5,
      "estimatedUnitPrice":12,
      "receivedQuantity":0,
      "notes":""
    }],
    "bills":[],
    "events":[]
  }'::jsonb
);
select public.home_record_purchase_receipt(
  '10000000-0000-4000-8000-000000000001',
  '70000000-0000-4000-8000-000000000001',
  '[{"itemId":"71000000-0000-4000-8000-000000000001","quantity":2,"unitPrice":12}]'::jsonb,
  'smoke-receipt-request-line-0001'
);
-- Replaying the same idempotency key must return the prior receipt without another movement.
select public.home_record_purchase_receipt(
  '10000000-0000-4000-8000-000000000001',
  '70000000-0000-4000-8000-000000000001',
  '[{"itemId":"71000000-0000-4000-8000-000000000001","quantity":2,"unitPrice":12}]'::jsonb,
  'smoke-receipt-request-line-0001'
);
-- Complete the remaining quantity, then replay the final receipt after status becomes received.
select public.home_record_purchase_receipt(
  '10000000-0000-4000-8000-000000000001',
  '70000000-0000-4000-8000-000000000001',
  '[{"itemId":"71000000-0000-4000-8000-000000000001","quantity":3,"unitPrice":12}]'::jsonb,
  'smoke-receipt-request-line-0002'
);
select public.home_record_purchase_receipt(
  '10000000-0000-4000-8000-000000000001',
  '70000000-0000-4000-8000-000000000001',
  '[{"itemId":"71000000-0000-4000-8000-000000000001","quantity":3,"unitPrice":12}]'::jsonb,
  'smoke-receipt-request-line-0002'
);
do $$
begin
  if (select count(*) from public.home_purchase_receipts
      where workspace_id='10000000-0000-4000-8000-000000000001'
        and idempotency_key in ('smoke-receipt-request-line-0001','smoke-receipt-request-line-0002')) <> 2 then
    raise exception 'HOME_RECEIPT_IDEMPOTENCY_FAILED';
  end if;
  if (select received_quantity from public.home_purchase_request_items
      where workspace_id='10000000-0000-4000-8000-000000000001'
        and id='71000000-0000-4000-8000-000000000001') <> 5 then
    raise exception 'HOME_RECEIPT_QUANTITY_NOT_PERSISTED';
  end if;
  if (select count(*) from public.home_purchase_receipt_items
      where workspace_id='10000000-0000-4000-8000-000000000001') <> 2 then
    raise exception 'HOME_RECEIPT_ITEMS_DUPLICATED';
  end if;
  if (select count(*) from public.home_inventory_movements
      where workspace_id='10000000-0000-4000-8000-000000000001'
        and idempotency_key like 'purchase-receipt:%') <> 2 then
    raise exception 'HOME_RECEIPT_MOVEMENT_DUPLICATED';
  end if;
  if (select status from public.home_purchase_requests
      where workspace_id='10000000-0000-4000-8000-000000000001'
        and id='70000000-0000-4000-8000-000000000001') <> 'received' then
    raise exception 'HOME_RECEIPT_STATUS_INVALID';
  end if;
end $$;
reset role;
do $$
begin
  if (select count(*) from public.home_outbox_events
      where workspace_id='10000000-0000-4000-8000-000000000001'
        and event_type='home.purchase.receipt.recorded') <> 2 then
    raise exception 'HOME_RECEIPT_OUTBOX_MISSING_OR_DUPLICATED';
  end if;
end $$;
set role authenticated;

-- Bills are relational; payments create durable history, mark the old occurrence paid,
-- retain the next due occurrence, and enqueue a Finance review event idempotently.
select public.home_operations_save(
  '10000000-0000-4000-8000-000000000001',
  '{
    "tasks":[],"completions":[],"providers":[],"maintenance":[],
    "purchaseRequests":[],"purchaseItems":[],
    "bills":[{
      "id":"72000000-0000-4000-8000-000000000001",
      "title":"Electricity","amount":100,"currency":"EGP","frequency":"monthly",
      "dueDate":"2026-10-01","status":"due","category":"Utilities","notes":"",
      "createdAt":"2026-09-01T00:00:00Z"
    }],
    "events":[]
  }'::jsonb
);
select public.home_operations_save(
  '10000000-0000-4000-8000-000000000001',
  '{
    "tasks":[],"completions":[],"providers":[],"maintenance":[],
    "purchaseRequests":[],"purchaseItems":[],
    "bills":[{
      "id":"72000000-0000-4000-8000-000000000001",
      "title":"Electricity","amount":100,"currency":"EGP","frequency":"monthly",
      "dueDate":"2026-11-01","status":"due","category":"Utilities","notes":"",
      "lastPaidAt":"2026-10-01T12:00:00Z","createdAt":"2026-09-01T00:00:00Z"
    }],
    "events":[{
      "type":"home.bill.payment.recorded","ownerSystem":"home","entityType":"home_bill",
      "entityId":"72000000-0000-4000-8000-000000000001","occurredAt":"2026-10-01T12:00:00Z",
      "payload":{
        "sourcePaymentId":"home-bill:72000000-0000-4000-8000-000000000001:2026-10-01",
        "billId":"72000000-0000-4000-8000-000000000001","billTitle":"Electricity",
        "amount":100,"currency":"EGP","category":"Utilities","paymentDate":"2026-10-01","frequency":"monthly"
      }
    }]
  }'::jsonb
);
-- Re-saving the same event must not create a duplicate payment or outbox row.
select public.home_operations_save(
  '10000000-0000-4000-8000-000000000001',
  '{
    "tasks":[],"completions":[],"providers":[],"maintenance":[],
    "purchaseRequests":[],"purchaseItems":[],
    "bills":[{
      "id":"72000000-0000-4000-8000-000000000001",
      "title":"Electricity","amount":100,"currency":"EGP","frequency":"monthly",
      "dueDate":"2026-11-01","status":"due","category":"Utilities","notes":"",
      "lastPaidAt":"2026-10-01T12:00:00Z","createdAt":"2026-09-01T00:00:00Z"
    }],
    "events":[{
      "type":"home.bill.payment.recorded","ownerSystem":"home","entityType":"home_bill",
      "entityId":"72000000-0000-4000-8000-000000000001","occurredAt":"2026-10-01T12:00:00Z",
      "payload":{
        "sourcePaymentId":"home-bill:72000000-0000-4000-8000-000000000001:2026-10-01",
        "billId":"72000000-0000-4000-8000-000000000001","billTitle":"Electricity",
        "amount":100,"currency":"EGP","category":"Utilities","paymentDate":"2026-10-01","frequency":"monthly"
      }
    }]
  }'::jsonb
);
do $$
begin
  if (select count(*) from public.home_bill_payments
      where workspace_id='10000000-0000-4000-8000-000000000001'
        and idempotency_key='home-bill:72000000-0000-4000-8000-000000000001:2026-10-01') <> 1 then
    raise exception 'HOME_BILL_PAYMENT_IDEMPOTENCY_FAILED';
  end if;
  if (select status from public.home_bill_occurrences
      where workspace_id='10000000-0000-4000-8000-000000000001'
        and bill_id='72000000-0000-4000-8000-000000000001' and due_date='2026-10-01') <> 'paid' then
    raise exception 'HOME_BILL_OCCURRENCE_NOT_PAID';
  end if;
  if (select due_date from public.home_bills
      where workspace_id='10000000-0000-4000-8000-000000000001'
        and id='72000000-0000-4000-8000-000000000001') <> '2026-11-01'::date then
    raise exception 'HOME_BILL_NEXT_DUE_NOT_PERSISTED';
  end if;
end $$;
reset role;
do $$
begin
  if (select count(*) from public.home_outbox_events
      where workspace_id='10000000-0000-4000-8000-000000000001'
        and idempotency_key='home-bill:72000000-0000-4000-8000-000000000001:2026-10-01') <> 1 then
    raise exception 'HOME_BILL_OUTBOX_IDEMPOTENCY_FAILED';
  end if;
end $$;
set role authenticated;

select set_config('test.access_level','view',false);
do $$
begin
  perform public.home_operations_save(
    '10000000-0000-4000-8000-000000000001',
    '{"tasks":[{"id":"73000000-0000-4000-8000-000000000001","title":"Relational task","description":"","taskType":"routine","status":"active","priority":"normal","propertyId":"30000000-0000-4000-8000-000000000001","roomId":"40000000-0000-4000-8000-000000000001","dueDate":"2026-10-31","recurrenceRule":{"frequency":"daily"},"estimatedMinutes":15,"reminderAt":"2026-10-31T08:00:00Z","createdAt":"2026-10-31T00:00:00Z"}],"completions":[{"id":"74000000-0000-4000-8000-000000000001","taskId":"73000000-0000-4000-8000-000000000001","outcome":"done","completedAt":"2026-10-31T08:00:00Z","durationMinutes":15,"note":"","idempotencyKey":"smoke-task-completion-0001"}],"providers":[{"id":"75000000-0000-4000-8000-000000000001","name":"Plumber","serviceCategory":"plumbing","phone":"","email":"","notes":"","createdAt":"2026-10-31T00:00:00Z"}],"maintenance":[{"id":"76000000-0000-4000-8000-000000000001","propertyId":"30000000-0000-4000-8000-000000000001","roomId":"40000000-0000-4000-8000-000000000001","title":"Leak check","description":"","status":"reported","priority":"normal","reportedAt":"2026-10-31T00:00:00Z","costAmount":null,"currency":"EGP","notes":"","completionCount":0,"createdAt":"2026-10-31T00:00:00Z"}],"purchaseRequests":[],"purchaseItems":[],"bills":[],"events":[]}'::jsonb
  );
  raise exception 'HOME_VIEW_ROLE_WRITE_SHOULD_FAIL';
exception when insufficient_privilege then
  null;
end $$;
-- A view-only member can load the authorized workspace, but cannot see another workspace's rows.
select set_config('test.access_level','view',false);
do $$
begin
  if jsonb_array_length(public.home_load_snapshot('10000000-0000-4000-8000-000000000001')->'properties') <> 1 then
    raise exception 'HOME_VIEW_READ_FAILED';
  end if;
end $$;
select set_config('test.allowed_workspace_id','90000000-0000-4000-8000-000000000001',false);
do $$
begin
  if (select count(*) from public.home_properties) <> 0 then
    raise exception 'HOME_RLS_WORKSPACE_ISOLATION_FAILED';
  end if;
end $$;
reset role;
