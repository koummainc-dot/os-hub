// Learning OS — lookups & presets (plan §5.11, §11). Logic is fixed; labels/colors are display only.
export const opts = (map) => Object.entries(map).map(([v, l]) => ({ v, l }));
export const AREA_CATEGORY = { professional: "مهني", personal: "شخصي", academic: "أكاديمي", language: "لغة" };
export const AREA_STATUS = { Active: "نشط", Paused: "متوقف", Archived: "مؤرشف" };
export const COURSE_TYPE = { Course: "💻 دورة مسجّلة", "YouTube Playlist": "🎥 قائمة يوتيوب", Book: "📚 كتاب", Program: "🧩 برنامج", "Live Class": "🔴 مباشرة", "In-person": "🏫 حضوري", Project: "🧪 مشروع" };
export const COURSE_STATUS = { Active: "نشطة", Paused: "متوقفة", Archived: "مؤرشفة" };
export const COURSE_STATE = { "Not Started": "لم تبدأ", "In Progress": "جارية", Completed: "مكتملة" };
export const LESSON_STATUS = { Active: "نشط", Paused: "متوقف", Skipped: "متخطّى" };
export const LESSON_STATE = { "Not Started": "لم يبدأ", "In Progress": "جارٍ", Completed: "مكتمل", Skipped: "متخطّى" };
export const PRIORITY = { High: "عالية", Medium: "متوسطة", Low: "منخفضة" };
export const SKILL_TYPE = { language: "لغة", technical: "تقنية", professional: "مهنية", personal: "شخصية" };
export const MASTERY = { Unrated: "غير مقيَّمة", "Not Started": "لم تبدأ", Beginner: "مبتدئ", "Advanced Beginner": "مبتدئ متقدم", Intermediate: "متوسط", Advanced: "متقدم" };
export const MASTERY_COLOR = { Unrated: "#94A3B8", "Not Started": "#94A3B8", Beginner: "#EF4444", "Advanced Beginner": "#F59E0B", Intermediate: "#3B82F6", Advanced: "#10B981" };
export const GOAL_STATUS = { Active: "جارٍ", Achieved: "تحقق", Paused: "متوقف" };
export const VOCAB_STATUS = { New: "جديدة", Learning: "قيد التعلم", Review: "مراجعة", Mastered: "متقنة" };
export const POS = { noun: "اسم", verb: "فعل", adj: "صفة", adv: "ظرف", expr: "تعبير", phrasal: "Phrasal Verb" };
export const TEST_RESULT = { Passed: "ناجح", Close: "قريب", "Not Passed": "لم ينجح" };
export const TEST_COLOR = { Passed: "#10B981", Close: "#F59E0B", "Not Passed": "#EF4444" };
export const DAY_STATE = { goal: { l: "✅ بلغت هدف اليوم", c: "#10B981" }, safe: { l: "🟡 السلسلة محفوظة", c: "#F59E0B" }, below: { l: "🟠 تحت الحد الأدنى", c: "#F97316" }, none: { l: "⚪ لم تدرس بعد", c: "#94A3B8" } };
export const LANG_SKILLS = ["Reading", "Listening", "Speaking", "Writing", "Vocabulary", "Grammar", "Pronunciation", "Conversation"];
export const SESSION_SHORTCUTS = [10, 15, 30, 45];
export const ERR = {
  SESSION_MINUTES_RANGE: "الدقائق يجب أن تكون عددًا صحيحًا بين 1 و1440", SESSION_DATE_FUTURE: "لا يمكن تسجيل جلسة بتاريخ مستقبلي", LESSON_REQUIRED: "اختر الدرس",
  LESSON_SKIPPED: "هذا الدرس متخطّى — أعد تفعيله أولًا", SESSION_TIME_RANGE: "وقت البدء يجب أن يسبق وقت الانتهاء", SESSION_IDEMPOTENT_DUPLICATE: "هذه الجلسة سُجّلت مسبقًا",
  GOAL_LT_MINIMUM: "هدف اليوم يجب ألا يقل عن الحد الأدنى", SCORE_RANGE: "الدرجة بين 0 و100", TEST_AREA_NOT_LANGUAGE: "اختبارات المستوى لمجالات اللغة فقط", TEST_DATE_FUTURE: "تاريخ الاختبار لا يكون مستقبليًا", CEFR: "اختر المستوى",
  DELETE_BLOCKED_HAS_SESSIONS: "لا يمكن الحذف النهائي: توجد جلسات دراسة — استخدم الأرشفة", UNIT_HAS_LESSONS: "انقل الدروس أو أرشفها أولًا",
};
export const COURSE_TEMPLATES = [
  { id: "lang", name: "دورة لغة (CEFR)", icon: "🌍", type: "Course", units: ["A1", "A2", "B1", "B2", "C1", "C2"].map((l) => ({ name: "المستوى " + l, language_level: l })) },
  { id: "tech", name: "دورة تقنية", icon: "💻", type: "Course", units: [{ name: "مقدمة" }, { name: "الأساسيات" }, { name: "مشروع تطبيقي" }, { name: "مراجعة" }] },
  { id: "book", name: "كتاب", icon: "📚", type: "Book", units: [] },
  { id: "yt", name: "قائمة يوتيوب", icon: "🎥", type: "YouTube Playlist", units: [] },
  { id: "blank", name: "دورة فارغة", icon: "✨", type: "Course", units: [] },
];
