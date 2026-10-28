import assert from "node:assert/strict";
import {
  buildNormalizedInventorySnapshot,
  normalizedInventorySnapshotToAggregate
} from "../src/systems/inventory/normalized-repository.js";

const workspaceId = "11111111-1111-4111-8111-111111111111";
const source = {
  schemaVersion: 1,
  settings: { currency: "EGP", warrantyReminderDays: [30, 7, 1] },
  categories: [{ id: "cat-old", name: "إلكترونيات", createdAt: "2026-01-01" }],
  places: [{ id: "place-old", name: "المنزل", type: "Home", createdAt: "2026-01-01" }],
  items: [{
    id: "item-old", name: "حاسوب", categoryId: "cat-old", placeId: "place-old",
    condition: "Good", status: "Owned", quantity: 1, purchasePrice: "123.4500",
    currency: "EGP", estimatedValue: "", sensitivity: "Normal",
    createdAt: "2026-01-01", updatedAt: "2026-01-02"
  }],
  warranties: [{ id: "warranty-old", itemId: "item-old", provider: "Vendor", startDate: "2026-01-01", endDate: "2027-01-01" }],
  loans: [{ id: "loan-old", itemId: "item-old", direction: "Borrowed", loanedAt: "2026-02-01", dueDate: "2026-03-01" }],
  replacements: [{ id: "replacement-old", itemId: "item-old", budget: "0", expectedDate: "2027-01-01" }],
  services: [{ id: "service-old", itemId: "item-old", serviceDate: "2026-02-01", serviceType: "Maintenance", cost: "0.0000" }],
  events: [
    { id: "event-old", itemId: "item-old", type: "Acquired", date: "2026-01-01", toLocationId: "place-old" },
    { id: "category-event-old", entityType: "category", entityId: "cat-old", type: "CategoryCreated", date: "2026-01-01" }
  ]
};

const first = buildNormalizedInventorySnapshot(source, workspaceId);
assert.equal(first.plan.safeToApply, true, JSON.stringify(first.plan.blockers));
assert.equal(first.snapshot.tables.inventory_items.length, 1);
assert.equal(first.snapshot.tables.inventory_warranties[0].item_id, first.snapshot.tables.inventory_items[0].id);
assert.equal(first.snapshot.tables.inventory_items[0].category_id, first.snapshot.tables.inventory_categories[0].id);
assert.equal(first.snapshot.tables.inventory_items[0].current_location_id, first.snapshot.tables.inventory_locations[0].id);
assert.equal(first.snapshot.tables.inventory_settings[0].preferences.normalized_storage_version, 1);
assert.deepEqual(first.snapshot.tables.inventory_warranties[0].document_ref_snapshot, {});
assert.equal(first.snapshot.tables.inventory_warranties[0].document_ref_state, "Missing");
assert.deepEqual(first.snapshot.tables.inventory_ownership_events[0].person_ref_snapshot, {});
assert.equal(first.snapshot.tables.inventory_settings[0].preferences.inventory_id_map["item:item-old"], first.snapshot.tables.inventory_items[0].id);
assert.equal(first.snapshot.tables.inventory_items[0].purchase_price, "123.4500");
assert.equal(first.snapshot.tables.inventory_items[0].estimated_current_value, null);

const retrySource = { ...source, settings: { ...source.settings, _inventoryIdMap: first.idMap } };
const second = buildNormalizedInventorySnapshot(retrySource, workspaceId);
assert.equal(second.snapshot.tables.inventory_items[0].id, first.snapshot.tables.inventory_items[0].id);
assert.equal(second.snapshot.tables.inventory_categories[0].id, first.snapshot.tables.inventory_categories[0].id);

const roundTrip = normalizedInventorySnapshotToAggregate(first.snapshot);
assert.equal(roundTrip.items[0].id, first.snapshot.tables.inventory_items[0].id);
assert.equal(roundTrip.items[0].purchasePrice, "123.4500");
assert.equal(roundTrip.items[0].categoryId, first.snapshot.tables.inventory_categories[0].id);
assert.equal(roundTrip.events.some(e => e.type === "Acquired"), true);
assert.equal(roundTrip.events.some(e => e.type === "CategoryCreated"), true);
assert.equal(roundTrip.settings._inventoryIdMap["item:item-old"], first.snapshot.tables.inventory_items[0].id);

const unknownHistory = {
  ...source,
  events: [{ id: "event-no-date", itemId: "item-old", type: "Acquired" }]
};
assert.throws(
  () => buildNormalizedInventorySnapshot(unknownHistory, workspaceId),
  error => error.code === "INVENTORY_MIGRATION_BLOCKED" && error.blockers.some(x => x.code === "OWNERSHIP_EVENT_DATE_UNKNOWN")
);

const calls = { legacySaves: 0, normalizedSaves: 0 };
let serverSnapshot = { schema_version: 1, tables: { inventory_settings: [] } };
let legacyData = source;
const mockApi = {
  workspaceId,
  async load() { return { data: legacyData, source: "supabase", updatedAt: null, error: null }; },
  async save(data) { calls.legacySaves++; legacyData = data; return { ok: true, conflict: false, updatedAt: "legacy" }; },
  async loadNormalizedInventory() { return { available: true, data: serverSnapshot, source: "normalized" }; },
  async saveNormalizedInventory(snapshot) {
    calls.normalizedSaves++;
    serverSnapshot = structuredClone(snapshot);
    return { available: true, ok: true, updatedAt: "normalized" };
  }
};
const { createNormalizedInventoryRepository } = await import("../src/systems/inventory/normalized-repository.js");
const repoAdapter = createNormalizedInventoryRepository(mockApi, value => value);
const beforeMigration = await repoAdapter.load();
assert.equal(beforeMigration.source, "supabase");
const saved = await repoAdapter.save(source);
assert.equal(saved.ok, true);
assert.equal(calls.legacySaves, 1, "first normalized save persists the durable ID map to the legacy aggregate");
assert.equal(calls.normalizedSaves, 1);
assert.equal(legacyData.settings._inventoryIdMap["item:item-old"], serverSnapshot.tables.inventory_items[0].id);
const loadedNormalized = await repoAdapter.load();
assert.equal(loadedNormalized.source, "normalized");
assert.equal(loadedNormalized.data.items[0].id, serverSnapshot.tables.inventory_items[0].id);
const secondSave = await repoAdapter.save(loadedNormalized.data);
assert.equal(secondSave.ok, true);
assert.equal(calls.normalizedSaves, 2, "after activation, saves use normalized snapshot RPC");

console.log("Inventory normalized repository mapping tests passed.");
