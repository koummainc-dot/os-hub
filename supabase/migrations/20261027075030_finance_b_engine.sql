-- Finance OS v4.2 — Migration B: posting engine (LedgerService + PeriodService + idempotency). Internal fin__* functions are NOT callable by clients.
create or replace function public.fin__err(code text, detail text default null) returns void language plpgsql as $$
begin raise exception '%', code using detail = detail, errcode = 'P0001'; end $$;

create or replace function public.fin__need(ws uuid, part text, lvl text) returns void language plpgsql stable security definer set search_path = public as $$
declare l text;
begin
  if auth.uid() is null then perform public.fin__err('UNAUTHENTICATED'); end if;
  l := public.ws_access_level(ws, 'finance', part);
  if (lvl = 'edit' and l <> 'edit') or (lvl = 'view' and l not in ('view','edit')) then perform public.fin__err('FORBIDDEN', 'finance/' || part || ' needs ' || lvl); end if;
end $$;

create or replace function public.fin__is_manager(ws uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.workspaces w where w.id = ws and w.owner_id = auth.uid())
      or exists (select 1 from public.workspace_members m where m.workspace_id = ws and m.user_id = auth.uid() and m.status = 'active'
                 and m.access->'systems'->'finance'->>'level' = 'edit' and m.access->'systems'->'finance'->>'manage' = 'true')
$$;

create or replace function public.fin__settings(ws uuid) returns public.finance_settings language plpgsql security definer set search_path = public as $$
declare s public.finance_settings;
begin
  insert into public.finance_settings(workspace_id) values (ws) on conflict do nothing;
  select * into s from public.finance_settings where workspace_id = ws; return s;
end $$;

create or replace function public.fin__minor(ccy text) returns int language sql immutable as $$
  select case upper(ccy) when 'JPY' then 0 when 'KWD' then 3 when 'BHD' then 3 when 'OMR' then 3 else 2 end $$;

create or replace function public.fin__num(p jsonb, k text) returns numeric language plpgsql immutable as $$
begin
  if p->>k is null or p->>k = '' then return null; end if;
  return (p->>k)::numeric;
exception when others then
  raise exception 'VALIDATION_FAILED' using detail = k || ' is not a valid number', errcode = 'P0001';
end $$;

create or replace function public.fin__rate(ws uuid, ccy text, d date) returns numeric language plpgsql stable security definer set search_path = public as $$
declare base text; r numeric;
begin
  select base_currency into base from public.fin__settings(ws);
  if upper(ccy) = base then return 1; end if;
  select rate_to_base into r from public.finance_exchange_rates where workspace_id = ws and currency = upper(ccy) and effective_on <= d order by effective_on desc, created_at desc limit 1;
  return r;
end $$;

create or replace function public.fin__balance(acc uuid, as_of date default null) returns numeric language sql stable security definer set search_path = public as $$
  select a.initial_balance + coalesce((select sum(e.amount) from public.finance_ledger_entries e where e.account_id = a.id and e.voided_at is null and (as_of is null or e.local_date <= as_of)), 0)
  from public.finance_accounts a where a.id = acc
$$;

create or replace function public.fin__period_open(ws uuid, d date) returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select lock_before_date is null or d >= lock_before_date from public.finance_settings where workspace_id = ws), true)
$$;

create or replace function public.fin__classify(purpose text, typ text, capitalized boolean) returns text[] language plpgsql immutable as $$
declare r text[];
begin
  if purpose = 'Regular' then r := case typ when 'Income' then array['Income','Operating'] when 'Expense' then array['Expense','Operating'] when 'Transfer' then array['None','Internal'] end;
  elsif purpose in ('DebtDisbursement','DebtRepayment') then r := array['None','Financing'];
  elsif purpose = 'DebtInterest' and typ in ('Income','Expense') then r := array[typ,'Operating'];
  elsif purpose in ('GoalContribution','GoalWithdrawal') and typ = 'Transfer' then r := array['None','Savings'];
  elsif purpose = 'AssetPurchase' and typ = 'Expense' then r := array[case when capitalized then 'None' else 'Expense' end,'Investing'];
  elsif purpose = 'AssetSale' and typ = 'Income' then r := array['None','Investing'];
  elsif purpose = 'Refund' and typ = 'Income' then r := array['ExpenseReduction','Operating'];
  elsif purpose = 'Adjustment' and typ in ('Income','Expense') then r := array['None','Adjustment'];
  end if;
  if r is null then raise exception 'PURPOSE_TYPE_INVALID' using detail = purpose || ' x ' || coalesce(typ,'?'), errcode = 'P0001'; end if;
  return r;
