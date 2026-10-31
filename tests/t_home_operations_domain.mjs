import assert from "node:assert/strict";
import { validateHomeTask, nextHomeTaskDue, completeHomeTask, validateHomeMaintenance, validateHomePurchaseRequest, deriveHomePurchaseTotal, deriveHomePurchaseStatus, homeTaskEvent } from "../src/systems/home/operations-domain.js";

const data = {
  properties: [{ id: "p1", name: "المنزل" }],
  rooms: [{ id: "r1", propertyId: "p1" }],
  items: [{ id: "i1", propertyId: "p1" }]
};
const daily = { id: "t1", title: "تنظيف", propertyId: "p1", roomId: "r1", status: "active", recurrenceRule: { frequency: "daily" } };
assert.deepEqual(validateHomeTask(daily, data), []);
assert.match(validateHomeTask({ ...daily, title: " " }, data).join(" "), /عنوان/);
assert.equal(nextHomeTaskDue(daily, "2026-10-31T08:00:00.000Z"), "2026-11-01T08:00:00.000Z");
assert.equal(nextHomeTaskDue({ ...daily, recurrenceRule: { frequency: "interval", intervalDays: 3 } }, "2026-10-31T08:00:00.000Z"), "2026-11-03T08:00:00.000Z");
assert.equal(nextHomeTaskDue({ ...daily, recurrenceRule: { frequency: "none" } }, "2026-10-31T08:00:00.000Z"), null);
const result = completeHomeTask(daily, { outcome: "done", completedAt: "2026-10-31T08:00:00.000Z" });
assert.equal(result.task.nextDueAt, "2026-11-01T08:00:00.000Z");
assert.equal(result.completion.outcome, "done");
assert.throws(() => completeHomeTask({ ...daily, status: "paused" }, { outcome: "done" }), /NOT_ACTIVE/);
assert.equal(homeTaskEvent(result.task, result.completion).ownerSystem, "home");
assert.deepEqual(validateHomeMaintenance({ title: "إصلاح تسريب", propertyId: "p1", roomId: "r1", status: "reported", costAmount: 250 }, data), []);
assert.match(validateHomeMaintenance({ title: "إصلاح", propertyId: "missing" }, data).join(" "), /عقار/);
const request = { title: "شراء منظفات", propertyId: "p1", status: "needed", budgetAmount: 300 };
const items = [{ name: "منظف", quantity: 2, estimatedUnitPrice: 50, receivedQuantity: 0 }, { name: "أكياس", quantity: 1, estimatedUnitPrice: 25, receivedQuantity: 0 }];
assert.deepEqual(validateHomePurchaseRequest(request, items, data), []);
assert.equal(deriveHomePurchaseTotal(items), 125);
assert.equal(deriveHomePurchaseStatus([{ quantity: 3, receivedQuantity: 1 }]), "partially_received");
assert.equal(deriveHomePurchaseStatus([{ quantity: 3, receivedQuantity: 3 }]), "received");
assert.match(validateHomePurchaseRequest(request, [], data).join(" "), /عنصرًا/);
console.log("Home OS operations domain tests passed.");
