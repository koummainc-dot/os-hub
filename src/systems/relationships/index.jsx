import React, { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../core/supabase.js";
import { osSectionLevel } from "../../core/core.js";
import { AccessDenied } from "../../core/ui.jsx";
import { buildRelationshipsSeed } from "./demo.js";
import {
  RELATIONSHIP_SECTIONS, RELATIONSHIP_TYPES, RELATIONSHIP_TYPE_LABELS,
  emptyRelationshipsData, normalizeRelationshipsData, validatePerson,
  normalizeSearch, findPossibleDuplicates, dueFollowups, validateRelationshipsImport, upcomingRelationshipEvents
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
function Button({ children, onClick, kind = "default", disabled = false, type = "button" }) {
  const palette = kind === "primary" ? { background: C.accent, color: "#fff", border: "1px solid " + C.accent } : kind === "danger" ? { background: "#fff", color: C.red, border: "1px solid #FECACA" } : { background: "#fff", color: C.ink, border: "1px solid " + C.line };
  return <button type={type} disabled={disabled} onClick={onClick} style={{ ...palette, borderRadius: 10, padding: "9px 12px", fontWeight: 650, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? .55 : 1, fontSize: 13 }}>{children}</button>;
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

const blankPerson = () => ({ name: "", type: "Friend", circleId: "", importance: "normal", phone: "", email: "", birthday: "", organization: "", role: "", professionalUrl: "", metThrough: "", interests: "", matters: "", notes: "" });

export default function RelationshipsSystem(props) {
  const { api, access, ws, isDemo, page = "home", setPage = () => {}, shell } = props;
  const [data, setData] = useState(emptyRelationshipsData);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [globalSearch, setGlobalSearch] = useState("");
  const [personDraft, setPersonDraft] = useState(blankPerson);
  const [editingPerson, setEditingPerson] = useState(null);
  const [selectedPersonId, setSelectedPersonId] = useState(null);
  const [followupDraft, setFollowupDraft] = useState({ personId: "", title: "", dueDate: today(), notes: "", priority: "normal" });
  const [editingFollowupId, setEditingFollowupId] = useState(null);
  const [followupFilterStatus, setFollowupFilterStatus] = useState("open");
  const [followupFilterPerson, setFollowupFilterPerson] = useState("");
  const [followupFilterPriority, setFollowupFilterPriority] = useState("");
  const [followupSearch, setFollowupSearch] = useState("");
  const [timelineDraft, setTimelineDraft] = useState({ personId: "", type: "message", date: today(), summary: "", notes: "" });
  const [editingTimelineId, setEditingTimelineId] = useState(null);
  const [timelineFilterPerson, setTimelineFilterPerson] = useState("");
  const [timelineFilterType, setTimelineFilterType] = useState("");
  const [timelineSearch, setTimelineSearch] = useState("");
  const blankOccasion = () => ({ personId: "", title: "عيد الميلاد", date: "", recurrence: "yearly", reminderDays: 7, reminderEnabled: true, notes: "" });
  const [occasionDraft, setOccasionDraft] = useState(blankOccasion);
  const [editingOccasionId, setEditingOccasionId] = useState(null);
  const [occasionFilterPerson, setOccasionFilterPerson] = useState("");
  const [occasionFilterRecurrence, setOccasionFilterRecurrence] = useState("");
  const [occasionSearch, setOccasionSearch] = useState("");
  const blankGift = () => ({ personId: "", idea: "", occasionId: "", status: "idea", budget: "", currency: "EGP", targetDate: "", notes: "" });
  const [giftDraft, setGiftDraft] = useState(blankGift);
  const [editingGiftId, setEditingGiftId] = useState(null);
  const [giftFilterPerson, setGiftFilterPerson] = useState("");
  const [giftFilterStatus, setGiftFilterStatus] = useState("");
  const [giftSearch, setGiftSearch] = useState("");
  const [circleDraft, setCircleDraft] = useState({ name: "", description: "", color: "#DB2777" });
  const [editingCircleId, setEditingCircleId] = useState(null);
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
  const selectedPerson = useMemo(() => data.people.find((p) => p.id === selectedPersonId) || null, [data.people, selectedPersonId]);
  const filteredPeople = useMemo(() => {
    const q = normalizeSearch(query);
    return data.people.filter((p) => !q || [p.name, p.phone, p.email, p.interests, p.matters].some((v) => normalizeSearch(v).includes(q)));
  }, [data.people, query]);
  const overdue = useMemo(() => dueFollowups(data.followups, today()), [data.followups]);
  const duplicates = useMemo(() => findPossibleDuplicates(data.people), [data.people]);
  const upcomingEvents = useMemo(() => upcomingRelationshipEvents(data.people, data.occasions, today(), 30), [data.people, data.occasions]);

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
      <Field label="الشركة أو الجهة" value={personDraft.organization} onChange={(v) => setPersonDraft((p) => ({ ...p, organization: v }))} placeholder="شركة، مؤسسة، مجتمع..." />
      <Field label="المسمى أو الدور" value={personDraft.role} onChange={(v) => setPersonDraft((p) => ({ ...p, role: v }))} placeholder="مؤسس، مصمم، مدير..." />
      <Field label="رابط مهني" value={personDraft.professionalUrl} onChange={(v) => setPersonDraft((p) => ({ ...p, professionalUrl: v }))} placeholder="LinkedIn أو موقع مهني" />
      <Field label="كيف تعرفت عليه؟" value={personDraft.metThrough} onChange={(v) => setPersonDraft((p) => ({ ...p, metThrough: v }))} placeholder="مشروع، فعالية، صديق مشترك..." />
      <Field label="الاهتمامات" value={personDraft.interests} placeholder="الكتب، السفر..." onChange={(v) => setPersonDraft((p) => ({ ...p, interests: v }))} />
      <Field label="ما يهم هذا الشخص" value={personDraft.matters} placeholder="التفضيلات وما يقدّره" onChange={(v) => setPersonDraft((p) => ({ ...p, matters: v }))} />
    </div>
    <Field label="ملاحظات" value={personDraft.notes} onChange={(v) => setPersonDraft((p) => ({ ...p, notes: v }))} />
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><Button type="submit" kind="primary" disabled={busy}>{editingPerson ? "حفظ التعديلات" : "إضافة الشخص"}</Button>{editingPerson && <Button onClick={startNewPerson}>إلغاء التعديل</Button>}</div>
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
    <Panel title="مناسبات وأعياد ميلاد قريبة" hint="يعرض أعياد الميلاد خلال 30 يومًا والمناسبات عند دخول نافذة التذكير المحددة لها. هذه تنبيهات داخل التطبيق وليست إشعارات هاتفية.">
      {upcomingEvents.length ? upcomingEvents.slice(0, 8).map((event) => <div key={event.id} style={{ padding: "10px 0", borderBottom: "1px solid " + C.line }}><strong>{event.title}</strong><div style={{ color: C.muted, fontSize: 12 }}>{peopleById[event.personId]?.name || "مناسبة شخصية"} · {event.date} · {event.daysAway === 0 ? "اليوم" : "بعد " + event.daysAway + " يوم"}</div></div>) : <Empty>لا توجد مناسبات خلال الثلاثين يومًا القادمة. أضف تواريخ الميلاد أو المناسبات المهمة لتظهر هنا.</Empty>}
    </Panel>
    <Panel title="أضيفوا العلاقات المهمة بشكل واعٍ" hint="سجّل ما تريد تذكّره، وتجنب تخزين معلومات لا تحتاجها.">
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><Button kind="primary" onClick={() => setPage("people")}>إضافة شخص</Button><Button onClick={() => setPage("followups")}>إنشاء متابعة</Button><Button onClick={() => setPage("occasions")}>إضافة مناسبة</Button></div>
    </Panel>
  </>;
  else if (page === "people") content = <>
    {canEdit && <Panel title={editingPerson ? "تعديل بيانات الشخص" : "إضافة شخص"} hint="احفظ الحد الأدنى اللازم فقط.">{personForm}</Panel>}
    {selectedPerson && <Panel title={"ملف " + selectedPerson.name} hint="ملخص موحّد لبيانات الشخص وسجل التعاملات المرتبط به." action={<Button onClick={() => setSelectedPersonId(null)}>إغلاق الملف</Button>}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
        <div><div style={{ color: C.muted, fontSize: 12 }}>نوع العلاقة</div><strong>{RELATIONSHIP_TYPE_LABELS[selectedPerson.type] || selectedPerson.type || "غير محدد"}</strong></div>
        <div><div style={{ color: C.muted, fontSize: 12 }}>الأهمية</div><strong>{selectedPerson.importance === "high" ? "مهمة" : selectedPerson.importance === "low" ? "خفيفة" : "عادية"}</strong></div>
        <div><div style={{ color: C.muted, fontSize: 12 }}>الدائرة</div><strong>{data.circles.find((x) => x.id === selectedPerson.circleId)?.name || "بدون دائرة"}</strong></div>
        <div><div style={{ color: C.muted, fontSize: 12 }}>الهاتف</div><strong>{selectedPerson.phone || "غير مسجل"}</strong></div>
        <div><div style={{ color: C.muted, fontSize: 12 }}>البريد الإلكتروني</div><strong>{selectedPerson.email || "غير مسجل"}</strong></div>
        <div><div style={{ color: C.muted, fontSize: 12 }}>تاريخ الميلاد</div><strong>{selectedPerson.birthday || "غير مسجل"}</strong></div>
        <div><div style={{ color: C.muted, fontSize: 12 }}>الشركة أو الجهة</div><strong>{selectedPerson.organization || "غير مسجل"}</strong></div>
        <div><div style={{ color: C.muted, fontSize: 12 }}>المسمى أو الدور</div><strong>{selectedPerson.role || "غير مسجل"}</strong></div>
        <div><div style={{ color: C.muted, fontSize: 12 }}>مصدر التعارف</div><strong>{selectedPerson.metThrough || "غير مسجل"}</strong></div>
      </div>
      {selectedPerson.professionalUrl && <p><strong>الرابط المهني:</strong> <a href={selectedPerson.professionalUrl} target="_blank" rel="noreferrer">{selectedPerson.professionalUrl}</a></p>}
      {selectedPerson.interests && <p><strong>الاهتمامات:</strong> {selectedPerson.interests}</p>}
      {selectedPerson.matters && <p><strong>ما يهم هذا الشخص:</strong> {selectedPerson.matters}</p>}
      {selectedPerson.notes && <p style={{ whiteSpace: "pre-wrap" }}><strong>ملاحظات:</strong> {selectedPerson.notes}</p>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(145px,1fr))", gap: 10, marginTop: 12 }}>
        <Metric label="أحداث التواصل" value={data.timeline.filter((x) => x.personId === selectedPerson.id).length} />
        <Metric label="المتابعات المفتوحة" value={data.followups.filter((x) => x.personId === selectedPerson.id && x.status !== "done").length} />
        <Metric label="المناسبات" value={data.occasions.filter((x) => x.personId === selectedPerson.id).length} />
        <Metric label="أفكار الهدايا" value={data.gifts.filter((x) => x.personId === selectedPerson.id).length} />
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
        {canEdit && <Button onClick={() => { setEditingPerson(selectedPerson); setPersonDraft({ ...blankPerson(), ...selectedPerson }); }}>تعديل الملف</Button>}
        {canEdit && <Button onClick={() => { setTimelineDraft({ personId: selectedPerson.id, type: "message", date: today(), summary: "", notes: "" }); setPage("timeline"); }}>تسجيل تواصل</Button>}
        {canEdit && <Button onClick={() => { setFollowupDraft({ personId: selectedPerson.id, title: "", dueDate: today(), notes: "" }); setPage("followups"); }}>إنشاء متابعة</Button>}
        <Button onClick={() => setPage("timeline")}>عرض سجل التواصل</Button>
        <Button onClick={() => setPage("followups")}>عرض المتابعات</Button>
      </div>
      <div style={{ marginTop: 16 }}>
        <h3 style={{ fontSize: 14 }}>آخر أحداث التواصل</h3>
        {data.timeline.filter((x) => x.personId === selectedPerson.id).sort((a,b) => String(b.date).localeCompare(String(a.date))).slice(0,5).map((x) => <div key={x.id} style={{ padding: "8px 0", borderBottom: "1px solid " + C.line }}><strong>{x.summary}</strong><div style={{ color: C.muted, fontSize: 12 }}>{x.date} · {x.type}</div></div>)}
        {!data.timeline.some((x) => x.personId === selectedPerson.id) && <Empty>لم يتم تسجيل تواصل مع هذا الشخص بعد.</Empty>}
      </div>
      <div style={{ marginTop: 16 }}>
        <h3 style={{ fontSize: 14 }}>المتابعات المفتوحة</h3>
        {data.followups.filter((x) => x.personId === selectedPerson.id && x.status !== "done").sort((a,b) => String(a.dueDate).localeCompare(String(b.dueDate))).slice(0,5).map((x) => <div key={x.id} style={{ padding: "8px 0", borderBottom: "1px solid " + C.line }}><strong>{x.title}</strong><div style={{ color: C.muted, fontSize: 12 }}>الاستحقاق: {x.dueDate || "غير محدد"}</div></div>)}
        {!data.followups.some((x) => x.personId === selectedPerson.id && x.status !== "done") && <Empty>لا توجد متابعات مفتوحة لهذا الشخص.</Empty>}
      </div>
    </Panel>}
    <Panel title="دليل الأشخاص" hint="ابحث بالاسم أو الهاتف أو البريد أو الاهتمامات.">
      <Field label="بحث" value={query} placeholder="اكتب اسمًا أو معلومة..." onChange={setQuery} />
      <div style={{ display: "grid", gap: 9, marginTop: 12 }}>{filteredPeople.map((p) => <div key={p.id} style={{ border: "1px solid " + C.line, borderRadius: 12, padding: 13, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ minWidth: 0, flex: "1 1 220px" }}><button type="button" onClick={() => setSelectedPersonId(p.id)} style={{ border: 0, background: "transparent", color: C.ink, padding: 0, font: "inherit", fontWeight: 750, cursor: "pointer", textAlign: "right" }}>{p.name}</button><div style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>{RELATIONSHIP_TYPE_LABELS[p.type] || p.type} · {data.circles.find((c) => c.id === p.circleId)?.name || "بدون دائرة"}{p.phone ? " · " + p.phone : ""}</div>{p.interests && <div style={{ marginTop: 7, fontSize: 12 }}>الاهتمامات: {p.interests}</div>}{p.matters && <div style={{ marginTop: 4, fontSize: 12 }}>ما يهمه: {p.matters}</div>}</div>
        <div style={{ display: "flex", gap: 6, alignItems: "start", flexWrap: "wrap" }}><Button onClick={() => setSelectedPersonId(p.id)}>عرض الملف</Button>{canEdit && <><Button onClick={() => { setEditingPerson(p); setPersonDraft({ ...blankPerson(), ...p }); }}>تعديل</Button><Button kind="danger" onClick={() => deleteEntity("people", p)}>أرشفة</Button></>}</div>
      </div>)}</div>
      {!filteredPeople.length && <Empty>لا توجد نتائج. جرّب تعديل البحث أو أضف شخصًا.</Empty>}
    </Panel>
  </>;
  else if (page === "timeline") content = <>
    {canEdit && <Panel title={editingTimelineId ? "تعديل حدث تواصل" : "تسجيل تواصل"} hint="سجّل الحدث وتاريخه، دون افتراض كيف شعر الطرف الآخر.">
      <form onSubmit={async (e) => { e.preventDefault(); if (!timelineDraft.personId || !timelineDraft.summary.trim() || !timelineDraft.date) return setError("اختر الشخص واكتب ملخصًا وحدد التاريخ."); const old = data.timeline.find((x) => x.id === editingTimelineId); const ok = await saveEntity("timeline", { ...timelineDraft, id: editingTimelineId || makeId(), createdAt: old?.createdAt || new Date().toISOString() }); if (ok) { setTimelineDraft({ personId: "", type: "message", date: today(), summary: "", notes: "" }); setEditingTimelineId(null); } }} style={{ display: "grid", gap: 10 }}>
        <SelectField label="الشخص" value={timelineDraft.personId} onChange={(v) => setTimelineDraft((p) => ({ ...p, personId: v }))} options={[{ value: "", label: "اختر شخصًا" }, ...data.people.map((p) => ({ value: p.id, label: p.name }))]} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 10 }}><SelectField label="نوع التواصل" value={timelineDraft.type} onChange={(v) => setTimelineDraft((p) => ({ ...p, type: v }))} options={[{ value: "message", label: "رسالة" }, { value: "call", label: "مكالمة" }, { value: "meeting", label: "لقاء" }, { value: "email", label: "بريد" }, { value: "other", label: "أخرى" }]} /><Field label="التاريخ" type="date" value={timelineDraft.date} onChange={(v) => setTimelineDraft((p) => ({ ...p, date: v }))} /></div>
        <Field label="ملخص التواصل" value={timelineDraft.summary} required onChange={(v) => setTimelineDraft((p) => ({ ...p, summary: v }))} /><Field label="ملاحظات" value={timelineDraft.notes} onChange={(v) => setTimelineDraft((p) => ({ ...p, notes: v }))} />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><Button type="submit" kind="primary" disabled={busy}>{editingTimelineId ? "حفظ التعديلات" : "حفظ التواصل"}</Button>{editingTimelineId && <Button onClick={() => { setEditingTimelineId(null); setTimelineDraft({ personId: "", type: "message", date: today(), summary: "", notes: "" }); }}>إلغاء التعديل</Button>}</div>
      </form>
    </Panel>}
    <Panel title="سجل التواصل" hint={"عدد الأحداث: " + data.timeline.length + " · يمكنك التصفية بالشخص أو النوع والبحث في الملخص والملاحظات."}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 10 }}>
        <Field label="بحث نصي" value={timelineSearch} placeholder="ابحث في الملخص والملاحظات" onChange={setTimelineSearch} />
        <SelectField label="الشخص" value={timelineFilterPerson} onChange={setTimelineFilterPerson} options={[{ value: "", label: "كل الأشخاص" }, ...data.people.map((p) => ({ value: p.id, label: p.name }))]} />
        <SelectField label="نوع التواصل" value={timelineFilterType} onChange={setTimelineFilterType} options={[{ value: "", label: "كل الأنواع" }, { value: "message", label: "رسالة" }, { value: "call", label: "مكالمة" }, { value: "meeting", label: "لقاء" }, { value: "email", label: "بريد" }, { value: "other", label: "أخرى" }]} />
      </div>
      {(() => {
        const q = normalizeSearch(timelineSearch);
        const rows = data.timeline.filter((x) => (!timelineFilterPerson || x.personId === timelineFilterPerson) && (!timelineFilterType || x.type === timelineFilterType) && (!q || normalizeSearch(x.summary).includes(q) || normalizeSearch(x.notes).includes(q))).sort((a,b) => String(b.date).localeCompare(String(a.date)));
        return rows.length ? <div style={{ display: "grid", gap: 9, marginTop: 12 }}>{rows.map((x) => <div key={x.id} style={{ border: "1px solid " + C.line, borderRadius: 12, padding: 12, display: "flex", gap: 12, justifyContent: "space-between", alignItems: "start", flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 220px" }}><strong>{x.summary}</strong><div style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>{peopleById[x.personId]?.name || "شخص غير محدد"} · {x.date} · {{ message: "رسالة", call: "مكالمة", meeting: "لقاء", email: "بريد", other: "أخرى" }[x.type] || x.type}</div>{x.notes && <p style={{ margin: "6px 0 0", fontSize: 13, whiteSpace: "pre-wrap" }}>{x.notes}</p>}</div>
          {canEdit && <div style={{ display: "flex", gap: 6 }}><Button onClick={() => { setEditingTimelineId(x.id); setTimelineDraft({ personId: x.personId || "", type: x.type || "other", date: x.date || today(), summary: x.summary || "", notes: x.notes || "" }); window.scrollTo?.({ top: 0, behavior: "smooth" }); }}>تعديل</Button><Button kind="danger" onClick={() => deleteEntity("timeline", x)}>أرشفة</Button></div>}
        </div>)}</div> : <Empty>لا توجد أحداث تطابق عوامل التصفية.</Empty>;
      })()}
    </Panel>
  </>;
  else if (page === "followups") content = <>
    {canEdit && <Panel title={editingFollowupId ? "تعديل متابعة" : "متابعة جديدة"} hint="اربط كل متابعة بشخص، وحدد الأولوية وموعد الاستحقاق لتظهر في لوحة المتابعة.">
      <form onSubmit={async (e) => { e.preventDefault(); if (!followupDraft.personId || !followupDraft.title.trim()) return setError("اختر شخصًا واكتب عنوان المتابعة."); const old = data.followups.find((x) => x.id === editingFollowupId); const ok = await saveEntity("followups", { ...followupDraft, id: editingFollowupId || makeId(), status: old?.status || "open", priority: followupDraft.priority || "normal", createdAt: old?.createdAt || new Date().toISOString() }); if (ok) { setFollowupDraft({ personId: "", title: "", dueDate: today(), notes: "", priority: "normal" }); setEditingFollowupId(null); } }} style={{ display: "grid", gap: 10 }}>
        <SelectField label="الشخص" value={followupDraft.personId} onChange={(v) => setFollowupDraft((p) => ({ ...p, personId: v }))} options={[{ value: "", label: "اختر شخصًا" }, ...data.people.map((p) => ({ value: p.id, label: p.name }))]} />
        <Field label="عنوان المتابعة" value={followupDraft.title} required onChange={(v) => setFollowupDraft((p) => ({ ...p, title: v }))} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 10 }}>
          <Field label="تاريخ الاستحقاق" type="date" value={followupDraft.dueDate} onChange={(v) => setFollowupDraft((p) => ({ ...p, dueDate: v }))} />
          <SelectField label="الأولوية" value={followupDraft.priority || "normal"} onChange={(v) => setFollowupDraft((p) => ({ ...p, priority: v }))} options={[{ value: "low", label: "منخفضة" }, { value: "normal", label: "عادية" }, { value: "high", label: "عالية" }]} />
        </div>
        <Field label="ملاحظات" value={followupDraft.notes} onChange={(v) => setFollowupDraft((p) => ({ ...p, notes: v }))} />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><Button type="submit" kind="primary" disabled={busy}>{editingFollowupId ? "حفظ التعديلات" : "حفظ المتابعة"}</Button>{editingFollowupId && <Button onClick={() => { setEditingFollowupId(null); setFollowupDraft({ personId: "", title: "", dueDate: today(), notes: "", priority: "normal" }); }}>إلغاء التعديل</Button>}</div>
      </form>
    </Panel>}
    <Panel title="إدارة المتابعات" hint={"إجمالي المتابعات: " + data.followups.length + " · يمكنك البحث والتصفية وإعادة فتح المكتمل أو تأجيل الموعد."}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10 }}>
        <Field label="بحث" value={followupSearch} placeholder="عنوان أو ملاحظات" onChange={setFollowupSearch} />
        <SelectField label="الحالة" value={followupFilterStatus} onChange={setFollowupFilterStatus} options={[{ value: "open", label: "المفتوحة" }, { value: "done", label: "المكتملة" }, { value: "all", label: "كل الحالات" }]} />
        <SelectField label="الشخص" value={followupFilterPerson} onChange={setFollowupFilterPerson} options={[{ value: "", label: "كل الأشخاص" }, ...data.people.map((p) => ({ value: p.id, label: p.name }))]} />
        <SelectField label="الأولوية" value={followupFilterPriority} onChange={setFollowupFilterPriority} options={[{ value: "", label: "كل الأولويات" }, { value: "low", label: "منخفضة" }, { value: "normal", label: "عادية" }, { value: "high", label: "عالية" }]} />
      </div>
      {(() => {
        const q = normalizeSearch(followupSearch);
        const rows = data.followups.filter((x) => (followupFilterStatus === "all" || (followupFilterStatus === "done" ? x.status === "done" : x.status !== "done")) && (!followupFilterPerson || x.personId === followupFilterPerson) && (!followupFilterPriority || (x.priority || "normal") === followupFilterPriority) && (!q || normalizeSearch(x.title).includes(q) || normalizeSearch(x.notes).includes(q))).sort((a,b) => String(a.dueDate || "9999-12-31").localeCompare(String(b.dueDate || "9999-12-31")));
        return rows.length ? <div style={{ display: "grid", gap: 9, marginTop: 12 }}>{rows.map((x) => {
          const overdueItem = x.status !== "done" && x.dueDate && x.dueDate < today();
          return <div key={x.id} style={{ border: "1px solid " + (overdueItem ? "#FECACA" : C.line), borderRadius: 12, padding: 12, display: "flex", gap: 12, justifyContent: "space-between", alignItems: "start", flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 220px" }}><strong>{x.title}</strong><div style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>{peopleById[x.personId]?.name || "شخص غير محدد"} · الاستحقاق {x.dueDate || "غير محدد"} · {x.status === "done" ? "مكتملة" : overdueItem ? "متأخرة" : "مفتوحة"} · الأولوية: {({ low: "منخفضة", normal: "عادية", high: "عالية" })[x.priority || "normal"]}</div>{x.notes && <p style={{ margin: "6px 0 0", fontSize: 13, whiteSpace: "pre-wrap" }}>{x.notes}</p>}</div>
            {canEdit && <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <Button onClick={() => { setEditingFollowupId(x.id); setFollowupDraft({ personId: x.personId || "", title: x.title || "", dueDate: x.dueDate || "", notes: x.notes || "", priority: x.priority || "normal" }); }}>تعديل</Button>
              {x.status !== "done" ? <><Button onClick={() => saveEntity("followups", { ...x, status: "done", completedAt: new Date().toISOString() })}>تمت</Button><Button onClick={() => saveEntity("followups", { ...x, dueDate: (() => { const d = new Date((x.dueDate || today()) + "T12:00:00"); d.setDate(d.getDate() + 1); return d.toISOString().slice(0,10); })() })}>تأجيل يوم</Button></> : <Button onClick={() => saveEntity("followups", { ...x, status: "open", completedAt: null })}>إعادة فتح</Button>}
              <Button kind="danger" onClick={() => deleteEntity("followups", x)}>أرشفة</Button>
            </div>}
          </div>;
        })}</div> : <Empty>لا توجد متابعات تطابق عوامل التصفية.</Empty>;
      })()}
    </Panel>
  </>;
  else if (page === "occasions") {
    const q = normalizeSearch(occasionSearch);
    const visibleOccasions = [...data.occasions]
      .filter((x) => (!occasionFilterPerson || x.personId === occasionFilterPerson)
        && (!occasionFilterRecurrence || (x.recurrence || "yearly") === occasionFilterRecurrence)
        && (!q || [x.title, x.notes, peopleById[x.personId]?.name].some((v) => normalizeSearch(v).includes(q))))
      .sort((a, b) => String(a.date).localeCompare(String(b.date)));
    const resetOccasionForm = () => { setEditingOccasionId(null); setOccasionDraft(blankOccasion()); };
    content = <>
      {canEdit && <Panel title={editingOccasionId ? "تعديل المناسبة" : "إضافة مناسبة"} hint="اربط المناسبة بالشخص، وحدد إن كانت سنوية أو لمرة واحدة، واضبط تذكيرها داخل التطبيق.">
        <form onSubmit={async (e) => {
          e.preventDefault();
          if (!occasionDraft.personId || !occasionDraft.title.trim() || !occasionDraft.date) return setError("أكمل الشخص واسم المناسبة والتاريخ.");
          const reminderDays = Math.max(0, Math.min(365, Number(occasionDraft.reminderDays) || 0));
          const existing = data.occasions.find((x) => x.id === editingOccasionId);
          const record = { ...occasionDraft, title: occasionDraft.title.trim(), reminderDays, id: editingOccasionId || makeId(), createdAt: existing?.createdAt || new Date().toISOString() };
          const ok = await saveEntity("occasions", record);
          if (ok) resetOccasionForm();
        }} style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10 }}>
            <SelectField label="الشخص" value={occasionDraft.personId} onChange={(v) => setOccasionDraft((p) => ({ ...p, personId: v }))} options={[{ value: "", label: "اختر شخصًا" }, ...data.people.map((p) => ({ value: p.id, label: p.name }))]} />
            <Field label="اسم المناسبة" value={occasionDraft.title} required onChange={(v) => setOccasionDraft((p) => ({ ...p, title: v }))} placeholder="عيد ميلاد، ذكرى، تخرج..." />
            <Field label="التاريخ" type="date" value={occasionDraft.date} required onChange={(v) => setOccasionDraft((p) => ({ ...p, date: v }))} />
            <SelectField label="التكرار" value={occasionDraft.recurrence} onChange={(v) => setOccasionDraft((p) => ({ ...p, recurrence: v }))} options={[{ value: "yearly", label: "سنوي" }, { value: "once", label: "مرة واحدة" }]} />
            <Field label="التذكير قبلها بأيام (0–365)" type="number" value={occasionDraft.reminderDays} onChange={(v) => setOccasionDraft((p) => ({ ...p, reminderDays: v }))} />
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, color: C.ink, fontSize: 13 }}><input type="checkbox" checked={occasionDraft.reminderEnabled !== false} onChange={(e) => setOccasionDraft((p) => ({ ...p, reminderEnabled: e.target.checked }))} /> تفعيل التذكير داخل لوحة العلاقات</label>
          <Field label="ملاحظات" value={occasionDraft.notes} onChange={(v) => setOccasionDraft((p) => ({ ...p, notes: v }))} placeholder="أفكار للاحتفال أو تفاصيل مهمة" />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><Button type="submit" kind="primary" disabled={busy}>{editingOccasionId ? "حفظ التعديلات" : "حفظ المناسبة"}</Button>{editingOccasionId && <Button onClick={resetOccasionForm}>إلغاء التعديل</Button>}</div>
        </form>
      </Panel>}
      <Panel title="المناسبات" hint={"عدد النتائج: " + visibleOccasions.length}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 9, marginBottom: 12 }}>
          <Field label="بحث" value={occasionSearch} onChange={setOccasionSearch} placeholder="اسم المناسبة أو الشخص أو الملاحظات" />
          <SelectField label="الشخص" value={occasionFilterPerson} onChange={setOccasionFilterPerson} options={[{ value: "", label: "كل الأشخاص" }, ...data.people.map((p) => ({ value: p.id, label: p.name }))]} />
          <SelectField label="التكرار" value={occasionFilterRecurrence} onChange={setOccasionFilterRecurrence} options={[{ value: "", label: "كل الأنواع" }, { value: "yearly", label: "سنوية" }, { value: "once", label: "مرة واحدة" }]} />
        </div>
        {visibleOccasions.length ? <div style={{ display: "grid", gap: 9 }}>{visibleOccasions.map((x) => <div key={x.id} style={{ border: "1px solid " + C.line, borderRadius: 12, padding: 12, display: "flex", gap: 12, justifyContent: "space-between", alignItems: "start", flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 220px" }}><strong>{x.title}</strong><div style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>{peopleById[x.personId]?.name || "شخص غير محدد"} · {x.date} · {(x.recurrence || "yearly") === "yearly" ? "تتكرر سنويًا" : "مرة واحدة"}</div><div style={{ color: C.muted, fontSize: 12, marginTop: 3 }}>{x.reminderEnabled === false ? "التذكير معطل" : "تذكير قبل " + (Number(x.reminderDays) || 0) + " يوم"}{x.notes ? " · " + x.notes : ""}</div></div>
          {canEdit && <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}><Button onClick={() => { setEditingOccasionId(x.id); setOccasionDraft({ ...blankOccasion(), ...x, reminderDays: x.reminderDays ?? 7, reminderEnabled: x.reminderEnabled !== false }); window.scrollTo?.({ top: 0, behavior: "smooth" }); }}>تعديل</Button><Button onClick={() => saveEntity("occasions", { ...x, reminderEnabled: x.reminderEnabled === false ? true : false })}>{x.reminderEnabled === false ? "تفعيل التذكير" : "إيقاف التذكير"}</Button><Button kind="danger" onClick={() => deleteEntity("occasions", x)}>أرشفة</Button></div>}
        </div>)}</div> : <Empty>لا توجد مناسبات تطابق عوامل التصفية. أضف مناسبة أو غيّر عوامل البحث.</Empty>}
      </Panel>
    </>;
  }
  else if (page === "gifts") {
    const q = normalizeSearch(giftSearch);
    const statuses = [
      { value: "idea", label: "فكرة" },
      { value: "planned", label: "مخططة" },
      { value: "purchased", label: "تم الشراء" },
      { value: "given", label: "تم تقديمها" }
    ];
    const statusLabel = Object.fromEntries(statuses.map((x) => [x.value, x.label]));
    const visibleGifts = [...data.gifts]
      .filter((x) => (!giftFilterPerson || x.personId === giftFilterPerson)
        && (!giftFilterStatus || (x.status || "idea") === giftFilterStatus)
        && (!q || [x.idea, x.notes, peopleById[x.personId]?.name, data.occasions.find((o) => o.id === x.occasionId)?.title].some((v) => normalizeSearch(v).includes(q))))
      .sort((a, b) => String(a.targetDate || "").localeCompare(String(b.targetDate || "")));
    const resetGiftForm = () => { setEditingGiftId(null); setGiftDraft(blankGift()); };
    content = <>
      {canEdit && <Panel title={editingGiftId ? "تعديل فكرة هدية" : "إضافة هدية أو فكرة"} hint="اربط الهدية بالشخص والمناسبة، وسجّل الميزانية والحالة حتى تتابعها من الفكرة إلى تقديمها.">
        <form onSubmit={async (e) => {
          e.preventDefault();
          if (!giftDraft.personId || !String(giftDraft.idea || "").trim()) return setError("اختر الشخص واكتب فكرة الهدية.");
          const budgetText = String(giftDraft.budget ?? "").trim();
          const budget = budgetText === "" ? "" : Number(budgetText);
          if (budget !== "" && (!Number.isFinite(budget) || budget < 0)) return setError("أدخل ميزانية صحيحة تساوي صفرًا أو أكثر.");
          const existing = data.gifts.find((x) => x.id === editingGiftId);
          const record = {
            ...giftDraft,
            idea: String(giftDraft.idea).trim(),
            budget,
            currency: giftDraft.currency || "EGP",
            status: statuses.some((x) => x.value === giftDraft.status) ? giftDraft.status : "idea",
            occasionId: giftDraft.occasionId || "",
            id: editingGiftId || makeId(),
            createdAt: existing?.createdAt || new Date().toISOString()
          };
          const ok = await saveEntity("gifts", record);
          if (ok) resetGiftForm();
        }} style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10 }}>
            <SelectField label="الشخص" value={giftDraft.personId} onChange={(v) => setGiftDraft((p) => ({ ...p, personId: v }))} options={[{ value: "", label: "اختر شخصًا" }, ...data.people.map((p) => ({ value: p.id, label: p.name }))]} />
            <Field label="فكرة الهدية" value={giftDraft.idea} required onChange={(v) => setGiftDraft((p) => ({ ...p, idea: v }))} placeholder="كتاب، تجربة، شيء يحتاجه..." />
            <SelectField label="المناسبة (اختياري)" value={giftDraft.occasionId} onChange={(v) => setGiftDraft((p) => ({ ...p, occasionId: v }))} options={[{ value: "", label: "بدون مناسبة محددة" }, ...data.occasions.filter((o) => !giftDraft.personId || o.personId === giftDraft.personId).map((o) => ({ value: o.id, label: o.title + (o.date ? " · " + o.date : "") }))]} />
            <SelectField label="الحالة" value={giftDraft.status} onChange={(v) => setGiftDraft((p) => ({ ...p, status: v }))} options={statuses} />
            <Field label="الميزانية" type="number" value={giftDraft.budget} onChange={(v) => setGiftDraft((p) => ({ ...p, budget: v }))} placeholder="اختياري" />
            <SelectField label="العملة" value={giftDraft.currency || "EGP"} onChange={(v) => setGiftDraft((p) => ({ ...p, currency: v }))} options={[{ value: "EGP", label: "جنيه مصري EGP" }, { value: "USD", label: "دولار USD" }, { value: "SAR", label: "ريال سعودي SAR" }, { value: "AED", label: "درهم إماراتي AED" }, { value: "EUR", label: "يورو EUR" }, { value: "GBP", label: "جنيه إسترليني GBP" }, { value: "OTHER", label: "أخرى" }]} />
            <Field label="التاريخ المستهدف (اختياري)" type="date" value={giftDraft.targetDate} onChange={(v) => setGiftDraft((p) => ({ ...p, targetDate: v }))} />
          </div>
          <Field label="ملاحظات" value={giftDraft.notes} onChange={(v) => setGiftDraft((p) => ({ ...p, notes: v }))} placeholder="المقاس، تفضيلات الشخص، رابط أو بدائل..." />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><Button type="submit" kind="primary" disabled={busy}>{editingGiftId ? "حفظ التعديلات" : "حفظ الهدية"}</Button>{editingGiftId && <Button onClick={resetGiftForm}>إلغاء التعديل</Button>}</div>
        </form>
      </Panel>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(145px,1fr))", gap: 10, marginBottom: 14 }}>
        <Metric label="كل الأفكار" value={data.gifts.length} />
        <Metric label="أفكار جديدة" value={data.gifts.filter((x) => !x.status || x.status === "idea").length} />
        <Metric label="تم شراؤها" value={data.gifts.filter((x) => x.status === "purchased").length} />
        <Metric label="تم تقديمها" value={data.gifts.filter((x) => x.status === "given").length} />
      </div>
      <Panel title="سجل الهدايا" hint={"عدد النتائج: " + visibleGifts.length + " · الأرشفة لا تحذف السجل نهائيًا"}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 9, marginBottom: 12 }}>
          <Field label="بحث" value={giftSearch} onChange={setGiftSearch} placeholder="الهدية أو الشخص أو المناسبة أو الملاحظات" />
          <SelectField label="الشخص" value={giftFilterPerson} onChange={setGiftFilterPerson} options={[{ value: "", label: "كل الأشخاص" }, ...data.people.map((p) => ({ value: p.id, label: p.name }))]} />
          <SelectField label="الحالة" value={giftFilterStatus} onChange={setGiftFilterStatus} options={[{ value: "", label: "كل الحالات" }, ...statuses]} />
        </div>
        {visibleGifts.length ? <div style={{ display: "grid", gap: 9 }}>{visibleGifts.map((x) => {
          const occasion = data.occasions.find((o) => o.id === x.occasionId);
          return <div key={x.id} style={{ border: "1px solid " + C.line, borderRadius: 12, padding: 12, display: "flex", gap: 12, justifyContent: "space-between", alignItems: "start", flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 220px", minWidth: 0 }}><strong>{x.idea}</strong><div style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>{peopleById[x.personId]?.name || "شخص غير محدد"} · {statusLabel[x.status || "idea"] || "فكرة"}{occasion ? " · " + occasion.title : ""}</div><div style={{ color: C.muted, fontSize: 12, marginTop: 3 }}>{x.budget !== "" && x.budget != null ? "الميزانية: " + x.budget + " " + (x.currency || "EGP") : "بدون ميزانية محددة"}{x.targetDate ? " · الموعد: " + x.targetDate : ""}{x.notes ? " · " + x.notes : ""}</div></div>
            {canEdit && <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}><Button onClick={() => { setEditingGiftId(x.id); setGiftDraft({ ...blankGift(), ...x, status: x.status || "idea", currency: x.currency || "EGP" }); window.scrollTo?.({ top: 0, behavior: "smooth" }); }}>تعديل</Button>{x.status !== "given" && <Button onClick={() => saveEntity("gifts", { ...x, status: statuses[statuses.findIndex((s) => s.value === (x.status || "idea")) + 1]?.value || "given" })}>المرحلة التالية</Button>}<Button kind="danger" onClick={() => deleteEntity("gifts", x)}>أرشفة</Button></div>}
          </div>;
        })}</div> : <Empty>لا توجد هدايا تطابق عوامل التصفية. أضف فكرة أو غيّر عوامل البحث.</Empty>}
      </Panel>
    </>;
  }
  else if (page === "circles") {
    const resetCircleForm = () => {
      setEditingCircleId(null);
      setCircleDraft({ name: "", description: "", color: "#DB2777" });
    };
    const membersByCircle = (circleId) => data.people.filter((person) => person.circleId === circleId);
    content = <>
      {canEdit && <Panel title={editingCircleId ? "تعديل الدائرة" : "إنشاء دائرة"} hint="استخدم الدوائر لتنظيم العائلة والأصدقاء والزملاء، ويمكنك نقل الأشخاص بين الدوائر من ملف الشخص.">
        <form onSubmit={async (e) => {
          e.preventDefault();
          const name = String(circleDraft.name || "").trim();
          if (!name) return setError("اكتب اسم الدائرة.");
          if (name.length > 100) return setError("اسم الدائرة يجب ألا يتجاوز 100 حرف.");
          const existing = data.circles.find((circle) => circle.id === editingCircleId);
          const duplicate = data.circles.some((circle) => circle.id !== editingCircleId && normalizeSearch(circle.name) === normalizeSearch(name));
          if (duplicate) return setError("يوجد بالفعل دائرة بالاسم نفسه.");
          const ok = await saveEntity("circles", {
            ...circleDraft, name, id: editingCircleId || makeId(),
            color: /^#[0-9a-fA-F]{6}$/.test(circleDraft.color || "") ? circleDraft.color : "#DB2777",
            createdAt: existing?.createdAt || new Date().toISOString()
          });
          if (ok) resetCircleForm();
        }} style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10 }}>
            <Field label="اسم الدائرة" value={circleDraft.name} required onChange={(v) => setCircleDraft((p) => ({ ...p, name: v }))} placeholder="العائلة، الأصدقاء المقربون..." />
            <Field label="وصف" value={circleDraft.description} onChange={(v) => setCircleDraft((p) => ({ ...p, description: v }))} placeholder="الغرض من هذه الدائرة" />
            <Field label="لون الدائرة (Hex)" value={circleDraft.color} onChange={(v) => setCircleDraft((p) => ({ ...p, color: v }))} placeholder="#DB2777" />
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><Button type="submit" kind="primary" disabled={busy}>{editingCircleId ? "حفظ التعديلات" : "إضافة دائرة"}</Button>{editingCircleId && <Button onClick={resetCircleForm}>إلغاء التعديل</Button>}</div>
        </form>
      </Panel>}
      <Panel title="دوائر العلاقات" hint={"عدد الدوائر: " + data.circles.length + " · الأشخاص الذين لا ينتمون لدائرة يظلون ظاهرين في سجل الأشخاص."}>
        {data.circles.length ? <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 10 }}>
          {data.circles.map((circle) => {
            const members = membersByCircle(circle.id);
            return <article key={circle.id} style={{ border: "1px solid " + C.line, borderTop: "4px solid " + (/^#[0-9a-fA-F]{6}$/.test(circle.color || "") ? circle.color : C.accent), borderRadius: 13, padding: 14, minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "start" }}><div><strong style={{ color: C.ink }}>{circle.name}</strong><div style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>{circle.description || "بدون وصف"}</div></div><span style={{ background: C.bg, borderRadius: 99, padding: "4px 8px", fontSize: 12 }}>{members.length} أشخاص</span></div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
                {members.length ? members.slice(0, 8).map((person) => <Button key={person.id} onClick={() => { setSelectedPersonId(person.id); setPage("people"); }}>{person.name}</Button>) : <span style={{ color: C.muted, fontSize: 12 }}>لا يوجد أشخاص مرتبطون بهذه الدائرة.</span>}
                {members.length > 8 && <span style={{ color: C.muted, fontSize: 12, alignSelf: "center" }}>و{members.length - 8} آخرون</span>}
              </div>
              {canEdit && <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12 }}><Button onClick={() => { setEditingCircleId(circle.id); setCircleDraft({ name: circle.name || "", description: circle.description || "", color: circle.color || "#DB2777" }); window.scrollTo?.({ top: 0, behavior: "smooth" }); }}>تعديل الدائرة</Button><Button kind="danger" onClick={async () => {
                if (!globalThis.confirm?.("أرشفة الدائرة؟ سيظل الأشخاص محفوظين، لكن قد تبقى لديهم إشارة إلى معرّف الدائرة المؤرشفة.")) return;
                await deleteEntity("circles", circle);
              }}>أرشفة</Button></div>}
            </article>;
          })}
        </div> : <Empty>لا توجد دوائر بعد. أنشئ دائرة ثم اربط الأشخاص بها من ملفاتهم.</Empty>}
      </Panel>
    </>;
  }
  else if (page === "networking") content = <Panel title="العلاقات المهنية" hint="نظّم سياق العلاقة المهنية، جهة العمل، الدور، مصدر التعارف، وآخر تواصل مسجل.">{list(data.people.filter((p) => ["Professional", "Colleague", "Client", "Mentor"].includes(p.type) || p.organization || p.role || p.professionalUrl), "الأشخاص المهنيون", (p) => <><strong>{p.name}</strong><div style={{ color: C.muted, fontSize: 12 }}>{[RELATIONSHIP_TYPE_LABELS[p.type] || p.type, p.role, p.organization, p.email].filter(Boolean).join(" · ")}</div>{p.metThrough && <div style={{ color: C.muted, fontSize: 12 }}>مصدر التعارف: {p.metThrough}</div>}{p.professionalUrl && <div style={{ marginTop: 5 }}><a href={p.professionalUrl} target="_blank" rel="noreferrer">فتح الرابط المهني</a></div>}<div style={{ marginTop: 7 }}><Button onClick={() => { setSelectedPersonId(p.id); setPage("people"); }}>فتح الملف</Button></div></>, "people")}</Panel>;
  else if (page === "insights") {
    const q = normalizeSearch(globalSearch);
    const searchMatches = (values) => !q || values.some((value) => normalizeSearch(value).includes(q));
    const peopleHits = data.people.filter((p) => searchMatches([p.name, p.phone, p.email, p.interests, p.matters, p.organization, p.role, p.metThrough]));
    const timelineHits = data.timeline.filter((x) => searchMatches([x.summary, x.notes, peopleById[x.personId]?.name, x.type]));
    const followupHits = data.followups.filter((x) => searchMatches([x.title, x.notes, peopleById[x.personId]?.name]));
    const occasionHits = data.occasions.filter((x) => searchMatches([x.title, x.notes, peopleById[x.personId]?.name]));
    const giftHits = data.gifts.filter((x) => searchMatches([x.idea, x.notes, peopleById[x.personId]?.name]));
    const latestContactByPerson = Object.fromEntries(data.people.map((person) => {
      const dates = data.timeline.filter((entry) => entry.personId === person.id && entry.date).map((entry) => String(entry.date)).sort();
      return [person.id, dates[dates.length - 1] || ""];
    }));
    const thresholdDays = Math.max(1, Math.min(3650, Number(data.settings?.neglectedAfterDays) || 30));
    const todayTime = Date.parse(today() + "T00:00:00Z");
    const neglectedPeople = data.people.map((person) => {
      const lastDate = latestContactByPerson[person.id];
      const daysSince = lastDate ? Math.floor((todayTime - Date.parse(lastDate + "T00:00:00Z")) / 86400000) : null;
      return { person, lastDate, daysSince };
    }).filter((x) => x.daysSince === null || x.daysSince >= thresholdDays)
      .sort((a, b) => (a.daysSince === null ? -1 : b.daysSince === null ? 1 : b.daysSince - a.daysSince));
    const resultCount = peopleHits.length + timelineHits.length + followupHits.length + occasionHits.length + giftHits.length;
    const resultButton = (label, onClick) => <Button onClick={onClick}>{label}</Button>;
    content = <>
      <Panel title="بحث شامل في العلاقات" hint="ابحث في الأشخاص، وسجل التواصل، والمتابعات، والمناسبات، والهدايا. النتائج لا تتجاوز صلاحيات القسم الحالية.">
        <Field label="عبارة البحث" value={globalSearch} onChange={setGlobalSearch} placeholder="اسم، بريد، جهة عمل، ملاحظة، مناسبة أو هدية..." />
        {q && <div style={{ display: "grid", gap: 12, marginTop: 14 }}>
          <div style={{ color: C.muted, fontSize: 12 }}>إجمالي النتائج المطابقة: {resultCount}</div>
          {peopleHits.length > 0 && <div><strong>الأشخاص ({peopleHits.length})</strong><div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 7 }}>{peopleHits.slice(0, 20).map((p) => <span key={p.id}>{resultButton(p.name, () => { setSelectedPersonId(p.id); setPage("people"); })}</span>)}</div></div>}
          {timelineHits.length > 0 && <div><strong>سجل التواصل ({timelineHits.length})</strong><div style={{ display: "grid", gap: 6, marginTop: 7 }}>{timelineHits.slice(0, 10).map((x) => <div key={x.id} style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", borderBottom: "1px solid " + C.line, paddingBottom: 7 }}><span>{x.summary || "تواصل"} · {peopleById[x.personId]?.name || "شخص غير محدد"} · {x.date || "بدون تاريخ"}</span>{resultButton("فتح سجل التواصل", () => { setTimelineFilterPerson(x.personId || ""); setPage("timeline"); })}</div>)}</div></div>}
          {followupHits.length > 0 && <div><strong>المتابعات ({followupHits.length})</strong><div style={{ display: "grid", gap: 6, marginTop: 7 }}>{followupHits.slice(0, 10).map((x) => <div key={x.id} style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", borderBottom: "1px solid " + C.line, paddingBottom: 7 }}><span>{x.title} · {peopleById[x.personId]?.name || "شخص غير محدد"} · {x.dueDate || "بدون موعد"}</span>{resultButton("فتح المتابعات", () => { setFollowupFilterPerson(x.personId || ""); setPage("followups"); })}</div>)}</div></div>}
          {occasionHits.length > 0 && <div><strong>المناسبات ({occasionHits.length})</strong><div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 7 }}>{occasionHits.slice(0, 15).map((x) => <span key={x.id}>{resultButton(x.title + (peopleById[x.personId]?.name ? " · " + peopleById[x.personId].name : ""), () => { setOccasionFilterPerson(x.personId || ""); setPage("occasions"); })}</span>)}</div></div>}
          {giftHits.length > 0 && <div><strong>الهدايا ({giftHits.length})</strong><div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 7 }}>{giftHits.slice(0, 15).map((x) => <span key={x.id}>{resultButton(x.idea, () => setPage("gifts"))}</span>)}</div></div>}
          {resultCount === 0 && <Empty>لا توجد نتائج مطابقة. جرّب كلمة أقصر أو صيغة مختلفة.</Empty>}
        </div>}
      </Panel>
      <Panel title="مؤشرات تنظيمية" hint="هذه مؤشرات عن اكتمال السجلات والمتابعات، وليست تقييمًا لمشاعر أو نوايا الناس.">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(145px,1fr))", gap: 10 }}>
          <Metric label="بلا وسيلة تواصل" value={data.people.filter((p) => !p.phone && !p.email).length} />
          <Metric label="بلا تاريخ تواصل مسجل" value={data.people.filter((p) => !latestContactByPerson[p.id]).length} />
          <Metric label="متابعات مفتوحة" value={data.followups.filter((f) => f.status !== "done").length} />
          <Metric label="مناسبات بلا تاريخ" value={data.occasions.filter((o) => !o.date).length} />
          <Metric label="هدايا غير مقدمة" value={data.gifts.filter((g) => g.status !== "given").length} />
          <Metric label="علاقات بلا تواصل منذ " value={neglectedPeople.length} detail={thresholdDays + " يومًا أو بلا سجل تواصل"} />
        </div>
      </Panel>
      <Panel title="أشخاص يحتاجون إلى مراجعة التواصل" hint={"يعرض من لم يسجل لهم تواصل أو مرّ " + thresholdDays + " يومًا على آخر سجل. هذا تذكير تنظيمي فقط، وليس تقييمًا للعلاقة."}>
        {neglectedPeople.length ? <div style={{ display: "grid", gap: 8 }}>{neglectedPeople.slice(0, 30).map(({ person, lastDate, daysSince }) => <div key={person.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", borderBottom: "1px solid " + C.line, padding: "8px 0" }}><div><strong>{person.name}</strong><div style={{ color: C.muted, fontSize: 12 }}>{lastDate ? "آخر تواصل: " + lastDate + " · منذ " + daysSince + " يومًا" : "لم يُسجل تواصل بعد"}{person.importance === "high" ? " · علاقة مهمة" : ""}</div></div><div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{resultButton("عرض الملف", () => { setSelectedPersonId(person.id); setPage("people"); })}{canEdit && resultButton("إنشاء متابعة", () => { setFollowupDraft((p) => ({ ...p, personId: person.id })); setPage("followups"); })}</div></div>)}</div> : <Empty>لا توجد علاقات تتجاوز حد المراجعة الحالي.</Empty>}
      </Panel>
    </>;
  }
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
