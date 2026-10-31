-- Run only against tests/home_os_sql_bootstrap.sql + the three Home OS migrations.
\set ON_ERROR_STOP on
insert into public.workspaces(id) values ('10000000-0000-4000-8000-000000000001');
insert into auth.users(id) values ('20000000-0000-4000-8000-000000000001');
select set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000001',false);
select set_config('test.allowed_workspace_id','10000000-0000-4000-8000-000000000001',false);
select set_config('test.access_level','edit',false);
set role authenticated;

do $
begin
  if has_function_privilege(current_user, 'public.home_save_snapshot(uuid,jsonb)', 'EXECUTE') then
    raise exception 'HOME_LEGACY_SNAPSHOT_WRITE_STILL_GRANTED';
  end if;
  if has_function_privilege(current_user, 'public.home_operations_save(uuid,jsonb)', 'EXECUTE') then
    raise exception 'HOME_LEGACY_OPERATIONS_WRITE_STILL_GRANTED';
  end if;
  if not has_function_privilege(current_user, 'public.home_save_snapshot_v2(uuid,jsonb,integer)', 'EXECUTE') then
    raise exception 'HOME_VERSIONED_SNAPSHOT_WRITE_NOT_GRANTED';
  end if;
  if not has_function_privilege(current_user, 'public.home_operations_save_v2(uuid,jsonb,integer)', 'EXECUTE') then
    raise exception 'HOME_VERSIONED_OPERATIONS_WRITE_NOT_GRANTED';
  end if;
end $;

select public.home_save_snapshot_v2(
  '10000000-0000-4000-8000-000000000001',
  '{
    "schemaVersion":1,
    "properties":[{"id":"30000000-0000-4000-8000-000000000001","name":"Test home","address":"","notes":"","isDefault":true,"createdAt":"2026-10-31T00:00:00Z"}],
    "rooms":[{"id":"40000000-0000-4000-8000-000000000001","propertyId":"30000000-0000-4000-8000-000000000001","name":"General","type":"general","floor":"","notes":"","createdAt":"2026-10-31T00:00:00Z"}],
    "items":[{"id":"50000000-0000-4000-8000-000000000001","propertyId":"30000000-0000-4000-8000-000000000001","roomId":"40000000-0000-4000-8000-000000000001","name":"Test item","type":"misc","condition":"good","unit":"piece","quantity":2,"minimumQuantity":1,"unitPrice":12,"currency":"EGP","createdAt":"2026-10-31T00:00:00Z"}],
    "movements":[{"id":"60000000-0000-4000-8000-000000000001","itemId":"50000000-0000-4000-8000-000000000001","type":"receive","quantity":2,"occurredAt":"2026-10-31T00:00:00Z","note":"opening","idempotencyKey":"smoke-opening-item-0001"}],
    "settings":{"currency":"EGP","timezone":"Africa/Cairo","preferences":{}}
  }'::jsonb
, (public.home_load_snapshot_v2('10000000-0000-4000-8000-000000000001'::uuid)->>'_version')::integer);
-- Replaying the same opening movement must not create a second inventory movement.
select public.home_save_snapshot_v2(
  '10000000-0000-4000-8000-000000000001',
  '{
    "schemaVersion":1,
    "properties":[{"id":"30000000-0000-4000-8000-000000000001","name":"Test home","isDefault":true}],
    "rooms":[{"id":"40000000-0000-4000-8000-000000000001","propertyId":"30000000-0000-4000-8000-000000000001","name":"General","type":"general"}],
    "items":[{"id":"50000000-0000-4000-8000-000000000001","propertyId":"30000000-0000-4000-8000-000000000001","roomId":"40000000-0000-4000-8000-000000000001","name":"Test item","type":"misc","condition":"good","unit":"piece","quantity":2,"minimumQuantity":1,"currency":"EGP"}],
    "movements":[{"id":"60000000-0000-4000-8000-000000000001","itemId":"50000000-0000-4000-8000-000000000001","type":"receive","quantity":2,"idempotencyKey":"smoke-opening-item-0001"}],
    "settings":{"currency":"EGP","timezone":"Africa/Cairo","preferences":{}}
  }'::jsonb
, (public.home_load_snapshot_v2('10000000-0000-4000-8000-000000000001'::uuid)->>'_version')::integer);
do $$
begin
  if (select count(*) from public.home_inventory_movements where workspace_id='10000000-0000-4000-8000-000000000001') <> 1 then
    raise exception 'HOME_MOVEMENT_IDEMPOTENCY_FAILED';
  end if;
  if jsonb_array_length(public.home_load_snapshot('10000000-0000-4000-8000-000000000001')->'properties') <> 1 then
    raise exception 'HOME_SNAPSHOT_LOAD_FAILED';
  end if;
end $$;

