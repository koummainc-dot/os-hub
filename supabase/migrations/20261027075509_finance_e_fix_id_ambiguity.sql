create or replace function public.fin_reconciliation_create(p jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare ws uuid := (p->>'workspace_id')::uuid; a public.finance_accounts; sb numeric := public.fin__num(p, 'statement_balance'); cd date := (p->>'cutoff_date')::date; lb numeric; rid uuid := gen_random_uuid(); st public.finance_settings;
begin
  perform public.fin__need(ws, 'reconciliations', 'edit'); st := public.fin__settings(ws);
  select * into a from public.finance_accounts x where x.workspace_id = ws and x.id = (p->>'account_id')::uuid; if a.id is null then perform public.fin__err('OWNERSHIP_MISMATCH', 'account'); end if;
  if sb is null or cd is null then perform public.fin__err('VALIDATION_FAILED'); end if;
  if cd > (now() at time zone st.timezone)::date then perform public.fin__err('FUTURE_DATE'); end if;
  lb := public.fin__balance(a.id, cd);
  insert into public.finance_reconciliations(id, workspace_id, account_id, cutoff_date, statement_balance, ledger_balance, difference) values (rid, ws, a.id, cd, sb, lb, sb - lb);
  perform public.fin__audit(ws, auth.uid(), 'reconciliation', rid::text, 'create', null, null, jsonb_build_object('difference', (sb - lb)::text));
  return jsonb_build_object('reconciliation_id', rid, 'ledger_balance', lb::text, 'difference', (sb - lb)::text, 'status', 'Draft');
end $$;

create or replace function public.fin_debt_create(p jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare ws uuid := (p->>'workspace_id')::uuid; r jsonb; did uuid := gen_random_uuid(); amt numeric := public.fin__num(p, 'principal'); dir text := p->>'direction'; ccy text := upper(p->>'currency');
  la uuid := nullif(p->>'liability_account_id', '')::uuid; acc public.finance_accounts; it jsonb; n int := 0; prev date; sum_p numeric := 0; sd date := (p->>'start_date')::date; dis jsonb; da uuid := nullif(p->>'disbursement_account_id', '')::uuid;
begin
  perform public.fin__need(ws, 'debts', 'edit');
  r := public.fin__idem_begin(ws, p->>'idempotency_key', p); if r is not null then return r; end if;
  if amt is null or amt <= 0 or dir not in ('IOwe','OwedToMe') or ccy !~ '^[A-Z]{3}$' or sd is null then perform public.fin__err('VALIDATION_FAILED'); end if;
  if la is not null then
    select * into acc from public.finance_accounts x where x.workspace_id = ws and x.id = la;
    if acc.id is null then perform public.fin__err('OWNERSHIP_MISMATCH', 'liability account'); end if;
    if acc.nature <> 'LIABILITY' or acc.currency <> ccy or dir <> 'IOwe' then perform public.fin__err('LIABILITY_ACCOUNT_INVALID'); end if;
  end if;
  begin
    insert into public.finance_debts(id, workspace_id, name, direction, counterparty, currency, principal_amount, start_date, interest_method, liability_account_id)
    values (did, ws, coalesce(nullif(btrim(p->>'name'), ''), 'دين'), dir, nullif(p->>'counterparty', ''), ccy, amt, sd, coalesce(p->>'interest_method', 'None'), la);
  exception when unique_violation then perform public.fin__err('LIABILITY_DOUBLE_COUNT', 'this liability account already backs another active debt'); end;
  for it in select * from jsonb_array_elements(coalesce(p->'installments', '[]'::jsonb)) loop
    n := n + 1;
    if prev is not null and (it->>'due_date')::date < prev then perform public.fin__err('VALIDATION_FAILED', 'installment dates must ascend'); end if;
    prev := (it->>'due_date')::date; sum_p := sum_p + coalesce(public.fin__num(it, 'principal'), 0);
    insert into public.finance_debt_installments(workspace_id, debt_id, seq, due_date, principal_due, interest_due, fees_due)
    values (ws, did, n, prev, coalesce(public.fin__num(it, 'principal'), 0), coalesce(public.fin__num(it, 'interest'), 0), coalesce(public.fin__num(it, 'fees'), 0));
  end loop;
  if sum_p > amt then perform public.fin__err('VALIDATION_FAILED', 'installment principal exceeds debt principal'); end if;
  if da is not null then
    dis := public.fin__core_post(ws, jsonb_build_object('purpose', 'DebtDisbursement', 'debt_id', did::text, 'amount', amt::text, 'currency', ccy, 'local_date', sd::text, 'name', 'صرف دين: ' || coalesce(p->>'name', ''),
      'type', case when la is not null then 'Transfer' when dir = 'IOwe' then 'Income' else 'Expense' end,
      'from_account_id', case when la is not null then la::text when dir = 'OwedToMe' then da::text end,
      'to_account_id', case when la is not null or dir = 'IOwe' then da::text end,
      'source_system', 'finance', 'source_type', 'debt_disbursement', 'source_id', did::text), auth.uid());
  end if;
  perform public.fin__audit(ws, auth.uid(), 'debt', did::text, 'create', null, null, jsonb_build_object('principal', amt::text, 'direction', dir));
  return public.fin__idem_end(ws, p->>'idempotency_key', jsonb_build_object('debt_id', did, 'disbursement', dis));
end $$;
revoke all on function public.fin_reconciliation_create(jsonb), public.fin_debt_create(jsonb) from public, anon;
grant execute on function public.fin_reconciliation_create(jsonb), public.fin_debt_create(jsonb) to authenticated;
