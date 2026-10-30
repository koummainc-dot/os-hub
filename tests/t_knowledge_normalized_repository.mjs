import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [repository, component, migration, docs] = await Promise.all([
  readFile(new URL("../src/systems/knowledge/repository.js", import.meta.url), "utf8"),
  readFile(new URL("../src/systems/knowledge/index.jsx", import.meta.url), "utf8"),
  readFile(new URL("../supabase/migrations/20261030140000_knowledge_resource_os.sql", import.meta.url), "utf8"),
  readFile(new URL("../docs/KNOWLEDGE_RESOURCE_OS_IMPLEMENTATION.md", import.meta.url), "utf8"),
]);

assert.match(repository, /rpc\("knowledge_load_snapshot"/);
assert.match(repository, /rpc\("knowledge_save_snapshot"/);
assert.match(repository, /migration-not-applied/);
assert.match(component, /loadNormalizedKnowledge/);
assert.match(component, /saveNormalizedKnowledge/);
assert.match(component, /تم نقل بيانات المعرفة الحالية إلى التخزين المنظم/);
assert.match(component, /storageMode==="normalized"/);

for (const table of [
  "knowledge_categories", "knowledge_items", "knowledge_tags",
  "knowledge_item_tags", "knowledge_relations", "knowledge_followups",
  "knowledge_attachments", "knowledge_external_links", "knowledge_reminders",
  "knowledge_activity", "knowledge_workspace_state",
]) {
  assert.ok(migration.includes(`public.${table}`), `migration missing ${table}`);
}
assert.match(migration, /enable row level security/i);
assert.match(migration, /ws_access_level\(p_workspace_id, 'knowledge', 'main'\)/);
assert.match(migration, /pg_advisory_xact_lock/);
assert.match(migration, /p_expected_updated_at/);
assert.match(migration, /security invoker/i);
assert.doesNotMatch(migration, /security definer/i);
assert.match(migration, /on conflict\(workspace_id,id\) do update/i);
assert.match(migration, /knowledge_activity\(workspace_id,item_id,actor_id,action,change_summary\)/);
assert.match(docs, /legacy JSON/i);
assert.match(docs, /Issue #85/);

console.log("Knowledge normalized repository contract: PASS");
