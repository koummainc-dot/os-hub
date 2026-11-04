-- Finance OS v4.2 — Migration A: schema, immutability triggers, RLS (reads only; ALL ledger writes go through fin_* RPCs)
create table if not exists public.finance_settings (
  workspace_id uuid primary key references public.workspaces(id) on delete restrict,
  base_currency text not null default 'EGP',
  timezone text not null default 'Africa/Cairo',
  lock_before_date date,
  overdraft_policy text not null default 'Warn' check (overdraft_policy in ('Allow','Warn','Block')),
  sale_fee_policy text not null default 'expense' check (sale_fee_policy in ('expense','net_proceeds')),
  receivables_in_net_worth boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.finance_accounts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  name text not null check (length(btrim(name)) > 0),
  account_type text not null check (account_type in ('Bank','Cash','Mobile Wallet','Credit Card','E-Wallet','Payment Platform','Investment','Savings','Other')),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  initial_balance numeric(20,4) not null default 0,
  opened_on date not null default current_date,
  status text not null default 'Active' check (status in ('Active','Archived','Closed')),
  nature text not null default 'ASSET' check (nature in ('ASSET','LIABILITY')),
  is_liquid boolean not null default true,
  include_in_net_worth boolean not null default true,
  credit_limit numeric(20,4),
  last4 text check (last4 is null or last4 ~ '^[0-9]{4}$'),
  notes text,
  version int not null default 1,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id)
);
create unique index if not exists fin_acc_name_uq on public.finance_accounts (workspace_id, lower(name)) where status <> 'Archived';

create table if not exists public.finance_categories (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  name text not null check (length(btrim(name)) > 0),
  kind text not null default 'Expense' check (kind in ('Income','Expense','Both')),
  parent_id uuid,
  system_key text,
  archived boolean not null default false,
  version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  foreign key (workspace_id, parent_id) references public.finance_categories (workspace_id, id)
);
create unique index if not exists fin_cat_sys_uq on public.finance_categories (workspace_id, system_key) where system_key is not null;

create table if not exists public.finance_exchange_rates (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  rate_to_base numeric(24,10) not null check (rate_to_base > 0),
  effective_on date not null,
  source text not null default 'manual',
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  unique (workspace_id, currency, effective_on, source)
);

create table if not exists public.finance_goals (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  name text not null,
  target_amount numeric(20,4) not null check (target_amount > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  status text not null default 'Active' check (status in ('Active','Paused','Achieved','Cancelled')),
  tracking_mode text not null default 'Manual' check (tracking_mode in ('Manual','AccountBalance','DebtPayoff')),
  linked_account_id uuid, linked_debt_id uuid,
  version int not null default 1,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  foreign key (workspace_id, linked_account_id) references public.finance_accounts (workspace_id, id),
  check ((tracking_mode = 'AccountBalance') = (linked_account_id is not null) or tracking_mode = 'DebtPayoff')
);

create table if not exists public.finance_debts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  name text not null,
  direction text not null check (direction in ('IOwe','OwedToMe')),
  counterparty text,
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  principal_amount numeric(20,4) not null check (principal_amount > 0),
  start_date date not null,
  interest_method text not null default 'None' check (interest_method in ('None','Declared')),
  lifecycle text not null default 'Active' check (lifecycle in ('Active','Closed','Cancelled','WrittenOff')),
  liability_account_id uuid,
  version int not null default 1,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  foreign key (workspace_id, liability_account_id) references public.finance_accounts (workspace_id, id)
);
create unique index if not exists fin_debt_liab_uq on public.finance_debts (workspace_id, liability_account_id) where liability_account_id is not null and lifecycle = 'Active';

create table if not exists public.finance_debt_installments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null, debt_id uuid not null,
  seq int not null, due_date date not null,
  principal_due numeric(20,4) not null default 0 check (principal_due >= 0),
  interest_due numeric(20,4) not null default 0 check (interest_due >= 0),
  fees_due numeric(20,4) not null default 0 check (fees_due >= 0),
  unique (workspace_id, id), unique (debt_id, seq),
  foreign key (workspace_id, debt_id) references public.finance_debts (workspace_id, id)
);

