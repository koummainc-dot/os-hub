\set ON_ERROR_STOP on
DO $$
DECLARE
  t text;
  required_tables text[] := ARRAY[
    'inventory_settings','inventory_sync_operations','inventory_sync_conflicts','inventory_audit_log',
    'inventory_external_links','inventory_categories','inventory_locations','inventory_items',
    'inventory_identifiers','inventory_ownership_events','inventory_warranties','inventory_warranty_claims',
    'inventory_replacement_plans','inventory_valuations','inventory_loans','inventory_service_logs','inventory_attachments'
  ];
BEGIN
  FOREACH t IN ARRAY required_tables LOOP
    IF to_regclass('public.' || t) IS NULL THEN RAISE EXCEPTION 'missing Inventory table: %', t; END IF;
    IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = to_regclass('public.' || t)) THEN
      RAISE EXCEPTION 'RLS is not enabled on Inventory table: %', t;
    END IF;
  END LOOP;
  IF to_regprocedure('public.inventory_load_snapshot(uuid)') IS NULL
     OR to_regprocedure('public.inventory_save_snapshot(uuid,jsonb)') IS NULL THEN
    RAISE EXCEPTION 'Inventory snapshot RPCs are missing';
  END IF;
END $$;

INSERT INTO auth.users(id) VALUES
 ('11111111-1111-4111-8111-111111111111')
ON CONFLICT DO NOTHING;
INSERT INTO public.workspaces(id, owner_id) VALUES
 ('22222222-2222-4222-8222-222222222222','11111111-1111-4111-8111-111111111111'),
 ('33333333-3333-4333-8333-333333333333','11111111-1111-4111-8111-111111111111')
ON CONFLICT DO NOTHING;

-- The audit stream must reject UPDATE/DELETE even for the table owner.
INSERT INTO public.inventory_audit_log(workspace_id, action, entity_type, metadata)
VALUES ('22222222-2222-4222-8222-222222222222','test','smoke', '{}'::jsonb);
DO $$
BEGIN
  BEGIN
    UPDATE public.inventory_audit_log SET action='tampered'
    WHERE workspace_id='22222222-2222-4222-8222-222222222222' AND action='test';
    RAISE EXCEPTION 'Inventory audit mutation unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END $$;

SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
SELECT set_config('test.workspace_id','22222222-2222-4222-8222-222222222222',false);
SELECT set_config('test.inventory_access','edit',false);
SET ROLE authenticated;

INSERT INTO public.inventory_categories(workspace_id,name,slug)
VALUES ('22222222-2222-4222-8222-222222222222','أجهزة','devices');
INSERT INTO public.inventory_items(workspace_id,name,category_id)
SELECT '22222222-2222-4222-8222-222222222222','حاسوب',id
FROM public.inventory_categories
WHERE workspace_id='22222222-2222-4222-8222-222222222222' AND slug='devices';

DO $$
DECLARE snapshot jsonb;
BEGIN
  snapshot := public.inventory_load_snapshot('22222222-2222-4222-8222-222222222222');
  IF snapshot->'tables'->'inventory_items' IS NULL
     OR jsonb_array_length(snapshot->'tables'->'inventory_items') <> 1 THEN
    RAISE EXCEPTION 'Inventory snapshot did not return the workspace item';
  END IF;
  IF jsonb_array_length(snapshot->'tables'->'inventory_categories') <> 1 THEN
    RAISE EXCEPTION 'Inventory snapshot did not return the workspace category';
  END IF;
  PERFORM public.inventory_save_snapshot(
    '22222222-2222-4222-8222-222222222222',
    jsonb_build_object('schema_version',1,'tables',jsonb_build_object('inventory_settings','[]'::jsonb))
  );
  BEGIN
    PERFORM public.inventory_save_snapshot(
      '22222222-2222-4222-8222-222222222222',
      jsonb_build_object('schema_version',1,'tables',jsonb_build_object(
        'inventory_settings',jsonb_build_array(jsonb_build_object('workspace_id','33333333-3333-4333-8333-333333333333'))
      ))
    );
    RAISE EXCEPTION 'cross-workspace Inventory snapshot unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END $$;

SELECT set_config('test.inventory_access','view',false);
DO $$
BEGIN
  BEGIN
    INSERT INTO public.inventory_categories(workspace_id,name,slug)
    VALUES ('22222222-2222-4222-8222-222222222222','Viewer write','viewer-write');
    RAISE EXCEPTION 'Inventory viewer unexpectedly inserted a category';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
  IF jsonb_array_length(public.inventory_load_snapshot('22222222-2222-4222-8222-222222222222')->'tables'->'inventory_items') <> 1 THEN
    RAISE EXCEPTION 'Inventory viewer could not read its permitted snapshot';
  END IF;
END $$;

SELECT set_config('test.inventory_access','none',false);
DO $$
BEGIN
  BEGIN
    PERFORM public.inventory_load_snapshot('22222222-2222-4222-8222-222222222222');
    RAISE EXCEPTION 'unauthorized Inventory snapshot unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END $$;

RESET ROLE;
