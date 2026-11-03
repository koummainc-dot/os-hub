-- Database-level restore matrix for the seven unified-trash record types and Journal.
insert into public.workspaces(id) values ('cccccccc-cccc-4ccc-8ccc-cccccccccccc');

set request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
set role authenticated;

insert into public.workspace_records(workspace_id,system_id,collection,id,data,deleted,updated_by,visible_to)
values
 ('cccccccc-cccc-4ccc-8ccc-cccccccccccc','hobbies','habits','restore-habit',
  '{"name":"reading","deleted_at":"2026-11-03T00:00:00Z","deleted_by":"11111111-1111-4111-8111-111111111111"}',false,'11111111-1111-4111-8111-111111111111',array['11111111-1111-4111-8111-111111111111'::uuid]),
 ('cccccccc-cccc-4ccc-8ccc-cccccccccccc','hobbies','habitLogs','restore-log',
  '{"habitId":"restore-habit","status":"done","localDate":"2026-11-02","deleted_at":"2026-11-03T00:00:00Z","deleted_by":"11111111-1111-4111-8111-111111111111"}',false,'11111111-1111-4111-8111-111111111111',array['11111111-1111-4111-8111-111111111111'::uuid]),
 ('cccccccc-cccc-4ccc-8ccc-cccccccccccc','hobbies','relapses','restore-relapse',
  '{"trigger":"stress","eventType":"urge","localDate":"2026-11-02","deleted_at":"2026-11-03T00:00:00Z","deleted_by":"11111111-1111-4111-8111-111111111111"}',false,'11111111-1111-4111-8111-111111111111',array['11111111-1111-4111-8111-111111111111'::uuid]),
 ('cccccccc-cccc-4ccc-8ccc-cccccccccccc','hobbies','books','restore-book',
  '{"title":"Atomic Habits","status":"reading","deleted_at":"2026-11-03T00:00:00Z","deleted_by":"11111111-1111-4111-8111-111111111111"}',false,'11111111-1111-4111-8111-111111111111',array['11111111-1111-4111-8111-111111111111'::uuid]),
 ('cccccccc-cccc-4ccc-8ccc-cccccccccccc','hobbies','readingSessions','restore-reading',
  '{"bookId":"restore-book","durationMinutes":25,"pagesRead":6,"deleted_at":"2026-11-03T00:00:00Z","deleted_by":"11111111-1111-4111-8111-111111111111"}',false,'11111111-1111-4111-8111-111111111111',array['11111111-1111-4111-8111-111111111111'::uuid]),
 ('cccccccc-cccc-4ccc-8ccc-cccccccccccc','hobbies','weeklyFocus','restore-focus',
  '{"title":"Reading week","habitIds":["restore-habit"],"deleted_at":"2026-11-03T00:00:00Z","deleted_by":"11111111-1111-4111-8111-111111111111"}',false,'11111111-1111-4111-8111-111111111111',array['11111111-1111-4111-8111-111111111111'::uuid]),
 ('cccccccc-cccc-4ccc-8ccc-cccccccccccc','hobbies','habitReminders','restore-reminder',
  '{"habitId":"restore-habit","time":"08:30","deleted_at":"2026-11-03T00:00:00Z","deleted_by":"11111111-1111-4111-8111-111111111111"}',false,'11111111-1111-4111-8111-111111111111',array['11111111-1111-4111-8111-111111111111'::uuid]),
 ('cccccccc-cccc-4ccc-8ccc-cccccccccccc','hobbies','journalEntries','restore-journal',
  '{"title":"Private note","body":"must remain private","deleted_at":"2026-11-03T00:00:00Z","deleted_by":"11111111-1111-4111-8111-111111111111"}',false,'11111111-1111-4111-8111-111111111111',array['11111111-1111-4111-8111-111111111111'::uuid]);

-- This is the same record-store mutation used by restore(): clear tombstone
-- metadata without replacing the remaining record payload or visibility.
update public.workspace_records
set data = data || '{"deleted_at":null,"deleted_by":null}'::jsonb
where workspace_id='cccccccc-cccc-4ccc-8ccc-cccccccccccc'
  and system_id='hobbies'
  and collection in ('habits','habitLogs','relapses','books','readingSessions','weeklyFocus','habitReminders','journalEntries')
  and id like 'restore-%';

do $restore$
declare v_count integer;
begin
  select count(*) into v_count from public.workspace_records
  where workspace_id='cccccccc-cccc-4ccc-8ccc-cccccccccccc'
    and system_id='hobbies'
    and collection in ('habits','habitLogs','relapses','books','readingSessions','weeklyFocus','habitReminders','journalEntries')
    and id like 'restore-%'
    and data->'deleted_at' = 'null'::jsonb
    and data->'deleted_by' = 'null'::jsonb
    and visible_to = array['11111111-1111-4111-8111-111111111111'::uuid]
    and not deleted;
  if v_count <> 8 then raise exception 'expected 8 restored private records with visibility preserved, got %',v_count; end if;

  if not exists(select 1 from public.workspace_records where id='restore-habit' and data->>'name'='reading')
     or not exists(select 1 from public.workspace_records where id='restore-log' and data->>'habitId'='restore-habit')
     or not exists(select 1 from public.workspace_records where id='restore-relapse' and data->>'trigger'='stress')
     or not exists(select 1 from public.workspace_records where id='restore-book' and data->>'title'='Atomic Habits')
     or not exists(select 1 from public.workspace_records where id='restore-reading' and data->>'durationMinutes'='25')
     or not exists(select 1 from public.workspace_records where id='restore-focus' and data->>'title'='Reading week')
     or not exists(select 1 from public.workspace_records where id='restore-reminder' and data->>'time'='08:30')
     or not exists(select 1 from public.workspace_records where id='restore-journal' and data->>'body'='must remain private') then
    raise exception 'restore changed or lost a record payload';
  end if;
end
$restore$;

reset role;
set request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';
set role authenticated;
do $privacy$
declare v_count integer;
begin
  select count(*) into v_count from public.workspace_records
  where workspace_id='cccccccc-cccc-4ccc-8ccc-cccccccccccc'
    and system_id='hobbies' and id like 'restore-%';
  if v_count <> 0 then raise exception 'another member can read restored private records'; end if;
end
$privacy$;
reset role;

select 'Hobbies restore matrix database smoke passed for seven trash types plus Journal.' as result;
