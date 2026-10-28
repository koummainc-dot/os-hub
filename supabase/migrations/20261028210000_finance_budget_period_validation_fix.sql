-- Fix escaped digit classes in Finance OS month validation.
-- Use explicit ASCII digit ranges so valid YYYY-MM periods are accepted consistently.
CREATE OR REPLACE FUNCTION public.fin_budget_upsert(p jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  ws uuid := nullif(p->>'workspace_id','')::uuid;
  cat uuid := nullif(p->>'category_id','')::uuid;
  per text := p->>'period';
  amt numeric;
  rec public.finance_budgets;
  nm text;
BEGIN
  PERFORM public.fin__need(ws, 'budgets', 'edit');
  IF per IS NULL OR per !~ '^[0-9]{4}-(0[1-9]|1[0-2])$'
     OR to_char(to_date(per || '-01','YYYY-MM-DD'),'YYYY-MM') <> per THEN
    PERFORM public.fin__err('VALIDATION_FAILED','period must be YYYY-MM');
  END IF;
  amt := public.fin__num(p,'budget_amount');
  IF amt IS NULL OR amt < 0 THEN
    PERFORM public.fin__err('VALIDATION_FAILED','budget_amount must be >= 0');
  END IF;
  IF cat IS NOT NULL THEN
    SELECT kind INTO nm FROM public.finance_categories
      WHERE id = cat AND workspace_id = ws AND archived = false;
    IF nm IS NULL THEN PERFORM public.fin__err('CATEGORY_NOT_FOUND'); END IF;
    IF nm NOT IN ('Expense','Both') THEN
      PERFORM public.fin__err('CATEGORY_KIND_INVALID','budget requires an Expense or Both category');
    END IF;
  END IF;
  IF cat IS NULL THEN
    SELECT * INTO rec FROM public.finance_budgets
      WHERE workspace_id=ws AND period=per AND category_id IS NULL FOR UPDATE;
  ELSE
    SELECT * INTO rec FROM public.finance_budgets
      WHERE workspace_id=ws AND period=per AND category_id=cat FOR UPDATE;
  END IF;
  IF rec.id IS NULL THEN
    INSERT INTO public.finance_budgets(workspace_id,category_id,period,budget_amount,source,notes,created_by)
    VALUES(ws,cat,per,amt,coalesce(nullif(p->>'source',''),'Manual'),nullif(p->>'notes',''),auth.uid())
    RETURNING * INTO rec;
  ELSE
    UPDATE public.finance_budgets SET budget_amount=amt,
      source=coalesce(nullif(p->>'source',''),'Manual'),
      notes=nullif(p->>'notes',''), updated_at=clock_timestamp()
      WHERE id=rec.id RETURNING * INTO rec;
  END IF;
  RETURN jsonb_build_object('id',rec.id,'workspace_id',rec.workspace_id,'category_id',rec.category_id,
    'period',rec.period,'budget_amount',rec.budget_amount::text,'source',rec.source,
    'notes',rec.notes,'updated_at',rec.updated_at);
END
$function$;

CREATE OR REPLACE FUNCTION public.fin_budgets_get(p_ws uuid, p_period text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  d date;
  d_end date;
  st public.finance_settings;
  out jsonb;
BEGIN
  PERFORM public.fin__need(p_ws, 'budgets', 'view');
  IF p_period IS NULL OR p_period !~ '^[0-9]{4}-(0[1-9]|1[0-2])$'
     OR to_char(to_date(p_period || '-01','YYYY-MM-DD'),'YYYY-MM') <> p_period THEN
    PERFORM public.fin__err('VALIDATION_FAILED','period must be YYYY-MM');
  END IF;
  d := to_date(p_period || '-01','YYYY-MM-DD');
  d_end := (d + interval '1 month')::date;
  SELECT * INTO st FROM public.finance_settings WHERE workspace_id=p_ws;
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id',b.id,'category_id',b.category_id,'category_name',c.name,'period',b.period,
    'budget_amount',b.budget_amount::text,'rollover_in',b.rollover_in::text,
    'source',b.source,'notes',b.notes,'currency',coalesce(st.base_currency,'EGP'),
    'spent',x.spent::text,'unvalued_count',x.unvalued_count,
    'remaining',(b.budget_amount+b.rollover_in-x.spent)::text,
    'used_pct',CASE WHEN b.budget_amount+b.rollover_in>0
      THEN round(x.spent/(b.budget_amount+b.rollover_in)*100,1)::text ELSE NULL END,
    'updated_at',b.updated_at
  ) ORDER BY (b.category_id IS NULL) DESC,c.name NULLS FIRST),'[]'::jsonb)
  INTO out
  FROM public.finance_budgets b
  LEFT JOIN public.finance_categories c ON c.id=b.category_id AND c.workspace_id=p_ws
  CROSS JOIN LATERAL (
    SELECT coalesce(sum(
      CASE WHEN EXISTS (SELECT 1 FROM public.finance_transaction_splits sx WHERE sx.transaction_id=t.id)
        THEN coalesce((SELECT sum(sx.base_amount) FROM public.finance_transaction_splits sx
          WHERE sx.transaction_id=t.id AND (b.category_id IS NULL OR sx.category_id=b.category_id)),0)
        WHEN b.category_id IS NULL OR t.category_id=b.category_id THEN coalesce(t.base_amount,0)
        ELSE 0 END
    ),0) AS spent,
    count(*) FILTER (WHERE t.base_missing OR t.base_amount IS NULL)::int AS unvalued_count
    FROM public.finance_transactions t
    WHERE t.workspace_id=p_ws AND t.status='Posted' AND t.pnl_effect='Expense'
      AND t.local_date>=d AND t.local_date<d_end
      AND (b.category_id IS NULL OR t.category_id=b.category_id OR EXISTS (
        SELECT 1 FROM public.finance_transaction_splits sx
        WHERE sx.transaction_id=t.id AND sx.category_id=b.category_id
      ))
  ) x
  WHERE b.workspace_id=p_ws AND b.period=p_period;
  RETURN out;
