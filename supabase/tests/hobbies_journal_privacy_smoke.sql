-- Run as the disposable database owner after the two Hobbies Journal migrations.
insert into public.workspaces(id) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
insert into auth.users(id) values
 ('11111111-1111-4111-8111-111111111111'),
 ('22222222-2222-4222-8222-222222222222');

-- User A creates a Journal row without trusting the client to set visible_to.
set request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
set role authenticated;
insert into public.workspace_records(workspace_id,system_id,collection,id,data)
values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','hobbies','journalEntries','journal-a','{"title":"private"}');
reset role;

do $$
declare v_visible uuid[];
begin
  select visible_to into v_visible from public.workspace_records
  where workspace_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' and system_id='hobbies'
    and collection='journalEntries' and id='journal-a';
  if v_visible is distinct from array['11111111-1111-4111-8111-111111111111'::uuid] then
    raise exception 'new journal row was not private by default';
  end if;
end $$;

-- User B has edit permission at the OS level but cannot read/update A's private row.
set request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';
set role authenticated;
do $$
declare v_count integer;
begin
  select count(*) into v_count from public.workspace_records where id='journal-a';
  if v_count <> 0 then raise exception 'another member can read a private Journal row'; end if;
  update public.workspace_records set data='{"title":"intrusion"}' where id='journal-a';
  get diagnostics v_count = row_count;
  if v_count <> 0 then raise exception 'another member updated a private Journal row'; end if;
end $$;
reset role;

-- User A can update content but cannot widen the private audience.
set request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
set role authenticated;
update public.workspace_records set data='{"title":"updated"}' where id='journal-a';
do $$
begin
  begin
    update public.workspace_records
    set visible_to=array[
      '11111111-1111-4111-8111-111111111111'::uuid,
      '22222222-2222-4222-8222-222222222222'::uuid
    ] where id='journal-a';
    raise exception 'private audience expansion unexpectedly succeeded';
  exception when insufficient_privilege then
    null;
  end;
end $$;

-- Private storage object can be inserted/read by A only.
insert into storage.objects(bucket_id,name)
values ('hobbies-journal-private','11111111-1111-4111-8111-111111111111/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/journal-a/photo.webp');
reset role;
set request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';
set role authenticated;
do $$
declare v_count integer;
begin
  select count(*) into v_count from storage.objects where bucket_id='hobbies-journal-private';
  if v_count <> 0 then raise exception 'another member can read a private Journal attachment'; end if;
end $$;
reset role;
set request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
set role authenticated;
do $$
declare v_count integer;
begin
  select count(*) into v_count from storage.objects where bucket_id='hobbies-journal-private';
  if v_count <> 1 then raise exception 'attachment owner cannot read their private file'; end if;
end $$;
reset role;


-- Journal audit records are server-authored, metadata-only, append-only, and private.
set request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
set role authenticated;
update public.workspace_records set data = data || '{"body":"private body text"}'::jsonb
where workspace_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  and system_id='hobbies' and collection='journalEntries' and id='journal-a';
update public.workspace_records
set data = data || '{"deleted_at":"2026-11-02T10:00:00Z"}'::jsonb
where workspace_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  and system_id='hobbies' and collection='journalEntries' and id='journal-a';
update public.workspace_records
set data = data || '{"deleted_at":null}'::jsonb
where workspace_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  and system_id='hobbies' and collection='journalEntries' and id='journal-a';

do $audit$
declare v_count integer; v_actor uuid; v_actions text[];
begin
  select count(*), (array_agg(actor_id order by occurred_at))[1], array_agg(action order by occurred_at)
    into v_count,v_actor,v_actions
  from public.hobbies_journal_audit_events
  where workspace_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' and record_id='journal-a';
  if v_count < 5 then raise exception 'expected create, metadata edit, body-only edit, delete, and restore audit events, got %',v_count; end if;
  if v_actor <> '11111111-1111-4111-8111-111111111111'::uuid then raise exception 'audit actor is incorrect'; end if;
  if not ('created'=any(v_actions) and 'updated'=any(v_actions) and 'deleted'=any(v_actions) and 'restored'=any(v_actions)) then
    raise exception 'missing expected audit actions: %',v_actions;
  end if;
  if exists (
    select 1 from public.hobbies_journal_audit_events
    where workspace_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
      and record_id='journal-a'
      and (coalesce(before_state,'{}'::jsonb) ? 'body' or coalesce(after_state,'{}'::jsonb) ? 'body')
  ) then raise exception 'audit snapshot must not include Journal body'; end if;
end $audit$;
reset role;

set request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';
set role authenticated;
do $audit$
declare v_count integer;
begin
  select count(*) into v_count from public.hobbies_journal_audit_events
  where workspace_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' and record_id='journal-a';
  if v_count <> 0 then raise exception 'another member can read private Journal audit events'; end if;
end $audit$;
reset role;

do $audit$
begin
  begin
    update public.hobbies_journal_audit_events set action='updated'
    where record_id='journal-a';
    raise exception 'audit event mutation unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
end $audit$;

select 'Hobbies Journal privacy, Storage isolation, and immutable audit tests passed.' as result;
