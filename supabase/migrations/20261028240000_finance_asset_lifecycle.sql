-- Asset lifecycle fields and auditable sale/write-off actions.
ALTER TABLE public.finance_assets
  ADD COLUMN IF NOT EXISTS status_reason text,
  ADD COLUMN IF NOT EXISTS sale_transaction_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='finance_assets_sale_transaction_fk') THEN
    ALTER TABLE public.finance_assets ADD CONSTRAINT finance_assets_sale_transaction_fk
      FOREIGN KEY (workspace_id,sale_transaction_id)
      REFERENCES public.finance_transactions(workspace_id,id) ON DELETE RESTRICT;
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS finance_assets_sale_transaction_unique
  ON public.finance_assets(workspace_id,sale_transaction_id) WHERE sale_transaction_id IS NOT NULL;

ALTER TABLE public.finance_asset_valuations
  DROP CONSTRAINT IF EXISTS finance_asset_valuations_event_type_check;
ALTER TABLE public.finance_asset_valuations
  ADD CONSTRAINT finance_asset_valuations_event_type_check
  CHECK (event_type = ANY (ARRAY['Created'::text,'Revalued'::text,'Confirmed'::text,'LegacyBaseline'::text,'Sold'::text,'WrittenOff'::text]));

CREATE OR REPLACE FUNCTION public.fin__asset_valuation_history_touch()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  event_name text;
  reason_text text;
BEGIN
  IF TG_OP='INSERT' THEN
    event_name:='Created';
    reason_text:='تسجيل أولي للأصل';
  ELSE
    IF NEW.current_value IS NOT DISTINCT FROM OLD.current_value
      AND NEW.purchase_value IS NOT DISTINCT FROM OLD.purchase_value
      AND NEW.currency IS NOT DISTINCT FROM OLD.currency
      AND NEW.valuation_date IS NOT DISTINCT FROM OLD.valuation_date
      AND NEW.valuation_source IS NOT DISTINCT FROM OLD.valuation_source
      AND NEW.valuation_confirmed IS NOT DISTINCT FROM OLD.valuation_confirmed
      AND NEW.include_in_net_worth IS NOT DISTINCT FROM OLD.include_in_net_worth
      AND NEW.status IS NOT DISTINCT FROM OLD.status
      AND NEW.status_reason IS NOT DISTINCT FROM OLD.status_reason
      AND NEW.sale_transaction_id IS NOT DISTINCT FROM OLD.sale_transaction_id THEN
      RETURN NEW;
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status='Sold' THEN
      event_name:='Sold';
      reason_text:=coalesce(nullif(NEW.status_reason,''),'بيع الأصل');
    ELSIF NEW.status IS DISTINCT FROM OLD.status AND NEW.status='WrittenOff' THEN
      event_name:='WrittenOff';
      reason_text:=coalesce(nullif(NEW.status_reason,''),'شطب الأصل');
    ELSIF OLD.valuation_confirmed IS DISTINCT FROM NEW.valuation_confirmed AND NEW.valuation_confirmed THEN
      event_name:='Confirmed';
      reason_text:='تأكيد تقييم الأصل';
    ELSE
      event_name:='Revalued';
      reason_text:=coalesce(nullif(NEW.status_reason,''),'تغيير موثق في بيانات تقييم الأصل');
    END IF;
  END IF;
  INSERT INTO public.finance_asset_valuations
    (workspace_id,asset_id,valuation_date,current_value,purchase_value,currency,valuation_source,valuation_confirmed,include_in_net_worth,event_type,reason,changed_by)
  VALUES(NEW.workspace_id,NEW.id,coalesce(NEW.valuation_date,(now())::date),NEW.current_value,NEW.purchase_value,NEW.currency,
    NEW.valuation_source,NEW.valuation_confirmed,NEW.include_in_net_worth,event_name,reason_text,auth.uid());
  RETURN NEW;
END
$function$;

