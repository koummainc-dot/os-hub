// ════════════════════════════════════════════════════════════════════
// Learning OS — domain engine (pure functions; no React, no I/O).  Plan: plans/Learning_OS_v4_Unified_Master_Plan.md §6, §9.2
// Principle: minutes are the ONLY input; progress/state/streak/levels are derived here and never edited by hand.
// Not Measurable is represented by `null` (never a fake 0 / 100).
// ════════════════════════════════════════════════════════════════════
import { addDays, diffDays, dateOf } from "../../core/dates.js";

export const DEFAULT_SETTINGS = {
  timezone: "Africa/Cairo", weekStartDay: 6,
  dailyGoal: 30, dailyMinimum: 10, weeklyGoal: 720,          // minutes (UI shows hours for the week)
  nudgeTime: "20:00", vocabReviewTime: "09:00", restDaysPerMonth: 0,
  passThreshold: 80, closeThreshold: 60, staleTestMonths: 12, skillBands: [25, 50, 75],
  minutesPerPage: 2, vocabLadder: false, ladderDays: [1, 3, 7, 14, 30],
  quietStart: "22:00", quietEnd: "07:00",
};

export const CEFR = ["A1", "A2", "B1", "B2", "C1", "C2"];
export const cefrNum = (l) => { const i = CEFR.indexOf(l); return i < 0 ? 0 : i + 1; };

export const isLive = (r) => !!r && !r.deleted_at;
export const isActiveRec = (r) => isLive(r) && !r.archived_at;

// ── lesson (§6.1) ───────────────────────────────────────────────────
export function sessionsOf(sessions, lessonId) { return (sessions || []).filter((s) => isLive(s) && s.lesson_id === lessonId); }
export function lessonMetrics(lesson, sessions) {
  const D = Math.max(0, +lesson.total_duration_minutes || 0);
  const W = Math.max(0, +lesson.watched_minutes || 0);
  const list = sessions || [];
  const S = list.reduce((a, s) => a + (isLive(s) ? +s.minutes || 0 : 0), 0);
  const studyMinutes = list.reduce((a, s) => a + (isLive(s) && s.kind !== "adjustment" ? +s.minutes || 0 : 0), 0);
  const observed = Math.max(W, S);
  const completed = D > 0 ? Math.min(observed, D) : 0;
  const progress = D > 0 ? completed / D : null;
  const remaining = D > 0 ? Math.max(D - completed, 0) : 0;
  const minutesOver = D > 0 ? Math.max(observed - D, 0) : 0;
  const skipped = lesson.status === "Skipped";
  let state;
  if (skipped) state = "Skipped";
  else if (D > 0 && observed >= D) state = "Completed";
  else if (D === 0 && lesson.manual_completed_at) state = "Completed";
  else if (observed > 0) state = "In Progress";
  else state = "Not Started";
  return { D, W, S, studyMinutes, observed, completed, progress, remaining, minutesOver, state, measurable: !skipped && D > 0, warnWatchedAhead: W > S && S > 0, warnOver: D > 0 && observed > D };
}

// Manual completion of a measurable lesson → a hidden adjustment session (never counts for day/streak).
export function planComplete(lesson, sessions) {
  const m = lessonMetrics(lesson, sessions);
  if (m.D === 0) return { kind: "manual", patch: { manual_completed_at: new Date().toISOString() } };
  if (m.observed >= m.D) return { kind: "none" };
  return { kind: "adjustment", minutes: m.D - m.observed };
}
export const adjustmentsToUndo = (lessonId, sessions) => (sessions || []).filter((s) => isLive(s) && s.lesson_id === lessonId && s.kind === "adjustment" && s.source === "completion_adjustment");
// "Convert manual watched to adjustment" — keeps observed unchanged (no inflation), then W resets to 0 (LT-10).
export function planConvertWatched(lesson, sessions) {
  const m = lessonMetrics(lesson, sessions);
  if (m.W === 0) return { ok: false, reason: "لا توجد مشاهدة يدوية" };
  return { ok: true, minutes: Math.max(m.W - m.S, 0), resetWatched: true, before: { watched: m.W, sessions: m.S, observed: m.observed } };
}
// "سجّل تقدمي" — position reached → session of the difference (LT-11)
export function quickLogPlan(lesson, sessions, positionMinute) {
  const m = lessonMetrics(lesson, sessions);
  const p = Math.round(+positionMinute);
  if (!(p > 0)) return { ok: false, reason: "أدخل رقمًا أكبر من صفر" };
  if (p <= m.observed) return { ok: false, reason: "وصلت سابقًا إلى دقيقة " + m.observed + " — لا توجد زيادة" };
  if (m.D > 0 && p > m.D) return { ok: false, reason: "الدقيقة أكبر من مدة الدرس (" + m.D + ")" };
  return { ok: true, minutes: p - m.observed, before: m.observed, after: p };
}

