-- Make deferral a real reschedule and record recurring occurrences missed during late payment.
ALTER TABLE public.finance_recurring_occurrences
  ADD COLUMN IF NOT EXISTS rescheduled_to date,
  ADD COLUMN IF NOT EXISTS reason text;
ALTER TABLE public.finance_recurring_occurrences
  DROP CONSTRAINT IF EXISTS finance_recurring_occurrences_state_check;
ALTER TABLE public.finance_recurring_occurrences
  ADD CONSTRAINT finance_recurring_occurrences_state_check
  CHECK (state = ANY (ARRAY['Posted'::text,'Skipped'::text,'Cancelled'::text,'Deferred'::text,'Missed'::text]));

CREATE OR REPLACE FUNCTION public.fin_recurring_defer(p jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  ws uuid := (p->>'workspace_id')::uuid;
  rid uuid := (p->>'recurring_id')::uuid;
  new_date date := nullif(p->>'defer_to_date','')::date;
  reason text := nullif(btrim(p->>'reason'),'');
  it public.finance_recurring_items;
  occ uuid := gen_random_uuid();
  idem jsonb;
BEGIN
  PERFORM public.fin__need(ws,'recurring','edit');
  idem := public.fin__idem_begin(ws,p->>'idempotency_key',p);
  IF idem IS NOT NULL THEN RETURN idem; END IF;
  SELECT * INTO it FROM public.finance_recurring_items WHERE workspace_id=ws AND id=rid FOR UPDATE;
  IF it.id IS NULL THEN PERFORM public.fin__err('OWNERSHIP_MISMATCH','recurring item'); END IF;
  IF NOT it.active THEN PERFORM public.fin__err('RECURRING_INACTIVE'); END IF;
  IF it.next_payment_date > current_date THEN PERFORM public.fin__err('RECURRING_NOT_DUE'); END IF;
  IF new_date IS NULL OR new_date <= current_date OR new_date <= it.next_payment_date THEN
    PERFORM public.fin__err('VALIDATION_FAILED','defer_to_date must be a future date after the due date');
  END IF;
  IF length(coalesce(reason,'')) < 3 THEN PERFORM public.fin__err('VALIDATION_FAILED','reason is required'); END IF;
  IF EXISTS(SELECT 1 FROM public.finance_recurring_occurrences o WHERE o.workspace_id=ws AND o.recurring_id=rid AND o.due_date=it.next_payment_date) THEN
    PERFORM public.fin__err('RECURRING_OCCURRENCE_ALREADY_RECORDED');
  END IF;
  INSERT INTO public.finance_recurring_occurrences(id,workspace_id,recurring_id,due_date,payment_date,amount,transaction_id,state,created_by,rescheduled_to,reason)
  VALUES(occ,ws,rid,it.next_payment_date,it.next_payment_date,it.amount,NULL,'Deferred',auth.uid(),new_date,reason);
  -- Keep the original schedule day/month-end preference for subsequent occurrences.
  UPDATE public.finance_recurring_items SET next_payment_date=new_date,updated_at=now()
    WHERE workspace_id=ws AND id=rid;
  PERFORM public.fin__audit(ws,auth.uid(),'recurring',rid::text,'defer',reason,NULL,
    jsonb_build_object('occurrence_id',occ,'old_due_date',it.next_payment_date,'rescheduled_to',new_date));
  RETURN public.fin__idem_end(ws,p->>'idempotency_key',
    jsonb_build_object('occurrence_id',occ,'state','Deferred','old_due_date',it.next_payment_date,'next_payment_date',new_date,'active',it.active));
END
$function$;

CREATE OR REPLACE FUNCTION public.fin_recurring_log_payment(p jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  ws uuid := (p->>'workspace_id')::uuid;
  rid uuid := (p->>'recurring_id')::uuid;
  it public.finance_recurring_items;
  acc uuid;
  pay_date date;
  occ uuid := gen_random_uuid();
  next_date date;
  posted jsonb;
  idem jsonb;
  missed_count integer := 0;
BEGIN
  PERFORM public.fin__need(ws,'recurring','edit');
  PERFORM public.fin__need(ws,'ledger','edit');
  idem := public.fin__idem_begin(ws,p->>'idempotency_key',p);
  IF idem IS NOT NULL THEN RETURN idem; END IF;
  SELECT * INTO it FROM public.finance_recurring_items WHERE workspace_id=ws AND id=rid FOR UPDATE;
  IF it.id IS NULL THEN PERFORM public.fin__err('OWNERSHIP_MISMATCH','recurring item'); END IF;
  IF NOT it.active THEN PERFORM public.fin__err('RECURRING_INACTIVE'); END IF;
  acc := coalesce(nullif(p->>'account_id','')::uuid,it.account_id);
  IF acc IS NULL OR NOT EXISTS(SELECT 1 FROM public.finance_accounts a WHERE a.workspace_id=ws AND a.id=acc AND a.currency=it.currency AND a.status='Active') THEN
    PERFORM public.fin__err('RECURRING_ACCOUNT_REQUIRED');
  END IF;
  pay_date := coalesce(nullif(p->>'payment_date','')::date,current_date);
  IF pay_date > current_date THEN PERFORM public.fin__err('FUTURE_DATE','A posted recurring payment cannot have a future payment date'); END IF;
  next_date := public.fin__recurring_next_date(it.next_payment_date,it.frequency,it.schedule_day,it.schedule_month_end);
  posted := public.fin__core_post(ws,jsonb_build_object(
    'purpose','Regular','amount',it.amount::text,'currency',it.currency,'local_date',pay_date::text,
    'name',it.name,'type',it.type,
    'from_account_id',case when it.type='Expense' then acc::text end,
    'to_account_id',case when it.type='Income' then acc::text end,
    'category_id',it.category_id::text,
    'source_system','finance','source_type','recurring_occurrence','source_id',occ::text
  ),auth.uid());
  INSERT INTO public.finance_recurring_occurrences(id,workspace_id,recurring_id,due_date,payment_date,amount,transaction_id,state,created_by,reason)
  VALUES(occ,ws,rid,it.next_payment_date,pay_date,it.amount,(posted->>'transaction_id')::uuid,'Posted',auth.uid(),nullif(btrim(p->>'reason'),''));
  -- A late payment covers one occurrence only. Mark later due dates that passed as Missed,
  -- then advance to the next scheduled date after the actual payment date.
  IF it.auto_renew AND pay_date >= it.next_payment_date THEN
    WHILE next_date <= pay_date LOOP
      missed_count := missed_count + 1;
      IF missed_count > 120 THEN PERFORM public.fin__err('RECURRING_CATCHUP_LIMIT','Too many missed periods to process safely'); END IF;
      INSERT INTO public.finance_recurring_occurrences(id,workspace_id,recurring_id,due_date,payment_date,amount,transaction_id,state,created_by,reason)
      VALUES(gen_random_uuid(),ws,rid,next_date,next_date,it.amount,NULL,'Missed',auth.uid(),'Occurrence passed before the late payment was recorded')
      ON CONFLICT(recurring_id,due_date) DO NOTHING;
      next_date := public.fin__recurring_next_date(next_date,it.frequency,it.schedule_day,it.schedule_month_end);
    END LOOP;
  END IF;
  UPDATE public.finance_recurring_items SET last_payment_date=pay_date,
    next_payment_date=next_date,active=CASE WHEN auto_renew THEN active ELSE false END,
    cancellation_date=CASE WHEN auto_renew THEN cancellation_date ELSE pay_date END,updated_at=now()
  WHERE workspace_id=ws AND id=rid;
  PERFORM public.fin__audit(ws,auth.uid(),'recurring',rid::text,'payment',p->>'reason',null,
    jsonb_build_object('occurrence_id',occ,'transaction_id',posted->>'transaction_id','payment_date',pay_date,'missed_occurrences',missed_count));
  RETURN public.fin__idem_end(ws,p->>'idempotency_key',
    jsonb_build_object('occurrence_id',occ,'transaction_id',posted->>'transaction_id','next_payment_date',next_date,
      'active',CASE WHEN it.auto_renew THEN it.active ELSE false END,'missed_occurrences',missed_count));
END
$function$;

REVOKE ALL ON FUNCTION public.fin_recurring_defer(jsonb) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.fin_recurring_log_payment(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fin_recurring_defer(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fin_recurring_log_payment(jsonb) TO authenticated;
