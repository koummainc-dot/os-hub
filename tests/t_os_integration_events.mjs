import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {hobbySessionEvent} from "../src/systems/hobbies/domain.js";

const sql=readFileSync(new URL("../supabase/migrations/20261101150000_os_integration_events.sql",import.meta.url),"utf8");
const client=readFileSync(new URL("../src/systems/integrationEvents.js",import.meta.url),"utf8");
const hobbies=readFileSync(new URL("../src/systems/hobbies/index.jsx",import.meta.url),"utf8");
const projects=readFileSync(new URL("../src/systems/projects/index.jsx",import.meta.url),"utf8");
const platform=readFileSync(new URL("../src/platform/Platform.jsx",import.meta.url),"utf8");
const knowledge=readFileSync(new URL("../src/systems/knowledge/index.jsx",import.meta.url),"utf8");

const event=hobbySessionEvent({id:"s-1",hobbyId:"h-1",localDate:"2026-11-01",durationMinutes:35,sessionType:"practice"},{id:"h-1",name:"تصوير"});
assert.equal(event.type,"hobbies.practice_session.completed");
assert.equal(event.entityId,"s-1");
assert.deepEqual(event.payload.sourceRef,{system:"hobbies",type:"practice_session",id:"s-1"});
assert.throws(()=>hobbySessionEvent({id:"s-1",hobbyId:"other"},{id:"h-1"}),/HOBBY_SESSION_EVENT_SOURCE_INVALID/);

assert.match(sql,/unique \(workspace_id, source_system, idempotency_key\)/);
assert.match(sql,/ws_access_level\(p_workspace_id,p_source_system,\x27main\x27\) <> \x27edit\x27/);
assert.match(sql,/ws_access_level\(p_workspace_id,\x27projects\x27,\x27main\x27\)/);
assert.match(sql,/pg_column_size\(payload\) <= 16384/);
assert.match(sql,/revoke all on public\.os_integration_events from anon, authenticated/);
assert.equal((sql.match(/security invoker/g)||[]).length,2);
assert.doesNotMatch(sql,/security definer/);
assert.match(sql,/create policy os_integration_events_select/);
assert.match(sql,/create policy os_integration_events_insert/);
assert.match(sql,/alter publication supabase_realtime add table public\.os_integration_events/);
assert.match(client,/os_integration_event_publish/);
assert.match(client,/os_integration_events_load/);
assert.match(client,/subscribeDurableOSEvents/);
assert.match(client,/postgres_changes/);
assert.match(hobbies,/publishDurableOSEvent/);
assert.match(hobbies,/hobbies:practice_session:/);
assert.match(projects,/loadDurableOSEvents/);
assert.match(projects,/subscribeDurableOSEvents/);
assert.match(projects,/idempotencyKey \|\| event\.id/);
assert.match(platform,/d\.source==="ventures"\|\|\(d\.source==="knowledge"&&d\.systemId==="projects"\)/,"Platform scopes Knowledge source writes to Projects only");
assert.match(platform,/create_meeting_tasks/,"Platform routes Knowledge meeting task requests through the Projects host");
assert.match(projects,/handleKnowledgeMeetingTasks/,"Projects handles Knowledge meeting follow-up requests");
assert.match(projects,/A\.saveTask\(task, !existing\)/,"meeting actions are persisted through the authoritative Projects task repository");
assert.match(projects,/source_record_id: sourceRecordId/,"meeting follow-up task writes carry a stable source identity");
assert.match(projects,/ctx\.data\.tasks \|\| \[\]/,"repeated meeting requests reconcile against existing source-linked tasks");
assert.match(knowledge,/createMeetingFollowupTasks/,"Knowledge exposes meeting follow-up conversion");
assert.match(knowledge,/action: "create_meeting_tasks"/,"Knowledge sends an explicit Projects task-creation action");
assert.match(knowledge,/source_record_id: String\(item\.id\)/,"meeting follow-up identities remain stable across repeated sends");

console.log("OS integration durable event contract tests passed.");
