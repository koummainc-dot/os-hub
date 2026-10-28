import assert from "node:assert/strict";
import {
  emptyRelationshipsData, normalizeRelationshipsData, validatePerson,
  findPossibleDuplicates, dueFollowups
} from "../src/systems/relationships/domain.js";
import { buildRelationshipsSeed } from "../src/systems/relationships/demo.js";

const empty = emptyRelationshipsData();
assert.equal(empty.schemaVersion, 1);
assert.deepEqual(empty.people, []);
assert.deepEqual(normalizeRelationshipsData({ people: [{ id: "p1" }] }).people, [{ id: "p1" }]);
assert.deepEqual(normalizeRelationshipsData({ people: "bad", settings: null }).people, []);
assert.equal(validatePerson({ name: "  مصطفى  " }).value.name, "مصطفى");
assert.equal(validatePerson({ name: " " }).ok, false);
assert.equal(validatePerson({ name: "اسم", email: "not-an-email" }).ok, false);
assert.equal(validatePerson({ name: "اسم", email: "a@example.com" }).ok, true);

const duplicates = findPossibleDuplicates([
  { id: "1", name: "أحمد", email: "a@example.com" },
  { id: "2", name: "أحمد آخر", email: "A@example.com" },
  { id: "3", name: "ليلى", phone: "+20 100" },
  { id: "4", name: "ليلى أخرى", phone: "20100" }
]);
assert.equal(duplicates.length, 2);
assert.equal(duplicates[0].first.id, "1");
assert.equal(duplicates[1].duplicate.id, "4");

const due = dueFollowups([
  { id: "1", dueDate: "2026-10-27", status: "open" },
  { id: "2", dueDate: "2026-10-28", status: "open" },
  { id: "3", dueDate: "2026-10-27", status: "done" },
  { id: "4", dueDate: "2026-10-30", status: "open" }
], "2026-10-28");
assert.deepEqual(due.map((x) => x.id), ["1", "2"]);

const seed = buildRelationshipsSeed();
assert.ok(seed.people.length >= 3);
assert.ok(seed.circles.length >= 2);
assert.ok(seed.followups.every((f) => seed.people.some((p) => p.id === f.personId)));
assert.ok(seed.occasions.every((o) => seed.people.some((p) => p.id === o.personId)));
console.log("Relationships OS domain tests passed.");
