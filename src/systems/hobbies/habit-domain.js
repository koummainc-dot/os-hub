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
  const completed = new Set((logs || []).filter(log => !log.deleted_at && log.habitId === habit.id && ["done"].includes(log.status)).map(log => log.localDate));
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
  const completed = new Set((logs || []).filter(log => !log.deleted_at && log.habitId === habit.id && log.status === "done").map(log => log.localDate));
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

export function validateRelapse(input, habits) {
  const habit = (habits || []).find(item => item.id === input?.habitId && !item.deleted_at);
  if (!habit || habit.type !== "avoid" || habit.status === "archived") {
    return { ok: false, error: "اختر عادة تجنّب نشطة أو متوقفة مؤقتًا لتسجيل التعافي." };
  }
  const localDate = String(input?.localDate || "");
  if (!validDate(localDate)) return { ok: false, error: "تاريخ السجل غير صالح." };
  const eventType = input?.eventType || "lapse";
  if (!["urge", "lapse"].includes(eventType)) return { ok: false, error: "نوع الحدث غير صحيح." };
  const trigger = String(input?.trigger || "").trim();
  if (!trigger) return { ok: false, error: "اكتب الموقف أو المحفّز باختصار." };
  if (trigger.length > 500) return { ok: false, error: "المحفّز يجب ألا يتجاوز 500 حرف." };
  const intensity = input?.intensity == null || input.intensity === "" ? null : Number(input.intensity);
  if (intensity !== null && (!Number.isInteger(intensity) || intensity < 1 || intensity > 5)) {
    return { ok: false, error: "شدة الرغبة يجب أن تكون من 1 إلى 5." };
  }
  const response = String(input?.response || "").trim();
  const lesson = String(input?.lesson || "").trim();
  const recoveryPlan = String(input?.recoveryPlan || "").trim();
  if (response.length > 1500 || lesson.length > 1500 || recoveryPlan.length > 1500) {
    return { ok: false, error: "كل حقل تأملي يجب ألا يتجاوز 1500 حرف." };
  }
  return { ok: true, value: { ...input, localDate, eventType, trigger, intensity, response, lesson, recoveryPlan } };
}

export function daysSinceLastLapse(habitId, events, asOfDate) {
  if (!habitId || !validDate(asOfDate)) return null;
  const latest = (events || [])
    .filter(event => !event.deleted_at && event.habitId === habitId && event.eventType === "lapse" && validDate(event.localDate) && event.localDate <= asOfDate)
    .map(event => event.localDate)
    .sort()
    .at(-1);
  if (!latest) return null;
  return Math.floor((utcDate(asOfDate).getTime() - utcDate(latest).getTime()) / 86400000);
}

export function relapseSummary(habitId, events, asOfDate) {
  const recentFrom = shiftDate(asOfDate, -29);
  const recent = (events || []).filter(event => !event.deleted_at && event.habitId === habitId && event.localDate >= recentFrom && event.localDate <= asOfDate);
  return {
    daysSinceLastLapse: daysSinceLastLapse(habitId, events, asOfDate),
    urgesRecorded30d: recent.filter(event => event.eventType === "urge").length,
    lapsesRecorded30d: recent.filter(event => event.eventType === "lapse").length
  };
}

export const BOOK_STATUSES = ["planned", "reading", "paused", "completed", "abandoned"];

export function validateBook(input) {
  const title = String(input?.title || "").trim();
  if (!title) return { ok: false, error: "عنوان الكتاب مطلوب." };
  if (title.length > 200) return { ok: false, error: "عنوان الكتاب يجب ألا يتجاوز 200 حرف." };
  const status = input?.status || "planned";
  if (!BOOK_STATUSES.includes(status)) return { ok: false, error: "حالة الكتاب غير صحيحة." };
  const totalPages = input?.totalPages == null || input.totalPages === "" ? null : Number(input.totalPages);
  const currentPage = input?.currentPage == null || input.currentPage === "" ? 0 : Number(input.currentPage);
  if (totalPages !== null && (!Number.isInteger(totalPages) || totalPages < 1)) return { ok: false, error: "عدد الصفحات يجب أن يكون عددًا صحيحًا موجبًا." };
  if (!Number.isInteger(currentPage) || currentPage < 0 || (totalPages !== null && currentPage > totalPages)) {
    return { ok: false, error: "الصفحة الحالية غير صالحة أو تتجاوز إجمالي الصفحات." };
  }
  const rating = input?.rating == null || input.rating === "" ? null : Number(input.rating);
  if (rating !== null && (!Number.isInteger(rating) || rating < 1 || rating > 5)) return { ok: false, error: "التقييم يجب أن يكون من 1 إلى 5." };
  const startedAt = input?.startedAt || null;
  const completedAt = input?.completedAt || null;
  if (startedAt && !validDate(startedAt)) return { ok: false, error: "تاريخ بداية القراءة غير صالح." };
  if (completedAt && !validDate(completedAt)) return { ok: false, error: "تاريخ إكمال الكتاب غير صالح." };
  if (startedAt && completedAt && completedAt < startedAt) return { ok: false, error: "تاريخ الإكمال لا يمكن أن يسبق تاريخ البداية." };
  return { ok: true, value: { ...input, title, status, author: String(input?.author || "").trim(), totalPages, currentPage, rating, startedAt, completedAt, notes: String(input?.notes || "").trim() } };
}

export function validateReadingSession(input, books) {
  const book = (books || []).find(item => item.id === input?.bookId && !item.deleted_at && item.status !== "abandoned");
  if (!book) return { ok: false, error: "اختر كتابًا متاحًا لتسجيل جلسة القراءة." };
  const localDate = String(input?.localDate || "");
  if (!validDate(localDate)) return { ok: false, error: "تاريخ جلسة القراءة غير صالح." };
  const durationMinutes = input?.durationMinutes == null || input.durationMinutes === "" ? 0 : Number(input.durationMinutes);
  const pagesRead = input?.pagesRead == null || input.pagesRead === "" ? 0 : Number(input.pagesRead);
  if (!Number.isInteger(durationMinutes) || durationMinutes < 0 || durationMinutes > 1440) return { ok: false, error: "مدة القراءة يجب أن تكون من 0 إلى 1440 دقيقة." };
  if (!Number.isInteger(pagesRead) || pagesRead < 0 || pagesRead > 10000) return { ok: false, error: "عدد الصفحات يجب أن يكون عددًا صحيحًا بين 0 و10000." };
  if (durationMinutes === 0 && pagesRead === 0) return { ok: false, error: "أدخل مدة القراءة أو عدد الصفحات على الأقل." };
  return { ok: true, value: { ...input, localDate, durationMinutes, pagesRead, note: String(input?.note || "").trim() } };
}

export function readingSummary(bookId, sessions) {
  const rows = (sessions || []).filter(session => !session.deleted_at && session.bookId === bookId);
  return {
    sessionCount: rows.length,
    totalMinutes: rows.reduce((sum, row) => sum + (Number(row.durationMinutes) || 0), 0),
    totalPages: rows.reduce((sum, row) => sum + (Number(row.pagesRead) || 0), 0)
  };
}