create table if not exists public.finance_assets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  name text not null,
  asset_type text not null default 'Other',
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  purchase_value numeric(20,4) not null default 0 check (purchase_value >= 0),
  current_value numeric(20,4) not null default 0 check (current_value >= 0),
  valuation_date date,
  valuation_source text not null default 'manual' check (valuation_source in ('manual','market','inventory_estimate')),
  valuation_confirmed boolean not null default true,
  inventory_item_ref text,
  include_in_net_worth boolean not null default true,
  status text not null default 'Held' check (status in ('Held','Sold','WrittenOff')),
  account_id uuid,
  version int not null default 1,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  foreign key (workspace_id, account_id) references public.finance_accounts (workspace_id, id),
  check (valuation_source <> 'inventory_estimate' or inventory_item_ref is not null)
);
create unique index if not exists fin_asset_inv_uq on public.finance_assets (workspace_id, inventory_item_ref) where inventory_item_ref is not null;

create table if not exists public.finance_reconciliations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  account_id uuid not null,
  status text not null default 'Draft' check (status in ('Draft','Reviewed','Completed','Cancelled')),
  cutoff_date date not null,
  statement_balance numeric(20,4) not null,
  ledger_balance numeric(20,4) not null,
  difference numeric(20,4) not null,
  decision text check (decision in ('match','adjust')),
  reason text,
  adjustment_tx_id uuid,
  created_by uuid default auth.uid(), reviewed_by uuid, completed_by uuid,
  created_at timestamptz not null default now(), reviewed_at timestamptz, completed_at timestamptz,
  version int not null default 1,
  unique (workspace_id, id),
  foreign key (workspace_id, account_id) references public.finance_accounts (workspace_id, id)
);

create table if not exists public.finance_import_batches (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  account_id uuid not null,
  file_fingerprint text not null, mapping_version text not null default 'v1',
  normalization jsonb not null default '{}'::jsonb,
  status text not null default 'Confirmed' check (status in ('Confirmed','Undone','Failed')),
  counts jsonb not null default '{}'::jsonb,
  undo_reason text, created_by uuid default auth.uid(), created_at timestamptz not null default now(),
  unique (workspace_id, id),
  foreign key (workspace_id, account_id) references public.finance_accounts (workspace_id, id)
);
create unique index if not exists fin_import_fp_uq on public.finance_import_batches (workspace_id, account_id, file_fingerprint) where status = 'Confirmed';

