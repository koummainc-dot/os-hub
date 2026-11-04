export const SKINCARE_COLLECTIONS = Object.freeze({
  profile: "skin_profile",
  products: "skin_products",
  units: "skin_units",
  routines: "skin_routines",
  routineLogs: "skin_routine_logs",
  diary: "skin_diary",
  photos: "skin_photos",
  ingredients: "skin_ingredients",
  trials: "skin_trials",
  reactions: "skin_reactions",
  lists: "skin_lists",
  settings: "skin_settings",
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
  if (!["cleanser", "moisturizer", "sunscreen", "serum", "treatment", "toner", "mask", "other"].includes(category)) return { ok: false, error: "تصنيف المنتج غير صحيح." };
  if (!["active", "paused", "finished", "discarded"].includes(status)) return { ok: false, error: "حالة المنتج غير صحيحة." };
  if (!["suitable", "review", "avoid"].includes(suitability)) return { ok: false, error: "تقييم ملاءمة المنتج غير صحيح." };
  const startDate = text(input.startDate, 10);
  const expiryDate = text(input.expiryDate, 10);
  const url = text(input.url, 1000);
  for (const [label, value] of [["تاريخ البدء", startDate], ["تاريخ الانتهاء", expiryDate]]) {
    if (value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) return { ok: false, error: label + " غير صالح." };
  }
  if (url) {
    try { const parsed = new URL(url); if (!["https:","http:"].includes(parsed.protocol)) return { ok: false, error: "رابط المنتج يجب أن يبدأ بـ HTTP أو HTTPS." }; }
    catch { return { ok: false, error: "رابط المنتج غير صالح." }; }
  }
  return { ok: true, value: {
    ...input, name, brand, category, status, suitability, startDate, expiryDate, url,
    stepSlot: text(input.stepSlot, 40),
    ingredients: text(input.ingredients, 2000),
    instructions: text(input.instructions, 1000),
    notes: text(input.notes, 2000),
  }};
}

export function isValidSkinDateKey(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) return false;
  const [year, month, day] = String(value).split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function effectiveSkinUnitExpiry(unit = {}) {
  const valid = isValidSkinDateKey;
  const addMonths = (dateKey, months) => {
    const [year, month, day] = dateKey.split("-").map(Number);
    const target = new Date(Date.UTC(year, month - 1 + months, 1));
    const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
    target.setUTCDate(Math.min(day, lastDay));
    return target.toISOString().slice(0, 10);
  };
  const candidates = [];
  if (valid(unit.expiresOn)) candidates.push(unit.expiresOn);
  const pao = Number(unit.paoMonths);
  if (valid(unit.openedOn) && Number.isInteger(pao) && pao >= 1 && pao <= 60) candidates.push(addMonths(unit.openedOn, pao));
  return candidates.length ? candidates.sort()[0] : null;
}

export function skinUnitStatus(unit = {}, todayKey = new Date().toISOString().slice(0, 10), soonDays = 30) {
  if (unit.finishedDate || unit.status === "finished") return "finished";
  const expiry = effectiveSkinUnitExpiry(unit);
  if (expiry && expiry < todayKey) return "expired";
  const safeSoonDays = Number.isInteger(soonDays) && soonDays >= 0 && soonDays <= 365 ? soonDays : 30;
  if (expiry && isValidSkinDateKey(todayKey) && expiry <= new Date(Date.parse(todayKey + "T00:00:00Z") + safeSoonDays * 86400000).toISOString().slice(0, 10)) return "expiring_soon";
  if (!unit.openedOn) return "unopened";
  return "active";
}

export function validateSkinUnit(input = {}, todayKey = new Date().toISOString().slice(0, 10)) {
  const name = text(input.name, 100);
  const productId = text(input.productId, 100);
  const purchaseDate = text(input.purchaseDate, 10);
  const openedOn = text(input.openedOn, 10);
  const expiresOn = text(input.expiresOn, 10);
  const startedUseDate = text(input.startedUseDate, 10);
  const finishedDate = text(input.finishedDate, 10);
  const paoMonths = input.paoMonths === "" || input.paoMonths == null ? null : Number(input.paoMonths);
  const price = input.price === "" || input.price == null ? null : Number(input.price);
  if (!name) return { ok: false, error: "اسم العبوة مطلوب." };
  for (const [label, value] of [["تاريخ الشراء", purchaseDate], ["تاريخ الفتح", openedOn], ["تاريخ الانتهاء", expiresOn], ["بدء الاستخدام", startedUseDate], ["تاريخ الانتهاء الفعلي", finishedDate]]) {
    if (value && !isValidSkinDateKey(value)) return { ok: false, error: label + " غير صالح." };
  }
  if (todayKey && !isValidSkinDateKey(todayKey)) return { ok: false, error: "تاريخ اليوم المرجعي غير صالح." };
  if (purchaseDate && todayKey && purchaseDate > todayKey) return { ok: false, error: "تاريخ الشراء لا يمكن أن يكون في المستقبل." };
  if (openedOn && todayKey && openedOn > todayKey) return { ok: false, error: "تاريخ الفتح لا يمكن أن يكون في المستقبل." };
  if (startedUseDate && todayKey && startedUseDate > todayKey) return { ok: false, error: "بدء الاستخدام لا يمكن أن يكون في المستقبل." };
  if (finishedDate && todayKey && finishedDate > todayKey) return { ok: false, error: "تاريخ الانتهاء الفعلي لا يمكن أن يكون في المستقبل." };
  if (purchaseDate && openedOn && openedOn < purchaseDate) return { ok: false, error: "تاريخ الفتح لا يمكن أن يسبق تاريخ الشراء." };
  if (purchaseDate && expiresOn && expiresOn < purchaseDate) return { ok: false, error: "تاريخ الانتهاء لا يمكن أن يسبق تاريخ الشراء." };
  if (openedOn && finishedDate && finishedDate < openedOn) return { ok: false, error: "تاريخ الانتهاء الفعلي لا يمكن أن يسبق تاريخ الفتح." };
  if (openedOn && startedUseDate && startedUseDate < openedOn) return { ok: false, error: "بدء الاستخدام لا يمكن أن يسبق تاريخ الفتح." };
  if (paoMonths !== null && (!Number.isInteger(paoMonths) || paoMonths < 1 || paoMonths > 60)) return { ok: false, error: "مدة الصلاحية بعد الفتح يجب أن تكون من شهر إلى 60 شهرًا." };
  if (price !== null && (!Number.isFinite(price) || price < 0 || price > 1000000000)) return { ok: false, error: "سعر العبوة غير صالح." };
  const currency = text(input.currency || "EGP", 3).toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) return { ok: false, error: "رمز العملة يجب أن يتكون من 3 أحرف." };
  return { ok: true, value: {
    ...input, name, productId, purchaseDate, openedOn, expiresOn, startedUseDate, finishedDate,
    paoMonths, price, currency, sizeNote: text(input.sizeNote, 120),
    finishReason: text(input.finishReason, 240), notes: text(input.notes, 1000),
    effectiveExpiry: effectiveSkinUnitExpiry({ ...input, openedOn, expiresOn, paoMonths }),
  }};
}

