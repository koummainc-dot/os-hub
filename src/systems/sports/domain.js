export const SPORTS_SECTIONS = [
  { id: "dashboard", label: "الرئيسية", icon: "⌂" },
  { id: "workout", label: "تمرين اليوم", icon: "🏃" },
  { id: "programs", label: "البرامج", icon: "📋" },
  { id: "exercises", label: "مكتبة التمارين", icon: "🦾" },
  { id: "history", label: "سجل التدريب", icon: "🕘" },
  { id: "progress", label: "التقدم والتحليلات", icon: "📈" },
  { id: "goals", label: "الأهداف", icon: "🎯" },
  { id: "recovery", label: "التعافي", icon: "😴" },
  { id: "measurements", label: "قياسات الجسم", icon: "📏" },
  { id: "settings", label: "الإعدادات", icon: "⚙️" },
];

export const EXERCISE_CATEGORIES = ["Strength", "Cardio", "Mobility", "Stretching", "Skill", "Recovery"];
export const TRACKING_MODES = ["Weight-Reps", "Reps", "Duration", "Distance", "Time-Distance", "Custom"];
export const SESSION_STATUSES = ["In Progress", "Completed", "Abandoned"];
export const PROGRAM_TYPES = ["Strength", "Hypertrophy", "Fat Loss", "Endurance", "Running", "Cycling", "Swimming", "Mixed", "Sport Specific", "General Fitness", "Custom"];

export const emptySportsData = () => ({
  schemaVersion: 1,
  exercises: [],
  programs: [],
  workoutDays: [],
  plannedExercises: [],
  sessions: [],
  exerciseSets: [],
  goals: [],
  measurements: [],
  recoveryLogs: [],
  personalRecords: [],
  preferences: {
    timezone: "Africa/Cairo",
    weightUnit: "kg",
    distanceUnit: "km",
    weekStartDay: 6,
    activeProgramPolicy: "single",
    defaultRestSeconds: 90,
    showBodyweightVolume: false,
    remindersEnabled: false,
  },
});

