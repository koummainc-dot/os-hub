-- Finance recurring date-anchor correction.
-- Keep the intended calendar day (or end-of-month intent) stable across short months.
ALTER TABLE public.finance_recurring_items
  ADD COLUMN IF NOT EXISTS schedule_day integer,
  ADD COLUMN IF NOT EXISTS schedule_month_end boolean;

UPDATE public.finance_recurring_items
SET schedule_day = EXTRACT(DAY FROM next_payment_date)::integer,
    schedule_month_end = (
      next_payment_date =
      (date_trunc('month', next_payment_date)::date + interval '1 month' - interval '1 day')::date
    )
WHERE schedule_day IS NULL OR schedule_month_end IS NULL;

ALTER TABLE public.finance_recurring_items
  ALTER COLUMN schedule_day SET NOT NULL,
  ALTER COLUMN schedule_month_end SET NOT NULL;

ALTER TABLE public.finance_recurring_items
  DROP CONSTRAINT IF EXISTS finance_recurring_items_schedule_day_check;
ALTER TABLE public.finance_recurring_items
  ADD CONSTRAINT finance_recurring_items_schedule_day_check CHECK (schedule_day BETWEEN 1 AND 31);

CREATE OR REPLACE FUNCTION public.fin__recurring_next_date(p_due date,p_frequency text,p_schedule_day integer,p_month_end boolean)
RETURNS date LANGUAGE plpgsql IMMUTABLE SET search_path TO '' AS $function$
DECLARE target_month date; last_day date; intended_day integer;
BEGIN
  IF p_frequency='Weekly' THEN RETURN p_due+7;
  ELSIF p_frequency='Monthly' THEN target_month:=date_trunc('month',p_due+interval '1 month')::date;
  ELSIF p_frequency='Quarterly' THEN target_month:=date_trunc('month',p_due+interval '3 months')::date;
  ELSIF p_frequency='Yearly' THEN target_month:=date_trunc('month',p_due+interval '1 year')::date;
  ELSE RAISE EXCEPTION 'Unsupported recurring frequency: %',p_frequency;
  END IF;
  last_day:=(target_month+interval '1 month'-interval '1 day')::date;
  IF coalesce(p_month_end,false) THEN RETURN last_day; END IF;
  intended_day:=greatest(1,least(coalesce(p_schedule_day,extract(day FROM p_due)::integer),extract(day FROM last_day)::integer));
  RETURN target_month+(intended_day-1);
