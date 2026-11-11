-- Finance OS — complete Family Cash disbursement workflow
-- Creates the real-money handoff from a Finance account into a Family Cash advance.
begin;

create or replace function public.fin_family_cash_link_transaction(
  p_workspace_id uuid,
  p_family_member_id uuid,
  p_transaction_id uuid,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  tx public.finance_transactions%rowtype;
  result jsonb;
begin
  perform public.fin_family_need(p_workspace_id,'edit',false);

  select * into tx
    from public.finance_transactions t
   where t.workspace_id=p_workspace_id and t.id=p_transaction_id
   for update;

  if not found then raise exception 'FAMILY_CASH_TRANSACTION_NOT_FOUND' using errcode='P0001'; end if;
  if tx.type not in ('Expense','Transfer') or tx.status <> 'Posted' then
    raise exception 'FAMILY_CASH_TRANSACTION_MUST_BE_POSTED_EXPENSE_OR_TRANSFER' using errcode='P0001';
  end if;
  if not exists (
    select 1 from public.finance_family_members fm
     where fm.workspace_id=p_workspace_id and fm.id=p_family_member_id and fm.status='Active'
  ) then raise exception 'FAMILY_MEMBER_NOT_ACTIVE_IN_WORKSPACE' using errcode='P0001'; end if;
  if exists (
    select 1 from public.finance_family_cash_advances a
     where a.workspace_id=p_workspace_id and a.disbursement_transaction_id=p_transaction_id
  ) then raise exception 'FAMILY_CASH_TRANSACTION_ALREADY_LINKED' using errcode='P0001'; end if;

  insert into public.finance_family_cash_advances(
    workspace_id,family_member_id,disbursement_transaction_id,account_id,
    amount,currency,disbursed_on,note,created_by,updated_by
  ) values (
    p_workspace_id,p_family_member_id,p_transaction_id,tx.from_account_id,
    tx.amount,tx.currency,tx.local_date,nullif(left(coalesce(p_note,''),500),''),
    auth.uid(),auth.uid()
  )
  returning jsonb_build_object(
    'id',id,'family_member_id',family_member_id,'disbursement_transaction_id',disbursement_transaction_id,
    'account_id',account_id,'amount',amount,'currency',currency,'disbursed_on',disbursed_on
  ) into result;

  return result;
end
$function$;

create or replace function public.fin_family_cash_disburse(
  p_workspace_id uuid,
  p_family_member_id uuid,
  p_account_id uuid,
  p_amount numeric,
  p_currency text,
  p_disbursed_on date,
  p_category_id uuid default null,
  p_note text default null,
  p_idempotency_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  member_name text;
  account_row public.finance_accounts%rowtype;
  posted jsonb;
  tx_id uuid;
  result jsonb;
begin
  perform public.fin_family_need(p_workspace_id,'edit',false);
  perform public.fin__need(p_workspace_id,'ledger','edit');

  if p_family_member_id is null or not exists (
    select 1 from public.finance_family_members fm
    where fm.workspace_id=p_workspace_id and fm.id=p_family_member_id and fm.status='Active'
  ) then
    raise exception 'FAMILY_MEMBER_NOT_ACTIVE_IN_WORKSPACE' using errcode='P0001';
  end if;

  select * into account_row
    from public.finance_accounts a
   where a.workspace_id=p_workspace_id and a.id=p_account_id
   for update;

  if not found then raise exception 'FAMILY_CASH_SOURCE_ACCOUNT_NOT_FOUND' using errcode='P0001'; end if;
  if account_row.status <> 'Active' then raise exception 'FAMILY_CASH_SOURCE_ACCOUNT_NOT_ACTIVE' using errcode='P0001'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'FAMILY_CASH_AMOUNT_MUST_BE_POSITIVE' using errcode='P0001'; end if;
  if upper(coalesce(p_currency,'')) <> account_row.currency then
    raise exception 'FAMILY_CASH_SOURCE_CURRENCY_MISMATCH' using errcode='P0001';
  end if;
  if p_disbursed_on is null then raise exception 'FAMILY_CASH_DISBURSEMENT_DATE_REQUIRED' using errcode='P0001'; end if;
  if p_disbursed_on > (now() at time zone 'Africa/Cairo')::date then
    raise exception 'FAMILY_CASH_FUTURE_DATE' using errcode='P0001';
  end if;
  if p_category_id is not null and not exists (
    select 1 from public.finance_categories c
    where c.workspace_id=p_workspace_id and c.id=p_category_id and c.archived=false
  ) then
    raise exception 'FAMILY_CASH_CATEGORY_NOT_FOUND' using errcode='P0001';
  end if;

  select fm.display_name into member_name
    from public.finance_family_members fm
   where fm.workspace_id=p_workspace_id and fm.id=p_family_member_id;

  posted := public.fin_post_transaction(jsonb_build_object(
    'workspace_id',p_workspace_id,
    'type','Expense',
    'purpose','Regular',
    'status','Posted',
    'name','عهدة · '||coalesce(member_name,'فرد الأسرة'),
    'merchant','Family Cash',
    'amount',p_amount,
    'currency',upper(p_currency),
    'local_date',p_disbursed_on,
    'from_account_id',p_account_id,
    'category_id',p_category_id,
    'notes',nullif(left(coalesce(p_note,''),500),''),
    'idempotency_key',coalesce(nullif(p_idempotency_key,''),'family-cash-'||gen_random_uuid()::text),
    'client_generated_id',coalesce(nullif(p_idempotency_key,''),'family-cash-'||gen_random_uuid()::text),
    'reason','Family Cash disbursement'
  ));

  tx_id := (posted->>'transaction_id')::uuid;

  if exists (
    select 1 from public.finance_family_cash_advances a
    where a.workspace_id=p_workspace_id and a.disbursement_transaction_id=tx_id
  ) then
    select jsonb_build_object(
      'created',false,'transaction_id',tx_id,'advance_id',a.id,
      'amount',a.amount,'currency',a.currency,'account_id',a.account_id,
      'family_member_id',a.family_member_id,'disbursed_on',a.disbursed_on
    ) into result
    from public.finance_family_cash_advances a
    where a.workspace_id=p_workspace_id and a.disbursement_transaction_id=tx_id;
    return result;
  end if;

  insert into public.finance_family_cash_advances(
    workspace_id,family_member_id,disbursement_transaction_id,account_id,
    amount,currency,disbursed_on,note,created_by,updated_by
  ) values (
    p_workspace_id,p_family_member_id,tx_id,p_account_id,
    p_amount,upper(p_currency),p_disbursed_on,nullif(left(coalesce(p_note,''),500),''),
    auth.uid(),auth.uid()
  )
  returning jsonb_build_object(
    'created',true,'transaction_id',disbursement_transaction_id,'advance_id',id,
    'amount',amount,'currency',currency,'account_id',account_id,
    'family_member_id',family_member_id,'disbursed_on',disbursed_on
  ) into result;

  return result;
end
$function$;

revoke all on function public.fin_family_cash_disburse(uuid,uuid,uuid,numeric,text,date,uuid,text,text) from public,anon;
grant execute on function public.fin_family_cash_disburse(uuid,uuid,uuid,numeric,text,date,uuid,text,text) to authenticated;

commit;
