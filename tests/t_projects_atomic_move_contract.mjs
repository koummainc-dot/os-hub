import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const migration = await readFile(new URL("../supabase/migrations/20261029155533_projects_atomic_records_batch.sql", import.meta.url), "utf8");
const records = await readFile(new URL("../src/core/records.jsx", import.meta.url), "utf8");
const store = await readFile(new URL("../src/systems/projects/store.jsx", import.meta.url), "utf8");
const helper = await readFile(new URL("../src/systems/projects/taskTreeMoveWrites.js", import.meta.url), "utf8");

assert.match(migration, /security invoker/i);
assert.match(migration, /auth\.uid\(\) is null/i);
assert.match(migration, /ws_access_level\(p_workspace_id, 'projects', collection_name\) is distinct from 'edit'/i);
assert.match(migration, /for update/i);
assert.match(migration, /actual_ts is distinct from expected_ts/i);
assert.match(migration, /raise exception/i);
assert.match(migration, /revoke all on function public\.projects_apply_records_batch\(uuid, jsonb\) from public, anon/i);
assert.match(records, /supabase\.rpc\("projects_apply_records_batch"/);
assert.match(records, /does not enqueue offline changes/i);
assert.match(store, /putAtomic: R\.putAtomic/);
assert.match(helper, /await putAtomic\(changes\.map/);
const completionMigration = await readFile(new URL("../supabase/migrations/20261029173536_projects_atomic_completion_batch.sql", import.meta.url), "utf8");
assert.match(completionMigration, /collection_name not in \('tasks','outputs','projects'\)/);
assert.match(completionMigration, /security invoker/i);
assert.match(completionMigration, /ws_access_level\(p_workspace_id, 'projects', collection_name\) is distinct from 'edit'/i);
const statusStart = store.indexOf("    async setProjectStatus(p, to) {");
const statusEnd = store.indexOf("    async archiveProject(p)", statusStart);
const statusBody = store.slice(statusStart, statusEnd);
assert.match(statusBody, /ops\.push\(\{ coll: "projects"/);
assert.match(statusBody, /R\.putAtomic\(ops\)/);
assert.doesNotMatch(statusBody, /for \(const t of plan\.openLeaves\) await R\.put/);
const trashMigration = await readFile(new URL("../supabase/migrations/20261029180000_projects_atomic_trash_batch.sql", import.meta.url), "utf8");
assert.match(trashMigration, /collection_name not in \('tasks','outputs','projects','risks','issues','decisions','prds','updates','discovery'\)/);
assert.match(trashMigration, /security invoker/i);
assert.match(trashMigration, /auth\.uid\(\) is null/i);
assert.match(trashMigration, /ws_access_level\(p_workspace_id, 'projects', collection_name\) is distinct from 'edit'/i);

const moveStart = store.indexOf("    async moveTree(taskId, targetProjectId) {");
const moveEnd = store.indexOf("    async completeAll(taskId)", moveStart);
const moveBody = store.slice(moveStart, moveEnd);
assert.ok(moveBody.includes('patchIds("wins", sourceWins, ["task_ids"]') &&
  moveBody.includes('patchTaskId("wins", sourceWins, "task_id"'),
  "Move Task/Tree must clear both array and singular Win task backlinks");
assert.ok(moveBody.includes('update.status !== "Published"') &&
  moveBody.includes('patchIds("updates", sourceDraftUpdates, ["completed_task_ids", "delayed_task_ids", "next_task_ids", "related_task_ids"]'),
  "Move Task/Tree must update task references in Draft Updates but preserve published historical snapshots");
assert.ok(moveBody.includes('can("win.write", sourceProject)') && moveBody.includes('can("update.write", sourceProject)'),
  "Move Task/Tree must require write permission for every source record whose links it changes");
assert.ok(records.includes('"updates", "wins", "discovery"'),
  "the shared atomic repository must allow Wins in a multi-record Task Tree move");
assert.ok((await readFile(new URL("../supabase/migrations/20261114267000_projects_atomic_move_win_links.sql", import.meta.url), "utf8"))
  .includes("'updates','wins','discovery'"),
  "the canonical database batch writer must authorize Wins atomically");

console.log("Projects atomic task-tree move contract tests passed.");