DROP TRIGGER IF EXISTS finance_asset_valuation_history_update ON public.finance_assets;
CREATE TRIGGER finance_asset_valuation_history_update
AFTER UPDATE OF current_value,purchase_value,currency,valuation_date,valuation_source,valuation_confirmed,include_in_net_worth,status,status_reason,sale_transaction_id
ON public.finance_assets FOR EACH ROW EXECUTE FUNCTION public.fin__asset_valuation_history_touch();

CREATE OR REPLACE FUNCTION public.fin_asset_status_update(p jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  ws uuid := nullif(p->>'workspace_id','')::uuid;
  aid uuid := nullif(p->>'asset_id','')::uuid;
  next_status text := p->>'status';
  reason_text text := nullif(btrim(p->>'reason'),'');
  sale_tx uuid := nullif(p->>'sale_transaction_id','')::uuid;
  effective date := coalesce(nullif(p->>'effective_date','')::date,current_date);
  a public.finance_assets;
  t public.finance_transactions;
BEGIN
  PERFORM public.fin__need(ws,'assets','edit');
  IF next_status NOT IN ('Sold','WrittenOff') THEN
    PERFORM public.fin__err('VALIDATION_FAILED','status must be Sold or WrittenOff');
  END IF;
  IF length(coalesce(reason_text,''))<3 THEN PERFORM public.fin__err('VALIDATION_FAILED','reason is required'); END IF;
  SELECT * INTO a FROM public.finance_assets WHERE workspace_id=ws AND id=aid FOR UPDATE;
  IF a.id IS NULL THEN PERFORM public.fin__err('OWNERSHIP_MISMATCH','asset'); END IF;
  IF a.status<>'Held' THEN PERFORM public.fin__err('ASSET_NOT_HELD','Only a held asset can be sold or written off'); END IF;
  IF next_status='Sold' THEN
    PERFORM public.fin__need(ws,'ledger','view');
    IF sale_tx IS NULL THEN PERFORM public.fin__err('ASSET_SALE_TRANSACTION_REQUIRED','Record the sale proceeds as an income transaction first'); END IF;
    SELECT * INTO t FROM public.finance_transactions
      WHERE workspace_id=ws AND id=sale_tx AND status='Posted' AND type='Income' AND currency=a.currency;
    IF t.id IS NULL THEN PERFORM public.fin__err('ASSET_SALE_TRANSACTION_INVALID','Choose a posted income transaction in the asset currency'); END IF;
    IF EXISTS(SELECT 1 FROM public.finance_assets WHERE workspace_id=ws AND sale_transaction_id=sale_tx AND id<>aid) THEN
      PERFORM public.fin__err('ASSET_SALE_TRANSACTION_ALREADY_LINKED');
    END IF;
    effective:=t.local_date;
  ELSE
    IF sale_tx IS NOT NULL THEN PERFORM public.fin__err('VALIDATION_FAILED','A write-off cannot link a sale transaction'); END IF;
    IF effective>current_date THEN PERFORM public.fin__err('FUTURE_DATE'); END IF;
  END IF;
  UPDATE public.finance_assets SET status=next_status,status_reason=reason_text,
    sale_transaction_id=CASE WHEN next_status='Sold' THEN sale_tx ELSE NULL END,
    current_value=0,include_in_net_worth=false,valuation_date=effective,valuation_confirmed=true,updated_at=clock_timestamp()
  WHERE workspace_id=ws AND id=aid;
  PERFORM public.fin__audit(ws,auth.uid(),'asset',aid::text,lower(next_status),reason_text,null,
    jsonb_build_object('status',next_status,'sale_transaction_id',sale_tx,'effective_date',effective));
  RETURN jsonb_build_object('asset_id',aid,'status',next_status,'sale_transaction_id',sale_tx,'effective_date',effective,'included_in_net_worth',false);
END
$function$;

REVOKE ALL ON FUNCTION public.fin_asset_status_update(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fin_asset_status_update(jsonb) TO authenticated;
