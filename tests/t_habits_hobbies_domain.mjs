import assert from "node:assert/strict";
import { validateHabit, validateHabitLog, habitSummary, isHabitScheduledOn, habitStreak, longestHabitStreak, habitAdherence, validateRelapse, daysSinceLastLapse, relapseSummary, validateBook, validateReadingSession, readingSummary, validateWeeklyFocus, weeklyFocusProgress, habitAchievements, validateHabitReminder, isHabitReminderDue } from "../src/systems/hobbies/habit-domain.js";

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

const vacationHabit = { ...scheduledHabit, id: "vacation-habit", scheduleDays: [0,1,2,3,4,5,6] };
const vacationLogs = [
  { id: "v1", habitId: "vacation-habit", localDate: "2026-11-01", status: "done" },
  { id: "v2", habitId: "vacation-habit", localDate: "2026-11-02", status: "vacation" },
  { id: "v3", habitId: "vacation-habit", localDate: "2026-11-03", status: "done" },
  { id: "v4", habitId: "vacation-habit", localDate: "2026-11-04", status: "skipped" }
];
assert.equal(habitStreak(vacationHabit, vacationLogs, "2026-11-03"), 2); // vacation is neutral
assert.deepEqual(habitAdherence(vacationHabit, vacationLogs, "2026-11-01", "2026-11-03"), {
  expectedDays: 2, completedDays: 2, rate: 100
});
assert.equal(longestHabitStreak(vacationHabit, vacationLogs, "2026-11-04"), 2); // historical maximum survives a later miss
assert.equal(longestHabitStreak({ ...vacationHabit, status: "archived" }, vacationLogs, "2026-11-04"), 2);

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


const book = { id: "book-1", title: "العادات الذرية", author: "جيمس كلير", status: "reading", totalPages: 300, currentPage: 80, rating: 5 };
assert.equal(validateBook(book).ok, true);
assert.equal(validateBook({ ...book, title: " " }).ok, false);
assert.equal(validateBook({ ...book, currentPage: 301 }).ok, false);
assert.equal(validateBook({ ...book, rating: 6 }).ok, false);
const session1 = validateReadingSession({ bookId: "book-1", localDate: "2026-11-02", durationMinutes: 30, pagesRead: 8, note: "قراءة صباحية" }, [book]);
assert.equal(session1.ok, true);
assert.equal(validateReadingSession({ bookId: "book-1", localDate: "2026-11-02", durationMinutes: 0, pagesRead: 0 }, [book]).ok, false);
assert.equal(validateReadingSession({ bookId: "missing", localDate: "2026-11-02", durationMinutes: 20, pagesRead: 1 }, [book]).ok, false);
assert.deepEqual(readingSummary("book-1", [
  { id: "rs1", bookId: "book-1", durationMinutes: 30, pagesRead: 8 },
  { id: "rs2", bookId: "book-1", durationMinutes: 20, pagesRead: 5 },
  { id: "rs3", bookId: "book-1", durationMinutes: 99, pagesRead: 99, deleted_at: "2026-11-02T00:00:00Z" }
]), { sessionCount: 2, totalMinutes: 50, totalPages: 13 });


const focusHabits = [
  { id: "fh1", name: "قراءة", status: "active", trackingType: "check", scheduleDays: [0,1,2,3,4,5,6], created_at: "2026-11-01T00:00:00Z" },
  { id: "fh2", name: "رياضة", status: "active", trackingType: "check", scheduleDays: [0,2,4], created_at: "2026-11-01T00:00:00Z" }
];
const focus = validateWeeklyFocus({ title: "أسبوع متوازن", startDate: "2026-11-01", endDate: "2026-11-07", habitIds: ["fh1", "fh2"], notes: "" }, focusHabits);
assert.equal(focus.ok, true);
assert.equal(validateWeeklyFocus({ title: "", startDate: "2026-11-01", endDate: "2026-11-07", habitIds: [] }, focusHabits).ok, false);
assert.equal(validateWeeklyFocus({ title: "تركيز", startDate: "2026-11-08", endDate: "2026-11-07", habitIds: [] }, focusHabits).ok, false);
assert.equal(validateWeeklyFocus({ title: "تركيز", startDate: "2026-11-01", endDate: "2026-11-07", habitIds: ["unknown"] }, focusHabits).ok, false);
const focusMetrics = weeklyFocusProgress(focus.value, [
  { id: "fl1", habitId: "fh1", localDate: "2026-11-01", status: "done" },
  { id: "fl2", habitId: "fh1", localDate: "2026-11-02", status: "partial" },
  { id: "fl3", habitId: "fh2", localDate: "2026-11-02", status: "done" },
  { id: "fl4", habitId: "fh1", localDate: "2026-11-02", status: "done", deleted_at: "2026-11-02T12:00:00Z" }
], focusHabits);
assert.equal(focusMetrics.habitCount, 2);
assert.equal(focusMetrics.logCount, 3);
assert.equal(focusMetrics.done, 2);
assert.equal(focusMetrics.partial, 1);
const badges = habitAchievements(focusHabits, [
  { id: "al1", habitId: "fh1", localDate: "2026-11-01", status: "done" },
  { id: "al2", habitId: "fh1", localDate: "2026-11-02", status: "done" }
], [], [{ id: "book1", status: "completed" }], [
  { id: "read1", bookId: "book1", localDate: "2026-11-01" }
], "2026-11-02");
assert.equal(badges.find(b => b.id === "first-habit").earned, true);
assert.equal(badges.find(b => b.id === "first-log").earned, true);
assert.equal(badges.find(b => b.id === "first-book").earned, true);
assert.equal(badges.find(b => b.id === "five-reading-sessions").earned, false);


const reminder = validateHabitReminder({ habitId: "fh1", time: "08:30", daysOfWeek: [0,1,2,3,4,5,6], action: "snooze", snoozeMinutes: 10 }, focusHabits);
assert.equal(reminder.ok, true);
assert.equal(validateHabitReminder({ habitId: "fh1", time: "25:99", daysOfWeek: [1] }, focusHabits).ok, false);
assert.equal(validateHabitReminder({ habitId: "fh1", time: "08:30", daysOfWeek: [] }, focusHabits).ok, false);
assert.equal(validateHabitReminder({ habitId: "fh1", time: "08:30", daysOfWeek: [1], snoozeMinutes: 2 }, focusHabits).ok, false);
assert.equal(isHabitReminderDue({ ...reminder.value, lastFiredLocalDate: null }, "2026-11-02", "09:00"), true);
assert.equal(isHabitReminderDue({ ...reminder.value, lastFiredLocalDate: "2026-11-02" }, "2026-11-02", "09:00"), false);
assert.equal(isHabitReminderDue({ ...reminder.value, time: "10:30" }, "2026-11-02", "09:00"), false);
assert.equal(isHabitReminderDue({ ...reminder.value, snoozedUntil: "2026-11-02T10:00:00Z" }, "2026-11-02", "09:00", "2026-11-02T09:00:00Z"), false);
assert.equal(isHabitReminderDue({ ...reminder.value, lastFiredLocalDate: "2026-11-02", snoozedUntil: "2026-11-02T10:00:00Z" }, "2026-11-02", "09:00", "2026-11-02T10:01:00Z"), true);

console.log("Unified Habits & Hobbies domain tests passed.");
