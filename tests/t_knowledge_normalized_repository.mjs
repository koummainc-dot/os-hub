import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [repository, component, migration, docs, projectLinkMigration, projectsMeetings] = await Promise.all([
  readFile(new URL("../src/systems/knowledge/repository.js", import.meta.url), "utf8"),
  readFile(new URL("../src/systems/knowledge/index.jsx", import.meta.url), "utf8"),
  readFile(new URL("../supabase/migrations/20261030150615_knowledge_resource_os.sql", import.meta.url), "utf8"),
  readFile(new URL("../docs/KNOWLEDGE_RESOURCE_OS_IMPLEMENTATION.md", import.meta.url), "utf8"),
  readFile(new URL("../supabase/migrations/20261113210000_knowledge_project_scoped_links.sql", import.meta.url), "utf8"),
  readFile(new URL("../src/systems/projects/screens_c.jsx", import.meta.url), "utf8"),
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
assert.ok(repository.includes('.from("workspace_records")'), "Knowledge project picker and validation must use Projects' canonical repository");
assert.ok(repository.includes('rpc("knowledge_list_project_meetings"'), "Projects meeting reads must call the Knowledge-owned server query");
assert.ok(repository.includes("project-scoped-query-not-installed"), "selected-project reads must fail closed until the scoped RPC is installed");
assert.ok(repository.includes("normalized-legacy-fallback"), "only the unfiltered legacy view may use the transitional snapshot fallback");
assert.ok(projectsMeetings.includes('listKnowledgeMeetings(ws.id, selectedProjectId === "all" ? null : selectedProjectId)'), "Projects passes the selected project filter to Knowledge");
assert.ok(!projectsMeetings.includes('String(m.relatedId) === String(projectFilter)'), "Projects must not filter a workspace-wide meeting list client-side");
assert.ok(projectLinkMigration.includes("knowledge_external_links"), "canonical external links remain Knowledge-owned");
assert.ok(projectLinkMigration.includes("knowledge_list_project_meetings"), "Knowledge owns the project-scoped read RPC");
assert.ok(projectLinkMigration.includes("DEFERRABLE") === false, "Knowledge project links do not introduce unrelated deferred constraints");
assert.ok(!/update\s+public\.workspace_records|delete\s+from\s+public\.workspace_records/i.test(projectLinkMigration), "Knowledge link migration must not backfill or mutate Projects data");
assert.ok(docs.includes("Issue #85"));

console.log("Knowledge normalized repository contract: PASS");
