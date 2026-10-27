-- Finance OS Phase 15: finance-only projects and transaction links.
CREATE TABLE IF NOT EXISTS public.finance_projects (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid NOT NULL,
 name text NOT NULL CHECK(length(btrim(name)) BETWEEN 1 AND 160),
 project_type text NOT NULL DEFAULT 'Other' CHECK(project_type IN ('Freelance','Startup','Content','Side Business','Investment','Other')),
 budget numeric(20,2) CHECK(budget IS NULL OR budget>=0), currency text NOT NULL DEFAULT 'EGP' CHECK(currency ~ '^[A-Z]{3}$'),
 start_date date NOT NULL DEFAULT current_date, end_date date,
 status text NOT NULL DEFAULT 'Planning' CHECK(status IN ('Planning','Active','On Hold','Completed','Cancelled')),
 scope text NOT NULL DEFAULT 'Personal' CHECK(scope IN ('Personal','Business')),
 project_ref text, area_ref text,
 roi_basis text NOT NULL DEFAULT 'ExpensesLinked' CHECK(roi_basis IN ('ExpensesLinked','DeclaredCapital')),
 invested_capital numeric(20,2) CHECK(invested_capital IS NULL OR invested_capital>=0),
 notes text, created_by uuid, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(workspace_id,id), CHECK(end_date IS NULL OR end_date>=start_date),
 CHECK(roi_basis<>'DeclaredCapital' OR invested_capital IS NOT NULL)
);
CREATE TABLE IF NOT EXISTS public.finance_project_transactions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid NOT NULL,
 project_id uuid NOT NULL REFERENCES public.finance_projects(id) ON DELETE RESTRICT,
 transaction_id uuid NOT NULL REFERENCES public.finance_transactions(id) ON DELETE RESTRICT,
 linked_by uuid, linked_at timestamptz NOT NULL DEFAULT now(), UNIQUE(workspace_id,transaction_id)
);
CREATE INDEX IF NOT EXISTS finance_projects_workspace_status_idx ON public.finance_projects(workspace_id,status,updated_at DESC);
CREATE INDEX IF NOT EXISTS finance_project_transactions_project_idx ON public.finance_project_transactions(workspace_id,project_id,linked_at DESC);
ALTER TABLE public.finance_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_project_transactions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.finance_projects,public.finance_project_transactions FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.fin_projects_get(p_ws uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $function$
DECLARE pr public.finance_projects; st public.finance_settings; txs jsonb; result jsonb:='[]'::jsonb;
 revenue numeric; expenses numeric; invest_base numeric; budget_base numeric; roi numeric; rate numeric;
 unvalued integer; last_activity date; month_count integer;
BEGIN
 PERFORM public.fin__need(p_ws,'dashboard','view'); st:=public.fin__settings(p_ws);
 FOR pr IN SELECT * FROM public.finance_projects WHERE workspace_id=p_ws ORDER BY updated_at DESC,created_at DESC LOOP
  SELECT coalesce(sum(CASE WHEN t.pnl_effect='Income' THEN t.base_amount*CASE WHEN t.reversal_of_id IS NULL THEN 1 ELSE -1 END END),0),
   coalesce(sum(CASE WHEN t.pnl_effect='Expense' THEN t.base_amount*CASE WHEN t.reversal_of_id IS NULL THEN 1 ELSE -1 END
    WHEN t.pnl_effect='ExpenseReduction' THEN -t.base_amount*CASE WHEN t.reversal_of_id IS NULL THEN 1 ELSE -1 END ELSE 0 END),0),
   count(*) FILTER(WHERE t.base_missing),max(t.local_date)
  INTO revenue,expenses,unvalued,last_activity
  FROM public.finance_project_transactions l JOIN public.finance_transactions t ON t.id=l.transaction_id AND t.workspace_id=l.workspace_id
  WHERE l.workspace_id=p_ws AND l.project_id=pr.id AND t.status IN ('Posted','Reversed');
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',t.id,'name',t.name,'type',t.type,'purpose',t.purpose,'status',t.status,
   'amount',t.amount::text,'currency',t.currency,'local_date',t.local_date,'pnl_effect',t.pnl_effect,'base_amount',t.base_amount::text,
   'base_currency',t.base_currency,'base_missing',t.base_missing,'category_id',t.category_id) ORDER BY t.local_date DESC,t.created_at DESC),'[]'::jsonb)
  INTO txs FROM public.finance_project_transactions l JOIN public.finance_transactions t ON t.id=l.transaction_id AND t.workspace_id=l.workspace_id
  WHERE l.workspace_id=p_ws AND l.project_id=pr.id;
  rate:=public.fin__rate(p_ws,pr.currency,(now() AT TIME ZONE st.timezone)::date);
  budget_base:=CASE WHEN pr.budget IS NOT NULL AND rate IS NOT NULL THEN pr.budget*rate ELSE NULL END;
  invest_base:=CASE WHEN pr.invested_capital IS NOT NULL AND rate IS NOT NULL THEN pr.invested_capital*rate ELSE NULL END;
  month_count:=greatest(1,(extract(year FROM age((now() AT TIME ZONE st.timezone)::date,pr.start_date))*12+
   extract(month FROM age((now() AT TIME ZONE st.timezone)::date,pr.start_date))+1)::integer);
  roi:=CASE WHEN pr.roi_basis='Disabled' THEN NULL
   WHEN pr.roi_basis='ExpensesLinked' AND expenses>0 THEN round((revenue-expenses)/expenses*100,2)
   WHEN pr.roi_basis='DeclaredCapital' AND coalesce(invest_base,0)>0 THEN round((revenue-expenses)/invest_base*100,2) ELSE NULL END;
  result:=result||jsonb_build_array(jsonb_build_object('id',pr.id,'name',pr.name,'project_type',pr.project_type,'budget',pr.budget::text,
   'currency',pr.currency,'start_date',pr.start_date,'end_date',pr.end_date,'status',pr.status,'scope',pr.scope,'project_ref',pr.project_ref,
   'area_ref',pr.area_ref,'roi_basis',pr.roi_basis,'invested_capital',pr.invested_capital::text,'notes',pr.notes,'created_at',pr.created_at,
   'updated_at',pr.updated_at,'base_currency',st.base_currency,'revenue_base',revenue::text,'expenses_base',expenses::text,
   'net_profit_base',(revenue-expenses)::text,'budget_base',budget_base::text,
   'budget_used_pct',CASE WHEN budget_base>0 THEN round(expenses/budget_base*100,2)::text ELSE NULL END,
   'roi_pct',roi::text,'roi_measurable',roi IS NOT NULL,'monthly_burn_base',round(expenses/month_count,2)::text,
   'unvalued_transactions',unvalued,'last_activity',last_activity,'transactions',txs));
 END LOOP;
 RETURN result;
