export const SKINCARE_COLLECTIONS = Object.freeze({
  profile: "skin_profile",
  products: "skin_products",
  units: "skin_units",
  routines: "skin_routines",
  routineLogs: "skin_routine_logs",
  diary: "skin_diary",
  photos: "skin_photos",
  ingredients: "skin_ingredients",
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
  const suitability = text(input.suitability || "suitable", 20);
  if (!name) return { ok: false, error: "اسم المنتج مطلوب." };
  if (!["cleanser", "moisturizer", "sunscreen", "serum", "treatment", "toner", "mask", "other"].includes(category)) {
    return { ok: false, error: "تصنيف المنتج غير صحيح." };
  }
  if (!["active", "paused", "finished", "discarded"].includes(status)) return { ok: false, error: "حالة المنتج غير صحيحة." };
  if (!["suitable", "review", "avoid"].includes(suitability)) return { ok: false, error: "تقييم ملاءمة المنتج غير صحيح." };
  const startDate = text(input.startDate, 10);
  const expiryDate = text(input.expiryDate, 10);
  for (const [label, value] of [["تاريخ البدء", startDate], ["تاريخ الانتهاء", expiryDate]]) {
    if (value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) return { ok: false, error: label + " غير صالح." };
  }
  return { ok: true, value: {
    ...input, name, brand, category, status, suitability, startDate, expiryDate,
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
  if (reminderTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(reminderTime)) return { ok: false, error: "وقت التذكير غير صحيح." };
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
  if (["paused", "finished", "discarded", "stopped"].includes(product.status)) return { ok: false, error: "لا يمكن إضافة منتج منتهيًا أو متوقفًا." };
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


export function validateSkinDiaryEntry(input = {}, todayKey) {
  const date = text(input.date, 10);
  const parseDate = value => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [year, month, day] = value.split("-").map(Number);
    const parsed = new Date(Date.UTC(year, month - 1, day));
    return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
  };
  if (!parseDate(date)) return { ok: false, error: "تاريخ اليوم غير صالح." };
  if (todayKey && date > todayKey) return { ok: false, error: "لا يمكن تسجيل يوم في المستقبل." };
  const bounded = (key, label, min, max, integer = false) => {
    if (input[key] === "" || input[key] === null || input[key] === undefined) return { ok: true, value: null };
    const value = Number(input[key]);
    if (!Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) {
      return { ok: false, error: label + " خارج النطاق المسموح." };
    }
    return { ok: true, value };
  };
  const fields = [
    ["skinRating", "تقييم البشرة", 1, 5, true],
    ["sleepHours", "ساعات النوم", 0, 24, false],
    ["sleepQuality", "جودة النوم", 1, 5, true],
    ["mood", "المزاج", 1, 5, true],
    ["exerciseMinutes", "مدة النشاط", 0, 1440, true],
    ["waterGlasses", "أكواب المياه", 0, 100, true],
  ];
  const values = {};
  for (const [key, label, min, max, integer] of fields) {
    const checked = bounded(key, label, min, max, integer);
    if (!checked.ok) return checked;
    values[key] = checked.value;
  }
  const issues = Array.isArray(input.issues)
    ? [...new Set(input.issues.map(x => text(x, 60)).filter(Boolean))].slice(0, 20)
    : [];
  const areaKeys = ["forehead", "leftCheek", "rightCheek", "nose", "chin", "jawline"];
  const areaMeasurements = {};
  const sourceAreas = input.areaMeasurements && typeof input.areaMeasurements === "object" ? input.areaMeasurements : {};
  for (const key of areaKeys) {
    const raw = sourceAreas[key];
    if (raw === "" || raw === null || raw === undefined) {
      areaMeasurements[key] = null;
      continue;
    }
    const value = Number(raw);
    if (!Number.isInteger(value) || value < 0 || value > 5) {
      return { ok: false, error: "شدة المشكلة في إحدى مناطق الوجه يجب أن تكون من 0 إلى 5." };
    }
    areaMeasurements[key] = value;
  }
  return { ok: true, value: {
    ...input, date, ...values, issues, areaMeasurements,
    moodLabel: text(input.moodLabel, 40),
    note: text(input.note, 3000),
    trialId: text(input.trialId, 100) || null,
  }};
}


export function normalizeINCIName(value) {
  return text(value, 120).normalize("NFKC").toLocaleLowerCase("en").replace(/[\s_-]+/g, " ").trim();
}

export function parseINCIList(raw = "") {
  return [...new Set(String(raw ?? "")
    .split(/[,،;؛\n\r·•]+/)
    .map(item => text(item, 120))
    .filter(Boolean))];
}

export function validateSkinIngredient(input = {}) {
  const inciName = text(input.inciName || input.name, 120);
  if (!inciName) return { ok: false, error: "اسم INCI للمكوّن مطلوب." };
  const flag = text(input.flag || "none", 20);
  if (!["none", "favorite", "sensitive", "avoid"].includes(flag)) return { ok: false, error: "وسم المكوّن غير صحيح." };
  const aliases = Array.isArray(input.aliases)
    ? [...new Set(input.aliases.map(value => text(value, 120)).filter(Boolean))]
    : parseINCIList(input.aliasesText || "");
  return { ok: true, value: {
    id: text(input.id, 100),
    inciName,
    aliases: aliases.slice(0, 30),
    function: text(input.function, 300),
    notes: text(input.notes, 1200),
    flag,
    source: text(input.source, 500),
    updatedAt: new Date().toISOString(),
  }};
}

export function analyzeINCI(raw, ingredientLibrary = []) {
  const names = parseINCIList(raw);
  const index = new Map();
  ingredientLibrary.forEach(ingredient => {
    [ingredient.inciName, ...(ingredient.aliases || [])].forEach(alias => {
      const key = normalizeINCIName(alias);
      if (key && !index.has(key)) index.set(key, ingredient);
    });
  });
  const matches = [];
  const unknown = [];
  names.forEach(name => {
    const ingredient = index.get(normalizeINCIName(name));
    if (ingredient) matches.push({ inputName: name, ingredient });
    else unknown.push(name);
  });
  return {
    total: names.length,
    matched: matches.length,
    matches,
    unknown,
    flagged: matches.filter(item => ["sensitive", "avoid"].includes(item.ingredient.flag)),
  };
}

export function productsContainingIngredient(products = [], ingredient) {
  const aliases = [ingredient?.inciName, ...(ingredient?.aliases || [])]
    .map(normalizeINCIName).filter(Boolean);
  if (!aliases.length) return [];
  return products.filter(product => parseINCIList(product.ingredients || "")
    .some(name => aliases.includes(normalizeINCIName(name))));
}
