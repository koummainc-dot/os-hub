import { supabase } from "../../core/supabase.js";

const MISSING_OBJECT_CODES = new Set(["PGRST202", "PGRST205", "42883", "42P01", "42703"]);
const MISSING_OBJECT_MESSAGE = /could not find the function|function .* does not exist|relation .* does not exist|schema cache/i;

function missingObject(error) {
  return !!error && (MISSING_OBJECT_CODES.has(error.code) || MISSING_OBJECT_MESSAGE.test(error.message || ""));
}

function hasKnowledgeContent(snapshot) {
  if (!snapshot) return false;
  return ["resources", "ideas", "notes", "meetings", "events", "inbox"]
    .some((key) => Array.isArray(snapshot[key]) && snapshot[key].length > 0)
    || (Array.isArray(snapshot.categories) && snapshot.categories.length > 0);
}

export async function loadNormalizedKnowledge(workspaceId) {
  if (!workspaceId || !supabase || typeof supabase.rpc !== "function") {
    return { available: false, reason: "supabase-client-unavailable" };
  }
  try {
    const { data, error } = await supabase.rpc("knowledge_load_snapshot", {
      p_workspace_id: workspaceId,
    });
    if (error) {
      if (missingObject(error)) return { available: false, reason: "migration-not-applied" };
      return { available: true, error };
    }
    return {
      available: true,
      data: data?.data || null,
      updatedAt: data?.updatedAt || null,
      hasContent: hasKnowledgeContent(data?.data),
    };
  } catch (error) {
    return { available: true, error };
  }
}

export async function saveNormalizedKnowledge(workspaceId, snapshot, expectedUpdatedAt = null) {
  if (!workspaceId || !supabase || typeof supabase.rpc !== "function") {
    return { available: false, reason: "supabase-client-unavailable" };
  }
  try {
    const { data, error } = await supabase.rpc("knowledge_save_snapshot", {
      p_workspace_id: workspaceId,
      p_snapshot: snapshot,
      p_expected_updated_at: expectedUpdatedAt,
    });
    if (error) {
      if (missingObject(error)) return { available: false, reason: "migration-not-applied" };
      return { available: true, ok: false, error };
    }
    return {
      available: true,
      ok: !!data?.ok,
      conflict: !!data?.conflict,
      updatedAt: data?.updatedAt || null,
    };
  } catch (error) {
    return { available: true, ok: false, error };
  }
}


