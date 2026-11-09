import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const migration = await readFile(new URL("../supabase/migrations/20261030100000_projects_final_output_guard.sql", import.meta.url), "utf8");
const store = await readFile(new URL("../src/systems/projects/store.jsx", import.meta.url), "utf8");
const entities = await readFile(new URL("../src/systems/projects/entities.jsx", import.meta.url), "utf8");

assert.match(migration, /create trigger projects_guard_risk_issue_links_trg\s+before insert or update of data on public\.workspace_records/i,
  "risk/issue linkage must be enforced for direct writes and atomic RPC batches");
assert.match(migration, /Only one active issue may be linked to a risk/,
  "database must reject duplicate active issues for one risk");
assert.match(migration, /Remove the previous risk backlink atomically before changing this issue risk/,
  "database must reject switching an issue away from a risk that still points to it");
assert.match(migration, /Remove the previous issue backlink atomically before changing this risk issue/,
  "database must reject switching a risk away from an issue that still points back");
assert.match(migration, /Remove the risk backlink atomically before unlinking this issue/,
  "database must prevent removing only one side of an active risk/issue link");
assert.match(migration, /Remove the issue backlink atomically before unlinking this risk/,
  "database must prevent clearing a risk link while the issue still points back");
assert.match(migration, /A materialized risk must reference its converted issue/,
  "database must reject materialized risks without a linked issue");
assert.match(migration, /An issue linked to a risk must reference an active visible risk in the same project/,
  "database must reject missing, hidden, inactive, or cross-project risk links");
assert.match(store, /existing\.from_risk_id && existing\.from_risk_id !== risk\.id/,
  "conversion retries must reject an issue already owned by another risk");
assert.match(store, /issuePatch \? \[\{ coll: "issues", rec: issuePatch \}\]/,
  "retry path must repair a missing issue backlink atomically");

const issueView = entities.slice(entities.indexOf("export function IssuesView"), entities.indexOf("// ═════ Decisions ═════"));
assert.ok(issueView.includes('key: "root_cause"') && issueView.includes('key: "corrective_action"') && issueView.includes('key: "preventive_action"'), "Issue capture includes root cause and corrective/preventive actions");
assert.ok(issueView.includes('key: "due_date"') && issueView.includes('key: "impact"'), "Issue capture includes target resolution date and project impact");
assert.ok(issueView.includes('label: "السبب الجذري"') && issueView.includes('label: "الإجراء الوقائي"'), "Issue details expose the investigation and prevention fields");
console.log("Projects risk-to-issue traceability contract tests passed.");
