import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const migration = await readFile(new URL("../supabase/migrations/20261029100000_relationships_atomic_batch.sql", import.meta.url), "utf8");
const ui = await readFile(new URL("../src/systems/relationships/index.jsx", import.meta.url), "utf8");

// Contract checks for the RPC boundary. Runtime authorization still relies on PostgreSQL RLS.
assert.match(migration, /create or replace function public\.relationships_apply_batch/i);
assert.match(migration, /security invoker/i);
assert.match(migration, /auth\.uid\(\) is null/i);
assert.match(migration, /public\.ws_access_level\(p_workspace_id, 'relationships', collection_name\) <> 'edit'/i);
assert.match(migration, /on conflict \(workspace_id, system_id, collection, id\)/i);
assert.match(migration, /raise exception/i);
assert.match(migration, /grant execute on function public\.relationships_apply_batch\(uuid, jsonb, jsonb\) to authenticated/i);
assert.match(migration, /revoke all on function public\.relationships_apply_batch\(uuid, jsonb, jsonb\) from public, anon/i);
assert.match(ui, /supabase\.rpc\("relationships_apply_batch"/);
assert.match(ui, /p_soft_deletes: \[\{ collection: "people", id: String\(mergePreview\.summary\.removedPersonId\) \}\]/);
assert.match(ui, /p_upserts: upserts, p_soft_deletes: \[\]/);
assert.doesNotMatch(ui, /لا توجد معاملة ذرية لهذا الاستيراد/);
console.log("Relationships atomic batch contract tests passed.");
