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
const MEDICATION_FIELDS = "id,profile_id,name,brand,medication_type,status,instructions,prescribed_by,start_date,end_date,created_by,created_at,updated_at";
const MEDICATION_VERSION_FIELDS = "id,profile_id,medication_id,version_no,dose_amount,dose_unit,route,frequency,schedule_times,effective_from,instructions,created_by,created_at";
const MEDICATION_EVENT_FIELDS = "id,profile_id,medication_id,medication_version_id,event_status,scheduled_for,occurred_at,dose_amount,dose_unit,medication_name_snapshot,notes,created_by,created_at,updated_at";
const SIDE_EFFECT_FIELDS = "id,profile_id,medication_id,medication_event_id,name,severity,occurred_at,notes,created_by,created_at,updated_at";
const FLARE_FIELDS = "id,profile_id,title,status,severity,started_at,ended_at,symptoms,suspected_triggers,relief_actions,notes,created_by,created_at,updated_at";
const REMINDER_FIELDS = "id,profile_id,medication_id,medication_version_id,remind_at,status,completed_at,linked_event_id,created_by,created_at,updated_at";

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
    const rows=data||[];
    if(!rows.length)return rows;
    // Cycle preference is fetched from an owner-only table; it is never exposed on shareable profile rows.
    const { data: cycleSettings, error: cycleError } = await supabase.from("health_cycle_settings")
      .select("profile_id,enabled").in("profile_id",rows.map(row=>row.id));
    if(cycleError)throw cycleError;
    const enabledByProfile=new Map((cycleSettings||[]).map(row=>[row.profile_id,!!row.enabled]));
    return rows.map(row=>({...row,cycle_tracking_enabled:enabledByProfile.get(row.id)===true}));
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


  async listMedications(profileId) { return listScoped("health_medications", MEDICATION_FIELDS, profileId); },
  async listMedicationVersions(profileId) { return listScoped("health_medication_versions", MEDICATION_VERSION_FIELDS, profileId, "version_no"); },
  async listMedicationEvents(profileId) { return listScoped("health_medication_events", MEDICATION_EVENT_FIELDS, profileId, "created_at"); },
  async listMedicationSideEffects(profileId) { return listScoped("health_medication_side_effects", SIDE_EFFECT_FIELDS, profileId, "occurred_at"); },
  async listMedicationReminders(profileId) { return listScoped("health_medication_reminders", REMINDER_FIELDS, profileId, "remind_at"); },
  async createMedication({ profileId, actorUserId, medication, version }) {
    const row = await insertScoped("health_medications", MEDICATION_FIELDS, { ...medication, profile_id: profileId, created_by: actorUserId });
    let dose;
    try {
      dose = await insertScoped("health_medication_versions", MEDICATION_VERSION_FIELDS, {
        ...version, profile_id: profileId, medication_id: row.id, version_no: 1, created_by: actorUserId
      });
    } catch (error) {
      await supabase.from("health_medications").delete().eq("id", row.id).eq("profile_id", profileId);
      throw error;
    }
    await auditClinical(profileId, actorUserId, "medication_created", "medication", row.id);
    await auditClinical(profileId, actorUserId, "medication_version_created", "medication_version", dose.id);
    return { medication: row, version: dose };
  },
  async updateMedication({ profileId, actorUserId, id, patch }) {
    const row = await updateScoped("health_medications", MEDICATION_FIELDS, id, profileId, patch);
    await auditClinical(profileId, actorUserId, "medication_updated", "medication", row.id);
    return row;
  },
  async createMedicationVersion({ profileId, actorUserId, medicationId, version }) {
    const { data: previous, error: listError } = await supabase.from("health_medication_versions").select("version_no")
      .eq("profile_id", profileId).eq("medication_id", medicationId).order("version_no", { ascending: false }).limit(1);
    if (listError) throw listError;
    const nextVersion = Number(previous?.[0]?.version_no || 0) + 1;
    const row = await insertScoped("health_medication_versions", MEDICATION_VERSION_FIELDS, {
      ...version, profile_id: profileId, medication_id: medicationId, version_no: nextVersion, created_by: actorUserId
    });
    await auditClinical(profileId, actorUserId, "medication_version_created", "medication_version", row.id);
    return row;
  },
  async createMedicationEvent({ profileId, actorUserId, event }) {
    const row = await insertScoped("health_medication_events", MEDICATION_EVENT_FIELDS, { ...event, profile_id: profileId, created_by: actorUserId });
    await auditClinical(profileId, actorUserId, "medication_event_created", "medication_event", row.id);
    return row;
  },
  async updateMedicationEvent({ profileId, actorUserId, id, patch }) {
    const row = await updateScoped("health_medication_events", MEDICATION_EVENT_FIELDS, id, profileId, patch);
    await auditClinical(profileId, actorUserId, "medication_event_updated", "medication_event", row.id);
    return row;
  },
  async deleteMedicationEvent({ profileId, actorUserId, id }) {
    const row = await deleteScoped("health_medication_events", id, profileId);
    await auditClinical(profileId, actorUserId, "medication_event_deleted", "medication_event", row.id);
    return row;
  },
  async createMedicationSideEffect({ profileId, actorUserId, sideEffect }) {
    const row = await insertScoped("health_medication_side_effects", SIDE_EFFECT_FIELDS, { ...sideEffect, profile_id: profileId, created_by: actorUserId });
    await auditClinical(profileId, actorUserId, "medication_side_effect_created", "medication_side_effect", row.id);
    return row;
  },
  async updateMedicationSideEffect({ profileId, actorUserId, id, patch }) {
    const row = await updateScoped("health_medication_side_effects", SIDE_EFFECT_FIELDS, id, profileId, patch);
    await auditClinical(profileId, actorUserId, "medication_side_effect_updated", "medication_side_effect", row.id);
    return row;
  },
  async deleteMedicationSideEffect({ profileId, actorUserId, id }) {
    const row = await deleteScoped("health_medication_side_effects", id, profileId);
    await auditClinical(profileId, actorUserId, "medication_side_effect_deleted", "medication_side_effect", row.id);
    return row;
  },
  async createMedicationReminder({ profileId, actorUserId, reminder }) {
    const row = await insertScoped("health_medication_reminders", REMINDER_FIELDS, { ...reminder, profile_id: profileId, created_by: actorUserId });
    await auditClinical(profileId, actorUserId, "medication_reminder_created", "medication_reminder", row.id);
    return row;
  },
  async updateMedicationReminder({ profileId, actorUserId, id, patch }) {
    const row = await updateScoped("health_medication_reminders", REMINDER_FIELDS, id, profileId, patch);
    await auditClinical(profileId, actorUserId, "medication_reminder_updated", "medication_reminder", row.id);
    return row;
  },
  async deleteMedicationReminder({ profileId, actorUserId, id }) {
    const row = await deleteScoped("health_medication_reminders", id, profileId);
    await auditClinical(profileId, actorUserId, "medication_reminder_deleted", "medication_reminder", row.id);
    return row;
  },
  async listFlareEvents(profileId) { return listScoped("health_flare_events", FLARE_FIELDS, profileId, "started_at"); },
  async createFlareEvent({ profileId, actorUserId, flare }) {
    const row = await insertScoped("health_flare_events", FLARE_FIELDS, { ...flare, profile_id: profileId, created_by: actorUserId });
    await auditClinical(profileId, actorUserId, "flare_event_created", "flare_event", row.id);
    return row;
  },
  async updateFlareEvent({ profileId, actorUserId, id, patch }) {
    const row = await updateScoped("health_flare_events", FLARE_FIELDS, id, profileId, patch);
    await auditClinical(profileId, actorUserId, "flare_event_updated", "flare_event", row.id);
    return row;
  },
  async deleteFlareEvent({ profileId, actorUserId, id }) {
    const row = await deleteScoped("health_flare_events", id, profileId);
    await auditClinical(profileId, actorUserId, "flare_event_deleted", "flare_event", row.id);
    return row;
  },


  async listDailyCheckins(profileId) { return listScoped("health_daily_checkins", "id,profile_id,entry_date,mood_score,energy_score,stress_score,sleep_hours,sleep_quality,digestion_status,digestion_severity,notes,recorded_at,created_by,created_at,updated_at", profileId, "entry_date"); },
  async upsertDailyCheckin({ profileId, actorUserId, checkin }) {
    const { data: previous, error: findError } = await supabase.from("health_daily_checkins").select("id")
      .eq("profile_id", profileId).eq("entry_date", checkin.entry_date).maybeSingle();
    if (findError) throw findError;
    const payload = { ...checkin, profile_id: profileId, created_by: actorUserId, updated_at: new Date().toISOString() };
    const { data, error } = await supabase.from("health_daily_checkins").upsert(payload, { onConflict: "profile_id,entry_date" })
      .select("id,profile_id,entry_date,mood_score,energy_score,stress_score,sleep_hours,sleep_quality,digestion_status,digestion_severity,notes,recorded_at,created_by,created_at,updated_at").single();
    if (error) throw error;
    await auditClinical(profileId, actorUserId, previous ? "daily_checkin_updated" : "daily_checkin_created", "daily_checkin", data.id);
    return data;
  },
  async deleteDailyCheckin({ profileId, actorUserId, id }) {
    const row = await deleteScoped("health_daily_checkins", id, profileId);
    await auditClinical(profileId, actorUserId, "daily_checkin_deleted", "daily_checkin", row.id);
    return row;
  },

  async listFactors(profileId) { return listScoped("health_factors", "id,profile_id,name,category,value_type,unit,scale_min,scale_max,choice_options,is_sensitive,status,created_by,created_at,updated_at", profileId); },
  async createFactor({ profileId, actorUserId, factor }) {
    const row = await insertScoped("health_factors", "id,profile_id,name,category,value_type,unit,scale_min,scale_max,choice_options,is_sensitive,status,created_by,created_at,updated_at",
      { ...factor, profile_id: profileId, created_by: actorUserId });
    await auditClinical(profileId, actorUserId, "health_factor_created", "health_factor", row.id);
    return row;
  },
  async updateFactor({ profileId, actorUserId, id, patch }) {
    const row = await updateScoped("health_factors", "id,profile_id,name,category,value_type,unit,scale_min,scale_max,choice_options,is_sensitive,status,created_by,created_at,updated_at", id, profileId, patch);
    await auditClinical(profileId, actorUserId, "health_factor_updated", "health_factor", row.id);
    return row;
  },
  async listFactorLogs(profileId) { return listScoped("health_factor_logs", "id,profile_id,factor_id,recorded_at,value_numeric,value_boolean,value_text,value_choice,notes,created_by,created_at,updated_at", profileId, "recorded_at"); },
  async createFactorLog({ profileId, actorUserId, log }) {
    const row = await insertScoped("health_factor_logs", "id,profile_id,factor_id,recorded_at,value_numeric,value_boolean,value_text,value_choice,notes,created_by,created_at,updated_at",
      { ...log, profile_id: profileId, created_by: actorUserId });
    await auditClinical(profileId, actorUserId, "health_factor_log_created", "health_factor_log", row.id);
    return row;
  },
  async updateFactorLog({ profileId, actorUserId, id, patch }) {
    const row = await updateScoped("health_factor_logs", "id,profile_id,factor_id,recorded_at,value_numeric,value_boolean,value_text,value_choice,notes,created_by,created_at,updated_at", id, profileId, patch);
    await auditClinical(profileId, actorUserId, "health_factor_log_updated", "health_factor_log", row.id);
    return row;
  },
  async deleteFactorLog({ profileId, actorUserId, id }) {
    const row = await deleteScoped("health_factor_logs", id, profileId);
    await auditClinical(profileId, actorUserId, "health_factor_log_deleted", "health_factor_log", row.id);
    return row;
  },
  async updateCycleTrackingPreference({ profileId, ownerUserId, enabled }) {
    const { data, error } = await supabase.from("health_cycle_settings").upsert({
      profile_id: profileId, enabled: !!enabled, created_by: ownerUserId, updated_at: new Date().toISOString()
    }, { onConflict: "profile_id" }).select("profile_id,enabled").single();
    if (error) throw error;
    await audit(profileId, ownerUserId, enabled ? "cycle_tracking_enabled" : "cycle_tracking_disabled", "cycle_settings", profileId, {});
    return !!data.enabled;
  },
  async listCycleEntries(profileId) { return listScoped("health_cycle_entries", "id,profile_id,entry_date,flow_intensity,period_start,period_end,symptoms,notes,created_by,created_at,updated_at", profileId, "entry_date"); },
  async upsertCycleEntry({ profileId, actorUserId, entry }) {
    const { data: previous, error: findError } = await supabase.from("health_cycle_entries").select("id")
      .eq("profile_id", profileId).eq("entry_date", entry.entry_date).maybeSingle();
    if (findError) throw findError;
    const payload = { ...entry, profile_id: profileId, created_by: actorUserId, updated_at: new Date().toISOString() };
    const { data, error } = await supabase.from("health_cycle_entries").upsert(payload, { onConflict: "profile_id,entry_date" })
      .select("id,profile_id,entry_date,flow_intensity,period_start,period_end,symptoms,notes,created_by,created_at,updated_at").single();
    if (error) throw error;
    await audit(profileId, actorUserId, previous ? "cycle_entry_updated" : "cycle_entry_created", "cycle_entry", data.id, {});
    return data;
  },
  async deleteCycleEntry({ profileId, actorUserId, id }) {
    const row = await deleteScoped("health_cycle_entries", id, profileId);
    await audit(profileId, actorUserId, "cycle_entry_deleted", "cycle_entry", row.id, {});
    return row;
  },

  async listAuditEvents(profileId) {
    const { data, error } = await supabase.from("health_audit_events")
      .select("id,actor_user_id,action,resource_type,resource_id,metadata,created_at")
      .eq("profile_id", profileId).order("created_at", { ascending: false }).limit(50);
    if (error) throw error;
    return data || [];
  }
};
