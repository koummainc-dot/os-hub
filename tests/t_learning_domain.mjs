// Domain acceptance tests for Learning OS (plan §18 LT-xx). Run: node tests/t_learning_domain.mjs
import assert from "node:assert/strict";
import * as D from "../src/systems/learning/domain.js";

let pass = 0, fail = 0;
const t = (name, fn) => { try { fn(); pass++; console.log("  ✓", name); } catch (e) { fail++; console.log("  ✗", name, "\n     ", e.message); } };
const ST = D.DEFAULT_SETTINGS;
const TODAY = "2026-10-27";
const mk = ({ areas = [{ id: "a1", name: "A" }], courses = [{ id: "c1", area_id: "a1", status: "Active" }], units = [{ id: "u1", course_id: "c1", order: 1 }], lessons = [], sessions = [] }) => D.buildIndex({ areas, courses, units, lessons, sessions });
const L = (id, dur, o = {}) => ({ id, unit_id: "u1", name: id, total_duration_minutes: dur, status: "Active", ...o });
const S = (id, lesson, min, date, o = {}) => ({ id, lesson_id: lesson, minutes: min, date, kind: "study", ...o });

console.log("Lesson engine");
t("LT-01 observed = max(watched, Σsessions), no double count", () => { const m = D.lessonMetrics(L("l", 60, { watched_minutes: 30 }), [S("s", "l", 20, TODAY)]); assert.equal(m.observed, 30); const m2 = D.lessonMetrics(L("l", 60, { watched_minutes: 10 }), [S("s", "l", 20, TODAY)]); assert.equal(m2.observed, 20); });
t("LT-02 a 35-minute session updates the lesson", () => { const m = D.lessonMetrics(L("l", 70), [S("s", "l", 35, TODAY)]); assert.equal(m.completed, 35); assert.equal(m.progress, 0.5); });
t("LT-03/04/05 clamp: completed ≤ duration, remaining ≥ 0, minutes_over", () => { const m = D.lessonMetrics(L("l", 30), [S("s", "l", 45, TODAY)]); assert.equal(m.completed, 30); assert.equal(m.progress, 1); assert.equal(m.remaining, 0); assert.equal(m.minutesOver, 15); assert.equal(m.warnOver, true); });
t("LT-06 duration 0 ⇒ Not Measurable, no division by zero", () => { const m = D.lessonMetrics(L("l", 0), [S("s", "l", 10, TODAY)]); assert.equal(m.progress, null); assert.equal(m.measurable, false); assert.equal(m.state, "In Progress"); });
t("LT-07 states + Skipped", () => { assert.equal(D.lessonMetrics(L("l", 10), []).state, "Not Started"); assert.equal(D.lessonMetrics(L("l", 10), [S("s", "l", 4, TODAY)]).state, "In Progress"); assert.equal(D.lessonMetrics(L("l", 10), [S("s", "l", 10, TODAY)]).state, "Completed"); assert.equal(D.lessonMetrics(L("l", 10, { status: "Skipped" }), []).state, "Skipped"); });
t("LT-08 manual completion creates an adjustment of the gap", () => { const p = D.planComplete(L("l", 40), [S("s", "l", 15, TODAY)]); assert.equal(p.kind, "adjustment"); assert.equal(p.minutes, 25); });
t("LT-08b adjustment counts for the lesson but not for the day/streak", () => { const ix = mk({ lessons: [L("l", 40)], sessions: [S("s", "l", 15, TODAY), S("adj", "l", 25, TODAY, { kind: "adjustment", source: "completion_adjustment" })] }); assert.equal(ix.lm.l.state, "Completed"); const st = D.dashboardStats(ix, TODAY, ST); assert.equal(st.minutesToday, 15); });
t("LT-09 undo-complete removes only the adjustment", () => { const ss = [S("s", "l", 15, TODAY), S("adj", "l", 25, TODAY, { kind: "adjustment", source: "completion_adjustment" })]; assert.deepEqual(D.adjustmentsToUndo("l", ss).map((x) => x.id), ["adj"]); });
t("LT-10 convert watched ⇒ adjustment keeps observed, W resets", () => { const l = L("l", 60, { watched_minutes: 30 }); const p = D.planConvertWatched(l, [S("s", "l", 10, TODAY)]); assert.equal(p.ok, true); assert.equal(p.minutes, 20); assert.equal(p.resetWatched, true); const after = D.lessonMetrics({ ...l, watched_minutes: 0 }, [S("s", "l", 10, TODAY), S("adj", "l", 20, TODAY, { kind: "adjustment" })]); assert.equal(after.observed, 30); });
t("LT-11 quick log (position) creates difference only", () => { const q = D.quickLogPlan(L("l", 90), [S("s", "l", 20, TODAY)], 45); assert.equal(q.ok, true); assert.equal(q.minutes, 25); assert.equal(D.quickLogPlan(L("l", 90), [S("s", "l", 20, TODAY)], 10).ok, false); assert.equal(D.quickLogPlan(L("l", 90), [], 120).ok, false); });
t("LT-12 Paused lesson stays in the denominator", () => { const ix = mk({ lessons: [L("a", 30, { status: "Paused" }), L("b", 30)], sessions: [S("s", "b", 30, TODAY)] }); const g = D.aggregate(ix.L, ix.lm); assert.equal(g.total, 60); assert.equal(g.progress, 0.5); });
t("LT-14 zero-duration lesson completed manually counts as a lesson, not time", () => { const ix = mk({ lessons: [L("a", 0, { manual_completed_at: "x" }), L("b", 20)] }); const g = D.aggregate(ix.L, ix.lm); assert.equal(g.completedLessons, 1); assert.equal(g.total, 20); });

