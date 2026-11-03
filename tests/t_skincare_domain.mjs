import assert from "node:assert/strict";
import { SKINCARE_COLLECTIONS, validateSkinProfile, validateSkinProduct, validateSkinUnit, validateSkinDiaryEntry } from "../src/systems/skincare/domain.js";
import { buildSkinPhotoPaths, validateSkinPhotoFile, validateSkinPhotoMetadata } from "../src/systems/skincare/photoDomain.js";

assert.deepEqual(Object.values(SKINCARE_COLLECTIONS), ["skin_profile", "skin_products", "skin_units", "skin_routines", "skin_routine_logs", "skin_diary", "skin_photos"]);
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

assert.equal(validateSkinDiaryEntry({ date: "2026-11-03", skinRating: 4, sleepHours: 7.5, waterGlasses: 6 }, "2026-11-03").ok, true);
assert.equal(validateSkinDiaryEntry({ date: "2026-11-04" }, "2026-11-03").ok, false);
assert.equal(validateSkinDiaryEntry({ date: "2026-02-30" }, "2026-11-03").ok, false);
assert.equal(validateSkinDiaryEntry({ date: "2026-11-03", skinRating: 6 }, "2026-11-03").ok, false);
assert.equal(validateSkinDiaryEntry({ date: "2026-11-03", sleepHours: -1 }, "2026-11-03").ok, false);
console.log("Skincare diary contracts passed.");

const workspaceId = "123e4567-e89b-42d3-a456-426614174000";
const photoId = "123e4567-e89b-42d3-a456-426614174001";
assert.deepEqual(buildSkinPhotoPaths({ workspaceId, diaryId: "diary-2026-11-03", photoId, mimeType: "image/jpeg" }), {
  objectPath: workspaceId + "/diary-2026-11-03/" + photoId + ".jpg",
  thumbnailPath: workspaceId + "/diary-2026-11-03/" + photoId + ".thumb.webp",
});
assert.equal(validateSkinPhotoFile({ type: "image/jpeg", size: 1024 }).ok, true);
assert.equal(validateSkinPhotoFile({ type: "image/gif", size: 1024 }).ok, false);
assert.equal(validateSkinPhotoFile({ type: "image/png", size: 11 * 1024 * 1024 }).ok, false);
assert.throws(() => buildSkinPhotoPaths({ workspaceId: "bad", diaryId: "diary-2026-11-03", photoId, mimeType: "image/jpeg" }));
assert.throws(() => buildSkinPhotoPaths({ workspaceId, diaryId: "../other", photoId, mimeType: "image/jpeg" }));
assert.throws(() => buildSkinPhotoPaths({ workspaceId, diaryId: "diary-2026-02-30", photoId, mimeType: "image/jpeg" }));
assert.equal(validateSkinPhotoMetadata({ lighting: "natural", angle: "front" }).ok, true);
assert.equal(validateSkinPhotoMetadata({ lighting: "unsafe", angle: "other" }).value.lighting, "unknown");
console.log("Skincare photo contracts passed.");
