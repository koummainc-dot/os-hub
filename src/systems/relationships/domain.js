export const RELATIONSHIP_SECTIONS = [
  { id: "home", label: "الرئيسية", icon: "⌂" },
  { id: "people", label: "الأشخاص", icon: "👥" },
  { id: "timeline", label: "سجل التواصل", icon: "🕘" },
  { id: "followups", label: "المتابعات", icon: "📞" },
  { id: "occasions", label: "المناسبات", icon: "🎂" },
  { id: "gifts", label: "الهدايا", icon: "🎁" },
  { id: "circles", label: "الدوائر", icon: "⭕" },
  { id: "networking", label: "العلاقات المهنية", icon: "💼" },
  { id: "insights", label: "الرؤى", icon: "💡" },
  { id: "merge", label: "مراجعة التكرارات", icon: "🔀" },
  { id: "import", label: "الاستيراد والتصدير", icon: "⬆️" },
  { id: "settings", label: "الإعدادات والخصوصية", icon: "⚙️" }
];

export const RELATIONSHIP_TYPES = [
  "Family", "Friend", "Partner", "Colleague", "Mentor", "Client",
  "Professional", "Community", "Acquaintance", "Other"
];

export const RELATIONSHIP_TYPE_LABELS = {
  Family: "العائلة", Friend: "صديق", Partner: "شريك", Colleague: "زميل",
  Mentor: "مرشد", Client: "عميل", Professional: "علاقة مهنية",
  Community: "المجتمع", Acquaintance: "معرفة", Other: "أخرى"
};

export function emptyRelationshipsData() {
  return {
    schemaVersion: 1,
    people: [],
    timeline: [],
    followups: [],
    occasions: [],
    gifts: [],
    circles: [],
    settings: { reminderDays: [7, 1], birthdayReminderDays: 7, neglectedAfterDays: 30, defaultFollowupDays: 30, privacyLock: true }
  };
}

export function normalizeRelationshipsData(value) {
  const base = emptyRelationshipsData();
  const source = value && typeof value === "object" ? value : {};
  const arrayFields = ["people", "timeline", "followups", "occasions", "gifts", "circles"];
  const normalized = { ...base, ...source, schemaVersion: 1 };
  for (const field of arrayFields) normalized[field] = Array.isArray(source[field]) ? source[field] : [];
  normalized.settings = { ...base.settings, ...(source.settings || {}) };
  return normalized;
}

export function validatePerson(person) {
  const name = String(person?.name || "").trim();
  if (!name) return { ok: false, error: "أدخل اسم الشخص." };
  if (name.length > 160) return { ok: false, error: "الاسم طويل جدًا." };
  const email = String(person?.email || "").trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "صيغة البريد الإلكتروني غير صحيحة." };
  }
  return { ok: true, value: { ...person, name, email } };
}

export function normalizeSearch(value) {
  return String(value || "").trim().toLocaleLowerCase();
}

export function findPossibleDuplicates(people) {
  const seen = new Map();
  const duplicates = [];
  for (const person of Array.isArray(people) ? people : []) {
    const email = normalizeSearch(person.email);
    const phone = String(person.phone || "").replace(/\D/g, "");
    const name = normalizeSearch(person.name);
    const key = email ? "email:" + email : phone ? "phone:" + phone : name ? "name:" + name : "";
    if (!key) continue;
    if (seen.has(key)) duplicates.push({ key, first: seen.get(key), duplicate: person });
    else seen.set(key, person);
  }
  return duplicates;
}

export function dueFollowups(followups, today) {
  return (Array.isArray(followups) ? followups : [])
    .filter((item) => item.status !== "done" && item.dueDate && item.dueDate <= today)
    .sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)));
}