console.log("Aggregation");
t("LT-18 weighted by time, not average of percentages", () => { const ix = mk({ lessons: [L("a", 5), L("b", 120)], sessions: [S("s", "a", 5, TODAY)] }); const g = D.aggregate(ix.L, ix.lm); assert.ok(Math.abs(g.progress - 5 / 125) < 1e-9); });
t("LT-19 area without courses ⇒ Not Measurable", () => { const ix = mk({ courses: [], units: [], lessons: [] }); assert.equal(D.areaMetrics(ix.A[0], ix, TODAY, 0).progress, null); });
t("LT-20 course without lessons ⇒ Not Measurable; manual completion ⇒ Completed", () => { const ix = mk({ lessons: [] }); assert.equal(D.courseMetrics(ix.C[0], ix).progress, null); assert.equal(D.courseMetrics({ ...ix.C[0], manual_completed_at: "x" }, ix).state, "Completed"); });
t("LT-21 archived course excluded; paused stays in progress but not active", () => { const ix = mk({ courses: [{ id: "c1", area_id: "a1", status: "Active", archived_at: "x" }, { id: "c2", area_id: "a1", status: "Paused" }], units: [{ id: "u1", course_id: "c1", order: 1 }, { id: "u2", course_id: "c2", order: 1 }], lessons: [L("a", 100), { ...L("b", 50), unit_id: "u2" }] }); const m = D.areaMetrics(ix.A[0], ix, TODAY, 0); assert.equal(m.total, 50); assert.equal(m.activeCourses, 0); assert.equal(m.coursesCount, 1); });
t("LT-22 unit A1: 3 lessons, 80 minutes, 40 done ⇒ 50% (and area 50%)", () => { const ix = mk({ lessons: [L("a", 30), L("b", 30), L("c", 20)], sessions: [S("s1", "a", 30, TODAY), S("s2", "b", 10, TODAY)] }); assert.equal(D.unitMetrics(ix.U[0], ix).progress, 0.5); assert.equal(D.areaMetrics(ix.A[0], ix, TODAY, 0).progress, 0.5); });
t("LT-23 current lesson derived; pinned overrides", () => { const ix = mk({ lessons: [L("a", 10, { lesson_number: 1 }), L("b", 10, { lesson_number: 2 })], sessions: [S("s", "a", 10, TODAY)] }); assert.equal(D.currentLesson(ix.C[0], ix).id, "b"); assert.equal(D.currentLesson({ ...ix.C[0], pinned_lesson_id: "a" }, ix).id, "a"); });
t("LT-26/27 goal: aggregated, Needs Setup, shared area counted in each", () => { const ix = mk({ lessons: [L("a", 100)], sessions: [S("s", "a", 50, TODAY)] }); const g1 = D.goalMetrics({ area_ids: ["a1"] }, ix), g2 = D.goalMetrics({ area_ids: ["a1"] }, ix); assert.equal(g1.progress, 0.5); assert.equal(g2.progress, 0.5); assert.equal(D.goalMetrics({ area_ids: [] }, ix).setupState, "Needs Setup"); });
t("LT-24 reorder gives 1..n with no duplicates", () => { const r = D.reorder([{ id: "a", order: 1 }, { id: "b", order: 2 }, { id: "c", order: 3 }], "c", 0); assert.deepEqual(r.map((x) => x.id), ["c", "a", "b"]); assert.deepEqual(r.map((x) => x.order), [1, 2, 3]); });
t("LT-25 moving a lesson keeps its sessions (they follow by lesson_id)", () => { const ix = mk({ units: [{ id: "u1", course_id: "c1", order: 1 }, { id: "u2", course_id: "c1", order: 2 }], lessons: [L("a", 10)], sessions: [S("s", "a", 10, TODAY)] }); const moved = D.moveLessonPatch(ix.L[0], { id: "u2" }); const ix2 = mk({ units: [{ id: "u1", course_id: "c1", order: 1 }, { id: "u2", course_id: "c1", order: 2 }], lessons: [moved], sessions: [S("s", "a", 10, TODAY)] }); assert.equal(D.unitMetrics(ix2.unitById.u2, ix2).completed, 10); assert.equal(D.unitMetrics(ix2.unitById.u1, ix2).total, 0); });
t("system (free-study) lessons are excluded from lesson/time aggregates", () => { const ix = mk({ lessons: [L("a", 10), L("free", 0, { is_system: true })] }); assert.equal(D.aggregate(ix.L, ix.lm).lessonsCount, 1); });

