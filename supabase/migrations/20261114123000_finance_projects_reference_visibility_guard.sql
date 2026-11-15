-- Projects OS privacy guard for Finance project references.
-- Finance project save must not allow a user to reference a Projects record they cannot see.

create or replace function public.fin_project_save(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
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
begin
  perform public.fin__need(ws,'ledger','edit');

  if proj_ref is null then
    perform public.fin__err('PROJECT_OS_REFERENCE_REQUIRED','Choose an existing project from Projects OS before saving its financial profile');
  end if;

  -- SECURITY DEFINER bypasses the Projects RLS policy, so explicitly reproduce
  -- the caller's visibility boundary before accepting a cross-OS reference.
  if public.ws_access_level(ws,'projects','main') = 'none'
     or not exists (
       select 1
       from public.workspace_records wr
       where wr.workspace_id=ws
         and wr.system_id='projects'
         and wr.collection='projects'
         and wr.id=proj_ref
         and wr.deleted=false
         and (wr.visible_to is null or auth.uid() = any(wr.visible_to))
     )
  then
    perform public.fin__err('PROJECT_OS_REFERENCE_FORBIDDEN','You cannot reference a Projects record that is not visible to you');
  end if;

  if nm is null or length(nm)>160
    or typ not in ('Freelance','Startup','Content','Side Business','Investment','Other')
    or ccy !~ '^[A-Z]{3}$'
    or stt not in ('Planning','Active','On Hold','Completed','Cancelled')
    or scp not in ('Personal','Business')
    or basis not in ('ExpensesLinked','DeclaredCapital','Disabled')
    or (bud is not null and bud<0)
    or (inv is not null and inv<0)
    or (ed is not null and ed<sd)
    or (basis='DeclaredCapital' and inv is null)
  then
    perform public.fin__err('VALIDATION_FAILED','invalid finance project fields');
  end if;

  if pid is null then
    insert into public.finance_projects(
      workspace_id,name,project_type,budget,currency,start_date,end_date,status,scope,
      project_ref,area_ref,roi_basis,invested_capital,notes,created_by
    )
    values(
      ws,nm,typ,bud,ccy,sd,ed,stt,scp,proj_ref,nullif(p->>'area_ref',''),
      basis,inv,nullif(p->>'notes',''),auth.uid()
    )
    returning id into pid;

    perform public.fin__audit(
      ws,auth.uid(),'project',pid::text,'create',null,null,
      jsonb_build_object('name',nm,'status',stt,'scope',scp,'project_ref',proj_ref)
    );
  else
    update public.finance_projects
    set name=nm,project_type=typ,budget=bud,currency=ccy,start_date=sd,end_date=ed,
        status=stt,scope=scp,project_ref=proj_ref,area_ref=nullif(p->>'area_ref',''),
        roi_basis=basis,invested_capital=inv,notes=nullif(p->>'notes',''),updated_at=now()
    where workspace_id=ws and id=pid;

    if not found then
      perform public.fin__err('OWNERSHIP_MISMATCH','finance project');
    end if;

    perform public.fin__audit(
      ws,auth.uid(),'project',pid::text,'update',null,null,
      jsonb_build_object('name',nm,'status',stt,'scope',scp,'project_ref',proj_ref)
    );
  end if;

  return jsonb_build_object('id',pid,'saved',true);
end
$function$;

revoke execute on function public.fin_project_save(jsonb) from public, anon;
grant execute on function public.fin_project_save(jsonb) to authenticated;