import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {hobbySessionEvent} from "../src/systems/hobbies/domain.js";

const sql=readFileSync(new URL("../supabase/migrations/20261101150000_os_integration_events.sql",import.meta.url),"utf8");
const client=readFileSync(new URL("../src/systems/integrationEvents.js",import.meta.url),"utf8");
const hobbies=readFileSync(new URL("../src/systems/hobbies/index.jsx",import.meta.url),"utf8");
const projects=readFileSync(new URL("../src/systems/projects/index.jsx",import.meta.url),"utf8");

const event=hobbySessionEvent({id:"s-1",hobbyId:"h-1",localDate:"2026-11-01",durationMinutes:35,sessionType:"practice"},{id:"h-1",name:"تصوير"});
assert.equal(event.type,"hobbies.practice_session.completed");
assert.equal(event.entityId,"s-1");
assert.deepEqual(event.payload.sourceRef,{system:"hobbies",type:"practice_session",id:"s-1"});
assert.throws(()=>hobbySessionEvent({id:"s-1",hobbyId:"other"},{id:"h-1"}),/HOBBY_SESSION_EVENT_SOURCE_INVALID/);

assert.match(sql,/unique \(workspace_id, source_system, idempotency_key\)/);
assert.match(sql,/ws_access_level\(p_workspace_id,p_source_system,'main'\) <> 'edit'/);
assert.match(sql,/ws_access_level\(p_workspace_id,'projects','main'\)/);
assert.match(sql,/ws_access_level\(p_workspace_id,p_source_system,'main'\) not in \('view','edit'\)/);
assert.match(sql,/pg_column_size\(payload\) <= 16384/);
assert.match(sql,/revoke all on public\.os_integration_events from anon, authenticated/);
assert.match(client,/os_integration_event_publish/);
assert.match(client,/os_integration_events_load/);
assert.match(hobbies,/publishDurableOSEvent/);
assert.match(hobbies,/hobbies:practice_session:/);
assert.match(projects,/loadDurableOSEvents/);
assert.match(projects,/idempotencyKey \|\| event\.id/);
console.log("OS integration durable event contract tests passed.");
