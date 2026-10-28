// Dry-run mapper from the legacy Inventory workspace_data aggregate to P0/P1 rows.
// This module NEVER writes to the database. Supply a deterministic UUID resolver for
// legacy IDs that are not UUIDs; persist its mapping separately before any migration.
const OWNERSHIP_EVENTS = new Set(["Acquired", "Moved", "Loaned", "Returned", "Sold", "Disposed", "Lost", "Found", "Corrected"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const rows = (value) => Array.isArray(value) ? value : [];
const text = (value) => value === null || value === undefined || value === "" ? null : String(value);
const date = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const s = String(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
};
const amount = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const s = String(value).trim();
  return /^\d+(\.\d{1,4})?$/.test(s) ? s : null; // decimal string; never JS float
};
const privacy = (value, fallback = "Normal") => ["Normal", "Sensitive", "Secret"].includes(value) ? value : fallback;
const currency = (value) => /^[A-Z]{3}$/.test(String(value || "")) ? String(value) : null;
const slugify = (value) => {
  const slug = String(value || "").trim().toLocaleLowerCase("en")
    .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 120);
  return slug || "category";
};
const stamp = (value) => {
  const s = String(value || "");
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return s;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s + "T12:00:00.000Z";
  return null;
};

/**
 * Build a deterministic, non-writing migration plan.
 * options.resolveId(oldId, entityType) must return a UUID. Existing UUIDs are preserved.
 * options.workspaceId must be a UUID. Invalid/unresolved IDs create blockers, never guessed IDs.
 */
