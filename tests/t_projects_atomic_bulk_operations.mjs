import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const store = await readFile(new URL("../src/systems/projects/store.jsx", import.meta.url), "utf8");
const records = await readFile(new URL("../src/core/records.jsx", import.meta.url), "utf8");

for (const method of ["completeAll", "archiveTree", "deleteTree"]) {
  const start = store.indexOf(`    async ${method}(`);
  assert.notEqual(start, -1, `missing ${method}`);
  const next = store.indexOf("    // time", start);
  const body = store.slice(start, next === -1 ? undefined : next);
  assert.match(body, /R\.putAtomic\(/, `${method} must use atomic batch persistence`);
  assert.doesNotMatch(body, /for\s*\([^)]*\)\s*await R\.(put|softDelete)/, `${method} must not sequentially write records`);
  assert.match(body, /catch \(error\)/, `${method} must surface batch failures`);
}
assert.match(records, /if \(!\["tasks", "outputs", "projects", "risks", "issues", "decisions", "prds", "updates"\]\.includes\(coll\) \|\| !rec\?\.id\)/);
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


assert.match(records, /does not enqueue offline changes/i);
console.log("Projects task bulk atomic-operation contract tests passed.");
