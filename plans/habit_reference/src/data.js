export const STORE_KEY = "habit-os-demo-v1";
export const DEMO_USER_ID = "demo-user";

export function uid() {
  return globalThis.crypto?.randomUUID?.() ?? "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    return (char === "x" ? random : (random & 0x3) | 0x8).toString(16);
  });
}

export function localISODate(date = new Date()) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function addLocalDays(dateString, amount) {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day + amount, 12);
  return localISODate(date);
}

export function localDateTimeToUtc(dateString, timeString, timeZone = "UTC") {
  const date = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateString);
  const time = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(timeString || "");
  if (!date || !time) throw new RangeError("تاريخ أو وقت محلي غير صالح.");
  const desired = [Number(date[1]), Number(date[2]), Number(date[3]), Number(time[1]), Number(time[2]), Number(time[3] || 0)];
  const target = Date.UTC(desired[0], desired[1] - 1, desired[2], desired[3], desired[4], desired[5]);
  const formatter = new Intl.DateTimeFormat("en-GB", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
  let candidate = target;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const parts = Object.fromEntries(formatter.formatToParts(new Date(candidate)).filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)]));
    const rendered = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
    const delta = target - rendered;
    if (delta === 0) break;
    candidate += delta;
  }
  const result = new Date(candidate);
  const actual = Object.fromEntries(formatter.formatToParts(result).filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)]));
  if (actual.year !== desired[0] || actual.month !== desired[1] || actual.day !== desired[2] || actual.hour !== desired[3] || actual.minute !== desired[4] || actual.second !== desired[5]) {
    throw new RangeError("الوقت المحلي غير موجود في هذه المنطقة الزمنية بسبب انتقال التوقيت الصيفي.");
  }
  return result.toISOString();
}

export const DEFAULT_CATEGORIES = [
  ["religion", "العبادات"], ["fitness", "اللياقة"], ["sleep", "النوم والتعافي"],
  ["mind", "الذهن"], ["learning", "التعلّم"], ["work", "العمل"],
  ["projects", "المشاريع"], ["content", "المحتوى"], ["money", "المال"],
  ["digital", "العادات الرقمية"], ["relationships", "العلاقات"],
  ["home", "المنزل"], ["care", "العناية"], ["mobility", "الحركة"],
  ["development", "التطوير"], ["bad-habits", "عادات أريد تقليلها"],
].map(([slug, name], index) => ({ id: `cat-${slug}`, userId: DEMO_USER_ID, slug, name, sortOrder: index, isActive: true }));

function habit(id, name, options = {}) {
  return {
    id, name, type: "good", level: "growth", status: "active", categoryId: "cat-mind",
    trackingType: "check", scheduleType: "daily", scheduleRule: { everyNDays: 1 },
    startDate: addLocalDays(localISODate(), -42), endDate: "", goal: "", minimum: "", unit: "",
    weight: 2, priority: "normal", preferredTime: "", why: "", reward: "", usualTriggers: "",
    quitReason: "", recoveryPlan: "", bookIds: [], archivedAt: "", deletedAt: "", ...options,
  };
}

