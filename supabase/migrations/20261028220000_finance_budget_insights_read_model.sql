-- Read model for a market-style monthly budget experience, including unbudgeted categories.
CREATE OR REPLACE FUNCTION public.fin_budget_insights_get(p_ws uuid, p_period text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  d date;
  d_end date;
  out jsonb;
BEGIN
  PERFORM public.fin__need(p_ws,'budgets','view');
  IF p_period IS NULL OR p_period !~ '^[0-9]{4}-(0[1-9]|1[0-2])$'
     OR to_char(to_date(p_period||'-01','YYYY-MM-DD'),'YYYY-MM')<>p_period THEN
    PERFORM public.fin__err('VALIDATION_FAILED','period must be YYYY-MM');
  END IF;
  d:=to_date(p_period||'-01','YYYY-MM-DD');
  d_end:=(d+interval '1 month')::date;
  WITH expense_lines AS (
    SELECT t.id AS transaction_id,t.category_id,t.base_amount,
      (t.base_missing OR t.base_amount IS NULL) AS is_unvalued
    FROM public.finance_transactions t
    WHERE t.workspace_id=p_ws AND t.status='Posted' AND t.pnl_effect='Expense'
      AND t.local_date>=d AND t.local_date<d_end
      AND NOT EXISTS(SELECT 1 FROM public.finance_transaction_splits s WHERE s.transaction_id=t.id)
    UNION ALL
    SELECT t.id AS transaction_id,s.category_id,s.base_amount,
      (t.base_missing OR s.base_amount IS NULL) AS is_unvalued
    FROM public.finance_transactions t
    JOIN public.finance_transaction_splits s ON s.transaction_id=t.id
    WHERE t.workspace_id=p_ws AND t.status='Posted' AND t.pnl_effect='Expense'
      AND t.local_date>=d AND t.local_date<d_end
  ),
  totals AS (
    SELECT coalesce(sum(base_amount),0) AS total_spent,
      count(DISTINCT transaction_id) FILTER(WHERE is_unvalued)::int AS unvalued_transactions,
      count(DISTINCT transaction_id)::int AS transaction_count
    FROM expense_lines
  ),
  category_rows AS (
    SELECT c.id AS category_id,c.name AS category_name,b.id AS budget_id,
      b.budget_amount::text AS budget_amount,b.rollover_in::text AS rollover_in,
      coalesce(x.spent,0)::text AS spent,coalesce(x.unvalued_count,0)::int AS unvalued_count,
      coalesce(x.transaction_count,0)::int AS transaction_count,
      (b.id IS NULL) AS is_unbudgeted
    FROM public.finance_categories c
    LEFT JOIN public.finance_budgets b ON b.workspace_id=p_ws AND b.period=p_period AND b.category_id=c.id
    LEFT JOIN LATERAL (
      SELECT coalesce(sum(e.base_amount),0) AS spent,
        count(DISTINCT e.transaction_id) FILTER(WHERE e.is_unvalued)::int AS unvalued_count,
        count(DISTINCT e.transaction_id)::int AS transaction_count
      FROM expense_lines e WHERE e.category_id=c.id
    ) x ON true
    WHERE c.workspace_id=p_ws AND c.archived=false AND c.kind IN ('Expense','Both')
    UNION ALL
    SELECT NULL::uuid,'غير مصنف',NULL::uuid,NULL::text,NULL::text,
      coalesce(x.spent,0)::text,coalesce(x.unvalued_count,0)::int,
      coalesce(x.transaction_count,0)::int,true
    FROM (SELECT 1) seed
    LEFT JOIN LATERAL (
      SELECT coalesce(sum(e.base_amount),0) AS spent,
        count(DISTINCT e.transaction_id) FILTER(WHERE e.is_unvalued)::int AS unvalued_count,
        count(DISTINCT e.transaction_id)::int AS transaction_count
      FROM expense_lines e WHERE e.category_id IS NULL
    ) x ON true
  )
  SELECT jsonb_build_object(
    'period',p_period,
    'summary',(SELECT jsonb_build_object('total_spent',total_spent::text,'unvalued_transactions',unvalued_transactions,'transaction_count',transaction_count) FROM totals),
    'overall_budget',(SELECT CASE WHEN b.id IS NULL THEN NULL ELSE jsonb_build_object('id',b.id,'budget_amount',b.budget_amount::text,'rollover_in',b.rollover_in::text,'notes',b.notes,'source',b.source) END FROM public.finance_budgets b WHERE b.workspace_id=p_ws AND b.period=p_period AND b.category_id IS NULL),
    'categories',(SELECT coalesce(jsonb_agg(jsonb_build_object(
      'category_id',category_id,'category_name',category_name,'budget_id',budget_id,
      'budget_amount',budget_amount,'rollover_in',rollover_in,'spent',spent,
      'unvalued_count',unvalued_count,'transaction_count',transaction_count,'is_unbudgeted',is_unbudgeted
    ) ORDER BY (category_id IS NULL), (spent::numeric) DESC, category_name),'[]'::jsonb) FROM category_rows)
  ) INTO out;
  RETURN out;
END
$function$;

REVOKE ALL ON FUNCTION public.fin_budget_insights_get(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fin_budget_insights_get(uuid,text) TO authenticated;
