-- Exchange rates may only be recorded for currencies enabled in the workspace catalog.
CREATE OR REPLACE FUNCTION public.fin_add_rate(p jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  ws uuid := nullif(p->>'workspace_id','')::uuid;
  cur text := upper(btrim(coalesce(p->>'currency','')));
  rt numeric := public.fin__num(p,'rate_to_base');
  d date := (p->>'effective_on')::date;
  st public.finance_settings;
BEGIN
  PERFORM public.fin__need(ws,'fxrates','edit');
  st := public.fin__settings(ws);
  IF cur !~ '^[A-Z]{3}$' THEN PERFORM public.fin__err('VALIDATION_FAILED','currency must be a 3-letter code'); END IF;
  IF rt IS NULL OR rt<=0 THEN PERFORM public.fin__err('VALIDATION_FAILED','rate > 0'); END IF;
  IF cur=st.base_currency THEN PERFORM public.fin__err('VALIDATION_FAILED','base currency rate is always 1'); END IF;
  IF NOT EXISTS(SELECT 1 FROM public.finance_currencies WHERE workspace_id=ws AND currency=cur AND is_active=true) THEN
    PERFORM public.fin__err('CURRENCY_NOT_ACTIVE','Add or reactivate this currency in the currency catalog before adding rates');
  END IF;
  IF d>(now() AT TIME ZONE st.timezone)::date+1 THEN PERFORM public.fin__err('FUTURE_DATE'); END IF;
  INSERT INTO public.finance_exchange_rates(workspace_id,currency,rate_to_base,effective_on,source)
    VALUES(ws,cur,rt,d,coalesce(nullif(p->>'source',''),'manual'));
  RETURN jsonb_build_object('ok',true);
END
$function$;
REVOKE ALL ON FUNCTION public.fin_add_rate(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fin_add_rate(jsonb) TO authenticated;
