-- Home OS: relational operations persistence and durable bill occurrences.
-- Additive, review and validate in an isolated Supabase project before deployment.
begin;

alter table public.home_tasks add column if not exists reminder_at timestamptz;
alter table public.home_maintenance_records add column if not exists completion_count integer not null default 0 check (completion_count >= 0);

create table if not exists public.home_bills (
  id uuid primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null check (length(btrim(title)) between 1 and 180),
  amount numeric(14,2) not null check (amount >= 0),
  currency text not null default 'EGP' check (currency ~ '^[A-Z]{3}$'),
  frequency text not null check (frequency in ('daily','weekly','monthly','quarterly','yearly','once')),
  due_date date not null,
  status text not null default 'due' check (status in ('due','paid','paused','cancelled')),
  category text not null default '',
  notes text not null default '',
  last_paid_at timestamptz,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  unique (workspace_id, id)
);
create index if not exists home_bills_due_idx on public.home_bills(workspace_id, due_date, status);

create table if not exists public.home_bill_occurrences (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  bill_id uuid not null,
  due_date date not null,
  amount numeric(14,2) not null check (amount >= 0),
  currency text not null default 'EGP' check (currency ~ '^[A-Z]{3}$'),
  status text not null default 'due' check (status in ('due','paid','skipped','cancelled')),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  unique (workspace_id, bill_id, due_date),
  foreign key (workspace_id, bill_id) references public.home_bills(workspace_id, id) on delete restrict
);
create index if not exists home_bill_occurrences_due_idx
  on public.home_bill_occurrences(workspace_id, due_date, status);

create table if not exists public.home_bill_payments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  bill_id uuid not null,
  occurrence_id uuid,
  paid_at timestamptz not null default now(),
  due_date date not null,
  amount numeric(14,2) not null check (amount >= 0),
  currency text not null default 'EGP' check (currency ~ '^[A-Z]{3}$'),
  idempotency_key text not null check (length(idempotency_key) between 8 and 200),
  note text not null default '',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (workspace_id, id),
  unique (workspace_id, idempotency_key),
  foreign key (workspace_id, bill_id) references public.home_bills(workspace_id, id) on delete restrict,
  foreign key (workspace_id, occurrence_id) references public.home_bill_occurrences(workspace_id, id) on delete restrict
);
create index if not exists home_bill_payments_history_idx
  on public.home_bill_payments(workspace_id, bill_id, paid_at desc);

