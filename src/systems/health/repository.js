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

  async listAuditEvents(profileId) {
    const { data, error } = await supabase.from("health_audit_events")
      .select("id,actor_user_id,action,resource_type,resource_id,metadata,created_at")
      .eq("profile_id", profileId).order("created_at", { ascending: false }).limit(50);
    if (error) throw error;
    return data || [];
  }
};
