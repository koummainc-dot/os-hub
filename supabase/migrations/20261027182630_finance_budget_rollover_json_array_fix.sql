CREATE OR REPLACE FUNCTION public.fin_budget_rollover_apply(p jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE ws uuid := nullif(p->>'workspace_id','')::uuid; src text := p->>'source_period'; dst text := p->>'target_period';
 b public.finance_budgets; bj jsonb; carry numeric; cnt integer:=0; total_carry numeric:=0; inserted integer;
BEGIN
 PERFORM public.fin__need(ws,'budgets','edit');
 IF src IS NULL OR src !~ '^\\d{4}-(0[1-9]|1[0-2])$' OR to_char(to_date(src||'-01','YYYY-MM-DD'),'YYYY-MM')<>src THEN PERFORM public.fin__err('VALIDATION_FAILED','source_period must be YYYY-MM'); END IF;
 IF dst IS NULL OR dst !~ '^\\d{4}-(0[1-9]|1[0-2])$' OR to_char(to_date(dst||'-01','YYYY-MM-DD'),'YYYY-MM')<>dst OR dst<>to_char((to_date(src||'-01','YYYY-MM-DD')+interval '1 month'),'YYYY-MM') THEN PERFORM public.fin__err('VALIDATION_FAILED','target_period must be the month immediately after source_period'); END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(ws::text||':'||src||':'||dst,0));
 INSERT INTO public.finance_budget_rollover_runs(workspace_id,source_period,target_period,initiated_by) VALUES(ws,src,dst,auth.uid()) ON CONFLICT(workspace_id,source_period,target_period) DO NOTHING;
 GET DIAGNOSTICS inserted=ROW_COUNT;
 IF inserted=0 THEN PERFORM public.fin__err('ROLLOVER_ALREADY_APPLIED','Rollover has already been applied for this month pair'); END IF;
 IF NOT EXISTS(SELECT 1 FROM public.finance_budgets WHERE workspace_id=ws AND period=src) THEN PERFORM public.fin__err('NO_BUDGETS_TO_ROLLOVER','No budgets exist in the source period'); END IF;
 FOR b IN SELECT * FROM public.finance_budgets WHERE workspace_id=ws AND period=src LOOP
  SELECT j.value INTO bj FROM jsonb_array_elements(public.fin_budgets_get(ws,src)) AS j(value) WHERE (j.value->>'category_id') IS NOT DISTINCT FROM b.category_id::text LIMIT 1;
  carry:=greatest(0,coalesce(nullif(bj->>'remaining','')::numeric,0));
  IF b.category_id IS NULL THEN
   UPDATE public.finance_budgets SET rollover_in=rollover_in+carry,source='Copied',updated_at=clock_timestamp() WHERE workspace_id=ws AND period=dst AND category_id IS NULL;
   IF NOT FOUND THEN INSERT INTO public.finance_budgets(workspace_id,category_id,period,budget_amount,rollover_in,source,notes,created_by) VALUES(ws,NULL,dst,b.budget_amount,carry,'Copied',b.notes,auth.uid()); END IF;
  ELSE
   UPDATE public.finance_budgets SET rollover_in=rollover_in+carry,source='Copied',updated_at=clock_timestamp() WHERE workspace_id=ws AND period=dst AND category_id=b.category_id;
   IF NOT FOUND THEN INSERT INTO public.finance_budgets(workspace_id,category_id,period,budget_amount,rollover_in,source,notes,created_by) VALUES(ws,b.category_id,dst,b.budget_amount,carry,'Copied',b.notes,auth.uid()); END IF;
  END IF;
  cnt:=cnt+1; total_carry:=total_carry+carry;
 END LOOP;
 RETURN jsonb_build_object('source_period',src,'target_period',dst,'copied_count',cnt,'rollover_amount',total_carry::text);
END $function$;
ALTER FUNCTION public.fin_budget_rollover_apply(jsonb) SET search_path = '';
REVOKE ALL ON FUNCTION public.fin_budget_rollover_apply(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fin_budget_rollover_apply(jsonb) TO authenticated;