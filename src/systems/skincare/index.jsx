import React, { useMemo, useState } from "react";
import { osSectionLevel } from "../../core/core.js";
import { useRecordStore, arr, live, uid } from "../../core/records.jsx";
import { SKINCARE_COLLECTIONS, validateSkinProfile, validateSkinProduct, validateSkinUnit } from "./domain.js";

const C = { ink: "#182230", muted: "#64748B", line: "#E2E8F0", bg: "#F8FAFC", accent: "#A855F7", soft: "#FAF5FF", white: "#FFFFFF", danger: "#B91C1C" };
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const panel = { background: C.white, border: "1px solid " + C.line, borderRadius: 16, padding: 18, marginBottom: 14 };
const field = { width: "100%", boxSizing: "border-box", padding: "10px 11px", border: "1px solid " + C.line, borderRadius: 10, font: "inherit", color: C.ink, background: C.white };
const label = { display: "grid", gap: 6, color: C.muted, fontSize: 12, fontWeight: 650 };
const button = (primary = false) => ({ border: "1px solid " + (primary ? C.accent : C.line), background: primary ? C.accent : C.white, color: primary ? C.white : C.ink, borderRadius: 10, padding: "9px 13px", font: "inherit", fontSize: 12, fontWeight: 750, cursor: "pointer" });

function Field({ title, value, onChange, type = "text", placeholder = "", required = false }) {
  return <label style={label}>{title}<input style={field} type={type} value={value ?? ""} placeholder={placeholder} required={required} onChange={e => onChange(e.target.value)} /></label>;
}
function Select({ title, value, onChange, options }) {
  return <label style={label}>{title}<select style={field} value={value} onChange={e => onChange(e.target.value)}>{options.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select></label>;
}
function Panel({ title, children, action }) {
  return <section style={panel}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 14 }}><b style={{ fontSize: 15 }}>{title}</b>{action}</div>{children}</section>;
}

const SECTIONS = [
  ["home", "الرئيسية", "⌂"],
  ["settings", "ملف البشرة", "🧴"],
  ["products", "المنتجات", "🧪"],
  ["units", "العبوات", "📦"],
];
const EMPTY_PRODUCT = { name: "", brand: "", category: "other", status: "active", startDate: "", expiryDate: "", ingredients: "", instructions: "", notes: "" };
const EMPTY_UNIT = { name: "", productId: "", openedOn: today(), expiresOn: "", notes: "" };