const arrays = ["exercises", "programs", "workoutDays", "plannedExercises", "sessions", "exerciseSets", "goals", "measurements", "recoveryLogs", "personalRecords"];
export function normalizeSportsData(value) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const base = emptySportsData();
  const out = { ...base, ...source, schemaVersion: 1 };
  for (const key of arrays) out[key] = Array.isArray(source[key]) ? source[key].filter(x => x && typeof x === "object" && !Array.isArray(x)) : [];
  out.preferences = { ...base.preferences, ...(source.preferences || {}) };
  return out;
}
export const todayInZone = (zone = "Africa/Cairo", date = new Date()) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
export const makeSportsId = (prefix = "sp") => globalThis.crypto?.randomUUID?.() || prefix + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 9);
export const asNonNegative = value => {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : 0;
};
export const asPositive = value => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
};
export function validateExercise(input) {
  const name = String(input?.name || "").trim();
  if (!name) return { ok: false, error: "اسم التمرين مطلوب." };
  if (!EXERCISE_CATEGORIES.includes(input.category)) return { ok: false, error: "اختر تصنيفًا صحيحًا للتمرين." };
  if (!TRACKING_MODES.includes(input.trackingMode)) return { ok: false, error: "اختر طريقة تتبع صحيحة." };
  return { ok: true, value: { ...input, name, instructions: String(input.instructions || "").trim() } };
}
export function validateProgram(input) {
  const name = String(input?.name || "").trim();
  const weeks = Number(input?.durationWeeks);
  const days = Number(input?.daysPerWeek);
  if (!name) return { ok: false, error: "اسم البرنامج مطلوب." };
  if (!Number.isInteger(weeks) || weeks < 1 || weeks > 104) return { ok: false, error: "مدة البرنامج يجب أن تكون من أسبوع إلى 104 أسابيع." };
  if (!Number.isInteger(days) || days < 1 || days > 7) return { ok: false, error: "عدد أيام التدريب يجب أن يكون من 1 إلى 7." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(input.startDate || ""))) return { ok: false, error: "حدد تاريخ بداية صحيحًا." };
  return { ok: true, value: { ...input, name, durationWeeks: weeks, daysPerWeek: days } };
}
export function validateExerciseSet(set, exercise) {
  if (!exercise) return { ok: false, error: "التمرين المرتبط بالمجموعة غير موجود." };
  const mode = exercise.trackingMode || "Weight-Reps";
  const out = { ...set };
  if (["Weight-Reps", "Reps"].includes(mode)) {
    if (!Number.isInteger(Number(set.reps)) || Number(set.reps) < 1 || Number(set.reps) > 10000) return { ok: false, error: "أدخل عدد تكرارات صحيحًا." };
    out.reps = Number(set.reps);
  }
  if (mode === "Weight-Reps" && (set.weightKg === "" || set.weightKg == null || !Number.isFinite(Number(set.weightKg)) || Number(set.weightKg) < 0 || Number(set.weightKg) > 2000)) return { ok: false, error: "الوزن مطلوب ويجب أن يكون رقمًا بين 0 و2000 كجم." };
  if (["Duration", "Time-Distance"].includes(mode) && (!Number.isFinite(Number(set.durationSeconds)) || Number(set.durationSeconds) <= 0)) return { ok: false, error: "المدة يجب أن تكون أكبر من صفر." };
  if (["Distance", "Time-Distance"].includes(mode) && (!Number.isFinite(Number(set.distanceMeters)) || Number(set.distanceMeters) <= 0)) return { ok: false, error: "المسافة يجب أن تكون أكبر من صفر." };
  if (set.rpe !== "" && set.rpe != null && (!Number.isFinite(Number(set.rpe)) || Number(set.rpe) < 1 || Number(set.rpe) > 10)) return { ok: false, error: "RPE يجب أن يكون بين 1 و10." };
  out.weightKg = mode === "Weight-Reps" && set.weightKg !== "" && set.weightKg != null ? Number(set.weightKg) : null;
  if (!["Weight-Reps", "Reps"].includes(mode)) out.reps = null;
  out.durationSeconds = set.durationSeconds === "" || set.durationSeconds == null ? null : Number(set.durationSeconds);
  out.distanceMeters = set.distanceMeters === "" || set.distanceMeters == null ? null : Number(set.distanceMeters);
  out.rpe = set.rpe === "" || set.rpe == null ? null : Number(set.rpe);
  return { ok: true, value: out };
}
export function estimateOneRepMax(weightKg, reps) {
  const weight = asPositive(weightKg), count = Number(reps);
  if (!weight || !Number.isInteger(count) || count < 1 || count > 12) return null;
  return Math.round(weight * (1 + count / 30) * 100) / 100;
}
export function sessionMetrics(session, sets, exerciseById = {}) {
  const rows = sets.filter(s => s.sessionId === session.id && !s.deletedAt);
  const totalReps = rows.reduce((sum, s) => sum + asNonNegative(s.reps), 0);
  const weightedRows = rows.filter(s => s.weightKg != null && s.reps != null);
  const volumeKg = weightedRows.reduce((sum, s) => sum + asNonNegative(s.weightKg) * asNonNegative(s.reps), 0);
  const distanceMeters = rows.reduce((sum, s) => sum + asNonNegative(s.distanceMeters), 0);
  const durationSeconds = rows.reduce((sum, s) => sum + asNonNegative(s.durationSeconds), 0);
  const started = Date.parse(session.startedAt || "");
  const ended = Date.parse(session.endedAt || "");
  const durationMinutes = Number.isFinite(started) && Number.isFinite(ended) && ended >= started ? Math.round((ended - started - asNonNegative(session.pausedSeconds) * 1000) / 60000) : null;
  const exercisesDone = new Set(rows.map(s => s.exerciseId).filter(Boolean));
  const planned = Number(session.plannedExerciseCount) || 0;
  const completedExerciseCount = exercisesDone.size;
  return {
    setCount: rows.length, totalReps, volumeKg: Math.round(volumeKg * 100) / 100,
    distanceMeters: Math.round(distanceMeters), durationSeconds, durationMinutes: durationMinutes == null ? null : Math.max(0, durationMinutes),
    avgPaceSecondsPerKm: distanceMeters > 0 && durationSeconds > 0 ? Math.round(durationSeconds / (distanceMeters / 1000)) : null,
    completedExerciseCount, completionPercentage: planned > 0 ? Math.min(100, Math.round(completedExerciseCount / planned * 100)) : null,
  };
}
export function derivePersonalRecords(data) {
  const exercises = new Map(data.exercises.map(x => [x.id, x]));
  const grouped = new Map();
  for (const set of data.exerciseSets) {
    if (set.deletedAt || !set.sessionId || !set.exerciseId || set.weightKg == null || set.reps == null) continue;
    const session = data.sessions.find(s => s.id === set.sessionId && s.status === "Completed");
    const exercise = exercises.get(set.exerciseId);
    if (!session || !exercise) continue;
    const value = estimateOneRepMax(set.weightKg, set.reps);
    if (!value) continue;
    const key = set.exerciseId;
    const prev = grouped.get(key);
    if (!prev || value > prev.value) grouped.set(key, { exerciseId: key, exerciseName: exercise.name, value, unit: "kg", date: session.localDate, setId: set.id });
  }
  return [...grouped.values()].sort((a, b) => b.value - a.value);
}
export function sportsSummary(data, date = todayInZone(data.preferences?.timezone || "Africa/Cairo")) {
  const completed = data.sessions.filter(s => s.status === "Completed" && !s.deletedAt);
  const weekStartDay = Number(data.preferences?.weekStartDay ?? 6);
  const dateObj = new Date(date + "T12:00:00Z");
  dateObj.setUTCDate(dateObj.getUTCDate() - ((dateObj.getUTCDay() - weekStartDay + 7) % 7));
  const weekStart = dateObj.toISOString().slice(0, 10);
  const weekSessions = completed.filter(s => s.localDate >= weekStart && s.localDate <= date);
  const allMetrics = completed.map(s => ({ session: s, ...sessionMetrics(s, data.exerciseSets) }));
  const todaySessions = data.sessions.filter(s => s.localDate === date && !s.deletedAt && s.status !== "Abandoned");
  return {
    todaySessions,
    completedCount: completed.length,
    weekCount: weekSessions.length,
    weekVolumeKg: Math.round(weekSessions.reduce((sum, s) => sum + sessionMetrics(s, data.exerciseSets).volumeKg, 0)),
    weekMinutes: weekSessions.reduce((sum, s) => sum + (sessionMetrics(s, data.exerciseSets).durationMinutes || 0), 0),
    weekStart,
    prs: derivePersonalRecords(data),
    recentSessions: allMetrics.sort((a, b) => String(b.session.startedAt).localeCompare(String(a.session.startedAt))).slice(0, 8),
  };
}
export function validateSportsImport(value) {
  const source = value?.data && typeof value.data === "object" ? value.data : value;
  if (!source || typeof source !== "object" || Array.isArray(source)) return { ok: false, error: "ملف الاستيراد يجب أن يحتوي على كائن JSON." };
  if (!arrays.some(key => Array.isArray(source[key]))) return { ok: false, error: "لا توجد مجموعات بيانات رياضية معروفة في الملف." };
  const out = normalizeSportsData(source);
  for (const key of arrays) {
    const ids = new Set();
    for (const record of out[key]) {
      if (!String(record.id || "").trim()) return { ok: false, error: "يوجد سجل بدون معرّف داخل " + key + "." };
      if (ids.has(record.id)) return { ok: false, error: "يوجد معرّف مكرر داخل " + key + ": " + record.id };
      ids.add(record.id);
    }
    if (out[key].length > 20000) return { ok: false, error: "عدد السجلات كبير جدًا داخل " + key + "." };
  }
  return { ok: true, value: out };
}
