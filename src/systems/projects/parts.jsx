import React, { useState, useMemo, useEffect } from "react";
import { A, S } from "../../core/ui.jsx";
import { C, Btn, Chip, Dot, Avatar, Progress, SideSheet, FormModal, Tabs, Empty, Field } from "../../core/kit.jsx";
import { fmt, fmtShort, fmtMinutes, diffDays, dateOf } from "../../core/dates.js";
import { uid } from "../../core/records.jsx";
import { useP } from "./store.jsx";
import * as D from "./domain.js";
import { L, opts, PRIORITY_COLOR, STATUS_COLOR, SEV_COLOR } from "./lookups.js";

export const mOpts = (people) => people.map((p) => ({ v: p.id, l: p.name }));

export function HealthBadge({ m, compact }) {
  if (!m) return null; const h = D.HEALTH_META[m.health] || D.HEALTH_META.NotEvaluated;
  const why = (m.healthReasons || []).map((r) => D.REASON_LABEL[r.code]).join(" · ");
  return <Chip color={h.color} title={why || h.label}>{h.icon} {compact ? "" : h.label}</Chip>;
}
export const StatusChip = ({ s, map }) => <Chip color={STATUS_COLOR[s] || C.muted}>{(map || L.projectStatus)[s] || s}</Chip>;
export const PriorityChip = ({ p }) => (p ? <Chip color={PRIORITY_COLOR[p]}>{L.priority[p] || p}</Chip> : null);
export function Who({ id, size }) { const { nameOf } = useP(); if (!id) return <span style={{ fontSize: 11, color: C.muted }}>غير مسند</span>; return <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12 }}><Avatar name={nameOf(id)} size={size || 20} />{nameOf(id)}</span>; }
export function DueChip({ date, status, today }) {
  if (!date) return null; const done = D.cat(status) === "done" || D.cat(status) === "cancelled"; const d = diffDays(date, today);
  const color = done ? C.muted : d < 0 ? C.bad : d <= 2 ? C.warn : C.dim;
  return <span style={{ fontSize: 11, color, fontWeight: !done && d < 0 ? 700 : 500 }}>📅 {fmtShort(date)}{!done && d < 0 ? ` (متأخر ${-d}ي)` : ""}</span>;
}
export function ProjectName({ id, onClick }) { const { projectsById, openProject } = useP(); const p = projectsById[id]; if (!p) return <span style={{ color: C.muted }}>—</span>; return <a onClick={(e) => { e.preventDefault(); (onClick || openProject)(id); }} href="#" style={{ color: C.info, fontSize: 12, textDecoration: "none", fontWeight: 600 }}>{p.is_system ? "⚙ " : "📁 "}{p.name}</a>; }
export const projOpts = (projects, includeArchived) => projects.filter((p) => includeArchived || !p.archived_at).map((p) => ({ v: p.id, l: (p.is_system ? "⚙ " : "") + p.name }));

// ── Project form ────────────────────────────────────────────────────
export function ProjectForm({ initial, onClose }) {
  const { A: act, people, lookups, can, toast, openProject, settings, data } = useP(); const isNew = !initial || !initial.id;
  const fields = [
    { key: "name", label: "اسم المشروع", required: true, span: 2 },
    { key: "type", label: "النوع", type: "select", options: lookups.project_type.map((x) => ({ v: x, l: x })), allowEmpty: false },
    { key: "priority", label: "الأولوية", type: "select", options: opts(L.priority), allowEmpty: false },
    { key: "start_date", label: "تاريخ البدء", type: "date" }, { key: "target_date", label: "الموعد المستهدف", type: "date" },
    { key: "lead_id", label: "قائد المشروع", type: "select", options: mOpts(people), allowEmpty: false },
    { key: "visibility", label: "الرؤية", type: "select", options: opts(L.visibility), allowEmpty: false, hint: "الخاص لا يراه إلا أعضاؤه (يُطبَّق في قاعدة البيانات)" },
    { key: "final_goal", label: "الهدف النهائي", type: "textarea" }, { key: "description", label: "الوصف", type: "textarea" },
    { key: "budget_planned", label: "الميزانية المخطَّطة", type: "number", min: 0 }, { key: "budget_currency", label: "العملة" },
  ];
  return <FormModal title={isNew ? "مشروع جديد" : "تعديل المشروع"} wide fields={fields} initial={{ type: lookups.project_type[0], priority: "Medium", visibility: "workspace", lead_id: undefined, budget_currency: "EGP", ...initial }}
    onSubmit={async (v) => { const saved = await act.saveProject({ ...v, lead_id: v.lead_id || undefined }, isNew); if (saved) { toast(isNew ? "✅ تم إنشاء المشروع" : "✅ تم الحفظ"); onClose(); if (isNew) openProject(saved.id); } else return false; }} onClose={onClose} />;
}

