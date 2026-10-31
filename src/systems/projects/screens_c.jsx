import React, { useState, useMemo } from "react";
import { A, S } from "../../core/ui.jsx";
import { C, Btn, Chip, Head, Stat, Empty, Progress, Seg, SearchBar, Tabs, FormModal, Modal, Field, Avatar } from "../../core/kit.jsx";
import { fmt, fmtShort, fmtMinutes, addDays, diffDays, dateOf } from "../../core/dates.js";
import { uid, nowIso } from "../../core/records.jsx";
import { useP, GENERAL_ID } from "./store.jsx";
import * as D from "./domain.js";
import { L, opts, DEFAULT_LOOKUPS, LOOKUP_LABEL, UPDATE_SECTIONS, MEETING_TEMPLATES, REVIEW_PROMPTS, PRD_TEMPLATE } from "./lookups.js";
import { Who, ProjectName, mOpts, projOpts, HealthBadge, StatusChip, TaskForm } from "./parts.jsx";
import { TemplatePicker } from "./screens_b.jsx";

// ═════ OKRs ═════
export function Okrs() {
  const { data, A: act, projectProgress, today, settings, people, me, toast, role, nameOf, confirm, idx, openTask, setPage } = useP();
  const [oForm, setOForm] = useState(null); const [kForm, setKForm] = useState(null); const [ci, setCi] = useState(null); const [hist, setHist] = useState(null); const [taskForm, setTaskForm] = useState(null); const [filter, setFilter] = useState("Active");
  const objs = data.objectives.filter((o) => filter === "all" || o.status === filter);
  const canEditObj = (o) => role === "Owner" || role === "Admin" || !o || o.owner_id === me || o.created_by === me;
  const checkinsOf = (id) => data.checkins.filter((c) => c.kr_id === id).sort((a, b) => b.checked_at.localeCompare(a.checked_at));
  return (
    <div>
      <Head title="الأهداف والنتائج الرئيسية (OKR)" sub={`${objs.length} هدف`} right={<><select style={{ ...S.sel, width: 120 }} value={filter} onChange={(e) => setFilter(e.target.value)}><option value="all">الكل</option>{opts(L.objectiveStatus).map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}</select>{role !== "Viewer" && <Btn kind="primary" onClick={() => setOForm({})}>➕ هدف</Btn>}</>} />
      {!objs.length && <Empty icon="🎯" title="لا أهداف" sub="حدّد هدفاً للفترة (ربع/نطاق تاريخ) وأضف له نتائج رئيسية قابلة للقياس." />}
      {objs.map((o) => {
        const krs = data.krs.filter((k) => k.objective_id === o.id); const pr = D.objectiveProgress(o, data.krs, projectProgress); const pc = D.pace(pr, o.period_start, o.period_end, o.status, today, settings); const pm = D.PACE_META[pc];
        return (
          <div key={o.id} style={{ ...S.card, marginBottom: 12 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}><span style={{ fontSize: 15, fontWeight: 800, flex: 1 }}>🎯 {o.name}</span><Chip color={C.violet}>{D.quarterOf(o.period_start)}</Chip><Chip color={pm.color}>{pm.label}</Chip><Chip color={C.info}>{L.objectiveStatus[o.status]}</Chip><Who id={o.owner_id} size={18} />
              {canEditObj(o) && <><Btn small onClick={() => setOForm(o)}>✎</Btn><Btn small onClick={() => setKForm({ objective_id: o.id, type: "Numeric", owner_id: o.owner_id })}>➕ نتيجة</Btn><Btn small danger onClick={async () => { const linkedTasks = data.tasks.filter((t) => !t.deleted_at && t.objective_id === o.id); const linkedWins = data.wins.filter((w) => w.objective_id === o.id); const linkedKrs = data.krs.filter((k) => k.objective_id === o.id); if (linkedTasks.length || linkedWins.length || linkedKrs.length) return toast("لا يمكن حذف هدف مرتبط بمهام أو نتائج رئيسية أو إنجازات. غيّر حالة الهدف إلى ملغى للاحتفاظ بالتاريخ."); if (await confirm("حذف الهدف؟ لا يمكن التراجع عن هذا الإجراء.")) await act.del("objectives", o.id, o.name); }}>🗑</Btn></>}</div>
            {o.why && <div style={{ fontSize: 12, color: C.dim, margin: "4px 0" }}>لماذا؟ {o.why}</div>}
            {(() => { const linkedTasks = idx.list.filter((t) => t.objective_id === o.id); const done = linkedTasks.filter((t) => idx.isLeaf(t.id) && D.cat(t.status) === "done").length; return <div style={{ marginTop: 10, padding: "9px 10px", border: "1px solid " + C.line, borderRadius: 9 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}><b style={{ fontSize: 12.5 }}>المهام المرتبطة بالهدف</b><Chip>{done}/{linkedTasks.filter((t) => idx.isLeaf(t.id)).length} مكتملة</Chip><span style={{ flex: 1 }} />{canEditObj(o) && <Btn small onClick={() => setTaskForm({ objective_id: o.id })}>＋ إضافة مهمة</Btn>}</div>
              {linkedTasks.length ? linkedTasks.map((t) => <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 7, padding: "4px 0", borderTop: "1px solid " + C.line, fontSize: 12 }}>
                <span style={{ flex: 1, cursor: "pointer" }} onClick={() => openTask(t.id)}>{D.cat(t.status) === "done" ? "✅ " : "▫️ "}{t.title}</span><ProjectName id={t.project_id} /><Btn small onClick={() => openTask(t.id)}>فتح</Btn>
              </div>) : <div style={{ fontSize: 11.5, color: C.muted }}>لا توجد مهام مرتبطة بعد. اربط مهامًا موجودة أو أنشئ مهمة من هنا.</div>}
            </div>; })()}
            {(() => { const linkedWins = data.wins.filter((w) => w.objective_id === o.id); return linkedWins.length ? <div style={{ marginTop: 7, fontSize: 12, color: C.dim }}>🏆 الإنجازات المرتبطة: {linkedWins.map((w) => <button key={w.id} type="button" onClick={() => setPage("wins")} style={{ border: 0, background: "none", color: C.info, cursor: "pointer", textDecoration: "underline", marginInlineEnd: 6 }}>{w.title} ↗</button>)}</div> : null; })()}
            <div style={{ margin: "8px 0" }}><Progress value={pr} height={9} /></div><div style={{ fontSize: 11, color: C.muted }}>{fmt(o.period_start)} → {fmt(o.period_end)}</div>
            <div style={{ marginTop: 8 }}>{krs.map((k) => { const r = D.krProgress(k, projectProgress); const val = r == null ? null : typeof r === "number" ? r : r.clamped; const raw = r && typeof r === "object" ? r.raw : null; const kp = D.pace(val, o.period_start, o.period_end, o.status === "Achieved" ? "Achieved" : "Active", today, settings); return (
              <div key={k.id} style={{ display: "grid", gridTemplateColumns: "minmax(160px,1.5fr) minmax(110px,1fr) 100px auto", gap: 8, padding: "7px 0", borderTop: `1px solid ${C.line}`, alignItems: "center", fontSize: 12.5 }}>
                <div><b>{k.name}</b><div style={{ fontSize: 10.5, color: C.muted }}>{k.type === "Numeric" ? `${k.initial_value ?? 0} → ${k.target_value} ${k.unit || ""} · الحالي ${k.current_value ?? k.initial_value ?? 0}` : `${(k.project_ids || []).length} مشروع`}{raw != null && raw > 1 ? ` · تجاوز الهدف ${Math.round(raw * 100)}%` : ""}</div></div>
                <Progress value={val} /><Chip color={D.PACE_META[kp].color}>{D.PACE_META[kp].label}</Chip>
                <span style={{ display: "inline-flex", gap: 4 }}>{k.type === "Numeric" && canEditObj(o) && <Btn small onClick={() => setCi({ kr: k, value: k.current_value ?? k.initial_value ?? 0 })}>📍 Check-in</Btn>}<Btn small onClick={() => setHist(k)}>سجل</Btn>{canEditObj(o) && <><Btn small onClick={() => setKForm(k)}>✎</Btn><Btn small danger onClick={() => act.del("krs", k.id, k.name)}>🗑</Btn></>}</span>
              </div>); })}{!krs.length && <div style={{ fontSize: 12, color: C.muted }}>لا نتائج رئيسية بعد</div>}</div>
          </div>);
      })}
      {taskForm && <TaskForm initial={taskForm} onClose={() => setTaskForm(null)} />}
      {oForm && <FormModal title={oForm.id ? "تعديل الهدف" : "هدف جديد"} wide initial={{ status: "Active", owner_id: me, period_start: today, period_end: addDays(today, 90), ...oForm }} onClose={() => setOForm(null)} validate={(v) => (D.validateDates(v.period_start, v.period_end).length ? { period_end: "النهاية قبل البداية" } : null)} onSubmit={async (v) => { await act.put("objectives", { ...v, id: v.id || uid() }); setOForm(null); }} fields={[{ key: "name", label: "الهدف", required: true, span: 2 }, { key: "why", label: "لماذا؟", type: "textarea", rows: 2 }, { key: "period_start", label: "بداية الفترة", type: "date", required: true }, { key: "period_end", label: "نهاية الفترة", type: "date", required: true }, { key: "status", label: "الحالة", type: "select", allowEmpty: false, options: opts(L.objectiveStatus) }, { key: "owner_id", label: "المسؤول", type: "select", options: mOpts(people) }]} />}
      {kForm && <FormModal title={kForm.id ? "تعديل النتيجة الرئيسية" : "نتيجة رئيسية جديدة"} wide initial={kForm} onClose={() => setKForm(null)} validate={(v) => { const e = D.validateKR(v); return e.length ? { target_value: e[0] } : null; }} onSubmit={async (v) => { const rec = { ...v, id: v.id || uid() }; if (rec.type === "Numeric" && rec.current_value == null) rec.current_value = rec.initial_value; await act.put("krs", rec); setKForm(null); }} fields={[
        { key: "name", label: "النتيجة الرئيسية", required: true, span: 2 }, { key: "type", label: "النوع", type: "select", allowEmpty: false, options: opts(L.krType) }, { key: "owner_id", label: "المسؤول", type: "select", options: mOpts(people) },
        { key: "unit", label: "الوحدة", show: (v) => v.type === "Numeric" }, { key: "initial_value", label: "القيمة الابتدائية", type: "number", show: (v) => v.type === "Numeric", required: (v) => v.type === "Numeric" }, { key: "target_value", label: "القيمة المستهدفة", type: "number", show: (v) => v.type === "Numeric", required: (v) => v.type === "Numeric" },
        { key: "project_ids", label: "المشاريع", type: "multi", show: (v) => v.type === "Project Based", options: data.projects.filter((p) => !p.is_system).map((p) => ({ v: p.id, l: p.name })) }]} />}
      {ci && <FormModal title={"Check-in: " + ci.kr.name} initial={{ value: ci.value }} onClose={() => setCi(null)} onSubmit={async (v) => { await act.put("checkins", { id: uid(), kr_id: ci.kr.id, member_id: me, value: v.value, note: v.note || "", checked_at: nowIso() }); await act.put("krs", { ...ci.kr, current_value: v.value }); toast("✅ سُجّل الـ Check-in"); setCi(null); }} fields={[{ key: "value", label: "القيمة الحالية", type: "number", required: true }, { key: "note", label: "ملاحظة", type: "textarea", rows: 2 }]}><div style={{ fontSize: 11, color: C.muted }}>القيمة الحالية لا تتغير إلا عبر Check-in ليبقى السجل التاريخي سليماً.</div></FormModal>}
      {hist && <Modal title={"سجل Check-ins: " + hist.name} onClose={() => setHist(null)}>{!checkinsOf(hist.id).length ? <Empty icon="📍" title="لا Check-ins" /> : checkinsOf(hist.id).map((c) => <div key={c.id} style={{ display: "flex", gap: 10, fontSize: 12.5, padding: "5px 0", borderBottom: `1px solid ${C.line}` }}><b>{c.value}</b><span>{fmt(dateOf(c.checked_at, settings.timezone))}</span><Who id={c.member_id} size={16} /><span style={{ color: C.muted }}>{c.note}</span></div>)}</Modal>}
    </div>
  );
}

