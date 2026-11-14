import assert from "node:assert/strict";
import { canReplayQueuedWrite, rebaseQueuedTaskEdit } from "../src/core/recordQueue.js";

assert.equal(canReplayQueuedWrite(null, null), true, "new queued insert can replay while the server record is still absent");
assert.equal(canReplayQueuedWrite(undefined, null), true, "undefined server version is normalized to absent");
assert.equal(canReplayQueuedWrite("2026-10-29T10:00:00.000Z", "2026-10-29T10:00:00.000Z"), true, "edit can replay against the unchanged server version");
assert.equal(canReplayQueuedWrite("2026-10-29T10:00:01.000Z", "2026-10-29T10:00:00.000Z"), false, "newer server version blocks stale queued edit");
assert.equal(canReplayQueuedWrite("2026-10-29T10:00:00.000Z", null), false, "existing server record blocks a queued insert with the same id");

const base = { id: "task-1", title: "Original", description: "Base", priority: "Medium", due_date: "2026-11-15" };
const local = { ...base, title: "Edited offline", due_date: "2026-11-18" };
const server = { ...base, description: "Changed by teammate", assignee_id: "member-2" };
const merged = rebaseQueuedTaskEdit({ baseRecord: base, localRecord: local, serverRecord: server });
assert.equal(merged.ok, true, "non-overlapping offline edits can be explicitly rebased");
assert.deepEqual(
  { title: merged.record.title, description: merged.record.description, due_date: merged.record.due_date, assignee_id: merged.record.assignee_id },
  { title: "Edited offline", description: "Changed by teammate", due_date: "2026-11-18", assignee_id: "member-2" },
  "rebase must preserve teammate changes and overlay only locally changed fields"
);

const overlapping = rebaseQueuedTaskEdit({
  baseRecord: base,
  localRecord: local,
  serverRecord: { ...base, title: "Edited by teammate" }
});
assert.equal(overlapping.ok, false, "overlapping edits require manual resolution");
assert.deepEqual(overlapping.conflictingFields, ["title"], "rebase identifies exact fields edited by both users");

const sameValue = rebaseQueuedTaskEdit({
  baseRecord: base,
  localRecord: local,
  serverRecord: { ...base, title: "Edited offline" }
});
assert.equal(sameValue.ok, true, "the same value chosen by both users is not a conflict");

console.log("✓ offline queue version guard and field-level conflict merge scenarios passed");