export function skinProductDeletionBlockers(productId, { units = [], routines = [], routineLogs = [], trials = [], reactions = [], lists = [] } = {}) {
  const id = text(productId, 100);
  if (!id) return ["invalid_product"];
  const blockers = [];
  if (units.some(item => !item.deleted_at && item.productId === id)) blockers.push("units");
  const linkedRoutineSteps = routines.flatMap(routine => (routine.steps || []).filter(step => step.productId === id).map(step => ({ routineId: routine.id, stepId: step.id })));
  if (linkedRoutineSteps.length) blockers.push("routine_steps");
  const loggedProduct = routineLogs.some(log => !log.deleted_at && (
    log.productIdSnapshot === id ||
    linkedRoutineSteps.some(link => link.routineId === log.routineId && link.stepId === log.stepId)
  ));
  if (loggedProduct) blockers.push("routine_logs");
  if (trials.some(item => !item.deleted_at && item.productId === id)) blockers.push("trials");
  if (reactions.some(item => !item.deleted_at && item.productId === id)) blockers.push("reactions");
  if (lists.some(item => !item.deleted_at && (item.productIds || []).includes(id))) blockers.push("lists");
  return blockers;
}

export function canRestoreSkinUnit(unit = {}, products = []) {
  const productId = text(unit.productId, 100);
  return !productId || products.some(product => product.id === productId && !product.deleted_at);
}

export function hasDuplicateSkinListName(list = {}, activeLists = []) {
  const name = normalizeINCIName(list.name);
  if (!name) return false;
  return activeLists.some(item => item.id !== list.id && normalizeINCIName(item.name) === name);
}

export function validateSkinList(input = {}) {
  const name = text(input.name, 100);
  const kind = text(input.kind || "custom", 20);
  if (!name) return { ok: false, error: "اسم القائمة مطلوب." };
  if (!["wishlist", "favorites", "empties", "custom"].includes(kind)) return { ok: false, error: "نوع القائمة غير صالح." };
  const productIds = [...new Set((Array.isArray(input.productIds) ? input.productIds : []).map(x => text(x, 100)).filter(Boolean))].slice(0, 500);
  return { ok: true, value: { ...input, name, kind, productIds, notes: text(input.notes, 1000) } };
}

