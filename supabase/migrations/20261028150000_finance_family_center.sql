-- Finance OS — Family Finance Center
-- Scope is family-only. Occasions/gifts belong to Relationships OS;
-- sadaqat/donations belong to Spirituality OS and are intentionally not created here.

begin;

create table if not exists public.finance_family_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  display_name text not null check (length(btrim(display_name)) between 1 and 120),
  nickname text,
  relationship_type text not null default 'Other'
    check (relationship_type in ('Spouse','Child','Parent','Sibling','Relative','Other')),
  relationship_label text,
  color text not null default '#0D9488',
  default_responsibility text not null default 'Unassigned'
    check (default_responsibility in ('Personal','Shared','Unassigned')),
  linked_user_id uuid references auth.users(id) on delete set null,
  status text not null default 'Active' check (status in ('Active','Archived')),
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  updated_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (workspace_id, id),
  check (relationship_label is null or length(relationship_label) <= 100),
  check ((status = 'Archived' and archived_at is not null) or status = 'Active')
);
create index if not exists finance_family_members_ws_status_idx
  on public.finance_family_members(workspace_id, status, display_name);

-- Private details are isolated so general family viewers cannot read them accidentally.
create table if not exists public.finance_family_member_private (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  family_member_id uuid not null,
  birth_date date,
  notes text,
  updated_by uuid default auth.uid() references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (workspace_id, family_member_id),
  foreign key (workspace_id, family_member_id)
    references public.finance_family_members(workspace_id, id) on delete cascade
);
create index if not exists finance_family_private_ws_member_idx
  on public.finance_family_member_private(workspace_id, family_member_id);

create table if not exists public.finance_family_transaction_meta (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  transaction_id uuid not null,
  responsibility_type text not null default 'Unassigned'
    check (responsibility_type in ('Personal','Shared','Unassigned','Reimbursement')),
  primary_family_member_id uuid,
  allocation_status text not null default 'Unassigned'
    check (allocation_status in ('Unassigned','Allocated','Reviewed')),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  updated_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, transaction_id),
  foreign key (workspace_id, transaction_id) references public.finance_transactions(workspace_id, id) on delete cascade,
  foreign key (workspace_id, primary_family_member_id)
    references public.finance_family_members(workspace_id, id) on delete restrict
);
create index if not exists finance_family_tx_meta_member_idx
  on public.finance_family_transaction_meta(workspace_id, primary_family_member_id, allocation_status);

create table if not exists public.finance_family_allocations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  transaction_id uuid not null,
  family_member_id uuid not null,
  allocation_method text not null check (allocation_method in ('Fixed','Percentage')),
  amount numeric(20,4),
  percentage numeric(7,4),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  note text,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (workspace_id, transaction_id)
    references public.finance_family_transaction_meta(workspace_id, transaction_id) on delete cascade,
  foreign key (workspace_id, family_member_id)
    references public.finance_family_members(workspace_id, id) on delete restrict,
  unique (workspace_id, transaction_id, family_member_id),
  check (
    (allocation_method = 'Fixed' and amount > 0 and percentage is null)
    or
    (allocation_method = 'Percentage' and percentage > 0 and percentage <= 100 and amount is null)
  )
);
create index if not exists finance_family_allocations_member_idx
  on public.finance_family_allocations(workspace_id, family_member_id, transaction_id);

create table if not exists public.finance_family_budgets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  family_member_id uuid,
  category_id uuid,
  period text,
  start_date date,
  end_date date,
  amount numeric(20,4) not null check (amount > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  rollover_rule text not null default 'None' check (rollover_rule in ('None','CarryForward','Capped')),
  rollover_cap numeric(20,4),
  alert_thresholds jsonb not null default '[70,90,100]'::jsonb,
  status text not null default 'Active' check (status in ('Active','Archived')),
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  updated_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (workspace_id, family_member_id)
    references public.finance_family_members(workspace_id, id) on delete restrict,
  foreign key (workspace_id, category_id) references public.finance_categories(workspace_id, id) on delete restrict,
  check ((period is not null and period ~ '^[0-9]{4}-(0[1-9]|1[0-2])$' and start_date is null and end_date is null)
      or (period is null and start_date is not null and end_date is not null and end_date >= start_date)),
  check (rollover_cap is null or rollover_cap >= 0),
  check (jsonb_typeof(alert_thresholds) = 'array')
);
create index if not exists finance_family_budgets_ws_period_idx
  on public.finance_family_budgets(workspace_id, period, status);
