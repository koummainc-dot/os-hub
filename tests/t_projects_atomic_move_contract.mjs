import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const migration = await readFile(new URL("../supabase/migrations/20261029160000_projects_atomic_records_batch.sql", import.meta.url), "utf8");
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
console.log("Projects atomic task-tree move contract tests passed.");
