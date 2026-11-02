export const HABIT_STATUSES = ["active", "paused", "archived"];
export const HABIT_TYPES = ["build", "maintain", "avoid"];
export const HABIT_TRACKING_TYPES = ["check", "quantity", "duration"];

const validDate = date => {
  const value = String(date || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(value + "T12:00:00Z");
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};
const utcDate = date => new Date(date + "T12:00:00Z");
const dateString = date => date.toISOString().slice(0, 10);
const shiftDate = (date, days) => {
  const value = utcDate(date);
  value.setUTCDate(value.getUTCDate() + days);
  return dateString(value);
};
const pauseContains = (habit, date) => (habit?.pausePeriods || []).some(period =>
  period?.startDate && period.startDate <= date && (!period.endDate || period.endDate >= date)
);

export function validateHabit(input) {
  const name = String(input?.name || "").trim();
  if (!name) return { ok: false, error: "اسم العادة مطلوب." };
  if (name.length > 120) return { ok: false, error: "اسم العادة يجب ألا يتجاوز 120 حرفًا." };
  const status = input?.status || "active";
  if (!HABIT_STATUSES.includes(status)) return { ok: false, error: "حالة العادة غير صحيحة." };
  const type = input?.type || "build";
  if (!HABIT_TYPES.includes(type)) return { ok: false, error: "نوع العادة غير صحيح." };
  const trackingType = input?.trackingType || "check";
  if (!HABIT_TRACKING_TYPES.includes(trackingType)) return { ok: false, error: "نوع التتبع غير صحيح." };
  const target = input?.target == null || input.target === "" ? null : Number(input.target);
  if (trackingType !== "check" && (!Number.isFinite(target) || target <= 0)) {
    return { ok: false, error: "أدخل هدفًا رقميًا أكبر من صفر." };
  }
  const scheduleDays = Array.isArray(input?.scheduleDays) ? [...new Set(input.scheduleDays.map(Number))].sort((a, b) => a - b) : [0,1,2,3,4,5,6];
  if (scheduleDays.some(d => !Number.isInteger(d) || d < 0 || d > 6) || scheduleDays.length === 0) {
    return { ok: false, error: "اختر يومًا واحدًا على الأقل للجدول." };
  }
  const pausePeriods = Array.isArray(input?.pausePeriods) ? input.pausePeriods.filter(p => p && validDate(p.startDate) && (!p.endDate || validDate(p.endDate)) && (!p.endDate || p.endDate >= p.startDate)) : [];
  return { ok: true, value: { ...input, name, status, type, trackingType, target, unit: String(input?.unit || "").trim(), scheduleDays, pausePeriods } };
}

export function validateHabitLog(input, habit) {
  if (!habit || habit.status === "archived") return { ok: false, error: "العادة غير متاحة للتسجيل." };
  const date = String(input?.localDate || "");
  if (!validDate(date)) return { ok: false, error: "تاريخ السجل غير صالح." };
  const status = String(input?.status || "done");
  if (!["done", "partial", "skipped", "vacation"].includes(status)) return { ok: false, error: "حالة السجل غير صحيحة." };
  const amount = input?.amount == null || input.amount === "" ? null : Number(input.amount);
  if (amount !== null && (!Number.isFinite(amount) || amount < 0)) return { ok: false, error: "الكمية يجب ألا تكون سالبة." };
  if (habit.trackingType !== "check" && amount === null && status !== "skipped" && status !== "vacation") return { ok: false, error: "أدخل الكمية أو المدة الفعلية." };
  const occurrenceKey = String(input?.occurrenceKey || "").trim() || null;
  return { ok: true, value: { ...input, localDate: date, status, amount, occurrenceKey, note: String(input?.note || "").trim() } };
}

export function isHabitScheduledOn(habit, date) {
  if (!habit || !validDate(date) || habit.status === "archived") return false;
  if (pauseContains(habit, date)) return false;
  if (habit.status === "paused" && (!habit.pausedAt || date >= habit.pausedAt)) return false;
  const days = Array.isArray(habit.scheduleDays) && habit.scheduleDays.length ? habit.scheduleDays : [0,1,2,3,4,5,6];
  return days.includes(utcDate(date).getUTCDay());
}

export function habitStreak(habit, logs, asOfDate) {
  if (!validDate(asOfDate) || !habit) return 0;
  const completed = new Set((logs || []).filter(log => !log.deleted_at && ["done"].includes(log.status)).map(log => log.localDate));
  let cursor = asOfDate;
  if (isHabitScheduledOn(habit, cursor) && !completed.has(cursor)) cursor = shiftDate(cursor, -1);
  let streak = 0;
  for (let guard = 0; guard < 400; guard++, cursor = shiftDate(cursor, -1)) {
    if (!isHabitScheduledOn(habit, cursor)) continue;
    if (!completed.has(cursor)) break;
    streak++;
  }
  return streak;
}

export function habitAdherence(habit, logs, fromDate, toDate) {
  if (!validDate(fromDate) || !validDate(toDate) || fromDate > toDate) {
    return { expectedDays: 0, completedDays: 0, rate: null };
  }
  const completed = new Set((logs || []).filter(log => !log.deleted_at && log.status === "done").map(log => log.localDate));
  let expectedDays = 0, completedDays = 0;
  for (let cursor = fromDate, guard = 0; cursor <= toDate && guard < 4000; cursor = shiftDate(cursor, 1), guard++) {
    if (!isHabitScheduledOn(habit, cursor)) continue;
    expectedDays++;
    if (completed.has(cursor)) completedDays++;
  }
  return { expectedDays, completedDays, rate: expectedDays ? Math.round(completedDays / expectedDays * 100) : null };
}

export function habitSummary(habits, logs, date) {
  const liveHabits = (habits || []).filter(h => !h.deleted_at && h.status !== "archived");
  const visibleLogs = (logs || []).filter(l => !l.deleted_at);
  const todayLogs = visibleLogs.filter(l => l.localDate === date);
  const scheduledToday = liveHabits.filter(h => h.status === "active" && isHabitScheduledOn(h, date));
  const completedToday = new Set(todayLogs.filter(l => l.status === "done").map(l => l.habitId));
  const done = todayLogs.filter(l => l.status === "done").length;
  const weekStart = utcDate(date);
  weekStart.setUTCDate(weekStart.getUTCDate() - weekStart.getUTCDay());
  const from = dateString(weekStart);
  const weekLogs = visibleLogs.filter(l => l.localDate >= from && l.localDate <= date);
  return {
    activeCount: liveHabits.filter(h => h.status === "active").length,
    todayCount: todayLogs.length,
    todayDone: done,
    weekDone: weekLogs.filter(l => l.status === "done").length,
    scheduledToday: scheduledToday.length,
    completedScheduledToday: scheduledToday.filter(h => completedToday.has(h.id)).length
  };
}
