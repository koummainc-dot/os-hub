import React, { useState } from "react";
import { S } from "../../core/ui.jsx";
import { Btn, Chip, C, Empty, Head, Progress, FormModal, Modal, Field, Seg } from "../../core/kit.jsx";
import { fmtMinutes, fmtShort } from "../../core/dates.js";
import * as D from "./domain.js";
import { useL } from "./store.jsx";
import { LogSession, LessonRow, STATE_COLOR } from "./parts.jsx";
import * as K from "./lookups.js";

export function Areas() {
  const { ix, stats, today, A, canEdit, setPage, setView } = useL();
  const [edit, setEdit] = useState(null); const [showArch, setShowArch] = useState(false);
  const list = ix.A.filter((a) => !a.is_system && (showArch ? true : !a.archived_at));
  const fields = [
    { key: "name", label: "اسم المجال", type: "text", required: true },
    { key: "category", label: "التصنيف", type: "select", allowEmpty: false, options: K.opts(K.AREA_CATEGORY) },
    { key: "is_language", label: "نوع المجال", type: "bool", checkLabel: "مجال لغة (يفعّل CEFR والمفردات واختبارات المستوى)" },
    { key: "current_language_level", label: "المستوى الحالي", type: "select", allowEmpty: false, show: (v) => v.is_language, options: D.CEFR.map((l) => ({ v: l, l })) },
    { key: "target_language_level", label: "المستوى المستهدف", type: "select", show: (v) => v.is_language, options: D.CEFR.map((l) => ({ v: l, l })) },
    { key: "weekly_goal_minutes", label: "هدف أسبوعي (دقائق) — اختياري", type: "number", min: 0 },
    { key: "counts_toward_streak", label: "السلسلة", type: "bool", checkLabel: "تُحتسب جلسات هذا المجال في السلسلة" },
  ];
  return (
    <div>
      <Head title="المجالات" sub="كل مجال يجمع دوراته ودروسه" right={<>{canEdit && <Btn kind="primary" onClick={() => setEdit({ category: "professional", counts_toward_streak: true })}>＋ مجال جديد</Btn>}<Btn small onClick={() => setShowArch(!showArch)}>{showArch ? "إخفاء المؤرشف" : "عرض المؤرشف"}</Btn></>} />
      {list.length === 0 ? <Empty icon="🧭" title="لا توجد مجالات" sub="المجال مثل «اللغة الإنجليزية» أو «البرمجة». أنشئ أول مجال لتبدأ." action={canEdit && <Btn kind="primary" onClick={() => setEdit({ category: "professional", counts_toward_streak: true })}>إنشاء مجال</Btn>} /> :
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 12 }}>
          {list.map((a) => { const m = D.areaMetrics(a, ix, today, stats.avgDaily28);
            return <div key={a.id} style={{ ...S.card, opacity: a.archived_at ? 0.6 : 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}><b style={{ fontSize: 14 }}>{a.icon || "🧭"} {a.name}</b>{a.is_language && <Chip color={C.info}>{a.current_language_level || "A1"}{a.target_language_level ? " → " + a.target_language_level : ""}</Chip>}</div>
              <Progress value={m.progress} />
              <div style={{ fontSize: 11, color: C.muted, margin: "6px 0 10px" }}>{m.coursesCount} دورة • {m.completedLessons}/{m.lessonsCount} درس • {fmtMinutes(m.minutesLast7)} آخر 7 أيام{m.weeklyGoalPct != null && " • " + Math.round(m.weeklyGoalPct * 100) + "% من هدف الأسبوع"}</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <Btn small onClick={() => { setView({ areaId: a.id, courseId: null }); setPage("courses"); }}>الدورات</Btn>
                {canEdit && <><Btn small onClick={() => setEdit(a)}>تعديل</Btn>
                  {a.archived_at ? <Btn small onClick={() => A.unarchive("areas", a)}>استعادة</Btn> : <Btn small onClick={() => A.archive("areas", a)}>أرشفة</Btn>}
                  <Btn small danger onClick={() => A.remove("area", "areas", a)}>حذف</Btn></>}
              </div></div>; })}
        </div>}
      {edit && <FormModal title={edit.id ? "تعديل المجال" : "مجال جديد"} fields={fields} initial={edit} onClose={() => setEdit(null)} onSubmit={async (v) => { await A.saveArea(v); setEdit(null); }} />}
    </div>
  );
}

