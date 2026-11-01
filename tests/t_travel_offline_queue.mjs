import assert from "node:assert/strict";
import {assessTravelSyncQueue,clearTravelSyncQueue,readTravelSyncQueue,travelSyncQueueKey,writeTravelSyncQueue} from "../src/systems/travel/offlineQueue.js";

const memory = new Map();
const storage = { getItem: k => memory.has(k) ? memory.get(k) : null, setItem: (k,v) => memory.set(k,v), removeItem: k => memory.delete(k) };
const data = { trips: [{ id: "trip-1", name: "Local draft" }] };
assert.equal(travelSyncQueueKey("ws one"), travelSyncQueueKey("ws one"));
assert.equal(writeTravelSyncQueue(storage, "ws-1", data, "v1", "2026-11-01T10:00:00Z"), true);
const queued = readTravelSyncQueue(storage, "ws-1");
assert.deepEqual(queued.data, data);
assert.equal(assessTravelSyncQueue(queued, null, false).state, "waiting-for-server");
assert.equal(assessTravelSyncQueue(queued, "v1", true).canReplay, true);
assert.equal(assessTravelSyncQueue({ ...queued, baseUpdatedAt: null }, null, true).state, "manual-recovery-required");
assert.equal(assessTravelSyncQueue(queued, "v2", true).state, "conflict");
assert.equal(readTravelSyncQueue(storage, "other-workspace"), null);
assert.equal(clearTravelSyncQueue(storage, "ws-1"), true);
assert.equal(readTravelSyncQueue(storage, "ws-1"), null);
assert.equal(readTravelSyncQueue({ getItem: () => "{bad" }, "ws-1"), null);
console.log("Travel offline queue tests passed");
