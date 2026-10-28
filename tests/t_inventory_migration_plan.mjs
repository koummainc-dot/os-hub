import assert from "node:assert/strict";
import { planInventoryAggregateMigration } from "../src/systems/inventory/migration-plan.js";

const workspaceId = "11111111-1111-4111-8111-111111111111";
const ids = {
  cat: "22222222-2222-4222-8222-222222222222",
  place: "33333333-3333-4333-8333-333333333333",
  item: "44444444-4444-4444-8444-444444444444",
  warranty: "55555555-5555-4555-8555-555555555555",
  loan: "66666666-6666-4666-8666-666666666666",
  replacement: "77777777-7777-4777-8777-777777777777",
  service: "88888888-8888-4888-8888-888888888888",
  event: "99999999-9999-4999-8999-999999999999"
};
const aggregate = {
  schemaVersion: 1,
  settings: { currency: "EGP", warrantyReminderDays: [30, 7, 1] },
  categories: [{ id: "cat", name: "أجهزة", color: "#123456" }],
  places: [{ id: "place", name: "المنزل", type: "Home", parentId: "" }],
  items: [{
    id: "item", name: "حاسوب", categoryId: "cat", placeId: "place",
    status: "Owned", condition: "Good", quantity: "1", purchasePrice: "12.2500",
    estimatedValue: "", currency: "EGP", sensitivity: "Sensitive", createdAt: "2026-10-01"
  }],
  warranties: [{ id: "warranty", itemId: "item", provider: "الشركة", startDate: "2026-01-01", endDate: "2027-01-01" }],
  loans: [{ id: "loan", itemId: "item", direction: "Borrowed", person: "أحمد", loanedAt: "2026-03-01", dueDate: "", returnedAt: "" }],
  replacements: [{ id: "replacement", itemId: "item", expectedDate: "2028-01-01", budget: "0", status: "Planned" }],
  services: [{ id: "service", itemId: "item", serviceDate: "2026-10-02", serviceType: "Repair", cost: "0.0000" }],
  events: [{ id: "event", itemId: "item", type: "Acquired", date: "2026-10-01", toLocationId: "place", note: "اقتناء" },
           { id: "event", entityType: "category", entityId: "cat", type: "CategoryCreated", date: "2026-10-01", note: "تصنيف" }]
};
const resolveId = (oldId) => ids[oldId] || null;
const plan = planInventoryAggregateMigration(aggregate, { workspaceId, resolveId });
assert.equal(plan.mode, "dry-run-only");
assert.equal(plan.safeToApply, true);
assert.equal(plan.blockers.length, 0);
assert.equal(plan.count.inventory_categories, 1);
assert.equal(plan.count.inventory_locations, 1);
assert.equal(plan.count.inventory_items, 1);
assert.equal(plan.count.inventory_warranties, 1);
assert.equal(plan.count.inventory_loans, 1);
assert.equal(plan.count.inventory_replacement_plans, 1);
assert.equal(plan.count.inventory_service_logs, 1);
assert.equal(plan.count.inventory_ownership_events, 1);
assert.equal(plan.count.inventory_audit_log, 1);
assert.equal(plan.tables.inventory_items[0].purchase_price, "12.2500");
assert.equal(plan.tables.inventory_items[0].estimated_current_value, null);
assert.equal(plan.tables.inventory_items[0].sensitivity, "Sensitive");
assert.equal(plan.tables.inventory_loans[0].loan_direction, "Borrowed");
assert.equal(plan.tables.inventory_loans[0].person_ref_snapshot.name, "أحمد");
assert.equal(plan.tables.inventory_replacement_plans[0].budget, "0");
assert.equal(plan.tables.inventory_service_logs[0].cost, "0.0000");
assert.equal(plan.tables.inventory_ownership_events[0].to_location_id, ids.place);
assert.equal(plan.tables.inventory_settings[0].default_currency, "EGP");

const blocked = planInventoryAggregateMigration({ items: [{ id: "legacy-not-uuid", name: "قديم" }] }, { workspaceId });
assert.equal(blocked.safeToApply, false);
assert.ok(blocked.blockers.some(x => x.code === "UNRESOLVED_LEGACY_ID"));
assert.equal(blocked.tables.inventory_items.length, 0);
const unknownHistoricalDate = planInventoryAggregateMigration({
  items: [{ id: ids.item, name: "عنصر" }],
  loans: [{ id: ids.loan, itemId: ids.item, direction: "Lent" }]
}, { workspaceId });
assert.equal(unknownHistoricalDate.safeToApply, false);
assert.ok(unknownHistoricalDate.blockers.some(x => x.code === "LOAN_DATE_UNKNOWN"));

const badWorkspace = planInventoryAggregateMigration({}, { workspaceId: "not-a-uuid" });
assert.ok(badWorkspace.blockers.some(x => x.code === "INVALID_WORKSPACE_UUID"));
console.log("Inventory migration-plan tests passed.");