// ═════ Stakeholder updates ═════
export function Updates() {
  const { data, A: act, can, projectsById, metrics, today, settings, people, me, toast, confirm, idx, nameOf, projectProgress } = useP();
  const [form, setForm] = useState(null); const [sel, setSel] = useState(null);
  const list = [...data.updates].sort((a, b) => (b.period_end || "").localeCompare(a.period_end || ""));
  function draft(projectId) {
    const p = projectsById[projectId]; const m = metrics[projectId]; const pe = today; const ps = addDays(today, -14);
    const wins = data.wins.filter((w) => (!w.project_id || w.project_id === projectId) && w.achieved_on >= ps);
    const done = idx.list.filter((t) => t.project_id === projectId && idx.isLeaf(t.id) && D.cat(t.status) === "done" && t.completed_at && t.completed_at.slice(0, 10) >= ps);
    const risks = data.risks.filter((r) => r.project_id === projectId && D.isOpenRisk(r)); const issues = data.issues.filter((i) => i.project_id === projectId && D.isOpenIssue(i));
    const delayed = idx.list.filter((t) => t.project_id === projectId && idx.isLeaf(t.id) && D.isOverdueLeaf(t, idx, today));
    const nextTasks = idx.list.filter((t) => t.project_id === projectId && idx.isLeaf(t.id) && ["todo", "active"].includes(D.cat(t.status)) && t.due_date && t.due_date >= today && t.due_date <= addDays(today, 7));
    const decisions = data.decisions.filter((d) => d.project_id === projectId && d.decided_at >= ps && d.decided_at <= pe);
    const lines = (a) => a.map((x) => "• " + x).join("\n");
    return { project_id: projectId, period_start: ps, period_end: pe, type: "Stakeholder", related_win_ids: wins.map((w) => w.id), completed_task_ids: done.map((t) => t.id), delayed_task_ids: delayed.map((t) => t.id), next_task_ids: nextTasks.map((t) => t.id), related_issue_ids: issues.map((i) => i.id), related_risk_ids: risks.map((r) => r.id), related_decision_ids: decisions.map((d) => d.id), sections: { highlights: lines([...wins.map((w) => w.title), ...done.slice(0, 6).map((t) => "أُنجز: " + t.title)]), lows: lines([...issues.map((i) => "مشكلة: " + i.title), ...risks.filter((r) => D.riskScore(r) >= settings.riskHigh).map((r) => "خطر عالٍ: " + r.title), ...delayed.slice(0, 6).map((t) => "متأخرة: " + t.title)]), metrics: `التقدم ${m.progress == null ? "—" : Math.round(m.progress * 100) + "%"} (${m.leafCompleted}/${m.leafTotal}) · الصحة: ${D.HEALTH_META[m.health].label} · الوقت الفعلي ${fmtMinutes(m.actual)}`, asks: "", next: lines(nextTasks.slice(0, 6).map((t) => t.title)) } };
  }
  const openUp = sel ? data.updates.find((u) => u.id === sel) : null;
  return (
    <div>
      <Head title="تحديثات أصحاب المصلحة" sub={`${list.length} تحديث`} right={<Btn kind="primary" onClick={() => setForm({})}>➕ تحديث جديد</Btn>} />
      {!list.length ? <Empty icon="📣" title="لا تحديثات" sub="يُولَّد المسودة من الإنجازات والمهام والمخاطر والأرقام الحية، وتُجمَّد عند النشر." /> : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 10 }}>{list.map((u) => <div key={u.id} onClick={() => setSel(u.id)} style={{ ...S.card, cursor: "pointer", padding: "11px 13px" }}><div style={{ display: "flex", gap: 6, alignItems: "center" }}><b style={{ flex: 1, fontSize: 13.5 }}>📣 {u.title || "تحديث"}</b><Chip color={u.status === "Published" ? C.ok : C.muted}>{u.status === "Published" ? "منشور" : "مسودة"}</Chip></div><div style={{ fontSize: 11.5, color: C.muted, marginTop: 4 }}><ProjectName id={u.project_id} /> · {fmtShort(u.period_start)} → {fmtShort(u.period_end)} · {L.updateType[u.audience] || ""}</div>{u.lead_assessment && <Chip color={u.lead_assessment === "On Track" ? C.ok : u.lead_assessment === "At Risk" ? C.warn : C.bad} style={{ marginTop: 6 }}>{L.assessment[u.lead_assessment]}</Chip>}</div>)}</div>}
      {form && <FormModal title="تحديث جديد" initial={{ audience: "Management", project_id: data.projects.find((p) => !p.is_system)?.id }} onClose={() => setForm(null)} fields={[{ key: "project_id", label: "المشروع", type: "select", required: true, allowEmpty: false, options: projOpts(data.projects.filter((p) => !p.is_system)) }, { key: "audience", label: "الجمهور", type: "select", allowEmpty: false, options: opts(L.updateType) }, { key: "title", label: "العنوان" }]} onSubmit={async (v) => { const d = draft(v.project_id); const rec = { id: uid(), ...d, audience: v.audience, title: v.title || `تحديث ${projectsById[v.project_id].name} — ${fmtShort(today)}`, status: "Draft", lead_assessment: "On Track", author_id: me }; const s = await act.put("updates", rec, projectsById[v.project_id]); setForm(null); if (s) setSel(s.id); }} />}
      {openUp && <UpdateEditor u={openUp} onClose={() => setSel(null)} />}
    </div>
  );
}
function UpdateEditor({ u, onClose }) {
  const { A: act, can, projectsById, toast, metrics, confirm, nameOf, settings, data, idx, openTask, openProject, setPage } = useP(); const project = projectsById[u.project_id]; const published = u.status === "Published"; const canW = can("update.write", project) && !published;
  const [d, setD] = useState(u); const [addendumForm, setAddendumForm] = useState(false); const setSec = (k, v) => setD({ ...d, sections: { ...d.sections, [k]: v } });
  async function publish() {
    if (!(await confirm("نشر التحديث؟ ستُجمَّد الأرقام ولا يمكن تعديله بعد ذلك (يمكنك إضافة ملحق)."))) return;
    const m = metrics[u.project_id]; const snapshot = { progress: m.progress, health: m.health, leafCompleted: m.leafCompleted, leafTotal: m.leafTotal, openRisks: m.openRisks, openIssues: m.openIssues, actualMinutes: m.actual, related_win_ids: d.related_win_ids || [], completed_task_ids: d.completed_task_ids || [], delayed_task_ids: d.delayed_task_ids || [], next_task_ids: d.next_task_ids || [], related_issue_ids: d.related_issue_ids || [], related_risk_ids: d.related_risk_ids || [], related_decision_ids: d.related_decision_ids || [], at: nowIso() };
    await act.put("updates", { ...d, status: "Published", published_at: nowIso(), snapshot }, project); toast("✅ نُشر التحديث"); onClose();
  }
  const addendum = async (text) => { const clean = String(text || "").trim(); if (!clean) throw new Error("اكتب نص الملحق أولاً."); const saved = await act.put("updates", { ...d, addenda: [...(d.addenda || []), { at: nowIso(), by: nameOf(d.author_id), text: clean }] }, project); if (saved) { setD(saved); setAddendumForm(false); toast("✅ أُضيف الملحق"); } };
  return <Modal title={d.title} wide onClose={onClose} footer={<>{canW && <Btn kind="primary" onClick={async () => { await act.put("updates", d, project); toast("✅ تم الحفظ"); }}>💾 حفظ</Btn>}{canW && <Btn onClick={publish}>📣 نشر</Btn>}{published && can("update.write", project) && <Btn onClick={() => setAddendumForm(true)}>➕ ملحق</Btn>}{can("update.write", project) && <Btn danger onClick={async () => { await act.del("updates", u.id, u.title); onClose(); }}>🗑</Btn>}</>}>
    <div style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "center" }}><ProjectName id={u.project_id} /><span style={{ fontSize: 11.5, color: C.muted }}>{fmt(u.period_start)} → {fmt(u.period_end)}</span>{published && <Chip color={C.ok}>🔒 منشور</Chip>}</div>
    <Field label="تقييم القائد"><select disabled={!canW} style={S.sel} value={d.lead_assessment || ""} onChange={(e) => setD({ ...d, lead_assessment: e.target.value })}>{opts(L.assessment).map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}</select></Field>
     {(() => { const groups = [{ title: "إنجازات", values: d.related_win_ids || [], kind: "win" }, { title: "مهام أُنجزت", values: d.completed_task_ids || [], kind: "task" }, { title: "مهام متأخرة", values: d.delayed_task_ids || [], kind: "task" }, { title: "الخطوات التالية", values: d.next_task_ids || [], kind: "task" }, { title: "المشاكل", values: d.related_issue_ids || [], kind: "issue" }, { title: "المخاطر", values: d.related_risk_ids || [], kind: "risk" }, { title: "القرارات", values: d.related_decision_ids || [], kind: "decision" }]; return groups.some((g) => g.values.length) ? <div style={{ ...S.card, marginBottom: 10 }}><b style={{ fontSize: 12 }}>السجلات المرتبطة بالتحديث</b>{groups.map((g) => { const items = g.values.map((id) => g.kind === "task" ? idx.byId[id] : g.kind === "win" ? data.wins.find((x) => x.id === id) : g.kind === "issue" ? data.issues.find((x) => x.id === id) : g.kind === "risk" ? data.risks.find((x) => x.id === id) : data.decisions.find((x) => x.id === id)).filter(Boolean); return items.length ? <div key={g.title} style={{ marginTop: 6, fontSize: 12 }}><span style={{ color: C.muted }}>{g.title}: </span>{items.map((item) => <button key={item.id} type="button" onClick={() => g.kind === "task" ? openTask(item.id) : g.kind === "win" ? setPage("wins") : openProject(item.project_id, g.kind === "decision" ? "decisions" : g.kind === "risk" ? "risks" : "issues")} style={{ border: 0, background: "none", color: C.info, cursor: "pointer", textDecoration: "underline", marginInlineEnd: 7 }}>{item.title} ↗</button>)}</div> : null; })}</div> : null; })()}
    {UPDATE_SECTIONS.map((s) => <Field key={s.key} label={s.title}><textarea disabled={!canW} style={{ ...S.ta, minHeight: 70 }} value={(d.sections || {})[s.key] || ""} onChange={(e) => setSec(s.key, e.target.value)} /></Field>)}
    {published && d.snapshot && <div style={{ background: "rgba(0,0,0,0.04)", borderRadius: 8, padding: 10, fontSize: 12 }}>لقطة وقت النشر: تقدم {d.snapshot.progress == null ? "—" : Math.round(d.snapshot.progress * 100) + "%"} · {d.snapshot.leafCompleted}/{d.snapshot.leafTotal} · صحة {D.HEALTH_META[d.snapshot.health].label} · مخاطر {d.snapshot.openRisks} · مشاكل {d.snapshot.openIssues}</div>}
    {(d.addenda || []).map((a, i) => <div key={i} style={{ fontSize: 12, marginTop: 6, color: C.dim }}>➕ {a.by}: {a.text}</div>)}
    {addendumForm && <FormModal title="إضافة ملحق للتحديث المنشور" initial={{ text: "" }} onClose={() => setAddendumForm(false)} onSubmit={(v) => addendum(v.text)} fields={[{ key: "text", label: "نص الملحق", type: "textarea", rows: 4, required: true }]} />}
  </Modal>;
}

