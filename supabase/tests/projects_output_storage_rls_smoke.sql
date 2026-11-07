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
