import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const store = await readFile(new URL("../src/systems/projects/store.jsx", import.meta.url), "utf8");
const entities = await readFile(new URL("../src/systems/projects/entities.jsx", import.meta.url), "utf8");
const start = store.indexOf("async createRepairTask(issue)");
assert.ok(start >= 0, "store must expose atomic repair-task creation");
const end = store.indexOf("// tasks", start);
const action = store.slice(start, end);
assert.ok(action.includes('R.putAtomic([{ coll: "tasks", rec: task }, { coll: "issues", rec: issuePatch }])'), "task and issue back-link must be persisted in one atomic batch");
assert.ok(action.includes("currentIssue.project_id !== issue.project_id"), "issue must still belong to the selected project");
assert.ok(action.includes("linkedIds"), "existing task links must be checked to prevent duplicates");
assert.ok(action.includes("D.validateTaskRefs"), "repair task references must be validated");
assert.ok(entities.includes("act.createRepairTask(i)"), "Issues UI must use the atomic store action");
assert.ok(entities.includes("const repairTasks = (issue) => [...new Set([...(issue.task_ids || []), ...idx.list.filter((t) => (t.issue_ids || []).includes(issue.id)).map((t) => t.id)])]"), "issue detail must show repair-task links from either side of the relationship");
assert.ok(!entities.includes('await act.put("issues", { ...i, task_ids:'), "UI must not save the issue link separately after task creation");
console.log("Projects atomic issue repair-task contract tests passed.");