// ═════ Wins ═════
export function Wins() {
  const { data, A: act, me, today, idx, can, people, projectsById, toast, weekStartStr } = useP(); const [form, setForm] = useState(null); const [who, setWho] = useState("all");
  const list = data.wins.filter((w) => who === "all" || w.member_id === who).sort((a, b) => b.achieved_on.localeCompare(a.achieved_on));
  const sugg = idx.list.filter((t) => idx.isLeaf(t.id) && D.cat(t.status) === "done" && t.assignee_id === me && t.completed_at && t.completed_at.slice(0, 10) >= weekStartStr && !data.wins.some((w) => w.task_id === t.id)).slice(0, 6);
  return (
    <div>
      <Head title="الإنجازات" sub={`${list.length} إنجاز`} right={<><select style={{ ...S.sel, width: 150 }} value={who} onChange={(e) => setWho(e.target.value)}><option value="all">الكل</option>{people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select><Btn kind="primary" onClick={() => setForm({})}>➕ إنجاز</Btn></>} />
      {sugg.length > 0 && <div style={{ ...S.card, marginBottom: 12, border: `1px dashed ${C.ok}` }}><div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 6 }}>💡 اقتراحات من مهامك المكتملة هذا الأسبوع</div>{sugg.map((t) => <div key={t.id} style={{ display: "flex", gap: 8, alignItems: "center", padding: "3px 0", fontSize: 13 }}><span style={{ flex: 1 }}>✔ {t.title}</span><Btn small onClick={() => act.put("wins", { id: uid(), title: t.title, achieved_on: t.completed_at.slice(0, 10), member_id: me, project_id: t.project_id, task_id: t.id, visibility: "team" }).then(() => toast("🏆 سُجّل إنجاز"))}>🏆 سجّل</Btn></div>)}</div>}
      {!list.length ? <Empty icon="🏆" title="لا إنجازات بعد" sub="احتفِ بما أنجزته — وتظهر الإنجازات في المراجعة الأسبوعية." /> : <div style={{ ...S.card, padding: "4px 14px" }}>{list.map((w) => <div key={w.id} style={{ display: "flex", gap: 10, alignItems: "center", padding: "9px 0", borderBottom: `1px solid ${C.line}` }}><span style={{ fontSize: 18 }}>🏆</span><div style={{ flex: 1 }}><div style={{ fontSize: 13.5, fontWeight: 700 }}>{w.title}</div>{w.description && <div style={{ fontSize: 12, color: C.dim }}>{w.description}</div>}<div style={{ fontSize: 11, color: C.muted, display: "flex", gap: 8 }}>{fmt(w.achieved_on)} <Who id={w.member_id} size={15} />{w.project_id && <ProjectName id={w.project_id} />}{w.objective_id && <span>🎯 {((data.objectives.find((o) => o.id === w.objective_id) || {}).name) || "هدف غير متاح"}</span>}</div></div>{(w.member_id === me || can("admin")) && <><Btn small onClick={() => setForm(w)}>✎</Btn><Btn small danger onClick={() => act.del("wins", w.id, w.title)}>🗑</Btn></>}</div>)}</div>}
      {form && <FormModal title={form.id ? "تعديل الإنجاز" : "إنجاز جديد"} initial={{ achieved_on: today, member_id: me, visibility: "team", ...form }} onClose={() => setForm(null)} onSubmit={async (v) => { await act.put("wins", { ...v, id: v.id || uid() }); setForm(null); toast("🏆 تم"); }} fields={[{ key: "title", label: "الإنجاز", required: true }, { key: "achieved_on", label: "التاريخ", type: "date", required: true }, { key: "project_id", label: "المشروع", type: "select", emptyLabel: "— بلا —", options: projOpts(data.projects) }, { key: "objective_id", label: "الهدف الذي يخدمه الإنجاز", type: "select", emptyLabel: "— بلا هدف —", options: data.objectives.filter((o) => o.status !== "Cancelled").map((o) => ({ v: o.id, l: o.name })) }, { key: "description", label: "تفاصيل", type: "textarea", rows: 2 }]} />}
    </div>
  );
}

