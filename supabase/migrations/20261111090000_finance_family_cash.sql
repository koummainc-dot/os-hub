-- Finance OS — Family cash advances
-- Adds the storage and RPC surface required by FamilyCash.jsx.
begin;

create table if not exists public.finance_family_cash_advances (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  family_member_id uuid not null,
  disbursement_transaction_id uuid not null,
  account_id uuid,
  amount numeric(20,4) not null check (amount > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  disbursed_on date not null,
  note text,
  status text not null default 'Active' check (status in ('Active','Closed','Archived')),
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  updated_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (workspace_id, family_member_id)
    references public.finance_family_members(workspace_id,id) on delete restrict,
  foreign key (workspace_id, disbursement_transaction_id)
    references public.finance_transactions(workspace_id,id) on delete restrict,
  foreign key (workspace_id, account_id)
    references public.finance_accounts(workspace_id,id) on delete restrict,
  unique (workspace_id, id),
  unique (workspace_id, disbursement_transaction_id)
);

create index if not exists finance_family_cash_advances_ws_member_idx
  on public.finance_family_cash_advances(workspace_id,family_member_id,status,disbursed_on desc);

create table if not exists public.finance_family_cash_entries (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  advance_id uuid not null,
  entry_type text not null check (entry_type in ('Expense','Return')),
  amount numeric(20,4) not null check (amount > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  entry_date date not null,
  category_id uuid,
  description text not null check (length(btrim(description)) between 1 and 300),
  receipt_reference text,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (workspace_id, advance_id)
    references public.finance_family_cash_advances(workspace_id,id) on delete cascade,
  foreign key (workspace_id, category_id)
    references public.finance_categories(workspace_id,id) on delete restrict
);

create index if not exists finance_family_cash_entries_ws_advance_idx
  on public.finance_family_cash_entries(workspace_id,advance_id,entry_date desc);

alter table public.finance_family_cash_advances enable row level security;
alter table public.finance_family_cash_entries enable row level security;

revoke all on table public.finance_family_cash_advances from public,anon,authenticated;
revoke all on table public.finance_family_cash_entries from public,anon,authenticated;
grant select on table public.finance_family_cash_advances to authenticated;
grant select on table public.finance_family_cash_entries to authenticated;

drop policy if exists finance_family_cash_advances_sel on public.finance_family_cash_advances;
create policy finance_family_cash_advances_sel on public.finance_family_cash_advances
for select using (public.ws_access_level(workspace_id,'finance','family') in ('view','edit'));

drop policy if exists finance_family_cash_entries_sel on public.finance_family_cash_entries;
create policy finance_family_cash_entries_sel on public.finance_family_cash_entries
for select using (public.ws_access_level(workspace_id,'finance','family') in ('view','edit'));

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
    p_workspace_id,p_family_member_id,p_transaction_id,tx.account_id,
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

create or replace function public.fin_family_cash_add_entry(
  p_workspace_id uuid,
  p_advance_id uuid,
  p_entry_type text,
  p_amount numeric,
  p_entry_date date,
  p_category_id uuid default null,
  p_description text default null,
  p_receipt_reference text default null
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  adv public.finance_family_cash_advances%rowtype;
  spent numeric;
  returned numeric;
  remaining numeric;
  result jsonb;
begin
  perform public.fin_family_need(p_workspace_id,'edit',false);

  select * into adv
    from public.finance_family_cash_advances a
   where a.workspace_id=p_workspace_id and a.id=p_advance_id
   for update;

  if not found then raise exception 'FAMILY_CASH_ADVANCE_NOT_FOUND' using errcode='P0001'; end if;
  if adv.status='Archived' then raise exception 'FAMILY_CASH_ADVANCE_ARCHIVED' using errcode='P0001'; end if;
  if p_entry_type not in ('Expense','Return') then raise exception 'FAMILY_CASH_INVALID_ENTRY_TYPE' using errcode='P0001'; end if;
  if coalesce(p_amount,0) <= 0 then raise exception 'FAMILY_CASH_AMOUNT_MUST_BE_POSITIVE' using errcode='P0001'; end if;
  if p_entry_date is null or p_description is null or length(btrim(p_description))=0 then
    raise exception 'FAMILY_CASH_ENTRY_DETAILS_REQUIRED' using errcode='P0001';
  end if;
  if p_category_id is not null and not exists (
    select 1 from public.finance_categories c
     where c.workspace_id=p_workspace_id and c.id=p_category_id and c.archived=false
  ) then raise exception 'FAMILY_CASH_CATEGORY_NOT_FOUND' using errcode='P0001'; end if;

  select
    coalesce(sum(case when e.entry_type='Expense' then e.amount else 0 end),0),
    coalesce(sum(case when e.entry_type='Return' then e.amount else 0 end),0)
  into spent,returned
  from public.finance_family_cash_entries e
  where e.workspace_id=p_workspace_id and e.advance_id=p_advance_id;

  remaining := adv.amount - spent + returned;

  if p_entry_type='Expense' and p_amount > remaining then
    raise exception 'FAMILY_CASH_EXCEEDS_REMAINING' using detail='remaining='||remaining,errcode='P0001';
  end if;
  if p_entry_type='Return' and p_amount > spent-returned then
    raise exception 'FAMILY_CASH_RETURN_EXCEEDS_SPENT' using detail='returnable='||(spent-returned),errcode='P0001';
  end if;

  insert into public.finance_family_cash_entries(
    workspace_id,advance_id,entry_type,amount,currency,entry_date,category_id,
    description,receipt_reference,created_by
  ) values (
    p_workspace_id,p_advance_id,p_entry_type,p_amount,adv.currency,p_entry_date,p_category_id,
    left(btrim(p_description),300),nullif(left(coalesce(p_receipt_reference,''),500),''),
    auth.uid()
  );

  select coalesce(sum(case when e.entry_type='Expense' then e.amount else 0 end),0),
         coalesce(sum(case when e.entry_type='Return' then e.amount else 0 end),0)
    into spent,returned
    from public.finance_family_cash_entries e
   where e.workspace_id=p_workspace_id and e.advance_id=p_advance_id;

  update public.finance_family_cash_advances
     set status=case when abs(adv.amount-spent+returned) <= 0.0001 then 'Closed' else 'Active' end,
         updated_by=auth.uid(),updated_at=now()
   where workspace_id=p_workspace_id and id=p_advance_id;

  result := jsonb_build_object(
    'advance_id',p_advance_id,'entry_type',p_entry_type,'amount',p_amount,
    'currency',adv.currency,'remaining',adv.amount-spent+returned
  );
  return result;
end
$function$;

revoke all on function public.fin_family_cash_link_transaction(uuid,uuid,uuid,text) from public,anon;
revoke all on function public.fin_family_cash_add_entry(uuid,uuid,text,numeric,date,uuid,text,text) from public,anon;
grant execute on function public.fin_family_cash_link_transaction(uuid,uuid,uuid,text) to authenticated;
grant execute on function public.fin_family_cash_add_entry(uuid,uuid,text,numeric,date,uuid,text,text) to authenticated;

-- The Family allocation/report RPCs are part of the signed-in Family API.
revoke all on function public.fin_family_list_expenses(uuid,integer) from public,anon;
revoke all on function public.fin_family_set_transaction_allocation(uuid,uuid,text,uuid,jsonb,boolean) from public,anon;
revoke all on function public.fin_family_spending_report(uuid,date,date,uuid) from public,anon;
grant execute on function public.fin_family_list_expenses(uuid,integer) to authenticated;
grant execute on function public.fin_family_set_transaction_allocation(uuid,uuid,text,uuid,jsonb,boolean) to authenticated;
grant execute on function public.fin_family_spending_report(uuid,date,date,uuid) to authenticated;

commit;
