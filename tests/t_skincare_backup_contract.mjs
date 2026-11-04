import assert from "node:assert/strict";
import { createSkinBackup, validateSkinBackup, compareSkinBackupWithCurrent } from "../src/systems/skincare/backupDomain.js";
import { SKINCARE_COLLECTIONS as C } from "../src/systems/skincare/domain.js";

const records = {
  [C.products]: { p1: { id: "p1", name: "Cleanser" } },
  [C.units]: { u1: { id: "u1", productId: "p1" } },
  [C.routines]: { r1: { id: "r1", steps: [{ id: "s1", productId: "p1" }] } },
  [C.routineLogs]: { l1: { id: "l1", routineId: "r1", stepId: "s1" } },
  [C.trials]: { t1: { id: "t1", productId: "p1" } },
  [C.diary]: { d1: { id: "d1", date: "2026-11-04", trialId: "t1" } },
  [C.photos]: { ph1: { id: "ph1", diaryId: "d1", storagePath: "ws/skincare/photo.jpg" } },
  [C.reactions]: { rx1: { id: "rx1", productId: "p1", unitId: "u1" } },
  [C.profile]: { profile: { id: "profile", skinType: "unknown" } },
};
const created = createSkinBackup({ records, exportedAt: "2026-11-04T00:00:00.000Z" });
assert.equal(created.ok, true);
assert.equal(created.totalRecords, 9);
const checked = validateSkinBackup(created.backup);
assert.equal(checked.ok, true);
assert.equal(checked.includesPhotoFiles, false);
assert.equal(checked.warnings.length, 1);
const compared = compareSkinBackupWithCurrent(checked, { [C.products]: { p1: { id: "p1" } } });
assert.equal(compared.existingRecords, 1);
assert.equal(compared.newRecords, 8);

const pending = createSkinBackup({ records: { [C.products]: { p1: { id: "p1", _syncPending: true } } } });
assert.equal(pending.ok, false);
assert.match(pending.error, /لم يؤكد الخادم/);

const invalidJson = validateSkinBackup("{");
assert.equal(invalidJson.ok, false);
const wrongFormat = validateSkinBackup({ ...created.backup, format: "other" });
assert.equal(wrongFormat.ok, false);

const brokenReference = structuredClone(created.backup);
brokenReference.collections[C.units][0].data.productId = "missing";
const invalidReference = validateSkinBackup(brokenReference);
assert.equal(invalidReference.ok, false);
assert.match(invalidReference.errors[0], /منتج غير موجود/);

const duplicate = structuredClone(created.backup);
duplicate.collections[C.products].push(duplicate.collections[C.products][0]);
assert.equal(validateSkinBackup(duplicate).ok, false);

const unknownCollection = structuredClone(created.backup);
unknownCollection.collections.untrusted = [];
assert.equal(validateSkinBackup(unknownCollection).ok, false);

console.log("Skincare backup domain contract: OK");
