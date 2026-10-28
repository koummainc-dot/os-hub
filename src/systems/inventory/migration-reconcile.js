// Read-only reconciliation for Inventory migration plans. No DB access or writes.
const arrays = (v) => Array.isArray(v) ? v : [];
const canonical = (value) => {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().filter(k => value[k] !== undefined).map(k => [k, canonical(value[k])]));
  }
  return value;
};
const stable = (value) => JSON.stringify(canonical(value));
const SOURCE_TABLES = {
  inventory_categories: "categories",
  inventory_locations: "places",
  inventory_items: "items",
  inventory_warranties: "warranties",
  inventory_loans: "loans",
  inventory_replacement_plans: "replacements",
  inventory_service_logs: "services"
};
const RELATIONS = [
  ["inventory_categories", "parent_id", "inventory_categories", "id"],
  ["inventory_locations", "parent_id", "inventory_locations", "id"],
  ["inventory_items", "category_id", "inventory_categories", "id"],
  ["inventory_items", "current_location_id", "inventory_locations", "id"],
  ["inventory_warranties", "item_id", "inventory_items", "id"],
  ["inventory_loans", "item_id", "inventory_items", "id"],
  ["inventory_replacement_plans", "item_id", "inventory_items", "id"],
  ["inventory_service_logs", "item_id", "inventory_items", "id"],
  ["inventory_ownership_events", "item_id", "inventory_items", "id"],
  ["inventory_ownership_events", "from_location_id", "inventory_locations", "id"],
  ["inventory_ownership_events", "to_location_id", "inventory_locations", "id"]
];

/** Compare source row counts, planned row counts, references, and duplicate keys. */
export function reconcileInventoryMigrationPlan(aggregate, plan) {
  const source = aggregate && typeof aggregate === "object" ? aggregate : {};
  const tables = plan?.tables && typeof plan.tables === "object" ? plan.tables : {};
  const blockers = [];
  const warnings = [];
  const sourceCounts = {};
  const plannedCounts = {};
  const countDifferences = [];
  for (const [table, sourceKey] of Object.entries(SOURCE_TABLES)) {
    sourceCounts[table] = arrays(source[sourceKey]).length;
    plannedCounts[table] = arrays(tables[table]).length;
    if (sourceCounts[table] !== plannedCounts[table]) {
      const detail = {
        table, sourceKey, source: sourceCounts[table], planned: plannedCounts[table],
        difference: sourceCounts[table] - plannedCounts[table]
      };
      countDifferences.push(detail);
      blockers.push({ code: "ROW_COUNT_MISMATCH", ...detail });
    }
  }
  sourceCounts.inventory_ownership_events = arrays(source.events).filter(e =>
    ["Acquired", "Moved", "Loaned", "Returned", "Sold", "Disposed", "Lost", "Found", "Corrected"].includes(String(e?.type || ""))
  ).length;
  plannedCounts.inventory_ownership_events = arrays(tables.inventory_ownership_events).length;
  // Legacy non-ownership events intentionally move to audit, so compare combined event retention.
  const sourceEvents = arrays(source.events).length;
  const plannedEvents = plannedCounts.inventory_ownership_events + plannedCounts.inventory_audit_log;
  if (sourceEvents !== plannedEvents) {
    countDifferences.push({ table: "events→ownership+audit", source: sourceEvents, planned: plannedEvents, difference: sourceEvents - plannedEvents });
    blockers.push({ code: "EVENT_RETENTION_MISMATCH", source: sourceEvents, planned: plannedEvents });
  }
  sourceCounts.inventory_audit_log = null; // audit may also include events from other legacy domains
  plannedCounts.inventory_settings = arrays(tables.inventory_settings).length;

  const idSets = {};
  for (const [table, listValue] of Object.entries(tables)) {
    const list = arrays(listValue);
    const seen = new Set();
    idSets[table] = new Set();
    for (let i = 0; i < list.length; i++) {
      const row = list[i] || {};
      if (row.workspace_id && plan?.tables?.inventory_settings?.[0]?.workspace_id &&
          row.workspace_id !== plan.tables.inventory_settings[0].workspace_id) {
        blockers.push({ code: "CROSS_WORKSPACE_ROW", table, index: i });
      }
      if (!row.id) continue; // append-only audit rows use a generated bigint identity
      if (seen.has(row.id)) blockers.push({ code: "DUPLICATE_PRIMARY_KEY", table, id: row.id });
      seen.add(row.id);
      idSets[table].add(row.id);
    }
  }
  for (const [fromTable, field, toTable] of RELATIONS) {
    for (const [index, row] of arrays(tables[fromTable]).entries()) {
      const value = row?.[field];
      if (value !== null && value !== undefined && value !== "" && !idSets[toTable]?.has(value)) {
        blockers.push({ code: "ORPHANED_PLANNED_REFERENCE", fromTable, field, toTable, index, value });
      }
    }
  }

  const stablePlan = stable({
    workspaceId: arrays(tables.inventory_settings)[0]?.workspace_id || null,
    tables,
    blockerCodes: arrays(plan?.blockers).map(x => x.code).sort(),
    warningCodes: arrays(plan?.warnings).map(x => x.code).sort()
  });
  const sourceRows = Object.values(SOURCE_TABLES).reduce((sum, key) => sum + arrays(source[key]).length, 0) + sourceEvents;
  const plannedRows = Object.entries(tables).reduce((sum, [table, list]) => sum + (table === "inventory_settings" ? 0 : arrays(list).length), 0);
  if (arrays(plan?.blockers).length) warnings.push({ code: "PLAN_HAS_BLOCKERS", count: arrays(plan.blockers).length });
  if (arrays(plan?.warnings).length) warnings.push({ code: "PLAN_HAS_WARNINGS", count: arrays(plan.warnings).length });

  return {
    mode: "read-only-reconciliation",
    safeToApply: blockers.length === 0 && arrays(plan?.blockers).length === 0,
    sourceCounts, plannedCounts, sourceRows, plannedRows,
    countDifferences, blockers, warnings,
    deterministicFingerprint: stablePlan,
    notes: [
      "Counts and references are checked against the proposed plan only; this is not a live database comparison.",
      "Run the same source aggregate with the same durable ID resolver twice and compare deterministicFingerprint.",
      "A matching fingerprint demonstrates deterministic planning for this input, not transactional idempotency of a database writer."
    ]
  };
}

/** Compare two dry-run plans without relying on object-key order. */
export function compareInventoryMigrationPlans(first, second) {
  const project = (plan) => ({
    tables: plan?.tables || {},
    blockerCodes: arrays(plan?.blockers).map(x => x.code).sort(),
    warningCodes: arrays(plan?.warnings).map(x => x.code).sort()
  });
  const a = stable(project(first));
  const b = stable(project(second));
  return { deterministic: a === b, firstFingerprint: a, secondFingerprint: b };
}