export function planInventoryAggregateMigration(aggregate, options = {}) {
  const source = aggregate && typeof aggregate === "object" ? aggregate : {};
  const workspaceId = String(options.workspaceId || "");
  const blockers = [];
  const warnings = [];
  const tables = {
    inventory_settings: [], inventory_categories: [], inventory_locations: [],
    inventory_items: [], inventory_ownership_events: [], inventory_warranties: [],
    inventory_loans: [], inventory_replacement_plans: [], inventory_service_logs: [],
    inventory_audit_log: []
  };
  if (!UUID.test(workspaceId)) blockers.push({ code: "INVALID_WORKSPACE_UUID", detail: "workspaceId must be a UUID." });
  const resolveId = (oldId, entityType) => {
    if (oldId === null || oldId === undefined || oldId === "") {
      blockers.push({ code: "MISSING_LEGACY_ID", entityType, oldId: null });
      return null;
    }
    const original = String(oldId);
    let resolved = original;
    if (!UUID.test(resolved) && typeof options.resolveId === "function") {
      try { resolved = options.resolveId(original, entityType); } catch { resolved = null; }
    }
    if (!UUID.test(String(resolved || ""))) {
      blockers.push({ code: "UNRESOLVED_LEGACY_ID", entityType, oldId: original, detail: "Provide a stable UUID mapping; do not generate a fresh random ID per run." });
      return null;
    }
    return String(resolved).toLowerCase();
  };
  const idMaps = {
    category: new Map(), place: new Map(), item: new Map(),
    warranty: new Map(), loan: new Map(), replacement: new Map(), service: new Map()
  };
  const mapRows = (key, type, list) => rows(list).map((r, i) => {
    const id = resolveId(r?.id, type);
    if (id) idMaps[type].set(String(r.id), id);
    else warnings.push({ code: "ROW_WITHOUT_RESOLVED_ID", entityType: type, index: i });
    return { source: r || {}, id };
  });

  const categories = mapRows("categories", "category", source.categories);
  const places = mapRows("places", "place", source.places);
  const items = mapRows("items", "item", source.items);
  const warranties = mapRows("warranties", "warranty", source.warranties);
  const loans = mapRows("loans", "loan", source.loans);
  const replacements = mapRows("replacements", "replacement", source.replacements);
  const services = mapRows("services", "service", source.services);
  const ref = (map, oldId, label) => {
    if (oldId === null || oldId === undefined || oldId === "") return null;
    const resolved = map.get(String(oldId));
    if (!resolved) blockers.push({ code: "UNRESOLVED_REFERENCE", reference: label, oldId: String(oldId), detail: "Resolve the referenced row or explicitly repair the legacy relation before applying." });
    return resolved || null;
  };
  const base = (r, id) => ({
    id, workspace_id: workspaceId,
    created_at: stamp(r.createdAt) || undefined,
    updated_at: stamp(r.updatedAt) || stamp(r.createdAt) || undefined,
    deleted_at: date(r.deletedAt),
    is_demo: r.isDemo === true
  });
  const userStamp = (r) => ({ ...base(r, null), id: undefined, workspace_id: undefined }); // timestamps only

  if (UUID.test(workspaceId)) {
    const setting = source.settings && typeof source.settings === "object" ? source.settings : {};
    const reminderDays = rows(setting.warrantyReminderDays).map(Number).filter(n => Number.isInteger(n) && n >= 0 && n <= 3650);
    tables.inventory_settings.push({
      workspace_id: workspaceId,
      default_currency: currency(setting.currency) || "EGP",
      timezone: text(setting.timezone) || "Africa/Cairo",
      warranty_reminder_days: reminderDays.length ? [...new Set(reminderDays)] : [30, 7, 1],
      preferences: { legacy_schema_version: Number(source.schemaVersion) || 1 }
    });
  }

  for (const { source: r, id } of categories) if (id) {
    const name = String(r.name || "").trim();
    if (!name) { blockers.push({ code: "EMPTY_CATEGORY_NAME", oldId: r.id }); continue; }
    tables.inventory_categories.push({
      ...base(r, id), name: name.slice(0, 120),
      slug: slugify(r.slug || name) + (categories.filter(x => x.source !== r && slugify(x.source.slug || x.source.name) === slugify(r.slug || name)).length ? "-" + id.slice(0, 8) : ""),
      description: text(r.description), parent_id: ref(idMaps.category, r.parentId, "category.parentId"),
      icon: text(r.icon), color: text(r.color), sort_order: Number.isInteger(r.sortOrder) ? r.sortOrder : 0,
      is_system: r.isSystem === true, version: 1
    });
  }
  for (const { source: r, id } of places) if (id) {
    if (!String(r.name || "").trim()) { blockers.push({ code: "EMPTY_PLACE_NAME", oldId: r.id }); continue; }
    const typeMap = { Home: "Home", Room: "Room", Storage: "Storage", Vehicle: "Vehicle", Workplace: "Workplace", External: "External" };
    tables.inventory_locations.push({
      ...base(r, id), name: String(r.name).trim().slice(0, 160),
      location_type: typeMap[r.type] || "Other", parent_id: ref(idMaps.place, r.parentId, "place.parentId"),
      description: text(r.description), privacy_level: privacy(r.sensitivity || r.privacyLevel),
      notes: text(r.notes), version: 1
    });
  }
  for (const { source: r, id } of items) if (id) {
    if (!String(r.name || "").trim()) { blockers.push({ code: "EMPTY_ITEM_NAME", oldId: r.id }); continue; }
    const condition = ["New", "Good", "Fair", "Poor", "Damaged"].includes(r.condition) ? r.condition : "Good";
    const status = ["Owned", "Loaned", "Sold", "Disposed", "Lost"].includes(r.status) ? r.status : "Owned";
    const q = r.quantity === "" || r.quantity === undefined ? null : amount(r.quantity);
    const p = amount(r.purchasePrice), v = amount(r.estimatedValue);
    if (r.quantity !== null && r.quantity !== undefined && r.quantity !== "" && q === null) blockers.push({ code: "INVALID_QUANTITY", oldId: r.id });
    if (r.purchasePrice !== null && r.purchasePrice !== undefined && r.purchasePrice !== "" && p === null) blockers.push({ code: "INVALID_PURCHASE_AMOUNT", oldId: r.id });
    if (r.estimatedValue !== null && r.estimatedValue !== undefined && r.estimatedValue !== "" && v === null) blockers.push({ code: "INVALID_ESTIMATED_AMOUNT", oldId: r.id });
    tables.inventory_items.push({
      ...base(r, id), name: String(r.name).trim().slice(0, 200),
      description: text(r.description), item_kind: "Asset",
      category_id: ref(idMaps.category, r.categoryId, "item.categoryId"),
      current_location_id: ref(idMaps.place, r.placeId, "item.placeId"),
      condition, ownership_status: status, quantity: q,
      quantity_unit: text(r.quantityUnit), brand: text(r.brand), model: text(r.model),
      manufacturer: text(r.manufacturer), purchase_date: date(r.purchaseDate),
      purchase_price: p, purchase_currency: currency(r.currency || source.settings?.currency),
      estimated_current_value: v, estimated_value_currency: v === null ? null : currency(r.estimatedValueCurrency || r.currency || source.settings?.currency),
      sensitivity: privacy(r.sensitivity), notes: text(r.notes), version: 1,
      person_ref_state: "Missing", person_ref_snapshot: {}
    });
  }

  const ownership = [];
  const audit = [];
  for (const r of rows(source.events)) {
    const itemId = ref(idMaps.item, r.itemId, "event.itemId");
    const eventType = String(r.type || "");
    const occurred = stamp(r.date || r.createdAt);
    if (OWNERSHIP_EVENTS.has(eventType) && itemId) {
      if (!occurred) blockers.push({ code: "OWNERSHIP_EVENT_DATE_UNKNOWN", oldId: text(r.id), detail: "An ownership-history date is required; do not invent a historical timestamp." });
      ownership.push({
        id: resolveId(r.id, "ownership_event"), workspace_id: workspaceId, item_id: itemId,
        event_type: eventType, occurred_at: occurred || undefined,
        from_location_id: ref(idMaps.place, r.fromLocationId, "event.fromLocationId"),
        to_location_id: ref(idMaps.place, r.toLocationId, "event.toLocationId"),
        person_ref_snapshot: r.person && typeof r.person === "object" ? r.person : (r.person ? { name: String(r.person) } : {}),
        event_note: text(r.note), source_system: "inventory_aggregate",
        source_ref_id: text(r.id), sensitivity: privacy(r.sensitivity || items.find(x => x.id === itemId)?.source?.sensitivity)
      });
    } else {
      // Non-ownership events are retained in the audit stream instead of being
      // forced into the narrower append-only ownership-event enum.
      const entityType = text(r.entityType) || "item";
      const rawEntityId = r.entityId || r.itemId;
      const entityId = rawEntityId ? resolveId(rawEntityId, entityType) : null;
      audit.push({
        workspace_id: workspaceId, action: (eventType || "LegacyEvent").slice(0, 100),
        entity_type: entityType.slice(0, 80), entity_id: entityId,
        occurred_at: occurred || undefined,
        metadata: { legacy_event_id: text(r.id), note: text(r.note), legacy_item_id: text(r.itemId), source: "inventory_aggregate" },
        sensitivity: privacy(r.sensitivity || "Normal"), is_demo: false
      });
      warnings.push({ code: "EVENT_ROUTED_TO_AUDIT", eventType: eventType || "unknown", oldId: text(r.id) });
    }
  }
  tables.inventory_ownership_events = ownership;
  tables.inventory_audit_log = audit;

  for (const { source: r, id } of warranties) if (id) {
    const itemId = ref(idMaps.item, r.itemId, "warranty.itemId");
    if (!itemId) { blockers.push({ code: "WARRANTY_ITEM_REQUIRED", oldId: r.id }); continue; }
    tables.inventory_warranties.push({
      ...base(r, id), item_id: itemId, provider_name: text(r.provider || r.providerName),
      warranty_type: ["Manufacturer", "Seller", "Extended", "ServicePlan", "Other"].includes(r.warrantyType) ? r.warrantyType : "Manufacturer",
      start_date: date(r.startDate), end_date: date(r.endDate), policy_number: text(r.policyNumber),
      reminder_days: reminderDaysOrDefault(source.settings?.warrantyReminderDays),
      notes: text(r.notes), sensitivity: privacy(r.sensitivity, "Sensitive"),
      document_ref_state: "Missing", document_ref_snapshot: {}, version: 1
    });
  }
  for (const { source: r, id } of loans) if (id) {
    const itemId = ref(idMaps.item, r.itemId, "loan.itemId");
    if (!itemId) { blockers.push({ code: "LOAN_ITEM_REQUIRED", oldId: r.id }); continue; }
    const direction = r.direction === "Borrowed" ? "Borrowed" : "Lent";
    const returnedAt = date(r.returnedAt);
    if (!date(r.loanedAt) && !date(r.createdAt)) blockers.push({ code: "LOAN_DATE_UNKNOWN", oldId: r.id, detail: "Do not invent a historical loan date; review before applying." });
    tables.inventory_loans.push({
      ...base(r, id), item_id: itemId, loan_direction: direction,
      person_ref_snapshot: r.person && typeof r.person === "object" ? r.person : (r.person ? { name: String(r.person) } : {}),
      person_ref_state: "Missing", loaned_at: date(r.loanedAt) || date(r.createdAt) || undefined,
      due_date: date(r.dueDate), returned_at: returnedAt,
      status: returnedAt || r.status === "Returned" ? "Returned" : ["Overdue", "Lost", "Cancelled"].includes(r.status) ? r.status : "Open",
      notes: text(r.notes), sensitivity: privacy(r.sensitivity, "Sensitive"), version: 1
    });
  }
  for (const { source: r, id } of replacements) if (id) {
    const itemId = ref(idMaps.item, r.itemId, "replacement.itemId");
    if (!itemId) { blockers.push({ code: "REPLACEMENT_ITEM_REQUIRED", oldId: r.id }); continue; }
    tables.inventory_replacement_plans.push({
      ...base(r, id), item_id: itemId, expected_replacement_date: date(r.expectedDate || r.expectedReplacementDate),
      reason: text(r.reason), budget: amount(r.budget), currency: currency(r.currency || source.settings?.currency),
      status: ["Planned", "Considering", "Deferred", "Ready", "Completed", "Cancelled"].includes(r.status) ? r.status : "Planned",
      notes: text(r.notes), version: 1, wishlist_ref_state: "Missing", wishlist_ref_snapshot: {}
    });
  }
  for (const { source: r, id } of services) if (id) {
    const itemId = ref(idMaps.item, r.itemId, "service.itemId");
    if (!itemId) { blockers.push({ code: "SERVICE_ITEM_REQUIRED", oldId: r.id }); continue; }
    const serviceType = ["Maintenance", "Repair", "Inspection", "Cleaning", "Upgrade", "Other"].includes(r.serviceType) ? r.serviceType : "Other";
    if (!date(r.serviceDate || r.date || r.createdAt)) blockers.push({ code: "SERVICE_DATE_UNKNOWN", oldId: r.id, detail: "Do not invent a historical service date; review before applying." });
    tables.inventory_service_logs.push({
      ...base(r, id), item_id: itemId, service_date: date(r.serviceDate || r.date || r.createdAt) || undefined,
      service_type: serviceType, provider_name: text(r.provider || r.providerName), cost: amount(r.cost),
      currency: currency(r.currency || source.settings?.currency), next_due_date: date(r.nextDueDate),
      notes: text(r.notes), version: 1
    });
  }

  // Every legacy row should be mapped or explicitly blocked; no SQL or writes happen here.
  const count = Object.fromEntries(Object.entries(tables).map(([name, list]) => [name, list.length]));
  return {
    mode: "dry-run-only",
    safeToApply: blockers.length === 0,
    blockers, warnings, count, tables,
    notes: [
      "No database writes were performed.",
      "Persist a deterministic old-ID -> UUID mapping before applying any rows.",
      "Unknown numeric values remain null; no estimate is converted into a Finance transaction.",
      "Review duplicate category slugs and cross-table references before any isolated-database run.",
      "Rows requiring server-owned created_by/updated_by values omit them; do not impersonate an actor."
    ]
  };
}

function reminderDaysOrDefault(value) {
  const valid = rows(value).map(Number).filter(n => Number.isInteger(n) && n >= 0 && n <= 3650);
  return valid.length ? [...new Set(valid)] : [30, 7, 1];
}
