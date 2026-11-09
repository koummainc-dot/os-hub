import React, { useState, useMemo, useEffect, useRef } from "react";
import { A, S } from "../../core/ui.jsx";
import { C, Btn, Chip, Head, Stat, Empty, Progress, Seg, Board, SearchBar, Tabs, FormModal, Modal, Field } from "../../core/kit.jsx";
import { fmt, fmtShort, fmtMinutes, addDays, diffDays, monthDays, MONTH_NAMES, dow, dateOf } from "../../core/dates.js";
import { uid } from "../../core/records.jsx";
import { useP } from "./store.jsx";
import * as D from "./domain.js";
import { L, opts, STATUS_COLOR, activityEventText } from "./lookups.js";
import { HealthBadge, StatusChip, PriorityChip, Who, ProjectName, ProjectForm, TaskTree, TaskSheet, mOpts } from "./parts.jsx";
import { OutputsView, RisksView, IssuesView, DecisionsView, PrdsView } from "./entities.jsx";
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
  const countN = (nodes) => countNodes(nodes || []);
  const previewTree = (nodes, depth = 0) => (nodes || []).map((node, index) => <div key={depth + "-" + index + "-" + node.title} style={{ paddingInlineStart: depth * 15, padding: "4px 6px", borderBottom: depth ? "0" : "1px solid " + C.line, fontSize: 11.5, display: "flex", alignItems: "center", gap: 7 }}>
    <span style={{ color: node.milestone ? C.warn : C.muted }}>{node.milestone ? "◆" : depth ? "└" : "•"}</span>
    <span style={{ flex: 1, minWidth: 0 }}>{node.title}</span>
    {node.estimate_minutes != null && <Chip>{fmtMinutes(node.estimate_minutes)}</Chip>}
    {node.offset_days != null && <span style={{ fontSize: 10, color: C.muted }}>اليوم +{node.offset_days}</span>}
    {node.children?.length > 0 && <span style={{ fontSize: 10, color: C.muted }}>{countN(node.children)} فرعي</span>}
  </div>).concat((nodes || []).flatMap((node, index) => previewTree(node.children || [], depth + 1)));
  const objectiveCount = (sel?.objective_templates || []).length;
  const keyResultCount = (sel?.objective_templates || []).reduce((sum, objective) => sum + (objective.key_results || []).length, 0);
  const objectiveTaskLinkCount = (sel?.objective_templates || []).reduce((sum, objective) => sum + (objective.key_results || []).reduce((count, kr) => count + (kr.task_titles || []).length, 0), 0);
  const prdCount = (sel?.prd_templates || []).length;
  const requirementCount = (sel?.prd_templates || []).reduce((total, prd) => total + (prd.requirements || []).length, 0);
  const outputCount = (sel?.output_templates || []).length;
  const riskCount = (sel?.risks || []).length;
  const roleCount = (sel?.team_roles || []).length;
  const checklistCount = (sel?.checklist || []).length;
  if (!sel) return <Modal title="اختر قالباً" wide onClose={onClose}><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 9 }}>{templates.filter((t) => !t.archived_at).map((t) => <button type="button" key={t.id} onClick={() => setSel(t)} style={{ ...S.card, cursor: "pointer", textAlign: "start", padding: 12, font: "inherit" }}><div style={{ display: "flex", gap: 6, alignItems: "center" }}><b style={{ flex: 1, fontSize: 13.5 }}>🧩 {t.name}</b>{t.builtin && <Chip>مدمج</Chip>}</div><div style={{ fontSize: 11.5, color: C.dim, marginTop: 5 }}>{t.description}</div><div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 8 }}><Chip>{countN(t.task_tree)} مهمة</Chip><Chip>{(t.objective_templates || []).length} هدف</Chip><Chip>{(t.objective_templates || []).reduce((sum, objective) => sum + (objective.key_results || []).length, 0)} KR</Chip><Chip>{(t.prd_templates || []).length} مواصفة</Chip><Chip>{(t.output_templates || []).length} مخرج</Chip><Chip>{(t.risks || []).length} خطر</Chip><Chip>{(t.team_roles || []).length} دور</Chip></div></button>)}</div></Modal>;
  if (!configure) return <Modal title={"معاينة حزمة المشروع: " + sel.name} wide onClose={onClose} footer={<><Btn onClick={() => setSel(null)}>اختيار قالب آخر</Btn><Btn kind="primary" onClick={() => setConfigure(true)}>متابعة إعداد المشروع</Btn></>}>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(135px,1fr))", gap: 8, marginBottom: 12 }}>
      <Stat label="المهام" value={countN(sel.task_tree)} color={C.info} />
      <Stat label="الأهداف / KRs" value={objectiveCount + " / " + keyResultCount} color={C.violet} />
      <Stat label="معالم" value={(function countMilestones(nodes){ return (nodes || []).reduce((n, x) => n + (x.milestone ? 1 : 0) + countMilestones(x.children || []), 0); })(sel.task_tree)} color={C.warn} />
      <Stat label="المواصفات / المتطلبات" value={prdCount + " / " + requirementCount} color={C.violet} />
      <Stat label="المخرجات" value={outputCount} color={C.ok} />
      <Stat label="المخاطر المقترحة" value={riskCount} color={C.bad} />
      <Stat label="الأدوار المطلوبة" value={roleCount} />
    </div>
    <div style={{ display: "grid", gap: 10 }}>
      <section style={S.card}><b style={{ fontSize: 13 }}>هدف المشروع ونطاقه</b><div style={{ fontSize: 12, lineHeight: 1.8, marginTop: 5, whiteSpace: "pre-wrap" }}>{sel.final_goal || "لم يُحدّد هدف افتراضي."}</div><div style={{ fontSize: 11.5, color: C.dim, marginTop: 5, whiteSpace: "pre-wrap" }}>{sel.description || "لا يوجد وصف للنطاق."}</div><div style={{ fontSize: 10.5, color: C.muted, marginTop: 6 }}>المدة الإرشادية: {sel.duration_days || "غير محددة"} يومًا · نوع المشروع: {sel.project_type || "أخرى"}</div></section>
      <section style={S.card}>
        <b style={{ fontSize: 13 }}>الأهداف والنتائج الرئيسية (Objective → KR → Project → Task)</b>
        {!objectiveCount ? <div style={{ fontSize: 11.5, color: C.muted, marginTop: 5 }}>لا توجد أهداف أو نتائج رئيسية في هذا القالب.</div> : (sel.objective_templates || []).map((objective) => <div key={objective.key} style={{ borderTop: "1px solid " + C.line, padding: "8px 0" }}>
          <b style={{ fontSize: 12.5 }}>🎯 {objective.name}</b>{objective.why && <div style={{ fontSize: 11, color: C.dim }}>{objective.why}</div>}
          {(objective.key_results || []).map((kr) => <div key={kr.name} style={{ paddingInlineStart: 12, marginTop: 6, fontSize: 11.5 }}>
            <b>{kr.name}</b> <Chip>{kr.type === "Numeric" ? "رقمية" : "مبنية على مشاريع"}</Chip>
            {kr.type === "Numeric" && <span style={{ color: C.muted }}> · {kr.initial_value} → {kr.target_value} {kr.unit || ""}</span>}
            {(kr.task_titles || []).length > 0 ? <div style={{ color: C.info, fontSize: 10.5 }}>مجموعة المهام: {kr.task_titles.join("، ")}</div> : <div style={{ color: C.muted, fontSize: 10.5 }}>لا توجد مهام افتراضية مرتبطة؛ يمكن إسناد مجموعة تنفيذ لاحقًا من KR.</div>}
          </div>)}
        </div>)}
        <div style={{ fontSize: 10.5, color: C.muted, marginTop: 6 }}>{objectiveCount} هدف · {keyResultCount} نتيجة رئيسية · {objectiveTaskLinkCount} ربط مهمة. الربط الفعلي بعد الإنشاء سيكون من KR.task_ids وKR.project_ids فقط.</div>
      </section>
      <section style={S.card}><b style={{ fontSize: 13 }}>مراحل التنفيذ والمهام</b>{countN(sel.task_tree) ? <div style={{ marginTop: 6 }}>{previewTree(sel.task_tree)}</div> : <div style={{ fontSize: 11.5, color: C.muted, marginTop: 5 }}>لا توجد مهام في هذا القالب.</div>}</section>
      <section style={S.card}><b style={{ fontSize: 13 }}>المواصفات والمتطلبات ومعايير القبول</b>{!(sel.prd_templates || []).length ? <div style={{ fontSize: 11.5, color: C.muted }}>لا توجد مواصفات محددة.</div> : (sel.prd_templates || []).map((prd) => <div key={prd.title} style={{ borderTop: "1px solid " + C.line, padding: "7px 0" }}><b style={{ fontSize: 12 }}>{prd.title}</b>{prd.tldr && <div style={{ fontSize: 11.5, color: C.dim }}>{prd.tldr}</div>}{(prd.requirements || []).map((req) => <div key={req.title} style={{ paddingInlineStart: 12, marginTop: 4, fontSize: 11.5 }}>• {req.title}{req.acceptance_criteria && <div style={{ color: C.muted }}>معيار القبول: {req.acceptance_criteria}</div>}{req.task_title && <div style={{ color: C.info }}>مهمة التنفيذ: {req.task_title}</div>}</div>)}</div>)}</section>
      <section style={S.card}><b style={{ fontSize: 13 }}>المخرجات المتوقعة</b>{!(sel.output_templates || []).length ? <div style={{ fontSize: 11.5, color: C.muted }}>لا توجد مخرجات محددة.</div> : (sel.output_templates || []).map((output) => <div key={output.name} style={{ borderTop: "1px solid " + C.line, padding: "6px 0", fontSize: 11.5 }}><b>{output.name}</b> · {output.type || "Other"}{output.task_title && <span> · مهمة: {output.task_title}</span>}{output.prd_title && <span> · مواصفة: {output.prd_title}</span>}{output.requirement_title && <span> · متطلب: {output.requirement_title}</span>}</div>)}</section>
      <section style={S.card}><b style={{ fontSize: 13 }}>المخاطر المتوقعة</b><div style={{ fontSize: 10.5, color: C.warn, margin: "4px 0" }}>هذه مخاطر ابتدائية تحتاج تقييمًا وتأكيدًا بعد تطبيق القالب، وليست حقائق مؤكدة عن المشروع.</div>{(sel.risks || []).map((risk) => <div key={risk.title} style={{ fontSize: 11.5, borderTop: "1px solid " + C.line, padding: "5px 0" }}>⚠ {risk.title}{risk.mitigation && <div style={{ color: C.dim }}>خطة تخفيف مقترحة: {risk.mitigation}</div>}</div>)}</section>
      <section style={S.card}><b style={{ fontSize: 13 }}>الأدوار وأسئلة القرارات وقائمة الجاهزية</b><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 8, marginTop: 6 }}><div><div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>الأدوار المطلوبة (دون تعيين أفراد)</div>{(sel.team_roles || []).map((role) => <div key={role} style={{ fontSize: 11.5 }}>• {role}</div>)}{!roleCount && <span style={{ fontSize: 11, color: C.muted }}>غير محددة</span>}</div><div><div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>قرارات مطلوب حسمها</div>{(sel.decision_prompts || []).map((item) => <div key={item} style={{ fontSize: 11.5 }}>• {item}</div>)}{!(sel.decision_prompts || []).length && <span style={{ fontSize: 11, color: C.muted }}>لا توجد أسئلة مبدئية</span>}</div><div><div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>قائمة الجاهزية</div>{(sel.checklist || []).map((item) => <div key={item} style={{ fontSize: 11.5 }}>□ {item}</div>)}{!checklistCount && <span style={{ fontSize: 11, color: C.muted }}>غير محددة</span>}</div></div></section>
    </div>
    <div style={{ fontSize: 11.5, color: C.muted, marginTop: 8 }}>المعاينة لا تنشئ أي سجلات. عند التطبيق ستُنشأ المهام والمواصفات والمتطلبات والمخرجات والمخاطر المقترحة مع روابطها الداخلية، دون إنشاء أشخاص أو اختلاق بيانات فعلية.</div>
  </Modal>;
  return <FormModal title={"إعداد مشروع من حزمة القالب: " + sel.name} wide initial={{ name: "", description: sel.description || "", final_goal: sel.final_goal || "", start_date: today, lead_id: me }} onClose={onClose} fields={[
    { key: "name", label: "اسم المشروع", required: true, span: 2 }, { key: "description", label: "وصف المشروع (تخصيص)", type: "textarea", rows: 2, span: 2 }, { key: "final_goal", label: "الهدف النهائي", type: "textarea", rows: 2, span: 2 },
    { key: "start_date", label: "تاريخ البدء (تُزاح المواعيد نسبةً إليه)", type: "date", required: true }, { key: "lead_id", label: "القائد", type: "select", options: mOpts(people), allowEmpty: false }, { key: "target_date", label: "الموعد المستهدف (اختياري)", type: "date" }]}
    onSubmit={async (v) => { if (objectiveCount && (!v.start_date || (!v.target_date && !(Number(sel.duration_days) > 0)))) throw new Error("القالب يحتوي على أهداف ونتائج رئيسية؛ حدد موعدًا مستهدفًا أو أضف مدة إرشادية للقالب حتى تُنشأ فترة الأهداف بصورة صحيحة."); const project = await act.createFromTemplate(sel, v); toast("✅ أُنشئ «" + project.name + "» مع " + objectiveCount + " هدف و" + keyResultCount + " KR ومجموعات المهام والمواصفات والمخرجات والمخاطر."); onClose(); openProject(project.id); }} />;
}
const countNodes = (nodes) => nodes.reduce((a, n) => a + 1 + countNodes(n.children || []), 0);