export function validateRelationshipsImport(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: "ملف الاستيراد يجب أن يحتوي على كائن JSON." };
  }
  const source = value.data && typeof value.data === "object" ? value.data : value;
  const known = ["people", "timeline", "followups", "occasions", "gifts", "circles"];
  if (!known.some((key) => Array.isArray(source[key]))) {
    return { ok: false, error: "لم نعثر على مجموعات بيانات علاقات معروفة داخل الملف." };
  }
  for (const key of known) {
    if (Array.isArray(source[key])) {
      const seenIds = new Set();
      for (const record of source[key]) {
        const id = String(record?.id || "").trim();
        if (!id) continue;
        if (seenIds.has(id)) return { ok: false, error: "المعرّف " + id + " مكرر داخل مجموعة " + key + ". أصلح التكرار في الملف قبل الاستيراد." };
        seenIds.add(id);
      }
    }
  }
  const normalized = normalizeRelationshipsData(source);
  for (const key of known) {
    if (normalized[key].length > 10000) return { ok: false, error: "عدد السجلات في " + key + " يتجاوز الحد المسموح (10000)." };
    if (!normalized[key].every((record) => record && typeof record === "object" && !Array.isArray(record) && String(record.id || "").trim())) {
      return { ok: false, error: "توجد سجلات بدون معرّف صالح داخل مجموعة " + key + "." };
    }
  }
  const badPerson = normalized.people.find((person) => !validatePerson(person).ok);
  if (badPerson) return { ok: false, error: "يوجد شخص غير صالح في الملف: " + (badPerson.name || "اسم غير معروف") };
  return { ok: true, value: normalized };
}

function isoDateUTC(year, month, day) {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.toISOString().slice(0, 10);
}

function daysBetweenISO(from, to) {
  const a = Date.parse(from + "T00:00:00Z");
  const b = Date.parse(to + "T00:00:00Z");
  return Number.isFinite(a) && Number.isFinite(b) ? Math.round((b - a) / 86400000) : null;
}

function nextAnnualDate(value, today) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
  if (!match || !/^\d{4}-\d{2}-\d{2}$/.test(today)) return null;
  const month = Number(match[2]);
  const day = Number(match[3]);
  const year = Number(today.slice(0, 4));
  let candidate = isoDateUTC(year, month, day);
  if (candidate < today) candidate = isoDateUTC(year + 1, month, day);
  return candidate;
}

export function upcomingRelationshipEvents(people, occasions, today, horizonDays = 30, settings = {}) {
  const events = [];
  for (const person of Array.isArray(people) ? people : []) {
    if (!person?.birthday) continue;
    const nextDate = nextAnnualDate(person.birthday, today);
    if (!nextDate) continue;
    const daysAway = daysBetweenISO(today, nextDate);
    const birthdayReminderDays = Math.max(0, Math.min(365, Number(settings.birthdayReminderDays ?? horizonDays) || 0));
    if (daysAway !== null && daysAway >= 0 && daysAway <= horizonDays && daysAway <= birthdayReminderDays) {
      events.push({ id: "birthday:" + person.id, personId: person.id, title: "عيد ميلاد " + String(person.name || "شخص"), date: nextDate, daysAway, kind: "birthday" });
    }
  }
  for (const occasion of Array.isArray(occasions) ? occasions : []) {
    if (!occasion?.date || occasion.reminderEnabled === false) continue;
    const nextDate = occasion.recurrence === "yearly" ? nextAnnualDate(occasion.date, today) : occasion.date;
    if (!nextDate) continue;
    const daysAway = daysBetweenISO(today, nextDate);
    const reminderDays = Math.max(0, Math.min(365, Number(occasion.reminderDays ?? 7) || 0));
    if (daysAway !== null && daysAway >= 0 && daysAway <= horizonDays && daysAway <= reminderDays) {
      events.push({ id: "occasion:" + occasion.id, personId: occasion.personId, title: String(occasion.title || "مناسبة"), date: nextDate, daysAway, kind: "occasion", reminderDays });
    }
  }
  return events.sort((a, b) => a.daysAway - b.daysAway || a.title.localeCompare(b.title));
}


