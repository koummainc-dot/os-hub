import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AccessDenied } from "../../core/ui.jsx";
import { osSectionLevel } from "../../core/core.js";
import { createHomeRepository } from "./repository.js";
import HomeOperations from "./operations.jsx";
import { normalizeHomeData, HOME_ITEM_TYPES, HOME_ITEM_CONDITIONS, HOME_STOCK_UNITS, HOME_ROOM_TYPES, validateHomeProperty, validateHomeRoom, validateHomeItem, validateHomeMovement, applyHomeMovement, deriveStockState, deriveWarrantyState, deriveRoomHealth } from "./domain.js";

const C = { ink: "#25231F", muted: "#766F64", line: "#E8E1D7", bg: "#FBF9F5", accent: "#EA580C", white: "#fff" };
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const uid = () => globalThis.crypto?.randomUUID?.() || "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, ch => { const r = Math.random() * 16 | 0; return (ch === "x" ? r : (r & 3 | 8)).toString(16); });
const labels = { asset: "أصل", consumable: "مستهلك", tool: "أداة", furniture: "أثاث", textile: "مفروشات", document: "مستند", misc: "متفرقات", good: "سليم", broken: "معطّل", dispose: "للتخلص", piece: "قطعة", pack: "عبوة", kg: "كيلو", liter: "لتر", box: "علبة", bedroom: "غرفة نوم", kitchen: "مطبخ", bathroom: "حمام", living: "صالة", office: "مكتب", balcony: "بلكونة", storage: "مخزن", outdoor: "خارجي", general: "عام / البيت كله" };
const blank = () => normalizeHomeData({ properties: [{ id: "home-default-property", name: "المنزل", isDefault: true, createdAt: today() }], rooms: [{ id: "home-general-room", propertyId: "home-default-property", name: "عام / البيت كله", type: "general", floor: "", notes: "", createdAt: today() }] });
export const demoSeed = () => ({ ...blank(), items: [{ id: "home-demo-rice", propertyId: "home-default-property", roomId: "home-general-room", name: "أرز", type: "consumable", category: "طعام", condition: "good", unit: "kg", quantity: 2, minimumQuantity: 3, unitPrice: 45, currency: "EGP", expiryDate: "", warrantyUntil: "", notes: "مثال تجريبي فقط", createdAt: today(), updatedAt: today() }] });

function Button({ children, onClick, secondary = false, disabled = false, type = "button" }) {
  return <button type={type} disabled={disabled} onClick={onClick} style={{ border: "1px solid " + (secondary ? C.line : C.accent), borderRadius: 9, padding: "9px 13px", background: secondary ? C.white : C.accent, color: secondary ? C.ink : C.white, font: "inherit", fontSize: 12, fontWeight: 750, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? .55 : 1 }}>{children}</button>;
}
function Field({ label, children }) { return <label style={{ display: "grid", gap: 5, color: C.muted, fontSize: 11, fontWeight: 700 }}>{label}{children}</label>; }
function Input(props) { return <input {...props} style={{ width: "100%", boxSizing: "border-box", border: "1px solid #D9D1C5", borderRadius: 8, padding: "9px 10px", background: "#fff", font: "inherit", fontSize: 12, ...props.style }} />; }
function Select({ children, ...props }) { return <select {...props} style={{ width: "100%", boxSizing: "border-box", border: "1px solid #D9D1C5", borderRadius: 8, padding: "9px 10px", background: "#fff", font: "inherit", fontSize: 12 }}>{children}</select>; }
function Card({ children }) { return <div style={{ background: C.white, border: "1px solid " + C.line, borderRadius: 14, padding: 16 }}>{children}</div>; }