// ═════ Weekly reviews ═════
export function Reviews() {
  const { data, A: act, me, weekStartStr, today, idx, metrics, settings, toast, confirm, role, nameOf, people, projectsById } = useP(); const [sel, setSel] = useState(null);
  const mine = data.reviews.filter((r) => r.member_id === me).sort((a, b) => b.week_start.localeCompare(a.week_start));
  const current = mine.find((r) => r.week_start === weekStartStr);
  const teamRev = data.reviews.filter((r) => r.member_id !== me && r.visibility === "team" && r.status === "Closed").sort((a, b) => b.week_start.localeCompare(a.week_start));
  const ensure = async () => { if (current) return setSel(current.id); const r = await act.put("reviews", { id: "rev_" + me + "_" + weekStartStr, member_id: me, week_start: weekStartStr, status: "Draft", visibility: "private", rating: null, energy: null, what_worked: "", what_stumbled: "", learned: "", will_change: "", next_week_focus: "", next_week_task_ids: [] }); r && setSel(r.id); };
  const open = sel ? data.reviews.find((r) => r.id === sel) : null;
  return (
    <div>
      <Head title="المراجعات الأسبوعية" sub={`الأسبوع الحالي يبدأ ${fmtShort(weekStartStr)}`} right={role !== "Viewer" && <Btn kind="primary" onClick={ensure}>{current ? (current.status === "Draft" ? "✎ تابع مراجعة هذا الأسبوع" : "عرض مراجعة هذا الأسبوع") : "➕ ابدأ مراجعة هذا الأسبوع"}</Btn>} />
      {!mine.length && <Empty icon="🔁" title="لا مراجعات بعد" sub="مراجعة قصيرة كل أسبوع: ما نجح، ما تعثّر، وما سأغيّره. تبقى خاصة بك افتراضياً." />}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 10 }}>{mine.map((r) => <div key={r.id} onClick={() => setSel(r.id)} style={{ ...S.card, cursor: "pointer", padding: "11px 13px" }}><div style={{ display: "flex", gap: 6, alignItems: "center" }}><b style={{ flex: 1 }}>أسبوع {fmtShort(r.week_start)}</b><Chip color={r.status === "Closed" ? C.ok : C.warn}>{r.status === "Closed" ? "مغلقة" : "مسودة"}</Chip></div><div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{r.rating ? "★".repeat(r.rating) : "—"} · {r.visibility === "team" ? "👥 للفريق" : "🔒 خاصة"}</div></div>)}</div>
      {teamRev.length > 0 && <><div style={{ fontSize: 13, fontWeight: 700, margin: "18px 0 8px" }}>مراجعات شاركها الفريق</div><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 10 }}>{teamRev.map((r) => <div key={r.id} onClick={() => setSel(r.id)} style={{ ...S.card, cursor: "pointer", padding: "11px 13px" }}><b>{nameOf(r.member_id)}</b><div style={{ fontSize: 12, color: C.muted }}>أسبوع {fmtShort(r.week_start)} · {r.rating ? "★".repeat(r.rating) : ""}</div></div>)}</div></>}
      {open && <ReviewEditor r={open} onClose={() => setSel(null)} />}
    </div>
  );
}
function ReviewEditor({ r, onClose }) {
  const { data, A: act, me, idx, metrics, settings, toast, confirm, today, projectsById, nameOf, openTask } = useP(); const own = r.member_id === me; const closed = r.status === "Closed"; const canW = own && !closed;
  const [d, setD] = useState(r); const live = D.reviewLive(r.member_id, r.week_start, { idx, wins: data.wins, sessions: data.sessions, issues: data.issues, risks: data.risks, checkins: data.checkins, projects: data.projects, metrics, settings, today });
  const view = closed && r.snapshot ? r.snapshot : live;
  const leftovers = idx.list.filter((t) => idx.isLeaf(t.id) && t.assignee_id === r.member_id && t.planning_bucket === "This Week" && ["todo", "active"].includes(D.cat(t.status)));
  const save = async (patch) => { const rec = { ...d, ...(patch || {}) }; rec._vis = rec.visibility === "private" ? [r.member_id] : null; const s = await act.put("reviews", rec); if (s) setD(s); return s; };
  async function close() {
    if (!d.rating) return toast("⛔ اختر تقييماً للأسبوع (★)");
    if (leftovers.length && !(await confirm(`عندك ${leftovers.length} مهمة في «هذا الأسبوع» لم تكتمل. ستبقى في هذا الأسبوع الجديد. متابعة؟`))) return;
    const snapshot = { ...live, wins: live.wins.map((w) => w.title), doneTasks: live.doneTasks.map((t) => t.title), at: nowIso() };
    await save({ status: "Closed", closed_at: nowIso(), snapshot }); toast("✅ أُغلقت المراجعة"); onClose();
  }
  return <Modal title={`مراجعة ${nameOf(r.member_id)} — أسبوع ${fmtShort(r.week_start)}`} wide onClose={onClose} footer={<>{canW && <Btn kind="primary" onClick={async () => { await save(); toast("✅ تم الحفظ"); }}>💾 حفظ</Btn>}{canW && <Btn onClick={close}>🔒 إغلاق المراجعة</Btn>}{own && <Btn danger onClick={async () => { await act.del("reviews", r.id, "review"); onClose(); }}>🗑</Btn>}</>}>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 8, marginBottom: 12 }}>
      {[["إنجازات", (view.wins || []).length], ["مهام مكتملة", (view.doneTasks || []).length], ["ساعات العمل", fmtMinutes(view.minutes)], ["متأخرة", view.overdueCount], ["مشاريع حمراء", view.redProjects], ["Check-ins", view.checkins]].map(([l, v]) => <div key={l} style={{ background: "rgba(0,0,0,0.04)", borderRadius: 8, padding: "8px 10px" }}><div style={{ fontSize: 10.5, color: C.muted }}>{l}{closed ? " (لقطة)" : " (حي)"}</div><div style={{ fontSize: 17, fontWeight: 800 }}>{v}</div></div>)}
    </div>
    {(view.wins || []).length > 0 && <div style={{ fontSize: 12.5, marginBottom: 10 }}>🏆 {(view.wins || []).map((w) => (typeof w === "string" ? w : w.title)).join(" · ")}</div>}
    {REVIEW_PROMPTS.map(([k, label]) => <Field key={k} label={label}><textarea disabled={!canW} style={{ ...S.ta, minHeight: 60 }} value={d[k] || ""} onChange={(e) => setD({ ...d, [k]: e.target.value })} /></Field>)}
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
      <Field label="تقييم الأسبوع"><Seg value={d.rating} onChange={(v) => canW && setD({ ...d, rating: v })} options={[1, 2, 3, 4, 5].map((n) => ({ v: n, l: "★".repeat(n) }))} small /></Field>
      <Field label="الطاقة"><Seg value={d.energy} onChange={(v) => canW && setD({ ...d, energy: v })} options={opts(L.energy)} small /></Field>
    </div>
    <Field label="تركيز الأسبوع القادم"><textarea disabled={!canW} style={{ ...S.ta, minHeight: 50 }} value={d.next_week_focus || ""} onChange={(e) => setD({ ...d, next_week_focus: e.target.value })} /></Field>
    {canW && leftovers.length > 0 && <div style={{ fontSize: 12, color: C.dim, marginBottom: 8 }}>مهام الأسبوع الجارية ({leftovers.length}): {leftovers.slice(0, 5).map((t) => t.title).join("، ")}</div>}
    {own && <Field label="الرؤية" hint="الخاصة لا يقرؤها أحد غيرك — حتى المدير أو المالك (يُطبَّق في قاعدة البيانات)."><Seg value={d.visibility} onChange={(v) => setD({ ...d, visibility: v })} options={[{ v: "private", l: "🔒 خاصة" }, { v: "team", l: "👥 للفريق" }]} small /></Field>}
  </Modal>;
}