export function createSeedData() {
  const today = localISODate();
  const habits = [
    habit("habit-read", "قراءة ٢٠ صفحة", {
      categoryId: "cat-learning", trackingType: "quantity", scheduleType: "daily",
      scheduleRule: { everyNDays: 1 }, goal: 20, minimum: 10, unit: "صفحة", weight: 2,
      preferredTime: "20:30", why: "صفحة كل يوم تفتح فكرة جديدة.",
    }),
    habit("habit-walk", "مشي في الهواء الطلق", {
      categoryId: "cat-fitness", trackingType: "duration", scheduleType: "weekdays",
      scheduleRule: { days: [1, 3, 5, 6] }, goal: 30, minimum: 15, unit: "دقيقة", weight: 3,
      preferredTime: "17:30", why: "حركة خفيفة تفرق في اليوم.",
    }),
    habit("habit-sleep", "الاستعداد للنوم قبل ١١", {
      categoryId: "cat-sleep", trackingType: "check", scheduleType: "daily",
      scheduleRule: { everyNDays: 1 }, goal: "", minimum: "", unit: "", weight: 2,
      preferredTime: "22:30",
    }),
    habit("habit-journal", "تأمل قصير", {
      categoryId: "cat-mind", trackingType: "check", scheduleType: "times_per_period",
      scheduleRule: { period: "week", targetCount: 4, weekStartsOn: 1 }, weight: 1,
      preferredTime: "21:00",
    }),
    habit("habit-scroll", "تقليل التصفح قبل النوم", {
      type: "bad", level: "maintenance", categoryId: "cat-digital", trackingType: "avoidance",
      scheduleType: "daily", scheduleRule: { everyNDays: 1 }, goal: "", minimum: "", unit: "يوم نظيف",
      weight: 3, quitReason: "أريد نومًا أهدأ وتركيزًا أفضل.", recoveryPlan: "أضع الهاتف بعيدًا وأبدأ من جديد بخطوة واحدة.",
    }),
    habit("habit-stretch", "تمدد صباحي", {
      level: "maintenance", categoryId: "cat-fitness", trackingType: "duration", scheduleType: "interval",
      scheduleRule: { unit: "day", everyN: 2, anchorDate: addLocalDays(today, -8) },
      goal: 10, minimum: 5, unit: "دقيقة", weight: 1,
    }),
    habit("habit-language", "مراجعة كلمات جديدة", {
      level: "deferred", categoryId: "cat-learning", trackingType: "quantity", scheduleType: "times_per_period",
      scheduleRule: { period: "week", targetCount: 3, weekStartsOn: 1 }, goal: 10, minimum: 5, unit: "كلمات", weight: 1,
    }),
    habit("habit-old", "شرب كوب ماء بعد الاستيقاظ", {
      level: "automatic", categoryId: "cat-care", trackingType: "check", scheduleType: "daily",
      scheduleRule: { everyNDays: 1 }, weight: 1,
    }),
    habit("habit-archived", "تجربة تنفس مسائي", {
      level: "growth", categoryId: "cat-mind", status: "archived", archivedAt: addLocalDays(today, -12),
      trackingType: "check", scheduleType: "daily", scheduleRule: { everyNDays: 1 }, weight: 1,
    }),
  ];

  const logs = [];
  const addLog = (habitId, daysAgo, status, actual = null, occurrenceKey = "daily") => {
    const logDate = addLocalDays(today, -daysAgo);
    logs.push({ id: `log-${habitId}-${daysAgo}-${occurrenceKey}`, userId: DEMO_USER_ID, habitId,
      localDate: logDate, timezoneSnapshot: "Africa/Cairo", occurrenceKey: `${logDate}:${occurrenceKey}`,
      status, actual, note: "", trigger: "", bookId: habitId === "habit-read" ? "book-deep-work" : null,
      bookTitleSnapshot: habitId === "habit-read" ? "العمل العميق" : "",
      deletedAt: "" });
  };
  addLog("habit-read", 0, "partial", 14);
  addLog("habit-read", 1, "done", 24);
  addLog("habit-read", 2, "done", 22);
  addLog("habit-read", 3, "partial", 8);
  addLog("habit-read", 4, "done", 20);
  addLog("habit-read", 6, "done", 26);
  addLog("habit-walk", 1, "done", 32);
  addLog("habit-walk", 3, "done", 28);
  addLog("habit-walk", 5, "done", 35);
  addLog("habit-walk", 6, "vacation", null);
  addLog("habit-sleep", 0, "done");
  addLog("habit-sleep", 1, "done");
  addLog("habit-sleep", 2, "missed");
  addLog("habit-sleep", 3, "done");
  addLog("habit-sleep", 4, "done");
  addLog("habit-journal", 0, "done", null, "entry-1");
  addLog("habit-journal", 2, "done", null, "entry-2");
  addLog("habit-journal", 4, "done", null, "entry-3");
  addLog("habit-scroll", 0, "done");
  addLog("habit-scroll", 1, "done");
  addLog("habit-scroll", 2, "missed");
  addLog("habit-stretch", 0, "done", 12);
  addLog("habit-stretch", 2, "done", 10);
  addLog("habit-old", 0, "done");
  addLog("habit-old", 1, "done");

  const books = [
    { id: "book-deep-work", userId: DEMO_USER_ID, name: "العمل العميق", author: "Cal Newport",
      status: "reading", category: "تركيز وإنتاجية", format: "ورقي", language: "ar", totalPages: 304,
      pagesBeforeTracking: 18, startDate: addLocalDays(today, -10), endDate: "", rating: "", priority: "high",
      keyIdea: "التركيز مهارة يمكن تدريبها.", notesQuotes: "", cover: "", url: "", deletedAt: "" },
    { id: "book-atomic", userId: DEMO_USER_ID, name: "العادات الذرية", author: "James Clear",
      status: "want_to_read", category: "تطوير ذاتي", format: "كتاب إلكتروني", language: "ar", totalPages: 280,
      pagesBeforeTracking: 0, startDate: "", endDate: "", rating: "", priority: "normal",
      keyIdea: "", notesQuotes: "", cover: "", url: "", deletedAt: "" },
  ];
  const readingSessions = [
    { id: "read-session-1", userId: DEMO_USER_ID, bookId: "book-deep-work", readOn: addLocalDays(today, -2), timezoneSnapshot: "Africa/Cairo", pagesRead: 18, pageStart: 19, pageEnd: 36, durationMinutes: 24, note: "بداية الفصل الثاني", deletedAt: "" },
    { id: "read-session-2", userId: DEMO_USER_ID, bookId: "book-deep-work", readOn: addLocalDays(today, -1), timezoneSnapshot: "Africa/Cairo", pagesRead: 22, pageStart: 37, pageEnd: 58, durationMinutes: 31, note: "", deletedAt: "" },
    { id: "read-session-3", userId: DEMO_USER_ID, bookId: "book-deep-work", readOn: today, timezoneSnapshot: "Africa/Cairo", pagesRead: 14, pageStart: 59, pageEnd: 72, durationMinutes: 18, note: "", deletedAt: "" },
  ];
  const journalEntries = [
    { id: "journal-today-am", userId: DEMO_USER_ID, date: today, entryTime: "08:30", timezoneSnapshot: "Africa/Cairo", title: "بداية هادئة", intention: "أبدأ يومي من غير استعجال.", top3: "المشي\nقراءة قليلًا\nإنهاء مهمة العمل", mood: 4, energy: 3, gratitude: "قهوة الصباح", win: "", learning: "", worries: "", tomorrowPlan: "", body: "", tagIds: ["tag-reflection"], habitIds: ["habit-journal"], deletedAt: "" },
    { id: "journal-yesterday", userId: DEMO_USER_ID, date: addLocalDays(today, -1), entryTime: "21:15", timezoneSnapshot: "Africa/Cairo", title: "مراجعة اليوم", intention: "", top3: "", mood: 3, energy: 4, gratitude: "صديق سأل عني", win: "أنهيت القراءة", learning: "التدرّج أسهل من الكمال.", worries: "", tomorrowPlan: "", body: "يوم بسيط لكن جيد.", tagIds: ["tag-wins"], habitIds: ["habit-read", "habit-walk"], deletedAt: "" },
    { id: "journal-today-pm", userId: DEMO_USER_ID, date: today, entryTime: "22:10", timezoneSnapshot: "Africa/Cairo", title: "ملاحظة سريعة للمساء", intention: "", top3: "", mood: 4, energy: 2, gratitude: "", win: "", learning: "أحتاج إبعاد الهاتف قبل النوم.", worries: "", tomorrowPlan: "", body: "تدوينة ثانية في نفس اليوم مسموحة.", tagIds: ["tag-reflection"], habitIds: ["habit-scroll"], deletedAt: "" },
  ];
  const tags = [
    { id: "tag-reflection", userId: DEMO_USER_ID, name: "تأمل", color: "teal" },
    { id: "tag-wins", userId: DEMO_USER_ID, name: "إنجازات", color: "gold" },
    { id: "tag-ideas", userId: DEMO_USER_ID, name: "أفكار", color: "violet" },
  ];
  const focus = [
    { id: "focus-current", userId: DEMO_USER_ID, startDate: null, endDate: null, habitIds: ["habit-read", "habit-walk", "habit-journal"], rating: 4, worked: "القراءة بعد العشاء كانت سهلة.", failed: "المشي تأخر في يومين.", adjustment: "تجهيز الحذاء قبل الخروج.", deletedAt: "" },
  ];
  const relapseDate1 = addLocalDays(today, -2);
  const relapseDate2 = addLocalDays(today, -18);
  const relapses = [
    { id: "relapse-1", userId: DEMO_USER_ID, habitId: "habit-scroll", at: relapseDate1, localDate: relapseDate1, time: "23:40", eventAtUtc: localDateTimeToUtc(relapseDate1, "23:40", "Africa/Cairo"), timezoneSnapshot: "Africa/Cairo", trigger: "تصفح بلا هدف", severity: 2, whatHappened: "تجاوزت وقت النوم قليلًا.", plan24h: "شحن الهاتف خارج غرفة النوم.", outcome: "", deletedAt: "" },
    { id: "relapse-2", userId: DEMO_USER_ID, habitId: "habit-scroll", at: relapseDate2, localDate: relapseDate2, time: "00:10", eventAtUtc: localDateTimeToUtc(relapseDate2, "00:10", "Africa/Cairo"), timezoneSnapshot: "Africa/Cairo", trigger: "ضغط العمل", severity: 3, whatHappened: "استخدام طويل للهاتف.", plan24h: "أبدأ الليلة بروتين إغلاق الشاشة.", outcome: "عدت للالتزام في اليوم التالي.", deletedAt: "" },
  ];
  const achievements = [
    { id: "ach-read-7", userId: DEMO_USER_ID, name: "أسبوع من القراءة", habitId: "habit-read", conditionType: "completed_days", conditionValue: 7, currentValue: 5, achieved: false, achievedAt: "", enabled: true, archivedAt: "", deletedAt: "" },
    { id: "ach-clean-14", userId: DEMO_USER_ID, name: "أسبوعان أنظف", habitId: "habit-scroll", conditionType: "clean_days", conditionValue: 14, currentValue: 0, achieved: false, achievedAt: "", enabled: true, archivedAt: "", deletedAt: "" },
    { id: "ach-all-100", userId: DEMO_USER_ID, name: "١٠٠ صفحة", habitId: "habit-read", conditionType: "total_quantity", conditionValue: 100, currentValue: 104, achieved: true, achievedAt: addLocalDays(today, -3), enabled: true, archivedAt: "", deletedAt: "" },
  ];
  return {
    schemaVersion: 1,
    userId: DEMO_USER_ID,
    preferences: { timezone: "Africa/Cairo", weekStartsOn: 1, locale: "ar", remindersEnabled: false, quietHoursStart: "22:00", quietHoursEnd: "07:00" },
    categories: DEFAULT_CATEGORIES,
    habits,
    pausePeriods: [],
    logs,
    relapses,
    books,
    readingSessions,
    habitBooks: [{ habitId: "habit-read", bookId: "book-deep-work", linkType: "reading_goal" }],
    journalEntries,
    journalTags: tags,
    focus,
    achievements,
    achievementLinks: [],
    habitRelations: [{ id: "relation-1", sourceHabitId: "habit-read", targetHabitId: "habit-journal", relationType: "supports", directed: true }],
    reminders: [{ id: "reminder-walk", userId: DEMO_USER_ID, habitId: "habit-walk", localTime: "18:00", timezoneOverride: "", daysOfWeek: [1, 3, 5], enabled: true, snoozeMinutes: 10, quietHoursRespected: true }],
    auditEvents: [],
  };
}
