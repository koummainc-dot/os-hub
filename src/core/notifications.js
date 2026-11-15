import { supabase } from "./supabase.js";

export async function listCoreNotifications(workspaceId, limit = 50) {
  if (!workspaceId) return { ok: false, rows: [], reason: "missing-workspace" };
  try {
    const { data, error } = await supabase.from("core_notifications")
      .select("id,source_system,entity_collection,entity_id,event_type,title,body,deep_link,read_at,created_at")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(Math.max(1, Math.min(100, limit)));
    return error ? { ok: false, rows: [], error } : { ok: true, rows: data || [] };
  } catch (error) { return { ok: false, rows: [], error }; }
}

export async function markCoreNotificationRead(id) {
  if (!id) return { ok: false, error: new Error("Notification ID is required.") };
  try {
    const { error } = await supabase.from("core_notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id)
      .is("read_at", null);
    return error ? { ok: false, error } : { ok: true };
  } catch (error) { return { ok: false, error }; }
}

export async function emitCoreNotification(payload) {
  if (!payload?.workspace_id || !payload?.recipient_id || !payload?.entity_id) return { ok: false, reason: "invalid-payload" };
  try {
    const { data, error } = await supabase.rpc("core_notification_emit", { p: payload });
    return error ? { ok: false, error } : { ok: true, result: data };
  } catch (error) { return { ok: false, error }; }
}


const PROJECT_INTEGRATION_FAILURES = Object.freeze({
  finance: {
    event_type: "finance_sync_failed",
    title: "تعذّر تحديث ملخص Finance للمشروع",
    body: "تعذر على أحد أعضاء المشروع جلب الملخص المالي من Finance. افتح تبويب Finance للتحقق.",
    tab: "finance",
  },
  knowledge_meetings: {
    event_type: "knowledge_meetings_sync_failed",
    title: "تعذّر تحميل اجتماعات Knowledge للمشروع",
    body: "تعذر جلب الاجتماعات المرتبطة بالمشروع من Knowledge. افتح تبويب الاجتماعات وأعد المحاولة.",
    tab: "meetings",
  },
  knowledge_resources: {
    event_type: "knowledge_resources_sync_failed",
    title: "تعذّر تحميل موارد Knowledge للمشروع",
    body: "تعذر جلب الموارد المرتبطة بالمشروع من Knowledge. افتح تبويب الموارد وأعد المحاولة.",
    tab: "resources",
  },
});

/**
 * Notify another authorized Project collaborator about an integration read
 * failure. The notification points only to the Project record; it never copies
 * Finance values, meeting content, resource titles or transport error details.
 * Core remains the only Inbox owner and applies source/project visibility checks.
 */
export async function emitProjectIntegrationFailure({
  workspaceId,
  project,
  actorId,
  integration,
}) {
  const definition = PROJECT_INTEGRATION_FAILURES[integration];
  if (!workspaceId || !project?.id || !actorId || !definition) {
    return { ok: false, reason: "invalid-project-integration-failure" };
  }
  const members = Array.isArray(project.members)
    ? project.members.map((member) => member?.member_id).filter(Boolean)
    : [];
  const recipients = [...new Set([project.lead_id, ...members].filter((id) => id && id !== actorId))];
  if (!recipients.length) return { ok: true, result: { skipped: "no-other-project-collaborator" } };

  const day = new Date().toISOString().slice(0, 10);
  const results = await Promise.all(recipients.map((recipientId) => emitCoreNotification({
    workspace_id: workspaceId,
    recipient_id: recipientId,
    source_system: "projects",
    entity_collection: "projects",
    entity_id: project.id,
    event_type: definition.event_type,
    title: definition.title,
    body: definition.body,
    dedupe_key: "project-integration-failure:" + integration + ":" + project.id + ":" + day,
    deep_link: {
      system: "projects",
      projectId: project.id,
      tab: definition.tab,
      recordKind: "project",
      recordId: project.id,
    },
  })));
  return {
    ok: results.every((result) => result.ok),
    results,
  };
}