// ── hierarchy index (§6.2) ──────────────────────────────────────────
export function buildIndex({ areas, courses, units, lessons, sessions }) {
  const A = (areas || []).filter(isLive), C = (courses || []).filter(isLive), U = (units || []).filter(isLive), L = (lessons || []).filter(isLive), S = (sessions || []).filter(isLive);
  const sessByLesson = new Map(); S.forEach((s) => { (sessByLesson.get(s.lesson_id) || sessByLesson.set(s.lesson_id, []).get(s.lesson_id)).push(s); });
  const unitById = Object.fromEntries(U.map((u) => [u.id, u])), courseById = Object.fromEntries(C.map((c) => [c.id, c])), areaById = Object.fromEntries(A.map((a) => [a.id, a]));
  const lessonsByUnit = new Map(); L.forEach((l) => { (lessonsByUnit.get(l.unit_id) || lessonsByUnit.set(l.unit_id, []).get(l.unit_id)).push(l); });
  const unitsByCourse = new Map(); U.forEach((u) => { (unitsByCourse.get(u.course_id) || unitsByCourse.set(u.course_id, []).get(u.course_id)).push(u); });
  const lm = {}; L.forEach((l) => { lm[l.id] = lessonMetrics(l, sessByLesson.get(l.id) || []); });
  const lessonCourse = (l) => { const u = unitById[l.unit_id]; return u ? courseById[u.course_id] || null : null; };
  const lessonArea = (l) => { const c = lessonCourse(l); return c ? areaById[c.area_id] || null : null; };
  return { A, C, U, L, S, sessByLesson, unitById, courseById, areaById, lessonsByUnit, unitsByCourse, lm, lessonCourse, lessonArea };
}

export function aggregate(lessons, lm) {
  const real = lessons.filter((l) => !l.is_system);
  let total = 0, completed = 0, count = 0, done = 0, started = false, skipped = 0;
  real.forEach((l) => {
    const m = lm[l.id]; if (!m) return;
    if (m.state === "Skipped") { skipped++; return; }
    count++; if (m.state === "Completed") done++; if (m.observed > 0) started = true;
    if (m.measurable) { total += m.D; completed += m.completed; }
  });
  return { total, completed, remaining: Math.max(total - completed, 0), progress: total > 0 ? completed / total : null, lessonsCount: count, completedLessons: done, skipped, started, measurableCount: real.filter((l) => lm[l.id] && lm[l.id].measurable).length };
}
const stateOf = (agg, manual) => manual ? "Completed" : agg.lessonsCount === 0 ? "Not Started" : agg.completedLessons === agg.lessonsCount ? "Completed" : agg.started || agg.completedLessons > 0 ? "In Progress" : "Not Started";

