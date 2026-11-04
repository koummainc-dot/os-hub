import assert from "node:assert/strict";
import { SKINCARE_COLLECTIONS } from "../src/systems/skincare/domain.js";
import { validateSkinBackup } from "../src/systems/skincare/backupDomain.js";

const emptyCollections = () => Object.fromEntries(Object.values(SKINCARE_COLLECTIONS).map(name => [name, []]));
const row = (id, data = {}) => ({ id, data: { id, ...data }, deleted: false, visibleTo: null });
const makeBackup = overrides => ({
  format: "os-hub-skincare-backup",
  version: 1,
  systemId: "skincare",
  exportedAt: "2026-11-04T00:00:00.000Z",
  includes: { records: true, deletedRecords: true, photoFiles: false },
  collections: { ...emptyCollections(), ...overrides },
});

const valid = makeBackup({
  [SKINCARE_COLLECTIONS.products]: [row("product-1")],
  [SKINCARE_COLLECTIONS.units]: [row("unit-1", { productId: "product-1" })],
  [SKINCARE_COLLECTIONS.ingredients]: [row("ingredient-1")],
  [SKINCARE_COLLECTIONS.diary]: [row("diary-1")],
  [SKINCARE_COLLECTIONS.photos]: [row("photo-1", { diaryId: "diary-1" })],
  [SKINCARE_COLLECTIONS.trials]: [row("trial-1", { productId: "product-1", baselineDiaryIds: ["diary-1"] })],
  [SKINCARE_COLLECTIONS.reactions]: [row("reaction-1", {
    productId: "product-1",
    unitId: "unit-1",
    suspectedIngredientIds: ["ingredient-1"],
    photoIds: ["photo-1"],
  })],
  [SKINCARE_COLLECTIONS.lists]: [row("list-1", { productIds: ["product-1"] })],
});
assert.equal(validateSkinBackup(valid).ok, true, "valid cross-collection references should pass");

const missingListProduct = structuredClone(valid);
missingListProduct.collections[SKINCARE_COLLECTIONS.lists][0].data.productIds = ["missing-product"];
const listResult = validateSkinBackup(missingListProduct);
assert.equal(listResult.ok, false);
assert.ok(listResult.errors.some(message => message.includes("القائمة list-1") && message.includes("منتج غير موجود")));

const mismatchedReactionUnit = structuredClone(valid);
mismatchedReactionUnit.collections[SKINCARE_COLLECTIONS.units].push(row("unit-2", { productId: "another-product" }));
mismatchedReactionUnit.collections[SKINCARE_COLLECTIONS.reactions][0].data.unitId = "unit-2";
const reactionResult = validateSkinBackup(mismatchedReactionUnit);
assert.equal(reactionResult.ok, false);
assert.ok(reactionResult.errors.some(message => message.includes("لا تتبع المنتج المحدد")));

const missingIngredient = structuredClone(valid);
missingIngredient.collections[SKINCARE_COLLECTIONS.reactions][0].data.suspectedIngredientIds = ["missing-ingredient"];
assert.equal(validateSkinBackup(missingIngredient).ok, false);

const missingBaseline = structuredClone(valid);
missingBaseline.collections[SKINCARE_COLLECTIONS.trials][0].data.baselineDiaryIds = ["missing-diary"];
assert.equal(validateSkinBackup(missingBaseline).ok, false);

console.log("Skincare backup cross-reference validation tests passed.");