export function validateSkinSettings(input = {}) {
  const timezone = text(input.timezone || "Africa/Cairo", 80);
  const weekStartDay = Number(input.weekStartDay ?? 6);
  const trialDays = Number(input.trialDays ?? 28);
  const expirySoonDays = Number(input.expirySoonDays ?? 30);
  const photoReminderDays = Number(input.photoReminderDays ?? 14);
  const comparisonWindowDays = Number(input.comparisonWindowDays ?? 30);
  const adherenceThreshold = Number(input.adherenceThreshold ?? 80);
  const minDaysForCorrelation = Number(input.minDaysForCorrelation ?? 14);
  const minDaysForAverage = Number(input.minDaysForAverage ?? 3);
  const quietStart = text(input.quietStart || "22:00", 5);
  const quietEnd = text(input.quietEnd || "08:00", 5);
  if (!timezone || !/^[A-Za-z_+-]+(?:\/[A-Za-z0-9_+.-]+)*$/.test(timezone)) return { ok: false, error: "المنطقة الزمنية غير صالحة." };
  try { new Intl.DateTimeFormat("en-US", { timeZone: timezone }); } catch { return { ok: false, error: "المنطقة الزمنية غير مدعومة." }; }
  if (![0,1,6].includes(weekStartDay)) return { ok: false, error: "بداية الأسبوع غير صالحة." };
  for (const [label,value,min,max] of [["مدة التجربة",trialDays,1,180],["نافذة الانتهاء",expirySoonDays,1,180],["تذكير الصور",photoReminderDays,1,365],["نافذة المقارنة",comparisonWindowDays,7,180],["عتبة الالتزام",adherenceThreshold,1,100],["أيام الارتباط",minDaysForCorrelation,5,90],["أيام المتوسط",minDaysForAverage,1,30]]) {
    if (!Number.isInteger(value) || value < min || value > max) return { ok: false, error: label + " خارج النطاق المسموح." };
  }
  if (![quietStart,quietEnd].every(v=>/^([01]\d|2[0-3]):[0-5]\d$/.test(v))) return { ok: false, error: "ساعات الهدوء غير صالحة." };
  const unitsSystem = text(input.unitsSystem || "metric", 20);
  if (!["metric","imperial"].includes(unitsSystem)) return { ok: false, error: "نظام الوحدات غير صالح." };
  return { ok: true, value: { ...input, id:"settings", timezone, weekStartDay, trialDays, expirySoonDays, photoReminderDays, comparisonWindowDays, adherenceThreshold, minDaysForCorrelation, minDaysForAverage, quietStart, quietEnd, unitsSystem, requireConfirmAvoid:input.requireConfirmAvoid!==false } };
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

export function isRoutineDue(routine, date = new Date(), logs = [], timezone = "Africa/Cairo", weekStartDay = 0) {
  if (!routine || routine.status !== "active") return false;
  let localDateKey;
  if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) localDateKey = date;
  else {
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
    const values = Object.fromEntries(parts.filter(part => ["year","month","day"].includes(part.type)).map(part => [part.type,part.value]));
    localDateKey = values.year + "-" + values.month + "-" + values.day;
  }
  const [year,month,dayOfMonth] = localDateKey.split("-").map(Number);
  const day = new Date(Date.UTC(year,month-1,dayOfMonth)).getUTCDay();
  if (routine.frequency === "selected_days") return (routine.days || []).includes(day);
  if (routine.frequency === "times_per_week") {
    const start = new Date(Date.UTC(year,month-1,dayOfMonth));
    const startDay = Number.isInteger(weekStartDay) && weekStartDay >= 0 && weekStartDay <= 6 ? weekStartDay : 0;
    start.setUTCDate(start.getUTCDate() - ((day - startDay + 7) % 7));
    const weekStart = start.toISOString().slice(0,10);
    const completedDays = new Set(logs.filter(x => x.routineId === routine.id && x.status === "done" && x.date >= weekStart && x.date <= localDateKey).map(x => x.date));
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
    referenceUrl: text(input.referenceUrl, 1000),
    catalogKey: text(input.catalogKey, 120),
    catalogVersion: text(input.catalogVersion, 40),
    sourceType: text(input.sourceType, 40) || "user",
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


const parseSkinDate = value => {
  const date = text(value, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const [year, month, day] = date.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day ? date : null;
};

export const SKIN_TRIAL_STATUSES = Object.freeze(["planned", "running", "paused", "completed", "cancelled"]);
export const SKIN_TRIAL_VERDICTS = Object.freeze(["pending", "improved", "unchanged", "worse", "inconclusive"]);
export const SKIN_REACTION_SEVERITIES = Object.freeze(["mild", "moderate", "severe"]);

export function validateSkinTrial(input = {}, todayKey) {
  const productId = text(input.productId, 100);
  const question = text(input.question, 500);
  const startDate = parseSkinDate(input.startDate);
  const plannedDays = Number(input.plannedDays);
  const status = text(input.status || "planned", 20);
  const verdict = text(input.verdict || "pending", 20);
  const endDate = input.endDate ? parseSkinDate(input.endDate) : "";
  if (input.endDate && !endDate) return { ok: false, error: "تاريخ نهاية التجربة غير صالح." };
  if (!productId) return { ok: false, error: "اختر المنتج المرتبط بالتجربة." };
  if (!question) return { ok: false, error: "اكتب سؤالًا واضحًا للتجربة." };
  if (!startDate) return { ok: false, error: "تاريخ بداية التجربة غير صالح." };
  if (todayKey && startDate > todayKey) return { ok: false, error: "لا يمكن بدء تجربة بتاريخ مستقبلي." };
  if (!Number.isInteger(plannedDays) || plannedDays < 1 || plannedDays > 180) return { ok: false, error: "مدة التجربة يجب أن تكون من يوم إلى 180 يومًا." };
  if (!SKIN_TRIAL_STATUSES.includes(status)) return { ok: false, error: "حالة التجربة غير صحيحة." };
  if (!SKIN_TRIAL_VERDICTS.includes(verdict)) return { ok: false, error: "نتيجة التجربة غير صحيحة." };
  if (endDate && endDate < startDate) return { ok: false, error: "تاريخ نهاية التجربة يسبق تاريخ البداية." };
  if (status === "completed" && (verdict === "pending" || !endDate)) return { ok: false, error: "إنهاء التجربة يتطلب تاريخ نهاية ونتيجة يحددها المستخدم." };
  const baselineDiaryIds = Array.isArray(input.baselineDiaryIds)
    ? [...new Set(input.baselineDiaryIds.map(value => text(value, 100)).filter(Boolean))].slice(0, 14)
    : [];
  const allowedTimelineTypes = ["started", "resumed", "paused", "completed", "cancelled"];
  const timelineEvents = Array.isArray(input.timelineEvents) ? input.timelineEvents.slice(-200).flatMap(event => {
    const date = parseSkinDate(event?.date);
    const type = text(event?.type, 20);
    const id = text(event?.id, 100);
    if (!date || !id || !allowedTimelineTypes.includes(type)) return [];
    return [{ id, date, type, note: text(event?.note, 300) }];
  }) : [];
  return { ok: true, value: {
    ...input,
    id: text(input.id, 100),
    productId,
    question,
    startDate,
    plannedDays,
    status,
    endDate: endDate || null,
    verdict,
    verdictNote: text(input.verdictNote, 2000),
    baselineDiaryIds,
    timelineEvents,
    updatedAt: new Date().toISOString(),
  }};
}

export function transitionSkinTrial(trial, nextStatus, details = {}, todayKey) {
  const allowed = {
    planned: ["running", "cancelled"],
    running: ["paused", "completed", "cancelled"],
    paused: ["running", "completed", "cancelled"],
    completed: [],
    cancelled: [],
  };
  if (!trial || !allowed[trial.status]?.includes(nextStatus)) {
    return { ok: false, error: "انتقال حالة التجربة غير مسموح." };
  }
  const candidate = { ...trial, ...details, status: nextStatus };
  if (nextStatus === "running" && trial.status === "planned" && !candidate.startedAt) candidate.startedAt = todayKey || new Date().toISOString().slice(0, 10);
  if (nextStatus === "completed") {
    candidate.endDate = parseSkinDate(details.endDate || todayKey || new Date().toISOString().slice(0, 10));
    candidate.verdict = text(details.verdict, 20);
  }
  return validateSkinTrial(candidate, todayKey);
}

export function validateSkinReaction(input = {}, todayKey) {
  const productId = text(input.productId, 100);
  const dateStarted = parseSkinDate(input.dateStarted);
  const severity = text(input.severity, 20);
  const resolvedDate = input.resolvedDate ? parseSkinDate(input.resolvedDate) : "";
  if (input.resolvedDate && !resolvedDate) return { ok: false, error: "تاريخ حل التفاعل غير صالح." };
  if (!productId) return { ok: false, error: "اربط التفاعل بمنتج مسجل." };
  if (!dateStarted) return { ok: false, error: "تاريخ بداية التفاعل غير صالح." };
  if (todayKey && dateStarted > todayKey) return { ok: false, error: "لا يمكن تسجيل تفاعل بتاريخ مستقبلي." };
  if (!SKIN_REACTION_SEVERITIES.includes(severity)) return { ok: false, error: "درجة شدة التفاعل غير صحيحة." };
  if (resolvedDate && resolvedDate < dateStarted) return { ok: false, error: "تاريخ الحل يسبق تاريخ بداية التفاعل." };
  if (resolvedDate && todayKey && resolvedDate > todayKey) return { ok: false, error: "تاريخ الحل لا يمكن أن يكون في المستقبل." };
  const status = text(input.status || (resolvedDate ? "resolved" : "open"), 20);
  if (!["open", "resolved", "archived"].includes(status)) return { ok: false, error: "حالة التفاعل غير صحيحة." };
  if (status === "resolved" && !resolvedDate) return { ok: false, error: "تحديد حالة محلول يتطلب تاريخ الحل." };
  const symptoms = Array.isArray(input.symptoms)
    ? [...new Set(input.symptoms.map(value => text(value, 100)).filter(Boolean))].slice(0, 30)
    : [];
  const suspectedIngredientIds = Array.isArray(input.suspectedIngredientIds)
    ? [...new Set(input.suspectedIngredientIds.map(value => text(value, 100)).filter(Boolean))].slice(0, 30)
    : [];
  return { ok: true, value: {
    ...input,
    id: text(input.id, 100),
    productId,
    unitId: text(input.unitId, 100) || null,
    dateStarted,
    severity,
    symptoms,
    area: text(input.area, 200),
    actionTaken: text(input.actionTaken, 1000),
    resolvedDate: resolvedDate || null,
    status,
    suspectedIngredientIds,
    note: text(input.note, 2000),
    updatedAt: new Date().toISOString(),
  }};
}

export function canDeleteSkinReaction(reaction) {
  return !!reaction && reaction.severity !== "severe";
}


export function analyzeSkinFactors(entries = []) {
  const factors = [
    ["sleepHours", "ساعات النوم"],
    ["sleepQuality", "جودة النوم"],
    ["mood", "المزاج"],
    ["exerciseMinutes", "مدة النشاط"],
    ["waterGlasses", "أكواب المياه"],
  ];
  const rated = entries.filter(entry => entry.skinRating !== null && entry.skinRating !== undefined &&
    entry.skinRating !== "" && Number.isFinite(Number(entry.skinRating)));
  const correlations = factors.map(([key, label]) => {
    const pairs = rated.filter(entry => entry[key] !== null && entry[key] !== undefined &&
      entry[key] !== "" && Number.isFinite(Number(entry[key])))
      .map(entry => [Number(entry[key]), Number(entry.skinRating)]);
    if (pairs.length < 5) return { key, label, count: pairs.length, coefficient: null, status: "insufficient" };
    const meanX = pairs.reduce((sum, pair) => sum + pair[0], 0) / pairs.length;
    const meanY = pairs.reduce((sum, pair) => sum + pair[1], 0) / pairs.length;
    const numerator = pairs.reduce((sum, pair) => sum + (pair[0] - meanX) * (pair[1] - meanY), 0);
    const sumX = pairs.reduce((sum, pair) => sum + (pair[0] - meanX) ** 2, 0);
    const sumY = pairs.reduce((sum, pair) => sum + (pair[1] - meanY) ** 2, 0);
    if (!sumX || !sumY) return { key, label, count: pairs.length, coefficient: null, status: "no-variation" };
    const coefficient = numerator / Math.sqrt(sumX * sumY);
    return { key, label, count: pairs.length, coefficient: Number(coefficient.toFixed(2)), status: "computed" };
  });
  const issueNames = [...new Set(rated.flatMap(entry => Array.isArray(entry.issues) ? entry.issues : []))].slice(0, 30);
  const issueComparisons = issueNames.map(issue => {
    const withIssue = rated.filter(entry => (entry.issues || []).includes(issue));
    const withoutIssue = rated.filter(entry => !(entry.issues || []).includes(issue));
    const avg = rows => rows.length ? Number((rows.reduce((sum, entry) => sum + Number(entry.skinRating), 0) / rows.length).toFixed(2)) : null;
    return { issue, withCount: withIssue.length, withoutCount: withoutIssue.length,
      withAverage: avg(withIssue), withoutAverage: avg(withoutIssue),
      difference: withIssue.length >= 3 && withoutIssue.length >= 3
        ? Number((avg(withIssue) - avg(withoutIssue)).toFixed(2)) : null };
  }).sort((a, b) => b.withCount - a.withCount).slice(0, 8);
  return {
    ratedCount: rated.length,
    dateCount: new Set(rated.map(entry => entry.date)).size,
    correlations,
    issueComparisons,
    interpretation: "هذه ارتباطات وصفية في السجلات المتاحة فقط؛ لا تثبت السببية أو اتجاه التأثير، وقد تتأثر بقلة البيانات واختلاف ظروف التسجيل.",
  };
}

export function summarizeSkinTrial(trial, diaryEntries = [], reactions = [], otherTrials = []) {
  const baselineIds = new Set(trial?.baselineDiaryIds || []);
  const validRating = entry => entry.skinRating !== null && entry.skinRating !== undefined &&
    entry.skinRating !== "" && Number.isFinite(Number(entry.skinRating));
  const baseline = diaryEntries.filter(entry => baselineIds.has(entry.id) && validRating(entry));
  const finish = trial?.endDate || new Date().toISOString().slice(0, 10);
  const followup = diaryEntries.filter(entry =>
    entry.date >= trial.startDate && entry.date <= finish && validRating(entry)
  );
  const average = rows => rows.length ? rows.reduce((sum, entry) => sum + Number(entry.skinRating), 0) / rows.length : null;
  const summarizePeriod = (startDate, endDate) => {
    const active = startDate <= finish;
    const boundedEnd = endDate > finish ? finish : endDate;
    const rows = active ? followup.filter(entry => entry.date >= startDate && entry.date <= boundedEnd) : [];
    const value = average(rows);
    return {
      startDate,
      endDate: boundedEnd,
      active,
      count: rows.length,
      daysRecorded: new Set(rows.map(entry => entry.date)).size,
      average: value === null ? null : Number(value.toFixed(2)),
      deltaFromBaseline: value === null || average(baseline) === null
        ? null
        : Number((value - average(baseline)).toFixed(2)),
    };
  };
  const firstWeek = summarizePeriod(trial.startDate, addSkinDays(trial.startDate, 6));
  const secondWeek = summarizePeriod(addSkinDays(trial.startDate, 7), addSkinDays(trial.startDate, 13));
  const finalWeekStart = finish > addSkinDays(trial.startDate, 6) ? laterSkinDate(trial.startDate, addSkinDays(finish, -6)) : trial.startDate;
  const finalWeek = summarizePeriod(finalWeekStart, finish);
  const periodsOverlap = finalWeek.startDate <= firstWeek.endDate || finalWeek.startDate <= secondWeek.endDate;
  const baselineAverage = average(baseline);
  const followupAverage = average(followup);
  const concurrent = otherTrials.filter(item => {
    if (item.id === trial.id || item.productId === trial.productId || item.status === "cancelled") return false;
    const otherStart = item.startDate;
    const otherFinish = item.endDate || (["running", "paused"].includes(item.status) ? finish : item.startDate);
    return Boolean(otherStart && otherFinish && otherStart <= finish && otherFinish >= trial.startDate);
  });
  const linkedReactions = reactions.filter(item => item.productId === trial.productId &&
    item.dateStarted >= trial.startDate && item.dateStarted <= finish);
  return {
    baselineCount: baseline.length,
    followupCount: followup.length,
    baselineAverage: baselineAverage === null ? null : Number(baselineAverage.toFixed(2)),
    followupAverage: followupAverage === null ? null : Number(followupAverage.toFixed(2)),
    delta: baselineAverage === null || followupAverage === null ? null : Number((followupAverage - baselineAverage).toFixed(2)),
    firstWeek,
    secondWeek,
    finalWeek,
    periodsOverlap,
    concurrentTrialCount: concurrent.length,
    concurrentTrials: concurrent.map(item => ({ id: item.id, productId: item.productId, startDate: item.startDate, endDate: item.endDate || null, status: item.status })),
    reactionCount: linkedReactions.length,
    reactionSeverityCounts: linkedReactions.reduce((counts, item) => {
      const key = item.severity || "unknown";
      counts[key] = (counts[key] || 0) + 1;
      return counts;
    }, {}),
    enoughData: baseline.length >= 3 && followup.length >= 3,
    interpretation: "مقارنة وصفية بين إدخالاتك؛ لا تثبت أن المنتج سبب التغير. ضع في الاعتبار التجارب المتزامنة والتفاعلات واختلاف ظروف التسجيل.",
  };
}

function addSkinDays(dateKey, delta) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + delta)).toISOString().slice(0, 10);
}

