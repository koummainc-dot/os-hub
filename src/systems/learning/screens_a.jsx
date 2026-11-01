import React, { useState } from "react";
import { S } from "../../core/ui.jsx";
import { Btn, Chip, C, Empty, Head, Progress, Stat, FormModal, Tabs } from "../../core/kit.jsx";
import { fmtMinutes, fmtShort, fmt, addDays, dayName } from "../../core/dates.js";
import * as D from "./domain.js";
import { useL } from "./store.jsx";
import { LogSession, lessonLabel, STATE_COLOR } from "./parts.jsx";
import { DAY_STATE } from "./lookups.js";

export function Dashboard() {
  const { ix, stats, settings, today, A, canEdit, setPage, timer, data } = useL();
  const [log, setLog] = useState(null);
  const sugg = D.nextLessonSuggestions(ix, settings, today, 3);
  const todays = D.todayLessons(ix, today); const overdue = D.overduePlanned(ix, today);
  const due = D.vocabCounts(data.vocab, today).dueToday; const ds = DAY_STATE[stats.dailyState];
  const empty = ix.C.filter((c) => !c.is_system).length === 0;
  return (
    <div>
      <Head title="التعلّم" sub={dayName(today) + " • " + fmt(today)} right={canEdit && <><Btn kind="primary" onClick={() => setLog({})}>＋ سجّل جلسة</Btn>{!timer && <Btn onClick={() => A.startTimer(null)}>⏱ ابدأ مؤقتًا</Btn>}</>} />
      {empty && <Empty icon="🎓" title="ابدأ برحلتك التعليمية" sub="أنشئ مجالًا ثم دورة وأضف دروسك، أو سجّل جلسة دراسة حرة مباشرة." action={canEdit && <Btn kind="primary" onClick={() => setPage("areas")}>إنشاء مجال</Btn>} />}
      <div style={{ ...S.card, borderTop: "3px solid " + ds.c, marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>هدف اليوم: {stats.minutesToday} / {settings.dailyGoal} د</div><Chip color={ds.c}>{ds.l}</Chip>
        </div>
        <Progress value={stats.dailyPct} color={ds.c} />
        {stats.minutesToMinimum > 0 && <div style={{ fontSize: 11.5, color: C.muted, marginTop: 6 }}>باقي {stats.minutesToMinimum} د للحد الأدنى ({settings.dailyMinimum} د) للحفاظ على السلسلة</div>}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10, marginBottom: 14 }}>
        <Stat label="🔥 السلسلة" value={stats.streak + " يوم"} sub={"الأطول " + stats.longest} color="#F97316" />
        <Stat label="آخر 7 أيام" value={fmtMinutes(stats.last7)} sub={Math.round(stats.weeklyPct * 100) + "% من هدف الأسبوع"} />
        <Stat label="متوسط 28 يوم" value={fmtMinutes(Math.round(stats.avgDaily28))} sub="يوميًا" color="#3B82F6" />
        <Stat label="مراجعة المفردات" value={due} sub={due ? "كلمة مستحقة" : "لا شيء اليوم"} color="#8B5CF6" onClick={() => setPage("vocab")} />
      </div>
      {sugg.length > 0 && <div style={{ ...S.card, marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>📚 تابع التعلّم</div>
        {sugg.map((s) => <div key={s.course.id} style={{ display: "flex", gap: 10, alignItems: "center", padding: "7px 0", borderTop: "1px solid " + C.line, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 180 }}><div style={{ fontSize: 13, fontWeight: 600 }}>{s.lesson.name}</div><div style={{ fontSize: 11, color: C.muted }}>{s.course.title} • {s.reason}</div></div>
          <div style={{ width: 120 }}><Progress value={s.metrics.progress} /></div>
          {canEdit && <Btn small kind="primary" onClick={() => setLog({ lessonId: s.lesson.id })}>سجّل</Btn>}
        </div>)}
      </div>}
      {(todays.length > 0 || overdue.length > 0) && <div style={{ ...S.card, marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>📅 دروس اليوم</div>
        {todays.map((l) => <Row key={l.id} l={l} ix={ix} onLog={() => setLog({ lessonId: l.id })} canEdit={canEdit} />)}
        {overdue.length > 0 && <div style={{ fontSize: 11, color: C.warn, margin: "8px 0 4px" }}>متأخرة عن موعدها</div>}
        {overdue.map((l) => <Row key={l.id} l={l} ix={ix} onLog={() => setLog({ lessonId: l.id })} canEdit={canEdit} late />)}
      </div>}
      <div style={{ ...S.card }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>آخر 7 أيام</div>
        <div style={{ display: "flex", gap: 6, alignItems: "flex-end", height: 80 }}>
          {Array.from({ length: 7 }, (_, i) => addDays(today, i - 6)).map((d) => { const t = D.dailyTotals(ix)[d]; const m = (t && t.streakStudy) || 0; const st = D.dayState(m, settings);
            return <div key={d} title={fmtShort(d) + ": " + m + " د"} style={{ flex: 1, textAlign: "center" }}><div style={{ height: Math.max(3, Math.min(60, (m / Math.max(settings.dailyGoal, 1)) * 50)), background: DAY_STATE[st].c, borderRadius: 4, marginBottom: 4 }} /><div style={{ fontSize: 10, color: C.muted }}>{m}</div></div>; })}
        </div>
      </div>
      {log && <LogSession lessonId={log.lessonId} onClose={() => setLog(null)} />}
    </div>
  );
}
function Row({ l, ix, onLog, canEdit, late }) {
  return <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "6px 0", borderTop: "1px solid " + C.line }}><div style={{ flex: 1, fontSize: 12.5 }}>{lessonLabel(ix, l)}{late && <span style={{ color: C.warn, fontSize: 10.5 }}> • {fmtShort(l.study_date)}</span>}</div>{canEdit && <Btn small onClick={onLog}>＋ جلسة</Btn>}</div>;
}

export function Analytics() {
  const { ix, settings, today, stats, A, canEdit, data } = useL();
  const [tab, setTab] = useState("history"); const [edit, setEdit] = useState(null);
  const sessions = [...ix.S].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : (b.created_at || "") < (a.created_at || "") ? -1 : 1));
  const dl = (name, text, type) => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click(); };
  const totals = D.dailyTotals(ix);
  const days = Array.from({ length: 84 }, (_, i) => addDays(today, i - 83));
  const byArea = ix.A.map((a) => ({ a, m: D.areaMetrics(a, ix, today, stats.avgDaily28) })).filter((x) => !x.a.is_system);
  return (
    <div>
      <Head title="التاريخ والتحليلات" right={<><Btn small onClick={() => dl("learning-sessions.csv", A.exportSessionsCSV(), "text/csv")}>⬇ CSV</Btn><Btn small onClick={() => dl("learning.json", A.exportJSON(), "application/json")}>⬇ JSON</Btn></>} />
      <Tabs value={tab} onChange={setTab} tabs={[{ id: "history", label: "السجل", count: sessions.length }, { id: "overview", label: "نظرة عامة" }, { id: "forecast", label: "التوقّع" }]} />
      {tab === "history" && (sessions.length === 0 ? <Empty icon="🕘" title="لا توجد جلسات بعد" sub="ستظهر هنا كل جلساتك مرتبة بالأحدث." /> :
        <div style={S.card}>{sessions.slice(0, 200).map((s) => { const l = ix.L.find((x) => x.id === s.lesson_id);
          return <div key={s.id} style={{ display: "flex", gap: 10, alignItems: "center", padding: "7px 0", borderBottom: "1px solid " + C.line, flexWrap: "wrap" }}>
            <span style={{ width: 70, fontSize: 11.5, color: C.muted }}>{fmtShort(s.date)}</span>
            <span style={{ flex: 1, fontSize: 12.5, minWidth: 150 }}>{l ? (l.is_system ? "دراسة حرة" : lessonLabel(ix, l)) : "—"}</span>
            {s.kind === "adjustment" && <Chip color={C.warn} title="لا يُحتسب في اليوم أو السلسلة">تعديل</Chip>}
            <b style={{ fontSize: 12.5 }}>{s.minutes} د</b>
            {canEdit && <><Btn small onClick={() => setEdit(s)}>✏️</Btn><Btn small danger onClick={() => A.deleteSession(s)}>🗑</Btn></>}
          </div>; })}</div>)}
      {tab === "overview" && <>
        <div style={{ ...S.card, marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>آخر 12 أسبوعًا</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(12,1fr)", gap: 3, direction: "ltr" }}>
            {Array.from({ length: 12 }, (_, w) => days.slice(w * 7, w * 7 + 7)).map((wk, w) => <div key={w} style={{ display: "grid", gap: 3 }}>{wk.map((d) => { const m = (totals[d] && totals[d].streakStudy) || 0; const st = D.dayState(m, settings); return <div key={d} title={d + ": " + m + " د"} style={{ height: 16, borderRadius: 3, background: m ? DAY_STATE[st].c : "rgba(0,0,0,.06)", opacity: m ? 1 : 1 }} />; })}</div>)}
          </div>
        </div>
        <div style={S.card}>{byArea.length === 0 ? <div style={{ fontSize: 12, color: C.muted }}>لا توجد مجالات.</div> : byArea.map(({ a, m }) => <div key={a.id} style={{ padding: "8px 0", borderBottom: "1px solid " + C.line }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 4 }}><b>{a.icon} {a.name}</b><span style={{ color: C.muted }}>{fmtMinutes(m.minutesLast7)} آخر 7 أيام</span></div><Progress value={m.progress} /></div>)}</div>
      </>}
      {tab === "forecast" && <div style={S.card}>{ix.C.filter((c) => !c.is_system && c.status === "Active").length === 0 ? <div style={{ fontSize: 12, color: C.muted }}>لا توجد دورات نشطة.</div> :
        ix.C.filter((c) => !c.is_system && c.status === "Active").map((c) => { const m = D.courseMetrics(c, ix); const p = D.pace(m.remaining, stats.avgDaily28, c.target_end_date, today);
          return <div key={c.id} style={{ padding: "9px 0", borderBottom: "1px solid " + C.line, fontSize: 12.5 }}><b>{c.title}</b> — باقي {fmtMinutes(m.remaining)}{" • "}
            {p.eta ? <>الانتهاء المتوقع {fmt(p.eta)} {p.status && <Chip color={p.status === "On Pace" ? C.ok : C.warn}>{p.status === "On Pace" ? "على المسار" : "متأخر"}</Chip>}{p.status === "Behind" && p.requiredDaily && <span style={{ color: C.muted }}> (يلزم ≈{Math.ceil(p.requiredDaily)} د/يوم)</span>}</> : <span style={{ color: C.muted }}>لا توجد بيانات كافية للتوقّع</span>}</div>; })}</div>}
      {edit && <FormModal title="تعديل الجلسة" initial={{ minutes: edit.minutes, date: edit.date }} fields={[{ key: "minutes", label: "الدقائق", type: "number", required: true }, { key: "date", label: "التاريخ", type: "date" }]} onClose={() => setEdit(null)} onSubmit={async (v) => { await A.editSession(edit, { minutes: v.minutes, date: v.date || edit.date }); setEdit(null); }} />}
    </div>
  );
}
