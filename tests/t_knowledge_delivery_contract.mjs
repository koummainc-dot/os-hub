import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [repository, component, migration, worker, preview] = await Promise.all([
  readFile(new URL("../src/systems/knowledge/repository.js", import.meta.url), "utf8"),
  readFile(new URL("../src/systems/knowledge/index.jsx", import.meta.url), "utf8"),
  readFile(new URL("../supabase/migrations/20261030140000_knowledge_resource_os.sql", import.meta.url), "utf8"),
  readFile(new URL("../supabase/functions/knowledge-reminders/index.ts", import.meta.url), "utf8"),
  readFile(new URL("../docs/sql/knowledge_migration_preview.sql", import.meta.url), "utf8"),
]);

assert.ok(repository.includes("uploadKnowledgeAttachment"));
assert.ok(repository.includes("deleteKnowledgeAttachment"));
assert.ok(repository.includes("createSignedUrl"));
assert.ok(repository.includes("validateKnowledgeExternalLink"));
assert.ok(component.includes("uploadKnowledgeAttachment"));
assert.ok(component.includes("validateKnowledgeExternalLink"));
assert.ok(migration.includes("'knowledge-attachments'"));
assert.ok(migration.includes("knowledge_notifications"));
assert.ok(migration.includes("knowledge_attachments_object_insert"));
assert.ok(migration.includes("recipient_user_id=(select auth.uid())"));
assert.ok(worker.includes("KNOWLEDGE_REMINDER_CRON_SECRET"));
assert.ok(worker.includes('delivery_channel", "in_app"'));
assert.ok(worker.includes('status: "sent"'));
assert.ok(preview.includes("workspace_data"));
assert.ok(preview.includes("pg_column_size(data)"));
assert.ok(!/\b(insert\s+into\s+public\.workspace_data|\bdelete\s+from\s+public\.workspace_data|\bupdate\s+public\.workspace_data)/i.test(preview));

console.log("Knowledge delivery, attachment, cross-system and preview contracts: PASS");
