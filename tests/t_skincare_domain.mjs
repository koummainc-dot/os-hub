import assert from "node:assert/strict";
import { SKINCARE_COLLECTIONS, validateSkinProfile, validateSkinProduct, validateSkinUnit } from "../src/systems/skincare/domain.js";

assert.deepEqual(Object.values(SKINCARE_COLLECTIONS), ["skin_profile", "skin_products", "skin_units"]);
assert.equal(validateSkinProfile({ skinType: "oily", concerns: ["acne"] }).ok, true);
assert.equal(validateSkinProfile({ skinType: "alien" }).ok, false);
assert.equal(validateSkinProduct({ name: "غسول", category: "cleanser", status: "active" }).ok, true);
assert.equal(validateSkinProduct({ name: "", category: "cleanser" }).ok, false);
assert.equal(validateSkinProduct({ name: "غسول", category: "unknown" }).ok, false);
assert.equal(validateSkinProduct({ name: "سيروم", suitability: "avoid" }).ok, true);
assert.equal(validateSkinProduct({ name: "سيروم", suitability: "unknown" }).ok, false);
assert.equal(validateSkinUnit({ name: "عبوة الصباح", openedOn: "2026-11-03" }).ok, true);
assert.equal(validateSkinUnit({ name: "عبوة", openedOn: "03/11/2026" }).ok, false);
console.log("Skincare domain contracts passed.");