function laterSkinDate(first, second) {
  return first > second ? first : second;
}


const SKIN_DASHBOARD_AREAS = Object.freeze([
  ["forehead", "الجبهة"], ["leftCheek", "الخد الأيسر"], ["rightCheek", "الخد الأيمن"],
  ["nose", "الأنف"], ["chin", "الذقن"], ["jawline", "الفك"],
]);

function dashboardDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return year + "-" + month + "-" + day;
}

function shiftDashboardDate(dateKey, delta) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return dashboardDateKey(new Date(year, month - 1, day + delta, 12));
}

export function buildSkinDashboardData({
  entries = [], trials = [], reactions = [], photos = [], routines = [], routineLogs = [], products = [], deletedProducts = [],
  endDate = dashboardDateKey(new Date()), days = 30,
} = {}) {
  const safeDays = [30, 90, 180].includes(Number(days)) ? Number(days) : 30;
  const startDate = shiftDashboardDate(endDate, -(safeDays - 1));
  const inRange = date => typeof date === "string" && date >= startDate && date <= endDate;
  const rangeEntries = entries.filter(entry => inRange(entry.date));
  const ratedEntries = rangeEntries.filter(entry => entry.skinRating !== null &&
    entry.skinRating !== undefined && entry.skinRating !== "" && Number.isFinite(Number(entry.skinRating)));
  const byDate = new Map(ratedEntries.map(entry => [entry.date, entry]));
  const timeline = Array.from({ length: safeDays }, (_, index) => {
    const date = shiftDashboardDate(startDate, index);
    const entry = byDate.get(date);
    return { date, recorded: Boolean(entry), rating: entry ? Number(entry.skinRating) : null };
  });
  const mean = values => values.length
    ? Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2)) : null;
  const areas = SKIN_DASHBOARD_AREAS.map(([key, label]) => {
    const values = rangeEntries.map(entry => entry.areaMeasurements?.[key])
      .filter(value => value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value)))
      .map(Number);
    return { key, label, average: mean(values), count: values.length };
  });
  const rangeTrials = trials.filter(item => item.startDate && item.startDate <= endDate &&
    (item.endDate ? item.endDate >= startDate : ["running", "paused"].includes(item.status) || item.startDate >= startDate));
  const openReactions = reactions.filter(item => item.status === "open");
  const rangeReactions = reactions.filter(item => inRange(item.dateStarted));
  const reactionTimeline = Object.values(rangeReactions.reduce((groups, item) => {
    const key = item.dateStarted;
    if (!groups[key]) groups[key] = { date: key, count: 0, severe: 0, moderate: 0, mild: 0 };
    groups[key].count += 1;
    if (groups[key][item.severity] !== undefined) groups[key][item.severity] += 1;
    return groups;
  }, {})).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);
  const trialSummaries = rangeTrials.slice().sort((a, b) => String(b.startDate).localeCompare(String(a.startDate)))
    .slice(0, 8).map(trial => ({
      id: trial.id, productId: trial.productId, productNameSnapshot: trial.productNameSnapshot || "", status: trial.status,
      startDate: trial.startDate, endDate: trial.endDate || null,
      summary: summarizeSkinTrial(trial, entries, reactions, trials),
    }));
  const rangePhotos = photos.filter(item => inRange(item.date));
  const rangeLogs = routineLogs.filter(item => inRange(item.date));
  const doneLogs = rangeLogs.filter(item => item.status === "done").length;
  const skippedLogs = rangeLogs.filter(item => item.status === "skipped").length;
  const loggedSteps = doneLogs + skippedLogs;
  const factorAnalysis = analyzeSkinFactors(rangeEntries);
  const visibleProducts = products.filter(item => !item.deleted_at);
  const productSummary = {
    activeCount: visibleProducts.filter(item => item.status === "active").length,
    inactiveCount: visibleProducts.filter(item => item.status !== "active").length,
    deletedCount: deletedProducts.filter(item => Boolean(item.deleted_at)).length,
    savedCount: visibleProducts.length,
  };
  const activeProductIds = new Set(visibleProducts.filter(item => item.status === "active").map(item => item.id));
  const currentTrials = trials.filter(item => activeProductIds.has(item.productId));
  return {
    startDate, endDate, days: safeDays, timeline, productSummary,
    daysWithRating: new Set(ratedEntries.map(entry => entry.date)).size,
    daysWithoutRating: safeDays - new Set(ratedEntries.map(entry => entry.date)).size,
    averageRating: mean(ratedEntries.map(entry => Number(entry.skinRating))),
    areas,
    openReactionCount: openReactions.length,
    rangeReactionCount: rangeReactions.length,
    reactionTimeline,
    trialSummaries,
    severeReactionCount: rangeReactions.filter(item => item.severity === "severe").length,
    runningTrialCount: currentTrials.filter(item => item.status === "running").length,
    pausedTrialCount: currentTrials.filter(item => item.status === "paused").length,
    rangeTrialCount: rangeTrials.length,
    photoCount: rangePhotos.length,
    routineLogCount: loggedSteps,
    routineDoneCount: doneLogs,
    routineSkippedCount: skippedLogs,
    routineCompletionAmongLogged: loggedSteps ? Number((doneLogs / loggedSteps * 100).toFixed(1)) : null,
    activeRoutineCount: routines.filter(item => item.status === "active").length,
    factorAnalysis,
  };
}



