import assert from "node:assert/strict";
import { canReplayQueuedWrite } from "../src/core/recordQueue.js";

assert.equal(canReplayQueuedWrite(null, null), true, "new queued insert can replay while the server record is still absent");
assert.equal(canReplayQueuedWrite(undefined, null), true, "undefined server version is normalized to absent");
assert.equal(canReplayQueuedWrite("2026-10-29T10:00:00.000Z", "2026-10-29T10:00:00.000Z"), true, "edit can replay against the unchanged server version");
assert.equal(canReplayQueuedWrite("2026-10-29T10:00:01.000Z", "2026-10-29T10:00:00.000Z"), false, "newer server version blocks stale queued edit");
assert.equal(canReplayQueuedWrite("2026-10-29T10:00:00.000Z", null), false, "existing server record blocks a queued insert with the same id");
console.log("✓ offline queue replay baseline guard scenarios passed");
