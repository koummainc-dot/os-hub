import assert from "node:assert/strict";
import { normalizeHomeData, deriveStockState, deriveWarrantyState, validateHomeProperty, validateHomeRoom, validateHomeItem, validateHomeMovement, applyHomeMovement, deriveRoomHealth } from "../src/systems/home/domain.js";
import { createHomeRepository } from "../src/systems/home/repository.js";

const base = normalizeHomeData({ properties: [{ id: "p1", name: "البيت" }], rooms: [{ id: "r1", propertyId: "p1", name: "المطبخ", type: "kitchen" }], items: [{ id: "i1", propertyId: "p1", roomId: "r1", name: "أرز", type: "consumable", condition: "good", unit: "kg", quantity: 2, minimumQuantity: 2, expiryDate: "2027-01-01" }] });
assert.equal(base.settings.currency, "EGP");
assert.equal(deriveStockState(base.items[0]), "low");
assert.equal(deriveStockState({ quantity: 0, minimumQuantity: 2 }), "out");
assert.equal(deriveWarrantyState({ warrantyUntil: "2027-12-31" }, "2027-01-01"), "active");
assert.equal(deriveWarrantyState({ warrantyUntil: "2026-01-01" }, "2027-01-01"), "expired");
assert.deepEqual(validateHomeProperty({ name: "  " }), ["اسم العقار مطلوب."]);
assert.deepEqual(validateHomeRoom({ name: "مطبخ", type: "kitchen", propertyId: "missing" }, base), ["اختر عقارًا نشطًا."]);
assert.deepEqual(validateHomeItem({ ...base.items[0], quantity: -1 }, base), ["الكمية يجب أن تكون رقمًا غير سالب."]);
assert.ok(validateHomeMovement({ type: "consume", quantity: 3 }, base.items[0]).some(x => x.includes("أكبر من المتاح")));
assert.equal(applyHomeMovement(base.items[0], { type: "receive", quantity: 3, occurredAt: "2026-10-31T00:00:00.000Z" }).quantity, 5);
assert.deepEqual(validateHomeMovement({ type: "adjust", quantity: 0 }, base.items[0]), []);
assert.equal(applyHomeMovement(base.items[0], { type: "adjust", quantity: 0, occurredAt: "2026-10-31T00:00:00.000Z" }).quantity, 0);
assert.throws(() => applyHomeMovement(base.items[0], { type: "consume", quantity: 4, occurredAt: "2026-10-31T00:00:00.000Z" }), /HOME_STOCK_NEGATIVE/);
assert.equal(deriveRoomHealth("r1", base, "2026-10-31").state, "yellow");
assert.equal(deriveRoomHealth("r1", base, "2027-01-02").state, "red");

let persisted = null;
const repository = createHomeRepository({ load: async () => ({ data: persisted }), save: async value => { persisted = value; return { ok: true }; } });
await repository.save(base);
assert.equal((await repository.load()).data.items.length, 1);
await assert.rejects(() => repository.save({ ...base, rooms: [{ id: "bad", propertyId: "missing", name: "bad", type: "kitchen" }] }), /HOME_ROOM_PROPERTY_MISSING/);
await assert.rejects(() => repository.save({ ...base, movements: [{ id: "m1", itemId: "missing" }] }), /HOME_MOVEMENT_ITEM_MISSING/);

let legacyWriteCalled = false;
const unavailableNormalizedRepository = createHomeRepository({
  async load() { return { data: persisted }; },
  async save() { legacyWriteCalled = true; return { ok: true }; },
  async saveNormalizedHome() {
    return { available: false, error: { code: "PGRST202", message: "Could not find the function home_save_snapshot" } };
  }
});
await assert.rejects(
  () => unavailableNormalizedRepository.save(base),
  /HOME_NORMALIZED_STORAGE_REQUIRED/
);
assert.equal(legacyWriteCalled, false, "normalized storage failure must not write to the legacy store");

let normalizedSaved = null;
const normalizedRepository = createHomeRepository({
  async load() { return { data: null }; },
  async save() { throw new Error("legacy save must not be called"); },
  async loadNormalizedHome() { return { available: true, data: base, source: "normalized" }; },
  async saveNormalizedHome(value) { normalizedSaved = value; return { available: true, ok: true, updatedAt: "2026-10-31T00:00:00.000Z" }; }
});
const normalizedSaveResult = await normalizedRepository.save(base);
assert.equal(normalizedSaveResult.ok, true);
assert.equal(normalizedSaved.items.length, 1);

console.log("Home OS domain/repository tests passed.");
