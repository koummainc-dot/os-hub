import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const migration = await readFile(new URL("../supabase/migrations/20261030100000_projects_final_output_guard.sql", import.meta.url), "utf8");
const ui = await readFile(new URL("../src/systems/projects/entities.jsx", import.meta.url), "utf8");

assert.match(migration, /create trigger projects_guard_final_outputs_trg\s+before insert or update of data on public\.workspace_records/i,
  "guard must cover normal record writes and atomic RPC writes");
assert.match(migration, /old\.data->>'approval' = 'Final'/,
  "previously final outputs must be treated as immutable");
assert.match(migration, /new\.data - 'deleted_at' - 'deleted_by' - 'v' - 'updated_at' - 'created_at' - 'updated_by_member'/,
  "final output immutability must ignore only internal record metadata and trash markers");
assert.match(migration, /new\.data - 'deleted_at' - 'deleted_by'/,
  "only trash/restore markers may change after final approval");
assert.match(migration, /public\.is_ws_owner\(new\.workspace_id\)/,
  "workspace owner may approve final outputs");
assert.match(migration, /member->>'role' in \('Lead', 'Reviewer'\)/,
  "project Lead and Reviewer are the only project roles allowed to approve");
assert.match(migration, /security definer\s+set search_path = public/i,
  "database guards must validate linked records without depending on caller row visibility");
assert.match(migration, /new\.data := jsonb_set[\s\S]*?approved_by[\s\S]*?approved_at/,
  "approval metadata must be stamped server-side rather than trusted from the client");
assert.match(migration, /using errcode = '42501'/,
  "unauthorized finalization/edit must fail as a permission error");
assert.match(ui, /prev\?\.approval === "Final"/,
  "UI must also prevent editing a final output");
assert.match(ui, /can\("output\.approve", project\)/,
  "UI must enforce the same approval role before submission");
assert.match(migration, /Trash\/restore and metadata-only updates do not change the artifact or its links/,
  "output trash/restore must work even when linked records change in the same transaction");
assert.match(migration, /Output task must be active and belong to the selected project/,
  "database must reject cross-project or inactive task links on outputs");
assert.match(migration, /Output PRD must be active and belong to the selected project/,
  "database must reject cross-project or inactive PRD links on outputs");
assert.match(migration, /p\.visible_to is null or auth\.uid\(\) = any\(p\.visible_to\)/,
  "server-side project references must respect record-level visibility");
assert.match(migration, /public\.ws_access_level\(new\.workspace_id, 'projects', 'projects'\) in \('view','edit'\)/,
  "server-side project references must require project collection access");
assert.match(migration, /Output must reference an active non-system project/,
  "database must reject outputs attached to missing, trashed, or system projects");
assert.match(migration, /create trigger projects_guard_work_sessions_trg\s+before insert or update of data on public\.workspace_records/i,
  "session guard must run for direct and RPC writes");
assert.match(migration, /new\.data->>'member_id' is distinct from auth\.uid\(\)::text/,
  "database must reject sessions owned by a different member");
assert.match(migration, /old\.data->>'member_id' is distinct from auth\.uid\(\)::text/,
  "database must reject takeover of another member's existing session");
assert.match(migration, /A work session must reference an active leaf task/,
  "database must reject missing, archived, deleted, or parent task references");
assert.match(migration, /A work session cannot reference a parent task/,
  "database must reject a task with active child tasks");
assert.match(migration, /create trigger projects_guard_task_references_trg\s+before insert or update of data on public\.workspace_records/i,
  "task relationship guard must cover direct writes and atomic record batches");
assert.match(migration, /Task parent must be active and belong to the same project/,
  "database must reject missing or cross-project parent tasks");
assert.match(migration, /Task hierarchy cannot contain a cycle/,
  "database must reject parent cycles");
assert.match(migration, /Task PRD must be active and belong to the same project/,
  "database must reject cross-project or inactive PRD references");
console.log("Projects server-side record guards contract tests passed.");