create table if not exists public.finance_transactions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  name text not null check (length(btrim(name)) > 0),
  type text not null check (type in ('Income','Expense','Transfer')),
  purpose text not null default 'Regular' check (purpose in ('Regular','DebtDisbursement','DebtRepayment','DebtInterest','GoalContribution','GoalWithdrawal','AssetPurchase','AssetSale','Refund','Adjustment')),
  status text not null default 'Posted' check (status in ('Proposed','Posted','Voided','Reversed')),
  amount numeric(20,4) not null check (amount > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  local_date date not null,
  from_account_id uuid, to_account_id uuid,
  from_amount numeric(20,4) check (from_amount is null or from_amount > 0),
  to_amount numeric(20,4) check (to_amount is null or to_amount > 0),
  fx_rate numeric(24,10),
  base_amount numeric(20,4), base_currency text, base_missing boolean not null default false,
  pnl_effect text not null check (pnl_effect in ('Income','Expense','ExpenseReduction','None')),
  flow_class text not null check (flow_class in ('Operating','Internal','Financing','Savings','Investing','Adjustment')),
  category_id uuid, merchant text, notes text,
  debt_id uuid, goal_id uuid, asset_id uuid, capitalized boolean not null default false,
  refund_of_id uuid, reversal_of_id uuid, group_ref text,
  source_system text, source_type text, source_id text, source_version int,
  client_generated_id text, origin text not null default 'manual',
  import_batch_id uuid, reconciliation_id uuid, reconciled_at timestamptz,
  version int not null default 1, created_by uuid, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  foreign key (workspace_id, from_account_id) references public.finance_accounts (workspace_id, id),
  foreign key (workspace_id, to_account_id) references public.finance_accounts (workspace_id, id),
  foreign key (workspace_id, category_id) references public.finance_categories (workspace_id, id),
  foreign key (workspace_id, debt_id) references public.finance_debts (workspace_id, id),
  foreign key (workspace_id, goal_id) references public.finance_goals (workspace_id, id),
  foreign key (workspace_id, asset_id) references public.finance_assets (workspace_id, id),
  foreign key (workspace_id, refund_of_id) references public.finance_transactions (workspace_id, id),
  foreign key (workspace_id, reversal_of_id) references public.finance_transactions (workspace_id, id),
  foreign key (workspace_id, import_batch_id) references public.finance_import_batches (workspace_id, id),
  foreign key (workspace_id, reconciliation_id) references public.finance_reconciliations (workspace_id, id),
  check ((source_system is null and source_type is null and source_id is null) or (source_system is not null and source_type is not null and source_id is not null)),
  check (type <> 'Transfer' or from_account_id <> to_account_id)
);
create unique index if not exists fin_tx_source_uq on public.finance_transactions (workspace_id, source_system, source_type, source_id) where source_id is not null;
create unique index if not exists fin_tx_client_uq on public.finance_transactions (workspace_id, client_generated_id) where client_generated_id is not null;
create unique index if not exists fin_tx_reversal_uq on public.finance_transactions (workspace_id, reversal_of_id) where reversal_of_id is not null;
create index if not exists fin_tx_date_idx on public.finance_transactions (workspace_id, local_date desc);
create index if not exists fin_tx_status_idx on public.finance_transactions (workspace_id, status);

alter table public.finance_reconciliations add constraint fin_recon_adj_fk foreign key (workspace_id, adjustment_tx_id) references public.finance_transactions (workspace_id, id);

create table if not exists public.finance_ledger_entries (
  id bigint generated always as identity primary key,
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  transaction_id uuid not null, account_id uuid not null,
  leg text not null check (leg in ('Out','In')),
  amount numeric(20,4) not null, currency text not null,
  base_amount numeric(20,4), base_currency text,
  local_date date not null,
  voided_at timestamptz,
  created_at timestamptz not null default now(),
  unique (transaction_id, leg),
  foreign key (workspace_id, transaction_id) references public.finance_transactions (workspace_id, id),
  foreign key (workspace_id, account_id) references public.finance_accounts (workspace_id, id),
  check ((leg = 'Out' and amount < 0) or (leg = 'In' and amount > 0))
);
create index if not exists fin_le_acc_idx on public.finance_ledger_entries (account_id, local_date);

create table if not exists public.finance_debt_movements (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null, debt_id uuid not null,
  kind text not null check (kind in ('Payment','Forgiveness','WriteOff','InterestCharge','LateFee')),
  principal numeric(20,4) not null default 0 check (principal >= 0),
  interest numeric(20,4) not null default 0 check (interest >= 0),
  fees numeric(20,4) not null default 0 check (fees >= 0),
  local_date date not null, installment_id uuid,
  payment_ref text, transaction_ids uuid[] not null default '{}',
  reason text, reversed_at timestamptz,
  created_by uuid default auth.uid(), created_at timestamptz not null default now(),
  unique (workspace_id, id),
  foreign key (workspace_id, debt_id) references public.finance_debts (workspace_id, id),
  foreign key (workspace_id, installment_id) references public.finance_debt_installments (workspace_id, id),
  check (principal + interest + fees > 0)
);
create unique index if not exists fin_dm_inst_uq on public.finance_debt_movements (installment_id) where installment_id is not null and kind = 'Payment' and reversed_at is null;