END
$function$;
REVOKE ALL ON FUNCTION public.fin__recurring_next_date(date,text,integer,boolean) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.fin_recurring_save(p jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $function$
DECLARE
  ws uuid:=(p->>'workspace_id')::uuid; rid uuid:=nullif(p->>'id','')::uuid;
  nm text:=nullif(btrim(p->>'name'),''); amt numeric:=public.fin__num(p,'amount');
  ccy text:=upper(p->>'currency'); typ text:=p->>'type'; freq text:=p->>'frequency';
  nxt date:=(p->>'next_payment_date')::date; acc uuid:=nullif(p->>'account_id','')::uuid;
  cat uuid:=nullif(p->>'category_id','')::uuid;
  active_flag boolean:=coalesce((p->>'active')::boolean,true);
  renew_flag boolean:=coalesce((p->>'auto_renew')::boolean,true);
BEGIN
  PERFORM public.fin__need(ws,'recurring','edit');
  IF nm IS NULL OR amt IS NULL OR amt<=0 OR ccy !~ '^[A-Z]{3}$'
    OR typ NOT IN ('Income','Expense') OR freq NOT IN ('Weekly','Monthly','Quarterly','Yearly') OR nxt IS NULL THEN
    PERFORM public.fin__err('VALIDATION_FAILED','invalid recurring item fields');
  END IF;
  IF acc IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.finance_accounts a WHERE a.workspace_id=ws AND a.id=acc AND a.currency=ccy) THEN
    PERFORM public.fin__err('OWNERSHIP_MISMATCH','recurring account or currency');
  END IF;
  IF cat IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.finance_categories c WHERE c.workspace_id=ws AND c.id=cat AND (c.kind='Both' OR c.kind=typ)) THEN
    PERFORM public.fin__err('OWNERSHIP_MISMATCH','recurring category or kind');
  END IF;
  IF rid IS NULL THEN
    INSERT INTO public.finance_recurring_items(workspace_id,name,amount,currency,type,frequency,next_payment_date,schedule_day,schedule_month_end,active,auto_renew,cancellation_date,account_id,category_id,notes,created_by)
    VALUES(ws,nm,amt,ccy,typ,freq,nxt,extract(day FROM nxt)::integer,nxt=(date_trunc('month',nxt)::date+interval '1 month'-interval '1 day')::date,active_flag,renew_flag,nullif(p->>'cancellation_date','')::date,acc,cat,nullif(p->>'notes',''),auth.uid())
    RETURNING id INTO rid;
  ELSE
    UPDATE public.finance_recurring_items SET
      name=nm,amount=amt,currency=ccy,type=typ,frequency=freq,next_payment_date=nxt,
      schedule_day=CASE WHEN next_payment_date IS DISTINCT FROM nxt OR frequency IS DISTINCT FROM freq THEN extract(day FROM nxt)::integer ELSE schedule_day END,
      schedule_month_end=CASE WHEN next_payment_date IS DISTINCT FROM nxt OR frequency IS DISTINCT FROM freq THEN nxt=(date_trunc('month',nxt)::date+interval '1 month'-interval '1 day')::date ELSE schedule_month_end END,
      active=active_flag,auto_renew=renew_flag,cancellation_date=nullif(p->>'cancellation_date','')::date,account_id=acc,category_id=cat,notes=nullif(p->>'notes',''),updated_at=now()
    WHERE workspace_id=ws AND id=rid;
    IF NOT FOUND THEN PERFORM public.fin__err('OWNERSHIP_MISMATCH','recurring item'); END IF;
  END IF;
  RETURN jsonb_build_object('id',rid,'saved',true);
END
$function$;

