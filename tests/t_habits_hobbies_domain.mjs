import assert from "node:assert/strict";
import { validateHabit, validateHabitLog, habitSummary, isHabitScheduledOn, habitStreak, habitAdherence, validateRelapse, daysSinceLastLapse, relapseSummary } from "../src/systems/hobbies/habit-domain.js";

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
assert.equal(stats.scheduledToday, 1);
assert.equal(stats.completedScheduledToday, 1);

const scheduledHabit = { ...habit, id: "h3", trackingType: "check", scheduleDays: [1,3,5], status: "active" };
assert.equal(isHabitScheduledOn(scheduledHabit, "2026-11-02"), true); // Monday
assert.equal(isHabitScheduledOn(scheduledHabit, "2026-11-01"), false); // Sunday
const streakLogs = [
  { id: "s1", habitId: "h3", localDate: "2026-10-30", status: "done" }, // Friday
  { id: "s2", habitId: "h3", localDate: "2026-11-02", status: "done" }, // Monday
  { id: "s3", habitId: "h3", localDate: "2026-11-02", status: "done", occurrenceKey: "second" },
  { id: "s4", habitId: "h3", localDate: "2026-11-06", status: "done" } // Friday
];
assert.equal(habitStreak(scheduledHabit, streakLogs, "2026-11-02"), 2); // weekend is not scheduled
assert.deepEqual(habitAdherence(scheduledHabit, streakLogs, "2026-11-01", "2026-11-07"), {
  expectedDays: 3, completedDays: 2, rate: 67
});
const pausedHabit = { ...scheduledHabit, pausePeriods: [{ startDate: "2026-11-04", endDate: "2026-11-06" }] };
assert.deepEqual(habitAdherence(pausedHabit, streakLogs, "2026-11-01", "2026-11-07"), {
  expectedDays: 1, completedDays: 1, rate: 100
});

const avoidanceHabit = { id: "avoid-1", name: "عدم التدخين", type: "avoid", status: "active", trackingType: "check", scheduleDays: [0,1,2,3,4,5,6] };
const lapse = validateRelapse({ habitId: "avoid-1", localDate: "2026-10-30", eventType: "lapse", trigger: "ضغط العمل", intensity: 4, response: "خرجت للمشي", lesson: "أحتاج استراحة مبكرة", recoveryPlan: "أجهز بديلًا قبل الموقف" }, [avoidanceHabit]);
assert.equal(lapse.ok, true);
assert.equal(validateRelapse({ habitId: "avoid-1", localDate: "2026-11-02", eventType: "urge", trigger: "" }, [avoidanceHabit]).ok, false);
assert.equal(validateRelapse({ habitId: "avoid-1", localDate: "2026-11-02", eventType: "lapse", trigger: "ضغط", intensity: 6 }, [avoidanceHabit]).ok, false);
assert.equal(validateRelapse({ habitId: "h1", localDate: "2026-11-02", eventType: "lapse", trigger: "ضغط" }, [habit]).ok, false);
const recoveryEvents = [
  { id: "r1", habitId: "avoid-1", localDate: "2026-10-30", eventType: "lapse" },
  { id: "r2", habitId: "avoid-1", localDate: "2026-11-01", eventType: "urge" },
  { id: "r3", habitId: "avoid-1", localDate: "2026-10-01", eventType: "lapse" }
];
assert.equal(daysSinceLastLapse("avoid-1", recoveryEvents, "2026-11-02"), 3);
assert.deepEqual(relapseSummary("avoid-1", recoveryEvents, "2026-11-02"), {
  daysSinceLastLapse: 3, urgesRecorded30d: 1, lapsesRecorded30d: 1
});

console.log("Unified Habits & Hobbies domain tests passed.");
