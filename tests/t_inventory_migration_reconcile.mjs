import assert from "node:assert/strict";
import { planInventoryAggregateMigration } from "../src/systems/inventory/migration-plan.js";
import { reconcileInventoryMigrationPlan, compareInventoryMigrationPlans } from "../src/systems/inventory/migration-reconcile.js";

const workspaceId = "11111111-1111-4111-8111-111111111111";
const ids = {
  cat: "22222222-2222-4222-8222-222222222222",
  place: "33333333-3333-4333-8333-333333333333",
  item: "44444444-4444-4444-8444-444444444444",
  warranty: "55555555-5555-4555-8555-555555555555",
  loan: "66666666-6666-4666-8666-666666666666",
  replacement: "77777777-7777-4777-8777-777777777777",
  service: "88888888-8888-4888-8888-888888888888",
  event: "99999999-9999-4999-8999-999999999999",
  auditEvent: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
};
const aggregate = {
  settings: { currency: "EGP" },
  categories: [{ id: "cat", name: "أجهزة" }],
  places: [{ id: "place", name: "المنزل", type: "Home" }],
  items: [{ id: "item", name: "حاسوب", categoryId: "cat", placeId: "place", purchasePrice: "12.2500", currency: "EGP" }],
  warranties: [{ id: "warranty", itemId: "item", startDate: "2026-01-01", endDate: "2027-01-01" }],
  loans: [{ id: "loan", itemId: "item", direction: "Borrowed", loanedAt: "2026-03-01" }],
  replacements: [{ id: "replacement", itemId: "item", budget: "0" }],
  services: [{ id: "service", itemId: "item", serviceDate: "2026-10-02", cost: "0.0000" }],
  events: [
    { id: "event", itemId: "item", type: "Acquired", date: "2026-10-01", toLocationId: "place" },
    { id: "auditEvent", entityType: "category", entityId: "cat", type: "CategoryCreated", date: "2026-10-01" }
  ]
};
const resolveId = (oldId) => ids[oldId] || null;
const first = planInventoryAggregateMigration(aggregate, { workspaceId, resolveId });
const second = planInventoryAggregateMigration(aggregate, { workspaceId, resolveId });
assert.equal(first.safeToApply, true);
assert.equal(compareInventoryMigrationPlans(first, second).deterministic, true);
const reconciliation = reconcileInventoryMigrationPlan(aggregate, first);
assert.equal(reconciliation.mode, "read-only-reconciliation");
assert.equal(reconciliation.safeToApply, true);
assert.deepEqual(reconciliation.countDifferences, []);
assert.equal(reconciliation.sourceCounts.inventory_items, 1);
assert.equal(reconciliation.plannedCounts.inventory_items, 1);
assert.equal(reconciliation.sourceRows, 9);
assert.equal(reconciliation.plannedCounts.inventory_audit_log, 1);

// Corrupt a relationship: the reconciler must block the plan rather than overlook the orphan.
const corrupted = structuredClone(first);
corrupted.tables.inventory_items[0].category_id = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const broken = reconcileInventoryMigrationPlan(aggregate, corrupted);
assert.equal(broken.safeToApply, false);
assert.ok(broken.blockers.some(x => x.code === "ORPHANED_PLANNED_REFERENCE"));

// Corrupt counts: row loss must be visible as a blocker.
const missing = structuredClone(first);
missing.tables.inventory_items = [];
const missingRows = reconcileInventoryMigrationPlan(aggregate, missing);
assert.equal(missingRows.safeToApply, false);
assert.ok(missingRows.blockers.some(x => x.code === "ROW_COUNT_MISMATCH"));
console.log("Inventory migration reconciliation tests passed.");