CREATE OR REPLACE FUNCTION public.fin_recurring_log_payment(p jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $function$
DECLARE
  ws uuid:=(p->>'workspace_id')::uuid; rid uuid:=(p->>'recurring_id')::uuid;
  it public.finance_recurring_items; acc uuid; pay_date date; occ uuid:=gen_random_uuid();
  next_date date; posted jsonb; idem jsonb;
BEGIN
  PERFORM public.fin__need(ws,'recurring','edit'); PERFORM public.fin__need(ws,'ledger','edit');
  idem:=public.fin__idem_begin(ws,p->>'idempotency_key',p); IF idem IS NOT NULL THEN RETURN idem; END IF;
  SELECT * INTO it FROM public.finance_recurring_items WHERE workspace_id=ws AND id=rid FOR UPDATE;
  IF it.id IS NULL THEN PERFORM public.fin__err('OWNERSHIP_MISMATCH','recurring item'); END IF;
  IF NOT it.active THEN PERFORM public.fin__err('RECURRING_INACTIVE'); END IF;
  acc:=coalesce(nullif(p->>'account_id','')::uuid,it.account_id);
  IF acc IS NULL OR NOT EXISTS(SELECT 1 FROM public.finance_accounts a WHERE a.workspace_id=ws AND a.id=acc AND a.currency=it.currency AND a.status='Active') THEN PERFORM public.fin__err('RECURRING_ACCOUNT_REQUIRED'); END IF;
  pay_date:=coalesce(nullif(p->>'payment_date','')::date,it.next_payment_date);
  next_date:=public.fin__recurring_next_date(it.next_payment_date,it.frequency,it.schedule_day,it.schedule_month_end);
  posted:=public.fin__core_post(ws,jsonb_build_object('purpose','Regular','amount',it.amount::text,'currency',it.currency,'local_date',pay_date::text,'name',it.name,'type',it.type,'from_account_id',case when it.type='Expense' then acc::text end,'to_account_id',case when it.type='Income' then acc::text end,'category_id',it.category_id::text,'source_system','finance','source_type','recurring_occurrence','source_id',occ::text),auth.uid());
  INSERT INTO public.finance_recurring_occurrences(id,workspace_id,recurring_id,due_date,payment_date,amount,transaction_id,state,created_by)
  VALUES(occ,ws,rid,it.next_payment_date,pay_date,it.amount,(posted->>'transaction_id')::uuid,'Posted',auth.uid());
  UPDATE public.finance_recurring_items SET last_payment_date=pay_date,next_payment_date=next_date,active=CASE WHEN auto_renew THEN active ELSE false END,cancellation_date=CASE WHEN auto_renew THEN cancellation_date ELSE pay_date END,updated_at=now() WHERE workspace_id=ws AND id=rid;
  PERFORM public.fin__audit(ws,auth.uid(),'recurring',rid::text,'payment',p->>'reason',null,jsonb_build_object('occurrence_id',occ,'transaction_id',posted->>'transaction_id','payment_date',pay_date));
  RETURN public.fin__idem_end(ws,p->>'idempotency_key',jsonb_build_object('occurrence_id',occ,'transaction_id',posted->>'transaction_id','next_payment_date',next_date,'active',CASE WHEN it.auto_renew THEN it.active ELSE false END));
END
$function$;

CREATE OR REPLACE FUNCTION public.fin_recurring_skip(p jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $function$
DECLARE
  ws uuid:=(p->>'workspace_id')::uuid; rid uuid:=(p->>'recurring_id')::uuid;
  it public.finance_recurring_items; occ uuid:=gen_random_uuid(); next_date date;
  idem jsonb; reason text:=nullif(btrim(p->>'reason'),'');
BEGIN
  PERFORM public.fin__need(ws,'recurring','edit');
  idem:=public.fin__idem_begin(ws,p->>'idempotency_key',p); IF idem IS NOT NULL THEN RETURN idem; END IF;
  SELECT * INTO it FROM public.finance_recurring_items WHERE workspace_id=ws AND id=rid FOR UPDATE;
  IF it.id IS NULL THEN PERFORM public.fin__err('OWNERSHIP_MISMATCH','recurring item'); END IF;
  IF NOT it.active THEN PERFORM public.fin__err('RECURRING_INACTIVE'); END IF;
  IF it.next_payment_date>current_date THEN PERFORM public.fin__err('RECURRING_NOT_DUE'); END IF;
  IF EXISTS(SELECT 1 FROM public.finance_recurring_occurrences o WHERE o.workspace_id=ws AND o.recurring_id=rid AND o.due_date=it.next_payment_date) THEN PERFORM public.fin__err('RECURRING_OCCURRENCE_ALREADY_RECORDED'); END IF;
  next_date:=public.fin__recurring_next_date(it.next_payment_date,it.frequency,it.schedule_day,it.schedule_month_end);
  INSERT INTO public.finance_recurring_occurrences(id,workspace_id,recurring_id,due_date,payment_date,amount,transaction_id,state,created_by)
  VALUES(occ,ws,rid,it.next_payment_date,it.next_payment_date,it.amount,null,'Skipped',auth.uid());
  UPDATE public.finance_recurring_items SET next_payment_date=next_date,active=CASE WHEN auto_renew THEN active ELSE false END,cancellation_date=CASE WHEN auto_renew THEN cancellation_date ELSE it.next_payment_date END,updated_at=now() WHERE workspace_id=ws AND id=rid;
  PERFORM public.fin__audit(ws,auth.uid(),'recurring',rid::text,'skip',reason,null,jsonb_build_object('occurrence_id',occ,'due_date',it.next_payment_date,'next_payment_date',next_date));
  RETURN public.fin__idem_end(ws,p->>'idempotency_key',jsonb_build_object('occurrence_id',occ,'state','Skipped','next_payment_date',next_date,'active',CASE WHEN it.auto_renew THEN it.active ELSE false END));
END
$function$;

REVOKE ALL ON FUNCTION public.fin_recurring_save(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fin_recurring_save(jsonb) TO authenticated;
REVOKE ALL ON FUNCTION public.fin_recurring_log_payment(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fin_recurring_log_payment(jsonb) TO authenticated;
REVOKE ALL ON FUNCTION public.fin_recurring_skip(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fin_recurring_skip(jsonb) TO authenticated;
