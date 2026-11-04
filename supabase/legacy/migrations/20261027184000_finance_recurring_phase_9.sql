create table if not exists public.finance_recurring_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  name text not null check (length(btrim(name)) between 1 and 160),
  amount numeric(24,6) not null check (amount > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  type text not null check (type in ('Income','Expense')),
  frequency text not null check (frequency in ('Weekly','Monthly','Yearly')),
  next_payment_date date not null,
  last_payment_date date,
  active boolean not null default true,
  auto_renew boolean not null default true,
  cancellation_date date,
  account_id uuid,
  category_id uuid,
  notes text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  constraint finance_recurring_account_fk foreign key (workspace_id, account_id) references public.finance_accounts(workspace_id, id),
  constraint finance_recurring_category_fk foreign key (workspace_id, category_id) references public.finance_categories(workspace_id, id)
);
create index if not exists finance_recurring_due_idx on public.finance_recurring_items(workspace_id, next_payment_date) where active = true;
create table if not exists public.finance_recurring_occurrences (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  recurring_id uuid not null,
  due_date date not null,
  payment_date date not null,
  amount numeric(24,6) not null check (amount > 0),
  transaction_id uuid,
  state text not null default 'Posted' check (state in ('Posted','Skipped','Cancelled')),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  unique (recurring_id, due_date),
  constraint finance_recurring_occurrence_item_fk foreign key (workspace_id, recurring_id) references public.finance_recurring_items(workspace_id, id),
  constraint finance_recurring_occurrence_tx_fk foreign key (workspace_id, transaction_id) references public.finance_transactions(workspace_id, id)
);
create index if not exists finance_recurring_occurrences_recent_idx on public.finance_recurring_occurrences(workspace_id, payment_date desc);
alter table public.finance_recurring_items enable row level security;
alter table public.finance_recurring_occurrences enable row level security;
drop policy if exists finance_recurring_items_select on public.finance_recurring_items;
create policy finance_recurring_items_select on public.finance_recurring_items for select to authenticated using (public.ws_access_level(workspace_id, 'finance', 'recurring') in ('view','edit'));
drop policy if exists finance_recurring_occurrences_select on public.finance_recurring_occurrences;
create policy finance_recurring_occurrences_select on public.finance_recurring_occurrences for select to authenticated using (public.ws_access_level(workspace_id, 'finance', 'recurring') in ('view','edit'));
revoke insert, update, delete on public.finance_recurring_items from anon, authenticated;
revoke insert, update, delete on public.finance_recurring_occurrences from anon, authenticated;
grant select on public.finance_recurring_items, public.finance_recurring_occurrences to authenticated;
create or replace function public.fin_recurring_save(p jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $function$
declare ws uuid := (p->>'workspace_id')::uuid; rid uuid := nullif(p->>'id','')::uuid; nm text := nullif(btrim(p->>'name'),''); amt numeric := public.fin__num(p,'amount'); ccy text := upper(p->>'currency'); typ text := p->>'type'; freq text := p->>'frequency'; nxt date := (p->>'next_payment_date')::date; acc uuid := nullif(p->>'account_id','')::uuid; cat uuid := nullif(p->>'category_id','')::uuid; active_flag boolean := coalesce((p->>'active')::boolean,true); renew_flag boolean := coalesce((p->>'auto_renew')::boolean,true);
begin
  perform public.fin__need(ws, 'recurring', 'edit');
  if nm is null or amt is null or amt <= 0 or ccy !~ '^[A-Z]{3}$' or typ not in ('Income','Expense') or freq not in ('Weekly','Monthly','Yearly') or nxt is null then perform public.fin__err('VALIDATION_FAILED','invalid recurring item fields'); end if;
  if acc is not null and not exists (select 1 from public.finance_accounts a where a.workspace_id=ws and a.id=acc and a.currency=ccy) then perform public.fin__err('OWNERSHIP_MISMATCH','recurring account or currency'); end if;
  if cat is not null and not exists (select 1 from public.finance_categories c where c.workspace_id=ws and c.id=cat and (c.kind='Both' or c.kind=typ)) then perform public.fin__err('OWNERSHIP_MISMATCH','recurring category or kind'); end if;
  if rid is null then
    insert into public.finance_recurring_items(workspace_id,name,amount,currency,type,frequency,next_payment_date,active,auto_renew,cancellation_date,account_id,category_id,notes,created_by)
    values(ws,nm,amt,ccy,typ,freq,nxt,active_flag,renew_flag,nullif(p->>'cancellation_date','')::date,acc,cat,nullif(p->>'notes',''),auth.uid()) returning id into rid;
  else
    update public.finance_recurring_items set name=nm,amount=amt,currency=ccy,type=typ,frequency=freq,next_payment_date=nxt,active=active_flag,auto_renew=renew_flag,cancellation_date=nullif(p->>'cancellation_date','')::date,account_id=acc,category_id=cat,notes=nullif(p->>'notes',''),updated_at=now() where workspace_id=ws and id=rid;
    if not found then perform public.fin__err('OWNERSHIP_MISMATCH','recurring item'); end if;
  end if;
  return jsonb_build_object('id',rid,'saved',true);
end $function$;
create or replace function public.fin_recurring_log_payment(p jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $function$
declare ws uuid := (p->>'workspace_id')::uuid; rid uuid := (p->>'recurring_id')::uuid; it public.finance_recurring_items; acc uuid; pay_date date; occ uuid := gen_random_uuid(); next_date date; posted jsonb; idem jsonb;
begin
  perform public.fin__need(ws,'recurring','edit'); perform public.fin__need(ws,'ledger','edit');
  idem := public.fin__idem_begin(ws,p->>'idempotency_key',p); if idem is not null then return idem; end if;
  select * into it from public.finance_recurring_items where workspace_id=ws and id=rid for update;
  if it.id is null then perform public.fin__err('OWNERSHIP_MISMATCH','recurring item'); end if;
  if not it.active then perform public.fin__err('RECURRING_INACTIVE'); end if;
  acc := coalesce(nullif(p->>'account_id','')::uuid,it.account_id);
  if acc is null or not exists(select 1 from public.finance_accounts a where a.workspace_id=ws and a.id=acc and a.currency=it.currency and a.status='Active') then perform public.fin__err('RECURRING_ACCOUNT_REQUIRED'); end if;
  pay_date := coalesce(nullif(p->>'payment_date','')::date,it.next_payment_date);
  next_date := case it.frequency when 'Weekly' then it.next_payment_date + 7 when 'Monthly' then (it.next_payment_date + interval '1 month')::date else (it.next_payment_date + interval '1 year')::date end;
  posted := public.fin__core_post(ws,jsonb_build_object('purpose','Regular','amount',it.amount::text,'currency',it.currency,'local_date',pay_date::text,'name',it.name,'type',it.type,'from_account_id',case when it.type='Expense' then acc::text end,'to_account_id',case when it.type='Income' then acc::text end,'category_id',it.category_id::text,'source_system','finance','source_type','recurring_occurrence','source_id',occ::text),auth.uid());
  insert into public.finance_recurring_occurrences(id,workspace_id,recurring_id,due_date,payment_date,amount,transaction_id,state,created_by) values(occ,ws,rid,it.next_payment_date,pay_date,it.amount,(posted->>'transaction_id')::uuid,'Posted',auth.uid());
  update public.finance_recurring_items set last_payment_date=pay_date,next_payment_date=next_date,active=case when auto_renew then active else false end,updated_at=now() where workspace_id=ws and id=rid;
  perform public.fin__audit(ws,auth.uid(),'recurring',rid::text,'payment',p->>'reason',null,jsonb_build_object('occurrence_id',occ,'transaction_id',posted->>'transaction_id','payment_date',pay_date));
  return public.fin__idem_end(ws,p->>'idempotency_key',jsonb_build_object('occurrence_id',occ,'transaction_id',posted->>'transaction_id','next_payment_date',next_date,'active',case when it.auto_renew then it.active else false end));
end $function$;
revoke all on function public.fin_recurring_save(jsonb) from public, anon;
grant execute on function public.fin_recurring_save(jsonb) to authenticated;
revoke all on function public.fin_recurring_log_payment(jsonb) from public, anon;
grant execute on function public.fin_recurring_log_payment(jsonb) to authenticated;