export function buildSkinDashboardExportMatrix({ data = {}, trials = [], reactions = [], routineLogs = [], products = [], deletedProducts = [] } = {}) {
  const rows = [
    ["نوع السجل", "المعرّف", "اسم المنتج", "الحالة", "التاريخ / البداية", "تاريخ النهاية", "التفاصيل"],
    ["ملخص", "product.active", "المنتجات النشطة", data.productSummary?.activeCount ?? 0, data.startDate || "", data.endDate || "", "ضمن الكتالوج الحالي"],
    ["ملخص", "product.inactive", "المنتجات المحفوظة غير النشطة", data.productSummary?.inactiveCount ?? 0, data.startDate || "", data.endDate || "", "متوقفة أو منتهية أو تم التخلص منها"],
    ["ملخص", "product.deleted", "المنتجات في المحذوفات", data.productSummary?.deletedCount ?? 0, data.startDate || "", data.endDate || "", "مستبعدة من أرقام الكتالوج الحالي"],
    ["ملخص", "product.saved", "إجمالي المنتجات المحفوظة", data.productSummary?.savedCount ?? 0, data.startDate || "", data.endDate || "", "نشطة + غير نشطة، دون المحذوفات"],
    ["ملخص", "trial.running", "التجارب الجارية لمنتجات نشطة", data.runningTrialCount ?? 0, data.startDate || "", data.endDate || "", "عداد حالي لا يشمل التجارب التاريخية لمنتجات غير نشطة"],
    ["ملخص", "trial.paused", "التجارب المتوقفة لمنتجات نشطة", data.pausedTrialCount ?? 0, data.startDate || "", data.endDate || "", "عداد حالي لا يشمل التجارب التاريخية لمنتجات غير نشطة"],
    ["ملخص", "trial.history", "التجارب التاريخية ضمن الفترة", data.rangeTrialCount ?? 0, data.startDate || "", data.endDate || "", "تُحفظ حتى عند توقف المنتج أو حذفه"],
    ["ملخص", "reaction.count", "التفاعلات خلال الفترة", data.rangeReactionCount ?? 0, data.startDate || "", data.endDate || "", "سجلات تاريخية"],
    ["ملخص", "routine.logs", "سجلات خطوات الروتين", data.routineLogCount ?? 0, data.startDate || "", data.endDate || "", "تم: " + (data.routineDoneCount ?? 0) + "؛ تخطي: " + (data.routineSkippedCount ?? 0)],
    ["ملخص", "rating.average", "متوسط التقييم", data.averageRating ?? "—", data.startDate || "", data.endDate || "", "من الإدخالات المسجلة فقط؛ الأيام المفقودة ليست صفرًا"],
  ];
  const productNames = new Map([...products, ...deletedProducts].map(item => [item.id, item.name || item.productNameSnapshot || "منتج غير مسمى"]));
  for (const trial of trials) rows.push(["تجربة تاريخية", trial.id || "", trial.productNameSnapshot || productNames.get(trial.productId) || "منتج غير متاح (سجل تاريخي)", trial.status || "", trial.startDate || "", trial.endDate || "", "المنتج المرتبط: " + (trial.productId || "")]);
  for (const reaction of reactions) rows.push(["تفاعل تاريخي", reaction.id || "", reaction.productNameSnapshot || productNames.get(reaction.productId) || "منتج غير متاح (سجل تاريخي)", reaction.status || "", reaction.dateStarted || reaction.date || "", reaction.dateEnded || "", "الشدة: " + (reaction.severity || "غير محددة")]);
  for (const log of routineLogs) rows.push(["سجل روتين تاريخي", log.id || "", log.productNameSnapshot || productNames.get(log.productIdSnapshot || log.productId) || "منتج غير متاح (سجل تاريخي)", log.status || "", log.date || "", "", "الروتين: " + (log.routineNameSnapshot || log.routineName || "روتين") + "؛ الخطوة: " + (log.stepCategorySnapshot || log.stepCategory || "")]);
  return rows;
}

