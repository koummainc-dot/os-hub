import React, { useState, useMemo, useEffect, useRef } from "react";
import { supabase } from "../../core/supabase.js";
import { A, S } from "../../core/ui.jsx";
import { C, Btn, Chip, Head, Stat, Empty, Progress, Seg, Board, SearchBar, Tabs, FormModal, Modal, Field } from "../../core/kit.jsx";
import { fmt, fmtShort, fmtMinutes, addDays, diffDays, monthDays, MONTH_NAMES, dow, dateOf } from "../../core/dates.js";
import { uid } from "../../core/records.jsx";
import { useP } from "./store.jsx";
import * as D from "./domain.js";
import { L, opts, STATUS_COLOR } from "./lookups.js";
import { HealthBadge, StatusChip, PriorityChip, Who, ProjectName, ProjectForm, TaskTree, mOpts } from "./parts.jsx";
import { OutputsView, RisksView, IssuesView, DecisionsView, PrdsView, DiscoveryView } from "./entities.jsx";
import { normalizeKnowledgeFollowup, stableKnowledgeFollowupId, findKnowledgeFollowupTask } from "../knowledge/followupIdentity.js";
import MediaEmbed, { getMediaEmbed } from "../media/MediaEmbed.jsx";
import { listKnowledgeMeetings } from "../knowledge/repository.js";

export function Projects() {
  const { data, metrics, view, setView, setPage, can, A: act, templates, toast, people, openProject, today, settings, trash } = useP();
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
        {can("project.create") && <><Btn onClick={() => setPage("masterplanImport")}>⤓ نقل من Masterplan</Btn><Btn onClick={() => setTplPick(true)}>🧩 من قالب</Btn><Btn kind="primary" onClick={() => setForm({})}>➕ مشروع</Btn></>}</>} />
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

function ProjectWorkspaceNav({ groups, activeGroupId, activeTab, onGroupChange, onTabChange }) {
  return <nav className="projects-workspace-nav" aria-label="تنقل المشروع">
    <div className="projects-workspace-nav-mobile">
      <label className="projects-workspace-nav-label" htmlFor="projects-workspace-section">قسم المشروع</label>
      <select id="projects-workspace-section" value={activeTab} onChange={(e) => onTabChange(e.target.value)}>
        {groups.flatMap((group) => group.tabs.filter((item) => !item.hidden).map((item) => <option key={item.id} value={item.id}>{group.label} — {item.label}</option>))}
      </select>
    </div>
    <div className="projects-workspace-nav-desktop">
      {groups.map((group) => <section key={group.id} className="projects-workspace-nav-group">
        <button type="button" className={"projects-workspace-nav-group-title" + (group.id === activeGroupId ? " is-active" : "")} onClick={() => onGroupChange(group.id)}>
          <span>{group.label}</span>
          <span aria-hidden="true">›</span>
        </button>
        <div className="projects-workspace-nav-items">
          {group.tabs.filter((item) => !item.hidden).map((item) => <button
            key={item.id}
            type="button"
            className={"projects-workspace-nav-item" + (item.id === activeTab ? " is-active" : "")}
            onClick={() => onTabChange(item.id)}
            aria-current={item.id === activeTab ? "page" : undefined}
          >
            <span>{item.label}</span>
            {item.count != null && <span className="projects-workspace-nav-count">{item.count}</span>}
          </button>)}
        </div>
      </section>)}
    </div>
  </nav>;
}

