import assert from "node:assert/strict";
import {
  effectiveSkinUnitExpiry, skinUnitStatus, validateSkinUnit,
  validateSkinProduct, validateSkinList, validateSkinSettings, canRestoreSkinUnit, hasDuplicateSkinListName,
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
