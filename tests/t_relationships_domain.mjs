import assert from "node:assert/strict";
import {
  emptyRelationshipsData, normalizeRelationshipsData, validatePerson,
  findPossibleDuplicates, dueFollowups, validateRelationshipsImport, upcomingRelationshipEvents, planPersonMerge, planRelationshipsImport
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

const validImport = validateRelationshipsImport({
  people: [{ id: "import-person", name: "مها" }],
  timeline: [], followups: [], occasions: [], gifts: [], circles: [],
  settings: { defaultFollowupDays: 14 }
});
assert.equal(validImport.ok, true);
assert.equal(validImport.value.settings.defaultFollowupDays, 14);
assert.equal(validateRelationshipsImport(null).ok, false);
assert.equal(validateRelationshipsImport({ random: [] }).ok, false);
assert.equal(validateRelationshipsImport({ people: [{ name: "بلا معرّف" }] }).ok, false);
assert.equal(validateRelationshipsImport({ people: [{ id: "p", name: "" }] }).ok, false);
console.log("Relationships OS import validation tests passed.");

const upcoming = upcomingRelationshipEvents(
  [{ id: "p1", name: "مها", birthday: "1990-10-30" }, { id: "p2", name: "أحمد", birthday: "1990-11-30" }],
  [
    { id: "o1", personId: "p1", title: "ذكرى سنوية", date: "2020-11-02", recurrence: "yearly" },
    { id: "o2", personId: "p2", title: "حدث منتهي", date: "2026-10-20", recurrence: "once" },
    { id: "o3", personId: "p2", title: "موعد بعيد", date: "2026-12-20", recurrence: "once" }
  ],
  "2026-10-28",
  30
);
assert.deepEqual(upcoming.map((x) => [x.id, x.daysAway]), [
  ["birthday:p1", 2],
  ["occasion:o1", 5],
  ["birthday:p2", 33]
].filter(([, days]) => days <= 30));
assert.equal(upcoming.some((x) => x.id === "occasion:o2"), false);
assert.equal(upcoming.some((x) => x.id === "occasion:o3"), false);
const reminderWindow = upcomingRelationshipEvents([], [
  { id: "enabled", title: "تذكير قريب", date: "2026-11-02", recurrence: "once", reminderDays: 7 },
  { id: "too-early", title: "خارج نافذة التذكير", date: "2026-11-02", recurrence: "once", reminderDays: 2 },
  { id: "disabled", title: "تذكير معطل", date: "2026-11-02", recurrence: "once", reminderDays: 7, reminderEnabled: false }
], "2026-10-28", 30);
assert.deepEqual(reminderWindow.map((x) => x.id), ["occasion:enabled"]);
const configuredBirthdayWindow = upcomingRelationshipEvents(
  [{ id: "soon", name: "قريب", birthday: "1990-11-03" }, { id: "later", name: "لاحق", birthday: "1990-11-20" }],
  [], "2026-10-28", 365, { birthdayReminderDays: 7 }
);
assert.deepEqual(configuredBirthdayWindow.map((x) => x.id), ["birthday:soon"], "birthday reminders must respect the configured lead time");
assert.equal(empty.settings.birthdayReminderDays, 7);
assert.equal(empty.settings.neglectedAfterDays, 30);
assert.deepEqual(upcomingRelationshipEvents([{ id: "p", name: "شخص", birthday: "1990-02-29" }], [], "2027-02-01", 30).map((x) => x.date), ["2027-03-01"]);
console.log("Relationships OS upcoming reminder tests passed.");


// Safe duplicate-merge plan: preserve keeper identity, fill blanks, and reassign related records.
const mergeSource = {
  people: [
    { id: "keep", name: "سارة", phone: "", organization: "الشركة أ", createdAt: "2024-01-01" },
    { id: "dup", name: "سارة علي", phone: "01000000000", email: "sara@example.com", createdAt: "2025-01-01" }
  ],
  timeline: [{ id: "t1", personId: "dup", summary: "مكالمة" }],
  followups: [{ id: "f1", personId: "dup", title: "متابعة" }],
  occasions: [{ id: "o1", personId: "dup", title: "عيد ميلاد" }],
  gifts: [{ id: "g1", personId: "dup", idea: "كتاب" }],
  circles: [{ id: "c1", name: "أصدقاء" }],
  settings: {}
};
const mergePlan = planPersonMerge(mergeSource, "keep", "dup");
assert.equal(mergePlan.ok, true);
assert.equal(mergePlan.value.people.length, 1);
assert.equal(mergePlan.value.people[0].id, "keep");
assert.equal(mergePlan.value.people[0].phone, "01000000000");
assert.equal(mergePlan.value.people[0].organization, "الشركة أ");
assert.equal(mergePlan.value.timeline[0].personId, "keep");
assert.equal(mergePlan.value.followups[0].personId, "keep");
assert.equal(mergePlan.value.occasions[0].personId, "keep");
assert.equal(mergePlan.value.gifts[0].personId, "keep");
assert.equal(mergePlan.summary.reassigned.timeline, 1);
assert.equal(mergeSource.people.length, 2, "planner must not mutate source data");
assert.equal(planPersonMerge(mergeSource, "keep", "keep").ok, false);
assert.equal(planPersonMerge(mergeSource, "keep", "missing").ok, false);
console.log("Relationships OS safe merge-plan tests passed.");

const importCurrent = {
  people: [{ id: "p1", name: "أحمد", phone: "111" }, { id: "p2", name: "منى" }],
  timeline: [{ id: "t1", personId: "p1", summary: "قديم" }],
  followups: [], occasions: [], gifts: [], circles: [], settings: {}
};
const importIncoming = {
  people: [{ id: "p1", name: "أحمد محدث", phone: "222" }, { id: "p3", name: "ليلى" }],
  timeline: [{ id: "t2", personId: "p3", summary: "جديد" }],
  followups: [], occasions: [], gifts: [], circles: [], settings: {}
};
const importPlan = planRelationshipsImport(importCurrent, importIncoming);
assert.equal(importPlan.ok, true);
assert.equal(importPlan.summary.totalAdded, 2);
assert.equal(importPlan.summary.totalConflicts, 1);
assert.equal(importPlan.value.people.find((p) => p.id === "p1").name, "أحمد", "conflicts must preserve current records by default");
assert.equal(importPlan.writes.people.some((p) => p.id === "p1"), false, "conflicts are not written by default");
assert.equal(importPlan.value.people.some((p) => p.id === "p3"), true);
assert.equal(importCurrent.people.length, 2, "import planner must not mutate current data");
const overwritePlan = planRelationshipsImport(importCurrent, importIncoming, { overwriteConflicts: true });
assert.equal(overwritePlan.value.people.find((p) => p.id === "p1").name, "أحمد محدث");
assert.equal(overwritePlan.summary.totalOverwritten, 1);
assert.equal(overwritePlan.writes.people.some((p) => p.id === "p1"), true);
assert.equal(validateRelationshipsImport({ people: [{ id: "dup", name: "أحمد" }, { id: "dup", name: "محمود" }] }).ok, false, "duplicate IDs inside imported collection must be rejected");
assert.equal(planRelationshipsImport(importCurrent, { unknown: [] }).ok, false);
console.log("Relationships OS import-preview planner tests passed.");