-- Inventory commands update balance and ledger in one transaction; retry is idempotent.
select set_config('test.home_version_before_movement',(public.home_load_snapshot_v2('10000000-0000-4000-8000-000000000001')->>'_version'),false);
select public.home_record_inventory_movement(
  '10000000-0000-4000-8000-000000000001',
  '50000000-0000-4000-8000-000000000001',
  'consume', 1, 'smoke-inventory-consume-0001', 'consume smoke', null, '2026-10-31T01:00:00Z'
);
select public.home_record_inventory_movement(
  '10000000-0000-4000-8000-000000000001',
  '50000000-0000-4000-8000-000000000001',
  'consume', 1, 'smoke-inventory-consume-0001', 'consume smoke', null, '2026-10-31T01:00:00Z'
);
do $$
begin
  if (select quantity from public.home_inventory_items
      where workspace_id='10000000-0000-4000-8000-000000000001'
        and id='50000000-0000-4000-8000-000000000001') <> 1 then
    raise exception 'HOME_ATOMIC_MOVEMENT_BALANCE_FAILED';
  end if;
  if (select count(*) from public.home_inventory_movements
      where workspace_id='10000000-0000-4000-8000-000000000001'
        and idempotency_key='smoke-inventory-consume-0001') <> 1 then
    raise exception 'HOME_ATOMIC_MOVEMENT_IDEMPOTENCY_FAILED';
  end if;
  begin
    perform public.home_record_inventory_movement(
      '10000000-0000-4000-8000-000000000001',
      '50000000-0000-4000-8000-000000000001',
      'consume', 5, 'smoke-inventory-overdraw-0001', 'must fail', null, '2026-10-31T01:01:00Z'
    );
    raise exception 'HOME_STOCK_OVERDRAW_NOT_REJECTED';
  exception when check_violation then
    null;
  end;
  begin
    update public.home_inventory_items set quantity=99
      where workspace_id='10000000-0000-4000-8000-000000000001'
        and id='50000000-0000-4000-8000-000000000001';
    raise exception 'HOME_DIRECT_BALANCE_WRITE_NOT_REJECTED';
  exception when check_violation then
    null;
  end;
  begin
    perform public.home_save_snapshot_v2(
      '10000000-0000-4000-8000-000000000001',
      public.home_load_snapshot_v2('10000000-0000-4000-8000-000000000001'),
      current_setting('test.home_version_before_movement')::integer
    );
    raise exception 'HOME_STOCK_CHANGE_DID_NOT_INVALIDATE_SNAPSHOT';
  exception when serialization_failure then
    null;
  end;
end $$;

-- Home inventory/property/room snapshot writes also reject stale versions.
do $$
declare
  v_snapshot jsonb;
  v_version integer;
begin
  v_snapshot := public.home_load_snapshot_v2('10000000-0000-4000-8000-000000000001');
  v_version := coalesce((v_snapshot->>'_version')::integer,0);
  perform public.home_save_snapshot_v2(
    '10000000-0000-4000-8000-000000000001', v_snapshot, v_version
  );
  begin
    perform public.home_save_snapshot_v2(
      '10000000-0000-4000-8000-000000000001', v_snapshot, v_version
    );
    raise exception 'HOME_SNAPSHOT_CONFLICT_NOT_RAISED';
  exception when serialization_failure then
    null;
  end;
end $$;

select public.home_operations_save_v2(
  '10000000-0000-4000-8000-000000000001',
  '{"tasks":[],"completions":[],"providers":[],"maintenance":[],"purchaseRequests":[],"purchaseItems":[],"bills":[],"events":[]}'::jsonb
, (public.home_operations_load_v2('10000000-0000-4000-8000-000000000001'::uuid)->>'_version')::integer);
do $$
begin
  begin
    perform public.home_save_snapshot('10000000-0000-4000-8000-000000000001','{}'::jsonb);
    raise exception 'HOME_UNVERSIONED_SNAPSHOT_WRITE_ALLOWED';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.home_operations_save('10000000-0000-4000-8000-000000000001','{"tasks":[],"completions":[],"providers":[],"maintenance":[],"purchaseRequests":[],"purchaseItems":[],"bills":[],"events":[]}'::jsonb);
    raise exception 'HOME_UNVERSIONED_OPERATIONS_WRITE_ALLOWED';
  exception when insufficient_privilege then null;
  end;