do $$
declare t text;
begin
  foreach t in array array['home_bills','home_bill_occurrences','home_bill_payments'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_select', t);
    execute format('create policy %I on public.%I for select to authenticated using (public.ws_access_level(workspace_id, ''home'', ''main'') in (''view'',''edit''))', t || '_select', t);
    execute format('drop policy if exists %I on public.%I', t || '_insert', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (public.ws_access_level(workspace_id, ''home'', ''main'') = ''edit'')', t || '_insert', t);
    execute format('drop policy if exists %I on public.%I', t || '_update', t);
    execute format('create policy %I on public.%I for update to authenticated using (public.ws_access_level(workspace_id, ''home'', ''main'') = ''edit'') with check (public.ws_access_level(workspace_id, ''home'', ''main'') = ''edit'')', t || '_update', t);
  end loop;
end $$;
grant select, insert, update on public.home_bills, public.home_bill_occurrences, public.home_bill_payments to authenticated;
revoke all on public.home_bills, public.home_bill_occurrences, public.home_bill_payments from anon;

create or replace function public.home_operations_load(p_workspace_id uuid)
returns jsonb language plpgsql security invoker set search_path = public
as $$
declare
  v_snapshot jsonb;
  v_result jsonb;
begin
  if auth.uid() is null or public.ws_access_level(p_workspace_id, 'home', 'main') not in ('view','edit') then
    raise exception 'HOME_ACCESS_DENIED' using errcode = '42501';
  end if;
  select data into v_snapshot from public.home_operations_snapshot where workspace_id=p_workspace_id;
  v_snapshot := coalesce(v_snapshot, '{"tasks":[],"completions":[],"providers":[],"maintenance":[],"purchaseRequests":[],"purchaseItems":[],"bills":[],"events":[]}'::jsonb);

  select jsonb_build_object(
    'tasks', case when exists(select 1 from public.home_tasks where workspace_id=p_workspace_id)
      then coalesce((select jsonb_agg(jsonb_build_object(
        'id',id,'title',title,'description',description,'taskType',task_type,'status',status,'priority',priority,
        'propertyId',property_id,'roomId',room_id,'assignedTo',assigned_to,'dueDate',due_date,
        'recurrenceRule',recurrence_rule,'estimatedMinutes',estimated_minutes,'reminderAt',reminder_at,
        'lastCompletedAt',last_completed_at,'nextDueAt',next_due_at,'deletedAt',deleted_at,
        'createdAt',created_at,'updatedAt',updated_at
      ) order by due_date nulls last, created_at desc) from public.home_tasks where workspace_id=p_workspace_id),'[]'::jsonb)
      else coalesce(v_snapshot->'tasks','[]'::jsonb) end,
    'completions', case when exists(select 1 from public.home_task_completions where workspace_id=p_workspace_id)
      then coalesce((select jsonb_agg(jsonb_build_object(
        'id',id,'taskId',task_id,'outcome',outcome,'completedAt',completed_at,'durationMinutes',duration_minutes,
        'note',note,'idempotencyKey',idempotency_key
      ) order by completed_at desc) from public.home_task_completions where workspace_id=p_workspace_id),'[]'::jsonb)
      else coalesce(v_snapshot->'completions','[]'::jsonb) end,
    'providers', case when exists(select 1 from public.home_service_providers where workspace_id=p_workspace_id)
      then coalesce((select jsonb_agg(jsonb_build_object(
        'id',id,'name',name,'serviceCategory',service_category,'phone',phone,'email',email,'notes',notes,
        'rating',rating,'archivedAt',archived_at,'createdAt',created_at,'updatedAt',updated_at
      ) order by created_at desc) from public.home_service_providers where workspace_id=p_workspace_id),'[]'::jsonb)
      else coalesce(v_snapshot->'providers','[]'::jsonb) end,
    'maintenance', case when exists(select 1 from public.home_maintenance_records where workspace_id=p_workspace_id)
      then coalesce((select jsonb_agg(jsonb_build_object(
        'id',id,'propertyId',property_id,'roomId',room_id,'inventoryItemId',inventory_item_id,'providerId',provider_id,
        'title',title,'description',description,'status',status,'priority',priority,'reportedAt',reported_at,
        'scheduledAt',scheduled_at,'completedAt',completed_at,'nextMaintenanceDate',next_maintenance_date,
        'costAmount',cost_amount,'currency',currency,'financeTransactionId',finance_transaction_id,'notes',notes,
        'completionCount',completion_count,'createdAt',created_at,'updatedAt',updated_at
      ) order by reported_at desc) from public.home_maintenance_records where workspace_id=p_workspace_id),'[]'::jsonb)
      else coalesce(v_snapshot->'maintenance','[]'::jsonb) end,
    'purchaseRequests', case when exists(select 1 from public.home_purchase_requests where workspace_id=p_workspace_id)
      then coalesce((select jsonb_agg(jsonb_build_object(
        'id',id,'propertyId',property_id,'requestedBy',requested_by,'title',title,'status',status,'priority',priority,
        'neededBy',needed_by,'budgetAmount',budget_amount,'currency',currency,'notes',notes,'approvedBy',approved_by,
        'approvedAt',approved_at,'orderedAt',ordered_at,'receivedAt',received_at,'createdAt',created_at,'updatedAt',updated_at
      ) order by created_at desc) from public.home_purchase_requests where workspace_id=p_workspace_id),'[]'::jsonb)
      else coalesce(v_snapshot->'purchaseRequests','[]'::jsonb) end,
    'purchaseItems', case when exists(select 1 from public.home_purchase_request_items where workspace_id=p_workspace_id)
      then coalesce((select jsonb_agg(jsonb_build_object(
        'id',id,'requestId',request_id,'inventoryItemId',inventory_item_id,'name',name,'quantity',quantity,
        'estimatedUnitPrice',estimated_unit_price,'actualUnitPrice',actual_unit_price,'receivedQuantity',received_quantity,
        'notes',notes,'createdAt',created_at,'updatedAt',updated_at
      ) order by created_at) from public.home_purchase_request_items where workspace_id=p_workspace_id),'[]'::jsonb)
      else coalesce(v_snapshot->'purchaseItems','[]'::jsonb) end,
    'bills', case when exists(select 1 from public.home_bills where workspace_id=p_workspace_id)
      then coalesce((select jsonb_agg(jsonb_build_object(
        'id',id,'title',title,'amount',amount,'currency',currency,'frequency',frequency,'dueDate',due_date,
        'status',status,'category',category,'notes',notes,'lastPaidAt',last_paid_at,'createdAt',created_at,'updatedAt',updated_at
      ) order by due_date) from public.home_bills where workspace_id=p_workspace_id),'[]'::jsonb)
      else coalesce(v_snapshot->'bills','[]'::jsonb) end,
    'events',coalesce(v_snapshot->'events','[]'::jsonb),
    'schemaVersion',2
  ) into v_result;
  return v_result;
end $$;

drop function if exists public.home_operations_save(uuid,jsonb);
create function public.home_operations_save(p_workspace_id uuid, p_data jsonb)
returns timestamptz language plpgsql security definer set search_path = public
as $$
declare
  v_row jsonb;
  v_event jsonb;
  v_bill_id uuid;
  v_payment_key text;
  v_event_type text;
  v_event_time timestamptz;
  v_event_id uuid;
  v_event_payload jsonb;
  v_now timestamptz := now();
begin
  if auth.uid() is null or public.ws_access_level(p_workspace_id, 'home', 'main') <> 'edit' then
    raise exception 'HOME_ACCESS_DENIED' using errcode = '42501';
  end if;
  if jsonb_typeof(p_data) <> 'object' then raise exception 'HOME_INVALID_OPERATIONS_SNAPSHOT'; end if;
  if jsonb_typeof(p_data->'tasks') is distinct from 'array'
    or jsonb_typeof(p_data->'completions') is distinct from 'array'
    or jsonb_typeof(p_data->'providers') is distinct from 'array'
    or jsonb_typeof(p_data->'maintenance') is distinct from 'array'
    or jsonb_typeof(p_data->'purchaseRequests') is distinct from 'array'
    or jsonb_typeof(p_data->'purchaseItems') is distinct from 'array'
    or jsonb_typeof(p_data->'bills') is distinct from 'array'
    or jsonb_typeof(p_data->'events') is distinct from 'array'
  then raise exception 'HOME_INVALID_OPERATIONS_COLLECTIONS'; end if;

  -- Persist relational records first; all subsequent writes are in this same transaction.
  for v_row in select value from jsonb_array_elements(p_data->'tasks') value loop
    insert into public.home_tasks(
      id,workspace_id,property_id,room_id,title,description,task_type,status,priority,assigned_to,due_date,
      recurrence_rule,estimated_minutes,reminder_at,last_completed_at,next_due_at,deleted_at,created_at,updated_at,created_by,updated_by
    ) values (
      (v_row->>'id')::uuid,p_workspace_id,nullif(v_row->>'propertyId','')::uuid,nullif(v_row->>'roomId','')::uuid,
      coalesce(v_row->>'title','مهمة منزلية'),coalesce(v_row->>'description',''),coalesce(v_row->>'taskType','routine'),
      coalesce(v_row->>'status','active'),coalesce(v_row->>'priority','normal'),nullif(v_row->>'assignedTo','')::uuid,
      nullif(v_row->>'dueDate','')::date,coalesce(v_row->'recurrenceRule','{"frequency":"none"}'::jsonb),
      nullif(v_row->>'estimatedMinutes','')::integer,nullif(v_row->>'reminderAt','')::timestamptz,
      nullif(v_row->>'lastCompletedAt','')::timestamptz,nullif(v_row->>'nextDueAt','')::timestamptz,
      nullif(v_row->>'deletedAt','')::timestamptz,coalesce(nullif(v_row->>'createdAt','')::timestamptz,v_now),v_now,auth.uid(),auth.uid()
    ) on conflict(id) do update set
      property_id=excluded.property_id,room_id=excluded.room_id,title=excluded.title,description=excluded.description,
      task_type=excluded.task_type,status=excluded.status,priority=excluded.priority,assigned_to=excluded.assigned_to,
      due_date=excluded.due_date,recurrence_rule=excluded.recurrence_rule,estimated_minutes=excluded.estimated_minutes,
      reminder_at=excluded.reminder_at,last_completed_at=excluded.last_completed_at,next_due_at=excluded.next_due_at,
      deleted_at=excluded.deleted_at,updated_at=v_now,updated_by=auth.uid()
    where public.home_tasks.workspace_id=excluded.workspace_id;
  end loop;

  for v_row in select value from jsonb_array_elements(p_data->'completions') value loop
    insert into public.home_task_completions(
      id,workspace_id,task_id,completed_by,outcome,completed_at,duration_minutes,note,idempotency_key
    ) values (
      coalesce(nullif(v_row->>'id','')::uuid,gen_random_uuid()),p_workspace_id,(v_row->>'taskId')::uuid,auth.uid(),
      coalesce(v_row->>'outcome','done'),coalesce(nullif(v_row->>'completedAt','')::timestamptz,v_now),
      nullif(v_row->>'durationMinutes','')::integer,coalesce(v_row->>'note',''),
      coalesce(nullif(v_row->>'idempotencyKey',''),'legacy-completion:'||md5(v_row::text))
    ) on conflict(workspace_id,idempotency_key) do nothing;
  end loop;

  for v_row in select value from jsonb_array_elements(p_data->'providers') value loop
    insert into public.home_service_providers(
      id,workspace_id,name,service_category,phone,email,notes,rating,archived_at,created_at,updated_at
    ) values (
      (v_row->>'id')::uuid,p_workspace_id,coalesce(v_row->>'name','مقدم خدمة'),coalesce(v_row->>'serviceCategory',''),
      coalesce(v_row->>'phone',''),coalesce(v_row->>'email',''),coalesce(v_row->>'notes',''),
      nullif(v_row->>'rating','')::smallint,nullif(v_row->>'archivedAt','')::timestamptz,
      coalesce(nullif(v_row->>'createdAt','')::timestamptz,v_now),v_now
    ) on conflict(id) do update set name=excluded.name,service_category=excluded.service_category,
      phone=excluded.phone,email=excluded.email,notes=excluded.notes,rating=excluded.rating,
      archived_at=excluded.archived_at,updated_at=v_now
    where public.home_service_providers.workspace_id=excluded.workspace_id;
  end loop;

  for v_row in select value from jsonb_array_elements(p_data->'maintenance') value loop
    insert into public.home_maintenance_records(
      id,workspace_id,property_id,room_id,inventory_item_id,provider_id,title,description,status,priority,
      reported_at,scheduled_at,completed_at,next_maintenance_date,cost_amount,currency,finance_transaction_id,
      notes,completion_count,created_by,updated_by,created_at,updated_at
    ) values (
      (v_row->>'id')::uuid,p_workspace_id,(v_row->>'propertyId')::uuid,nullif(v_row->>'roomId','')::uuid,
      nullif(v_row->>'inventoryItemId','')::uuid,nullif(v_row->>'providerId','')::uuid,coalesce(v_row->>'title','صيانة'),
      coalesce(v_row->>'description',''),coalesce(v_row->>'status','reported'),coalesce(v_row->>'priority','normal'),
      coalesce(nullif(v_row->>'reportedAt','')::timestamptz,v_now),nullif(v_row->>'scheduledAt','')::timestamptz,
      nullif(v_row->>'completedAt','')::timestamptz,nullif(v_row->>'nextMaintenanceDate','')::date,
      nullif(v_row->>'costAmount','')::numeric,coalesce(v_row->>'currency','EGP'),
      nullif(v_row->>'financeTransactionId','')::uuid,coalesce(v_row->>'notes',''),
      coalesce(nullif(v_row->>'completionCount','')::integer,0),auth.uid(),auth.uid(),
      coalesce(nullif(v_row->>'createdAt','')::timestamptz,v_now),v_now
    ) on conflict(id) do update set property_id=excluded.property_id,room_id=excluded.room_id,
      inventory_item_id=excluded.inventory_item_id,provider_id=excluded.provider_id,title=excluded.title,
      description=excluded.description,status=excluded.status,priority=excluded.priority,reported_at=excluded.reported_at,
      scheduled_at=excluded.scheduled_at,completed_at=excluded.completed_at,next_maintenance_date=excluded.next_maintenance_date,
      cost_amount=excluded.cost_amount,currency=excluded.currency,finance_transaction_id=excluded.finance_transaction_id,
      notes=excluded.notes,completion_count=excluded.completion_count,updated_by=auth.uid(),updated_at=v_now
    where public.home_maintenance_records.workspace_id=excluded.workspace_id;
  end loop;

  for v_row in select value from jsonb_array_elements(p_data->'purchaseRequests') value loop
    insert into public.home_purchase_requests(
      id,workspace_id,property_id,requested_by,title,status,priority,needed_by,budget_amount,currency,notes,
      approved_by,approved_at,ordered_at,received_at,created_at,updated_at
    ) values (
      (v_row->>'id')::uuid,p_workspace_id,(v_row->>'propertyId')::uuid,auth.uid(),coalesce(v_row->>'title','طلب شراء'),
      coalesce(v_row->>'status','needed'),coalesce(v_row->>'priority','normal'),nullif(v_row->>'neededBy','')::date,
      nullif(v_row->>'budgetAmount','')::numeric,coalesce(v_row->>'currency','EGP'),coalesce(v_row->>'notes',''),
      nullif(v_row->>'approvedBy','')::uuid,nullif(v_row->>'approvedAt','')::timestamptz,
      nullif(v_row->>'orderedAt','')::timestamptz,nullif(v_row->>'receivedAt','')::timestamptz,
      coalesce(nullif(v_row->>'createdAt','')::timestamptz,v_now),v_now
    ) on conflict(id) do update set property_id=excluded.property_id,title=excluded.title,
      status=case
        when public.home_purchase_requests.status='received' then 'received'
        when public.home_purchase_requests.status='partially_received' and excluded.status<>'cancelled' then 'partially_received'
        else excluded.status
      end,
      priority=excluded.priority,needed_by=excluded.needed_by,budget_amount=excluded.budget_amount,
      currency=excluded.currency,notes=excluded.notes,approved_by=excluded.approved_by,approved_at=excluded.approved_at,
      ordered_at=excluded.ordered_at,received_at=coalesce(public.home_purchase_requests.received_at,excluded.received_at),
      updated_at=v_now
    where public.home_purchase_requests.workspace_id=excluded.workspace_id;
  end loop;

  for v_row in select value from jsonb_array_elements(p_data->'purchaseItems') value loop
    insert into public.home_purchase_request_items(
      id,workspace_id,request_id,inventory_item_id,name,quantity,estimated_unit_price,actual_unit_price,received_quantity,notes,created_at,updated_at
    ) values (
      (v_row->>'id')::uuid,p_workspace_id,(v_row->>'requestId')::uuid,nullif(v_row->>'inventoryItemId','')::uuid,
      coalesce(v_row->>'name','صنف'),(v_row->>'quantity')::numeric,nullif(v_row->>'estimatedUnitPrice','')::numeric,
      nullif(v_row->>'actualUnitPrice','')::numeric,coalesce(nullif(v_row->>'receivedQuantity','')::numeric,0),
      coalesce(v_row->>'notes',''),coalesce(nullif(v_row->>'createdAt','')::timestamptz,v_now),v_now
    ) on conflict(id) do update set request_id=excluded.request_id,name=excluded.name,
      quantity=greatest(excluded.quantity,public.home_purchase_request_items.received_quantity),
      estimated_unit_price=excluded.estimated_unit_price,
      actual_unit_price=coalesce(public.home_purchase_request_items.actual_unit_price,excluded.actual_unit_price),
      inventory_item_id=coalesce(public.home_purchase_request_items.inventory_item_id,excluded.inventory_item_id),
      received_quantity=greatest(public.home_purchase_request_items.received_quantity,excluded.received_quantity),
      notes=excluded.notes,updated_at=v_now
    where public.home_purchase_request_items.workspace_id=excluded.workspace_id;
  end loop;

  -- Deleting a line with receipt history is rejected by the FK, preserving the audit trail.
  delete from public.home_purchase_request_items i
   where i.workspace_id=p_workspace_id
     and i.request_id in (select (value->>'id')::uuid from jsonb_array_elements(p_data->'purchaseRequests') value)
     and not exists (select 1 from jsonb_array_elements(p_data->'purchaseItems') x where (x->>'id')::uuid=i.id);

  for v_row in select value from jsonb_array_elements(p_data->'bills') value loop
    insert into public.home_bills(
      id,workspace_id,title,amount,currency,frequency,due_date,status,category,notes,last_paid_at,created_at,updated_at,created_by,updated_by
    ) values (
      (v_row->>'id')::uuid,p_workspace_id,coalesce(v_row->>'title','فاتورة'),(v_row->>'amount')::numeric,
      coalesce(v_row->>'currency','EGP'),coalesce(v_row->>'frequency','monthly'),(v_row->>'dueDate')::date,
      coalesce(v_row->>'status','due'),coalesce(v_row->>'category',''),coalesce(v_row->>'notes',''),
      nullif(v_row->>'lastPaidAt','')::timestamptz,coalesce(nullif(v_row->>'createdAt','')::timestamptz,v_now),
      v_now,auth.uid(),auth.uid()
    ) on conflict(id) do update set title=excluded.title,amount=excluded.amount,currency=excluded.currency,
      frequency=excluded.frequency,due_date=excluded.due_date,status=excluded.status,category=excluded.category,
      notes=excluded.notes,last_paid_at=coalesce(excluded.last_paid_at,public.home_bills.last_paid_at),
      version=public.home_bills.version+1,updated_at=v_now,updated_by=auth.uid()
    where public.home_bills.workspace_id=excluded.workspace_id;

    insert into public.home_bill_occurrences(workspace_id,bill_id,due_date,amount,currency,status)
    values(p_workspace_id,(v_row->>'id')::uuid,(v_row->>'dueDate')::date,(v_row->>'amount')::numeric,
      coalesce(v_row->>'currency','EGP'),case when coalesce(v_row->>'status','due')='paid' then 'paid' else 'due' end)
    on conflict(workspace_id,bill_id,due_date) do update set amount=excluded.amount,currency=excluded.currency,
      status=case when public.home_bill_occurrences.status='paid' then 'paid' else excluded.status end,
      updated_at=v_now;
  end loop;

  -- Durable Finance/Today handoff. Events are inserted idempotently in the same transaction as domain writes.
  for v_event in select value from jsonb_array_elements(p_data->'events') value loop
    v_event_type := coalesce(v_event->>'type','home.event');
    v_event_time := coalesce(nullif(v_event->>'occurredAt','')::timestamptz,v_now);
    v_event_payload := coalesce(v_event->'payload','{}'::jsonb);
    v_payment_key := coalesce(nullif(v_event_payload->>'sourcePaymentId',''),
      'home-event:'||md5(v_event_type||':'||coalesce(v_event->>'entityId','')||':'||v_event_time::text||':'||v_event::text));
    v_event_id := case when coalesce(v_event->>'entityId','') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then (v_event->>'entityId')::uuid else gen_random_uuid() end;

    insert into public.home_outbox_events(workspace_id,aggregate_type,aggregate_id,event_type,payload,idempotency_key,created_at)
    values(p_workspace_id,coalesce(v_event->>'entityType','home'),v_event_id,v_event_type,v_event_payload,v_payment_key,v_event_time)
    on conflict(workspace_id,idempotency_key) do nothing;

    if v_event_type='home.bill.payment.recorded' and nullif(v_event_payload->>'billId','') is not null then
      v_bill_id := (v_event_payload->>'billId')::uuid;
      v_payment_key := coalesce(nullif(v_event_payload->>'sourcePaymentId',''),'home-bill-payment:'||md5(v_event::text));
      insert into public.home_bill_payments(
        workspace_id,bill_id,paid_at,due_date,amount,currency,idempotency_key,note,created_by
      ) values (
        p_workspace_id,v_bill_id,v_event_time,(v_event_payload->>'paymentDate')::date,
        (v_event_payload->>'amount')::numeric,coalesce(v_event_payload->>'currency','EGP'),
        v_payment_key,'',auth.uid()
      ) on conflict(workspace_id,idempotency_key) do nothing;

      update public.home_bill_occurrences set status='paid',paid_at=v_event_time,updated_at=v_now
        where workspace_id=p_workspace_id and bill_id=v_bill_id and due_date=(v_event_payload->>'paymentDate')::date;
    end if;
  end loop;

  insert into public.home_operations_snapshot(workspace_id,data,version,updated_at,updated_by)
  values(p_workspace_id,p_data,1,v_now,auth.uid())
  on conflict(workspace_id) do update set data=excluded.data,
    version=public.home_operations_snapshot.version+1,updated_at=v_now,updated_by=auth.uid();

  insert into public.home_audit_log(workspace_id,actor_id,action,entity_type,metadata)
  values(p_workspace_id,auth.uid(),'operations_relational_saved','home_operations',jsonb_build_object(
    'tasks',jsonb_array_length(p_data->'tasks'),'maintenance',jsonb_array_length(p_data->'maintenance'),
    'purchaseRequests',jsonb_array_length(p_data->'purchaseRequests'),'bills',jsonb_array_length(p_data->'bills')));
  return v_now;
end $$;

revoke all on function public.home_operations_load(uuid) from public, anon;
grant execute on function public.home_operations_load(uuid) to authenticated;
revoke all on function public.home_operations_save(uuid,jsonb) from public, anon;
grant execute on function public.home_operations_save(uuid,jsonb) to authenticated;

commit;