// ═════ Contacts ═════
export function Contacts() {
  const { data, A: act, today, lookups, people, can, toast, role, projectsById } = useP(); const [form, setForm] = useState(null); const [q, setQ] = useState(""); const [st, setSt] = useState(""); const [roleF, setRoleF] = useState("");
  if (role === "Viewer") return <Empty icon="🔒" title="غير متاح" sub="جهات الاتصال غير متاحة لدور المشاهد." />;
  const list = data.contacts.map((c) => ({ c, s: D.contactStatus(c, today) })).filter(({ c, s }) => (!st || s.status === st) && (!roleF || c.role === roleF) && (!q || (c.name + " " + (c.organization || "")).toLowerCase().includes(q.toLowerCase())));
  const dups = (c) => D.possibleDuplicates(data.contacts, c);
  return (
    <div>
      <Head title="جهات الاتصال" sub="خارجيون فقط — أعضاء الفريق في «الفريق»" right={<Btn kind="primary" onClick={() => setForm({})}>➕ جهة اتصال</Btn>} />
      <SearchBar value={q} onChange={setQ} placeholder="بحث بالاسم أو الجهة…"><select style={{ ...S.sel, width: 130 }} value={roleF} onChange={(e) => setRoleF(e.target.value)}><option value="">كل الأدوار</option>{lookups.contact_role.map((r) => <option key={r}>{r}</option>)}</select><select style={{ ...S.sel, width: 150 }} value={st} onChange={(e) => setSt(e.target.value)}><option value="">كل الحالات</option>{Object.entries(D.CONTACT_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></SearchBar>
      {!list.length ? <Empty icon="📇" title="لا جهات اتصال" /> : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 10 }}>{list.map(({ c, s }) => { const meta = D.CONTACT_META[s.status]; return (
        <div key={c.id} style={{ ...S.card, padding: "11px 13px" }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}><Avatar name={c.name} size={30} /><div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 13.5 }}>{c.name}</div><div style={{ fontSize: 11, color: C.muted }}>{c.role}{c.organization ? " · " + c.organization : ""}</div></div><Chip color={meta.color}>{meta.label}</Chip></div>
          <div style={{ fontSize: 11.5, color: C.dim, marginTop: 6, lineHeight: 1.8 }}>{c.email && <div dir="ltr" style={{ textAlign: "right" }}>✉ {c.email}</div>}{c.phone && <div dir="ltr" style={{ textAlign: "right" }}>☎ {c.phone}</div>}{s.last && <div>آخر تواصل: {fmt(s.last)} ({s.daysSince} يوماً)</div>}{c.follow_up_date && <div style={{ color: c.follow_up_date <= today ? C.bad : C.dim }}>📅 متابعة {fmt(c.follow_up_date)}</div>}{(c.project_ids || []).length > 0 && <div>{(c.project_ids || []).map((id) => (projectsById[id] || {}).name).filter(Boolean).join("، ")}</div>}</div>
          {dups(c).length > 0 && <Chip color={C.warn} style={{ marginTop: 5 }}>⚠ تكرار محتمل: {dups(c).map((x) => x.name).join("، ")}</Chip>}
          <div style={{ display: "flex", gap: 5, marginTop: 8 }}><Btn small onClick={() => act.put("contacts", { ...c, last_contact_at: today })}>تم التواصل اليوم</Btn><Btn small onClick={() => setForm(c)}>✎</Btn><Btn small danger onClick={() => act.del("contacts", c.id, c.name)}>🗑</Btn></div>
        </div>); })}</div>}
      {form && <FormModal title={form.id ? "تعديل جهة الاتصال" : "جهة اتصال جديدة"} wide initial={form} onClose={() => setForm(null)} onSubmit={async (v) => { await act.put("contacts", { ...v, id: v.id || uid() }); setForm(null); toast("✅ تم الحفظ"); }} fields={[
        { key: "name", label: "الاسم", required: true }, { key: "role", label: "الدور", type: "select", options: lookups.contact_role.map((r) => ({ v: r, l: r })), emptyLabel: "—" }, { key: "organization", label: "الجهة" }, { key: "email", label: "البريد", type: "email" }, { key: "phone", label: "الهاتف" },
        { key: "last_contact_at", label: "آخر تواصل", type: "date" }, { key: "follow_up_date", label: "موعد المتابعة", type: "date" }, { key: "project_ids", label: "المشاريع", type: "multi", options: data.projects.filter((p) => !p.is_system).map((p) => ({ v: p.id, l: p.name })) }, { key: "notes", label: "ملاحظات", type: "textarea", rows: 2 }]} />}
    </div>
  );
}

// ═════ Team ═════
export function Team() {
  const { people, data, A: act, today, weekStartStr, idx, nameOf, can, role, me, toast, setPage, ws } = useP(); const [tab, setTab] = useState("members"); const [tf, setTf] = useState(null); const [pf, setPf] = useState(null);
  const profile = (id) => data.profiles.find((p) => p.member_id === id) || {};
  const canAdmin = role === "Owner" || role === "Admin";
  return (
    <div>
      <Head title="الفريق" sub={`${people.length} عضو · ${data.teams.length} فريق`} right={<Btn onClick={() => window.dispatchEvent(new CustomEvent("os:goto", { detail: { view: "team" } }))}>✉️ دعوة عضو (الفريق والصلاحيات)</Btn>} />
      <Tabs value={tab} onChange={setTab} tabs={[{ id: "members", label: "الأعضاء" }, { id: "teams", label: "الفرق", count: data.teams.length }, { id: "load", label: "حِمل الأسبوع" }]} />
      {tab === "members" && <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 10 }}>{people.map((p) => { const pr = profile(p.id); const leads = data.projects.filter((x) => x.lead_id === p.id && !x.is_system && !x.archived_at).length; return <div key={p.id} style={{ ...S.card, padding: "11px 13px" }}><div style={{ display: "flex", gap: 8, alignItems: "center" }}><Avatar name={p.name} size={34} /><div style={{ flex: 1 }}><div style={{ fontWeight: 700 }}>{p.name}{p.id === me ? " (أنا)" : ""}</div><div style={{ fontSize: 11, color: C.muted }}>{pr.job_title || "—"}{pr.employment ? " · " + L.employment[pr.employment] : ""}</div></div>{canAdmin && <Btn small onClick={() => setPf({ member_id: p.id, ...pr })}>✎</Btn>}</div><div style={{ fontSize: 11.5, color: C.dim, marginTop: 6 }}>يقود {leads} مشروع · {idx.list.filter((t) => t.assignee_id === p.id && ["todo", "active"].includes(D.cat(t.status)) && idx.isLeaf(t.id)).length} مهمة مفتوحة{pr.weekly_capacity_hours ? ` · سعة ${pr.weekly_capacity_hours}س/أسبوع` : ""}</div></div>; })}</div>}
      {tab === "teams" && <div>{canAdmin && <div style={{ marginBottom: 10 }}><Btn kind="primary" small onClick={() => setTf({})}>➕ فريق</Btn></div>}{!data.teams.length ? <Empty icon="👥" title="لا فرق" sub="جمّع الأعضاء في فرق (مثل: التصميم، التطوير)." /> : data.teams.map((t) => <div key={t.id} style={{ ...S.card, marginBottom: 8 }}><div style={{ display: "flex", gap: 8, alignItems: "center" }}><b style={{ flex: 1 }}>👥 {t.name}</b>{canAdmin && <><Btn small onClick={() => setTf(t)}>✎</Btn><Btn small danger onClick={() => act.del("teams", t.id, t.name)}>🗑</Btn></>}</div><div style={{ fontSize: 12, color: C.dim, marginTop: 4 }}>{(t.member_ids || []).map(nameOf).join("، ") || "—"}{t.lead_id ? ` · القائد ${nameOf(t.lead_id)}` : ""}</div></div>)}</div>}
      {tab === "load" && <div style={S.card}>{people.map((p) => { const w = D.memberWorkload(p.id, weekStartStr, { idx }); const cap = (profile(p.id).weekly_capacity_hours || 0) * 60; return <div key={p.id} style={{ display: "grid", gridTemplateColumns: "140px 1fr 150px", gap: 8, alignItems: "center", padding: "6px 0", fontSize: 12.5 }}><span>{p.name}</span><Progress value={cap ? Math.min(1, w.minutes / cap) : null} color={cap && w.minutes > cap ? C.bad : undefined} /><span style={{ color: C.dim }}>{w.tasks.length} مهمة · {fmtMinutes(w.minutes)}{cap ? ` / ${fmtMinutes(cap)}` : ""}</span></div>; })}</div>}
      {tf && <FormModal title={tf.id ? "تعديل الفريق" : "فريق جديد"} initial={tf} onClose={() => setTf(null)} onSubmit={async (v) => { await act.put("teams", { ...v, id: v.id || uid() }); setTf(null); }} fields={[{ key: "name", label: "اسم الفريق", required: true }, { key: "lead_id", label: "القائد", type: "select", options: mOpts(people) }, { key: "member_ids", label: "الأعضاء", type: "multi", options: mOpts(people) }]} />}
      {pf && <FormModal title="ملف العضو" initial={pf} onClose={() => setPf(null)} onSubmit={async (v) => { await act.put("profiles", { ...v, id: "prof_" + v.member_id }); setPf(null); }} fields={[{ key: "job_title", label: "المسمى" }, { key: "employment", label: "نوع التوظيف", type: "select", options: opts(L.employment), emptyLabel: "—" }, { key: "weekly_capacity_hours", label: "السعة الأسبوعية (ساعات)", type: "number", min: 0 }]} />}
    </div>
  );
}

