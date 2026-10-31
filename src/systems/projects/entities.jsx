import React, { useState, useMemo, useRef } from "react";
import { A, S } from "../../core/ui.jsx";
import { C, Btn, Chip, Head, Empty, Progress, Seg, Board, SearchBar, Tabs, FormModal, Modal, Field } from "../../core/kit.jsx";
import { fmt, fmtShort, diffDays } from "../../core/dates.js";
import { uid, nowIso } from "../../core/records.jsx";
import { useP } from "./store.jsx";
import * as D from "./domain.js";
import { L, opts, PRIORITY_COLOR, STATUS_COLOR, SEV_COLOR } from "./lookups.js";
import { StatusChip, PriorityChip, Who, ProjectName, mOpts, projOpts } from "./parts.jsx";

const RowActions = ({ onEdit, onDelete, canW, extra }) => canW ? <span style={{ display: "inline-flex", gap: 5 }}>{extra}<Btn small onClick={onEdit}>✎</Btn><Btn small danger onClick={onDelete}>🗑</Btn></span> : null;
const projectFilterOpts = (projects) => [{ v: "", l: "كل المشاريع" }, ...projOpts(projects)];

// ═════ Outputs ═════
export function OutputsView({ projectId }) {
  const { data, A: act, can, projectsById, people, toast, me, confirm, lookups, idx, openTask } = useP();
  const [form, setForm] = useState(null); const [type, setType] = useState(""); const [ap, setAp] = useState(""); const [q, setQ] = useState("");
  const list = data.outputs.filter((o) => (!projectId || o.project_id === projectId) && (!type || o.type === type) && (!ap || o.approval === ap) && (!q || o.name.toLowerCase().includes(q.toLowerCase())));
  const canNew = projectId ? can("output.write", projectsById[projectId]) : data.projects.some((p) => can("output.write", p));
  const submit = async (v) => {
    const project = projectsById[v.project_id]; const prev = v.id ? data.outputs.find((o) => o.id === v.id) : null; const rec = { ...v, id: v.id || uid() };
    if (!project || project.is_system) throw new Error("اختر مشروعًا صالحًا قبل حفظ المخرج.");
    if (rec.task_id) {
      const task = idx.byId[rec.task_id];
      if (!task || task.project_id !== rec.project_id) throw new Error("المهمة المرتبطة يجب أن تكون من المشروع نفسه.");
    }
    if (rec.prd_id) {
      const prd = data.prds.find((x) => x.id === rec.prd_id);
      if (!prd || prd.project_id !== rec.project_id) throw new Error("المواصفة المرتبطة يجب أن تكون من المشروع نفسه.");
      if (rec.prd_requirement_id && !(prd.requirements || []).some((x) => x.id === rec.prd_requirement_id)) throw new Error("المتطلب المختار لا ينتمي إلى المواصفة المرتبطة.");
    } else if (rec.prd_requirement_id) throw new Error("لا يمكن ربط متطلب دون مواصفة.");
    if (prev?.approval === "Final") throw new Error("المخرج النهائي مقفل؛ أنشئ مخرجاً جديداً للنسخة المعدلة.");
    if (rec.approval === "Final" && (!prev || prev.approval !== "Final")) {
      if (!can("output.approve", project)) throw new Error("اعتماد المخرج النهائي للقائد أو المراجع فقط");
      if (!rec.url && !(rec.files || []).length && !(await confirm("المخرج النهائي بلا ملف أو رابط. المتابعة؟"))) return false;
      rec.approved_by = me; rec.approved_at = nowIso();
    } else if (rec.approval !== "Final") { rec.approved_by = null; rec.approved_at = null; }
    await act.put("outputs", rec, project); toast("✅ تم الحفظ"); setForm(null);
  };
  return (
    <div>
      {!projectId && <Head title="المخرجات" sub={`${list.length} مخرج`} right={canNew && <Btn kind="primary" onClick={() => setForm({})}>➕ مخرج</Btn>} />}
      {projectId && canNew && <div style={{ marginBottom: 10 }}><Btn kind="primary" small onClick={() => setForm({ project_id: projectId })}>➕ مخرج</Btn></div>}
      <SearchBar value={q} onChange={setQ} placeholder="بحث…"><select style={{ ...S.sel, width: 140 }} value={type} onChange={(e) => setType(e.target.value)}><option value="">كل الأنواع</option>{lookups.output_type.map((x) => <option key={x}>{x}</option>)}</select><select style={{ ...S.sel, width: 130 }} value={ap} onChange={(e) => setAp(e.target.value)}><option value="">كل الحالات</option>{opts(L.approval).map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}</select></SearchBar>
      {!list.length ? <Empty icon="📦" title="لا مخرجات" sub="المخرجات هي ما يُسلَّم فعلاً (تصميم، كود، مستند…)" /> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 10 }}>
          {list.map((o) => (
            <div key={o.id} style={{ ...S.card, padding: "10px 12px" }}>
              <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4 }}><span style={{ fontSize: 13, fontWeight: 700, flex: 1 }}>📦 {o.name}</span><Chip color={o.approval === "Final" ? C.ok : o.approval === "Review" ? C.warn : C.muted}>{L.approval[o.approval]}</Chip></div>
              <div style={{ fontSize: 11.5, color: C.dim, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}><Chip>{o.type}</Chip>{!projectId && <ProjectName id={o.project_id} />}{o.task_id && idx.byId[o.task_id] && <button onClick={() => openTask(o.task_id)} style={{ border: 0, background: "transparent", color: C.info, cursor: "pointer", padding: 0 }}>🔗 {idx.byId[o.task_id].title}</button>}</div>
              {o.url && <a href={o.url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: C.info, display: "block", margin: "4px 0", wordBreak: "break-all" }}>🔗 {o.url}</a>}
              {o.notes && <div style={{ fontSize: 12, color: C.dim, margin: "4px 0" }}>{o.notes}</div>}
              {o.approved_by && <div style={{ fontSize: 10.5, color: C.muted }}>اعتمده {<Who id={o.approved_by} size={14} />} · {fmt((o.approved_at || "").slice(0, 10))}</div>}
              <div style={{ marginTop: 6 }}>{o.approval === "Final" ? <Chip color={C.ok}>🔒 مخرج نهائي — لا يُعدَّل</Chip> : <RowActions canW={can("output.write", projectsById[o.project_id])} onEdit={() => setForm(o)} onDelete={() => act.del("outputs", o.id, o.name)} />}</div>
            </div>))}
        </div>)}
      {form && <FormModal title={form.id ? "تعديل المخرج" : "مخرج جديد"} wide initial={{ approval: "Draft", type: lookups.output_type[0], ...form }} onClose={() => setForm(null)} onSubmit={submit} fields={[
        { key: "name", label: "الاسم", required: true, span: 2 },
        { key: "project_id", label: "المشروع", type: "select", required: true, allowEmpty: false, options: projOpts(data.projects.filter((p) => !projectId || p.id === projectId)) },
        { key: "type", label: "النوع", type: "select", allowEmpty: false, options: lookups.output_type.map((x) => ({ v: x, l: x })) },
        { key: "task_id", label: "المهمة المرتبطة", type: "select", emptyLabel: "— بلا —", options: (v) => idx.list.filter((t) => t.project_id === v.project_id).map((t) => ({ v: t.id, l: t.title })) },
        { key: "prd_id", label: "المواصفة التي يحقّقها", type: "select", emptyLabel: "— بلا —", options: (v) => data.prds.filter((p) => p.project_id === v.project_id).map((p) => ({ v: p.id, l: p.title })) },
        { key: "prd_requirement_id", label: "المتطلب الذي يثبته", type: "select", emptyLabel: "— بلا متطلب —", options: (v) => ((data.prds.find((p) => p.id === v.prd_id) || {}).requirements || []).map((x) => ({ v: x.id, l: x.title })) },
         { key: "approval", label: "الاعتماد", type: "select", allowEmpty: false, options: opts(L.approval) },
        { key: "url", label: "الرابط", type: "url" }, { key: "notes", label: "ملاحظات", type: "textarea", rows: 2 }]} />}
    </div>
  );
}

