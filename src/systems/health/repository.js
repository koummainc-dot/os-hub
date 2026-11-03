import { supabase } from "../../core/supabase.js";

const PROFILE_FIELDS = "id,owner_user_id,display_name,profile_type,status,timezone,locale,settings,created_at,updated_at";
const GRANT_FIELDS = "id,profile_id,grantee_user_id,granted_by,grant_role,scope_keys,actions,starts_at,expires_at,revoked_at,created_at,updated_at";

async function audit(profileId, actorUserId, action, resourceType, resourceId = null, metadata = {}) {
  // Audit metadata is intentionally limited to non-clinical operational details.
  const { error } = await supabase.from("health_audit_events").insert({
    profile_id: profileId, actor_user_id: actorUserId, action,
    resource_type: resourceType, resource_id: resourceId, metadata
  });
  if (error) console.warn("Health audit event could not be recorded:", error.code || "unknown");
}


const CONDITION_FIELDS = "id,profile_id,name,condition_type,status,diagnosed_on,resolved_on,diagnosed_by,notes,created_by,created_at,updated_at";
const ALLERGY_FIELDS = "id,profile_id,allergen,reaction,severity,status,first_observed_on,notes,created_by,created_at,updated_at";
const SYMPTOM_FIELDS = "id,profile_id,name,category,is_active,created_by,created_at,updated_at";
const SYMPTOM_LOG_FIELDS = "id,profile_id,symptom_definition_id,symptom_name_snapshot,severity,recorded_at,duration_minutes,body_location,notes,source,created_by,created_at,updated_at";
const DOCUMENT_FIELDS = "id,profile_id,object_path,display_name,original_filename,document_type,document_date,mime_type,size_bytes,notes,uploaded_by,created_at,updated_at";

async function auditClinical(profileId, actorUserId, action, resourceType, resourceId) {
  // Deliberately omit symptom/condition names, reactions, severity, and notes from audit metadata.
  await audit(profileId, actorUserId, action, resourceType, resourceId, {});
}
async function listScoped(table, fields, profileId, orderBy = "created_at") {
  const { data, error } = await supabase.from(table).select(fields).eq("profile_id", profileId).order(orderBy, { ascending: false });
  if (error) throw error;
  return data || [];
}
async function insertScoped(table, fields, payload) {
  const { data, error } = await supabase.from(table).insert(payload).select(fields).single();
  if (error) throw error;
  return data;
}
async function updateScoped(table, fields, id, profileId, patch) {
  const { data, error } = await supabase.from(table).update({ ...patch, updated_at: new Date().toISOString() }).eq("id", id).eq("profile_id", profileId).select(fields).single();
  if (error) throw error;
  return data;
}
async function deleteScoped(table, id, profileId) {
  const { data, error } = await supabase.from(table).delete().eq("id", id).eq("profile_id", profileId).select("id").single();
  if (error) throw error;
  return data;
}

