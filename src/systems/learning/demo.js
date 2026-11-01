// Demo seed for Learning OS (plan §11.3) — relative to "today"; nothing touches the database.
import { addDays } from "../../core/dates.js";

export function buildSeed({ today }) {
  const d = (n) => addDays(today, n); const ts = (n, h = 18) => d(n) + "T" + String(h).padStart(2, "0") + ":00:00.000Z";
  const areas = [
    { id: "a_en", name: "اللغة الإنجليزية", category: "language", is_language: true, status: "Active", icon: "🌍", color: "#3B82F6", current_language_level: "A1", target_language_level: "B2", weekly_goal_minutes: 300, counts_toward_streak: true },
    { id: "a_py", name: "البرمجة بلغة Python", category: "professional", is_language: false, status: "Active", icon: "💻", color: "#8B5CF6", weekly_goal_minutes: 240, counts_toward_streak: true },
  ];
  const courses = [
    { id: "c_en", area_id: "a_en", title: "English from Zero", type: "Course", status: "Active", platform: "YouTube", target_end_date: d(90) },
    { id: "c_py", area_id: "a_py", title: "Python للمبتدئين", type: "Course", status: "Active", platform: "Udemy", target_end_date: d(60) },
  ];
  const units = [
    { id: "u_en1", course_id: "c_en", name: "المستوى A1", order: 1, language_level: "A1" },
    { id: "u_py1", course_id: "c_py", name: "الأساسيات", order: 1, is_default: false },
  ];
  const L = (id, unit_id, name, n, dur, o = {}) => ({ id, unit_id, name, lesson_number: n, total_duration_minutes: dur, watched_minutes: 0, status: "Active", ...o });
  const lessons = [
    L("l_en1", "u_en1", "التحيات والتعارف", 1, 30, { study_date: today }), L("l_en2", "u_en1", "الأرقام والأيام", 2, 30), L("l_en3", "u_en1", "الأسرة", 3, 20),
    L("l_py1", "u_py1", "المتغيرات", 1, 60), L("l_py2", "u_py1", "الجمل الشرطية", 2, 45), L("l_py3", "u_py1", "الحلقات", 3, 50),
  ];
  const S = (id, lesson_id, date, minutes, o = {}) => ({ id, lesson_id, date, minutes, kind: "study", source: "manual", client_generated_id: "demo_" + id, created_at: ts(0), ...o });
  const sessions = [
    S("s1", "l_en1", d(0), 20), S("s2", "l_py1", d(-1), 35), S("s3", "l_py1", d(-2), 12), S("s4", "l_py2", d(-3), 5),
    S("s5", "l_en2", d(-4), 20), S("s6", "l_py2", d(-4), 10),
  ];
  const tests = [
    { id: "t1", area_id: "a_en", date: d(-60), score_percent: 90, tested_level: "A1", notes: "اختبار تحديد المستوى" },
    { id: "t2", area_id: "a_en", date: d(-20), score_percent: 55, tested_level: "B1" },
  ];
  const skills = [
    { id: "k_read", name: "Reading", type: "language", area_id: "a_en", self_rating: 20 },
    { id: "k_py", name: "Python Basics", type: "technical", area_id: "a_py", self_rating: null },
  ];
  const course_skills = [{ id: "cs1", skill_id: "k_read", course_id: "c_en" }, { id: "cs2", skill_id: "k_py", course_id: "c_py" }];
  const goals = [{ id: "g1", title: "الوصول إلى B2 في الإنجليزية", area_ids: ["a_en"], target_date: d(240), status: "Active" }];
  const V = (id, word, meaning, status, next, o = {}) => ({ id, area_id: "a_en", word, meaning, status, next_review_date: next, part_of_speech: "noun", level: "A1", ...o });
  const vocab = [
    V("v1", "hello", "مرحبًا", "Learning", d(0)), V("v2", "family", "أسرة", "New", d(-1)), V("v3", "number", "رقم", "Review", d(2)),
    V("v4", "thank you", "شكرًا", "Mastered", null, { part_of_speech: "expr" }), V("v5", "give up", "يستسلم", "Learning", d(0), { part_of_speech: "phrasal", level: "B1" }),
  ];
  return { areas, courses, units, lessons, sessions, tests, skills, course_skills, lesson_skills: [], goals, vocab, rest_days: [], timers: [], settings: [] };
}