export function unitMetrics(unit, ix) { const ls = ix.lessonsByUnit.get(unit.id) || []; const g = aggregate(ls, ix.lm); return { ...g, state: stateOf(g, false) }; }
export function courseLessons(course, ix) { return (ix.unitsByCourse.get(course.id) || []).flatMap((u) => ix.lessonsByUnit.get(u.id) || []); }
export function courseMetrics(course, ix) {
  const units = (ix.unitsByCourse.get(course.id) || []).filter((u) => !u.is_default || (ix.lessonsByUnit.get(u.id) || []).length >= 0);
  const g = aggregate(courseLessons(course, ix), ix.lm);
  const unitStates = units.filter((u) => !u.is_default).map((u) => unitMetrics(u, ix).state);
  const base = stateOf(g, !!course.manual_completed_at);
  return { ...g, state: base, unitsTotal: unitStates.length, unitsCompleted: unitStates.filter((s) => s === "Completed").length, currentLesson: currentLesson(course, ix) };
}
export function orderedLessons(course, ix) {
  const us = [...(ix.unitsByCourse.get(course.id) || [])].sort((a, b) => (a.order || 0) - (b.order || 0));
  return us.flatMap((u) => [...(ix.lessonsByUnit.get(u.id) || [])].filter((l) => !l.is_system).sort((a, b) => (a.lesson_number || 0) - (b.lesson_number || 0)));
}
export function currentLesson(course, ix) {
  const all = orderedLessons(course, ix);
  if (course.pinned_lesson_id) { const p = all.find((l) => l.id === course.pinned_lesson_id); if (p) return p; }
  return all.find((l) => { const s = ix.lm[l.id] && ix.lm[l.id].state; return s === "Not Started" || s === "In Progress"; }) || null;
}
export function areaMetrics(area, ix, today, avgDaily28) {
  const courses = ix.C.filter((c) => c.area_id === area.id && !c.is_system && !c.archived_at && c.status !== "Archived");
  const lessons = courses.flatMap((c) => courseLessons(c, ix));
  const g = aggregate(lessons, ix.lm);
  const cm = courses.map((c) => courseMetrics(c, ix));
  const w = weeklyMinutesForArea(area.id, ix, today);
  return { ...g, coursesCount: courses.length, activeCourses: courses.filter((c) => c.status !== "Paused").length, completedCourses: cm.filter((m) => m.state === "Completed").length, minutesLast7: w, weeklyGoalPct: area.weekly_goal_minutes > 0 ? w / area.weekly_goal_minutes : null, eta: eta(g.remaining, avgDaily28) };
}
export function weeklyMinutesForArea(areaId, ix, today) {
  const from = addDays(today, -6);
  return ix.S.reduce((a, s) => { if (s.kind === "adjustment" || s.date < from || s.date > today) return a; const l = ix.L.find((x) => x.id === s.lesson_id); const ar = l ? ix.lessonArea(l) : null; return ar && ar.id === areaId ? a + (+s.minutes || 0) : a; }, 0);
}
export function goalMetrics(goal, ix) {
  const areas = (goal.area_ids || []).map((id) => ix.areaById[id]).filter((a) => a && !a.archived_at && a.status !== "Archived");
  if (!areas.length) return { total: 0, completed: 0, remaining: 0, progress: null, setupState: "Needs Setup", coursesCount: 0, lessonsTotal: 0, lessonsCompleted: 0 };
  let total = 0, completed = 0, courses = 0, lt = 0, lc = 0;
  areas.forEach((a) => { const m = areaMetrics(a, ix, "9999-12-31", 0); total += m.total; completed += m.completed; courses += m.coursesCount; lt += m.lessonsCount; lc += m.completedLessons; });
  return { total, completed, remaining: Math.max(total - completed, 0), progress: total > 0 ? completed / total : null, setupState: "OK", coursesCount: courses, lessonsTotal: lt, lessonsCompleted: lc, suggestAchieved: total > 0 && completed >= total };
}
export const fmtProgress = (p) => (p == null ? "غير قابل للقياس" : Math.round(p * 100) + "%");

