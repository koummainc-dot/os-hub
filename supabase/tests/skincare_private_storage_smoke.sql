\set ON_ERROR_STOP on
DO $$
DECLARE bucket public_dummy;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id='skincare-progress' AND public=false
    AND file_size_limit=10485760 AND allowed_mime_types=ARRAY['image/jpeg','image/png','image/webp']) THEN
    RAISE EXCEPTION 'Skincare private bucket configuration is incorrect';
  END IF;
  IF (SELECT count(*) FROM public.collection_sections WHERE system_id='skincare') <> 12 THEN
    RAISE EXCEPTION 'Skincare collection-to-section mappings are incomplete';
  END IF;
  IF (SELECT count(*) FROM pg_policies WHERE schemaname='storage' AND tablename='objects'
      AND policyname IN ('skincare_progress_select','skincare_progress_insert','skincare_progress_delete')) <> 3 THEN
    RAISE EXCEPTION 'Skincare storage policies are incomplete';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects'
      AND policyname='skincare_progress_update') THEN
    RAISE EXCEPTION 'Skincare storage must not allow object UPDATE/upsert';
  END IF;
END $$;

INSERT INTO public.workspace_records(workspace_id,system_id,collection,id,data)
VALUES
 ('22222222-2222-4222-8222-222222222222','skincare','skin_diary','diary-2026-11-04','{"date":"2026-11-04"}'),
 ('22222222-2222-4222-8222-222222222222','skincare','skin_photos','11111111-1111-4111-8111-111111111111',
  '{"diaryId":"diary-2026-11-04","date":"2026-11-04","objectPath":"22222222-2222-4222-8222-222222222222/diary-2026-11-04/11111111-1111-4111-8111-111111111111.jpg","thumbnailPath":"22222222-2222-4222-8222-222222222222/diary-2026-11-04/11111111-1111-4111-8111-111111111111.thumb.webp"}');

SELECT set_config('test.workspace_id','22222222-2222-4222-8222-222222222222',false);
SELECT set_config('test.skincare_access','edit',false);
SET ROLE authenticated;

INSERT INTO storage.objects(bucket_id,name) VALUES
 ('skincare-progress','22222222-2222-4222-8222-222222222222/diary-2026-11-04/11111111-1111-4111-8111-111111111111.jpg');
DO $$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n FROM storage.objects WHERE bucket_id='skincare-progress';
  IF n <> 1 THEN RAISE EXCEPTION 'Skincare editor could not read its registered private photo'; END IF;
END $$;

SELECT set_config('test.skincare_access','view',false);
DO $$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n FROM storage.objects WHERE bucket_id='skincare-progress';
  IF n <> 1 THEN RAISE EXCEPTION 'Skincare viewer could not read a photo with explicit view access'; END IF;
  BEGIN
    INSERT INTO storage.objects(bucket_id,name) VALUES
      ('skincare-progress','22222222-2222-4222-8222-222222222222/diary-2026-11-04/22222222-2222-4222-8222-222222222222.jpg');
    RAISE EXCEPTION 'Skincare viewer unexpectedly uploaded a photo';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  DELETE FROM storage.objects WHERE bucket_id='skincare-progress';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 0 THEN RAISE EXCEPTION 'Skincare viewer unexpectedly deleted a photo'; END IF;
END $$;

SELECT set_config('test.workspace_id','33333333-3333-4333-8333-333333333333',false);
SELECT set_config('test.skincare_access','edit',false);
DO $$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n FROM storage.objects WHERE bucket_id='skincare-progress';
  IF n <> 0 THEN RAISE EXCEPTION 'Skincare photo leaked across workspace boundary'; END IF;
  BEGIN
    INSERT INTO storage.objects(bucket_id,name) VALUES
      ('skincare-progress','22222222-2222-4222-8222-222222222222/diary-2026-11-04/33333333-3333-4333-8333-333333333333.jpg');
    RAISE EXCEPTION 'cross-workspace Skincare upload unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;

RESET ROLE;