create unique index if not exists finance_family_budgets_active_period_uq
  on public.finance_family_budgets(workspace_id, family_member_id, category_id, period) nulls not distinct
  where period is not null and status='Active';

create table if not exists public.finance_family_allowances (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  family_member_id uuid not null,
  amount numeric(20,4) not null check (amount > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  frequency text not null default 'Monthly' check (frequency in ('Weekly','Monthly','Quarterly','Yearly')),
  due_day smallint,
  start_date date not null default current_date,
  end_date date,
  status text not null default 'Active' check (status in ('Active','Paused','Archived')),
  notes text,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  updated_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (workspace_id, family_member_id)
    references public.finance_family_members(workspace_id, id) on delete restrict,
  check (due_day is null or due_day between 1 and 31),
  check (end_date is null or end_date >= start_date)
);
create index if not exists finance_family_allowances_ws_member_idx
  on public.finance_family_allowances(workspace_id, family_member_id, status);

-- Server-side permission helpers. Family access is a separate Finance section;
-- linking a family profile to an auth user never grants access by itself.
create or replace function public.fin_family_need(p_workspace_id uuid, p_level text, p_sensitive boolean default false)
returns void
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  lvl text;
  is_owner boolean := false;
  member_access jsonb;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHENTICATED' using errcode = 'P0001';
  end if;
  select exists (
    select 1 from public.workspaces w
    where w.id = p_workspace_id and w.owner_id = auth.uid()
  ) into is_owner;
  if is_owner then return; end if;

  lvl := public.ws_access_level(p_workspace_id, 'finance', 'family');
  if p_level = 'edit' and lvl <> 'edit' then
    raise exception 'FORBIDDEN' using detail = 'finance/family requires edit', errcode = 'P0001';
  elsif p_level = 'view' and lvl not in ('view','edit') then
    raise exception 'FORBIDDEN' using detail = 'finance/family requires view', errcode = 'P0001';
  end if;

  if p_sensitive then
    select m.access into member_access
    from public.workspace_members m
    where m.workspace_id = p_workspace_id and m.user_id = auth.uid() and m.status = 'active';
    if coalesce((member_access->'systems'->'finance'->'sections'->>'family_sensitive'), 'none') not in ('view','edit')
       and coalesce((member_access->'systems'->'finance'->>'manage')::boolean, false) is not true then
      raise exception 'FORBIDDEN' using detail = 'finance/family_sensitive requires explicit access', errcode = 'P0001';
    end if;
  end if;
end
$function$;

-- Evaluate sensitive access through a definer function to avoid RLS recursion
-- and ensure the membership lookup is scoped to the requested workspace.
create or replace function public.fin_family_has_sensitive_access(p_workspace_id uuid, p_level text default 'view')
returns boolean
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare a jsonb;
begin
  if auth.uid() is null then return false; end if;
  if exists (select 1 from public.workspaces w where w.id = p_workspace_id and w.owner_id = auth.uid()) then return true; end if;
  select m.access into a from public.workspace_members m
   where m.workspace_id = p_workspace_id and m.user_id = auth.uid() and m.status = 'active';
  if a is null then return false; end if;
  if coalesce((a->'systems'->'finance'->>'manage')::boolean, false) then return true; end if;
  if p_level = 'edit' then
    return coalesce(a->'systems'->'finance'->'sections'->>'family_sensitive','none') = 'edit';
  end if;
  return coalesce(a->'systems'->'finance'->'sections'->>'family_sensitive','none') in ('view','edit');
end
$function$;

alter table public.finance_family_members enable row level security;
alter table public.finance_family_member_private enable row level security;
alter table public.finance_family_transaction_meta enable row level security;
alter table public.finance_family_allocations enable row level security;
alter table public.finance_family_budgets enable row level security;
alter table public.finance_family_allowances enable row level security;

drop policy if exists finance_family_members_sel on public.finance_family_members;
create policy finance_family_members_sel on public.finance_family_members for select
  using (public.ws_access_level(workspace_id, 'finance', 'family') in ('view','edit'));
drop policy if exists finance_family_members_ins on public.finance_family_members;
create policy finance_family_members_ins on public.finance_family_members for insert
  with check (public.ws_access_level(workspace_id, 'finance', 'family') = 'edit' and (created_by is null or created_by = auth.uid()) and (updated_by is null or updated_by = auth.uid()));
drop policy if exists finance_family_members_upd on public.finance_family_members;
create policy finance_family_members_upd on public.finance_family_members for update
  using (public.ws_access_level(workspace_id, 'finance', 'family') = 'edit')
  with check (public.ws_access_level(workspace_id, 'finance', 'family') = 'edit' and (updated_by is null or updated_by = auth.uid()));

drop policy if exists finance_family_private_sel on public.finance_family_member_private;
create policy finance_family_private_sel on public.finance_family_member_private for select
  using (public.ws_access_level(workspace_id, 'finance', 'family') in ('view','edit')
    and public.fin_family_has_sensitive_access(workspace_id, 'view'));
drop policy if exists finance_family_private_ins on public.finance_family_member_private;
create policy finance_family_private_ins on public.finance_family_member_private for insert
  with check (public.ws_access_level(workspace_id, 'finance', 'family') = 'edit'
    and public.fin_family_has_sensitive_access(workspace_id, 'edit')
    and (updated_by is null or updated_by = auth.uid()));
drop policy if exists finance_family_private_upd on public.finance_family_member_private;
create policy finance_family_private_upd on public.finance_family_member_private for update
  using (public.ws_access_level(workspace_id, 'finance', 'family') = 'edit'
    and public.fin_family_has_sensitive_access(workspace_id, 'edit'))
  with check (public.ws_access_level(workspace_id, 'finance', 'family') = 'edit'
    and public.fin_family_has_sensitive_access(workspace_id, 'edit')
    and (updated_by is null or updated_by = auth.uid()));

-- Family transaction attribution is readable only with family access. Writes are RPC-only
-- in the next implementation phase so split totals can be validated transactionally.
create policy finance_family_tx_meta_sel on public.finance_family_transaction_meta for select
  using (public.ws_access_level(workspace_id, 'finance', 'family') in ('view','edit'));
create policy finance_family_allocations_sel on public.finance_family_allocations for select
  using (public.ws_access_level(workspace_id, 'finance', 'family') in ('view','edit'));

drop policy if exists finance_family_budgets_sel on public.finance_family_budgets;
create policy finance_family_budgets_sel on public.finance_family_budgets for select
  using (public.ws_access_level(workspace_id, 'finance', 'family') in ('view','edit'));
drop policy if exists finance_family_budgets_ins on public.finance_family_budgets;
create policy finance_family_budgets_ins on public.finance_family_budgets for insert
  with check (public.ws_access_level(workspace_id, 'finance', 'family') = 'edit' and (created_by is null or created_by = auth.uid()) and (updated_by is null or updated_by = auth.uid()));
drop policy if exists finance_family_budgets_upd on public.finance_family_budgets;
create policy finance_family_budgets_upd on public.finance_family_budgets for update
  using (public.ws_access_level(workspace_id, 'finance', 'family') = 'edit')
  with check (public.ws_access_level(workspace_id, 'finance', 'family') = 'edit' and (updated_by is null or updated_by = auth.uid()));

drop policy if exists finance_family_allowances_sel on public.finance_family_allowances;
create policy finance_family_allowances_sel on public.finance_family_allowances for select
  using (public.ws_access_level(workspace_id, 'finance', 'family') in ('view','edit'));
drop policy if exists finance_family_allowances_ins on public.finance_family_allowances;
create policy finance_family_allowances_ins on public.finance_family_allowances for insert
  with check (public.ws_access_level(workspace_id, 'finance', 'family') = 'edit' and (created_by is null or created_by = auth.uid()));
drop policy if exists finance_family_allowances_upd on public.finance_family_allowances;
create policy finance_family_allowances_upd on public.finance_family_allowances for update
  using (public.ws_access_level(workspace_id, 'finance', 'family') = 'edit')
  with check (public.ws_access_level(workspace_id, 'finance', 'family') = 'edit' and (updated_by is null or updated_by = auth.uid()));

-- Enforce that linked users belong to the same workspace; a profile link is not an access grant.
create or replace function public.fin_family_validate_linked_user()
returns trigger language plpgsql security definer set search_path to ''
as $function$
begin
  if new.linked_user_id is not null
     and not exists (select 1 from public.workspaces w where w.id = new.workspace_id and w.owner_id = new.linked_user_id)
     and not exists (select 1 from public.workspace_members m where m.workspace_id = new.workspace_id and m.user_id = new.linked_user_id and m.status = 'active') then
    raise exception 'FAMILY_LINK_USER_NOT_IN_WORKSPACE' using errcode = 'P0001';
  end if;
  return new;
end
$function$;
drop trigger if exists finance_family_validate_linked_user_trg on public.finance_family_members;
create trigger finance_family_validate_linked_user_trg
before insert or update of linked_user_id, workspace_id on public.finance_family_members
for each row execute function public.fin_family_validate_linked_user();

-- Audit family records without copying private birth dates or notes into the audit trail.
create or replace function public.fin_family_audit_row()
returns trigger language plpgsql security definer set search_path to ''
as $function$
declare
  ws uuid;
  entity_id text;
  action_name text;
  before_data jsonb;
  after_data jsonb;
begin
  ws := coalesce(new.workspace_id, old.workspace_id);
  entity_id := coalesce(new.id::text, old.id::text);
  action_name := case when tg_op = 'INSERT' then 'create' when tg_op = 'DELETE' then 'delete' else 'update' end;
  if tg_table_name = 'finance_family_member_private' then
    entity_id := coalesce(new.family_member_id::text, old.family_member_id::text);
    before_data := case when tg_op = 'INSERT' then null else jsonb_build_object('private_details_changed', true) end;
    after_data := case when tg_op = 'DELETE' then null else jsonb_build_object('private_details_changed', true) end;
  else
    before_data := case when tg_op = 'INSERT' then null else to_jsonb(old) - 'linked_user_id' end;
    after_data := case when tg_op = 'DELETE' then null else to_jsonb(new) - 'linked_user_id' end;
  end if;
  perform public.fin__audit(ws, auth.uid(), tg_table_name, entity_id, action_name, null, before_data, after_data);
  return new;
end
$function$;

drop trigger if exists finance_family_members_audit_trg on public.finance_family_members;
create trigger finance_family_members_audit_trg after insert or update on public.finance_family_members
for each row execute function public.fin_family_audit_row();
drop trigger if exists finance_family_private_audit_trg on public.finance_family_member_private;
create trigger finance_family_private_audit_trg after insert or update on public.finance_family_member_private
for each row execute function public.fin_family_audit_row();
drop trigger if exists finance_family_budgets_audit_trg on public.finance_family_budgets;
create trigger finance_family_budgets_audit_trg after insert or update on public.finance_family_budgets
for each row execute function public.fin_family_audit_row();
drop trigger if exists finance_family_allowances_audit_trg on public.finance_family_allowances;
create trigger finance_family_allowances_audit_trg after insert or update on public.finance_family_allowances
for each row execute function public.fin_family_audit_row();

revoke all on function public.fin_family_audit_row() from public;
revoke all on function public.fin_family_has_sensitive_access(uuid,text) from public;
revoke all on function public.fin_family_need(uuid,text,boolean) from public;
revoke all on function public.fin_family_validate_linked_user() from public;
grant execute on function public.fin_family_need(uuid,text,boolean) to authenticated;
grant execute on function public.fin_family_has_sensitive_access(uuid,text) to authenticated;

commit;