create table if not exists public.finance_import_rows (
  id bigint generated always as identity primary key,
  workspace_id uuid not null, batch_id uuid not null,
  row_no int not null, outcome text not null check (outcome in ('created','duplicate','review_required','rejected')),
  transaction_id uuid, detail text,
  foreign key (workspace_id, batch_id) references public.finance_import_batches (workspace_id, id)
);

create table if not exists public.finance_idempotency (
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  key text not null, request_hash text not null, response jsonb,
  created_at timestamptz not null default now(),
  primary key (workspace_id, key)
);

create table if not exists public.finance_outbox_events (
  event_id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  event_type text not null, schema_version int not null default 1,
  aggregate_type text not null, aggregate_id uuid not null, aggregate_version int not null,
  occurred_at timestamptz not null default now(),
  correlation_id text, causation_id text, idempotency_key text,
  payload_ref jsonb not null default '{}'::jsonb,
  status text not null default 'Pending' check (status in ('Pending','Published','Failed')),
  attempts int not null default 0, published_at timestamptz,
  unique (workspace_id, event_type, aggregate_id, aggregate_version)
);

create table if not exists public.finance_audit_log (
  id bigint generated always as identity primary key,
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  actor uuid, entity text not null, entity_id text, action text not null, reason text,
  before jsonb, after jsonb, request_id text, at timestamptz not null default now()
);

-- ───────── immutability / guards ─────────
create or replace function public.fin__immutable() returns trigger language plpgsql as $$
begin raise exception 'IMMUTABLE_RECORD' using detail = tg_table_name || ' is append-only', errcode = 'P0001'; end $$;
drop trigger if exists fin_audit_immut on public.finance_audit_log;
create trigger fin_audit_immut before update or delete on public.finance_audit_log for each row execute function public.fin__immutable();
drop trigger if exists fin_rates_immut on public.finance_exchange_rates;
create trigger fin_rates_immut before update or delete on public.finance_exchange_rates for each row execute function public.fin__immutable();
drop trigger if exists fin_tx_nodelete on public.finance_transactions;
create trigger fin_tx_nodelete before delete on public.finance_transactions for each row execute function public.fin__immutable();
drop trigger if exists fin_dm_nodelete on public.finance_debt_movements;
create trigger fin_dm_nodelete before delete on public.finance_debt_movements for each row execute function public.fin__immutable();
drop trigger if exists fin_idem_nodelete on public.finance_outbox_events;
create trigger fin_idem_nodelete before delete on public.finance_outbox_events for each row execute function public.fin__immutable();

create or replace function public.fin__entries_guard() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then raise exception 'IMMUTABLE_RECORD' using detail = 'ledger entries are never deleted', errcode = 'P0001'; end if;
  if old.voided_at is not null or (new.workspace_id, new.transaction_id, new.account_id, new.leg, new.amount, new.currency, new.base_amount, new.local_date)
     is distinct from (old.workspace_id, old.transaction_id, old.account_id, old.leg, old.amount, old.currency, old.base_amount, old.local_date) then
    raise exception 'IMMUTABLE_RECORD' using detail = 'ledger entries can only be voided', errcode = 'P0001';
  end if;
  return new;
end $$;
drop trigger if exists fin_entries_guard on public.finance_ledger_entries;
create trigger fin_entries_guard before update or delete on public.finance_ledger_entries for each row execute function public.fin__entries_guard();

create or replace function public.fin__touch() returns trigger language plpgsql as $$
begin new.version := coalesce(old.version, 0) + 1; new.updated_at := clock_timestamp(); return new; end $$;
do $$ declare t text; begin
  foreach t in array array['finance_accounts','finance_categories','finance_goals','finance_debts','finance_assets'] loop
    execute format('drop trigger if exists %I on public.%I', t || '_touch', t);
    execute format('create trigger %I before update on public.%I for each row execute function public.fin__touch()', t || '_touch', t);
  end loop; end $$;

