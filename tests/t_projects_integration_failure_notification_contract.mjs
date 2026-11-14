import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const helper = await readFile(new URL("../src/core/notifications.js", import.meta.url), "utf8");
const projectsFinance = await readFile(new URL("../src/systems/projects/screens_b.jsx", import.meta.url), "utf8");
const inboxMigration = await readFile(new URL("../supabase/migrations/20261114274000_core_project_integration_failure_notifications.sql", import.meta.url), "utf8");
const baseInbox = await readFile(new URL("../supabase/migrations/20261114240000_core_notifications_inbox.sql", import.meta.url), "utf8");
const knowledgeViewEvents = await readFile(new URL("../supabase/migrations/20261114275000_core_project_view_notification_events.sql", import.meta.url), "utf8");

for (const [key, eventType, tab] of [
  ["finance", "finance_sync_failed", "finance"],
  ["knowledge_meetings", "knowledge_meetings_sync_failed", "meetings"],
  ["knowledge_resources", "knowledge_resources_sync_failed", "resources"]
]) {
  assert.ok(helper.includes(`${key}: {`) && helper.includes(`event_type: "${eventType}"`) && helper.includes(`tab: "${tab}"`),
    `the Core helper must map ${key} failures to a privacy-safe Project deep link`);
}
assert.ok(helper.includes("const recipients = [...new Set([project.lead_id, ...members]") &&
  helper.includes("id !== actorId") && helper.includes("Promise.all(recipients.map"),
  "all other Project collaborators may receive the integration failure, but never the actor");
assert.ok(helper.includes('dedupe_key: "project-integration-failure:" + integration + ":" + project.id + ":" + day'),
  "integration failures must deduplicate once per Project, integration and day");
assert.ok(!helper.includes("error.message") && !helper.includes("profile.transactions") && !helper.includes("meeting.followups"),
  "Core Inbox messages must not contain private transport details, Finance values or Knowledge content");

assert.ok(projectsFinance.includes('integration: "finance"') &&
  projectsFinance.includes('integration: "knowledge_meetings"') &&
  projectsFinance.includes('integration: "knowledge_resources"'),
  "Project Finance and both Knowledge views must report sync failures through the shared Core helper");
assert.ok(projectsFinance.includes("listKnowledgeAttachments(ws.id, item.id)") &&
  projectsFinance.includes("if (!result.ok)") &&
  projectsFinance.includes('integration: "knowledge_resources"'),
  "Knowledge attachment read failures must also be surfaced without copying attachment metadata");

assert.ok(inboxMigration.includes("finance_sync_failed") &&
  inboxMigration.includes("knowledge_meetings_sync_failed") &&
  inboxMigration.includes("knowledge_resources_sync_failed"),
  "only the three named Project integration failure events may use the read-only emit exception");
assert.ok(inboxMigration.includes("public.ws_access_level(v_ws,'projects','projects') not in ('view','edit')") &&
  inboxMigration.includes("core_projects_member_has_section(v_ws,v_recipient,'projects')"),
  "both sender and recipient must independently have Projects read access");
assert.ok(knowledgeViewEvents.includes("'knowledge_meeting_scheduled'") &&
  knowledgeViewEvents.includes("'knowledge_meeting_followups_added'"),
  "Knowledge meeting lifecycle events may be emitted by Project viewers as well as Project editors");
assert.ok(knowledgeViewEvents.includes("elsif public.ws_access_level(v_ws,v_system,v_collection) is distinct from 'edit'"),
  "the Knowledge exception must not weaken the edit requirement for any other event");
assert.ok(inboxMigration.includes("elsif public.ws_access_level(v_ws,v_system,v_collection) is distinct from 'edit'"),
  "normal user-authored Core notifications must continue requiring edit access");
assert.ok(baseInbox.includes("source_record_forbidden") || baseInbox.includes("NOTIFICATION_SOURCE_FORBIDDEN"),
  "the original Core notification source visibility guard must remain in place");

console.log("✓ Projects Finance/Knowledge sync-failure notification privacy and permission contracts passed");
