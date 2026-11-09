import React, { useState, useMemo, useRef, useEffect } from "react";
import { A, S } from "../../core/ui.jsx";
import { C, Btn, Chip, Head, Empty, Progress, Seg, Board, SearchBar, Tabs, FormModal, Modal, Field } from "../../core/kit.jsx";
import { fmt, fmtShort, diffDays } from "../../core/dates.js";
import { uid, nowIso } from "../../core/records.jsx";
import { supabase } from "../../core/supabase.js";
import { OUTPUT_STORAGE_BUCKET, outputFileMetadata, outputObjectPath, validateOutputUpload } from "./outputStorage.js";
import { useP } from "./store.jsx";
import * as D from "./domain.js";
import { L, opts, PRIORITY_COLOR, STATUS_COLOR, SEV_COLOR } from "./lookups.js";
import { StatusChip, PriorityChip, Who, ProjectName, mOpts, projOpts, TaskForm } from "./parts.jsx";

const RowActions = ({ onEdit, onDelete, canW, extra }) => canW ? <span style={{ display: "inline-flex", gap: 5 }}>{extra}<Btn small onClick={onEdit}>✎</Btn><Btn small danger onClick={onDelete}>🗑</Btn></span> : null;
const projectFilterOpts = (projects) => [{ v: "", l: "كل المشاريع" }, ...projOpts(projects)];
const recordDomId = (kind, id) => `projects-record-${kind}-${id}`;
function useRecordFocus(view, kind, projectId, listLength) {
  useEffect(() => {
    const focus = view?.focusRecord;
    if (!focus || focus.kind !== kind) return;
    const target = document.getElementById(recordDomId(kind, focus.id));
    if (target) target.scrollIntoView?.({ behavior: "smooth", block: "center" });
  }, [view?.focusRecord, kind, projectId, listLength]);
}
const recordFocusStyle = (view, kind, id) => view?.focusRecord?.kind === kind && view.focusRecord.id === id
  ? { outline: `2px solid ${A}`, outlineOffset: 2, borderRadius: 8 }
  : undefined;

function RecordDetailModal({ title, fields, onClose }) {
  const visible = fields.filter((field) => field.value !== null && field.value !== undefined && field.value !== "");
  return <Modal title={title} wide onClose={onClose}>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 10 }}>
      {visible.map((field) => <section key={field.label} style={{ border: `1px solid ${C.line}`, borderRadius: 8, padding: 10, minWidth: 0 }}>
        <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, marginBottom: 5 }}>{field.label}</div>
        <div style={{ fontSize: 12.5, color: C.dim, whiteSpace: "pre-wrap", overflowWrap: "anywhere", lineHeight: 1.8 }}>{String(field.value)}</div>
      </section>)}
    </div>
    {!visible.length && <Empty title="لا توجد تفاصيل إضافية" />}
  </Modal>;
}