export default function SkincareOS({ access, ws, isDemo, demoStore, page = "home", setPage = () => {}, shell }) {
  const store = useRecordStore({ wsId: ws?.id || "demo", systemId: "skincare", isDemo, demoStore: demoStore || { current: {} }, seed: () => ({}) , onToast: message => shell?.toast?.(message) });
  const products = useMemo(() => live(arr(store.recs, SKINCARE_COLLECTIONS.products)), [store.recs]);
  const units = useMemo(() => live(arr(store.recs, SKINCARE_COLLECTIONS.units)), [store.recs]);
  const profile = useMemo(() => arr(store.recs, SKINCARE_COLLECTIONS.profile).find(x => x.id === "profile") || null, [store.recs]);
  const [profileDraft, setProfileDraft] = useState({ skinType: "unknown", concernsText: "", sensitivitiesText: "", notes: "" });
  const [productDraft, setProductDraft] = useState(EMPTY_PRODUCT);
  const [unitDraft, setUnitDraft] = useState(EMPTY_UNIT);
  const [editingProduct, setEditingProduct] = useState("");
  const [editingUnit, setEditingUnit] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const level = osSectionLevel(access, page);
  const canEdit = level === "edit";
  const section = SECTIONS.find(x => x[0] === page) || SECTIONS[0];
  const say = message => { setNotice(message); shell?.toast?.(message); };
  const saveProfile = async e => {
    e.preventDefault();
    if (!canEdit) return;
    const result = validateSkinProfile({ ...profileDraft, concerns: profileDraft.concernsText.split(/[,،\n]/), sensitivities: profileDraft.sensitivitiesText.split(/[,،\n]/) });
    if (!result.ok) return say(result.error);
    setBusy(true);
    try { const saved = await store.api.put(SKINCARE_COLLECTIONS.profile, { ...result.value, id: "profile" }); if (!saved) throw new Error("لم يؤكد النظام حفظ ملف البشرة."); say("تم حفظ ملف البشرة."); }
    catch (error) { say(error?.message || "تعذر الحفظ."); }
    finally { setBusy(false); }
  };
  const saveProduct = async e => {
    e.preventDefault();
    if (!canEdit) return;
    const result = validateSkinProduct(productDraft);
    if (!result.ok) return say(result.error);
    setBusy(true);
    try {
      const saved = await store.api.put(SKINCARE_COLLECTIONS.products, { ...result.value, id: editingProduct || uid() });
      if (!saved) throw new Error("لم يؤكد النظام حفظ المنتج.");
      setProductDraft(EMPTY_PRODUCT); setEditingProduct(""); say(editingProduct ? "تم تحديث المنتج." : "تمت إضافة المنتج.");
    } catch (error) { say(error?.message || "تعذر حفظ المنتج."); }
    finally { setBusy(false); }
  };
  const editProduct = product => {
    setEditingProduct(product.id);
    setProductDraft({ ...EMPTY_PRODUCT, ...product });
    setPage("products");
  };
  const deleteProduct = async product => {
    if (!canEdit || !window.confirm("هل تريد نقل المنتج إلى المحذوفات؟")) return;
    const result = await store.api.softDelete(SKINCARE_COLLECTIONS.products, product.id);
    if (result) say("تم نقل المنتج إلى المحذوفات ويمكن استعادته من سجل المحذوفات عند إضافته.");
  };
  const saveUnit = async e => {
    e.preventDefault();
    if (!canEdit) return;
    const result = validateSkinUnit(unitDraft);
    if (!result.ok) return say(result.error);
    if (result.value.productId && !products.some(p => p.id === result.value.productId)) return say("المنتج المرتبط غير موجود.");
    setBusy(true);
    try {
      const saved = await store.api.put(SKINCARE_COLLECTIONS.units, { ...result.value, id: editingUnit || uid() });
      if (!saved) throw new Error("لم يؤكد النظام حفظ العبوة.");
      setUnitDraft(EMPTY_UNIT); setEditingUnit(""); say(editingUnit ? "تم تحديث العبوة." : "تمت إضافة العبوة.");
    } catch (error) { say(error?.message || "تعذر حفظ العبوة."); }
    finally { setBusy(false); }
  };
  const editUnit = unit => { setEditingUnit(unit.id); setUnitDraft({ ...EMPTY_UNIT, ...unit }); setPage("units"); };
  const deleteUnit = async unit => {
    if (!canEdit || !window.confirm("هل تريد نقل العبوة إلى المحذوفات؟")) return;
    const result = await store.api.softDelete(SKINCARE_COLLECTIONS.units, unit.id);
    if (result) say("تم نقل العبوة إلى المحذوفات.");
  };

  React.useEffect(() => {
    if (profile) setProfileDraft({ skinType: profile.skinType || "unknown", concernsText: (profile.concerns || []).join("، "), sensitivitiesText: (profile.sensitivities || []).join("، "), notes: profile.notes || "" });
  }, [profile?.updated_at, profile?.skinType, profile?.notes]);

  if (!access || access.level === "none") return <div style={{ ...panel, textAlign: "center" }}>لا تملك صلاحية الوصول إلى Skincare OS في مساحة العمل الحالية.</div>;
  if (level === "none") return <div style={{ ...panel, textAlign: "center" }}>هذا القسم غير متاح لك. اطلب من مالك مساحة العمل منحك صلاحية الوصول.</div>;

  const nav = <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>{SECTIONS.map(([id, title, icon]) => {
    const sectionLevel = osSectionLevel(access, id);
    return <button key={id} type="button" onClick={() => setPage(id)} disabled={sectionLevel === "none"} style={{ ...button(page === id), opacity: sectionLevel === "none" ? .45 : 1 }}>{icon} {title}</button>;
  })}</div>;

  return <div dir="rtl" style={{ color: C.ink, fontFamily: "inherit", maxWidth: 1100, margin: "0 auto" }}>
    <header style={{ ...panel, background: "linear-gradient(135deg,#FAF5FF,#FFFFFF)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
      <div><div style={{ color: C.accent, fontSize: 11, fontWeight: 800, marginBottom: 5 }}>SKINCARE OS · مساحة عمل موحدة</div><h2 style={{ margin: 0, fontSize: 22 }}>العناية بالبشرة</h2><p style={{ margin: "6px 0 0", color: C.muted, fontSize: 12 }}>ملف البشرة والمنتجات والعبوات — متصل بحسابك ومساحة العمل في OS Hub.</p></div>
      <div style={{ fontSize: 11, color: C.muted }}>{store.ready ? (store.pending ? "جارٍ حفظ التغييرات…" : "متصل بمخزن مساحة العمل") : "جارٍ تحميل البيانات…"}</div>
    </header>
    {nav}
    {notice && <div role="status" style={{ ...panel, padding: 11, borderColor: C.accent, fontSize: 12 }}>{notice}</div>}
    {!store.ready && <Panel title="تحميل البيانات">جارٍ تحميل سجلات مساحة العمل…</Panel>}
    {store.error && <Panel title="تعذر تحميل البيانات"><p style={{ color: C.danger, fontSize: 13 }}>{store.error.message || "حدث خطأ أثناء الاتصال."}</p><button style={button()} onClick={() => store.api.reload()}>إعادة المحاولة</button></Panel>}
    {store.ready && !store.error && page === "home" && <HomeView profile={profile} products={products} units={units} setPage={setPage} />}
    {store.ready && !store.error && page === "settings" && <ProfileView profile={profile} draft={profileDraft} setDraft={setProfileDraft} onSave={saveProfile} canEdit={canEdit} busy={busy} />}
    {store.ready && !store.error && page === "products" && <ProductsView products={products} draft={productDraft} setDraft={setProductDraft} onSave={saveProduct} onEdit={editProduct} onDelete={deleteProduct} editing={editingProduct} setEditing={setEditingProduct} canEdit={canEdit} busy={busy} />}
    {store.ready && !store.error && page === "units" && <UnitsView units={units} products={products} draft={unitDraft} setDraft={setUnitDraft} onSave={saveUnit} onEdit={editUnit} onDelete={deleteUnit} editing={editingUnit} setEditing={setEditingUnit} canEdit={canEdit} busy={busy} />}
  </div>;
}

function HomeView({ profile, products, units, setPage }) {
  const active = products.filter(x => x.status === "active");
  return <><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 10, marginBottom: 14 }}>
    {[["منتجات نشطة", active.length], ["إجمالي المنتجات", products.length], ["العبوات المسجلة", units.length], ["نوع البشرة", ({normal:"عادية",dry:"جافة",oily:"دهنية",combination:"مختلطة",sensitive:"حساسة",unknown:"غير محدد"})[profile?.skinType || "unknown"]]].map(([name, value]) => <div key={name} style={{ ...panel, margin: 0 }}><div style={{ color: C.muted, fontSize: 11 }}>{name}</div><b style={{ fontSize: 22 }}>{value}</b></div>)}
  </div><Panel title="ابدأ من هنا"><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><button style={button(true)} onClick={() => setPage("settings")}>إعداد ملف البشرة</button><button style={button()} onClick={() => setPage("products")}>إضافة منتج</button><button style={button()} onClick={() => setPage("units")}>تسجيل عبوة</button></div></Panel></>;
}