console.log("Sessions & validation");
t("LT-28 minutes ∈ [1,1440]", () => { const c = { today: TODAY }; assert.ok(D.validateSession({ lesson_id: "l", minutes: 0, date: TODAY }, c).errors.includes("SESSION_MINUTES_RANGE")); assert.ok(D.validateSession({ lesson_id: "l", minutes: 1441, date: TODAY }, c).errors.includes("SESSION_MINUTES_RANGE")); assert.equal(D.validateSession({ lesson_id: "l", minutes: 1440, date: TODAY }, c).errors.length, 0); });
t("LT-29 same client_generated_id ⇒ rejected as duplicate (idempotent)", () => { const ex = [S("s1", "l", 10, TODAY, { client_generated_id: "k1" })]; assert.ok(D.validateSession({ id: "s2", lesson_id: "l", minutes: 10, date: TODAY, client_generated_id: "k1" }, { today: TODAY, sessions: ex }).errors.includes("SESSION_IDEMPOTENT_DUPLICATE")); });
t("LT-32 future date rejected", () => { assert.ok(D.validateSession({ lesson_id: "l", minutes: 5, date: "2026-10-28" }, { today: TODAY }).errors.includes("SESSION_DATE_FUTURE")); });
t("LT-36 duplicate warning is non-blocking", () => { const now = Date.now(); const r = D.validateSession({ id: "n", lesson_id: "l", minutes: 10, date: TODAY }, { today: TODAY, nowMs: now, sessions: [S("o", "l", 10, TODAY, { created_at: new Date(now - 60000).toISOString() })] }); assert.equal(r.errors.length, 0); assert.deepEqual(r.warnings, ["SESSION_DUPLICATE"]); });
t("LT-37 session on a Skipped lesson rejected", () => { assert.ok(D.validateSession({ lesson_id: "l", minutes: 5, date: TODAY }, { today: TODAY, lessonsById: { l: { status: "Skipped" } } }).errors.includes("LESSON_SKIPPED")); });
t("LT-39 timer: paused time is not counted", () => { const t0 = Date.parse("2026-10-27T10:00:00Z"); let tm = { started_at: "2026-10-27T10:00:00Z", paused_total_ms: 0 }; tm = D.timerPause(tm, t0 + 10 * 60000); tm = D.timerResume(tm, t0 + 25 * 60000); assert.equal(D.timerToMinutes(tm, t0 + 35 * 60000), 20); });
t("LT-31/delete blocked: lesson with sessions cannot be hard-deleted", () => { const ix = mk({ lessons: [L("a", 10)], sessions: [S("s", "a", 5, TODAY)] }); assert.equal(D.canDelete("lesson", "a", ix).code, "DELETE_BLOCKED_HAS_SESSIONS"); assert.equal(D.canDelete("course", "c1", ix).ok, false); });
t("LT-53 goal < minimum rejected", () => { assert.ok(D.validateSettings({ ...ST, dailyGoal: 5, dailyMinimum: 10 }).includes("GOAL_LT_MINIMUM")); assert.equal(D.validateSettings(ST).length, 0); });
t("import lines: names, urls and durations", () => { const r = D.importLines("Intro, 12\nhttps://x.com/a\nLesson 3; https://y.com; 9", 5); assert.equal(r[0].total_duration_minutes, 12); assert.equal(r[1].url, "https://x.com/a"); assert.equal(r[1].total_duration_minutes, 5); assert.equal(r[2].url, "https://y.com"); assert.equal(r[2].total_duration_minutes, 9); });

