import assert from "node:assert/strict";
import { prdApprovalReady } from "../src/systems/projects/domain.js";

const prd = { id: "prd-1", version: 2, tldr: "", reviewer_ids: ["reviewer-a", "reviewer-b"] };
const empty = prdApprovalReady(prd, [], []);
assert.equal(empty.ok, false, "review must be blocked while required sections are incomplete");
assert.deepEqual(empty.missing, ["TLDR", "نظرة عامة على المشكلة", "الحل المقترح", "مقاييس النجاح"]);
assert.deepEqual(empty.pendingReviewers, ["reviewer-a", "reviewer-b"]);
const completeSections = [
  { key: "problem_overview", content: "Problem" },
  { key: "proposed_solution", content: "Solution" },
  { key: "success_metrics", content: "Metric" },
];
const awaiting = prdApprovalReady({ ...prd, tldr: "Summary" }, completeSections, [
  { reviewer_id: "reviewer-a", decision: "approve", version: 1 },
]);
assert.equal(awaiting.ok, false, "approval from an older PRD version must not count");
assert.deepEqual(awaiting.pendingReviewers, ["reviewer-a", "reviewer-b"]);
const approved = prdApprovalReady({ ...prd, tldr: "Summary" }, completeSections, [
  { reviewer_id: "reviewer-a", decision: "approve", version: 2 },
  { reviewer_id: "reviewer-b", decision: "approve", version: 2 },
]);
assert.equal(approved.ok, true, "complete content and current-version reviewer approvals should allow approval");
assert.deepEqual(approved.missing, []);
assert.deepEqual(approved.pendingReviewers, []);
console.log("Projects PRD review-gate domain tests passed.");
