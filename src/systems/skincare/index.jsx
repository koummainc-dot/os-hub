import React, { useMemo, useState } from "react";
import { osSectionLevel } from "../../core/core.js";
import { useRecordStore, arr, live, uid } from "../../core/records.jsx";
import { SKINCARE_COLLECTIONS, validateSkinProfile, validateSkinProduct, validateSkinUnit, validateRoutine, validateRoutineStep, routineLogId, validateSkinDiaryEntry } from "./domain.js";
import DiaryView from "./Diary.jsx";
import RoutinesView from "./Routines.jsx";
import PhotosView from "./Photos.jsx";
import { uploadSkinPhoto, deleteSkinPhoto } from "./photoStorage.js";

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
  ["routines", "الروتين", "🗓️"],
  ["diary", "مفكرة البشرة", "📔"],
  ["photos", "صور التقدم", "📷"],
];
const EMPTY_PRODUCT = { name: "", brand: "", category: "other", status: "active", suitability: "suitable", startDate: "", expiryDate: "", ingredients: "", instructions: "", notes: "" };
const EMPTY_UNIT = { name: "", productId: "", openedOn: today(), expiresOn: "", notes: "" };

export default function SkincareOS({ access, ws, isDemo, demoStore, page = "home", setPage = () => {}, shell }) {
  const store = useRecordStore({ wsId: ws?.id || "demo", systemId: "skincare", isDemo, demoStore: demoStore || { current: {} }, seed: () => ({}) , onToast: message => shell?.toast?.(message) });
  const products = useMemo(() => live(arr(store.recs, SKINCARE_COLLECTIONS.products)), [store.recs]);
  const units = useMemo(() => live(arr(store.recs, SKINCARE_COLLECTIONS.units)), [store.recs]);
  const routines = useMemo(() => live(arr(store.recs, SKINCARE_COLLECTIONS.routines)), [store.recs]);
  const routineLogs = useMemo(() => live(arr(store.recs, SKINCARE_COLLECTIONS.routineLogs)), [store.recs]);
  const diaryEntries = useMemo(() => live(arr(store.recs, SKINCARE_COLLECTIONS.diary)).sort((a, b) => String(b.date).localeCompare(String(a.date))), [store.recs]);
  const deletedDiaryEntries = useMemo(() => arr(store.recs, SKINCARE_COLLECTIONS.diary).filter(x => x.deleted_at), [store.recs]);
  const photos = useMemo(() => live(arr(store.recs, SKINCARE_COLLECTIONS.photos)).sort((a, b) => String(b.date).localeCompare(String(a.date))), [store.recs]);
  const deletedPhotos = useMemo(() => arr(store.recs, SKINCARE_COLLECTIONS.photos).filter(x => x.deleted_at), [store.recs]);
  const deletedProducts = useMemo(() => arr(store.recs, SKINCARE_COLLECTIONS.products).filter(x => x.deleted_at), [store.recs]);
  const deletedUnits = useMemo(() => arr(store.recs, SKINCARE_COLLECTIONS.units).filter(x => x.deleted_at), [store.recs]);
  const profile = useMemo(() => arr(store.recs, SKINCARE_COLLECTIONS.profile).find(x => x.id === "profile") || null, [store.recs]);
  const [profileDraft, setProfileDraft] = useState({ skinType: "unknown", concernsText: "", sensitivitiesText: "", notes: "" });
  const [productDraft, setProductDraft] = useState(EMPTY_PRODUCT);
  const [unitDraft, setUnitDraft] = useState(EMPTY_UNIT);
  const [diaryDate, setDiaryDate] = useState(today());
  const [diaryDraft, setDiaryDraft] = useState({ date: today(), skinRating: "", issuesText: "", note: "", sleepHours: "", sleepQuality: "", mood: "", exerciseMinutes: "", waterGlasses: "", trialId: "" });
  const [editingDiary, setEditingDiary] = useState("");
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
    const hasUnits = units.some(unit => unit.productId === product.id);
    const hasRoutineSteps = routines.some(routine => (routine.steps || []).some(step => step.productId === product.id));
    if (hasUnits || hasRoutineSteps) return say("لا يمكن حذف المنتج لوجود عبوات أو خطوات روتين مرتبطة به. احتفظ بالتاريخ أو غيّر حالة المنتج بدل الحذف.");
    const result = await store.api.softDelete(SKINCARE_COLLECTIONS.products, product.id);
    if (result) say("تم نقل المنتج إلى المحذوفات ويمكن استعادته من سجل المحذوفات عند إضافته.");
  };
  const restoreProduct = async product => { const result = await store.api.restore(SKINCARE_COLLECTIONS.products, product.id); if (result) say("تمت استعادة المنتج."); };
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
  const restoreUnit = async unit => { const result = await store.api.restore(SKINCARE_COLLECTIONS.units, unit.id); if (result) say("تمت استعادة العبوة."); };
  const saveDiaryEntry = async e => {
    e.preventDefault();
    if (!canEdit) return;
    const result = validateSkinDiaryEntry({ ...diaryDraft, issues: diaryDraft.issuesText.split(/[,،\n]/) }, today());
    if (!result.ok) return say(result.error);
    const existing = diaryEntries.find(entry => entry.date === result.value.date && entry.id !== editingDiary);
    if (existing) return say("يوجد تسجيل لهذا اليوم بالفعل؛ افتحه من السجل لتعديله.");
    setBusy(true);
    try {
      const id = editingDiary || diaryEntries.find(entry => entry.date === result.value.date)?.id || "diary-" + result.value.date;
      const saved = await store.api.put(SKINCARE_COLLECTIONS.diary, { ...result.value, id, updatedAt: new Date().toISOString() });
      if (!saved) throw new Error("لم يؤكد النظام حفظ إدخال المفكرة.");
      setDiaryDate(result.value.date);
      setEditingDiary("");
      setDiaryDraft({ date: result.value.date, skinRating: "", issuesText: "", note: "", sleepHours: "", sleepQuality: "", mood: "", exerciseMinutes: "", waterGlasses: "", trialId: "" });
      say("تم حفظ إدخال المفكرة.");
    } catch (error) { say(error?.message || "تعذر حفظ إدخال المفكرة."); }
    finally { setBusy(false); }
  };
  const editDiaryEntry = entry => {
    setEditingDiary(entry.id);
    setDiaryDate(entry.date);
    setDiaryDraft({ date: entry.date, skinRating: entry.skinRating ?? "", issuesText: (entry.issues || []).join("، "), note: entry.note || "", sleepHours: entry.sleepHours ?? "", sleepQuality: entry.sleepQuality ?? "", mood: entry.mood ?? "", exerciseMinutes: entry.exerciseMinutes ?? "", waterGlasses: entry.waterGlasses ?? "", trialId: entry.trialId || "" });
    setPage("diary");
  };
  const deleteDiaryEntry = async entry => {
    if (!canEdit || !window.confirm("نقل إدخال هذا اليوم إلى المحذوفات؟")) return;
    const result = await store.api.softDelete(SKINCARE_COLLECTIONS.diary, entry.id);
    if (result) say("تم نقل إدخال اليوم إلى المحذوفات.");
  };
  const restoreDiaryEntry = async entry => {
    if (!canEdit) return;
    if (diaryEntries.some(item => item.date === entry.date)) return say("يوجد إدخال نشط لنفس التاريخ؛ احذفه أو ادمج البيانات قبل الاستعادة.");
    const result = await store.api.restore(SKINCARE_COLLECTIONS.diary, entry.id);
    if (result) say("تمت استعادة إدخال المفكرة.");
  };
  const uploadPhoto = async payload => {
    if (!canEdit || isDemo) return say("رفع الصور يتطلب صلاحية تعديل واتصالًا بمساحة عمل فعلية.");
    setBusy(true);
    try {
      await uploadSkinPhoto({ workspaceId: ws?.id, ...payload, photoId: uid(), storeApi: store.api });
      say("تم رفع الصورة والنسخة المصغرة وربطهما بإدخال اليوم.");
    } catch (error) {
      say(error?.message || "تعذر رفع الصورة بأمان.");
    } finally { setBusy(false); }
  };
  const removePhoto = async photo => {
    if (!canEdit || isDemo || !window.confirm("سيتم حذف الصورة الأصلية والنسخة المصغرة نهائيًا. هل تريد المتابعة؟")) return;
    setBusy(true);
    try {
      await deleteSkinPhoto({ workspaceId: ws?.id, photo, storeApi: store.api });
      say("تم حذف الصورة الأصلية والنسخة المصغرة.");
    } catch (error) {
      say(error?.message || "تعذر حذف الصورة بالكامل؛ راجع حالة السجل قبل إعادة المحاولة.");
    } finally { setBusy(false); }
  };
  const saveRoutine = async routine => {
    if (!canEdit) return;
    const checked = validateRoutine(routine);
    if (!checked.ok) return say(checked.error);
    const seenSteps = new Set();
    for (const step of checked.value.steps || []) {
      if (seenSteps.has(step.id)) return say("يوجد معرف مكرر لإحدى خطوات الروتين.");
      seenSteps.add(step.id);
      const stepCheck = validateRoutineStep(step, products);
      if (!stepCheck.ok) return say(stepCheck.error);
    }
    setBusy(true);
    try {
      const saved = await store.api.put(SKINCARE_COLLECTIONS.routines, { ...checked.value, id: routine.id || uid(), updatedAt: new Date().toISOString() });
      if (!saved) throw new Error("لم يؤكد النظام حفظ الروتين.");
      say(routine.id ? "تم تحديث الروتين." : "تم إنشاء الروتين.");
      return true;
    } catch (error) { say(error?.message || "تعذر حفظ الروتين."); return false; }
    finally { setBusy(false); }
  };
  const toggleRoutine = async routine => {
    if (!canEdit) return;
    const saved = await store.api.put(SKINCARE_COLLECTIONS.routines, { ...routine, status: routine.status === "paused" ? "active" : "paused", updatedAt: new Date().toISOString() });
    if (saved) say(routine.status === "paused" ? "تم تفعيل الروتين." : "تم إيقاف الروتين مؤقتًا.");
  };
  const copyRoutine = async routine => {
    if (!canEdit) return;
    const copy = { ...routine, id: uid(), name: routine.name + " (نسخة)", status: "paused", steps: (routine.steps || []).map(step => ({ ...step, id: uid() })), createdAt: new Date().toISOString() };
    const saved = await store.api.put(SKINCARE_COLLECTIONS.routines, copy);
    if (saved) say("تم نسخ الروتين وخطواته.");
  };
  const logRoutineStep = async (routine, step, status) => {
    if (!canEdit || routine.status !== "active") return;
    const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
    const currentProduct = products.find(product => product.id === step.productId);
    if (!currentProduct || ["paused", "finished", "discarded", "stopped"].includes(currentProduct.status)) return say("لا يمكن تسجيل خطوة بمنتج غير متاح أو متوقف.");
    if (currentProduct.suitability === "avoid" && !step.avoidConfirmed) return say("هذا المنتج مصنف للتجنب؛ أعد مراجعة الخطوة قبل تسجيلها.");
    const id = routineLogId(routine.id, date, step.id);
    if (routineLogs.some(log => log.id === id || log.client_generated_id === id)) return say("تم تسجيل هذه الخطوة بالفعل اليوم.");
    const saved = await store.api.put(SKINCARE_COLLECTIONS.routineLogs, { id, client_generated_id: id, routineId: routine.id, stepId: step.id, date, status, createdAt: new Date().toISOString() });
    if (saved) say(status === "done" ? "تم تسجيل تنفيذ الخطوة." : "تم تسجيل تخطي الخطوة.");
  };
  const undoRoutineLog = async () => {
    if (!canEdit || !routineLogs.length) return;
    const latest = [...routineLogs].sort((a, b) => String(b.createdAt || b.updated_at || "").localeCompare(String(a.createdAt || a.updated_at || "")))[0];
    if (!latest || !window.confirm("هل تريد التراجع عن آخر تسجيل؟")) return;
    const result = await store.api.softDelete(SKINCARE_COLLECTIONS.routineLogs, latest.id);
    if (result) say("تم التراجع عن آخر تسجيل.");
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
    {store.ready && !store.error && page === "products" && <ProductsView products={products} deletedProducts={deletedProducts} onRestore={restoreProduct} draft={productDraft} setDraft={setProductDraft} onSave={saveProduct} onEdit={editProduct} onDelete={deleteProduct} editing={editingProduct} setEditing={setEditingProduct} canEdit={canEdit} busy={busy} />}
    {store.ready && !store.error && page === "units" && <UnitsView units={units} deletedUnits={deletedUnits} onRestore={restoreUnit} products={products} draft={unitDraft} setDraft={setUnitDraft} onSave={saveUnit} onEdit={editUnit} onDelete={deleteUnit} editing={editingUnit} setEditing={setEditingUnit} canEdit={canEdit} busy={busy} />}
    {store.ready && !store.error && page === "routines" && <RoutinesView routines={routines} logs={routineLogs} products={products} canEdit={canEdit} busy={busy} onSave={saveRoutine} onArchive={toggleRoutine} onCopy={copyRoutine} onLog={logRoutineStep} onUndo={undoRoutineLog} />}
    {store.ready && !store.error && page === "diary" && <DiaryView entries={diaryEntries} deletedEntries={deletedDiaryEntries} selectedDate={diaryDate} setSelectedDate={setDiaryDate} draft={diaryDraft} setDraft={setDiaryDraft} editing={editingDiary} setEditing={setEditingDiary} onSave={saveDiaryEntry} onEdit={editDiaryEntry} onDelete={deleteDiaryEntry} onRestore={restoreDiaryEntry} canEdit={canEdit} busy={busy} />}
    {store.ready && !store.error && page === "photos" && <PhotosView workspaceId={ws?.id} entries={diaryEntries} photos={photos} deletedPhotos={deletedPhotos} isDemo={isDemo} canEdit={canEdit} busy={busy} onUpload={uploadPhoto} onDelete={removePhoto} />}
  </div>;
}

