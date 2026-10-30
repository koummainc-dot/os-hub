-- Family cash tracking: link an already-posted Finance transaction to a person,
-- then record what they spent or returned without double-counting the ledger.
begin;

create table if not exists public.finance_family_cash_advances (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  family_member_id uuid not null,
  disbursement_transaction_id uuid not null,
  amount numeric(20,4) not null check (amount > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  disbursed_on date not null,
  note text,
  status text not null default 'Active' check (status in ('Active','Closed')),
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (workspace_id,family_member_id) references public.finance_family_members(workspace_id,id) on delete restrict,
  foreign key (workspace_id,disbursement_transaction_id) references public.finance_transactions(workspace_id,id) on delete restrict,
  unique (workspace_id,disbursement_transaction_id)
);
create index if not exists finance_family_cash_advances_member_idx
  on public.finance_family_cash_advances(workspace_id,family_member_id,disbursed_on desc);

create table if not exists public.finance_family_cash_entries (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  advance_id uuid not null,
  entry_type text not null check (entry_type in ('Expense','Return')),
  amount numeric(20,4) not null check (amount > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  entry_date date not null default current_date,
  category_id uuid,
  description text not null check (length(btrim(description)) between 1 and 300),
  receipt_reference text,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (workspace_id,advance_id) references public.finance_family_cash_advances(workspace_id,id) on delete restrict,
  foreign key (workspace_id,category_id) references public.finance_categories(workspace_id,id) on delete restrict,
  check (receipt_reference is null or length(receipt_reference) <= 500)
);
create index if not exists finance_family_cash_entries_advance_idx
  on public.finance_family_cash_entries(workspace_id,advance_id,entry_date desc);

alter table public.finance_family_cash_advances enable row level security;
alter table public.finance_family_cash_entries enable row level security;

drop policy if exists finance_family_cash_advances_sel on public.finance_family_cash_advances;
create policy finance_family_cash_advances_sel on public.finance_family_cash_advances for select
  using (public.ws_access_level(workspace_id,'finance','family') in ('view','edit'));
drop policy if exists finance_family_cash_entries_sel on public.finance_family_cash_entries;
create policy finance_family_cash_entries_sel on public.finance_family_cash_entries for select
  using (public.ws_access_level(workspace_id,'finance','family') in ('view','edit'));

create or replace function public.fin_family_cash_link_transaction(
  p_workspace_id uuid, p_family_member_id uuid, p_transaction_id uuid, p_note text default null
) returns uuid
language plpgsql security definer set search_path to ''
as $function$
declare t public.finance_transactions%rowtype; aid uuid;
begin
  perform public.fin_family_need(p_workspace_id,'edit',false);
  select * into t from public.finance_transactions
   where workspace_id=p_workspace_id and id=p_transaction_id for update;
  if not found then raise exception 'FAMILY_CASH_TRANSACTION_NOT_FOUND' using errcode='P0001'; end if;
  if t.status <> 'Posted' or t.type not in ('Expense','Transfer') then
    raise exception 'FAMILY_CASH_TRANSACTION_MUST_BE_POSTED_OUTFLOW' using errcode='P0001';
  end if;
  if not exists(select 1 from public.finance_family_members
    where workspace_id=p_workspace_id and id=p_family_member_id and status='Active') then
    raise exception 'FAMILY_MEMBER_NOT_ACTIVE_IN_WORKSPACE' using errcode='P0001';
  end if;
  insert into public.finance_family_cash_advances
    (workspace_id,family_member_id,disbursement_transaction_id,amount,currency,disbursed_on,note,created_by)
  values (p_workspace_id,p_family_member_id,t.id,t.amount,t.currency,t.local_date,nullif(left(btrim(coalesce(p_note,'')),500),''),auth.uid())
  returning id into aid;
  perform public.fin__audit(p_workspace_id,auth.uid(),'finance_family_cash_advances',aid::text,'link_transaction',null,null,
    jsonb_build_object('family_member_id',p_family_member_id,'transaction_id',t.id,'amount',t.amount,'currency',t.currency));
  return aid;
end
$function$;

create or replace function public.fin_family_cash_add_entry(
  p_workspace_id uuid, p_advance_id uuid, p_entry_type text, p_amount numeric,
  p_entry_date date, p_category_id uuid, p_description text, p_receipt_reference text default null
) returns uuid
language plpgsql security definer set search_path to ''
as $function$
declare a public.finance_family_cash_advances%rowtype; used numeric; eid uuid;
begin
  perform public.fin_family_need(p_workspace_id,'edit',false);
  if p_entry_type not in ('Expense','Return') or p_amount is null or p_amount <= 0
     or p_entry_date is null or length(btrim(coalesce(p_description,''))) not between 1 and 300
     or length(coalesce(p_receipt_reference,'')) > 500 then
    raise exception 'FAMILY_CASH_INVALID_ENTRY' using errcode='P0001';
  end if;
  select * into a from public.finance_family_cash_advances
   where workspace_id=p_workspace_id and id=p_advance_id for update;
  if not found then raise exception 'FAMILY_CASH_ADVANCE_NOT_FOUND' using errcode='P0001'; end if;
  if a.status <> 'Active' then raise exception 'FAMILY_CASH_ADVANCE_CLOSED' using errcode='P0001'; end if;
  if p_category_id is not null and not exists(select 1 from public.finance_categories
    where workspace_id=p_workspace_id and id=p_category_id and kind in ('Expense','Both') and not archived) then
    raise exception 'FAMILY_CASH_INVALID_CATEGORY' using errcode='P0001';
  end if;
  select coalesce(sum(amount),0) into used from public.finance_family_cash_entries
   where workspace_id=p_workspace_id and advance_id=p_advance_id;
  if p_amount > a.amount-used+0.0001 then
    raise exception 'FAMILY_CASH_AMOUNT_EXCEEDS_REMAINING' using detail='remaining='||(a.amount-used),errcode='P0001';
  end if;
  insert into public.finance_family_cash_entries
    (workspace_id,advance_id,entry_type,amount,currency,entry_date,category_id,description,receipt_reference,created_by)
  values (p_workspace_id,p_advance_id,p_entry_type,p_amount,a.currency,p_entry_date,p_category_id,
    btrim(p_description),nullif(btrim(coalesce(p_receipt_reference,'')),''),auth.uid())
  returning id into eid;
  perform public.fin__audit(p_workspace_id,auth.uid(),'finance_family_cash_entries',eid::text,'create',null,null,
    jsonb_build_object('advance_id',p_advance_id,'entry_type',p_entry_type,'amount',p_amount,'currency',a.currency));
  return eid;
end
$function$;

revoke all on function public.fin_family_cash_link_transaction(uuid,uuid,uuid,text) from public, anon;
revoke all on function public.fin_family_cash_add_entry(uuid,uuid,text,numeric,date,uuid,text,text) from public, anon;
grant execute on function public.fin_family_cash_link_transaction(uuid,uuid,uuid,text) to authenticated;
grant execute on function public.fin_family_cash_add_entry(uuid,uuid,text,numeric,date,uuid,text,text) to authenticated;

commit;
