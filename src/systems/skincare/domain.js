export const SKINCARE_COLLECTIONS = Object.freeze({
  profile: "skin_profile",
  products: "skin_products",
  units: "skin_units",
});

const text = (value, max = 160) => String(value ?? "").trim().slice(0, max);

export function validateSkinProfile(input = {}) {
  const skinType = text(input.skinType, 40);
  const concerns = Array.isArray(input.concerns) ? input.concerns.map(x => text(x, 60)).filter(Boolean).slice(0, 20) : [];
  const sensitivities = Array.isArray(input.sensitivities) ? input.sensitivities.map(x => text(x, 80)).filter(Boolean).slice(0, 20) : [];
  if (skinType && !["normal", "dry", "oily", "combination", "sensitive", "unknown"].includes(skinType)) {
    return { ok: false, error: "نوع البشرة غير صحيح." };
  }
  return { ok: true, value: {
    id: "profile",
    skinType: skinType || "unknown",
    concerns,
    sensitivities,
    notes: text(input.notes, 2000),
    updatedAt: new Date().toISOString(),
  }};
}

export function validateSkinProduct(input = {}) {
  const name = text(input.name, 120);
  const brand = text(input.brand, 100);
  const category = text(input.category || "other", 40);
  const status = text(input.status || "active", 30);
  if (!name) return { ok: false, error: "اسم المنتج مطلوب." };
  if (!["cleanser", "moisturizer", "sunscreen", "serum", "treatment", "toner", "mask", "other"].includes(category)) {
    return { ok: false, error: "تصنيف المنتج غير صحيح." };
  }
  if (!["active", "paused", "finished", "discarded"].includes(status)) return { ok: false, error: "حالة المنتج غير صحيحة." };
  const startDate = text(input.startDate, 10);
  const expiryDate = text(input.expiryDate, 10);
  for (const [label, value] of [["تاريخ البدء", startDate], ["تاريخ الانتهاء", expiryDate]]) {
    if (value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) return { ok: false, error: label + " غير صالح." };
  }
  return { ok: true, value: {
    ...input, name, brand, category, status, startDate, expiryDate,
    ingredients: text(input.ingredients, 2000),
    instructions: text(input.instructions, 1000),
    notes: text(input.notes, 2000),
  }};
}

export function validateSkinUnit(input = {}) {
  const name = text(input.name, 100);
  const productId = text(input.productId, 100);
  const openedOn = text(input.openedOn, 10);
  const expiresOn = text(input.expiresOn, 10);
  if (!name) return { ok: false, error: "اسم العبوة مطلوب." };
  for (const [label, value] of [["تاريخ الفتح", openedOn], ["تاريخ الانتهاء", expiresOn]]) {
    if (value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) return { ok: false, error: label + " غير صالح." };
  }
  return { ok: true, value: { ...input, name, productId, openedOn, expiresOn, notes: text(input.notes, 1000) }};
}


export const ROUTINE_STEP_ORDER = Object.freeze([
  "cleanser", "toner", "treatment", "serum", "eye", "moisturizer", "sunscreen", "oil"
]);

export function validateRoutine(input = {}) {
  const name = text(input.name, 120);
  const timeOfDay = text(input.timeOfDay || "am", 10);
  const frequency = text(input.frequency || "daily", 20);
  const days = Array.isArray(input.days) ? [...new Set(input.days.map(Number).filter(x => Number.isInteger(x) && x >= 0 && x <= 6))] : [];
  if (!name) return { ok: false, error: "اسم الروتين مطلوب." };
  if (!["am", "pm", "custom"].includes(timeOfDay)) return { ok: false, error: "وقت الروتين غير صحيح." };
  if (!["daily", "selected_days", "times_per_week"].includes(frequency)) return { ok: false, error: "تكرار الروتين غير صحيح." };
  if (frequency === "selected_days" && !days.length) return { ok: false, error: "اختر يومًا واحدًا على الأقل." };
  const timesPerWeek = Number(input.timesPerWeek || 0);
  if (frequency === "times_per_week" && (!Number.isInteger(timesPerWeek) || timesPerWeek < 1 || timesPerWeek > 7)) {
    return { ok: false, error: "عدد مرات الأسبوع يجب أن يكون من 1 إلى 7." };
  }
  const reminderTime = text(input.reminderTime, 5);
  if (reminderTime && !/^([01]\\d|2[0-3]):[0-5]\\d$/.test(reminderTime)) return { ok: false, error: "وقت التذكير غير صحيح." };
  return { ok: true, value: {
    ...input, name, timeOfDay, frequency, days,
    timesPerWeek: frequency === "times_per_week" ? timesPerWeek : null,
    reminderTime: reminderTime || null,
    reminderEnabled: Boolean(input.reminderEnabled && reminderTime),
    status: input.status === "paused" ? "paused" : "active",
    steps: Array.isArray(input.steps) ? input.steps : [],
  }};
}

export function validateRoutineStep(input = {}, products = []) {
  const productId = text(input.productId, 100);
  const product = products.find(p => p.id === productId);
  if (!product) return { ok: false, error: "اختر منتجًا موجودًا." };
  if (["finished", "discarded", "stopped"].includes(product.status)) return { ok: false, error: "لا يمكن إضافة منتج منتهيًا أو متوقفًا." };
  const suitability = text(product.suitability || "suitable", 20);
  if (suitability === "avoid" && !input.avoidConfirmed) return { ok: false, requiresConfirmation: true, error: "هذا المنتج مصنف للتجنب. أكد أنك تريد إضافته رغم التحذير." };
  const category = text(input.category || product.category || "other", 30);
  if (!["cleanser", "toner", "treatment", "serum", "eye", "moisturizer", "sunscreen", "oil", "other"].includes(category)) {
    return { ok: false, error: "نوع خطوة الروتين غير صحيح." };
  }
  return { ok: true, value: {
    id: text(input.id, 100),
    productId, category,
    instruction: text(input.instruction, 500),
    order: Number.isInteger(input.order) ? input.order : 0,
    avoidConfirmed: Boolean(input.avoidConfirmed),
  }};
}

export function sortRoutineSteps(steps = []) {
  return [...steps].sort((a, b) => {
    const ai = ROUTINE_STEP_ORDER.indexOf(a.category);
    const bi = ROUTINE_STEP_ORDER.indexOf(b.category);
    const ar = ai < 0 ? ROUTINE_STEP_ORDER.length : ai;
    const br = bi < 0 ? ROUTINE_STEP_ORDER.length : bi;
    return ar - br || (a.order || 0) - (b.order || 0);
  }).map((step, index) => ({ ...step, order: index }));
}

export function isRoutineDue(routine, date = new Date(), logs = []) {
  if (!routine || routine.status !== "active") return false;
  const day = date.getDay();
  if (routine.frequency === "selected_days") return (routine.days || []).includes(day);
  if (routine.frequency === "times_per_week") {
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
    const start = new Date(date); start.setDate(start.getDate() - start.getDay());
    const weekStart = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo", year: "numeric", month: "2-digit", day: "2-digit" }).format(start);
    const completedDays = new Set(logs.filter(x => x.routineId === routine.id && x.status === "done" && x.date >= weekStart && x.date <= today).map(x => x.date));
    return completedDays.size < Number(routine.timesPerWeek || 0);
  }
  return true;
}

export function routineAdherence(logs = [], dueCount = 0) {
  if (!dueCount) return null;
  const done = logs.filter(log => log.status === "done").length;
  return Math.round((done / dueCount) * 100);
}

export function routineLogId(routineId, dateKey, stepId) {
  return [routineId, dateKey, stepId].join(":");
}