// ═════ Outputs ═════
export function OutputsView({ projectId }) {
  const { data, A: act, can, projectsById, people, toast, confirm, lookups, idx, openTask, openProject, setPage, view, ws, me } = useP();
  const [form, setForm] = useState(null); const [detail, setDetail] = useState(null); const [type, setType] = useState(""); const [ap, setAp] = useState(""); const [q, setQ] = useState("");
  const list = data.outputs.filter((o) => (!projectId || o.project_id === projectId) && (!type || o.type === type) && (!ap || o.approval === ap) && (!q || o.name.toLowerCase().includes(q.toLowerCase())));
  useRecordFocus(view, "output", projectId, list.length);
  const canNew = projectId ? can("output.write", projectsById[projectId]) : data.projects.some((p) => can("output.write", p));

  const uploadOutputFiles = async (output, files) => {
    const selected = Array.from(files || []).filter(Boolean);
    if (!selected.length) return output;
    if (!ws?.id) throw new Error("المساحة الحالية غير متاحة للرفع.");
    const uploaded = [];
    try {
      for (const file of selected) {
        const validation = validateOutputUpload(file);
        if (!validation.ok) throw new Error(validation.error);
        const fileId = uid();
        const objectPath = outputObjectPath({
          workspaceId: ws.id,
          projectId: output.project_id,
          outputId: output.id,
          fileId,
          filename: file.name
        });
        const { error } = await supabase.storage.from(OUTPUT_STORAGE_BUCKET).upload(objectPath, file, { upsert: false, contentType: file.type });
        if (error) throw error;
        uploaded.push(outputFileMetadata({ file, objectPath }));
      }
      return { ...output, files: [...(output.files || []), ...uploaded] };
    } catch (error) {
      if (uploaded.length) {
        await supabase.storage.from(OUTPUT_STORAGE_BUCKET).remove(uploaded.map((x) => x.object_path)).catch(() => null);
      }
      throw error;
    }
  };

  const submit = async (v) => {
    const project = projectsById[v.project_id]; const prev = v.id ? data.outputs.find((o) => o.id === v.id) : null;
    let rec = { ...v, id: v.id || uid(), files: Array.isArray(v.files) ? v.files : (prev?.files || []) };
    const pendingFiles = Array.from(v.__pendingFiles || []);
    delete rec.__pendingFiles;
    if (rec.url || rec.files.length || pendingFiles.length) rec.template_seed = false;
    if (!project || project.is_system) throw new Error("اختر مشروعًا صالحًا قبل حفظ المخرج.");
    if (rec.task_id) {
      const task = idx.byId[rec.task_id];
      if (!task || task.project_id !== rec.project_id) throw new Error("المهمة المرتبطة يجب أن تكون من المشروع نفسه.");
    }
    if (rec.prd_id) {
      const prd = data.prds.find((x) => x.id === rec.prd_id);
      if (!prd || prd.project_id !== rec.project_id) throw new Error("المواصفة المرتبطة يجب أن تكون من المشروع نفسه.");
    }
    if (rec.prd_requirement_id) { const prd = data.prds.find((x) => x.id === rec.prd_id); if (!prd || !(prd.requirements || []).some((r) => r.id === rec.prd_requirement_id)) throw new Error("المتطلب المرتبط يجب أن يكون ضمن المواصفة المختارة."); }
    if (prev?.approval === "Final") throw new Error("المخرج النهائي مقفل؛ أنشئ مخرجاً جديداً للنسخة المعدلة.");
    if (rec.approval === "Final" && (!prev || prev.approval !== "Final")) {
      if (!can("output.approve", project)) throw new Error("اعتماد المخرج النهائي للقائد أو المراجع فقط");
      if (!rec.url && !rec.files.length && !pendingFiles.length && !(await confirm("المخرج النهائي بلا ملف أو رابط. المتابعة؟"))) return false;
      rec.approved_by = me; rec.approved_at = nowIso();
    } else if (rec.approval !== "Final") { rec.approved_by = null; rec.approved_at = null; }

    // Create the Output record first so Storage RLS can authorize against the real output/project.
    await act.put("outputs", rec, project);
    try {
      if (pendingFiles.length) rec = await uploadOutputFiles(rec, pendingFiles);
      if (pendingFiles.length) await act.put("outputs", rec, project);
      toast(pendingFiles.length ? "✅ تم حفظ المخرج ورفع الملفات بأمان" : "✅ تم الحفظ");
      setForm(null);
    } catch (error) {
      if (!prev) await act.del("outputs", rec.id, rec.name);
      throw new Error("تم حفظ المخرج لكن تعذر إكمال رفع الملفات: " + (error?.message || "فشل الرفع"));
    }
  };

  const downloadFile = async (file) => {
    try {
      const { data: signed, error } = await supabase.storage.from(OUTPUT_STORAGE_BUCKET).createSignedUrl(file.object_path, 60);
      if (error) throw error;
      if (!signed?.signedUrl) throw new Error("تعذر إنشاء رابط تنزيل مؤقت.");
      window.open(signed.signedUrl, "_blank", "noopener,noreferrer");
    } catch (error) { toast("⛔ تعذر تنزيل الملف: " + (error?.message || "فشل التنزيل")); }
  };

  return (
    <div>
      {!projectId && <Head title="المخرجات" sub={`${list.length} مخرج`} right={canNew && <Btn kind="primary" onClick={() => setForm({})}>➕ مخرج</Btn>} />}
      {projectId && canNew && <div style={{ marginBottom: 10 }}><Btn kind="primary" small onClick={() => setForm({ project_id: projectId })}>➕ مخرج</Btn></div>}
      <SearchBar value={q} onChange={setQ} placeholder="بحث…"><select style={{ ...S.sel, width: 140 }} value={type} onChange={(e) => setType(e.target.value)}><option value="">كل الأنواع</option>{lookups.output_type.map((x) => <option key={x}>{x}</option>)}</select><select style={{ ...S.sel, width: 130 }} value={ap} onChange={(e) => setAp(e.target.value)}><option value="">كل الحالات</option>{opts(L.approval).map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}</select></SearchBar>
      {!list.length ? <Empty icon="📦" title="لا مخرجات" sub="المخرجات هي ما يُسلَّم فعلاً (تصميم، كود، مستند…)" /> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 10 }}>
          {list.map((o) => (
            <div key={o.id} id={recordDomId("output", o.id)} style={{ ...S.card, padding: "10px 12px", ...recordFocusStyle(view, "output", o.id) }}>
              <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4 }}><span style={{ fontSize: 13, fontWeight: 700, flex: 1 }}>📦 {o.name}</span>{o.template_seed && <Chip color={C.muted}>مخرج متوقع من القالب</Chip>}<Chip color={o.approval === "Final" ? C.ok : o.approval === "Review" ? C.warn : C.muted}>{L.approval[o.approval]}</Chip></div>
              <div style={{ fontSize: 11.5, color: C.dim, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}><Chip>{o.type}</Chip>{!projectId && <ProjectName id={o.project_id} />}{o.task_id && idx.byId[o.task_id] && <button onClick={() => openTask(o.task_id)} style={{ border: 0, background: "transparent", color: C.info, cursor: "pointer", padding: 0 }}>🔗 {idx.byId[o.task_id].title}</button>}{o.prd_requirement_id && <button type="button" onClick={() => openProject(o.project_id, "prds", { kind: "prd", id: o.prd_id })} style={{ border: 0, padding: 0, background: "none", color: C.info, cursor: "pointer", textDecoration: "underline" }}>متطلب: {(data.prds.find((p) => p.id === o.prd_id)?.requirements || []).find((r) => r.id === o.prd_requirement_id)?.title || "فتح المواصفة"} ↗</button>}{data.wins.some((w) => (w.output_ids || []).includes(o.id)) && <button type="button" onClick={() => setPage("wins")} style={{ border: 0, padding: 0, background: "none", color: C.info, cursor: "pointer", textDecoration: "underline" }}>🏆 إنجاز مرتبط</button>}</div>
              {o.url && <a href={o.url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: C.info, display: "block", margin: "4px 0", wordBreak: "break-all" }}>🔗 {o.url}</a>}
              {o.notes && <div style={{ fontSize: 12, color: C.dim, margin: "4px 0" }}>{o.notes}</div>}
              {(o.files || []).length > 0 && <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 4 }}>{(o.files || []).map((file, i) => <button key={file.object_path || i} type="button" onClick={() => typeof file === "string" ? window.open(file, "_blank", "noopener,noreferrer") : downloadFile(file)} style={{ border: 0, background: "transparent", color: C.info, cursor: "pointer", padding: 0, textAlign: "start", fontSize: 11.5 }}>📎 {typeof file === "string" ? file : `${file.name || "ملف"} · ${Math.ceil((file.size_bytes || 0) / 1024)} KB`}</button>)}</div>}
              {o.approved_by && <div style={{ fontSize: 10.5, color: C.muted }}>اعتمده {<Who id={o.approved_by} size={14} />} · {fmt((o.approved_at || "").slice(0, 10))}</div>}
              <div style={{ marginTop: 6, display: "flex", gap: 6, alignItems: "center" }}><Btn small onClick={() => setDetail(o)}>عرض التفاصيل</Btn>{o.approval === "Final" ? <Chip color={C.ok}>🔒 مخرج نهائي — لا يُعدَّل</Chip> : <RowActions canW={can("output.write", projectsById[o.project_id])} onEdit={() => setForm(o)} onDelete={() => act.del("outputs", o.id, o.name)} />}</div>
            </div>))}
        </div>)}
      {detail && <RecordDetailModal title={"تفاصيل المخرج: " + detail.name} onClose={() => setDetail(null)} fields={[
        { label: "المشروع", value: projectsById[detail.project_id]?.name }, { label: "النوع", value: detail.type },
        { label: "حالة الاعتماد", value: L.approval[detail.approval] || detail.approval }, { label: "الرابط", value: detail.url },
        { label: "المهمة المرتبطة", value: idx.byId[detail.task_id]?.title }, { label: "المواصفة", value: data.prds.find((x) => x.id === detail.prd_id)?.title },
        { label: "حالة المخرج", value: detail.template_seed ? "متوقع من القالب — لم يتم تسليمه بعد" : "مخرج فعلي" }, { label: "الملاحظات", value: detail.notes }, { label: "اعتمده", value: people.find((x) => x.id === detail.approved_by)?.name },
        { label: "تاريخ الاعتماد", value: detail.approved_at ? fmt(detail.approved_at.slice(0, 10)) : "" },
        { label: "الملفات", value: (detail.files || []).map((file) => typeof file === "string" ? file : file.name || file.url || "ملف").join("، ") }
      ]} />}
      {form && <FormModal title={form.id ? "تعديل المخرج" : "مخرج جديد"} wide initial={{ approval: "Draft", type: lookups.output_type[0], ...form }} onClose={() => setForm(null)} onSubmit={submit} fields={[
        { key: "name", label: "الاسم", required: true, span: 2 },
        { key: "project_id", label: "المشروع", type: "select", required: true, allowEmpty: false, options: projOpts(data.projects.filter((p) => !projectId || p.id === projectId)) },
        { key: "type", label: "النوع", type: "select", allowEmpty: false, options: lookups.output_type.map((x) => ({ v: x, l: x })) },
        { key: "task_id", label: "المهمة المرتبطة", type: "select", emptyLabel: "— بلا —", options: (v) => idx.list.filter((t) => t.project_id === v.project_id).map((t) => ({ v: t.id, l: t.title })) },
        { key: "prd_id", label: "المواصفة التي يحقّقها", type: "select", emptyLabel: "— بلا —", options: (v) => data.prds.filter((p) => p.project_id === v.project_id).map((p) => ({ v: p.id, l: p.title })) },
        { key: "prd_requirement_id", label: "المتطلب الذي يحقّقه", type: "select", emptyLabel: "— بلا متطلب —", options: (v) => { const prd = data.prds.find((p) => p.id === v.prd_id); return (prd?.requirements || []).filter((r) => r.status !== "Deprecated").map((r) => ({ v: r.id, l: r.title })); } },
        { key: "approval", label: "الاعتماد", type: "select", allowEmpty: false, options: opts(L.approval) },
        { key: "url", label: "الرابط", type: "url" }, { key: "notes", label: "ملاحظات", type: "textarea", rows: 2 }
      ]} children={(values, set) => (
        <div style={{ gridColumn: "1 / -1", marginTop: 8, border: `1px solid ${C.line}`, borderRadius: 8, padding: 10 }}>
          <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, marginBottom: 6 }}>📎 ملفات المخرج</div>
          {(values.files || []).length > 0 && <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 8 }}>{(values.files || []).map((file, i) => <div key={file.object_path || i} style={{ fontSize: 11.5, color: C.dim }}>✓ {typeof file === "string" ? file : `${file.name || "ملف"} · ${Math.ceil((file.size_bytes || 0) / 1024)} KB`}</div>)}</div>}
          <input type="file" multiple onChange={(e) => {
            const files = Array.from(e.target.files || []);
            const errors = files.map(validateOutputUpload).filter((x) => !x.ok).map((x) => x.error);
            if (errors.length) { toast("⛔ " + errors[0]); e.target.value = ""; return; }
            set("__pendingFiles", files);
          }} accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.txt,.csv,.json,.zip,.docx,.xlsx,.pptx" />
          {(values.__pendingFiles || []).length > 0 && <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>سيتم رفع {values.__pendingFiles.length} ملف بعد حفظ المخرج.</div>}
        </div>
      )} />}
    </div>
  );
}
// ═════ Risks (+ 5×5 matrix) ═════
export function RisksView({ projectId }) {
  const { data, A: act, can, projectsById, people, toast, settings, confirm, openProject, idx, openTask, view } = useP();
  const [form, setForm] = useState(null); const [detail, setDetail] = useState(null); const [mode, setMode] = useState(projectId ? "matrix" : "list"); const [st, setSt] = useState(view.focusRecord?.kind === "risk" ? "all" : "open"); const [closing, setClosing] = useState(null); const [reopening, setReopening] = useState(null); const [creatingMitigation, setCreatingMitigation] = useState({}); const convertingRiskIds = useRef(new Set());
  const base = data.risks.filter((r) => !projectId || r.project_id === projectId);
  const list = base.filter((r) => (st === "all" ? true : st === "open" ? D.isOpenRisk(r) : r.status === st)).sort((a, b) => D.riskScore(b) - D.riskScore(a));
  useEffect(() => { if (view.focusRecord?.kind === "risk") setSt("all"); }, [view.focusRecord?.kind, view.focusRecord?.id]);
  useRecordFocus(view, "risk", projectId, list.length);
  const canNew = projectId ? can("risk.write", projectsById[projectId]) : data.projects.some((p) => can("risk.write", p));
  const lvlColor = (r) => ({ High: C.bad, Medium: C.warn, Low: C.ok })[D.riskLevel(r, settings)];
  async function changeStatus(r, to) {
    const p = projectsById[r.project_id];
    if (to === "Closed") return setClosing(r);
    if (to === "Open" && r.status === "Closed") return setReopening(r);
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
  async function createMitigationTask(r) { if (creatingMitigation[r.id]) return; setCreatingMitigation((x) => ({ ...x, [r.id]: true })); try { const task = await act.createRiskMitigationTask(r.id); if (task) { toast("✅ تم إنشاء مهمة تخفيف الخطر وربطها"); openTask(task.id); } } catch (error) { toast("⛔ لم تُنشأ مهمة التخفيف: " + (error?.message || "فشل الحفظ")); } finally { setCreatingMitigation((x) => { const next = { ...x }; delete next[r.id]; return next; }); } }
  const submit = async (v) => { const errs = D.validateRisk(v); if (errs.length) throw new Error(errs[0]); const taskIds = [...new Set([...(v.task_ids || []), ...(v.mitigation_task_ids || [])])]; for (const taskId of taskIds) { const task = idx.byId[taskId]; if (!task || task.project_id !== v.project_id) throw new Error("مهام تخفيف الخطر يجب أن تتبع المشروع نفسه."); } await act.put("risks", { ...v, task_ids: taskIds, mitigation_task_ids: taskIds, id: v.id || uid(), status: v.status || "Open" }, projectsById[v.project_id]); toast("✅ تم الحفظ"); setForm(null); };
  return (
    <div>
      {!projectId && <Head title="المخاطر والمشاكل والقرارات" sub="" />}
      <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap", alignItems: "center" }}>
        {canNew && <Btn kind="primary" small onClick={() => setForm({ project_id: projectId })}>➕ خطر</Btn>}<Seg small value={mode} onChange={setMode} options={[{ v: "list", l: "قائمة" }, { v: "matrix", l: "مصفوفة 5×5" }]} />
        <select style={{ ...S.sel, width: 130 }} value={st} onChange={(e) => setSt(e.target.value)}><option value="open">المفتوحة</option><option value="all">الكل</option>{opts(L.riskStatus).map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}</select>
      </div>
      {mode === "matrix" ? (
        <div style={{ ...S.card, padding: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
            <div><b style={{ fontSize: 13 }}>مصفوفة المخاطر 5×5</b><div style={{ fontSize: 11, color: C.muted }}>الاحتمال × التأثير · اختر خلية لعرض المخاطر الموجودة بها</div></div>
            <div style={{ display: "flex", gap: 8, fontSize: 10.5, color: C.muted, flexWrap: "wrap" }}><span>🟢 منخفض</span><span>🟠 متوسط</span><span>🔴 مرتفع</span></div>
          </div>
          <div style={{ overflowX: "auto" }}><div style={{ minWidth: 610 }}>
            <div style={{ display: "grid", gridTemplateColumns: "76px repeat(5,minmax(0,1fr))", gap: 5 }}>
              {[5, 4, 3, 2, 1].map((p) => (<React.Fragment key={p}>
                <div style={{ fontSize: 10.5, color: C.muted, alignSelf: "center", textAlign: "center" }}>احتمال {p}</div>
                {[1, 2, 3, 4, 5].map((impact) => {
                  const score = p * impact;
                  const cell = list.filter((r) => Number(r.probability) === p && Number(r.impact) === impact);
                  const bg = score >= settings.riskHigh ? "rgba(239,68,68,0.15)" : score >= settings.riskMedium ? "rgba(245,158,11,0.15)" : "rgba(16,185,129,0.1)";
                  return <button key={impact} type="button" onClick={() => cell.length && setDetail(cell[0])} title={cell.length ? cell.map((r) => r.title).join("، ") : "لا توجد مخاطر في هذه الخلية"} style={{ minHeight: 74, display: "flex", flexDirection: "column", gap: 4, alignItems: "stretch", background: bg, border: "1px solid " + (cell.length ? "rgba(100,116,139,.35)" : "transparent"), borderRadius: 7, padding: 5, cursor: cell.length ? "pointer" : "default", textAlign: "start", font: "inherit" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 10, color: C.muted }}><span>{score}</span><b>{cell.length || "—"}</b></div>
                    {cell.slice(0, 2).map((r) => <span key={r.id} style={{ background: "rgba(255,255,255,.88)", borderRadius: 4, padding: "3px 4px", color: C.text, fontSize: 10.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.title}</span>)}
                    {cell.length > 2 && <span style={{ fontSize: 9.5, color: C.muted }}>+{cell.length - 2} أخرى</span>}
                  </button>;
                })}
              </React.Fragment>))}
              <div style={{ fontSize: 10.5, color: C.muted, textAlign: "center" }}>التأثير</div>
              {[1, 2, 3, 4, 5].map((impact) => <div key={impact} style={{ textAlign: "center", fontSize: 10.5, color: C.muted }}> {impact} </div>)}
            </div>
          </div></div>
          {!list.length && <div style={{ fontSize: 12, color: C.muted, marginTop: 8 }}>لا توجد مخاطر ضمن التصفية الحالية؛ غيّر الحالة إلى «الكل» أو أضف خطرًا لعرضه هنا.</div>}
        </div>
      ) : !list.length ? <Empty icon="🛡" title="لا مخاطر" sub="سجّل المخاطر المحتملة قبل أن تتحول إلى مشاكل." /> : (
        <div style={{ ...S.card, padding: "4px 12px" }}>{list.map((r) => (
          <div key={r.id} id={recordDomId("risk", r.id)} style={{ ...recordFocusStyle(view, "risk", r.id), display: "grid", gridTemplateColumns: "44px 1fr auto", gap: 10, padding: "9px 0", borderBottom: `1px solid ${C.line}`, alignItems: "center" }}>
            <div style={{ textAlign: "center" }}><div style={{ fontSize: 17, fontWeight: 800, color: lvlColor(r) }}>{D.riskScore(r)}</div><div style={{ fontSize: 9, color: C.muted }}>{r.probability}×{r.impact}</div></div>
            <div><div style={{ fontSize: 13, fontWeight: 700 }}>{r.title} <Chip color={STATUS_COLOR[r.status]}>{L.riskStatus[r.status]}</Chip></div><div style={{ fontSize: 11.5, color: C.dim }}>{r.mitigation || "—"}</div>{(r.task_ids || r.mitigation_task_ids || []).map((id) => idx.byId[id]).filter(Boolean).map((t) => <Btn key={t.id} small onClick={() => openTask(t.id)}>🛠 {t.title}</Btn>)}<div style={{ fontSize: 11, color: C.muted, display: "flex", gap: 10, alignItems: "center" }}>{!projectId && <ProjectName id={r.project_id} />}<Who id={r.owner_id} size={15} />{r.review_date && <span>مراجعة {fmtShort(r.review_date)}</span>}{r.converted_issue_id && <button type="button" onClick={() => openProject(r.project_id, "issues", { kind: "issue", id: r.converted_issue_id })} style={{ border: 0, padding: 0, background: "none", color: C.info, cursor: "pointer", textDecoration: "underline" }}>↗ فتح المشكلة المرتبطة</button>}</div></div>
            <span style={{ display: "inline-flex", gap: 5, alignItems: "center" }}>
              {D.isOpenRisk(r) && can("risk.write", projectsById[r.project_id]) && can("task.write", projectsById[r.project_id]) && <Btn small disabled={!!creatingMitigation[r.id]} onClick={() => createMitigationTask(r)}>{creatingMitigation[r.id] ? "جارٍ الإنشاء…" : "＋ مهمة تخفيف"}</Btn>}
              {can("risk.write", projectsById[r.project_id]) && (D.RISK_NEXT[r.status] || []).length > 0 && <select style={{ ...S.sel, width: 110, padding: "3px 6px", fontSize: 11 }} value="" onChange={(e) => e.target.value && changeStatus(r, e.target.value)}><option value="">انقل إلى…</option>{D.RISK_NEXT[r.status].filter((s) => s !== "Materialized" || can("issue.write", projectsById[r.project_id])).map((s) => <option key={s} value={s}>{L.riskStatus[s]}</option>)}</select>}
              <Btn small onClick={() => setDetail(r)}>عرض التفاصيل</Btn><RowActions canW={can("risk.write", projectsById[r.project_id])} onEdit={() => setForm(r)} onDelete={() => act.del("risks", r.id, r.title)} />
            </span>
          </div>))}</div>)}
      {detail && <RecordDetailModal title={"تفاصيل الخطر: " + detail.title} onClose={() => setDetail(null)} fields={[
        { label: "المشروع", value: projectsById[detail.project_id]?.name }, { label: "الحالة", value: L.riskStatus[detail.status] || detail.status },
        { label: "درجة الخطر", value: D.riskScore(detail) }, { label: "الاحتمال", value: detail.probability + " / 5" },
        { label: "التأثير", value: detail.impact + " / 5" }, { label: "المستوى", value: D.riskLevel(detail, settings) },
        { label: "المسؤول", value: people.find((x) => x.id === detail.owner_id)?.name }, { label: "تاريخ المراجعة", value: detail.review_date },
        { label: "خطة التخفيف", value: detail.mitigation }, { label: "الملاحظات", value: detail.notes },
        { label: "المهام المرتبطة", value: [...new Set([...(detail.task_ids || []), ...(detail.mitigation_task_ids || [])])].map((id) => idx.byId[id]?.title).filter(Boolean).join("، ") },
        { label: "المواصفة المصدرية", value: data.prds.find((x) => x.id === detail.prd_id)?.title },
        { label: "المشكلة الناتجة", value: data.issues.find((x) => x.id === detail.converted_issue_id)?.title }
      ]} />}
      {form && <FormModal title={form.id ? "تعديل الخطر" : "خطر جديد"} wide initial={{ probability: 3, impact: 3, status: "Open", ...form }} onClose={() => setForm(null)} onSubmit={submit} fields={[
        { key: "title", label: "عنوان الخطر", required: true, span: 2 }, { key: "project_id", label: "المشروع", type: "select", required: true, allowEmpty: false, options: projOpts(data.projects.filter((p) => !p.is_system && (!projectId || p.id === projectId))) },
        { key: "owner_id", label: "المسؤول", type: "select", options: mOpts(people) },
        { key: "probability", label: "الاحتمال (1–5)", type: "number", min: 1, max: 5, required: true }, { key: "impact", label: "التأثير (1–5)", type: "number", min: 1, max: 5, required: true },
        { key: "review_date", label: "تاريخ المراجعة", type: "date" }, { key: "prd_id", label: "نشأ من مواصفة", type: "select", emptyLabel: "— بلا —", options: (v) => data.prds.filter((p) => p.project_id === v.project_id).map((p) => ({ v: p.id, l: p.title })) },
        { key: "mitigation", label: "خطة التخفيف", type: "textarea", rows: 2 },
         { key: "mitigation_task_ids", label: "مهام تخفيف الخطر", type: "multi", options: (v) => idx.list.filter((t) => t.project_id === v.project_id).map((t) => ({ v: t.id, l: t.title })) }, { key: "notes", label: "ملاحظات", type: "textarea", rows: 2 }]} />}
      {reopening && <FormModal title="إعادة فتح الخطر" initial={{ reason: "" }} fields={[{ key: "reason", label: "سبب إعادة الفتح", required: true, type: "textarea" }]} onClose={() => setReopening(null)} onSubmit={async (v) => { await act.put("risks", { ...reopening, status: "Open", reopen_reason: v.reason.trim(), reopened_at: nowIso(), closed_at: null, closed_reason: null }, projectsById[reopening.project_id]); setReopening(null); toast("↻ أُعيد فتح الخطر مع تسجيل السبب"); }} />}
       {closing && <FormModal title="إغلاق الخطر" initial={{ reason: "" }} fields={[{ key: "reason", label: "سبب الإغلاق", required: true, type: "textarea" }]} onClose={() => setClosing(null)} onSubmit={async (v) => { await act.put("risks", { ...closing, status: "Closed", closed_at: nowIso(), closed_reason: v.reason }, projectsById[closing.project_id]); setClosing(null); }} />}
    </div>
  );
}

// ═════ Issues ═════
export function IssuesView({ projectId }) {
  const { data, A: act, can, projectsById, people, toast, idx, openTask, openProject, openDiscovery, view, setView } = useP();
  const [form, setForm] = useState(null); const [detail, setDetail] = useState(null); const [mode, setMode] = useState(projectId ? "matrix" : "list"); const [st, setSt] = useState(view.focusRecord?.kind === "issue" ? "all" : view.issueStatusFilter || "open"); const [sev, setSev] = useState(view.issueSeverityFilter || ""); const [resolving, setResolving] = useState(null); const [reopening, setReopening] = useState(null); const [repairing, setRepairing] = useState({});
  const list = data.issues.filter((i) => (!projectId || i.project_id === projectId) && (st === "all" ? true : st === "open" ? D.isOpenIssue(i) : i.status === st) && (!sev || i.severity === sev)).sort((a, b) => ["Critical", "High", "Medium", "Low"].indexOf(a.severity) - ["Critical", "High", "Medium", "Low"].indexOf(b.severity));
  const canNew = projectId ? can("issue.write", projectsById[projectId]) : data.projects.some((p) => can("issue.write", p));
  useEffect(() => { if (view.focusRecord?.kind === "issue") { setSt("all"); setSev(""); setView((current) => ({ ...current, issueStatusFilter: "all", issueSeverityFilter: "" })); } }, [view.focusRecord?.kind, view.focusRecord?.id]);
  useRecordFocus(view, "issue", projectId, list.length);
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
      <div style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "center", flexWrap: "wrap" }}>{canNew && <Btn kind="primary" small onClick={() => setForm({ project_id: projectId })}>＋ مشكلة</Btn>}<Seg small value={mode} onChange={setMode} options={[{ v: "matrix", l: "لوحة حسب الحالة" }, { v: "list", l: "قائمة" }]} /><select aria-label="حالة المشكلة" style={{ ...S.sel, width: 130 }} value={st} onChange={(e) => { setSt(e.target.value); setView((v) => ({ ...v, issueStatusFilter: e.target.value })); }}><option value="open">المفتوحة</option><option value="all">الكل</option>{opts(L.issueStatus).map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}</select><select aria-label="شدة المشكلة" style={{ ...S.sel, width: 130 }} value={sev} onChange={(e) => { setSev(e.target.value); setView((v) => ({ ...v, issueSeverityFilter: e.target.value })); }}><option value="">كل الشدات</option>{opts(L.severity).map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}</select>{(st !== "open" || sev) && <Btn small onClick={() => { setSt("open"); setSev(""); setView((v) => ({ ...v, issueStatusFilter: "open", issueSeverityFilter: "" })); }}>مسح الفلاتر</Btn>}</div>
      {!list.length ? <Empty icon="✅" title="لا مشاكل" /> : mode === "matrix" ? <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(225px,1fr))", gap: 9, alignItems: "start" }}>
        {["Open", "In Progress", "Resolved", "Closed"].map((status) => {
          const items = list.filter((issue) => issue.status === status);
          return <section key={status} style={{ ...S.card, padding: 9, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "3px 2px 8px", borderBottom: "1px solid " + C.line, marginBottom: 6 }}><b style={{ flex: 1, fontSize: 12.5 }}>{L.issueStatus[status]}</b><Chip>{items.length}</Chip></div>
            {!items.length ? <div style={{ padding: "12px 4px", fontSize: 11, color: C.muted }}>لا توجد مشاكل في هذه الحالة</div> : items.map((issue) => <button key={issue.id} type="button" onClick={() => setDetail(issue)} style={{ display: "block", width: "100%", textAlign: "start", border: "1px solid " + C.line, borderRadius: 7, padding: 8, marginBottom: 6, background: "transparent", cursor: "pointer", font: "inherit" }}>
              <div style={{ display: "flex", gap: 5, alignItems: "center", flexWrap: "wrap" }}><Chip color={SEV_COLOR[issue.severity]} solid>{L.severity[issue.severity]}</Chip><span style={{ fontSize: 11.5, fontWeight: 700, flex: 1, minWidth: 90 }}>{issue.title}</span></div>
              <div style={{ fontSize: 10.5, color: C.muted, marginTop: 5 }}>{!projectId ? (projectsById[issue.project_id]?.name || "مشروع") + " · " : ""}{people.find((person) => person.id === issue.owner_id)?.name || "غير مسند"} · {fmtShort(issue.discovered_at)}</div>
              {repairTasks(issue).length > 0 && <div style={{ fontSize: 10.5, color: C.info, marginTop: 5 }}>مهام الإصلاح: {repairTasks(issue).length}</div>}
            </button>)}
          </section>;
        })}
      </div> : <div style={{ ...S.card, padding: "4px 12px" }}>{list.map((i) => (
        <div key={i.id} id={recordDomId("issue", i.id)} style={{ ...recordFocusStyle(view, "issue", i.id), display: "grid", gridTemplateColumns: "1fr auto", gap: 10, padding: "9px 0", borderBottom: `1px solid ${C.line}`, alignItems: "center" }}>
          <div><div style={{ fontSize: 13, fontWeight: 700 }}><Chip color={SEV_COLOR[i.severity]} solid>{L.severity[i.severity]}</Chip> {i.title} <Chip color={STATUS_COLOR[i.status]}>{L.issueStatus[i.status]}</Chip></div>
            {i.description && <div style={{ fontSize: 12, color: C.dim }}>{i.description}</div>}{i.resolution && <div style={{ fontSize: 12, color: C.ok }}>الحل: {i.resolution}</div>}<div style={{ fontSize: 11, marginTop: 4 }}>{data.decisions.filter((d) => (d.affected_issue_ids || []).includes(i.id)).map((d) => <button key={d.id} type="button" onClick={() => openProject(i.project_id, "decisions", { kind: "decision", id: d.id })} style={{ border: 0, padding: 0, marginInlineEnd: 7, background: "none", color: C.info, cursor: "pointer", textDecoration: "underline" }}>⚖️ {d.title}</button>)}</div>
            <div style={{ fontSize: 11, color: C.muted, display: "flex", gap: 10 }}>{!projectId && <ProjectName id={i.project_id} />}<Who id={i.owner_id} size={15} /><span>{fmtShort(i.discovered_at)}</span>{i.from_risk_id && <span>⚠️ من خطر</span>}{i.from_discovery_id && <span>💡 من اكتشاف</span>}</div>
            {repairTasks(i).length > 0 && <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6, alignItems: "center" }}><span style={{ fontSize: 11, color: C.muted }}>مهام الإصلاح:</span>{repairTasks(i).map((t) => <Btn key={t.id} small onClick={() => openTask(t.id)}>🔧 {t.title}</Btn>)}</div>}
            {i.from_risk_id && <div style={{ fontSize: 11, marginTop: 4 }}>مصدرها خطر: <button type="button" onClick={() => openProject(i.project_id, "risks", { kind: "risk", id: i.from_risk_id })} style={{ border: 0, padding: 0, background: "none", color: C.info, cursor: "pointer", textDecoration: "underline" }}>{(data.risks.find((r) => r.id === i.from_risk_id) || {}).title || "فتح المخاطر"} ↗</button></div>}{i.from_discovery_id && <div style={{ fontSize: 11, marginTop: 4 }}>مصدرها اكتشاف: <button type="button" onClick={() => openDiscovery(i.from_discovery_id)} style={{ border: 0, padding: 0, background: "none", color: C.info, cursor: "pointer", textDecoration: "underline" }}>{(data.discovery.find((d) => d.id === i.from_discovery_id) || {}).title || "فتح الاكتشاف"} ↗</button></div>}</div>
          <span style={{ display: "inline-flex", gap: 5, alignItems: "center" }}>{can("issue.write", projectsById[i.project_id]) && can("task.write", projectsById[i.project_id]) && <Btn small disabled={!!repairing[i.id]} onClick={() => createRepairTask(i)}>{repairing[i.id] ? "جارٍ الإنشاء…" : "＋ مهمة إصلاح"}</Btn>}{can("issue.write", projectsById[i.project_id]) && (D.ISSUE_NEXT[i.status] || []).length > 0 && <select style={{ ...S.sel, width: 110, padding: "3px 6px", fontSize: 11 }} value="" onChange={(e) => e.target.value && change(i, e.target.value)}><option value="">انقل إلى…</option>{D.ISSUE_NEXT[i.status].map((s) => <option key={s} value={s}>{L.issueStatus[s]}</option>)}</select>}<Btn small onClick={() => setDetail(i)}>عرض التفاصيل</Btn><RowActions canW={can("issue.write", projectsById[i.project_id])} onEdit={() => setForm(i)} onDelete={() => act.del("issues", i.id, i.title)} /></span>
        </div>))}</div>}
      {detail && <RecordDetailModal title={"تفاصيل المشكلة: " + detail.title} onClose={() => setDetail(null)} fields={[
        { label: "المشروع", value: projectsById[detail.project_id]?.name }, { label: "الحالة", value: L.issueStatus[detail.status] || detail.status },
        { label: "الشدة", value: L.severity[detail.severity] || detail.severity }, { label: "المسؤول", value: people.find((x) => x.id === detail.owner_id)?.name },
        { label: "تاريخ الاكتشاف", value: detail.discovered_at }, { label: "الوصف", value: detail.description },
        { label: "الحل", value: detail.resolution }, { label: "تاريخ الحل", value: detail.resolved_at },
        { label: "مهام الإصلاح", value: repairTasks(detail).map((task) => task.title).join("، ") },
        { label: "الخطر المصدر", value: data.risks.find((x) => x.id === detail.from_risk_id)?.title },
        { label: "الاكتشاف المصدر", value: data.discovery.find((x) => x.id === detail.from_discovery_id)?.title },
        { label: "القرارات المؤثرة", value: data.decisions.filter((x) => (x.affected_issue_ids || []).includes(detail.id)).map((x) => x.title).join("، ") }
      ]} />}
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
  const { data, A: act, can, projectsById, people, toast, idx, openTask, openProject, openDiscovery, view } = useP();
  const [form, setForm] = useState(null); const [detail, setDetail] = useState(null); const [creating, setCreating] = useState({}); const [mode, setMode] = useState("matrix");
  const list = data.decisions.filter((d) => !projectId || d.project_id === projectId).sort((a, b) => (b.decided_at || "").localeCompare(a.decided_at || ""));
  useRecordFocus(view, "decision", projectId, list.length);
  const canNew = projectId ? can("decision.write", projectsById[projectId]) : data.projects.some((p) => can("decision.write", p));
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>{canNew && <Btn kind="primary" small onClick={() => setForm({ project_id: projectId })}>＋ قرار</Btn>}<Seg small value={mode} onChange={setMode} options={[{ v: "matrix", l: "مصفوفة القرارات" }, { v: "list", l: "سجل القرارات" }]} /></div>
      {!list.length ? <Empty icon="⚖️" title="لا قرارات مسجَّلة" sub="سجّل القرارات المهمة وأسبابها حتى لا تُنسى." /> : mode === "matrix" ? <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 9, alignItems: "start" }}>
        {["Proposed", "Approved", "Superseded", "Cancelled"].map((status) => {
          const items = list.filter((decision) => decision.status === status);
          return <section key={status} style={{ ...S.card, padding: 9, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "3px 2px 8px", borderBottom: "1px solid " + C.line, marginBottom: 6 }}><b style={{ flex: 1, fontSize: 12.5 }}>{L.decisionStatus[status]}</b><Chip>{items.length}</Chip></div>
            {!items.length ? <div style={{ padding: "12px 4px", fontSize: 11, color: C.muted }}>لا توجد قرارات في هذه الحالة</div> : items.map((decision) => {
              const relatedCount = (decision.related_task_ids || []).length + (decision.related_issue_ids || []).length + (decision.related_risk_ids || []).length + (decision.related_discovery_ids || []).length;
              return <button key={decision.id} type="button" onClick={() => setDetail(decision)} style={{ display: "block", width: "100%", textAlign: "start", border: "1px solid " + C.line, borderRadius: 7, padding: 8, marginBottom: 6, background: "transparent", cursor: "pointer", font: "inherit" }}>
                <div style={{ display: "flex", gap: 5, alignItems: "center" }}><b style={{ fontSize: 11.5, flex: 1 }}>{decision.title}</b><Chip color={status === "Approved" ? C.ok : status === "Superseded" ? C.warn : C.muted}>{L.decisionStatus[status]}</Chip></div>
                {decision.rationale && <div style={{ fontSize: 10.5, color: C.dim, marginTop: 5, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{decision.rationale}</div>}
                <div style={{ fontSize: 10, color: C.muted, marginTop: 5 }}>{!projectId ? (projectsById[decision.project_id]?.name || "مشروع") + " · " : ""}{fmt(decision.decided_at)} · {relatedCount} روابط</div>
              </button>;
            })}
          </section>;
        })}
      </div> : <div style={{ ...S.card, padding: "4px 12px" }}>{list.map((d) => (
        <div key={d.id} id={recordDomId("decision", d.id)} style={{ ...recordFocusStyle(view, "decision", d.id), padding: "10px 0", borderBottom: `1px solid ${C.line}` }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}><span style={{ fontSize: 13, fontWeight: 700, flex: 1 }}>⚖️ {d.title} <Chip color={d.status === "Approved" ? C.ok : d.status === "Superseded" ? C.warn : C.muted}>{L.decisionStatus[d.status]}</Chip></span><Btn small onClick={() => setDetail(d)}>عرض التفاصيل</Btn><RowActions canW={can("decision.write", projectsById[d.project_id])} onEdit={() => setForm(d)} onDelete={() => act.del("decisions", d.id, d.title)} /></div>
          {d.rationale && <div style={{ fontSize: 12, color: C.dim }}><b>لماذا؟</b> {d.rationale}</div>}{d.rejected_alternatives && <div style={{ fontSize: 12, color: C.dim }}><b>بدائل مرفوضة:</b> {d.rejected_alternatives}</div>}
          {d.superseded_by_id && <div style={{ fontSize: 11.5, color: C.warn }}>حلّ محله: {(data.decisions.find((x) => x.id === d.superseded_by_id) || {}).title}</div>}
          <div style={{ fontSize: 11, color: C.muted, display: "flex", gap: 10 }}>{!projectId && <ProjectName id={d.project_id} />}<span>{fmt(d.decided_at)}</span>{d.decision_maker_id && <Who id={d.decision_maker_id} size={15} />}{d.status === "Approved" && can("decision.write", projectsById[d.project_id]) && can("task.write", projectsById[d.project_id]) && <Btn small disabled={!!creating[d.id]} onClick={async () => { setCreating((x) => ({ ...x, [d.id]: true })); try { const task = await act.createDecisionTask(d.id); openTask(task.id); } catch (error) { toast("⛔ " + (error?.message || "تعذر إنشاء مهمة التنفيذ")); } finally { setCreating((x) => { const next = { ...x }; delete next[d.id]; return next; }); } }}>{creating[d.id] ? "جارٍ الإنشاء…" : "＋ مهمة تنفيذ"}</Btn>}</div>
          {d.prd_id && (() => { const prd = data.prds.find((x) => x.id === d.prd_id); return prd ? <div style={{ fontSize: 11.5, marginTop: 4 }}>المواصفة: <button type="button" onClick={() => openProject(prd.project_id, "prds", { kind: "prd", id: prd.id })} style={{ border: 0, padding: 0, background: "none", color: C.info, cursor: "pointer", textDecoration: "underline" }}>{prd.title} ↗</button></div> : null; })()}
          {data.decisions.filter((x) => x.superseded_by_id === d.id).length > 0 && <div style={{ fontSize: 11.5, marginTop: 4, color: C.warn }}>حلّ هذا القرار محل: {data.decisions.filter((x) => x.superseded_by_id === d.id).map((x) => x.title).join("، ")}</div>}
          {(() => { const tasks = (d.related_task_ids || []).map((id) => idx.byId[id]).filter(Boolean); const issues = (d.related_issue_ids || []).map((id) => data.issues.find((x) => x.id === id)).filter(Boolean); const risks = (d.related_risk_ids || []).map((id) => data.risks.find((x) => x.id === id)).filter(Boolean); const discoveries = (d.related_discovery_ids || []).map((id) => data.discovery.find((x) => x.id === id)).filter(Boolean); if (!tasks.length && !issues.length && !risks.length && !discoveries.length) return null; return <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6, alignItems: "center" }}>
            {tasks.map((t) => <Btn key={t.id} small onClick={() => openTask(t.id)}>↗ مهمة: {t.title}</Btn>)}
            {issues.map((i) => <Btn key={i.id} small onClick={() => openProject(i.project_id, "issues", { kind: "issue", id: i.id })}>↗ مشكلة: {i.title}</Btn>)}
            {risks.map((r) => <Btn key={r.id} small onClick={() => openProject(r.project_id, "risks", { kind: "risk", id: r.id })}>↗ خطر: {r.title}</Btn>)}
            {discoveries.map((discovery) => <Btn key={discovery.id} small onClick={() => { openDiscovery(discovery.id); }}>↗ اكتشاف: {discovery.title}</Btn>)}
          </div>; })()}
        </div>))}</div>}
      {detail && <RecordDetailModal title={"تفاصيل القرار: " + detail.title} onClose={() => setDetail(null)} fields={[
        { label: "المشروع", value: projectsById[detail.project_id]?.name }, { label: "الحالة", value: L.decisionStatus[detail.status] || detail.status },
        { label: "تاريخ القرار", value: detail.decided_at }, { label: "صاحب القرار", value: people.find((x) => x.id === detail.decision_maker_id)?.name },
        { label: "المبرر", value: detail.rationale }, { label: "البدائل المرفوضة", value: detail.rejected_alternatives },
        { label: "الأثر المتوقع", value: detail.expected_impact }, { label: "المواصفة", value: data.prds.find((x) => x.id === detail.prd_id)?.title },
        { label: "القرار الذي حلّ محله", value: data.decisions.find((x) => x.id === detail.superseded_by_id)?.title },
        { label: "المهام المتأثرة", value: (detail.related_task_ids || []).map((id) => idx.byId[id]?.title).filter(Boolean).join("، ") },
        { label: "المشاكل المتأثرة", value: (detail.related_issue_ids || []).map((id) => data.issues.find((x) => x.id === id)?.title).filter(Boolean).join("، ") },
        { label: "المخاطر المتأثرة", value: (detail.related_risk_ids || []).map((id) => data.risks.find((x) => x.id === id)?.title).filter(Boolean).join("، ") },
        { label: "الاكتشافات المؤثرة", value: (detail.related_discovery_ids || []).map((id) => data.discovery.find((x) => x.id === id)?.title).filter(Boolean).join("، ") }
      ]} />}
      {form && <FormModal title={form.id ? "تعديل القرار" : "قرار جديد"} wide initial={{ status: "Proposed", decided_at: new Date().toISOString().slice(0, 10), ...form }} onClose={() => setForm(null)}
        validate={(v) => D.validateDecisionStatus(v, v.status) ? { superseded_by_id: "إلزامي عند «حلّ محله قرار آخر»" } : null}
        onSubmit={async (v) => { if (v.prd_id && !data.prds.some((p) => p.id === v.prd_id && p.project_id === v.project_id)) throw new Error("المواصفة يجب أن تتبع المشروع نفسه."); for (const taskId of (v.related_task_ids || [])) if (!idx.byId[taskId] || idx.byId[taskId].project_id !== v.project_id) throw new Error("المهام المتأثرة يجب أن تتبع المشروع نفسه."); for (const issueId of (v.related_issue_ids || [])) if (!data.issues.some((i) => i.id === issueId && i.project_id === v.project_id)) throw new Error("المشاكل المتأثرة يجب أن تتبع المشروع نفسه."); for (const riskId of (v.related_risk_ids || [])) if (!data.risks.some((r) => r.id === riskId && r.project_id === v.project_id)) throw new Error("المخاطر المتأثرة يجب أن تتبع المشروع نفسه."); for (const discoveryId of (v.related_discovery_ids || [])) { const discovery = data.discovery.find((item) => item.id === discoveryId); if (!discovery) throw new Error("الاكتشاف المرتبط غير موجود أو تم حذفه."); if ((discovery.project_ids || []).length && !discovery.project_ids.includes(v.project_id)) throw new Error("الاكتشاف المرتبط يجب أن يكون مرتبطًا بالمشروع نفسه."); } if (v.superseded_by_id) { const successor = data.decisions.find((item) => item.id === v.superseded_by_id && item.project_id === v.project_id && item.id !== v.id); if (!successor) throw new Error("القرار البديل يجب أن يكون قرارًا آخر داخل المشروع نفسه."); const visited = new Set([v.id].filter(Boolean)); let nextId = v.superseded_by_id; while (nextId) { if (visited.has(nextId)) throw new Error("لا يمكن إنشاء حلقة بين القرارات المستبدلة."); visited.add(nextId); const next = data.decisions.find((item) => item.id === nextId && item.project_id === v.project_id); nextId = next?.superseded_by_id || null; } } await act.put("decisions", { ...v, id: v.id || uid() }, projectsById[v.project_id]); toast("✅ تم الحفظ"); setForm(null); }} fields={[
          { key: "title", label: "القرار", required: true, span: 2 }, { key: "project_id", label: "المشروع", type: "select", required: true, allowEmpty: false, options: projOpts(data.projects.filter((p) => !p.is_system && (!projectId || p.id === projectId))) },
          { key: "status", label: "الحالة", type: "select", allowEmpty: false, options: opts(L.decisionStatus) }, { key: "decided_at", label: "تاريخ القرار", type: "date" }, { key: "decision_maker_id", label: "صاحب القرار", type: "select", options: mOpts(people) },
          { key: "superseded_by_id", label: "القرار الذي حلّ محله", type: "select", show: (v) => v.status === "Superseded", required: true, options: (v) => data.decisions.filter((x) => x.id !== v.id && x.project_id === v.project_id).map((x) => ({ v: x.id, l: x.title })) },
          { key: "prd_id", label: "المواصفة", type: "select", emptyLabel: "— بلا —", options: (v) => data.prds.filter((p) => p.project_id === v.project_id).map((p) => ({ v: p.id, l: p.title })) },
           { key: "related_task_ids", label: "المهام المتأثرة", type: "multi", options: (v) => idx.list.filter((t) => t.project_id === v.project_id).map((t) => ({ v: t.id, l: t.title })) },
           { key: "related_issue_ids", label: "المشاكل المتأثرة", type: "multi", options: (v) => data.issues.filter((i) => i.project_id === v.project_id).map((i) => ({ v: i.id, l: i.title })) },
           { key: "related_risk_ids", label: "المخاطر المتأثرة", type: "multi", options: (v) => data.risks.filter((r) => r.project_id === v.project_id).map((r) => ({ v: r.id, l: r.title })) },
           { key: "related_discovery_ids", label: "الاكتشافات التي أثرت في القرار", type: "multi", options: () => data.discovery.map((d) => ({ v: d.id, l: d.title })) },
          { key: "rationale", label: "لماذا؟", type: "textarea" }, { key: "rejected_alternatives", label: "البدائل المرفوضة", type: "textarea", rows: 2 }, { key: "expected_impact", label: "الأثر المتوقع", type: "textarea", rows: 2 }]} />}
    </div>
  );
}