END
$function$;

CREATE OR REPLACE FUNCTION public.fin_project_save(p jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $function$
DECLARE ws uuid:=(p->>'workspace_id')::uuid; pid uuid:=nullif(p->>'id','')::uuid;
 nm text:=nullif(btrim(p->>'name'),''); typ text:=coalesce(nullif(p->>'project_type',''),'Other');
 ccy text:=upper(coalesce(nullif(p->>'currency',''),'EGP')); stt text:=coalesce(nullif(p->>'status',''),'Planning');
 scp text:=coalesce(nullif(p->>'scope',''),'Personal'); basis text:=coalesce(nullif(p->>'roi_basis',''),'ExpensesLinked');
 bud numeric:=nullif(p->>'budget','')::numeric; inv numeric:=nullif(p->>'invested_capital','')::numeric;
 sd date:=coalesce(nullif(p->>'start_date','')::date,current_date); ed date:=nullif(p->>'end_date','')::date;
BEGIN
 PERFORM public.fin__need(ws,'ledger','edit');
 IF nm IS NULL OR length(nm)>160 OR typ NOT IN ('Freelance','Startup','Content','Side Business','Investment','Other')
  OR ccy !~ '^[A-Z]{3}$' OR stt NOT IN ('Planning','Active','On Hold','Completed','Cancelled')
  OR scp NOT IN ('Personal','Business') OR basis NOT IN ('ExpensesLinked','DeclaredCapital','Disabled')
  OR (bud IS NOT NULL AND bud<0) OR (inv IS NOT NULL AND inv<0) OR (ed IS NOT NULL AND ed<sd)
  OR (basis='DeclaredCapital' AND inv IS NULL) THEN PERFORM public.fin__err('VALIDATION_FAILED','invalid finance project fields'); END IF;
 IF pid IS NULL THEN
  INSERT INTO public.finance_projects(workspace_id,name,project_type,budget,currency,start_date,end_date,status,scope,project_ref,area_ref,roi_basis,invested_capital,notes,created_by)
  VALUES(ws,nm,typ,bud,ccy,sd,ed,stt,scp,nullif(p->>'project_ref',''),nullif(p->>'area_ref',''),basis,inv,nullif(p->>'notes',''),auth.uid()) RETURNING id INTO pid;
  PERFORM public.fin__audit(ws,auth.uid(),'project',pid::text,'create',null,null,jsonb_build_object('name',nm,'status',stt,'scope',scp));
 ELSE
  UPDATE public.finance_projects SET name=nm,project_type=typ,budget=bud,currency=ccy,start_date=sd,end_date=ed,status=stt,scope=scp,
   project_ref=nullif(p->>'project_ref',''),area_ref=nullif(p->>'area_ref',''),roi_basis=basis,invested_capital=inv,notes=nullif(p->>'notes',''),updated_at=now()
  WHERE workspace_id=ws AND id=pid;
  IF NOT FOUND THEN PERFORM public.fin__err('OWNERSHIP_MISMATCH','finance project'); END IF;
  PERFORM public.fin__audit(ws,auth.uid(),'project',pid::text,'update',null,null,jsonb_build_object('name',nm,'status',stt,'scope',scp));
 END IF;
 RETURN jsonb_build_object('id',pid,'saved',true);
END
$function$;

CREATE OR REPLACE FUNCTION public.fin_project_transaction_link(p jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $function$
DECLARE ws uuid:=(p->>'workspace_id')::uuid; pid uuid:=(p->>'project_id')::uuid; tid uuid:=(p->>'transaction_id')::uuid; existing_project uuid;
BEGIN
 PERFORM public.fin__need(ws,'ledger','edit');
 IF NOT EXISTS(SELECT 1 FROM public.finance_projects WHERE workspace_id=ws AND id=pid) THEN PERFORM public.fin__err('OWNERSHIP_MISMATCH','finance project'); END IF;
 IF NOT EXISTS(SELECT 1 FROM public.finance_transactions WHERE workspace_id=ws AND id=tid AND status='Posted' AND type IN ('Income','Expense')) THEN
  PERFORM public.fin__err('PROJECT_TRANSACTION_INVALID','Only posted income and expense transactions can be linked'); END IF;
 SELECT project_id INTO existing_project FROM public.finance_project_transactions WHERE workspace_id=ws AND transaction_id=tid;
 IF existing_project IS NOT NULL AND existing_project<>pid THEN PERFORM public.fin__err('TRANSACTION_ALREADY_LINKED','Unlink it from the current project first'); END IF;
 INSERT INTO public.finance_project_transactions(workspace_id,project_id,transaction_id,linked_by) VALUES(ws,pid,tid,auth.uid())
 ON CONFLICT(workspace_id,transaction_id) DO NOTHING;
 PERFORM public.fin__audit(ws,auth.uid(),'project',pid::text,'link_transaction',null,null,jsonb_build_object('transaction_id',tid));
 RETURN jsonb_build_object('linked',true,'project_id',pid,'transaction_id',tid);
END
$function$;

CREATE OR REPLACE FUNCTION public.fin_project_transaction_unlink(p jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $function$
DECLARE ws uuid:=(p->>'workspace_id')::uuid; pid uuid:=(p->>'project_id')::uuid; tid uuid:=(p->>'transaction_id')::uuid;
BEGIN
 PERFORM public.fin__need(ws,'ledger','edit');
 DELETE FROM public.finance_project_transactions WHERE workspace_id=ws AND project_id=pid AND transaction_id=tid;
 IF NOT FOUND THEN PERFORM public.fin__err('PROJECT_LINK_NOT_FOUND'); END IF;
 PERFORM public.fin__audit(ws,auth.uid(),'project',pid::text,'unlink_transaction',null,jsonb_build_object('transaction_id',tid),null);
 RETURN jsonb_build_object('unlinked',true,'project_id',pid,'transaction_id',tid);
END
$function$;

REVOKE ALL ON FUNCTION public.fin_projects_get(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fin_projects_get(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.fin_project_save(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fin_project_save(jsonb) TO authenticated;
REVOKE ALL ON FUNCTION public.fin_project_transaction_link(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fin_project_transaction_link(jsonb) TO authenticated;
REVOKE ALL ON FUNCTION public.fin_project_transaction_unlink(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fin_project_transaction_unlink(jsonb) TO authenticated;
