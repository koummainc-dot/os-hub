import assert from "node:assert/strict";
import fs from "node:fs";

const migration=fs.readFileSync("supabase/migrations/20261105134000_ventures_import_rpc.sql","utf8");
const repository=fs.readFileSync("src/systems/ventures/repository.js","utf8");

assert.match(migration,/create or replace function public\.ventures_import_apply/);
assert.match(migration,/create or replace function public\.ventures_import_undo/);
assert.match(migration,/ws_access_level\(p_workspace_id,'ventures','import'\)/);
assert.match(migration,/ws_access_level\(p_workspace_id,'projects',collection_name\)/);
assert.match(migration,/projects_apply_records_batch/);
assert.match(migration,/interval '14 days'/);
assert.match(migration,/traceability_decision/);
assert.match(migration,/revoke execute on function public\.ventures_import_apply/);
assert.match(migration,/revoke execute on function public\.ventures_import_undo/);
assert.match(repository,/applyVenturesProjectsImport/);
assert.match(repository,/undoVenturesProjectsImport/);

console.log("Ventures V5 import RPC contract tests passed");
