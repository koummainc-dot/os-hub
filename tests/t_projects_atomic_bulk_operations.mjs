import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const store = await readFile(new URL("../src/systems/projects/store.jsx", import.meta.url), "utf8");
const records = await readFile(new URL("../src/core/records.jsx", import.meta.url), "utf8");
const batchMigration = await readFile(new URL("../supabase/migrations/20261029180000_projects_atomic_trash_batch.sql", import.meta.url), "utf8");

for (const method of ["completeAll", "archiveTree", "deleteTree"]) {
  const start = store.indexOf(`    async ${method}(`);
  assert.notEqual(start, -1, `missing ${method}`);
  const next = store.indexOf("    // time", start);
  const body = store.slice(start, next === -1 ? undefined : next);
  assert.match(body, /R\.putAtomic\(/, `${method} must use atomic batch persistence`);
  assert.doesNotMatch(body, /for\s*\([^)]*\)\s*await R\.(put|softDelete)/, `${method} must not sequentially write records`);
  assert.match(body, /catch \(error\)/, `${method} must surface batch failures`);
}
assert.match(records, /if \(!\["tasks", "outputs", "projects", "risks", "issues", "decisions", "prds", "updates", "discovery"\]\.includes\(coll\) \|\| !rec\?\.id\)/);
assert.ok(/collection_name not in \([^)]*\x27discovery\x27/.test(batchMigration), "server RPC migration must allow discovery in atomic record batches");
const saveStart = store.indexOf("async saveTask(v, isNew)");
const saveEnd = store.indexOf("async setTaskStatus(t, to, reason)", saveStart);
const saveBody = store.slice(saveStart, saveEnd);
assert.ok(saveBody.includes("firstChildParentPatch"), "first-child conversion must retain the parent patch until child creation");
assert.ok(saveBody.includes('R.putAtomic([\n          { coll: "tasks", rec: { ...stamp(firstChildParentPatch)'), "parent state and first child must be saved in one atomic batch");
assert.ok(!saveBody.includes("await R.put(\"tasks\", fc.patch)"), "parent state must not be written before the child task is persisted");
const reparentStart = store.indexOf("async reparent(taskId, newParentId)");
const reparentEnd = store.indexOf("async moveTree(taskId, targetProjectId)", reparentStart);
const reparentBody = store.slice(reparentStart, reparentEnd);
assert.ok(reparentBody.includes("R.putAtomic(["), "reparenting onto a leaf parent must update parent and child atomically");
assert.ok(reparentBody.includes("fc.warnCompleted"), "reparenting must warn before converting a completed task into a parent");
assert.ok(!reparentBody.includes("await R.put(\"tasks\", fc.patch)"), "reparenting must not persist the parent transition separately");
assert.ok(reparentBody.includes('putIn("tasks", nextTask, projectsById[t.project_id])'), "moving a task to the root must preserve project visibility metadata");


const projectSaveStart = store.indexOf("async saveProject(v, isNew)");
const projectSaveEnd = store.indexOf("async setProjectStatus(p, to)", projectSaveStart);
const projectSaveBody = store.slice(projectSaveStart, projectSaveEnd);
assert.match(projectSaveBody, /const changed = kids\.flatMap/,
  "project privacy updates must enumerate every child record whose visibility changes");
assert.match(projectSaveBody, /if \(!isDemo && changed\.length\)[\s\S]*?R\.putAtomic\(ops\)/,
  "online privacy cascades must update the project and all affected children atomically");
assert.match(projectSaveBody, /ops\.length > 1000/,
  "privacy cascade must fail before writes when it exceeds the server transaction limit");
assert.match(records, /does not enqueue offline changes/i);
console.log("Projects task bulk atomic-operation contract tests passed.");