// ═════ Risks (+ 5×5 matrix) ═════
export function RisksView({ projectId }) {
  const { data, A: act, can, projectsById, people, toast, settings, confirm, openProject } = useP();
  const [form, setForm] = useState(null); const [mode, setMode] = useState("list"); const [st, setSt] = useState("open"); const [closing, setClosing] = useState(null); const convertingRiskIds = useRef(new Set());
  const base = data.risks.filter((r) => !projectId || r.project_id === projectId);
  const list = base.filter((r) => (st === "all" ? true : st === "open" ? D.isOpenRisk(r) : r.status === st)).sort((a, b) => D.riskScore(b) - D.riskScore(a));
  const canNew = projectId ? can("risk.write", projectsById[projectId]) : data.projects.some((p) => can("risk.write", p));
  const lvlColor = (r) => ({ High: C.bad, Medium: C.warn, Low: C.ok })[D.riskLevel(r, settings)];
  async function changeStatus(r, to) {
    const p = projectsById[r.project_id];
    if (to === "Closed") return setClosing(r);
    if (to === "Materialized") {
      if (convertingRiskIds.current.has(r.id)) return;
      convertingRiskIds.current.add(r.id);
      try {
        const linkedIssue = D.issueForRisk(r, data.issues);
        if (!linkedIssue && !(r.status === "Materialized" || r.converted_issue_id)) {
          if (!(await confirm(`تحويل الخطر «${r.title}» إلى مشكلة؟ سيُنشأ سجل مشكلة مفتوحة ويُربط به.`))) return;
        }
        const issue = await act.convertRiskToIssue(r.id);
        toast(linkedIssue ? "تم العثور على المشكلة المرتبطة بالفعل؛ لم يتم إنشاء نسخة أخرى." : issue ? "✅ تحوّل الخطر إلى مشكلة بعملية ذرية" : "تعذّر تحويل الخطر");
        return;
      } catch (error) {
        toast("⛔ لم يتم تحويل الخطر: " + (error?.message || "فشل الحفظ"));
        return;
      } finally {
        convertingRiskIds.current.delete(r.id);
      }
    }
    await act.put("risks", { ...r, status: to }, p);
  }
  const submit = async (v) => { const errs = D.validateRisk(v); if (errs.length) throw new Error(errs[0]); await act.put("risks", { ...v, id: v.id || uid(), status: v.status || "Open" }, projectsById[v.project_id]); toast("✅ تم الحفظ"); setForm(null); };
  return (
    <div>
      {!projectId && <Head title="المخاطر والمشاكل والقرارات" sub="" />}
      <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap", alignItems: "center" }}>
        {canNew && <Btn kind="primary" small onClick={() => setForm({ project_id: projectId })}>➕ خطر</Btn>}<Seg small value={mode} onChange={setMode} options={[{ v: "list", l: "قائمة" }, { v: "matrix", l: "مصفوفة 5×5" }]} />
        <select style={{ ...S.sel, width: 130 }} value={st} onChange={(e) => setSt(e.target.value)}><option value="open">المفتوحة</option><option value="all">الكل</option>{opts(L.riskStatus).map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}</select>
      </div>
      {mode === "matrix" ? (
        <div style={S.card}><div style={{ display: "grid", gridTemplateColumns: "40px repeat(5,1fr)", gap: 4 }}>
          {[5, 4, 3, 2, 1].map((p) => (<React.Fragment key={p}><div style={{ fontSize: 11, color: C.muted, alignSelf: "center", textAlign: "center" }}>احتمال {p}</div>{[1, 2, 3, 4, 5].map((i) => { const score = p * i; const cell = list.filter((r) => r.probability === p && r.impact === i); const bg = score >= settings.riskHigh ? "rgba(239,68,68,0.15)" : score >= settings.riskMedium ? "rgba(245,158,11,0.15)" : "rgba(16,185,129,0.1)"; return <div key={i} style={{ minHeight: 56, background: bg, borderRadius: 6, padding: 4, fontSize: 10.5 }}>{cell.map((r) => <div key={r.id} onClick={() => setForm(r)} style={{ background: "#fff", borderRadius: 4, padding: "1px 5px", marginBottom: 2, cursor: "pointer", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.title}</div>)}</div>; })}</React.Fragment>))}
          <div /><>{[1, 2, 3, 4, 5].map((i) => <div key={i} style={{ fontSize: 11, color: C.muted, textAlign: "center" }}>تأثير {i}</div>)}</>
        </div></div>
      ) : !list.length ? <Empty icon="🛡" title="لا مخاطر" sub="سجّل المخاطر المحتملة قبل أن تتحول إلى مشاكل." /> : (
        <div style={{ ...S.card, padding: "4px 12px" }}>{list.map((r) => (
          <div key={r.id} style={{ display: "grid", gridTemplateColumns: "44px 1fr auto", gap: 10, padding: "9px 0", borderBottom: `1px solid ${C.line}`, alignItems: "center" }}>
            <div style={{ textAlign: "center" }}><div style={{ fontSize: 17, fontWeight: 800, color: lvlColor(r) }}>{D.riskScore(r)}</div><div style={{ fontSize: 9, color: C.muted }}>{r.probability}×{r.impact}</div></div>
            <div><div style={{ fontSize: 13, fontWeight: 700 }}>{r.title} <Chip color={STATUS_COLOR[r.status]}>{L.riskStatus[r.status]}</Chip></div><div style={{ fontSize: 11.5, color: C.dim }}>{r.mitigation || "—"}</div><div style={{ fontSize: 11, color: C.muted, display: "flex", gap: 10, alignItems: "center" }}>{!projectId && <ProjectName id={r.project_id} />}<Who id={r.owner_id} size={15} />{r.review_date && <span>مراجعة {fmtShort(r.review_date)}</span>}{r.converted_issue_id && <button type="button" onClick={() => openProject(r.project_id, "issues")} style={{ border: 0, padding: 0, background: "none", color: C.info, cursor: "pointer", textDecoration: "underline" }}>↗ فتح المشكلة المرتبطة</button>}</div></div>
            <span style={{ display: "inline-flex", gap: 5, alignItems: "center" }}>
              {can("risk.write", projectsById[r.project_id]) && (D.RISK_NEXT[r.status] || []).length > 0 && <select style={{ ...S.sel, width: 110, padding: "3px 6px", fontSize: 11 }} value="" onChange={(e) => e.target.value && changeStatus(r, e.target.value)}><option value="">انقل إلى…</option>{D.RISK_NEXT[r.status].map((s) => <option key={s} value={s}>{L.riskStatus[s]}</option>)}</select>}
              <RowActions canW={can("risk.write", projectsById[r.project_id])} onEdit={() => setForm(r)} onDelete={() => act.del("risks", r.id, r.title)} />
            </span>
          </div>))}</div>)}
      {form && <FormModal title={form.id ? "تعديل الخطر" : "خطر جديد"} wide initial={{ probability: 3, impact: 3, status: "Open", ...form }} onClose={() => setForm(null)} onSubmit={submit} fields={[
        { key: "title", label: "عنوان الخطر", required: true, span: 2 }, { key: "project_id", label: "المشروع", type: "select", required: true, allowEmpty: false, options: projOpts(data.projects.filter((p) => !p.is_system && (!projectId || p.id === projectId))) },
        { key: "owner_id", label: "المسؤول", type: "select", options: mOpts(people) },
        { key: "probability", label: "الاحتمال (1–5)", type: "number", min: 1, max: 5, required: true }, { key: "impact", label: "التأثير (1–5)", type: "number", min: 1, max: 5, required: true },
        { key: "review_date", label: "تاريخ المراجعة", type: "date" }, { key: "prd_id", label: "نشأ من مواصفة", type: "select", emptyLabel: "— بلا —", options: (v) => data.prds.filter((p) => p.project_id === v.project_id).map((p) => ({ v: p.id, l: p.title })) },
        { key: "mitigation", label: "خطة التخفيف", type: "textarea", rows: 2 }, { key: "notes", label: "ملاحظات", type: "textarea", rows: 2 }]} />}
      {closing && <FormModal title="إغلاق الخطر" initial={{ reason: "" }} fields={[{ key: "reason", label: "سبب الإغلاق", required: true, type: "textarea" }]} onClose={() => setClosing(null)} onSubmit={async (v) => { await act.put("risks", { ...closing, status: "Closed", closed_at: nowIso(), closed_reason: v.reason }, projectsById[closing.project_id]); setClosing(null); }} />}
    </div>
  );
}

// ═════ Issues ═════
export function IssuesView({ projectId }) {
  const { data, A: act, can, projectsById, people, toast, idx, openTask, openProject, setPage, view, setView } = useP();
  const [form, setForm] = useState(null); const [st, setSt] = useState(view.issueStatusFilter || "open"); const [sev, setSev] = useState(view.issueSeverityFilter || ""); const [resolving, setResolving] = useState(null); const [repairing, setRepairing] = useState({});
  const list = data.issues.filter((i) => (!projectId || i.project_id === projectId) && (st === "all" ? true : st === "open" ? D.isOpenIssue(i) : i.status === st) && (!sev || i.severity === sev)).sort((a, b) => ["Critical", "High", "Medium", "Low"].indexOf(a.severity) - ["Critical", "High", "Medium", "Low"].indexOf(b.severity));
  const canNew = projectId ? can("issue.write", projectsById[projectId]) : data.projects.some((p) => can("issue.write", p));
  const repairTasks = (issue) => [...new Set([...(issue.task_ids || []), ...idx.list.filter((t) => (t.issue_ids || []).includes(issue.id)).map((t) => t.id)])].map((id) => idx.byId[id]).filter(Boolean);
  async function createRepairTask(i) {
    if (repairing[i.id]) return;
    setRepairing((current) => ({ ...current, [i.id]: true }));
    try {
      const task = await act.createRepairTask(i);
      if (task) toast("✅ تم إنشاء مهمة الإصلاح وربطها بالمشكلة");
    } catch (error) {
      toast("⛔ لم تُنشأ مهمة الإصلاح: " + (error?.message || "فشل الحفظ"));
    } finally {
      setRepairing((current) => { const next = { ...current }; delete next[i.id]; return next; });
    }
  }
  async function change(i, to) {
    const p = projectsById[i.project_id]; if (to === "Resolved") return setResolving(i);
    const m = D.validateIssueStatus(i, to); if (m) return toast("⛔ " + m);
    await act.put("issues", { ...i, status: to, resolved_at: to === "Open" || to === "In Progress" ? null : i.resolved_at }, p);
  }
  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "center", flexWrap: "wrap" }}>{canNew && <Btn kind="primary" small onClick={() => setForm({ project_id: projectId })}>➕ مشكلة</Btn>}<select aria-label="حالة المشكلة" style={{ ...S.sel, width: 130 }} value={st} onChange={(e) => { setSt(e.target.value); setView((v) => ({ ...v, issueStatusFilter: e.target.value })); }}><option value="open">المفتوحة</option><option value="all">الكل</option>{opts(L.issueStatus).map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}</select><select aria-label="شدة المشكلة" style={{ ...S.sel, width: 130 }} value={sev} onChange={(e) => { setSev(e.target.value); setView((v) => ({ ...v, issueSeverityFilter: e.target.value })); }}><option value="">كل الشدات</option>{opts(L.severity).map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}</select>{(st !== "open" || sev) && <Btn small onClick={() => { setSt("open"); setSev(""); setView((v) => ({ ...v, issueStatusFilter: "open", issueSeverityFilter: "" })); }}>مسح الفلاتر</Btn>}</div>
      {!list.length ? <Empty icon="✅" title="لا مشاكل" /> : <div style={{ ...S.card, padding: "4px 12px" }}>{list.map((i) => (
        <div key={i.id} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, padding: "9px 0", borderBottom: `1px solid ${C.line}`, alignItems: "center" }}>
          <div><div style={{ fontSize: 13, fontWeight: 700 }}><Chip color={SEV_COLOR[i.severity]} solid>{L.severity[i.severity]}</Chip> {i.title} <Chip color={STATUS_COLOR[i.status]}>{L.issueStatus[i.status]}</Chip></div>
            {i.description && <div style={{ fontSize: 12, color: C.dim }}>{i.description}</div>}{i.resolution && <div style={{ fontSize: 12, color: C.ok }}>الحل: {i.resolution}</div>}
            <div style={{ fontSize: 11, color: C.muted, display: "flex", gap: 10 }}>{!projectId && <ProjectName id={i.project_id} />}<Who id={i.owner_id} size={15} /><span>{fmtShort(i.discovered_at)}</span>{i.from_risk_id && <span>⚠️ من خطر</span>}{i.from_discovery_id && <span>💡 من اكتشاف</span>}</div>
            {repairTasks(i).length > 0 && <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6, alignItems: "center" }}><span style={{ fontSize: 11, color: C.muted }}>مهام الإصلاح:</span>{repairTasks(i).map((t) => <Btn key={t.id} small onClick={() => openTask(t.id)}>🔧 {t.title}</Btn>)}</div>}
            {i.from_risk_id && <div style={{ fontSize: 11, marginTop: 4 }}>مصدرها خطر: <button type="button" onClick={() => openProject(i.project_id, "risks")} style={{ border: 0, padding: 0, background: "none", color: C.info, cursor: "pointer", textDecoration: "underline" }}>{(data.risks.find((r) => r.id === i.from_risk_id) || {}).title || "فتح المخاطر"} ↗</button></div>}{i.from_discovery_id && <div style={{ fontSize: 11, marginTop: 4 }}>مصدرها اكتشاف: <button type="button" onClick={() => setPage("discovery")} style={{ border: 0, padding: 0, background: "none", color: C.info, cursor: "pointer", textDecoration: "underline" }}>{(data.discovery.find((d) => d.id === i.from_discovery_id) || {}).title || "فتح الاكتشاف"} ↗</button></div>}</div>
          <span style={{ display: "inline-flex", gap: 5, alignItems: "center" }}>{can("issue.write", projectsById[i.project_id]) && <Btn small disabled={!!repairing[i.id]} onClick={() => createRepairTask(i)}>{repairing[i.id] ? "جارٍ الإنشاء…" : "＋ مهمة إصلاح"}</Btn>}{can("issue.write", projectsById[i.project_id]) && (D.ISSUE_NEXT[i.status] || []).length > 0 && <select style={{ ...S.sel, width: 110, padding: "3px 6px", fontSize: 11 }} value="" onChange={(e) => e.target.value && change(i, e.target.value)}><option value="">انقل إلى…</option>{D.ISSUE_NEXT[i.status].map((s) => <option key={s} value={s}>{L.issueStatus[s]}</option>)}</select>}<RowActions canW={can("issue.write", projectsById[i.project_id])} onEdit={() => setForm(i)} onDelete={() => act.del("issues", i.id, i.title)} /></span>
        </div>))}</div>}
      {form && <FormModal title={form.id ? "تعديل المشكلة" : "مشكلة جديدة"} wide initial={{ severity: "Medium", status: "Open", discovered_at: new Date().toISOString().slice(0, 10), ...form }} onClose={() => setForm(null)} onSubmit={async (v) => { await act.put("issues", { ...v, id: v.id || uid() }, projectsById[v.project_id]); toast("✅ تم الحفظ"); setForm(null); }} fields={[
        { key: "title", label: "العنوان", required: true, span: 2 }, { key: "project_id", label: "المشروع", type: "select", required: true, allowEmpty: false, options: projOpts(data.projects.filter((p) => !p.is_system && (!projectId || p.id === projectId))) },
        { key: "severity", label: "الشدة", type: "select", allowEmpty: false, options: opts(L.severity) }, { key: "owner_id", label: "المسؤول", type: "select", options: mOpts(people) }, { key: "discovered_at", label: "تاريخ الاكتشاف", type: "date" },
        { key: "task_ids", label: "مهام الإصلاح", type: "multi", options: (v) => idx.list.filter((t) => t.project_id === v.project_id).map((t) => ({ v: t.id, l: t.title })) }, { key: "description", label: "الوصف", type: "textarea" }]} />}
      {resolving && <FormModal title="حل المشكلة" initial={{ resolution: resolving.resolution || "" }} fields={[{ key: "resolution", label: "الحل (إلزامي)", type: "textarea", required: true }]} onClose={() => setResolving(null)} onSubmit={async (v) => { await act.put("issues", { ...resolving, status: "Resolved", resolution: v.resolution, resolved_at: nowIso() }, projectsById[resolving.project_id]); setResolving(null); }} />}
    </div>
  );
}

