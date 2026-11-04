\set ON_ERROR_STOP on
DO $$
BEGIN
  IF to_regclass('public.finance_family_cash_advances') IS NULL
     OR to_regclass('public.finance_family_cash_entries') IS NULL THEN
    RAISE EXCEPTION 'Finance family cash tables are missing';
  END IF;
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid='public.finance_family_cash_advances'::regclass)
     OR NOT (SELECT relrowsecurity FROM pg_class WHERE oid='public.finance_family_cash_entries'::regclass) THEN
    RAISE EXCEPTION 'Finance family cash RLS is not enabled';
  END IF;
  IF to_regprocedure('public.fin_family_cash_link_transaction(uuid,uuid,uuid,text)') IS NULL
     OR to_regprocedure('public.fin_family_cash_add_entry(uuid,uuid,text,numeric,date,uuid,text,text)') IS NULL THEN
    RAISE EXCEPTION 'Finance family cash RPCs are missing';
  END IF;
END $$;

INSERT INTO auth.users(id) VALUES ('11111111-1111-4111-8111-111111111111') ON CONFLICT DO NOTHING;
INSERT INTO public.workspaces(id,owner_id) VALUES
 ('22222222-2222-4222-8222-222222222222','11111111-1111-4111-8111-111111111111'),
 ('33333333-3333-4333-8333-333333333333','11111111-1111-4111-8111-111111111111')
ON CONFLICT DO NOTHING;
INSERT INTO public.finance_family_members(workspace_id,id,status) VALUES
 ('22222222-2222-4222-8222-222222222222','44444444-4444-4444-8444-444444444444','Active');
INSERT INTO public.finance_transactions(workspace_id,id,status,type,amount,currency,local_date) VALUES
 ('22222222-2222-4222-8222-222222222222','55555555-5555-4555-8555-555555555555','Posted','Expense',10,'EGP','2026-11-04');

GRANT SELECT ON public.finance_family_cash_advances, public.finance_family_cash_entries TO authenticated;
SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
SELECT set_config('test.workspace_id','22222222-2222-4222-8222-222222222222',false);
SELECT set_config('test.finance_access','edit',false);
SET ROLE authenticated;

DO $$
DECLARE v_advance_id uuid; entry_count integer; tx_count integer;
BEGIN
  v_advance_id := public.fin_family_cash_link_transaction(
    '22222222-2222-4222-8222-222222222222',
    '44444444-4444-4444-8444-444444444444',
    '55555555-5555-4555-8555-555555555555',
    'smoke advance'
  );
  entry_id := public.fin_family_cash_add_entry(
    '22222222-2222-4222-8222-222222222222',v_advance_id,'Expense',4,'2026-11-04',NULL,'مشتريات اختبار',NULL
  );
  PERFORM public.fin_family_cash_add_entry(
    '22222222-2222-4222-8222-222222222222',v_advance_id,'Return',3,'2026-11-04',NULL,'مبلغ مرتجع',NULL
  );
  SELECT count(*) INTO entry_count FROM public.finance_family_cash_entries e
    WHERE e.workspace_id='22222222-2222-4222-8222-222222222222' AND e.advance_id=v_advance_id;
  IF entry_count <> 2 THEN RAISE EXCEPTION 'Finance cash entries were not persisted'; END IF;
  SELECT count(*) INTO tx_count FROM public.finance_transactions
    WHERE workspace_id='22222222-2222-4222-8222-222222222222'
      AND id='55555555-5555-4555-8555-555555555555' AND status='Posted';
  IF tx_count <> 1 THEN RAISE EXCEPTION 'Family cash tracking mutated or duplicated the ledger transaction'; END IF;

  BEGIN
    PERFORM public.fin_family_cash_add_entry(
      '22222222-2222-4222-8222-222222222222',v_advance_id,'Expense',4,'2026-11-04',NULL,'تجاوز الرصيد',NULL
    );
    RAISE EXCEPTION 'overdrawn cash advance unexpectedly accepted';
  EXCEPTION WHEN SQLSTATE 'P0001' THEN
    IF SQLERRM = 'overdrawn cash advance unexpectedly accepted' THEN RAISE; END IF;
  END;

  BEGIN
    PERFORM public.fin_family_cash_link_transaction(
      '22222222-2222-4222-8222-222222222222',
      '44444444-4444-4444-8444-444444444444',
      '55555555-5555-4555-8555-555555555555',NULL
    );
    RAISE EXCEPTION 'duplicate transaction link unexpectedly accepted';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;
END $$;

SELECT set_config('test.finance_access','view',false);
DO $$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n FROM public.finance_family_cash_entries
    WHERE workspace_id='22222222-2222-4222-8222-222222222222';
  IF n <> 2 THEN RAISE EXCEPTION 'Finance family viewer cannot read allowed records'; END IF;
  BEGIN
    PERFORM public.fin_family_cash_add_entry(
      '22222222-2222-4222-8222-222222222222',
      (SELECT id FROM public.finance_family_cash_advances WHERE workspace_id='22222222-2222-4222-8222-222222222222' LIMIT 1),
      'Expense',1,'2026-11-04',NULL,'viewer write',NULL
    );
    RAISE EXCEPTION 'Finance family viewer unexpectedly mutated cash records';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;

SELECT set_config('test.workspace_id','33333333-3333-4333-8333-333333333333',false);
DO $$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n FROM public.finance_family_cash_entries
    WHERE workspace_id='22222222-2222-4222-8222-222222222222';
  IF n <> 0 THEN RAISE EXCEPTION 'Finance family data crossed workspace boundary'; END IF;
END $$;
RESET ROLE;
