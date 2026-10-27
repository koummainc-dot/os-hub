ALTER FUNCTION public.records_touch() SET search_path = '';
REVOKE EXECUTE ON FUNCTION public.records_touch() FROM PUBLIC, anon, authenticated;