// ═════ Decisions ═════
export function DecisionsView({ projectId }) {
  const { data, A: act, can, projectsById, people, toast, idx, openTask, openProject, setPage } = useP();
  const [form, setForm] = useState(null); const [creating, setCreating] = useState({});
  const list = data.decisions.filter((d) => !projectId || d.project_id === projectId).sort((a, b) => (b.decided_at || "").localeCompare(a.decided_at || ""));
  const canNew = projectId ? can("decision.write", projectsById[projectId]) : data.projects.some((p) => can("decision.write", p));
  return (
    <div>
      {canNew && <div style={{ marginBottom: 10 }}><Btn kind="primary" small onClick={() => setForm({ project_id: projectId })}>➕ قرار</Btn></div>}
      {!list.length ? <Empty icon="⚖️" title="لا قرارات مسجَّلة" sub="سجّل القرارات المهمة وأسبابها حتى لا تُنسى." /> : <div style={{ ...S.card, padding: "4px 12px" }}>{list.map((d) => (
        <div key={d.id} style={{ padding: "10px 0", borderBottom: `1px solid ${C.line}` }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}><span style={{ fontSize: 13, fontWeight: 700, flex: 1 }}>⚖️ {d.title} <Chip color={d.status === "Approved" ? C.ok : d.status === "Superseded" ? C.warn : C.muted}>{L.decisionStatus[d.status]}</Chip></span><RowActions canW={can("decision.write", projectsById[d.project_id])} onEdit={() => setForm(d)} onDelete={() => act.del("decisions", d.id, d.title)} /></div>
          {d.rationale && <div style={{ fontSize: 12, color: C.dim }}><b>لماذا؟</b> {d.rationale}</div>}{d.rejected_alternatives && <div style={{ fontSize: 12, color: C.dim }}><b>بدائل مرفوضة:</b> {d.rejected_alternatives}</div>}
          {d.superseded_by_id && <div style={{ fontSize: 11.5, color: C.warn }}>حلّ محله: {(data.decisions.find((x) => x.id === d.superseded_by_id) || {}).title}</div>}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>{(d.implementation_task_ids || []).map((id) => idx.byId[id]).filter(Boolean).map((t) => <Btn key={t.id} small onClick={() => openTask(t.id)}>🛠 {t.title}</Btn>)}{(d.affected_task_ids || []).map((id) => idx.byId[id]).filter(Boolean).map((t) => <Btn key={"a"+t.id} small onClick={() => openTask(t.id)}>مهمة متأثرة: {t.title}</Btn>)}{d.prd_id && <Btn small onClick={() => openProject(d.project_id, "prds")}>📝 المواصفة المرتبطة</Btn>}{(d.affected_prd_ids || []).map((id) => data.prds.find((p) => p.id === id)).filter(Boolean).map((p) => <Btn key={p.id} small onClick={() => openProject(p.project_id, "prds")}>📝 {p.title}</Btn>)}{(d.affected_risk_ids || []).map((id) => data.risks.find((x) => x.id === id)).filter(Boolean).map((x) => <Btn key={x.id} small onClick={() => openProject(d.project_id, "risks")}>⚠️ {x.title}</Btn>)}{(d.affected_issue_ids || []).map((id) => data.issues.find((x) => x.id === id)).filter(Boolean).map((x) => <Btn key={x.id} small onClick={() => openProject(d.project_id, "issues")}>🔥 {x.title}</Btn>)}{(d.affected_discovery_ids || []).map((id) => data.discovery.find((x) => x.id === id)).filter(Boolean).map((x) => <Btn key={x.id} small onClick={() => setPage("discovery")}>💡 {x.title}</Btn>)}</div>
           <div style={{ fontSize: 11, color: C.muted, display: "flex", gap: 10, marginTop: 5 }}>{!projectId && <ProjectName id={d.project_id} />}<span>{fmt(d.decided_at)}</span>{d.decision_maker_id && <Who id={d.decision_maker_id} size={15} />}{d.status === "Approved" && can("task.write", projectsById[d.project_id]) && <Btn small disabled={!!creating[d.id]} onClick={async () => { setCreating((x) => ({ ...x, [d.id]: true })); try { const task = await act.createDecisionTask(d.id); openTask(task.id); } catch (error) { toast("⛔ " + (error?.message || "تعذر إنشاء مهمة التنفيذ")); } finally { setCreating((x) => { const next = { ...x }; delete next[d.id]; return next; }); } }}>{creating[d.id] ? "جارٍ الإنشاء…" : "＋ مهمة تنفيذ"}</Btn>}</div>
        </div>))}</div>}
      {form && <FormModal title={form.id ? "تعديل القرار" : "قرار جديد"} wide initial={{ status: "Proposed", decided_at: new Date().toISOString().slice(0, 10), ...form }} onClose={() => setForm(null)}
        validate={(v) => D.validateDecisionStatus(v, v.status) ? { superseded_by_id: "إلزامي عند «حلّ محله قرار آخر»" } : null}
        onSubmit={async (v) => { await act.put("decisions", { ...v, id: v.id || uid() }, projectsById[v.project_id]); toast("✅ تم الحفظ"); setForm(null); }} fields={[
          { key: "title", label: "القرار", required: true, span: 2 }, { key: "project_id", label: "المشروع", type: "select", required: true, allowEmpty: false, options: projOpts(data.projects.filter((p) => !p.is_system && (!projectId || p.id === projectId))) },
          { key: "status", label: "الحالة", type: "select", allowEmpty: false, options: opts(L.decisionStatus) }, { key: "decided_at", label: "تاريخ القرار", type: "date" }, { key: "decision_maker_id", label: "صاحب القرار", type: "select", options: mOpts(people) },
          { key: "superseded_by_id", label: "القرار الذي حلّ محله", type: "select", show: (v) => v.status === "Superseded", required: true, options: (v) => data.decisions.filter((x) => x.id !== v.id && x.project_id === v.project_id).map((x) => ({ v: x.id, l: x.title })) },
          { key: "prd_id", label: "المواصفة", type: "select", emptyLabel: "— بلا —", options: (v) => data.prds.filter((p) => p.project_id === v.project_id).map((p) => ({ v: p.id, l: p.title })) },
          { key: "affected_task_ids", label: "المهام المتأثرة", type: "multi", options: (v) => idx.list.filter((t) => t.project_id === v.project_id).map((t) => ({ v: t.id, l: t.title })) },
           { key: "affected_prd_ids", label: "المواصفات المتأثرة", type: "multi", options: (v) => data.prds.filter((p) => p.project_id === v.project_id).map((p) => ({ v: p.id, l: p.title })) },
           { key: "affected_risk_ids", label: "المخاطر المتأثرة", type: "multi", options: (v) => data.risks.filter((x) => x.project_id === v.project_id).map((x) => ({ v: x.id, l: x.title })) },
           { key: "affected_issue_ids", label: "المشاكل المتأثرة", type: "multi", options: (v) => data.issues.filter((x) => x.project_id === v.project_id).map((x) => ({ v: x.id, l: x.title })) },
           { key: "affected_discovery_ids", label: "الاكتشافات المرتبطة", type: "multi", options: (v) => data.discovery.filter((x) => !x.project_ids?.length || x.project_ids.includes(v.project_id)).map((x) => ({ v: x.id, l: x.title })) },
           { key: "implementation_task_ids", label: "مهام تنفيذ القرار", type: "multi", options: (v) => idx.list.filter((t) => t.project_id === v.project_id).map((t) => ({ v: t.id, l: t.title })) },
           { key: "rationale", label: "لماذا؟", type: "textarea" }, { key: "rejected_alternatives", label: "البدائل المرفوضة", type: "textarea", rows: 2 }, { key: "expected_impact", label: "الأثر المتوقع", type: "textarea", rows: 2 }]} />}
    </div>
  );
}

