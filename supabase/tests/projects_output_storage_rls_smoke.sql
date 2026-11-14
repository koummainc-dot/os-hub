\set ON_ERROR_STOP on
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM storage.buckets
    WHERE id = 'projects-outputs'
      AND public = false
      AND file_size_limit = 10485760
      AND allowed_mime_types @> ARRAY['application/pdf','image/png','image/jpeg']::text[]
  ) THEN
    RAISE EXCEPTION 'Projects Outputs private bucket configuration is incorrect';
  END IF;

  IF (SELECT count(*) FROM pg_policies
      WHERE schemaname = 'storage'
        AND tablename = 'objects'
        AND policyname IN (
          'projects_outputs_select',
          'projects_outputs_insert',
          'projects_outputs_delete'
        )) <> 3 THEN
    RAISE EXCEPTION 'Projects Outputs Storage policies are incomplete';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public'
      AND p.proname='projects_output_workspace_id'
      AND p.prosecdef=false
      AND p.proconfig @> ARRAY['search_path=""']::text[]
      AND NOT has_function_privilege('anon', p.oid, 'execute')
      AND has_function_privilege('authenticated', p.oid, 'execute')
  ) THEN
    RAISE EXCEPTION 'Projects Outputs path parser must be SECURITY INVOKER, use an empty search_path, and be executable only by authenticated app users';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'projects_outputs_update'
  ) THEN
    RAISE EXCEPTION 'Projects Outputs Storage must not allow object UPDATE/upsert';
  END IF;
END $$;

-- Static policy-contract checks that do not require real authenticated users.
DO $$
DECLARE
  p text;
BEGIN
  SELECT qual::text INTO p
  FROM pg_policies
  WHERE schemaname='storage' AND tablename='objects'
    AND policyname='projects_outputs_select';

  IF p IS NULL OR p NOT LIKE '%ws_access_level%' OR p NOT LIKE '%workspace_records%'
     OR p NOT LIKE '%collection = ''outputs''%' THEN
    RAISE EXCEPTION 'Projects Outputs SELECT policy is missing workspace/project/output authorization';
  END IF;

  SELECT with_check::text INTO p
  FROM pg_policies
  WHERE schemaname='storage' AND tablename='objects'
    AND policyname='projects_outputs_insert';

  IF p IS NULL OR p NOT LIKE '%ws_access_level%' OR p NOT LIKE '%workspace_records%'
     OR p NOT LIKE '%collection = ''outputs''%' THEN
    RAISE EXCEPTION 'Projects Outputs INSERT policy is missing workspace/project/output authorization';
  END IF;
END $$;

-- The actual two-account/session acceptance remains a separate gate because
-- CI cannot safely impersonate the user's production authenticated identities.


DO $body$
BEGIN
  IF public.projects_output_workspace_id('workspace/11111111-2222-4333-8444-555555555555/project/p1/output/o1/file.pdf')
       IS DISTINCT FROM '11111111-2222-4333-8444-555555555555'::uuid THEN
    RAISE EXCEPTION 'Well-formed Output Storage path must resolve its workspace UUID';
  END IF;

  IF public.projects_output_workspace_id('workspace/not-a-uuid/project/p1/output/o1/file.pdf') IS NOT NULL THEN
    RAISE EXCEPTION 'Malformed Output Storage path must fail closed';
  END IF;
END $body$;