console.log("Day, week, streak");
const sess = (days) => Object.entries(days).map(([off, min], i) => S("s" + i, "l", min, D.localDate ? require_add(TODAY, -(+off)) : TODAY));
function require_add(d, n) { const t = new Date(Date.parse(d + "T00:00:00Z") + n * 86400000); return t.toISOString().slice(0, 10); }
const dayIx = (days, areas) => mk({ areas: areas || [{ id: "a1" }], lessons: [L("l", 0)], sessions: sess(days) });
t("LT-52 demo: today 20, streak 3, last 7 = 102", () => { const ix = dayIx({ 0: 20, 1: 35, 2: 12, 3: 5, 4: 30 }); const s = D.dashboardStats(ix, TODAY, ST, []); assert.equal(s.minutesToday, 20); assert.equal(s.streak, 3); assert.equal(s.last7, 102); });
t("LT-41/42 10 min keeps the streak, 9 does not", () => { assert.equal(D.dashboardStats(dayIx({ 0: 10 }), TODAY, ST, []).streak, 1); assert.equal(D.dashboardStats(dayIx({ 0: 9, 1: 30 }), TODAY, ST, []).streak, 1); });
t("LT-43 today not yet studied does not break the streak", () => { assert.equal(D.dashboardStats(dayIx({ 1: 20, 2: 20 }), TODAY, ST, []).streak, 2); });
t("LT-44 neither yesterday nor today ⇒ 0", () => { assert.equal(D.dashboardStats(dayIx({ 2: 20, 3: 20 }), TODAY, ST, []).streak, 0); });
t("LT-45 streaks over 120 days count correctly", () => { const days = {}; for (let i = 0; i < 150; i++) days[i] = 15; const s = D.dashboardStats(dayIx(days), TODAY, ST, []); assert.equal(s.streak, 150); assert.equal(s.longest, 150); });
t("LT-46 streak relies on study sessions only (not adjustments / watched)", () => { const ix = mk({ lessons: [L("l", 100, { watched_minutes: 50 })], sessions: [S("a", "l", 30, TODAY, { kind: "adjustment" })] }); const s = D.dashboardStats(ix, TODAY, ST, []); assert.equal(s.minutesToday, 0); assert.equal(s.streak, 0); });
t("LT-47 area with counts_toward_streak=false is excluded", () => { const s = D.dashboardStats(dayIx({ 0: 40 }, [{ id: "a1", counts_toward_streak: false }]), TODAY, ST, []); assert.equal(s.minutesToday, 0); });
t("LT-48 rest days neither break nor count; monthly cap", () => { const ix = dayIx({ 0: 20, 2: 20 }); const rest = [require_add(TODAY, -1)]; assert.equal(D.dashboardStats(ix, TODAY, ST, rest).streak, 2); assert.equal(D.canAddRestDay([], TODAY, ST).ok, false); const st2 = { ...ST, restDaysPerMonth: 1 }; assert.equal(D.canAddRestDay([], TODAY, st2).ok, true); assert.equal(D.canAddRestDay(["2026-10-01"], TODAY, st2).ok, false); });
t("LT-49 four day states", () => { assert.equal(D.dayState(30, ST), "goal"); assert.equal(D.dayState(12, ST), "safe"); assert.equal(D.dayState(4, ST), "below"); assert.equal(D.dayState(0, ST), "none"); });
t("LT-50 minutes to minimum", () => { assert.equal(D.dashboardStats(dayIx({ 0: 4 }), TODAY, ST, []).minutesToMinimum, 6); });
t("LT-55 longest streak", () => { const ix = dayIx({ 0: 20, 1: 20, 5: 20, 6: 20, 7: 20, 8: 20 }); const s = D.dashboardStats(ix, TODAY, ST, []); assert.equal(s.streak, 2); assert.equal(s.longest, 4); });

