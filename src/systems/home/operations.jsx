import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { validateHomeTask, completeHomeTask, validateHomeMaintenance, validateHomePurchaseRequest, deriveHomePurchaseTotal, homeTaskEvent } from "./operations-domain.js";

const EMPTY = () => ({ tasks: [], completions: [], providers: [], maintenance: [], purchaseRequests: [], purchaseItems: [], bills: [], events: [] });
const uid = () => globalThis.crypto?.randomUUID?.() || "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === "x" ? r : (r & 3 | 8)).toString(16); });
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const currency = (value, code = "EGP") => new Intl.NumberFormat("ar-EG", { style: "currency", currency: code, maximumFractionDigits: 2 }).format(Number(value || 0));
const text = (value) => String(value || "").trim();
const styles = {
  wrap: { display: "grid", gap: 14, color: "#25231F" },
  tabs: { display: "flex", gap: 7, flexWrap: "wrap" },
  tab: active => ({ border: "1px solid " + (active ? "#EA580C" : "#E8E1D7"), borderRadius: 9, padding: "8px 12px", background: active ? "#FFF7ED" : "#fff", font: "inherit", fontSize: 12, cursor: "pointer" }),
  card: { background: "#fff", border: "1px solid #E8E1D7", borderRadius: 13, padding: 15 },
  field: { display: "grid", gap: 5, fontSize: 11, color: "#766F64", fontWeight: 700 },
  input: { width: "100%", boxSizing: "border-box", border: "1px solid #D9D1C5", borderRadius: 8, padding: "9px 10px", background: "#fff", font: "inherit", fontSize: 12 },
  btn: (secondary = false) => ({ border: "1px solid " + (secondary ? "#E8E1D7" : "#EA580C"), borderRadius: 8, padding: "8px 12px", background: secondary ? "#fff" : "#EA580C", color: secondary ? "#25231F" : "#fff", font: "inherit", fontSize: 12, fontWeight: 750, cursor: "pointer" }),
};
function Field({ label, children }) { return <label style={styles.field}>{label}{children}</label>; }
function Input(props) { return <input {...props} style={{ ...styles.input, ...(props.style || {}) }} />; }
function Select(props) { return <select {...props} style={styles.input} />; }
function Button({ children, secondary = false, ...props }) { return <button {...props} style={styles.btn(secondary)}>{children}</button>; }
function Row({ title, meta, children }) { return <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "11px 0", borderTop: "1px solid #E8E1D7" }}><div><div style={{ fontWeight: 800, fontSize: 13 }}>{title}</div>{meta && <div style={{ color: "#766F64", fontSize: 11, marginTop: 4 }}>{meta}</div>}</div><div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{children}</div></div>; }