END
$function$;

CREATE OR REPLACE FUNCTION public.fin_budget_rollover_apply(p jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  ws uuid := nullif(p->>'workspace_id','')::uuid;
  src text := p->>'source_period';
  dst text := p->>'target_period';
  b public.finance_budgets;
  bj jsonb;
  carry numeric;
  cnt integer := 0;
  total_carry numeric := 0;
  inserted integer;
BEGIN
  PERFORM public.fin__need(ws,'budgets','edit');
  IF src IS NULL OR src !~ '^[0-9]{4}-(0[1-9]|1[0-2])$'
     OR to_char(to_date(src||'-01','YYYY-MM-DD'),'YYYY-MM')<>src THEN
    PERFORM public.fin__err('VALIDATION_FAILED','source_period must be YYYY-MM');
  END IF;
  IF dst IS NULL OR dst !~ '^[0-9]{4}-(0[1-9]|1[0-2])$'
     OR to_char(to_date(dst||'-01','YYYY-MM-DD'),'YYYY-MM')<>dst
     OR dst <> to_char((to_date(src||'-01','YYYY-MM-DD') + interval '1 month'),'YYYY-MM') THEN
    PERFORM public.fin__err('VALIDATION_FAILED','target_period must be the month immediately after source_period');
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(ws::text||':'||src||':'||dst,0));
  INSERT INTO public.finance_budget_rollover_runs(workspace_id,source_period,target_period,initiated_by)
    VALUES(ws,src,dst,auth.uid()) ON CONFLICT(workspace_id,source_period,target_period) DO NOTHING;
  GET DIAGNOSTICS inserted = ROW_COUNT;
  IF inserted = 0 THEN PERFORM public.fin__err('ROLLOVER_ALREADY_APPLIED','Rollover has already been applied for this month pair'); END IF;
  IF NOT EXISTS (SELECT 1 FROM public.finance_budgets WHERE workspace_id=ws AND period=src) THEN
    PERFORM public.fin__err('NO_BUDGETS_TO_ROLLOVER','No budgets exist in the source period');
  END IF;
  FOR b IN SELECT * FROM public.finance_budgets WHERE workspace_id=ws AND period=src LOOP
    SELECT j.value INTO bj
      FROM jsonb_array_elements(public.fin_budgets_get(ws,src)) AS j(value)
      WHERE (j.value->>'category_id') IS NOT DISTINCT FROM b.category_id::text
      LIMIT 1;
    carry := greatest(0,coalesce(nullif(bj->>'remaining','')::numeric,0));
    IF b.category_id IS NULL THEN
      UPDATE public.finance_budgets SET rollover_in=rollover_in+carry,source='Copied',updated_at=clock_timestamp()
        WHERE workspace_id=ws AND period=dst AND category_id IS NULL;
      IF NOT FOUND THEN
        INSERT INTO public.finance_budgets(workspace_id,category_id,period,budget_amount,rollover_in,source,notes,created_by)
          VALUES(ws,NULL,dst,b.budget_amount,carry,'Copied',b.notes,auth.uid());
      END IF;
    ELSE
      UPDATE public.finance_budgets SET rollover_in=rollover_in+carry,source='Copied',updated_at=clock_timestamp()
        WHERE workspace_id=ws AND period=dst AND category_id=b.category_id;
      IF NOT FOUND THEN
        INSERT INTO public.finance_budgets(workspace_id,category_id,period,budget_amount,rollover_in,source,notes,created_by)
          VALUES(ws,b.category_id,dst,b.budget_amount,carry,'Copied',b.notes,auth.uid());
      END IF;
    END IF;
    cnt:=cnt+1;
    total_carry:=total_carry+carry;
  END LOOP;
  RETURN jsonb_build_object('source_period',src,'target_period',dst,'copied_count',cnt,'rollover_amount',total_carry::text);
END
$function$;

REVOKE ALL ON FUNCTION public.fin_budget_upsert(jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.fin_budgets_get(uuid,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.fin_budget_rollover_apply(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fin_budget_upsert(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fin_budgets_get(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fin_budget_rollover_apply(jsonb) TO authenticated;
