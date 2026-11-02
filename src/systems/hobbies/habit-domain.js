export const HABIT_STATUSES = ["active", "paused", "archived"];
export const HABIT_TYPES = ["build", "maintain", "avoid"];
export const HABIT_TRACKING_TYPES = ["check", "quantity", "duration"];

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
  const scheduleDays = Array.isArray(input?.scheduleDays) ? [...new Set(input.scheduleDays.map(Number))] : [0,1,2,3,4,5,6];
  if (scheduleDays.some(d => !Number.isInteger(d) || d < 0 || d > 6) || scheduleDays.length === 0) {
    return { ok: false, error: "اختر يومًا واحدًا على الأقل للجدول." };
  }
  return { ok: true, value: { ...input, name, status, type, trackingType, target, unit: String(input?.unit || "").trim(), scheduleDays } };
}

export function validateHabitLog(input, habit) {
  if (!habit || habit.status === "archived") return { ok: false, error: "العادة غير متاحة للتسجيل." };
  const date = String(input?.localDate || "");
  if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(date) || Number.isNaN(Date.parse(date + "T12:00:00Z")) || new Date(date + "T12:00:00Z").toISOString().slice(0,10) !== date) {
    return { ok: false, error: "تاريخ السجل غير صالح." };
  }
  const status = String(input?.status || "done");
  if (!["done", "partial", "skipped", "vacation"].includes(status)) return { ok: false, error: "حالة السجل غير صحيحة." };
  const amount = input?.amount == null || input.amount === "" ? null : Number(input.amount);
  if (amount !== null && (!Number.isFinite(amount) || amount < 0)) return { ok: false, error: "الكمية يجب ألا تكون سالبة." };
  if (habit.trackingType !== "check" && amount === null && status !== "skipped" && status !== "vacation") return { ok: false, error: "أدخل الكمية أو المدة الفعلية." };
  return { ok: true, value: { ...input, localDate: date, status, amount, note: String(input?.note || "").trim() } };
}

export function habitSummary(habits, logs, date) {
  const liveHabits = habits.filter(h => !h.deleted_at && h.status !== "archived");
  const todayLogs = logs.filter(l => !l.deleted_at && l.localDate === date);
  const done = todayLogs.filter(l => l.status === "done").length;
  const weekStart = new Date(date + "T12:00:00Z");
  weekStart.setUTCDate(weekStart.getUTCDate() - weekStart.getUTCDay());
  const from = weekStart.toISOString().slice(0,10);
  const weekLogs = logs.filter(l => !l.deleted_at && l.localDate >= from && l.localDate <= date);
  return { activeCount: liveHabits.filter(h => h.status === "active").length, todayCount: todayLogs.length, todayDone: done, weekDone: weekLogs.filter(l => l.status === "done").length };
}