function HomeView({ profile, products, units, setPage }) {
  const active = products.filter(x => x.status === "active");
  return <><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 10, marginBottom: 14 }}>
    {[["منتجات نشطة", active.length], ["إجمالي المنتجات", products.length], ["العبوات المسجلة", units.length], ["نوع البشرة", ({normal:"عادية",dry:"جافة",oily:"دهنية",combination:"مختلطة",sensitive:"حساسة",unknown:"غير محدد"})[profile?.skinType || "unknown"]]].map(([name, value]) => <div key={name} style={{ ...panel, margin: 0 }}><div style={{ color: C.muted, fontSize: 11 }}>{name}</div><b style={{ fontSize: 22 }}>{value}</b></div>)}
  </div><Panel title="ابدأ من هنا"><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><button style={button(true)} onClick={() => setPage("settings")}>إعداد ملف البشرة</button><button style={button()} onClick={() => setPage("products")}>إضافة منتج</button><button style={button()} onClick={() => setPage("units")}>تسجيل عبوة</button><button style={button()} onClick={() => setPage("diary")}>سجّل يومك</button><button style={button()} onClick={() => setPage("photos")}>صور التقدم</button></div></Panel></>;
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

function ProductsView({ products, deletedProducts, onRestore, draft, setDraft, onSave, onEdit, onDelete, editing, setEditing, canEdit, busy }) {
  return <><Panel title={editing ? "تعديل منتج" : "إضافة منتج"}>
    {canEdit ? <form onSubmit={onSave} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 11 }}>
      <Field title="اسم المنتج" value={draft.name} onChange={v => setDraft(d => ({ ...d, name: v }))} required />
      <Field title="العلامة التجارية" value={draft.brand} onChange={v => setDraft(d => ({ ...d, brand: v }))} />
      <Select title="التصنيف" value={draft.category} onChange={v => setDraft(d => ({ ...d, category: v }))} options={[["cleanser","غسول"],["moisturizer","مرطب"],["sunscreen","واقي شمس"],["serum","سيروم"],["treatment","علاج"],["toner","تونر"],["mask","قناع"],["other","أخرى"]]} />
      <Select title="الحالة" value={draft.status} onChange={v => setDraft(d => ({ ...d, status: v }))} options={[["active","نشط"],["paused","متوقف مؤقتًا"],["finished","منتهي"],["discarded","تم التخلص منه"]]} />
      <Select title="ملاءمة المنتج" value={draft.suitability || "suitable"} onChange={v => setDraft(d => ({ ...d, suitability: v }))} options={[["suitable","مناسب مبدئيًا"],["review","يحتاج مراجعة"],["avoid","تجنب"]]} />
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
    {!!deletedProducts.length && <details style={{ marginTop: 12 }}><summary style={{ cursor: "pointer", color: C.muted, fontSize: 12 }}>المحذوفات ({deletedProducts.length})</summary>{deletedProducts.map(p => <div key={p.id} style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "9px 0", borderTop: "1px solid " + C.line }}><span style={{ fontSize: 12 }}>{p.name}</span>{canEdit && <button type="button" style={button()} onClick={() => onRestore(p)}>استعادة</button>}</div>)}</details>}
  </Panel></>;
}

function UnitsView({ units, deletedUnits, onRestore, products, draft, setDraft, onSave, onEdit, onDelete, editing, setEditing, canEdit, busy }) {
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
    {!!deletedUnits.length && <details style={{ marginTop: 12 }}><summary style={{ cursor: "pointer", color: C.muted, fontSize: 12 }}>العبوات المحذوفة ({deletedUnits.length})</summary>{deletedUnits.map(u => <div key={u.id} style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "9px 0", borderTop: "1px solid " + C.line }}><span style={{ fontSize: 12 }}>{u.name}</span>{canEdit && <button type="button" style={button()} onClick={() => onRestore(u)}>استعادة</button>}</div>)}</details>}
  </Panel></>;
}
