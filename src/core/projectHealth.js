import { supabase } from "./supabase.js";

export async function listProjectHealthTransitions(workspaceId, projectId, limit = 30) {
  if (!workspaceId || !projectId) {
    return { ok: false, rows: [], reason: "missing-project-context" };
  }
  try {
    const { data, error } = await supabase.rpc("core_projects_list_health_transitions", {
      p_workspace_id: workspaceId,
      p_project_id: projectId,
      p_limit: Math.max(1, Math.min(100, limit)),
    });
    return error ? { ok: false, rows: [], error } : { ok: true, rows: Array.isArray(data) ? data : [] };
  } catch (error) {
    return { ok: false, rows: [], error };
  }
}
