import assert from "node:assert/strict";
import {
  effectiveSkinUnitExpiry, skinUnitStatus, validateSkinUnit, isValidSkinDateKey, skinUnitCostPerDay,
  validateSkinProduct, validateSkinList, validateSkinSettings, canRestoreSkinUnit, canRestoreSkinRoutineLog, canRestoreSkinList, hasDuplicateSkinListName, normalizeSkinSearchText,
} from "../src/systems/skincare/domain.js";

assert.equal(effectiveSkinUnitExpiry({ openedOn: "2026-01-31", paoMonths: 1 }), "2026-02-28");
assert.equal(effectiveSkinUnitExpiry({ openedOn: "2026-01-10", paoMonths: 12, expiresOn: "2026-08-01" }), "2026-08-01");
assert.equal(effectiveSkinUnitExpiry({ openedOn: "", paoMonths: 12, expiresOn: "" }), null);
assert.equal(skinUnitStatus({ openedOn: "2026-01-01", paoMonths: 1 }, "2026-03-01"), "expired");
assert.equal(skinUnitStatus({ finishedDate: "2026-02-01", openedOn: "2026-01-01" }, "2026-03-01"), "finished");

assert.equal(validateSkinUnit({ name: "Bottle", openedOn: "2026-01-01", paoMonths: 6 }, "2026-02-01").ok, true);
assert.equal(validateSkinUnit({ name: "Bottle", openedOn: "2026-03-01" }, "2026-02-01").ok, false);
assert.equal(validateSkinUnit({ name: "Bottle", purchaseDate: "2026-02-01", openedOn: "2026-01-01" }, "2026-02-01").ok, false);
assert.equal(validateSkinUnit({ name: "Bottle", paoMonths: 0 }, "2026-02-01").ok, false);
assert.equal(validateSkinUnit({ name: "Bottle", price: -1 }, "2026-02-01").ok, false);

assert.equal(validateSkinProduct({ name: "Serum", url: "https://example.com/product" }).ok, true);
assert.equal(validateSkinProduct({ name: "Serum", url: "javascript:alert(1)" }).ok, false);
assert.equal(validateSkinList({ name: "Wishlist", kind: "wishlist", productIds: ["p1","p1","p2"] }).value.productIds.length, 2);
assert.equal(validateSkinSettings({ timezone: "Africa/Cairo", weekStartDay: 6 }).ok, true);
assert.equal(validateSkinSettings({ timezone: "Not/AZone" }).ok, false);
assert.equal(validateSkinSettings({ quietStart: "99:99" }).ok, false);

assert.equal(canRestoreSkinUnit({ id: "u1", productId: "p1" }, [{ id: "p1" }]), true);
assert.equal(canRestoreSkinUnit({ id: "u1", productId: "p1" }, [{ id: "p1", deleted_at: "2026-11-04" }]), false);
assert.equal(canRestoreSkinUnit({ id: "u2", productId: "" }, []), true);
assert.equal(hasDuplicateSkinListName({ id: "new", name: "Wishlist" }, [{ id: "old", name: "wishlist" }]), true);
assert.equal(hasDuplicateSkinListName({ id: "old", name: "Wishlist" }, [{ id: "old", name: "Wishlist" }]), false);
assert.equal(hasDuplicateSkinListName({ id: "new", name: "قائمة الصباح" }, [{ id: "old", name: "قائمة المساء" }]), false);

console.log("Skincare unit lifecycle and settings tests passed.");

const log = { id: "l1", client_generated_id: "r1:2026-11-04:s1", routineId: "r1", stepId: "s1", date: "2026-11-04", status: "done" };
const routines = [{ id: "r1", steps: [{ id: "s1", productId: "p1" }] }];
const products = [{ id: "p1" }];
assert.equal(canRestoreSkinRoutineLog(log, routines, products, []), true);
assert.equal(canRestoreSkinRoutineLog(log, [], products, []), false);
assert.equal(canRestoreSkinRoutineLog(log, [{ id: "r1", steps: [] }], products, []), false);
assert.equal(canRestoreSkinRoutineLog(log, routines, [], []), false);
assert.equal(canRestoreSkinRoutineLog(log, routines, products, [{ ...log, id: "l2" }]), false);

assert.equal(canRestoreSkinList({ productIds: ["p1"] }, products), true);
assert.equal(canRestoreSkinList({ productIds: ["p2"] }, products), false);
assert.equal(canRestoreSkinList({ productIds: [] }, []), true);

const legacyLog = { id: "legacy", routineId: "r1", stepId: "s1", date: "2026-11-03" };
assert.equal(canRestoreSkinRoutineLog(legacyLog, routines, products, [{ id: "other", routineId: "r1", stepId: "s1", date: "2026-11-02" }]), true);
assert.equal(canRestoreSkinRoutineLog(legacyLog, routines, products, [{ id: "other", routineId: "r1", stepId: "s1", date: "2026-11-03" }]), false);

assert.equal(normalizeSkinSearchText("إِشْرَاق"), "اشراق");
assert.equal(normalizeSkinSearchText("آثارُ الحُبوب"), "اثار الحبوب");
assert.equal(normalizeSkinSearchText("كريم_البشرة"), "كريم البشرة");
assert.equal(normalizeSkinSearchText("  Niacinamide  "), "niacinamide");
assert.equal(normalizeSkinSearchText("ياسمين"), normalizeSkinSearchText("یاسمین"));

assert.equal(isValidSkinDateKey("2026-02-28"), true);
assert.equal(isValidSkinDateKey("2026-02-30"), false);
assert.equal(isValidSkinDateKey("2026-13-01"), false);
assert.equal(effectiveSkinUnitExpiry({ expiresOn: "2026-02-30" }), null);
assert.equal(effectiveSkinUnitExpiry({ openedOn: "2026-02-30", paoMonths: 1 }), null);
assert.equal(validateSkinUnit({ name: "Bottle", expiresOn: "2026-02-30" }, "2026-02-01").ok, false);
assert.equal(skinUnitStatus({ expiresOn: "2026-11-20", openedOn: "2026-11-01" }, "2026-11-04", 7), "active");
assert.equal(skinUnitStatus({ expiresOn: "2026-11-10", openedOn: "2026-11-01" }, "2026-11-04", 7), "expiring_soon");
assert.equal(skinUnitStatus({ expiresOn: "2026-11-10", openedOn: "2026-11-01" }, "2026-11-04", 3), "active");
assert.deepEqual(skinUnitCostPerDay({ id: "u1", price: 100, currency: "EGP", startedUseDate: "2026-11-01" }, "2026-11-10"), { value: 10, currency: "EGP", unitId: "u1" });
assert.equal(skinUnitCostPerDay({ price: 100, startedUseDate: "2026-11-30" }, "2026-11-04"), null);
assert.equal(skinUnitCostPerDay({ price: 100, startedUseDate: "2026-02-30" }, "2026-11-04"), null);
assert.equal(skinUnitCostPerDay({ price: 100, startedUseDate: "2026-11-01", finishedDate: "2026-10-31" }, "2026-11-04"), null);
assert.equal(skinUnitCostPerDay({ price: 100, startedUseDate: "2026-11-01", deleted_at: "2026-11-02" }, "2026-11-04"), null);

assert.equal(skinUnitCostPerDay({ price: 10, currency: "   ", startedUseDate: "2026-11-01" }, "2026-11-02").currency, "غير محددة");
