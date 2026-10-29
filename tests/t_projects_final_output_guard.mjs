import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const migration = await readFile(new URL("../supabase/migrations/20261030100000_projects_final_output_guard.sql", import.meta.url), "utf8");
const ui = await readFile(new URL("../src/systems/projects/entities.jsx", import.meta.url), "utf8");

assert.match(migration, /create trigger projects_guard_final_outputs_trg\s+before insert or update of data on public\.workspace_records/i,
  "guard must cover normal record writes and atomic RPC writes");
assert.match(migration, /old\.data->>'approval' = 'Final'/,
  "previously final outputs must be treated as immutable");
assert.match(migration, /new\.data - 'deleted_at' - 'deleted_by'/,
  "only trash/restore markers may change after final approval");
assert.match(migration, /public\.is_ws_owner\(new\.workspace_id\)/,
  "workspace owner may approve final outputs");
assert.match(migration, /member->>'role' in \('Lead', 'Reviewer'\)/,
  "project Lead and Reviewer are the only project roles allowed to approve");
assert.match(migration, /using errcode = '42501'/,
  "unauthorized finalization/edit must fail as a permission error");
assert.match(ui, /prev\?\.approval === "Final"/,
  "UI must also prevent editing a final output");
assert.match(ui, /can\("output\.approve", project\)/,
  "UI must enforce the same approval role before submission");
console.log("Projects final-output server guard contract tests passed.");
