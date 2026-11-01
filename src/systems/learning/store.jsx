import React, { createContext, useContext, useMemo, useState, useEffect, useCallback } from "react";
import { useRecordStore, uid, nowIso, arr } from "../../core/records.jsx";
import { todayStr, addDays } from "../../core/dates.js";
import * as D from "./domain.js";
import { ERR } from "./lookups.js";
import { useConfirm } from "../../core/kit.jsx";

export const Ctx = createContext(null);
export const useL = () => useContext(Ctx);

export const SYS = { area: "la_free", course: "lc_free", unit: "lu_free", lesson: "ll_free" }; // free-study system chain (excluded from aggregates)
const msg = (code) => ERR[code] || code;

export function LearningProvider({ access, authUser, ws, isDemo, demoStore, seed, shell, page, setPage, children }) {
  const toast = shell && shell.toast ? shell.toast : () => {};
  const store = useRecordStore({ wsId: ws.id, systemId: "learning", isDemo, demoStore, seed, onToast: toast });
  const { recs, ready, error, pending, online } = store; const R = store.api;
  const [confirm, confirmNode] = useConfirm();
  const [view, setView] = useState({ courseId: null, areaId: null });
  const [undo, setUndo] = useState(null);
  const me = authUser.id; const canEdit = access.level === "edit" || access.owner;

  const settings = useMemo(() => ({ ...D.DEFAULT_SETTINGS, ...((recs.settings || {}).main || {}) }), [recs.settings]);
  const [today, setToday] = useState(() => todayStr(settings.timezone));
  useEffect(() => { setToday(todayStr(settings.timezone)); const iv = setInterval(() => setToday(todayStr(settings.timezone)), 60000); return () => clearInterval(iv); }, [settings.timezone]);
  const live = (c) => arr(recs, c).filter((r) => !r.deleted_at);
  const data = useMemo(() => ({
    areas: live("areas"), courses: live("courses"), units: live("units"), lessons: live("lessons"), sessions: live("sessions"), tests: live("tests"), skills: live("skills"),
    courseSkills: live("course_skills"), lessonSkills: live("lesson_skills"), goals: live("goals"), vocab: live("vocab"), restDays: live("rest_days"), timers: arr(recs, "timers"),
  }), [recs]);
  const trash = useMemo(() => ["areas", "courses", "units", "lessons", "sessions", "tests", "skills", "goals", "vocab"].flatMap((c) => arr(recs, c).filter((r) => r.deleted_at).map((r) => ({ coll: c, rec: r }))), [recs]);
  const ix = useMemo(() => D.buildIndex({ areas: data.areas, courses: data.courses, units: data.units, lessons: data.lessons, sessions: data.sessions }), [data]);
  const restDates = useMemo(() => data.restDays.map((r) => r.date), [data.restDays]);
  const stats = useMemo(() => D.dashboardStats(ix, today, settings, restDates), [ix, today, settings, restDates]);
  const timer = data.timers.find((t) => t.owner === me && !t.stopped) || null;
  const realAreas = useMemo(() => ix.A.filter((a) => !a.is_system), [ix]);
  const realCourses = useMemo(() => ix.C.filter((c) => !c.is_system), [ix]);

  const stamp = (r) => ({ ...r, created_by: r.created_by || me });
  const put = (coll, rec) => R.put(coll, stamp(rec));

  // free-study chain (area → course → unit → lesson) is created on demand and never shown in aggregates
  const ensureFreeLesson = useCallback(async () => {
    const has = (c, id) => (recs[c] || {})[id];
    if (!has("areas", SYS.area)) await put("areas", { id: SYS.area, name: "دراسة حرة", is_system: true, status: "Active", category: "personal", counts_toward_streak: true });
    if (!has("courses", SYS.course)) await put("courses", { id: SYS.course, area_id: SYS.area, title: "دراسة حرة", is_system: true, type: "Course", status: "Active" });
    if (!has("units", SYS.unit)) await put("units", { id: SYS.unit, course_id: SYS.course, name: "عام", is_default: true, order: 1 });
    if (!has("lessons", SYS.lesson)) await put("lessons", { id: SYS.lesson, unit_id: SYS.unit, name: "دراسة حرة", is_system: true, total_duration_minutes: 0, watched_minutes: 0, status: "Active", lesson_number: 1 });
    return SYS.lesson;
  }, [recs]); // eslint-disable-line

  const defaultUnit = useCallback(async (course) => {
    const us = (ix.unitsByCourse.get(course.id) || []);
    if (us.length) return us.find((u) => u.is_default) || us[0];
    const u = { id: uid(), course_id: course.id, name: "الدروس", is_default: true, order: 1 };
    await put("units", u); return u;
  }, [ix]); // eslint-disable-line

  const A = useMemo(() => ({
    // ── areas / courses / units / lessons
    async saveArea(v) { const rec = { status: "Active", category: "personal", counts_toward_streak: true, ...v, id: v.id || uid() }; if (rec.is_language && !rec.current_language_level) rec.current_language_level = "A1"; return put("areas", rec); },
    async saveCourse(v) { const rec = { status: "Active", type: "Course", ...v, id: v.id || uid() }; const saved = await put("courses", rec); if (saved && !v.id) await defaultUnit(saved); return saved; },
    async createCourseFromTemplate(tpl, v) {
      const c = await A.saveCourse({ ...v, type: v.type || tpl.type }); if (!c) return null;
      const existing = ix.unitsByCourse.get(c.id) || [];
      if (tpl.units.length) { for (const e of existing) await R.softDelete("units", e.id, me); let i = 0; for (const u of tpl.units) await put("units", { id: uid(), course_id: c.id, order: ++i, ...u }); }
      return c;
    },
    async saveUnit(v) { const order = v.order || ((ix.unitsByCourse.get(v.course_id) || []).length + 1); return put("units", { ...v, id: v.id || uid(), order }); },
    async saveLesson(v) {
      const errs = D.validateLesson(v); if (errs.length) throw new Error(errs[0]);
      const n = v.lesson_number || ((ix.lessonsByUnit.get(v.unit_id) || []).length + 1);
      return put("lessons", { status: "Active", watched_minutes: 0, total_duration_minutes: 0, ...v, lesson_number: n, id: v.id || uid() });
    },
    async importLessons(unit, text, minutesPerLine) {
      const rows = D.importLines(text, minutesPerLine); const start = (ix.lessonsByUnit.get(unit.id) || []).length;
      for (let i = 0; i < rows.length; i++) await put("lessons", { id: uid(), unit_id: unit.id, status: "Active", watched_minutes: 0, ...rows[i], lesson_number: start + i + 1 });
      toast("✅ أُضيف " + rows.length + " درس"); return rows.length;
    },
    async archive(coll, rec) { await R.put(coll, { ...rec, archived_at: nowIso(), ...(coll === "areas" || coll === "courses" ? { status: "Archived" } : {}) }); toast("📦 تمت الأرشفة"); },
    async unarchive(coll, rec) { await R.put(coll, { ...rec, archived_at: null, ...(coll === "areas" || coll === "courses" ? { status: "Active" } : {}) }); },
    async remove(kind, coll, rec, label) {
      const chk = D.canDelete(kind, rec.id, ix); if (!chk.ok) { toast("⛔ " + msg(chk.code)); return false; }
      if (!(await confirm("حذف «" + (label || rec.name || rec.title) + "»؟ يُنقل إلى السلة ويمكن استرجاعه.", { danger: true, ok: "حذف" }))) return false;
      await R.softDelete(coll, rec.id, me); toast("🗑 نُقل إلى السلة"); return true;
    },
    async restoreRec(coll, id) { await R.restore(coll, id); },
    async pinLesson(course, lessonId) { await R.put("courses", { ...course, pinned_lesson_id: lessonId || null }); },
    async setLessonStatus(l, status) { await R.put("lessons", { ...l, status }); },
    async moveLesson(l, toUnit) { await R.put("lessons", D.moveLessonPatch(l, toUnit)); },
    async reorderLessons(list, id, to) { for (const o of D.reorder(list.map((x) => ({ ...x, order: x.lesson_number })), id, to)) { const l = list.find((x) => x.id === o.id); if (l && l.lesson_number !== o.order) await R.put("lessons", { ...l, lesson_number: o.order }); } },
    // ── sessions (idempotent) + Undo 10s
    async logSession(v) {
      const lessonId = v.lesson_id || (await ensureFreeLesson());
      const s = { id: uid(), kind: "study", source: "manual", date: today, client_generated_id: v.client_generated_id || uid(), ...v, lesson_id: lessonId, minutes: Math.round(+v.minutes), owner_id: me };
      const lessonsById = Object.fromEntries(ix.L.map((l) => [l.id, l]));
      const { errors, warnings } = D.validateSession(s, { today, sessions: ix.S, lessonsById: { ...lessonsById, [SYS.lesson]: { status: "Active" } }, nowMs: Date.now() });
      if (errors.length) { if (errors.includes("SESSION_IDEMPOTENT_DUPLICATE")) return null; throw new Error(msg(errors[0])); }
      if (warnings.length && !v.skipDupCheck && !(await confirm("جلسة مشابهة سُجّلت قبل دقائق. تسجيلها مرة أخرى؟", { ok: "سجّل" }))) return null;
      const saved = await put("sessions", s); if (!saved) return null;
      setUndo({ coll: "sessions", ids: [saved.id], label: "سُجّلت جلسة " + s.minutes + " د", until: Date.now() + 10000 });
      return saved;
    },
    async deleteSession(s) { await R.softDelete("sessions", s.id, me); setUndo({ coll: "sessions", restore: [s.id], label: "حُذفت الجلسة", until: Date.now() + 10000 }); },
    async editSession(s, patch) { if (!(Number.isInteger(+patch.minutes) && +patch.minutes >= 1 && +patch.minutes <= 1440)) throw new Error(msg("SESSION_MINUTES_RANGE")); await R.put("sessions", { ...s, ...patch, minutes: +patch.minutes }); },
    async doUndo() {
      if (!undo) return; const u = undo; setUndo(null);
      for (const id of u.ids || []) await R.softDelete(u.coll, id, me);
      for (const id of u.restore || []) await R.restore(u.coll, id);
      for (const p of u.patches || []) await R.put(p.coll, p.rec);
      toast("↩️ تم التراجع");
    },
    async completeLesson(l) {
      const sess = D.sessionsOf(ix.S, l.id); const plan = D.planComplete(l, sess);
      if (plan.kind === "none") { toast("الدرس مكتمل بالفعل"); return; }
      if (plan.kind === "manual") { await R.put("lessons", { ...l, manual_completed_at: nowIso() }); return; }
      if (!(await confirm("سيُضاف " + plan.minutes + " دقيقة كتعديل لإكمال الدرس. لا تُحتسب هذه الدقائق في يومك أو سلسلتك.", { ok: "أكمل الدرس" }))) return;
      const s = { id: uid(), lesson_id: l.id, date: today, minutes: plan.minutes, kind: "adjustment", source: "completion_adjustment", client_generated_id: uid(), owner_id: me };
      await put("sessions", s); setUndo({ coll: "sessions", ids: [s.id], label: "أُكمل الدرس", until: Date.now() + 10000 });
    },
    async uncompleteLesson(l) {
      const adj = D.adjustmentsToUndo(l.id, ix.S);
      if (l.manual_completed_at) { await R.put("lessons", { ...l, manual_completed_at: null }); return; }
      if (!adj.length) { toast("لا يوجد تعديل إكمال للتراجع عنه — احذف الجلسات يدويًا"); return; }
      for (const s of adj) await R.softDelete("sessions", s.id, me);
      toast("↩️ أُلغي الإكمال");
    },
    async convertWatched(l) {
      const plan = D.planConvertWatched(l, D.sessionsOf(ix.S, l.id)); if (!plan.ok) { toast(plan.reason); return; }
      if (!(await confirm("المشاهدة اليدوية " + plan.before.watched + " د، والجلسات " + plan.before.sessions + " د.\nسيُضاف تعديل " + plan.minutes + " د ثم يُصفَّر حقل المشاهدة. التقدم الحالي (" + plan.before.observed + " د) لن يتغير.", { ok: "حوّل" }))) return;
      if (plan.minutes > 0) await put("sessions", { id: uid(), lesson_id: l.id, date: today, minutes: plan.minutes, kind: "adjustment", source: "convert_watched", client_generated_id: uid(), owner_id: me });
      await R.put("lessons", { ...l, watched_minutes: 0 });
    },
    async quickLog(l, position) {
      const plan = D.quickLogPlan(l, D.sessionsOf(ix.S, l.id), position); if (!plan.ok) throw new Error(plan.reason);
      return A.logSession({ lesson_id: l.id, minutes: plan.minutes, source: "quick_log", skipDupCheck: true });
    },
    // ── timer
    async startTimer(lessonId) {
      if (timer) { toast("⏱ يوجد مؤقت يعمل بالفعل"); return; }
      await R.put("timers", { id: uid(), owner: me, lesson_id: lessonId || null, started_at: nowIso(), paused_at: null, paused_total_ms: 0, stopped: false });
    },
    async pauseTimer() { if (timer) await R.put("timers", D.timerPause(timer, Date.now())); },
    async resumeTimer() { if (timer) await R.put("timers", D.timerResume(timer, Date.now())); },
    async stopTimer(lessonId, opts) {
      if (!timer) return null; const t = timer.paused_at ? timer : D.timerPause(timer, Date.now()); const mins = Math.max(D.timerToMinutes(t, Date.now()), 0);
      await R.put("timers", { ...t, stopped: true, ended_at: nowIso() });
      if (opts && opts.discard) return null;
      if (mins < 1) { toast("المدة أقل من دقيقة — لم تُسجَّل جلسة"); return null; }
      return A.logSession({ lesson_id: lessonId || timer.lesson_id || null, minutes: mins, source: "timer", started_at: timer.started_at, ended_at: nowIso(), client_generated_id: "timer_" + timer.id, skipDupCheck: true });
    },
    // ── skills / tests / goals / vocab / rest / settings
    async saveSkill(v) { if (!D.validateRating(v.self_rating)) throw new Error("التقييم بين 0 و100"); return put("skills", { ...v, self_rating: v.self_rating === "" ? null : v.self_rating, id: v.id || uid() }); },
    async linkSkill(kind, skillId, targetId) { const coll = kind === "course" ? "course_skills" : "lesson_skills"; const key = kind === "course" ? "course_id" : "lesson_id"; if (arr(recs, coll).some((x) => !x.deleted_at && x.skill_id === skillId && x[key] === targetId)) return; await put(coll, { id: uid(), skill_id: skillId, [key]: targetId }); },
    async unlinkSkill(coll, id) { await R.softDelete(coll, id, me); },
    async saveTest(v) {
      const area = ix.areaById[v.area_id]; const errs = D.validateTest(v, area, today); if (errs.length) throw new Error(msg(errs[0]));
      return put("tests", { ...v, score_percent: +v.score_percent, id: v.id || uid() });
    },
    async saveGoal(v) { return put("goals", { status: "Active", ...v, id: v.id || uid() }); },
    async saveVocab(v) {
      const area = ix.areaById[v.area_id]; const errs = D.validateVocab(v, area); if (errs.length) throw new Error(errs.includes("word") ? "الكلمة مطلوبة" : errs.includes("meaning") ? "المعنى مطلوب" : "المفردات للمجالات اللغوية فقط");
      if (D.vocabDuplicate(data.vocab, v) && !(await confirm("كلمة مشابهة موجودة في نفس المجال. إضافة على أي حال؟", { ok: "أضف" }))) return null;
      return put("vocab", { status: "New", ...v, id: v.id || uid(), next_review_date: v.next_review_date === undefined ? today : v.next_review_date });
    },
    async reviewVocab(v, status) { await R.put("vocab", { ...v, ...D.reviewVocab(v, status, today, settings) }); },
    async addRestDay(date) { const chk = D.canAddRestDay(restDates, date, settings); if (!chk.ok) { toast("⛔ " + chk.reason); return false; } if (restDates.includes(date)) return true; await put("rest_days", { id: uid(), date }); return true; },
    async removeRestDay(id) { await R.softDelete("rest_days", id, me); },
    async saveSettings(v) { const merged = { ...settings, ...v }; const errs = D.validateSettings(merged); if (errs.length) throw new Error(msg(errs.find((e) => ERR[e]) || errs[0])); await R.put("settings", { id: "main", ...merged }); toast("✅ حُفظت الإعدادات"); },
    exportJSON() { return JSON.stringify({ exported_at: nowIso(), ...Object.fromEntries(["areas", "courses", "units", "lessons", "sessions", "tests", "skills", "goals", "vocab"].map((c) => [c, arr(recs, c)])) }, null, 2); },
    exportSessionsCSV() {
      const rows = [["date", "area", "course", "lesson", "minutes", "kind", "source"]];
      [...ix.S].sort((a, b) => (a.date < b.date ? -1 : 1)).forEach((s) => { const l = ix.L.find((x) => x.id === s.lesson_id); const c = l ? ix.lessonCourse(l) : null; const a = l ? ix.lessonArea(l) : null; rows.push([s.date, a ? a.name : "", c ? c.title : "", l ? l.name : "", s.minutes, s.kind, s.source || ""]); });
      return "﻿" + rows.map((r) => r.map((x) => '"' + String(x).replace(/"/g, '""') + '"').join(",")).join("\n");
    },
  }), [ix, recs, today, settings, data, timer, undo, restDates, confirm, me]); // eslint-disable-line

  useEffect(() => { if (!undo) return; const iv = setInterval(() => { if (Date.now() > undo.until) setUndo(null); }, 1000); return () => clearInterval(iv); }, [undo]);

  const value = { store, ready, error, pending, online, isDemo, access, canEdit, me, settings, today, data, ix, stats, trash, restDates, timer, realAreas, realCourses, A, page, setPage, view, setView, undo, confirm, toast, shell, api: R, recs };
  return <Ctx.Provider value={value}>{children}{confirmNode}</Ctx.Provider>;
}
