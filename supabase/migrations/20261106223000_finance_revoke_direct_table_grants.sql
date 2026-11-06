-- Finance OS: direct table grants are not part of the client access model.
-- These tables are RLS-enabled and intentionally have no policies; Finance access is
-- mediated through SECURITY DEFINER RPCs. Remove redundant Data API table privileges
-- without creating broad policies that would change the authorization model.

REVOKE ALL PRIVILEGES ON TABLE public.finance_budgets FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.finance_transaction_splits FROM PUBLIC, anon, authenticated;
