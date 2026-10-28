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