// ── day / week / streak (§6.4) ──────────────────────────────────────
export function dailyTotals(ix) {
  const t = {};
  ix.S.forEach((s) => {
    const l = ix.L.find((x) => x.id === s.lesson_id); const a = l ? ix.lessonArea(l) : null;
    const d = t[s.date] || (t[s.date] = { study: 0, adjustment: 0, streakStudy: 0 });
    if (s.kind === "adjustment") d.adjustment += +s.minutes || 0;
    else { d.study += +s.minutes || 0; if (!a || a.counts_toward_streak !== false) d.streakStudy += +s.minutes || 0; }
  });
  return t;
}
export function dayState(minutes, st) {
  if (minutes >= st.dailyGoal) return "goal";
  if (minutes >= st.dailyMinimum) return "safe";
  if (minutes > 0) return "below";
  return "none";
}
export function streakInfo(totals, today, st, restDays) {
  const rest = new Set(restDays || []); const dates = Object.keys(totals).filter((d) => totals[d].streakStudy > 0).sort();
  const q = (d) => ((totals[d] && totals[d].streakStudy) || 0) >= st.dailyMinimum;
  const r = (d) => rest.has(d) && !q(d);
  const first = dates[0];
  let streak = 0;
  if (first) {
    let d = q(today) ? today : addDays(today, -1);
    while (d >= first) { if (q(d)) streak++; else if (!r(d)) break; d = addDays(d, -1); }
  }
  let longest = 0, run = 0;
  if (first) { for (let d = first; d <= today; d = addDays(d, 1)) { if (q(d)) { run++; if (run > longest) longest = run; } else if (r(d)) { /* neither counts nor breaks */ } else if (d !== today) run = 0; } }
  return { streak, longest: Math.max(longest, streak) };
}
export function dashboardStats(ix, today, st, restDays) {
  const totals = dailyTotals(ix);
  const minutesToday = (totals[today] && totals[today].streakStudy) || 0;
  let last7 = 0; for (let i = 0; i < 7; i++) last7 += (totals[addDays(today, -i)] && totals[addDays(today, -i)].streakStudy) || 0;
  let l28 = 0; for (let i = 0; i < 28; i++) l28 += (totals[addDays(today, -i)] && totals[addDays(today, -i)].streakStudy) || 0;
  const s = streakInfo(totals, today, st, restDays);
  return { minutesToday, dailyPct: st.dailyGoal > 0 ? minutesToday / st.dailyGoal : 0, dailyState: dayState(minutesToday, st), minutesToMinimum: Math.max(st.dailyMinimum - minutesToday, 0), last7, weeklyPct: st.weeklyGoal > 0 ? last7 / st.weeklyGoal : 0, avgDaily28: l28 / 28, ...s, totals };
}
export function canAddRestDay(restDays, date, st) {
  if (!(st.restDaysPerMonth > 0)) return { ok: false, reason: "أيام الراحة مغلقة في الإعدادات" };
  const ym = date.slice(0, 7); const n = (restDays || []).filter((d) => d.slice(0, 7) === ym && d !== date).length;
  return n >= st.restDaysPerMonth ? { ok: false, reason: "بلغت حد أيام الراحة الشهري" } : { ok: true };
}

// ── forecast (§6.9) ─────────────────────────────────────────────────
export function eta(remaining, avgDaily, today) {
  if (!(avgDaily > 0) || !(remaining > 0)) return null;
  const days = Math.ceil(remaining / avgDaily); return today ? addDays(today, days) : days;
}
export function pace(remaining, avgDaily, target, today) {
  const e = eta(remaining, avgDaily, today); if (!e || !target) return { eta: e, requiredDaily: null, status: null };
  return { eta: e, requiredDaily: remaining / Math.max(diffDays(target, today), 1), status: e <= target ? "On Pace" : "Behind" };
}

