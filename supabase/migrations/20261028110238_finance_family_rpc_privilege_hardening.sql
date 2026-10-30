-- Harden function privileges for the Family Finance Center.
-- Supabase projects commonly grant EXECUTE on functions to anon by default;
-- REVOKE FROM PUBLIC alone does not remove explicit anon grants.
begin;
revoke all on function public.fin_family_audit_row() from public, anon, authenticated;
revoke all on function public.fin_family_need(uuid,text,boolean) from public, anon, authenticated;
revoke all on function public.fin_family_has_sensitive_access(uuid,text) from public, anon, authenticated;
revoke all on function public.fin_family_invalidate_allocation_on_transaction_change() from public, anon, authenticated;
revoke all on function public.fin_family_validate_linked_user() from public, anon, authenticated;
revoke all on function public.fin_family_list_expenses(uuid,integer) from public, anon;
revoke all on function public.fin_family_set_transaction_allocation(uuid,uuid,text,uuid,jsonb,boolean) from public, anon;
revoke all on function public.fin_family_spending_report(uuid,date,date,uuid) from public, anon;
-- RLS calls this helper directly; authenticated users need EXECUTE for policy evaluation.
grant execute on function public.fin_family_has_sensitive_access(uuid,text) to authenticated;
grant execute on function public.fin_family_list_expenses(uuid,integer) to authenticated;
grant execute on function public.fin_family_set_transaction_allocation(uuid,uuid,text,uuid,jsonb,boolean) to authenticated;
grant execute on function public.fin_family_spending_report(uuid,date,date,uuid) to authenticated;
commit;
