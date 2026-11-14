import { supabase } from "./supabase.js";

export async function listCoreSavedViews(workspaceId, systemId) {
  if (!workspaceId || !systemId) return { ok: false, rows: [], reason: "missing-context" };
  try {
    const { data, error } = await supabase
      .from("core_saved_views")
      .select("id,workspace_id,system_id,owner_id,name,scope,definition,created_at,updated_at")
      .eq("workspace_id", workspaceId)
      .eq("system_id", systemId)
      .order("updated_at", { ascending: false });
    if (error) return { ok: false, rows: [], error };
    return { ok: true, rows: Array.isArray(data) ? data : [] };
  } catch (error) {
    return { ok: false, rows: [], error };
  }
}

export async function saveCoreSavedView({ workspaceId, systemId, ownerId, name, scope = "personal", definition }) {
  const cleanName = String(name || "").trim();
  if (!workspaceId || !systemId || !ownerId || !cleanName || cleanName.length > 80 || !definition || typeof definition !== "object" || Array.isArray(definition)) {
    return { ok: false, error: new Error("Saved View data is incomplete or invalid.") };
  }
  try {
    const { data, error } = await supabase
      .from("core_saved_views")
      .upsert({
        workspace_id: workspaceId,
        system_id: systemId,
        owner_id: ownerId,
        name: cleanName,
        scope: scope === "workspace" ? "workspace" : "personal",
        definition,
        updated_at: new Date().toISOString(),
      }, { onConflict: "workspace_id,system_id,owner_id,name" })
      .select("id,workspace_id,system_id,owner_id,name,scope,definition,created_at,updated_at")
      .single();
    if (error) return { ok: false, error };
    return { ok: true, row: data };
  } catch (error) {
    return { ok: false, error };
  }
}

export async function deleteCoreSavedView(id, ownerId) {
  if (!id || !ownerId) return { ok: false, error: new Error("Saved View owner is required.") };
  try {
    const { data, error } = await supabase
      .from("core_saved_views")
      .delete()
      .eq("id", id)
      .eq("owner_id", ownerId)
      .select("id");
    if (error) return { ok: false, error };
    return { ok: true, deleted: Array.isArray(data) && data.length === 1 };
  } catch (error) {
    return { ok: false, error };
  }
}
