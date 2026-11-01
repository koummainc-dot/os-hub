import React, { useEffect, useState } from "react";
import { S } from "../../core/ui.jsx";
import { Btn, Chip, C, FormModal, Modal, Field } from "../../core/kit.jsx";
import { fmtMinutes, fmtShort } from "../../core/dates.js";
import * as D from "./domain.js";
import { useL, SYS } from "./store.jsx";
import { SESSION_SHORTCUTS, LESSON_STATE } from "./lookups.js";

export const STATE_COLOR = { "Not Started": "#94A3B8", "In Progress": "#3B82F6", Completed: "#10B981", Skipped: "#F59E0B" };
export const lessonLabel = (ix, l) => { const c = ix.lessonCourse(l); return (c ? c.title + " › " : "") + l.name; };
export const lessonOptions = (ix) => ix.L.filter((l) => !l.is_system && l.status !== "Skipped" && !(ix.lm[l.id] && ix.lm[l.id].state === "Completed"))
  .map((l) => ({ v: l.id, l: lessonLabel(ix, l) }));

// Log a session — progressive: minutes + lesson (or free study); everything else optional.
export function LogSession({ lessonId, onClose }) {
  const { A, ix, today } = useL();
  const [free, setFree] = useState(!lessonId && ix.L.filter((l) => !l.is_system).length === 0);
  const fields = [
    ...(free ? [] : [{ key: "lesson_id", label: "الدرس", type: "select", required: true, allowEmpty: true, emptyLabel: "اختر الدرس", options: lessonOptions(ix) }]),
    { key: "minutes", label: "المدة بالدقائق", type: "number", min: 1, max: 1440, required: true },
    { key: "date", label: "التاريخ", type: "date" },
    { key: "note", label: "ملاحظة (اختياري)", type: "text" },
  ];
  return (
    <FormModal title="تسجيل جلسة دراسة" fields={fields} initial={{ lesson_id: lessonId || null, minutes: 30, date: today }} submitLabel="سجّل"
      footerExtra={<Btn small onClick={() => setFree(!free)}>{free ? "اختيار درس" : "دراسة حرة (بدون درس)"}</Btn>}
      onSubmit={async (v) => { const r = await A.logSession({ ...v, lesson_id: free ? null : v.lesson_id }); if (r !== null) onClose(); else if (r === null) return false; }}
      onClose={onClose}>
      {(vals, set) => <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>{SESSION_SHORTCUTS.map((m) => <Btn key={m} small onClick={() => set("minutes", m)}>{m} د</Btn>)}</div>}
    </FormModal>
  );
}

export function QuickLog({ lesson, onClose }) {
  const { A, ix } = useL(); const m = ix.lm[lesson.id];
  return <FormModal title={"سجّل تقدّمي — " + lesson.name} onClose={onClose} submitLabel="سجّل" initial={{ pos: null }}
    fields={[{ key: "pos", label: "وصلت إلى الدقيقة", type: "number", min: 1, required: true, hint: "وصلت سابقًا إلى دقيقة " + m.observed + (m.D ? " من " + m.D : "") }]}
    onSubmit={async (v) => { await A.quickLog(lesson, v.pos); onClose(); }} />;
}

export function UndoBar() {
  const { undo, A } = useL(); const [, tick] = useState(0);
  useEffect(() => { if (!undo) return; const iv = setInterval(() => tick((x) => x + 1), 1000); return () => clearInterval(iv); }, [undo]);
  if (!undo) return null;
  return <div role="status" style={{ position: "fixed", bottom: 18, insetInlineStart: 18, zIndex: 7000, background: "#16181D", color: "#fff", padding: "10px 14px", borderRadius: 10, fontSize: 12.5, display: "flex", gap: 12, alignItems: "center" }}>{undo.label}<button onClick={A.doUndo} style={{ background: "none", border: "none", color: "#FBBF24", cursor: "pointer", fontFamily: "inherit", fontWeight: 700 }}>تراجع</button></div>;
}