// ═════ PRDs ═════
export function PrdsView({ projectId }) {
  const { data, A: act, can, projectsById, people, toast, me, PRD_TEMPLATE, idx, confirm, nameOf, view } = useP();
  const [sel, setSel] = useState(null); const [form, setForm] = useState(null); const [detail, setDetail] = useState(null); const [editorId, setEditorId] = useState(null); const [taskForm, setTaskForm] = useState(null);
  const list = data.prds.filter((p) => !projectId || p.project_id === projectId);
  useEffect(() => { if (view.focusRecord?.kind === "prd") { const target = data.prds.find((p) => p.id === view.focusRecord.id); if (target && (!projectId || target.project_id === projectId)) setSel(target.id); } }, [view.focusRecord, data.prds, projectId]);
  const canNew = projectId ? can("prd.write", projectsById[projectId]) : data.projects.some((p) => can("prd.write", p) && !p.is_system);
  const selectedPrd = list.find((p) => p.id === sel) || list[0] || null;
  const openPrd = editorId ? data.prds.find((p) => p.id === editorId) : null;
  useEffect(() => { if (!sel && list.length) setSel(list[0].id); else if (sel && !list.some((p) => p.id === sel)) setSel(list[0]?.id || null); }, [sel, list]);
  return (
    <div>
      {!projectId && <Head title="المواصفات (PRDs)" sub={`${list.length} مواصفة`} right={canNew && <Btn kind="primary" onClick={() => setForm({})}>➕ مواصفة</Btn>} />}
      {projectId && canNew && <div style={{ marginBottom: 10 }}><Btn kind="primary" small onClick={() => setForm({ project_id: projectId })}>➕ مواصفة</Btn></div>}
      {!list.length ? <Empty icon="📝" title="لا مواصفات" sub="اكتب المواصفة قبل التنفيذ: المشكلة، الحل، مقاييس النجاح." /> : (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(230px,.72fr) minmax(0,1.65fr)", gap: 12, alignItems: "start" }}>
          <div style={{ ...S.card, padding: 7 }}>
            <div style={{ padding: "5px 7px 9px", fontSize: 11, fontWeight: 700, color: C.muted }}>مواصفات المشروع ({list.length})</div>
            {list.map((prd) => {
              const tasks = idx.list.filter((task) => task.prd_id === prd.id && idx.isLeaf(task.id) && D.cat(task.status) !== "cancelled");
              const requirements = (prd.requirements || []).filter((req) => req.status !== "Deprecated");
              const covered = requirements.filter((req) => tasks.some((task) => task.prd_requirement_id === req.id)).length;
              const active = sel === prd.id;
              return <button key={prd.id} type="button" onClick={() => setSel(prd.id)} style={{ display: "block", width: "100%", textAlign: "start", border: "1px solid " + (active ? A : "transparent"), borderRadius: 7, background: active ? "rgba(239,159,39,.08)" : "transparent", padding: "9px 8px", marginBottom: 4, cursor: "pointer", font: "inherit" }}>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}><b style={{ flex: 1, minWidth: 0, fontSize: 12.5, overflow: "hidden", textOverflow: "ellipsis" }}>{prd.title}</b><Chip color={prd.status === "Approved" ? C.ok : prd.status === "Ready for Review" ? C.warn : C.info}>{L.prdStatus[prd.status] || prd.status}</Chip></div>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 6, fontSize: 10.5, color: C.muted, marginTop: 5 }}><span>v{prd.version || 1} · {tasks.length} مهمة</span><span>{requirements.length ? covered + "/" + requirements.length + " متطلب مغطى" : "لا متطلبات بعد"}</span></div>
                {requirements.length > 0 && <div style={{ marginTop: 6 }}><Progress value={covered / requirements.length} height={5} /></div>}
                {!projectId && <div style={{ fontSize: 10.5, color: C.muted, marginTop: 4 }}><ProjectName id={prd.project_id} /></div>}
              </button>;
            })}
          </div>
          {selectedPrd ? (() => {
            const prd = selectedPrd;
            const tasks = idx.list.filter((task) => task.prd_id === prd.id && idx.isLeaf(task.id) && D.cat(task.status) !== "cancelled");
            const outputs = data.outputs.filter((output) => output.prd_id === prd.id && D.isActiveRec(output));
            const requirements = (prd.requirements || []).filter((req) => req.status !== "Deprecated");
            const covered = requirements.filter((req) => tasks.some((task) => task.prd_requirement_id === req.id)).length;
            const done = tasks.filter((task) => D.cat(task.status) === "done").length;
            const canEdit = can("prd.write", projectsById[prd.project_id]);
            return <div style={{ minWidth: 0 }}>
              <div style={{ ...S.card, padding: 14, marginBottom: 10 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start", flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 180 }}><div style={{ fontSize: 16, fontWeight: 800 }}>{prd.title}</div><div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>v{prd.version || 1} · {L.prdStatus[prd.status] || prd.status}{!projectId ? " · " + (projectsById[prd.project_id]?.name || "مشروع غير متاح") : ""}</div></div>
                  <Chip color={prd.status === "Approved" ? C.ok : prd.status === "Ready for Review" ? C.warn : C.info}>{L.prdStatus[prd.status] || prd.status}</Chip>
                  {canEdit && <Btn kind="primary" small onClick={() => setEditorId(prd.id)}>فتح المواصفة وتحريرها</Btn>}
                  <Btn small onClick={() => setDetail(prd)}>ملخص كامل</Btn>
                </div>
                {prd.tldr && <p style={{ fontSize: 12.5, lineHeight: 1.8, color: C.dim, margin: "10px 0" }}>{prd.tldr}</p>}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(115px,1fr))", gap: 8, marginTop: 10 }}>
                  <div><b style={{ fontSize: 18 }}>{done}/{tasks.length}</b><div style={{ fontSize: 10.5, color: C.muted }}>مهام مكتملة</div></div>
                  <div><b style={{ fontSize: 18 }}>{covered}/{requirements.length}</b><div style={{ fontSize: 10.5, color: C.muted }}>متطلبات لها مهمة</div></div>
                  <div><b style={{ fontSize: 18 }}>{outputs.length}</b><div style={{ fontSize: 10.5, color: C.muted }}>مخرجات مرتبطة</div></div>
                  <div><b style={{ fontSize: 18 }}>{data.risks.filter((risk) => risk.prd_id === prd.id && D.isActiveRec(risk)).length}</b><div style={{ fontSize: 10.5, color: C.muted }}>مخاطر مرتبطة</div></div>
                </div>
                {requirements.length > 0 && <div style={{ marginTop: 10 }}><div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.muted, marginBottom: 4 }}><span>تغطية المتطلبات بالمهام</span><b>{Math.round(covered / requirements.length * 100)}%</b></div><Progress value={covered / requirements.length} height={7} /></div>}
              </div>
              <div style={{ ...S.card, padding: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}><b style={{ flex: 1, fontSize: 13 }}>المتطلبات والتنفيذ</b><span style={{ fontSize: 10.5, color: C.muted }}>{requirements.length} متطلب</span></div>
                {!requirements.length ? <Empty icon="🧩" title="لم تُقسّم المواصفة إلى متطلبات" sub="افتح المواصفة وأضف متطلبات بمعايير قبول حتى يمكن تتبع التنفيذ." /> : requirements.map((req) => {
                  const reqTasks = tasks.filter((task) => task.prd_requirement_id === req.id);
                  const reqOutputs = outputs.filter((output) => output.prd_requirement_id === req.id);
                  return <div key={req.id} style={{ padding: "9px 0", borderTop: "1px solid " + C.line }}>
                    <div style={{ display: "flex", gap: 7, alignItems: "center", flexWrap: "wrap" }}>
                      <b style={{ flex: 1, minWidth: 120, fontSize: 12.5 }}>{req.title}</b>
                      <Chip color={req.status === "Accepted" || req.status === "Verified" ? C.ok : C.info}>{req.status === "Verified" ? "متحقق" : req.status === "Accepted" ? "مقبول" : "نشط"}</Chip>
                      <Chip>{req.priority || "Medium"}</Chip>
                      {canEdit && <Btn small onClick={() => setEditorId(prd.id)}>فتح المتطلب</Btn>}
                      {can("task.write", projectsById[prd.project_id]) && <Btn small kind={reqTasks.length ? "secondary" : "primary"} onClick={() => setTaskForm({ project_id: prd.project_id, prd_id: prd.id, prd_requirement_id: req.id })}>{reqTasks.length ? "＋ مهمة إضافية" : "＋ إنشاء مهمة تنفيذ"}</Btn>}
                    </div>
                    {req.acceptance_criteria && <div style={{ fontSize: 11.5, color: C.dim, whiteSpace: "pre-wrap", marginTop: 4 }}>معايير القبول: {req.acceptance_criteria}</div>}
                    <div style={{ display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center", marginTop: 6 }}><span style={{ fontSize: 10.5, color: C.muted }}>المهام:</span>{reqTasks.length ? reqTasks.map((task) => <span key={task.id} style={{ display: "inline-flex", alignItems: "center" }}><Btn small onClick={() => openTask(task.id)}>{D.cat(task.status) === "done" ? "✓ " : "▫ "}{task.title}</Btn></span>) : <span style={{ fontSize: 11, color: C.warn }}>لا توجد مهمة تنفذ هذا المتطلب</span>}</div>
                    {reqOutputs.length > 0 && <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 5 }}><span style={{ fontSize: 10.5, color: C.muted }}>المخرجات:</span>{reqOutputs.map((output) => <Btn key={output.id} small onClick={() => openProject(prd.project_id, "outputs", { kind: "output", id: output.id })}>📦 {output.name}</Btn>)}</div>}
                  </div>;
                })}
                {canEdit && <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}><Btn kind="primary" small onClick={() => setEditorId(prd.id)}>إدارة المتطلبات والمراجعة</Btn></div>}
              </div>
            </div>;
          })() : <Empty icon="📝" title="اختر مواصفة" sub="اختر مواصفة من القائمة لعرض المتطلبات وروابط التنفيذ." />}
        </div>)}
      {detail && <RecordDetailModal title={"تفاصيل المواصفة: " + detail.title} onClose={() => setDetail(null)} fields={[
        { label: "المشروع", value: projectsById[detail.project_id]?.name }, { label: "الحالة", value: L.prdStatus[detail.status] || detail.status },
        { label: "الإصدار", value: detail.version || 1 }, { label: "المسؤول", value: people.find((x) => x.id === detail.lead_id)?.name },
        { label: "TL;DR", value: detail.tldr }, { label: "موعد الإطلاق المستهدف", value: detail.target_ship_date },
        { label: "أقسام المواصفة", value: (detail.sections || []).map((section) => section.title + ": " + (section.content || "—")).join("\\n\\n") },
        { label: "المتطلبات", value: (detail.requirements || []).map((req) => req.title + " [" + (req.status || "Active") + "]\\nمعايير القبول: " + (req.acceptance_criteria || "—")).join("\\n\\n") },
        { label: "المهام المرتبطة", value: idx.list.filter((task) => task.prd_id === detail.id).map((task) => task.title).join("، ") },
        { label: "المخرجات المرتبطة", value: data.outputs.filter((output) => output.prd_id === detail.id).map((output) => output.name).join("، ") },
        { label: "المخاطر المرتبطة", value: data.risks.filter((risk) => risk.prd_id === detail.id).map((risk) => risk.title).join("، ") },
        { label: "القرارات المرتبطة", value: data.decisions.filter((decision) => decision.prd_id === detail.id || (decision.affected_prd_ids || []).includes(detail.id)).map((decision) => decision.title).join("، ") },
        { label: "المراجعون", value: (detail.reviewer_ids || []).map((id) => people.find((person) => person.id === id)?.name).filter(Boolean).join("، ") },
        { label: "الموافقات", value: (detail.approvals || []).map((approval) => (people.find((person) => person.id === approval.reviewer_id)?.name || "مراجع") + ": " + (approval.decision === "approve" ? "موافقة" : "رفض") + (approval.comment ? " — " + approval.comment : "")).join("\\n") }
      ]} />}
      {form && <FormModal title="مواصفة جديدة" initial={{ status: "Not Started", ...form }} onClose={() => setForm(null)} onSubmit={async (v) => { const rec = { ...v, id: uid(), version: 1, sections: PRD_TEMPLATE.map((s) => ({ key: s.key, title: s.title, group: s.group, content: "" })), approvals: [], reviewer_ids: [], lead_id: v.lead_id || me }; const saved = await act.put("prds", rec, projectsById[v.project_id]); setForm(null); if (saved) setSel(saved.id); }} fields={[
        { key: "title", label: "عنوان المواصفة", required: true }, { key: "project_id", label: "المشروع", type: "select", required: true, allowEmpty: false, options: projOpts(data.projects.filter((p) => !p.is_system && (!projectId || p.id === projectId))) }, { key: "lead_id", label: "المسؤول", type: "select", options: mOpts(people) }]} />}
      {openPrd && <PrdEditor prd={openPrd} onClose={() => setEditorId(null)} onOpen={(id) => { setSel(id); setEditorId(id); }} />}
      {taskForm && <TaskForm initial={taskForm} onClose={() => setTaskForm(null)} />}
    </div>
  );
}
function PrdEditor({ prd, onClose, onOpen }) {
  const { data, A: act, can, projectsById, people, toast, me, PRD_TEMPLATE, idx, confirm, nameOf, openTask, openProject } = useP();
  const project = projectsById[prd.project_id]; const locked = ["Approved", "Superseded", "Ready for Review"].includes(prd.status); const canW = can("prd.write", project) && !locked;
  const [d, setD] = useState({ ...prd, sections: prd.sections || [] }); const [tab, setTab] = useState("doc"); const [busy, setBusy] = useState(false); const [rejectForm, setRejectForm] = useState(false); const [taskForm, setTaskForm] = useState(null); const versioning = useRef(false);
  const secOf = (k) => (d.sections.find((s) => s.key === k) || {}).content || "";
  const setSec = (k, v, tpl) => setD((x) => { const ex = x.sections.some((s) => s.key === k); return { ...x, sections: ex ? x.sections.map((s) => (s.key === k ? { ...s, content: v } : s)) : [...x.sections, { key: k, title: tpl ? tpl.title : k, group: tpl ? tpl.group : "", content: v }] }; });
  const save = async (patch) => { setBusy(true); try { const rec = { ...d, ...(patch || {}) }; const s = await act.put("prds", rec, project); if (s) { setD(s); toast("✅ تم الحفظ"); } return s; } finally { setBusy(false); } };
  const ready = D.prdApprovalReady(d, d.sections, d.approvals);
  const linkedTasks = idx.list.filter((t) => t.prd_id === d.id);
  const linkedOutputs = data.outputs.filter((o) => o.prd_id === d.id && D.isActiveRec(o));
  const linkedRisks = data.risks.filter((risk) => risk.prd_id === d.id && D.isActiveRec(risk));
  const relatedDecisions = data.decisions.filter((decision) => D.isActiveRec(decision) && (decision.prd_id === d.id || (decision.affected_prd_ids || []).includes(d.id)));
  const requirements = d.requirements || [];
  const verifiedRequirementMissingEvidence = (req) => req.status === "Verified" && !linkedOutputs.some((o) => o.prd_requirement_id === req.id && o.approval === "Final");
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
    <>
    <Modal title={`${d.title} — v${d.version || 1}`} wide onClose={onClose} footer={<>
      {canW && <Btn kind="primary" onClick={() => save()} disabled={busy}>💾 حفظ</Btn>}
      {canW && d.status !== "Ready for Review" && <Btn onClick={requestReview}>📤 طلب مراجعة</Btn>}
      {can("prd.approve", project) && d.status === "Ready for Review" && <Btn kind="primary" onClick={approve}>✔ اعتماد</Btn>}
      {d.status === "Approved" && can("prd.approve", project) && <Btn onClick={newVersion} disabled={busy}>🆕 نسخة جديدة</Btn>}
      {canW && <Btn onClick={risksFromSection}>⚠️ حوّل المخاطر إلى سجلات</Btn>}
      {d.status === "Ready for Review" && can("prd.approve", project) && <Btn onClick={() => save({ status: "In Progress", submitted_for_review_at: null })}>↩ إرجاع للمسودة</Btn>}
      {!locked && can("prd.write", project) && <Btn danger onClick={async () => { await act.del("prds", d.id, d.title); onClose(); }}>🗑</Btn>}</>}>
      <div style={{ display: "flex", gap: 6, marginBottom: 8, alignItems: "center", flexWrap: "wrap" }}><Chip color={d.status === "Approved" ? C.ok : C.info}>{L.prdStatus[d.status]}</Chip><ProjectName id={d.project_id} />{locked && <span style={{ fontSize: 11, color: C.muted }}>🔒 {d.status === "Ready for Review" ? "قيد المراجعة — أعدها للمسودة قبل التعديل" : "نسخة معتمدة/مستبدلة — أنشئ نسخة جديدة للتعديل"}</span>}</div>
      <Tabs small value={tab} onChange={setTab} tabs={[{ id: "doc", label: "المواصفة" }, { id: "requirements", label: "المتطلبات", count: requirements.filter((r) => r.status !== "Deprecated").length }, { id: "tasks", label: "المهام", count: linkedTasks.length }, { id: "risks", label: "المخاطر", count: linkedRisks.length }, { id: "decisions", label: "القرارات", count: relatedDecisions.length }, { id: "meta", label: "البيانات والمراجعة" }]} />
      {tab === "doc" && <div>
        <Field label="TLDR *"><textarea disabled={!canW} style={{ ...S.ta, minHeight: 60 }} value={d.tldr || ""} onChange={(e) => setD({ ...d, tldr: e.target.value })} /></Field>
        {groups.map((g) => <div key={g}><div style={{ fontSize: 12, fontWeight: 800, color: A, margin: "10px 0 6px" }}>{g}</div>{PRD_TEMPLATE.filter((s) => s.group === g).map((s) => <Field key={s.key} label={s.title + (s.required ? " *" : "")} hint={s.hint}><textarea disabled={!canW} style={{ ...S.ta, minHeight: 70 }} value={secOf(s.key)} onChange={(e) => setSec(s.key, e.target.value, s)} /></Field>)}</div>)}
      </div>}
      {tab === "requirements" && <div>
        {canW && <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}><Btn kind="primary" small onClick={() => setRequirementForm({ status: "Active", priority: "Medium" })}>＋ متطلب</Btn></div>}
        {!(d.requirements || []).length ? <Empty icon="🧩" title="لا توجد متطلبات محددة" sub="قسّم المواصفة إلى متطلبات واضحة بمعايير قبول، ثم اربط كل مهمة بالمتطلب الذي تنفذه." /> : (d.requirements || []).map((r) => {
          const reqTasks = linkedTasks.filter((t) => t.prd_requirement_id === r.id); const reqOutputs = linkedOutputs.filter((o) => o.prd_requirement_id === r.id);
          return <div key={r.id} style={{ ...S.card, padding: "9px 11px", marginBottom: 7, opacity: r.status === "Deprecated" ? 0.65 : 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}><b style={{ flex: 1, fontSize: 13 }}>{r.title}</b><Chip color={r.status === "Deprecated" ? C.muted : r.status === "Accepted" ? C.ok : C.info}>{r.status === "Deprecated" ? "متوقف" : r.status === "Accepted" ? "مقبول" : "نشط"}</Chip><Chip>{r.priority || "Medium"}</Chip>{canW && <Btn small onClick={() => setRequirementForm(r)}>تعديل</Btn>}{can("task.write", project) && r.status !== "Deprecated" && <Btn small onClick={() => setTaskForm({ project_id: d.project_id, prd_id: d.id, prd_requirement_id: r.id })}>＋ مهمة</Btn>}{canW && <Btn small danger onClick={async () => { if (reqTasks.length || reqOutputs.length) { const next = (d.requirements || []).map((x) => x.id === r.id ? { ...x, status: "Deprecated" } : x); await save({ requirements: next }); } else { await save({ requirements: (d.requirements || []).filter((x) => x.id !== r.id) }); } }}> {reqTasks.length || reqOutputs.length ? "إيقاف" : "حذف"} </Btn>}</div>
            {verifiedRequirementMissingEvidence(r) && <Chip color={C.warn}>ينقصه دليل نهائي</Chip>}{r.acceptance_criteria && <div style={{ whiteSpace: "pre-wrap", fontSize: 12, color: C.dim, marginTop: 5 }}><b>معايير القبول:</b> {r.acceptance_criteria}</div>}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 6, alignItems: "center" }}><span style={{ fontSize: 11, color: C.muted }}>المهام: {reqTasks.length}</span>{reqTasks.map((t) => <Btn key={t.id} small onClick={() => openTask(t.id)}>{D.cat(t.status) === "done" ? "✅ " : "▫️ "}{t.title}</Btn>)}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 5, alignItems: "center" }}><span style={{ fontSize: 11, color: C.muted }}>المخرجات: {reqOutputs.length}</span>{reqOutputs.map((o) => <button key={o.id} type="button" onClick={() => openProject(d.project_id, "outputs", { kind: "output", id: o.id })} style={{ display: "block", border: 0, padding: 0, background: "none", color: C.info, cursor: "pointer", textAlign: "start", fontSize: 12, marginTop: 3, textDecoration: "underline" }}>📦 {o.name} · {L.approval[o.approval] || o.approval} ↗</button>)}</div>
          </div>;
        })}
        {requirementForm && <FormModal title={requirementForm.id ? "تعديل المتطلب" : "متطلب جديد"} wide initial={{ status: "Active", priority: "Medium", ...requirementForm }} onClose={() => setRequirementForm(null)} onSubmit={async (v) => { if (!String(v.title || "").trim()) throw new Error("عنوان المتطلب مطلوب."); const next = [...(d.requirements || []).filter((r) => r.id !== v.id), { ...v, id: v.id || uid(), title: v.title.trim() }]; if (v.status === "Verified" && !linkedOutputs.some((o) => o.prd_requirement_id === (v.id || "") && o.approval === "Final")) throw new Error("لا يمكن اعتماد المتطلب كمتحقق دون مخرج نهائي نشط مرتبط به."); const saved = await save({ requirements: next }); if (saved) setRequirementForm(null); }} fields={[{ key: "title", label: "عنوان المتطلب", required: true, span: 2 }, { key: "acceptance_criteria", label: "معايير القبول / شروط الإنجاز", type: "textarea", required: true, rows: 3 }, { key: "priority", label: "الأولوية", type: "select", allowEmpty: false, options: opts(L.priority) }, { key: "status", label: "الحالة", type: "select", allowEmpty: false, options: [{ v: "Active", l: "نشط" }, { v: "Accepted", l: "مقبول" }, { v: "Verified", l: "متحقق" }, { v: "Deprecated", l: "متوقف" }] }]} />}
      </div>}
      {tab === "risks" && <div>{!linkedRisks.length ? <Empty icon="⚠️" title="لا مخاطر مرتبطة" sub="اربط الخطر بالمواصفة من نموذج الخطر." /> : linkedRisks.map((risk) => <div key={risk.id} style={{ ...S.card, marginBottom: 7, padding: 10 }}><button type="button" onClick={() => openProject(risk.project_id, "risks", { kind: "risk", id: risk.id })} style={{ border: 0, padding: 0, background: "none", color: C.info, cursor: "pointer", textDecoration: "underline", fontWeight: 700 }}>{risk.title} ↗</button><div style={{ fontSize: 11.5, color: C.muted, marginTop: 3 }}>{risk.status} · الاحتمال {risk.probability}/5 · التأثير {risk.impact}/5</div>{risk.mitigation && <div style={{ fontSize: 12, color: C.dim, marginTop: 4 }}>خطة التخفيف: {risk.mitigation}</div>}</div>)}</div>}
      {tab === "decisions" && <div>{!relatedDecisions.length ? <Empty icon="⚖️" title="لا قرارات مرتبطة" sub="اربط القرارات المؤثرة بهذه المواصفة." /> : relatedDecisions.map((decision) => <div key={decision.id} style={{ ...S.card, marginBottom: 7, padding: 10 }}><button type="button" onClick={() => openProject(decision.project_id, "decisions", { kind: "decision", id: decision.id })} style={{ border: 0, padding: 0, background: "none", color: C.info, cursor: "pointer", textDecoration: "underline", fontWeight: 700 }}>{decision.title} ↗</button><div style={{ fontSize: 11.5, color: C.muted, marginTop: 3 }}>{L.decisionStatus[decision.status] || decision.status} · {fmt(decision.decided_at)}</div>{decision.rationale && <div style={{ fontSize: 12, color: C.dim, marginTop: 4 }}>{decision.rationale}</div>}</div>)}</div>}
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
    {taskForm && <TaskForm initial={taskForm} onClose={() => setTaskForm(null)} />}
    </>
  );
}

