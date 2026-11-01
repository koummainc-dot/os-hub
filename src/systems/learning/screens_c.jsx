import React, { useState } from "react";
import { S } from "../../core/ui.jsx";
import { Btn, Chip, C, Empty, Head, Progress, FormModal, Tabs, Field } from "../../core/kit.jsx";
import { fmtMinutes, fmt, fmtShort, addDays } from "../../core/dates.js";
import * as D from "./domain.js";
import { useL } from "./store.jsx";
import * as K from "./lookups.js";

export function Skills() {
  const { ix, data, A, canEdit, settings, today, realAreas } = useL();
  const [edit, setEdit] = useState(null); const [link, setLink] = useState(null);
  const bands = settings.skillBands;
  return (
    <div>
      <Head title="المهارات" sub="التغطية (من الدروس) والتقييم الذاتي منفصلان — لا يُستنتج أحدهما من الآخر" right={canEdit && <Btn kind="primary" onClick={() => setEdit({ type: "technical" })}>＋ مهارة</Btn>} />
      {data.skills.length === 0 ? <Empty icon="🛠️" title="لا توجد مهارات" sub="أضف مهارة (مثل Reading أو Python) واربطها بدورات أو دروس لقياس تغطيتها." action={canEdit && <Btn kind="primary" onClick={() => setEdit({ type: "technical" })}>إضافة مهارة</Btn>} /> :
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 12 }}>
          {data.skills.map((k) => { const cov = D.skillCoverage(k, ix, data.courseSkills, data.lessonSkills); const lvl = D.masteryLevel(k.self_rating, bands); const sug = D.suggestedLevel(cov.progress, bands);
            const ev = D.skillEvidence(k, ix, cov.lessonIds, today); const links = [...data.courseSkills.filter((x) => x.skill_id === k.id).map((x) => ({ coll: "course_skills", id: x.id, label: (ix.courseById[x.course_id] || {}).title })), ...data.lessonSkills.filter((x) => x.skill_id === k.id).map((x) => ({ coll: "lesson_skills", id: x.id, label: (ix.L.find((l) => l.id === x.lesson_id) || {}).name }))];
            return <div key={k.id} style={S.card}>
              <div style={{ display: "flex", justifyContent: "space-between" }}><b>{k.name}</b><Chip color={K.MASTERY_COLOR[lvl]}>{K.MASTERY[lvl]}{k.self_rating != null && " • " + k.self_rating}</Chip></div>
              <div style={{ fontSize: 11, color: C.muted, margin: "6px 0 3px" }}>التغطية (من الدروس المرتبطة)</div><Progress value={cov.progress} />
              {cov.duplicateLink && <div style={{ fontSize: 10.5, color: C.warn, marginTop: 4 }}>⚠ ربطت الدورة ودروسًا منها — تُحتسب الدروس المحددة فقط</div>}
              <div style={{ fontSize: 10.5, color: C.muted, marginTop: 6 }}>{sug ? "المستوى المقترح من التغطية: " + K.MASTERY[sug] + " • " : ""}{fmtMinutes(ev)} دراسة آخر 30 يومًا</div>
              {links.length > 0 && <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6 }}>{links.map((l) => <Chip key={l.id} color={C.info}>{l.label || "—"}{canEdit && <button onClick={() => A.unlinkSkill(l.coll, l.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "inherit" }}>×</button>}</Chip>)}</div>}
              {canEdit && <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}><Btn small onClick={() => setEdit(k)}>تقييم / تعديل</Btn><Btn small onClick={() => setLink(k)}>ربط</Btn><Btn small danger onClick={() => A.remove("skill", "skills", k)}>حذف</Btn></div>}
            </div>; })}
        </div>}
      {edit && <FormModal title={edit.id ? "تعديل المهارة" : "مهارة جديدة"} initial={edit} onClose={() => setEdit(null)}
        fields={[{ key: "name", label: "الاسم", type: "text", required: true }, { key: "type", label: "النوع", type: "select", allowEmpty: false, options: K.opts(K.SKILL_TYPE) },
          { key: "self_rating", label: "تقييمي الذاتي 0–100 (اختياري)", type: "number", min: 0, max: 100, hint: "المستوى يُحسب من حدود الإعدادات" }]}
        onSubmit={async (v) => { await A.saveSkill(v); setEdit(null); }} />}
      {link && <FormModal title={"ربط «" + link.name + "»"} initial={{ kind: "course" }} onClose={() => setLink(null)} submitLabel="اربط"
        fields={[{ key: "kind", label: "الربط بـ", type: "select", allowEmpty: false, options: [{ v: "course", l: "دورة" }, { v: "lesson", l: "درس" }] },
          { key: "target", label: "العنصر", type: "select", required: true, emptyLabel: "اختر", options: (v) => v.kind === "course" ? ix.C.filter((c) => !c.is_system).map((c) => ({ v: c.id, l: c.title })) : ix.L.filter((l) => !l.is_system).map((l) => ({ v: l.id, l: l.name })) }]}
        onSubmit={async (v) => { await A.linkSkill(v.kind, link.id, v.target); setLink(null); }} />}
    </div>
  );
}