export function TimerBar() {
  const { timer, A, ix } = useL(); const [now, setNow] = useState(Date.now()); const [stop, setStop] = useState(false);
  useEffect(() => { if (!timer) return; const iv = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(iv); }, [timer]);
  if (!timer) return null;
  const ms = D.timerElapsedMs(timer, now); const mm = Math.floor(ms / 60000), ss = Math.floor((ms % 60000) / 1000);
  const l = timer.lesson_id ? ix.L.find((x) => x.id === timer.lesson_id) : null;
  return (
    <div style={{ position: "fixed", bottom: 18, insetInlineEnd: 18, zIndex: 7000, background: "#fff", border: "1px solid " + C.line, boxShadow: "0 8px 30px rgba(0,0,0,0.18)", borderRadius: 12, padding: "10px 14px", display: "flex", gap: 10, alignItems: "center", fontSize: 12.5 }}>
      <span style={{ fontWeight: 800, fontSize: 18, direction: "ltr", fontVariantNumeric: "tabular-nums" }}>{String(mm).padStart(2, "0")}:{String(ss).padStart(2, "0")}</span>
      <span style={{ color: C.muted }}>{l ? l.name : "دراسة حرة"}{timer.paused_at ? " • متوقف مؤقتًا" : ""}</span>
      {timer.paused_at ? <Btn small onClick={A.resumeTimer}>▶ استئناف</Btn> : <Btn small onClick={A.pauseTimer}>⏸ إيقاف مؤقت</Btn>}
      <Btn small kind="primary" onClick={() => setStop(true)}>■ إنهاء</Btn>
      {stop && <StopTimer onClose={() => setStop(false)} />}
    </div>
  );
}
function StopTimer({ onClose }) {
  const { timer, A, ix } = useL(); const [lesson, setLesson] = useState(timer.lesson_id || "");
  const mins = D.timerToMinutes(timer.paused_at ? timer : D.timerPause(timer, Date.now()), Date.now());
  return (
    <Modal title="إنهاء الجلسة" onClose={onClose} footer={<><Btn kind="primary" onClick={async () => { await A.stopTimer(lesson || null); onClose(); }}>سجّل {mins} د</Btn><Btn danger onClick={async () => { await A.stopTimer(null, { discard: true }); onClose(); }}>تجاهل</Btn><Btn onClick={onClose}>متابعة</Btn></>}>
      <Field label="الدرس (اختياري — بدونه تُسجَّل كدراسة حرة)"><select style={S.sel} value={lesson} onChange={(e) => setLesson(e.target.value)}><option value="">دراسة حرة</option>{lessonOptions(ix).map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}</select></Field>
    </Modal>
  );
}

export function LessonRow({ lesson, onLog, onEdit }) {
  const { ix, A, canEdit } = useL(); const m = ix.lm[lesson.id];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderBottom: "1px solid " + C.line, flexWrap: "wrap" }}>
      <span style={{ width: 22, color: C.muted, fontSize: 11 }}>{lesson.lesson_number}</span>
      <div style={{ flex: 1, minWidth: 160 }}>
        <div style={{ fontSize: 13, fontWeight: 600, textDecoration: m.state === "Skipped" ? "line-through" : "none" }}>{lesson.name}{lesson.url && <a href={lesson.url} target="_blank" rel="noreferrer" style={{ marginInlineStart: 6, fontSize: 11 }}>↗</a>}</div>
        <div style={{ fontSize: 10.5, color: C.muted }}>{m.measurable ? m.completed + " / " + m.D + " د" : m.D === 0 ? "بدون مدة — غير قابل للقياس" : "متخطّى"}{lesson.study_date ? " • مخطّط " + fmtShort(lesson.study_date) : ""}</div>
        {m.warnWatchedAhead && <div style={{ fontSize: 10.5, color: C.warn }}>⚠ المشاهدة اليدوية أعلى من الجلسات — حوّلها إلى جلسة من القائمة</div>}
        {m.warnOver && <div style={{ fontSize: 10.5, color: C.warn }}>تجاوزت المدة بـ {m.minutesOver} د (التقدم محصور عند 100%)</div>}
      </div>
      <Chip color={STATE_COLOR[m.state]}>{LESSON_STATE[m.state]}</Chip>
      {canEdit && m.state !== "Skipped" && <Btn small onClick={() => onLog(lesson)}>＋ جلسة</Btn>}
      {canEdit && <Menu lesson={lesson} m={m} onEdit={onEdit} />}
    </div>
  );
}
function Menu({ lesson, m, onEdit }) {
  const { A, ix, view } = useL(); const [open, setOpen] = useState(false); const [ql, setQl] = useState(false);
  const course = ix.lessonCourse(lesson);
  const items = [
    ["✏️ تعديل", () => onEdit(lesson)],
    m.state !== "Completed" && m.state !== "Skipped" && ["✅ إكمال الدرس", () => A.completeLesson(lesson)],
    m.state === "Completed" && ["↩️ إلغاء الإكمال", () => A.uncompleteLesson(lesson)],
    m.D > 0 && m.state !== "Completed" && m.state !== "Skipped" && ["📍 سجّل تقدّمي", () => setQl(true)],
    m.W > 0 && ["🔁 حوّل المشاهدة إلى جلسة", () => A.convertWatched(lesson)],
    course && ["📌 تثبيت كدرس حالي", () => A.pinLesson(course, course.pinned_lesson_id === lesson.id ? null : lesson.id)],
    m.state !== "Skipped" ? ["⏭ تخطّي", () => A.setLessonStatus(lesson, "Skipped")] : ["↺ إعادة التفعيل", () => A.setLessonStatus(lesson, "Active")],
    ["🗑 حذف", () => A.remove("lesson", "lessons", lesson)],
  ].filter(Boolean);
  return (
    <span style={{ position: "relative" }}>
      <Btn small onClick={() => setOpen(!open)} title="المزيد">⋯</Btn>
      {open && <div onMouseLeave={() => setOpen(false)} style={{ position: "absolute", insetInlineEnd: 0, top: "100%", zIndex: 50, background: "#fff", border: "1px solid " + C.line, borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,.15)", minWidth: 190 }}>
        {items.map(([l, f]) => <div key={l} onClick={() => { setOpen(false); f(); }} style={{ padding: "8px 12px", fontSize: 12.5, cursor: "pointer" }}>{l}</div>)}
      </div>}
      {ql && <QuickLog lesson={lesson} onClose={() => setQl(false)} />}
    </span>
  );
}
