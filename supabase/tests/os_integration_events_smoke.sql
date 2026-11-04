-- Disposable integration-event migration contract tests.
begin;

insert into public.workspaces(id) values ('11111111-1111-4111-8111-111111111111');
insert into auth.users(id) values ('22222222-2222-4222-8222-222222222222');

select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
select set_config('test.allowed_workspace_id','11111111-1111-4111-8111-111111111111',true);
select set_config('test.source_system','hobbies',true);
select set_config('test.projects_access_level','view',true);
select set_config('test.source_access_level','edit',true);

do $$
declare first_result jsonb; duplicate_result jsonb; loaded jsonb;
begin
  first_result := public.os_integration_event_publish(
    '11111111-1111-4111-8111-111111111111',
    'hobbies','hobbies.journal.updated','journal_entry','entry-1',
    'journal-entry-event-0001',now(),'{"action":"updated","version":1}'::jsonb
  );
  if first_result->>'accepted' <> 'true' or first_result->>'duplicate' <> 'false' then
    raise exception 'first publish must be accepted: %', first_result;
  end if;

  duplicate_result := public.os_integration_event_publish(
    '11111111-1111-4111-8111-111111111111',
    'hobbies','hobbies.journal.updated','journal_entry','entry-1',
    'journal-entry-event-0001',now(),'{"action":"updated","version":1}'::jsonb
  );
  if duplicate_result->>'accepted' <> 'false' or duplicate_result->>'duplicate' <> 'true' then
    raise exception 'duplicate idempotency key must not create another row: %', duplicate_result;
  end if;

  loaded := public.os_integration_events_load(
    '11111111-1111-4111-8111-111111111111','hobbies',20
  );
  if jsonb_typeof(loaded) <> 'array' or jsonb_array_length(loaded) <> 1 then
    raise exception 'load must return exactly one durable event: %', loaded;
  end if;
  if loaded->0->>'idempotencyKey' <> 'journal-entry-event-0001' then
    raise exception 'loaded event idempotency key mismatch: %', loaded;
  end if;
end
$$;

-- The table is RLS protected and is present in the realtime publication.
do $$
begin
  if not (select relrowsecurity from pg_class where oid='public.os_integration_events'::regclass) then
    raise exception 'RLS must be enabled';
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='os_integration_events') then
    raise exception 'integration event table must be in supabase_realtime';
  end if;
  if has_table_privilege('anon','public.os_integration_events','select')
     or has_table_privilege('anon','public.os_integration_events','insert') then
    raise exception 'anon must not access the event table';
  end if;
  if not has_function_privilege('authenticated','public.os_integration_event_publish(uuid,text,text,text,text,text,timestamptz,jsonb)','execute')
     or has_function_privilege('anon','public.os_integration_event_publish(uuid,text,text,text,text,text,timestamptz,jsonb)','execute') then
    raise exception 'publish RPC grants are incorrect';
  end if;
end
$$;

-- Test the RLS policies as the authenticated role, not as the table owner.
set local role authenticated;
do $$
declare visible_count integer;
begin
  select count(*) into visible_count from public.os_integration_events;
  if visible_count <> 1 then raise exception 'source + Projects view access should expose one event, got %', visible_count; end if;

  perform set_config('test.source_access_level','none',true);
  select count(*) into visible_count from public.os_integration_events;
  if visible_count <> 0 then raise exception 'source access revocation must hide events, got %', visible_count; end if;

  begin
    perform public.os_integration_events_load('11111111-1111-4111-8111-111111111111','hobbies',20);
    raise exception 'source read denial was not enforced';
  exception when insufficient_privilege then
    null;
  end;

  begin
    perform public.os_integration_event_publish(
      '11111111-1111-4111-8111-111111111111',
      'hobbies','hobbies.journal.updated','journal_entry','entry-2',
      'journal-entry-event-0002',now(),'{}'::jsonb
    );
    raise exception 'source write denial was not enforced';
  exception when insufficient_privilege then
    null;
  end;
end
$$;

rollback;
