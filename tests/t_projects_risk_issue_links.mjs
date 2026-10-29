import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const migration = await readFile(new URL("../supabase/migrations/20261030100000_projects_final_output_guard.sql", import.meta.url), "utf8");
const store = await readFile(new URL("../src/systems/projects/store.jsx", import.meta.url), "utf8");

assert.match(migration, /create trigger projects_guard_risk_issue_links_trg\s+before insert or update of data on public\.workspace_records/i,
  "risk/issue linkage must be enforced for direct writes and atomic RPC batches");
assert.match(migration, /Only one active issue may be linked to a risk/,
  "database must reject duplicate active issues for one risk");
assert.match(migration, /A materialized risk must reference its converted issue/,
  "database must reject materialized risks without a linked issue");
assert.match(migration, /An issue linked to a risk must reference an active visible risk in the same project/,
  "database must reject missing, hidden, inactive, or cross-project risk links");
assert.match(store, /existing\.from_risk_id && existing\.from_risk_id !== risk\.id/,
  "conversion retries must reject an issue already owned by another risk");
assert.match(store, /issuePatch \? \[\{ coll: "issues", rec: issuePatch \}\]/,
  "retry path must repair a missing issue backlink atomically");
console.log("Projects risk-to-issue traceability contract tests passed.");
