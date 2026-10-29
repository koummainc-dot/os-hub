import React, { useState, useMemo } from "react";
import { A, S } from "../../core/ui.jsx";
import { C, Btn, Chip, Head, Stat, Empty, Progress, Seg, Board, SearchBar, Tabs, FormModal, Modal, Field } from "../../core/kit.jsx";
import { fmt, fmtShort, fmtMinutes, addDays, diffDays, monthDays, MONTH_NAMES, dow, dateOf } from "../../core/dates.js";
import { uid } from "../../core/records.jsx";
import { useP } from "./store.jsx";
import * as D from "./domain.js";
import { L, opts, STATUS_COLOR } from "./lookups.js";
import { HealthBadge, StatusChip, PriorityChip, Who, ProjectName, ProjectForm, TaskTree, mOpts } from "./parts.jsx";
import { OutputsView, RisksView, IssuesView, DecisionsView, PrdsView } from "./entities.jsx";

export function Projects() {
  const { data, metrics, view, setView, can, A: act, templates, toast, people, openProject, today, settings, trash } = useP();
  const [mode, setMode] = useState("table"); const [q, setQ] = useState(""); const [st, setSt] = useState("active"); const [type, setType] = useState(""); const [lead, setLead] = useState(""); const [health, setHealth] = useState(""); const [form, setForm] = useState(null); const [tplPick, setTplPick] = useState(false); const [month, setMonth] = useState(today.slice(0, 7));
  if (view.projectId) return <ProjectDetail />;
  const real = data.projects.filter((p) => !p.is_system);
  const list = real.filter((p) => (st === "all" ? true : st === "archived" ? !!p.archived_at : st === "active" ? !p.archived_at && !["Completed", "Cancelled"].includes(p.status) : p.status === st && !p.archived_at))
    .filter((p) => !type || p.type === type).filter((p) => !lead || p.lead_id === lead).filter((p) => !health || (metrics[p.id] && metrics[p.id].health === health)).filter((p) => !q || p.name.toLowerCase().includes(q.toLowerCase()));
  const types = [...new Set(real.map((p) => p.type).filter(Boolean))];
  const [y, m] = month.split("-").map(Number);
  const dated = list.filter((p) => p.start_date || p.target_date);
  const minD = dated.reduce((a, p) => ((p.start_date || p.target_date) < a ? p.start_date || p.target_date : a), "9999-12-31"); const maxD = dated.reduce((a, p) => ((p.target_date || p.start_date) > a ? p.target_date || p.start_date : a), "0000-01-01");
  const span = dated.length ? Math.max(30, diffDays(maxD, minD) + 14) : 30;
  const pos = (d) => (Math.max(0, diffDays(d, minD)) / span) * 100;
  return (
    <div>
      <Head title="المشاريع" sub={`${list.length} مشروع`} right={<>
        <Seg value={mode} onChange={setMode} options={[{ v: "table", l: "جدول" }, { v: "board", l: "لوحة" }, { v: "timeline", l: "خط زمني" }, { v: "calendar", l: "تقويم" }]} />
        {can("project.create") && <><Btn onClick={() => setTplPick(true)}>🧩 من قالب</Btn><Btn kind="primary" onClick={() => setForm({})}>➕ مشروع</Btn></>}</>} />
      <SearchBar value={q} onChange={setQ} placeholder="بحث باسم المشروع…">
        <select style={{ ...S.sel, width: 140 }} value={st} onChange={(e) => setSt(e.target.value)}><option value="active">الجارية</option><option value="all">الكل</option>{opts(L.projectStatus).filter((o) => o.v !== "Archived").map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}<option value="archived">المؤرشفة</option></select>
        <select style={{ ...S.sel, width: 120 }} value={type} onChange={(e) => setType(e.target.value)}><option value="">كل الأنواع</option>{types.map((t) => <option key={t}>{t}</option>)}</select>
        <select style={{ ...S.sel, width: 140 }} value={lead} onChange={(e) => setLead(e.target.value)}><option value="">كل القادة</option>{people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
        <select style={{ ...S.sel, width: 120 }} value={health} onChange={(e) => setHealth(e.target.value)}><option value="">كل الصحة</option>{["Red", "Orange", "Yellow", "Green"].map((h) => <option key={h} value={h}>{D.HEALTH_META[h].label}</option>)}</select>
      </SearchBar>
      {!list.length && <Empty icon="📁" title="لا مشاريع مطابقة" sub="أنشئ مشروعاً جديداً أو ابدأ من قالب جاهز (تطبيق، محتوى، براند)." action={<div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>{(q || st !== "active" || type || lead || health) && <Btn onClick={() => { setQ(""); setSt("active"); setType(""); setLead(""); setHealth(""); }}>مسح البحث والفلاتر</Btn>}{can("project.create") && <Btn kind="primary" onClick={() => setTplPick(true)}>🧩 ابدأ من قالب</Btn>}</div>} />}
      {mode === "table" && list.length > 0 && (
        <div style={{ ...S.card, padding: 0, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, minWidth: 760 }}>
            <thead><tr style={{ background: "rgba(0,0,0,0.03)", textAlign: "right" }}>{["المشروع", "الحالة", "الصحة", "التقدم", "الموعد", "القائد", "الأولوية"].map((h) => <th key={h} style={{ padding: "8px 10px", fontSize: 11, color: C.muted, fontWeight: 700 }}>{h}</th>)}</tr></thead>
            <tbody>{list.map((p) => { const mt = metrics[p.id]; return (
              <tr key={p.id} onClick={() => openProject(p.id)} style={{ cursor: "pointer", borderTop: `1px solid ${C.line}` }}>
                <td style={{ padding: "9px 10px", fontWeight: 700 }}>{p.name}{p.visibility === "private" && <span title="خاص"> 🔒</span>}<div style={{ fontSize: 10.5, color: C.muted, fontWeight: 400 }}>{p.type}</div></td>
                <td style={{ padding: "9px 10px" }}><StatusChip s={p.archived_at ? "Archived" : p.status} /></td><td style={{ padding: "9px 10px" }}><HealthBadge m={mt} /></td>
                <td style={{ padding: "9px 10px", minWidth: 120 }}><Progress value={mt.progress} /></td>
                <td style={{ padding: "9px 10px", fontSize: 11.5, color: mt.daysRemaining != null && mt.daysRemaining < 0 ? C.bad : C.dim }}>{p.target_date ? fmtShort(p.target_date) : "—"}</td>
                <td style={{ padding: "9px 10px" }}><Who id={p.lead_id} size={18} /></td><td style={{ padding: "9px 10px" }}><PriorityChip p={p.priority} /></td></tr>); })}</tbody>
          </table>
        </div>)}
      {mode === "board" && list.length > 0 && <Board columns={["Idea", "Planned", "In Progress", "On Hold", "Completed", "Cancelled", "Archived"].map((s) => ({ id: s, label: L.projectStatus[s], color: STATUS_COLOR[s], items: list.filter((p) => s === "Archived" ? !!p.archived_at : !p.archived_at && p.status === s) }))} onMove={(id, to) => { const p = data.projects.find((x) => x.id === id); if (p && can("project.edit", p)) act.setProjectStatus(p, to); }} renderCard={(p) => { const mt = metrics[p.id]; return <div onClick={() => openProject(p.id)} style={{ ...S.card, padding: "9px 11px", cursor: "pointer" }}><div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{p.name}</div><div style={{ display: "flex", gap: 5, alignItems: "center", marginBottom: 5 }}><HealthBadge m={mt} /><PriorityChip p={p.priority} /></div><Progress value={mt.progress} /><div style={{ fontSize: 10.5, color: C.muted, marginTop: 4 }}>{p.target_date ? "📅 " + fmtShort(p.target_date) : ""}</div></div>; }} />}
      {mode === "timeline" && list.length > 0 && (
        <div style={{ ...S.card, overflowX: "auto" }}><div style={{ minWidth: 640 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: C.muted, marginBottom: 6 }}><span>{fmtShort(minD)}</span><span>{fmtShort(addDays(minD, span))}</span></div>
          {[...dated].sort((a, b) => (a.start_date || a.target_date).localeCompare(b.start_date || b.target_date)).map((p) => { const a = p.start_date || p.target_date; const b = p.target_date || p.start_date; const left = pos(a); const width = Math.max(1.5, pos(b) - left); const mt = metrics[p.id]; const hc = D.HEALTH_META[mt.health].color; return (
            <div key={p.id} style={{ display: "grid", gridTemplateColumns: "150px 1fr", gap: 8, alignItems: "center", marginBottom: 6 }}>
              <div onClick={() => openProject(p.id)} style={{ fontSize: 12, fontWeight: 600, cursor: "pointer", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
              <div style={{ position: "relative", height: 22, background: "rgba(0,0,0,0.04)", borderRadius: 5 }}>
                <div onClick={() => openProject(p.id)} title={`${fmt(a)} → ${fmt(b)}`} style={{ position: "absolute", insetInlineStart: left + "%", width: width + "%", height: "100%", background: hc + "33", border: `1px solid ${hc}`, borderRadius: 5, cursor: "pointer", overflow: "hidden" }}><div style={{ width: (mt.progress || 0) * 100 + "%", height: "100%", background: hc + "66" }} /></div>
                {today >= minD && today <= addDays(minD, span) && <div style={{ position: "absolute", insetInlineStart: pos(today) + "%", top: -2, bottom: -2, width: 2, background: A }} />}
              </div></div>); })}
          {!dated.length && <div style={{ fontSize: 12, color: C.muted }}>لا مشاريع بمواعيد</div>}
        </div></div>)}
      {mode === "calendar" && (
        <div style={S.card}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}><Btn small onClick={() => setMonth(new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 7))}>→</Btn><b>{MONTH_NAMES[m - 1]} {y}</b><Btn small onClick={() => setMonth(new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 7))}>←</Btn></div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4 }}>
            {["أحد", "اثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"].map((d) => <div key={d} style={{ fontSize: 10.5, color: C.muted, textAlign: "center" }}>{d}</div>)}
            {Array.from({ length: dow(`${month}-01`) }).map((_, i) => <div key={"e" + i} />)}
            {Array.from({ length: monthDays(y, m) }).map((_, i) => { const ds = `${month}-${String(i + 1).padStart(2, "0")}`; const ps = list.filter((p) => p.target_date === ds); const ss = list.filter((p) => p.start_date === ds); return <div key={ds} style={{ minHeight: 60, border: `1px solid ${ds === today ? A : C.line}`, borderRadius: 6, padding: 3 }}><div style={{ fontSize: 10.5, color: C.muted }}>{i + 1}</div>{ss.map((p) => <div key={"s" + p.id} onClick={() => openProject(p.id)} style={{ fontSize: 9.5, background: "rgba(16,185,129,0.15)", borderRadius: 4, padding: "1px 4px", marginTop: 2, cursor: "pointer" }}>▶ {p.name}</div>)}{ps.map((p) => <div key={"t" + p.id} onClick={() => openProject(p.id)} style={{ fontSize: 9.5, background: "rgba(239,68,68,0.15)", borderRadius: 4, padding: "1px 4px", marginTop: 2, cursor: "pointer" }}>🏁 {p.name}</div>)}</div>; })}
          </div></div>)}
      {form && <ProjectForm initial={form} onClose={() => setForm(null)} />}
      {tplPick && <TemplatePicker onClose={() => setTplPick(false)} />}
    </div>
  );
}
export function TemplatePicker({ onClose, tpl }) {
  const { templates, A: act, people, today, openProject, toast, me } = useP(); const [sel, setSel] = useState(tpl || null); const [configure, setConfigure] = useState(false);
  if (!sel) return <Modal title="اختر قالباً" onClose={onClose}><div style={{ display: "grid", gap: 8 }}>{templates.filter((t) => !t.archived_at).map((t) => <div key={t.id} onClick={() => setSel(t)} style={{ ...S.card, cursor: "pointer", padding: "10px 12px" }}><div style={{ fontWeight: 700, fontSize: 13.5 }}>🧩 {t.name}{t.builtin && <Chip style={{ marginInlineStart: 6 }}>مدمج</Chip>}</div><div style={{ fontSize: 12, color: C.dim }}>{t.description}</div><div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>{countNodes(t.task_tree || [])} مهمة · {(t.risks || []).length} خطر · المدة التقديرية {t.duration_days || "—"} يوماً</div></div>)}</div></Modal>;
  if (!configure) return <Modal title={"معاينة القالب: " + sel.name} onClose={onClose} footer={<><Btn onClick={() => setSel(null)}>اختيار قالب آخر</Btn><Btn kind="primary" onClick={() => setConfigure(true)}>متابعة الإعداد</Btn></>}><div style={{ fontSize: 12.5, lineHeight: 1.8 }}>{sel.description}<div style={{ margin: "8px 0", fontWeight: 700 }}>{countNodes(sel.task_tree || [])} مهمة · {(sel.risks || []).length} خطر · {sel.duration_days || "—"} يوم</div>{(sel.task_tree || []).map((n, i) => <div key={i}>• {n.title}</div>)}<div style={{ color: C.muted, marginTop: 8 }}>لن تُنشأ بيانات قبل تأكيد النموذج التالي.</div></div></Modal>;
  return <FormModal title={"إعداد مشروع من قالب: " + sel.name} initial={{ name: "", start_date: today, lead_id: me }} onClose={onClose} fields={[
    { key: "name", label: "اسم المشروع", required: true }, { key: "start_date", label: "تاريخ البدء (تُزاح المواعيد نسبةً إليه)", type: "date", required: true }, { key: "lead_id", label: "القائد", type: "select", options: mOpts(people), allowEmpty: false }, { key: "target_date", label: "الموعد المستهدف (اختياري)", type: "date" }]}
    onSubmit={async (v) => { const p = await act.createFromTemplate(sel, v); toast(`✅ أُنشئ «${p.name}» بمهامه ومخاطره`); onClose(); openProject(p.id); }} />;
}
const countNodes = (nodes) => nodes.reduce((a, n) => a + 1 + countNodes(n.children || []), 0);

