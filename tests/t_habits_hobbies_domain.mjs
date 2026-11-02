import assert from "node:assert/strict";
import { validateHabit, validateHabitLog, habitSummary } from "../src/systems/hobbies/habit-domain.js";

const habit = { id: "h1", name: "قراءة", type: "build", status: "active", trackingType: "quantity", target: 10, unit: "صفحة", scheduleDays: [0,1,2,3,4,5,6] };
assert.equal(validateHabit(habit).ok, true);
assert.equal(validateHabit({ ...habit, name: " " }).ok, false);
assert.equal(validateHabit({ ...habit, target: 0 }).ok, false);
assert.equal(validateHabit({ ...habit, trackingType: "unknown" }).ok, false);
assert.equal(validateHabit({ ...habit, scheduleDays: [] }).ok, false);
assert.equal(validateHabitLog({ localDate: "2026-11-02", status: "done", amount: 12 }, habit).ok, true);
assert.equal(validateHabitLog({ localDate: "2026-02-31", status: "done", amount: 12 }, habit).ok, false);
assert.equal(validateHabitLog({ localDate: "2026-11-02", status: "done", amount: -1 }, habit).ok, false);
assert.equal(validateHabitLog({ localDate: "2026-11-02", status: "partial", amount: "" }, habit).ok, false);
assert.equal(validateHabitLog({ localDate: "2026-11-02", status: "done" }, { ...habit, status: "archived" }).ok, false);
const stats = habitSummary(
  [habit, { ...habit, id: "h2", name: "مشي", status: "paused" }],
  [
    { id: "l1", habitId: "h1", localDate: "2026-11-02", status: "done" },
    { id: "l2", habitId: "h1", localDate: "2026-11-02", status: "partial" },
    { id: "l3", habitId: "h1", localDate: "2026-11-01", status: "done" }
  ],
  "2026-11-02"
);
assert.equal(stats.activeCount, 1);
assert.equal(stats.todayCount, 2);
assert.equal(stats.todayDone, 1);
assert.equal(stats.weekDone, 2);
console.log("Unified Habits & Hobbies domain tests passed.");
