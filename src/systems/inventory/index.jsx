import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createInventoryRepository } from "./repository.js";
import { deriveLoanState, deriveReplacementState, deriveWarrantyState } from "./domain.js";
import { inventoryToday, inventoryDateOffset, prepareInventoryItem, prepareInventoryCategory, prepareInventoryPlace, archiveInventoryItem, restoreInventoryItem, archiveInventoryReference, prepareRelatedInventoryRecord, returnInventoryLoan } from "./services.js";
import { osSectionLevel } from "../../core/core.js";
import { AccessDenied } from "../../core/ui.jsx";

const GOLD = "#A16207";
const INK = "#211A10";
const MUTED = "#766B5B";
const LINE = "#E8E0D4";
const BG = "#FBF8F2";
const today = () => inventoryToday("Africa/Cairo");
const uid = () => (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : "inv-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 9));
const blank = () => ({ schemaVersion: 1, items: [], categories: [], places: [], warranties: [], loans: [], replacements: [], events: [], services: [], settings: { currency: "EGP", warrantyReminderDays: [30, 7, 1] } });
const buildDemoData = () => ({
  ...blank(),
  categories: [
    { id: "cat-tech", name: "أجهزة إلكترونية", color: "#2563EB", createdAt: today() },
    { id: "cat-home", name: "أدوات شخصية ومنزلية", color: "#0F766E", createdAt: today() },
    { id: "cat-docs", name: "أغراض ومستندات مهمة", color: "#7C3AED", createdAt: today() }
  ],
  places: [{ id: "place-home", name: "المنزل", type: "Home", parentId: "", createdAt: today() }, { id: "place-desk", name: "المكتب", type: "Room", parentId: "place-home", createdAt: today() }],
  items: [
    { id: "item-laptop", name: "لابتوب العمل", categoryId: "cat-tech", placeId: "place-desk", condition: "Good", status: "Owned", quantity: 1, brand: "", model: "", purchaseDate: "", purchasePrice: "", currency: "EGP", estimatedValue: "", sensitivity: "Normal", notes: "مثال تجريبي — يمكنك تعديله أو حذفه.", createdAt: today(), updatedAt: today() },
    { id: "item-headphones", name: "سماعة لاسلكية", categoryId: "cat-tech", placeId: "place-home", condition: "Fair", status: "Owned", quantity: 1, brand: "", model: "", purchaseDate: "", purchasePrice: "", currency: "EGP", estimatedValue: "", sensitivity: "Normal", notes: "", createdAt: today(), updatedAt: today() }
  ],
  warranties: [{ id: "warranty-demo", itemId: "item-headphones", provider: "مثال", startDate: "", endDate: "", policyNumber: "", notes: "سجل تجريبي للعرض فقط." }],
  events: [{ id: "event-demo", itemId: "item-laptop", type: "Acquired", date: today(), note: "إضافة المثال إلى الوضع التجريبي." }]
});
const normalize = (v) => {
  const d = v && typeof v === "object" ? v : {};
  const b = blank();
  return { ...b, ...d, schemaVersion: 1, items: Array.isArray(d.items) ? d.items : [], categories: Array.isArray(d.categories) ? d.categories : [], places: Array.isArray(d.places) ? d.places : [], warranties: Array.isArray(d.warranties) ? d.warranties : [], loans: Array.isArray(d.loans) ? d.loans : [], replacements: Array.isArray(d.replacements) ? d.replacements : [], events: Array.isArray(d.events) ? d.events : [], services: Array.isArray(d.services) ? d.services : [], settings: { ...b.settings, ...(d.settings || {}) } };
};
const conditionLabels = { New: "جديد", Good: "جيد", Fair: "مقبول", Poor: "ضعيف", Damaged: "تالف" };
const statusLabels = { Owned: "مملوك", Loaned: "مُعار", Sold: "مباع", Disposed: "تم التخلص منه", Lost: "مفقود" };
const privacyLabels = { Normal: "عادي", Sensitive: "حساس", Secret: "سري" };
const eventLabels = {
  Acquired: "إضافة ممتلك", ItemUpdated: "تحديث بيانات", Archived: "أرشفة ممتلك", Restored: "استعادة ممتلك",
  Moved: "نقل بين الأماكن", Loaned: "إعارة ممتلك", Returned: "استرجاع ممتلك", Sold: "بيع ممتلك",
  Disposed: "التخلص من ممتلك", Lost: "فقدان ممتلك", Found: "العثور على ممتلك", Corrected: "تصحيح حالة",
  CategoryCreated: "إنشاء تصنيف", CategoryUpdated: "تحديث تصنيف", CategoryArchived: "أرشفة تصنيف",
  PlaceCreated: "إنشاء مكان", PlaceUpdated: "تحديث مكان", PlaceArchived: "أرشفة مكان",
  WarrantyAdded: "إضافة ضمان", WarrantyUpdated: "تحديث ضمان", LoanCreated: "تسجيل إعارة", LoanUpdated: "تحديث إعارة",
  LoanReturned: "تسجيل إرجاع", ReplacementPlanned: "خطة استبدال", ReplacementUpdated: "تحديث خطة استبدال",
  ServiceRecorded: "تسجيل صيانة", ServiceUpdated: "تحديث سجل صيانة"
};
const statusTransitionLabels = { Owned: "مملوك", Loaned: "مُعار", Sold: "مباع", Disposed: "تم التخلص منه", Lost: "مفقود" };
const money = (value, currency = "EGP") => {
  if (value === "" || value === null || value === undefined) return "غير مُسجّل";
  try { return new Intl.NumberFormat("ar-EG", { style: "currency", currency, maximumFractionDigits: 2 }).format(Number(value)); } catch { return String(value) + " " + currency; }
};
const card = { background: "#fff", border: "1px solid " + LINE, borderRadius: 14, padding: 16, boxShadow: "0 4px 14px rgba(45,32,9,.035)" };
const input = { width: "100%", boxSizing: "border-box", border: "1px solid #D9D0C2", borderRadius: 9, padding: "9px 11px", background: "#fff", color: INK, font: "inherit", fontSize: 13 };
function Btn({ children, onClick, secondary = false, disabled = false, type = "button" }) {
  return <button type={type} disabled={disabled} onClick={onClick} style={{ border: secondary ? "1px solid " + LINE : "1px solid " + GOLD, borderRadius: 9, padding: "9px 13px", background: secondary ? "#fff" : GOLD, color: secondary ? INK : "#fff", font: "inherit", fontSize: 12, fontWeight: 750, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? .6 : 1 }}>{children}</button>;
}
function Field({ label, children }) { return <label style={{ display: "grid", gap: 5, color: MUTED, fontSize: 11, fontWeight: 750 }}>{label}{children}</label>; }
function PanelTitle({ title, sub, right }) { return <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 15 }}><div><div style={{ fontSize: 21, fontWeight: 850, color: INK }}>{title}</div>{sub && <div style={{ fontSize: 12, color: MUTED, marginTop: 4 }}>{sub}</div>}</div>{right}</div>; }
function Badge({ children, tone = "neutral" }) { const colors = tone === "good" ? ["#E7F6EB", "#166534"] : tone === "warn" ? ["#FFF3D7", "#92400E"] : tone === "bad" ? ["#FDE8E7", "#B42318"] : ["#F2EEE6", "#625748"]; return <span style={{ display: "inline-flex", borderRadius: 20, padding: "3px 8px", background: colors[0], color: colors[1], fontSize: 10.5, fontWeight: 750, whiteSpace: "nowrap" }}>{children}</span>; }