export function Courses() {
  const { ix, view, setView, A, canEdit, realAreas } = useL();
  if (view.courseId && ix.courseById[view.courseId]) return <CourseDetail course={ix.courseById[view.courseId]} />;
  return <CourseList />;
}

function CourseList() {
  const { ix, view, setView, A, canEdit, realAreas, setPage } = useL();
  const [edit, setEdit] = useState(null); const [tplStep, setTplStep] = useState(false); const [arch, setArch] = useState(false);
  const [area, setArea] = useState(view.areaId || "");
  const list = ix.C.filter((c) => !c.is_system && (arch || !c.archived_at) && (!area || c.area_id === area));
  const fields = (isNew) => [
    { key: "title", label: "اسم الدورة", type: "text", required: true },
    { key: "area_id", label: "المجال", type: "select", required: true, allowEmpty: true, emptyLabel: "اختر المجال", options: realAreas.filter((a) => !a.archived_at).map((a) => ({ v: a.id, l: a.name })) },
    { key: "type", label: "النوع", type: "select", allowEmpty: false, options: K.opts(K.COURSE_TYPE) },
    { key: "platform", label: "المنصة (اختياري)", type: "text" },
    { key: "url", label: "الرابط (اختياري)", type: "url" },
    { key: "target_end_date", label: "تاريخ الانتهاء المستهدف (اختياري)", type: "date" },
  ];
  return (
    <div>
      <Head title="الدورات" right={<>{canEdit && <Btn kind="primary" onClick={() => setTplStep(true)}>＋ دورة جديدة</Btn>}<Btn small onClick={() => setArch(!arch)}>{arch ? "إخفاء المؤرشف" : "المؤرشف"}</Btn></>} />
      <div style={{ marginBottom: 12 }}><select style={{ ...S.sel, maxWidth: 260 }} value={area} onChange={(e) => setArea(e.target.value)}><option value="">كل المجالات</option>{realAreas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
      {list.length === 0 ? <Empty icon="📚" title="لا توجد دورات" sub={realAreas.length ? "أنشئ دورة من قالب جاهز أو فارغة." : "أنشئ مجالًا أولًا ثم أضف دورتك."} action={canEdit && (realAreas.length ? <Btn kind="primary" onClick={() => setTplStep(true)}>إنشاء دورة</Btn> : <Btn kind="primary" onClick={() => setPage("areas")}>إنشاء مجال</Btn>)} /> :
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(290px,1fr))", gap: 12 }}>
          {list.map((c) => { const m = D.courseMetrics(c, ix); const a = ix.areaById[c.area_id];
            return <div key={c.id} onClick={() => setView({ ...view, courseId: c.id })} style={{ ...S.card, cursor: "pointer", opacity: c.archived_at ? 0.6 : 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 6 }}><b style={{ fontSize: 14 }}>{c.title}</b><Chip color={STATE_COLOR[m.state]}>{K.COURSE_STATE[m.state]}</Chip></div>
              <div style={{ fontSize: 11, color: C.muted, margin: "3px 0 8px" }}>{a ? a.name : "—"} • {K.COURSE_TYPE[c.type] || c.type}</div>
              <Progress value={m.progress} />
              <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>{m.completedLessons}/{m.lessonsCount} درس{m.currentLesson ? " • التالي: " + m.currentLesson.name : ""}</div>
            </div>; })}
        </div>}
      {tplStep && <Modal title="اختر قالبًا" onClose={() => setTplStep(false)}>
        <div style={{ display: "grid", gap: 8 }}>{K.COURSE_TEMPLATES.map((t) => <div key={t.id} onClick={() => { setTplStep(false); setEdit({ tpl: t, type: t.type, area_id: area || null }); }} style={{ ...S.card, cursor: "pointer", padding: "10px 14px" }}>{t.icon} <b>{t.name}</b>{t.units.length > 0 && <span style={{ fontSize: 11, color: C.muted }}> — {t.units.length} وحدات جاهزة</span>}</div>)}</div>
      </Modal>}
      {edit && <FormModal title={"دورة جديدة" + (edit.tpl ? " — " + edit.tpl.name : "")} fields={fields(true)} initial={edit} onClose={() => setEdit(null)} onSubmit={async (v) => { const { tpl, ...rest } = v; const c = await A.createCourseFromTemplate(tpl || K.COURSE_TEMPLATES[4], rest); setEdit(null); if (c) setView({ ...view, courseId: c.id }); }} />}
    </div>
  );
}