// ═════ Discovery (PIO) ═════
export function DiscoveryView() {
  const { data, A: act, can, projectsById, people, toast, me, today, settings, confirm, openProject, idx, nameOf, view } = useP();
  const [form, setForm] = useState(null); const [detail, setDetail] = useState(null); const [mode, setMode] = useState("board"); const [q, setQ] = useState(""); const [type, setType] = useState(""); const [conv, setConv] = useState(null); const convertingDiscoveryIds = useRef(new Set());
  const runDiscoveryConversionOnce = async (id, work) => { if (convertingDiscoveryIds.current.has(id)) { toast("التحويل جارٍ بالفعل؛ انتظر اكتماله قبل إعادة المحاولة."); return null; } convertingDiscoveryIds.current.add(id); try { return await work(); } finally { convertingDiscoveryIds.current.delete(id); } };
  const list = data.discovery.filter((d) => (!type || d.type === type) && (!q || d.title.toLowerCase().includes(q.toLowerCase())));
  const canWriteDiscovery = can("discovery.write");
  const statuses = Object.keys(L.discoveryStatus);
  const conversionWriteAction = { task: "task.write", prd: "prd.write", issue: "issue.write" };
  const eligibleConversionProjects = (kind, source) => (source.project_ids || []).map((id) => projectsById[id]).filter((project) => project && !project.is_system && !project.archived_at && can(conversionWriteAction[kind], project));
  const canConvertDiscovery = (kind, source) => kind === "project" ? can("project.create") : !!eligibleConversionProjects(kind, source).length;
  const stale = (d) => d.status === "Inbox" && d.logged_at && diffDays(today, d.logged_at) > settings.inboxStaleDays;
  const typeIcon = { Problem: "🔴", Idea: "💡", Opportunity: "🌟" };
  useRecordFocus(view, "discovery", null, list.length);
  async function move(id, to) {
    if (!canWriteDiscovery) return toast("لا تملك صلاحية تعديل سجل الاكتشاف.");
    const d = data.discovery.find((x) => x.id === id); if (!d || d.status === to) return;
    const linked = (d.resolution_links || []).length > 0; const m = D.validateDiscoveryStatus(d, to, linked);
    if (m) { if (to === "Dropped") return setForm({ ...d, status: to, _need: "dropped_reason" }); if (to === "Working On") return setForm({ ...d, status: to, owner_id: d.owner_id || me, _need: "owner" }); if (to === "Completed") return setForm({ ...d, status: to, _need: "resolution_note" }); return toast("⛔ " + m); }
    await act.put("discovery", { ...d, status: to }); 
  }
  async function convert(d, kind) {
    if (!canWriteDiscovery) { toast("لا تملك صلاحية تحويل الاكتشاف."); return; }
    if (!canConvertDiscovery(kind, d)) { toast("لا تملك صلاحية إنشاء هذا النوع من العناصر في المشاريع المرتبطة."); return; }
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
    <div id={recordDomId("discovery", d.id)} style={{ ...S.card, padding: "9px 11px", ...recordFocusStyle(view, "discovery", d.id) }} onClick={() => setForm(d)}>
      <div style={{ fontSize: 12.5, fontWeight: 700 }}>{typeIcon[d.type]} {d.title}</div>
      <div style={{ fontSize: 11, color: C.dim, margin: "3px 0" }}>{d.proposed_solution ? "💬 " + d.proposed_solution.slice(0, 60) : d.description ? d.description.slice(0, 60) : ""}</div>
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center" }}><Btn small onClick={(e) => { e.stopPropagation(); setDetail(d); }}>عرض التفاصيل</Btn>{d.impact_level && <Chip color={SEV_COLOR[d.impact_level]}>{L.severity[d.impact_level]}</Chip>}{stale(d) && <Chip color={C.warn}>⏳ يحتاج فرزاً</Chip>}{d.owner_id && <Who id={d.owner_id} size={15} />}{(d.resolution_links || []).length > 0 && <Chip color={C.ok}>↪ {(d.resolution_links || []).length}</Chip>}{data.decisions.filter((decision) => (decision.related_discovery_ids || []).includes(d.id)).map((decision) => <Chip key={decision.id} color={C.violet}>⚖ {decision.title}</Chip>)}</div>
      {(d.resolution_links || []).length > 0 && <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 6 }}>{(d.resolution_links || []).map((link) => { const task = link.kind === "task" ? idx.byId[link.id] : null; const issue = link.kind === "issue" ? data.issues.find((x) => x.id === link.id) : null; const prd = link.kind === "prd" ? data.prds.find((x) => x.id === link.id) : null; const project = link.kind === "project" ? projectsById[link.id] : null; const label = task?.title || issue?.title || prd?.title || project?.name || "عنصر مرتبط"; return <button key={link.kind + ":" + link.id} type="button" onClick={(e) => { e.stopPropagation(); if (task) openTask(task.id); else if (issue) openProject(issue.project_id, "issues", { kind: "issue", id: issue.id }); else if (prd) openProject(prd.project_id, "prds", { kind: "prd", id: prd.id }); else if (project) openProject(project.id); }} style={{ border: 0, background: "transparent", color: C.info, cursor: "pointer", textDecoration: "underline", fontSize: 11 }}>↗ {label}</button>; })}</div>}
    </div>);
  return (
    <div>
      <Head title="الاكتشاف" sub="مشاكل · أفكار · فرص — الوارد قبل أن تتحول إلى مشاريع ومهام" right={<><Seg value={mode} onChange={setMode} options={[{ v: "board", l: "لوحة" }, { v: "list", l: "قائمة" }]} />{canWriteDiscovery && <Btn kind="primary" onClick={() => setForm({ status: "Inbox", type: "Idea", logged_at: today })}>➕ عنصر</Btn>}</>} />
      <SearchBar value={q} onChange={setQ} placeholder="بحث…"><select style={{ ...S.sel, width: 130 }} value={type} onChange={(e) => setType(e.target.value)}><option value="">كل الأنواع</option>{opts(L.discoveryType).map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}</select></SearchBar>
      {mode === "board" ? <Board columns={statuses.map((s) => ({ id: s, label: L.discoveryStatus[s], color: s === "Dropped" ? "#EF4444" : s === "Completed" ? "#10B981" : s === "Working On" ? "#3B82F6" : "#94A3B8", items: list.filter((d) => d.status === s) }))} onMove={canWriteDiscovery ? move : undefined} renderCard={card} />
        : !list.length ? <Empty icon="💡" title="لا عناصر" /> : <div style={{ ...S.card, padding: "4px 12px" }}>{list.map((d) => <div key={d.id} id={recordDomId("discovery", d.id)} onClick={() => setForm(d)} style={{ ...recordFocusStyle(view, "discovery", d.id), display: "flex", gap: 8, padding: "8px 0", borderBottom: `1px solid ${C.line}`, cursor: "pointer", alignItems: "center", fontSize: 13 }}><span>{typeIcon[d.type]}</span><span style={{ flex: 1 }}>{d.title}</span><Chip color={C.info}>{L.discoveryStatus[d.status]}</Chip></div>)}</div>}
      {detail && <RecordDetailModal title={"تفاصيل الاكتشاف: " + detail.title} onClose={() => setDetail(null)} fields={[
        { label: "النوع", value: L.discoveryType[detail.type] || detail.type }, { label: "الحالة", value: L.discoveryStatus[detail.status] || detail.status },
        { label: "مستوى الأثر", value: L.severity[detail.impact_level] || detail.impact_level },
        { label: "المسؤول", value: people.find((x) => x.id === detail.owner_id)?.name }, { label: "تاريخ التسجيل", value: detail.logged_at },
        { label: "المشاريع المرتبطة", value: (detail.project_ids || []).map((id) => projectsById[id]?.name).filter(Boolean).join("، ") },
        { label: "الوصف", value: detail.description }, { label: "الأدلة", value: detail.insights },
        { label: "الحل المقترح", value: detail.proposed_solution }, { label: "سبب الإسقاط", value: detail.dropped_reason },
        { label: "ملاحظة الحل", value: detail.resolution_note },
        { label: "العناصر الناتجة", value: (detail.resolution_links || []).map((link) => {
          if (link.kind === "task") return idx.byId[link.id]?.title;
          if (link.kind === "issue") return data.issues.find((item) => item.id === link.id)?.title;
          if (link.kind === "prd") return data.prds.find((item) => item.id === link.id)?.title;
          if (link.kind === "project") return projectsById[link.id]?.name;
          return null;
        }).filter(Boolean).join("، ") }
      ]} />}
      {form && canWriteDiscovery && <FormModal title={form.id ? "عنصر اكتشاف" : "عنصر جديد"} wide initial={form} onClose={() => setForm(null)}
        footerExtra={form.id && canWriteDiscovery ? <><Btn onClick={() => { setConv(form); setForm(null); }}>↪ تحويل…</Btn><Btn danger onClick={async () => { await act.del("discovery", form.id, form.title); setForm(null); }}>🗑</Btn></> : null}
        validate={(v) => { const m = D.validateDiscoveryStatus(v, v.status, (v.resolution_links || []).length > 0); return m; }}
        onSubmit={async (v) => { const { _need, ...rec } = v; await act.put("discovery", { ...rec, id: rec.id || uid(), raised_by_member_id: rec.raised_by_member_id || me, source: rec.source || "manual", logged_at: rec.logged_at || today }); toast("✅ تم الحفظ"); setForm(null); }} fields={[
          { key: "title", label: "العنوان", required: true, span: 2 }, { key: "type", label: "النوع", type: "select", allowEmpty: false, options: opts(L.discoveryType) }, { key: "status", label: "الحالة", type: "select", allowEmpty: false, options: opts(L.discoveryStatus) },
          { key: "impact_level", label: "مستوى الأثر", type: "select", options: opts(L.severity), emptyLabel: "—" }, { key: "owner_id", label: "المسؤول", type: "select", options: mOpts(people), required: (v) => v.status === "Working On" },
          { key: "project_ids", label: "المشاريع المرتبطة", type: "multi", options: data.projects.filter((p) => !p.is_system).map((p) => ({ v: p.id, l: p.name })) },
          { key: "dropped_reason", label: "سبب الإسقاط", required: true, show: (v) => v.status === "Dropped" },
          { key: "resolution_note", label: "ملاحظة الحل", type: "textarea", rows: 2, show: (v) => v.status === "Completed" },
          { key: "description", label: "الوصف", type: "textarea" }, { key: "insights", label: "الأدلة", type: "textarea", rows: 2 }, { key: "proposed_solution", label: "الحل المقترح", type: "textarea", rows: 2 }]} />}
      {conv && <Modal title={"تحويل: " + conv.title} onClose={() => setConv(null)}><div style={{ display: "grid", gap: 8 }}>
        {conv._conversionKind ? <><Field label="اختر المشروع الذي سيُنشأ فيه العنصر"><select style={S.sel} value={conv._conversionProjectId || ""} onChange={(e) => setConv({ ...conv, _conversionProjectId: e.target.value })}><option value="">اختر مشروعاً…</option>{(conv._availableProjectIds || []).filter((id) => { const project = projectsById[id]; return project && can(conversionWriteAction[conv._conversionKind], project); }).map((id) => <option key={id} value={id}>{projectsById[id].name}</option>)}</select></Field><Btn kind="primary" disabled={!conv._conversionProjectId || !can(conversionWriteAction[conv._conversionKind], projectsById[conv._conversionProjectId])} onClick={() => convert({ ...conv, _conversionProjectId: conv._conversionProjectId }, conv._conversionKind)}>متابعة التحويل</Btn></> : [["task", "✅ إلى مهمة"], ["prd", "📝 إلى مواصفة"], ["project", "📁 إلى مشروع (فكرة)"], ["issue", "🔥 إلى مشكلة"]].filter(([kind]) => canConvertDiscovery(kind, conv)).map(([k, l]) => <Btn key={k} onClick={() => convert(conv, k)}>{l}</Btn>)}
        <div style={{ fontSize: 11, color: C.muted }}>مشكلة محتملة (اكتشاف) ليست عطلًا مؤكدًا. التحويل إلى مشكلة ينشئ مشكلة تنفيذية مرتبطة بمصدرها.</div></div></Modal>}
    </div>
  );
}