function InventorySystem({ api, access, ws, isDemo = false, page = "home", setPage, shell }) {
  const [data, setData] = useState(blank);
  const repository = useMemo(() => createInventoryRepository(api, normalize), [api]);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [source, setSource] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showSecretItems, setShowSecretItems] = useState(false);
  const [editor, setEditor] = useState(null);
  const [categoryEditor, setCategoryEditor] = useState(null);
  const [placeEditor, setPlaceEditor] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const level = osSectionLevel(access, page);
  const canEdit = level === "edit";
  const canView = level === "view" || level === "edit";
  const tell = useCallback((message) => { setNotice(message); setTimeout(() => setNotice(""), 4000); }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const result = await repository.load();
        if (!alive) return;
        const loaded = result?.data ? normalize(result.data) : (isDemo ? normalize(buildDemoData()) : blank());
        setData(loaded);
        setSource(result?.source || (isDemo ? "demo" : "empty"));
        setError(result?.error?.message || "");
      } catch (e) {
        if (!alive) return;
        setData(isDemo ? normalize(demoSeed()) : blank());
        setSource(isDemo ? "demo" : "empty");
        setError(e?.message || "تعذر تحميل البيانات");
      } finally { if (alive) setReady(true); }
    })();
    return () => { alive = false; };
  }, [repository, isDemo]);

  const persist = useCallback(async (next, success = "تم حفظ التغييرات") => {
    const previousData = data;
    setData(next);
    setSaving(true);
    try {
      const result = await repository.save(next);
      if (result && result.ok === false) {
        setData(previousData);
        setError(result.conflict ? "توجد نسخة أحدث على الخادم. أعد تحميل البيانات قبل الحفظ لتجنب الكتابة فوقها." : "تعذر تأكيد الحفظ على الخادم. قد تكون النسخة المحلية أحدث.");
        tell("⚠ لم يتأكد الحفظ على الخادم؛ تم التراجع عن التغيير المحلي. راجع الاتصال ثم أعد المحاولة.");
        return false;
      } else {
        setError("");
        tell(isDemo ? "تم الحفظ داخل الوضع التجريبي" : success);
        return true;
      }
    } catch (e) {
      setData(previousData);
      setError(e?.message || "تعذر حفظ البيانات");
      tell("⚠ تعذر تأكيد الحفظ؛ تم التراجع عن التغيير المحلي.");
      return false;
    } finally { setSaving(false); }
  }, [repository, isDemo, tell, data]);

  const categories = data.categories.filter(x => !x.deletedAt);
  const places = data.places.filter(x => !x.deletedAt);
  const items = data.items.filter(x => !x.deletedAt);
  // Secret items are intentionally excluded from broad lists and search until
  // item-level authorization and secure detail handling are implemented.
  const visibleItems = items.filter(x => x.sensitivity !== "Secret");
  const getCategory = id => categories.find(x => x.id === id)?.name || "بدون تصنيف";
  const getPlace = id => places.find(x => x.id === id)?.name || "غير محدد";
  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = showSecretItems && !q ? items : visibleItems;
    return list.filter(item => {
    const matches = !q || [item.name, item.brand, item.model].some(v => String(v || "").toLowerCase().includes(q));
    return matches && (!categoryFilter || item.categoryId === categoryFilter) && (!statusFilter || item.status === statusFilter);
    });
  }, [items, visibleItems, showSecretItems, query, categoryFilter, statusFilter]);

  const saveItem = async (form) => {
    const prepared = prepareInventoryItem(form, data, today(), uid);
    if (prepared.errors.length) return tell(prepared.errors[0]);
    const saved = await persist(prepared.data, "تم حفظ العنصر");
    if (!saved) return;
    setEditor(null); setSelectedId(prepared.item.id); setPage("items");
  };
  const saveCategory = async (form) => {
    const prepared = prepareInventoryCategory(form, data, today(), uid);
    if (prepared.error) return tell(prepared.error);
    const saved = await persist(prepared.data, "تم حفظ التصنيف");
    if (saved) setCategoryEditor(null);
  };
  const savePlace = async (form) => {
    const prepared = prepareInventoryPlace(form, data, today(), uid);
    if (prepared.error) return tell(prepared.error);
    const saved = await persist(prepared.data, "تم حفظ المكان");
    if (saved) setPlaceEditor(null);
  };
  const removeItem = async (id) => {
    const prepared = archiveInventoryItem(data, id, today(), uid);
    if (prepared.error) return tell(prepared.error);
    const saved = await persist(prepared.data, "تم نقل العنصر إلى الأرشيف");
    if (saved) { setConfirmDelete(null); setSelectedId(null); }
  };
  const archiveRow = async (kind, id) => {
    const prepared = archiveInventoryReference(data, kind, id, today(), uid);
    if (prepared.error) return tell(prepared.error);
    await persist(prepared.data, "تمت الأرشفة");
  };

  if (!ready) return <div style={{ ...card, padding: 40, textAlign: "center", color: MUTED }}>جاري تحميل الممتلكات…</div>;
  if (!canView) return <AccessDenied />;

  const nav = [
    { id: "home", label: "الرئيسية", icon: "⌂" }, { id: "items", label: "الأصناف", icon: "📦" },
    { id: "categories", label: "التصنيفات", icon: "🗂️" }, { id: "places", label: "الأماكن", icon: "📍" },
    { id: "warranty", label: "الضمان", icon: "🛡️" }, { id: "replacement", label: "الاستبدال", icon: "♻️" },
    { id: "documents", label: "المستندات", icon: "📄" }, { id: "loans", label: "الإعارات", icon: "🤝" },
    { id: "history", label: "التاريخ", icon: "🕘" }, { id: "audit", label: "الجرد", icon: "☑️" },
    { id: "collections", label: "المجموعات", icon: "🎒" }, { id: "maintenance", label: "الصيانة", icon: "🔧" },
    { id: "archive", label: "الأرشيف", icon: "🗄️" }, { id: "settings", label: "الإعدادات", icon: "⚙️" }
  ];
  const sectionNames = Object.fromEntries(nav.map(n => [n.id, n.label]));
  const header = <PanelTitle title={(nav.find(n => n.id === page)?.icon || "🧳") + " " + (sectionNames[page] || "الممتلكات الشخصية")} sub={ws?.name ? "المساحة: " + ws.name : "جرد ممتلكاتك ومتابعة الضمان والإعارات"} right={<div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>{saving && <Badge tone="warn">جارٍ الحفظ…</Badge>}<Badge tone={isDemo ? "warn" : "good"}>{isDemo ? "وضع تجريبي" : "بيانات المساحة"}</Badge>{canEdit && <Btn onClick={() => setEditor({ id: "", name: "", categoryId: "", placeId: "", condition: "Good", status: "Owned", quantity: "1", brand: "", model: "", purchaseDate: "", purchasePrice: "", currency: data.settings.currency || "EGP", estimatedValue: "", sensitivity: "Normal", notes: "" })}>＋ إضافة ممتلك</Btn>}</div>} />;



  const metric = (label, value, icon, detail) => <div key={label} style={{ ...card, minWidth: 0 }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}><span style={{ fontSize: 12, color: MUTED }}>{label}</span><span style={{ fontSize: 20 }}>{icon}</span></div><div style={{ fontSize: 28, fontWeight: 850, color: INK, marginTop: 8 }}>{value}</div><div style={{ fontSize: 11, color: MUTED, marginTop: 3 }}>{detail}</div></div>;
  const itemRow = item => <div key={item.id} onClick={() => { setSelectedId(item.id); setPage("items"); }} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 10, alignItems: "center", padding: "12px 0", borderBottom: "1px solid " + LINE, cursor: "pointer" }}><div style={{ minWidth: 0 }}><div style={{ fontWeight: 750, fontSize: 13, color: INK, overflowWrap: "anywhere" }}>{item.name}</div><div style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>{getCategory(item.categoryId)} · {getPlace(item.placeId)}</div></div><div style={{ display: "flex", gap: 5, flexWrap: "wrap", justifyContent: "flex-end" }}><Badge>{conditionLabels[item.condition] || item.condition}</Badge><Badge tone={item.status === "Owned" ? "good" : "warn"}>{statusLabels[item.status] || item.status}</Badge></div></div>;

  const visibleItemIds = new Set(visibleItems.map(item => item.id));
  const visibleEvents = data.events.filter(e => !e.itemId || !data.items.some(x => x.id === e.itemId && x.sensitivity === "Secret"));
  const warrantyDue = data.warranties.filter(w => visibleItemIds.has(w.itemId) && w.endDate && w.endDate >= today() && w.endDate <= inventoryDateOffset(30, "Africa/Cairo"));
  const openLoans = data.loans.filter(l => visibleItemIds.has(l.itemId) && !l.returnedAt && l.status !== "Returned");
  const replacementDue = data.replacements.filter(r => visibleItemIds.has(r.itemId) && r.expectedDate && r.expectedDate <= inventoryDateOffset(60, "Africa/Cairo") && !["Completed","Cancelled"].includes(r.status));

  let body;
  if (page === "home") body = <>
    {header}
    {error && <div role="status" style={{ ...card, marginBottom: 12, borderColor: "#E5B7A7", color: "#9A3412", fontSize: 12 }}>{error}</div>}
    {notice && <div role="status" style={{ ...card, marginBottom: 12, borderColor: "#B8D8BE", color: "#166534", fontSize: 12 }}>{notice}</div>}
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(165px,1fr))", gap: 12, marginBottom: 16 }}>
      {metric("إجمالي الممتلكات", visibleItems.length, "📦", "العناصر النشطة · العناصر السرية مخفية") }
      {metric("التصنيفات", categories.length, "🗂️", "تصنيفات متاحة")}
      {metric("الضمانات القريبة", warrantyDue.length, "🛡️", "خلال 30 يومًا")}
      {metric("إعارات مفتوحة", openLoans.length, "🤝", "بانتظار الإرجاع")}
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 14 }}>
      <div style={card}><PanelTitle title="آخر الممتلكات" sub="افتح العنصر لمشاهدة التفاصيل" right={<Btn secondary onClick={() => setPage("items")}>عرض الكل</Btn>} />{visibleItems.slice(0,5).map(itemRow)}{!visibleItems.length && <div style={{ color: MUTED, fontSize: 12, padding: 18, textAlign: "center" }}>لم تضف أي ممتلكات بعد.</div>}</div>
      <div style={card}><PanelTitle title="اختصارات" sub="ابدأ بالحد الأدنى ثم أكمل التفاصيل" />{[{id:"items",label:"إضافة أو استعراض الممتلكات",icon:"📦"},{id:"categories",label:"تنظيم التصنيفات",icon:"🗂️"},{id:"places",label:"تحديد أماكن التخزين",icon:"📍"},{id:"warranty",label:"متابعة الضمان",icon:"🛡️"},{id:"history",label:"مراجعة سجل التغييرات",icon:"🕘"}].map(x=><button key={x.id} onClick={() => setPage(x.id)} style={{ display: "flex", width: "100%", gap: 10, alignItems: "center", textAlign: "right", border: 0, borderBottom: "1px solid " + LINE, background: "transparent", padding: "12px 0", cursor: "pointer", font: "inherit", color: INK }}><span>{x.icon}</span><span style={{ flex: 1, fontSize: 12, fontWeight: 700 }}>{x.label}</span><span style={{ color: MUTED }}>←</span></button>)}<div style={{ marginTop: 12, fontSize: 11, color: MUTED, lineHeight: 1.8 }}>القيم المالية هنا تقديرية للتوثيق فقط، ولا تُضاف إلى صافي الثروة أو معاملات النظام المالي.</div></div>
    </div>
  </>;
  else if (page === "items") body = <>
    {header}
    {error && <div style={{ ...card, marginBottom: 12, color: "#9A3412", fontSize: 12 }}>{error}</div>}
    {notice && <div style={{ ...card, marginBottom: 12, color: "#166534", fontSize: 12 }}>{notice}</div>}
    <div style={{ ...card, marginBottom: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10 }}>
      <Field label="بحث"><input style={input} placeholder="اسم، علامة تجارية، موديل…" value={query} onChange={e => setQuery(e.target.value)} /></Field>
      <Field label="التصنيف"><select style={input} value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}><option value="">كل التصنيفات</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
      <Field label="حالة الملكية"><select style={input} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option value="">كل الحالات</option>{Object.entries(statusLabels).map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: MUTED, alignSelf: "end", padding: "10px 0" }}><input type="checkbox" checked={showSecretItems} onChange={e => setShowSecretItems(e.target.checked)} /> إظهار العناصر السرية في قائمة الأصناف فقط</label>
    </div>
    <div style={card}><PanelTitle title={"الأصناف (" + filteredItems.length + ")"} sub="اضغط على عنصر لعرض تفاصيله." right={canEdit && <Btn onClick={() => setEditor({ id: "", name: "", categoryId: "", placeId: "", condition: "Good", status: "Owned", quantity: "1", currency: data.settings.currency || "EGP", sensitivity: "Normal", notes: "" })}>＋ إضافة</Btn>} />
      {filteredItems.map(item => <div key={item.id} style={{ borderBottom: "1px solid " + LINE }}><div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", flexWrap: "wrap" }}><button onClick={() => setSelectedId(selectedId === item.id ? null : item.id)} style={{ flex: 1, minWidth: 190, textAlign: "right", border: 0, background: "transparent", cursor: "pointer", font: "inherit" }}><div style={{ fontWeight: 800, color: INK, fontSize: 13 }}>{item.name}</div><div style={{ color: MUTED, fontSize: 11, marginTop: 4 }}>{getCategory(item.categoryId)} · {getPlace(item.placeId)} · كمية: {item.quantity ?? "غير معروفة"}</div></button><Badge>{conditionLabels[item.condition] || "غير محدد"}</Badge><Badge tone={item.status === "Owned" ? "good" : "warn"}>{statusLabels[item.status] || item.status}</Badge>{canEdit && <Btn secondary onClick={() => setEditor({ ...item })}>تعديل</Btn>}</div>
        {selectedId === item.id && <div style={{ background: BG, borderRadius: 10, padding: 14, marginBottom: 12 }}><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(155px,1fr))", gap: 12, fontSize: 12 }}><div><span style={{ color: MUTED }}>العلامة/الموديل</span><div style={{ fontWeight: 700, marginTop: 3 }}>{[item.brand,item.model].filter(Boolean).join(" · ") || "غير مسجّل"}</div></div><div><span style={{ color: MUTED }}>تاريخ الشراء</span><div style={{ fontWeight: 700, marginTop: 3 }}>{item.purchaseDate || "غير مسجّل"}</div></div><div><span style={{ color: MUTED }}>سعر الشراء</span><div style={{ fontWeight: 700, marginTop: 3 }}>{money(item.purchasePrice,item.currency || "EGP")}</div></div><div><span style={{ color: MUTED }}>القيمة الحالية (تقدير)</span><div style={{ fontWeight: 700, marginTop: 3 }}>{money(item.estimatedValue,item.currency || "EGP")}</div></div><div><span style={{ color: MUTED }}>الخصوصية</span><div style={{ fontWeight: 700, marginTop: 3 }}>{privacyLabels[item.sensitivity] || "عادي"}</div></div></div>{item.notes && <div style={{ fontSize: 12, marginTop: 10, lineHeight: 1.8 }}>{item.notes}</div>}{canEdit && <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}><Btn onClick={() => setEditor({ ...item })}>تعديل التفاصيل</Btn><Btn secondary onClick={() => setConfirmDelete(item)}>نقل إلى الأرشيف</Btn></div>}</div>}
      </div>)}
      {!filteredItems.length && <div style={{ padding: 28, textAlign: "center", color: MUTED, fontSize: 12 }}>لا توجد نتائج. جرّب تغيير البحث أو أضف ممتلكًا جديدًا.</div>}
    </div>
  </>;
  else if (page === "categories") body = <>
    {header}{notice && <div style={{ ...card, marginBottom: 12, color: "#166534", fontSize: 12 }}>{notice}</div>}
    <div style={card}><PanelTitle title="التصنيفات" sub="استخدم التصنيفات لتسهيل البحث والتقارير." right={canEdit && <Btn onClick={() => setCategoryEditor({ name: "", color: "#A16207" })}>＋ تصنيف</Btn>} />
      {categories.map(c => <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 0", borderBottom: "1px solid " + LINE }}><span style={{ width: 10, height: 10, borderRadius: 4, background: c.color || GOLD }} /><span style={{ flex: 1, fontWeight: 750, fontSize: 13 }}>{c.name}</span><Badge>{visibleItems.filter(i => i.categoryId === c.id).length} عنصر</Badge>{canEdit && <><Btn secondary onClick={() => setCategoryEditor({ ...c })}>تعديل</Btn><Btn secondary onClick={() => archiveRow("category", c.id)}>أرشفة</Btn></>}</div>)}
      {!categories.length && <div style={{ padding: 24, textAlign: "center", color: MUTED, fontSize: 12 }}>لم تُنشأ تصنيفات بعد.</div>}
    </div>
  </>;
  else if (page === "places") body = <>
    {header}{notice && <div style={{ ...card, marginBottom: 12, color: "#166534", fontSize: 12 }}>{notice}</div>}
    <div style={card}><PanelTitle title="الأماكن" sub="حدّد مكان العنصر لتعرف أين يوجد." right={canEdit && <Btn onClick={() => setPlaceEditor({ name: "", type: "Other", parentId: "" })}>＋ مكان</Btn>} />
      {places.map(p => <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 0", borderBottom: "1px solid " + LINE }}><span style={{ fontSize: 18 }}>📍</span><span style={{ flex: 1, fontWeight: 750, fontSize: 13 }}>{p.name}</span><Badge>{p.type || "أخرى"}</Badge>{p.parentId && <span style={{ fontSize: 11, color: MUTED }}>ضمن {getPlace(p.parentId)}</span>}{canEdit && <><Btn secondary onClick={() => setPlaceEditor({ ...p })}>تعديل</Btn><Btn secondary onClick={() => archiveRow("place", p.id)}>أرشفة</Btn></>}</div>)}
      {!places.length && <div style={{ padding: 24, textAlign: "center", color: MUTED, fontSize: 12 }}>لم تُضف أماكن بعد.</div>}
    </div>
  </>;
  else if (page === "warranty") body = <>
    {header}<div style={card}><PanelTitle title="الضمان" sub="متابعة تواريخ الانتهاء. لا يتم إنشاء تنبيهات خارجية في هذه المرحلة." right={canEdit && <Btn onClick={() => setEditor({ kind: "warranty", itemId: visibleItems[0]?.id || "", provider: "", startDate: "", endDate: "", policyNumber: "", notes: "" })}>＋ ضمان</Btn>} />
      {data.warranties.filter(w => visibleItems.some(i => i.id === w.itemId)).map(w => <div key={w.id} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "12px 0", borderBottom: "1px solid " + LINE }}><div style={{ flex: 1, minWidth: 180 }}><div style={{ fontWeight: 750, fontSize: 13 }}>{visibleItems.find(i => i.id === w.itemId)?.name || "عنصر غير متاح في العرض العام"}</div><div style={{ color: MUTED, fontSize: 11, marginTop: 4 }}>{w.provider || "مزود غير محدد"} · رقم الضمان: {w.policyNumber || "غير مسجل"}</div></div><Badge tone={deriveWarrantyState(w, today()) === "Expired" ? "bad" : deriveWarrantyState(w, today()) === "Active" ? "good" : "warn"}>{({ Active: "ساري", Expired: "منتهي", Upcoming: "لم يبدأ", Void: "ملغي", ClaimOpen: "مطالبة مفتوحة", Unknown: "غير محدد" })[deriveWarrantyState(w, today())]}{w.endDate ? " · " + w.endDate : ""}</Badge></div>)}
      {!data.warranties.some(w => visibleItems.some(i => i.id === w.itemId)) && <div style={{ padding: 24, textAlign: "center", color: MUTED, fontSize: 12 }}>لا توجد ضمانات متاحة للعرض بعد.</div>}
    </div>
  </>;
  else if (page === "loans") body = <>
    {header}<div style={card}><PanelTitle title="الإعارات" sub="تتبّع ما أعرتَه أو استعرته وتاريخ الإرجاع." right={canEdit && <Btn onClick={() => setEditor({ kind: "loan", itemId: visibleItems[0]?.id || "", person: "", direction: "Lent", loanedAt: today(), dueDate: "", returnedAt: "", notes: "" })}>＋ إعارة</Btn>} />
      {data.loans.filter(l => visibleItems.some(i => i.id === l.itemId)).map(l => <div key={l.id} style={{ padding: "12px 0", borderBottom: "1px solid " + LINE }}><div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}><b style={{ fontSize: 13 }}>{visibleItems.find(i => i.id === l.itemId)?.name || "عنصر غير متاح في العرض العام"}</b><Badge tone={deriveLoanState(l, today()) === "Returned" ? "good" : deriveLoanState(l, today()) === "Overdue" ? "bad" : "warn"}>{({ Returned: "تم الإرجاع", Overdue: "متأخر", Open: "مفتوح", Unknown: "غير مكتمل" })[deriveLoanState(l, today())]}</Badge></div><div style={{ color: MUTED, fontSize: 11, marginTop: 4 }}>{l.direction === "Borrowed" ? "استعرته من" : "أعرته إلى"} {l.person || "شخص غير محدد"} · الاستحقاق: {l.dueDate || "غير محدد"}</div>{canEdit && !l.returnedAt && <div style={{ marginTop: 8 }}><Btn secondary onClick={async () => { const prepared = returnInventoryLoan(data, l.id, today(), uid); if (prepared.error) return tell(prepared.error); await persist(prepared.data, "تم تسجيل الإرجاع"); }}>تسجيل الإرجاع</Btn></div>}</div>)}
      {!data.loans.some(l => visibleItems.some(i => i.id === l.itemId)) && <div style={{ padding: 24, textAlign: "center", color: MUTED, fontSize: 12 }}>لا توجد إعارات متاحة للعرض.</div>}
    </div>
  </>;
  else if (page === "replacement") body = <>
    {header}<div style={card}><PanelTitle title="خطط الاستبدال" sub="خطط داخلية فقط؛ لا يتم إنشاء مشتريات تلقائيًا." right={canEdit && <Btn onClick={() => setEditor({ kind: "replacement", itemId: visibleItems[0]?.id || "", expectedDate: "", reason: "", budget: "", currency: data.settings.currency || "EGP", status: "Planned" })}>＋ خطة</Btn>} />
      {data.replacements.filter(r => visibleItems.some(i => i.id === r.itemId)).map(r => <div key={r.id} style={{ padding: "12px 0", borderBottom: "1px solid " + LINE }}><b style={{ fontSize: 13 }}>{visibleItems.find(i => i.id === r.itemId)?.name || "عنصر غير متاح في العرض العام"}</b><div style={{ color: MUTED, fontSize: 11, marginTop: 4 }}>{r.reason || "لم يُحدّد السبب"} · التاريخ المتوقع: {r.expectedDate || "غير محدد"} · الميزانية: {money(r.budget,r.currency || "EGP")}</div><div style={{ marginTop: 5 }}><Badge tone={deriveReplacementState(r, today()) === "Due" ? "warn" : "neutral"}>{({ Due: "موعد الاستبدال حان", Completed: "مكتمل", Cancelled: "ملغي", Deferred: "مؤجل", Planned: "مخطط", Considering: "قيد الدراسة", Ready: "جاهز" })[deriveReplacementState(r, today())] || deriveReplacementState(r, today())}</Badge></div></div>)}
      {!data.replacements.some(r => visibleItems.some(i => i.id === r.itemId)) && <div style={{ padding: 24, textAlign: "center", color: MUTED, fontSize: 12 }}>لا توجد خطط استبدال متاحة للعرض.</div>}
    </div>
  </>;
  else if (page === "history" || page === "audit") body = <>
    {header}<div style={card}><PanelTitle title={page === "audit" ? "مراجعة الجرد" : "سجل التاريخ"} sub="سجل التطبيق الحالي للأحداث. سجل التدقيق المركزي يُفعّل مع طبقة الخدمات." />
      {[...visibleEvents].sort((a,b) => String(b.date || "").localeCompare(String(a.date || ""))).map(e => <div key={e.id} style={{ display: "flex", gap: 10, padding: "12px 0", borderBottom: "1px solid " + LINE }}><div style={{ width: 32, height: 32, borderRadius: 9, background: BG, display: "grid", placeItems: "center" }}>🕘</div><div style={{ flex: 1 }}><div style={{ fontWeight: 750, fontSize: 12 }}>{visibleItems.find(i => i.id === e.itemId)?.name || (e.itemId && data.items.some(x => x.id === e.itemId && x.sensitivity === "Secret") ? "سجل خاص مخفي" : "سجل عنصر سابق")}</div><div style={{ color: MUTED, fontSize: 11, marginTop: 3 }}>{eventLabels[e.type] || e.type} · {e.note || "—"}{e.type === "Moved" && <span style={{ display: "block", marginTop: 3 }}>من: {getPlace(e.fromLocationId)} ← إلى: {getPlace(e.toLocationId)}</span>}{e.previousStatus && e.currentStatus && <span style={{ display: "block", marginTop: 3 }}>{statusTransitionLabels[e.previousStatus] || e.previousStatus} ← {statusTransitionLabels[e.currentStatus] || e.currentStatus}</span>}</div></div><span style={{ color: MUTED, fontSize: 11 }}>{e.date || "—"}</span></div>)}
      {!visibleEvents.length && <div style={{ padding: 24, textAlign: "center", color: MUTED, fontSize: 12 }}>لا توجد أحداث متاحة للعرض بعد.</div>}
    </div>
  </>;
  else if (page === "maintenance") body = <>
    {header}<div style={card}><PanelTitle title="الصيانة" sub="احتفظ بتاريخ الإصلاح والفحص ومواعيد الصيانة القادمة." right={canEdit && <Btn onClick={() => setEditor({ kind: "service", itemId: visibleItems[0]?.id || "", date: today(), type: "Maintenance", provider: "", cost: "", currency: data.settings.currency || "EGP", nextDueDate: "", notes: "" })}>＋ سجل صيانة</Btn>} />
      {data.services.filter(s => visibleItems.some(i => i.id === s.itemId)).map(s => <div key={s.id} style={{ padding: "12px 0", borderBottom: "1px solid " + LINE }}><b style={{ fontSize: 13 }}>{visibleItems.find(i => i.id === s.itemId)?.name || "عنصر غير متاح في العرض العام"}</b><div style={{ color: MUTED, fontSize: 11, marginTop: 4 }}>{s.type} · {s.date} · التكلفة: {money(s.cost,s.currency || "EGP")} · الصيانة التالية: {s.nextDueDate || "غير محددة"}</div></div>)}
      {!data.services.some(x => visibleItems.some(i => i.id === x.itemId)) && <div style={{ padding: 24, textAlign: "center", color: MUTED, fontSize: 12 }}>لا توجد سجلات صيانة متاحة للعرض.</div>}
    </div>
  </>;
  else if (page === "documents") body = <>
    {header}<div style={card}><PanelTitle title="المستندات" sub="المرفقات الفعلية ستُربط بنظام الملفات المركزي؛ لا تُرفع ملفات إلى هذا القسم حاليًا." />
      {visibleItems.map(i => <div key={i.id} style={{ padding: "10px 0", borderBottom: "1px solid " + LINE }}><b style={{ fontSize: 12 }}>{i.name}</b><div style={{ color: MUTED, fontSize: 11, marginTop: 4 }}>مراجع الملفات: لم يتم ربط نظام الملفات بعد.</div></div>)}
      {!items.length && <div style={{ color: MUTED, padding: 20, textAlign: "center", fontSize: 12 }}>أضف ممتلكات أولاً.</div>}
    </div>
  </>;
  else if (page === "collections") body = <>
    {header}<div style={card}><PanelTitle title="المجموعات" sub="عرض أولي للممتلكات بحسب التصنيف." />
      {categories.map(c => <div key={c.id} style={{ marginBottom: 14 }}><div style={{ fontWeight: 800, fontSize: 13, marginBottom: 5 }}>{c.name}</div>{visibleItems.filter(i => i.categoryId === c.id).map(itemRow)}{!visibleItems.some(i => i.categoryId === c.id) && <div style={{ color: MUTED, fontSize: 11 }}>لا توجد عناصر في المجموعة.</div>}</div>)}
    </div>
  </>;
  else if (page === "archive") body = <>
    {header}<div style={card}><PanelTitle title="الأرشيف" sub="العناصر المؤرشفة لا تظهر ضمن الجرد النشط." />
      {data.items.filter(i => i.deletedAt && i.sensitivity !== "Secret").map(i => <div key={i.id} style={{ padding: "12px 0", borderBottom: "1px solid " + LINE, display: "flex", gap: 8, alignItems: "center" }}><span style={{ flex: 1, fontSize: 13 }}>{i.name}</span>{canEdit && <Btn secondary onClick={async () => { const prepared = restoreInventoryItem(data, i.id, today(), uid); if (prepared.error) return tell(prepared.error); await persist(prepared.data, "تمت استعادة العنصر"); }}>استعادة</Btn>}</div>)}
      {!data.items.some(i => i.deletedAt && i.sensitivity !== "Secret") && <div style={{ color: MUTED, padding: 24, textAlign: "center", fontSize: 12 }}>الأرشيف فارغ.</div>}
    </div>
  </>;
  else if (page === "settings") body = <>
    {header}<div style={card}><PanelTitle title="الإعدادات" sub="إعدادات افتراضية لهذا النظام." />
      <div style={{ maxWidth: 380, display: "grid", gap: 12 }}><Field label="العملة الافتراضية"><select style={input} value={data.settings.currency || "EGP"} disabled={!canEdit} onChange={e => persist({ ...data, settings: { ...data.settings, currency: e.target.value } }, "تم حفظ الإعدادات")}>{["EGP","USD","SAR","AED","EUR","GBP"].map(c => <option key={c}>{c}</option>)}</select></Field><Field label="أيام التذكير بالضمان (قبل الانتهاء)"><input style={input} value={(data.settings.warrantyReminderDays || []).join(", ")} disabled={!canEdit} onChange={e => setData(d => ({ ...d, settings: { ...d.settings, warrantyReminderDays: e.target.value.split(",").map(x => Number(x.trim())).filter(x => Number.isFinite(x) && x >= 0) } }))} onBlur={() => persist(data, "تم حفظ الإعدادات")} /></Field></div>
      <div style={{ fontSize: 11, color: MUTED, marginTop: 14, lineHeight: 1.8 }}>لا يتم تخزين بيانات حساسة دون اتصال في هذه المرحلة. قيمة الممتلكات التقديرية منفصلة عن حسابات المالية وصافي الثروة.</div>
    </div>
  </>;
  else body = <>{header}<div style={card}>هذا القسم قيد الاستكمال.</div></>;

  return <div dir="rtl" style={{ color: INK, maxWidth: 1120, margin: "0 auto", animation: "fadeIn .25s ease-out" }}>
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", padding: "10px 0 16px" }}>{nav.filter(n => { const l = osSectionLevel(access, n.id); return l !== "none"; }).map(n => <button key={n.id} onClick={() => setPage(n.id)} style={{ border: "1px solid " + (page === n.id ? GOLD : LINE), background: page === n.id ? "#F6E8C8" : "#fff", color: page === n.id ? "#75420B" : MUTED, borderRadius: 9, padding: "7px 10px", font: "inherit", fontSize: 11, fontWeight: 750, cursor: "pointer" }}>{n.icon} {n.label}</button>)}</div>
    {body}
    {notice && page !== "home" && <div role="status" style={{ position: "fixed", bottom: 20, insetInlineEnd: 20, zIndex: 9000, background: "#211A10", color: "#fff", padding: "12px 16px", borderRadius: 10, fontSize: 12, boxShadow: "0 8px 25px #0002" }}>{notice}</div>}
    {editor && (editor.kind === "warranty" || editor.kind === "loan" || editor.kind === "replacement" || editor.kind === "service") && <SimpleEntityForm kind={editor.kind} value={editor} items={items} currency={data.settings.currency || "EGP"} onClose={() => setEditor(null)} onSave={async f => {
      const prepared = prepareRelatedInventoryRecord(f.kind, f, data, today(), uid);
      if (prepared.error) { tell(prepared.error); return; }
      const saved = await persist(prepared.data, "تم حفظ السجل");
      if (saved) setEditor(null);
    }} />}
    {editor && !["warranty","loan","replacement","service"].includes(editor.kind) && <InventoryItemForm categories={categories} places={places} value={editor} onClose={() => setEditor(null)} onSave={saveItem} />}
    {categoryEditor && <InventorySimpleForm kind="category" categories={categories} places={places} value={categoryEditor} onClose={() => setCategoryEditor(null)} onSave={saveCategory} />}
    {placeEditor && <InventorySimpleForm kind="place" categories={categories} places={places} value={placeEditor} onClose={() => setPlaceEditor(null)} onSave={savePlace} />}
    {confirmDelete && <div style={{ position: "fixed", inset: 0, zIndex: 10001, background: "#211A1080", display: "grid", placeItems: "center", padding: 16 }}><div style={{ ...card, width: "min(420px,100%)" }}><div style={{ fontWeight: 850, fontSize: 16 }}>نقل إلى الأرشيف؟</div><p style={{ fontSize: 12, color: MUTED, lineHeight: 1.8 }}>سيختفي «{confirmDelete.name}» من الجرد النشط، مع الاحتفاظ بسجله.</p><div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}><Btn secondary onClick={() => setConfirmDelete(null)}>إلغاء</Btn><Btn onClick={() => removeItem(confirmDelete.id)}>نقل إلى الأرشيف</Btn></div></div></div>}
  </div>;
}