function HomeSystem({ api, access, ws, isDemo = false, page = "dashboard", setPage, shell }) {
  const repository = useMemo(() => createHomeRepository(api), [api]);
  const [data, setData] = useState(blank);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [propertyForm, setPropertyForm] = useState(null);
  const [roomForm, setRoomForm] = useState(null);
  const [itemForm, setItemForm] = useState(null);
  const [movementForm, setMovementForm] = useState(null);
  const [filter, setFilter] = useState("");
  const level = osSectionLevel(access, page);
  const canEdit = level === "edit";
  const canView = level === "view" || canEdit;
  const activeProperties = data.properties.filter(p => !p.deletedAt);
  const activeRooms = data.rooms.filter(r => !r.deletedAt);
  const activeItems = data.items.filter(i => !i.deletedAt);
  const currentProperty = activeProperties[0];
  const tell = useCallback(message => { setNotice(message); setTimeout(() => setNotice(""), 3500); }, []);

  useEffect(() => {
    let alive = true;
    repository.load().then(result => {
      if (!alive) return;
      const loaded = result?.data ? normalizeHomeData(result.data) : (isDemo ? normalizeHomeData(demoSeed()) : blank());
      if (!loaded.properties.some(p => !p.deletedAt)) {
        const property = { id: uid(), name: "المنزل", isDefault: true, createdAt: today(), updatedAt: today() };
        loaded.properties.push(property);
        loaded.rooms.push({ id: uid(), propertyId: property.id, name: "عام / البيت كله", type: "general", floor: "", notes: "", createdAt: today() });
      }
      // Ensure the general room exists for every active property.
      for (const property of loaded.properties.filter(p => !p.deletedAt)) {
        if (!loaded.rooms.some(r => r.propertyId === property.id && r.type === "general" && !r.deletedAt)) {
          loaded.rooms.push({ id: uid(), propertyId: property.id, name: "عام / البيت كله", type: "general", floor: "", notes: "", createdAt: today() });
        }
      }
      setData(loaded);
      setError(result?.error?.message || "");
    }).catch(e => { if (alive) setError(e?.message || "تعذر تحميل بيانات المنزل."); })
      .finally(() => { if (alive) setReady(true); });
    return () => { alive = false; };
  }, [repository, isDemo]);

  const persist = useCallback(async next => {
    setSaving(true); setError("");
    try {
      const result = await repository.save(next);
      if (result?.error) throw result.error;
      setData(next); tell("تم حفظ التغييرات.");
      return true;
    } catch (e) { setError(e?.message || "تعذر حفظ البيانات."); return false; }
    finally { setSaving(false); }
  }, [repository, tell]);

  const createProperty = async e => {
    e.preventDefault();
    const record = { id: propertyForm?.id || uid(), name: propertyForm.name.trim(), address: propertyForm.address || "", notes: propertyForm.notes || "", createdAt: propertyForm.createdAt || today(), updatedAt: today() };
    const errors = validateHomeProperty(record);
    if (errors.length) return setError(errors.join(" "));
    const exists = data.properties.some(p => p.id === record.id);
    const next = { ...data, properties: exists ? data.properties.map(p => p.id === record.id ? { ...p, ...record } : p) : [...data.properties, record] };
    if (!exists) next.rooms = [...next.rooms, { id: uid(), propertyId: record.id, name: "عام / البيت كله", type: "general", floor: "", notes: "", createdAt: today() }];
    if (await persist(next)) setPropertyForm(null);
  };
  const createRoom = async e => {
    e.preventDefault();
    const record = { id: roomForm?.id || uid(), propertyId: roomForm.propertyId || currentProperty?.id, name: roomForm.name.trim(), type: roomForm.type, floor: roomForm.floor || "", notes: roomForm.notes || "", createdAt: roomForm.createdAt || today(), updatedAt: today() };
    const errors = validateHomeRoom(record, data);
    if (errors.length) return setError(errors.join(" "));
    const exists = data.rooms.some(r => r.id === record.id);
    const next = { ...data, rooms: exists ? data.rooms.map(r => r.id === record.id ? { ...r, ...record } : r) : [...data.rooms, record] };
    if (await persist(next)) setRoomForm(null);
  };
  const createItem = async e => {
    e.preventDefault();
    const record = { id: itemForm?.id || uid(), propertyId: itemForm.propertyId || currentProperty?.id, roomId: itemForm.roomId || null, name: itemForm.name.trim(), type: itemForm.type, category: itemForm.category || "", condition: itemForm.condition, unit: itemForm.unit, quantity: Number(itemForm.quantity), minimumQuantity: Number(itemForm.minimumQuantity || 0), unitPrice: itemForm.unitPrice === "" || itemForm.unitPrice == null ? null : Number(itemForm.unitPrice), currency: itemForm.currency || data.settings.currency || "EGP", purchaseDate: itemForm.purchaseDate || null, warrantyUntil: itemForm.warrantyUntil || null, expiryDate: itemForm.expiryDate || null, model: itemForm.model || "", serialNumber: itemForm.serialNumber || "", notes: itemForm.notes || "", createdAt: itemForm.createdAt || today(), updatedAt: today() };
    const errors = validateHomeItem(record, data);
    if (errors.length) return setError(errors.join(" "));
    const exists = data.items.some(i => i.id === record.id);
    const next = { ...data, items: exists ? data.items.map(i => i.id === record.id ? { ...i, ...record } : i) : [...data.items, record] };
    if (!exists && record.quantity > 0) next.movements = [...next.movements, { id: uid(), itemId: record.id, type: "receive", quantity: record.quantity, occurredAt: new Date().toISOString(), note: "الرصيد الافتتاحي", idempotencyKey: "opening:" + record.id }];
    if (await persist(next)) setItemForm(null);
  };
  const addMovement = async e => {
    e.preventDefault();
    const item = data.items.find(i => i.id === movementForm.itemId && !i.deletedAt);
    const record = { id: uid(), itemId: movementForm.itemId, type: movementForm.type, quantity: Number(movementForm.quantity), occurredAt: new Date().toISOString(), note: movementForm.note || "", idempotencyKey: uid() };
    const errors = validateHomeMovement(record, item);
    if (errors.length) return setError(errors.join(" "));
    const nextItem = applyHomeMovement(item, record);
    const next = { ...data, items: data.items.map(i => i.id === item.id ? nextItem : i), movements: [record, ...data.movements] };
    if (await persist(next)) setMovementForm(null);
  };

  const receivePurchaseItems = useCallback(async (request, lines) => {
    const next = { ...data, items: [...data.items], movements: [...data.movements] };
    const linkedItems = {};
    for (const line of lines) {
      const key = "purchase:" + request.id + ":" + line.id;
      const previous = next.movements.find(m => m.idempotencyKey === key);
      if (previous) { linkedItems[line.id] = previous.itemId; continue; }
      let item = next.items.find(i => i.id === line.inventoryItemId && !i.deletedAt);
      if (!item) {
        const room = next.rooms.find(r => r.propertyId === request.propertyId && r.type === "general" && !r.deletedAt);
        item = { id: uid(), propertyId: request.propertyId, roomId: room?.id || null, name: String(line.name || "مشتريات منزلية").trim(), type: "misc", category: "مشتريات", condition: "good", unit: "piece", quantity: 0, minimumQuantity: 0, unitPrice: line.actualUnitPrice ?? line.estimatedUnitPrice ?? null, currency: request.currency || data.settings.currency || "EGP", purchaseDate: today(), warrantyUntil: null, expiryDate: null, model: "", serialNumber: "", notes: "تم إنشاؤه تلقائيًا من طلب شراء " + request.title, createdAt: today(), updatedAt: today() };
        next.items.push(item);
      }
      const movement = { id: uid(), itemId: item.id, type: "receive", quantity: Number(line.quantity), occurredAt: new Date().toISOString(), note: "استلام طلب شراء: " + request.title, idempotencyKey: key };
      const errors = validateHomeMovement(movement, item);
      if (errors.length) { setError(errors.join(" ")); return null; }
      const updatedItem = applyHomeMovement(item, movement);
      next.items = next.items.map(x => x.id === item.id ? updatedItem : x);
      next.movements.push(movement);
      linkedItems[line.id] = item.id;
    }
    const ok = await persist(next);
    return ok ? { linkedItems } : null;
  }, [data, persist]);

  if (!canView) return <AccessDenied />;
  const pageTabs = [{ id: "dashboard", label: "الرئيسية" }, { id: "rooms", label: "الغرف" }, { id: "inventory", label: "المخزون" }, { id: "tasks", label: "المهام والجدول" }, { id: "maintenance", label: "الصيانة" }, { id: "shopping", label: "المشتريات" }, { id: "bills", label: "الفواتير" }, { id: "providers", label: "مقدمو الخدمات" }, { id: "reports", label: "التقارير" }, { id: "settings", label: "الإعدادات" }];
  const section = pageTabs.some(x => x.id === page) ? page : "dashboard";
  const stockCount = activeItems.filter(i => ["low", "out"].includes(deriveStockState(i))).length;
  const expiringCount = activeItems.filter(i => i.expiryDate && i.expiryDate <= today()).length;
  const cardStyle = { display: "grid", gap: 5, background: "#fff", border: "1px solid " + C.line, borderRadius: 12, padding: 15 };
  const label = value => labels[value] || value || "—";
  const inputStyle = { width: "100%", boxSizing: "border-box", border: "1px solid #D9D1C5", borderRadius: 8, padding: "9px 10px", background: "#fff", font: "inherit", fontSize: 12 };
  const startProperty = property => setPropertyForm(property ? { ...property } : { name: "", address: "", notes: "" });
  const startRoom = room => setRoomForm(room ? { ...room } : { propertyId: currentProperty?.id || "", name: "", type: "bedroom", floor: "", notes: "" });
  const startItem = item => setItemForm(item ? { ...item } : { propertyId: currentProperty?.id || "", roomId: activeRooms.find(r => r.propertyId === currentProperty?.id)?.id || "", name: "", type: "consumable", category: "", condition: "good", unit: "piece", quantity: 1, minimumQuantity: 0, unitPrice: "", currency: data.settings.currency || "EGP", purchaseDate: "", warrantyUntil: "", expiryDate: "", model: "", serialNumber: "", notes: "" });
  const archive = async (kind, id) => {
    if (!window.confirm("أرشفة السجل؟ ستظل بياناته محفوظة ولن يدخل في المؤشرات.")) return;
    const next = { ...data, [kind]: data[kind].map(x => x.id === id ? { ...x, deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() } : x) };
    if (await persist(next)) tell("تمت الأرشفة.");
  };

  return <div dir="rtl" style={{ maxWidth: 1200, margin: "0 auto", color: C.ink }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 18 }}>
      <div><div style={{ fontSize: 26, fontWeight: 900 }}>🏠 إدارة المنزل</div><div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>الممتلكات والغرف والمخزون المنزلي في مكان واحد.</div></div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{canEdit && <><Button onClick={() => startRoom(null)}>＋ غرفة</Button><Button onClick={() => startItem(null)}>＋ عنصر للمخزون</Button></>}</div>
    </div>
    {isDemo && <div style={{ background: "#FFF7ED", border: "1px solid #FED7AA", color: "#9A3412", padding: 10, borderRadius: 10, marginBottom: 12, fontSize: 12 }}>وضع تجريبي — البيانات مؤقتة ولا تُحفظ في قاعدة البيانات الحقيقية.</div>}
    {notice && <div role="status" style={{ padding: 10, background: "#ECFDF5", borderRadius: 9, marginBottom: 12, color: "#166534" }}>{notice}</div>}
    {error && <div role="alert" style={{ padding: 10, background: "#FEF2F2", borderRadius: 9, marginBottom: 12, color: "#B91C1C" }}>{error}<button onClick={() => setError("")} style={{ float: "left", border: 0, background: "transparent", cursor: "pointer" }}>×</button></div>}
    <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 16 }}>{pageTabs.map(t => <button key={t.id} onClick={() => setPage?.(t.id)} style={{ border: "1px solid " + (section === t.id ? C.accent : C.line), background: section === t.id ? "#FFF7ED" : "#fff", borderRadius: 9, padding: "8px 13px", cursor: "pointer", font: "inherit", fontSize: 12, fontWeight: 750 }}>{t.label}</button>)}</div>
    {!ready ? <Card>جاري تحميل بيانات المنزل…</Card> : section === "dashboard" ? <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(155px,1fr))", gap: 10, marginBottom: 16 }}>
        {[["العقارات", activeProperties.length], ["الغرف", activeRooms.length], ["عناصر المخزون", activeItems.length], ["نواقص المخزون", stockCount], ["منتهية الصلاحية", expiringCount]].map(([title, value]) => <div key={title} style={cardStyle}><span style={{ fontSize: 11, color: C.muted }}>{title}</span><strong style={{ fontSize: 24 }}>{value}</strong></div>)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 12 }}>
        <Card><div style={{ fontWeight: 850, marginBottom: 10 }}>الغرف وحالتها</div>{activeRooms.slice(0, 8).map(room => { const health = deriveRoomHealth(room.id, data, today()); return <div key={room.id} style={{ display: "flex", justifyContent: "space-between", gap: 8, borderTop: "1px solid " + C.line, padding: "10px 0", fontSize: 12 }}><span>{room.name}</span><span style={{ color: health.state === "red" ? "#B91C1C" : health.state === "yellow" ? "#A16207" : "#15803D" }}>{health.state === "red" ? "🔴 يحتاج متابعة" : health.state === "yellow" ? "🟡 يحتاج انتباه" : "🟢 جيد"}</span></div>})}{!activeRooms.length && <div style={{ color: C.muted, fontSize: 12 }}>لا توجد غرف بعد.</div>}</Card>
        <Card><div style={{ fontWeight: 850, marginBottom: 10 }}>عناصر تحتاج انتباهًا</div>{activeItems.filter(i => ["low", "out"].includes(deriveStockState(i)) || (i.expiryDate && i.expiryDate <= today()) || deriveWarrantyState(i, today()) === "expiring").slice(0, 8).map(item => <div key={item.id} style={{ borderTop: "1px solid " + C.line, padding: "10px 0", fontSize: 12 }}><div style={{ fontWeight: 750 }}>{item.name}</div><div style={{ color: C.muted, marginTop: 3 }}>{deriveStockState(item) === "out" ? "نفد المخزون" : deriveStockState(item) === "low" ? "وصل إلى الحد الأدنى" : item.expiryDate && item.expiryDate <= today() ? "انتهت الصلاحية" : "الضمان يقترب من الانتهاء"}</div></div>)}{!activeItems.some(i => ["low", "out"].includes(deriveStockState(i)) || (i.expiryDate && i.expiryDate <= today()) || deriveWarrantyState(i, today()) === "expiring") && <div style={{ color: C.muted, fontSize: 12 }}>لا توجد تنبيهات مخزون حاليًا.</div>}</Card>
      </div>
    </> : section === "rooms" ? <Card>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 12 }}><div style={{ fontWeight: 850, fontSize: 17 }}>الغرف</div>{canEdit && <div style={{ display: "flex", gap: 8 }}><Button secondary onClick={() => startProperty(null)}>＋ عقار</Button><Button onClick={() => startRoom(null)}>＋ غرفة</Button></div>}</div>
      {activeProperties.map(property => <div key={property.id} style={{ marginBottom: 18 }}><div style={{ fontWeight: 850, marginBottom: 8 }}>{property.name} <span style={{ color: C.muted, fontSize: 11 }}>· {property.address || "دون عنوان"}</span></div>{activeRooms.filter(r => r.propertyId === property.id).map(room => { const health = deriveRoomHealth(room.id, data, today()); return <div key={room.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, padding: "11px 0", borderTop: "1px solid " + C.line }}><div><div style={{ fontWeight: 750, fontSize: 13 }}>{room.name}</div><div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>{label(room.type)}{room.floor ? " · " + room.floor : ""} · {health.itemCount} عنصر · {health.lowStock} نواقص</div></div><div style={{ display: "flex", gap: 6, alignItems: "center" }}>{canEdit && <><Button secondary onClick={() => startRoom(room)}>تعديل</Button>{room.type !== "general" && <Button secondary onClick={() => archive("rooms", room.id)}>أرشفة</Button>}</>}</div></div>})}</div>)}
      {propertyForm && <form onSubmit={createProperty} style={{ borderTop: "1px solid " + C.line, paddingTop: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10 }}><Field label="اسم العقار *"><Input required value={propertyForm.name} onChange={e => setPropertyForm({ ...propertyForm, name: e.target.value })} /></Field><Field label="العنوان"><Input value={propertyForm.address || ""} onChange={e => setPropertyForm({ ...propertyForm, address: e.target.value })} /></Field><Field label="ملاحظات"><Input value={propertyForm.notes || ""} onChange={e => setPropertyForm({ ...propertyForm, notes: e.target.value })} /></Field><div style={{ display: "flex", alignItems: "end", gap: 8 }}><Button type="submit" disabled={saving}>حفظ العقار</Button><Button secondary onClick={() => setPropertyForm(null)}>إلغاء</Button></div></form>}
      {roomForm && <form onSubmit={createRoom} style={{ borderTop: "1px solid " + C.line, paddingTop: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10 }}><Field label="العقار *"><Select value={roomForm.propertyId} onChange={e => setRoomForm({ ...roomForm, propertyId: e.target.value })}>{activeProperties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field><Field label="اسم الغرفة *"><Input required value={roomForm.name} onChange={e => setRoomForm({ ...roomForm, name: e.target.value })} /></Field><Field label="النوع"><Select value={roomForm.type} onChange={e => setRoomForm({ ...roomForm, type: e.target.value })}>{HOME_ROOM_TYPES.map(t => <option key={t} value={t}>{label(t)}</option>)}</Select></Field><Field label="الطابق / الموقع"><Input value={roomForm.floor || ""} onChange={e => setRoomForm({ ...roomForm, floor: e.target.value })} /></Field><div style={{ display: "flex", alignItems: "end", gap: 8 }}><Button type="submit" disabled={saving}>حفظ الغرفة</Button><Button secondary onClick={() => setRoomForm(null)}>إلغاء</Button></div></form>}
    </Card> : section === "inventory" ? <Card>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 12 }}><div style={{ fontWeight: 850, fontSize: 17 }}>المخزون المنزلي</div>{canEdit && <Button onClick={() => startItem(null)}>＋ إضافة عنصر</Button>}</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}><Input placeholder="ابحث بالاسم أو الفئة…" value={filter} onChange={e => setFilter(e.target.value)} /><Button secondary onClick={() => setMovementForm({ itemId: activeItems[0]?.id || "", type: "receive", quantity: 1, note: "" })} disabled={!canEdit || !activeItems.length}>حركة مخزون</Button></div>
      <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 690 }}><thead><tr>{["العنصر", "النوع", "الغرفة", "الكمية", "الحالة", "الصلاحية / الضمان", ""].map(h => <th key={h} style={{ textAlign: "right", padding: 9, color: C.muted, borderBottom: "1px solid " + C.line }}>{h}</th>)}</tr></thead><tbody>{activeItems.filter(i => (i.name + " " + i.category).toLowerCase().includes(filter.toLowerCase())).map(item => <tr key={item.id}><td style={{ padding: 9, borderBottom: "1px solid " + C.line }}><div style={{ fontWeight: 800 }}>{item.name}</div><div style={{ color: C.muted, fontSize: 10 }}>{item.category || "بلا فئة"} · {label(item.condition)}</div></td><td style={{ padding: 9, borderBottom: "1px solid " + C.line }}>{label(item.type)}</td><td style={{ padding: 9, borderBottom: "1px solid " + C.line }}>{activeRooms.find(r => r.id === item.roomId)?.name || "عام / البيت كله"}</td><td style={{ padding: 9, borderBottom: "1px solid " + C.line }}>{item.quantity} {label(item.unit)}</td><td style={{ padding: 9, borderBottom: "1px solid " + C.line }}><span style={{ color: deriveStockState(item) === "out" ? "#B91C1C" : deriveStockState(item) === "low" ? "#A16207" : "#15803D" }}>{deriveStockState(item) === "out" ? "نفد" : deriveStockState(item) === "low" ? "ناقص" : "متوفر"}</span></td><td style={{ padding: 9, borderBottom: "1px solid " + C.line }}>{item.expiryDate || item.warrantyUntil || "—"}</td><td style={{ padding: 9, borderBottom: "1px solid " + C.line }}>{canEdit && <div style={{ display: "flex", gap: 5 }}><Button secondary onClick={() => startItem(item)}>تعديل</Button><Button secondary onClick={() => archive("items", item.id)}>أرشفة</Button></div>}</td></tr>)}</tbody></table></div>
      {itemForm && <form onSubmit={createItem} style={{ marginTop: 16, borderTop: "1px solid " + C.line, paddingTop: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(165px,1fr))", gap: 10 }}><Field label="اسم العنصر *"><Input required value={itemForm.name} onChange={e => setItemForm({ ...itemForm, name: e.target.value })} /></Field><Field label="العقار"><Select value={itemForm.propertyId} onChange={e => setItemForm({ ...itemForm, propertyId: e.target.value, roomId: "" })}>{activeProperties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field><Field label="الغرفة"><Select value={itemForm.roomId || ""} onChange={e => setItemForm({ ...itemForm, roomId: e.target.value })}><option value="">عام / البيت كله</option>{activeRooms.filter(r => r.propertyId === itemForm.propertyId).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</Select></Field><Field label="النوع"><Select value={itemForm.type} onChange={e => setItemForm({ ...itemForm, type: e.target.value })}>{HOME_ITEM_TYPES.map(t => <option key={t} value={t}>{label(t)}</option>)}</Select></Field><Field label="الفئة"><Input value={itemForm.category || ""} onChange={e => setItemForm({ ...itemForm, category: e.target.value })} /></Field><Field label="الحالة"><Select value={itemForm.condition} onChange={e => setItemForm({ ...itemForm, condition: e.target.value })}>{HOME_ITEM_CONDITIONS.map(t => <option key={t} value={t}>{label(t)}</option>)}</Select></Field><Field label="الوحدة"><Select value={itemForm.unit} onChange={e => setItemForm({ ...itemForm, unit: e.target.value })}>{HOME_STOCK_UNITS.map(t => <option key={t} value={t}>{label(t)}</option>)}</Select></Field><Field label="الكمية *"><Input required type="number" min="0" step="any" value={itemForm.quantity} onChange={e => setItemForm({ ...itemForm, quantity: e.target.value })} /></Field><Field label="الحد الأدنى"><Input type="number" min="0" step="any" value={itemForm.minimumQuantity} onChange={e => setItemForm({ ...itemForm, minimumQuantity: e.target.value })} /></Field><Field label="سعر الوحدة"><Input type="number" min="0" step="any" value={itemForm.unitPrice ?? ""} onChange={e => setItemForm({ ...itemForm, unitPrice: e.target.value })} /></Field><Field label="تاريخ الشراء"><Input type="date" value={itemForm.purchaseDate || ""} onChange={e => setItemForm({ ...itemForm, purchaseDate: e.target.value })} /></Field><Field label="نهاية الضمان"><Input type="date" value={itemForm.warrantyUntil || ""} onChange={e => setItemForm({ ...itemForm, warrantyUntil: e.target.value })} /></Field><Field label="انتهاء الصلاحية"><Input type="date" value={itemForm.expiryDate || ""} onChange={e => setItemForm({ ...itemForm, expiryDate: e.target.value })} /></Field><Field label="الموديل"><Input value={itemForm.model || ""} onChange={e => setItemForm({ ...itemForm, model: e.target.value })} /></Field><Field label="الرقم التسلسلي"><Input value={itemForm.serialNumber || ""} onChange={e => setItemForm({ ...itemForm, serialNumber: e.target.value })} /></Field><Field label="ملاحظات"><Input value={itemForm.notes || ""} onChange={e => setItemForm({ ...itemForm, notes: e.target.value })} /></Field><div style={{ display: "flex", alignItems: "end", gap: 8 }}><Button type="submit" disabled={saving}>حفظ العنصر</Button><Button secondary onClick={() => setItemForm(null)}>إلغاء</Button></div></form>}
      {movementForm && <form onSubmit={addMovement} style={{ marginTop: 16, borderTop: "1px solid " + C.line, paddingTop: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(165px,1fr))", gap: 10 }}><Field label="العنصر"><Select value={movementForm.itemId} onChange={e => setMovementForm({ ...movementForm, itemId: e.target.value })}>{activeItems.map(i => <option key={i.id} value={i.id}>{i.name} — {i.quantity}</option>)}</Select></Field><Field label="نوع الحركة"><Select value={movementForm.type} onChange={e => setMovementForm({ ...movementForm, type: e.target.value })}><option value="receive">استلام / إضافة</option><option value="consume">استهلاك / صرف</option><option value="adjust">تسوية الكمية</option><option value="dispose">تخلص من كمية</option></Select></Field><Field label="الكمية"><Input type="number" min={movementForm.type === "adjust" ? "0" : "0.001"} step="any" value={movementForm.quantity} onChange={e => setMovementForm({ ...movementForm, quantity: e.target.value })} /></Field><Field label="ملاحظات"><Input value={movementForm.note || ""} onChange={e => setMovementForm({ ...movementForm, note: e.target.value })} /></Field><div style={{ display: "flex", alignItems: "end", gap: 8 }}><Button type="submit" disabled={saving}>تسجيل الحركة</Button><Button secondary onClick={() => setMovementForm(null)}>إلغاء</Button></div></form>}
    </Card> : ["tasks", "maintenance", "shopping", "bills", "providers", "reports"].includes(section) ? <HomeOperations api={api} canEdit={canEdit} isDemo={isDemo} initialTab={section} properties={data.properties} rooms={data.rooms} items={data.items} onReceivePurchase={receivePurchaseItems} /> : <Card><div style={{ fontSize: 17, fontWeight: 850, marginBottom: 12 }}>إعدادات المنزل</div><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10 }}><Field label="العملة"><Select disabled={!canEdit} value={data.settings.currency} onChange={e => persist({ ...data, settings: { ...data.settings, currency: e.target.value } })}><option value="EGP">جنيه مصري (EGP)</option><option value="SAR">ريال سعودي (SAR)</option><option value="USD">دولار أمريكي (USD)</option><option value="AED">درهم إماراتي (AED)</option></Select></Field><Field label="المنطقة الزمنية"><Input disabled={!canEdit} value={data.settings.timezone} onChange={e => setData(d => ({ ...d, settings: { ...d.settings, timezone: e.target.value } }))} onBlur={() => persist(data)} /></Field></div><p style={{ color: C.muted, fontSize: 11, lineHeight: 1.8 }}>إعدادات مستقلة عن الأقسام الأخرى. ستستخدم المنطقة الزمنية في حساب المواعيد المنزلية في المراحل التالية.</p></Card>}
  </div>;
}

export default HomeSystem;
