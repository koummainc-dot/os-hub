import assert from "node:assert/strict";
import { SKINCARE_COLLECTIONS, validateSkinProfile, validateSkinProduct, validateSkinUnit, validateSkinDiaryEntry, summarizeSkinTrial } from "../src/systems/skincare/domain.js";
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


const trial = {
  id: "trial-main",
  productId: "product-a",
  startDate: "2026-10-01",
  endDate: "2026-10-28",
  plannedDays: 28,
  status: "completed",
  baselineDiaryIds: ["base-1", "base-2", "base-3"],
};
const trialDiary = [
  { id: "base-1", date: "2026-09-25", skinRating: 2 },
  { id: "base-2", date: "2026-09-26", skinRating: 2 },
  { id: "base-3", date: "2026-09-27", skinRating: 2 },
  { id: "week-1", date: "2026-10-04", skinRating: 3 },
  { id: "week-2", date: "2026-10-10", skinRating: 4 },
  { id: "final-1", date: "2026-10-24", skinRating: 5 },
];
const trialReactions = [
  { id: "reaction-1", productId: "product-a", dateStarted: "2026-10-05", severity: "mild" },
  { id: "reaction-2", productId: "product-a", dateStarted: "2026-10-20", severity: "severe" },
];
const otherTrials = [
  { id: "trial-paused", productId: "product-b", startDate: "2026-10-12", status: "paused" },
  { id: "trial-completed", productId: "product-c", startDate: "2026-10-03", endDate: "2026-10-09", status: "completed" },
  { id: "trial-cancelled", productId: "product-d", startDate: "2026-10-03", endDate: "2026-10-20", status: "cancelled" },
];
const comparison = summarizeSkinTrial(trial, trialDiary, trialReactions, otherTrials);
assert.equal(comparison.baselineAverage, 2);
assert.equal(comparison.firstWeek.average, 3);
assert.equal(comparison.secondWeek.average, 4);
assert.equal(comparison.finalWeek.average, 5);
assert.equal(comparison.firstWeek.count, 1);
assert.equal(comparison.firstWeek.daysRecorded, 1);
assert.equal(comparison.periodsOverlap, false);
assert.equal(comparison.concurrentTrialCount, 2);
assert.equal(comparison.reactionCount, 2);
assert.equal(comparison.reactionSeverityCounts.mild, 1);
assert.equal(comparison.reactionSeverityCounts.severe, 1);

const shortTrialComparison = summarizeSkinTrial({
  ...trial,
  startDate: "2026-10-01",
  endDate: "2026-10-10",
}, trialDiary, trialReactions, []);
assert.equal(shortTrialComparison.periodsOverlap, true);
console.log("Skincare trial comparison contracts added.");