export const healthRepository = {
  async listProfiles() {
    const { data, error } = await supabase.from("health_profiles")
      .select(PROFILE_FIELDS).order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async createProfile({ ownerUserId, displayName, timezone = "Africa/Cairo", locale = "ar-EG" }) {
    const { data, error } = await supabase.from("health_profiles").insert({
      owner_user_id: ownerUserId,
      display_name: displayName.trim(),
      profile_type: "self",
      timezone,
      locale
    }).select(PROFILE_FIELDS).single();
    if (error) throw error;
    await audit(data.id, ownerUserId, "profile_created", "health_profile", data.id, { profile_type: "self" });
    return data;
  },

  async updateProfile({ profileId, ownerUserId, displayName, timezone, locale, status }) {
    const patch = { updated_at: new Date().toISOString() };
    if (displayName !== undefined) patch.display_name = displayName.trim();
    if (timezone !== undefined) patch.timezone = timezone;
    if (locale !== undefined) patch.locale = locale;
    if (status !== undefined) patch.status = status;
    const { data, error } = await supabase.from("health_profiles").update(patch)
      .eq("id", profileId).eq("owner_user_id", ownerUserId).select(PROFILE_FIELDS).single();
    if (error) throw error;
    await audit(data.id, ownerUserId, "profile_updated", "health_profile", data.id, { fields: Object.keys(patch).filter(k => k !== "updated_at") });
    return data;
  },

  async listGrants(profileId) {
    const { data, error } = await supabase.from("health_profile_grants").select(GRANT_FIELDS)
      .eq("profile_id", profileId).order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async saveGrant({ profileId, ownerUserId, granteeUserId, grantRole, scopeKeys, expiresAt = null }) {
    const actions = grantRole === "viewer" ? ["read"] : ["read", "create", "update", "delete"];
    const { data, error } = await supabase.from("health_profile_grants").upsert({
      profile_id: profileId,
      grantee_user_id: granteeUserId,
      granted_by: ownerUserId,
      grant_role: grantRole,
      scope_keys: Array.from(new Set(["profile", ...(scopeKeys || [])])),
      actions,
      starts_at: new Date().toISOString(),
      expires_at: expiresAt,
      revoked_at: null,
      updated_at: new Date().toISOString()
    }, { onConflict: "profile_id,grantee_user_id" }).select(GRANT_FIELDS).single();
    if (error) throw error;
    await audit(profileId, ownerUserId, "grant_created", "health_profile_grant", data.id, {
      grant_role: grantRole, scope_count: data.scope_keys.length, has_expiry: !!expiresAt
    });
    return data;
  },

  async revokeGrant({ grantId, profileId, ownerUserId }) {
    const now = new Date().toISOString();
    const { data, error } = await supabase.from("health_profile_grants")
      .update({ revoked_at: now, updated_at: now })
      .eq("id", grantId).eq("profile_id", profileId).eq("granted_by", ownerUserId)
      .select(GRANT_FIELDS).single();
    if (error) throw error;
    await audit(profileId, ownerUserId, "grant_revoked", "health_profile_grant", data.id, {});
    return data;
  },


  async listConditions(profileId) { return listScoped("health_conditions", CONDITION_FIELDS, profileId); },
  async createCondition({ profileId, actorUserId, condition }) {
    const data = await insertScoped("health_conditions", CONDITION_FIELDS, { ...condition, profile_id: profileId, created_by: actorUserId });
    await auditClinical(profileId, actorUserId, "condition_created", "condition", data.id);
    return data;
  },
  async updateCondition({ profileId, actorUserId, id, patch }) {
    const data = await updateScoped("health_conditions", CONDITION_FIELDS, id, profileId, patch);
    await auditClinical(profileId, actorUserId, "condition_updated", "condition", data.id);
    return data;
  },
  async deleteCondition({ profileId, actorUserId, id }) {
    const deleted = await deleteScoped("health_conditions", id, profileId);
    await auditClinical(profileId, actorUserId, "condition_deleted", "condition", deleted.id);
    return deleted;
  },

  async listAllergies(profileId) { return listScoped("health_allergies", ALLERGY_FIELDS, profileId); },
  async createAllergy({ profileId, actorUserId, allergy }) {
    const data = await insertScoped("health_allergies", ALLERGY_FIELDS, { ...allergy, profile_id: profileId, created_by: actorUserId });
    await auditClinical(profileId, actorUserId, "allergy_created", "allergy", data.id);
    return data;
  },
  async updateAllergy({ profileId, actorUserId, id, patch }) {
    const data = await updateScoped("health_allergies", ALLERGY_FIELDS, id, profileId, patch);
    await auditClinical(profileId, actorUserId, "allergy_updated", "allergy", data.id);
    return data;
  },
  async deleteAllergy({ profileId, actorUserId, id }) {
    const deleted = await deleteScoped("health_allergies", id, profileId);
    await auditClinical(profileId, actorUserId, "allergy_deleted", "allergy", deleted.id);
    return deleted;
  },

  async listSymptomDefinitions(profileId) { return listScoped("health_symptom_definitions", SYMPTOM_FIELDS, profileId, "name"); },
  async createSymptomDefinition({ profileId, actorUserId, name, category = null }) {
    const data = await insertScoped("health_symptom_definitions", SYMPTOM_FIELDS, { profile_id: profileId, name: name.trim(), category: category?.trim() || null, created_by: actorUserId });
    await auditClinical(profileId, actorUserId, "symptom_definition_created", "symptom_definition", data.id);
    return data;
  },
  async updateSymptomDefinition({ profileId, actorUserId, id, patch }) {
    const data = await updateScoped("health_symptom_definitions", SYMPTOM_FIELDS, id, profileId, patch);
    await auditClinical(profileId, actorUserId, "symptom_definition_updated", "symptom_definition", data.id);
    return data;
  },
  async deleteSymptomDefinition({ profileId, actorUserId, id }) {
    const deleted = await deleteScoped("health_symptom_definitions", id, profileId);
    await auditClinical(profileId, actorUserId, "symptom_definition_deleted", "symptom_definition", deleted.id);
    return deleted;
  },

  async listSymptomLogs(profileId) { return listScoped("health_symptom_logs", SYMPTOM_LOG_FIELDS, profileId, "recorded_at"); },
  async createSymptomLog({ profileId, actorUserId, log }) {
    const data = await insertScoped("health_symptom_logs", SYMPTOM_LOG_FIELDS, { ...log, profile_id: profileId, created_by: actorUserId });
    await auditClinical(profileId, actorUserId, "symptom_log_created", "symptom_log", data.id);
    return data;
  },
  async updateSymptomLog({ profileId, actorUserId, id, patch }) {
    const data = await updateScoped("health_symptom_logs", SYMPTOM_LOG_FIELDS, id, profileId, patch);
    await auditClinical(profileId, actorUserId, "symptom_log_updated", "symptom_log", data.id);
    return data;
  },
  async deleteSymptomLog({ profileId, actorUserId, id }) {
    const deleted = await deleteScoped("health_symptom_logs", id, profileId);
    await auditClinical(profileId, actorUserId, "symptom_log_deleted", "symptom_log", deleted.id);
    return deleted;
  },


  async listDocuments(profileId) {
    const { data, error } = await supabase.from("health_documents").select(DOCUMENT_FIELDS).eq("profile_id", profileId).order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  },
  async uploadDocument({ profileId, actorUserId, file, displayName, documentType = "other", documentDate = null, notes = null }) {
    const extensions = { "application/pdf": ".pdf", "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp" };
    if (!file || !extensions[file.type]) throw new Error("نوع الملف غير مدعوم. استخدم PDF أو JPG أو PNG أو WEBP.");
    if (file.size < 1 || file.size > 10 * 1024 * 1024) throw new Error("حجم الملف يجب ألا يتجاوز 10 ميجابايت.");
    const title = String(displayName || "").trim();
    if (!title || title.length > 180) throw new Error("اكتب اسمًا للوثيقة لا يتجاوز 180 حرفًا.");
    const randomId = globalThis.crypto?.randomUUID?.() || (Date.now().toString(36) + Math.random().toString(36).slice(2));
    const objectPath = profileId + "/" + randomId + extensions[file.type];
    const { error: uploadError } = await supabase.storage.from("health-documents").upload(objectPath, file, { contentType: file.type, upsert: false, cacheControl: "60" });
    if (uploadError) throw uploadError;
    const payload = {
      profile_id: profileId, object_path: objectPath, display_name: title,
      original_filename: String(file.name || "document").slice(0, 255),
      document_type: documentType, document_date: documentDate || null,
      mime_type: file.type, size_bytes: file.size, notes: String(notes || "").trim() || null,
      uploaded_by: actorUserId
    };
    const { data, error } = await supabase.from("health_documents").insert(payload).select(DOCUMENT_FIELDS).single();
    if (error) {
      // Compensate if metadata registration fails after the private object upload.
      await supabase.storage.from("health-documents").remove([objectPath]);
      throw error;
    }
    await audit(profileId, actorUserId, "document_uploaded", "document", data.id, {});
    return data;
  },
  async createDocumentDownloadUrl({ objectPath, downloadName }) {
    const { data, error } = await supabase.storage.from("health-documents").createSignedUrl(objectPath, 60, { download: downloadName || true });
    if (error) throw error;
    return data?.signedUrl;
  },
  async deleteDocument({ profileId, actorUserId, document }) {
    if (!document?.id || !document?.object_path) throw new Error("الوثيقة غير صالحة للحذف.");
    const { error: storageError } = await supabase.storage.from("health-documents").remove([document.object_path]);
    if (storageError) throw storageError;
    const { data, error } = await supabase.from("health_documents").delete().eq("id", document.id).eq("profile_id", profileId).select("id").single();
    if (error) throw error;
    await audit(profileId, actorUserId, "document_deleted", "document", data.id, {});
    return data;
  },

  async listAuditEvents(profileId) {
    const { data, error } = await supabase.from("health_audit_events")
      .select("id,actor_user_id,action,resource_type,resource_id,metadata,created_at")
      .eq("profile_id", profileId).order("created_at", { ascending: false }).limit(50);
    if (error) throw error;
    return data || [];
  }
};
