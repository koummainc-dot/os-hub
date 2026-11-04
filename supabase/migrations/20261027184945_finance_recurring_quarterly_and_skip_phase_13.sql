ALTER TABLE public.finance_recurring_items
  DROP CONSTRAINT IF EXISTS finance_recurring_items_frequency_check;
ALTER TABLE public.finance_recurring_items
  ADD CONSTRAINT finance_recurring_items_frequency_check
  CHECK (frequency = ANY (ARRAY['Weekly'::text, 'Monthly'::text, 'Quarterly'::text, 'Yearly'::text]));

CREATE OR REPLACE FUNCTION public.fin_recurring_save(p jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  ws uuid := (p->>'workspace_id')::uuid;
  rid uuid := nullif(p->>'id','')::uuid;
  nm text := nullif(btrim(p->>'name'),'');
  amt numeric := public.fin__num(p,'amount');
  ccy text := upper(p->>'currency');
  typ text := p->>'type';
  freq text := p->>'frequency';
  nxt date := (p->>'next_payment_date')::date;
  acc uuid := nullif(p->>'account_id','')::uuid;
  cat uuid := nullif(p->>'category_id','')::uuid;
  active_flag boolean := coalesce((p->>'active')::boolean,true);
  renew_flag boolean := coalesce((p->>'auto_renew')::boolean,true);
begin
  perform public.fin__need(ws, 'recurring', 'edit');
  if nm is null or amt is null or amt <= 0 or ccy !~ '^[A-Z]{3}$'
     or typ not in ('Income','Expense') or freq not in ('Weekly','Monthly','Quarterly','Yearly') or nxt is null then
    perform public.fin__err('VALIDATION_FAILED','invalid recurring item fields');
  end if;
  if acc is not null and not exists (select 1 from public.finance_accounts a where a.workspace_id=ws and a.id=acc and a.currency=ccy) then
    perform public.fin__err('OWNERSHIP_MISMATCH','recurring account or currency');
  end if;
  if cat is not null and not exists (select 1 from public.finance_categories c where c.workspace_id=ws and c.id=cat and (c.kind='Both' or c.kind=typ)) then
    perform public.fin__err('OWNERSHIP_MISMATCH','recurring category or kind');
  end if;
  if rid is null then
    insert into public.finance_recurring_items(workspace_id,name,amount,currency,type,frequency,next_payment_date,active,auto_renew,cancellation_date,account_id,category_id,notes,created_by)
    values(ws,nm,amt,ccy,typ,freq,nxt,active_flag,renew_flag,nullif(p->>'cancellation_date','')::date,acc,cat,nullif(p->>'notes',''),auth.uid())
    returning id into rid;
  else
    update public.finance_recurring_items set name=nm,amount=amt,currency=ccy,type=typ,frequency=freq,next_payment_date=nxt,active=active_flag,auto_renew=renew_flag,cancellation_date=nullif(p->>'cancellation_date','')::date,account_id=acc,category_id=cat,notes=nullif(p->>'notes',''),updated_at=now()
    where workspace_id=ws and id=rid;
    if not found then perform public.fin__err('OWNERSHIP_MISMATCH','recurring item'); end if;
  end if;
  return jsonb_build_object('id',rid,'saved',true);
end $function$;

CREATE OR REPLACE FUNCTION public.fin_recurring_log_payment(p jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  ws uuid := (p->>'workspace_id')::uuid;
  rid uuid := (p->>'recurring_id')::uuid;
  it public.finance_recurring_items;
  acc uuid;
  pay_date date;
  occ uuid := gen_random_uuid();
  next_date date;
  posted jsonb;
  idem jsonb;
begin
  perform public.fin__need(ws,'recurring','edit');
  perform public.fin__need(ws,'ledger','edit');
  idem := public.fin__idem_begin(ws,p->>'idempotency_key',p);
  if idem is not null then return idem; end if;
  select * into it from public.finance_recurring_items where workspace_id=ws and id=rid for update;
  if it.id is null then perform public.fin__err('OWNERSHIP_MISMATCH','recurring item'); end if;
  if not it.active then perform public.fin__err('RECURRING_INACTIVE'); end if;
  acc := coalesce(nullif(p->>'account_id','')::uuid,it.account_id);
  if acc is null or not exists(select 1 from public.finance_accounts a where a.workspace_id=ws and a.id=acc and a.currency=it.currency and a.status='Active') then
    perform public.fin__err('RECURRING_ACCOUNT_REQUIRED');
  end if;
  pay_date := coalesce(nullif(p->>'payment_date','')::date,it.next_payment_date);
  next_date := case it.frequency
    when 'Weekly' then it.next_payment_date + 7
    when 'Monthly' then (it.next_payment_date + interval '1 month')::date
    when 'Quarterly' then (it.next_payment_date + interval '3 months')::date
    when 'Yearly' then (it.next_payment_date + interval '1 year')::date
  end;
  posted := public.fin__core_post(ws,jsonb_build_object(
    'purpose','Regular','amount',it.amount::text,'currency',it.currency,'local_date',pay_date::text,
    'name',it.name,'type',it.type,
    'from_account_id',case when it.type='Expense' then acc::text end,
    'to_account_id',case when it.type='Income' then acc::text end,
    'category_id',it.category_id::text,
    'source_system','finance','source_type','recurring_occurrence','source_id',occ::text
  ),auth.uid());
  insert into public.finance_recurring_occurrences(id,workspace_id,recurring_id,due_date,payment_date,amount,transaction_id,state,created_by)
  values(occ,ws,rid,it.next_payment_date,pay_date,it.amount,(posted->>'transaction_id')::uuid,'Posted',auth.uid());
  update public.finance_recurring_items set last_payment_date=pay_date,
    next_payment_date=next_date,active=case when auto_renew then active else false end,
    cancellation_date=case when auto_renew then cancellation_date else pay_date end,
    updated_at=now()
    where workspace_id=ws and id=rid;
  perform public.fin__audit(ws,auth.uid(),'recurring',rid::text,'payment',p->>'reason',null,jsonb_build_object('occurrence_id',occ,'transaction_id',posted->>'transaction_id','payment_date',pay_date));
  return public.fin__idem_end(ws,p->>'idempotency_key',jsonb_build_object('occurrence_id',occ,'transaction_id',posted->>'transaction_id','next_payment_date',next_date,'active',case when it.auto_renew then it.active else false end));
end $function$;

CREATE OR REPLACE FUNCTION public.fin_recurring_skip(p jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  ws uuid := (p->>'workspace_id')::uuid;
  rid uuid := (p->>'recurring_id')::uuid;
  it public.finance_recurring_items;
  occ uuid := gen_random_uuid();
  next_date date;
  idem jsonb;
  reason text := nullif(btrim(p->>'reason'),'');
begin
  perform public.fin__need(ws,'recurring','edit');
  idem := public.fin__idem_begin(ws,p->>'idempotency_key',p);
  if idem is not null then return idem; end if;
  select * into it from public.finance_recurring_items where workspace_id=ws and id=rid for update;
  if it.id is null then perform public.fin__err('OWNERSHIP_MISMATCH','recurring item'); end if;
  if not it.active then perform public.fin__err('RECURRING_INACTIVE'); end if;
  if it.next_payment_date > current_date then perform public.fin__err('RECURRING_NOT_DUE'); end if;
  if exists(select 1 from public.finance_recurring_occurrences o where o.workspace_id=ws and o.recurring_id=rid and o.due_date=it.next_payment_date) then
    perform public.fin__err('RECURRING_OCCURRENCE_ALREADY_RECORDED');
  end if;
  next_date := case it.frequency
    when 'Weekly' then it.next_payment_date + 7
    when 'Monthly' then (it.next_payment_date + interval '1 month')::date
    when 'Quarterly' then (it.next_payment_date + interval '3 months')::date
    when 'Yearly' then (it.next_payment_date + interval '1 year')::date
  end;
  insert into public.finance_recurring_occurrences(id,workspace_id,recurring_id,due_date,payment_date,amount,transaction_id,state,created_by)
  values(occ,ws,rid,it.next_payment_date,it.next_payment_date,it.amount,null,'Skipped',auth.uid());
  update public.finance_recurring_items set next_payment_date=next_date,
    active=case when auto_renew then active else false end,
    cancellation_date=case when auto_renew then cancellation_date else it.next_payment_date end,
    updated_at=now()
    where workspace_id=ws and id=rid;
  perform public.fin__audit(ws,auth.uid(),'recurring',rid::text,'skip',reason,null,jsonb_build_object('occurrence_id',occ,'due_date',it.next_payment_date,'next_payment_date',next_date));
  return public.fin__idem_end(ws,p->>'idempotency_key',jsonb_build_object('occurrence_id',occ,'state','Skipped','next_payment_date',next_date,'active',case when it.auto_renew then it.active else false end));
end $function$;

REVOKE ALL ON FUNCTION public.fin_recurring_save(jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.fin_recurring_log_payment(jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.fin_recurring_skip(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fin_recurring_save(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fin_recurring_log_payment(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fin_recurring_skip(jsonb) TO authenticated;