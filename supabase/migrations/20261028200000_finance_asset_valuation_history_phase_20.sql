-- Finance OS Phase 20: immutable asset valuation history.
CREATE TABLE IF NOT EXISTS public.finance_asset_valuations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 workspace_id uuid NOT NULL,
 asset_id uuid NOT NULL,
 valuation_date date NOT NULL,
 current_value numeric(24,2) NOT NULL CHECK(current_value >= 0),
 purchase_value numeric(24,2) NOT NULL DEFAULT 0 CHECK(purchase_value >= 0),
 currency text NOT NULL CHECK(currency ~ '^[A-Z]{3}$'),
 valuation_source text NOT NULL CHECK(valuation_source IN ('manual','market','inventory_estimate')),
 valuation_confirmed boolean NOT NULL DEFAULT true,
 include_in_net_worth boolean NOT NULL DEFAULT true,
 event_type text NOT NULL CHECK(event_type IN ('Created','Revalued','Confirmed','LegacyBaseline')),
 reason text,
 changed_by uuid,
 recorded_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT finance_asset_valuations_asset_fk FOREIGN KEY(workspace_id,asset_id)
  REFERENCES public.finance_assets(workspace_id,id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS finance_asset_valuations_history_idx
 ON public.finance_asset_valuations(workspace_id,asset_id,valuation_date DESC,recorded_at DESC);
ALTER TABLE public.finance_asset_valuations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.finance_asset_valuations FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.fin__asset_valuation_history_touch()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
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
   AND NEW.include_in_net_worth IS NOT DISTINCT FROM OLD.include_in_net_worth THEN
   RETURN NEW;
  END IF;
  IF OLD.valuation_confirmed IS DISTINCT FROM NEW.valuation_confirmed AND NEW.valuation_confirmed THEN
   event_name:='Confirmed';
  ELSE
   event_name:='Revalued';
  END IF;
  reason_text:='تغيير موثق في بيانات تقييم الأصل';
 END IF;
 INSERT INTO public.finance_asset_valuations
 (workspace_id,asset_id,valuation_date,current_value,purchase_value,currency,valuation_source,valuation_confirmed,include_in_net_worth,event_type,reason,changed_by)
 VALUES(NEW.workspace_id,NEW.id,coalesce(NEW.valuation_date,(now())::date),NEW.current_value,NEW.purchase_value,NEW.currency,
  NEW.valuation_source,NEW.valuation_confirmed,NEW.include_in_net_worth,event_name,reason_text,auth.uid());
 RETURN NEW;
END
$function$;
REVOKE ALL ON FUNCTION public.fin__asset_valuation_history_touch() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS finance_asset_valuation_history_insert ON public.finance_assets;
DROP TRIGGER IF EXISTS finance_asset_valuation_history_update ON public.finance_assets;
CREATE TRIGGER finance_asset_valuation_history_insert
AFTER INSERT ON public.finance_assets FOR EACH ROW EXECUTE FUNCTION public.fin__asset_valuation_history_touch();
CREATE TRIGGER finance_asset_valuation_history_update
AFTER UPDATE OF current_value,purchase_value,currency,valuation_date,valuation_source,valuation_confirmed,include_in_net_worth
ON public.finance_assets FOR EACH ROW EXECUTE FUNCTION public.fin__asset_valuation_history_touch();

-- Preserve a baseline for assets created before this feature shipped.
INSERT INTO public.finance_asset_valuations
 (workspace_id,asset_id,valuation_date,current_value,purchase_value,currency,valuation_source,valuation_confirmed,include_in_net_worth,event_type,reason,changed_by,recorded_at)
SELECT a.workspace_id,a.id,coalesce(a.valuation_date,a.created_at::date),a.current_value,a.purchase_value,a.currency,a.valuation_source,a.valuation_confirmed,
 a.include_in_net_worth,'LegacyBaseline','قيمة حالية عند تفعيل سجل التقييمات',NULL,a.created_at
FROM public.finance_assets a
WHERE NOT EXISTS(SELECT 1 FROM public.finance_asset_valuations v WHERE v.workspace_id=a.workspace_id AND v.asset_id=a.id);

CREATE OR REPLACE FUNCTION public.fin_asset_valuation_history_get(p jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE ws uuid:=(p->>'workspace_id')::uuid; aid uuid:=(p->>'asset_id')::uuid; result jsonb;
BEGIN
 PERFORM public.fin__need(ws,'assets','view');
 IF NOT EXISTS(SELECT 1 FROM public.finance_assets a WHERE a.workspace_id=ws AND a.id=aid) THEN
  PERFORM public.fin__err('OWNERSHIP_MISMATCH','asset does not belong to workspace');
 END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object(
  'id',v.id,'asset_id',v.asset_id,'valuation_date',v.valuation_date,'current_value',v.current_value::text,
  'purchase_value',v.purchase_value::text,'currency',v.currency,'valuation_source',v.valuation_source,
  'valuation_confirmed',v.valuation_confirmed,'include_in_net_worth',v.include_in_net_worth,
  'event_type',v.event_type,'reason',v.reason,'recorded_at',v.recorded_at,'changed_by',v.changed_by)
  ORDER BY v.valuation_date DESC,v.recorded_at DESC),'[]'::jsonb)
 INTO result FROM public.finance_asset_valuations v WHERE v.workspace_id=ws AND v.asset_id=aid;
 RETURN result;
END
$function$;
REVOKE ALL ON FUNCTION public.fin_asset_valuation_history_get(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fin_asset_valuation_history_get(jsonb) TO authenticated;