function InventoryItemForm({ categories, places, value, onClose, onSave }) {
  const [form, setForm] = useState(value);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  return <div style={{ position: "fixed", inset: 0, background: "rgba(24,19,12,.45)", zIndex: 10000, display: "grid", placeItems: "center", padding: 16 }}><form onSubmit={e => { e.preventDefault(); onSave(form); }} style={{ ...card, width: "min(760px,100%)", maxHeight: "90vh", overflow: "auto", boxSizing: "border-box" }}>
    <PanelTitle title={form.id ? "تعديل الممتلك" : "إضافة ممتلك جديد"} sub="يمكنك البدء بالاسم فقط وإكمال التفاصيل لاحقاً." />
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 12 }}>
      <Field label="اسم العنصر *"><input style={input} autoFocus value={form.name} onChange={e => set("name", e.target.value)} /></Field>
      <Field label="التصنيف"><select style={input} value={form.categoryId || ""} onChange={e => set("categoryId", e.target.value)}><option value="">بدون تصنيف</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
      <Field label="المكان الحالي"><select style={input} value={form.placeId || ""} onChange={e => set("placeId", e.target.value)}><option value="">غير محدد</option>{places.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
      <Field label="الحالة"><select style={input} value={form.condition || "Good"} onChange={e => set("condition", e.target.value)}>{Object.entries(conditionLabels).map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
      <Field label="حالة الملكية"><select style={input} value={form.status || "Owned"} onChange={e => set("status", e.target.value)}>{Object.entries(statusLabels).map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
      <Field label="الكمية"><input style={input} type="number" min="0" step="0.001" value={form.quantity ?? ""} onChange={e => set("quantity", e.target.value)} /></Field>
      <Field label="العلامة التجارية"><input style={input} value={form.brand || ""} onChange={e => set("brand", e.target.value)} /></Field>
      <Field label="الموديل"><input style={input} value={form.model || ""} onChange={e => set("model", e.target.value)} /></Field>
      <Field label="تاريخ الشراء"><input style={input} type="date" value={form.purchaseDate || ""} onChange={e => set("purchaseDate", e.target.value)} /></Field>
      <Field label="سعر الشراء"><input style={input} type="number" min="0" step="0.01" value={form.purchasePrice || ""} onChange={e => set("purchasePrice", e.target.value)} /></Field>
      <Field label="العملة"><select style={input} value={form.currency || "EGP"} onChange={e => set("currency", e.target.value)}>{["EGP","USD","SAR","AED","EUR","GBP"].map(c => <option key={c}>{c}</option>)}</select></Field>
      <Field label="القيمة الحالية (تقدير)"><input style={input} type="number" min="0" step="0.01" value={form.estimatedValue || ""} onChange={e => set("estimatedValue", e.target.value)} /></Field>
      <Field label="مستوى الخصوصية"><select style={input} value={form.sensitivity || "Normal"} onChange={e => set("sensitivity", e.target.value)}>{Object.entries(privacyLabels).map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
      <Field label="ملاحظات"><textarea style={{ ...input, minHeight: 72, resize: "vertical" }} value={form.notes || ""} onChange={e => set("notes", e.target.value)} /></Field>
    </div>
    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}><Btn type="button" secondary onClick={onClose}>إلغاء</Btn><Btn type="submit">حفظ العنصر</Btn></div>
  </form></div>;
}
function InventorySimpleForm({ kind, categories, places, value, onClose, onSave }) {
  const [form, setForm] = useState(value);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const isCat = kind === "category";
  return <div style={{ position: "fixed", inset: 0, background: "rgba(24,19,12,.45)", zIndex: 10000, display: "grid", placeItems: "center", padding: 16 }}><form onSubmit={e => { e.preventDefault(); onSave(form); }} style={{ ...card, width: "min(480px,100%)", boxSizing: "border-box" }}>
    <PanelTitle title={isCat ? "تصنيف" : "مكان"} sub="أدخل الاسم ثم احفظ." />
    <div style={{ display: "grid", gap: 12 }}><Field label="الاسم *"><input style={input} autoFocus value={form.name || ""} onChange={e => set("name", e.target.value)} /></Field>
    {isCat ? <Field label="اللون"><input style={{ ...input, height: 42, padding: 4 }} type="color" value={form.color || "#A16207"} onChange={e => set("color", e.target.value)} /></Field> : <><Field label="النوع"><select style={input} value={form.type || "Other"} onChange={e => set("type", e.target.value)}>{[["Home","منزل"],["Room","غرفة"],["Storage","تخزين"],["Vehicle","مركبة"],["Workplace","مكان عمل"],["External","مكان خارجي"],["Other","أخرى"]].map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select></Field><Field label="المكان الأب (اختياري)"><select style={input} value={form.parentId || ""} onChange={e => set("parentId", e.target.value)}><option value="">بدون</option>{places.filter(p => p.id !== form.id).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field></>}
    </div><div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}><Btn secondary onClick={onClose}>إلغاء</Btn><Btn type="submit">حفظ</Btn></div>
  </form></div>;
}

function SimpleEntityForm({ kind, value, items, currency, onClose, onSave }) {
  const [form, setForm] = useState(value);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const titles = { warranty: "إضافة ضمان", loan: "تسجيل إعارة", replacement: "خطة استبدال", service: "سجل صيانة" };
  return <div style={{ position: "fixed", inset: 0, zIndex: 10000, background: "#211A1077", display: "grid", placeItems: "center", padding: 16 }}><form onSubmit={e => { e.preventDefault(); onSave(form); }} style={{ background: "#fff", border: "1px solid #E8E0D4", borderRadius: 14, padding: 18, width: "min(520px,100%)", maxHeight: "90vh", overflow: "auto", boxSizing: "border-box" }}>
    <div style={{ fontSize: 18, fontWeight: 850, marginBottom: 14 }}>{titles[kind]}</div>
    <div style={{ display: "grid", gap: 12 }}>
      <Field label="العنصر"><select style={input} required value={form.itemId || ""} onChange={e => set("itemId", e.target.value)}><option value="">اختر عنصرًا</option>{items.filter(i => i.sensitivity !== "Secret").map(i => <option key={i.id} value={i.id}>{i.name}</option>)}</select></Field>
      {kind === "warranty" && <><Field label="المزوّد"><input style={input} value={form.provider || ""} onChange={e => set("provider", e.target.value)} /></Field><Field label="بداية الضمان"><input style={input} type="date" value={form.startDate || ""} onChange={e => set("startDate", e.target.value)} /></Field><Field label="نهاية الضمان"><input style={input} type="date" value={form.endDate || ""} onChange={e => set("endDate", e.target.value)} /></Field><Field label="رقم الضمان"><input style={input} value={form.policyNumber || ""} onChange={e => set("policyNumber", e.target.value)} /></Field></>}
      {kind === "loan" && <><Field label="نوع الإعارة"><select style={input} value={form.direction || "Lent"} onChange={e => set("direction", e.target.value)}><option value="Lent">أعرتُه لشخص</option><option value="Borrowed">استعرته من شخص</option></select></Field><Field label="الشخص"><input style={input} value={form.person || ""} onChange={e => set("person", e.target.value)} /></Field><Field label="تاريخ الإعارة"><input style={input} type="date" value={form.loanedAt || today()} onChange={e => set("loanedAt", e.target.value)} /></Field><Field label="موعد الإرجاع"><input style={input} type="date" value={form.dueDate || ""} onChange={e => set("dueDate", e.target.value)} /></Field></>}
      {kind === "replacement" && <><Field label="التاريخ المتوقع للاستبدال"><input style={input} type="date" value={form.expectedDate || ""} onChange={e => set("expectedDate", e.target.value)} /></Field><Field label="السبب"><input style={input} value={form.reason || ""} onChange={e => set("reason", e.target.value)} /></Field><Field label="الميزانية المتوقعة"><input style={input} type="number" min="0" step="0.01" value={form.budget || ""} onChange={e => set("budget", e.target.value)} /></Field><Field label="الحالة"><select style={input} value={form.status || "Planned"} onChange={e => set("status", e.target.value)}>{[["Planned","مخطط"],["Considering","قيد الدراسة"],["Deferred","مؤجل"],["Ready","جاهز"],["Completed","مكتمل"],["Cancelled","ملغي"]].map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select></Field></>}
      {kind === "service" && <><Field label="نوع الخدمة"><select style={input} value={form.type || "Maintenance"} onChange={e => set("type", e.target.value)}>{[["Maintenance","صيانة"],["Repair","إصلاح"],["Inspection","فحص"],["Cleaning","تنظيف"],["Upgrade","ترقية"],["Other","أخرى"]].map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select></Field><Field label="تاريخ الخدمة"><input style={input} type="date" value={form.date || today()} onChange={e => set("date", e.target.value)} /></Field><Field label="التكلفة"><input style={input} type="number" min="0" step="0.01" value={form.cost || ""} onChange={e => set("cost", e.target.value)} /></Field><Field label="العملة"><select style={input} value={form.currency || currency} onChange={e => set("currency", e.target.value)}>{["EGP","USD","SAR","AED","EUR","GBP"].map(c => <option key={c}>{c}</option>)}</select></Field><Field label="موعد الخدمة القادمة"><input style={input} type="date" value={form.nextDueDate || ""} onChange={e => set("nextDueDate", e.target.value)} /></Field></>}
      <Field label="ملاحظات"><textarea style={{ ...input, minHeight: 60 }} value={form.notes || ""} onChange={e => set("notes", e.target.value)} /></Field>
    </div>
    <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}><Btn secondary onClick={onClose}>إلغاء</Btn><Btn type="submit">حفظ</Btn></div>
  </form></div>;
}

export const demoSeed = () => normalize(buildDemoData());

export default InventorySystem;