// ═════ Project detail ═════
function ProjectActivityHub({ p }) {
  const { data, idx, ws, me, today, nameOf, can, A: act, toast, openTask, setPage } = useP();
  const [tab, setTab] = useState("activity");
  const [meetings, setMeetings] = useState([]);
  const [meetingState, setMeetingState] = useState("loading");
  const [creatingKey, setCreatingKey] = useState("");
  const activity = data.activity.filter((event) => event.entity_id === p.id || (event.entity === "tasks" && idx.byId[event.entity_id]?.project_id === p.id)).sort((a, b) => String(b.at || "").localeCompare(String(a.at || ""))).slice(0, 60);
  const updates = data.updates.filter((update) => update.project_id === p.id && !update.deleted_at).sort((a, b) => String(b.period_end || "").localeCompare(String(a.period_end || "")));
  const wins = data.wins.filter((win) => win.project_id === p.id || (win.task_ids || (win.task_id ? [win.task_id] : [])).some((id) => idx.byId[id]?.project_id === p.id)).sort((a, b) => String(b.achieved_on || "").localeCompare(String(a.achieved_on || "")));
  useEffect(() => {
    let active = true;
    if (!ws?.id) { setMeetings([]); setMeetingState("ready"); return () => { active = false; }; }
    setMeetingState("loading");
    listKnowledgeMeetings(ws.id).then((result) => {
      if (!active) return;
      if (!result.ok) throw result.error || new Error("تعذر تحميل الاجتماعات.");
      setMeetings((result.meetings || []).filter((meeting) => !meeting.archived && meeting.status !== "archived" && meeting.relatedSystem === "projects" && String(meeting.relatedId) === String(p.id)).sort((a, b) => String(b.date || "").localeCompare(String(a.date || ""))));
      setMeetingState("ready");
    }).catch(() => { if (active) setMeetingState("error"); });
    return () => { active = false; };
  }, [ws?.id, p.id]);
  async function makeFollowup(meeting, followup, index) {
    const key = String(meeting.id) + ":" + index;
    if (creatingKey || p.archived_at || !can("task.write", p)) return;
    const existing = data.tasks.find((task) => task.source_meeting_id === meeting.id && Number(task.source_followup_index) === index);
    if (existing) { toast("هذه المتابعة مرتبطة بالفعل بالمهمة: " + existing.title); return; }
    const title = String(followup || "").trim();
    if (!title) return;
    setCreatingKey(key);
    try {
      const saved = await act.saveTask({ title, project_id: p.id, assignee_id: me, status: "Not Started", planning_bucket: "Inbox", due_date: meeting.date && meeting.date >= today ? meeting.date : "", source_meeting_id: meeting.id, source_meeting_title: meeting.title || "", source_followup_index: index }, true);
      if (saved) toast("✅ أُنشئت مهمة متابعة من الاجتماع.");
    } catch (error) { toast("⛔ تعذّر إنشاء مهمة المتابعة: " + (error?.message || "فشل الحفظ")); }
    finally { setCreatingKey(""); }
  }
  const tabs = [{ id: "activity", label: "النشاط", count: activity.length }, { id: "updates", label: "التحديثات", count: updates.length }, { id: "wins", label: "الإنجازات", count: wins.length }, { id: "meetings", label: "الاجتماعات", count: meetings.length }];
  return <div style={{ display: "grid", gap: 10 }}>
    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}><Tabs small value={tab} onChange={setTab} tabs={tabs} /><span style={{ flex: 1 }} />{tab === "updates" && <Btn small onClick={() => setPage("updates")}>فتح التحديثات</Btn>}{tab === "wins" && <Btn small onClick={() => setPage("wins")}>فتح الإنجازات</Btn>}{tab === "meetings" && <Btn small onClick={() => setPage("meetings")}>كل الاجتماعات</Btn>}</div>
    {tab === "activity" && <section style={S.card}>{!activity.length ? <Empty icon="🕘" title="لا يوجد نشاط مسجّل لهذا المشروع" sub="سيظهر هنا إنشاء المهام وتعديلها وتغيّر الحالات والسجلات المرتبطة." /> : activity.map((event) => {
      const task = event.entity === "tasks" ? idx.byId[event.entity_id] : null;
      return <div key={event.id} style={{ display: "grid", gridTemplateColumns: "90px 28px minmax(0,1fr)", gap: 8, alignItems: "start", padding: "9px 0", borderTop: "1px solid " + C.line }}>
        <span style={{ fontSize: 10.5, color: C.muted }}>{event.at ? dateOf(event.at) : "—"}</span><span style={{ color: C.info, textAlign: "center" }}>●</span>
        <div style={{ minWidth: 0, fontSize: 12.5, lineHeight: 1.7 }}><b>{nameOf(event.actor_id)}</b> · {activityEventText(event)}{task && <div><Btn small onClick={() => openTask(task.id)}>{task.title}</Btn></div>}</div>
      </div>;
    })}</section>}
    {tab === "updates" && <section style={S.card}>{!updates.length ? <Empty icon="📣" title="لا توجد تحديثات" sub="أنشئ تحديثًا من قسم التحديثات وسيظهر هنا مرتبطًا بالمشروع." /> : updates.map((update) => <div key={update.id} style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", padding: "9px 0", borderTop: "1px solid " + C.line }}><div style={{ flex: 1, minWidth: 140 }}><b style={{ fontSize: 12.5 }}>{update.title || "تحديث المشروع"}</b><div style={{ fontSize: 10.5, color: C.muted }}>{fmtShort(update.period_start)} → {fmtShort(update.period_end)} · {update.status === "Published" ? "منشور" : "مسودة"}</div></div><Chip color={update.lead_assessment === "On Track" ? C.ok : update.lead_assessment === "At Risk" ? C.warn : C.bad}>{update.lead_assessment || "غير مقيّم"}</Chip></div>)}</section>}
    {tab === "wins" && <section style={S.card}>{!wins.length ? <Empty icon="🏆" title="لا توجد إنجازات مرتبطة" sub="اربط الإنجاز بمهمة من هذا المشروع أو حدّد المشروع في سجل الإنجاز." /> : wins.map((win) => <div key={win.id} style={{ display: "flex", gap: 8, alignItems: "center", padding: "9px 0", borderTop: "1px solid " + C.line }}><span>🏆</span><div style={{ flex: 1, minWidth: 0 }}><b style={{ fontSize: 12.5 }}>{win.title}</b><div style={{ fontSize: 10.5, color: C.muted }}>{win.achieved_on || "—"} · {nameOf(win.member_id)}</div></div>{(win.task_ids || (win.task_id ? [win.task_id] : [])).filter((id) => idx.byId[id]?.project_id === p.id).map((id) => <Btn key={id} small onClick={() => openTask(id)}>فتح المهمة</Btn>)}</div>)}</section>}
    {tab === "meetings" && <section style={S.card}>
      {meetingState === "loading" ? <div style={{ fontSize: 12, color: C.muted }}>جارٍ تحميل اجتماعات Knowledge OS…</div> : meetingState === "error" ? <div role="alert" style={{ fontSize: 12, color: C.bad }}>تعذّر تحميل الاجتماعات من Knowledge OS. افتح صفحة الاجتماعات للتحقق من المصدر.</div> : !meetings.length ? <Empty icon="🗓️" title="لا اجتماعات مرتبطة بهذا المشروع" sub="اربط الاجتماع بالمشروع من Knowledge OS ليظهر هنا." /> : meetings.map((meeting) => {
        const followups = Array.isArray(meeting.followups) ? meeting.followups : [];
        return <article key={meeting.id} style={{ padding: "9px 0", borderTop: "1px solid " + C.line }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}><b style={{ flex: 1, fontSize: 12.5 }}>🗓️ {meeting.title}</b><Chip>{meeting.date || "بدون تاريخ"}</Chip></div>
          {meeting.summary && <div style={{ fontSize: 11.5, marginTop: 5, whiteSpace: "pre-wrap" }}>{meeting.summary}</div>}
          {followups.map((followup, index) => {
            const existing = data.tasks.find((task) => task.source_meeting_id === meeting.id && Number(task.source_followup_index) === index);
            return <div key={index} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 6, fontSize: 11.5 }}><span style={{ flex: 1 }}>{String(followup)}</span>{existing ? <Chip color={C.ok}>مرتبطة: {existing.title}</Chip> : can("task.write", p) ? <Btn small disabled={creatingKey === String(meeting.id) + ":" + index} onClick={() => makeFollowup(meeting, followup, index)}>تحويل إلى مهمة</Btn> : <Chip color={C.muted}>لا توجد صلاحية</Chip>}</div>;
          })}
        </article>;
      })}
    </section>}
  </div>;
}

