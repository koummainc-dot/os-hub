import assert from "node:assert/strict";
import { validateHabit, validateHabitLog, habitSummary, isHabitScheduledOn, habitStreak, habitAdherence } from "../src/systems/hobbies/habit-domain.js";

const habit = { id: "h1", name: "قراءة", type: "build", status: "active", trackingType: "quantity", target: 10, unit: "صفحة", scheduleDays: [0,1,2,3,4,5,6] };
assert.equal(validateHabit(habit).ok, true);
assert.equal(validateHabit({ ...habit, name: " " }).ok, false);
assert.equal(validateHabit({ ...habit, target: 0 }).ok, false);
assert.equal(validateHabit({ ...habit, trackingType: "unknown" }).ok, false);
assert.equal(validateHabit({ ...habit, scheduleDays: [] }).ok, false);
assert.deepEqual(validateHabit({ ...habit, scheduleDays: [5,1,5] }).value.scheduleDays, [1,5]);
assert.equal(validateHabitLog({ localDate: "2026-11-02", status: "done", amount: 12 }, habit).ok, true);
assert.equal(validateHabitLog({ localDate: "2026-11-02", status: "done", amount: 12, occurrenceKey: "morning" }, habit).value.occurrenceKey, "morning");
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
assert.equal(stats.scheduledToday, 2);
assert.equal(stats.completedScheduledToday, 1);

const scheduledHabit = { ...habit, id: "h3", trackingType: "check", scheduleDays: [1,3,5], status: "active" };
assert.equal(isHabitScheduledOn(scheduledHabit, "2026-11-02"), true); // Monday
assert.equal(isHabitScheduledOn(scheduledHabit, "2026-11-01"), false); // Sunday
const streakLogs = [
  { id: "s1", localDate: "2026-10-30", status: "done" }, // Friday
  { id: "s2", localDate: "2026-11-02", status: "done" }, // Monday
  { id: "s3", localDate: "2026-11-02", status: "done", occurrenceKey: "second" }
];
assert.equal(habitStreak(scheduledHabit, streakLogs, "2026-11-02"), 2); // weekend is not scheduled
assert.deepEqual(habitAdherence(scheduledHabit, streakLogs, "2026-11-01", "2026-11-07"), {
  expectedDays: 3, completedDays: 2, rate: 67
});
const pausedHabit = { ...scheduledHabit, pausePeriods: [{ startDate: "2026-11-04", endDate: "2026-11-06" }] };
assert.deepEqual(habitAdherence(pausedHabit, streakLogs, "2026-11-01", "2026-11-07"), {
  expectedDays: 1, completedDays: 1, rate: 100
});
console.log("Unified Habits & Hobbies domain tests passed.");