console.log("Skills");
const skIx = () => mk({ lessons: [L("a", 20, { lesson_number: 1 }), L("b", 20, { lesson_number: 2 }), L("c", 20, { lesson_number: 3 })], sessions: [S("s", "a", 20, TODAY)] });
t("LT-56 course + its lessons linked to the same skill ⇒ no double counting", () => { const ix = skIx(); const r = D.skillCoverage({ id: "sk" }, ix, [{ course_id: "c1", skill_id: "sk" }], [{ lesson_id: "a", skill_id: "sk" }]); assert.equal(r.total, 20); assert.equal(r.duplicateLink, true); });
t("LT-57 lesson-level link preferred over the whole course", () => { const ix = skIx(); const r = D.skillCoverage({ id: "sk" }, ix, [{ course_id: "c1", skill_id: "sk" }], [{ lesson_id: "a", skill_id: "sk" }, { lesson_id: "b", skill_id: "sk" }]); assert.equal(r.total, 40); });
t("LT-58 a lesson linked twice counts once", () => { const ix = skIx(); const r = D.skillCoverage({ id: "sk" }, ix, [], [{ lesson_id: "a", skill_id: "sk" }, { lesson_id: "a", skill_id: "sk" }]); assert.equal(r.total, 20); });
t("LT-59/60/61 mastery from self-rating only; completion does not imply mastery", () => { assert.equal(D.masteryLevel(null), "Unrated"); assert.equal(D.masteryLevel(0), "Not Started"); assert.equal(D.masteryLevel(24), "Beginner"); assert.equal(D.masteryLevel(25), "Advanced Beginner"); assert.equal(D.masteryLevel(50), "Intermediate"); assert.equal(D.masteryLevel(75), "Advanced"); const ix = skIx(); const cov = D.skillCoverage({ id: "sk" }, ix, [{ course_id: "c1", skill_id: "sk" }], []); assert.equal(D.masteryLevel(undefined), "Unrated"); assert.equal(D.suggestedLevel(1, ST.skillBands), "Advanced"); assert.equal(cov.progress, 1 / 3); });
t("LT-62 Reading skill with a 20/20 lesson ⇒ coverage 100%", () => { const ix = mk({ lessons: [L("a", 20)], sessions: [S("s", "a", 20, TODAY)] }); assert.equal(D.skillCoverage({ id: "sk" }, ix, [], [{ lesson_id: "a", skill_id: "sk" }]).progress, 1); });
t("LT-63 self rating range", () => { assert.equal(D.validateRating(101), false); assert.equal(D.validateRating(-1), false); assert.equal(D.validateRating(50), true); assert.equal(D.validateRating(null), true); });

console.log("Level tests");
const T = (level, score, date = "2026-09-01") => ({ id: level + score, tested_level: level, score_percent: score, date });
t("LT-65/66 thresholds 80 / 60", () => { assert.equal(D.testResult(80, ST), "Passed"); assert.equal(D.testResult(79.9, ST), "Close"); assert.equal(D.testResult(59.9, ST), "Not Passed"); });
t("LT-67/68 highest passed = confirmed; a lower later test does not lower it", () => { const c = D.confirmedLevel([T("B1", 85), T("A1", 95, "2026-10-01")], ST); assert.equal(c.level, "B1"); });
t("LT-69 demo: A1 90% and B1 55% ⇒ confirmed A1", () => { assert.equal(D.confirmedLevel([T("A1", 90), T("B1", 55)], ST).level, "A1"); });
t("LT-70/71 validation", () => { assert.ok(D.validateTest({ score_percent: 120, tested_level: "A1" }, { is_language: true }, TODAY).includes("SCORE_RANGE")); assert.ok(D.validateTest({ score_percent: 80, tested_level: "A1" }, { is_language: false }, TODAY).includes("TEST_AREA_NOT_LANGUAGE")); });
t("LT-72 stale after 12 months; thresholds configurable", () => { const c = D.confirmedLevel([T("B1", 85, "2025-09-01")], ST); assert.equal(D.isStaleTest(c, TODAY, ST), true); assert.equal(D.testResult(70, { ...ST, passThreshold: 70 }), "Passed"); });
t("LT-73 declared vs confirmed gap; content level separate", () => { const c = D.confirmedLevel([T("A2", 90)], ST); assert.equal(D.levelGap({ current_language_level: "B1" }, c), 1); const ix = mk({ units: [{ id: "u1", course_id: "c1", order: 1, language_level: "B2" }], lessons: [L("a", 10)], sessions: [S("s", "a", 10, TODAY)] }); assert.equal(D.contentLevelCompleted(ix.A[0], ix), "B2"); });