// ── skills (§6.6): coverage ≠ mastery ───────────────────────────────
export function skillCoverage(skill, ix, courseSkills, lessonSkills) {
  const directIds = new Set((lessonSkills || []).filter((x) => x.skill_id === skill.id).map((x) => x.lesson_id));
  const set = new Map();
  (lessonSkills || []).filter((x) => x.skill_id === skill.id).forEach((x) => { const l = ix.L.find((y) => y.id === x.lesson_id); if (l && !l.is_system) set.set(l.id, l); });
  (courseSkills || []).filter((x) => x.skill_id === skill.id).forEach((x) => {
    const c = ix.courseById[x.course_id]; if (!c) return; const ls = courseLessons(c, ix).filter((l) => !l.is_system);
    const hasDirect = ls.some((l) => directIds.has(l.id));
    (hasDirect ? ls.filter((l) => directIds.has(l.id)) : ls).forEach((l) => set.set(l.id, l));
  });
  const g = aggregate([...set.values()], ix.lm);
  const dup = (courseSkills || []).filter((x) => x.skill_id === skill.id).some((x) => { const c = ix.courseById[x.course_id]; return c && courseLessons(c, ix).some((l) => directIds.has(l.id)); });
  return { total: g.total, completed: g.completed, progress: g.progress, duplicateLink: dup, lessonIds: [...set.keys()] };
}
export function masteryLevel(rating, bands) {
  const b = bands || [25, 50, 75];
  if (rating == null || rating === "") return "Unrated";
  const r = +rating; if (r === 0) return "Not Started";
  if (r < b[0]) return "Beginner"; if (r < b[1]) return "Advanced Beginner"; if (r < b[2]) return "Intermediate"; return "Advanced";
}
export function suggestedLevel(progress, bands) { return progress == null ? null : masteryLevel(Math.round(progress * 100), bands); }
export function skillEvidence(skill, ix, lessonIds, today) {
  const from = addDays(today, -29); const set = new Set(lessonIds || []);
  return ix.S.reduce((a, s) => (s.kind !== "adjustment" && set.has(s.lesson_id) && s.date >= from && s.date <= today ? a + (+s.minutes || 0) : a), 0);
}

// ── level tests (§6.7) ──────────────────────────────────────────────
export function testResult(score, st) { const s = +score; return s >= st.passThreshold ? "Passed" : s >= st.closeThreshold ? "Close" : "Not Passed"; }
export function confirmedLevel(tests, st) {
  let best = 0, bestTest = null;
  (tests || []).filter(isLive).forEach((t) => { if (testResult(t.score_percent, st) === "Passed") { const n = cefrNum(t.tested_level); if (n > best || (n === best && bestTest && t.date > bestTest.date)) { best = n; bestTest = t; } } });
  return { number: best, level: best ? CEFR[best - 1] : null, test: bestTest };
}
export function levelGap(area, confirmed) { const d = cefrNum(area.current_language_level), c = confirmed.number; return d && c ? d - c : null; }
export function isStaleTest(confirmed, today, st) { return !!(confirmed.test && diffDays(today, confirmed.test.date) > st.staleTestMonths * 30); }
export function contentLevelCompleted(area, ix) {
  let best = 0; ix.C.filter((c) => c.area_id === area.id).forEach((c) => (ix.unitsByCourse.get(c.id) || []).forEach((u) => { if (u.language_level && unitMetrics(u, ix).state === "Completed") best = Math.max(best, cefrNum(u.language_level)); }));
  return best ? CEFR[best - 1] : null;
}

// ── vocabulary (§6.8) — no SRS ──────────────────────────────────────
export const vocabDue = (v, today) => isActiveRec(v) && v.status !== "Mastered" && !!v.next_review_date && v.next_review_date <= today;
export const vocabQueue = (list, today) => (list || []).filter((v) => vocabDue(v, today)).sort((a, b) => (a.next_review_date < b.next_review_date ? -1 : a.next_review_date > b.next_review_date ? 1 : cefrNum(a.level) - cefrNum(b.level)));
export function vocabCounts(list, today) {
  const l = (list || []).filter(isActiveRec); const c = { New: 0, Learning: 0, Review: 0, Mastered: 0, dueToday: 0, overdue: 0 };
  l.forEach((v) => { c[v.status] = (c[v.status] || 0) + 1; if (vocabDue(v, today)) { c.dueToday++; if (v.next_review_date < today) c.overdue++; } });
  return c;
}
export function reviewVocab(v, newStatus, today, st) {
  const status = newStatus || v.status; const o = { status, last_reviewed_at: today };
  if (status === "Mastered") o.next_review_date = null;
  else if (st && st.vocabLadder) { const step = Math.min((v.ladder_step || 0), st.ladderDays.length - 1); o.next_review_date = addDays(today, st.ladderDays[step]); o.ladder_step = (v.ladder_step || 0) + 1; }
  return o;                                           // without the ladder the date is NEVER changed automatically (LT-80)
}
export const vocabDuplicate = (list, v) => (list || []).some((x) => isActiveRec(x) && x.id !== v.id && x.area_id === v.area_id && (x.word || "").trim().toLowerCase() === (v.word || "").trim().toLowerCase() && (x.part_of_speech || "") === (v.part_of_speech || ""));

