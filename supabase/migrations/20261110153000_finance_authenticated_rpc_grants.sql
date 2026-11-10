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
