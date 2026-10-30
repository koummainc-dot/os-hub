import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const migration = await readFile(new URL("../supabase/migrations/20261030110000_projects_task_issue_traceability.sql", import.meta.url), "utf8");
const store = await readFile(new URL("../src/systems/projects/store.jsx", import.meta.url), "utf8");

assert.match(migration, /create trigger projects_guard_task_issue_references_trg\s+before insert or update of data on public\.workspace_records/i,
  "task/issue reference checks must cover direct writes and atomic batches");
assert.match(migration, /A task may reference only active visible issues in the same project/,
  "task issue_ids must not point to missing, hidden, trashed, or cross-project issues");
assert.match(migration, /An issue may reference only active visible tasks in the same project/,
  "issue task_ids must not point to missing, hidden, trashed, archived, or cross-project tasks");
assert.match(migration, /Task issue_ids must be an array/);
assert.match(migration, /Issue task_ids must be an array/);
assert.match(migration, /new\.data - 'deleted_at' - 'deleted_by'/,
  "trash/restore metadata updates must remain possible for atomic project cascades");
assert.match(store, /await R\.putAtomic\(\[\{ coll: "tasks", rec: task \}, \{ coll: "issues", rec: issuePatch \}\]\)/,
  "repair-task creation must atomically persist both sides of the task/issue reference");
console.log("Projects task/issue traceability contract tests passed.");
