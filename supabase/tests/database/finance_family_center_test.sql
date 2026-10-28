begin;
select plan(23);

select ok(to_regclass('public.finance_family_members') is not null, 'family members table exists');
select ok(to_regclass('public.finance_family_member_private') is not null, 'private member details table exists separately');
select ok(to_regclass('public.finance_family_transaction_meta') is not null, 'family transaction attribution table exists');
select ok(to_regclass('public.finance_family_allocations') is not null, 'family allocations table exists');
select ok(to_regclass('public.finance_family_budgets') is not null, 'family budgets table exists');
select ok(to_regclass('public.finance_family_allowances') is not null, 'family allowances table exists');

select ok(exists(select 1 from information_schema.columns where table_schema='public' and table_name='finance_family_members' and column_name='linked_user_id'), 'member may link an existing workspace user');
select ok(exists(select 1 from information_schema.columns where table_schema='public' and table_name='finance_family_member_private' and column_name='birth_date'), 'birth date is in the private table');
select ok(exists(select 1 from information_schema.columns where table_schema='public' and table_name='finance_family_member_private' and column_name='notes'), 'private notes are in the private table');
select ok(exists(select 1 from information_schema.columns where table_schema='public' and table_name='finance_family_allocations' and column_name='allocation_method'), 'allocation method is explicit');
select ok(exists(select 1 from information_schema.columns where table_schema='public' and table_name='finance_family_allocations' and column_name='percentage'), 'percentage splits are supported');

select ok(to_regprocedure('public.fin_family_set_transaction_allocation(uuid,uuid,text,uuid,jsonb,boolean)') is not null, 'transaction allocation RPC exists');
select ok(to_regprocedure('public.fin_family_list_expenses(uuid,integer)') is not null, 'family expense list RPC exists');
select ok(to_regprocedure('public.fin_family_spending_report(uuid,date,date,uuid)') is not null, 'family spending report RPC exists');

select ok((select relrowsecurity from pg_class where oid='public.finance_family_members'::regclass), 'RLS enabled on family members');
select ok((select relrowsecurity from pg_class where oid='public.finance_family_member_private'::regclass), 'RLS enabled on private details');
select ok((select relrowsecurity from pg_class where oid='public.finance_family_allocations'::regclass), 'RLS enabled on allocations');

select ok(exists(select 1 from pg_policies where schemaname='public' and tablename='finance_family_members' and policyname='finance_family_members_sel' and cmd='SELECT'), 'family member read policy exists');
select ok(exists(select 1 from pg_policies where schemaname='public' and tablename='finance_family_member_private' and policyname='finance_family_private_sel' and cmd='SELECT'), 'private data has a dedicated read policy');
select ok(exists(select 1 from pg_policies where schemaname='public' and tablename='finance_family_budgets' and policyname='finance_family_budgets_ins' and cmd='INSERT'), 'family budget insert policy exists');
select ok(not exists(select 1 from pg_policies where schemaname='public' and tablename='finance_family_allocations' and cmd in ('INSERT','UPDATE','ALL')), 'allocation writes are not exposed directly; use the validating RPC');

select ok(not has_function_privilege('anon','public.fin_family_set_transaction_allocation(uuid,uuid,text,uuid,jsonb,boolean)','EXECUTE'), 'anonymous role cannot execute allocation RPC');
select ok(has_function_privilege('authenticated','public.fin_family_set_transaction_allocation(uuid,uuid,text,uuid,jsonb,boolean)','EXECUTE'), 'authenticated role can execute allocation RPC');

select * from finish();
rollback;