// ═════ Templates ═════
const flattenTaskTree = (nodes, depth = 0) => (nodes || []).flatMap((n) => [`${"  ".repeat(depth)}${n.title || ""}${n.estimate_minutes ? " | " + n.estimate_minutes : ""}`, ...flattenTaskTree(n.children || [], depth + 1)]);
function parseTaskTreeText(value) {
  const roots = []; const stack = [];
  for (const raw of String(value || "").split("\n")) {
    if (!raw.trim()) continue;
    const indent = (raw.match(/^[ \t]*/) || [""])[0].replace(/\t/g, "  ").length;
    const depth = Math.floor(indent / 2); const [titlePart, estimatePart] = raw.trim().split(/\s+\|\s+/);
    const node = { title: titlePart.trim(), children: [] };
    if (estimatePart && Number.isFinite(Number(estimatePart))) node.estimate_minutes = Math.max(0, Number(estimatePart));
    if (depth === 0 || !stack[depth - 1]) roots.push(node); else stack[depth - 1].children.push(node);
    stack[depth] = node; stack.length = depth + 1;
  }
  const clean = (nodes) => nodes.map((n) => ({ ...n, ...(n.estimate_minutes == null ? {} : { estimate_minutes: n.estimate_minutes }), children: clean(n.children) }));
  return clean(roots);
}
function validateTaskTreeText(value) {
  const lines = String(value || "").split("\n").map((raw) => ({ raw, text: raw.trim() })).filter((x) => x.text);
  let previousDepth = 0;
  for (let i = 0; i < lines.length; i++) {
    const { raw, text } = lines[i];
    const prefix = (raw.match(/^[ \t]*/) || [""])[0].replace(/\t/g, "  ");
    if (prefix.length % 2 !== 0) return `السطر ${i + 1}: استخدم مسافتين لكل مستوى فرعي.`;
    const depth = prefix.length / 2;
    if (i === 0 && depth !== 0) return "ابدأ شجرة المهام بمهمة رئيسية دون مسافات في أول سطر.";
    if (i > 0 && depth > previousDepth + 1) return `السطر ${i + 1}: لا يمكن تخطي مستوى كامل؛ أضف المهمة الأب أولاً.`;
    const [title, estimate] = text.split(/\s+\|\s+/);
    if (!title || !title.trim()) return `السطر ${i + 1}: عنوان المهمة مطلوب.`;
    if (estimate !== undefined && (!/^\d+(\.\d+)?$/.test(estimate.trim()) || Number(estimate) < 0)) return `السطر ${i + 1}: التقدير بعد | يجب أن يكون رقمًا موجبًا أو صفرًا.`;
    previousDepth = depth;
  }
  return null;
}
const flattenRisks = (risks) => (risks || []).map((r) => `${r.title || ""}${r.mitigation ? " — " + r.mitigation : ""}`).join("\n");
function parseRiskText(value) { return String(value || "").split("\n").map((line) => line.trim()).filter(Boolean).map((line) => { const [title, ...rest] = line.split(/\s[—-]\s/); return { title: title.trim(), probability: 3, impact: 3, status: "Open", mitigation: rest.join(" — ").trim() }; }); }
export function Templates() {
  const { templates, data, A: act, can, toast, role } = useP(); const [use, setUse] = useState(null); const [tab, setTab] = useState("projects"); const [templateForm, setTemplateForm] = useState(null); const [previewTpl, setPreviewTpl] = useState(null); const [showArchived, setShowArchived] = useState(false); const canManage = can("project.create") && role !== "Viewer";
  const beginTemplateForm = (tpl = {}) => setTemplateForm({ id: tpl.id, name: tpl.name || "", description: tpl.description || "", project_type: tpl.project_type || "", duration_days: tpl.duration_days || "", task_tree_text: flattenTaskTree(tpl.task_tree || []).join("\n"), risks_text: flattenRisks(tpl.risks || []) });
  const countN = (n) => n.reduce((a, x) => a + 1 + countN(x.children || []), 0);
  const show = (nodes, depth = 0) => nodes.map((n, i) => <div key={depth + "-" + i + n.title} style={{ paddingInlineStart: depth * 16, fontSize: 12, color: C.dim, lineHeight: 1.8 }}>{depth ? "└ " : "• "}{n.title}{n.estimate_minutes ? ` (${fmtMinutes(n.estimate_minutes)})` : ""}{n.children && show(n.children, depth + 1)}</div>);
  return (
    <div>
      <Head title="القوالب" sub="قوالب المشاريع بشجرة مهام ومخاطر · قوالب المواصفات والتحديثات والاجتماعات" />
      <Tabs value={tab} onChange={setTab} tabs={[{ id: "projects", label: "قوالب المشاريع", count: templates.length }, { id: "prd", label: "قالب المواصفة" }, { id: "update", label: "قالب التحديث" }, { id: "review", label: "قالب المراجعة" }, { id: "meetings", label: "قوالب الاجتماعات" }]} />
      {tab === "projects" && <div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
          {canManage && <Btn kind="primary" onClick={() => beginTemplateForm()}>＋ إنشاء قالب مخصص</Btn>}
          <Btn onClick={() => setShowArchived(!showArchived)}>{showArchived ? "عرض القوالب النشطة" : "عرض المؤرشفة"}</Btn>
          <span style={{ fontSize: 11.5, color: C.muted }}>القوالب المدمجة للنسخ والتخصيص؛ القوالب المرجعية للاجتماعات لا تنشئ اجتماعات.</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 10 }}>{templates.filter((t) => !!t.archived_at === showArchived).map((t) => <div key={t.id} style={{ ...S.card, padding: "12px 14px", opacity: t.archived_at ? .72 : 1 }}><div style={{ display: "flex", gap: 6, alignItems: "center" }}><b style={{ flex: 1, fontSize: 14 }}>🧩 {t.name}</b>{t.builtin && <Chip>مدمج — للنسخ</Chip>}{t.archived_at && <Chip color={C.muted}>مؤرشف</Chip>}</div><div style={{ fontSize: 12, color: C.dim, margin: "4px 0" }}>{t.description}</div><div style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>{countN(t.task_tree || [])} مهمة · {(t.risks || []).length} خطر · {t.duration_days || "—"} يوم</div><div style={{ maxHeight: 130, overflowY: "auto", marginBottom: 8 }}>{show(t.task_tree || [])}</div><div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{!t.archived_at && can("project.create") && <Btn kind="primary" small onClick={() => setPreviewTpl(t)}>معاينة</Btn>}{!t.archived_at && can("project.create") && <Btn small onClick={() => setUse(t)}>استخدام</Btn>}{canManage && t.builtin && <Btn small onClick={() => beginTemplateForm({ ...t, id: undefined, name: t.name + " — نسخة مخصصة", builtin: false })}>نسخ وتخصيص</Btn>}{canManage && !t.builtin && !t.archived_at && <Btn small onClick={() => beginTemplateForm(t)}>تعديل</Btn>}{canManage && !t.builtin && !t.archived_at && <Btn small onClick={() => act.put("templates", { ...t, archived_at: nowIso() }).then(() => toast("تمت أرشفة القالب"))}>أرشفة</Btn>}{canManage && !t.builtin && t.archived_at && <Btn small onClick={() => { const { archived_at, ...rest } = t; act.put("templates", rest).then(() => toast("تمت استعادة القالب")); }}>استعادة</Btn>}</div></div>)}</div>
        {!templates.some((t) => !!t.archived_at === showArchived) && <Empty icon="🧩" title={showArchived ? "لا توجد قوالب مؤرشفة" : "لا توجد قوالب هنا"} sub={canManage ? "أنشئ قالباً مخصصاً أو انسخ قالباً مدمجاً." : "قد لا تملك صلاحية إدارة القوالب."} />}
      </div>}
      {tab === "prd" && <div style={S.card}>{PRD_TEMPLATE.map((s) => <div key={s.key} style={{ padding: "6px 0", borderBottom: `1px solid ${C.line}` }}><b style={{ fontSize: 13 }}>{s.group} — {s.title}</b>{s.required && <Chip color={C.bad} style={{ marginInlineStart: 6 }}>مطلوب للاعتماد</Chip>}<div style={{ fontSize: 11.5, color: C.muted }}>{s.hint}</div></div>)}</div>}
      {tab === "update" && <div style={S.card}>{UPDATE_SECTIONS.map((s) => <div key={s.key} style={{ padding: "6px 0", fontSize: 13 }}>• {s.title}</div>)}<div style={{ fontSize: 11.5, color: C.muted, marginTop: 6 }}>يُولَّد المسودة من الإنجازات والمهام والمخاطر والأرقام الحية.</div></div>}
      {tab === "review" && <div style={S.card}>{REVIEW_PROMPTS.map(([, l]) => <div key={l} style={{ padding: "5px 0", fontSize: 13 }}>• {l}</div>)}<div style={{ padding: "5px 0", fontSize: 13 }}>• تركيز الأسبوع القادم · ⭐ التقييم · الطاقة</div><div style={{ fontSize: 11.5, color: C.muted, marginTop: 6 }}>أقسام حيّة (إنجازات، ساعات، متأخر…) تُجمَّد كلقطة عند إغلاق المراجعة. تُنشأ مسودة تلقائياً كل أسبوع.</div></div>}
      {tab === "meetings" && <div><div style={{ ...S.card, marginBottom: 10, fontSize: 12.5, lineHeight: 1.9 }}>📌 الاجتماعات يملكها <b>Knowledge OS</b> وتُنشأ وتُدار هناك؛ هذه القوالب للمرجع. عند بناء Knowledge OS ستظهر اجتماعات كل مشروع هنا (قراءة فقط) وتتحوّل بنود الإجراءات إلى مهام.</div><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(250px,1fr))", gap: 10 }}>{MEETING_TEMPLATES.map((m) => <div key={m.name} style={{ ...S.card, padding: "10px 12px" }}><b>{m.name}</b>{m.sections.map((s) => <div key={s} style={{ fontSize: 12, color: C.dim }}>• {s}</div>)}</div>)}</div></div>}
      {previewTpl && <Modal title={`معاينة القالب: ${previewTpl.name}`} wide onClose={() => setPreviewTpl(null)} footer={<><Btn onClick={() => setPreviewTpl(null)}>رجوع</Btn><Btn kind="primary" onClick={() => { setUse(previewTpl); setPreviewTpl(null); }}>استخدام هذا القالب</Btn></>}><div style={{ lineHeight: 1.9 }}><p>{previewTpl.description || "لا يوجد وصف."}</p><b>{countN(previewTpl.task_tree || [])} مهمة · {(previewTpl.risks || []).length} خطر · المدة التقديرية {previewTpl.duration_days || "—"} يوماً</b><div style={{ marginTop: 8 }}>{show(previewTpl.task_tree || [])}</div><div style={{ marginTop: 10, fontSize: 12, color: C.muted }}>المعاينة لا تنشئ أي سجلات. تواريخ التنفيذ وحالات المهام الفعلية لا تُنسخ من القالب.</div></div></Modal>}
      {templateForm && <FormModal title={templateForm.id ? "تعديل قالب مخصص" : "إنشاء قالب مخصص"} wide initial={templateForm} onClose={() => setTemplateForm(null)} onSubmit={async (v) => {
        const treeError = validateTaskTreeText(v.task_tree_text); if (treeError) throw new Error(treeError);
        const tree = parseTaskTreeText(v.task_tree_text);
        const risks = parseRiskText(v.risks_text);
        const rec = { id: v.id || uid(), name: String(v.name || "").trim(), description: v.description || "", project_type: v.project_type || "أخرى", duration_days: v.duration_days ? Number(v.duration_days) : null, task_tree: tree, risks, builtin: false, updated_at: nowIso() };
        if (!rec.name) throw new Error("اسم القالب مطلوب");
        await act.put("templates", rec); toast("✅ تم حفظ القالب المخصص؛ المشاريع السابقة لن تتغير."); setTemplateForm(null);
      }} fields={[
        { key: "name", label: "اسم القالب", required: true, span: 2 }, { key: "description", label: "الوصف", type: "textarea", rows: 2 },
        { key: "project_type", label: "نوع المشروع" }, { key: "duration_days", label: "المدة التقديرية (أيام)", type: "number", min: 1 },
        { key: "task_tree_text", label: "شجرة المهام", type: "textarea", rows: 9, hint: "كل سطر مهمة. استخدم مسافتين لكل مستوى فرعي. مثال:\nالبحث\n  مقابلات المستخدمين | 120\n  تحليل المنافسين\nالتنفيذ\n  التطوير\n  الاختبار. الرقم بعد | هو تقدير بالدقائق." },
        { key: "risks_text", label: "المخاطر الافتراضية", type: "textarea", rows: 4, hint: "سطر لكل خطر، ويمكن إضافة خطة التخفيف بعد — . الاحتمال والتأثير الافتراضيان 3 من 5." }
      ]}>
        {(v) => {
          const treeError = validateTaskTreeText(v.task_tree_text);
          const tree = treeError ? [] : parseTaskTreeText(v.task_tree_text);
          return <div style={{ gridColumn: "1 / -1", marginTop: 8, padding: 10, border: "1px solid " + C.line, borderRadius: 8 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 6 }}>
              <b style={{ fontSize: 12.5 }}>معاينة شجرة المهام قبل الحفظ</b>
              <Chip color={treeError ? C.bad : C.ok}>{treeError || (countN(tree) + " مهمة")}</Chip>
            </div>
            {treeError ? <div style={{ fontSize: 11.5, color: C.bad }}>صحّح تنسيق المستويات قبل الحفظ. استخدم مسافتين لكل مستوى فرعي.</div> : tree.length ? <div style={{ maxHeight: 220, overflowY: "auto" }}>{show(tree)}</div> : <Empty icon="🧩" title="أضف أول مهمة" sub="اكتب المهام بالترتيب، واستخدم مسافتين لكل مستوى فرعي." />}
          </div>;
        }}
      </FormModal>}
      {use && <TemplatePicker tpl={use} onClose={() => setUse(null)} />}
    </div>
  );
}

