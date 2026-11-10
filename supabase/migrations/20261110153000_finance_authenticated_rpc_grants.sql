-- Restore the Finance RPC surface for signed-in clients without exposing internal helpers.
-- Only SECURITY DEFINER functions that enforce workspace/action authorization via fin__need
-- are callable by authenticated users. Internal helpers remain private.
DO $$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure AS signature
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef
      AND p.proname LIKE 'fin\_%' ESCAPE '\'
      AND p.proname NOT LIKE 'fin\_\_%' ESCAPE '\'
      AND position('fin__need(' IN pg_get_functiondef(p.oid)) > 0
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', fn.signature);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', fn.signature);
  END LOOP;
END
$$;

-- Explicit regression guard for the Finance flows reported in the UI:
-- currency/rates, asset valuation, net worth and goal progress. These functions
-- are SECURITY DEFINER but enforce workspace/action access through fin__need.
REVOKE ALL ON FUNCTION
  public.fin_net_worth(uuid, date),
  public.fin_goal_progress(uuid),
  public.fin_currencies_get(uuid),
  public.fin_add_rate(jsonb),
  public.fin_currency_save(jsonb),
  public.fin_update_settings(jsonb),
  public.fin_asset_upsert(jsonb),
  public.fin_asset_confirm_valuation(jsonb)
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION
  public.fin_net_worth(uuid, date),
  public.fin_goal_progress(uuid),
  public.fin_currencies_get(uuid),
  public.fin_add_rate(jsonb),
  public.fin_currency_save(jsonb),
  public.fin_update_settings(jsonb),
  public.fin_asset_upsert(jsonb),
  public.fin_asset_confirm_valuation(jsonb)
TO authenticated;
