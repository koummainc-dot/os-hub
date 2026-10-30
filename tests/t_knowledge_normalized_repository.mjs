import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [repository, component, migration, docs] = await Promise.all([
  readFile(new URL("../src/systems/knowledge/repository.js", import.meta.url), "utf8"),
  readFile(new URL("../src/systems/knowledge/index.jsx", import.meta.url), "utf8"),
  readFile(new URL("../supabase/migrations/20261030140000_knowledge_resource_os.sql", import.meta.url), "utf8"),
  readFile(new URL("../docs/KNOWLEDGE_RESOURCE_OS_IMPLEMENTATION.md", import.meta.url), "utf8"),
]);

assert.ok(repository.includes('rpc("knowledge_load_snapshot"'));
assert.ok(repository.includes('rpc("knowledge_save_snapshot"'));
assert.ok(repository.includes("migration-not-applied"));
assert.ok(component.includes("loadNormalizedKnowledge"));
assert.ok(component.includes("saveNormalizedKnowledge"));
assert.ok(component.includes("تم نقل بيانات المعرفة الحالية إلى التخزين المنظم"));
assert.ok(component.includes('storageMode==="normalized"'));

for (const table of [
  "knowledge_categories", "knowledge_items", "knowledge_tags",
  "knowledge_item_tags", "knowledge_relations", "knowledge_followups",
  "knowledge_attachments", "knowledge_external_links", "knowledge_reminders",
  "knowledge_activity", "knowledge_workspace_state",
]) {
  assert.ok(migration.includes(`public.${table}`), `migration missing ${table}`);
}
assert.ok(migration.toLowerCase().includes("enable row level security"));
assert.ok(migration.includes("ws_access_level(p_workspace_id, 'knowledge', 'main')"));
assert.ok(migration.includes("pg_advisory_xact_lock"));
assert.ok(migration.includes("p_expected_updated_at"));
assert.ok(migration.toLowerCase().includes("security invoker"));
assert.equal(migration.split("\n").filter((line) => line.trim() === "as $$").length, 3, "all SQL functions use valid dollar-quoted bodies");
assert.equal(migration.split("\n").filter((line) => line.trim() === "$$;").length, 3, "all SQL function bodies close correctly");
assert.ok(migration.includes("primary key(workspace_id,id)"));
assert.ok(!migration.includes("v_now);\n      on conflict"), "upsert clause must be part of the INSERT statement");
assert.ok(!migration.toLowerCase().includes("security definer"));
assert.ok(migration.includes("on conflict(workspace_id,id) do update"));
assert.ok(migration.includes("knowledge_activity(workspace_id,item_id,actor_id,action,change_summary)"));
assert.ok(docs.includes("legacy JSON"));
assert.ok(docs.includes("Issue #85"));

console.log("Knowledge normalized repository contract: PASS");