export default function HomeOperations({ api, canEdit = false, isDemo = false, properties = [], rooms = [], items = [], initialTab = "tasks", onReceivePurchase }) {
  const [data, setData] = useState(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [tab, setTab] = useState(initialTab);
  useEffect(() => { if (["tasks", "maintenance", "shopping", "reports", "bills", "providers"].includes(initialTab)) setTab(initialTab); }, [initialTab]);
  const [taskForm, setTaskForm] = useState(null);
  const [maintenanceForm, setMaintenanceForm] = useState(null);
  const [purchaseForm, setPurchaseForm] = useState(null);
  const [billForm, setBillForm] = useState(null);
  const [providerForm, setProviderForm] = useState(null);
  const [filter, setFilter] = useState("");
  const remindedTasks = useRef(new Set());

  const activeProperties = useMemo(() => properties.filter(p => !p.deletedAt), [properties]);
  const activeRooms = useMemo(() => rooms.filter(r => !r.deletedAt), [rooms]);
  const activeItems = useMemo(() => items.filter(i => !i.deletedAt), [items]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (isDemo) {
          const raw = (() => { try { return JSON.parse(localStorage.getItem("home_operations_demo") || "null"); } catch { return null; } })();
          if (alive) setData({ ...EMPTY(), ...(raw || {}) });
        } else {
          if (typeof api?.loadHomeOperations !== "function") throw new Error("واجهة حفظ بيانات المهام المنزلية غير متاحة.");
          const result = await api.loadHomeOperations();
          if (result?.error) throw result.error;
          if (!result?.available) throw new Error("Migration تشغيل المهام المنزلية غير مطبقة على قاعدة البيانات بعد.");
          if (alive) setData({ ...EMPTY(), ...(result.data || {}) });
        }
      } catch (e) { if (alive) setError(e?.message || "تعذر تحميل عمليات المنزل."); }
      finally { if (alive) setLoaded(true); }
    })();
    return () => { alive = false; };
  }, [api, isDemo]);

  useEffect(() => {
    const checkReminders = () => {
      const now = Date.now();
      for (const task of data.tasks) {
        if (task.status !== "active" || !task.reminderAt || new Date(task.reminderAt).getTime() > now || remindedTasks.current.has(task.id)) continue;
        remindedTasks.current.add(task.id);
        const message = "حان موعد المهمة المنزلية: " + task.title;
        if (typeof window !== "undefined" && "Notification" in window && window.Notification.permission === "granted") {
          try { new window.Notification("تذكير منزلي", { body: task.title }); } catch { setNotice(message); }
        } else {
          setNotice(message + " (التذكير يعمل أثناء فتح التطبيق فقط)");
        }
      }
    };
    checkReminders();
    const timer = setInterval(checkReminders, 60000);
    return () => clearInterval(timer);
  }, [data.tasks]);

  const persist = useCallback(async next => {
    if (!canEdit) { setError("ليس لديك صلاحية تعديل قسم المنزل."); return false; }
    setSaving(true); setError("");
    try {
      if (isDemo) {
        localStorage.setItem("home_operations_demo", JSON.stringify(next));
      } else {
        const result = await api.saveHomeOperations(next);
        if (result?.error) throw result.error;
        if (!result?.available) throw new Error("Migration تشغيل المهام المنزلية غير مطبقة؛ لم يتم حفظ البيانات.");
        if (!result.ok) throw result.error || new Error("تعذر حفظ عمليات المنزل.");
      }
      setData(next); setNotice("تم الحفظ."); setTimeout(() => setNotice(""), 2500); return true;
    } catch (e) { setError(e?.message || "تعذر حفظ البيانات."); return false; }
    finally { setSaving(false); }
  }, [api, canEdit, isDemo]);

  const saveTask = async e => {
    e.preventDefault();
    const form = taskForm;
    const record = { ...form, id: form.id || uid(), title: text(form.title), description: text(form.description), taskType: form.taskType || "routine", status: form.status || "active", priority: form.priority || "normal", recurrenceRule: form.recurrenceRule || { frequency: "none" }, dueDate: form.dueDate || null, estimatedMinutes: form.estimatedMinutes === "" ? null : Number(form.estimatedMinutes), reminderAt: form.reminderAt || null, updatedAt: new Date().toISOString(), createdAt: form.createdAt || new Date().toISOString() };
    const errors = validateHomeTask(record, { properties: activeProperties, rooms: activeRooms });
    if (errors.length) return setError(errors.join(" "));
    const exists = data.tasks.some(t => t.id === record.id);
    const next = { ...data, tasks: exists ? data.tasks.map(t => t.id === record.id ? record : t) : [record, ...data.tasks] };
    if (await persist(next)) setTaskForm(null);
  };

  const markTask = async (task, outcome = "done") => {
    try {
      const completion = { id: uid(), taskId: task.id, outcome, completedAt: new Date().toISOString(), note: "", idempotencyKey: uid() };
      const result = completeHomeTask(task, completion);
      const next = { ...data, tasks: data.tasks.map(t => t.id === task.id ? result.task : t), completions: [result.completion, ...data.completions], events: [homeTaskEvent(result.task, result.completion), ...(data.events || [])] };
      await persist(next);
    } catch (e) { setError(e?.message || "تعذر تسجيل الإنجاز."); }
  };

  const saveMaintenance = async e => {
    e.preventDefault();
    const f = maintenanceForm;
    const record = { ...f, id: f.id || uid(), title: text(f.title), propertyId: f.propertyId || activeProperties[0]?.id, roomId: f.roomId || null, inventoryItemId: f.inventoryItemId || null, status: f.status || "reported", priority: f.priority || "normal", costAmount: f.costAmount === "" ? null : Number(f.costAmount), currency: f.currency || "EGP", nextMaintenanceDate: f.nextMaintenanceDate || null, updatedAt: new Date().toISOString(), reportedAt: f.reportedAt || new Date().toISOString() };
    const errors = validateHomeMaintenance(record, { properties: activeProperties, rooms: activeRooms, items: activeItems });
    if (errors.length) return setError(errors.join(" "));
    const exists = data.maintenance.some(x => x.id === record.id);
    const next = { ...data, maintenance: exists ? data.maintenance.map(x => x.id === record.id ? record : x) : [record, ...data.maintenance] };
    if (await persist(next)) setMaintenanceForm(null);
  };

  const savePurchase = async e => {
    e.preventDefault();
    const f = purchaseForm;
    const lines = (f.lines || []).filter(x => text(x.name));
    const request = { id: f.id || uid(), title: text(f.title), propertyId: f.propertyId || activeProperties[0]?.id, status: f.status || "needed", priority: f.priority || "normal", budgetAmount: f.budgetAmount === "" ? null : Number(f.budgetAmount), currency: f.currency || "EGP", neededBy: f.neededBy || null, notes: text(f.notes), createdAt: f.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() };
    const errors = validateHomePurchaseRequest(request, lines, { properties: activeProperties });
    if (errors.length) return setError(errors.join(" "));
    const savedLines = lines.map(line => ({ ...line, id: line.id || uid(), requestId: request.id, inventoryItemId: line.inventoryItemId || null, quantity: Number(line.quantity), estimatedUnitPrice: line.estimatedUnitPrice === "" ? null : Number(line.estimatedUnitPrice), receivedQuantity: Number(line.receivedQuantity || 0) }));
    const exists = data.purchaseRequests.some(x => x.id === request.id);
    const next = { ...data, purchaseRequests: exists ? data.purchaseRequests.map(x => x.id === request.id ? request : x) : [request, ...data.purchaseRequests], purchaseItems: [...data.purchaseItems.filter(x => x.requestId !== request.id), ...savedLines] };
    if (await persist(next)) setPurchaseForm(null);
  };

  const receivePurchase = async request => {
    const lines = data.purchaseItems.filter(x => x.requestId === request.id);
    if (!lines.length) return setError("لا يمكن استلام طلب بلا بنود.");
    if (typeof onReceivePurchase !== "function") return setError("ربط الاستلام بالمخزون غير متاح؛ لم يتم تغيير حالة الطلب.");
    const inventoryResult = await onReceivePurchase(request, lines);
    if (!inventoryResult) return;
    const updated = lines.map(line => ({ ...line, inventoryItemId: inventoryResult.linkedItems?.[line.id] || line.inventoryItemId || null, receivedQuantity: Number(line.quantity) }));
    const next = { ...data, purchaseItems: [...data.purchaseItems.filter(x => x.requestId !== request.id), ...updated], purchaseRequests: data.purchaseRequests.map(x => x.id === request.id ? { ...x, status: "received", receivedAt: new Date().toISOString(), updatedAt: new Date().toISOString() } : x) };
    await persist(next);
  };

  const saveBill = async e => {
    e.preventDefault();
    const f = billForm;
    const record = { ...f, id: f.id || uid(), title: text(f.title), amount: Number(f.amount), currency: f.currency || "EGP", frequency: f.frequency || "monthly", dueDate: f.dueDate || null, status: f.status || "due", category: text(f.category), notes: text(f.notes), updatedAt: new Date().toISOString(), createdAt: f.createdAt || new Date().toISOString() };
    if (!record.title || !Number.isFinite(record.amount) || record.amount < 0 || !record.dueDate) return setError("أدخل اسم الفاتورة والمبلغ وتاريخ الاستحقاق بصورة صحيحة.");
    const exists = data.bills.some(x => x.id === record.id);
    const next = { ...data, bills: exists ? data.bills.map(x => x.id === record.id ? record : x) : [record, ...data.bills] };
    if (await persist(next)) setBillForm(null);
  };

  const saveProvider = async e => {
    e.preventDefault();
    const f = providerForm;
    if (!text(f.name)) return setError("اسم مقدم الخدمة مطلوب.");
    const record = { ...f, id: f.id || uid(), name: text(f.name), serviceCategory: text(f.serviceCategory), phone: text(f.phone), email: text(f.email), notes: text(f.notes), updatedAt: new Date().toISOString(), createdAt: f.createdAt || new Date().toISOString() };
    const exists = data.providers.some(x => x.id === record.id);
    if (await persist({ ...data, providers: exists ? data.providers.map(x => x.id === record.id ? record : x) : [record, ...data.providers] })) setProviderForm(null);
  };

  const completeBill = async bill => {
    if (bill.frequency === "once") {
      await persist({ ...data, bills: data.bills.map(x => x.id === bill.id ? { ...x, status: "paid", lastPaidAt: new Date().toISOString(), updatedAt: new Date().toISOString() } : x) });
      return;
    }
    const date = new Date((bill.dueDate || today()) + "T12:00:00Z");
    if (bill.frequency === "weekly") date.setUTCDate(date.getUTCDate() + 7);
    else if (bill.frequency === "monthly") date.setUTCMonth(date.getUTCMonth() + 1);
    else if (bill.frequency === "quarterly") date.setUTCMonth(date.getUTCMonth() + 3);
    else if (bill.frequency === "yearly") date.setUTCFullYear(date.getUTCFullYear() + 1);
    else date.setUTCDate(date.getUTCDate() + 1);
    const next = { ...data, bills: data.bills.map(x => x.id === bill.id ? { ...x, lastPaidAt: new Date().toISOString(), dueDate: date.toISOString().slice(0, 10), status: "due", updatedAt: new Date().toISOString() } : x) };
    await persist(next);
  };

  if (!loaded) return <div style={styles.card}>جاري تحميل المهام والعمليات المنزلية…</div>;
  const tabs = [{ id: "tasks", label: "المهام والجدول" }, { id: "maintenance", label: "الصيانة" }, { id: "shopping", label: "المشتريات" }, { id: "bills", label: "الفواتير" }, { id: "providers", label: "مقدمو الخدمات" }, { id: "reports", label: "التقارير" }];
  const activeTasks = data.tasks.filter(t => t.status === "active");
  const pendingMaintenance = data.maintenance.filter(m => !["completed", "cancelled"].includes(m.status));
  const pendingPurchases = data.purchaseRequests.filter(p => !["received", "cancelled"].includes(p.status));
  const overdueBills = data.bills.filter(b => b.status !== "paid" && b.dueDate < today());
  const linesFor = id => data.purchaseItems.filter(line => line.requestId === id);
  const addTask = () => setTaskForm({ title: "", description: "", taskType: "routine", status: "active", priority: "normal", propertyId: activeProperties[0]?.id || "", roomId: "", dueDate: today(), estimatedMinutes: "", reminderAt: "", recurrenceRule: { frequency: "none", intervalDays: 1 } });
  const addMaintenance = () => setMaintenanceForm({ title: "", description: "", propertyId: activeProperties[0]?.id || "", roomId: "", inventoryItemId: "", status: "reported", priority: "normal", costAmount: "", currency: "EGP", nextMaintenanceDate: "", notes: "" });
  const addPurchase = () => setPurchaseForm({ title: "", propertyId: activeProperties[0]?.id || "", status: "needed", priority: "normal", budgetAmount: "", currency: "EGP", neededBy: "", notes: "", lines: [{ name: "", quantity: 1, estimatedUnitPrice: "", receivedQuantity: 0, inventoryItemId: "" }] });
  const addBill = () => setBillForm({ title: "", amount: "", currency: "EGP", frequency: "monthly", dueDate: today(), status: "due", category: "", notes: "" });
  const input = (value, onChange, type = "text", extra = {}) => <Input type={type} value={value ?? ""} onChange={e => onChange(e.target.value)} {...extra} />;
  const filterBox = <Input placeholder="بحث…" value={filter} onChange={e => setFilter(e.target.value)} style={{ maxWidth: 300 }} />;

  return <div dir="rtl" style={styles.wrap}>
    {isDemo && <div style={{ padding: 10, borderRadius: 9, background: "#FFF7ED", color: "#9A3412", fontSize: 12 }}>وضع تجريبي — تحفظ العمليات محليًا على هذا الجهاز فقط.</div>}
    {notice && <div role="status" style={{ padding: 10, background: "#ECFDF5", color: "#166534", borderRadius: 9 }}>{notice}</div>}
    {error && <div role="alert" style={{ padding: 10, background: "#FEF2F2", color: "#B91C1C", borderRadius: 9 }}>{error}<button onClick={() => setError("")} style={{ float: "left" }}>×</button></div>}
    <div style={styles.tabs}>{tabs.map(t => <button key={t.id} onClick={() => setTab(t.id)} style={styles.tab(tab === t.id)}>{t.label}</button>)}</div>
    {tab === "tasks" && <div style={styles.card}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}><div><h3 style={{ margin: 0 }}>المهام والجدول المنزلي</h3><p style={{ color: "#766F64", fontSize: 11 }}>المهام المتكررة تظل مملوكة لـ Home OS ويمكن عرضها لاحقًا داخل Today.</p></div>{canEdit && <Button onClick={addTask}>＋ مهمة منزلية</Button>}</div>
      {filterBox}
      {data.tasks.filter(t => t.status !== "archived" && (t.title + " " + t.description).toLowerCase().includes(filter.toLowerCase())).sort((a,b) => (a.dueDate || "9999").localeCompare(b.dueDate || "9999")).map(task => <Row key={task.id} title={task.title} meta={[task.dueDate || "بلا موعد", task.priority, task.recurrenceRule?.frequency !== "none" ? "متكررة: " + task.recurrenceRule.frequency : "مرة واحدة", activeProperties.find(p => p.id === task.propertyId)?.name].filter(Boolean).join(" · ")}>{canEdit && <><Button secondary onClick={() => setTaskForm({ ...task, recurrenceRule: task.recurrenceRule || { frequency: "none", intervalDays: 1 } })}>تعديل</Button>{task.status === "active" && <><Button onClick={() => markTask(task, "done")}>تمت</Button><Button secondary onClick={() => markTask(task, "skipped")}>تخطي</Button><Button secondary onClick={() => persist({ ...data, tasks: data.tasks.map(x => x.id === task.id ? { ...x, status: "paused", updatedAt: new Date().toISOString() } : x) })}>إيقاف مؤقت</Button></>}{task.status === "paused" && <Button onClick={() => persist({ ...data, tasks: data.tasks.map(x => x.id === task.id ? { ...x, status: "active", updatedAt: new Date().toISOString() } : x) })}>استئناف</Button>}<Button secondary onClick={() => persist({ ...data, tasks: data.tasks.map(x => x.id === task.id ? { ...x, status: "archived", updatedAt: new Date().toISOString() } : x) })}>أرشفة</Button></>}</Row>)}
      {!activeTasks.length && <p style={{ color: "#766F64", fontSize: 12 }}>لا توجد مهام بعد.</p>}
      {taskForm && <form onSubmit={saveTask} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 10, marginTop: 14, borderTop: "1px solid #E8E1D7", paddingTop: 14 }}>
        <Field label="عنوان المهمة *">{input(taskForm.title, v => setTaskForm({ ...taskForm, title: v }))}</Field>
        <Field label="العقار"><Select value={taskForm.propertyId || ""} onChange={e => setTaskForm({ ...taskForm, propertyId: e.target.value, roomId: "" })}>{activeProperties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field>
        <Field label="الغرفة"><Select value={taskForm.roomId || ""} onChange={e => setTaskForm({ ...taskForm, roomId: e.target.value })}><option value="">عام / البيت كله</option>{activeRooms.filter(r => r.propertyId === taskForm.propertyId).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</Select></Field>
        <Field label="نوع المهمة"><Select value={taskForm.taskType} onChange={e => setTaskForm({ ...taskForm, taskType: e.target.value })}><option value="routine">روتينية</option><option value="one_time">مرة واحدة</option><option value="seasonal">موسمية</option><option value="inspection">فحص</option></Select></Field>
        <Field label="الأولوية"><Select value={taskForm.priority} onChange={e => setTaskForm({ ...taskForm, priority: e.target.value })}><option value="low">منخفضة</option><option value="normal">عادية</option><option value="high">عالية</option><option value="urgent">عاجلة</option></Select></Field>
        <Field label="الموعد">{input(taskForm.dueDate, v => setTaskForm({ ...taskForm, dueDate: v }), "date")}</Field>
        <Field label="التكرار"><Select value={taskForm.recurrenceRule?.frequency || "none"} onChange={e => setTaskForm({ ...taskForm, recurrenceRule: { ...taskForm.recurrenceRule, frequency: e.target.value } })}><option value="none">بدون تكرار</option><option value="daily">يومي</option><option value="weekly">أسبوعي</option><option value="monthly">شهري</option><option value="yearly">سنوي</option><option value="interval">كل عدد أيام</option></Select></Field>
        {taskForm.recurrenceRule?.frequency === "interval" && <Field label="كل كام يوم؟">{input(taskForm.recurrenceRule.intervalDays, v => setTaskForm({ ...taskForm, recurrenceRule: { ...taskForm.recurrenceRule, intervalDays: v } }), "number", { min: 1, max: 365 })}</Field>}
        <Field label="المدة المتوقعة بالدقائق">{input(taskForm.estimatedMinutes, v => setTaskForm({ ...taskForm, estimatedMinutes: v }), "number", { min: 0 })}</Field><Field label="تذكير داخل التطبيق">{input(taskForm.reminderAt, v => setTaskForm({ ...taskForm, reminderAt: v }), "datetime-local")}</Field>
        <Field label="الوصف / ملاحظات">{input(taskForm.description, v => setTaskForm({ ...taskForm, description: v }))}</Field>
        <div style={{ display: "flex", gap: 8, alignItems: "end" }}><Button type="submit" disabled={saving}>حفظ المهمة</Button><Button type="button" secondary onClick={() => setTaskForm(null)}>إلغاء</Button></div>
      </form>}
    </div>}
    {tab === "maintenance" && <div style={styles.card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}><h3>الصيانة والأعطال</h3>{canEdit && <Button onClick={addMaintenance}>＋ تسجيل صيانة</Button>}</div>
      <Row title={"الأعمال المفتوحة: " + pendingMaintenance.length} meta={"إجمالي السجلات: " + data.maintenance.length}/>
      {data.maintenance.map(m => <Row key={m.id} title={m.title} meta={[m.status, m.priority, m.nextMaintenanceDate && "القادم " + m.nextMaintenanceDate, m.costAmount != null && currency(m.costAmount,m.currency)].filter(Boolean).join(" · ")}>{canEdit && <><Button secondary onClick={() => setMaintenanceForm({ ...m })}>تعديل</Button>{m.status !== "completed" && <Button onClick={() => persist({ ...data, maintenance: data.maintenance.map(x => x.id === m.id ? { ...x, status: "completed", completedAt: new Date().toISOString(), updatedAt: new Date().toISOString() } : x) })}>إتمام</Button>}</>}</Row>)}
      {maintenanceForm && <form onSubmit={saveMaintenance} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 10, marginTop: 12 }}>
        <Field label="وصف العطل / الصيانة *">{input(maintenanceForm.title,v=>setMaintenanceForm({...maintenanceForm,title:v}))}</Field>
        <Field label="العقار"><Select value={maintenanceForm.propertyId||""} onChange={e=>setMaintenanceForm({...maintenanceForm,propertyId:e.target.value,roomId:""})}>{activeProperties.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field>
        <Field label="الغرفة"><Select value={maintenanceForm.roomId||""} onChange={e=>setMaintenanceForm({...maintenanceForm,roomId:e.target.value})}><option value="">غير محدد</option>{activeRooms.filter(r=>r.propertyId===maintenanceForm.propertyId).map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</Select></Field>
        <Field label="عنصر مرتبط"><Select value={maintenanceForm.inventoryItemId||""} onChange={e=>setMaintenanceForm({...maintenanceForm,inventoryItemId:e.target.value})}><option value="">غير محدد</option>{activeItems.filter(i=>i.propertyId===maintenanceForm.propertyId).map(i=><option key={i.id} value={i.id}>{i.name}</option>)}</Select></Field><Field label="مقدم الخدمة"><Select value={maintenanceForm.providerId||""} onChange={e=>setMaintenanceForm({...maintenanceForm,providerId:e.target.value})}><option value="">غير محدد</option>{data.providers.map(p=><option key={p.id} value={p.id}>{p.name} · {p.serviceCategory}</option>)}</Select></Field>
        <Field label="الحالة"><Select value={maintenanceForm.status} onChange={e=>setMaintenanceForm({...maintenanceForm,status:e.target.value})}>{[["reported","تم الإبلاغ"],["scheduled","مجدولة"],["in_progress","جارية"],["waiting_parts","بانتظار قطع"],["completed","مكتملة"],["cancelled","ملغاة"]].map(([v,l])=><option key={v} value={v}>{l}</option>)}</Select></Field>
        <Field label="الأولوية"><Select value={maintenanceForm.priority} onChange={e=>setMaintenanceForm({...maintenanceForm,priority:e.target.value})}><option value="low">منخفضة</option><option value="normal">عادية</option><option value="high">عالية</option><option value="urgent">عاجلة</option></Select></Field>
        <Field label="التكلفة">{input(maintenanceForm.costAmount,v=>setMaintenanceForm({...maintenanceForm,costAmount:v}),"number",{min:0,step:"0.01"})}</Field>
        <Field label="موعد الصيانة القادمة">{input(maintenanceForm.nextMaintenanceDate,v=>setMaintenanceForm({...maintenanceForm,nextMaintenanceDate:v}),"date")}</Field>
        <Field label="ملاحظات">{input(maintenanceForm.notes,v=>setMaintenanceForm({...maintenanceForm,notes:v}))}</Field>
        <div style={{display:"flex",gap:8,alignItems:"end"}}><Button type="submit" disabled={saving}>حفظ الصيانة</Button><Button type="button" secondary onClick={()=>setMaintenanceForm(null)}>إلغاء</Button></div>
      </form>}
    </div>}
    {tab === "shopping" && <div style={styles.card}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10}}><h3>المشتريات والاحتياجات</h3>{canEdit&&<Button onClick={addPurchase}>＋ طلب شراء</Button>}</div>
      <Row title={"طلبات لم تُستلم بالكامل: "+pendingPurchases.length} meta={"طلبات الشراء الإجمالية: "+data.purchaseRequests.length}/>
      {data.purchaseRequests.map(p=>{const lines=linesFor(p.id);return <Row key={p.id} title={p.title} meta={[p.status,activeProperties.find(x=>x.id===p.propertyId)?.name,"تقدير "+currency(deriveHomePurchaseTotal(lines),"EGP"),p.neededBy&&"مطلوب قبل "+p.neededBy].filter(Boolean).join(" · ")}>{canEdit&&<><Button secondary onClick={()=>setPurchaseForm({...p,lines:lines.map(({id,requestId,...rest})=>({...rest,id}))})}>تعديل</Button>{p.status!=="received"&&p.status!=="cancelled"&&<Button onClick={()=>receivePurchase(p)}>تسجيل الاستلام</Button>}</>}</Row>})}
      {purchaseForm&&<form onSubmit={savePurchase} style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:10,marginTop:12}}>
        <Field label="عنوان الطلب *">{input(purchaseForm.title,v=>setPurchaseForm({...purchaseForm,title:v}))}</Field>
        <Field label="العقار"><Select value={purchaseForm.propertyId||""} onChange={e=>setPurchaseForm({...purchaseForm,propertyId:e.target.value})}>{activeProperties.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field>
        <Field label="الأولوية"><Select value={purchaseForm.priority} onChange={e=>setPurchaseForm({...purchaseForm,priority:e.target.value})}><option value="low">منخفضة</option><option value="normal">عادية</option><option value="high">عالية</option><option value="urgent">عاجلة</option></Select></Field>
        <Field label="مطلوب قبل">{input(purchaseForm.neededBy,v=>setPurchaseForm({...purchaseForm,neededBy:v}),"date")}</Field>
        <Field label="الميزانية">{input(purchaseForm.budgetAmount,v=>setPurchaseForm({...purchaseForm,budgetAmount:v}),"number",{min:0,step:"0.01"})}</Field>
        <div style={{gridColumn:"1/-1",fontWeight:800}}>بنود الطلب</div>
        {(purchaseForm.lines||[]).map((line,index)=><div key={line.id||index} style={{gridColumn:"1/-1",display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:8,background:"#FBF9F5",padding:10,borderRadius:8}}>
          <Field label="اسم الصنف">{input(line.name,v=>setPurchaseForm({...purchaseForm,lines:purchaseForm.lines.map((x,i)=>i===index?{...x,name:v}:x)}))}</Field>
          <Field label="الكمية">{input(line.quantity,v=>setPurchaseForm({...purchaseForm,lines:purchaseForm.lines.map((x,i)=>i===index?{...x,quantity:v}:x)}),"number",{min:0.001,step:"any"})}</Field>
          <Field label="سعر الوحدة التقديري">{input(line.estimatedUnitPrice,v=>setPurchaseForm({...purchaseForm,lines:purchaseForm.lines.map((x,i)=>i===index?{...x,estimatedUnitPrice:v}:x)}),"number",{min:0,step:"0.01"})}</Field><Field label="عنصر المخزون"><Select value={line.inventoryItemId||""} onChange={e=>setPurchaseForm({...purchaseForm,lines:purchaseForm.lines.map((x,i)=>i===index?{...x,inventoryItemId:e.target.value}:x)})}><option value="">إنشاء عنصر عند الاستلام</option>{activeItems.filter(item=>item.propertyId===purchaseForm.propertyId).map(item=><option key={item.id} value={item.id}>{item.name} · {item.quantity}</option>)}</Select></Field>
          <Field label="المستلم حتى الآن"><Input type="number" value={line.receivedQuantity||0} readOnly /></Field>
          {purchaseForm.lines.length>1&&<Button type="button" secondary onClick={()=>setPurchaseForm({...purchaseForm,lines:purchaseForm.lines.filter((_,i)=>i!==index)})}>حذف البند</Button>}
        </div>)}
        <Button type="button" secondary onClick={()=>setPurchaseForm({...purchaseForm,lines:[...(purchaseForm.lines||[]),{name:"",quantity:1,estimatedUnitPrice:"",receivedQuantity:0}]})}>＋ بند آخر</Button>
        <Field label="ملاحظات">{input(purchaseForm.notes,v=>setPurchaseForm({...purchaseForm,notes:v}))}</Field>
        <div style={{display:"flex",gap:8,alignItems:"end"}}><Button type="submit" disabled={saving}>حفظ الطلب</Button><Button type="button" secondary onClick={()=>setPurchaseForm(null)}>إلغاء</Button></div>
      </form>}
    </div>}
    {tab === "bills" && <div style={styles.card}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10}}><h3>الفواتير والمصروفات المتكررة</h3>{canEdit&&<Button onClick={addBill}>＋ فاتورة</Button>}</div>
      <Row title={"متأخرة: "+overdueBills.length} meta={"الفواتير المتكررة: "+data.bills.length}/>
      {data.bills.map(b=><Row key={b.id} title={b.title} meta={[currency(b.amount,b.currency),b.category,b.frequency,"الاستحقاق "+b.dueDate,b.dueDate<today()?"متأخرة":"قادمة"].filter(Boolean).join(" · ")}>{canEdit&&<><Button secondary onClick={()=>setBillForm({...b})}>تعديل</Button><Button onClick={()=>completeBill(b)}>تسجيل الدفع وترحيل الاستحقاق</Button></>}</Row>)}
      {billForm&&<form onSubmit={saveBill} style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:10,marginTop:12}}>
        <Field label="اسم الفاتورة *">{input(billForm.title,v=>setBillForm({...billForm,title:v}))}</Field>
        <Field label="المبلغ *">{input(billForm.amount,v=>setBillForm({...billForm,amount:v}),"number",{min:0,step:"0.01"})}</Field>
        <Field label="العملة"><Select value={billForm.currency} onChange={e=>setBillForm({...billForm,currency:e.target.value})}><option>EGP</option><option>USD</option><option>SAR</option><option>AED</option></Select></Field>
        <Field label="التكرار"><Select value={billForm.frequency} onChange={e=>setBillForm({...billForm,frequency:e.target.value})}><option value="weekly">أسبوعي</option><option value="monthly">شهري</option><option value="quarterly">ربع سنوي</option><option value="yearly">سنوي</option><option value="daily">يومي</option><option value="once">مرة واحدة</option></Select></Field>
        <Field label="تاريخ الاستحقاق *">{input(billForm.dueDate,v=>setBillForm({...billForm,dueDate:v}),"date")}</Field>
        <Field label="التصنيف">{input(billForm.category,v=>setBillForm({...billForm,category:v}))}</Field>
        <Field label="ملاحظات">{input(billForm.notes,v=>setBillForm({...billForm,notes:v}))}</Field>
        <div style={{display:"flex",gap:8,alignItems:"end"}}><Button type="submit" disabled={saving}>حفظ الفاتورة</Button><Button type="button" secondary onClick={()=>setBillForm(null)}>إلغاء</Button></div>
      </form>}
      <p style={{fontSize:11,color:"#766F64"}}>هذه سجلات استحقاق منزلية وليست حركات مالية في Finance. ربط دفع الفاتورة بمعاملة Finance يحتاج ربطًا صريحًا حتى لا تُحتسب المصروفات مرتين.</p>
    </div>}
    {tab === "providers" && <div style={styles.card}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10}}><h3>مقدمو الخدمات</h3>{canEdit&&<Button onClick={()=>setProviderForm({name:"",serviceCategory:"",phone:"",email:"",notes:"",rating:""})}>＋ مقدم خدمة</Button>}</div>
      {data.providers.map(p=><Row key={p.id} title={p.name} meta={[p.serviceCategory,p.phone,p.email,p.rating&&"التقييم "+p.rating+"/5"].filter(Boolean).join(" · ")}>{canEdit&&<Button secondary onClick={()=>setProviderForm({...p})}>تعديل</Button>}</Row>)}
      {providerForm&&<form onSubmit={saveProvider} style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:10,marginTop:12}}>
        <Field label="الاسم *">{input(providerForm.name,v=>setProviderForm({...providerForm,name:v}))}</Field><Field label="نوع الخدمة">{input(providerForm.serviceCategory,v=>setProviderForm({...providerForm,serviceCategory:v}))}</Field><Field label="الهاتف">{input(providerForm.phone,v=>setProviderForm({...providerForm,phone:v}),"tel")}</Field><Field label="البريد">{input(providerForm.email,v=>setProviderForm({...providerForm,email:v}),"email")}</Field><Field label="التقييم"><Select value={providerForm.rating||""} onChange={e=>setProviderForm({...providerForm,rating:e.target.value})}><option value="">بدون تقييم</option>{[1,2,3,4,5].map(n=><option key={n} value={n}>{n}/5</option>)}</Select></Field><Field label="ملاحظات">{input(providerForm.notes,v=>setProviderForm({...providerForm,notes:v}))}</Field><div style={{display:"flex",gap:8,alignItems:"end"}}><Button type="submit" disabled={saving}>حفظ مقدم الخدمة</Button><Button type="button" secondary onClick={()=>setProviderForm(null)}>إلغاء</Button></div>
      </form>}
    </div>}
    {tab === "reports" && <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:10}}>
      {[[ "المهام النشطة",activeTasks.length ],["المهام المكتملة",data.completions.filter(x=>x.outcome==="done").length],["الصيانة المفتوحة",pendingMaintenance.length],["طلبات شراء معلقة",pendingPurchases.length],["فواتير متأخرة",overdueBills.length],["قيمة طلبات الشراء",currency(data.purchaseRequests.reduce((sum,p)=>sum+deriveHomePurchaseTotal(linesFor(p.id)),0))],["تكلفة الصيانة المسجلة",currency(data.maintenance.reduce((sum,m)=>sum+Number(m.costAmount||0),0))],["قيمة الفواتير المسجلة",currency(data.bills.reduce((sum,b)=>sum+Number(b.amount||0),0))]].map(([label,value])=><div key={label} style={styles.card}><div style={{fontSize:11,color:"#766F64"}}>{label}</div><div style={{fontSize:23,fontWeight:900,marginTop:8}}>{value}</div></div>)}
      <div style={{...styles.card,gridColumn:"1/-1"}}><h3>مواعيد تحتاج متابعة</h3>{[...activeTasks.filter(t=>t.dueDate&&t.dueDate<today()).map(t=>({title:t.title,date:t.dueDate,type:"مهمة متأخرة"})),...data.maintenance.filter(m=>m.nextMaintenanceDate&&m.nextMaintenanceDate<=today()&&m.status!=="completed").map(m=>({title:m.title,date:m.nextMaintenanceDate,type:"صيانة مستحقة"})),...overdueBills.map(b=>({title:b.title,date:b.dueDate,type:"فاتورة متأخرة"}))].sort((a,b)=>a.date.localeCompare(b.date)).map((x,i)=><Row key={i} title={x.title} meta={x.type+" · "+x.date}/>)}{!activeTasks.some(t=>t.dueDate&&t.dueDate<today())&&!data.maintenance.some(m=>m.nextMaintenanceDate&&m.nextMaintenanceDate<=today()&&m.status!=="completed")&&!overdueBills.length&&<p style={{fontSize:12,color:"#766F64"}}>لا توجد استحقاقات متأخرة وفق البيانات الحالية.</p>}</div>
    </div>}
    {saving && <div style={{fontSize:11,color:"#766F64"}}>جارٍ الحفظ…</div>}
  </div>;
}
