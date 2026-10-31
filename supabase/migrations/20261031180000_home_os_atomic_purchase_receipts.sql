-- Home OS: atomic purchase receipts, durable finance/Today outbox, and audit trail.
-- Additive migration. Test against an isolated Supabase project only; do not apply to production without review.
begin;

create table if not exists public.home_purchase_receipts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  request_id uuid not null,
  idempotency_key text not null check (length(idempotency_key) between 8 and 200),
  received_by uuid references auth.users(id) on delete set null,
  received_at timestamptz not null default now(),
  response jsonb not null default '{}'::jsonb check (jsonb_typeof(response) = 'object'),
  unique (workspace_id, id),
  unique (workspace_id, idempotency_key),
  foreign key (workspace_id, request_id) references public.home_purchase_requests(workspace_id, id) on delete restrict
);
create index if not exists home_purchase_receipts_request_idx
  on public.home_purchase_receipts(workspace_id, request_id, received_at desc);

create table if not exists public.home_purchase_receipt_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  receipt_id uuid not null,
  request_item_id uuid not null,
  inventory_item_id uuid not null,
  inventory_movement_id uuid not null,
  quantity numeric(14,3) not null check (quantity > 0),
  unit_price numeric(14,2) check (unit_price is null or unit_price >= 0),
  created_at timestamptz not null default now(),
  unique (workspace_id, receipt_id, request_item_id),
  foreign key (workspace_id, receipt_id) references public.home_purchase_receipts(workspace_id, id) on delete restrict,
  foreign key (workspace_id, request_item_id) references public.home_purchase_request_items(workspace_id, id) on delete restrict,
  foreign key (workspace_id, inventory_item_id) references public.home_inventory_items(workspace_id, id) on delete restrict,
  foreign key (workspace_id, inventory_movement_id) references public.home_inventory_movements(workspace_id, id) on delete restrict
);
create index if not exists home_purchase_receipt_items_request_idx
  on public.home_purchase_receipt_items(workspace_id, request_item_id, created_at desc);

create table if not exists public.home_outbox_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  aggregate_type text not null,
  aggregate_id uuid not null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  idempotency_key text not null check (length(idempotency_key) between 8 and 200),
  created_at timestamptz not null default now(),
  available_at timestamptz not null default now(),
  published_at timestamptz,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  last_error text,
  unique (workspace_id, idempotency_key)
);
create index if not exists home_outbox_pending_idx
  on public.home_outbox_events(available_at, created_at) where published_at is null;

alter table public.home_purchase_receipts enable row level security;
alter table public.home_purchase_receipt_items enable row level security;
alter table public.home_outbox_events enable row level security;

drop policy if exists home_purchase_receipts_select on public.home_purchase_receipts;
create policy home_purchase_receipts_select on public.home_purchase_receipts for select to authenticated
  using (public.ws_access_level(workspace_id, 'home', 'main') in ('view','edit'));
drop policy if exists home_purchase_receipt_items_select on public.home_purchase_receipt_items;
create policy home_purchase_receipt_items_select on public.home_purchase_receipt_items for select to authenticated
  using (public.ws_access_level(workspace_id, 'home', 'main') in ('view','edit'));
-- Outbox is intentionally not exposed to authenticated clients; delivery is a server-side concern.
revoke all on public.home_outbox_events from anon, authenticated;
revoke all on public.home_purchase_receipts, public.home_purchase_receipt_items from anon;
grant select on public.home_purchase_receipts, public.home_purchase_receipt_items to authenticated;

