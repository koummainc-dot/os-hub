import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const automation = await readFile(new URL("../supabase/migrations/20261114260000_core_projects_daily_automations.sql", import.meta.url), "utf8");
const scheduleGate = await readFile(new URL("../supabase/migrations/20261114262000_core_projects_automation_schedule_gate.sql", import.meta.url), "utf8");
const accessFix = await readFile(new URL("../supabase/migrations/20261114261000_core_projects_automation_governance_access.sql", import.meta.url), "utf8");
const notifications = await readFile(new URL("../supabase/migrations/20261114240000_core_notifications_inbox.sql", import.meta.url), "utf8");
const updateDue = await readFile(new URL("../supabase/migrations/20261114270000_core_projects_update_due_reminders.sql", import.meta.url), "utf8");
const projectsDomain = await readFile(new URL("../src/systems/projects/domain.js", import.meta.url), "utf8");
const projectsScreens = await readFile(new URL("../src/systems/projects/screens_c.jsx", import.meta.url), "utf8");
const timerAutomation = await readFile(new URL("../supabase/migrations/20261114268000_core_projects_long_timer_notifications.sql", import.meta.url), "utf8");
const projectsScreens = await readFile(new URL("../src/systems/projects/screens_c.jsx", import.meta.url), "utf8");
const projectsDomain = await readFile(new URL("../src/systems/projects/domain.js", import.meta.url), "utf8");

for (const eventType of [
  "task_due_today", "task_due_soon", "task_overdue",
  "project_target_overdue", "project_target_soon", "project_health_",
  "high_risk_daily", "critical_issue_daily", "prd_review_reminder",
  "output_review_reminder", "discovery_triage_overdue", "contact_follow_up_due",
  "weekly_review_reminder", "kr_checkin_due"
]) {
  assert.ok(automation.includes(eventType), `daily automations must cover ${eventType}`);
}
for (const toggle of ["dueReminders","overdueDigest","healthAlerts","governanceAlerts","prdReview","outputReview","staleInbox","reviewDraft","krCheckin","timerLong","updateDue"]) {
  assert.ok(automation.includes(toggle), `daily automation must respect the ${toggle} setting`);
}
assert.ok(automation.includes("core_projects_enqueue_notification") && automation.includes("core_notifications"),
  "automations must publish references to the Core-owned Inbox");
assert.ok(automation.includes("v_visible") && automation.includes("v_linked_visible"),
  "automations must check source and linked Project privacy before emitting");
assert.ok(automation.includes("not exists (") && automation.includes("parent_task_id"),
  "due reminders must exclude parent tasks and operate on active leaves");
assert.ok(automation.includes("dedupe_key") && automation.includes("on conflict(workspace_id,recipient_id,dedupe_key) do nothing"),
  "notification retries must be idempotent");
assert.ok(scheduleGate.includes("outside-workspace-reminder-time") && scheduleGate.includes("core_projects_emit_daily_notifications_worker()"),
  "the every-minute Cron poll must skip full scans outside each workspace's local reminder time");
assert.ok(accessFix.includes("case when p_section in ('issues','decisions') then 'risks'"),
  "Governance alert authorization must map legacy Issues/Decisions to the shared Governance section");
assert.ok(notifications.includes("linked_project.value") && notifications.includes("recipient-not-project-member"),
  "Inbox RLS and emit must enforce visibility of every linked Project");
assert.ok(updateDue.includes("core_projects_emit_update_due_notifications") &&
  updateDue.includes("update_due_soon") && updateDue.includes("update_overdue"),
  "Core scheduled jobs must notify before and after a Draft Update period_end");
assert.ok(updateDue.includes("period_end") && updateDue.includes("author_id") && updateDue.includes("project_data->>'lead_id'"),
  "Update due reminders must use the stored period and notify its author and Project lead");
assert.ok(updateDue.includes("v_auto->>'updateDue' is distinct from 'false'"),
  "Update due reminders must respect the workspace automation toggle");
assert.ok(projectsDomain.includes("updateDue: true") && projectsScreens.includes('["updateDue", "تذكير بموعد تحديث المشروع"]'),
  "the Update due automation must have a default and a visible Settings toggle");


assert.ok(timerAutomation.includes("timer_long_running") && timerAutomation.includes("timerMaxHours"),
  "the long-running timer setting must produce a scheduled Core notification at the configured threshold");
assert.ok(timerAutomation.includes("v_data->>'member_id' is distinct from p_recipient_id::text"),
  "only the timer owner may receive the long-running timer notification");
assert.ok(timerAutomation.includes("timer.data->>'member_id'=auth.uid()::text") &&
  timerAutomation.includes("core_notifications.entity_collection <> 'timers'"),
  "Core Inbox RLS must restrict timer notifications to their owner");
assert.ok(timerAutomation.includes("when 'timers' then 'tasks'") &&
  timerAutomation.includes("projects','timers','tasks'"),
  "timer notification reads must inherit Tasks section access");
assert.ok(projectsScreens.includes('settings?.automations?.winSuggest === false ? []'),
  "the Win suggestions toggle must actually hide suggestions when disabled");
assert.ok(!projectsScreens.includes('["pioSuggest"') && !projectsDomain.includes("pioSuggest"),
  "unsupported PIO suggestion toggle must not be exposed as a dormant setting");

console.log("✓ Projects daily automation, timer privacy, Core Inbox, dedupe and schedule-gate contracts passed");