// ── timer (§10.3): paused time is never counted ─────────────────────
export function timerElapsedMs(t, nowMs) { if (!t) return 0; const start = Date.parse(t.started_at); const end = t.paused_at ? Date.parse(t.paused_at) : nowMs; return Math.max(0, end - start - (t.paused_total_ms || 0)); }
export function timerToMinutes(t, nowMs) { return Math.round(timerElapsedMs(t, nowMs) / 60000); }
export function timerPause(t, nowMs) { return t.paused_at ? t : { ...t, paused_at: new Date(nowMs).toISOString() }; }
export function timerResume(t, nowMs) { return t.paused_at ? { ...t, paused_at: null, paused_total_ms: (t.paused_total_ms || 0) + (nowMs - Date.parse(t.paused_at)) } : t; }

// ── validation (LV-xx) ──────────────────────────────────────────────
export function validateSession(s, ctx) {
  const e = [], w = [];
  const m = +s.minutes;
  if (!Number.isInteger(m) || m < 1 || m > 1440) e.push("SESSION_MINUTES_RANGE");
  if (!s.lesson_id) e.push("LESSON_REQUIRED");
  if (s.date && ctx.today && s.date > ctx.today) e.push("SESSION_DATE_FUTURE");
  if (s.started_at && s.ended_at && !(Date.parse(s.started_at) < Date.parse(s.ended_at))) e.push("SESSION_TIME_RANGE");
  const lesson = ctx.lessonsById && ctx.lessonsById[s.lesson_id];
  if (lesson && lesson.status === "Skipped") e.push("LESSON_SKIPPED");
  if (s.client_generated_id && (ctx.sessions || []).some((x) => isLive(x) && x.id !== s.id && x.client_generated_id === s.client_generated_id)) e.push("SESSION_IDEMPOTENT_DUPLICATE");
  if ((ctx.sessions || []).some((x) => isLive(x) && x.id !== s.id && x.lesson_id === s.lesson_id && x.date === s.date && +x.minutes === m && x.kind !== "adjustment" && x.created_at && ctx.nowMs && ctx.nowMs - Date.parse(x.created_at) < 5 * 60000)) w.push("SESSION_DUPLICATE");
  return { errors: e, warnings: w };
}
export function validateSettings(s) { const e = []; if (!(s.dailyMinimum >= 1)) e.push("minimum ≥ 1"); if (s.dailyGoal < s.dailyMinimum) e.push("GOAL_LT_MINIMUM"); if (s.weeklyGoal < 0) e.push("weekly ≥ 0"); return e; }
export function validateLesson(l) { const e = []; if (!(+l.total_duration_minutes >= 0)) e.push("duration ≥ 0"); if (l.watched_minutes != null && !(+l.watched_minutes >= 0)) e.push("watched ≥ 0"); if (l.today_session_goal != null && l.today_session_goal !== "" && !(+l.today_session_goal > 0)) e.push("session goal > 0"); return e; }
export function validateTest(t, area, today) { const e = []; if (!(+t.score_percent >= 0 && +t.score_percent <= 100)) e.push("SCORE_RANGE"); if (!CEFR.includes(t.tested_level)) e.push("CEFR"); if (area && !area.is_language) e.push("TEST_AREA_NOT_LANGUAGE"); if (t.date && today && t.date > today) e.push("TEST_DATE_FUTURE"); return e; }
export const validateRating = (r) => r == null || r === "" || (Number.isInteger(+r) && +r >= 0 && +r <= 100);
export const validateVocab = (v, area) => { const e = []; if (!(v.word || "").trim()) e.push("word"); if (!(v.meaning || "").trim()) e.push("meaning"); if (!v.area_id) e.push("area"); else if (area && !area.is_language) e.push("area_not_language"); return e; };
export function canDelete(kind, id, ix) {
  if (kind === "lesson") return ix.S.some((s) => s.lesson_id === id) ? { ok: false, code: "DELETE_BLOCKED_HAS_SESSIONS" } : { ok: true };
  if (kind === "unit") { const ls = ix.lessonsByUnit.get(id) || []; return ls.some((l) => !l.is_system) ? { ok: false, code: "UNIT_HAS_LESSONS" } : { ok: true }; }
  if (kind === "course") { const c = ix.courseById[id]; return c && courseLessons(c, ix).some((l) => ix.S.some((s) => s.lesson_id === l.id)) ? { ok: false, code: "DELETE_BLOCKED_HAS_SESSIONS" } : { ok: true }; }
  if (kind === "area") return ix.C.some((c) => c.area_id === id && ix.L.some((l) => ix.lessonCourse(l) === c && ix.S.some((s) => s.lesson_id === l.id))) ? { ok: false, code: "DELETE_BLOCKED_HAS_SESSIONS" } : { ok: true };
  return { ok: true };
}