const skincareDateShift = (key, amount) => {
  const [year, month, day] = String(key).split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + amount)).toISOString().slice(0, 10);
};
const skincareDateDistance = (from, to) => {
  if (!isValidSkinDateKey(from) || !isValidSkinDateKey(to)) return null;
  const a = Date.parse(String(from) + "T00:00:00Z");
  const b = Date.parse(String(to) + "T00:00:00Z");
  return Number.isFinite(a) && Number.isFinite(b) ? Math.round((b - a) / 86400000) : null;
};

export function buildSkinFollowUps({
  today = new Date().toISOString().slice(0, 10),
  products = [], units = [], routines = [], routineLogs = [], trials = [], reactions = [],
  expiryWindowDays = 30, trialWindowDays = 7, timezone = "Africa/Cairo", weekStartDay = 0,
} = {}) {
  const items = [];
  const add = item => items.push({ ...item, id: item.id || [item.type, item.sourceId, item.dueDate || today].join(":") });
  for (const product of products) {
    if (product.status !== "active" || !product.expiryDate) continue;
    const distance = skincareDateDistance(today, product.expiryDate);
    if (distance === null || distance > expiryWindowDays) continue;
    add({ type: "product-expiry", sourceId: product.id, title: product.name,
      description: distance < 0 ? "تاريخ انتهاء المنتج مرّ؛ راجع حالته قبل الاستخدام." : distance === 0 ? "تاريخ الانتهاء اليوم؛ راجع حالة المنتج." : "متبقي " + distance + " يومًا على تاريخ الانتهاء.",
      dueDate: product.expiryDate, daysRemaining: distance, priority: distance < 0 ? "high" : "normal",
      page: "products", action: "مراجعة المنتج" });
  }
  for (const unit of units) {
    const effectiveExpiry = effectiveSkinUnitExpiry(unit);
    if (!effectiveExpiry || unit.finishedDate || unit.status === "finished") continue;
    const distance = skincareDateDistance(today, effectiveExpiry);
    if (distance === null || distance > expiryWindowDays) continue;
    const product = products.find(item => item.id === unit.productId);
    const source = unit.expiresOn && effectiveExpiry === unit.expiresOn ? "تاريخ الانتهاء المطبوع" : "مدة الصلاحية بعد الفتح";
    add({ type: "unit-expiry", sourceId: unit.id, title: unit.name,
      description: distance < 0 ? "تاريخ الانتهاء المحسوب مرّ؛ راجع العبوة قبل الاستخدام." : distance === 0 ? "تاريخ الانتهاء المحسوب اليوم." : "متبقي " + distance + " يومًا حسب " + source + ".",
      dueDate: effectiveExpiry, daysRemaining: distance, priority: distance < 0 ? "high" : "normal",
      productName: product?.name || "", page: "units", action: "مراجعة العبوة" });
  }
  const localDate = String(today);
  const dayLogs = routineLogs.filter(log => log.date === today);
  for (const routine of routines) {
    if (routine.status !== "active" || !routine.reminderEnabled || !routine.reminderTime) continue;
    if (!isRoutineDue(routine, localDate, routineLogs, timezone, weekStartDay)) continue;
    const steps = (routine.steps || []).filter(step => !step.archived);
    const pending = steps.filter(step => !dayLogs.some(log => log.routineId === routine.id && log.stepId === step.id && ["done", "skipped"].includes(log.status)));
    if (!pending.length) continue;
    add({ type: "routine-reminder", sourceId: routine.id, title: routine.name,
      description: "روتين اليوم مستحق؛ تبقى " + pending.length + " خطوة دون تسجيل.",
      dueDate: today, reminderTime: routine.reminderTime, priority: "normal",
      page: "routines", action: "فتح الروتين" });
  }
  for (const trial of trials) {
    if (trial.status === "planned" && trial.startDate) {
      const distance = skincareDateDistance(today, trial.startDate);
      if (distance !== null && distance >= 0 && distance <= trialWindowDays) {
        add({ type: "trial-start", sourceId: trial.id, title: "موعد بدء تجربة",
          description: "تجربة المنتج مجدولة للبدء خلال " + distance + " يومًا.",
          dueDate: trial.startDate, daysRemaining: distance, priority: "normal",
          page: "trials", action: "مراجعة التجربة" });
      }
    }
    if (trial.status === "running" && trial.startDate && Number(trial.plannedDays) > 0) {
      const dueDate = skincareDateShift(trial.startDate, Number(trial.plannedDays));
      const distance = skincareDateDistance(today, dueDate);
      if (distance !== null && distance <= 0) {
        add({ type: "trial-review", sourceId: trial.id, title: "موعد مراجعة التجربة",
          description: distance < 0 ? "مرّ الموعد المخطط لمراجعة التجربة؛ حدّث حالتها أو مدتها." : "حلّ الموعد المخطط لمراجعة التجربة؛ سجّل ما توصلت إليه.",
          dueDate, daysRemaining: distance, priority: "high",
          page: "trials", action: "مراجعة التجربة" });
      }
    }
  }
  for (const reaction of reactions) {
    if (reaction.status !== "open") continue;
    const product = products.find(item => item.id === reaction.productId);
    add({ type: "reaction-followup", sourceId: reaction.id, title: "تفاعل مفتوح" + (product?.name ? " · " + product.name : ""),
      description: reaction.severity === "severe" ? "يوجد تفاعل مسجل بشدة عالية لم تتم تسويته؛ راجع السجل." : "يوجد تفاعل لم يتم تسجيل حله أو أرشفته بعد.",
      dueDate: reaction.dateStarted || today, priority: reaction.severity === "severe" ? "high" : "normal",
      page: "reactions", action: "مراجعة التفاعل" });
  }
  const rank = { high: 0, normal: 1 };
  return items.sort((a, b) => rank[a.priority] - rank[b.priority] ||
    String(a.dueDate).localeCompare(String(b.dueDate)) || a.title.localeCompare(b.title, "ar"));
}

