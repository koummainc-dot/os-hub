-- Financial profiles must reference an existing Projects OS project; Finance never creates project records.
CREATE OR REPLACE FUNCTION public.fin_project_save(p jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  ws uuid := nullif(p->>'workspace_id','')::uuid;
  pid uuid := nullif(p->>'id','')::uuid;
  nm text := nullif(btrim(p->>'name'),'');
  typ text := coalesce(nullif(p->>'project_type',''),'Other');
  ccy text := upper(coalesce(nullif(p->>'currency',''),'EGP'));
  stt text := coalesce(nullif(p->>'status',''),'Planning');
  scp text := coalesce(nullif(p->>'scope',''),'Personal');
  basis text := coalesce(nullif(p->>'roi_basis',''),'ExpensesLinked');
  bud numeric := nullif(p->>'budget','')::numeric;
  inv numeric := nullif(p->>'invested_capital','')::numeric;
  sd date := coalesce(nullif(p->>'start_date','')::date,current_date);
  ed date := nullif(p->>'end_date','')::date;
  proj_ref text := nullif(btrim(p->>'project_ref'),'');
BEGIN
  PERFORM public.fin__need(ws,'ledger','edit');
  IF proj_ref IS NULL OR NOT EXISTS(
    SELECT 1 FROM public.workspace_records wr
    WHERE wr.workspace_id=ws AND wr.system_id='projects'
      AND wr.collection='projects' AND wr.id=proj_ref AND wr.deleted=false
  ) THEN
    PERFORM public.fin__err('PROJECT_OS_REFERENCE_REQUIRED','Choose an existing project from Projects OS before saving its financial profile');
  END IF;
  IF nm IS NULL OR length(nm)>160 OR typ NOT IN ('Freelance','Startup','Content','Side Business','Investment','Other')
    OR ccy !~ '^[A-Z]{3}$' OR stt NOT IN ('Planning','Active','On Hold','Completed','Cancelled')
    OR scp NOT IN ('Personal','Business') OR basis NOT IN ('ExpensesLinked','DeclaredCapital','Disabled')
    OR (bud IS NOT NULL AND bud<0) OR (inv IS NOT NULL AND inv<0)
    OR (ed IS NOT NULL AND ed<sd) OR (basis='DeclaredCapital' AND inv IS NULL) THEN
    PERFORM public.fin__err('VALIDATION_FAILED','invalid finance project fields');
  END IF;
  IF pid IS NULL THEN
    INSERT INTO public.finance_projects(workspace_id,name,project_type,budget,currency,start_date,end_date,status,scope,project_ref,area_ref,roi_basis,invested_capital,notes,created_by)
    VALUES(ws,nm,typ,bud,ccy,sd,ed,stt,scp,proj_ref,nullif(p->>'area_ref',''),basis,inv,nullif(p->>'notes',''),auth.uid())
    RETURNING id INTO pid;
    PERFORM public.fin__audit(ws,auth.uid(),'project',pid::text,'create',null,null,jsonb_build_object('name',nm,'status',stt,'scope',scp,'project_ref',proj_ref));
  ELSE
    UPDATE public.finance_projects SET name=nm,project_type=typ,budget=bud,currency=ccy,start_date=sd,end_date=ed,status=stt,scope=scp,
      project_ref=proj_ref,area_ref=nullif(p->>'area_ref',''),roi_basis=basis,invested_capital=inv,notes=nullif(p->>'notes',''),updated_at=now()
    WHERE workspace_id=ws AND id=pid;
    IF NOT FOUND THEN PERFORM public.fin__err('OWNERSHIP_MISMATCH','finance project'); END IF;
    PERFORM public.fin__audit(ws,auth.uid(),'project',pid::text,'update',null,null,jsonb_build_object('name',nm,'status',stt,'scope',scp,'project_ref',proj_ref));
  END IF;
  RETURN jsonb_build_object('id',pid,'saved',true);
END
$function$;
REVOKE ALL ON FUNCTION public.fin_project_save(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fin_project_save(jsonb) TO authenticated;