end $$;

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
select public.home_operations_save_v2(
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
, (public.home_operations_load_v2('10000000-0000-4000-8000-000000000001'::uuid)->>'_version')::integer);
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
select public.home_operations_save_v2(
  '10000000-0000-4000-8000-000000000001',
  '{
    "tasks":[{
      "id":"73000000-0000-4000-8000-000000000001","title":"Relational task","description":"",
      "taskType":"routine","status":"active","priority":"normal",
      "propertyId":"30000000-0000-4000-8000-000000000001","roomId":"40000000-0000-4000-8000-000000000001",
      "dueDate":"2026-10-31","recurrenceRule":{"frequency":"daily"},"estimatedMinutes":15,
      "reminderAt":"2026-10-31T08:00:00Z","createdAt":"2026-10-31T00:00:00Z"
    }],
    "completions":[{
      "id":"74000000-0000-4000-8000-000000000001","taskId":"73000000-0000-4000-8000-000000000001",
      "outcome":"done","completedAt":"2026-10-31T08:00:00Z","durationMinutes":15,
      "note":"","idempotencyKey":"smoke-task-completion-0001"
    }],
    "providers":[{
      "id":"75000000-0000-4000-8000-000000000001","name":"Plumber",
      "serviceCategory":"plumbing","phone":"","email":"","notes":"","createdAt":"2026-10-31T00:00:00Z"
    }],
    "maintenance":[{
      "id":"76000000-0000-4000-8000-000000000001",
      "propertyId":"30000000-0000-4000-8000-000000000001",
      "roomId":"40000000-0000-4000-8000-000000000001","title":"Leak check","description":"",
      "status":"reported","priority":"normal","reportedAt":"2026-10-31T00:00:00Z",
      "costAmount":null,"currency":"EGP","notes":"","completionCount":0,"createdAt":"2026-10-31T00:00:00Z"
    }],
    "purchaseRequests":[],"purchaseItems":[],
    "bills":[{
      "id":"72000000-0000-4000-8000-000000000001",
      "title":"Electricity","amount":100,"currency":"EGP","frequency":"monthly",
      "dueDate":"2026-10-01","status":"due","category":"Utilities","notes":"",
      "createdAt":"2026-09-01T00:00:00Z"
    }],
    "events":[{"type":"home.task.completed","ownerSystem":"home","entityType":"home_task","entityId":"73000000-0000-4000-8000-000000000001","occurredAt":"2026-10-31T08:00:00Z","payload":{"taskTitle":"Relational task","outcome":"done","assignedTo":null,"propertyId":"30000000-0000-4000-8000-000000000001","roomId":"40000000-0000-4000-8000-000000000001","nextDueAt":null}}]
  }'::jsonb
, (public.home_operations_load_v2('10000000-0000-4000-8000-000000000001'::uuid)->>'_version')::integer);
select public.home_operations_save_v2(
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
, (public.home_operations_load_v2('10000000-0000-4000-8000-000000000001'::uuid)->>'_version')::integer);
-- Re-saving the same event must not create a duplicate payment or outbox row.
select public.home_operations_save_v2(
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
, (public.home_operations_load_v2('10000000-0000-4000-8000-000000000001'::uuid)->>'_version')::integer);
do $$
declare v_loaded jsonb;
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
  v_loaded := public.home_operations_load('10000000-0000-4000-8000-000000000001');
  if jsonb_array_length(v_loaded->'tasks') <> 1
    or v_loaded->'tasks'->0->>'id' <> '73000000-0000-4000-8000-000000000001' then
    raise exception 'HOME_RELATIONAL_TASK_LOAD_FAILED';
  end if;
  if jsonb_array_length(v_loaded->'completions') <> 1 then
    raise exception 'HOME_RELATIONAL_COMPLETION_LOAD_FAILED';
  end if;
  if jsonb_array_length(v_loaded->'providers') <> 1 then
    raise exception 'HOME_RELATIONAL_PROVIDER_LOAD_FAILED';
  end if;
  if jsonb_array_length(v_loaded->'maintenance') <> 1 then
    raise exception 'HOME_RELATIONAL_MAINTENANCE_LOAD_FAILED';
  end if;
  if jsonb_array_length(v_loaded->'bills') <> 1
    or v_loaded->'bills'->0->>'dueDate' <> '2026-11-01' then
    raise exception 'HOME_RELATIONAL_BILL_LOAD_FAILED';
  end if;
  if jsonb_array_length(v_loaded->'billPayments') <> 1 then
    raise exception 'HOME_RELATIONAL_BILL_PAYMENT_HISTORY_LOAD_FAILED';
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

do $$
declare
  v_events jsonb;
  v_today_events jsonb;
  v_source_payment_id text;
