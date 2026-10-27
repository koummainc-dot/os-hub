-- Harden SECURITY DEFINER RPCs used by reconciliation and period locking.
ALTER FUNCTION public.fin_reconciliation_create(jsonb) SET search_path = '';
ALTER FUNCTION public.fin_reconciliation_review(jsonb) SET search_path = '';
ALTER FUNCTION public.fin_reconciliation_complete(jsonb) SET search_path = '';
ALTER FUNCTION public.fin_reconciliation_cancel(jsonb) SET search_path = '';
ALTER FUNCTION public.fin_set_lock(jsonb) SET search_path = '';