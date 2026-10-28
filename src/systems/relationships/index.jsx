import React, { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../core/supabase.js";
import { osSectionLevel } from "../../core/core.js";
import { AccessDenied } from "../../core/ui.jsx";
import { buildRelationshipsSeed } from "./demo.js";
import {
  RELATIONSHIP_SECTIONS, RELATIONSHIP_TYPES, RELATIONSHIP_TYPE_LABELS,
  emptyRelationshipsData, normalizeRelationshipsData, validatePerson,
  normalizeSearch, findPossibleDuplicates, dueFollowups, validateRelationshipsImport
} from "./domain.js";

const C = { ink: "#172033", muted: "#64748B", line: "#E2E8F0", bg: "#F8FAFC", accent: "#DB2777", soft: "#FCE7F3", green: "#047857", amber: "#B45309", red: "#B91C1C" };
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Cairo" });
const makeId = () => globalThis.crypto?.randomUUID?.() || "rel-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
const COLLECTIONS = ["people", "timeline", "followups", "occasions", "gifts", "circles", "settings"];

async function loadRecords(workspaceId) {
  const { data, error } = await supabase.from("workspace_records")
    .select("collection,id,data,updated_at")
    .eq("workspace_id", workspaceId).eq("system_id", "relationships").eq("deleted", false);
  if (error) throw error;
  const result = emptyRelationshipsData();
  for (const row of data || []) {
    if (row.collection === "settings" && row.data && typeof row.data === "object") result.settings = { ...result.settings, ...row.data };
    else if (COLLECTIONS.includes(row.collection) && row.collection !== "settings" && row.data && typeof row.data === "object") result[row.collection].push({ ...row.data, id: row.id });
  }
  return result;
}

async function saveRecord(workspaceId, collection, record) {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  const { error } = await supabase.from("workspace_records").upsert({
    workspace_id: workspaceId,
    system_id: "relationships",
    collection,
    id: String(record.id),
    data: record,
    deleted: false,
    updated_at: new Date().toISOString(),
    updated_by: authData?.user?.id || null
  }, { onConflict: "workspace_id,system_id,collection,id" });
  if (error) throw error;
}

async function saveRecords(workspaceId, collection, records) {
  if (!records.length) return;
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  const updatedAt = new Date().toISOString();
  const payload = records.map((record) => ({
    workspace_id: workspaceId, system_id: "relationships", collection, id: String(record.id),
    data: record, deleted: false, updated_at: updatedAt, updated_by: authData?.user?.id || null
  }));
  const { error } = await supabase.from("workspace_records").upsert(payload, { onConflict: "workspace_id,system_id,collection,id" });
  if (error) throw error;
}

async function softDeleteRecord(workspaceId, collection, record) {
  const { error } = await supabase.from("workspace_records").update({ deleted: true, updated_at: new Date().toISOString() })
    .eq("workspace_id", workspaceId).eq("system_id", "relationships").eq("collection", collection).eq("id", String(record.id));
  if (error) throw error;
}

function Field({ label, value, onChange, placeholder = "", type = "text", required = false, disabled = false }) {
  return <label style={{ display: "grid", gap: 5, color: C.muted, fontSize: 12, minWidth: 0 }}>
    <span>{label}{required ? " *" : ""}</span>
    <input type={type} value={value ?? ""} required={required} disabled={disabled} placeholder={placeholder} onChange={(e) => onChange(e.target.value)}
      style={{ width: "100%", boxSizing: "border-box", padding: "10px 11px", border: "1px solid " + C.line, borderRadius: 10, background: "#fff", color: C.ink, font: "inherit", fontSize: 14 }} />
  </label>;
}
function SelectField({ label, value, onChange, options }) {
  return <label style={{ display: "grid", gap: 5, color: C.muted, fontSize: 12 }}>
    <span>{label}</span><select value={value} onChange={(e) => onChange(e.target.value)} style={{ padding: "10px 11px", border: "1px solid " + C.line, borderRadius: 10, background: "#fff", color: C.ink, font: "inherit", fontSize: 14 }}>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </label>;
}
function Button({ children, onClick, kind = "default", disabled = false }) {
  const palette = kind === "primary" ? { background: C.accent, color: "#fff", border: "1px solid " + C.accent } : kind === "danger" ? { background: "#fff", color: C.red, border: "1px solid #FECACA" } : { background: "#fff", color: C.ink, border: "1px solid " + C.line };
  return <button type="button" disabled={disabled} onClick={onClick} style={{ ...palette, borderRadius: 10, padding: "9px 12px", fontWeight: 650, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? .55 : 1, fontSize: 13 }}>{children}</button>;
}
function Panel({ title, hint, children, action }) {
  return <section style={{ background: "#fff", border: "1px solid " + C.line, borderRadius: 16, padding: 18, marginBottom: 14 }}>
    <div style={{ display: "flex", alignItems: "start", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
      <div><h2 style={{ margin: 0, color: C.ink, fontSize: 17 }}>{title}</h2>{hint && <p style={{ margin: "5px 0 0", color: C.muted, fontSize: 12 }}>{hint}</p>}</div>{action}
    </div>{children}
  </section>;
}
function Empty({ children }) { return <div style={{ padding: 26, textAlign: "center", color: C.muted, background: C.bg, borderRadius: 12, fontSize: 13 }}>{children}</div>; }
function Metric({ label, value, detail }) { return <div style={{ padding: 15, border: "1px solid " + C.line, borderRadius: 14, background: "#fff" }}><div style={{ color: C.muted, fontSize: 12 }}>{label}</div><div style={{ fontSize: 27, fontWeight: 800, color: C.ink, marginTop: 6 }}>{value}</div>{detail && <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{detail}</div>}</div>; }

const blankPerson = () => ({ name: "", type: "Friend", circleId: "", importance: "normal", phone: "", email: "", birthday: "", interests: "", matters: "", notes: "" });

export default function RelationshipsSystem(props) {
  const { api, access, ws, isDemo, page = "home", setPage = () => {}, shell } = props;
  const [data, setData] = useState(emptyRelationshipsData);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [personDraft, setPersonDraft] = useState(blankPerson);
  const [editingPerson, setEditingPerson] = useState(null);
  const [followupDraft, setFollowupDraft] = useState({ personId: "", title: "", dueDate: today(), notes: "" });
  const [timelineDraft, setTimelineDraft] = useState({ personId: "", type: "message", date: today(), summary: "", notes: "" });
  const [occasionDraft, setOccasionDraft] = useState({ personId: "", title: "عيد الميلاد", date: "", recurrence: "yearly", reminderDays: 7, notes: "" });
  const [circleDraft, setCircleDraft] = useState({ name: "", description: "", color: "#DB2777" });
  const [busy, setBusy] = useState(false);
  const [importPreview, setImportPreview] = useState(null);
  const currentLevel = osSectionLevel(access, page);
  const canEdit = currentLevel === "edit";

  const reload = useCallback(async () => {
    setError(""); setReady(false);
    try {
      let loaded;
      if (isDemo) {
        const result = await api.load();
        loaded = result?.data && Object.keys(result.data).length ? result.data : buildRelationshipsSeed();
      } else {
        loaded = await loadRecords(ws.id);
      }
      setData(normalizeRelationshipsData(loaded));
    } catch (e) {
      setError(e?.message || "تعذر تحميل بيانات العلاقات.");
    } finally { setReady(true); }
  }, [api, isDemo, ws?.id]);

  useEffect(() => { reload(); }, [reload]);
  useEffect(() => { if (shell?.publish) shell.publish("relationships", { visible: RELATIONSHIP_SECTIONS.map((s) => s.id) }); }, [shell]);

  const persist = useCallback(async (next) => {
    setBusy(true); setError(""); setNotice("");
    try {
      if (isDemo) {
        const result = await api.save(next);
        if (result && result.ok === false) throw new Error("تعذر حفظ بيانات الوضع التجريبي.");
      } else {
        await saveRecord(ws.id, "settings", { id: "settings", ...next.settings });
      }
      setData(normalizeRelationshipsData(next));
      setNotice("تم الحفظ.");
    } catch (e) { setError(e?.message || "تعذر حفظ التغيير."); }
    finally { setBusy(false); }
  }, [api, isDemo, ws?.id]);

  const saveEntity = useCallback(async (collection, record) => {
    setBusy(true); setError(""); setNotice("");
    try {
      const value = { ...record, updatedAt: new Date().toISOString() };
      if (isDemo) {
        const next = { ...data, [collection]: [...(data[collection] || []).filter((x) => x.id !== value.id), value] };
        const result = await api.save(next);
        if (result && result.ok === false) throw new Error("تعذر حفظ بيانات الوضع التجريبي.");
        setData(normalizeRelationshipsData(next));
      } else {
        await saveRecord(ws.id, collection, value);
        setData((prev) => normalizeRelationshipsData({ ...prev, [collection]: [...prev[collection].filter((x) => x.id !== value.id), value] }));
      }
      setNotice("تم الحفظ."); return true;
    } catch (e) { setError(e?.message || "تعذر حفظ السجل."); return false; }
    finally { setBusy(false); }
  }, [api, data, isDemo, ws?.id]);

  const deleteEntity = useCallback(async (collection, record) => {
    if (!globalThis.confirm?.("هل تريد أرشفة هذا السجل؟ لن يُحذف نهائيًا.")) return;
    setBusy(true); setError(""); setNotice("");
    try {
      if (isDemo) {
        const next = { ...data, [collection]: data[collection].filter((x) => x.id !== record.id) };
        const result = await api.save(next);
        if (result && result.ok === false) throw new Error("تعذر تحديث الوضع التجريبي.");
        setData(normalizeRelationshipsData(next));
      } else {
        await softDeleteRecord(ws.id, collection, record);
        setData((prev) => normalizeRelationshipsData({ ...prev, [collection]: prev[collection].filter((x) => x.id !== record.id) }));
      }
      setNotice("تمت الأرشفة.");
    } catch (e) { setError(e?.message || "تعذر أرشفة السجل."); }
    finally { setBusy(false); }
  }, [api, data, isDemo, ws?.id]);

  const peopleById = useMemo(() => Object.fromEntries(data.people.map((p) => [p.id, p])), [data.people]);
  const filteredPeople = useMemo(() => {
    const q = normalizeSearch(query);
    return data.people.filter((p) => !q || [p.name, p.phone, p.email, p.interests, p.matters].some((v) => normalizeSearch(v).includes(q)));
  }, [data.people, query]);
  const overdue = useMemo(() => dueFollowups(data.followups, today()), [data.followups]);
  const duplicates = useMemo(() => findPossibleDuplicates(data.people), [data.people]);

  const startNewPerson = () => { setEditingPerson(null); setPersonDraft(blankPerson()); };
  const savePerson = async (event) => {
    event.preventDefault();
    const validation = validatePerson(personDraft);
    if (!validation.ok) { setError(validation.error); return; }
    const now = new Date().toISOString();
    const record = { ...validation.value, id: editingPerson?.id || makeId(), createdAt: editingPerson?.createdAt || now, updatedAt: now };
    const ok = await saveEntity("people", record);
    if (ok) { setPersonDraft(blankPerson()); setEditingPerson(null); }
  };
  const personForm = <form onSubmit={savePerson} style={{ display: "grid", gap: 12 }}>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10 }}>
      <Field label="الاسم" value={personDraft.name} required onChange={(v) => setPersonDraft((p) => ({ ...p, name: v }))} />
      <SelectField label="نوع العلاقة" value={personDraft.type} onChange={(v) => setPersonDraft((p) => ({ ...p, type: v }))} options={RELATIONSHIP_TYPES.map((v) => ({ value: v, label: RELATIONSHIP_TYPE_LABELS[v] }))} />
      <SelectField label="الأهمية" value={personDraft.importance} onChange={(v) => setPersonDraft((p) => ({ ...p, importance: v }))} options={[{ value: "normal", label: "عادية" }, { value: "high", label: "مهمة" }, { value: "low", label: "خفيفة" }]} />
      <Field label="رقم الهاتف" value={personDraft.phone} onChange={(v) => setPersonDraft((p) => ({ ...p, phone: v }))} />
      <Field label="البريد الإلكتروني" type="email" value={personDraft.email} onChange={(v) => setPersonDraft((p) => ({ ...p, email: v }))} />
      <Field label="تاريخ الميلاد" type="date" value={personDraft.birthday} onChange={(v) => setPersonDraft((p) => ({ ...p, birthday: v }))} />
      <SelectField label="الدائرة" value={personDraft.circleId} onChange={(v) => setPersonDraft((p) => ({ ...p, circleId: v }))} options={[{ value: "", label: "بدون دائرة" }, ...data.circles.map((c) => ({ value: c.id, label: c.name }))]} />
      <Field label="الاهتمامات" value={personDraft.interests} placeholder="الكتب، السفر..." onChange={(v) => setPersonDraft((p) => ({ ...p, interests: v }))} />
      <Field label="ما يهم هذا الشخص" value={personDraft.matters} placeholder="التفضيلات وما يقدّره" onChange={(v) => setPersonDraft((p) => ({ ...p, matters: v }))} />
    </div>
    <Field label="ملاحظات" value={personDraft.notes} onChange={(v) => setPersonDraft((p) => ({ ...p, notes: v }))} />
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><Button kind="primary" disabled={busy}>{editingPerson ? "حفظ التعديلات" : "إضافة الشخص"}</Button>{editingPerson && <Button onClick={startNewPerson}>إلغاء التعديل</Button>}</div>
  </form>;

  if (currentLevel === "none") return <AccessDenied />;
  if (!ready) return <div style={{ padding: 36, color: C.muted, textAlign: "center" }}>جارٍ تحميل بيانات العلاقات…</div>;

  const list = (items, title, render, collection) => <Panel title={title} hint={"عدد السجلات: " + items.length}>{items.length ? <div style={{ display: "grid", gap: 9 }}>{items.map((item) => <div key={item.id} style={{ border: "1px solid " + C.line, borderRadius: 12, padding: 12, display: "flex", gap: 12, justifyContent: "space-between", alignItems: "start", flexWrap: "wrap" }}><div style={{ flex: "1 1 220px", minWidth: 0 }}>{render(item)}</div>{canEdit && <div style={{ display: "flex", gap: 6 }}><Button kind="danger" onClick={() => deleteEntity(collection, item)}>أرشفة</Button></div>}</div>)}</div> : <Empty>لا توجد سجلات هنا حتى الآن.</Empty>}</Panel>;

  let content;
  if (page === "home") content = <>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(145px,1fr))", gap: 10, marginBottom: 14 }}>
      <Metric label="الأشخاص" value={data.people.length} detail="في سجل العلاقات" />
      <Metric label="متابعات مستحقة" value={overdue.length} detail="تحتاج إلى مراجعة" />
      <Metric label="مناسبات مسجلة" value={data.occasions.length} detail="تواريخ محفوظة" />
      <Metric label="تكرارات محتملة" value={duplicates.length} detail="اقتراحات للمراجعة" />
    </div>
    <Panel title="متابعات تحتاج إلى اهتمام" hint="قائمة عملية، وليست حكمًا على جودة العلاقة.">
      {overdue.length ? overdue.slice(0, 5).map((f) => <div key={f.id} style={{ padding: "10px 0", borderBottom: "1px solid " + C.line }}><strong>{f.title}</strong><div style={{ color: C.muted, fontSize: 12 }}>{peopleById[f.personId]?.name || "شخص غير محدد"} · {f.dueDate}</div></div>) : <Empty>لا توجد متابعات متأخرة.</Empty>}
    </Panel>
    <Panel title="أضيفوا العلاقات المهمة بشكل واعٍ" hint="سجّل ما تريد تذكّره، وتجنب تخزين معلومات لا تحتاجها.">
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><Button kind="primary" onClick={() => setPage("people")}>إضافة شخص</Button><Button onClick={() => setPage("followups")}>إنشاء متابعة</Button><Button onClick={() => setPage("occasions")}>إضافة مناسبة</Button></div>
    </Panel>
  </>;
  else if (page === "people") content = <>
    {canEdit && <Panel title={editingPerson ? "تعديل بيانات الشخص" : "إضافة شخص"} hint="احفظ الحد الأدنى اللازم فقط.">{personForm}</Panel>}
    <Panel title="دليل الأشخاص" hint="ابحث بالاسم أو الهاتف أو البريد أو الاهتمامات.">
      <Field label="بحث" value={query} placeholder="اكتب اسمًا أو معلومة..." onChange={setQuery} />
      <div style={{ display: "grid", gap: 9, marginTop: 12 }}>{filteredPeople.map((p) => <div key={p.id} style={{ border: "1px solid " + C.line, borderRadius: 12, padding: 13, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ minWidth: 0, flex: "1 1 220px" }}><strong style={{ color: C.ink }}>{p.name}</strong><div style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>{RELATIONSHIP_TYPE_LABELS[p.type] || p.type} · {data.circles.find((c) => c.id === p.circleId)?.name || "بدون دائرة"}{p.phone ? " · " + p.phone : ""}</div>{p.interests && <div style={{ marginTop: 7, fontSize: 12 }}>الاهتمامات: {p.interests}</div>}{p.matters && <div style={{ marginTop: 4, fontSize: 12 }}>ما يهمه: {p.matters}</div>}</div>
        {canEdit && <div style={{ display: "flex", gap: 6, alignItems: "start" }}><Button onClick={() => { setEditingPerson(p); setPersonDraft({ ...blankPerson(), ...p }); }}>تعديل</Button><Button kind="danger" onClick={() => deleteEntity("people", p)}>أرشفة</Button></div>}
      </div>)}</div>
      {!filteredPeople.length && <Empty>لا توجد نتائج. جرّب تعديل البحث أو أضف شخصًا.</Empty>}
    </Panel>
  </>;
  else if (page === "timeline") content = <>
    {canEdit && <Panel title="تسجيل تواصل" hint="سجّل الحدث وتاريخه، دون افتراض كيف شعر الطرف الآخر.">
      <form onSubmit={async (e) => { e.preventDefault(); if (!timelineDraft.personId || !timelineDraft.summary.trim()) return setError("اختر شخصًا واكتب ملخصًا."); const ok = await saveEntity("timeline", { ...timelineDraft, id: makeId() }); if (ok) setTimelineDraft({ personId: "", type: "message", date: today(), summary: "", notes: "" }); }} style={{ display: "grid", gap: 10 }}>
        <SelectField label="الشخص" value={timelineDraft.personId} onChange={(v) => setTimelineDraft((p) => ({ ...p, personId: v }))} options={[{ value: "", label: "اختر شخصًا" }, ...data.people.map((p) => ({ value: p.id, label: p.name }))]} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 10 }}><SelectField label="نوع التواصل" value={timelineDraft.type} onChange={(v) => setTimelineDraft((p) => ({ ...p, type: v }))} options={[{ value: "message", label: "رسالة" }, { value: "call", label: "مكالمة" }, { value: "meeting", label: "لقاء" }, { value: "email", label: "بريد" }, { value: "other", label: "أخرى" }]} /><Field label="التاريخ" type="date" value={timelineDraft.date} onChange={(v) => setTimelineDraft((p) => ({ ...p, date: v }))} /></div>
        <Field label="ملخص التواصل" value={timelineDraft.summary} required onChange={(v) => setTimelineDraft((p) => ({ ...p, summary: v }))} /><Field label="ملاحظات" value={timelineDraft.notes} onChange={(v) => setTimelineDraft((p) => ({ ...p, notes: v }))} /><Button kind="primary" disabled={busy}>حفظ التواصل</Button>
      </form>
    </Panel>}
    {list([...data.timeline].sort((a,b) => String(b.date).localeCompare(String(a.date))), "سجل التواصل", (x) => <><strong>{x.summary}</strong><div style={{ color: C.muted, fontSize: 12 }}>{peopleById[x.personId]?.name || "شخص غير محدد"} · {x.date} · {x.type}</div>{x.notes && <p style={{ margin: "6px 0 0", fontSize: 13 }}>{x.notes}</p>}</>, "timeline")}
  </>;
  else if (page === "followups") content = <>
    {canEdit && <Panel title="متابعة جديدة"><form onSubmit={async (e) => { e.preventDefault(); if (!followupDraft.personId || !followupDraft.title.trim()) return setError("اختر شخصًا واكتب عنوان المتابعة."); const ok = await saveEntity("followups", { ...followupDraft, id: makeId(), status: "open", priority: "normal" }); if (ok) setFollowupDraft({ personId: "", title: "", dueDate: today(), notes: "" }); }} style={{ display: "grid", gap: 10 }}><SelectField label="الشخص" value={followupDraft.personId} onChange={(v) => setFollowupDraft((p) => ({ ...p, personId: v }))} options={[{ value: "", label: "اختر شخصًا" }, ...data.people.map((p) => ({ value: p.id, label: p.name }))]} /><Field label="عنوان المتابعة" value={followupDraft.title} required onChange={(v) => setFollowupDraft((p) => ({ ...p, title: v }))} /><Field label="تاريخ الاستحقاق" type="date" value={followupDraft.dueDate} onChange={(v) => setFollowupDraft((p) => ({ ...p, dueDate: v }))} /><Field label="ملاحظات" value={followupDraft.notes} onChange={(v) => setFollowupDraft((p) => ({ ...p, notes: v }))} /><Button kind="primary" disabled={busy}>حفظ المتابعة</Button></form></Panel>}
    {list([...data.followups].sort((a,b) => String(a.dueDate).localeCompare(String(b.dueDate))), "كل المتابعات", (x) => <><strong>{x.title}</strong><div style={{ color: C.muted, fontSize: 12 }}>{peopleById[x.personId]?.name || "شخص غير محدد"} · الاستحقاق {x.dueDate} · {x.status === "done" ? "مكتملة" : "مفتوحة"}</div>{x.notes && <p style={{ margin: "6px 0 0", fontSize: 13 }}>{x.notes}</p>}{canEdit && x.status !== "done" && <div style={{ marginTop: 8 }}><Button onClick={() => saveEntity("followups", { ...x, status: "done" })}>تمت المتابعة</Button></div>}</>, "followups")}
  </>;
  else if (page === "occasions") content = <>
    {canEdit && <Panel title="إضافة مناسبة"><form onSubmit={async (e) => { e.preventDefault(); if (!occasionDraft.personId || !occasionDraft.title.trim() || !occasionDraft.date) return setError("أكمل الشخص واسم المناسبة والتاريخ."); const ok = await saveEntity("occasions", { ...occasionDraft, id: makeId(), reminderDays: Number(occasionDraft.reminderDays) }); if (ok) setOccasionDraft({ personId: "", title: "عيد الميلاد", date: "", recurrence: "yearly", reminderDays: 7, notes: "" }); }} style={{ display: "grid", gap: 10 }}><SelectField label="الشخص" value={occasionDraft.personId} onChange={(v) => setOccasionDraft((p) => ({ ...p, personId: v }))} options={[{ value: "", label: "اختر شخصًا" }, ...data.people.map((p) => ({ value: p.id, label: p.name }))]} /><Field label="اسم المناسبة" value={occasionDraft.title} onChange={(v) => setOccasionDraft((p) => ({ ...p, title: v }))} /><Field label="التاريخ" type="date" value={occasionDraft.date} onChange={(v) => setOccasionDraft((p) => ({ ...p, date: v }))} /><SelectField label="التكرار" value={occasionDraft.recurrence} onChange={(v) => setOccasionDraft((p) => ({ ...p, recurrence: v }))} options={[{ value: "yearly", label: "سنوي" }, { value: "once", label: "مرة واحدة" }]} /><Field label="التذكير قبلها بأيام" type="number" value={occasionDraft.reminderDays} onChange={(v) => setOccasionDraft((p) => ({ ...p, reminderDays: v }))} /><Button kind="primary" disabled={busy}>حفظ المناسبة</Button></form></Panel>}
    {list([...data.occasions].sort((a,b) => String(a.date).localeCompare(String(b.date))), "المناسبات", (x) => <><strong>{x.title}</strong><div style={{ color: C.muted, fontSize: 12 }}>{peopleById[x.personId]?.name || "شخص غير محدد"} · {x.date} · {x.recurrence === "yearly" ? "تتكرر سنويًا" : "مرة واحدة"}</div></>, "occasions")}
  </>;
  else if (page === "gifts") content = <>
    {canEdit && <Panel title="فكرة هدية"><form onSubmit={async (e) => { e.preventDefault(); if (!occasionDraft.personId || !occasionDraft.title.trim()) return setError("اختر الشخص واكتب فكرة الهدية."); const ok = await saveEntity("gifts", { id: makeId(), personId: occasionDraft.personId, idea: occasionDraft.title, status: "idea", budget: "", notes: "" }); if (ok) setOccasionDraft((p) => ({ ...p, title: "" })); }} style={{ display: "grid", gap: 10 }}><SelectField label="الشخص" value={occasionDraft.personId} onChange={(v) => setOccasionDraft((p) => ({ ...p, personId: v }))} options={[{ value: "", label: "اختر شخصًا" }, ...data.people.map((p) => ({ value: p.id, label: p.name }))]} /><Field label="فكرة الهدية" value={occasionDraft.title} onChange={(v) => setOccasionDraft((p) => ({ ...p, title: v }))} /><Button kind="primary" disabled={busy}>حفظ الفكرة</Button></form></Panel>}
    {list(data.gifts, "قائمة الهدايا", (x) => <><strong>{x.idea}</strong><div style={{ color: C.muted, fontSize: 12 }}>{peopleById[x.personId]?.name || "شخص غير محدد"} · {x.status === "bought" ? "تم الشراء" : "فكرة"}</div></>, "gifts")}
  </>;
  else if (page === "circles") content = <>
    {canEdit && <Panel title="إنشاء دائرة"><form onSubmit={async (e) => { e.preventDefault(); if (!circleDraft.name.trim()) return; const ok = await saveEntity("circles", { ...circleDraft, id: makeId(), createdAt: new Date().toISOString() }); if (ok) setCircleDraft({ name: "", description: "", color: "#DB2777" }); }} style={{ display: "grid", gap: 10 }}><Field label="اسم الدائرة" value={circleDraft.name} required onChange={(v) => setCircleDraft((p) => ({ ...p, name: v }))} /><Field label="وصف" value={circleDraft.description} onChange={(v) => setCircleDraft((p) => ({ ...p, description: v }))} /><Button kind="primary" disabled={busy}>إضافة دائرة</Button></form></Panel>}
    {list(data.circles, "الدوائر", (x) => <><strong>{x.name}</strong><div style={{ color: C.muted, fontSize: 12 }}>{x.description} · {data.people.filter((p) => p.circleId === x.id).length} أشخاص</div></>, "circles")}
  </>;
  else if (page === "networking") content = <Panel title="العلاقات المهنية" hint="اعرض العلاقات المهنية المسجلة في دليل الأشخاص.">{list(data.people.filter((p) => ["Professional", "Colleague", "Client", "Mentor"].includes(p.type)), "الأشخاص المهنيون", (p) => <><strong>{p.name}</strong><div style={{ color: C.muted, fontSize: 12 }}>{RELATIONSHIP_TYPE_LABELS[p.type] || p.type} {p.email ? "· " + p.email : ""}</div></>, "people")}</Panel>;
  else if (page === "insights") content = <>
    <Panel title="مؤشرات تنظيمية" hint="هذه مؤشرات عن اكتمال السجلات والمتابعات، وليست تقييمًا لمشاعر أو نوايا الناس."><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(145px,1fr))", gap: 10 }}><Metric label="بلا وسيلة تواصل" value={data.people.filter((p) => !p.phone && !p.email).length} /><Metric label="بلا تاريخ تواصل مسجل" value={data.people.filter((p) => !data.timeline.some((t) => t.personId === p.id)).length} /><Metric label="متابعات مفتوحة" value={data.followups.filter((f) => f.status !== "done").length} /><Metric label="مناسبات بلا تاريخ" value={data.occasions.filter((o) => !o.date).length} /></div></Panel>
  </>;
  else if (page === "merge") content = <Panel title="مراجعة التكرارات" hint="لا يتم الدمج تلقائيًا؛ راجع السجلات يدويًا قبل أي تعديل.">{duplicates.length ? duplicates.map((d) => <div key={d.key} style={{ padding: 10, borderBottom: "1px solid " + C.line }}>{d.first.name} ↔ {d.duplicate.name} <span style={{ color: C.muted, fontSize: 12 }}>({d.key})</span></div>) : <Empty>لم نعثر على تكرارات واضحة باستخدام الاسم أو الهاتف أو البريد.</Empty>}</Panel>;
  else if (page === "import") content = <Panel title="الاستيراد والتصدير" hint="الاستيراد يدمج السجلات حسب المعرّف؛ لا يحذف السجلات الحالية."><div style={{ display: "grid", gap: 12 }}>
    <div><Button onClick={() => { const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "relationships-export.json"; a.click(); URL.revokeObjectURL(url); }}>تصدير البيانات (JSON)</Button></div>
    {canEdit && <div style={{ display: "grid", gap: 8, padding: 14, border: "1px dashed " + C.line, borderRadius: 12 }}>
      <strong>استيراد نسخة JSON</strong>
      <p style={{ margin: 0, color: C.muted, fontSize: 12 }}>الحد الأقصى 5 ميجابايت. راجع ملخص الملف قبل دمجه. احتفظ بنسخة احتياطية قبل استيراد بيانات مهمة.</p>
      <input type="file" accept=".json,application/json" onChange={async (e) => {
        const file = e.target.files?.[0]; setImportPreview(null); setError(""); setNotice("");
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { setError("حجم الملف أكبر من 5 ميجابايت."); return; }
        try {
          const parsed = JSON.parse(await file.text());
          const checked = validateRelationshipsImport(parsed);
          if (!checked.ok) { setError(checked.error); return; }
          const total = ["people","timeline","followups","occasions","gifts","circles"].reduce((sum, key) => sum + checked.value[key].length, 0);
          if (total > 5000) { setError("الملف يحتوي على أكثر من 5000 سجل. قسّم الملف إلى أجزاء أصغر."); return; }
          setImportPreview({ data: checked.value, name: file.name, total });
        } catch (err) { setError(err?.message || "تعذر قراءة ملف JSON."); }
      }} />
      {importPreview && <div style={{ background: C.bg, padding: 12, borderRadius: 10, fontSize: 12 }}>
        <strong>{importPreview.name}</strong><div style={{ marginTop: 5 }}>عدد السجلات: {importPreview.total} · الأشخاص {importPreview.data.people.length} · التواصل {importPreview.data.timeline.length} · المتابعات {importPreview.data.followups.length} · المناسبات {importPreview.data.occasions.length} · الهدايا {importPreview.data.gifts.length} · الدوائر {importPreview.data.circles.length}</div>
        <div style={{ color: C.muted, marginTop: 5 }}>عند تكرار المعرّف نفسه، ستُستبدل بيانات ذلك السجل بالنسخة المستوردة. بقية السجلات الحالية ستظل موجودة.</div>
        <div style={{ marginTop: 10 }}><Button kind="primary" disabled={busy} onClick={async () => {
          if (!globalThis.confirm?.("دمج " + importPreview.total + " سجلًا من " + importPreview.name + "؟ لن تُحذف السجلات الأخرى، لكن السجلات المتطابقة بالمعرّف ستُحدّث.")) return;
          const incoming = importPreview.data;
          const keys = ["people","timeline","followups","occasions","gifts","circles"];
          const next = { ...data, settings: { ...data.settings, ...incoming.settings } };
          for (const key of keys) {
            const byId = new Map(data[key].map((item) => [String(item.id), item]));
            for (const item of incoming[key]) byId.set(String(item.id), item);
            next[key] = [...byId.values()];
          }
          setBusy(true); setError(""); setNotice("");
          try {
            if (isDemo) {
              const result = await api.save(next);
              if (result && result.ok === false) throw new Error("تعذر حفظ الاستيراد في الوضع التجريبي.");
            } else {
              for (const key of keys) await saveRecords(ws.id, key, incoming[key]);
              await saveRecord(ws.id, "settings", { id: "settings", ...next.settings });
            }
            setData(normalizeRelationshipsData(next)); setImportPreview(null); setNotice("تم دمج البيانات بنجاح.");
          } catch (err) {
            setError((err?.message || "تعذر استكمال الاستيراد.") + " قد تكون بعض المجموعات حُفظت بالفعل؛ أعد تحميل البيانات قبل إعادة المحاولة.");
          } finally { setBusy(false); }
        }}>دمج البيانات المستوردة</Button> <Button onClick={() => setImportPreview(null)}>إلغاء</Button></div>
      </div>}
    </div>}
  </div></Panel>;
  else if (page === "settings") content = <Panel title="الإعدادات والخصوصية" hint="تخزين العلاقات في مجموعات منفصلة يسمح بتطبيق صلاحيات على مستوى المجموعة في قاعدة البيانات."><div style={{ display: "grid", gap: 10 }}><p style={{ margin: 0, color: C.muted, fontSize: 13 }}>بيانات العلاقات حساسة؛ امنح الوصول للأشخاص الموثوق بهم فقط، وتجنّب إضافة أسرار أو بيانات لا تحتاجها.</p><label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}><input type="checkbox" checked={data.settings.privacyLock} onChange={(e) => persist({ ...data, settings: { ...data.settings, privacyLock: e.target.checked } })} disabled={!canEdit} /> تفعيل تنبيه الخصوصية داخل النظام</label><Field label="أيام التذكير الافتراضية للمتابعة" type="number" value={data.settings.defaultFollowupDays} disabled={!canEdit} onChange={(v) => persist({ ...data, settings: { ...data.settings, defaultFollowupDays: Math.max(0, Number(v) || 0) } })} /></div></Panel>;
  else content = <Panel title="القسم غير معروف"><Empty>اختر قسمًا من قائمة العلاقات.</Empty></Panel>;

  return <div dir="rtl" style={{ color: C.ink, fontFamily: "inherit", maxWidth: 1200, margin: "0 auto" }}>
    <header style={{ background: "linear-gradient(120deg,#831843,#DB2777)", borderRadius: 18, padding: "20px 22px", color: "#fff", marginBottom: 14 }}>
      <div style={{ fontSize: 11, opacity: .82, marginBottom: 5 }}>RELATIONSHIPS OS · نظام شخصي لإدارة العلاقات</div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 14, alignItems: "center", flexWrap: "wrap" }}><div><h1 style={{ fontSize: 24, margin: 0 }}>العلاقات التي تريد الاهتمام بها</h1><p style={{ margin: "7px 0 0", fontSize: 13, opacity: .9 }}>تذكّر الأشخاص وما يهمهم، ونظّم التواصل دون تحويل العلاقات إلى نقاط أو أحكام.</p></div><div style={{ background: "#fff2", border: "1px solid #ffffff55", padding: "8px 11px", borderRadius: 10, fontSize: 12 }}>{isDemo ? "وضع تجريبي · بيانات افتراضية" : "بيانات المساحة الحالية"}</div></div>
    </header>
    {error && <div role="alert" style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: C.red, padding: 12, borderRadius: 10, marginBottom: 12 }}>{error}</div>}
    {notice && <div role="status" style={{ background: "#ECFDF5", border: "1px solid #A7F3D0", color: C.green, padding: 10, borderRadius: 10, marginBottom: 12 }}>{notice}</div>}
    {busy && <div style={{ fontSize: 11, color: C.muted, marginBottom: 8 }}>جارٍ الحفظ…</div>}
    <nav aria-label="أقسام العلاقات" style={{ display: "flex", gap: 7, overflowX: "auto", padding: "2px 1px 12px", marginBottom: 2 }}>
      {RELATIONSHIP_SECTIONS.filter((s) => osSectionLevel(access, s.id) !== "none").map((s) => <button key={s.id} type="button" onClick={() => setPage(s.id)} style={{ flex: "0 0 auto", border: "1px solid " + (page === s.id ? C.accent : C.line), background: page === s.id ? C.soft : "#fff", color: page === s.id ? "#9D174D" : C.ink, borderRadius: 11, padding: "9px 11px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{s.icon} {s.label}</button>)}
    </nav>
    {content}
    <footer style={{ fontSize: 11, color: C.muted, padding: "4px 2px 20px" }}>الحذف هنا أرشفة منطقية · البيانات التجريبية منفصلة · الوصول الحقيقي يخضع لصلاحيات المنصة وقاعدة البيانات.</footer>
  </div>;
}

export const demoSeed = buildRelationshipsSeed;