function ProfileView({ profile, draft, setDraft, onSave, canEdit, busy }) {
  return <Panel title="ملف البشرة">
    <p style={{ color: C.muted, fontSize: 12, lineHeight: 1.8 }}>سجّل وصفًا عامًا لبشرتك وملاحظاتك. هذا الملف تنظيمي ولا يشخّص الحالات الجلدية.</p>
    <form onSubmit={onSave} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 12 }}>
      <Select title="نوع البشرة" value={draft.skinType} onChange={v => setDraft(d => ({ ...d, skinType: v }))} options={[["unknown","غير محدد"],["normal","عادية"],["dry","جافة"],["oily","دهنية"],["combination","مختلطة"],["sensitive","حساسة"]]} />
      <Field title="اهتمامات البشرة (افصل بينها بفاصلة)" value={draft.concernsText} onChange={v => setDraft(d => ({ ...d, concernsText: v }))} />
      <Field title="الحساسيات المعروفة" value={draft.sensitivitiesText} onChange={v => setDraft(d => ({ ...d, sensitivitiesText: v }))} />
      <label style={{ ...label, gridColumn: "1 / -1" }}>ملاحظات<textarea style={{ ...field, minHeight: 90 }} value={draft.notes} onChange={e => setDraft(d => ({ ...d, notes: e.target.value }))} maxLength={2000} /></label>
      {canEdit && <div><button type="submit" style={button(true)} disabled={busy}>حفظ الملف</button></div>}
    </form>
    {!canEdit && <p style={{ color: C.muted, fontSize: 12 }}>صلاحية العرض فقط — لا يمكنك تعديل الملف.</p>}
    {profile?.updated_at && <small style={{ color: C.muted }}>آخر تحديث: {new Date(profile.updated_at).toLocaleString("ar-EG")}</small>}
  </Panel>;
}

