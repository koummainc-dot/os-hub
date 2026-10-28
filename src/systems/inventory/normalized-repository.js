import { planInventoryAggregateMigration } from "./migration-plan.js";

const list = (value) => Array.isArray(value) ? value : [];
const camelDate = (v) => v ? String(v).slice(0, 10) : "";
const camelStamp = (v) => v || "";
const mapRows = (snapshot) => snapshot?.tables && typeof snapshot.tables === "object" ? snapshot.tables : {};

function requireUuid() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  throw new Error("Secure UUID generation is unavailable; cannot create a stable Inventory migration mapping.");
}
function makeIdResolver(map) {
  return (oldId, entityType) => {
    const key = `${entityType || "entity"}:${String(oldId)}`;
    if (map[key]) return map[key];
    map[key] = requireUuid();
    return map[key];
  };
}

/** Build a dry-run normalized payload. This function performs no network or DB writes. */
export function buildNormalizedInventorySnapshot(aggregate, workspaceId) {
  const source = aggregate && typeof aggregate === "object" ? aggregate : {};
  const settings = source.settings && typeof source.settings === "object" ? source.settings : {};
  const idMap = { ...(settings._inventoryIdMap || {}) };
  const resolveId = makeIdResolver(idMap);
  const plan = planInventoryAggregateMigration(source, {
    workspaceId,
    resolveId
  });
  if (!plan.safeToApply) {
    const error = new Error("Inventory migration is blocked; resolve the reported data issues before saving normalized tables.");
    error.code = "INVENTORY_MIGRATION_BLOCKED";
    error.blockers = plan.blockers;
    error.warnings = plan.warnings;
    throw error;
  }
  const tables = { ...plan.tables };
  const oldSettings = tables.inventory_settings[0];
  if (oldSettings) {
    tables.inventory_settings = [{
      ...oldSettings,
      created_at: new Date().toISOString(),
      preferences: {
        ...(oldSettings.preferences || {}),
        normalized_storage_version: 1,
        inventory_id_map: idMap
      }
    }];
  }
  return { snapshot: { schema_version: 1, tables }, idMap, plan };
}

/** Convert normalized rows back into the aggregate shape consumed by the current UI. */
export function normalizedInventorySnapshotToAggregate(snapshot, normalize) {
  const t = mapRows(snapshot);
  const settingsRow = list(t.inventory_settings)[0] || {};
  const preferences = settingsRow.preferences && typeof settingsRow.preferences === "object" ? settingsRow.preferences : {};
  const idMap = preferences.inventory_id_map || {};
  const settings = {
    currency: settingsRow.default_currency || "EGP",
    timezone: settingsRow.timezone || "Africa/Cairo",
    warrantyReminderDays: list(settingsRow.warranty_reminder_days).length ? settingsRow.warranty_reminder_days : [30, 7, 1],
    _inventoryIdMap: idMap
  };
  const common = (r) => ({
    createdAt: camelStamp(r.created_at), updatedAt: camelStamp(r.updated_at),
    deletedAt: camelDate(r.deleted_at), sensitivity: r.sensitivity || "Normal"
  });
  const categories = list(t.inventory_categories).map(r => ({
    ...common(r), id: r.id, name: r.name, description: r.description || "",
    parentId: r.parent_id || "", icon: r.icon || "", color: r.color || "",
    sortOrder: r.sort_order ?? 0, isSystem: !!r.is_system
  }));
  const places = list(t.inventory_locations).map(r => ({
    ...common(r), id: r.id, name: r.name, type: r.location_type || "Other",
    parentId: r.parent_id || "", description: r.description || "", notes: r.notes || "",
    privacyLevel: r.privacy_level || "Normal"
  }));
  const items = list(t.inventory_items).map(r => ({
    ...common(r), id: r.id, name: r.name, description: r.description || "",
    categoryId: r.category_id || "", placeId: r.current_location_id || "",
    condition: r.condition || "Good", status: r.ownership_status || "Owned",
    quantity: r.quantity === null ? "" : String(r.quantity ?? ""),
    quantityUnit: r.quantity_unit || "", brand: r.brand || "", model: r.model || "",
    manufacturer: r.manufacturer || "", purchaseDate: camelDate(r.purchase_date),
    purchasePrice: r.purchase_price === null ? "" : String(r.purchase_price ?? ""),
    currency: r.purchase_currency || settings.currency,
    estimatedValue: r.estimated_current_value === null ? "" : String(r.estimated_current_value ?? ""),
    estimatedValueCurrency: r.estimated_value_currency || "",
    sensitivity: r.sensitivity || "Normal", notes: r.notes || ""
  }));
  const warranties = list(t.inventory_warranties).map(r => ({
    ...common(r), id: r.id, itemId: r.item_id, provider: r.provider_name || "",
    warrantyType: r.warranty_type || "Manufacturer", startDate: camelDate(r.start_date),
    endDate: camelDate(r.end_date), policyNumber: r.policy_number || "", notes: r.notes || ""
  }));
  const loans = list(t.inventory_loans).map(r => ({
    ...common(r), id: r.id, itemId: r.item_id, direction: r.loan_direction || "Lent",
    person: r.person_ref_snapshot || {}, loanedAt: camelDate(r.loaned_at),
    dueDate: camelDate(r.due_date), returnedAt: camelDate(r.returned_at),
    status: r.status || "Open", notes: r.notes || ""
  }));
  const replacements = list(t.inventory_replacement_plans).map(r => ({
    ...common(r), id: r.id, itemId: r.item_id, expectedDate: camelDate(r.expected_replacement_date),
    reason: r.reason || "", budget: r.budget === null ? "" : String(r.budget ?? ""),
    currency: r.currency || settings.currency, status: r.status || "Planned", notes: r.notes || ""
  }));
  const services = list(t.inventory_service_logs).map(r => ({
    ...common(r), id: r.id, itemId: r.item_id, serviceDate: camelDate(r.service_date),
    serviceType: r.service_type || "Other", provider: r.provider_name || "",
    cost: r.cost === null ? "" : String(r.cost ?? ""), currency: r.currency || settings.currency,
    nextDueDate: camelDate(r.next_due_date), notes: r.notes || ""
  }));
  const events = list(t.inventory_ownership_events).map(r => ({
    id: r.id, itemId: r.item_id, type: r.event_type, date: camelDate(r.occurred_at),
    fromLocationId: r.from_location_id || "", toLocationId: r.to_location_id || "",
    note: r.event_note || "", sensitivity: r.sensitivity || "Normal", createdAt: camelStamp(r.created_at)
  }));
  // Legacy non-ownership events are retained in the append-only audit stream.
  for (const r of list(t.inventory_audit_log)) {
    const metadata = r.metadata && typeof r.metadata === "object" ? r.metadata : {};
    events.push({
      id: metadata.legacy_event_id || `audit-${r.id}`,
      itemId: (metadata.legacy_item_id && idMap[`item:${metadata.legacy_item_id}`]) || metadata.legacy_item_id || (r.entity_type === "item" ? r.entity_id : null),
      entityType: r.entity_type, entityId: r.entity_id, type: r.action || "LegacyEvent",
      date: camelDate(r.occurred_at), note: metadata.note || "", sensitivity: r.sensitivity || "Normal",
      createdAt: camelStamp(r.occurred_at)
    });
  }
  const aggregate = {
    schemaVersion: 1, items, categories, places, warranties, loans, replacements, services, events,
    settings, _normalizedStorage: true
  };
  return typeof normalize === "function" ? normalize(aggregate) : aggregate;
}