// ── ordering ────────────────────────────────────────────────────────
export function reorder(list, id, toIndex) {                                    // returns [{id, order}] with 1..n, no duplicates
  const arr = [...list].sort((a, b) => (a.order || 0) - (b.order || 0)); const i = arr.findIndex((x) => x.id === id); if (i < 0) return [];
  const [it] = arr.splice(i, 1); arr.splice(Math.max(0, Math.min(toIndex, arr.length)), 0, it);
  return arr.map((x, k) => ({ id: x.id, order: k + 1 }));
}
export function moveLessonPatch(lesson, toUnit) { return { ...lesson, unit_id: toUnit.id }; }
export function importLines(text, minutesPerLine) {
  return (text || "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((l, i) => {
    const parts = l.split(/[,\t;|]/).map((x) => x.trim()); let name = parts[0], url = null, dur = null;
    parts.slice(1).forEach((p) => { if (/^https?:\/\//i.test(p)) url = p; else if (/^\d+$/.test(p)) dur = +p; });
    if (/^https?:\/\//i.test(name)) { url = name; name = "درس " + (i + 1); }
    return { name, url, total_duration_minutes: dur != null ? dur : minutesPerLine || 0, lesson_number: i + 1 };
  });
}
export function nextLessonSuggestions(ix, st, today, max) {
  const out = [];
  ix.C.filter((c) => !c.is_system && !c.archived_at && c.status === "Active").forEach((c) => { const l = currentLesson(c, ix); if (l) out.push({ course: c, lesson: l, metrics: ix.lm[l.id], reason: c.pinned_lesson_id === l.id ? "مثبّت" : ix.lm[l.id].observed > 0 ? "تابع من حيث توقفت" : "الدرس التالي" }); });
  return out.sort((a, b) => (b.metrics.observed > 0) - (a.metrics.observed > 0)).slice(0, max || 3);
}
export const todayLessons = (ix, today) => ix.L.filter((l) => !l.is_system && l.study_date === today && ix.lm[l.id] && ix.lm[l.id].state !== "Completed" && ix.lm[l.id].state !== "Skipped");
export const overduePlanned = (ix, today) => ix.L.filter((l) => !l.is_system && l.study_date && l.study_date < today && ix.lm[l.id] && ix.lm[l.id].state !== "Completed" && ix.lm[l.id].state !== "Skipped");
export const localDate = (iso, tz) => dateOf(iso, tz);