const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const ALLOWED_ATTACHMENT_TYPES = new Set([
  "application/pdf", "text/plain", "text/markdown", "image/jpeg", "image/png", "image/webp",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);

export async function listKnowledgeAttachments(workspaceId, itemId) {
  if (!workspaceId || !itemId || !supabase) return { ok: false, error: new Error("Knowledge workspace/item is required") };
  const { data, error } = await supabase
    .from("knowledge_attachments")
    .select("id,workspace_id,item_id,storage_path,file_name,mime_type,byte_size,created_at")
    .eq("workspace_id", workspaceId)
    .eq("item_id", itemId)
    .order("created_at", { ascending: false });
  if (error) return { ok: false, error };
  const attachments = await Promise.all((data || []).map(async (row) => {
    const { data: signed, error: signedError } = await supabase.storage
      .from("knowledge-attachments")
      .createSignedUrl(row.storage_path, 60 * 10);
    return { ...row, signedUrl: signedError ? null : signed?.signedUrl || null };
  }));
  return { ok: true, attachments };
}

export async function uploadKnowledgeAttachment(workspaceId, itemId, file) {
  if (!workspaceId || !itemId || !file || !supabase) {
    return { ok: false, error: new Error("Workspace, item, file, and Supabase connection are required") };
  }
  if (file.size > MAX_ATTACHMENT_BYTES) {
    return { ok: false, error: new Error("حجم الملف يتجاوز الحد الأقصى 10 ميجابايت.") };
  }
  if (!ALLOWED_ATTACHMENT_TYPES.has(file.type)) {
    return { ok: false, error: new Error("نوع الملف غير مسموح به.") };
  }
  const safeName = String(file.name || "attachment")
    .normalize("NFKC")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .slice(-120) || "attachment";
  const storagePath = `${workspaceId}/${itemId}/${globalThis.crypto?.randomUUID?.() || Date.now().toString(36)}-${safeName}`;
  const { error: uploadError } = await supabase.storage
    .from("knowledge-attachments")
    .upload(storagePath, file, { contentType: file.type, upsert: false });
  if (uploadError) return { ok: false, error: uploadError };

  const { data, error: metadataError } = await supabase
    .from("knowledge_attachments")
    .insert({
      workspace_id: workspaceId,
      item_id: itemId,
      storage_path: storagePath,
      file_name: file.name || safeName,
      mime_type: file.type || null,
      byte_size: file.size,
    })
    .select("id,workspace_id,item_id,storage_path,file_name,mime_type,byte_size,created_at")
    .single();
  if (metadataError) {
    await supabase.storage.from("knowledge-attachments").remove([storagePath]);
    return { ok: false, error: metadataError };
  }
  const { data: signed } = await supabase.storage.from("knowledge-attachments").createSignedUrl(storagePath, 60 * 10);
  return { ok: true, attachment: { ...data, signedUrl: signed?.signedUrl || null } };
}

export async function deleteKnowledgeAttachment(workspaceId, attachmentId) {
  if (!workspaceId || !attachmentId || !supabase) return { ok: false, error: new Error("Workspace and attachment are required") };
  const { data: row, error: readError } = await supabase
    .from("knowledge_attachments")
    .select("id,storage_path")
    .eq("workspace_id", workspaceId)
    .eq("id", attachmentId)
    .single();
  if (readError) return { ok: false, error: readError };
  const { error: storageError } = await supabase.storage.from("knowledge-attachments").remove([row.storage_path]);
  if (storageError) return { ok: false, error: storageError };
  const { error: deleteError } = await supabase
    .from("knowledge_attachments")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("id", attachmentId);
  return deleteError ? { ok: false, error: deleteError } : { ok: true };
}

function hasTargetId(value, targetId) {
  if (!value || typeof value !== "object") return false;
  if (!Array.isArray(value) && String(value.id ?? "") === String(targetId)) return true;
  return (Array.isArray(value) ? value : Object.values(value)).some((child) => hasTargetId(child, targetId));
}

export async function validateKnowledgeExternalLink(workspaceId, targetSystem, targetId) {
  const supportedSystems = new Set(["projects", "learning", "content", "habits", "finance", "home", "relationships", "travel", "inventory", "shopping"]);
  if (!workspaceId || !supportedSystems.has(targetSystem) || !String(targetId || "").trim()) {
    return { valid: false, reason: "invalid-reference" };
  }
  if (!supabase) return { valid: false, reason: "supabase-client-unavailable" };
  const { data, error } = await supabase
    .from("workspace_data")
    .select("data,part")
    .eq("workspace_id", workspaceId)
    .eq("system_id", targetSystem);
  if (error) return { valid: false, reason: "lookup-failed", error };
  const found = (data || []).some((row) => hasTargetId(row.data, String(targetId).trim()));
  return { valid: found, reason: found ? null : "target-not-found" };
}


export async function listKnowledgeNotifications(workspaceId) {
  if (!workspaceId || !supabase) return { ok: false, error: new Error("Knowledge workspace is required") };
  const { data, error } = await supabase
    .from("knowledge_notifications")
    .select("id,workspace_id,reminder_id,title,body,read_at,created_at")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(100);
  return error ? { ok: false, error } : { ok: true, notifications: data || [] };
}

export async function markKnowledgeNotificationRead(workspaceId, notificationId) {
  if (!workspaceId || !notificationId || !supabase) return { ok: false, error: new Error("Workspace and notification are required") };
  const { error } = await supabase
    .from("knowledge_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("workspace_id", workspaceId)
    .eq("id", notificationId);
  return error ? { ok: false, error } : { ok: true };
}

export { hasKnowledgeContent };