// ═════ Meetings (owned by Knowledge OS) ═════
export function Meetings() {
  const { data, setPage } = useP();
  return <div><Head title="الاجتماعات" sub="يملكها Knowledge OS" /><div style={{ ...S.card, padding: 24, textAlign: "center" }}><div style={{ fontSize: 36 }}>🗓️</div><div style={{ fontSize: 15, fontWeight: 700, margin: "6px 0" }}>الاجتماعات تُدار في Knowledge OS</div><div style={{ fontSize: 12.5, color: C.dim, lineHeight: 1.9, maxWidth: 520, margin: "0 auto" }}>لتجنّب التكرار، لا يُنشئ Projects OS كياناً للاجتماعات. عند تفعيل Knowledge OS ستظهر هنا اجتماعات كل مشروع (قراءة فقط) وبنود الإجراءات منها كمهام مقترحة. تجد قوالب Standup / Weekly Sync / Sprint Planning / Post-mortem / Ad Hoc في «القوالب».</div><div style={{ marginTop: 12 }}><Btn onClick={() => setPage("templates")}>عرض قوالب الاجتماعات</Btn></div></div></div>;
}

// ═════ Settings ═════
export function Settings() {
  const { settings, lookups, A: act, toast, role, trash, nameOf, data, ws, recs, confirm } = useP(); const [tab, setTab] = useState("general"); const [s, setS] = useState(settings); const [lk, setLk] = useState(lookups);
  const admin = role === "Owner" || role === "Admin"; const dis = !admin;
  const num = (k) => (e) => setS({ ...s, [k]: e.target.value === "" ? "" : Number(e.target.value) });
  const row = (label, el, hint) => <Field label={label} hint={hint}>{el}</Field>;
  async function exportJson() { const out = { exported_at: nowIso(), workspace: ws.id, system: "projects", collections: Object.fromEntries(Object.entries(recs).map(([c, m]) => [c, Object.values(m)])) }; const blob = new Blob([JSON.stringify(out, null, 2)], { type: "application/json" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "projects-os-export.json"; a.click(); }
  return (
    <div>
      <Head title="الإعدادات" sub="" />
      <Tabs value={tab} onChange={setTab} tabs={[{ id: "general", label: "عام" }, { id: "health", label: "العتبات والتتبّع" }, { id: "auto", label: "الأتمتة" }, { id: "lookups", label: "القوائم" }, { id: "trash", label: "السلة", count: trash.length }, { id: "data", label: "البيانات" }]} />
      {tab === "general" && <div style={{ ...S.card, maxWidth: 560 }}>
        {row("المنطقة الزمنية", <input disabled={dis} style={{ ...S.inp, direction: "ltr", textAlign: "right" }} value={s.timezone} onChange={(e) => setS({ ...s, timezone: e.target.value })} />, "مثل Africa/Cairo — تحدد «اليوم» وحدود الأسبوع")}
        {row("بداية الأسبوع", <select disabled={dis} style={S.sel} value={s.weekStartDay} onChange={(e) => setS({ ...s, weekStartDay: Number(e.target.value) })}>{["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"].map((d, i) => <option key={i} value={i}>{d}</option>)}</select>)}
        {row("وقت التذكير الافتراضي", <input disabled={dis} type="time" style={S.inp} value={s.defaultReminderTime} onChange={(e) => setS({ ...s, defaultReminderTime: e.target.value })} />)}
        {row("أقصى مدة للمؤقّت قبل التنبيه (ساعات)", <input disabled={dis} type="number" style={S.inp} value={s.timerMaxHours} onChange={num("timerMaxHours")} />)}
        {row("تنبيه الاستحقاق قبل (أيام)", <input disabled={dis} type="number" min="0" style={S.inp} value={s.dueSoonDays} onChange={num("dueSoonDays")} />)}
        <label style={{ fontSize: 12.5, display: "flex", gap: 8, alignItems: "center" }}><input disabled={dis} type="checkbox" checked={!!s.cyclesEnabled} onChange={(e) => setS({ ...s, cyclesEnabled: e.target.checked })} />تفعيل وحدة الدورات (Sprints) — اختيارية <Chip>قريباً</Chip></label>
      </div>}
      {tab === "health" && <div style={{ ...S.card, maxWidth: 560 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
          {row("أيام التحذير الأصفر قبل الموعد", <input disabled={dis} type="number" style={S.inp} value={s.yellowDays} onChange={num("yellowDays")} />)}{row("تقدّم أدنى (0–1)", <input disabled={dis} type="number" step="0.05" min="0" max="1" style={S.inp} value={s.yellowProgress} onChange={num("yellowProgress")} />)}
          {row("درجة الخطر العالي (≥)", <input disabled={dis} type="number" style={S.inp} value={s.riskHigh} onChange={num("riskHigh")} />)}{row("درجة الخطر المتوسط (≥)", <input disabled={dis} type="number" style={S.inp} value={s.riskMedium} onChange={num("riskMedium")} />)}
          {row("نسبة التأخر ‘على المسار’", <input disabled={dis} type="number" step="0.01" style={S.inp} value={s.paceOnTrack} onChange={num("paceOnTrack")} />)}{row("نسبة التأخر ‘معرّض للخطر’", <input disabled={dis} type="number" step="0.01" style={S.inp} value={s.paceAtRisk} onChange={num("paceAtRisk")} />)}
        </div>
        {row("سياسة التتبّع (مهام ← مواصفة/اكتشاف)", <select disabled={dis} style={S.sel} value={s.traceabilityPolicy} onChange={(e) => setS({ ...s, traceabilityPolicy: e.target.value })}><option value="off">مُعطّلة</option><option value="warn">تحذير فقط</option><option value="require">إلزامية</option></select>)}
        {s.traceabilityPolicy === "require" && row("أنواع المشاريع الملزِمة", <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{lookups.project_type.map((t) => <label key={t} style={{ fontSize: 12, display: "flex", gap: 4 }}><input disabled={dis} type="checkbox" checked={(s.traceabilityTypes || []).includes(t)} onChange={(e) => setS({ ...s, traceabilityTypes: e.target.checked ? [...(s.traceabilityTypes || []), t] : (s.traceabilityTypes || []).filter((x) => x !== t) })} />{t}</label>)}</div>)}
        {row("أيام قبل اعتبار عنصر الوارد قديماً", <input disabled={dis} type="number" style={S.inp} value={s.inboxStaleDays} onChange={num("inboxStaleDays")} />)}
      </div>}
      {tab === "auto" && <div style={{ ...S.card, maxWidth: 560 }}>{[["reviewDraft", "مسودة المراجعة الأسبوعية تلقائياً"], ["dueReminders", "تنبيهات اقتراب الاستحقاق"], ["overdueDigest", "ملخص المتأخر"], ["healthAlerts", "تنبيه تغيّر صحة المشاريع"], ["staleInbox", "تنبيه الوارد القديم"], ["krCheckin", "تذكير Check-in أسبوعي للنتائج الرئيسية"], ["timerLong", "تنبيه المؤقّت الطويل"], ["winSuggest", "اقتراح إنجازات من المهام المكتملة"], ["pioSuggest", "اقتراح عناصر اكتشاف"]].map(([k, l]) => <label key={k} style={{ display: "flex", gap: 8, alignItems: "center", padding: "6px 0", fontSize: 13 }}><input disabled={dis} type="checkbox" checked={(s.automations || {})[k] !== false} onChange={(e) => setS({ ...s, automations: { ...(s.automations || {}), [k]: e.target.checked } })} />{l}</label>)}<div style={{ fontSize: 11, color: C.muted, marginTop: 8 }}>التنبيهات تظهر داخل التطبيق (اليوم + الجرس). إرسال Push/إيميل والتطبيق مغلق يُضاف لاحقاً.</div></div>}
      {tab === "lookups" && <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 10 }}>{Object.keys(DEFAULT_LOOKUPS).map((k) => <div key={k} style={S.card}><b style={{ fontSize: 13 }}>{LOOKUP_LABEL[k]}</b><div style={{ margin: "8px 0", display: "flex", gap: 5, flexWrap: "wrap" }}>{lk[k].map((v) => <Chip key={v}>{v}{admin && <button onClick={() => setLk({ ...lk, [k]: lk[k].filter((x) => x !== v) })} style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", padding: 0 }}>×</button>}</Chip>)}</div>{admin && <input style={S.inp} placeholder="أضف قيمة ثم Enter" onKeyDown={(e) => { if (e.key === "Enter" && e.target.value.trim()) { setLk({ ...lk, [k]: [...lk[k], e.target.value.trim()] }); e.target.value = ""; } }} />}</div>)}</div>}
      {tab === "trash" && (!trash.length ? <Empty icon="🗑" title="السلة فارغة" /> : <div style={{ ...S.card, padding: "4px 14px" }}>{trash.sort((a, b) => (b.rec.deleted_at || "").localeCompare(a.rec.deleted_at || "")).map(({ coll, rec }) => <div key={coll + rec.id} style={{ display: "flex", gap: 8, alignItems: "center", padding: "7px 0", borderBottom: `1px solid ${C.line}`, fontSize: 13 }}><Chip>{coll}</Chip><span style={{ flex: 1 }}>{rec.name || rec.title || rec.id}</span><span style={{ fontSize: 11, color: C.muted }}>{fmt((rec.deleted_at || "").slice(0, 10))}</span>{role !== "Viewer" && <Btn small onClick={() => act.restoreTrashRecord(coll, rec)}>♻️ استرجاع</Btn>}{coll === "projects" && role === "Owner" && <Btn small kind="danger" onClick={() => act.permanentlyDeleteProject(rec)}>حذف نهائي</Btn>}</div>)}</div>)}
      {tab === "data" && <div style={{ ...S.card, maxWidth: 560, fontSize: 13, lineHeight: 2 }}>تصدير كل بيانات Projects OS بصيغة JSON.<div style={{ marginTop: 8 }}><Btn onClick={exportJson}>⬇ تصدير JSON</Btn></div></div>}
      {(tab === "general" || tab === "health" || tab === "auto") && admin && <div style={{ marginTop: 12 }}><Btn kind="primary" onClick={async () => { await act.saveSettings(s); toast("✅ حُفظت الإعدادات"); }}>💾 حفظ الإعدادات</Btn></div>}
      {tab === "lookups" && admin && <div style={{ marginTop: 12 }}><Btn kind="primary" onClick={async () => { await act.saveLookups(lk); toast("✅ حُفظت القوائم"); }}>💾 حفظ القوائم</Btn></div>}
      {!admin && <div style={{ fontSize: 11.5, color: C.muted, marginTop: 10 }}>التعديل متاح للمالك والمدير فقط.</div>}
    </div>
  );
}
