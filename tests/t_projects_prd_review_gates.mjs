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
const { readFile } = await import("node:fs/promises");
const migration = await readFile(new URL("../supabase/migrations/20261030100000_projects_final_output_guard.sql", import.meta.url), "utf8");
assert.match(migration, /create trigger projects_guard_prd_review_trg\s+before insert or update of data on public\.workspace_records/i,
  "PRD lifecycle rules must apply to direct writes and atomic record batches");
assert.match(migration, /Approved or superseded PRDs are immutable/,
  "approved and superseded PRDs must not be edited in place");
assert.match(migration, /A submitted PRD is locked/,
  "content changes must be blocked while the PRD is under review");
assert.match(migration, /current-version reviewer approvals are complete/,
  "server must require current-version approvals before final approval");
assert.match(migration, /Complete TLDR, problem overview, proposed solution, and success metrics before review/,
  "server must require essential PRD content before review");
console.log("Projects PRD review-gate domain tests passed.");
