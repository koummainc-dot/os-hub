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