function ProductsView({ products, draft, setDraft, onSave, onEdit, onDelete, editing, setEditing, canEdit, busy }) {
  return <><Panel title={editing ? "تعديل منتج" : "إضافة منتج"}>
    {canEdit ? <form onSubmit={onSave} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 11 }}>
      <Field title="اسم المنتج" value={draft.name} onChange={v => setDraft(d => ({ ...d, name: v }))} required />
      <Field title="العلامة التجارية" value={draft.brand} onChange={v => setDraft(d => ({ ...d, brand: v }))} />
      <Select title="التصنيف" value={draft.category} onChange={v => setDraft(d => ({ ...d, category: v }))} options={[["cleanser","غسول"],["moisturizer","مرطب"],["sunscreen","واقي شمس"],["serum","سيروم"],["treatment","علاج"],["toner","تونر"],["mask","قناع"],["other","أخرى"]]} />
      <Select title="الحالة" value={draft.status} onChange={v => setDraft(d => ({ ...d, status: v }))} options={[["active","نشط"],["paused","متوقف مؤقتًا"],["finished","منتهي"],["discarded","تم التخلص منه"]]} />
      <Field title="تاريخ البدء" type="date" value={draft.startDate} onChange={v => setDraft(d => ({ ...d, startDate: v }))} />
      <Field title="تاريخ الانتهاء" type="date" value={draft.expiryDate} onChange={v => setDraft(d => ({ ...d, expiryDate: v }))} />
      <label style={{ ...label, gridColumn: "1 / -1" }}>المكونات<textarea style={{ ...field, minHeight: 65 }} value={draft.ingredients} onChange={e => setDraft(d => ({ ...d, ingredients: e.target.value }))} maxLength={2000} /></label>
      <label style={{ ...label, gridColumn: "1 / -1" }}>طريقة الاستخدام<textarea style={{ ...field, minHeight: 65 }} value={draft.instructions} onChange={e => setDraft(d => ({ ...d, instructions: e.target.value }))} maxLength={1000} /></label>
      <label style={{ ...label, gridColumn: "1 / -1" }}>ملاحظات<textarea style={{ ...field, minHeight: 65 }} value={draft.notes} onChange={e => setDraft(d => ({ ...d, notes: e.target.value }))} maxLength={2000} /></label>
      <div style={{ display: "flex", gap: 8 }}><button style={button(true)} disabled={busy}> {editing ? "حفظ التعديل" : "إضافة المنتج"} </button>{editing && <button type="button" style={button()} onClick={() => { setEditing(""); setDraft(EMPTY_PRODUCT); }}>إلغاء</button>}</div>
    </form> : <p style={{ color: C.muted, fontSize: 12 }}>صلاحية العرض فقط.</p>}
  </Panel><Panel title={"قائمة المنتجات (" + products.length + ")"}>
    {products.map(p => <article key={p.id} style={{ padding: "12px 0", borderTop: "1px solid " + C.line, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
      <div><b>{p.name}</b><div style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>{p.brand || "بدون علامة"} · {p.category} · {p.status}{p.expiryDate ? " · ينتهي " + p.expiryDate : ""}</div>{p.ingredients && <p style={{ color: C.muted, fontSize: 11, margin: "5px 0" }}>المكونات: {p.ingredients}</p>}</div>
      {canEdit && <div style={{ display: "flex", gap: 6 }}><button style={button()} onClick={() => onEdit(p)}>تعديل</button><button style={{ ...button(), color: C.danger }} onClick={() => onDelete(p)}>حذف</button></div>}
    </article>)}
    {!products.length && <p style={{ color: C.muted, fontSize: 12 }}>لم تتم إضافة منتجات بعد.</p>}
  </Panel></>;
}

function UnitsView({ units, products, draft, setDraft, onSave, onEdit, onDelete, editing, setEditing, canEdit, busy }) {
  return <><Panel title={editing ? "تعديل عبوة" : "تسجيل عبوة"}>
    {canEdit ? <form onSubmit={onSave} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 11 }}>
      <Field title="اسم العبوة" value={draft.name} onChange={v => setDraft(d => ({ ...d, name: v }))} required />
      <Select title="المنتج" value={draft.productId} onChange={v => setDraft(d => ({ ...d, productId: v }))} options={[["","بدون ربط"], ...products.map(p => [p.id, p.name])]} />
      <Field title="تاريخ الفتح" type="date" value={draft.openedOn} onChange={v => setDraft(d => ({ ...d, openedOn: v }))} />
      <Field title="تاريخ الانتهاء" type="date" value={draft.expiresOn} onChange={v => setDraft(d => ({ ...d, expiresOn: v }))} />
      <label style={{ ...label, gridColumn: "1 / -1" }}>ملاحظات<textarea style={{ ...field, minHeight: 65 }} value={draft.notes} onChange={e => setDraft(d => ({ ...d, notes: e.target.value }))} maxLength={1000} /></label>
      <div style={{ display: "flex", gap: 8 }}><button style={button(true)} disabled={busy}>{editing ? "حفظ التعديل" : "إضافة العبوة"}</button>{editing && <button type="button" style={button()} onClick={() => { setEditing(""); setDraft(EMPTY_UNIT); }}>إلغاء</button>}</div>
    </form> : <p style={{ color: C.muted, fontSize: 12 }}>صلاحية العرض فقط.</p>}
  </Panel><Panel title={"العبوات (" + units.length + ")"}>
    {units.map(u => <article key={u.id} style={{ padding: "12px 0", borderTop: "1px solid " + C.line, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
      <div><b>{u.name}</b><div style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>{products.find(p => p.id === u.productId)?.name || "غير مرتبطة بمنتج"} · فُتحت: {u.openedOn || "—"} · تنتهي: {u.expiresOn || "—"}</div></div>
      {canEdit && <div style={{ display: "flex", gap: 6 }}><button style={button()} onClick={() => onEdit(u)}>تعديل</button><button style={{ ...button(), color: C.danger }} onClick={() => onDelete(u)}>حذف</button></div>}
    </article>)}
    {!units.length && <p style={{ color: C.muted, fontSize: 12 }}>لا توجد عبوات مسجلة.</p>}
  </Panel></>;
}