end $$;

create or replace function public.fin__sys_cat(ws uuid, k text) returns uuid language plpgsql security definer set search_path = public as $$
declare cid uuid; nm text; kd text;
begin
  select id into cid from public.finance_categories where workspace_id = ws and system_key = k;
  if cid is not null then return cid; end if;
  nm := case k when 'uncategorized' then 'غير مصنّف' when 'adjustment' then 'تسوية' when 'repairs' then 'إصلاح وصيانة' when 'selling_fees' then 'رسوم بيع' when 'interest_fees' then 'فوائد ورسوم' when 'purchases' then 'مشتريات' else k end;
  kd := case k when 'uncategorized' then 'Both' when 'adjustment' then 'Both' else 'Expense' end;
  insert into public.finance_categories(workspace_id, name, kind, system_key) values (ws, nm, kd, k) on conflict do nothing;
  select id into cid from public.finance_categories where workspace_id = ws and system_key = k; return cid;
end $$;

create or replace function public.fin__audit(ws uuid, actor uuid, entity text, eid text, action text, reason text, before jsonb, after jsonb) returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.finance_audit_log(workspace_id, actor, entity, entity_id, action, reason, before, after, request_id)
  values (ws, actor, entity, eid, action, reason, before, after, coalesce(nullif(current_setting('finance.request_id', true), ''), gen_random_uuid()::text));
end $$;

create or replace function public.fin__emit(ws uuid, etype text, atype text, aid uuid, aver int, idem text, payload jsonb) returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.finance_outbox_events(workspace_id, event_type, aggregate_type, aggregate_id, aggregate_version, correlation_id, causation_id, idempotency_key, payload_ref)
  values (ws, etype, atype, aid, aver, nullif(current_setting('finance.request_id', true), ''), idem, idem, payload) on conflict do nothing;
end $$;

-- ───────── the single writer of transactions + ledger entries ─────────
create or replace function public.fin__core_post(ws uuid, p jsonb, actor uuid, existing uuid default null) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  st public.finance_settings := public.fin__settings(ws);
  today date := (now() at time zone st.timezone)::date;
  v_type text := p->>'type'; v_purpose text := coalesce(p->>'purpose', 'Regular'); v_status text := coalesce(p->>'status', 'Posted');
  v_ccy text := upper(coalesce(p->>'currency', '')); v_amount numeric := public.fin__num(p, 'amount');
  v_date date; v_name text; v_cap boolean := coalesce((p->>'capitalized')::boolean, false);
  cls text[]; fa public.finance_accounts; ta public.finance_accounts;
  v_from numeric := public.fin__num(p, 'from_amount'); v_to numeric := public.fin__num(p, 'to_amount');
  v_base numeric; v_miss boolean := false; v_rate numeric; v_fx numeric;
  v_cat uuid := nullif(p->>'category_id', '')::uuid; v_debt uuid := nullif(p->>'debt_id', '')::uuid; v_goal uuid := nullif(p->>'goal_id', '')::uuid;
  v_asset uuid := nullif(p->>'asset_id', '')::uuid; v_refund uuid := nullif(p->>'refund_of_id', '')::uuid;
  v_ss text := nullif(p->>'source_system', ''); v_st text := nullif(p->>'source_type', ''); v_si text := nullif(p->>'source_id', '');
  v_sv int := nullif(p->>'source_version', '')::int; v_cg text := nullif(p->>'client_generated_id', '');
  ex public.finance_transactions; orig public.finance_transactions; cat public.finance_categories;
  dbt public.finance_debts; gl public.finance_goals; ast public.finance_assets;
  new_id uuid := coalesce(existing, gen_random_uuid()); warnings jsonb := '[]'::jsonb; nb numeric; res public.finance_transactions;
