CREATE OR REPLACE FUNCTION public.fin_recurring_defer(p jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  RETURN public.fin_recurring_skip(p);
END
$function$;
REVOKE ALL ON FUNCTION public.fin_recurring_defer(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fin_recurring_defer(jsonb) TO authenticated;