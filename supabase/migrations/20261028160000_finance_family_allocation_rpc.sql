-- Family Finance Center: transactional allocation and ledger-backed reports.
-- This migration intentionally lives on the feature branch; do not apply to production before isolated testing.
begin;

create or replace function public.fin_family_set_transaction_allocation(
  p_workspace_id uuid,
  p_transaction_id uuid,
  p_responsibility_type text,
  p_primary_family_member_id uuid default null,
  p_allocations jsonb default '[]'::jsonb,
  p_mark_reviewed boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  tx public.finance_transactions%rowtype;
  item jsonb;
  alloc_method text;
  first_method text;
  member_id uuid;
  fixed_total numeric := 0;
  pct_total numeric := 0;
  item_count integer := 0;
  before_meta jsonb;
  after_meta jsonb;
  before_allocations jsonb;
  after_allocations jsonb;
  result jsonb;
begin
  perform public.fin_family_need(p_workspace_id, 'edit', false);

  if p_responsibility_type not in ('Personal','Shared','Unassigned','Reimbursement') then
    raise exception 'FAMILY_INVALID_RESPONSIBILITY' using errcode = 'P0001';
  end if;
  if p_allocations is null or jsonb_typeof(p_allocations) <> 'array' then
    raise exception 'FAMILY_ALLOCATIONS_MUST_BE_ARRAY' using errcode = 'P0001';
  end if;

  select * into tx
    from public.finance_transactions t
   where t.workspace_id = p_workspace_id and t.id = p_transaction_id
   for update;
  if not found then raise exception 'TRANSACTION_NOT_FOUND' using errcode = 'P0001'; end if;
  if tx.type <> 'Expense' then raise exception 'FAMILY_ALLOCATION_EXPENSES_ONLY' using errcode = 'P0001'; end if;
  if tx.status in ('Voided','Reversed') then raise exception 'FAMILY_CANNOT_ALLOCATE_VOIDED_TRANSACTION' using errcode = 'P0001'; end if;

  if p_primary_family_member_id is not null and not exists (
    select 1 from public.finance_family_members fm
     where fm.workspace_id=p_workspace_id and fm.id=p_primary_family_member_id and fm.status='Active'
  ) then raise exception 'FAMILY_MEMBER_NOT_ACTIVE_IN_WORKSPACE' using errcode = 'P0001'; end if;

  if p_responsibility_type in ('Personal','Reimbursement') and p_primary_family_member_id is null then
    raise exception 'FAMILY_PRIMARY_MEMBER_REQUIRED' using errcode = 'P0001';
  end if;
  if p_responsibility_type='Unassigned' and (p_primary_family_member_id is not null or jsonb_array_length(p_allocations)>0) then
    raise exception 'FAMILY_UNASSIGNED_CANNOT_HAVE_ALLOCATIONS' using errcode = 'P0001';
  end if;
  if p_responsibility_type='Shared' and jsonb_array_length(p_allocations)=0 then
    raise exception 'FAMILY_SHARED_REQUIRES_ALLOCATIONS' using errcode = 'P0001';
  end if;

  for item in select value from jsonb_array_elements(p_allocations)
  loop
    item_count := item_count + 1;
    begin member_id := (item->>'family_member_id')::uuid;
    exception when others then raise exception 'FAMILY_INVALID_MEMBER_ID' using errcode = 'P0001'; end;
    if not exists (select 1 from public.finance_family_members fm where fm.workspace_id=p_workspace_id and fm.id=member_id and fm.status='Active') then
      raise exception 'FAMILY_MEMBER_NOT_ACTIVE_IN_WORKSPACE' using errcode = 'P0001';
    end if;
    alloc_method := item->>'allocation_method';
    if alloc_method not in ('Fixed','Percentage') then raise exception 'FAMILY_INVALID_ALLOCATION_METHOD' using errcode = 'P0001'; end if;
    if first_method is null then first_method := alloc_method; elsif first_method <> alloc_method then
      raise exception 'FAMILY_MIXED_ALLOCATION_METHODS_NOT_ALLOWED' using errcode = 'P0001';
    end if;
    if alloc_method='Fixed' then
      if coalesce((item->>'amount')::numeric,0) <= 0 or item ? 'percentage' then
        raise exception 'FAMILY_INVALID_FIXED_ALLOCATION' using errcode = 'P0001';
      end if;
      fixed_total := fixed_total + (item->>'amount')::numeric;
    else
      if coalesce((item->>'percentage')::numeric,0) <= 0 or (item->>'percentage')::numeric > 100 or item ? 'amount' then
        raise exception 'FAMILY_INVALID_PERCENTAGE_ALLOCATION' using errcode = 'P0001';
      end if;
      pct_total := pct_total + (item->>'percentage')::numeric;
    end if;
  end loop;

  if p_responsibility_type='Personal' and item_count>0 and (item_count<>1 or (select (value->>'family_member_id')::uuid from jsonb_array_elements(p_allocations) limit 1)<>p_primary_family_member_id) then
    raise exception 'FAMILY_PERSONAL_ALLOCATION_MUST_MATCH_PRIMARY_MEMBER' using errcode = 'P0001';
  end if;
  if item_count > 0 and first_method='Fixed' and abs(fixed_total-tx.amount)>0.0001 then
    raise exception 'FAMILY_FIXED_ALLOCATIONS_MUST_EQUAL_TRANSACTION_AMOUNT' using detail = 'allocated='||fixed_total||'; transaction='||tx.amount, errcode = 'P0001';
  end if;
  if item_count > 0 and first_method='Percentage' and abs(pct_total-100)>0.0001 then
    raise exception 'FAMILY_PERCENTAGES_MUST_EQUAL_100' using detail = 'total='||pct_total, errcode = 'P0001';
  end if;

  select to_jsonb(m) into before_meta from public.finance_family_transaction_meta m
   where m.workspace_id=p_workspace_id and m.transaction_id=p_transaction_id;
  select coalesce(jsonb_agg(jsonb_build_object(
    'family_member_id',a.family_member_id,'allocation_method',a.allocation_method,
    'amount',a.amount,'percentage',a.percentage,'currency',a.currency
  ) order by a.family_member_id),'[]'::jsonb)
    into before_allocations
    from public.finance_family_allocations a
   where a.workspace_id=p_workspace_id and a.transaction_id=p_transaction_id;

  insert into public.finance_family_transaction_meta(
    workspace_id,transaction_id,responsibility_type,primary_family_member_id,
    allocation_status,reviewed_at,reviewed_by,created_by,updated_by
  ) values (
    p_workspace_id,p_transaction_id,p_responsibility_type,p_primary_family_member_id,
    case when p_mark_reviewed then 'Reviewed' when item_count>0 or p_primary_family_member_id is not null then 'Allocated' else 'Unassigned' end,
    case when p_mark_reviewed then now() else null end,
    case when p_mark_reviewed then auth.uid() else null end,
    auth.uid(),auth.uid()
  )
  on conflict (workspace_id,transaction_id) do update set
    responsibility_type=excluded.responsibility_type,
    primary_family_member_id=excluded.primary_family_member_id,
    allocation_status=excluded.allocation_status,
    reviewed_at=excluded.reviewed_at,
    reviewed_by=excluded.reviewed_by,
    updated_by=auth.uid(),
    updated_at=now();

  delete from public.finance_family_allocations
   where workspace_id=p_workspace_id and transaction_id=p_transaction_id;

  for item in select value from jsonb_array_elements(p_allocations)
  loop
    insert into public.finance_family_allocations(
      workspace_id,transaction_id,family_member_id,allocation_method,amount,percentage,currency,note,created_by
    ) values (
      p_workspace_id,p_transaction_id,(item->>'family_member_id')::uuid,item->>'allocation_method',
      case when item->>'allocation_method'='Fixed' then (item->>'amount')::numeric else null end,
      case when item->>'allocation_method'='Percentage' then (item->>'percentage')::numeric else null end,
      tx.currency,nullif(left(coalesce(item->>'note',''),500),''),
      auth.uid()
    );
  end loop;

  select to_jsonb(m) into after_meta from public.finance_family_transaction_meta m
   where m.workspace_id=p_workspace_id and m.transaction_id=p_transaction_id;
  select coalesce(jsonb_agg(jsonb_build_object(
    'family_member_id',a.family_member_id,'allocation_method',a.allocation_method,
    'amount',a.amount,'percentage',a.percentage,'currency',a.currency
  ) order by a.family_member_id),'[]'::jsonb)
    into after_allocations
    from public.finance_family_allocations a
   where a.workspace_id=p_workspace_id and a.transaction_id=p_transaction_id;
  perform public.fin__audit(p_workspace_id,auth.uid(),'finance_family_transaction_meta',p_transaction_id::text,'allocate',null,
    jsonb_build_object('meta',before_meta,'allocations',before_allocations),
    jsonb_build_object('meta',after_meta,'allocation_count',item_count,'allocation_method',first_method,'allocations',after_allocations));
  result := jsonb_build_object('transaction_id',p_transaction_id,'allocation_count',item_count,'allocation_method',first_method,'currency',tx.currency);
  return result;
end
$function$;

create or replace function public.fin_family_spending_report(
  p_workspace_id uuid,
  p_start_date date,
  p_end_date date,
  p_family_member_id uuid default null
)
returns table (
  family_member_id uuid,
  member_name text,
  category_id uuid,
  category_name text,
  currency text,
  actual_amount numeric,
  transaction_count bigint
)
language plpgsql
stable
security definer
set search_path to ''
as $function$
begin
  perform public.fin_family_need(p_workspace_id,'view',false);
  if p_start_date is null or p_end_date is null or p_end_date < p_start_date then
    raise exception 'FAMILY_INVALID_REPORT_RANGE' using errcode='P0001';
  end if;
  if p_family_member_id is not null and not exists (
    select 1 from public.finance_family_members fm where fm.workspace_id=p_workspace_id and fm.id=p_family_member_id
  ) then raise exception 'FAMILY_MEMBER_NOT_IN_WORKSPACE' using errcode='P0001'; end if;

  return query
  select fm.id, fm.display_name, t.category_id, coalesce(c.name,'غير مصنف'), t.currency,
         sum(case when a.allocation_method='Fixed' then a.amount else t.amount*a.percentage/100 end)::numeric,
         count(distinct t.id)
    from public.finance_family_allocations a
    join public.finance_transactions t on t.workspace_id=a.workspace_id and t.id=a.transaction_id
    join public.finance_family_members fm on fm.workspace_id=a.workspace_id and fm.id=a.family_member_id
    left join public.finance_categories c on c.workspace_id=t.workspace_id and c.id=t.category_id
   where a.workspace_id=p_workspace_id and t.status='Posted' and t.type='Expense'
     and t.local_date between p_start_date and p_end_date
     and (p_family_member_id is null or fm.id=p_family_member_id)
   group by fm.id,fm.display_name,t.category_id,c.name,t.currency
   order by fm.display_name,coalesce(c.name,'غير مصنف'),t.currency;
end
$function$;


create or replace function public.fin_family_list_expenses(
  p_workspace_id uuid,
  p_limit integer default 50
)
returns table (
  transaction_id uuid,
  transaction_name text,
  local_date date,
  amount numeric,
  currency text,
  category_id uuid,
  category_name text,
  responsibility_type text,
  primary_family_member_id uuid,
  allocation_status text,
  allocations jsonb
)
language plpgsql
stable
security definer
set search_path to ''
as $function$
begin
  perform public.fin_family_need(p_workspace_id,'view',false);
  return query
  select t.id,t.name,t.local_date,t.amount,t.currency,t.category_id,coalesce(c.name,'غير مصنف'),
         coalesce(m.responsibility_type,'Unassigned'),m.primary_family_member_id,
         coalesce(m.allocation_status,'Unassigned'),
         coalesce((
           select jsonb_agg(jsonb_build_object(
             'family_member_id',a.family_member_id,
             'member_name',fm.display_name,
             'allocation_method',a.allocation_method,
             'amount',a.amount,
             'percentage',a.percentage,
             'currency',a.currency
           ) order by fm.display_name)
           from public.finance_family_allocations a
           join public.finance_family_members fm on fm.workspace_id=a.workspace_id and fm.id=a.family_member_id
           where a.workspace_id=t.workspace_id and a.transaction_id=t.id
         ),'[]'::jsonb)
    from public.finance_transactions t
    left join public.finance_categories c on c.workspace_id=t.workspace_id and c.id=t.category_id
    left join public.finance_family_transaction_meta m on m.workspace_id=t.workspace_id and m.transaction_id=t.id
   where t.workspace_id=p_workspace_id and t.type='Expense' and t.status='Posted'
   order by t.local_date desc,t.created_at desc
   limit greatest(1,least(coalesce(p_limit,50),200));
end
$function$;

revoke all on function public.fin_family_list_expenses(uuid,integer) from public;
grant execute on function public.fin_family_list_expenses(uuid,integer) to authenticated;
revoke all on function public.fin_family_set_transaction_allocation(uuid,uuid,text,uuid,jsonb,boolean) from public;
revoke all on function public.fin_family_spending_report(uuid,date,date,uuid) from public;
grant execute on function public.fin_family_set_transaction_allocation(uuid,uuid,text,uuid,jsonb,boolean) to authenticated;
grant execute on function public.fin_family_spending_report(uuid,date,date,uuid) to authenticated;

commit;