/**
 * Repository wrapper. It uses normalized tables only after the server confirms that
 * this workspace has been migrated. Until then it keeps the aggregate adapter as the
 * source of truth and prepares an ID-stable first write when the RPC is available.
 */
export function createNormalizedInventoryRepository(api, normalize) {
  if (!api || typeof api.load !== "function" || typeof api.save !== "function") {
    throw new Error("Inventory repository requires load/save API methods.");
  }
  let normalizedActive = false;
  const legacyRepository = async () => {
    const result = await api.load();
    if (!result || typeof result !== "object" || !result.data || typeof result.data !== "object") return result;
    return { ...result, data: normalize(result.data) };
  };
  return Object.freeze({
    async load() {
      if (typeof api.loadNormalizedInventory === "function") {
        const result = await api.loadNormalizedInventory();
        if (result?.available && result.error) throw result.error;
        const tables = result?.data?.tables || {};
        const setting = list(tables.inventory_settings)[0];
        const prefs = setting?.preferences || {};
        if (result?.available && prefs.normalized_storage_version === 1) {
          normalizedActive = true;
          return {
            data: normalizedInventorySnapshotToAggregate(result.data, normalize),
            source: "normalized",
            updatedAt: setting.updated_at || null,
            error: null
          };
        }
      }
      normalizedActive = false;
      return legacyRepository();
    },
    async save(valueToSave) {
      const aggregate = normalize(valueToSave);
      const requiredArrays = ["items", "categories", "places", "warranties", "loans", "replacements", "events", "services"];
      for (const key of requiredArrays) if (!Array.isArray(aggregate[key])) throw new Error(`Invalid Inventory data: ${key} must be an array.`);
      if (!aggregate.settings || typeof aggregate.settings !== "object") throw new Error("Invalid Inventory data: settings must be an object.");

      if (typeof api.saveNormalizedInventory !== "function") return api.save(aggregate);
      const existing = await api.loadNormalizedInventory();
      if (!existing?.available) return api.save(aggregate);
      if (existing.error) return { ok: false, conflict: false, error: existing.error, updatedAt: null };
      const marker = list(existing.data?.tables?.inventory_settings)[0]?.preferences?.normalized_storage_version;
      if (normalizedActive || marker === 1) {
        const built = buildNormalizedInventorySnapshot(aggregate, api.workspaceId);
        const result = await api.saveNormalizedInventory(built.snapshot);
        if (!result?.available) return api.save(aggregate);
        if (!result.ok) return { ok: false, conflict: false, error: result.error, updatedAt: null };
        normalizedActive = true;
        return { ok: true, conflict: false, updatedAt: result.updatedAt || null };
      }

      const built = buildNormalizedInventorySnapshot(aggregate, api.workspaceId);
      // Persist the mapping first, so a retry after a network interruption reuses IDs.
      const legacyResult = await api.save({ ...aggregate, settings: { ...aggregate.settings, _inventoryIdMap: built.idMap } });
      if (legacyResult?.ok === false) return legacyResult;
      const result = await api.saveNormalizedInventory(built.snapshot);
      if (!result?.available || !result.ok) {
        return { ok: false, conflict: false, error: result?.error || new Error("Normalized Inventory storage is unavailable."), updatedAt: null };
      }
      normalizedActive = true;
      return { ok: true, conflict: false, updatedAt: result.updatedAt || null };
    }
  });
}
