-- Server-side reporting analytics: aggregate the full ledger, not just the latest 1,500 rows.
CREATE OR REPLACE FUNCTION public.fin_reports_analytics_get(p jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  ws uuid := nullif(p->>'workspace_id','')::uuid;
  per text := p->>'period';
  acc uuid := nullif(p->>'account_id','')::uuid;
  cat uuid := nullif(p->>'category_id','')::uuid;
  typ text := coalesce(nullif(p->>'transaction_type',''),'All');
  q text := nullif(btrim(p->>'search'),'');
  d date;
  d_end date;
  prev_start date;
  trend_start date;
  out jsonb;
BEGIN
  PERFORM public.fin__need(ws,'ledger','view');
  IF per IS NULL OR per !~ '^[0-9]{4}-(0[1-9]|1[0-2])$'
    OR to_char(to_date(per||'-01','YYYY-MM-DD'),'YYYY-MM')<>per THEN
    PERFORM public.fin__err('VALIDATION_FAILED','period must be YYYY-MM');
  END IF;
  IF typ NOT IN ('All','Income','Expense','Transfer') THEN
    PERFORM public.fin__err('VALIDATION_FAILED','invalid transaction_type');
  END IF;
  d:=to_date(per||'-01','YYYY-MM-DD');
  d_end:=(d+interval '1 month')::date;
  prev_start:=(d-interval '1 month')::date;
  trend_start:=(d-interval '11 months')::date;

  WITH eligible AS (
    SELECT t.*
    FROM public.finance_transactions t
    WHERE t.workspace_id=ws AND t.status='Posted'
      AND t.local_date>=trend_start AND t.local_date<d_end
      AND (typ='All' OR t.type=typ)
      AND (acc IS NULL OR t.from_account_id=acc OR t.to_account_id=acc)
      AND (cat IS NULL OR t.category_id=cat OR EXISTS(
        SELECT 1 FROM public.finance_transaction_splits s WHERE s.transaction_id=t.id AND s.category_id=cat
      ))
      AND (q IS NULL OR t.name ILIKE '%'||q||'%' OR coalesce(t.merchant,'') ILIKE '%'||q||'%' OR coalesce(t.notes,'') ILIKE '%'||q||'%')
  ),
  current_tx AS (
    SELECT * FROM eligible WHERE local_date>=d AND local_date<d_end
  ),
  prev_tx AS (
    SELECT * FROM eligible WHERE local_date>=prev_start AND local_date<d
  ),
  summary AS (
    SELECT
      coalesce(sum(base_amount) FILTER(WHERE pnl_effect='Income' AND type<>'Transfer'),0) AS income,
      coalesce(sum(base_amount) FILTER(WHERE pnl_effect='Expense' AND type<>'Transfer'),0) AS expense,
      count(*) FILTER(WHERE type='Transfer')::int AS transfers,
      count(*) FILTER(WHERE type IN ('Income','Expense') AND (base_amount IS NULL OR base_missing))::int AS unvalued,
      count(*)::int AS transaction_count
    FROM current_tx
  ),
  previous_summary AS (
    SELECT
      coalesce(sum(base_amount) FILTER(WHERE pnl_effect='Income' AND type<>'Transfer'),0) AS income,
      coalesce(sum(base_amount) FILTER(WHERE pnl_effect='Expense' AND type<>'Transfer'),0) AS expense,
      count(*) FILTER(WHERE type IN ('Income','Expense') AND (base_amount IS NULL OR base_missing))::int AS unvalued,
      count(*) FILTER(WHERE type='Transfer')::int AS transfers,
      count(*)::int AS transaction_count
    FROM prev_tx
  ),
  trend AS (
    SELECT date_trunc('month',local_date)::date AS month,
      coalesce(sum(base_amount) FILTER(WHERE pnl_effect='Income' AND type<>'Transfer'),0) AS income,
      coalesce(sum(base_amount) FILTER(WHERE pnl_effect='Expense' AND type<>'Transfer'),0) AS expense,
      count(*)::int AS transaction_count
    FROM eligible
    GROUP BY date_trunc('month',local_date)::date
  ),
  months AS (
    SELECT generate_series(trend_start,d-interval '1 day',interval '1 month')::date AS month
  ),
  lines AS (
    SELECT t.id AS transaction_id,t.local_date,t.pnl_effect,t.type,t.base_amount AS amount,
      t.category_id,t.base_missing OR t.base_amount IS NULL AS is_unvalued,t.merchant
    FROM current_tx t
    WHERE NOT EXISTS(SELECT 1 FROM public.finance_transaction_splits s WHERE s.transaction_id=t.id)
    UNION ALL
    SELECT t.id AS transaction_id,t.local_date,t.pnl_effect,t.type,s.base_amount AS amount,
      s.category_id,t.base_missing OR s.base_amount IS NULL AS is_unvalued,t.merchant
    FROM current_tx t
    JOIN public.finance_transaction_splits s ON s.transaction_id=t.id
  ),
  category_rollup AS (
    SELECT l.pnl_effect,l.category_id,coalesce(c.name,'بدون تصنيف') AS category_name,
      coalesce(sum(l.amount),0) AS amount,
      count(DISTINCT l.transaction_id)::int AS transaction_count,
      count(DISTINCT l.transaction_id) FILTER(WHERE l.is_unvalued)::int AS unvalued_count
    FROM lines l
    LEFT JOIN public.finance_categories c ON c.id=l.category_id AND c.workspace_id=ws
    WHERE l.pnl_effect IN ('Income','Expense')
    GROUP BY l.pnl_effect,l.category_id,c.name
  ),
  merchants AS (
    SELECT coalesce(nullif(btrim(merchant),''),'بدون تاجر') AS merchant,
      coalesce(sum(base_amount),0) AS amount,count(*)::int AS transaction_count
    FROM current_tx
    WHERE pnl_effect='Expense' AND type<>'Transfer'
    GROUP BY coalesce(nullif(btrim(merchant),''),'بدون تاجر')
    ORDER BY amount DESC
    LIMIT 10
  ),
  recent AS (
    SELECT t.id,t.name,t.type,t.amount::text AS amount,t.currency,t.local_date,
      t.base_amount::text AS base_amount,t.base_missing,t.category_id,c.name AS category_name,
      t.merchant,t.from_account_id,t.to_account_id,
      coalesce(a1.name,a2.name) AS account_name
    FROM current_tx t
    LEFT JOIN public.finance_categories c ON c.id=t.category_id AND c.workspace_id=ws
    LEFT JOIN public.finance_accounts a1 ON a1.id=t.from_account_id AND a1.workspace_id=ws
    LEFT JOIN public.finance_accounts a2 ON a2.id=t.to_account_id AND a2.workspace_id=ws
    ORDER BY t.local_date DESC,t.created_at DESC
    LIMIT 25
  )
  SELECT jsonb_build_object(
    'period',per,
    'summary',(SELECT jsonb_build_object('income',income::text,'expense',expense::text,'net',(income-expense)::text,'transfers',transfers,'unvalued',unvalued,'transaction_count',transaction_count) FROM summary),
    'previous_summary',(SELECT jsonb_build_object('income',income::text,'expense',expense::text,'net',(income-expense)::text,'transfers',transfers,'unvalued',unvalued,'transaction_count',transaction_count) FROM previous_summary),
    'months',(SELECT coalesce(jsonb_agg(jsonb_build_object('month',to_char(m.month,'YYYY-MM'),'income',coalesce(t.income,0)::text,'expense',coalesce(t.expense,0)::text,'net',(coalesce(t.income,0)-coalesce(t.expense,0))::text,'transaction_count',coalesce(t.transaction_count,0)) ORDER BY m.month),'[]'::jsonb) FROM months m LEFT JOIN trend t ON t.month=m.month),
    'expense_categories',(SELECT coalesce(jsonb_agg(jsonb_build_object('category_id',category_id,'category_name',category_name,'amount',amount::text,'transaction_count',transaction_count,'unvalued_count',unvalued_count) ORDER BY amount DESC),'[]'::jsonb) FROM category_rollup WHERE pnl_effect='Expense'),
    'income_categories',(SELECT coalesce(jsonb_agg(jsonb_build_object('category_id',category_id,'category_name',category_name,'amount',amount::text,'transaction_count',transaction_count,'unvalued_count',unvalued_count) ORDER BY amount DESC),'[]'::jsonb) FROM category_rollup WHERE pnl_effect='Income'),
    'merchants',(SELECT coalesce(jsonb_agg(jsonb_build_object('merchant',merchant,'amount',amount::text,'transaction_count',transaction_count) ORDER BY amount DESC),'[]'::jsonb) FROM merchants),
    'recent_transactions',(SELECT coalesce(jsonb_agg(to_jsonb(recent)),'[]'::jsonb) FROM recent)
  ) INTO out;
  RETURN out;
END
$function$;
REVOKE ALL ON FUNCTION public.fin_reports_analytics_get(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fin_reports_analytics_get(jsonb) TO authenticated;