// Build a preview-only merge plan. No record is deleted or written by this function.
export function planPersonMerge(value, keepPersonId, mergePersonId) {
  const data = normalizeRelationshipsData(value);
  if (!keepPersonId || !mergePersonId || keepPersonId === mergePersonId) {
    return { ok: false, error: "اختر شخصين مختلفين لدمجهما." };
  }
  const keep = data.people.find((person) => String(person.id) === String(keepPersonId));
  const merge = data.people.find((person) => String(person.id) === String(mergePersonId));
  if (!keep || !merge) return { ok: false, error: "تعذر العثور على الشخصين المطلوبين." };

  // Prefer the keeper's existing values; fill only blank fields from the second record.
  const mergedPerson = { ...merge, ...keep, id: keep.id };
  for (const [key, valueFromMerge] of Object.entries(merge)) {
    const current = mergedPerson[key];
    if ((current === undefined || current === null || String(current).trim() === "") &&
        valueFromMerge !== undefined && valueFromMerge !== null && String(valueFromMerge).trim() !== "") {
      mergedPerson[key] = valueFromMerge;
    }
  }
  mergedPerson.createdAt = keep.createdAt || merge.createdAt || null;
  mergedPerson.updatedAt = new Date().toISOString();

  const relatedCollections = ["timeline", "followups", "occasions", "gifts"];
  const next = { ...data };
  next.people = data.people
    .filter((person) => String(person.id) !== String(mergePersonId))
    .map((person) => String(person.id) === String(keepPersonId) ? mergedPerson : person);
  for (const collection of relatedCollections) {
    next[collection] = data[collection].map((record) =>
      String(record.personId) === String(mergePersonId)
        ? { ...record, personId: keep.id }
        : record
    );
  }
  // Keep all history rows; the preview deliberately does not deduplicate or delete related records.
  const summary = {
    preservedPersonId: keep.id,
    removedPersonId: merge.id,
    transferredFields: Object.keys(merge).filter((key) =>
      (keep[key] === undefined || keep[key] === null || String(keep[key]).trim() === "") &&
      merge[key] !== undefined && merge[key] !== null && String(merge[key]).trim() !== ""
    ),
    reassigned: Object.fromEntries(relatedCollections.map((collection) => [
      collection, data[collection].filter((record) => String(record.personId) === String(mergePersonId)).length
    ]))
  };
  return { ok: true, value: next, summary };
}

/**
 * Build an import preview without mutating the current data.
 * Conflicting IDs are preserved by default; callers must explicitly opt in to overwrite them.
 */
export function planRelationshipsImport(currentValue, incomingValue, options = {}) {
  const current = normalizeRelationshipsData(currentValue);
  const checked = validateRelationshipsImport(incomingValue);
  if (!checked.ok) return checked;
  const incoming = checked.value;
  const collections = ["people", "timeline", "followups", "occasions", "gifts", "circles"];
  const overwriteConflicts = options.overwriteConflicts === true;
  const next = { ...current, settings: { ...current.settings, ...incoming.settings } };
  const writes = {};
  const summary = { added: {}, unchanged: {}, conflicts: {}, overwritten: {}, totalAdded: 0, totalUnchanged: 0, totalConflicts: 0, totalOverwritten: 0 };
  for (const key of collections) {
    const existingById = new Map(current[key].map((record) => [String(record.id), record]));
    const nextById = new Map(current[key].map((record) => [String(record.id), record]));
    writes[key] = [];
    summary.added[key] = 0;
    summary.unchanged[key] = 0;
    summary.conflicts[key] = 0;
    summary.overwritten[key] = 0;
    for (const record of incoming[key]) {
      const id = String(record.id);
      const existing = existingById.get(id);
      if (!existing) {
        nextById.set(id, record);
        writes[key].push(record);
        summary.added[key]++;
      } else if (JSON.stringify(existing) === JSON.stringify(record)) {
        summary.unchanged[key]++;
      } else {
        summary.conflicts[key]++;
        if (overwriteConflicts) {
          nextById.set(id, record);
          writes[key].push(record);
          summary.overwritten[key]++;
        }
      }
    }
    next[key] = [...nextById.values()];
    summary.totalAdded += summary.added[key];
    summary.totalUnchanged += summary.unchanged[key];
    summary.totalConflicts += summary.conflicts[key];
    summary.totalOverwritten += summary.overwritten[key];
  }
  return {
    ok: true,
    value: next,
    writes,
    settingsChanged: JSON.stringify(current.settings) !== JSON.stringify(next.settings),
    summary,
    overwriteConflicts
  };
}