export function Placement() {
  const { ix, data, A, canEdit, settings, today } = useL();
  const [edit, setEdit] = useState(null);
  const langAreas = ix.A.filter((a) => a.is_language && !a.is_system);
  if (!langAreas.length) return <div><Head title="اختبارات المستوى" /><Empty icon="🧪" title="لا توجد مجالات لغة" sub="اختبارات المستوى متاحة لمجالات اللغة فقط. أنشئ مجالًا وفعّل «مجال لغة»." /></div>;
  return (
    <div>
      <Head title="اختبارات المستوى" sub="المستوى المؤكَّد يأتي من اختبار ناجح فقط — وليس من إكمال الدروس" right={canEdit && <Btn kind="primary" onClick={() => setEdit({ area_id: langAreas[0].id, date: today, tested_level: "A1" })}>＋ نتيجة اختبار</Btn>} />
      {langAreas.map((a) => { const tests = data.tests.filter((t) => t.area_id === a.id).sort((x, y) => (x.date < y.date ? 1 : -1)); const conf = D.confirmedLevel(tests, settings); const gap = D.levelGap(a, conf); const stale = D.isStaleTest(conf, today, settings); const content = D.contentLevelCompleted(a, ix);
        return <div key={a.id} style={{ ...S.card, marginBottom: 12 }}>
          <b style={{ fontSize: 14 }}>{a.name}</b>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "8px 0" }}>
            <Chip color={C.info}>المستوى المحدَّد: {a.current_language_level || "—"}</Chip>
            <Chip color={conf.level ? C.ok : C.muted}>المؤكَّد باختبار: {conf.level || "لا يوجد"}</Chip>
            <Chip color={C.violet}>محتوى مكتمل: {content || "—"}</Chip>
            {gap != null && gap !== 0 && <Chip color={C.warn}>{gap > 0 ? "المحدَّد أعلى من المؤكَّد بـ " + gap : "المؤكَّد أعلى من المحدَّد بـ " + -gap}</Chip>}
            {stale && <Chip color={C.warn}>الاختبار قديم — أعد القياس</Chip>}
          </div>
          {tests.length === 0 ? <div style={{ fontSize: 12, color: C.muted }}>لا توجد نتائج بعد.</div> : tests.map((t) => { const r = D.testResult(t.score_percent, settings);
            return <div key={t.id} style={{ display: "flex", gap: 10, alignItems: "center", padding: "6px 0", borderTop: "1px solid " + C.line, fontSize: 12.5, flexWrap: "wrap" }}>
              <span style={{ width: 90, color: C.muted }}>{fmt(t.date)}</span><b>{t.tested_level}</b><span>{t.score_percent}%</span><Chip color={K.TEST_COLOR[r]}>{K.TEST_RESULT[r]}</Chip><span style={{ flex: 1, color: C.muted }}>{t.notes}</span>
              {canEdit && <><Btn small onClick={() => setEdit(t)}>✏️</Btn><Btn small danger onClick={() => A.remove("test", "tests", t, "النتيجة")}>🗑</Btn></>}</div>; })}
        </div>; })}
      {edit && <FormModal title={edit.id ? "تعديل النتيجة" : "نتيجة اختبار"} initial={edit} onClose={() => setEdit(null)}
        fields={[{ key: "area_id", label: "المجال", type: "select", allowEmpty: false, options: langAreas.map((a) => ({ v: a.id, l: a.name })) }, { key: "date", label: "التاريخ", type: "date", required: true },
          { key: "tested_level", label: "المستوى المُختبَر", type: "select", allowEmpty: false, options: D.CEFR.map((l) => ({ v: l, l })) }, { key: "score_percent", label: "الدرجة %", type: "number", min: 0, max: 100, required: true, hint: "نجاح من " + settings.passThreshold + "% • قريب من " + settings.closeThreshold + "%" }, { key: "notes", label: "ملاحظات", type: "text" }]}
        onSubmit={async (v) => { await A.saveTest(v); setEdit(null); }} />}
    </div>
  );
}

