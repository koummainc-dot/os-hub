-- Finance OS v4.2 — Migration C: reversal/void, proposals, period lock, reconciliation, debts, assets, net worth, from-source, import
create or replace function public.fin__rate(ws uuid, ccy text, d date) returns numeric language plpgsql security definer set search_path = public as $$
declare base text; r numeric;
begin
  select base_currency into base from public.fin__settings(ws);
  if upper(ccy) = base then return 1; end if;
  select rate_to_base into r from public.finance_exchange_rates where workspace_id = ws and currency = upper(ccy) and effective_on <= d order by effective_on desc, created_at desc limit 1;
  return r;
end $$;

create or replace function public.fin__idem_begin(ws uuid, k text, p jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare n int; i public.finance_idempotency; h text := md5((p - 'idempotency_key' - 'request_id')::text);
begin
  if k is null then perform public.fin__err('IDEMPOTENCY_KEY_REQUIRED'); end if;
  insert into public.finance_idempotency(workspace_id, key, request_hash) values (ws, k, h) on conflict do nothing;
  get diagnostics n = row_count;
  if n = 1 then return null; end if;
  select * into i from public.finance_idempotency where workspace_id = ws and key = k;
  if i.request_hash <> h then perform public.fin__err('IDEMPOTENCY_PAYLOAD_MISMATCH'); end if;
  return coalesce(i.response, '{}'::jsonb) || jsonb_build_object('replayed', true);
end $$;
create or replace function public.fin__idem_end(ws uuid, k text, res jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
begin update public.finance_idempotency set response = res where workspace_id = ws and key = k; return res; end $$;

create or replace function public.fin__deps(ws uuid, tx uuid) returns text language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.finance_transactions where workspace_id = ws and refund_of_id = tx and status = 'Posted') then return 'refund'; end if;
  if exists (select 1 from public.finance_debt_movements where workspace_id = ws and reversed_at is null and tx = any(transaction_ids)) then return 'debt_payment'; end if;
  if exists (select 1 from public.finance_reconciliations where workspace_id = ws and adjustment_tx_id = tx and status = 'Completed') then return 'reconciliation_adjustment'; end if;
  return null;
end $$;

create or replace function public.fin__reverse(ws uuid, txid uuid, actor uuid, reason text, allow_reconciled boolean) returns jsonb language plpgsql security definer set search_path = public as $$
declare t public.finance_transactions; st public.finance_settings := public.fin__settings(ws); rid uuid := gen_random_uuid(); rdate date; dep text; e record;
begin
  select * into t from public.finance_transactions where workspace_id = ws and id = txid for update;
  if t.id is null then perform public.fin__err('OWNERSHIP_MISMATCH', 'transaction'); end if;
  if t.status <> 'Posted' or t.reversal_of_id is not null then perform public.fin__err('TRANSACTION_STATE_INVALID', 'only a Posted original can be reversed'); end if;
  if t.reconciled_at is not null and not allow_reconciled then perform public.fin__err('RECONCILED_TRANSACTION', 'cancel the reconciliation first'); end if;
  dep := public.fin__deps(ws, txid); if dep is not null then perform public.fin__err('DEPENDENCY_EXISTS', dep); end if;
  rdate := case when public.fin__period_open(ws, t.local_date) then t.local_date else (now() at time zone st.timezone)::date end;
  insert into public.finance_transactions(id, workspace_id, name, type, purpose, status, amount, currency, local_date, from_account_id, to_account_id, from_amount, to_amount, fx_rate, base_amount, base_currency, base_missing,
    pnl_effect, flow_class, category_id, debt_id, goal_id, asset_id, capitalized, refund_of_id, reversal_of_id, group_ref, origin, created_by)
  values (rid, ws, 'عكس: ' || t.name, t.type, t.purpose, 'Posted', t.amount, t.currency, rdate, t.from_account_id, t.to_account_id, t.from_amount, t.to_amount, t.fx_rate, t.base_amount, t.base_currency, t.base_missing,
    t.pnl_effect, t.flow_class, t.category_id, t.debt_id, t.goal_id, t.asset_id, t.capitalized, t.refund_of_id, t.id, t.group_ref, 'reversal', actor);
  for e in select * from public.finance_ledger_entries where transaction_id = txid and voided_at is null loop
    insert into public.finance_ledger_entries(workspace_id, transaction_id, account_id, leg, amount, currency, base_amount, base_currency, local_date)
    values (ws, rid, e.account_id, case e.leg when 'Out' then 'In' else 'Out' end, -e.amount, e.currency, -e.base_amount, e.base_currency, rdate);
  end loop;
  update public.finance_transactions set status = 'Reversed', version = version + 1, updated_at = clock_timestamp() where id = txid;
  perform public.fin__audit(ws, actor, 'transaction', txid::text, 'reverse', reason, jsonb_build_object('status', 'Posted'), jsonb_build_object('status', 'Reversed', 'reversal_id', rid));
  perform public.fin__emit(ws, 'finance.transaction.reversed', 'transaction', txid, t.version + 1, 'rev:' || txid, jsonb_build_object('transaction_id', txid, 'reversal_id', rid));
  return jsonb_build_object('reversed', true, 'transaction_id', txid, 'reversal_id', rid, 'reversal_date', rdate);
end $$;

create or replace function public.fin__void(ws uuid, txid uuid, actor uuid, reason text) returns jsonb language plpgsql security definer set search_path = public as $$
declare t public.finance_transactions; dep text;
begin
  select * into t from public.finance_transactions where workspace_id = ws and id = txid for update;
  if t.id is null then perform public.fin__err('OWNERSHIP_MISMATCH', 'transaction'); end if;
  if t.status not in ('Proposed','Posted') or t.reversal_of_id is not null then perform public.fin__err('TRANSACTION_STATE_INVALID'); end if;
  if t.status = 'Posted' then
    if not public.fin__period_open(ws, t.local_date) then perform public.fin__err('PERIOD_UNLOCK_REQUIRED', 'use reversal in a locked period'); end if;
    if t.reconciled_at is not null then perform public.fin__err('RECONCILED_TRANSACTION'); end if;
    dep := public.fin__deps(ws, txid); if dep is not null then perform public.fin__err('DEPENDENCY_EXISTS', dep); end if;
    update public.finance_ledger_entries set voided_at = clock_timestamp() where transaction_id = txid and voided_at is null;
  end if;
  update public.finance_transactions set status = 'Voided', version = version + 1, updated_at = clock_timestamp() where id = txid;
  perform public.fin__audit(ws, actor, 'transaction', txid::text, 'void', reason, jsonb_build_object('status', t.status), jsonb_build_object('status', 'Voided'));
  perform public.fin__emit(ws, 'finance.transaction.voided', 'transaction', txid, t.version + 1, 'void:' || txid, jsonb_build_object('transaction_id', txid));
  return jsonb_build_object('voided', true, 'transaction_id', txid);
end $$;

create or replace function public.fin_reverse_transaction(p jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare ws uuid := (p->>'workspace_id')::uuid; r jsonb; res jsonb;
begin
  perform public.fin__need(ws, 'ledger', 'edit');
  if length(btrim(coalesce(p->>'reason', ''))) < 3 then perform public.fin__err('REASON_REQUIRED'); end if;
  r := public.fin__idem_begin(ws, p->>'idempotency_key', p); if r is not null then return r; end if;
  res := public.fin__reverse(ws, (p->>'transaction_id')::uuid, auth.uid(), p->>'reason', false);
  return public.fin__idem_end(ws, p->>'idempotency_key', res);
end $$;

create or replace function public.fin_void_transaction(p jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare ws uuid := (p->>'workspace_id')::uuid; r jsonb; res jsonb;
begin
  perform public.fin__need(ws, 'ledger', 'edit');
  if length(btrim(coalesce(p->>'reason', ''))) < 3 then perform public.fin__err('REASON_REQUIRED'); end if;
  r := public.fin__idem_begin(ws, p->>'idempotency_key', p); if r is not null then return r; end if;
  res := public.fin__void(ws, (p->>'transaction_id')::uuid, auth.uid(), p->>'reason');
  return public.fin__idem_end(ws, p->>'idempotency_key', res);
end $$;

create or replace function public.fin_confirm_proposal(p jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare ws uuid := (p->>'workspace_id')::uuid; t public.finance_transactions; r jsonb; payload jsonb; res jsonb;
begin
  perform public.fin__need(ws, 'ledger', 'edit');
  r := public.fin__idem_begin(ws, p->>'idempotency_key', p); if r is not null then return r; end if;
  select * into t from public.finance_transactions where workspace_id = ws and id = (p->>'transaction_id')::uuid for update;
  if t.id is null then perform public.fin__err('OWNERSHIP_MISMATCH'); end if;
  if t.status <> 'Proposed' then perform public.fin__err('TRANSACTION_STATE_INVALID', 'only Proposed can be confirmed'); end if;
  payload := to_jsonb(t) || (p - 'workspace_id' - 'transaction_id' - 'idempotency_key') || jsonb_build_object('status', 'Posted', 'workspace_id', ws, 'amount', t.amount::text);
  res := public.fin__core_post(ws, payload, auth.uid(), t.id);
  return public.fin__idem_end(ws, p->>'idempotency_key', res);
end $$;

create or replace function public.fin_set_lock(p jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare ws uuid := (p->>'workspace_id')::uuid; st public.finance_settings; nd date := nullif(p->>'lock_before_date', '')::date;
begin
  perform public.fin__need(ws, 'settings', 'edit');
  if not public.fin__is_manager(ws) then perform public.fin__err('FORBIDDEN', 'period lock needs manage'); end if;
  st := public.fin__settings(ws);
  if (nd is null and st.lock_before_date is not null) or (nd is not null and st.lock_before_date is not null and nd < st.lock_before_date) then
    if length(btrim(coalesce(p->>'reason', ''))) < 3 then perform public.fin__err('REASON_REQUIRED', 'reopening a period needs a documented reason'); end if;
  end if;
  update public.finance_settings set lock_before_date = nd, updated_at = now() where workspace_id = ws;
  perform public.fin__audit(ws, auth.uid(), 'period', 'lock', case when nd is null or (st.lock_before_date is not null and nd < st.lock_before_date) then 'unlock' else 'lock' end, p->>'reason',
    jsonb_build_object('lock_before_date', st.lock_before_date), jsonb_build_object('lock_before_date', nd));
  return jsonb_build_object('lock_before_date', nd);
end $$;

create or replace function public.fin_update_settings(p jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare ws uuid := (p->>'workspace_id')::uuid; st public.finance_settings;
begin
  perform public.fin__need(ws, 'settings', 'edit');
  if not public.fin__is_manager(ws) then perform public.fin__err('FORBIDDEN', 'settings need manage'); end if;
  st := public.fin__settings(ws);
  if p ? 'base_currency' and upper(p->>'base_currency') <> st.base_currency and exists (select 1 from public.finance_transactions where workspace_id = ws) then perform public.fin__err('BASE_CURRENCY_LOCKED', 'rebase is an audited admin operation'); end if;
  update public.finance_settings set base_currency = upper(coalesce(p->>'base_currency', base_currency)), timezone = coalesce(p->>'timezone', timezone),
    overdraft_policy = coalesce(p->>'overdraft_policy', overdraft_policy), sale_fee_policy = coalesce(p->>'sale_fee_policy', sale_fee_policy),
    receivables_in_net_worth = coalesce((p->>'receivables_in_net_worth')::boolean, receivables_in_net_worth), updated_at = now() where workspace_id = ws;
  perform public.fin__audit(ws, auth.uid(), 'settings', ws::text, 'update', p->>'reason', to_jsonb(st), p - 'workspace_id');
  return to_jsonb((select s from public.finance_settings s where workspace_id = ws));
end $$;

create or replace function public.fin_add_rate(p jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare ws uuid := (p->>'workspace_id')::uuid; rt numeric := public.fin__num(p, 'rate_to_base'); d date := (p->>'effective_on')::date; st public.finance_settings;
begin
  perform public.fin__need(ws, 'fxrates', 'edit'); st := public.fin__settings(ws);
  if rt is null or rt <= 0 then perform public.fin__err('VALIDATION_FAILED', 'rate > 0'); end if;
  if upper(p->>'currency') = st.base_currency then perform public.fin__err('VALIDATION_FAILED', 'base currency rate is always 1'); end if;
  if d > (now() at time zone st.timezone)::date + 1 then perform public.fin__err('FUTURE_DATE'); end if;
  insert into public.finance_exchange_rates(workspace_id, currency, rate_to_base, effective_on, source) values (ws, upper(p->>'currency'), rt, d, coalesce(p->>'source', 'manual'));
  return jsonb_build_object('ok', true);
end $$;

-- ───────── reconciliation ─────────
create or replace function public.fin_reconciliation_create(p jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare ws uuid := (p->>'workspace_id')::uuid; a public.finance_accounts; sb numeric := public.fin__num(p, 'statement_balance'); cd date := (p->>'cutoff_date')::date; lb numeric; id uuid := gen_random_uuid(); st public.finance_settings;
begin
  perform public.fin__need(ws, 'reconciliations', 'edit'); st := public.fin__settings(ws);
  select * into a from public.finance_accounts where workspace_id = ws and id = (p->>'account_id')::uuid; if a.id is null then perform public.fin__err('OWNERSHIP_MISMATCH', 'account'); end if;
  if sb is null or cd is null then perform public.fin__err('VALIDATION_FAILED'); end if;
  if cd > (now() at time zone st.timezone)::date then perform public.fin__err('FUTURE_DATE'); end if;
  lb := public.fin__balance(a.id, cd);
  insert into public.finance_reconciliations(id, workspace_id, account_id, cutoff_date, statement_balance, ledger_balance, difference) values (id, ws, a.id, cd, sb, lb, sb - lb);
  perform public.fin__audit(ws, auth.uid(), 'reconciliation', id::text, 'create', null, null, jsonb_build_object('difference', (sb - lb)::text));
  return jsonb_build_object('reconciliation_id', id, 'ledger_balance', lb::text, 'difference', (sb - lb)::text, 'status', 'Draft');
end $$;

create or replace function public.fin_reconciliation_review(p jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare ws uuid := (p->>'workspace_id')::uuid; r public.finance_reconciliations; lb numeric; dec text := p->>'decision';
begin
  perform public.fin__need(ws, 'reconciliations', 'edit');
  select * into r from public.finance_reconciliations where workspace_id = ws and id = (p->>'reconciliation_id')::uuid for update; if r.id is null then perform public.fin__err('OWNERSHIP_MISMATCH'); end if;
  if r.status = 'Completed' then perform public.fin__err('RECONCILIATION_ALREADY_COMPLETED'); end if;
  if r.status <> 'Draft' then perform public.fin__err('TRANSACTION_STATE_INVALID'); end if;
  lb := public.fin__balance(r.account_id, r.cutoff_date);
  if dec = 'match' and r.statement_balance - lb <> 0 then perform public.fin__err('RECONCILIATION_DIFF_UNCONFIRMED', 'difference is ' || (r.statement_balance - lb)); end if;
  if dec = 'adjust' and (r.statement_balance - lb = 0 or length(btrim(coalesce(p->>'reason', ''))) < 3) then perform public.fin__err('RECONCILIATION_DIFF_UNCONFIRMED', 'adjust needs a non-zero difference and a reason'); end if;
  if dec not in ('match','adjust') then perform public.fin__err('VALIDATION_FAILED', 'decision'); end if;
  update public.finance_reconciliations set status = 'Reviewed', decision = dec, reason = p->>'reason', ledger_balance = lb, difference = r.statement_balance - lb, reviewed_by = auth.uid(), reviewed_at = now(), version = version + 1 where id = r.id;
  perform public.fin__audit(ws, auth.uid(), 'reconciliation', r.id::text, 'review', p->>'reason', null, jsonb_build_object('decision', dec));
  return jsonb_build_object('status', 'Reviewed', 'difference', (r.statement_balance - lb)::text);
end $$;

create or replace function public.fin_reconciliation_complete(p jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare ws uuid := (p->>'workspace_id')::uuid; r public.finance_reconciliations; lb numeric; diff numeric; adj jsonb; adj_id uuid; k text := p->>'idempotency_key'; rr jsonb;
begin
  perform public.fin__need(ws, 'reconciliations', 'edit');
  rr := public.fin__idem_begin(ws, k, p); if rr is not null then return rr; end if;
  select * into r from public.finance_reconciliations where workspace_id = ws and id = (p->>'reconciliation_id')::uuid for update; if r.id is null then perform public.fin__err('OWNERSHIP_MISMATCH'); end if;
  if r.status = 'Completed' then perform public.fin__err('RECONCILIATION_ALREADY_COMPLETED'); end if;
  if r.status <> 'Reviewed' then perform public.fin__err('TRANSACTION_STATE_INVALID', 'review before completing'); end if;
  lb := public.fin__balance(r.account_id, r.cutoff_date); diff := r.statement_balance - lb;
  if diff <> r.difference then perform public.fin__err('RECONCILIATION_STALE', 'ledger changed since review'); end if;
  if diff <> 0 then
    if r.decision <> 'adjust' then perform public.fin__err('RECONCILIATION_DIFF_UNCONFIRMED'); end if;
    adj := public.fin__core_post(ws, jsonb_build_object('type', case when diff > 0 then 'Income' else 'Expense' end, 'purpose', 'Adjustment', 'amount', abs(diff)::text, 'currency', (select currency from public.finance_accounts where id = r.account_id),
      'local_date', r.cutoff_date::text, 'name', 'تسوية رصيد', 'notes', r.reason, 'reason', r.reason, 'allow_archived', 'true',
      case when diff > 0 then 'to_account_id' else 'from_account_id' end, r.account_id::text, 'source_system', 'finance', 'source_type', 'reconciliation_adjustment', 'source_id', r.id::text, 'idempotency_key', 'recon:' || r.id), auth.uid());
    adj_id := (adj->>'transaction_id')::uuid;
    if public.fin__balance(r.account_id, r.cutoff_date) <> r.statement_balance then perform public.fin__err('RECONCILIATION_DIFF_UNCONFIRMED', 'balance still differs after adjustment'); end if;
  end if;
  update public.finance_transactions set reconciled_at = now(), reconciliation_id = r.id where workspace_id = ws and status = 'Posted' and reconciled_at is null and local_date <= r.cutoff_date and (from_account_id = r.account_id or to_account_id = r.account_id);
  update public.finance_reconciliations set status = 'Completed', adjustment_tx_id = adj_id, completed_by = auth.uid(), completed_at = now(), version = version + 1 where id = r.id;
  perform public.fin__audit(ws, auth.uid(), 'reconciliation', r.id::text, 'complete', r.reason, null, jsonb_build_object('adjustment_tx_id', adj_id, 'difference', diff::text));
  return public.fin__idem_end(ws, k, jsonb_build_object('status', 'Completed', 'adjustment_tx_id', adj_id, 'difference', diff::text));
end $$;

create or replace function public.fin_reconciliation_cancel(p jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare ws uuid := (p->>'workspace_id')::uuid; r public.finance_reconciliations; rv jsonb;
begin
  perform public.fin__need(ws, 'reconciliations', 'edit');
  if not public.fin__is_manager(ws) then perform public.fin__err('FORBIDDEN', 'cancelling a completed reconciliation needs manage'); end if;
  if length(btrim(coalesce(p->>'reason', ''))) < 3 then perform public.fin__err('REASON_REQUIRED'); end if;
  select * into r from public.finance_reconciliations where workspace_id = ws and id = (p->>'reconciliation_id')::uuid for update; if r.id is null then perform public.fin__err('OWNERSHIP_MISMATCH'); end if;
  if r.status <> 'Completed' then perform public.fin__err('TRANSACTION_STATE_INVALID', 'only a Completed reconciliation can be cancelled'); end if;
  update public.finance_transactions set reconciled_at = null where workspace_id = ws and reconciliation_id = r.id;
  update public.finance_reconciliations set status = 'Cancelled', version = version + 1 where id = r.id;
  if r.adjustment_tx_id is not null then rv := public.fin__reverse(ws, r.adjustment_tx_id, auth.uid(), 'cancel reconciliation: ' || (p->>'reason'), true); end if;
  perform public.fin__audit(ws, auth.uid(), 'reconciliation', r.id::text, 'cancel', p->>'reason', jsonb_build_object('status', 'Completed'), jsonb_build_object('status', 'Cancelled', 'reversal', rv));
  return jsonb_build_object('status', 'Cancelled', 'reversal', rv);
end $$;

-- ───────── debts: principal / interest / fees are separate; installments never inflate expenses ─────────
create or replace function public.fin__debt_remaining(d uuid) returns numeric language sql stable security definer set search_path = public as $$
  select x.principal_amount - coalesce((select sum(principal) from public.finance_debt_movements m where m.debt_id = x.id and m.reversed_at is null and m.kind in ('Payment','Forgiveness','WriteOff')), 0)
  from public.finance_debts x where x.id = d $$;
create or replace function public.fin__debt_accrued(d uuid) returns numeric language sql stable security definer set search_path = public as $$
  select greatest(coalesce(sum(case when kind in ('InterestCharge') then interest when kind = 'LateFee' then fees else 0 end), 0)
    - coalesce(sum(case when kind = 'Payment' then interest + fees else 0 end), 0), 0)
  from public.finance_debt_movements where debt_id = d and reversed_at is null $$;

create or replace function public.fin_debt_create(p jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare ws uuid := (p->>'workspace_id')::uuid; r jsonb; id uuid := gen_random_uuid(); amt numeric := public.fin__num(p, 'principal'); dir text := p->>'direction'; ccy text := upper(p->>'currency');
  la uuid := nullif(p->>'liability_account_id', '')::uuid; acc public.finance_accounts; it jsonb; n int := 0; prev date; sum_p numeric := 0; sd date := (p->>'start_date')::date; dis jsonb; da uuid := nullif(p->>'disbursement_account_id', '')::uuid;
begin
  perform public.fin__need(ws, 'debts', 'edit');
  r := public.fin__idem_begin(ws, p->>'idempotency_key', p); if r is not null then return r; end if;
  if amt is null or amt <= 0 or dir not in ('IOwe','OwedToMe') or ccy !~ '^[A-Z]{3}$' or sd is null then perform public.fin__err('VALIDATION_FAILED'); end if;
  if la is not null then
    select * into acc from public.finance_accounts where workspace_id = ws and id = la;
    if acc.id is null then perform public.fin__err('OWNERSHIP_MISMATCH', 'liability account'); end if;
    if acc.nature <> 'LIABILITY' or acc.currency <> ccy or dir <> 'IOwe' then perform public.fin__err('LIABILITY_ACCOUNT_INVALID'); end if;
  end if;
  begin
    insert into public.finance_debts(id, workspace_id, name, direction, counterparty, currency, principal_amount, start_date, interest_method, liability_account_id)
    values (id, ws, coalesce(nullif(btrim(p->>'name'), ''), 'دين'), dir, nullif(p->>'counterparty', ''), ccy, amt, sd, coalesce(p->>'interest_method', 'None'), la);
  exception when unique_violation then perform public.fin__err('LIABILITY_DOUBLE_COUNT', 'this liability account already backs another active debt'); end;
  for it in select * from jsonb_array_elements(coalesce(p->'installments', '[]'::jsonb)) loop
    n := n + 1;
    if prev is not null and (it->>'due_date')::date < prev then perform public.fin__err('VALIDATION_FAILED', 'installment dates must ascend'); end if;
    prev := (it->>'due_date')::date; sum_p := sum_p + coalesce(public.fin__num(it, 'principal'), 0);
    insert into public.finance_debt_installments(workspace_id, debt_id, seq, due_date, principal_due, interest_due, fees_due)
    values (ws, id, n, prev, coalesce(public.fin__num(it, 'principal'), 0), coalesce(public.fin__num(it, 'interest'), 0), coalesce(public.fin__num(it, 'fees'), 0));
  end loop;
  if sum_p > amt then perform public.fin__err('VALIDATION_FAILED', 'installment principal exceeds debt principal'); end if;
  if da is not null then
    dis := public.fin__core_post(ws, jsonb_build_object('purpose', 'DebtDisbursement', 'debt_id', id::text, 'amount', amt::text, 'currency', ccy, 'local_date', sd::text, 'name', 'صرف دين: ' || coalesce(p->>'name', ''),
      'type', case when la is not null then 'Transfer' when dir = 'IOwe' then 'Income' else 'Expense' end,
      'from_account_id', case when la is not null then la::text when dir = 'OwedToMe' then da::text end,
      'to_account_id', case when la is not null or dir = 'IOwe' then da::text end,
      'source_system', 'finance', 'source_type', 'debt_disbursement', 'source_id', id::text), auth.uid());
  end if;
  perform public.fin__audit(ws, auth.uid(), 'debt', id::text, 'create', null, null, jsonb_build_object('principal', amt::text, 'direction', dir));
  return public.fin__idem_end(ws, p->>'idempotency_key', jsonb_build_object('debt_id', id, 'disbursement', dis));
end $$;

create or replace function public.fin_debt_payment(p jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare ws uuid := (p->>'workspace_id')::uuid; r jsonb; d public.finance_debts; acc public.finance_accounts; pr numeric := coalesce(public.fin__num(p, 'principal'), 0); it numeric := coalesce(public.fin__num(p, 'interest'), 0); fe numeric := coalesce(public.fin__num(p, 'fees'), 0);
  mid uuid := gen_random_uuid(); ld date := (p->>'local_date')::date; inst uuid := nullif(p->>'installment_id', '')::uuid; ids uuid[] := '{}'; t jsonb; grp text; base jsonb; fcat uuid;
begin
  perform public.fin__need(ws, 'debts', 'edit'); perform public.fin__need(ws, 'ledger', 'edit');
  r := public.fin__idem_begin(ws, p->>'idempotency_key', p); if r is not null then return r; end if;
  select * into d from public.finance_debts where workspace_id = ws and id = (p->>'debt_id')::uuid for update; if d.id is null then perform public.fin__err('OWNERSHIP_MISMATCH', 'debt'); end if;
  if d.lifecycle <> 'Active' then perform public.fin__err('DEBT_NOT_ACTIVE'); end if;
  select * into acc from public.finance_accounts where workspace_id = ws and id = (p->>'account_id')::uuid; if acc.id is null then perform public.fin__err('OWNERSHIP_MISMATCH', 'account'); end if;
  if acc.currency <> d.currency then perform public.fin__err('DEBT_CURRENCY_MISMATCH'); end if;
  if pr + it + fe <= 0 then perform public.fin__err('VALIDATION_FAILED', 'payment must be positive'); end if;
  if pr > public.fin__debt_remaining(d.id) then perform public.fin__err('PRINCIPAL_EXCEEDS_REMAINING', 'remaining ' || public.fin__debt_remaining(d.id)); end if;
  if fe > 0 and d.direction = 'OwedToMe' then perform public.fin__err('VALIDATION_FAILED', 'fees are not supported on receivables'); end if;
  if inst is not null and not exists (select 1 from public.finance_debt_installments where workspace_id = ws and id = inst and debt_id = d.id) then perform public.fin__err('OWNERSHIP_MISMATCH', 'installment'); end if;
  grp := 'dp:' || mid;
  base := jsonb_build_object('currency', d.currency, 'local_date', ld::text, 'debt_id', d.id::text, 'group_ref', grp, 'source_system', 'finance');
  fcat := public.fin__sys_cat(ws, 'interest_fees');
  if pr > 0 then
    t := public.fin__core_post(ws, base || jsonb_build_object('purpose', 'DebtRepayment', 'amount', pr::text, 'name', 'سداد أصل: ' || d.name, 'source_type', 'debt_principal', 'source_id', mid::text,
      'type', case when d.liability_account_id is not null then 'Transfer' when d.direction = 'IOwe' then 'Expense' else 'Income' end,
      'from_account_id', case when d.direction = 'IOwe' then acc.id::text end,
      'to_account_id', case when d.liability_account_id is not null then d.liability_account_id::text when d.direction = 'OwedToMe' then acc.id::text end), auth.uid());
    ids := ids || (t->>'transaction_id')::uuid;
  end if;
  if it > 0 then
    t := public.fin__core_post(ws, base || jsonb_build_object('purpose', 'DebtInterest', 'amount', it::text, 'name', 'فائدة: ' || d.name, 'source_type', 'debt_interest', 'source_id', mid::text, 'category_id', fcat::text,
      'type', case when d.direction = 'IOwe' then 'Expense' else 'Income' end, case when d.direction = 'IOwe' then 'from_account_id' else 'to_account_id' end, acc.id::text), auth.uid());
    ids := ids || (t->>'transaction_id')::uuid;
  end if;
  if fe > 0 then
    t := public.fin__core_post(ws, base - 'debt_id' || jsonb_build_object('purpose', 'Regular', 'type', 'Expense', 'amount', fe::text, 'name', 'رسوم: ' || d.name, 'source_type', 'debt_fees', 'source_id', mid::text, 'category_id', fcat::text, 'from_account_id', acc.id::text), auth.uid());
    ids := ids || (t->>'transaction_id')::uuid;
  end if;
  begin
    insert into public.finance_debt_movements(id, workspace_id, debt_id, kind, principal, interest, fees, local_date, installment_id, payment_ref, transaction_ids, reason)
    values (mid, ws, d.id, 'Payment', pr, it, fe, ld, inst, grp, ids, p->>'reason');
  exception when unique_violation then perform public.fin__err('INSTALLMENT_ALREADY_PAID'); end;
  perform public.fin__audit(ws, auth.uid(), 'debt', d.id::text, 'payment', p->>'reason', null, jsonb_build_object('principal', pr::text, 'interest', it::text, 'fees', fe::text, 'movement_id', mid));
  perform public.fin__emit(ws, 'finance.debt.payment_posted', 'debt', d.id, (select version from public.finance_debts where id = d.id) + (select count(*)::int from public.finance_debt_movements where debt_id = d.id), 'dp:' || mid, jsonb_build_object('debt_id', d.id, 'movement_id', mid));
  return public.fin__idem_end(ws, p->>'idempotency_key', jsonb_build_object('movement_id', mid, 'transaction_ids', ids, 'remaining_principal', public.fin__debt_remaining(d.id)::text));
end $$;

create or replace function public.fin_debt_payment_reverse(p jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare ws uuid := (p->>'workspace_id')::uuid; m public.finance_debt_movements; tid uuid; r jsonb;
begin
  perform public.fin__need(ws, 'debts', 'edit'); perform public.fin__need(ws, 'ledger', 'edit');
  if length(btrim(coalesce(p->>'reason', ''))) < 3 then perform public.fin__err('REASON_REQUIRED'); end if;
  r := public.fin__idem_begin(ws, p->>'idempotency_key', p); if r is not null then return r; end if;
  select * into m from public.finance_debt_movements where workspace_id = ws and id = (p->>'movement_id')::uuid for update; if m.id is null then perform public.fin__err('OWNERSHIP_MISMATCH'); end if;
  if m.kind <> 'Payment' or m.reversed_at is not null then perform public.fin__err('TRANSACTION_STATE_INVALID'); end if;
  update public.finance_debt_movements set reversed_at = now() where id = m.id;
  foreach tid in array m.transaction_ids loop perform public.fin__reverse(ws, tid, auth.uid(), 'reverse debt payment: ' || (p->>'reason'), false); end loop;
  perform public.fin__audit(ws, auth.uid(), 'debt', m.debt_id::text, 'payment_reverse', p->>'reason', null, jsonb_build_object('movement_id', m.id));
  return public.fin__idem_end(ws, p->>'idempotency_key', jsonb_build_object('reversed', true, 'remaining_principal', public.fin__debt_remaining(m.debt_id)::text));
end $$;

create or replace function public.fin_debt_adjust(p jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare ws uuid := (p->>'workspace_id')::uuid; r jsonb; d public.finance_debts; kd text := p->>'kind'; amt numeric := public.fin__num(p, 'amount'); ld date := (p->>'local_date')::date; mid uuid := gen_random_uuid();
begin
  perform public.fin__need(ws, 'debts', 'edit');
  r := public.fin__idem_begin(ws, p->>'idempotency_key', p); if r is not null then return r; end if;
  if kd not in ('Forgiveness','WriteOff','InterestCharge','LateFee') or amt is null or amt <= 0 or ld is null then perform public.fin__err('VALIDATION_FAILED'); end if;
  if length(btrim(coalesce(p->>'reason', ''))) < 3 then perform public.fin__err('REASON_REQUIRED'); end if;
  if not public.fin__period_open(ws, ld) then perform public.fin__err('PERIOD_UNLOCK_REQUIRED'); end if;
  select * into d from public.finance_debts where workspace_id = ws and id = (p->>'debt_id')::uuid for update; if d.id is null then perform public.fin__err('OWNERSHIP_MISMATCH'); end if;
  if d.lifecycle <> 'Active' then perform public.fin__err('DEBT_NOT_ACTIVE'); end if;
  if kd in ('Forgiveness','WriteOff') and amt > public.fin__debt_remaining(d.id) then perform public.fin__err('PRINCIPAL_EXCEEDS_REMAINING'); end if;
  insert into public.finance_debt_movements(id, workspace_id, debt_id, kind, principal, interest, fees, local_date, reason)
  values (mid, ws, d.id, kd, case when kd in ('Forgiveness','WriteOff') then amt else 0 end, case when kd = 'InterestCharge' then amt else 0 end, case when kd = 'LateFee' then amt else 0 end, ld, p->>'reason');
  perform public.fin__audit(ws, auth.uid(), 'debt', d.id::text, lower(kd), p->>'reason', null, jsonb_build_object('amount', amt::text));
  return public.fin__idem_end(ws, p->>'idempotency_key', jsonb_build_object('movement_id', mid, 'remaining_principal', public.fin__debt_remaining(d.id)::text, 'accrued_unpaid', public.fin__debt_accrued(d.id)::text));
end $$;

create or replace function public.fin_debt_set_lifecycle(p jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare ws uuid := (p->>'workspace_id')::uuid; d public.finance_debts; tl text := p->>'to';
begin
  perform public.fin__need(ws, 'debts', 'edit');
  select * into d from public.finance_debts where workspace_id = ws and id = (p->>'debt_id')::uuid for update; if d.id is null then perform public.fin__err('OWNERSHIP_MISMATCH'); end if;
  if tl not in ('Closed','Cancelled') then perform public.fin__err('VALIDATION_FAILED'); end if;
  if tl = 'Closed' and (public.fin__debt_remaining(d.id) <> 0 or public.fin__debt_accrued(d.id) <> 0) then perform public.fin__err('DEBT_HAS_BALANCE', 'forgive or write off the remainder first'); end if;
  if tl = 'Cancelled' and exists (select 1 from public.finance_debt_movements where debt_id = d.id and kind = 'Payment' and reversed_at is null) then perform public.fin__err('DEPENDENCY_EXISTS', 'debt has payments'); end if;
  update public.finance_debts set lifecycle = tl where id = d.id;
  perform public.fin__audit(ws, auth.uid(), 'debt', d.id::text, 'lifecycle', p->>'reason', jsonb_build_object('lifecycle', d.lifecycle), jsonb_build_object('lifecycle', tl));
  return jsonb_build_object('lifecycle', tl);
end $$;

-- ───────── assets: an inventory estimate NEVER enters net worth until Finance confirms it ─────────
create or replace function public.fin_asset_upsert(p jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare ws uuid := (p->>'workspace_id')::uuid; id uuid := coalesce(nullif(p->>'id', '')::uuid, gen_random_uuid()); old public.finance_assets; src text := coalesce(p->>'valuation_source', 'manual'); conf boolean; acc uuid := nullif(p->>'account_id', '')::uuid;
begin
  perform public.fin__need(ws, 'assets', 'edit');
  select * into old from public.finance_assets where workspace_id = ws and id = id;
  if coalesce(p->>'asset_type', 'Other') = 'Cash-like' and acc is not null then perform public.fin__err('CASH_LIKE_USE_ACCOUNT', 'cash belongs in an account'); end if;
  conf := case when src = 'inventory_estimate' then false else true end;
  if old.id is not null and src = 'inventory_estimate' and public.fin__num(p, 'current_value') is not distinct from old.current_value then conf := old.valuation_confirmed; end if;
  begin
    insert into public.finance_assets(id, workspace_id, name, asset_type, currency, purchase_value, current_value, valuation_date, valuation_source, valuation_confirmed, inventory_item_ref, include_in_net_worth, account_id)
    values (id, ws, p->>'name', coalesce(p->>'asset_type', 'Other'), upper(p->>'currency'), coalesce(public.fin__num(p, 'purchase_value'), 0), coalesce(public.fin__num(p, 'current_value'), 0), nullif(p->>'valuation_date', '')::date, src, conf, nullif(p->>'inventory_item_ref', ''), coalesce((p->>'include_in_net_worth')::boolean, true), acc)
    on conflict (id) do update set name = excluded.name, asset_type = excluded.asset_type, purchase_value = excluded.purchase_value, current_value = excluded.current_value, valuation_date = excluded.valuation_date,
      valuation_source = excluded.valuation_source, valuation_confirmed = excluded.valuation_confirmed, include_in_net_worth = excluded.include_in_net_worth, account_id = excluded.account_id, version = public.finance_assets.version + 1, updated_at = now();
  exception when unique_violation then perform public.fin__err('SOURCE_IDENTITY_CONFLICT', 'this inventory item already has a finance asset'); end;
  perform public.fin__audit(ws, auth.uid(), 'asset', id::text, case when old.id is null then 'create' else 'update' end, p->>'reason', to_jsonb(old), jsonb_build_object('value', p->>'current_value', 'source', src));
  return jsonb_build_object('asset_id', id, 'valuation_confirmed', conf);
end $$;

create or replace function public.fin_asset_confirm_valuation(p jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare ws uuid := (p->>'workspace_id')::uuid; a public.finance_assets;
begin
  perform public.fin__need(ws, 'assets', 'edit');
  if length(btrim(coalesce(p->>'reason', ''))) < 3 then perform public.fin__err('REASON_REQUIRED'); end if;
  select * into a from public.finance_assets where workspace_id = ws and id = (p->>'asset_id')::uuid for update; if a.id is null then perform public.fin__err('OWNERSHIP_MISMATCH'); end if;
  update public.finance_assets set valuation_confirmed = true, valuation_source = 'manual', current_value = coalesce(public.fin__num(p, 'current_value'), current_value), valuation_date = (now())::date, version = version + 1, updated_at = now() where id = a.id;
  perform public.fin__audit(ws, auth.uid(), 'asset', a.id::text, 'confirm_valuation', p->>'reason', jsonb_build_object('source', a.valuation_source, 'confirmed', a.valuation_confirmed), jsonb_build_object('source', 'manual', 'confirmed', true));
  return jsonb_build_object('confirmed', true);
end $$;

-- ───────── read models ─────────
create or replace function public.fin_balances(p_ws uuid) returns jsonb language plpgsql security definer set search_path = public as $$
declare st public.finance_settings; out jsonb := '[]'::jsonb; a record; b numeric; r numeric;
begin
  perform public.fin__need(p_ws, 'accounts', 'view'); st := public.fin__settings(p_ws);
  for a in select * from public.finance_accounts where workspace_id = p_ws order by created_at loop
    b := public.fin__balance(a.id); r := public.fin__rate(p_ws, a.currency, (now() at time zone st.timezone)::date);
    out := out || jsonb_build_object('account_id', a.id, 'balance', b::text, 'currency', a.currency, 'base_value', case when r is null then null else round(b * r, public.fin__minor(st.base_currency))::text end);
  end loop;
  return out;
end $$;

create or replace function public.fin_period_summary(p_ws uuid, p_from date, p_to date) returns jsonb language plpgsql security definer set search_path = public as $$
declare inc numeric; exp numeric; unv int; cnt int; cats jsonb;
begin
  perform public.fin__need(p_ws, 'dashboard', 'view');
  select coalesce(sum(case when pnl_effect = 'Income' then base_amount * sg end), 0), coalesce(sum(case when pnl_effect = 'Expense' then base_amount * sg when pnl_effect = 'ExpenseReduction' then -base_amount * sg end), 0),
         count(*) filter (where base_missing and pnl_effect <> 'None'), count(*) filter (where pnl_effect <> 'None')
    into inc, exp, unv, cnt
  from (select *, case when reversal_of_id is not null then -1 else 1 end as sg from public.finance_transactions where workspace_id = p_ws and status in ('Posted','Reversed') and local_date between p_from and p_to) t;
  select coalesce(jsonb_agg(jsonb_build_object('category_id', category_id, 'total', total::text) order by total desc), '[]'::jsonb) into cats from (
    select category_id, sum(case when pnl_effect = 'Expense' then base_amount * sg else -base_amount * sg end) as total
    from (select *, case when reversal_of_id is not null then -1 else 1 end as sg from public.finance_transactions where workspace_id = p_ws and status in ('Posted','Reversed') and local_date between p_from and p_to and pnl_effect in ('Expense','ExpenseReduction')) t group by category_id) c;
  return jsonb_build_object('income', inc::text, 'expense', exp::text, 'net_operating', (inc - exp)::text, 'savings_rate', case when inc > 0 then round((inc - exp) / inc * 100, 1)::text else null end, 'unvalued', unv, 'count', cnt, 'by_category', cats);
end $$;

create or replace function public.fin_net_worth(p_ws uuid, p_as_of date default null) returns jsonb language plpgsql security definer set search_path = public as $$
declare st public.finance_settings; d date; a record; s record; dt record; r numeric; b numeric; v numeric; rem numeric; accr numeric; mn int;
  acc_t numeric := 0; ast_t numeric := 0; pay_t numeric := 0; rec_t numeric := 0; comps jsonb := '[]'::jsonb; excl jsonb := '[]'::jsonb; unv jsonb := '[]'::jsonb;
begin
  perform public.fin__need(p_ws, 'networth', 'view'); st := public.fin__settings(p_ws); mn := public.fin__minor(st.base_currency);
  d := coalesce(p_as_of, (now() at time zone st.timezone)::date);
  for a in select * from public.finance_accounts where workspace_id = p_ws and opened_on <= d and not (status = 'Closed' and false) loop
    b := public.fin__balance(a.id, d);
    if not a.include_in_net_worth then excl := excl || jsonb_build_object('kind', 'account', 'name', a.name, 'reason', 'EXCLUDED_BY_USER', 'amount', b::text, 'currency', a.currency); continue; end if;
    if a.status = 'Closed' and b = 0 then continue; end if;
    r := public.fin__rate(p_ws, a.currency, d);
    if r is null then unv := unv || jsonb_build_object('kind', 'account', 'name', a.name, 'reason', 'NO_RATE', 'amount', b::text, 'currency', a.currency); continue; end if;
    v := round(b * r, mn); acc_t := acc_t + v;
    comps := comps || jsonb_build_object('kind', 'account', 'name', a.name, 'currency', a.currency, 'amount', b::text, 'rate', r::text, 'base_value', v::text);
  end loop;
  for s in select * from public.finance_assets where workspace_id = p_ws and status = 'Held' loop
    if s.valuation_source = 'inventory_estimate' and not s.valuation_confirmed then excl := excl || jsonb_build_object('kind', 'asset', 'name', s.name, 'reason', 'INVENTORY_ESTIMATE_NOT_CONFIRMED', 'amount', s.current_value::text, 'currency', s.currency); continue; end if;
    if not s.include_in_net_worth then excl := excl || jsonb_build_object('kind', 'asset', 'name', s.name, 'reason', 'EXCLUDED_BY_USER', 'amount', s.current_value::text, 'currency', s.currency); continue; end if;
    r := public.fin__rate(p_ws, s.currency, d);
    if r is null then unv := unv || jsonb_build_object('kind', 'asset', 'name', s.name, 'reason', 'NO_RATE', 'amount', s.current_value::text, 'currency', s.currency); continue; end if;
    v := round(s.current_value * r, mn); ast_t := ast_t + v;
    comps := comps || jsonb_build_object('kind', 'asset', 'name', s.name, 'currency', s.currency, 'amount', s.current_value::text, 'rate', r::text, 'base_value', v::text, 'valuation_date', s.valuation_date);
  end loop;
  for dt in select * from public.finance_debts where workspace_id = p_ws and lifecycle = 'Active' and start_date <= d loop
    rem := public.fin__debt_remaining(dt.id); accr := public.fin__debt_accrued(dt.id);
    if rem + accr = 0 then continue; end if;
    if dt.liability_account_id is not null then excl := excl || jsonb_build_object('kind', 'debt', 'name', dt.name, 'reason', 'LIABILITY_ACCOUNT_LINKED', 'amount', rem::text, 'currency', dt.currency); continue; end if;
    r := public.fin__rate(p_ws, dt.currency, d);
    if r is null then unv := unv || jsonb_build_object('kind', 'debt', 'name', dt.name, 'reason', 'NO_RATE', 'amount', (rem + accr)::text, 'currency', dt.currency); continue; end if;
    v := round((rem + accr) * r, mn);
    if dt.direction = 'IOwe' then pay_t := pay_t + v; comps := comps || jsonb_build_object('kind', 'payable', 'name', dt.name, 'currency', dt.currency, 'amount', (rem + accr)::text, 'accrued_unpaid', accr::text, 'rate', r::text, 'base_value', (-v)::text);
    elsif st.receivables_in_net_worth then rec_t := rec_t + v; comps := comps || jsonb_build_object('kind', 'receivable', 'name', dt.name, 'currency', dt.currency, 'amount', (rem + accr)::text, 'rate', r::text, 'base_value', v::text);
    else excl := excl || jsonb_build_object('kind', 'debt', 'name', dt.name, 'reason', 'RECEIVABLE_SEPARATE_BY_POLICY', 'amount', (rem + accr)::text, 'currency', dt.currency); end if;
  end loop;
  return jsonb_build_object('as_of', d, 'base_currency', st.base_currency, 'net_worth', (acc_t + ast_t + rec_t - pay_t)::text, 'accounts_total', acc_t::text, 'assets_total', ast_t::text, 'receivables_total', rec_t::text, 'payables_total', pay_t::text,
    'components', comps, 'excluded', excl, 'unvalued', unv, 'complete', (jsonb_array_length(unv) = 0));
end $$;

create or replace function public.fin_goal_progress(p_ws uuid) returns jsonb language plpgsql security definer set search_path = public as $$
declare g record; saved numeric; out jsonb := '[]'::jsonb; d record;
begin
  perform public.fin__need(p_ws, 'goals', 'view');
  for g in select * from public.finance_goals where workspace_id = p_ws order by created_at loop
    if g.tracking_mode = 'AccountBalance' then saved := public.fin__balance(g.linked_account_id);
    elsif g.tracking_mode = 'DebtPayoff' then select * into d from public.finance_debts where id = g.linked_debt_id; saved := coalesce(d.principal_amount - public.fin__debt_remaining(d.id), 0);
    else select coalesce(sum(case when purpose = 'GoalContribution' then amount else -amount end * case when reversal_of_id is not null then -1 else 1 end), 0) into saved
         from public.finance_transactions where workspace_id = p_ws and goal_id = g.id and status in ('Posted','Reversed'); end if;
    out := out || jsonb_build_object('goal_id', g.id, 'saved', saved::text, 'target', g.target_amount::text, 'ratio', round(saved / g.target_amount, 4)::text);
  end loop;
  return out;
end $$;

-- ───────── from-source: the Inventory/Shopping contract (one financial effect, never duplicated, no sensitive data) ─────────
create or replace function public.fin_from_source(p jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare ws uuid := (p->>'workspace_id')::uuid; r jsonb; ev text := p->>'event'; sys text := coalesce(nullif(p->>'source_system', ''), 'inventory'); sid text := nullif(p->>'source_id', ''); amt numeric := public.fin__num(p, 'amount');
  fees numeric := coalesce(public.fin__num(p, 'fees'), 0); st public.finance_settings; base jsonb; res jsonb; res2 jsonb; ids uuid[] := '{}'; k text; acc text := nullif(p->>'account_hint', ''); orig uuid; stt text; ver int := nullif(p->>'aggregate_version', '')::int;
  mode text := case when acc is null or p->>'mode' = 'Proposal' then 'Proposed' else 'Posted' end; ex public.finance_transactions; item text := nullif(p->>'item_ref', '');
begin
  perform public.fin__need(ws, 'ledger', 'edit'); st := public.fin__settings(ws);
  for k in select jsonb_object_keys(p) loop
    if k in ('name','item_name','serial','serial_number','imei','location','place','room','address','notes','attachments','file_ref','photo') then perform public.fin__err('SENSITIVE_FIELD_NOT_ALLOWED', k); end if;
  end loop;
  r := public.fin__idem_begin(ws, p->>'idempotency_key', p); if r is not null then return r; end if;
  if sid is null then perform public.fin__err('VALIDATION_FAILED', 'source_id required'); end if;
  if ev = 'repair_warranty' then
    if amt is not null and amt > 0 then perform public.fin__err('WARRANTY_EVENT_MUST_HAVE_NO_COST', 'a warranty repair is free; send repair_paid for a paid repair'); end if;
    return public.fin__idem_end(ws, p->>'idempotency_key', jsonb_build_object('created', false, 'effect', 'none', 'reason', 'WARRANTY_COVERED', 'transaction_ids', '[]'::jsonb));
  end if;
  if ev = 'purchase_recorded' and nullif(p->>'existing_transaction_id', '') is not null then
    select * into ex from public.finance_transactions where workspace_id = ws and id = (p->>'existing_transaction_id')::uuid;
    if ex.id is null then perform public.fin__err('OWNERSHIP_MISMATCH', 'existing_transaction_id'); end if;
    return public.fin__idem_end(ws, p->>'idempotency_key', jsonb_build_object('created', false, 'linked', true, 'effect', 'none', 'transaction_ids', jsonb_build_array(ex.id), 'status', ex.status));
  end if;
  if amt is null or amt <= 0 then perform public.fin__err('VALIDATION_FAILED', 'amount'); end if;
  base := jsonb_build_object('currency', p->>'currency', 'local_date', p->>'occurred_on', 'source_system', sys, 'status', mode, 'on_locked', 'propose', 'group_ref', case when item is not null then 'inv:' || item end, 'origin', sys);
  if ev = 'purchase_recorded' then
    res := public.fin__core_post(ws, base || jsonb_build_object('type', 'Expense', 'purpose', 'Regular', 'amount', amt::text, 'name', 'شراء مقتنى', 'category_id', public.fin__sys_cat(ws, 'purchases')::text, 'from_account_id', acc, 'source_type', 'inventory_purchase', 'source_id', sid, 'source_version', ver), auth.uid());
  elsif ev = 'repair_paid' then
    res := public.fin__core_post(ws, base || jsonb_build_object('type', 'Expense', 'purpose', 'Regular', 'amount', amt::text, 'name', 'إصلاح مقتنى', 'category_id', public.fin__sys_cat(ws, 'repairs')::text, 'from_account_id', acc, 'source_type', 'inventory_repair', 'source_id', sid, 'source_version', ver), auth.uid());
  elsif ev = 'sold' then
    if fees < 0 or fees >= amt and st.sale_fee_policy = 'net_proceeds' then perform public.fin__err('VALIDATION_FAILED', 'fees'); end if;
    res := public.fin__core_post(ws, base || jsonb_build_object('type', 'Income', 'purpose', 'AssetSale', 'amount', (case when st.sale_fee_policy = 'net_proceeds' then amt - fees else amt end)::text, 'name', 'بيع مقتنى',
      'notes', case when st.sale_fee_policy = 'net_proceeds' and fees > 0 then 'صافي بعد رسوم ' || fees else null end, 'to_account_id', acc, 'source_type', 'inventory_sale', 'source_id', sid, 'source_version', ver), auth.uid());
    if fees > 0 and st.sale_fee_policy = 'expense' and (res->>'duplicate')::boolean is not true then
      res2 := public.fin__core_post(ws, base || jsonb_build_object('type', 'Expense', 'purpose', 'Regular', 'amount', fees::text, 'name', 'رسوم بيع', 'category_id', public.fin__sys_cat(ws, 'selling_fees')::text, 'from_account_id', acc, 'source_type', 'inventory_sale_fee', 'source_id', sid, 'source_version', ver), auth.uid());
      ids := ids || (res2->>'transaction_id')::uuid;
    end if;
  elsif ev = 'purchase_refunded' then
    select id into orig from public.finance_transactions where workspace_id = ws and ((nullif(p->>'refund_of_transaction_id', '') is not null and id = (p->>'refund_of_transaction_id')::uuid) or
      (source_system = sys and source_type = 'inventory_purchase' and source_id = p->>'refund_of_source_id')) limit 1;
    if orig is null then perform public.fin__err('REFUND_TARGET_NOT_FOUND'); end if;
    res := public.fin__core_post(ws, base || jsonb_build_object('type', 'Income', 'purpose', 'Refund', 'amount', amt::text, 'name', 'استرداد ثمن شراء', 'refund_of_id', orig::text, 'to_account_id', acc, 'source_type', 'inventory_refund', 'source_id', sid, 'source_version', ver), auth.uid());
  else perform public.fin__err('SOURCE_TYPE_UNKNOWN', ev); end if;
  ids := array[(res->>'transaction_id')::uuid] || ids;
  return public.fin__idem_end(ws, p->>'idempotency_key', jsonb_build_object('created', (res->>'created')::boolean, 'duplicate', coalesce((res->>'duplicate')::boolean, false), 'stale', coalesce((res->>'stale')::boolean, false), 'payload_differs', coalesce((res->>'payload_differs')::boolean, false),
    'status', res->>'status', 'effect', case when (res->>'status') = 'Posted' then 'posted' else 'proposed' end, 'transaction_ids', to_jsonb(ids), 'warnings', coalesce(res->'warnings', '[]'::jsonb),
    'inventory_action', case when ev = 'purchase_refunded' then 'confirmation_required' else 'none' end));
end $$;

-- ───────── statement import with preview, matching and safe undo ─────────
create or replace function public.fin_import_commit(p jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare ws uuid := (p->>'workspace_id')::uuid; a public.finance_accounts; st public.finance_settings; dry boolean := coalesce((p->>'dry_run')::boolean, false); fp text := p->>'file_fingerprint'; bid uuid := gen_random_uuid();
  row jsonb; out jsonb := '[]'::jsonb; cnt jsonb := jsonb_build_object('created', 0, 'duplicate', 0, 'review_required', 0, 'rejected', 0); nth int; seen jsonb := '{}'::jsonb; sig text; sid text; amt numeric; d date; ty text; ex public.finance_transactions; res jsonb; oc text; dt text; tid uuid; today date; rno int;
begin
  perform public.fin__need(ws, 'imports', 'edit'); perform public.fin__need(ws, 'ledger', 'edit'); st := public.fin__settings(ws); today := (now() at time zone st.timezone)::date;
  select * into a from public.finance_accounts where workspace_id = ws and id = (p->>'account_id')::uuid; if a.id is null then perform public.fin__err('OWNERSHIP_MISMATCH', 'account'); end if;
  if a.status <> 'Active' then perform public.fin__err('ACCOUNT_ARCHIVED'); end if;
  if fp is null or fp = '' then perform public.fin__err('VALIDATION_FAILED', 'file_fingerprint'); end if;
  if not dry then
    if exists (select 1 from public.finance_import_batches where workspace_id = ws and account_id = a.id and file_fingerprint = fp and status = 'Confirmed') and not (coalesce((p->>'override_duplicate_file')::boolean, false) and length(btrim(coalesce(p->>'reason', ''))) >= 3) then
      perform public.fin__err('IMPORT_FILE_ALREADY_IMPORTED', 'repeat only with override_duplicate_file and a reason'); end if;
    begin insert into public.finance_import_batches(id, workspace_id, account_id, file_fingerprint, mapping_version, normalization) values (bid, ws, a.id, fp || case when coalesce((p->>'override_duplicate_file')::boolean, false) then ':' || bid else '' end, coalesce(p->>'mapping_version', 'v1'), coalesce(p->'normalization', '{}'::jsonb));
    exception when unique_violation then perform public.fin__err('IMPORT_FILE_ALREADY_IMPORTED'); end;
  end if;
  for row in select * from jsonb_array_elements(coalesce(p->'rows', '[]'::jsonb)) loop
    rno := (row->>'row_no')::int; oc := null; dt := null; tid := null;
    begin
      d := (row->>'date')::date; amt := (row->>'amount')::numeric;
    exception when others then d := null; amt := null; end;
    if d is null or amt is null or amt = 0 then oc := 'rejected'; dt := 'VALIDATION_FAILED';
    elsif scale(trim_scale(abs(amt))) > public.fin__minor(a.currency) then oc := 'rejected'; dt := 'AMOUNT_PRECISION';
    elsif d > today or d < a.opened_on then oc := 'rejected'; dt := 'DATE_OUT_OF_RANGE';
    elsif not public.fin__period_open(ws, d) then oc := 'rejected'; dt := 'PERIOD_UNLOCK_REQUIRED';
    else
      ty := case when amt < 0 then 'Expense' else 'Income' end;
      sig := d::text || '|' || amt::text || '|' || lower(regexp_replace(btrim(coalesce(row->>'description', '')), '\s+', ' ', 'g'));
      nth := coalesce((seen->>sig)::int, 0) + 1; seen := seen || jsonb_build_object(sig, nth);
      sid := a.id::text || ':' || coalesce(nullif(row->>'external_id', ''), md5(sig || '|' || nth));
      select * into ex from public.finance_transactions where workspace_id = ws and source_system = 'import' and source_type = 'bank_statement' and source_id = sid;
      if ex.id is not null then oc := 'duplicate'; tid := ex.id; dt := 'SAME_SOURCE_IDENTITY';
      else
        select * into ex from public.finance_transactions where workspace_id = ws and status = 'Posted' and origin <> 'import' and type = ty and amount = abs(amt) and abs(local_date - d) <= 2 and (from_account_id = a.id or to_account_id = a.id) limit 1;
        if ex.id is not null then oc := 'review_required'; tid := ex.id; dt := 'PROBABLE_MATCH';
        elsif dry then oc := 'created'; dt := 'WOULD_CREATE';
        else
          res := public.fin__core_post(ws, jsonb_build_object('type', ty, 'purpose', 'Regular', 'amount', abs(amt)::text, 'currency', a.currency, 'local_date', d::text, 'name', coalesce(nullif(btrim(row->>'description'), ''), 'حركة مستوردة'),
            case when ty = 'Expense' then 'from_account_id' else 'to_account_id' end, a.id::text, 'category_id', nullif(row->>'category_id', ''), 'source_system', 'import', 'source_type', 'bank_statement', 'source_id', sid, 'import_batch_id', bid::text, 'origin', 'import'), auth.uid());
          oc := 'created'; tid := (res->>'transaction_id')::uuid;
        end if;
      end if;
    end if;
    cnt := jsonb_set(cnt, array[oc], to_jsonb((cnt->>oc)::int + 1));
    out := out || jsonb_build_object('row_no', rno, 'outcome', oc, 'detail', dt, 'transaction_id', tid);
    if not dry then insert into public.finance_import_rows(workspace_id, batch_id, row_no, outcome, transaction_id, detail) values (ws, bid, rno, oc, tid, dt); end if;
  end loop;
  if not dry then
    update public.finance_import_batches set counts = cnt where id = bid;
    perform public.fin__audit(ws, auth.uid(), 'import', bid::text, 'commit', p->>'reason', null, cnt);
  end if;
  return jsonb_build_object('dry_run', dry, 'batch_id', case when dry then null else bid end, 'counts', cnt, 'rows', out);
end $$;

create or replace function public.fin_import_undo(p jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare ws uuid := (p->>'workspace_id')::uuid; b public.finance_import_batches; t record; blocked jsonb := '[]'::jsonb; n int := 0;
begin
  perform public.fin__need(ws, 'imports', 'edit'); perform public.fin__need(ws, 'ledger', 'edit');
  if length(btrim(coalesce(p->>'reason', ''))) < 3 then perform public.fin__err('REASON_REQUIRED'); end if;
  select * into b from public.finance_import_batches where workspace_id = ws and id = (p->>'batch_id')::uuid for update; if b.id is null then perform public.fin__err('OWNERSHIP_MISMATCH'); end if;
  if b.status <> 'Confirmed' then perform public.fin__err('TRANSACTION_STATE_INVALID'); end if;
  for t in select * from public.finance_transactions where workspace_id = ws and import_batch_id = b.id loop
    if t.status <> 'Posted' or t.version <> 1 or t.reconciled_at is not null or public.fin__deps(ws, t.id) is not null or not public.fin__period_open(ws, t.local_date) then
      blocked := blocked || jsonb_build_object('transaction_id', t.id, 'status', t.status, 'version', t.version);
    end if;
  end loop;
  if jsonb_array_length(blocked) > 0 then perform public.fin__err('IMPORT_UNDO_BLOCKED', blocked::text); end if;
  for t in select * from public.finance_transactions where workspace_id = ws and import_batch_id = b.id loop perform public.fin__void(ws, t.id, auth.uid(), 'import undo: ' || (p->>'reason')); n := n + 1; end loop;
  update public.finance_import_batches set status = 'Undone', undo_reason = p->>'reason' where id = b.id;
  perform public.fin__audit(ws, auth.uid(), 'import', b.id::text, 'undo', p->>'reason', null, jsonb_build_object('voided', n));
  return jsonb_build_object('undone', true, 'voided', n);
end $$;

-- ───────── grants: only the public RPCs are callable by signed-in users ─────────
revoke all on function public.fin__idem_begin(uuid, text, jsonb), public.fin__idem_end(uuid, text, jsonb), public.fin__deps(uuid, uuid), public.fin__reverse(uuid, uuid, uuid, text, boolean), public.fin__void(uuid, uuid, uuid, text),
  public.fin__debt_remaining(uuid), public.fin__debt_accrued(uuid), public.fin__rate(uuid, text, date) from public, anon, authenticated;
do $$ declare f text; begin
  foreach f in array array['fin_reverse_transaction(jsonb)','fin_void_transaction(jsonb)','fin_confirm_proposal(jsonb)','fin_set_lock(jsonb)','fin_update_settings(jsonb)','fin_add_rate(jsonb)',
    'fin_reconciliation_create(jsonb)','fin_reconciliation_review(jsonb)','fin_reconciliation_complete(jsonb)','fin_reconciliation_cancel(jsonb)','fin_debt_create(jsonb)','fin_debt_payment(jsonb)',
    'fin_debt_payment_reverse(jsonb)','fin_debt_adjust(jsonb)','fin_debt_set_lifecycle(jsonb)','fin_asset_upsert(jsonb)','fin_asset_confirm_valuation(jsonb)','fin_balances(uuid)','fin_period_summary(uuid,date,date)',
    'fin_net_worth(uuid,date)','fin_goal_progress(uuid)','fin_from_source(jsonb)','fin_import_commit(jsonb)','fin_import_undo(jsonb)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop; end $$;