begin
  if v_type is null or v_type not in ('Income','Expense','Transfer') then perform public.fin__err('VALIDATION_FAILED', 'type'); end if;
  if v_status not in ('Posted','Proposed') then perform public.fin__err('VALIDATION_FAILED', 'status'); end if;
  if v_amount is null or v_amount <= 0 then perform public.fin__err('VALIDATION_FAILED', 'amount must be > 0'); end if;
  if v_ccy !~ '^[A-Z]{3}$' then perform public.fin__err('VALIDATION_FAILED', 'currency'); end if;
  if scale(trim_scale(v_amount)) > public.fin__minor(v_ccy) then perform public.fin__err('AMOUNT_PRECISION', v_ccy || ' allows ' || public.fin__minor(v_ccy) || ' decimals'); end if;
  begin v_date := (p->>'local_date')::date; exception when others then v_date := null; end;
  if v_date is null then perform public.fin__err('VALIDATION_FAILED', 'local_date'); end if;
  v_name := coalesce(nullif(btrim(coalesce(p->>'name', '')), ''), nullif(btrim(coalesce(p->>'merchant', '')), ''), 'حركة');

  -- identity: a source/client id that already exists returns the existing record (never revives, never duplicates)
  if existing is null then
    if v_si is not null then select * into ex from public.finance_transactions where workspace_id = ws and source_system = v_ss and source_type = v_st and source_id = v_si; end if;
    if ex.id is null and v_cg is not null then select * into ex from public.finance_transactions where workspace_id = ws and client_generated_id = v_cg; end if;
    if ex.id is not null then
      return jsonb_build_object('created', false, 'duplicate', true, 'transaction_id', ex.id, 'status', ex.status, 'version', ex.version,
        'stale', (v_sv is not null and ex.source_version is not null and v_sv < ex.source_version),
        'payload_differs', (ex.amount <> v_amount or ex.currency <> v_ccy or ex.local_date <> v_date or ex.type <> v_type));
    end if;
  end if;

  cls := public.fin__classify(v_purpose, v_type, v_cap);

  -- PeriodService gate
  if v_status = 'Posted' and not public.fin__period_open(ws, v_date) then
    if p->>'on_locked' = 'propose' then v_status := 'Proposed'; v_date := today; warnings := warnings || to_jsonb('PERIOD_LOCKED_PROPOSED'::text);
    else perform public.fin__err('PERIOD_UNLOCK_REQUIRED', 'date ' || v_date || ' is before lock ' || st.lock_before_date); end if;
  end if;

  -- ownership of every reference
  if p->>'from_account_id' is not null then select * into fa from public.finance_accounts where workspace_id = ws and id = (p->>'from_account_id')::uuid; if fa.id is null then perform public.fin__err('OWNERSHIP_MISMATCH', 'from_account'); end if; end if;
  if p->>'to_account_id' is not null then select * into ta from public.finance_accounts where workspace_id = ws and id = (p->>'to_account_id')::uuid; if ta.id is null then perform public.fin__err('OWNERSHIP_MISMATCH', 'to_account'); end if; end if;
  if v_cat is not null then select * into cat from public.finance_categories where workspace_id = ws and id = v_cat; if cat.id is null then perform public.fin__err('OWNERSHIP_MISMATCH', 'category'); end if;
    if v_type <> 'Transfer' and cat.kind <> 'Both' and cat.kind <> v_type then perform public.fin__err('CATEGORY_TYPE_MISMATCH'); end if; end if;
  if v_type = 'Transfer' then v_cat := null; end if;

  if v_purpose in ('DebtDisbursement','DebtRepayment','DebtInterest') then
    if v_debt is null then perform public.fin__err('VALIDATION_FAILED', 'debt_id required'); end if;
    select * into dbt from public.finance_debts where workspace_id = ws and id = v_debt; if dbt.id is null then perform public.fin__err('OWNERSHIP_MISMATCH', 'debt'); end if;
    if dbt.lifecycle <> 'Active' then perform public.fin__err('DEBT_NOT_ACTIVE'); end if;
    if dbt.currency <> v_ccy then perform public.fin__err('DEBT_CURRENCY_MISMATCH'); end if;
  end if;
  if v_purpose in ('GoalContribution','GoalWithdrawal') then
    select * into gl from public.finance_goals where workspace_id = ws and id = v_goal; if gl.id is null then perform public.fin__err('OWNERSHIP_MISMATCH', 'goal'); end if;
    if gl.status not in ('Active','Paused') then perform public.fin__err('GOAL_NOT_ACTIVE'); end if;
    if gl.currency <> v_ccy then perform public.fin__err('GOAL_CURRENCY_MISMATCH'); end if;
  end if;
  if v_purpose in ('AssetPurchase','AssetSale') then
    if v_asset is null and not (v_purpose = 'AssetSale' and v_ss = 'inventory') then perform public.fin__err('VALIDATION_FAILED', 'asset_id required'); end if;
    if v_asset is not null then select * into ast from public.finance_assets where workspace_id = ws and id = v_asset; if ast.id is null then perform public.fin__err('OWNERSHIP_MISMATCH', 'asset'); end if;
      if v_purpose = 'AssetSale' and ast.status <> 'Held' then perform public.fin__err('ASSET_NOT_HELD'); end if; end if;
  end if;
  if v_purpose = 'Refund' then
    if v_refund is null then perform public.fin__err('VALIDATION_FAILED', 'refund_of_id required'); end if;
    select * into orig from public.finance_transactions where workspace_id = ws and id = v_refund; if orig.id is null then perform public.fin__err('OWNERSHIP_MISMATCH', 'refund_of'); end if;
    if orig.type <> 'Expense' or orig.status <> 'Posted' then perform public.fin__err('REFUND_TARGET_INVALID'); end if;
    if orig.currency <> v_ccy then perform public.fin__err('REFUND_CURRENCY_MISMATCH'); end if;
    if v_amount + coalesce((select sum(amount) from public.finance_transactions where workspace_id = ws and refund_of_id = orig.id and status = 'Posted' and id <> new_id), 0) > orig.amount then perform public.fin__err('REFUND_EXCEEDS_ORIGINAL'); end if;
    v_cat := orig.category_id;
  end if;
  if v_cat is null and v_purpose = 'Regular' and v_type <> 'Transfer' then v_cat := public.fin__sys_cat(ws, 'uncategorized'); end if;
  if v_purpose = 'Adjustment' then v_cat := public.fin__sys_cat(ws, 'adjustment'); if coalesce(btrim(p->>'notes'), '') = '' then perform public.fin__err('ADJUSTMENT_REQUIRES_NOTE'); end if; end if;

  if v_status = 'Posted' then
    if v_type in ('Expense','Transfer') and fa.id is null then perform public.fin__err('VALIDATION_FAILED', 'from_account required'); end if;
    if v_type in ('Income','Transfer') and ta.id is null then perform public.fin__err('VALIDATION_FAILED', 'to_account required'); end if;
    if v_type = 'Transfer' and fa.id = ta.id then perform public.fin__err('SAME_ACCOUNT_TRANSFER'); end if;
    if v_type = 'Expense' then ta := null; elsif v_type = 'Income' then fa := null; end if;
    if fa.id is not null then
      if fa.status = 'Closed' then perform public.fin__err('ACCOUNT_CLOSED', fa.name); end if;
      if fa.status = 'Archived' and coalesce(p->>'allow_archived', 'false') <> 'true' then perform public.fin__err('ACCOUNT_ARCHIVED', fa.name); end if;
      if v_date < fa.opened_on then perform public.fin__err('BEFORE_ACCOUNT_OPENING', fa.name); end if; end if;
    if ta.id is not null then
      if ta.status = 'Closed' then perform public.fin__err('ACCOUNT_CLOSED', ta.name); end if;
      if ta.status = 'Archived' and coalesce(p->>'allow_archived', 'false') <> 'true' then perform public.fin__err('ACCOUNT_ARCHIVED', ta.name); end if;
      if v_date < ta.opened_on then perform public.fin__err('BEFORE_ACCOUNT_OPENING', ta.name); end if; end if;
    if v_date > today then perform public.fin__err('FUTURE_DATE', 'future entries must be Proposed or recurring'); end if;

    if v_type = 'Expense' then
      if fa.currency = v_ccy then v_from := v_amount; elsif v_from is null then perform public.fin__err('FX_AMOUNT_REQUIRED', 'from_amount in ' || fa.currency); end if;
      v_fx := v_from / v_amount;
      if scale(trim_scale(v_from)) > public.fin__minor(fa.currency) then perform public.fin__err('AMOUNT_PRECISION'); end if;
    elsif v_type = 'Income' then
      if ta.currency = v_ccy then v_to := v_amount; elsif v_to is null then perform public.fin__err('FX_AMOUNT_REQUIRED', 'to_amount in ' || ta.currency); end if;
      v_fx := v_to / v_amount;
      if scale(trim_scale(v_to)) > public.fin__minor(ta.currency) then perform public.fin__err('AMOUNT_PRECISION'); end if;
    else
      if v_ccy <> fa.currency then perform public.fin__err('TRANSFER_CURRENCY_MISMATCH', 'transfer currency must equal source account currency'); end if;
      v_from := v_amount;
      if ta.currency = fa.currency then v_to := v_amount; elsif v_to is null then perform public.fin__err('FX_AMOUNT_REQUIRED', 'to_amount in ' || ta.currency); end if;
      v_fx := v_to / v_amount;
      if scale(trim_scale(v_to)) > public.fin__minor(ta.currency) then perform public.fin__err('AMOUNT_PRECISION'); end if;
    end if;

    -- base amount (priority: a base-currency leg, then base-currency entry, then table rate; never silently zero)
    if v_type = 'Expense' then
      if fa.currency = st.base_currency then v_base := v_from; elsif v_ccy = st.base_currency then v_base := v_amount; end if;
    elsif v_type = 'Income' then
      if ta.currency = st.base_currency then v_base := v_to; elsif v_ccy = st.base_currency then v_base := v_amount; end if;
    else
      if fa.currency = st.base_currency then v_base := v_from; elsif ta.currency = st.base_currency then v_base := v_to; end if;
    end if;
    if v_base is null then v_rate := public.fin__rate(ws, v_ccy, v_date);
      if v_rate is null then v_miss := true; else v_base := round(v_amount * v_rate, public.fin__minor(st.base_currency)); end if; end if;

    if fa.id is not null and fa.nature = 'ASSET' and v_type in ('Expense','Transfer') and st.overdraft_policy <> 'Allow' then
      nb := public.fin__balance(fa.id) - v_from;
      if nb < 0 then
        if st.overdraft_policy = 'Block' and coalesce(p->>'allow_overdraft', 'false') <> 'true' then perform public.fin__err('OVERDRAFT_BLOCKED', fa.name); end if;
        warnings := warnings || to_jsonb('OVERDRAFT_WARNING'::text);
      end if;
    end if;
  else
    if fa.id is null and p->>'from_account_id' is null and v_type in ('Expense','Transfer') then warnings := warnings || to_jsonb('NO_ACCOUNT_RESOLVED'::text); end if;
    if v_type = 'Expense' and fa.id is not null and fa.currency = v_ccy then v_from := v_amount; end if;
    if v_type = 'Income' and ta.id is not null and ta.currency = v_ccy then v_to := v_amount; end if;
  end if;

  begin
    insert into public.finance_transactions(id, workspace_id, name, type, purpose, status, amount, currency, local_date, from_account_id, to_account_id, from_amount, to_amount, fx_rate,
      base_amount, base_currency, base_missing, pnl_effect, flow_class, category_id, merchant, notes, debt_id, goal_id, asset_id, capitalized, refund_of_id, group_ref,
      source_system, source_type, source_id, source_version, client_generated_id, origin, import_batch_id, created_by)
    values (new_id, ws, v_name, v_type, v_purpose, v_status, v_amount, v_ccy, v_date, fa.id, ta.id, v_from, v_to, v_fx,
      v_base, st.base_currency, v_miss, cls[1], cls[2], v_cat, nullif(p->>'merchant', ''), nullif(p->>'notes', ''), v_debt, v_goal, v_asset, v_cap, v_refund, nullif(p->>'group_ref', ''),
      v_ss, v_st, v_si, v_sv, v_cg, coalesce(nullif(p->>'origin', ''), case when v_ss is null then 'manual' else v_ss end), nullif(p->>'import_batch_id', '')::uuid, actor)
    on conflict (id) do update set name = excluded.name, status = excluded.status, local_date = excluded.local_date, from_account_id = excluded.from_account_id, to_account_id = excluded.to_account_id,
      from_amount = excluded.from_amount, to_amount = excluded.to_amount, fx_rate = excluded.fx_rate, base_amount = excluded.base_amount, base_missing = excluded.base_missing,
      category_id = excluded.category_id, notes = excluded.notes, version = public.finance_transactions.version + 1, updated_at = clock_timestamp();
  exception when unique_violation then
    select * into ex from public.finance_transactions where workspace_id = ws and ((v_si is not null and source_system = v_ss and source_type = v_st and source_id = v_si) or (v_cg is not null and client_generated_id = v_cg));
    return jsonb_build_object('created', false, 'duplicate', true, 'transaction_id', ex.id, 'status', ex.status, 'version', ex.version, 'stale', false, 'payload_differs', (ex.amount <> v_amount or ex.currency <> v_ccy or ex.local_date <> v_date));
  end;

  if v_status = 'Posted' then
    if v_type in ('Expense','Transfer') then insert into public.finance_ledger_entries(workspace_id, transaction_id, account_id, leg, amount, currency, base_amount, base_currency, local_date)
      values (ws, new_id, fa.id, 'Out', -v_from, fa.currency, -v_base, st.base_currency, v_date); end if;
    if v_type in ('Income','Transfer') then insert into public.finance_ledger_entries(workspace_id, transaction_id, account_id, leg, amount, currency, base_amount, base_currency, local_date)
      values (ws, new_id, ta.id, 'In', v_to, ta.currency, v_base, st.base_currency, v_date); end if;
  end if;

  select * into res from public.finance_transactions where id = new_id;
  perform public.fin__audit(ws, actor, 'transaction', new_id::text, case when existing is null then 'create' else 'confirm' end, p->>'reason', null,
    jsonb_build_object('type', v_type, 'purpose', v_purpose, 'status', v_status, 'amount', v_amount::text, 'currency', v_ccy, 'local_date', v_date));
  perform public.fin__emit(ws, case when v_status = 'Posted' then 'finance.transaction.posted' else 'finance.transaction.proposed' end, 'transaction', new_id, res.version, p->>'idempotency_key',
    jsonb_build_object('transaction_id', new_id, 'status', v_status, 'purpose', v_purpose, 'type', v_type, 'source_type', v_st, 'source_id', v_si));
  return jsonb_build_object('created', true, 'duplicate', false, 'transaction_id', new_id, 'status', res.status, 'version', res.version, 'amount', v_amount::text, 'currency', v_ccy,
    'base_amount', v_base::text, 'base_missing', v_miss, 'warnings', warnings, 'local_date', res.local_date);