// ═════ Project detail ═════
function ProjectDetail() {
  const { view, setView, projectsById, metrics, data, can, A: act, idx, today, people, nameOf, toast, sessionsDummy, openTask } = useP();
  const p = projectsById[view.projectId]; const [edit, setEdit] = useState(false); const [wf, setWf] = useState(false); const [tm, setTm] = useState(false);
  if (!p) return <div><Btn onClick={() => setView({ projectId: null, tab: "overview" })}>← المشاريع</Btn><Empty icon="🔎" title="المشروع غير موجود أو محجوب" /></div>;
  const m = metrics[p.id]; const tab = view.tab; const setTab = (t) => setView({ ...view, tab: t });
  const counts = { tasks: m.leafTotal, outputs: m.outputsCount, risks: m.openRisks, issues: m.openIssues, decisions: m.decisionsCount, prds: data.prds.filter((x) => x.project_id === p.id).length };
  const taskFilter = view.taskFilter === "overdue"
    ? (task) => D.isOverdueLeaf(task, idx, today)
    : view.taskFilter === "ids"
      ? (task) => (view.taskFilterIds || []).includes(task.id)
      : undefined;
  const taskFilterLabel = view.taskFilter === "overdue"
    ? "تُعرض المهام المتأخرة فقط داخل هذا المشروع."
    : view.taskFilter === "ids"
      ? "تُعرض المهام التي لا ترتبط بمواصفة أو عنصر اكتشاف فقط."
      : null;
  const tabGroups = [
    { id: "overview", label: "نظرة عامة", defaultTab: "overview", tabs: [{ id: "overview", label: "نظرة عامة" }] },
    { id: "plan", label: "التخطيط", defaultTab: "tasks", tabs: [{ id: "discovery", label: "الاكتشاف" }, { id: "tasks", label: "المهام", count: counts.tasks }, { id: "prds", label: "المواصفات", count: counts.prds }, { id: "timeline", label: "الخط الزمني" }] },
    { id: "goals", label: "الأهداف", defaultTab: "okr", tabs: [{ id: "okr", label: "الأهداف (OKR)" }] },
    { id: "delivery", label: "التسليم", defaultTab: "outputs", tabs: [{ id: "outputs", label: "المخرجات", count: counts.outputs }, { id: "work", label: "العمل والوقت" }] },
    { id: "governance", label: "الحوكمة", defaultTab: "risks", tabs: [{ id: "risks", label: "المخاطر", count: counts.risks }, { id: "issues", label: "المشاكل", count: counts.issues }, { id: "decisions", label: "القرارات", count: counts.decisions }] },
    { id: "knowledge", label: "المعرفة والمراجع", defaultTab: "meetings", tabs: [{ id: "meetings", label: "الاجتماعات" }, { id: "resources", label: "المراجع والملفات" }, { id: "related", label: "المراجع (مسار قديم)", hidden: true }] },
    { id: "finance", label: "المالية", defaultTab: "finance", tabs: [{ id: "finance", label: "الملف المالي" }] },
    { id: "results", label: "النتائج", defaultTab: "wins", tabs: [{ id: "wins", label: "الإنجازات" }, { id: "updates", label: "تحديثات المشروع" }] },
    { id: "collaboration", label: "التعاون", defaultTab: "people", tabs: [{ id: "people", label: "الفريق" }, { id: "activity", label: "النشاط" }] },
  ];
  // Keep legacy "related" links resolvable; the visible resource tab is the canonical navigation entry.
  const activeGroup = tabGroups.find((group) => group.tabs.some((item) => item.id === tab)) || tabGroups[0];
  const navActiveTab = tab === "related" ? "resources" : tab;
  const setGroup = (groupId) => { const group = tabGroups.find((item) => item.id === groupId); if (group) setTab(group.defaultTab); };
  const canE = can("project.edit", p);
  const openQuickCreate = (kind, targetTab, patch = {}) => setView({ ...view, ...patch, tab: targetTab, focusRecord: null, quickCreate: kind });
  return (
    <div>
      <div style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", fontSize: 11.5 }}>
        <Btn small onClick={() => setView({ projectId: null, tab: "overview", taskId: null })}>← المشاريع</Btn>
        <span style={{ color: C.muted }}>المشاريع</span><span style={{ color: C.muted }}>›</span>
        <button type="button" onClick={() => setView({ ...view, tab: "overview", taskId: null })} style={{ border: 0, background: "transparent", padding: 0, color: C.info, cursor: "pointer", font: "inherit" }}>{p.name}</button>
        <span style={{ color: C.muted }}>›</span><span style={{ color: C.dim }}>{tab === "overview" ? "نظرة عامة" : (tabGroups.find((g) => g.tabs.some((x) => x.id === tab))?.tabs.find((x) => x.id === tab)?.label || tab)}</span>
      </div>
      <Head title={<>{p.name}{p.visibility === "private" && " 🔒"} {p.is_system && <Chip>مشروع النظام</Chip>}</>} sub={`${p.type || ""} · القائد: ${nameOf(p.lead_id)}${p.start_date ? " · " + fmtShort(p.start_date) : ""}${p.target_date ? " → " + fmtShort(p.target_date) : ""}`} right={!p.is_system && <>
        <StatusChip s={p.status} />
        {(can("task.write", p) || can("output.write", p) || can("prd.write", p) || can("risk.write", p) || can("issue.write", p) || can("decision.write", p) || canE) && <details style={{ position: "relative" }}>
          <summary style={{ listStyle: "none", border: "1px solid " + C.line, borderRadius: 8, padding: "7px 11px", cursor: "pointer", color: C.info, fontSize: 12.5, userSelect: "none" }}>＋ إضافة</summary>
          <div style={{ position: "absolute", insetInlineEnd: 0, top: "calc(100% + 6px)", zIndex: 30, minWidth: 185, display: "grid", gap: 3, padding: 6, background: C.card, border: "1px solid " + C.line, borderRadius: 9, boxShadow: "0 10px 28px rgba(0,0,0,.14)" }}>
            {can("task.write", p) && <button type="button" onClick={(e) => { e.currentTarget.closest("details")?.removeAttribute("open"); openQuickCreate("task", "tasks", { taskFilter: null, taskFilterIds: [] }); }} style={{ border: 0, borderRadius: 6, background: "transparent", padding: "8px 9px", textAlign: "start", cursor: "pointer", color: C.text, font: "inherit" }}>＋ مهمة جديدة</button>}
            {can("output.write", p) && <button type="button" onClick={(e) => { e.currentTarget.closest("details")?.removeAttribute("open"); openQuickCreate("output", "outputs"); }} style={{ border: 0, borderRadius: 6, background: "transparent", padding: "8px 9px", textAlign: "start", cursor: "pointer", color: C.text, font: "inherit" }}>＋ مخرج</button>}
            {can("prd.write", p) && <button type="button" onClick={(e) => { e.currentTarget.closest("details")?.removeAttribute("open"); openQuickCreate("prd", "prds"); }} style={{ border: 0, borderRadius: 6, background: "transparent", padding: "8px 9px", textAlign: "start", cursor: "pointer", color: C.text, font: "inherit" }}>＋ مواصفة PRD</button>}
            {can("risk.write", p) && <button type="button" onClick={(e) => { e.currentTarget.closest("details")?.removeAttribute("open"); openQuickCreate("risk", "risks", { riskStatusFilter: "all", riskHighOnly: false }); }} style={{ border: 0, borderRadius: 6, background: "transparent", padding: "8px 9px", textAlign: "start", cursor: "pointer", color: C.text, font: "inherit" }}>＋ خطر</button>}
            {can("issue.write", p) && <button type="button" onClick={(e) => { e.currentTarget.closest("details")?.removeAttribute("open"); openQuickCreate("issue", "issues", { issueStatusFilter: "all", issueSeverityFilter: "" }); }} style={{ border: 0, borderRadius: 6, background: "transparent", padding: "8px 9px", textAlign: "start", cursor: "pointer", color: C.text, font: "inherit" }}>＋ مشكلة</button>}
            {can("decision.write", p) && <button type="button" onClick={(e) => { e.currentTarget.closest("details")?.removeAttribute("open"); openQuickCreate("decision", "decisions"); }} style={{ border: 0, borderRadius: 6, background: "transparent", padding: "8px 9px", textAlign: "start", cursor: "pointer", color: C.text, font: "inherit" }}>＋ قرار</button>}
            {canE && <button type="button" onClick={(e) => { e.currentTarget.closest("details")?.removeAttribute("open"); openQuickCreate("resource", "resources"); }} style={{ border: 0, borderRadius: 6, background: "transparent", padding: "8px 9px", textAlign: "start", cursor: "pointer", color: C.text, font: "inherit" }}>＋ رابط أو مرجع</button>}
          </div>
        </details>}
        {canE && <select style={{ ...S.sel, width: 150 }} value="" onChange={(e) => e.target.value && act.setProjectStatus(p, e.target.value)}><option value="">تغيير الحالة…</option>{Object.keys(L.projectStatus).filter((s) => s !== p.status && s !== "Archived").map((s) => <option key={s} value={s}>{L.projectStatus[s]}</option>)}</select>}
        {canE && <Btn onClick={() => setEdit(true)}>✎ تعديل</Btn>}{can("project.archive", p) && (p.archived_at ? <Btn onClick={() => act.restoreProject(p)}>♻️ استرجاع</Btn> : <Btn onClick={() => act.archiveProject(p)}>🗄 أرشفة</Btn>)}{can("project.delete", p) && <Btn danger onClick={async () => { if (await act.deleteProject(p)) setView({ projectId: null, tab: "overview" }); }}>🗑</Btn>}</>} />
      <ProjectWorkspaceNav
        groups={tabGroups}
        activeGroupId={activeGroup.id}
        activeTab={navActiveTab}
        onGroupChange={setGroup}
        onTabChange={setTab}
      />
      {tab === "overview" && <Overview p={p} m={m} />}
      {tab === "tasks" && <TaskTree projectId={p.id} filter={taskFilter} filterLabel={taskFilterLabel} />}
      {tab === "discovery" && <DiscoveryView projectId={p.id} />}
      {tab === "timeline" && <ProjectTimeline p={p} />}
      {tab === "outputs" && <OutputsView projectId={p.id} />}
      {tab === "work" && <WorkTab p={p} />}
      {tab === "prds" && <PrdsView projectId={p.id} />}
      {tab === "risks" && <RisksView projectId={p.id} />}
      {tab === "issues" && <IssuesView projectId={p.id} />}
      {tab === "decisions" && <DecisionsView projectId={p.id} />}
      {tab === "people" && <PeopleTab p={p} canE={can("project.members", p)} />}
      {tab === "okr" && <ProjectOkr p={p} />}
      {tab === "meetings" && <RelatedTab p={p} canE={canE} section="meetings" />}
      {tab === "resources" && <RelatedTab p={p} canE={canE} section="resources" />}
      {tab === "related" && <RelatedTab p={p} canE={canE} section="all" />}
      {tab === "finance" && <ProjectFinanceTab p={p} />}
      {tab === "wins" && <ProjectWinsTab p={p} />}
      {tab === "updates" && <ProjectUpdatesTab p={p} />}
      {tab === "activity" && <div style={S.card}>{data.activity.filter((a) => a.entity_id === p.id || (a.entity === "tasks" && idx.byId[a.entity_id] && idx.byId[a.entity_id].project_id === p.id)).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 40).map((a) => <div key={a.id} style={{ fontSize: 12, padding: "4px 0", color: C.dim }}>{dateOf(a.at)} · {nameOf(a.actor_id)} · {a.action} {a.summary}</div>)}{!data.activity.some((a) => a.entity_id === p.id) && <span style={{ fontSize: 12, color: C.muted }}>لا نشاط مسجَّل</span>}</div>}
      {edit && <ProjectForm initial={p} onClose={() => setEdit(false)} />}
    </div>
  );
}
function Overview({ p, m }) {
  const { data, idx, today, settings, A: act, can, nameOf, projectProgress, view, setView, openTask } = useP(); const cov = D.coverageOf(p, idx);
  const unlinkedTaskIds = (cov?.unlinked || []).map((task) => task.id);
  const openTasksView = (extra = {}) => setView({ ...view, tab: "tasks", taskFilter: null, taskFilterIds: [], focusRecord: null, ...extra });
  const lateTasks = idx.list.filter((t) => t.project_id === p.id && D.isOverdueLeaf(t, idx, today));
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 12 }}>
      <div style={S.card}><div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>الصحة والتقدم</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}><HealthBadge m={m} /><button type="button" onClick={() => openTasksView()} style={{ border: 0, padding: 0, background: "transparent", color: C.info, cursor: "pointer", textDecoration: "underline", font: "inherit", fontSize: 12 }}>{m.leafCompleted}/{m.leafTotal} مهمة · فتح المهام</button></div><button type="button" aria-label="فتح مهام المشروع" onClick={() => openTasksView()} style={{ border: 0, padding: 0, background: "transparent", width: "100%", cursor: "pointer" }}><Progress value={m.progress} height={9} /></button>
        {(m.healthReasons || []).length > 0 && <div style={{ marginTop: 10 }}>
          {m.healthReasons.map((r) => (
            <div key={r.code} style={{ fontSize: 12, padding: "3px 0", color: D.HEALTH_META[r.level].color }}>
              <span>● {D.REASON_LABEL[r.code]}</span>
              {r.ids.length > 0 && <span style={{ marginInlineStart: 5, display: "inline-flex", gap: 4, flexWrap: "wrap" }}>
                {r.ids.slice(0, 8).map((id) =>
                  r.kind === "task" && idx.byId[id]
                    ? <button key={id} type="button" onClick={() => openTask(id)} style={{ border: 0, background: "transparent", padding: 0, color: C.info, cursor: "pointer", textDecoration: "underline", font: "inherit" }}>↗ {idx.byId[id].title}</button>
                    : r.kind === "issue" && data.issues.find((x) => x.id === id)
                      ? <button key={id} type="button" onClick={() => setView({ ...view, tab: "issues", focusRecord: { kind: "issue", id }, issueStatusFilter: "all" })} style={{ border: 0, background: "transparent", padding: 0, color: C.info, cursor: "pointer", textDecoration: "underline", font: "inherit" }}>↗ مشكلة</button>
                      : r.kind === "risk" && data.risks.find((x) => x.id === id)
                        ? <button key={id} type="button" onClick={() => setView({ ...view, tab: "risks", focusRecord: { kind: "risk", id } })} style={{ border: 0, background: "transparent", padding: 0, color: C.info, cursor: "pointer", textDecoration: "underline", font: "inherit" }}>↗ خطر</button>
                        : null
                )}
              </span>}
            </div>
          ))}
        </div>}
        <div style={{ fontSize: 12, color: C.dim, marginTop: 10, lineHeight: 1.9 }}>
          الموعد: <button type="button" onClick={() => setView({ ...view, tab: "timeline", taskFilter: null, focusRecord: null })} style={{ border: 0, padding: 0, background: "transparent", color: C.info, cursor: "pointer", textDecoration: "underline", font: "inherit" }}>{p.target_date ? `${fmt(p.target_date)} (${m.daysRemaining < 0 ? "تجاوز " + -m.daysRemaining + " يوم" : "باقٍ " + m.daysRemaining + " يوم"})` : "غير محدد"}</button>
          <br />متأخرة: <button type="button" onClick={() => setView({ ...view, tab: "tasks", taskFilter: "overdue", focusRecord: null })} style={{ border: 0, padding: 0, background: "transparent", color: C.info, cursor: "pointer", textDecoration: "underline", font: "inherit" }}>{m.overdueLeafCount}</button>
          · مخاطر مفتوحة: <button type="button" onClick={() => setView({ ...view, tab: "risks", riskStatusFilter: "open", riskHighOnly: false, focusRecord: null })} style={{ border: 0, padding: 0, background: "transparent", color: C.info, cursor: "pointer", textDecoration: "underline", font: "inherit" }}>{m.openRisks}</button>
          (عالية <button type="button" onClick={() => setView({ ...view, tab: "risks", riskStatusFilter: "open", riskHighOnly: true, focusRecord: null })} style={{ border: 0, padding: 0, background: "transparent", color: C.info, cursor: "pointer", textDecoration: "underline", font: "inherit" }}>{m.highOpenRisks}</button>)
          · مشاكل: <button type="button" onClick={() => setView({ ...view, tab: "issues", issueStatusFilter: "open", issueSeverityFilter: "", focusRecord: null })} style={{ border: 0, padding: 0, background: "transparent", color: C.info, cursor: "pointer", textDecoration: "underline", font: "inherit" }}>{m.openIssues}</button>
          (حرجة <button type="button" onClick={() => setView({ ...view, tab: "issues", issueStatusFilter: "open", issueSeverityFilter: "Critical", focusRecord: null })} style={{ border: 0, padding: 0, background: "transparent", color: C.info, cursor: "pointer", textDecoration: "underline", font: "inherit" }}>{m.criticalOpenIssues}</button>)
        </div>
      </div>
      <div style={S.card}><div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>الوقت والتكلفة</div>
        <div style={{ fontSize: 12.5, lineHeight: 2 }}>التقدير: <button type="button" onClick={() => setView({ ...view, tab: "work", focusRecord: null })} style={{ border: 0, padding: 0, background: "transparent", color: C.info, cursor: "pointer", textDecoration: "underline", font: "inherit" }}>{fmtMinutes(m.estimated)}</button> · الفعلي: <button type="button" onClick={() => setView({ ...view, tab: "work", focusRecord: null })} style={{ border: 0, padding: 0, background: "transparent", color: C.info, cursor: "pointer", textDecoration: "underline", font: "inherit" }}>{fmtMinutes(m.actual)}</button><br />{m.timeRatio != null ? <>نسبة الوقت: <button type="button" onClick={() => setView({ ...view, tab: "work", focusRecord: null })} style={{ border: 0, padding: 0, background: "transparent", color: m.timeRatio > 1 ? C.bad : C.ok, cursor: "pointer", textDecoration: "underline", font: "inherit", fontWeight: 700 }}>{Math.round(m.timeRatio * 100)}%</button></> : "لا تقديرات لحساب النسبة"}<br />الميزانية المخطَّطة: {p.budget_planned != null ? `${p.budget_planned} ${p.budget_currency || ""}` : "—"}</div><button type="button" onClick={() => setView({ ...view, tab: "finance" })} style={{ marginTop: 9, border: 0, padding: 0, background: "transparent", color: C.info, cursor: "pointer", font: "inherit", textDecoration: "underline" }}>فتح الملف المالي الفعلي في Finance OS ↗</button></div>
      <div style={S.card}><div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>التتبّع (Traceability)</div>
        {cov ? <><Progress value={cov.ratio} /><div style={{ fontSize: 12, color: C.dim, marginTop: 6 }}>{unlinkedTaskIds.length > 0 ? <button type="button" onClick={() => setView({ ...view, tab: "tasks", taskFilter: "ids", taskFilterIds: unlinkedTaskIds, focusRecord: null })} style={{ border: 0, padding: 0, background: "transparent", color: C.info, cursor: "pointer", textDecoration: "underline", font: "inherit" }}>{cov.unlinked.length} مهمة بلا مواصفة أو اكتشاف · فتح المهام</button> : <span>كل المهام مرتبطة بمواصفة أو اكتشاف</span>}{settings.traceabilityPolicy !== "off" ? "" : " (السياسة مُعطّلة)"}</div></> : <span style={{ fontSize: 12, color: C.muted }}>لا مهام</span>}</div>
      <div style={{ ...S.card, gridColumn: "1 / -1" }}><div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>الهدف والوصف</div><div style={{ fontSize: 13, lineHeight: 1.9, whiteSpace: "pre-wrap" }}>{p.final_goal || "—"}{p.description ? "\n\n" + p.description : ""}</div></div>
      {lateTasks.length > 0 && <div style={{ ...S.card, gridColumn: "1 / -1" }}><div style={{ fontSize: 13, fontWeight: 700, color: C.bad, marginBottom: 6 }}>مهام متأخرة ({lateTasks.length})</div>{lateTasks.slice(0, 8).map((t) => <div key={t.id} style={{ fontSize: 12.5, padding: "3px 0", display: "flex", alignItems: "center", gap: 8 }}><button type="button" onClick={() => openTask(t.id)} style={{ border: 0, padding: 0, background: "transparent", color: C.info, cursor: "pointer", textAlign: "start", font: "inherit", textDecoration: "underline" }}>⏰ {t.title}</button><span>— {fmtShort(t.due_date)}</span><Who id={t.assignee_id} size={15} /></div>)}</div>}
    </div>
  );
}
function ProjectTimeline({ p }) {
  const { idx, today, openTask } = useP();
  const tasks = idx.list.filter((t) => t.project_id === p.id && idx.isLeaf(t.id) && (t.start_date || t.due_date))
    .sort((a, b) => String(a.start_date || a.due_date).localeCompare(String(b.start_date || b.due_date)));
  if (!tasks.length) return <Empty icon="🗓️" title="لا توجد مهام مؤرخة" sub="أضف تاريخ بداية أو موعداً للمهمة لتظهر في الخط الزمني." />;
  const starts = tasks.map(t => t.start_date || t.due_date).sort();
  const ends = tasks.map(t => t.due_date || t.start_date).sort();
  const min = starts[0], max = ends[ends.length - 1];
  const span = Math.max(1, diffDays(max, min) + 1);
  const pos = d => Math.max(0, Math.min(100, diffDays(d, min) / span * 100));
  return <div style={{ ...S.card, overflowX: "auto" }}>
    <div style={{ minWidth: 720 }}>
      <div style={{ display: "flex", justifyContent: "space-between", color: C.muted, fontSize: 10.5, marginBottom: 8 }}>
        <span>{fmtShort(min)}</span><span>{fmtShort(max)}</span>
      </div>
      {tasks.map(t => {
        const a=t.start_date||t.due_date, b=t.due_date||t.start_date, left=pos(a), width=Math.max(1.5,pos(b)-left), done=D.cat(t.status)==="done";
        return <div key={t.id} style={{ display:"grid", gridTemplateColumns:"180px 1fr", gap:10, alignItems:"center", marginBottom:8 }}>
          <button type="button" onClick={()=>openTask(t.id)} style={{ border:0, background:"transparent", padding:0, textAlign:"start", font: "inherit", fontSize:12, fontWeight:600, color:done?C.muted:C.text, cursor:"pointer", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{t.title}</button>
          <div style={{ position:"relative", height:24, background:"rgba(0,0,0,.04)", borderRadius:6 }}>
            <div onClick={()=>openTask(t.id)} title={fmt(a)+" → "+fmt(b)} style={{ position:"absolute", insetInlineStart:left+"%", width:width+"%", top:2, height:20, borderRadius:6, cursor:"pointer", background:done?"rgba(16,185,129,.22)":"rgba(99,102,241,.18)", border:"1px solid "+(done?C.ok:C.info) }} />
            {today>=min && today<=max && <div style={{position:"absolute",insetInlineStart:pos(today)+"%",top:-2,bottom:-2,width:2,background:A}} />}
          </div>
        </div>;
      })}
    </div>
  </div>;
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
  const { data, projectProgress, setPage, setView, view } = useP();
  const objectives = D.objectivesForProject(p.id, data.objectives, data.krs);
  const krs = data.krs.filter((k) => (k.project_ids || []).includes(p.id));
  const openOkrRecord = (kind, id) => {
    setView({ ...view, okrFocus: { kind, id } });
    setPage("okrs");
  };
  const linkStyle = { border: 0, padding: 0, background: "none", color: C.info, cursor: "pointer", textDecoration: "underline", font: "inherit", textAlign: "start" };
  if (!krs.length && !objectives.length) return <Empty icon="🎯" title="غير مرتبط بأي هدف أو نتيجة رئيسية" sub="اربط المشروع بهدف أو نتيجة رئيسية من شاشة الأهداف (OKR)." action={<Btn onClick={() => setPage("okrs")}>الأهداف</Btn>} />;
  return <div style={S.card}>
    {objectives.map((o) => <div key={o.id} style={{ padding: "7px 0", borderBottom: `1px solid ${C.line}`, fontSize: 13 }}>
      🎯 <b><button type="button" style={linkStyle} onClick={() => openOkrRecord("objective", o.id)}>{o.name} ↗</button></b>
      <div style={{ fontSize: 11, color: C.muted }}>{fmtShort(o.period_start)} → {fmtShort(o.period_end)}</div>
    </div>)}
    {krs.map((k) => { const ob = data.objectives.find((o) => o.id === k.objective_id); return <div key={k.id} style={{ padding: "7px 0", borderBottom: `1px solid ${C.line}`, fontSize: 13 }}>
      🎯 {ob && <span>{ob.name} ← </span>}<b><button type="button" style={linkStyle} onClick={() => openOkrRecord("kr", k.id)}>{k.name} ↗</button></b>
      <div style={{ marginTop: 4 }}><Progress value={D.krProgressValue(k, projectProgress)} /></div>
    </div>; })}
  </div>;
}
function ProjectFinanceTab({ p }) {
  const { shell, ws, isDemo } = useP();
  const [profiles, setProfiles] = useState([]);
  const [state, setState] = useState("loading");
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const available = typeof shell?.go === "function";
  useEffect(() => {
    let active = true;
    if (isDemo || !ws?.id) {
      setProfiles([]);
      setState(isDemo ? "demo" : "error");
      setError(isDemo ? "" : "تعذّر تحديد مساحة العمل الحالية.");
      return () => { active = false; };
    }
    setState("loading");
    setError("");
    supabase.rpc("fin_projects_get", { p_ws: ws.id }).then(({ data, error: rpcError }) => {
      if (!active) return;
      if (rpcError) {
        const message = String(rpcError.message || rpcError.details || rpcError.code || "");
        if (rpcError.code === "P0001" && /FORBIDDEN|UNAUTHENTICATED/i.test(message)) setState("permission");
        else setState("error");
        setError(message || "تعذّر تحميل الملخص المالي.");
        setProfiles([]);
        return;
      }
      const matches = (Array.isArray(data) ? data : []).filter((profile) => String(profile.project_ref || "") === String(p.id));
      setProfiles(matches);
      setState(matches.length === 0 ? "not-linked" : matches.length === 1 ? "linked" : "multiple");
    }).catch((rpcError) => {
      if (!active) return;
      const message = String(rpcError?.message || rpcError || "تعذّر تحميل الملخص المالي.");
      setState(rpcError?.code === "P0001" && /FORBIDDEN|UNAUTHENTICATED/i.test(message) ? "permission" : "error");
      setError(message);
      setProfiles([]);
    });
    return () => { active = false; };
  }, [ws?.id, p.id, isDemo, reloadKey]);
  const profile = profiles.length === 1 ? profiles[0] : null;
  const money = (value, currency = "EGP") => {
    if (value === null || value === undefined || value === "") return "غير متاح";
    try { return new Intl.NumberFormat("ar-EG", { style: "currency", currency, maximumFractionDigits: 2 }).format(Number(value)); }
    catch { return String(value) + " " + currency; }
  };
  const openFinance = () => available && shell.go("system", "finance", "projects", { projectRef: p.id, fromSystem: "projects" });
  return <section style={{ display: "grid", gap: 10 }}>
    <div style={S.card}>
      <Head title="الملف المالي للمشروع" sub="البيانات المالية تظل مملوكة لـ Finance OS؛ هذا العرض للقراءة فقط." right={<Btn small onClick={() => setReloadKey((value) => value + 1)} disabled={state === "loading"}>↻ تحديث</Btn>} />
      <div role="status" style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", margin: "8px 0" }}>
        {state === "loading" && <Chip color={C.muted}>جارٍ تحميل حالة الربط…</Chip>}
        {state === "not-linked" && <Chip color={C.warn}>غير مرتبط</Chip>}
        {state === "linked" && <Chip color={C.ok}>مرتبط</Chip>}
        {state === "multiple" && <Chip color={C.warn}>يتطلب مراجعة</Chip>}
        {state === "permission" && <Chip color={C.bad}>لا توجد صلاحية عرض Finance</Chip>}
        {state === "error" && <Chip color={C.bad}>تعذّر تحميل بيانات Finance</Chip>}
        {state === "demo" && <Chip color={C.muted}>بيئة عرض تجريبي</Chip>}
      </div>
      {state === "loading" && <div style={{ color: C.muted, fontSize: 12 }}>يتم جلب الملخص من Finance دون إنشاء أو تعديل أي سجل.</div>}
      {state === "not-linked" && <div style={{ color: C.dim, fontSize: 12.5, lineHeight: 1.9 }}>لا يوجد ملف مالي مرتبط بهذا المشروع. يمكنك إعداده من Finance؛ سيظل إنشاء الملف وحفظه وربط الحركات من صلاحيات Finance نفسها.</div>}
      {state === "multiple" && <div role="alert" style={{ color: C.warn, fontSize: 12.5, lineHeight: 1.9 }}>يوجد أكثر من ملف مالي يحمل مرجع المشروع نفسه ({profiles.length}). لم أدمج الأرقام أو أختر ملفًا أساسيًا تلقائيًا؛ يلزم حسم الملف الأساسي من Finance.</div>}
      {state === "permission" && <div role="alert" style={{ color: C.bad, fontSize: 12.5, lineHeight: 1.9 }}>تعذّر عرض الملخص لأن صلاحية Finance للقراءة غير متاحة لهذا الحساب. لا تعرض Projects أرقامًا تقديرية بدل البيانات المحمية.</div>}
      {state === "error" && <div role="alert" style={{ color: C.bad, fontSize: 12.5, lineHeight: 1.9 }}>تعذّر تحميل بيانات Finance. {error}</div>}
      {state === "demo" && <div style={{ color: C.muted, fontSize: 12 }}>البيانات المالية الحقيقية لا تُعرض في بيئة Demo.</div>}
      {(state === "not-linked" || state === "multiple" || state === "error" || state === "permission") && <Btn kind="primary" disabled={!available} onClick={openFinance}>فتح Finance OS ↗</Btn>}
      <div style={{ color: C.muted, fontSize: 10.5, marginTop: 8 }}>لا يتم إنشاء Finance Profile أو Transaction أو تعديلهما من Projects. لا تُعرض قيمة صفرية عندما لا يوجد ملف مالي.</div>
    </div>
    {profile && <div style={S.card}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
        <div><b style={{ fontSize: 13 }}>{profile.name || p.name}</b><div style={{ fontSize: 10.5, color: C.muted, marginTop: 3 }}>{profile.status || "—"} · آخر حركة مالية: {profile.last_activity || "لا توجد حركة مسجلة"} · عملة الأساس: {profile.base_currency || "EGP"}</div></div>
        <Btn small onClick={openFinance} disabled={!available}>إدارة في Finance ↗</Btn>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(145px,1fr))", gap: 8, marginTop: 12 }}>
        <Stat label="الإيرادات" value={money(profile.revenue_base, profile.base_currency)} />
        <Stat label="المصروفات" value={money(profile.expenses_base, profile.base_currency)} />
        <Stat label="صافي الربح" value={money(profile.net_profit_base, profile.base_currency)} />
        <Stat label="الميزانية" value={profile.budget == null ? "غير محددة" : money(profile.budget, profile.currency)} />
        <Stat label="استهلاك الميزانية" value={profile.budget_used_pct == null ? "غير متاح" : Number(profile.budget_used_pct).toLocaleString("ar-EG") + "%"} />
        <Stat label="ROI" value={profile.roi_measurable ? Number(profile.roi_pct).toLocaleString("ar-EG") + "%" : "غير قابل للقياس"} />
      </div>
      {Number(profile.unvalued_transactions || 0) > 0 && <div role="status" style={{ marginTop: 10, padding: 9, borderRadius: 7, background: "rgba(245,158,11,.10)", color: C.warn, fontSize: 11.5, lineHeight: 1.8 }}>توجد {profile.unvalued_transactions} حركة بلا قيمة بعملة الأساس. قد تكون بحاجة إلى مراجعة سعر الصرف أو تقييم العملة؛ لم تُحتسب هذه القيم كصفر.</div>}
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", color: C.muted, fontSize: 10.5, marginTop: 9 }}>
        <span>ملف Finance: {profile.id}</span>
        <span>آخر تحديث للملف: {profile.updated_at ? dateOf(profile.updated_at) : "غير متاح"}</span>
      </div>
    </div>}
  </section>;
}
function ProjectWinsTab({ p }) {
  const { data, idx, setPage, openTask } = useP();
  const wins = data.wins.filter((win) => String(win.project_id || "") === String(p.id)).sort((a, b) => String(b.achieved_on || "").localeCompare(String(a.achieved_on || "")));
  return <div style={{ display: "grid", gap: 10 }}>
    <Head title="إنجازات المشروع" sub={`${wins.length} إنجاز مرتبط بهذا المشروع`} right={<Btn onClick={() => setPage("wins")}>فتح سجل الإنجازات ↗</Btn>} />
    {!wins.length ? <Empty icon="🏆" title="لا توجد إنجازات مرتبطة بعد" sub="سجّل الإنجاز من سجل Projects العام واربطه بهذا المشروع." /> : wins.map((win) => <article key={win.id} style={S.card}>
      <b>{win.title}</b><div style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>{win.achieved_on || "بلا تاريخ"}</div>
      {win.description && <p style={{ fontSize: 12, lineHeight: 1.8 }}>{win.description}</p>}
      {(win.task_ids || (win.task_id ? [win.task_id] : [])).map((id) => idx.byId[id]).filter(Boolean).map((task) => <button type="button" key={task.id} onClick={() => openTask(task.id)} style={{ border: 0, padding: 0, marginInlineEnd: 8, color: C.info, background: "transparent", cursor: "pointer", textDecoration: "underline" }}>↗ {task.title}</button>)}
    </article>)}
  </div>;
}
function ProjectUpdatesTab({ p }) {
  const { data, setPage } = useP();
  const updates = data.updates.filter((update) => String(update.project_id || "") === String(p.id)).sort((a, b) => String(b.period_end || "").localeCompare(String(a.period_end || "")));
  return <div style={{ display: "grid", gap: 10 }}>
    <Head title="تحديثات المشروع" sub={`${updates.length} تحديث مرتبط بهذا المشروع`} right={<Btn onClick={() => setPage("updates")}>فتح سجل التحديثات ↗</Btn>} />
    {!updates.length ? <Empty icon="📣" title="لا توجد تحديثات بعد" sub="يمكن إنشاء تحديث من سجل النتائج والتقارير وربطه بهذا المشروع." /> : updates.map((update) => <article key={update.id} style={S.card}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}><b style={{ flex: 1 }}>{update.title || "تحديث المشروع"}</b><Chip color={update.status === "Published" ? C.ok : C.muted}>{update.status === "Published" ? "منشور" : "مسودة"}</Chip></div>
      <div style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>{update.period_start || "—"} → {update.period_end || "—"}{update.published_at ? " · نُشر " + fmtShort(update.published_at.slice(0, 10)) : ""}</div>
      {update.snapshot && <div style={{ fontSize: 12, marginTop: 7 }}>التقدم وقت النشر: {update.snapshot.progress == null ? "—" : Math.round(update.snapshot.progress * 100) + "%"} · {update.snapshot.leafCompleted ?? "—"}/{update.snapshot.leafTotal ?? "—"} · مخاطر مفتوحة {update.snapshot.openRisks ?? "—"} · مشاكل مفتوحة {update.snapshot.openIssues ?? "—"}</div>}
      {update.sections?.highlights && <p style={{ fontSize: 12, lineHeight: 1.8, whiteSpace: "pre-wrap", marginBottom: 0 }}>{update.sections.highlights}</p>}
    </article>)}
  </div>;
}
function RelatedTab({ p, canE, section = "all" }) {
  const { A: act, toast, ws, data, can, me, today, setPage, view, setView } = useP();
  const links = p.links || [];
  const [f, setF] = useState(false);
  const [meetings, setMeetings] = useState([]);
  const [loadingMeetings, setLoadingMeetings] = useState(section !== "resources");
  const [meetingError, setMeetingError] = useState("");
  const [creatingFollowup, setCreatingFollowup] = useState("");
  const creatingFollowupsRef = useRef(new Set());
  useEffect(() => {
    if (view.quickCreate !== "resource" || section !== "resources") return;
    if (canE) setF(true);
    else toast("ليس لديك صلاحية إضافة مراجع لهذا المشروع.");
    setView((current) => ({ ...current, quickCreate: null }));
  }, [view.quickCreate, section, canE, setView, toast]);

  const refreshMeetings = async () => {
    if (!ws?.id) { setMeetings([]); setLoadingMeetings(false); return; }
    setLoadingMeetings(true); setMeetingError("");
    try {
      const result = await listKnowledgeMeetings(ws.id, p.id);
      if (!result.ok) throw result.error || new Error("تعذر تحميل اجتماعات المعرفة.");
      setMeetings(result.meetings || []);
    } catch (error) {
      setMeetingError(error?.message || "تعذر تحميل اجتماعات المعرفة.");
    } finally {
      setLoadingMeetings(false);
    }
  };
  useEffect(() => { if (section !== "resources") refreshMeetings(); }, [ws?.id, p.id, section]);

  const linkedMeetings = meetings
    .filter((meeting) => !meeting.archived && meeting.status !== "archived")
    .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));

  async function createFollowupTask(meeting, followup, index) {
    const followupIdentity = stableKnowledgeFollowupId(meeting.id, followup);
    if (!followupIdentity) {
      toast("لا يمكن تحويل المتابعة لأن هويتها الثابتة غير متاحة.");
      return;
    }
    const key = followupIdentity;
    if (creatingFollowupsRef.current.has(key)) return;
    if (p.archived_at || p.status === "Archived") {
      toast("استعد المشروع قبل إنشاء مهام متابعة جديدة.");
      return;
    }
    if (!can("task.write", p)) {
      toast("ليس لديك صلاحية إنشاء مهام في هذا المشروع.");
      return;
    }
    const existing = findKnowledgeFollowupTask(data.tasks, meeting.id, followup, index);
    if (existing) {
      toast("هذه المتابعة مرتبطة بالفعل بمهمة: " + existing.title);
      return;
    }
    const title = normalizeKnowledgeFollowup(followup).title;
    if (!title || typeof act.saveTask !== "function") return;
    creatingFollowupsRef.current.add(key);
    setCreatingFollowup(key);
    try {
      const sourceRecordId = followupIdentity;
      const saved = await act.saveTask({
        id: "knowledge_meeting_task_" + encodeURIComponent(sourceRecordId),
        source: "knowledge_meeting",
        source_record_id: sourceRecordId,
        title,
        project_id: p.id,
        assignee_id: me,
        status: "Not Started",
        planning_bucket: "Inbox",
        due_date: meeting.date && meeting.date >= today ? meeting.date : "",
        source_meeting_id: meeting.id,
        source_meeting_title: meeting.title || "",
        source_followup_id: followupIdentity,
        source_followup_title: title,
        source_followup_index: index,
      }, true);
      if (saved) toast("✅ أُنشئت مهمة متابعة مرتبطة باجتماع Knowledge OS.");
    } catch (error) {
      toast("⛔ تعذّر إنشاء المهمة: " + (error?.message || "فشل الحفظ"));
    } finally {
      creatingFollowupsRef.current.delete(key);
      setCreatingFollowup("");
    }
  }

  return <div style={{ display: "grid", gap: 12 }}>
    {section !== "resources" && <section style={S.card}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <b style={{ fontSize: 13 }}>اجتماعات مرتبطة بالمشروع</b>
        <Chip>{linkedMeetings.length}</Chip>
        <span style={{ flex: 1 }} />
        <Btn small onClick={refreshMeetings} disabled={loadingMeetings}>تحديث</Btn>
        <Btn small onClick={() => setPage("meetings")}>كل الاجتماعات</Btn>
      </div>
      <div style={{ fontSize: 11.5, color: C.muted, marginBottom: 8 }}>مصدر السجلات وملكيتها Knowledge OS؛ يعرض Projects الاجتماعات المرتبطة بهذا المشروع فقط.</div>
      {loadingMeetings ? <div style={{ fontSize: 12, color: C.muted }}>جارٍ تحميل الاجتماعات…</div>
        : meetingError ? <div role="alert" style={{ fontSize: 12, color: C.bad }}>{meetingError} <Btn small onClick={refreshMeetings}>إعادة المحاولة</Btn></div>
        : !linkedMeetings.length ? <div style={{ fontSize: 12, color: C.muted }}>لا توجد اجتماعات مرتبطة بهذا المشروع. اربط الاجتماع بالمشروع من Knowledge OS.</div>
        : linkedMeetings.map((meeting) => {
          const followups = Array.isArray(meeting.followups) ? meeting.followups : [];
          return <article key={meeting.id} style={{ borderTop: "1px solid " + C.line, padding: "9px 0" }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <b style={{ fontSize: 13, flex: 1 }}>🗓️ {meeting.title}</b>
              <Chip color={C.info}>{meeting.date || "بدون تاريخ"}</Chip>
              {meeting.startTime && <span style={{ fontSize: 11, color: C.muted }}>{meeting.startTime}{meeting.endTime ? "–" + meeting.endTime : ""}</span>}
            </div>
            {meeting.summary && <div style={{ fontSize: 12, lineHeight: 1.8, marginTop: 5, whiteSpace: "pre-wrap" }}>{meeting.summary}</div>}
            {Array.isArray(meeting.attendees) && meeting.attendees.length > 0 && <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>المشاركون: {meeting.attendees.join("، ")}</div>}
            {meeting.decisions && <div style={{ fontSize: 12, lineHeight: 1.8, marginTop: 5 }}><b>القرارات:</b> {meeting.decisions}</div>}
            {followups.length > 0 && <div style={{ marginTop: 7, fontSize: 12 }}><b>بنود المتابعة</b><ul style={{ margin: "4px 0", paddingInlineStart: 20 }}>{followups.map((followup, index) => {
              const details = normalizeKnowledgeFollowup(followup);
              const existing = findKnowledgeFollowupTask(data.tasks, meeting.id, followup, index);
              const key = stableKnowledgeFollowupId(meeting.id, followup) || String(meeting.id) + ":" + index;
              if (!details.title) return null;
              return <li key={key} style={{ marginBottom: 6 }}>
                <div>{details.title}</div>
                {existing ? <div style={{ fontSize: 11, color: C.ok, marginTop: 2 }}>✓ مهمة مرتبطة: {existing.title}</div>
                  : !p.archived_at && p.status !== "Archived" && can("task.write", p) ? <Btn small disabled={creatingFollowup === key} onClick={() => createFollowupTask(meeting, followup, index)}>{creatingFollowup === key ? "جارٍ الإنشاء…" : "تحويل إلى مهمة"}</Btn>
                    : <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{p.archived_at || p.status === "Archived" ? "استعد المشروع لإنشاء مهمة متابعة." : "لا تملك صلاحية إنشاء مهام في هذا المشروع."}</div>}
              </li>;
            })}</ul></div>}
          </article>;
        })}
    </section>}
    {section !== "meetings" && <section style={S.card}>
      <b style={{ fontSize: 13 }}>روابط ومراجع خارجية</b>
      <div style={{ fontSize: 12, color: C.muted, margin: "6px 0 8px" }}>تظل الروابط الخارجية مملوكة للمشروع.</div>
      {links.map((l, i) => <div key={i} style={{ marginBottom: 10 }}>
        <div style={{ display: "flex", gap: 8, padding: "5px 0", fontSize: 13, alignItems: "center" }}>🔗 <a href={l.url} target="_blank" rel="noreferrer" style={{ color: C.info }}>{l.title || l.url}</a><span style={{ flex: 1 }} />{canE && <Btn small danger onClick={() => act.saveProject({ ...p, links: links.filter((_, j) => j !== i) }, false)}>×</Btn>}</div>
        {["youtube","vimeo","loom","file"].includes(getMediaEmbed(l.url)?.provider) && <MediaEmbed url={l.url} title={l.title || "فيديو مرتبط بالمشروع"} workspaceId="projects" itemId={p.id + ":" + i} />}
      </div>)}
      {!links.length && <span style={{ fontSize: 12, color: C.muted }}>لا مراجع</span>}
      {canE && <div style={{ marginTop: 10 }}><Btn small onClick={() => setF(true)}>➕ رابط</Btn></div>}
      {f && <FormModal title="رابط مرجعي" initial={{}} onClose={() => setF(false)} fields={[{ key: "title", label: "العنوان" }, { key: "url", label: "الرابط", type: "url", required: true }]} onSubmit={async (v) => { await act.saveProject({ ...p, links: [...links, v] }, false); setF(false); }} />}
    </section>}
  </div>;
}
