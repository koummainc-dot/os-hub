-- Finance OS security hardening: internal SECURITY DEFINER helpers must not be callable as RPCs.
-- These helpers are invoked by Finance RPCs/triggers, not by clients directly.
-- Revoking EXECUTE does not affect trigger execution or calls made by the owning function.
DO $$
DECLARE
  f record;
BEGIN
  FOR f IN
    SELECT p.oid,
           n.nspname AS schema_name,
           p.proname,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname LIKE 'fin__%'
      AND p.prosecdef = true
  LOOP
    EXECUTE format(
      'REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM PUBLIC, anon, authenticated',
      f.schema_name,
      f.proname,
      f.args
    );
  END LOOP;
END
$$;

-- Keep the internal namespace contract explicit for future audits.
COMMENT ON SCHEMA public IS 'Finance internal helpers prefixed fin__ are not client-callable; use fin_* RPCs with workspace authorization.';
