import assert from "node:assert/strict";
import { findKnowledgeFollowupTask, normalizeKnowledgeFollowup, stableKnowledgeFollowupId } from "../src/systems/knowledge/followupIdentity.js";

const meetingId = "meeting-42";
const original = ["إرسال العرض", "تأكيد الموعد"];
const reordered = ["تأكيد الموعد", "إرسال العرض"];
assert.equal(stableKnowledgeFollowupId(meetingId, original[0]), stableKnowledgeFollowupId(meetingId, reordered[1]), "identity survives reordering");
assert.notEqual(stableKnowledgeFollowupId(meetingId, original[0]), stableKnowledgeFollowupId(meetingId, original[1]), "different text has a different identity");
assert.equal(stableKnowledgeFollowupId(meetingId, { id: "fu-7", title: "عنوان أول" }), stableKnowledgeFollowupId(meetingId, { id: "fu-7", title: "عنوان معدل" }), "explicit IDs survive title edits");
assert.equal(normalizeKnowledgeFollowup({ title: "  مراجعة   العقد " }).title, "مراجعة العقد");
const stableTask = { id: "task-1", title: "إرسال العرض", source_meeting_id: meetingId, source_followup_id: stableKnowledgeFollowupId(meetingId, "إرسال العرض") };
assert.equal(findKnowledgeFollowupTask([stableTask], meetingId, reordered[1], 1)?.id, "task-1");
const legacyTask = { id: "legacy-1", title: "تأكيد الموعد", source_meeting_id: meetingId, source_followup_index: 0 };
assert.equal(findKnowledgeFollowupTask([legacyTask], meetingId, "تأكيد الموعد", 1)?.id, "legacy-1", "legacy tasks are matched by source title after a follow-up reorder");
console.log("t_projects_knowledge_followup_identity: OK");