function CourseDetail({ course }) {
  const { ix, A, canEdit, setView, view, stats, today, settings } = useL();
  const m = D.courseMetrics(course, ix); const units = [...(ix.unitsByCourse.get(course.id) || [])].sort((a, b) => (a.order || 0) - (b.order || 0));
  const [log, setLog] = useState(null); const [lessonEdit, setLessonEdit] = useState(null); const [unitEdit, setUnitEdit] = useState(null); const [courseEdit, setCourseEdit] = useState(false); const [imp, setImp] = useState(null);
  const p = D.pace(m.remaining, stats.avgDaily28, course.target_end_date, today);
  return (
    <div>
      <Head title={course.title} sub={(ix.areaById[course.area_id] || {}).name} right={<>
        <Btn small onClick={() => setView({ ...view, courseId: null })}>← الدورات</Btn>
        {canEdit && <><Btn small onClick={() => setCourseEdit(true)}>تعديل</Btn>
          {course.archived_at ? <Btn small onClick={() => A.unarchive("courses", course)}>استعادة</Btn> : <Btn small onClick={async () => { await A.archive("courses", course); setView({ ...view, courseId: null }); }}>أرشفة</Btn>}
          <Btn small danger onClick={async () => { if (await A.remove("course", "courses", course, course.title)) setView({ ...view, courseId: null }); }}>حذف</Btn></>}</>} />
      <div style={{ ...S.card, marginBottom: 12 }}>
        <Progress value={m.progress} height={9} />
        <div style={{ fontSize: 11.5, color: C.muted, marginTop: 8 }}>{m.completedLessons}/{m.lessonsCount} درس • المتبقي {fmtMinutes(m.remaining)}{m.skipped ? " • " + m.skipped + " متخطّى" : ""}{p.eta && " • الانتهاء المتوقع " + fmtShort(p.eta)}</div>
        {m.currentLesson && <div style={{ marginTop: 8, fontSize: 12.5 }}>▶ الدرس الحالي: <b>{m.currentLesson.name}</b> {canEdit && <Btn small kind="primary" style={{ marginInlineStart: 8 }} onClick={() => setLog(m.currentLesson.id)}>سجّل جلسة</Btn>}</div>}
      </div>
      {units.length === 0 && <Empty icon="🗂️" title="لا توجد وحدات" sub="أضف وحدة ثم دروسها." action={canEdit && <Btn kind="primary" onClick={() => setUnitEdit({ course_id: course.id })}>＋ وحدة</Btn>} />}
      {units.map((u) => { const um = D.unitMetrics(u, ix); const ls = [...(ix.lessonsByUnit.get(u.id) || [])].filter((l) => !l.is_system).sort((a, b) => (a.lesson_number || 0) - (b.lesson_number || 0));
        return <div key={u.id} style={{ ...S.card, marginBottom: 10, padding: 0 }}>
          <div style={{ padding: "10px 12px", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", borderBottom: "1px solid " + C.line }}>
            <b style={{ fontSize: 13 }}>{u.is_default ? "الدروس" : u.name}</b>{u.language_level && <Chip color={C.info}>{u.language_level}</Chip>}
            <div style={{ flex: 1, minWidth: 100 }}><Progress value={um.progress} /></div>
            {canEdit && <><Btn small onClick={() => setLessonEdit({ unit_id: u.id })}>＋ درس</Btn><Btn small onClick={() => setImp({ unit: u, text: "", mins: 10 })}>استيراد قائمة</Btn>{!u.is_default && <><Btn small onClick={() => setUnitEdit(u)}>✏️</Btn><Btn small danger onClick={() => A.remove("unit", "units", u, u.name)}>🗑</Btn></>}</>}
          </div>
          {ls.length === 0 ? <div style={{ padding: 14, fontSize: 12, color: C.muted }}>لا توجد دروس في هذه الوحدة.</div> : ls.map((l) => <LessonRow key={l.id} lesson={l} onLog={(x) => setLog(x.id)} onEdit={setLessonEdit} />)}
        </div>; })}
      {canEdit && units.length > 0 && <Btn small onClick={() => setUnitEdit({ course_id: course.id })}>＋ وحدة جديدة</Btn>}
      {log && <LogSession lessonId={log} onClose={() => setLog(null)} />}
      {lessonEdit && <FormModal title={lessonEdit.id ? "تعديل الدرس" : "درس جديد"} initial={lessonEdit} onClose={() => setLessonEdit(null)}
        fields={[{ key: "name", label: "اسم الدرس", type: "text", required: true }, { key: "total_duration_minutes", label: "المدة (دقائق) — 0 = غير قابل للقياس", type: "number", min: 0 },
          { key: "unit_id", label: "الوحدة", type: "select", allowEmpty: false, options: units.map((u) => ({ v: u.id, l: u.is_default ? "الدروس" : u.name })) },
          { key: "url", label: "رابط (اختياري)", type: "url" }, { key: "study_date", label: "موعد مخطّط (اختياري)", type: "date" },
          { key: "watched_minutes", label: "مشاهدة يدوية (اختياري)", type: "number", min: 0, hint: "الأفضل تسجيل جلسات بدل هذا الحقل" }, { key: "notes", label: "ملاحظات", type: "textarea" }]}
        onSubmit={async (v) => { await A.saveLesson(v); setLessonEdit(null); }} />}
      {unitEdit && <FormModal title={unitEdit.id ? "تعديل الوحدة" : "وحدة جديدة"} initial={unitEdit} onClose={() => setUnitEdit(null)}
        fields={[{ key: "name", label: "اسم الوحدة", type: "text", required: true }, { key: "language_level", label: "مستوى CEFR (اختياري)", type: "select", options: D.CEFR.map((l) => ({ v: l, l })) }]}
        onSubmit={async (v) => { await A.saveUnit(v); setUnitEdit(null); }} />}
      {imp && <FormModal title="استيراد دروس من قائمة" initial={imp} onClose={() => setImp(null)}
        fields={[{ key: "text", label: "سطر لكل درس (الاسم، ثم مدة بالدقائق أو رابط اختياريًا)", type: "textarea", rows: 8, required: true }, { key: "mins", label: "مدة افتراضية للسطر (دقائق)", type: "number", min: 0 }]}
        submitLabel="استيراد" onSubmit={async (v) => { await A.importLessons(imp.unit, v.text, v.mins); setImp(null); }} />}
      {courseEdit && <FormModal title="تعديل الدورة" initial={course} onClose={() => setCourseEdit(false)}
        fields={[{ key: "title", label: "الاسم", type: "text", required: true }, { key: "type", label: "النوع", type: "select", allowEmpty: false, options: K.opts(K.COURSE_TYPE) }, { key: "status", label: "الحالة", type: "select", allowEmpty: false, options: K.opts(K.COURSE_STATUS) }, { key: "platform", label: "المنصة", type: "text" }, { key: "url", label: "الرابط", type: "url" }, { key: "target_end_date", label: "الانتهاء المستهدف", type: "date" }]}
        onSubmit={async (v) => { await A.saveCourse(v); setCourseEdit(false); }} />}
    </div>
  );
}
