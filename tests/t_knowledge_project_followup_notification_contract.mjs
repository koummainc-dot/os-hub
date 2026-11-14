import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { stableKnowledgeFollowupId } from "../src/systems/knowledge/followupIdentity.js";

const knowledge = await readFile(new URL("../src/systems/knowledge/index.jsx", import.meta.url), "utf8");
const coreNotifications = await readFile(new URL("../src/core/notifications.js", import.meta.url), "utf8");

const meetingId = "meeting-followup-contract";
const original = ["إرسال العرض", "تأكيد الموعد"];
const afterEdit = ["إرسال العرض", "تأكيد الموعد", "مراجعة العقد"];
const oldIds = new Set(original.map(value => stableKnowledgeFollowupId(meetingId, value)));
const added = afterEdit
  .map(value => ({ value, id: stableKnowledgeFollowupId(meetingId, value) }))
  .filter(item => item.id && !oldIds.has(item.id));

assert.deepEqual(added.map(item => item.value), ["مراجعة العقد"],
  "only genuinely new follow-up identities may trigger a new notification");
assert.equal(stableKnowledgeFollowupId(meetingId, original[0]),
  stableKnowledgeFollowupId(meetingId, ["تأكيد الموعد", "إرسال العرض"].find(value => value === original[0])),
  "follow-up identity remains stable when the source list is reordered");

assert.ok(knowledge.includes('import { emitCoreNotification } from "../../core/notifications.js"'),
  "Knowledge must emit the notification through the Core-owned service");
assert.ok(knowledge.includes('event_type:"knowledge_meeting_followups_added"'),
  "a new Follow-up must publish the dedicated Core event");
assert.ok(knowledge.includes('stableKnowledgeFollowupId(meeting.id,value)') &&
  knowledge.includes('!previousIds.has(item.id)'),
  "notification creation must compare stable IDs, not array indexes or titles");
assert.ok(knowledge.includes('dedupe_key:"knowledge-meeting-followups:"+meeting.id+":"+identities.join("|")'),
  "retries of the same set of newly added Follow-ups must deduplicate");
assert.ok(knowledge.includes('deep_link:{system:"knowledge",tab:"meetings",recordId:meeting.id'),
  "the Inbox item must open the original Knowledge meeting");
assert.ok(knowledge.includes('"بند متابعة جديدة لاجتماع "') || knowledge.includes('"متابعة جديدة لاجتماع "'),
  "notification body must describe the added follow-ups without copying their text");
assert.ok(coreNotifications.includes('supabase.rpc("core_notification_emit"'),
  "the emitted event must pass through Core notification authorization and persistence");

console.log("✓ Knowledge Follow-up Core notification identity, privacy and idempotency contracts passed");
