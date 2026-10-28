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
    settings: { reminderDays: [7, 1], defaultFollowupDays: 30, privacyLock: true }
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

export function upcomingRelationshipEvents(people, occasions, today, horizonDays = 30) {
  const events = [];
  for (const person of Array.isArray(people) ? people : []) {
    if (!person?.birthday) continue;
    const nextDate = nextAnnualDate(person.birthday, today);
    if (!nextDate) continue;
    const daysAway = daysBetweenISO(today, nextDate);
    if (daysAway !== null && daysAway >= 0 && daysAway <= horizonDays) {
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