console.log("Vocabulary");
const V = (id, o = {}) => ({ id, area_id: "a1", word: id, meaning: "m", status: "New", next_review_date: TODAY, ...o });
t("LT-77 queue = due, not mastered, sorted", () => { const q = D.vocabQueue([V("b", { next_review_date: "2026-10-26" }), V("a", { next_review_date: "2026-10-20" }), V("c", { status: "Mastered" }), V("d", { next_review_date: "2026-11-01" })], TODAY); assert.deepEqual(q.map((x) => x.id), ["a", "b"]); });
t("LT-80 review never changes the date automatically (ladder off)", () => { const p = D.reviewVocab(V("a"), "Review", TODAY, ST); assert.equal("next_review_date" in p, false); assert.equal(D.reviewVocab(V("a"), "Mastered", TODAY, ST).next_review_date, null); const lad = D.reviewVocab(V("a"), "Review", TODAY, { ...ST, vocabLadder: true }); assert.equal(lad.next_review_date, "2026-10-28"); });
t("LT-79/82 duplicate warning + counters", () => { assert.equal(D.vocabDuplicate([V("a")], V("x", { word: "A" })), true); assert.equal(D.vocabDuplicate([V("a")], V("x", { word: "A", part_of_speech: "فعل" })), false); const c = D.vocabCounts([V("a"), V("b", { status: "Mastered" }), V("c", { next_review_date: "2026-10-01" })], TODAY); assert.equal(c.dueToday, 2); assert.equal(c.overdue, 1); assert.equal(c.Mastered, 1); });
t("LT-81 vocab requires a language area", () => { assert.ok(D.validateVocab({ word: "x", meaning: "y", area_id: "a" }, { is_language: false }).includes("area_not_language")); assert.equal(D.validateVocab({ word: "x", meaning: "y", area_id: "a" }, { is_language: true }).length, 0); });

console.log("Forecast");
t("ETA is an estimate only with enough data", () => { assert.equal(D.eta(100, 0, TODAY), null); assert.equal(D.eta(100, 10, TODAY), "2026-11-06"); assert.equal(D.pace(100, 10, "2026-12-01", TODAY).status, "On Pace"); assert.equal(D.pace(100, 10, "2026-10-30", TODAY).status, "Behind"); });

// property test (LT-108): for random trees progress == Σcompleted / Σtotal
t("LT-108 property: progress(X) = Σcompleted ÷ Σtotal for random trees", () => {
  let seed = 7; const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  for (let k = 0; k < 60; k++) {
    const nU = 1 + Math.floor(rnd() * 4); const units = [], lessons = [], sessions = []; let tot = 0, comp = 0;
    for (let u = 0; u < nU; u++) { units.push({ id: "u" + u, course_id: "c1", order: u + 1 }); const nL = Math.floor(rnd() * 5); for (let i = 0; i < nL; i++) { const d = Math.floor(rnd() * 90); const w = Math.floor(rnd() * 120); const id = "l" + u + "_" + i; const skip = rnd() < 0.15; lessons.push({ id, unit_id: "u" + u, total_duration_minutes: d, status: skip ? "Skipped" : "Active", watched_minutes: w }); if (!skip && d > 0) { tot += d; comp += Math.min(w, d); } } }
    const ix = D.buildIndex({ areas: [{ id: "a1" }], courses: [{ id: "c1", area_id: "a1" }], units, lessons, sessions });
    const m = D.courseMetrics(ix.C[0], ix); if (tot === 0) assert.equal(m.progress, null); else assert.ok(Math.abs(m.progress - comp / tot) < 1e-9);
  }
});

console.log("\n" + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