begin
  v_events := public.home_finance_outbox_load('10000000-0000-4000-8000-000000000001');
  if jsonb_array_length(v_events) < 3 then
    raise exception 'HOME_FINANCE_OUTBOX_READER_MISSING_EVENTS';
  end if;
  select e->'payload'->>'sourcePaymentId' into v_source_payment_id
    from jsonb_array_elements(v_events) e
    where e->>'type'='home.purchase.receipt.recorded'
      and e->'payload'->>'sourcePaymentId' is not null
      and e->'payload'->>'amount' is not null
    limit 1;
  if v_source_payment_id is null then raise exception 'HOME_FINANCE_OUTBOX_PURCHASE_PAYLOAD_INVALID'; end if;

  v_today_events := public.home_today_outbox_load('10000000-0000-4000-8000-000000000001');
  if not exists (
    select 1 from jsonb_array_elements(v_today_events) e
    where e->>'type'='home.task.completed' and e->'payload'->>'taskTitle'='Relational task'
  ) then
    raise exception 'HOME_TODAY_OUTBOX_TASK_EVENT_MISSING';
  end if;

  perform public.home_finance_outbox_ack('10000000-0000-4000-8000-000000000001',v_source_payment_id);
  if (public.home_finance_outbox_ack('10000000-0000-4000-8000-000000000001',v_source_payment_id)->>'acknowledged')::integer <> 0 then
    raise exception 'HOME_FINANCE_OUTBOX_ACK_NOT_IDEMPOTENT';
  end if;
  v_events := public.home_finance_outbox_load('10000000-0000-4000-8000-000000000001');
  if exists (
    select 1 from jsonb_array_elements(v_events) e
    where e->'payload'->>'sourcePaymentId'=v_source_payment_id
  ) then
    raise exception 'HOME_FINANCE_OUTBOX_ACK_FAILED';
  end if;
end $$;

do $$
declare
  v_data jsonb;
  v_version integer;
  v_report jsonb;
begin
  v_report := public.home_operations_reconciliation_report('10000000-0000-4000-8000-000000000001');
  if coalesce((v_report->>'idCountParity')::boolean,true) then
    raise exception 'HOME_RECONCILIATION_FALSE_POSITIVE';
  end if;
  if v_report->'collections'->'tasks'->>'relationalCount' <> '1' then
    raise exception 'HOME_RECONCILIATION_TASK_COUNT_FAILED';
  end if;

  v_data := public.home_operations_load_v2('10000000-0000-4000-8000-000000000001');
  v_version := coalesce((v_data->>'_version')::integer,0);
  perform public.home_operations_save_v2(
    '10000000-0000-4000-8000-000000000001', v_data, v_version
  );
  begin
    perform public.home_operations_save_v2(
      '10000000-0000-4000-8000-000000000001', v_data, v_version
    );
    raise exception 'HOME_CONCURRENCY_CONFLICT_NOT_RAISED';
  exception when serialization_failure then
    null;
  end;

  v_report := public.home_operations_reconciliation_report('10000000-0000-4000-8000-000000000001');
  if not coalesce((v_report->>'idCountParity')::boolean,false) then
    raise exception 'HOME_RECONCILIATION_MATCH_NOT_DETECTED';
  end if;
  if coalesce((v_report->>'readyToRemoveLegacyFallback')::boolean,true) then
    raise exception 'HOME_RECONCILIATION_PREMATURELY_APPROVED';
  end if;
end $$;


select set_config('test.access_level','view',false);
do $$
begin
  perform public.home_operations_save_v2(
    '10000000-0000-4000-8000-000000000001',
    '{"tasks":[{"id":"73000000-0000-4000-8000-000000000001","title":"Relational task","description":"","taskType":"routine","status":"active","priority":"normal","propertyId":"30000000-0000-4000-8000-000000000001","roomId":"40000000-0000-4000-8000-000000000001","dueDate":"2026-10-31","recurrenceRule":{"frequency":"daily"},"estimatedMinutes":15,"reminderAt":"2026-10-31T08:00:00Z","createdAt":"2026-10-31T00:00:00Z"}],"completions":[{"id":"74000000-0000-4000-8000-000000000001","taskId":"73000000-0000-4000-8000-000000000001","outcome":"done","completedAt":"2026-10-31T08:00:00Z","durationMinutes":15,"note":"","idempotencyKey":"smoke-task-completion-0001"}],"providers":[{"id":"75000000-0000-4000-8000-000000000001","name":"Plumber","serviceCategory":"plumbing","phone":"","email":"","notes":"","createdAt":"2026-10-31T00:00:00Z"}],"maintenance":[{"id":"76000000-0000-4000-8000-000000000001","propertyId":"30000000-0000-4000-8000-000000000001","roomId":"40000000-0000-4000-8000-000000000001","title":"Leak check","description":"","status":"reported","priority":"normal","reportedAt":"2026-10-31T00:00:00Z","costAmount":null,"currency":"EGP","notes":"","completionCount":0,"createdAt":"2026-10-31T00:00:00Z"}],"purchaseRequests":[],"purchaseItems":[],"bills":[],"events":[]}'::jsonb
  , (public.home_operations_load_v2('10000000-0000-4000-8000-000000000001'::uuid)->>'_version')::integer);
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