function ProjectSubprojects({ p }) {
  const { data, metrics, can, openProject } = useP();
  const [form, setForm] = useState(null);
  const children = data.projects.filter((project) => !project.is_system && !project.archived_at && String(project.parent_project_id || "") === String(p.id)).sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "ar"));
  const canCreate = can("project.create");
  return <div style={{ display: "grid", gap: 12 }}><section style={S.card}>
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}><b style={{ fontSize: 14 }}>المشاريع داخل {p.name}</b><Chip>{children.length}</Chip><span style={{ flex: 1 }} />{canCreate && <Btn kind="primary" onClick={() => setForm({ parent_project_id: p.id })}>＋ مشروع داخل هذا المشروع</Btn>}</div>
    <div style={{ fontSize: 11.5, color: C.muted, marginBottom: 10 }}>هذه مشاريع فرعية حقيقية مرتبطة بالمشروع الحالي، وليست نظامًا مستقلاً. يمكن فتح كل مشروع منها والعودة إلى المشروع الأب.</div>
    {!children.length ? <Empty icon="📁" title="لا توجد مشاريع فرعية" sub="أنشئ أول مشروع فرعي من هنا؛ سيُحفظ مباشرة تحت المشروع الحالي." /> : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 8 }}>{children.map((child) => { const m = metrics[child.id]; return <button key={child.id} type="button" onClick={() => openProject(child.id)} style={{ ...S.card, textAlign: "start", cursor: "pointer", font: "inherit", padding: 12 }}><div style={{ display: "flex", gap: 8, alignItems: "center" }}><b style={{ flex: 1 }}>{child.name}</b><StatusChip s={child.status} /></div><div style={{ fontSize: 11, color: C.muted, marginTop: 5 }}>{child.type || "مشروع"} · {m ? `${m.leafCompleted}/${m.leafTotal} مهمة` : "لا توجد مهام"}</div>{m && <div style={{ marginTop: 7 }}><Progress value={m.progress} /></div>}</button>; })}</div>}
  </section>{form && <ProjectForm initial={form} onClose={() => setForm(null)} />}</div>;
}