export function CareerGoals() {
  const { ix, data, A, canEdit, today } = useL(); const [edit, setEdit] = useState(null);
  return (
    <div>
      <Head title="الأهداف المهنية" sub="الهدف يتتبع تقدّم المجالات المرتبطة به" right={canEdit && <Btn kind="primary" onClick={() => setEdit({ status: "Active", area_ids: [] })}>＋ هدف</Btn>} />
      {data.goals.length === 0 ? <Empty icon="🎯" title="لا توجد أهداف" sub="مثال: «الوصول إلى B2» مرتبطًا بمجال الإنجليزية." action={canEdit && <Btn kind="primary" onClick={() => setEdit({ status: "Active", area_ids: [] })}>إضافة هدف</Btn>} /> :
        data.goals.map((g) => { const m = D.goalMetrics(g, ix);
          return <div key={g.id} style={{ ...S.card, marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}><b>{g.title}</b><Chip color={g.status === "Achieved" ? C.ok : C.info}>{K.GOAL_STATUS[g.status]}</Chip></div>
            {m.setupState === "Needs Setup" ? <div style={{ fontSize: 12, color: C.warn, margin: "8px 0" }}>⚙ يحتاج إعدادًا: اربط الهدف بمجال واحد على الأقل.</div> : <><div style={{ margin: "8px 0" }}><Progress value={m.progress} /></div><div style={{ fontSize: 11.5, color: C.muted }}>{m.lessonsCompleted}/{m.lessonsTotal} درس • {m.coursesCount} دورة{g.target_date && " • الموعد " + fmt(g.target_date)}</div></>}
            {m.suggestAchieved && g.status !== "Achieved" && canEdit && <div style={{ marginTop: 8, fontSize: 12 }}>🎉 اكتمل المحتوى — <Btn small kind="primary" onClick={() => A.saveGoal({ ...g, status: "Achieved" })}>اعتبره متحققًا</Btn></div>}
            {canEdit && <div style={{ display: "flex", gap: 6, marginTop: 10 }}><Btn small onClick={() => setEdit(g)}>تعديل</Btn><Btn small danger onClick={() => A.remove("goal", "goals", g, g.title)}>حذف</Btn></div>}
          </div>; })}
      {edit && <FormModal title={edit.id ? "تعديل الهدف" : "هدف جديد"} initial={edit} onClose={() => setEdit(null)}
        fields={[{ key: "title", label: "الهدف", type: "text", required: true }, { key: "area_ids", label: "المجالات المرتبطة", type: "multi", options: ix.A.filter((a) => !a.is_system).map((a) => ({ v: a.id, l: a.name })) }, { key: "target_date", label: "الموعد (اختياري)", type: "date" }, { key: "status", label: "الحالة", type: "select", allowEmpty: false, options: K.opts(K.GOAL_STATUS) }]}
        onSubmit={async (v) => { await A.saveGoal(v); setEdit(null); }} />}
    </div>
  );
}

export function Vocab() {
  const { ix, data, A, canEdit, today, settings } = useL();
  const [tab, setTab] = useState("review"); const [edit, setEdit] = useState(null); const [shown, setShown] = useState(false); const [q, setQ] = useState("");
  const langAreas = ix.A.filter((a) => a.is_language && !a.is_system);
  const counts = D.vocabCounts(data.vocab, today); const queue = D.vocabQueue(data.vocab, today).slice(0, 20); const cur = queue[0];
  if (!langAreas.length) return <div><Head title="المفردات والمراجعة" /><Empty icon="🔤" title="لا توجد مجالات لغة" sub="المفردات لمجالات اللغة فقط." /></div>;
  const list = data.vocab.filter((v) => !v.archived_at && (!q || (v.word + v.meaning).toLowerCase().includes(q.toLowerCase())));
  const rate = async (st) => { await A.reviewVocab(cur, st); setShown(false); };
  return (
    <div>
      <Head title="المفردات والمراجعة" sub={counts.dueToday + " مستحقة اليوم • " + (counts.New + counts.Learning + counts.Review + counts.Mastered) + " كلمة"} right={canEdit && <Btn kind="primary" onClick={() => setEdit({ area_id: langAreas[0].id, status: "New", part_of_speech: "noun" })}>＋ كلمة</Btn>} />
      <Tabs value={tab} onChange={setTab} tabs={[{ id: "review", label: "مراجعة اليوم", count: counts.dueToday }, { id: "all", label: "كل الكلمات", count: data.vocab.length }]} />
      {tab === "review" && (!cur ? <Empty icon="🎉" title="لا توجد كلمات مستحقة" sub="أحسنت — عُد غدًا أو أضف كلمات جديدة." /> :
        <div style={{ ...S.card, textAlign: "center", padding: 28, maxWidth: 480, margin: "0 auto" }}>
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>{queue.length} متبقية{cur.next_review_date < today ? " • متأخرة" : ""}</div>
          <div style={{ fontSize: 30, fontWeight: 800, direction: "ltr" }}>{cur.word}</div>
          {cur.example && <div style={{ fontSize: 12, color: C.muted, direction: "ltr", marginTop: 6 }}>{cur.example}</div>}
          {!shown ? <div style={{ marginTop: 20 }}><Btn kind="primary" onClick={() => setShown(true)}>أظهر المعنى</Btn></div> : <>
            <div style={{ fontSize: 20, margin: "16px 0", color: "#8B5CF6" }}>{cur.meaning}</div>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
              {canEdit && <><Btn onClick={() => rate("Learning")}>ما زلت أتعلمها</Btn><Btn onClick={() => rate("Review")}>أعرفها تقريبًا</Btn><Btn kind="primary" onClick={() => rate("Mastered")}>أتقنتها ✓</Btn></>}</div>
            {!settings.vocabLadder && <div style={{ fontSize: 10.5, color: C.muted, marginTop: 10 }}>موعد المراجعة لا يتغيّر تلقائيًا (السلّم الزمني مغلق في الإعدادات) — عدّله يدويًا من «كل الكلمات».</div>}</>}
        </div>)}
      {tab === "all" && <><input style={{ ...S.inp, maxWidth: 280, marginBottom: 10 }} placeholder="بحث..." value={q} onChange={(e) => setQ(e.target.value)} />
        {list.length === 0 ? <Empty icon="🔤" title="لا توجد كلمات" sub="أضف كلمتك الأولى." /> : <div style={S.card}>{list.map((v) => <div key={v.id} style={{ display: "flex", gap: 10, alignItems: "center", padding: "7px 0", borderBottom: "1px solid " + C.line, flexWrap: "wrap" }}>
          <b style={{ minWidth: 100, direction: "ltr", textAlign: "right" }}>{v.word}</b><span style={{ flex: 1, fontSize: 12.5 }}>{v.meaning}</span><Chip>{K.VOCAB_STATUS[v.status]}</Chip><span style={{ fontSize: 10.5, color: C.muted }}>{v.next_review_date ? fmtShort(v.next_review_date) : "—"}</span>
          {canEdit && <><Btn small onClick={() => setEdit(v)}>✏️</Btn><Btn small danger onClick={() => A.remove("vocab", "vocab", v, v.word)}>🗑</Btn></>}</div>)}</div>}</>}
      {edit && <FormModal title={edit.id ? "تعديل الكلمة" : "كلمة جديدة"} initial={edit} onClose={() => setEdit(null)}
        fields={[{ key: "word", label: "الكلمة", type: "text", required: true }, { key: "meaning", label: "المعنى", type: "text", required: true }, { key: "area_id", label: "المجال", type: "select", allowEmpty: false, options: langAreas.map((a) => ({ v: a.id, l: a.name })) },
          { key: "example", label: "مثال (اختياري)", type: "text" }, { key: "part_of_speech", label: "النوع", type: "select", allowEmpty: false, options: K.opts(K.POS) }, { key: "level", label: "المستوى", type: "select", options: D.CEFR.map((l) => ({ v: l, l })) },
          { key: "status", label: "الحالة", type: "select", allowEmpty: false, options: K.opts(K.VOCAB_STATUS) }, { key: "next_review_date", label: "موعد المراجعة", type: "date" }]}
        onSubmit={async (v) => { const r = await A.saveVocab(v); if (r === null) return false; setEdit(null); }} />}
    </div>
  );
}

export function Settings() {
  const { settings, A, canEdit, trash, data, restDates, today, ix } = useL(); const [tab, setTab] = useState("goals"); const [form, setForm] = useState(null);
  const set = (k, v) => setForm((f) => ({ ...(f || settings), [k]: v })); const cur = form || settings;
  const num = (k, label, hint) => <Field label={label} hint={hint}><input style={S.inp} type="number" disabled={!canEdit} value={cur[k]} onChange={(e) => set(k, e.target.value === "" ? "" : +e.target.value)} /></Field>;
  const [err, setErr] = useState("");
  return (
    <div>
      <Head title="الإعدادات" />
      <Tabs value={tab} onChange={setTab} tabs={[{ id: "goals", label: "الأهداف والسلسلة" }, { id: "levels", label: "المستويات والاختبارات" }, { id: "rest", label: "أيام الراحة" }, { id: "trash", label: "السلة", count: trash.length }]} />
      {(tab === "goals" || tab === "levels") && <div style={{ ...S.card, maxWidth: 560 }}>
        {tab === "goals" ? <>
          {num("dailyGoal", "هدف اليوم (دقائق)")}{num("dailyMinimum", "الحد الأدنى للحفاظ على السلسلة (دقائق)")}{num("weeklyGoal", "هدف الأسبوع (دقائق)")}{num("minutesPerPage", "دقائق لكل صفحة (للكتب)")}
          <Field label="يوم بداية الأسبوع"><select style={S.sel} disabled={!canEdit} value={cur.weekStartDay} onChange={(e) => set("weekStartDay", +e.target.value)}>{["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"].map((d, i) => <option key={i} value={i}>{d}</option>)}</select></Field>
          {num("restDaysPerMonth", "أيام الراحة المسموحة شهريًا", "0 = مغلقة")}
          <Field label="سلّم المراجعة الزمني للمفردات"><label style={{ fontSize: 13 }}><input type="checkbox" disabled={!canEdit} checked={!!cur.vocabLadder} onChange={(e) => set("vocabLadder", e.target.checked)} /> تفعيل (1/3/7/14/30 يومًا) — مغلق افتراضيًا</label></Field>
        </> : <>
          {num("passThreshold", "درجة النجاح %")}{num("closeThreshold", "درجة «قريب» %")}{num("staleTestMonths", "عمر الاختبار القديم (أشهر)")}
          <Field label="حدود مستويات المهارة (3 أرقام مفصولة بفاصلة)"><input style={S.inp} disabled={!canEdit} value={(cur.skillBands || []).join(",")} onChange={(e) => set("skillBands", e.target.value.split(",").map((x) => +x.trim()).filter((x) => !isNaN(x)))} /></Field>
        </>}
        {err && <div style={{ color: C.bad, fontSize: 12, marginBottom: 8 }}>{err}</div>}
        {canEdit && <Btn kind="primary" disabled={!form} onClick={async () => { try { setErr(""); await A.saveSettings(form); setForm(null); } catch (e) { setErr(e.message); } }}>حفظ</Btn>}
      </div>}
      {tab === "rest" && <div style={{ ...S.card, maxWidth: 560 }}>
        {settings.restDaysPerMonth <= 0 ? <div style={{ fontSize: 12.5, color: C.muted }}>أيام الراحة مغلقة. فعّلها من «الأهداف والسلسلة».</div> : <>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>يوم الراحة لا يُحتسب ولا يكسر السلسلة.</div>
          {canEdit && <Btn small kind="primary" onClick={() => A.addRestDay(today)}>اجعل اليوم يوم راحة</Btn>}
          {data.restDays.map((r) => <div key={r.id} style={{ display: "flex", gap: 10, padding: "6px 0", borderTop: "1px solid " + C.line, fontSize: 12.5 }}><span style={{ flex: 1 }}>{fmt(r.date)}</span>{canEdit && <Btn small danger onClick={() => A.removeRestDay(r.id)}>إزالة</Btn>}</div>)}</>}
      </div>}
      {tab === "trash" && (trash.length === 0 ? <Empty icon="🗑" title="السلة فارغة" /> : <div style={S.card}>{trash.map(({ coll, rec }) => <div key={coll + rec.id} style={{ display: "flex", gap: 10, padding: "6px 0", borderBottom: "1px solid " + C.line, fontSize: 12.5, alignItems: "center" }}><Chip>{coll}</Chip><span style={{ flex: 1 }}>{rec.name || rec.title || rec.word || rec.id}</span>{canEdit && <Btn small onClick={() => A.restoreRec(coll, rec.id)}>استرجاع</Btn>}</div>)}</div>)}
    </div>
  );
}