const SKIN_PRODUCT_CSV_FIELDS = [
  "name", "brand", "category", "status", "suitability", "startDate",
  "expiryDate", "ingredients", "instructions", "notes", "url", "stepSlot", "deleted_at",
];

function parseCsvMatrix(input) {
  const source = String(input || "").replace(/^\uFEFF|^\\uFEFF/, "");
  if (source.length > 5 * 1024 * 1024) return { ok: false, error: "ملف CSV أكبر من 5 ميجابايت." };
  const rows = [];
  let row = [], cell = "", quoted = false;
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (quoted) {
      if (char === '"' && source[i + 1] === '"') { cell += '"'; i++; }
      else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"' && cell.length === 0) quoted = true;
    else if (char === ",") { row.push(cell); cell = ""; }
    else if (char === "\n" || char === "\r") {
      if (char === "\r" && source[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some(value => String(value).trim() !== "")) rows.push(row);
      row = [];
    } else cell += char;
  }
  if (quoted) return { ok: false, error: "يوجد حقل نصي غير مغلق بعلامة اقتباس في ملف CSV." };
  row.push(cell);
  if (row.some(value => String(value).trim() !== "")) rows.push(row);
  return { ok: true, rows };
}

export function parseSkinProductsCsv(input) {
  const parsed = parseCsvMatrix(input);
  if (!parsed.ok) return parsed;
  if (parsed.rows.length < 2) return { ok: false, error: "ملف CSV فارغ أو لا يحتوي صفوف منتجات." };
  const headers = parsed.rows[0].map(value => String(value).trim().replace(/^"|"$/g, "").toLowerCase());
  if (!headers.includes("name")) return { ok: false, error: "يجب أن يحتوي الصف الأول على عمود name." };
  const allowed = new Set(SKIN_PRODUCT_CSV_FIELDS);
  const unknownHeaders = headers.filter(header => !allowed.has(header));
  const rows = [];
  const errors = [];
  for (let index = 1; index < parsed.rows.length; index++) {
    const values = parsed.rows[index];
    const item = {};
    headers.forEach((header, column) => {
      if (allowed.has(header)) {
        let value = String(values[column] ?? "").trim();
        if (/^'[=+@-]/.test(value)) value = value.slice(1);
        item[header] = value;
      }
    });
    if (!item.name) errors.push("السطر " + (index + 1) + ": اسم المنتج مطلوب.");
    else rows.push({
      ...item,
      category: item.category || "other",
      status: item.status || "active",
      suitability: item.suitability || "suitable",
    });
  }
  return { ok: errors.length === 0, rows, errors, unknownHeaders };
}

export function serializeSkinProductsCsv(products = [], deletedProducts = []) {
  const escape = value => {
    let text = String(value ?? "");
    if (/^\s*[=+@-]/.test(text)) text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
  };
  const rows = [...products.filter(item => !item.deleted_at), ...deletedProducts.filter(item => Boolean(item.deleted_at))];
  return "\uFEFF" + [SKIN_PRODUCT_CSV_FIELDS, ...rows.map(product => SKIN_PRODUCT_CSV_FIELDS.map(field => product[field] ?? ""))]
    .map(row => row.map(escape).join(",")).join("\r\n");
}


export function skinUnitCostPerDay(unit = {}, today = new Date().toISOString().slice(0, 10)) {
  if (unit.deleted_at || unit.price === "" || unit.price == null || !Number.isFinite(Number(unit.price)) || Number(unit.price) < 0) return null;
  if (!isValidSkinDateKey(unit.startedUseDate) || !isValidSkinDateKey(unit.finishedDate || today)) return null;
  const start = Date.parse(unit.startedUseDate + "T00:00:00Z");
  const end = Date.parse((unit.finishedDate || today) + "T00:00:00Z");
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return null;
  const days = Math.floor((end - start) / 86400000) + 1;
  return days > 0 ? { value: Number(unit.price) / days, currency: String(unit.currency || "غير محددة").trim() || "غير محددة", unitId: unit.id } : null;
}

export function summarizeSkinProductUnits(productId, units = [], today = new Date().toISOString().slice(0, 10)) {
  const related = units.filter(unit => unit.productId === productId && !unit.deleted_at);
  const priced = related.filter(unit => unit.price !== "" && unit.price != null && Number.isFinite(Number(unit.price)) && Number(unit.price) >= 0);
  const totalsByCurrency = {};
  for (const unit of priced) {
    const currency = String(unit.currency || "غير محددة").trim() || "غير محددة";
    totalsByCurrency[currency] = (totalsByCurrency[currency] || 0) + Number(unit.price);
  }
  const dailyCosts = related.map(unit => skinUnitCostPerDay(unit, today)).filter(Boolean);
  return {
    count: related.length,
    pricedCount: priced.length,
    totalsByCurrency,
    mixedCurrencies: Object.keys(totalsByCurrency).length > 1,
    costPerDay: dailyCosts.length === 1 ? dailyCosts[0] : null,
    dailyCostAmbiguous: dailyCosts.length > 1,
  };
}

export function buildSkinComparisonMatrix(products = [], units = [], ingredients = [], today = new Date().toISOString().slice(0, 10)) {
  const activeProducts = products.filter(product => !product.deleted_at);
  const ingredientIndex = new Set();
  for (const ingredient of ingredients) {
    for (const alias of [ingredient.inciName, ...(ingredient.aliases || [])]) {
      const normalized = String(alias || "").trim().toLocaleLowerCase();
      if (normalized) ingredientIndex.add(normalized);
    }
  }
  const inciParts = product => String(product.ingredients || "").split(/[,،;؛\n\r·•]+/).map(value => value.trim()).filter(Boolean);
  const values = [
    ["العلامة التجارية", product => product.brand || "—"],
    ["التصنيف", product => product.category || "—"],
    ["الحالة", product => product.status || "—"],
    ["الملاءمة المسجلة", product => product.suitability || "—"],
    ["تاريخ البدء", product => product.startDate || "—"],
    ["تاريخ الانتهاء", product => product.expiryDate || "—"],
    ["العبوات المسجلة", product => summarizeSkinProductUnits(product.id, units, today).count],
    ["إجمالي أسعار العبوات", product => {
      const summary = summarizeSkinProductUnits(product.id, units, today);
      const totals = Object.entries(summary.totalsByCurrency);
      return totals.length ? totals.map(([currency, amount]) => amount.toFixed(2) + " " + currency).join(" / ") : "—";
    }],
    ["تكلفة العبوة/اليوم", product => {
      const summary = summarizeSkinProductUnits(product.id, units, today);
      if (summary.costPerDay) return summary.costPerDay.value.toFixed(2) + " " + summary.costPerDay.currency;
      if (summary.dailyCostAmbiguous) return "غير محسوبة؛ توجد أكثر من عبوة ذات تكلفة يومية";
      return "غير متاحة؛ يلزم سعر وتاريخ بدء استخدام صالح لعبوة واحدة";
    }],
    ["مكونات INCI", product => inciParts(product).length],
    ["مطابقة مكتبتك", product => inciParts(product).filter(value => ingredientIndex.has(value.toLocaleLowerCase())).length],
    ["مكونات غير معروفة", product => inciParts(product).filter(value => !ingredientIndex.has(value.toLocaleLowerCase())).length],
    ["رابط المنتج", product => product.url || "—"],
  ];
  return [
    ["المعيار", ...activeProducts.map(product => product.name || "منتج")],
    ...values.map(([label, getValue]) => [label, ...activeProducts.map(getValue)]),
  ];
}

export function serializeSkinComparisonCsv(matrix = []) {
  const escape = value => {
    let text = String(value ?? "");
    if (/^\s*[=+@-]/.test(text)) text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
  };
  return "\uFEFF" + matrix.map(row => row.map(escape).join(",")).join("\r\n");
}


export function canRestoreSkinRoutineLog(log = {}, routines = [], products = [], activeLogs = []) {
  const routine = routines.find(item => item.id === log.routineId);
  if (!routine) return false;
  const step = (routine.steps || []).find(item => item.id === log.stepId && !item.archived);
  if (!step || !products.some(item => item.id === step.productId)) return false;
  const duplicate = activeLogs.some(item => item.id !== log.id && (
    (Boolean(log.client_generated_id) && item.client_generated_id === log.client_generated_id) ||
    (item.routineId === log.routineId && item.stepId === log.stepId && item.date === log.date)
  ));
  return !duplicate;
}


export function canRestoreSkinList(list = {}, products = []) {
  const productIds = Array.isArray(list.productIds) ? list.productIds : [];
  return productIds.every(id => products.some(product => product.id === id));
}


export function normalizeSkinSearchText(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLocaleLowerCase("ar")
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/[ک]/g, "ك")
    .replace(/[ی]/g, "ي")
    .replace(/[\s_-]+/g, " ")
    .trim();
}