create or replace function public.fin__account_guard() returns trigger language plpgsql security definer set search_path = public as $$
declare has_entries boolean;
begin
  select exists (select 1 from public.finance_ledger_entries where account_id = old.id and voided_at is null) into has_entries;
  if has_entries and new.currency <> old.currency then raise exception 'ACCOUNT_CURRENCY_LOCKED' using errcode = 'P0001'; end if;
  if has_entries and (new.initial_balance <> old.initial_balance or new.opened_on <> old.opened_on) then raise exception 'ACCOUNT_OPENING_LOCKED' using detail = 'use reconciliation/adjustment instead', errcode = 'P0001'; end if;
  if new.status = 'Closed' and old.status <> 'Closed' and
     coalesce((select old.initial_balance + sum(amount) from public.finance_ledger_entries where account_id = old.id and voided_at is null), old.initial_balance) <> 0 then
    raise exception 'ACCOUNT_CLOSE_REQUIRES_ZERO_BALANCE' using errcode = 'P0001'; end if;
  return new;
end $$;
drop trigger if exists fin_account_guard on public.finance_accounts;
create trigger fin_account_guard before update on public.finance_accounts for each row execute function public.fin__account_guard();

-- ───────── section map for server-enforced hiding ─────────
insert into public.collection_sections(system_id, collection, section_id) values
  ('finance','ledger','transactions'),('finance','imports','transactions'),('finance','reconciliations','accounts'),
  ('finance','audit','settings'),('finance','outbox','settings'),('finance','fxrates','fx')
on conflict do nothing;

-- ───────── RLS: members read by section; NO direct writes to ledger tables ─────────
do $$ declare r record; begin
  for r in select * from (values
    ('finance_settings','settings'),('finance_accounts','accounts'),('finance_categories','categories'),('finance_exchange_rates','fxrates'),
    ('finance_goals','goals'),('finance_debts','debts'),('finance_debt_installments','debts'),('finance_debt_movements','debts'),
    ('finance_assets','assets'),('finance_reconciliations','reconciliations'),('finance_import_batches','imports'),('finance_import_rows','imports'),
    ('finance_transactions','ledger'),('finance_ledger_entries','ledger'),('finance_outbox_events','outbox'),('finance_audit_log','audit')) as v(t, part)
  loop
    execute format('alter table public.%I enable row level security', r.t);
    execute format('drop policy if exists %I on public.%I', r.t || '_sel', r.t);
    execute format('create policy %I on public.%I for select to authenticated using (public.ws_access_level(workspace_id, ''finance'', %L) in (''view'',''edit''))', r.t || '_sel', r.t, r.part);
    execute format('revoke all on public.%I from anon, authenticated', r.t);
    execute format('grant select on public.%I to authenticated', r.t);
  end loop;
  -- simple master data may be edited directly (guarded by triggers); everything with money effect is RPC-only
  for r in select * from (values ('finance_accounts','accounts'),('finance_categories','categories'),('finance_goals','goals')) as v(t, part) loop
    execute format('drop policy if exists %I on public.%I', r.t || '_ins', r.t);
    execute format('drop policy if exists %I on public.%I', r.t || '_upd', r.t);
    execute format('create policy %I on public.%I for insert to authenticated with check (public.ws_access_level(workspace_id, ''finance'', %L) = ''edit'')', r.t || '_ins', r.t, r.part);
    execute format('create policy %I on public.%I for update to authenticated using (public.ws_access_level(workspace_id, ''finance'', %L) = ''edit'') with check (public.ws_access_level(workspace_id, ''finance'', %L) = ''edit'')', r.t || '_upd', r.t, r.part, r.part);
    execute format('grant insert, update on public.%I to authenticated', r.t);
  end loop;
end $$;
alter table public.finance_idempotency enable row level security;
revoke all on public.finance_idempotency from anon, authenticated;
