-- Finance OS Phase 21: harden legacy asset SECURITY DEFINER entry points.
-- Function bodies already schema-qualify application objects; pin an empty search_path
-- to prevent object-shadowing through writable schemas.
ALTER FUNCTION public.fin_asset_upsert(jsonb) SET search_path = '';
ALTER FUNCTION public.fin_asset_confirm_valuation(jsonb) SET search_path = '';