// ═════ Project detail ═════
function ProjectDetail() {
  const { view, setView, projectsById, metrics, data, can, A: act, idx, today, people, nameOf, toast, sessionsDummy } = useP();
  const p = projectsById[view.projectId]; const [edit, setEdit] = useState(false); const [wf, setWf] = useState(false); const [tm, setTm] = useState(false);
  if (!p) return <div><Btn onClick={() => setView({ projectId: null, tab: "overview" })}>← المشاريع</Btn><Empty icon="🔎" title="المشروع غير موجود أو محجوب" /></div>;
  const m = metrics[p.id]; const tab = view.tab; const setTab = (t) => setView({ ...view, tab: t });
  const counts = { tasks: m.leafTotal, outputs: m.outputsCount, risks: m.openRisks, issues: m.openIssues, decisions: m.decisionsCount, prds: data.prds.filter((x) => x.project_id === p.id).length };
  const tabs = [{ id: "overview", label: "نظرة عامة" }, { id: "tasks", label: "المهام", count: counts.tasks }, { id: "outputs", label: "المخرجات", count: counts.outputs }, { id: "work", label: "العمل والوقت" }, { id: "prds", label: "المواصفات", count: counts.prds }, { id: "risks", label: "المخاطر", count: counts.risks }, { id: "issues", label: "المشاكل", count: counts.issues }, { id: "decisions", label: "القرارات", count: counts.decisions }, { id: "people", label: "الأشخاص" }, { id: "okr", label: "الأهداف" }, { id: "related", label: "المراجع" }, { id: "activity", label: "النشاط" }];
  const canE = can("project.edit", p);
  return (
    <div>
      <div style={{ marginBottom: 8 }}><Btn small onClick={() => setView({ projectId: null, tab: "overview", taskId: null })}>← المشاريع</Btn></div>
      <Head title={<>{p.name}{p.visibility === "private" && " 🔒"} {p.is_system && <Chip>مشروع النظام</Chip>}</>} sub={`${p.type || ""} · القائد: ${nameOf(p.lead_id)}${p.start_date ? " · " + fmtShort(p.start_date) : ""}${p.target_date ? " → " + fmtShort(p.target_date) : ""}`} right={!p.is_system && <>
        <StatusChip s={p.status} />
        {canE && <select style={{ ...S.sel, width: 150 }} value="" onChange={(e) => e.target.value && act.setProjectStatus(p, e.target.value)}><option value="">تغيير الحالة…</option>{Object.keys(L.projectStatus).filter((s) => s !== p.status && s !== "Archived").map((s) => <option key={s} value={s}>{L.projectStatus[s]}</option>)}</select>}
        {canE && <Btn onClick={() => setEdit(true)}>✎ تعديل</Btn>}{can("project.archive", p) && (p.archived_at ? <Btn onClick={() => act.restoreProject(p)}>♻️ استرجاع</Btn> : <Btn onClick={() => act.archiveProject(p)}>🗄 أرشفة</Btn>)}{can("project.delete", p) && <Btn danger onClick={async () => { if (await act.deleteProject(p)) setView({ projectId: null, tab: "overview" }); }}>🗑</Btn>}</>} />
      <Tabs tabs={tabs} value={tab} onChange={setTab} small />
      {tab === "overview" && <Overview p={p} m={m} />}
      {tab === "tasks" && <TaskTree projectId={p.id} />}
      {tab === "outputs" && <OutputsView projectId={p.id} />}
      {tab === "work" && <WorkTab p={p} />}
      {tab === "prds" && <PrdsView projectId={p.id} />}
      {tab === "risks" && <RisksView projectId={p.id} />}
      {tab === "issues" && <IssuesView projectId={p.id} />}
      {tab === "decisions" && <DecisionsView projectId={p.id} />}
      {tab === "people" && <PeopleTab p={p} canE={can("project.members", p)} />}
      {tab === "okr" && <ProjectOkr p={p} />}
      {tab === "related" && <RelatedTab p={p} canE={canE} />}
      {tab === "activity" && <div style={S.card}>{data.activity.filter((a) => a.entity_id === p.id || (a.entity === "tasks" && idx.byId[a.entity_id] && idx.byId[a.entity_id].project_id === p.id)).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 40).map((a) => <div key={a.id} style={{ fontSize: 12, padding: "4px 0", color: C.dim }}>{dateOf(a.at)} · {nameOf(a.actor_id)} · {a.action} {a.summary}</div>)}{!data.activity.some((a) => a.entity_id === p.id) && <span style={{ fontSize: 12, color: C.muted }}>لا نشاط مسجَّل</span>}</div>}
      {edit && <ProjectForm initial={p} onClose={() => setEdit(false)} />}
    </div>
  );
}
function Overview({ p, m }) {
  const { data, idx, today, settings, A: act, can, nameOf, projectProgress } = useP(); const cov = D.coverageOf(p, idx);
  const lateTasks = idx.list.filter((t) => t.project_id === p.id && D.isOverdueLeaf(t, idx, today));
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 12 }}>
      <div style={S.card}><div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>الصحة والتقدم</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}><HealthBadge m={m} /><span style={{ fontSize: 12, color: C.dim }}>{m.leafCompleted}/{m.leafTotal} مهمة</span></div><Progress value={m.progress} height={9} />
        {(m.healthReasons || []).length > 0 && <div style={{ marginTop: 10 }}>{m.healthReasons.map((r) => <div key={r.code} style={{ fontSize: 12, padding: "3px 0", color: D.HEALTH_META[r.level].color }}>● {D.REASON_LABEL[r.code]}{r.ids.length ? ` (${r.ids.length})` : ""}</div>)}</div>}
        <div style={{ fontSize: 12, color: C.dim, marginTop: 10, lineHeight: 1.9 }}>الموعد: {p.target_date ? `${fmt(p.target_date)} (${m.daysRemaining < 0 ? "تجاوز " + -m.daysRemaining + " يوم" : "باقٍ " + m.daysRemaining + " يوم"})` : "غير محدد"}<br />متأخرة: {m.overdueLeafCount} · مخاطر مفتوحة: {m.openRisks} (عالية {m.highOpenRisks}) · مشاكل: {m.openIssues} (حرجة {m.criticalOpenIssues})</div>
      </div>
      <div style={S.card}><div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>الوقت والتكلفة</div>
        <div style={{ fontSize: 12.5, lineHeight: 2 }}>التقدير: {fmtMinutes(m.estimated)} · الفعلي: {fmtMinutes(m.actual)}<br />{m.timeRatio != null ? <>نسبة الوقت: <b style={{ color: m.timeRatio > 1 ? C.bad : C.ok }}>{Math.round(m.timeRatio * 100)}%</b></> : "لا تقديرات لحساب النسبة"}<br />الميزانية المخطَّطة: {p.budget_planned != null ? `${p.budget_planned} ${p.budget_currency || ""}` : "—"} <span style={{ fontSize: 10.5, color: C.muted }}>(الفعلي يُربط بنظام المال لاحقاً)</span></div></div>
      <div style={S.card}><div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>التتبّع (Traceability)</div>
        {cov ? <><Progress value={cov.ratio} /><div style={{ fontSize: 12, color: C.dim, marginTop: 6 }}>{cov.unlinked.length} مهمة بلا مواصفة أو اكتشاف{settings.traceabilityPolicy !== "off" ? "" : " (السياسة مُعطّلة)"}</div></> : <span style={{ fontSize: 12, color: C.muted }}>لا مهام</span>}</div>
      <div style={{ ...S.card, gridColumn: "1 / -1" }}><div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>الهدف والوصف</div><div style={{ fontSize: 13, lineHeight: 1.9, whiteSpace: "pre-wrap" }}>{p.final_goal || "—"}{p.description ? "\n\n" + p.description : ""}</div></div>
      {lateTasks.length > 0 && <div style={{ ...S.card, gridColumn: "1 / -1" }}><div style={{ fontSize: 13, fontWeight: 700, color: C.bad, marginBottom: 6 }}>مهام متأخرة ({lateTasks.length})</div>{lateTasks.slice(0, 8).map((t) => <div key={t.id} style={{ fontSize: 12.5, padding: "3px 0" }}>⏰ {t.title} — {fmtShort(t.due_date)} <Who id={t.assignee_id} size={15} /></div>)}</div>}
    </div>
  );
}
function WorkTab({ p }) {
  const { data, idx, nameOf, can } = useP();
  const taskIds = idx.list.filter((t) => t.project_id === p.id).map((t) => t.id);
  const ss = data.sessions.filter((s) => taskIds.includes(s.task_id) && !s.voided_at); const total = ss.reduce((a, s) => a + s.minutes, 0);
  const byMember = {}; ss.forEach((s) => { byMember[s.member_id] = (byMember[s.member_id] || 0) + s.minutes; }); const byTask = {}; ss.forEach((s) => { byTask[s.task_id] = (byTask[s.task_id] || 0) + s.minutes; });
  const topTasks = Object.entries(byTask).sort((a, b) => b[1] - a[1]).slice(0, 8);
  if (!ss.length) return <Empty icon="⏱" title="لا جلسات عمل بعد" sub="شغّل المؤقّت من أي مهمة أو أضف جلسة يدوية." />;
  return <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 12 }}>
    <div style={S.card}><div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>الإجمالي: {fmtMinutes(total)}</div>{Object.entries(byMember).map(([id, mn]) => <div key={id} style={{ display: "grid", gridTemplateColumns: "110px 1fr 60px", gap: 8, alignItems: "center", fontSize: 12.5, padding: "3px 0" }}><span>{nameOf(id)}</span><Progress value={mn / total} showLabel={false} /><span>{fmtMinutes(mn)}</span></div>)}</div>
    <div style={S.card}><div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>أكثر المهام استهلاكاً للوقت</div>{topTasks.map(([id, mn]) => <div key={id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, padding: "3px 0" }}><span>{(idx.byId[id] || {}).title}</span><b>{fmtMinutes(mn)}</b></div>)}</div>
  </div>;
}
function PeopleTab({ p, canE }) {
  const { people, nameOf, A: act, toast, confirm } = useP(); const [add, setAdd] = useState(false);
  const members = p.members || [];
  const save = async (list, lead) => { await act.saveProject({ ...p, members: list, lead_id: lead || p.lead_id }, false); };
  return <div style={S.card}>
    {members.map((mm) => <div key={mm.member_id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: `1px solid ${C.line}` }}><Who id={mm.member_id} /><Chip color={mm.role === "Lead" ? A : C.info}>{L.memberRole[mm.role]}</Chip><span style={{ flex: 1 }} />
      {canE && mm.role !== "Lead" && <select style={{ ...S.sel, width: 120, padding: "3px 6px" }} value={mm.role} onChange={(e) => save(members.map((x) => (x.member_id === mm.member_id ? { ...x, role: e.target.value } : x)))}>{["Contributor", "Reviewer", "Stakeholder"].map((r) => <option key={r} value={r}>{L.memberRole[r]}</option>)}</select>}
      {canE && mm.role !== "Lead" && <Btn small danger onClick={async () => { if (await confirm(`إزالة ${nameOf(mm.member_id)} من المشروع؟`)) save(members.filter((x) => x.member_id !== mm.member_id)); }}>إزالة</Btn>}</div>)}
    {canE && <div style={{ marginTop: 10 }}><Btn small kind="primary" onClick={() => setAdd(true)}>➕ إضافة عضو</Btn></div>}
    <div style={{ fontSize: 11, color: C.muted, marginTop: 8 }}>الأعضاء هم أعضاء الـ Workspace. لدعوة شخص جديد استخدم «الفريق والصلاحيات» في المنصة.</div>
    {add && <FormModal title="إضافة عضو للمشروع" initial={{ role: "Contributor" }} onClose={() => setAdd(false)} fields={[{ key: "member_id", label: "العضو", type: "select", required: true, allowEmpty: false, options: people.filter((x) => !members.some((m) => m.member_id === x.id)).map((x) => ({ v: x.id, l: x.name })) }, { key: "role", label: "الدور", type: "select", allowEmpty: false, options: ["Contributor", "Reviewer", "Stakeholder", "Lead"].map((r) => ({ v: r, l: L.memberRole[r] })) }]} onSubmit={async (v) => { if (v.role === "Lead") { await save([...members.map((x) => (x.role === "Lead" ? { ...x, role: "Contributor" } : x)), { member_id: v.member_id, role: "Lead" }], v.member_id); } else await save([...members, { member_id: v.member_id, role: v.role }]); setAdd(false); }} />}
  </div>;
}
function ProjectOkr({ p }) {
  const { data, projectProgress, today, settings, setPage } = useP();
  const krs = data.krs.filter((k) => (k.project_ids || []).includes(p.id));
  if (!krs.length) return <Empty icon="🎯" title="غير مرتبط بأي نتيجة رئيسية" sub="اربط المشروع من شاشة الأهداف (OKR) بنتيجة رئيسية مبنية على المشاريع." action={<Btn onClick={() => setPage("okrs")}>الأهداف</Btn>} />;
  return <div style={S.card}>{krs.map((k) => { const ob = data.objectives.find((o) => o.id === k.objective_id); return <div key={k.id} style={{ padding: "7px 0", borderBottom: `1px solid ${C.line}`, fontSize: 13 }}>🎯 {ob && ob.name} ← <b>{k.name}</b><div style={{ marginTop: 4 }}><Progress value={D.krProgressValue(k, projectProgress)} /></div></div>; })}</div>;
}
function RelatedTab({ p, canE }) {
  const { A: act, toast } = useP(); const links = p.links || []; const [f, setF] = useState(false);
  return <div style={S.card}>
    <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>روابط ومراجع خارجية. ستظهر هنا اجتماعات وفعاليات Knowledge OS تلقائياً عند بنائه (قراءة فقط).</div>
    {links.map((l, i) => <div key={i} style={{ display: "flex", gap: 8, padding: "5px 0", fontSize: 13 }}>🔗 <a href={l.url} target="_blank" rel="noreferrer" style={{ color: C.info }}>{l.title || l.url}</a><span style={{ flex: 1 }} />{canE && <Btn small danger onClick={() => act.saveProject({ ...p, links: links.filter((_, j) => j !== i) }, false)}>×</Btn>}</div>)}
    {!links.length && <span style={{ fontSize: 12, color: C.muted }}>لا مراجع</span>}
    {canE && <div style={{ marginTop: 10 }}><Btn small onClick={() => setF(true)}>➕ رابط</Btn></div>}
    {f && <FormModal title="رابط مرجعي" initial={{}} onClose={() => setF(false)} fields={[{ key: "title", label: "العنوان" }, { key: "url", label: "الرابط", type: "url", required: true }]} onSubmit={async (v) => { await act.saveProject({ ...p, links: [...links, v] }, false); setF(false); }} />}
  </div>;
}
