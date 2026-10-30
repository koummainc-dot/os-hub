import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const migration = await readFile(new URL("../supabase/migrations/20261030110000_projects_task_issue_traceability.sql", import.meta.url), "utf8");
const transactionMigration = await readFile(new URL("../supabase/migrations/20261030120000_projects_task_issue_deferred_validation.sql", import.meta.url), "utf8");
const store = await readFile(new URL("../src/systems/projects/store.jsx", import.meta.url), "utf8");

assert.match(transactionMigration, /create constraint trigger projects_guard_task_issue_references_trg/i);
assert.match(transactionMigration, /deferrable initially deferred/i);
assert.match(migration, /A task may reference only active visible issues in the same project/);
assert.match(migration, /An issue may reference only active visible tasks in the same project/);
assert.match(migration, /Task issue_ids must be an array/);
assert.match(migration, /Issue task_ids must be an array/);
assert.match(store, /await R\.putAtomic\(\[\{ coll: "tasks", rec: task \}, \{ coll: "issues", rec: issuePatch \}\]\)/);
console.log("Projects task/issue integrity contract tests passed.");
