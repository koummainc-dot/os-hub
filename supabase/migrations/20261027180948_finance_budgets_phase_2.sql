CREATE TABLE public.finance_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  category_id uuid NULL REFERENCES public.finance_categories(id) ON DELETE RESTRICT,
  period text NOT NULL CHECK (period ~ '^\\d{4}-(0[1-9]|1[0-2])$'),
  budget_amount numeric(20,4) NOT NULL DEFAULT 0 CHECK (budget_amount >= 0),
  rollover_in numeric(20,4) NOT NULL DEFAULT 0 CHECK (rollover_in >= 0),
  source text NOT NULL DEFAULT 'Manual' CHECK (source IN ('Manual','Template','Copied')),
  notes text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX finance_budgets_workspace_period_all_uq
  ON public.finance_budgets(workspace_id, period) WHERE category_id IS NULL;
CREATE UNIQUE INDEX finance_budgets_workspace_period_category_uq
  ON public.finance_budgets(workspace_id, period, category_id) WHERE category_id IS NOT NULL;
ALTER TABLE public.finance_budgets ENABLE ROW LEVEL SECURITY;

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
  SELECT * INTO st FROM public.finance_settings WHERE workspace_id = p_ws;
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id', b.id, 'category_id', b.category_id, 'category_name', c.name, 'period', b.period,
    'budget_amount', b.budget_amount::text, 'rollover_in', b.rollover_in::text,
    'source', b.source, 'notes', b.notes, 'currency', coalesce(st.base_currency,'EGP'),
    'spent', x.spent::text, 'unvalued_count', x.unvalued_count,
    'remaining', (b.budget_amount + b.rollover_in - x.spent)::text,
    'used_pct', CASE WHEN b.budget_amount + b.rollover_in > 0 THEN round(x.spent / (b.budget_amount + b.rollover_in) * 100, 1)::text ELSE NULL END,
    'updated_at', b.updated_at
  ) ORDER BY (b.category_id IS NULL) DESC, c.name NULLS FIRST), '[]'::jsonb)
  INTO out
  FROM public.finance_budgets b
  LEFT JOIN public.finance_categories c ON c.id = b.category_id AND c.workspace_id = p_ws
  CROSS JOIN LATERAL (
    SELECT coalesce(sum(t.base_amount),0) AS spent,
           count(*) FILTER (WHERE t.base_missing OR t.base_amount IS NULL)::int AS unvalued_count
    FROM public.finance_transactions t
    WHERE t.workspace_id = p_ws AND t.status = 'Posted' AND t.pnl_effect = 'Expense'
      AND t.local_date >= d AND t.local_date < d_end
      AND (b.category_id IS NULL OR t.category_id = b.category_id)
  ) x
  WHERE b.workspace_id = p_ws AND b.period = p_period;
  RETURN out;
END $function$;

CREATE OR REPLACE FUNCTION public.fin_budget_upsert(p jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $function$
DECLARE ws uuid := (p->>'workspace_id')::uuid; cat uuid := nullif(p->>'category_id','')::uuid;
  per text := p->>'period'; amt numeric; rec public.finance_budgets; nm text;
BEGIN
  PERFORM public.fin__need(ws, 'budgets', 'edit');
  IF per IS NULL OR per !~ '^\\d{4}-(0[1-9]|1[0-2])$' OR to_char(to_date(per || '-01','YYYY-MM-DD'),'YYYY-MM') <> per THEN
    PERFORM public.fin__err('VALIDATION_FAILED','period must be YYYY-MM');
  END IF;
  amt := public.fin__num(p,'budget_amount');
  IF amt IS NULL OR amt < 0 THEN PERFORM public.fin__err('VALIDATION_FAILED','budget_amount must be >= 0'); END IF;
  IF cat IS NOT NULL THEN
    SELECT kind INTO nm FROM public.finance_categories WHERE id = cat AND workspace_id = ws AND archived = false;
    IF nm IS NULL THEN PERFORM public.fin__err('CATEGORY_NOT_FOUND'); END IF;
    IF nm NOT IN ('Expense','Both') THEN PERFORM public.fin__err('CATEGORY_KIND_INVALID','budget requires an Expense or Both category'); END IF;
  END IF;
  IF cat IS NULL THEN
    SELECT * INTO rec FROM public.finance_budgets WHERE workspace_id=ws AND period=per AND category_id IS NULL FOR UPDATE;
  ELSE
    SELECT * INTO rec FROM public.finance_budgets WHERE workspace_id=ws AND period=per AND category_id=cat FOR UPDATE;
  END IF;
  IF rec.id IS NULL THEN
    INSERT INTO public.finance_budgets(workspace_id,category_id,period,budget_amount,source,notes,created_by)
    VALUES(ws,cat,per,amt,coalesce(nullif(p->>'source',''),'Manual'),nullif(p->>'notes',''),auth.uid())
    RETURNING * INTO rec;
  ELSE
    UPDATE public.finance_budgets SET budget_amount=amt, source=coalesce(nullif(p->>'source',''),'Manual'),
      notes=nullif(p->>'notes',''), updated_at=clock_timestamp()
    WHERE id=rec.id RETURNING * INTO rec;
  END IF;
  RETURN jsonb_build_object('id',rec.id,'workspace_id',rec.workspace_id,'category_id',rec.category_id,'period',rec.period,
    'budget_amount',rec.budget_amount::text,'source',rec.source,'notes',rec.notes,'updated_at',rec.updated_at);
END $function$;

REVOKE ALL ON FUNCTION public.fin_budgets_get(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fin_budgets_get(uuid,text) TO authenticated;
REVOKE ALL ON FUNCTION public.fin_budget_upsert(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fin_budget_upsert(jsonb) TO authenticated;