// ═════ PRDs ═════
export function PrdsView({ projectId }) {
  const { data, A: act, can, projectsById, people, toast, me, PRD_TEMPLATE, idx, confirm, nameOf } = useP();
  const [sel, setSel] = useState(null); const [form, setForm] = useState(null);
  const list = data.prds.filter((p) => !projectId || p.project_id === projectId);
  const canNew = projectId ? can("prd.write", projectsById[projectId]) : data.projects.some((p) => can("prd.write", p) && !p.is_system);
  const openPrd = sel ? data.prds.find((p) => p.id === sel) : null;
  return (
    <div>
      {!projectId && <Head title="المواصفات (PRDs)" sub={`${list.length} مواصفة`} right={canNew && <Btn kind="primary" onClick={() => setForm({})}>➕ مواصفة</Btn>} />}
      {projectId && canNew && <div style={{ marginBottom: 10 }}><Btn kind="primary" small onClick={() => setForm({ project_id: projectId })}>➕ مواصفة</Btn></div>}
      {!list.length ? <Empty icon="📝" title="لا مواصفات" sub="اكتب المواصفة قبل التنفيذ: المشكلة، الحل، مقاييس النجاح." /> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 10 }}>{list.map((p) => {
          const tasks = idx.list.filter((t) => t.prd_id === p.id && idx.isLeaf(t.id) && D.cat(t.status) !== "cancelled"); const done = tasks.filter((t) => D.cat(t.status) === "done").length;
          return <div key={p.id} onClick={() => setSel(p.id)} style={{ ...S.card, cursor: "pointer", padding: "11px 13px" }}>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}><span style={{ fontSize: 13.5, fontWeight: 700, flex: 1 }}>📝 {p.title}</span><Chip color={p.status === "Approved" ? C.ok : p.status === "Ready for Review" ? C.warn : p.status === "Superseded" ? C.muted : C.info}>{L.prdStatus[p.status]}</Chip></div>
            <div style={{ fontSize: 11, color: C.muted, margin: "3px 0" }}>v{p.version || 1}{!projectId && <> · <ProjectName id={p.project_id} /></>}</div>
            <div style={{ fontSize: 12, color: C.dim, minHeight: 30 }}>{p.tldr || "—"}</div>
            <div style={{ marginTop: 6 }}><Progress value={tasks.length ? done / tasks.length : null} /></div>
          </div>; })}</div>)}
      {form && <FormModal title="مواصفة جديدة" initial={{ status: "Not Started", ...form }} onClose={() => setForm(null)} onSubmit={async (v) => { const rec = { ...v, id: uid(), version: 1, sections: PRD_TEMPLATE.map((s) => ({ key: s.key, title: s.title, group: s.group, content: "" })), approvals: [], reviewer_ids: [], lead_id: v.lead_id || me }; const saved = await act.put("prds", rec, projectsById[v.project_id]); setForm(null); if (saved) setSel(saved.id); }} fields={[
        { key: "title", label: "عنوان المواصفة", required: true }, { key: "project_id", label: "المشروع", type: "select", required: true, allowEmpty: false, options: projOpts(data.projects.filter((p) => !p.is_system && (!projectId || p.id === projectId))) }, { key: "lead_id", label: "المسؤول", type: "select", options: mOpts(people) }]} />}
      {openPrd && <PrdEditor prd={openPrd} onClose={() => setSel(null)} onOpen={(id) => setSel(id)} />}
    </div>
  );
}
function PrdEditor({ prd, onClose, onOpen }) {
  const { data, A: act, can, projectsById, people, toast, me, PRD_TEMPLATE, idx, confirm, nameOf, openTask } = useP();
  const project = projectsById[prd.project_id]; const locked = ["Approved", "Superseded", "Ready for Review"].includes(prd.status); const canW = can("prd.write", project) && !locked;
  const [d, setD] = useState({ ...prd, sections: prd.sections || [], requirements: prd.requirements || [] }); const [tab, setTab] = useState("doc"); const [busy, setBusy] = useState(false); const [rejectForm, setRejectForm] = useState(false); const [requirementForm, setRequirementForm] = useState(null); const versioning = useRef(false);
  const secOf = (k) => (d.sections.find((s) => s.key === k) || {}).content || "";
  const setSec = (k, v, tpl) => setD((x) => { const ex = x.sections.some((s) => s.key === k); return { ...x, sections: ex ? x.sections.map((s) => (s.key === k ? { ...s, content: v } : s)) : [...x.sections, { key: k, title: tpl ? tpl.title : k, group: tpl ? tpl.group : "", content: v }] }; });
  const save = async (patch) => { setBusy(true); const rec = { ...d, ...(patch || {}) }; const s = await act.put("prds", rec, project); setBusy(false); if (s) { setD(s); toast("✅ تم الحفظ"); } return s; };
  const ready = D.prdApprovalReady(d, d.sections, d.approvals);
  const linkedTasks = idx.list.filter((t) => t.prd_id === d.id);
  const linkedOutputs = data.outputs.filter((o) => o.prd_id === d.id && !o.deleted_at);
  const requirements = d.requirements || [];
  const saveRequirement = async (v) => {
    const req = { ...v, id: v.id || uid(), title: String(v.title || "").trim(), updated_at: nowIso() };
    if (!req.title) throw new Error("عنوان المتطلب مطلوب");
    const next = v.id ? requirements.map((x) => x.id === v.id ? req : x) : [...requirements, req];
    if (req.status === "Verified" && !linkedOutputs.some((o) => o.prd_requirement_id === req.id && o.approval === "Final")) throw new Error("لا يمكن توثيق المتطلب قبل ربط مخرج نهائي يثبت تحقيقه.");
    await save({ requirements: next }); setRequirementForm(null);
  };
  const krs = data.krs; const myApproval = (d.approvals || []).find((a) => a.reviewer_id === me && a.version === (d.version || 1));
  async function review(decision, comment = "") { const apps = [...(d.approvals || []).filter((a) => !(a.reviewer_id === me && a.version === (d.version || 1))), { reviewer_id: me, decision, version: d.version || 1, at: nowIso(), comment: comment || "" }]; await save({ approvals: apps }); setRejectForm(false); }
  async function requestReview() { const r = D.prdApprovalReady(d, d.sections, d.approvals); if (r.missing.length) return toast("⛔ لا يمكن طلب المراجعة قبل استكمال: " + r.missing.join("، ")); await save({ status: "Ready for Review", submitted_for_review_at: nowIso() }); }
  async function approve() { const r = D.prdApprovalReady(d, d.sections, d.approvals); if (!r.ok) return toast("⛔ " + (r.missing.length ? "أقسام ناقصة: " + r.missing.join("، ") : "") + (r.pendingReviewers.length ? " بانتظار موافقة: " + r.pendingReviewers.map(nameOf).join("، ") : "")); await save({ status: "Approved", approved_at: nowIso() }); act.act("prds", d.id, "approved", d.title); }
  async function newVersion() {
    if (versioning.current) return;
    versioning.current = true;
    try {
      if (!(await confirm("إنشاء نسخة جديدة قابلة للتعديل؟ ستُوسَم النسخة الحالية «تم استبدالها».", { ok: "إنشاء نسخة" }))) return;
      setBusy(true);
      const next = await act.createPrdVersion(d);
      onOpen(next.id);
    } catch (error) {
      toast("⛔ لم يتم إنشاء النسخة الجديدة: " + (error?.message || "فشل الحفظ"));
    } finally {
      setBusy(false);
      versioning.current = false;
    }
  }
  async function risksFromSection() {
    const lines = secOf("risk_mitigation").split("\n").map((l) => l.trim()).filter(Boolean); if (!lines.length) return toast("اكتب المخاطر في قسم التخفيف أولاً (سطر لكل خطر)");
    if (!(await confirm(`إنشاء ${lines.length} سجل خطر من هذا القسم؟`))) return;
    for (const l of lines) { const [t, ...m] = l.split(/\s[—-]\s/); await act.put("risks", { id: uid(), title: t.trim(), project_id: d.project_id, probability: 3, impact: 3, status: "Open", mitigation: m.join(" — "), prd_id: d.id }, project); }
    toast("✅ أُنشئت سجلات المخاطر (راجع الاحتمال والتأثير)");
  }
  const groups = [...new Set(PRD_TEMPLATE.map((s) => s.group))];
  return (
    <Modal title={`${d.title} — v${d.version || 1}`} wide onClose={onClose} footer={<>
      {canW && <Btn kind="primary" onClick={() => save()} disabled={busy}>💾 حفظ</Btn>}
      {canW && d.status !== "Ready for Review" && <Btn onClick={requestReview}>📤 طلب مراجعة</Btn>}
      {can("prd.approve", project) && d.status === "Ready for Review" && <Btn kind="primary" onClick={approve}>✔ اعتماد</Btn>}
      {d.status === "Approved" && can("prd.approve", project) && <Btn onClick={newVersion} disabled={busy}>🆕 نسخة جديدة</Btn>}
      {canW && <Btn onClick={risksFromSection}>⚠️ حوّل المخاطر إلى سجلات</Btn>}
      {d.status === "Ready for Review" && can("prd.approve", project) && <Btn onClick={() => save({ status: "In Progress", submitted_for_review_at: null })}>↩ إرجاع للمسودة</Btn>}
      {!locked && can("prd.write", project) && <Btn danger onClick={async () => { await act.del("prds", d.id, d.title); onClose(); }}>🗑</Btn>}</>}>
      <div style={{ display: "flex", gap: 6, marginBottom: 8, alignItems: "center", flexWrap: "wrap" }}><Chip color={d.status === "Approved" ? C.ok : C.info}>{L.prdStatus[d.status]}</Chip><ProjectName id={d.project_id} />{locked && <span style={{ fontSize: 11, color: C.muted }}>🔒 {d.status === "Ready for Review" ? "قيد المراجعة — أعدها للمسودة قبل التعديل" : "نسخة معتمدة/مستبدلة — أنشئ نسخة جديدة للتعديل"}</span>}</div>
      <Tabs small value={tab} onChange={setTab} tabs={[{ id: "doc", label: "المواصفة" }, { id: "requirements", label: "المتطلبات", count: requirements.length }, { id: "meta", label: "البيانات والمراجعة" }, { id: "tasks", label: "المهام", count: linkedTasks.length }]} />
      {tab === "doc" && <div>
        <Field label="TLDR *"><textarea disabled={!canW} style={{ ...S.ta, minHeight: 60 }} value={d.tldr || ""} onChange={(e) => setD({ ...d, tldr: e.target.value })} /></Field>
        {groups.map((g) => <div key={g}><div style={{ fontSize: 12, fontWeight: 800, color: A, margin: "10px 0 6px" }}>{g}</div>{PRD_TEMPLATE.filter((s) => s.group === g).map((s) => <Field key={s.key} label={s.title + (s.required ? " *" : "")} hint={s.hint}><textarea disabled={!canW} style={{ ...S.ta, minHeight: 70 }} value={secOf(s.key)} onChange={(e) => setSec(s.key, e.target.value, s)} /></Field>)}</div>)}
      </div>}
      {tab === "requirements" && <div>
        {canW && <div style={{ marginBottom: 10 }}><Btn kind="primary" small onClick={() => setRequirementForm({ status: "Draft", priority: "Medium" })}>＋ إضافة متطلب</Btn></div>}
        {!requirements.length ? <Empty icon="📋" title="لا توجد متطلبات منفصلة" sub="أضف متطلبًا لكل شيء يمكن تنفيذه واختباره وتسليمه بشكل مستقل." /> : requirements.map((req) => {
          const reqTasks = linkedTasks.filter((t) => t.prd_requirement_id === req.id);
          const reqOutputs = linkedOutputs.filter((o) => o.prd_requirement_id === req.id);
          return <div key={req.id} style={{ ...S.card, marginBottom: 8, padding: "10px 12px" }}><div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}><b style={{ flex: 1 }}>{req.title}</b><Chip color={req.status === "Verified" ? C.ok : req.status === "In Progress" ? C.info : C.muted}>{({ Draft: "مسودة", Accepted: "مقبول", "In Progress": "قيد التنفيذ", Verified: "متحقق", Deferred: "مؤجل" })[req.status] || "مسودة"}</Chip><Chip>{({ Low: "منخفض", Medium: "متوسط", High: "عالٍ", Critical: "حرج" })[req.priority] || "متوسط"}</Chip>{canW && <Btn small onClick={() => setRequirementForm(req)}>تعديل</Btn>}</div>{req.description && <div style={{ fontSize: 12, color: C.dim, marginTop: 4 }}>{req.description}</div>}{req.acceptance_criteria && <div style={{ fontSize: 11.5, color: C.muted, marginTop: 4 }}>معايير القبول: {req.acceptance_criteria}</div>}<div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 7, fontSize: 11.5 }}><span>المهام: {reqTasks.length}</span><span>المخرجات: {reqOutputs.length}</span>{reqOutputs.some((o) => o.approval === "Final") && <Chip color={C.ok}>يوجد دليل نهائي</Chip>}</div>{reqTasks.map((t) => <div key={t.id} onClick={() => openTask(t.id)} style={{ cursor: "pointer", color: C.info, fontSize: 12, marginTop: 3 }}>↳ {t.title} ↗</div>)}{reqOutputs.map((o) => <div key={o.id} style={{ color: C.dim, fontSize: 12, marginTop: 3 }}>📦 {o.name} · {L.approval[o.approval] || o.approval}</div>)}</div>;
        })}
        {requirementForm && <FormModal title={requirementForm.id ? "تعديل المتطلب" : "متطلب جديد"} wide initial={requirementForm} onClose={() => setRequirementForm(null)} onSubmit={saveRequirement} fields={[{ key: "title", label: "عنوان المتطلب", required: true, span: 2 }, { key: "description", label: "الوصف", type: "textarea", rows: 2 }, { key: "acceptance_criteria", label: "معايير القبول", type: "textarea", rows: 2 }, { key: "priority", label: "الأولوية", type: "select", options: opts(L.priority), allowEmpty: false }, { key: "status", label: "الحالة", type: "select", allowEmpty: false, options: [{ v: "Draft", l: "مسودة" }, { v: "Accepted", l: "مقبول" }, { v: "In Progress", l: "قيد التنفيذ" }, { v: "Verified", l: "متحقق" }, { v: "Deferred", l: "مؤجل" }] }]} />}
      </div>}
      {tab === "meta" && <div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
          <Field label="المسؤول"><select disabled={!canW} style={S.sel} value={d.lead_id || ""} onChange={(e) => setD({ ...d, lead_id: e.target.value })}><option value="">—</option>{mOpts(people).map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}</select></Field>
          <Field label="موعد الإطلاق المستهدف"><input disabled={!canW} type="date" style={S.inp} value={d.target_ship_date || ""} onChange={(e) => setD({ ...d, target_ship_date: e.target.value })} /></Field>
        </div>
        <Field label="المراجعون (الموافقة مطلوبة منهم)"><div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{people.map((p) => { const on = (d.reviewer_ids || []).includes(p.id); return <label key={p.id} style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center", padding: "3px 8px", border: `1px solid ${on ? A : C.line}`, borderRadius: 8 }}><input disabled={!canW} type="checkbox" checked={on} onChange={(e) => setD({ ...d, reviewer_ids: e.target.checked ? [...(d.reviewer_ids || []), p.id] : (d.reviewer_ids || []).filter((x) => x !== p.id) })} />{p.name}</label>; })}</div></Field>
        <Field label="النتائج الرئيسية المرتبطة (مقاييس النجاح)"><select multiple disabled={!canW} style={{ ...S.sel, minHeight: 80 }} value={d.kr_ids || []} onChange={(e) => setD({ ...d, kr_ids: [...e.target.selectedOptions].map((o) => o.value) })}>{krs.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}</select></Field>
        <Field label="عناصر الاكتشاف المصدرية"><select multiple disabled={!canW} style={{ ...S.sel, minHeight: 80 }} value={d.discovery_ids || []} onChange={(e) => setD({ ...d, discovery_ids: [...e.target.selectedOptions].map((o) => o.value) })}>{data.discovery.map((k) => <option key={k.id} value={k.id}>{k.title}</option>)}</select></Field>
        <div style={{ fontSize: 12, fontWeight: 700, margin: "8px 0" }}>الموافقات (النسخة {d.version || 1})</div>
        {(d.reviewer_ids || []).map((r) => { const a = (d.approvals || []).find((x) => x.reviewer_id === r && x.version === (d.version || 1)); return <div key={r} style={{ fontSize: 12.5, padding: "3px 0" }}><Who id={r} size={16} /> — {a ? <b style={{ color: a.decision === "approve" ? C.ok : C.bad }}>{a.decision === "approve" ? "وافق" : "رفض"}</b> : <span style={{ color: C.muted }}>بالانتظار</span>} {a && a.comment}</div>; })}
        {(d.reviewer_ids || []).includes(me) && d.status === "Ready for Review" && <div style={{ display: "flex", gap: 6, marginTop: 8 }}><Btn small kind="primary" onClick={() => review("approve")}>✔ أوافق</Btn><Btn small danger onClick={() => setRejectForm(true)}>✖ أرفض</Btn>{myApproval && <span style={{ fontSize: 11, color: C.muted }}>ردّك الحالي: {myApproval.decision}</span>}</div>}
        {!ready.ok && <div style={{ fontSize: 11.5, color: C.warn, marginTop: 8 }}>متطلبات الاعتماد الناقصة: {[...ready.missing, ...ready.pendingReviewers.map((x) => "موافقة " + nameOf(x))].join("، ")}</div>}
      </div>}
      {tab === "tasks" && (!linkedTasks.length ? <Empty icon="✅" title="لا مهام مرتبطة" sub="اربط المهام بهذه المواصفة من نموذج المهمة (حقل المواصفة)." /> : linkedTasks.map((t) => { const req = requirements.find((x) => x.id === t.prd_requirement_id); return <div key={t.id} onClick={() => openTask(t.id)} style={{ padding: "6px 0", borderBottom: `1px solid ${C.line}`, fontSize: 13, cursor: "pointer" }}>{D.cat(t.status) === "done" ? "✅" : "⬜"} {t.title}{req && <span style={{ color: C.muted }}> · {req.title}</span>}</div>; }))}
      {rejectForm && <FormModal title="رفض المواصفة" initial={{ comment: "" }} onClose={() => setRejectForm(false)} onSubmit={async (v) => { if (!String(v.comment || "").trim()) throw new Error("اكتب سبب الرفض أو ملاحظات المراجعة."); await review("reject", v.comment.trim()); }} fields={[{ key: "comment", label: "سبب الرفض / الملاحظات", type: "textarea", required: true, rows: 3 }]} />}
    </Modal>
  );
}

// ═════ Discovery (PIO) ═════
export function DiscoveryView() {
  const { data, A: act, can, projectsById, people, toast, me, today, settings, confirm, openProject, idx, nameOf } = useP();
  const [form, setForm] = useState(null); const [mode, setMode] = useState("board"); const [q, setQ] = useState(""); const [type, setType] = useState(""); const [conv, setConv] = useState(null); const convertingDiscoveryIds = useRef(new Set());
  const runDiscoveryConversionOnce = async (id, work) => { if (convertingDiscoveryIds.current.has(id)) { toast("التحويل جارٍ بالفعل؛ انتظر اكتماله قبل إعادة المحاولة."); return null; } convertingDiscoveryIds.current.add(id); try { return await work(); } finally { convertingDiscoveryIds.current.delete(id); } };
  const list = data.discovery.filter((d) => (!type || d.type === type) && (!q || d.title.toLowerCase().includes(q.toLowerCase())));
  const statuses = Object.keys(L.discoveryStatus);
  const stale = (d) => d.status === "Inbox" && d.logged_at && diffDays(today, d.logged_at) > settings.inboxStaleDays;
  const typeIcon = { Problem: "🔴", Idea: "💡", Opportunity: "🌟" };
  async function move(id, to) {
    const d = data.discovery.find((x) => x.id === id); if (!d || d.status === to) return;
    const linked = (d.resolution_links || []).length > 0; const m = D.validateDiscoveryStatus(d, to, linked);
    if (m) { if (to === "Dropped") return setForm({ ...d, status: to, _need: "dropped_reason" }); if (to === "Working On") return setForm({ ...d, status: to, owner_id: d.owner_id || me, _need: "owner" }); if (to === "Completed") return setForm({ ...d, status: to, _need: "resolution_note" }); return toast("⛔ " + m); }
    await act.put("discovery", { ...d, status: to }); 
  }
  async function convert(d, kind) {
    const selectedProjectId = d._conversionProjectId || "";
    const source = data.discovery.find((x) => x.id === d.id) || d;
    if ((source.resolution_links || []).some((x) => x.kind === kind)) { toast("هذا الاكتشاف مرتبط بالفعل بعنصر من هذا النوع؛ افتح الرابط الموجود بدل إنشاء نسخة مكررة."); return; }
    d = source;
    const projectIds = (d.project_ids || []).filter((id) => projectsById[id] && !projectsById[id].archived_at);
    const pid = projectIds.length === 1 ? projectIds[0] : selectedProjectId;
    if (["task", "prd", "issue"].includes(kind) && !pid && projectIds.length === 0) { toast("اربط الاكتشاف بمشروع نشط أولاً، ثم أعد التحويل."); return; }
    if (["task", "prd", "issue"].includes(kind) && !pid) { setConv({ ...d, _conversionKind: kind, _conversionProjectId: "", _availableProjectIds: projectIds }); return; }
    if (["task", "prd", "issue"].includes(kind) && d.project_ids?.length && pid && !projectIds.includes(pid)) { toast("المشروع المختار يجب أن يكون من المشاريع المرتبطة النشطة بالاكتشاف."); return; }
    if (kind === "task") {
      if (!pid) return toast("اربط الاكتشاف بمشروع أولاً");
      try {
        const task = await runDiscoveryConversionOnce(d.id, () => act.convertDiscoveryToTask(d.id, pid));
        if (!task) return;
        toast(task ? "✅ تم إنشاء المهمة أو استكمال ربطها ذريًا" : "تعذّر تحويل الاكتشاف");
      } catch (error) {
        toast("⛔ لم يتم تحويل الاكتشاف: " + (error?.message || "فشل الحفظ"));
        return;
      }
    }
    if (kind === "prd") {
      if (!pid) return toast("اربط الاكتشاف بمشروع أولاً");
      try {
        const prd = await runDiscoveryConversionOnce(d.id, () => act.convertDiscoveryToPrd(d.id, pid));
        if (!prd) return;
        toast(prd ? "✅ تم إنشاء المواصفة أو استكمال ربطها ذريًا" : "تعذّر تحويل الاكتشاف");
      } catch (error) {
        toast("⛔ لم يتم إنشاء المواصفة: " + (error?.message || "فشل الحفظ"));
        return;
      }
    }
    if (kind === "project") {
      try {
        const project = await runDiscoveryConversionOnce(d.id, () => act.convertDiscoveryToProject(d.id));
        if (!project) return;
        toast("✅ تم إنشاء المشروع أو استكمال ربطه ذريًا");
      } catch (error) {
        toast("⛔ لم يتم تحويل الاكتشاف إلى مشروع: " + (error?.message || "فشل الحفظ"));
        return;
      }
    }
    if (kind === "issue") { if (!pid) return toast("اربط الاكتشاف بمشروع أولاً"); try { const issue = await runDiscoveryConversionOnce(d.id, () => act.convertDiscoveryToIssue(d.id, pid, today));
      if (!issue) return; toast(issue ? "✅ تم إنشاء المشكلة أو استكمال ربطها ذريًا" : "تعذّر تحويل الاكتشاف"); } catch (error) { toast("⛔ لم يتم تحويل الاكتشاف: " + (error?.message || "فشل الحفظ")); return; } }
    setConv(null);
  }
  const card = (d) => (
    <div style={{ ...S.card, padding: "9px 11px" }} onClick={() => setForm(d)}>
      <div style={{ fontSize: 12.5, fontWeight: 700 }}>{typeIcon[d.type]} {d.title}</div>
      <div style={{ fontSize: 11, color: C.dim, margin: "3px 0" }}>{d.proposed_solution ? "💬 " + d.proposed_solution.slice(0, 60) : d.description ? d.description.slice(0, 60) : ""}</div>
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center" }}>{d.impact_level && <Chip color={SEV_COLOR[d.impact_level]}>{L.severity[d.impact_level]}</Chip>}{stale(d) && <Chip color={C.warn}>⏳ يحتاج فرزاً</Chip>}{d.owner_id && <Who id={d.owner_id} size={15} />}{(d.resolution_links || []).length > 0 && <Chip color={C.ok}>↪ {(d.resolution_links || []).length}</Chip>}</div>
    </div>);
  return (
    <div>
      <Head title="الاكتشاف" sub="مشاكل · أفكار · فرص — الوارد قبل أن تتحول إلى مشاريع ومهام" right={<><Seg value={mode} onChange={setMode} options={[{ v: "board", l: "لوحة" }, { v: "list", l: "قائمة" }]} /><Btn kind="primary" onClick={() => setForm({ status: "Inbox", type: "Idea", logged_at: today })}>➕ عنصر</Btn></>} />
      <SearchBar value={q} onChange={setQ} placeholder="بحث…"><select style={{ ...S.sel, width: 130 }} value={type} onChange={(e) => setType(e.target.value)}><option value="">كل الأنواع</option>{opts(L.discoveryType).map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}</select></SearchBar>
      {mode === "board" ? <Board columns={statuses.map((s) => ({ id: s, label: L.discoveryStatus[s], color: s === "Dropped" ? "#EF4444" : s === "Completed" ? "#10B981" : s === "Working On" ? "#3B82F6" : "#94A3B8", items: list.filter((d) => d.status === s) }))} onMove={move} renderCard={card} />
        : !list.length ? <Empty icon="💡" title="لا عناصر" /> : <div style={{ ...S.card, padding: "4px 12px" }}>{list.map((d) => <div key={d.id} onClick={() => setForm(d)} style={{ display: "flex", gap: 8, padding: "8px 0", borderBottom: `1px solid ${C.line}`, cursor: "pointer", alignItems: "center", fontSize: 13 }}><span>{typeIcon[d.type]}</span><span style={{ flex: 1 }}>{d.title}</span><Chip color={C.info}>{L.discoveryStatus[d.status]}</Chip></div>)}</div>}
      {form && <FormModal title={form.id ? "عنصر اكتشاف" : "عنصر جديد"} wide initial={form} onClose={() => setForm(null)}
        footerExtra={form.id ? <><Btn onClick={() => { setConv(form); setForm(null); }}>↪ تحويل…</Btn><Btn danger onClick={async () => { await act.del("discovery", form.id, form.title); setForm(null); }}>🗑</Btn></> : null}
        validate={(v) => { const m = D.validateDiscoveryStatus(v, v.status, (v.resolution_links || []).length > 0); return m; }}
        onSubmit={async (v) => { const { _need, ...rec } = v; await act.put("discovery", { ...rec, id: rec.id || uid(), raised_by_member_id: rec.raised_by_member_id || me, source: rec.source || "manual", logged_at: rec.logged_at || today }); toast("✅ تم الحفظ"); setForm(null); }} fields={[
          { key: "title", label: "العنوان", required: true, span: 2 }, { key: "type", label: "النوع", type: "select", allowEmpty: false, options: opts(L.discoveryType) }, { key: "status", label: "الحالة", type: "select", allowEmpty: false, options: opts(L.discoveryStatus) },
          { key: "impact_level", label: "مستوى الأثر", type: "select", options: opts(L.severity), emptyLabel: "—" }, { key: "owner_id", label: "المسؤول", type: "select", options: mOpts(people), required: (v) => v.status === "Working On" },
          { key: "project_ids", label: "المشاريع المرتبطة", type: "multi", options: data.projects.filter((p) => !p.is_system).map((p) => ({ v: p.id, l: p.name })) },
          { key: "dropped_reason", label: "سبب الإسقاط", required: true, show: (v) => v.status === "Dropped" },
          { key: "resolution_note", label: "ملاحظة الحل", type: "textarea", rows: 2, show: (v) => v.status === "Completed" },
          { key: "description", label: "الوصف", type: "textarea" }, { key: "insights", label: "الأدلة", type: "textarea", rows: 2 }, { key: "proposed_solution", label: "الحل المقترح", type: "textarea", rows: 2 }]} />}
      {conv && <Modal title={"تحويل: " + conv.title} onClose={() => setConv(null)}><div style={{ display: "grid", gap: 8 }}>
        {conv._conversionKind ? <><Field label="اختر المشروع الذي سيُنشأ فيه العنصر"><select style={S.sel} value={conv._conversionProjectId || ""} onChange={(e) => setConv({ ...conv, _conversionProjectId: e.target.value })}><option value="">اختر مشروعاً…</option>{(conv._availableProjectIds || []).map((id) => <option key={id} value={id}>{projectsById[id].name}</option>)}</select></Field><Btn kind="primary" disabled={!conv._conversionProjectId} onClick={() => convert({ ...conv, _conversionProjectId: conv._conversionProjectId }, conv._conversionKind)}>متابعة التحويل</Btn></> : [["task", "✅ إلى مهمة"], ["prd", "📝 إلى مواصفة"], ["project", "📁 إلى مشروع (فكرة)"], ["issue", "🔥 إلى مشكلة"]].map(([k, l]) => <Btn key={k} onClick={() => convert(conv, k)}>{l}</Btn>)}
        <div style={{ fontSize: 11, color: C.muted }}>مشكلة محتملة (اكتشاف) ليست عطلًا مؤكدًا. التحويل إلى مشكلة ينشئ مشكلة تنفيذية مرتبطة بمصدرها.</div></div></Modal>}
    </div>
  );
}
