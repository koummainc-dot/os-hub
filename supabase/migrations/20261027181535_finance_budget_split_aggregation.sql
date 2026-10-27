CREATE OR REPLACE FUNCTION public.fin_budgets_get(p_ws uuid, p_period text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $function$
DECLARE d date; d_end date; st public.finance_settings; out jsonb;
BEGIN
 PERFORM public.fin__need(p_ws, 'budgets', 'view');
 IF p_period IS NULL OR p_period !~ '^\\d{4}-(0[1-9]|1[0-2])$' OR to_char(to_date(p_period || '-01','YYYY-MM-DD'),'YYYY-MM') <> p_period THEN
   PERFORM public.fin__err('VALIDATION_FAILED','period must be YYYY-MM');
 END IF;
 d := to_date(p_period || '-01','YYYY-MM-DD'); d_end := (d + interval '1 month')::date;
 SELECT * INTO st FROM public.finance_settings WHERE workspace_id=p_ws;
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',b.id,'category_id',b.category_id,'category_name',c.name,'period',b.period,'budget_amount',b.budget_amount::text,'rollover_in',b.rollover_in::text,'source',b.source,'notes',b.notes,'currency',coalesce(st.base_currency,'EGP'),'spent',x.spent::text,'unvalued_count',x.unvalued_count,'remaining',(b.budget_amount+b.rollover_in-x.spent)::text,'used_pct',CASE WHEN b.budget_amount+b.rollover_in>0 THEN round(x.spent/(b.budget_amount+b.rollover_in)*100,1)::text ELSE NULL END,'updated_at',b.updated_at) ORDER BY (b.category_id IS NULL) DESC,c.name NULLS FIRST),'[]'::jsonb)
 INTO out FROM public.finance_budgets b
 LEFT JOIN public.finance_categories c ON c.id=b.category_id AND c.workspace_id=p_ws
 CROSS JOIN LATERAL (
   SELECT coalesce(sum(CASE
     WHEN EXISTS (SELECT 1 FROM public.finance_transaction_splits sx WHERE sx.transaction_id=t.id)
       THEN coalesce((SELECT sum(sx.base_amount) FROM public.finance_transaction_splits sx WHERE sx.transaction_id=t.id AND (b.category_id IS NULL OR sx.category_id=b.category_id)),0)
     WHEN b.category_id IS NULL OR t.category_id=b.category_id THEN coalesce(t.base_amount,0)
     ELSE 0 END),0) AS spent,
     count(*) FILTER (WHERE t.base_missing OR t.base_amount IS NULL)::int AS unvalued_count
   FROM public.finance_transactions t
   WHERE t.workspace_id=p_ws AND t.status='Posted' AND t.pnl_effect='Expense' AND t.local_date>=d AND t.local_date<d_end
     AND (b.category_id IS NULL OR t.category_id=b.category_id OR EXISTS (SELECT 1 FROM public.finance_transaction_splits sx WHERE sx.transaction_id=t.id AND sx.category_id=b.category_id))
 ) x WHERE b.workspace_id=p_ws AND b.period=p_period;
 RETURN out;
END $function$;