create or replace function public.home_record_purchase_receipt(
  p_workspace_id uuid,
  p_request_id uuid,
  p_lines jsonb,
  p_idempotency_key text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.home_purchase_requests%rowtype;
  v_line jsonb;
  v_request_item public.home_purchase_request_items%rowtype;
  v_item public.home_inventory_items%rowtype;
  v_receipt_id uuid;
  v_movement_id uuid;
  v_receipt_item_id uuid;
  v_qty numeric(14,3);
  v_price numeric(14,2);
  v_key text;
  v_linked jsonb := '{}'::jsonb;
  v_response jsonb;
  v_status text;
  v_total numeric;
  v_received numeric;
  v_room_id uuid;
  v_existing public.home_purchase_receipts%rowtype;
  v_snapshot jsonb;
  v_request_json jsonb;
  v_item_json jsonb;
  v_now timestamptz := now();
begin
  if auth.uid() is null or public.ws_access_level(p_workspace_id, 'home', 'main') <> 'edit' then
    raise exception 'HOME_ACCESS_DENIED' using errcode = '42501';
  end if;
  if p_idempotency_key is null or length(p_idempotency_key) < 8 or length(p_idempotency_key) > 200 then
    raise exception 'HOME_RECEIPT_IDEMPOTENCY_KEY_INVALID';
  end if;
  if jsonb_typeof(p_lines) is distinct from 'array' or jsonb_array_length(p_lines) = 0 then
    raise exception 'HOME_RECEIPT_LINES_REQUIRED';
  end if;

  -- Serialize receipts for this purchase, so concurrent requests cannot over-receive.
  select * into v_request
    from public.home_purchase_requests
    where workspace_id = p_workspace_id and id = p_request_id
    for update;

  -- During the transition from the legacy UI snapshot, hydrate a purchase only
  -- when its relational row is missing. This is transactional and keeps older
  -- saved requests receivable without a separate client-side write.
  if not found then
    select data into v_snapshot from public.home_operations_snapshot
      where workspace_id = p_workspace_id;
    select value into v_request_json
      from jsonb_array_elements(coalesce(v_snapshot->'purchaseRequests','[]'::jsonb)) value
      where value->>'id' = p_request_id::text
      limit 1;
    if v_request_json is null then raise exception 'HOME_PURCHASE_REQUEST_NOT_FOUND'; end if;
    insert into public.home_purchase_requests(
      id, workspace_id, property_id, requested_by, title, status, priority, needed_by,
      budget_amount, currency, notes, approved_by, approved_at, ordered_at, received_at, created_at, updated_at
    ) values (
      p_request_id, p_workspace_id, (v_request_json->>'propertyId')::uuid, auth.uid(),
      coalesce(v_request_json->>'title','طلب شراء'), coalesce(v_request_json->>'status','needed'),
      coalesce(v_request_json->>'priority','normal'), nullif(v_request_json->>'neededBy','')::date,
      nullif(v_request_json->>'budgetAmount','')::numeric, coalesce(v_request_json->>'currency','EGP'),
      coalesce(v_request_json->>'notes',''), nullif(v_request_json->>'approvedBy','')::uuid,
      nullif(v_request_json->>'approvedAt','')::timestamptz, nullif(v_request_json->>'orderedAt','')::timestamptz,
      nullif(v_request_json->>'receivedAt','')::timestamptz,
      coalesce(nullif(v_request_json->>'createdAt','')::timestamptz, v_now),
      coalesce(nullif(v_request_json->>'updatedAt','')::timestamptz, v_now)
    );
  else
    select data into v_snapshot from public.home_operations_snapshot
      where workspace_id = p_workspace_id;
    select value into v_request_json
      from jsonb_array_elements(coalesce(v_snapshot->'purchaseRequests','[]'::jsonb)) value
      where value->>'id' = p_request_id::text
      limit 1;
    if v_request_json is not null then
      update public.home_purchase_requests set
        title = coalesce(v_request_json->>'title', title),
        priority = coalesce(v_request_json->>'priority', priority),
        needed_by = coalesce(nullif(v_request_json->>'neededBy','')::date, needed_by),
        budget_amount = coalesce(nullif(v_request_json->>'budgetAmount','')::numeric, budget_amount),
        currency = coalesce(v_request_json->>'currency', currency),
        notes = coalesce(v_request_json->>'notes', notes),
        status = case when status in ('partially_received','received') then status
                      else coalesce(v_request_json->>'status', status) end,
        updated_at = v_now
      where workspace_id = p_workspace_id and id = p_request_id;
    end if;
  end if;

  select data into v_snapshot from public.home_operations_snapshot
    where workspace_id = p_workspace_id;
  for v_item_json in
    select value from jsonb_array_elements(coalesce(v_snapshot->'purchaseItems','[]'::jsonb)) value
    where value->>'requestId' = p_request_id::text
  loop
    insert into public.home_purchase_request_items(
      id, workspace_id, request_id, inventory_item_id, name, quantity,
      estimated_unit_price, actual_unit_price, received_quantity, notes, created_at, updated_at
    ) values (
      (v_item_json->>'id')::uuid, p_workspace_id, p_request_id,
      nullif(v_item_json->>'inventoryItemId','')::uuid, coalesce(v_item_json->>'name','صنف'),
      (v_item_json->>'quantity')::numeric, nullif(v_item_json->>'estimatedUnitPrice','')::numeric,
      nullif(v_item_json->>'actualUnitPrice','')::numeric, coalesce(nullif(v_item_json->>'receivedQuantity','')::numeric,0),
      coalesce(v_item_json->>'notes',''), coalesce(nullif(v_item_json->>'createdAt','')::timestamptz,v_now), v_now
    )
    on conflict (id) do update set
      name = excluded.name,
      quantity = greatest(excluded.quantity, public.home_purchase_request_items.received_quantity),
      estimated_unit_price = excluded.estimated_unit_price,
      actual_unit_price = coalesce(public.home_purchase_request_items.actual_unit_price, excluded.actual_unit_price),
      inventory_item_id = coalesce(public.home_purchase_request_items.inventory_item_id, excluded.inventory_item_id),
      notes = excluded.notes,
      updated_at = v_now
    where public.home_purchase_request_items.workspace_id = excluded.workspace_id;
  end loop;

  select * into v_request
    from public.home_purchase_requests
    where workspace_id = p_workspace_id and id = p_request_id
    for update;
  if not found then raise exception 'HOME_PURCHASE_REQUEST_NOT_FOUND'; end if;

  -- Check idempotency before the current status so a retry of the final receipt
  -- succeeds even when the purchase is now fully received.
  select * into v_existing from public.home_purchase_receipts
    where workspace_id = p_workspace_id and idempotency_key = p_idempotency_key;
  if found then return v_existing.response; end if;

  if v_request.status not in ('ordered','partially_received') then
    raise exception 'HOME_PURCHASE_NOT_RECEIVABLE';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_lines) x
    group by x->>'itemId' having count(*) > 1
  ) then raise exception 'HOME_RECEIPT_DUPLICATE_LINE'; end if;

  insert into public.home_purchase_receipts(workspace_id, request_id, idempotency_key, received_by)
  values(p_workspace_id, p_request_id, p_idempotency_key, auth.uid())
  returning id into v_receipt_id;

  for v_line in select value from jsonb_array_elements(p_lines) loop
    if nullif(v_line->>'itemId','') is null then raise exception 'HOME_RECEIPT_ITEM_ID_REQUIRED'; end if;
    v_qty := nullif(v_line->>'quantity','')::numeric;
    if v_qty is null or v_qty <= 0 then raise exception 'HOME_RECEIPT_QUANTITY_INVALID'; end if;
    v_price := nullif(v_line->>'unitPrice','')::numeric;
    if v_price is not null and v_price < 0 then raise exception 'HOME_RECEIPT_PRICE_INVALID'; end if;

    select * into v_request_item
      from public.home_purchase_request_items
      where workspace_id = p_workspace_id and request_id = p_request_id and id = (v_line->>'itemId')::uuid
      for update;
    if not found then raise exception 'HOME_RECEIPT_ITEM_NOT_FOUND'; end if;
    if v_qty > v_request_item.quantity - v_request_item.received_quantity then
      raise exception 'HOME_RECEIPT_EXCEEDS_REMAINING';
    end if;

    if v_request_item.inventory_item_id is not null then
      select * into v_item from public.home_inventory_items
        where workspace_id = p_workspace_id and id = v_request_item.inventory_item_id and deleted_at is null
        for update;
      if not found then raise exception 'HOME_RECEIPT_INVENTORY_ITEM_NOT_FOUND'; end if;
    else
      select id into v_room_id from public.home_rooms
        where workspace_id = p_workspace_id and property_id = v_request.property_id
          and room_type = 'general' and deleted_at is null
        order by created_at asc limit 1;
      insert into public.home_inventory_items(
        workspace_id, property_id, room_id, name, item_type, category, condition, unit,
        quantity, minimum_quantity, unit_price, currency, purchase_date, notes, created_by, updated_by
      ) values (
        p_workspace_id, v_request.property_id, v_room_id, v_request_item.name, 'misc', 'مشتريات',
        'good', 'piece', 0, 0, coalesce(v_price, v_request_item.estimated_unit_price),
        v_request.currency, current_date, 'تم إنشاؤه من استلام طلب شراء ' || v_request.title, auth.uid(), auth.uid()
      ) returning * into v_item;
    end if;

    v_key := 'purchase-receipt:' || v_receipt_id::text || ':' || v_request_item.id::text;
    insert into public.home_inventory_movements(
      workspace_id, item_id, movement_type, quantity, occurred_at, note, idempotency_key, created_by
    ) values (
      p_workspace_id, v_item.id, 'receive', v_qty, now(),
      'استلام طلب شراء: ' || v_request.title, v_key, auth.uid()
    ) returning id into v_movement_id;

    update public.home_inventory_items
      set quantity = quantity + v_qty, version = version + 1, updated_at = now(), updated_by = auth.uid(),
          unit_price = coalesce(v_price, unit_price)
      where workspace_id = p_workspace_id and id = v_item.id;

    update public.home_purchase_request_items
      set inventory_item_id = v_item.id, received_quantity = received_quantity + v_qty,
          actual_unit_price = coalesce(v_price, actual_unit_price), updated_at = now()
      where workspace_id = p_workspace_id and id = v_request_item.id;

    insert into public.home_purchase_receipt_items(
      workspace_id, receipt_id, request_item_id, inventory_item_id, inventory_movement_id, quantity, unit_price
    ) values (p_workspace_id, v_receipt_id, v_request_item.id, v_item.id, v_movement_id, v_qty, v_price)
    returning id into v_receipt_item_id;

    v_linked := v_linked || jsonb_build_object(v_request_item.id::text, v_item.id::text);
  end loop;

  select coalesce(sum(quantity),0), coalesce(sum(received_quantity),0)
    into v_total, v_received
    from public.home_purchase_request_items
    where workspace_id = p_workspace_id and request_id = p_request_id;
  v_status := case when v_total > 0 and v_received >= v_total then 'received' else 'partially_received' end;
  update public.home_purchase_requests
    set status = v_status, received_at = case when v_status = 'received' then coalesce(received_at, v_now) else received_at end,
        updated_at = v_now
    where workspace_id = p_workspace_id and id = p_request_id;

  -- Keep the legacy UI snapshot mirror in the same transaction until the operations
  -- screens are fully moved to relational reads/writes. A failure rolls back receipt,
  -- stock movements, outbox, and mirror update together.
  update public.home_operations_snapshot s
    set data = jsonb_set(
      jsonb_set(
        s.data,
        '{purchaseItems}',
        coalesce((
          select jsonb_agg(
            case
              when p->>'requestId' = p_request_id::text
                and exists(select 1 from jsonb_array_elements(p_lines) x where x->>'itemId' = p->>'id')
              then jsonb_set(
                jsonb_set(p, '{receivedQuantity}',
                  to_jsonb(coalesce(nullif(p->>'receivedQuantity','')::numeric,0) + (
                    select coalesce(sum((x->>'quantity')::numeric),0)
                    from jsonb_array_elements(p_lines) x where x->>'itemId' = p->>'id'
                  )), true),
                '{inventoryItemId}', to_jsonb(v_linked->>(p->>'id')), true
              )
              else p
            end
          )
          from jsonb_array_elements(coalesce(s.data->'purchaseItems','[]'::jsonb)) p
        ), '[]'::jsonb),
        true
      ),
      '{purchaseRequests}',
      coalesce((
        select jsonb_agg(
          case when p->>'id' = p_request_id::text
            then jsonb_set(jsonb_set(jsonb_set(p,'{status}',to_jsonb(v_status),true),
              '{updatedAt}',to_jsonb(v_now),true),
              '{receivedAt}',to_jsonb(case when v_status = 'received' then v_now else nullif(p->>'receivedAt','') end),true)
            else p
          end
        )
        from jsonb_array_elements(coalesce(s.data->'purchaseRequests','[]'::jsonb)) p
      ), '[]'::jsonb),
      true
    ),
    version = version + 1,
    updated_at = v_now,
    updated_by = auth.uid()
    where s.workspace_id = p_workspace_id;

  v_response := jsonb_build_object(
    'receiptId', v_receipt_id,
    'requestId', p_request_id,
    'status', v_status,
    'receivedAt', now(),
    'linkedItems', v_linked
  );
  update public.home_purchase_receipts set response = v_response
    where workspace_id = p_workspace_id and id = v_receipt_id;

  insert into public.home_outbox_events(
    workspace_id, aggregate_type, aggregate_id, event_type, payload, idempotency_key
  ) values (
    p_workspace_id, 'home_purchase_receipt', v_receipt_id, 'home.purchase.receipt.recorded',
    jsonb_build_object(
      'receiptId', v_receipt_id, 'purchaseRequestId', p_request_id, 'purchaseTitle', v_request.title,
      'currency', v_request.currency, 'items', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'requestItemId', pri.request_item_id, 'inventoryItemId', pri.inventory_item_id,
          'itemName', hpi.name, 'quantity', pri.quantity, 'unitPrice', pri.unit_price,
          'amount', round(pri.quantity * coalesce(pri.unit_price,0),2)
        )), '[]'::jsonb)
        from public.home_purchase_receipt_items pri
        join public.home_purchase_request_items hpi
          on hpi.workspace_id = pri.workspace_id and hpi.id = pri.request_item_id
        where pri.workspace_id = p_workspace_id and pri.receipt_id = v_receipt_id
      ),
      'requiresHumanReview', true
    ),
    'home-purchase-receipt:' || v_receipt_id::text
  );

  insert into public.home_audit_log(workspace_id, actor_id, action, entity_type, entity_id, metadata)
  values(p_workspace_id, auth.uid(), 'purchase_receipt_recorded', 'home_purchase_receipt', v_receipt_id,
    jsonb_build_object('requestId', p_request_id, 'status', v_status, 'lineCount', jsonb_array_length(p_lines)));

  return v_response;
end;
$$;

revoke all on function public.home_record_purchase_receipt(uuid,uuid,jsonb,text) from public, anon;
grant execute on function public.home_record_purchase_receipt(uuid,uuid,jsonb,text) to authenticated;

commit;