// ── Task form ───────────────────────────────────────────────────────
export function TaskForm({ initial, projectId, parentId, allowedProjectIds, linkedKrId, onClose }) {
  const { A: act, people, data, idx, projectsById, toast, can } = useP(); const isNew = !initial || !initial.id; const [showAdvanced, setShowAdvanced] = useState(false);
  const base = { project_id: projectId || (initial && initial.project_id) || "", parent_task_id: parentId || null, priority: "Medium", planning_bucket: "Inbox", status: "Not Started", custom_label: initial?.custom_fields?.label || "", custom_url: initial?.custom_fields?.url || "", ...initial };
  const isParent = !isNew && !idx.isLeaf(initial.id); const dv = isParent ? idx.derived[initial.id] : null;
  const initVals = isParent ? { ...base, status: dv.status, estimated_minutes: dv.estimated, due_date: dv.dueMax } : base;
  const descIds = isNew ? [] : [initial.id, ...idx.descendants(initial.id)];
  const fields = [
    { key: "title", label: "عنوان المهمة", required: true, span: 2 },
    { key: "project_id", label: "المشروع", type: "select", allowEmpty: false, options: projOpts(data.projects.filter((p) => !allowedProjectIds || allowedProjectIds.includes(p.id))), disabled: () => !isNew && !!initial.id, hint: "لنقل المهمة لمشروع آخر استخدم «نقل الشجرة»" },
    { key: "priority", label: "الأولوية", type: "select", options: opts(L.priority), allowEmpty: false },
    { key: "due_date", label: isParent ? "الموعد (مشتق من الأبناء)" : "الموعد النهائي", type: "date", disabled: () => isParent },
    { key: "status", label: isParent ? "الحالة (مشتقة)" : "الحالة", type: "select", allowEmpty: false, options: opts(L.taskStatus), disabled: () => isParent, show: () => !showAdvanced },
    { key: "parent_task_id", label: "المهمة الأب", type: "select", emptyLabel: "— مستوى أعلى —", options: (v) => idx.list.filter((t) => t.project_id === v.project_id && !descIds.includes(t.id)).map((t) => ({ v: t.id, l: "  ".repeat(idx.derived[t.id] ? idx.derived[t.id].depth : 0) + t.title })), show: () => showAdvanced },
    { key: "cancelled_reason", label: "سبب الإلغاء", required: true, show: (v) => v.status === "Cancelled" && !isParent },
    { key: "planning_bucket", label: "تخطيط الأسبوع", type: "select", options: opts(L.bucket), allowEmpty: false, show: () => showAdvanced && !isParent },
    { key: "assignee_id", label: "المسؤول", type: "select", options: mOpts(people), emptyLabel: "— غير مسند —", hint: "لا يُورَّث من الأب", show: () => showAdvanced },
    { key: "estimated_minutes", label: isParent ? "التقدير (مجموع الأبناء)" : "التقدير (دقائق)", type: "number", min: 0, disabled: () => isParent, show: () => showAdvanced },
    { key: "prd_id", label: "المواصفة (PRD)", type: "select", emptyLabel: "— بلا —", options: (v) => data.prds.filter((p) => p.project_id === v.project_id).map((p) => ({ v: p.id, l: p.title })), hint: "يجب أن تتبع نفس المشروع", show: () => showAdvanced },
    { key: "prd_requirement_id", label: "المتطلب المحدد من المواصفة", type: "select", emptyLabel: "— بلا متطلب محدد —", options: (v) => { const prd = data.prds.find((p) => p.id === v.prd_id); return (prd?.requirements || []).filter((r) => r.status !== "Deprecated").map((r) => ({ v: r.id, l: r.title })); }, hint: "اختر المتطلب الذي تنفذه المهمة بعد اختيار المواصفة.", show: () => showAdvanced },
    { key: "discovery_ids", label: "عناصر الاكتشاف (لماذا وُجدت؟)", type: "multi", options: (v) => data.discovery.filter((d) => !d.project_ids?.length || d.project_ids.includes(v.project_id)).map((d) => ({ v: d.id, l: d.title })), show: () => showAdvanced },
    { key: "blocked", label: "متعطّلة؟", type: "bool", checkLabel: "المهمة متعطّلة (لا يغيّر التقدم)", show: () => showAdvanced },
    { key: "blocked_reason", label: "سبب التعطّل", show: (v) => showAdvanced && !!v.blocked },
    { key: "description", label: "الوصف", type: "textarea", show: () => showAdvanced }, { key: "result_note", label: "النتيجة السريعة (نص/رابط)", type: "textarea", rows: 2, show: () => showAdvanced }, { key: "custom_label", label: "حقل مخصص — قيمة مختصرة", hint: "بيانات مرنة خاصة بالمهمة، تُحفظ داخل custom_fields دون تغيير المخطط.", show: () => showAdvanced }, { key: "custom_url", label: "حقل مخصص — رابط", type: "url", show: () => showAdvanced },
  ];
  return <FormModal title={isNew ? (parentId ? "مهمة فرعية جديدة" : "مهمة جديدة") : "تعديل المهمة"} wide fields={fields} initial={initVals}
    onSubmit={async (v) => { const out = { ...v, custom_fields: { ...(initial?.custom_fields || {}), label: String(v.custom_label || "").trim(), url: String(v.custom_url || "").trim() || null } }; delete out.custom_label; delete out.custom_url; if (isParent) { out.status = initial.status; out.estimated_minutes = initial.estimated_minutes; out.due_date = initial.due_date; } if (out.status !== "Cancelled") out.cancelled_reason = null; const saved = await act.saveTask(out, isNew, linkedKrId); if (saved === null) return false; toast("✅ تم الحفظ"); onClose(); }} onClose={onClose}>{() => <div style={{ marginTop: 10, paddingTop: 8, borderTop: "1px solid " + C.line }}><Btn small onClick={() => setShowAdvanced((v) => !v)}>{showAdvanced ? "إخفاء التفاصيل الإضافية" : "⚙ تفاصيل إضافية"}</Btn><span style={{ marginInlineStart: 8, fontSize: 11, color: C.muted }}>ابدأ بالعنوان والأولوية والموعد؛ بقية الحقول اختيارية.</span></div>}</FormModal>;
}