end $$;

-- ───────── public RPC: post (idempotent) ─────────
create or replace function public.fin_post_transaction(p jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare ws uuid := (p->>'workspace_id')::uuid; k text := nullif(p->>'idempotency_key', ''); h text; idem public.finance_idempotency; n int; res jsonb;
begin
  perform public.fin__need(ws, 'ledger', 'edit');
  if k is null and nullif(p->>'client_generated_id', '') is null and nullif(p->>'source_id', '') is null then
    perform public.fin__err('IDEMPOTENCY_KEY_REQUIRED', 'send idempotency_key or client_generated_id (manual entries must be retry-safe)');
  end if;
  if k is not null then
    h := md5((p - 'idempotency_key' - 'correlation_id' - 'causation_id' - 'request_id')::text);
    insert into public.finance_idempotency(workspace_id, key, request_hash) values (ws, k, h) on conflict do nothing;
    get diagnostics n = row_count;
    if n = 0 then
      select * into idem from public.finance_idempotency where workspace_id = ws and key = k;
      if idem.request_hash <> h then perform public.fin__err('IDEMPOTENCY_PAYLOAD_MISMATCH'); end if;
      return coalesce(idem.response, '{}'::jsonb) || jsonb_build_object('replayed', true);
    end if;
  end if;
  res := public.fin__core_post(ws, p, auth.uid());
  if k is not null then update public.finance_idempotency set response = res where workspace_id = ws and key = k; end if;
  return res;
end $$;

revoke all on function public.fin__err(text, text), public.fin__need(uuid, text, text), public.fin__is_manager(uuid), public.fin__settings(uuid), public.fin__rate(uuid, text, date),
  public.fin__balance(uuid, date), public.fin__period_open(uuid, date), public.fin__sys_cat(uuid, text), public.fin__audit(uuid, uuid, text, text, text, text, jsonb, jsonb),
  public.fin__emit(uuid, text, text, uuid, int, text, jsonb), public.fin__core_post(uuid, jsonb, uuid, uuid) from public, anon, authenticated;
revoke all on function public.fin_post_transaction(jsonb) from public, anon;
grant execute on function public.fin_post_transaction(jsonb) to authenticated;