function ProjectAgenda({ p }) {
  const { ws, data, setPage, today, openTask } = useP();
  const [meetings, setMeetings] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  useEffect(() => { let active = true; if (!ws?.id) { setMeetings([]); setLoading(false); return; } setLoading(true); setError(""); listKnowledgeMeetings(ws.id).then((result) => { if (!active) return; if (!result?.ok) { setError(result?.error?.message || "تعذر تحميل أجندة الاجتماعات."); setMeetings([]); } else setMeetings((result.meetings || []).filter((meeting) => !meeting.archived && meeting.status !== "archived" && meeting.relatedSystem === "projects" && String(meeting.relatedId) === String(p.id)).sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")))); setLoading(false); }).catch((e) => { if (active) { setError(e?.message || "تعذر تحميل أجندة الاجتماعات."); setLoading(false); } }); return () => { active = false; }; }, [ws?.id, p.id]);
  const upcomingTasks = data.tasks.filter((task) => task.project_id === p.id && task.due_date && task.due_date >= today && D.cat(task.status) !== "done" && D.cat(task.status) !== "cancelled").sort((a, b) => String(a.due_date).localeCompare(String(b.due_date))).slice(0, 20);
  return <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 12 }}><section style={S.card}>
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}><b style={{ fontSize: 14 }}>أجندة المشروع</b><span style={{ flex: 1 }} /><Btn small onClick={() => setPage("meetings")}>كل الاجتماعات</Btn></div>
    <div style={{ fontSize: 11.5, color: C.muted, marginBottom: 9 }}>الاجتماعات مملوكة لـKnowledge OS وتظهر هنا لأنها مرتبطة بهذا المشروع.</div>
    {loading ? <div style={{ color: C.muted, fontSize: 12 }}>جارٍ تحميل الاجتماعات…</div> : error ? <div role="alert" style={{ color: C.bad, fontSize: 12 }}>{error}</div> : !meetings.length ? <Empty icon="🗓️" title="لا توجد اجتماعات مرتبطة" sub="اربط الاجتماع بالمشروع من Knowledge OS ليظهر هنا." /> : meetings.map((meeting) => <article key={meeting.id} style={{ borderTop: "1px solid " + C.line, padding: "9px 0" }}><div style={{ display: "flex", gap: 8, alignItems: "center" }}><b style={{ flex: 1 }}>{meeting.title || "اجتماع"}</b><Chip color={C.info}>{meeting.date || "بدون تاريخ"}</Chip></div>{meeting.startTime && <div style={{ fontSize: 10.5, color: C.muted, marginTop: 3 }}>{meeting.startTime}{meeting.endTime ? " → " + meeting.endTime : ""}</div>}{meeting.summary && <div style={{ fontSize: 11.5, lineHeight: 1.7, marginTop: 5, whiteSpace: "pre-wrap" }}>{meeting.summary}</div>}{Array.isArray(meeting.followups) && meeting.followups.length > 0 && <div style={{ fontSize: 11, color: C.muted, marginTop: 5 }}>متابعات: {meeting.followups.length} · يمكن تحويلها إلى مهام من شاشة الاجتماعات.</div>}</article>)}</section>
    <section style={S.card}><div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}><b style={{ fontSize: 14 }}>المواعيد القادمة للمهام</b><Chip>{upcomingTasks.length}</Chip></div>{!upcomingTasks.length ? <Empty icon="✓" title="لا توجد مهام قادمة" sub="أضف موعدًا للمهام لتظهر في أجندة المشروع." /> : upcomingTasks.map((task) => <div key={task.id} style={{ display: "flex", gap: 8, alignItems: "center", borderTop: "1px solid " + C.line, padding: "7px 0" }}><Chip color={C.info}>{task.due_date}</Chip><button type="button" onClick={() => openTask(task.id)} style={{ border: 0, background: "transparent", padding: 0, color: C.info, cursor: "pointer", font: "inherit", textAlign: "start", flex: 1 }}>{task.title}</button></div>)}</section>
  </div>;
}

function ProjectUpdates({ p }) {
  const { data, A: act, can, metrics, today, settings, idx } = useP();
  const [form, setForm] = useState(false); const [sel, setSel] = useState(null);
  const updates = data.updates.filter((u) => String(u.project_id) === String(p.id)).sort((a, b) => String(b.period_end || "").localeCompare(String(a.period_end || ""))); const writable = can("update.write", p);
  function draft() { const m = metrics[p.id]; const ps = addDays(today, -14); const done = idx.list.filter((t) => t.project_id === p.id && idx.isLeaf(t.id) && D.cat(t.status) === "done"); const risks = data.risks.filter((r) => r.project_id === p.id && D.isOpenRisk(r)); const issues = data.issues.filter((i) => i.project_id === p.id && D.isOpenIssue(i)); const delayed = idx.list.filter((t) => t.project_id === p.id && idx.isLeaf(t.id) && D.isOverdueLeaf(t, idx, today)); return { id: uid(), project_id: p.id, period_start: ps, period_end: today, type: "Stakeholder", audience: "Management", status: "Draft", lead_assessment: "On Track", author_id: p.lead_id, completed_task_ids: done.map((t) => t.id), delayed_task_ids: delayed.map((t) => t.id), related_risk_ids: risks.map((r) => r.id), related_issue_ids: issues.map((i) => i.id), related_decision_ids: data.decisions.filter((d) => d.project_id === p.id && d.decided_at >= ps && d.decided_at <= today).map((d) => d.id), sections: { highlights: done.slice(0, 8).map((t) => "• أُنجز: " + t.title).join("\n"), lows: [...issues.map((i) => "• مشكلة: " + i.title), ...risks.filter((r) => D.riskScore(r) >= settings.riskHigh).map((r) => "• خطر عالٍ: " + r.title), ...delayed.slice(0, 8).map((t) => "• متأخرة: " + t.title)].join("\n"), metrics: "التقدم " + (m.progress == null ? "—" : Math.round(m.progress * 100) + "%") + " · الصحة: " + D.HEALTH_META[m.health].label + " · المهام " + m.leafCompleted + "/" + m.leafTotal, asks: "", next: "" } }; }
  async function create() { if (!writable) return; const saved = await act.put("updates", draft(), p); if (saved) { setForm(false); setSel(saved.id); } }
  const selected = sel ? data.updates.find((u) => u.id === sel) : null;
  return <div style={{ display: "grid", gap: 12 }}><section style={S.card}><div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}><b style={{ fontSize: 14 }}>تحديثات {p.name}</b><Chip>{updates.length}</Chip><span style={{ flex: 1 }} />{writable && <Btn kind="primary" onClick={() => setForm(true)}>＋ إنشاء تحديث</Btn>}</div><div style={{ fontSize: 11.5, color: C.muted, marginBottom: 9 }}>التحديثات مملوكة للمشروع وتُبنى من حالة المهام والمخاطر والمشاكل والقرارات الحالية.</div>{!updates.length ? <Empty icon="📣" title="لا توجد تحديثات" sub="أنشئ أول تحديث للمشروع؛ سيبدأ بمسودة مبنية على البيانات الحالية." /> : <div style={{ display: "grid", gap: 7 }}>{updates.map((u) => <button key={u.id} type="button" onClick={() => setSel(u.id)} style={{ ...S.card, cursor: "pointer", textAlign: "start", font: "inherit", padding: 10 }}><div style={{ display: "flex", gap: 8, alignItems: "center" }}><b style={{ flex: 1 }}>{u.title || "تحديث"}</b><Chip color={u.status === "Published" ? C.ok : C.muted}>{u.status === "Published" ? "منشور" : "مسودة"}</Chip></div><div style={{ fontSize: 10.5, color: C.muted, marginTop: 4 }}>{fmtShort(u.period_start)} → {fmtShort(u.period_end)}</div></button>)}</div>}</section>{form && <Modal title="إنشاء تحديث للمشروع" onClose={() => setForm(false)} footer={<><Btn onClick={() => setForm(false)}>إلغاء</Btn><Btn kind="primary" onClick={create}>إنشاء مسودة</Btn></>}><div style={{ fontSize: 12, lineHeight: 1.8 }}>سيتم إنشاء مسودة تلقائية من المهام المكتملة والمتأخرة والمخاطر والمشاكل والقرارات الحالية، مع الاحتفاظ بالمراجع الأصلية للسجلات.</div></Modal>}{selected && <UpdateEditor u={selected} onClose={() => setSel(null)} />}</div>;
}function ProjectDetail() {
  const { view, setView, projectsById, metrics, data, can, A: act, idx, today, people, nameOf, toast, sessionsDummy, openTask } = useP();
  const p = projectsById[view.projectId]; const [edit, setEdit] = useState(false); const [wf, setWf] = useState(false); const [tm, setTm] = useState(false);
  if (!p) return <div><Btn onClick={() => setView({ projectId: null, tab: "overview" })}>← المشاريع</Btn><Empty icon="🔎" title="المشروع غير موجود أو محجوب" /></div>;
  const m = metrics[p.id]; const tab = view.tab; const setTab = (t) => setView({ ...view, tab: t });
  const counts = { tasks: m.leafTotal, outputs: m.outputsCount, risks: m.openRisks, issues: m.openIssues, decisions: m.decisionsCount, prds: data.prds.filter((x) => x.project_id === p.id).length };
  const tabGroups = [
    { id: "overview", label: "نظرة عامة", defaultTab: "overview", tabs: [{ id: "overview", label: "نظرة عامة" }] },
    { id: "projects", label: "المشاريع", defaultTab: "projects", tabs: [{ id: "projects", label: "المشاريع الفرعية" }] },
    { id: "plan", label: "التخطيط", defaultTab: "tasks", tabs: [{ id: "tasks", label: "المهام والمهام الفرعية", count: counts.tasks }, { id: "prds", label: "المواصفات", count: counts.prds }] },
    { id: "goals", label: "الأهداف", defaultTab: "okr", tabs: [{ id: "okr", label: "الأهداف (OKR)" }] },
    { id: "agenda", label: "الأجندة", defaultTab: "agenda", tabs: [{ id: "agenda", label: "الأجندة" }] },
    { id: "updates", label: "التحديثات", defaultTab: "updates", tabs: [{ id: "updates", label: "التحديثات" }] },
    { id: "delivery", label: "التسليم", defaultTab: "outputs", tabs: [{ id: "outputs", label: "المخرجات", count: counts.outputs }, { id: "work", label: "العمل والوقت" }, { id: "timeline", label: "الخط الزمني" }, { id: "related", label: "المراجع" }] },
    { id: "governance", label: "الحوكمة", defaultTab: "risks", tabs: [{ id: "risks", label: "المخاطر", count: counts.risks }, { id: "issues", label: "المشاكل", count: counts.issues }, { id: "decisions", label: "القرارات", count: counts.decisions }] },
    { id: "collaboration", label: "التعاون", defaultTab: "people", tabs: [{ id: "people", label: "الفريق" }, { id: "activity", label: "النشاط" }] },
  ];
  // Keep these stable tab IDs for existing deep links while grouping the UI by workflow.
  const activeGroup = tabGroups.find((group) => group.tabs.some((item) => item.id === tab)) || tabGroups[0];
  const setGroup = (groupId) => { const group = tabGroups.find((item) => item.id === groupId); if (group) setTab(group.defaultTab); };
  const canE = can("project.edit", p);
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
        {canE && <select style={{ ...S.sel, width: 150 }} value="" onChange={(e) => e.target.value && act.setProjectStatus(p, e.target.value)}><option value="">تغيير الحالة…</option>{Object.keys(L.projectStatus).filter((s) => s !== p.status && s !== "Archived").map((s) => <option key={s} value={s}>{L.projectStatus[s]}</option>)}</select>}
        {canE && <Btn onClick={() => setEdit(true)}>✎ تعديل</Btn>}{can("project.archive", p) && (p.archived_at ? <Btn onClick={() => act.restoreProject(p)}>♻️ استرجاع</Btn> : <Btn onClick={() => act.archiveProject(p)}>🗄 أرشفة</Btn>)}{can("project.delete", p) && <Btn danger onClick={async () => { if (await act.deleteProject(p)) setView({ projectId: null, tab: "overview" }); }}>🗑</Btn>}</>} />
      <Tabs tabs={tabGroups.map(({ id, label }) => ({ id, label }))} value={activeGroup.id} onChange={setGroup} small />
      {activeGroup.tabs.length > 1 && <Tabs tabs={activeGroup.tabs} value={tab} onChange={setTab} small />}
      {tab === "overview" && <Overview p={p} m={m} />}
      {tab === "projects" && <ProjectSubprojects p={p} />}
      {tab === "tasks" && <div style={{ display: "grid", gridTemplateColumns: view.taskId && view.inlineTask ? "repeat(auto-fit,minmax(min(100%,340px),1fr))" : "minmax(0,1fr)", gap: 12, alignItems: "start" }}><div style={{ minWidth: 0 }}><TaskTree projectId={p.id} /></div>{view.taskId && view.inlineTask && <TaskSheet inline />}</div>}
      {tab === "agenda" && <ProjectAgenda p={p} />}
      {tab === "updates" && <ProjectUpdates p={p} />}
      {tab === "timeline" && <TaskTree projectId={p.id} initialMode="timeline" />}
      {tab === "outputs" && <OutputsView projectId={p.id} />}
      {tab === "work" && <WorkTab p={p} />}
      {tab === "prds" && <PrdsView projectId={p.id} />}
      {tab === "risks" && <RisksView projectId={p.id} />}
      {tab === "issues" && <IssuesView projectId={p.id} />}
      {tab === "decisions" && <ProjectDecisions p={p} />}
      {tab === "people" && <PeopleTab p={p} canE={can("project.members", p)} />}
      {tab === "okr" && <ProjectOkr p={p} />}
      {tab === "related" && <RelatedTab p={p} canE={canE} />}
      {tab === "activity" && <ProjectActivityHub p={p} />}
      {edit && <ProjectForm initial={p} onClose={() => setEdit(false)} />}
    </div>
  );
}
function Overview({ p, m }) {
  const { data, idx, today, settings, A: act, can, nameOf, projectProgress, view, setView, openTask } = useP(); const cov = D.coverageOf(p, idx);
  const lateTasks = idx.list.filter((t) => t.project_id === p.id && D.isOverdueLeaf(t, idx, today));
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 12 }}>
      <div style={S.card}><div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>الصحة والتقدم</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}><HealthBadge m={m} /><span style={{ fontSize: 12, color: C.dim }}>{m.leafCompleted}/{m.leafTotal} مهمة</span></div><Progress value={m.progress} height={9} />
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
        <div style={{ fontSize: 12, color: C.dim, marginTop: 10, lineHeight: 1.9 }}>الموعد: {p.target_date ? `${fmt(p.target_date)} (${m.daysRemaining < 0 ? "تجاوز " + -m.daysRemaining + " يوم" : "باقٍ " + m.daysRemaining + " يوم"})` : "غير محدد"}<br />متأخرة: {m.overdueLeafCount} · مخاطر مفتوحة: {m.openRisks} (عالية {m.highOpenRisks}) · مشاكل: {m.openIssues} (حرجة {m.criticalOpenIssues})</div>
      </div>
      <div style={S.card}><div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>الوقت والتكلفة</div>
        <div style={{ fontSize: 12.5, lineHeight: 2 }}>التقدير: {fmtMinutes(m.estimated)} · الفعلي: {fmtMinutes(m.actual)}<br />{m.timeRatio != null ? <>نسبة الوقت: <b style={{ color: m.timeRatio > 1 ? C.bad : C.ok }}>{Math.round(m.timeRatio * 100)}%</b></> : "لا تقديرات لحساب النسبة"}<br />الميزانية المخطَّطة: {p.budget_planned != null ? `${p.budget_planned} ${p.budget_currency || ""}` : "—"} <span style={{ fontSize: 10.5, color: C.muted }}>(الفعلي يُربط بنظام المال لاحقاً)</span></div></div>
      <div style={S.card}><div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>التتبّع (Traceability)</div>
        {cov ? <><Progress value={cov.ratio} /><div style={{ fontSize: 12, color: C.dim, marginTop: 6 }}>{cov.unlinked.length} مهمة بلا مواصفة أو اكتشاف{settings.traceabilityPolicy !== "off" ? "" : " (السياسة مُعطّلة)"}</div></> : <span style={{ fontSize: 12, color: C.muted }}>لا مهام</span>}</div>
      <div style={{ ...S.card, gridColumn: "1 / -1" }}><div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>الهدف والوصف</div><div style={{ fontSize: 13, lineHeight: 1.9, whiteSpace: "pre-wrap" }}>{p.final_goal || "—"}{p.description ? "\n\n" + p.description : ""}</div></div>
      {(p.template_checklist || []).length > 0 && <div style={{ ...S.card, gridColumn: "1 / -1" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}><b style={{ fontSize: 13 }}>قائمة جاهزية المشروع من القالب</b><span style={{ flex: 1 }} /><Chip color={(p.template_checklist || []).every((item) => p.template_checklist_state?.[item]) ? C.ok : C.info}>{(p.template_checklist || []).filter((item) => p.template_checklist_state?.[item]).length}/{p.template_checklist.length} مكتمل</Chip></div>
        <Progress value={p.template_checklist.length ? (p.template_checklist || []).filter((item) => p.template_checklist_state?.[item]).length / p.template_checklist.length : null} height={6} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 6, marginTop: 9 }}>
          {(p.template_checklist || []).map((item, index) => <label key={index} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 12, color: p.template_checklist_state?.[item] ? C.muted : C.text, padding: "5px 0" }}>
            <input type="checkbox" checked={!!p.template_checklist_state?.[item]} disabled={!can("project.edit", p)} onChange={(event) => act.saveProject({ ...p, template_checklist_state: { ...(p.template_checklist_state || {}), [item]: event.target.checked } }, false)} />
            <span style={{ textDecoration: p.template_checklist_state?.[item] ? "line-through" : "none" }}>{item}</span>
          </label>)}
        </div>
      </div>}
      {((p.template_roles || []).length > 0 || (p.decision_prompts || []).length > 0) && <div style={{ display: "grid", gridColumn: "1 / -1", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 12 }}>
        {(p.template_roles || []).length > 0 && <section style={S.card}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 7 }}>الأدوار المطلوبة حسب القالب</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{p.template_roles.map((role, index) => <Chip key={index} color={C.info}>{role}</Chip>)}</div>
          <div style={{ fontSize: 10.5, color: C.muted, marginTop: 7 }}>هذه احتياجات أدوار وليست أعضاء معيّنين. أضف عضوًا موجودًا من تبويب الفريق عند اختيار الشخص المناسب.</div>
          <div style={{ marginTop: 7 }}><button type="button" onClick={() => setView({ ...view, tab: "people" })} style={{ border: 0, padding: 0, background: "transparent", color: C.info, cursor: "pointer", font: "inherit", fontSize: 11.5 }}>إدارة أعضاء المشروع ←</button></div>
        </section>}
        {(p.decision_prompts || []).length > 0 && <section style={S.card}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}><b style={{ flex: 1, fontSize: 13 }}>أسئلة قرارات مطلوب حسمها</b><Chip>{p.decision_prompts.length}</Chip></div>
          {(p.decision_prompts || []).map((prompt, index) => <div key={index} style={{ display: "flex", gap: 7, alignItems: "flex-start", padding: "5px 0", borderTop: index ? "1px solid " + C.line : 0, fontSize: 11.5 }}><span style={{ color: C.warn }}>؟</span><span>{prompt}</span></div>)}
          <div style={{ marginTop: 7 }}><button type="button" onClick={() => setView({ ...view, tab: "decisions" })} style={{ border: 0, padding: 0, background: "transparent", color: C.info, cursor: "pointer", font: "inherit", fontSize: 11.5 }}>افتح مصفوفة القرارات لحسمها ←</button></div>
          <div style={{ fontSize: 10.5, color: C.muted, marginTop: 5 }}>تبقى الأسئلة مقترحات من القالب حتى تسجّل قرارًا فعليًا بالمبرر والمالك والحالة.</div>
        </section>}
      </div>}
      {lateTasks.length > 0 && <div style={{ ...S.card, gridColumn: "1 / -1" }}><div style={{ fontSize: 13, fontWeight: 700, color: C.bad, marginBottom: 6 }}>مهام متأخرة ({lateTasks.length})</div>{lateTasks.slice(0, 8).map((t) => <div key={t.id} style={{ fontSize: 12.5, padding: "3px 0" }}>⏰ {t.title} — {fmtShort(t.due_date)} <Who id={t.assignee_id} size={15} /></div>)}</div>}
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
function ProjectDecisions({ p }) {
  const prompts = Array.isArray(p.decision_prompts) ? p.decision_prompts : [];
  return <div style={{ display: "grid", gap: 10 }}>
    {prompts.length > 0 && <section style={{ ...S.card, padding: 12 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 7 }}>
        <b style={{ fontSize: 13 }}>أسئلة قرارات يجب حسمها</b><Chip>{prompts.length}</Chip><span style={{ flex: 1 }} />
        <span style={{ fontSize: 10.5, color: C.muted }}>تحضيرية — ليست قرارات معتمدة</span>
      </div>
      {prompts.map((prompt, index) => <div key={index} style={{ fontSize: 12, padding: "6px 0", borderTop: "1px solid " + C.line }}>◦ {prompt}</div>)}
    </section>}
    <DecisionsView projectId={p.id} />
  </div>;
}
function PeopleTab({ p, canE }) {
  const { people, nameOf, A: act, toast, confirm, idx, today } = useP(); const [add, setAdd] = useState(false);
  const members = p.members || [];
  const save = async (list, lead) => { await act.saveProject({ ...p, members: list, lead_id: lead || p.lead_id }, false); };
  return <div style={S.card}>
    {p.lead_id && <div style={{ padding: "7px 0 10px", borderBottom: "1px solid " + C.line, marginBottom: 5 }}><div style={{ fontSize: 10.5, color: C.muted, marginBottom: 4 }}>قائد المشروع</div><Who id={p.lead_id} /></div>}
    {(p.template_roles || []).length > 0 && <section style={{ border: "1px dashed " + C.line, borderRadius: 8, padding: 10, marginBottom: 10 }}><div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}><b style={{ fontSize: 12.5 }}>الأدوار المطلوبة من القالب</b><Chip>{p.template_roles.length}</Chip><span style={{ flex: 1 }} /><span style={{ fontSize: 10.5, color: C.muted }}>غير مسندة</span></div><div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{p.template_roles.map((role, index) => <Chip key={index} color={C.muted}>{role} · غير معين</Chip>)}</div></section>}
    {!members.length ? <Empty icon="👥" title="لا يوجد أعضاء مضافون للمشروع" sub="أضف أعضاء من مساحة العمل وحدد دور كل عضو. لا تتم إضافة أشخاص غير مسجلين." /> : members.map((mm) => {
      const assigned = idx.list.filter((task) => task.project_id === p.id && task.assignee_id === mm.member_id && idx.isLeaf(task.id));
      const open = assigned.filter((task) => ["todo", "active"].includes(D.cat(task.status)));
      const overdue = open.filter((task) => D.isOverdueLeaf(task, idx, today));
      return <div key={mm.member_id} style={{ display: "grid", gridTemplateColumns: "minmax(130px,1.2fr) auto minmax(110px,1fr) auto", gap: 8, alignItems: "center", padding: "9px 0", borderBottom: "1px solid " + C.line }}>
        <Who id={mm.member_id} />
        {canE && mm.role !== "Lead" ? <select aria-label={"دور " + nameOf(mm.member_id)} style={{ ...S.sel, width: 120, padding: "4px 6px" }} value={mm.role} onChange={(e) => save(members.map((x) => x.member_id === mm.member_id ? { ...x, role: e.target.value } : x))}>{["Contributor", "Reviewer", "Stakeholder"].map((role) => <option key={role} value={role}>{L.memberRole[role]}</option>)}</select> : <Chip color={mm.role === "Lead" ? A : C.info}>{L.memberRole[mm.role]}</Chip>}
        <span style={{ fontSize: 10.5, color: overdue.length ? C.bad : C.muted }}>{open.length} مفتوحة · {overdue.length} متأخرة · {assigned.length} إجمالي</span>
        {canE && mm.role !== "Lead" && <Btn small danger onClick={async () => { if (await confirm("إزالة " + nameOf(mm.member_id) + " من المشروع؟")) await save(members.filter((x) => x.member_id !== mm.member_id)); }}>إزالة</Btn>}
      </div>;
    })}
    {canE && <div style={{ marginTop: 10 }}><Btn small kind="primary" onClick={() => setAdd(true)}>＋ إضافة عضو</Btn></div>}
    <div style={{ fontSize: 11, color: C.muted, marginTop: 8 }}>حِمل العمل محسوب من المهام المسندة لهذا العضو داخل هذا المشروع فقط. الأعضاء هم أعضاء مساحة العمل، ولا تتم دعوة حسابات جديدة من هذه الشاشة.</div>
    {add && <FormModal title="إضافة عضو للمشروع" initial={{ role: "Contributor" }} onClose={() => setAdd(false)} fields={[{ key: "member_id", label: "العضو", type: "select", required: true, allowEmpty: false, options: people.filter((x) => !members.some((m) => m.member_id === x.id)).map((x) => ({ v: x.id, l: x.name })) }, { key: "role", label: "الدور", type: "select", allowEmpty: false, options: ["Contributor", "Reviewer", "Stakeholder", "Lead"].map((role) => ({ v: role, l: L.memberRole[role] })) }]} onSubmit={async (v) => { if (v.role === "Lead") await save([...members.map((x) => x.role === "Lead" ? { ...x, role: "Contributor" } : x), { member_id: v.member_id, role: "Lead" }], v.member_id); else await save([...members, { member_id: v.member_id, role: v.role }]); setAdd(false); }} />}
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
function RelatedTab({ p, canE }) {
  const { A: act, toast, ws, data, can, me, today, setPage } = useP();
  const links = p.links || [];
  const [f, setF] = useState(false);
  const [meetings, setMeetings] = useState([]);
  const [loadingMeetings, setLoadingMeetings] = useState(true);
  const [meetingError, setMeetingError] = useState("");
  const [creatingFollowup, setCreatingFollowup] = useState("");
  const creatingFollowupsRef = useRef(new Set());

  const refreshMeetings = async () => {
    if (!ws?.id) { setMeetings([]); setLoadingMeetings(false); return; }
    setLoadingMeetings(true); setMeetingError("");
    try {
      const result = await listKnowledgeMeetings(ws.id);
      if (!result.ok) throw result.error || new Error("تعذر تحميل اجتماعات المعرفة.");
      setMeetings(result.meetings || []);
    } catch (error) {
      setMeetingError(error?.message || "تعذر تحميل اجتماعات المعرفة.");
    } finally {
      setLoadingMeetings(false);
    }
  };
  useEffect(() => { refreshMeetings(); }, [ws?.id]);

  const linkedMeetings = meetings
    .filter((meeting) => !meeting.archived && meeting.status !== "archived")
    .filter((meeting) => meeting.relatedSystem === "projects" && String(meeting.relatedId) === String(p.id))
    .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));

  async function createFollowupTask(meeting, followup, index) {
    const key = String(meeting.id) + ":" + index;
    if (creatingFollowupsRef.current.has(key)) return;
    if (p.archived_at || p.status === "Archived") {
      toast("استعد المشروع قبل إنشاء مهام متابعة جديدة.");
      return;
    }
    if (!can("task.write", p)) {
      toast("ليس لديك صلاحية إنشاء مهام في هذا المشروع.");
      return;
    }
    const existing = data.tasks.find((task) =>
      task.source_meeting_id === meeting.id && Number(task.source_followup_index) === index
    );
    if (existing) {
      toast("هذه المتابعة مرتبطة بالفعل بمهمة: " + existing.title);
      return;
    }
    const title = String(followup || "").trim();
    if (!title || typeof act.saveTask !== "function") return;
    creatingFollowupsRef.current.add(key);
    setCreatingFollowup(key);
    try {
      const saved = await act.saveTask({
        title,
        project_id: p.id,
        assignee_id: me,
        status: "Not Started",
        planning_bucket: "Inbox",
        due_date: meeting.date && meeting.date >= today ? meeting.date : "",
        source_meeting_id: meeting.id,
        source_meeting_title: meeting.title || "",
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
    <section style={S.card}>
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
              const existing = data.tasks.find((task) => task.source_meeting_id === meeting.id && Number(task.source_followup_index) === index);
              const key = String(meeting.id) + ":" + index;
              return <li key={index} style={{ marginBottom: 6 }}>
                <div>{String(followup)}</div>
                {existing ? <div style={{ fontSize: 11, color: C.ok, marginTop: 2 }}>✓ مهمة مرتبطة: {existing.title}</div>
                  : !p.archived_at && p.status !== "Archived" && can("task.write", p) ? <Btn small disabled={creatingFollowup === key} onClick={() => createFollowupTask(meeting, followup, index)}>{creatingFollowup === key ? "جارٍ الإنشاء…" : "تحويل إلى مهمة"}</Btn>
                    : <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{p.archived_at || p.status === "Archived" ? "استعد المشروع لإنشاء مهمة متابعة." : "لا تملك صلاحية إنشاء مهام في هذا المشروع."}</div>}
              </li>;
            })}</ul></div>}
          </article>;
        })}
    </section>
    <section style={S.card}>
      <b style={{ fontSize: 13 }}>روابط ومراجع خارجية</b>
      <div style={{ fontSize: 12, color: C.muted, margin: "6px 0 8px" }}>تظل الروابط الخارجية مملوكة للمشروع.</div>
      {links.map((l, i) => <div key={i} style={{ marginBottom: 10 }}>
        <div style={{ display: "flex", gap: 8, padding: "5px 0", fontSize: 13, alignItems: "center" }}>🔗 <a href={l.url} target="_blank" rel="noreferrer" style={{ color: C.info }}>{l.title || l.url}</a><span style={{ flex: 1 }} />{canE && <Btn small danger onClick={() => act.saveProject({ ...p, links: links.filter((_, j) => j !== i) }, false)}>×</Btn>}</div>
        {["youtube","vimeo","loom","file"].includes(getMediaEmbed(l.url)?.provider) && <MediaEmbed url={l.url} title={l.title || "فيديو مرتبط بالمشروع"} workspaceId="projects" itemId={p.id + ":" + i} />}
      </div>)}
      {!links.length && <span style={{ fontSize: 12, color: C.muted }}>لا مراجع</span>}
      {canE && <div style={{ marginTop: 10 }}><Btn small onClick={() => setF(true)}>➕ رابط</Btn></div>}
      {f && <FormModal title="رابط مرجعي" initial={{}} onClose={() => setF(false)} fields={[{ key: "title", label: "العنوان" }, { key: "url", label: "الرابط", type: "url", required: true }]} onSubmit={async (v) => { await act.saveProject({ ...p, links: [...links, v] }, false); setF(false); }} />}
    </section>
  </div>;
}