// ── Task tree ───────────────────────────────────────────────────────
export function TaskTree({ projectId, tasks, readOnly, filter }) {
  const { idx, A: act, can, today, people, openTask, projectsById, toast } = useP(); const project = projectsById[projectId];
  const [open, setOpen] = useState({}); const [form, setForm] = useState(null); const [menu, setMenu] = useState(null); const [dragId, setDragId] = useState(null);
  const canWrite = !readOnly && can("task.write", project);
  const roots = idx.roots.filter((t) => t.project_id === projectId);
  const [mode, setMode] = useState("list");
  const [month, setMonth] = useState(today.slice(0, 7));
  const projectTasks = idx.list.filter((t) => t.project_id === projectId && idx.isLeaf(t.id));
  const statusGroups = ["Not Started", "In Progress", "On Hold", "Completed", "Cancelled"];
  const matches = (t) => !filter || filter(t);
  const visible = (t) => matches(t) || (idx.children[t.id] || []).some((k) => visible(idx.byId[k]));
  const isOpen = (id, depth) => (open[id] === undefined ? depth < 2 : open[id]);
  const Row = ({ t, depth }) => {
    const d = idx.derived[t.id]; const kids = idx.children[t.id] || []; const leaf = d.isLeaf; const status = leaf ? t.status : d.status; const done = D.cat(status) === "done"; const cancelled = D.cat(status) === "cancelled";
    if (!visible(t)) return null;
    return (
      <div>
        <div draggable={canWrite} onDragStart={(e) => { setDragId(t.id); e.dataTransfer.setData("text/plain", t.id); }} onDragOver={(e) => canWrite && e.preventDefault()}
          onDrop={async (e) => { e.preventDefault(); const id = e.dataTransfer.getData("text/plain"); if (id && id !== t.id) await act.reparent(id, t.id); setDragId(null); }}
          style={{ display: "grid", gridTemplateColumns: "minmax(235px,1fr) 100px 105px 116px 118px auto", gap: 10, alignItems: "center", minHeight: 48, padding: "6px 10px", borderBottom: "1px solid " + C.line, background: dragId === t.id ? "rgba(239,159,39,.1)" : "transparent", opacity: cancelled ? .55 : 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0, paddingInlineStart: depth * 18 }}>
            {kids.length ? <button type="button" aria-label={isOpen(t.id, depth) ? "طي المهام الفرعية" : "فتح المهام الفرعية"} onClick={() => setOpen({ ...open, [t.id]: !isOpen(t.id, depth) })} style={{ flex: "0 0 18px", width: 18, background: "none", border: 0, cursor: "pointer", color: C.muted, padding: 0 }}>{isOpen(t.id, depth) ? "▾" : "▸"}</button> : <span style={{ flex: "0 0 18px", width: 18 }} />}
            {leaf ? <input type="checkbox" aria-label={"إكمال " + t.title} checked={done} disabled={!canWrite || cancelled} onChange={(e) => act.setTaskStatus(t, e.target.checked ? "Completed" : "Not Started")} /> : <span title="الحالة مشتقة من الأبناء" style={{ fontSize: 11, width: 16, textAlign: "center" }}>{done ? "✓" : "◐"}</span>}
            <button type="button" onClick={() => openTask(t.id)} style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 6, textAlign: "start", border: 0, padding: 0, background: "transparent", color: done ? C.muted : C.text, cursor: "pointer", font: "inherit", overflow: "hidden" }}>
              <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 12.5, fontWeight: leaf ? 500 : 750, textDecoration: done || cancelled ? "line-through" : "none" }}>{t.title}</span>
              {t.milestone && <Chip color={C.warn}>◆ معلم</Chip>}
              {t.blocked && <Chip color={C.bad}>متعطّلة</Chip>}
            </button>
          </div>
          <div style={{ minWidth: 0, display: "flex", justifyContent: "flex-start" }}>{leaf ? <StatusChipSm s={status} /> : <div style={{ width: "100%" }}><Progress value={d.progress} height={6} /><span style={{ display: "block", fontSize: 9.5, color: C.muted, marginTop: 2 }}>{d.leafDone}/{d.leafTotal} مكتملة</span></div>}</div>
          <div style={{ minWidth: 0, overflow: "hidden" }}><Who id={t.assignee_id} size={17} /></div>
          <div style={{ minWidth: 0, whiteSpace: "nowrap" }}><DueChip date={leaf ? t.due_date : d.dueMax} status={status} today={today} /></div>
          <div style={{ minWidth: 0, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}><PriorityChip p={t.priority} />{d.estimated > 0 && <span style={{ fontSize: 9.5, color: C.muted }}>⏱ {fmtMinutes(d.estimated)}</span>}</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4 }}>
            {canWrite && <>
              <button type="button" aria-label={"إضافة مهمة فرعية إلى " + t.title} title="إضافة مهمة فرعية" onClick={() => setForm({ parentId: t.id })} style={{ background: "none", border: "1px solid " + C.line, borderRadius: 6, cursor: "pointer", color: C.info, fontSize: 11, padding: "4px 6px", whiteSpace: "nowrap" }}>＋</button>
              <button type="button" aria-label={"خيارات " + t.title} title="خيارات المهمة" onClick={() => setMenu(menu === t.id ? null : t.id)} style={{ background: "none", border: "1px solid transparent", borderRadius: 6, cursor: "pointer", color: C.muted, fontSize: 16, padding: "2px 5px" }}>⋯</button>
            </>}
          </div>
        </div>
        {menu === t.id && canWrite && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", padding: "7px 10px", paddingInlineStart: 32 + depth * 18, background: "rgba(0,0,0,.025)" }}>
            <Btn small onClick={() => { setMenu(null); setForm({ parentId: t.id }); }}>＋ مهمة فرعية</Btn>
            <Btn small onClick={() => { setMenu(null); setForm({ initial: t }); }}>✎ تعديل</Btn>
            {!leaf && <Btn small onClick={() => { setMenu(null); act.completeAll(t.id); }}>✔ أكمل كل الفروع</Btn>}
            <MoveTreeButton t={t} onDone={() => setMenu(null)} />
            {t.parent_task_id && <Btn small onClick={() => { setMenu(null); act.reparent(t.id, null); }}>⬆ اجعلها مستوى أعلى</Btn>}
            <Btn small onClick={() => { setMenu(null); act.archiveTree(t.id); }}>🗄 أرشفة</Btn>
            <Btn small danger onClick={() => { setMenu(null); act.deleteTree(t.id); }}>🗑 حذف</Btn>
          </div>
        )}
        {kids.length > 0 && isOpen(t.id, depth) && kids.map((k) => <Row key={k} t={idx.byId[k]} depth={depth + 1} />)}
      </div>
    );
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ display: "inline-flex", border: "1px solid " + C.line, borderRadius: 8, overflow: "hidden" }}>
          {[["list","قائمة"],["board","لوحة"],["table","جدول"],["calendar","تقويم"],["timeline","خط زمني"]].map(([v,l], i) => <button key={v} type="button" onClick={() => setMode(v)} style={{ border: 0, borderInlineStart: i ? "1px solid " + C.line : 0, background: mode === v ? "rgba(59,130,246,0.10)" : "#fff", color: mode === v ? C.info : C.dim, padding: "6px 10px", cursor: "pointer", font: "inherit", fontSize: 11.5 }}>{l}</button>)}
        </div>
        {canWrite && <Btn kind="primary" small onClick={() => setForm({})}>➕ مهمة جديدة</Btn>}
      </div>
      <div style={{ display: mode === "list" ? "block" : "none" }}>
        {canWrite && <div style={{ fontSize: 11, color: C.muted, marginBottom: 8 }}>يمكنك استخدام «＋ فرعية» أو خيارات المهمة لنقلها؛ السحب الاختياري يحافظ على ترتيب الشجرة.</div>}
        {roots.length === 0 && <Empty icon="✅" title="لا توجد مهام بعد" sub="أضف أول مهمة أو أنشئ المشروع من قالب جاهز." />}
        <div style={{ ...S.card, padding: 0, overflowX: "auto", overflowY: "hidden", display: roots.length ? "block" : "none" }}
          onDragOver={(e) => canWrite && e.preventDefault()} onDrop={async (e) => { const id = e.dataTransfer.getData("text/plain"); if (id && e.target === e.currentTarget) await act.reparent(id, null); }}>
          <div style={{ minWidth: 835 }}>
            <div style={{ display: "grid", gridTemplateColumns: "minmax(235px,1fr) 100px 105px 116px 118px auto", gap: 10, alignItems: "center", padding: "9px 10px", background: "rgba(0,0,0,.025)", borderBottom: "1px solid " + C.line, color: C.muted, fontSize: 10.5, fontWeight: 700 }}>
              <span>المهمة</span><span>الحالة / التقدم</span><span>المسؤول</span><span>موعد الاستحقاق</span><span>الأولوية / التقدير</span><span />
            </div>
            {roots.map((t) => <Row key={t.id} t={t} depth={0} />)}
          </div>
        </div>
      </div>
      {mode === "board" && <Board columns={statusGroups.map((status) => ({ id: status, label: L.taskStatus[status] || status, color: STATUS_COLOR[status], items: projectTasks.filter((t) => t.status === status) }))} onMove={async (id, to) => { const t = idx.byId[id]; if (t && canWrite) await act.setTaskStatus(t, to); }} renderCard={(t) => <div onClick={() => openTask(t.id)} style={{ ...S.card, padding: "9px 10px", cursor: "pointer" }}><div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 5 }}>{t.title}</div><div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}><PriorityChip p={t.priority} /><DueChip date={t.due_date} status={t.status} today={today} />{t.assignee_id && <Who id={t.assignee_id} size={17} />}</div></div>} />}
      {mode === "table" && <div style={{ ...S.card, padding: 0, overflowX: "auto" }}><table style={{ width: "100%", minWidth: 760, borderCollapse: "collapse", fontSize: 12 }}><thead><tr style={{ background: "rgba(0,0,0,0.03)" }}>{["المهمة","الحالة","المسؤول","الموعد","الأولوية","التقدير"].map((h) => <th key={h} style={{ padding: "8px 10px", textAlign: "right", color: C.muted, fontSize: 10.5 }}>{h}</th>)}</tr></thead><tbody>{projectTasks.map((t) => <tr key={t.id} style={{ borderTop: "1px solid " + C.line }}><td style={{ padding: "8px 10px", fontWeight: 600, cursor: "pointer" }} onClick={() => openTask(t.id)}>{t.title}</td><td style={{ padding: "8px 10px" }}><StatusChipSm s={t.status} /></td><td style={{ padding: "8px 10px" }}>{t.assignee_id ? <Who id={t.assignee_id} size={17} /> : "—"}</td><td style={{ padding: "8px 10px" }}><DueChip date={t.due_date} status={t.status} today={today} /></td><td style={{ padding: "8px 10px" }}><PriorityChip p={t.priority} /></td><td style={{ padding: "8px 10px", color: C.dim }}>{fmtMinutes(t.estimated_minutes || 0)}</td></tr>)}</tbody></table></div>}
      {mode === "calendar" && (() => {
        const [y, m] = month.split("-").map(Number);
        const lead = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 1) % 7;
        const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
        const previousMonth = () => { const d = new Date(Date.UTC(y, m - 2, 1)); setMonth(d.toISOString().slice(0, 7)); };
        const nextMonth = () => { const d = new Date(Date.UTC(y, m, 1)); setMonth(d.toISOString().slice(0, 7)); };
        const moveTask = async (task, date) => {
          if (!canWrite || !task || !date || task.due_date === date) return;
          await act.saveTask({ ...task, due_date: date }, false);
        };
        return <div style={{ ...S.card, padding: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Btn small onClick={previousMonth}>→ السابق</Btn>
              <b>{MONTH_NAMES[m - 1]} {y}</b>
              <Btn small onClick={nextMonth}>التالي ←</Btn>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: 11, color: C.muted }}>اسحب المهمة إلى يوم آخر لتغيير موعدها</span>
              <Btn small onClick={() => setMonth(today.slice(0, 7))}>اليوم</Btn>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,minmax(0,1fr))", gap: 5, direction: "rtl" }}>
            {["السبت","الأحد","الاثنين","الثلاثاء","الأربعاء","الخميس","الجمعة"].map((day) => <div key={day} style={{ textAlign: "center", fontSize: 11, fontWeight: 700, color: C.muted, padding: "5px 2px" }}>{day}</div>)}
            {Array.from({ length: lead }, (_, i) => <div key={"blank-" + i} aria-hidden="true" style={{ minHeight: 102, borderRadius: 8, background: "rgba(0,0,0,.015)" }} />)}
            {Array.from({ length: days }, (_, i) => {
              const ds = month + "-" + String(i + 1).padStart(2, "0");
              const dayTasks = projectTasks.filter((task) => task.due_date === ds);
              const isToday = ds === today;
              return <div key={ds} onDragOver={(e) => canWrite && e.preventDefault()} onDrop={async (e) => {
                if (!canWrite) return;
                e.preventDefault();
                const id = e.dataTransfer.getData("text/plain");
                const task = idx.byId[id];
                await moveTask(task, ds);
              }} style={{ minHeight: 102, minWidth: 0, border: "1px solid " + (isToday ? A : C.line), borderRadius: 8, padding: 5, background: isToday ? "rgba(239,159,39,.07)" : "transparent" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4, marginBottom: 5 }}>
                  <b style={{ fontSize: 11, color: isToday ? A : C.dim }}>{i + 1}</b>
                  {canWrite && <button type="button" aria-label={"إضافة مهمة بتاريخ " + ds} title="إضافة مهمة بهذا اليوم" onClick={() => setForm({ initial: { due_date: ds } })} style={{ border: "1px solid " + C.line, borderRadius: 6, background: "transparent", color: C.info, cursor: "pointer", fontSize: 12, padding: "0 5px" }}>＋</button>}
                </div>
                <div style={{ display: "grid", gap: 4 }}>
                  {dayTasks.slice(0, 4).map((task) => <button key={task.id} type="button" draggable={canWrite} onDragStart={(e) => { e.dataTransfer.setData("text/plain", task.id); e.dataTransfer.effectAllowed = "move"; }} onClick={() => openTask(task.id)} style={{ border: 0, borderRadius: 5, background: D.cat(task.status) === "done" ? "rgba(16,185,129,.14)" : "rgba(59,130,246,.12)", color: C.text, padding: "4px 5px", textAlign: "start", cursor: "pointer", font: "inherit", fontSize: 10.5, lineHeight: 1.35, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{task.title}</button>)}
                  {dayTasks.length > 4 && <span style={{ fontSize: 9.5, color: C.muted }}>+{dayTasks.length - 4} مهام</span>}
                </div>
              </div>;
            })}
          </div>
          {!projectTasks.some((task) => task.due_date?.startsWith(month)) && <div style={{ marginTop: 10, fontSize: 12, color: C.muted }}>لا توجد مهام مستحقة في هذا الشهر. استخدم ＋ داخل اليوم لإضافة مهمة بموعد محدد.</div>}
        </div>;
      })()}
      {mode === "timeline" && (() => {
        const dated = projectTasks.filter((task) => task.start_date || task.due_date);
        const unscheduled = projectTasks.filter((task) => !task.start_date && !task.due_date);
        if (!dated.length) return <div><Empty icon="🗓️" title="لا توجد مهام مجدولة بعد" sub="أضف تاريخ بداية أو موعدًا نهائيًا لتظهر المهمة على الخط الزمني." />{unscheduled.length > 0 && <div style={{ ...S.card, marginTop: 10 }}><b style={{ fontSize: 12.5 }}>غير مجدولة ({unscheduled.length})</b>{unscheduled.slice(0, 12).map((task) => <button key={task.id} type="button" onClick={() => openTask(task.id)} style={{ display: "block", width: "100%", textAlign: "start", border: 0, borderTop: "1px solid " + C.line, background: "transparent", padding: "7px 0", color: C.text, cursor: "pointer", font: "inherit", fontSize: 12 }}>{task.title}</button>)}</div>}</div>;
        const values = dated.flatMap((task) => [task.start_date || task.due_date, task.due_date || task.start_date]);
        const minDate = values.reduce((a, b) => a < b ? a : b);
        const maxDate = values.reduce((a, b) => a > b ? a : b);
        const shiftDate = (date, amount) => { const d = new Date(date + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + amount); return d.toISOString().slice(0, 10); };
        const start = shiftDate(minDate, -7);
        const end = shiftDate(maxDate, 7);
        const totalDays = Math.max(1, diffDays(end, start) + 1);
        const x = (date) => Math.max(0, Math.min(100, diffDays(date, start) / totalDays * 100));
        const ticks = [];
        for (let d = start, n = 0; d <= end && n < 80; d = shiftDate(d, 7), n++) ticks.push(d);
        const hasToday = today >= start && today <= end;
        return <div style={{ ...S.card, padding: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
            <b style={{ fontSize: 13 }}>الخط الزمني للمشروع</b>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}><span style={{ fontSize: 11, color: C.muted }}>النطاق: أسبوعي</span><Btn small onClick={() => { if (hasToday) return; setMonth(today.slice(0, 7)); }}>اليوم {today < start || today > end ? "· خارج النطاق" : ""}</Btn></div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <div style={{ minWidth: 940 }}>
              <div style={{ display: "grid", gridTemplateColumns: "220px minmax(700px,1fr)", gap: 10, alignItems: "end", borderBottom: "1px solid " + C.line, paddingBottom: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 10.5, color: C.muted }}>المهمة</span>
                <div style={{ position: "relative", height: 30 }}>
                  {ticks.map((date) => <span key={date} style={{ position: "absolute", insetInlineStart: x(date) + "%", transform: "translateX(50%)", fontSize: 10, color: date <= today && shiftDate(date, 6) >= today ? A : C.muted, whiteSpace: "nowrap" }}>{fmtShort(date)}{date <= today && shiftDate(date, 6) >= today ? " · هذا الأسبوع" : ""}</span>)}
                </div>
              </div>
              {dated.sort((a, b) => String(a.start_date || a.due_date).localeCompare(String(b.start_date || b.due_date))).map((task) => {
                let a = task.start_date || task.due_date;
                let b = task.due_date || task.start_date;
                if (b < a) [a, b] = [b, a];
                const left = x(a), right = x(b);
                const width = Math.max(1.1, right - left);
                const done = D.cat(task.status) === "done";
                return <div key={task.id} style={{ display: "grid", gridTemplateColumns: "220px minmax(700px,1fr)", gap: 10, alignItems: "center", minHeight: 38, borderBottom: "1px solid " + C.line }}>
                  <button type="button" onClick={() => openTask(task.id)} style={{ border: 0, background: "transparent", padding: 0, textAlign: "start", font: "inherit", fontSize: 11.5, color: done ? C.muted : C.text, cursor: "pointer", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{task.title}</button>
                  <div style={{ position: "relative", height: 26, background: "repeating-linear-gradient(to right, transparent 0, transparent calc(14.285% - 1px), rgba(0,0,0,.035) calc(14.285% - 1px), rgba(0,0,0,.035) 14.285%)", borderRadius: 5 }}>
                    {ticks.map((date) => <span key={date} style={{ position: "absolute", insetInlineStart: x(date) + "%", top: 0, bottom: 0, width: 1, background: "rgba(0,0,0,.07)" }} />)}
                    {hasToday && <span style={{ position: "absolute", insetInlineStart: x(today) + "%", top: -6, bottom: -6, width: 2, background: A, zIndex: 2 }} />}
                    <button type="button" aria-label={task.title + (task.milestone ? " — معلم" : "")} title={task.title + (task.milestone ? " · معلم" : "") + " · " + (task.start_date && task.due_date ? fmtShort(task.start_date) + " → " + fmtShort(task.due_date) : "موعد: " + fmtShort(task.due_date || task.start_date))} onClick={() => openTask(task.id)} style={{ position: "absolute", insetInlineStart: left + "%", width: task.milestone ? "16px" : (task.start_date && task.due_date ? width : 1.6) + "%", top: task.milestone ? 7 : 4, height: task.milestone ? 12 : 18, transform: task.milestone ? "rotate(45deg)" : "none", border: "1px solid " + (task.milestone ? C.warn : done ? C.ok : C.info), borderRadius: task.milestone ? 2 : task.start_date && task.due_date ? 5 : 12, padding: 0, background: task.milestone ? C.warn : done ? "rgba(16,185,129,.2)" : "rgba(59,130,246,.2)", cursor: "pointer" }} />
                  </div>
                </div>;
              })}
            </div>
          </div>
          {unscheduled.length > 0 && <div style={{ marginTop: 14, borderTop: "1px solid " + C.line, paddingTop: 10 }}><b style={{ fontSize: 12.5 }}>غير مجدولة ({unscheduled.length})</b><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 6, marginTop: 6 }}>{unscheduled.map((task) => <button key={task.id} type="button" onClick={() => openTask(task.id)} style={{ textAlign: "start", border: "1px solid " + C.line, borderRadius: 6, padding: "7px 9px", background: "transparent", color: C.text, cursor: "pointer", font: "inherit", fontSize: 11.5 }}>{task.title}</button>)}</div></div>}
        </div>;
      })()}
      {form && <TaskForm projectId={projectId} parentId={form.parentId} initial={form.initial} onClose={() => setForm(null)} />}
    </div>
  );
}
function StatusChipSm({ s }) { return <Chip color={STATUS_COLOR[s] || C.muted}>{L.taskStatus[s] || s}</Chip>; }
function MoveTreeButton({ t, onDone }) {
  const { data, A: act } = useP(); const [open, setOpen] = useState(false);
  if (!open) return <Btn small onClick={() => setOpen(true)}>↪ نقل الشجرة لمشروع آخر</Btn>;
  return <select style={{ ...S.sel, width: 200, padding: "4px 8px", fontSize: 12 }} defaultValue="" onChange={async (e) => { if (e.target.value) { await act.moveTree(t.id, e.target.value); setOpen(false); onDone(); } }}><option value="">اختر المشروع…</option>{data.projects.filter((p) => p.id !== t.project_id && !p.archived_at).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>;
}

// ── Task detail sheet ───────────────────────────────────────────────
export function TaskSheet({ inline = false }) {
  const { view, closeTask, idx, data, A: act, can, projectsById, today, runningTimer, nameOf, toast, openProject, openDiscovery, setPage, settings, me } = useP();
  const t = view.taskId ? (idx.byId[view.taskId] || null) : null; const [tab, setTab] = useState("details"); const [edit, setEdit] = useState(false); const [sessForm, setSessForm] = useState(false); const [cancelReason, setCancelReason] = useState(null); const [outputForm, setOutputForm] = useState(null);
  useEffect(() => { setTab("details"); }, [view.taskId]);
  if (!view.taskId) return null; if (!t) return null;
  const project = projectsById[t.project_id]; const d = idx.derived[t.id]; const leaf = d.isLeaf; const canW = can("task.write", project);
  const sessions = data.sessions.filter((s) => s.task_id === t.id || idx.descendants(t.id).includes(s.task_id)).sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  const taskKrs = data.krs.filter((kr) => !kr.deleted_at && !kr.archived_at && (kr.task_ids || []).some((id) => id === t.id || idx.descendants(id).includes(t.id)));
  const derivedObjectives = data.objectives.filter((objective) => !objective.deleted_at && taskKrs.some((kr) => kr.objective_id === objective.id));
  const legacyObjective = !derivedObjectives.length && t.objective_id ? data.objectives.find((objective) => objective.id === t.objective_id) : null;
  const outs = data.outputs.filter((o) => o.task_id === t.id); const linkedIssues = data.issues.filter((i) => (i.task_ids || []).includes(t.id) || (t.issue_ids || []).includes(i.id)); const linkedKrs = data.krs.filter((k) => (k.task_ids || []).some((id) => id === t.id || idx.descendants(id).includes(t.id))); const linkedDecisions = data.decisions.filter((x) => (x.affected_task_ids || []).includes(t.id) || (x.implementation_task_ids || []).includes(t.id)); const linkedRisks = data.risks.filter((x) => (x.task_ids || []).includes(t.id)); const linkedWins = data.wins.filter((x) => x.task_id === t.id || (x.task_ids || []).includes(t.id)); const linkedUpdates = data.updates.filter((x) => (x.related_task_ids || []).includes(t.id)); const linkedDiscoveries = data.discovery.filter((x) => (x.resolution_links || []).some((link) => link.kind === "task" && link.id === t.id) || (t.discovery_ids || []).includes(x.id)); const canOut = can("output.write", project); const status = leaf ? t.status : d.status;
  const acts = data.activity.filter((a) => a.entity_id === t.id).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 15);
  const tabs = [{ id: "details", label: "التفاصيل" }, { id: "time", label: "الوقت", count: sessions.length }, { id: "outputs", label: "المخرجات", count: outs.length }, { id: "links", label: "الروابط" }, { id: "activity", label: "النشاط" }];
  async function saveOutput(v) {
    if (!String(v.name || "").trim()) throw new Error("اسم المخرج مطلوب");
    const prd = v.prd_id ? data.prds.find((x) => x.id === v.prd_id) : null;
    if (prd && prd.project_id !== t.project_id) throw new Error("المواصفة يجب أن تتبع نفس مشروع المهمة");
    if (v.prd_requirement_id && (!prd || !(prd.requirements || []).some((x) => x.id === v.prd_requirement_id))) throw new Error("المتطلب المختار لا ينتمي إلى المواصفة المحددة");
    const existing = v.id ? data.outputs.find((x) => x.id === v.id) : null;
    if (existing?.approval === "Final") throw new Error("المخرج النهائي مقفل؛ أنشئ مخرجاً جديداً بدل تعديل النسخة المعتمدة.");
    if (v.approval === "Final" && !can("output.approve", project)) throw new Error("لا تملك صلاحية اعتماد المخرج نهائياً");
    await act.put("outputs", { ...v, id: v.id || uid(), project_id: t.project_id, task_id: t.id, approval: v.approval || "Draft", approved_by: v.approval === "Final" ? me : null, approved_at: v.approval === "Final" ? new Date().toISOString() : null }, project);
    toast(existing ? "✅ تم تحديث المخرج" : "✅ تم إنشاء المخرج وربطه بالمهمة");
    setOutputForm(null);
  }
  return (
    <SideSheet title={t.title} onClose={closeTask} inline={inline} footer={<>
      {canW && <Btn onClick={() => setEdit(true)}>✎ تعديل</Btn>}
      {canW && leaf && (runningTimer && runningTimer.task_id === t.id ? <Btn onClick={() => act.stopTimer()}>⏹ أوقف المؤقّت</Btn> : <Btn onClick={() => act.startTimer(t.id)}>▶ ابدأ المؤقّت</Btn>)}
      {canW && leaf && D.cat(status) !== "done" && <Btn kind="primary" onClick={() => act.setTaskStatus(t, "Completed")}>✔ إكمال</Btn>}
      {canW && leaf && D.cat(status) === "done" && <Btn onClick={() => act.setTaskStatus(t, "In Progress")}>↺ إعادة فتح</Btn>}
      {canW && leaf && D.cat(status) !== "cancelled" && <Btn danger onClick={() => setCancelReason("")}>إلغاء المهمة</Btn>}
    </>}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10, alignItems: "center" }}>
        <StatusChipSm s={status} />{!leaf && <Chip color={C.violet}>مجمَّعة — الحالة مشتقة</Chip>}<PriorityChip p={t.priority} />{t.blocked && <Chip color={C.bad}>⛔ متعطّلة: {t.blocked_reason || "—"}</Chip>}
        <Chip color={C.info}>{L.bucket[t.planning_bucket]}</Chip><ProjectName id={t.project_id} onClick={(id) => { closeTask(); openProject(id); }} />
      </div>
      <Tabs tabs={tabs} value={tab} onChange={setTab} small />
      {tab === "details" && (
        <div style={{ fontSize: 13, lineHeight: 2 }}>
          <div>المسؤول: <Who id={t.assignee_id} /> · الموعد: {fmt(leaf ? t.due_date : d.dueMax)} · التقدم: <span style={{ display: "inline-block", width: 120, verticalAlign: "middle" }}><Progress value={d.progress == null ? (D.cat(status) === "done" ? 1 : 0) : d.progress} /></span></div>
          <div>التقدير: {fmtMinutes(d.estimated)} · الفعلي: {fmtMinutes(d.actual)} · الفرق: {d.estimated ? fmtMinutes(Math.abs(d.variance)) + (d.variance > 0 ? " زيادة" : " توفير") : "—"}</div>
          {t.description && <div style={{ whiteSpace: "pre-wrap", marginTop: 6 }}>{t.description}</div>}
          {t.cancelled_reason && <div style={{ color: C.bad }}>سبب الإلغاء: {t.cancelled_reason}</div>}
          {t.result_note && <div style={{ background: "rgba(16,185,129,0.07)", padding: "8px 10px", borderRadius: 8, marginTop: 6 }}><b>النتيجة السريعة:</b> {t.result_note}{canOut && <div style={{ marginTop: 6 }}>{outs.some((o) => o.source_result_task_id === t.id || (o.name === t.title && o.notes === t.result_note)) ? <Chip color={C.ok}>يوجد مخرج لهذه النتيجة بالفعل</Chip> : <Btn small onClick={() => setOutputForm({ name: t.title, type: "Other", approval: "Draft", url: /^https?:/.test(t.result_note) ? t.result_note : "", notes: t.result_note, source_result_task_id: t.id })}>📦 مراجعة وإنشاء مخرج من النتيجة</Btn>}</div>}</div>}
          {!leaf && <div style={{ marginTop: 6 }}>الأوراق: {d.leafDone}/{d.leafTotal} مكتملة</div>}
        </div>
      )}
      {tab === "time" && (
        <div>
          {canW && leaf && <div style={{ marginBottom: 10 }}><Btn small kind="primary" onClick={() => setSessForm(true)}>➕ جلسة يدوية</Btn></div>}
          {!sessions.length && <Empty icon="⏱" title="لا توجد جلسات" />}
          {sessions.map((s) => <div key={s.id} style={{ display: "flex", gap: 10, alignItems: "center", padding: "6px 0", borderBottom: `1px solid ${C.line}`, fontSize: 12.5, opacity: s.voided_at ? 0.45 : 1 }}><span>{fmt(s.date)}</span><b>{fmtMinutes(s.minutes)}</b><Who id={s.member_id} size={18} /><span style={{ flex: 1, color: C.muted }}>{s.note}</span>{s.source === "timer" && <Chip>⏱ مؤقّت</Chip>}{s.voided_at ? <Chip color={C.bad}>ملغاة</Chip> : canW && s.member_id === me && <Btn small danger onClick={() => act.voidSession(s, "")}>إلغاء</Btn>}</div>)}
          {sessForm && <SessionForm taskId={t.id} onClose={() => setSessForm(false)} />}
        </div>
      )}
      {tab === "outputs" && <div>{canOut && <div style={{ marginBottom: 10 }}><Btn kind="primary" small onClick={() => setOutputForm({ name: t.title, type: "Other", approval: "Draft" })}>➕ إضافة مخرج لهذه المهمة</Btn></div>}{!outs.length ? <Empty icon="📦" title="لا مخرجات مرتبطة" sub="أنشئ المخرج هنا وسيُربط بالمشروع والمهمة تلقائياً." /> : outs.map((o) => <div key={o.id} style={{ ...S.card, padding: "9px 11px", marginBottom: 7 }}><div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}><b style={{ flex: 1 }}>📦 {o.name}</b><Chip color={o.approval === "Final" ? C.ok : o.approval === "Review" ? C.warn : C.muted}>{L.approval[o.approval] || o.approval}</Chip><Chip>{o.type}</Chip>{canOut && o.approval !== "Final" && <Btn small onClick={() => setOutputForm(o)}>تعديل</Btn>}{o.approval === "Final" && <Chip color={C.ok}>🔒 نهائي — مقفل</Chip>}</div>{o.url ? <a href={o.url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: C.info, wordBreak: "break-all" }}>{o.url}</a> : <div style={{ fontSize: 11, color: C.muted }}>لم يُضف رابط بعد — رفع الملفات غير متاح في هذا الإصدار.</div>}{o.prd_id && <div style={{ fontSize: 11.5, color: C.dim }}>المواصفة: {(data.prds.find((x) => x.id === o.prd_id) || {}).title || "—"}</div>}{o.notes && <div style={{ fontSize: 12, color: C.dim, whiteSpace: "pre-wrap" }}>{o.notes}</div>}</div>)}</div>}
      {tab === "links" && (
        <div style={{ fontSize: 13, lineHeight: 2 }}>
          <div>المواصفة: {t.prd_id ? (() => { const prd = data.prds.find((p) => p.id === t.prd_id); return prd ? <button type="button" onClick={() => { closeTask(); openProject(prd.project_id, "prds", { kind: "prd", id: prd.id }); }} style={{ border: 0, padding: 0, background: "none", color: C.info, cursor: "pointer", textDecoration: "underline" }}>{prd.title} ↗</button> : "مواصفة غير متاحة"; })() : "—"}</div>
          <div style={{ marginTop: 6 }}>المتطلب: {t.prd_requirement_id ? (() => { const prd = data.prds.find((p) => p.id === t.prd_id); const requirement = (prd?.requirements || []).find((r) => r.id === t.prd_requirement_id); return requirement ? requirement.title : "متطلب غير متاح"; })() : "—"}</div>
          <div style={{ marginTop: 6 }}>النتائج الرئيسية المرتبطة: {taskKrs.length ? taskKrs.map((kr) => <button key={kr.id} type="button" onClick={() => { closeTask(); setPage("okrs"); }} style={{ border: 0, padding: "0 4px", background: "none", color: C.info, cursor: "pointer", textDecoration: "underline" }}>{kr.name} ↗</button>) : "—"}</div><div style={{ marginTop: 6 }}>الأهداف المشتقة عبر النتائج الرئيسية: {derivedObjectives.length ? derivedObjectives.map((objective) => <button key={objective.id} type="button" onClick={() => { closeTask(); setPage("okrs"); }} style={{ border: 0, padding: "0 4px", background: "none", color: C.info, cursor: "pointer", textDecoration: "underline" }}>{objective.name} ↗</button>) : legacyObjective ? <><button type="button" onClick={() => { closeTask(); setPage("okrs"); }} style={{ border: 0, padding: 0, background: "none", color: C.muted, cursor: "pointer", textDecoration: "underline" }}>{legacyObjective.name} ↗</button> <Chip color={C.muted}>رابط قديم — يحتاج إعادة ربط عبر نتيجة رئيسية</Chip></> : "—"}</div>
          <div style={{ marginTop: 6 }}>لماذا وُجدت؟ {(t.discovery_ids || []).length ? (t.discovery_ids || []).map((id) => data.discovery.find((x) => x.id === id)).filter(Boolean).map((x) => <button key={x.id} type="button" onClick={() => { closeTask(); openDiscovery(id); }} style={{ border: 0, padding: "0 4px", background: "none", color: C.info, cursor: "pointer", textDecoration: "underline" }}>{x.title} ↗</button>) : "—"}</div><div style={{ marginTop: 6 }}>المشاكل المرتبطة: {linkedIssues.length ? linkedIssues.map((i) => <button key={i.id} type="button" onClick={() => { closeTask(); openProject(i.project_id, "issues", { kind: "issue", id: i.id }); }} style={{ display: "inline-flex", marginInlineEnd: 6, border: 0, padding: 0, background: "none", color: C.info, cursor: "pointer", textDecoration: "underline" }}>{i.title} ↗</button>) : "—"}</div><div style={{ marginTop: 6 }}>القرارات المؤثرة: {linkedDecisions.length ? linkedDecisions.map((decision) => <button key={decision.id} type="button" onClick={() => { closeTask(); openProject(decision.project_id, "decisions", { kind: "decision", id: decision.id }); }} style={{ display: "inline-flex", marginInlineEnd: 6, border: 0, padding: 0, background: "none", color: C.info, cursor: "pointer", textDecoration: "underline" }}>{decision.title} ↗</button>) : "—"}</div><div style={{ marginTop: 6 }}>المخاطر التي تخففها المهمة: {linkedRisks.length ? linkedRisks.map((risk) => <button key={risk.id} type="button" onClick={() => { closeTask(); openProject(risk.project_id, "risks", { kind: "risk", id: risk.id }); }} style={{ display: "inline-flex", marginInlineEnd: 6, border: 0, padding: 0, background: "none", color: C.info, cursor: "pointer", textDecoration: "underline" }}>{risk.title} ↗</button>) : "—"}</div><div style={{ marginTop: 6 }}>الإنجازات الناتجة: {linkedWins.length ? linkedWins.map((win) => <button key={win.id} type="button" onClick={() => { closeTask(); setPage("wins"); }} style={{ display: "inline-flex", marginInlineEnd: 6, border: 0, padding: 0, background: "none", color: C.info, cursor: "pointer", textDecoration: "underline" }}>{win.title} ↗</button>) : "—"}</div>
        </div>
      )}
      {tab === "activity" && (!acts.length ? <Empty icon="🕘" title="لا نشاط مسجَّل" /> : acts.map((a) => <div key={a.id} style={{ fontSize: 12, padding: "4px 0", color: C.dim }}>{dateOf(a.at, settings.timezone)} · {nameOf(a.actor_id)} · {a.action} {a.summary}</div>))}
      {outputForm && <FormModal title={outputForm.id ? "تعديل المخرج المرتبط بالمهمة" : "إضافة مخرج للمهمة"} wide initial={{ type: "Other", approval: "Draft", ...outputForm }} onClose={() => setOutputForm(null)} onSubmit={saveOutput} fields={[{ key: "name", label: "اسم المخرج", required: true, span: 2 }, { key: "type", label: "النوع", type: "select", allowEmpty: false, options: [{ v: "Design", l: "تصميم" }, { v: "Code", l: "كود" }, { v: "Document", l: "مستند" }, { v: "Sample", l: "عينة" }, { v: "Video", l: "فيديو" }, { v: "Other", l: "أخرى" }] }, { key: "prd_id", label: "المواصفة التي يحققها", type: "select", emptyLabel: "— بلا —", options: data.prds.filter((x) => x.project_id === t.project_id).map((x) => ({ v: x.id, l: x.title })) },
        { key: "prd_requirement_id", label: "المتطلب الذي يحققه", type: "select", emptyLabel: "— بلا متطلب —", options: (v) => { const prd = data.prds.find((x) => x.id === v.prd_id); return (prd?.requirements || []).filter((r) => r.status !== "Deprecated").map((r) => ({ v: r.id, l: r.title })); } }, { key: "approval", label: "حالة الاعتماد", type: "select", allowEmpty: false, options: opts(L.approval) }, { key: "url", label: "الرابط", type: "url" }, { key: "notes", label: "ملاحظات", type: "textarea", rows: 2 }]} />}
      {edit && <TaskForm initial={t} onClose={() => setEdit(false)} />}
      {cancelReason !== null && <FormModal title="إلغاء المهمة" fields={[{ key: "r", label: "سبب الإلغاء", required: true, type: "textarea" }]} initial={{ r: "" }} onClose={() => setCancelReason(null)} onSubmit={async (v) => { await act.setTaskStatus(t, "Cancelled", v.r); setCancelReason(null); }} />}
    </SideSheet>
  );
}
export function SessionForm({ taskId, onClose }) {
  const { A: act, today, toast, idx } = useP(); const [gid] = useState(() => uid());
  const leaves = idx.list.filter((t) => idx.isLeaf(t.id)).map((t) => ({ v: t.id, l: t.title }));
  return <FormModal title="جلسة عمل" initial={{ task_id: taskId, choose_other_task: false, date: today, minutes: 30 }} fields={[
    ...(taskId ? [{ key: "choose_other_task", label: "السياق", type: "bool", checkLabel: "اختيار مهمة أخرى" }] : []),
    { key: "task_id", label: taskId ? "المهمة المحددة من نافذة المهمة" : "المهمة", type: "select", options: (v) => taskId && !v.choose_other_task ? leaves.filter((t) => t.v === taskId) : leaves, allowEmpty: false, required: true },
    { key: "date", label: "التاريخ", type: "date", required: true }, { key: "minutes", label: "الدقائق (1–1440)", type: "number", min: 1, max: 1440, required: true }, { key: "note", label: "ملاحظة", type: "textarea", rows: 2 }]}
    onClose={onClose} onSubmit={async (v) => { const { choose_other_task, ...session } = v; await act.addSession({ ...session, client_generated_id: gid, id: undefined }); toast("✅ سُجِّلت الجلسة"); onClose(); }} />;
}
export function TimerBar() {
  const { runningTimer, A: act, idx, openTask } = useP(); const [, tick] = useState(0);
  useEffect(() => { if (!runningTimer) return; const iv = setInterval(() => tick((x) => x + 1), 1000); return () => clearInterval(iv); }, [runningTimer && runningTimer.started_at]);
  if (!runningTimer) return null; const t = idx.byId[runningTimer.task_id]; const secs = Math.max(0, Math.floor((Date.now() - new Date(runningTimer.started_at).getTime()) / 1000));
  const hh = String(Math.floor(secs / 3600)).padStart(2, "0"), mm = String(Math.floor((secs % 3600) / 60)).padStart(2, "0"), ss = String(secs % 60).padStart(2, "0");
  return (
    <div style={{ position: "fixed", bottom: 16, insetInlineStart: 16, zIndex: 3500, background: "#16181D", color: "#fff", borderRadius: 12, padding: "9px 14px", display: "flex", alignItems: "center", gap: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.3)", fontSize: 12.5 }}>
      <Dot color="#F87171" /><span style={{ fontFamily: "monospace", fontSize: 15 }}>{hh}:{mm}:{ss}</span>
      <span onClick={() => t && openTask(t.id)} style={{ cursor: "pointer", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t ? t.title : "مهمة"}</span>
      <button onClick={() => act.stopTimer()} style={{ background: A, border: "none", borderRadius: 7, padding: "3px 10px", cursor: "pointer", fontWeight: 700, fontFamily: "inherit" }}>⏹ إيقاف</button>
      <button onClick={() => act.discardTimer()} title="تجاهل" style={{ background: "none", border: "none", color: "#94A3B8", cursor: "pointer" }}>✕</button>
    </div>
  );
}
export const lastN = (arr2, n) => arr2.slice(-n);
