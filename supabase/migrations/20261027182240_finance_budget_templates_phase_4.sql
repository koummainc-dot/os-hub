-- Finance OS Phase 4: reusable monthly budget templates.
CREATE TABLE public.finance_budget_templates (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
 name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 100),
 notes text,
 created_by uuid DEFAULT auth.uid(),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.finance_budget_template_lines (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 template_id uuid NOT NULL REFERENCES public.finance_budget_templates(id) ON DELETE CASCADE,
 category_id uuid REFERENCES public.finance_categories(id) ON DELETE RESTRICT,
 budget_amount numeric(20,4) NOT NULL CHECK (budget_amount >= 0),
 notes text,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX finance_budget_template_lines_overall_uq ON public.finance_budget_template_lines(template_id) WHERE category_id IS NULL;
CREATE UNIQUE INDEX finance_budget_template_lines_category_uq ON public.finance_budget_template_lines(template_id,category_id) WHERE category_id IS NOT NULL;
CREATE INDEX finance_budget_templates_workspace_idx ON public.finance_budget_templates(workspace_id,created_at DESC);
ALTER TABLE public.finance_budget_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_budget_template_lines ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.finance_budget_templates, public.finance_budget_template_lines FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.fin_budget_templates_get(p_ws uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $function$
DECLARE out jsonb;
BEGIN
 PERFORM public.fin__need(p_ws,'budgets','view');
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',t.id,'name',t.name,'notes',t.notes,'created_at',t.created_at,
 'line_count',(SELECT count(*) FROM public.finance_budget_template_lines l WHERE l.template_id=t.id),
 'lines',coalesce((SELECT jsonb_agg(jsonb_build_object('category_id',l.category_id,'category_name',c.name,'budget_amount',l.budget_amount::text,'notes',l.notes) ORDER BY (l.category_id IS NULL) DESC,c.name NULLS FIRST) FROM public.finance_budget_template_lines l LEFT JOIN public.finance_categories c ON c.id=l.category_id WHERE l.template_id=t.id),'[]'::jsonb)) ORDER BY t.created_at DESC),'[]'::jsonb)
 INTO out FROM public.finance_budget_templates t WHERE t.workspace_id=p_ws;
 RETURN out;
END $function$;

CREATE OR REPLACE FUNCTION public.fin_budget_template_save(p jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE ws uuid := nullif(p->>'workspace_id','')::uuid; per text := p->>'period'; nm text := btrim(coalesce(p->>'name','')); t public.finance_budget_templates; n integer;
BEGIN
 PERFORM public.fin__need(ws,'budgets','edit');
 IF length(nm) NOT BETWEEN 1 AND 100 THEN PERFORM public.fin__err('VALIDATION_FAILED','Template name must be 1-100 characters'); END IF;
 IF per IS NULL OR per !~ '^\\d{4}-(0[1-9]|1[0-2])$' OR to_char(to_date(per||'-01','YYYY-MM-DD'),'YYYY-MM')<>per THEN PERFORM public.fin__err('VALIDATION_FAILED','period must be YYYY-MM'); END IF;
 SELECT * INTO t FROM public.finance_budget_templates WHERE workspace_id=ws AND name=nm LIMIT 1;
 IF t.id IS NULL THEN INSERT INTO public.finance_budget_templates(workspace_id,name,notes,created_by) VALUES(ws,nm,nullif(p->>'notes',''),auth.uid()) RETURNING * INTO t;
 ELSE UPDATE public.finance_budget_templates SET notes=nullif(p->>'notes',''),updated_at=clock_timestamp() WHERE id=t.id RETURNING * INTO t; DELETE FROM public.finance_budget_template_lines WHERE template_id=t.id; END IF;
 INSERT INTO public.finance_budget_template_lines(template_id,category_id,budget_amount,notes) SELECT t.id,b.category_id,b.budget_amount,b.notes FROM public.finance_budgets b WHERE b.workspace_id=ws AND b.period=per;
 GET DIAGNOSTICS n = ROW_COUNT;
 IF n=0 THEN PERFORM public.fin__err('NO_BUDGETS_TO_SAVE','Add at least one budget for this period before saving a template'); END IF;
 RETURN jsonb_build_object('id',t.id,'name',t.name,'period',per,'line_count',n);
END $function$;

CREATE OR REPLACE FUNCTION public.fin_budget_template_apply(p jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE ws uuid := nullif(p->>'workspace_id','')::uuid; tid uuid := nullif(p->>'template_id','')::uuid; per text := p->>'period'; t public.finance_budget_templates; l record; n integer := 0;
BEGIN
 PERFORM public.fin__need(ws,'budgets','edit');
 IF per IS NULL OR per !~ '^\\d{4}-(0[1-9]|1[0-2])$' OR to_char(to_date(per||'-01','YYYY-MM-DD'),'YYYY-MM')<>per THEN PERFORM public.fin__err('VALIDATION_FAILED','period must be YYYY-MM'); END IF;
 SELECT * INTO t FROM public.finance_budget_templates WHERE id=tid AND workspace_id=ws;
 IF t.id IS NULL THEN PERFORM public.fin__err('TEMPLATE_NOT_FOUND','Template does not exist in this workspace'); END IF;
 FOR l IN SELECT * FROM public.finance_budget_template_lines WHERE template_id=tid LOOP
  IF l.category_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.finance_categories c WHERE c.id=l.category_id AND c.workspace_id=ws AND c.archived=false AND c.kind IN ('Expense','Both')) THEN PERFORM public.fin__err('CATEGORY_NOT_FOUND','A template category is no longer available; update the template before applying it'); END IF;
  IF l.category_id IS NULL THEN
   UPDATE public.finance_budgets SET budget_amount=l.budget_amount,source='Template',notes=l.notes,updated_at=clock_timestamp() WHERE workspace_id=ws AND period=per AND category_id IS NULL;
   IF NOT FOUND THEN INSERT INTO public.finance_budgets(workspace_id,category_id,period,budget_amount,rollover_in,source,notes,created_by) VALUES(ws,NULL,per,l.budget_amount,0,'Template',l.notes,auth.uid()); END IF;
  ELSE
   UPDATE public.finance_budgets SET budget_amount=l.budget_amount,source='Template',notes=l.notes,updated_at=clock_timestamp() WHERE workspace_id=ws AND period=per AND category_id=l.category_id;
   IF NOT FOUND THEN INSERT INTO public.finance_budgets(workspace_id,category_id,period,budget_amount,rollover_in,source,notes,created_by) VALUES(ws,l.category_id,per,l.budget_amount,0,'Template',l.notes,auth.uid()); END IF;
  END IF;
  n:=n+1;
 END LOOP;
 RETURN jsonb_build_object('template_id',tid,'template_name',t.name,'period',per,'applied_count',n);
END $function$;
REVOKE ALL ON FUNCTION public.fin_budget_templates_get(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.fin_budget_template_save(jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.fin_budget_template_apply(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fin_budget_templates_get(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fin_budget_template_save(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fin_budget_template_apply(jsonb) TO authenticated;
ALTER FUNCTION public.fin_budget_templates_get(uuid) SET search_path = '';
ALTER FUNCTION public.fin_budget_template_save(jsonb) SET search_path = '';
ALTER FUNCTION public.fin_budget_template_apply(jsonb) SET search_path = '';