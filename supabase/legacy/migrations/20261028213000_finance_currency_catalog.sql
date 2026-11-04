-- Workspace-scoped currency catalog. Exchange rates remain append-only historical records.
CREATE TABLE IF NOT EXISTS public.finance_currencies (
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE RESTRICT,
  currency text NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  display_name text NOT NULL CHECK (length(btrim(display_name)) > 0),
  symbol text,
  minor_units smallint NOT NULL DEFAULT 2 CHECK (minor_units BETWEEN 0 AND 4),
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, currency)
);
ALTER TABLE public.finance_currencies ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.finance_currencies FROM PUBLIC, anon, authenticated;

-- Seed currencies already used in settings, accounts, transactions, or exchange-rate history.
INSERT INTO public.finance_currencies(workspace_id,currency,display_name,is_active)
SELECT workspace_id, currency, currency, true
FROM (
  SELECT workspace_id, upper(base_currency) AS currency FROM public.finance_settings
  UNION
  SELECT workspace_id, upper(currency) FROM public.finance_accounts
  UNION
  SELECT workspace_id, upper(currency) FROM public.finance_transactions
  UNION
  SELECT workspace_id, upper(currency) FROM public.finance_exchange_rates
) known
WHERE currency ~ '^[A-Z]{3}$'
ON CONFLICT (workspace_id,currency) DO NOTHING;

CREATE OR REPLACE FUNCTION public.fin_currencies_get(p_ws uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE out jsonb;
BEGIN
  PERFORM public.fin__need(p_ws,'fxrates','view');
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'currency',c.currency,'display_name',c.display_name,'symbol',c.symbol,
    'minor_units',c.minor_units,'is_active',c.is_active,
    'is_base',(c.currency=s.base_currency),'updated_at',c.updated_at
  ) ORDER BY (c.currency=s.base_currency) DESC,c.currency),'[]'::jsonb)
  INTO out
  FROM public.finance_currencies c
  JOIN public.finance_settings s ON s.workspace_id=c.workspace_id
  WHERE c.workspace_id=p_ws;
  RETURN out;
END
$function$;

CREATE OR REPLACE FUNCTION public.fin_currency_save(p jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  ws uuid := nullif(p->>'workspace_id','')::uuid;
  cur text := upper(btrim(coalesce(p->>'currency','')));
  nm text := btrim(coalesce(p->>'display_name',''));
  sym text := nullif(btrim(coalesce(p->>'symbol','')),'');
  units smallint := coalesce(nullif(p->>'minor_units','')::smallint,2);
  active boolean := coalesce((p->>'is_active')::boolean,true);
  base_cur text;
BEGIN
  PERFORM public.fin__need(ws,'fxrates','edit');
  IF cur !~ '^[A-Z]{3}$' THEN PERFORM public.fin__err('VALIDATION_FAILED','currency must be a 3-letter code'); END IF;
  IF nm='' THEN PERFORM public.fin__err('VALIDATION_FAILED','display_name is required'); END IF;
  IF units<0 OR units>4 THEN PERFORM public.fin__err('VALIDATION_FAILED','minor_units must be between 0 and 4'); END IF;
  SELECT base_currency INTO base_cur FROM public.finance_settings WHERE workspace_id=ws;
  IF base_cur IS NULL THEN PERFORM public.fin__err('WORKSPACE_SETTINGS_NOT_FOUND'); END IF;
  IF cur=base_cur AND NOT active THEN PERFORM public.fin__err('BASE_CURRENCY_REQUIRED','The base currency cannot be disabled'); END IF;
  INSERT INTO public.finance_currencies(workspace_id,currency,display_name,symbol,minor_units,is_active,created_by,updated_at)
  VALUES(ws,cur,nm,sym,units,active,auth.uid(),clock_timestamp())
  ON CONFLICT(workspace_id,currency) DO UPDATE SET
    display_name=excluded.display_name,
    symbol=excluded.symbol,
    minor_units=excluded.minor_units,
    is_active=excluded.is_active,
    updated_at=clock_timestamp();
  RETURN jsonb_build_object('workspace_id',ws,'currency',cur,'display_name',nm,'symbol',sym,'minor_units',units,'is_active',active,'is_base',(cur=base_cur));
END
$function$;

CREATE OR REPLACE FUNCTION public.fin_currency_remove(p jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  ws uuid := nullif(p->>'workspace_id','')::uuid;
  cur text := upper(btrim(coalesce(p->>'currency','')));
  base_cur text;
BEGIN
  PERFORM public.fin__need(ws,'fxrates','edit');
  SELECT base_currency INTO base_cur FROM public.finance_settings WHERE workspace_id=ws;
  IF cur=base_cur THEN PERFORM public.fin__err('BASE_CURRENCY_REQUIRED','The base currency cannot be removed'); END IF;
  IF NOT EXISTS(SELECT 1 FROM public.finance_currencies WHERE workspace_id=ws AND currency=cur) THEN
    PERFORM public.fin__err('CURRENCY_NOT_FOUND','Currency is not registered in this workspace');
  END IF;
  IF EXISTS(SELECT 1 FROM public.finance_accounts WHERE workspace_id=ws AND currency=cur AND status='Active') THEN
    PERFORM public.fin__err('CURRENCY_IN_USE','An active account uses this currency. Archive or change that account first.');
  END IF;
  UPDATE public.finance_currencies SET is_active=false,updated_at=clock_timestamp()
    WHERE workspace_id=ws AND currency=cur;
  RETURN jsonb_build_object('currency',cur,'is_active',false,'historical_data_preserved',true);
END
$function$;

REVOKE ALL ON FUNCTION public.fin_currencies_get(uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.fin_currency_save(jsonb) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.fin_currency_remove(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fin_currencies_get(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fin_currency_save(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fin_currency_remove(jsonb) TO authenticated;
