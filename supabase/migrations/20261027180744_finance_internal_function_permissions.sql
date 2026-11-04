-- Finance OS: restrict internal helper/trigger functions and pin search_path.
-- Trigger functions remain usable by their owning triggers; direct RPC execution is not needed.
REVOKE EXECUTE ON FUNCTION public.fin__account_guard() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fin__entries_guard() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fin__touch() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fin__immutable() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fin__classify(text, text, boolean) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fin__minor(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fin__num(jsonb, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fin__err(text, text) FROM PUBLIC, anon, authenticated;

ALTER FUNCTION public.fin__account_guard() SET search_path = '';
ALTER FUNCTION public.fin__entries_guard() SET search_path = '';
ALTER FUNCTION public.fin__touch() SET search_path = '';
ALTER FUNCTION public.fin__immutable() SET search_path = '';
ALTER FUNCTION public.fin__classify(text, text, boolean) SET search_path = '';
ALTER FUNCTION public.fin__minor(text) SET search_path = '';
ALTER FUNCTION public.fin__num(jsonb, text) SET search_path = '';
ALTER FUNCTION public.fin__err(text, text) SET search_path = '';
