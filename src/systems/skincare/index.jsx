import React, { useEffect, useMemo, useRef, useState } from "react";
import { osSectionLevel } from "../../core/core.js";
import { useRecordStore, arr, live, uid } from "../../core/records.jsx";
import { SKINCARE_COLLECTIONS, validateSkinProfile, validateSkinProduct, validateSkinUnit, validateRoutine, validateRoutineStep, routineLogId, validateSkinDiaryEntry, validateSkinIngredient, normalizeINCIName, normalizeSkinSearchText, validateSkinTrial, transitionSkinTrial, validateSkinReaction, validateSkinList, validateSkinSettings, effectiveSkinUnitExpiry, skinUnitStatus, skinUnitCostPerDay, canRestoreSkinUnit, canRestoreSkinRoutineLog, canRestoreSkinList, hasDuplicateSkinListName, buildSkinFollowUps, parseSkinProductsCsv, serializeSkinProductsCsv } from "./domain.js";
import { SkinCompareView, SkinListsView, RoutineLogsView, SkinSettingsView } from "./WorkspaceTools.jsx";
import DiaryView from "./Diary.jsx";
import RoutinesView from "./Routines.jsx";
import PhotosView from "./Photos.jsx";
import IngredientsView from "./Ingredients.jsx";
import TrialsView from "./Trials.jsx";
import ReactionsView from "./Reactions.jsx";
import SkinDashboard from "./Dashboard.jsx";
import SkinFollowUps from "./FollowUps.jsx";
import SkincareBackup from "./Backup.jsx";
import { uploadSkinPhoto, deleteSkinPhoto } from "./photoStorage.js";

const C = { ink: "#182230", muted: "#64748B", line: "#E2E8F0", bg: "#F8FAFC", accent: "#A855F7", soft: "#FAF5FF", white: "#FFFFFF", danger: "#B91C1C" };
const today = (timezone = "Africa/Cairo") => new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
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
  ["dashboard", "لوحة صحة البشرة", "📊"],
  ["followups", "المتابعة والتنبيهات", "🔔"],
  ["settings", "ملف البشرة", "🧴"],
  ["products", "المنتجات", "🧪"],
  ["units", "العبوات", "📦"],
  ["routines", "الروتين", "🗓️"],
  ["routine_logs", "سجل الروتين", "📜"],
  ["compare", "مقارنة المنتجات", "⚖️"],
  ["diary", "مفكرة البشرة", "📔"],
  ["photos", "صور التقدم", "📷"],
  ["ingredients", "المكونات", "🧬"],
  ["trials", "التجارب", "🧫"],
  ["reactions", "التفاعلات", "⚠️"],
  ["lists", "القوائم والرغبات", "♡"],
];
const EMPTY_PRODUCT = { name: "", brand: "", category: "other", status: "active", suitability: "suitable", startDate: "", expiryDate: "", ingredients: "", instructions: "", notes: "", url: "", stepSlot: "" };
const EMPTY_UNIT = { name: "", productId: "", purchaseDate: "", openedOn: "", paoMonths: "", expiresOn: "", startedUseDate: "", finishedDate: "", finishReason: "", price: "", currency: "EGP", sizeNote: "", notes: "" };
const unitCostPerDay = (unit, todayKey) => skinUnitCostPerDay(unit, todayKey)?.value ?? null;

export default function SkincareOS({ api, access, ws, isDemo, demoStore, page = "home", setPage = () => {}, shell }) {
  const store = useRecordStore({ wsId: ws?.id || "demo", systemId: "skincare", isDemo, demoStore: demoStore || { current: {} }, seed: () => ({}) , onToast: message => shell?.toast?.(message) });
  const products = useMemo(() => live(arr(store.recs, SKINCARE_COLLECTIONS.products)), [store.recs]);
  const ingredients = useMemo(() => live(arr(store.recs, SKINCARE_COLLECTIONS.ingredients)).sort((a, b) => String(a.inciName).localeCompare(String(b.inciName))), [store.recs]);
  const deletedIngredients = useMemo(() => arr(store.recs, SKINCARE_COLLECTIONS.ingredients).filter(x => x.deleted_at), [store.recs]);
  const trials = useMemo(() => live(arr(store.recs, SKINCARE_COLLECTIONS.trials)).sort((a, b) => String(b.startDate).localeCompare(String(a.startDate))), [store.recs]);
  const reactions = useMemo(() => live(arr(store.recs, SKINCARE_COLLECTIONS.reactions)).sort((a, b) => String(b.dateStarted).localeCompare(String(a.dateStarted))), [store.recs]);
  const units = useMemo(() => live(arr(store.recs, SKINCARE_COLLECTIONS.units)), [store.recs]);
  const lists = useMemo(() => live(arr(store.recs, SKINCARE_COLLECTIONS.lists)), [store.recs]);
  const deletedLists = useMemo(() => arr(store.recs, SKINCARE_COLLECTIONS.lists).filter(x => x.deleted_at), [store.recs]);
  const deletedRoutineLogs = useMemo(() => arr(store.recs, SKINCARE_COLLECTIONS.routineLogs).filter(x => x.deleted_at), [store.recs]);
  const settings = useMemo(() => arr(store.recs, SKINCARE_COLLECTIONS.settings).find(x => x.id === "settings") || null, [store.recs]);
  const routines = useMemo(() => live(arr(store.recs, SKINCARE_COLLECTIONS.routines)), [store.recs]);
  const routineLogs = useMemo(() => live(arr(store.recs, SKINCARE_COLLECTIONS.routineLogs)), [store.recs]);
  const diaryEntries = useMemo(() => live(arr(store.recs, SKINCARE_COLLECTIONS.diary)).sort((a, b) => String(b.date).localeCompare(String(a.date))), [store.recs]);
  const deletedDiaryEntries = useMemo(() => arr(store.recs, SKINCARE_COLLECTIONS.diary).filter(x => x.deleted_at), [store.recs]);
  const photos = useMemo(() => live(arr(store.recs, SKINCARE_COLLECTIONS.photos)).sort((a, b) => String(b.date).localeCompare(String(a.date))), [store.recs]);
  const deletedPhotos = useMemo(() => arr(store.recs, SKINCARE_COLLECTIONS.photos).filter(x => x.deleted_at), [store.recs]);
  const deletedProducts = useMemo(() => arr(store.recs, SKINCARE_COLLECTIONS.products).filter(x => x.deleted_at), [store.recs]);
  const deletedUnits = useMemo(() => arr(store.recs, SKINCARE_COLLECTIONS.units).filter(x => x.deleted_at), [store.recs]);
  const profile = useMemo(() => arr(store.recs, SKINCARE_COLLECTIONS.profile).find(x => x.id === "profile") || null, [store.recs]);
  const followupItems = useMemo(() => buildSkinFollowUps({
    today: today(settings?.timezone || "Africa/Cairo"), timezone: settings?.timezone || "Africa/Cairo", weekStartDay: settings?.weekStartDay ?? 6, products, units, routines, routineLogs, trials, reactions,
    expiryWindowDays: settings?.expirySoonDays ?? 30,
    trialWindowDays: 7,
  }), [products,units,routines,routineLogs,trials,reactions,settings]);
  const syncedIntegrationKeys = useRef(new Set());
  useEffect(() => {
    const integrations = api?.integrations;
    if (!store.ready || store.error || !ws?.id || !integrations?.notifications || !integrations?.calendar) return;
    let cancelled = false;
    const current = new Set(followupItems.map(item => "skincare:" + item.id));
    (async () => {
      for (const item of followupItems) {
        if (cancelled) return;
        const sourceKey = "skincare:" + item.id;
        const dueAt = String(item.dueDate || today(settings?.timezone || "Africa/Cairo")) + "T" + String(item.reminderTime || "09:00") + ":00";
        const common = {
          workspaceId: ws.id, sourceSystem: "skincare", sourceKey,
          title: item.title, description: item.description,
          dueAt, priority: item.priority || "normal",
          entityType: item.type, entityId: item.sourceId || item.id,
          action: { system: "skincare", section: item.page, recordId: item.sourceId || null },
          quietHours: { start: settings?.quietStart || "22:00", end: settings?.quietEnd || "08:00", timezone: settings?.timezone || "Africa/Cairo" },
        };
        const [notification, calendar] = await Promise.all([
          integrations.notifications.upsert(common),
          integrations.calendar.upsert({ ...common, date: item.dueDate || today(settings?.timezone || "Africa/Cairo"), sourceRecordId: item.sourceId || item.id, eventType: item.type }),
        ]);
        if (cancelled) return;
        if (notification?.ok === false || calendar?.ok === false) {
          shell?.toast?.("تعذر مزامنة أحد تذكيرات Skincare مع خدمات OS Hub؛ ستظل ظاهرة داخل صفحة المتابعة.");
        }
      }
      for (const oldKey of syncedIntegrationKeys.current) {
        if (current.has(oldKey) || cancelled) continue;
        const sourceKey = oldKey;
        await Promise.all([
          integrations.notifications.cancel({ workspaceId: ws.id, sourceKey }),
          integrations.calendar.remove({ workspaceId: ws.id, sourceKey }),
        ]);
      }
      if (!cancelled) syncedIntegrationKeys.current = current;
    })().catch(() => {
      if (!cancelled) shell?.toast?.("تعذر الوصول إلى خدمات التكامل الموحدة؛ تظل تنبيهات Skincare متاحة داخل النظام.");
    });
    return () => { cancelled = true; };
  }, [api, ws?.id, followupItems, shell, store.ready, store.error]);
  const todayKey = today(settings?.timezone || "Africa/Cairo");
  const [profileDraft, setProfileDraft] = useState({ skinType: "unknown", concernsText: "", sensitivitiesText: "", notes: "" });
  const [productDraft, setProductDraft] = useState(EMPTY_PRODUCT);
  const [unitDraft, setUnitDraft] = useState(EMPTY_UNIT);
  const [diaryDate, setDiaryDate] = useState(today());
  const [diaryDraft, setDiaryDraft] = useState({ date: today(), skinRating: "", issuesText: "", note: "", sleepHours: "", sleepQuality: "", mood: "", exerciseMinutes: "", waterGlasses: "", areaMeasurements: { forehead: "", leftCheek: "", rightCheek: "", nose: "", chin: "", jawline: "" }, trialId: "" });
  const [editingDiary, setEditingDiary] = useState("");
  const [editingProduct, setEditingProduct] = useState("");
  const [editingUnit, setEditingUnit] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const previousTodayRef = useRef(todayKey);
  useEffect(() => {
    const previous = previousTodayRef.current;
    if (diaryDate === previous) setDiaryDate(todayKey);
    setDiaryDraft(current => current.date === previous ? { ...current, date: todayKey } : current);
    previousTodayRef.current = todayKey;
  }, [todayKey]);

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
  const importProductsCsv = async rows => {
    if (!canEdit || !Array.isArray(rows)) return { added: 0, skipped: 0, failed: true, error: "لا توجد صلاحية للاستيراد." };
    const known = new Set(products.map(product => normalizeINCIName(product.name) + "|" + normalizeINCIName(product.brand)));
    let added = 0, skipped = 0;
    setBusy(true);
    try {
      for (const row of rows) {
        const key = normalizeINCIName(row.name) + "|" + normalizeINCIName(row.brand);
        if (known.has(key)) { skipped++; continue; }
        const checked = validateSkinProduct(row);
        if (!checked.ok) throw new Error("السطر الخاص بالمنتج «" + row.name + "»: " + checked.error);
        const saved = await store.api.put(SKINCARE_COLLECTIONS.products, { ...checked.value, id: uid() });
        if (!saved) throw new Error("توقف الاستيراد عند المنتج «" + row.name + "».");
        known.add(key);
        added++;
      }
      say("اكتمل استيراد المنتجات من CSV.");
      return { added, skipped, failed: false };
    } catch (error) {
      say("توقف استيراد CSV بعد إضافة " + added + " منتجًا؛ يمكنك مراجعة القائمة وإعادة استيراد الملف لتجاوز الموجود. " + (error?.message || ""));
      return { added, skipped, failed: true, error: error?.message || "فشل الاستيراد." };
    } finally { setBusy(false); }
  };

  const saveProduct = async e => {
    e.preventDefault();
    if (!canEdit) return;
    const result = validateSkinProduct(productDraft);
    if (!result.ok) return say(result.error);
    const duplicate = products.find(product => product.id !== editingProduct &&
      normalizeINCIName(product.name) === normalizeINCIName(result.value.name) &&
      normalizeINCIName(product.brand) === normalizeINCIName(result.value.brand));
    if (duplicate) return say("يوجد منتج بالاسم والعلامة التجارية نفسيهما؛ افتح السجل الحالي لتعديله بدل إنشاء نسخة مكررة.");
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
    if (!canEdit || busy || !window.confirm("هل تريد نقل المنتج إلى المحذوفات؟")) return;
    const hasUnits = units.some(unit => unit.productId === product.id);
    const hasRoutineSteps = routines.some(routine => (routine.steps || []).some(step => step.productId === product.id));
    const hasTrials = trials.some(item => item.productId === product.id);
    const hasReactions = reactions.some(item => item.productId === product.id);
    const hasLists = lists.some(item => (item.productIds || []).includes(product.id));
    if (hasUnits || hasRoutineSteps || hasTrials || hasReactions || hasLists) return say("لا يمكن حذف المنتج لوجود عبوات أو روتينات أو تجارب أو تفاعلات أو قوائم مرتبطة به. غيّر حالته بدل الحذف للحفاظ على التاريخ.");
    setBusy(true);
    try {
      const result = await store.api.softDelete(SKINCARE_COLLECTIONS.products, product.id);
      if (result) say("تم نقل المنتج إلى المحذوفات ويمكن استعادته من سجل المحذوفات.");
      else say("لم يؤكد النظام حذف المنتج.");
    } catch (error) { say(error?.message || "تعذر حذف المنتج."); }
    finally { setBusy(false); }
  };
  const restoreProduct = async product => {
    if (!canEdit || busy) return;
    const duplicate = products.find(item => item.id !== product.id &&
      normalizeINCIName(item.name) === normalizeINCIName(product.name) &&
      normalizeINCIName(item.brand) === normalizeINCIName(product.brand));
    if (duplicate) return say("يوجد منتج نشط بالاسم والعلامة التجارية نفسيهما؛ غيّر بيانات أحدهما قبل الاستعادة.");
    setBusy(true);
    try {
      const result = await store.api.restore(SKINCARE_COLLECTIONS.products, product.id);
      if (result) say("تمت استعادة المنتج.");
      else say("لم يؤكد النظام استعادة المنتج.");
    } catch (error) { say(error?.message || "تعذرت استعادة المنتج."); }
    finally { setBusy(false); }
  };
  const saveUnit = async e => {
    e.preventDefault();
    if (!canEdit) return;
    const result = validateSkinUnit(unitDraft, todayKey);
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
    if (!canEdit || busy || !window.confirm("هل تريد نقل العبوة إلى المحذوفات؟")) return;
    setBusy(true);
    try {
      const result = await store.api.softDelete(SKINCARE_COLLECTIONS.units, unit.id);
      if (result) say("تم نقل العبوة إلى المحذوفات.");
      else say("لم يؤكد النظام حذف العبوة.");
    } catch (error) { say(error?.message || "تعذر حذف العبوة."); }
    finally { setBusy(false); }
  };
  const restoreUnit = async unit => {
    if (!canEdit || busy) return;
    if (!canRestoreSkinUnit(unit, products)) return say("لا يمكن استعادة العبوة قبل استعادة المنتج المرتبط بها.");
    setBusy(true);
    try {
      const result = await store.api.restore(SKINCARE_COLLECTIONS.units, unit.id);
      if (result) say("تمت استعادة العبوة.");
      else say("لم يؤكد النظام استعادة العبوة.");
    } catch (error) {
      say(error?.message || "تعذر استعادة العبوة.");
    } finally { setBusy(false); }
  };
  const saveList = async input => {
    if (!canEdit || busy) return false;
    const checked = validateSkinList(input);
    if (!checked.ok) return say(checked.error), false;
    if (hasDuplicateSkinListName(checked.value, lists)) return say("يوجد اسم قائمة نشط مطابق؛ اختر اسمًا مختلفًا."), false;
    if (checked.value.productIds.some(id => !products.some(product => product.id === id))) return say("تحتوي القائمة على منتج غير موجود."), false;
    setBusy(true);
    try {
      const saved = await store.api.put(SKINCARE_COLLECTIONS.lists, { ...checked.value, id: input.id || uid() });
      if (!saved) throw new Error("لم يؤكد النظام حفظ القائمة.");
      say("تم حفظ القائمة.");
      return true;
    } catch (error) { say(error?.message || "تعذر حفظ القائمة."); return false; }
    finally { setBusy(false); }
  };
  const deleteList = async list => {
    if (!canEdit || !window.confirm("هل تريد نقل القائمة إلى المحذوفات؟")) return;
    const saved = await store.api.softDelete(SKINCARE_COLLECTIONS.lists, list.id);
    if (saved) say("تم حذف القائمة منطقيًا.");
  };
  const toggleListProduct = async (list, product) => {
    if (!canEdit || busy) return;
    const ids = new Set(list.productIds || []);
    if (ids.has(product.id)) ids.delete(product.id); else ids.add(product.id);
    await saveList({ ...list, productIds: [...ids] });
  };
  const saveSettings = async input => {
    if (!canEdit) return false;
    const checked = validateSkinSettings(input);
    if (!checked.ok) return say(checked.error), false;
    try {
      const saved = await store.api.put(SKINCARE_COLLECTIONS.settings, { ...checked.value, id: "settings" });
      if (!saved) throw new Error("لم يؤكد النظام حفظ الإعدادات.");
      say("تم حفظ إعدادات Skincare OS.");
      return true;
    } catch (error) { say(error?.message || "تعذر حفظ الإعدادات."); return false; }
  };

  const saveDiaryEntry = async e => {
    e.preventDefault();
    if (!canEdit) return;
    const result = validateSkinDiaryEntry({ ...diaryDraft, issues: diaryDraft.issuesText.split(/[,،\n]/) }, todayKey);
    if (!result.ok) return say(result.error);
    if (result.value.trialId) {
      const linkedTrial = trials.find(trial => trial.id === result.value.trialId);
      if (!linkedTrial || linkedTrial.status === "cancelled" || result.value.date < linkedTrial.startDate || (linkedTrial.endDate && result.value.date > linkedTrial.endDate)) {
        return say("التجربة المختارة غير متاحة لهذا التاريخ؛ راجع تاريخ التجربة وحالتها.");
      }
    }
    const existing = diaryEntries.find(entry => entry.date === result.value.date && entry.id !== editingDiary);
    if (existing) return say("يوجد تسجيل لهذا اليوم بالفعل؛ افتحه من السجل لتعديله.");
    setBusy(true);
    try {
      const id = editingDiary || diaryEntries.find(entry => entry.date === result.value.date)?.id || "diary-" + result.value.date;
      const saved = await store.api.put(SKINCARE_COLLECTIONS.diary, { ...result.value, id, updatedAt: new Date().toISOString() });
      if (!saved) throw new Error("لم يؤكد النظام حفظ إدخال المفكرة.");
      setDiaryDate(result.value.date);
      setEditingDiary("");
      setDiaryDraft({ date: result.value.date, skinRating: "", issuesText: "", note: "", sleepHours: "", sleepQuality: "", mood: "", exerciseMinutes: "", waterGlasses: "", areaMeasurements: { forehead: "", leftCheek: "", rightCheek: "", nose: "", chin: "", jawline: "" }, trialId: "" });
      say("تم حفظ إدخال المفكرة.");
    } catch (error) { say(error?.message || "تعذر حفظ إدخال المفكرة."); }
    finally { setBusy(false); }
  };
  const openTrialDiary = trial => {
    if (!trial || !canEdit) return;
    const todayKey = today(settings?.timezone || "Africa/Cairo");
    const targetDate = todayKey < trial.startDate ? trial.startDate : trial.endDate && todayKey > trial.endDate ? trial.endDate : todayKey;
    const existing = diaryEntries.find(entry => entry.date === targetDate);
    if (existing?.trialId && existing.trialId !== trial.id) {
      return say("يوجد إدخال لهذا اليوم مرتبط بتجربة أخرى. اختر يومًا آخر من مفكرة البشرة حتى لا نغيّر ارتباطًا قائمًا.");
    }
    if (existing) {
      editDiaryEntry(existing);
      setDiaryDraft(current => ({ ...current, trialId: trial.id }));
    } else {
      setDiaryDate(targetDate);
      setEditingDiary("");
      setDiaryDraft({
        date: targetDate, skinRating: "", issuesText: "", note: "", sleepHours: "",
        sleepQuality: "", mood: "", exerciseMinutes: "", waterGlasses: "",
        areaMeasurements: { forehead: "", leftCheek: "", rightCheek: "", nose: "", chin: "", jawline: "" },
        trialId: trial.id,
      });
      setPage("diary");
    }
  };
  const editDiaryEntry = entry => {
    setEditingDiary(entry.id);
    setDiaryDate(entry.date);
    setDiaryDraft({ date: entry.date, skinRating: entry.skinRating ?? "", issuesText: (entry.issues || []).join("، "), note: entry.note || "", sleepHours: entry.sleepHours ?? "", sleepQuality: entry.sleepQuality ?? "", mood: entry.mood ?? "", exerciseMinutes: entry.exerciseMinutes ?? "", waterGlasses: entry.waterGlasses ?? "", areaMeasurements: entry.areaMeasurements || {}, trialId: entry.trialId || "" });
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
  const importIngredientCatalog = async catalog => {
    if (!canEdit) return { added: 0, skipped: catalog.length, failed: true };
    const allIngredients = arr(store.recs, SKINCARE_COLLECTIONS.ingredients);
    const knownNames = new Set(allIngredients.map(item => normalizeINCIName(item.inciName)).filter(Boolean));
    let added = 0;
    let skipped = 0;
    setBusy(true);
    try {
      for (const item of catalog) {
        const key = normalizeINCIName(item.inciName);
        if (!key || knownNames.has(key)) { skipped++; continue; }
        const checked = validateSkinIngredient({ ...item, id: uid() });
        if (!checked.ok) throw new Error(checked.error);
        const saved = await store.api.put(SKINCARE_COLLECTIONS.ingredients, checked.value);
        if (!saved) throw new Error("توقف استيراد الكتالوج عند " + item.inciName + ".");
        knownNames.add(key);
        added++;
      }
      say("اكتمل استيراد الأسماء المرجعية دون تعديل السجلات الموجودة.");
      return { added, skipped, failed: false };
    } catch (error) {
      say("توقف الاستيراد بعد إضافة " + added + "؛ يمكنك إعادة المحاولة وسيتم تجاوز الموجود: " + (error?.message || ""));
      return { added, skipped, failed: true };
    } finally {
      setBusy(false);
    }
  };

  const saveIngredient = async ingredient => {
    if (!canEdit) return false;
    const checked = validateSkinIngredient(ingredient);
    if (!checked.ok) return say(checked.error), false;
    const duplicate = ingredients.find(item => item.id !== ingredient.id && normalizeINCIName(item.inciName) === normalizeINCIName(checked.value.inciName));
    if (duplicate) return say("يوجد مكوّن بهذا الاسم بالفعل في مكتبتك."), false;
    setBusy(true);
    try {
      const saved = await store.api.put(SKINCARE_COLLECTIONS.ingredients, { ...checked.value, id: ingredient.id || uid() });
      if (!saved) throw new Error("لم يؤكد النظام حفظ المكوّن.");
      say(ingredient.id ? "تم تحديث المكوّن." : "تمت إضافة المكوّن.");
      return true;
    } catch (error) { say(error?.message || "تعذر حفظ المكوّن."); return false; }
    finally { setBusy(false); }
  };
  const deleteIngredient = async ingredient => {
    if (!canEdit || !window.confirm("نقل هذا المكوّن إلى المحذوفات؟")) return;
    const result = await store.api.softDelete(SKINCARE_COLLECTIONS.ingredients, ingredient.id);
    if (result) say("تم نقل المكوّن إلى المحذوفات.");
  };
  const restoreIngredient = async ingredient => {
    if (!canEdit) return;
    const duplicate = ingredients.some(item => item.id !== ingredient.id && normalizeINCIName(item.inciName) === normalizeINCIName(ingredient.inciName));
    if (duplicate) return say("يوجد مكوّن نشط بنفس الاسم؛ عالج التكرار قبل الاستعادة.");
    const result = await store.api.restore(SKINCARE_COLLECTIONS.ingredients, ingredient.id);
    if (result) say("تمت استعادة المكوّن.");
  };

  const createTrial = async input => {
    if (!canEdit) return false;
    const product = products.find(item => item.id === input.productId && item.status === "active");
    if (!product) return say("اختر منتجًا نشطًا مسجلًا."), false;
    if (product.suitability === "avoid") return say("هذا المنتج موسوم بأنه يُتجنب؛ لا تبدأ تجربة جديدة عليه."), false;
    if (trials.some(item => item.productId === input.productId && ["running", "paused"].includes(item.status))) {
      return say("يوجد بالفعل اختبار جارٍ أو متوقف مؤقتًا لهذا المنتج."), false;
    }
    const todayKey = today(settings?.timezone || "Africa/Cairo");
    const baselineDiaryIds = diaryEntries
      .filter(entry => entry.date >= new Date(Date.parse(todayKey + "T00:00:00Z") - 7 * 86400000).toISOString().slice(0, 10) &&
        entry.date < todayKey && entry.skinRating !== null && entry.skinRating !== undefined && entry.skinRating !== "")
      .map(entry => entry.id);
    const routineContext = routines.map(routine => ({
      routineId: routine.id,
      name: routine.name,
      status: routine.status,
      timeOfDay: routine.timeOfDay,
      steps: (routine.steps || []).filter(step => !step.archived && step.productId === input.productId)
        .map(step => ({ category: step.category, instruction: step.instruction || "" })),
    })).filter(item => item.steps.length > 0);
    const checked = validateSkinTrial({
      ...input,
      plannedDays: input.plannedDays || settings?.trialDays || 28,
      baselineDiaryIds,
      routineContext,
      status: "running",
      verdict: "pending",
      timelineEvents: [{ id: uid(), type: "started", date: todayKey, note: "بدء التجربة وحفظ خط الأساس" }],
    }, todayKey);
    if (!checked.ok) return say(checked.error), false;
    setBusy(true);
    try {
      const saved = await store.api.put(SKINCARE_COLLECTIONS.trials, { ...checked.value, id: uid() });
      if (!saved) throw new Error("لم يؤكد النظام حفظ التجربة.");
      say("بدأت التجربة وحُفظ خط الأساس من المفكرة.");
      return true;
    } catch (error) { say(error?.message || "تعذر بدء التجربة."); return false; }
    finally { setBusy(false); }
  };

  const updateTrialStatus = async (trial, nextStatus, details = {}) => {
    if (!canEdit) return false;
    const todayKey = today(settings?.timezone || "Africa/Cairo");
    const eventType = nextStatus === "paused" ? "paused" : nextStatus === "running" ? (trial.status === "planned" ? "started" : "resumed") : nextStatus;
    const timelineEvents = [...(trial.timelineEvents || []), {
      id: uid(),
      type: eventType,
      date: todayKey,
      note: nextStatus === "completed" ? "النتيجة: " + ({ improved: "تحسن ملحوظ", unchanged: "لم يتغير بوضوح", worse: "تدهور ملحوظ", inconclusive: "نتيجة غير حاسمة" }[details.verdict] || "غير محددة") : nextStatus === "cancelled" ? "إلغاء التجربة" : nextStatus === "paused" ? "إيقاف مؤقت" : trial.status === "planned" ? "بدء التجربة" : "استكمال التجربة",
    }];
    const checked = transitionSkinTrial(trial, nextStatus, { ...details, timelineEvents }, todayKey);
    if (!checked.ok) return say(checked.error), false;
    setBusy(true);
    try {
      const saved = await store.api.put(SKINCARE_COLLECTIONS.trials, { ...checked.value, id: trial.id });
      if (!saved) throw new Error("لم يؤكد النظام تحديث التجربة.");
      say(nextStatus === "completed" ? "تم إنهاء التجربة وحفظ النتيجة التي اخترتها." : "تم تحديث حالة التجربة.");
      return true;
    } catch (error) { say(error?.message || "تعذر تحديث التجربة."); return false; }
    finally { setBusy(false); }
  };

  const createReaction = async input => {
    if (!canEdit) return false;
    const product = products.find(item => item.id === input.productId);
    if (!product) return say("اختر منتجًا مسجلًا."), false;
    if (input.unitId && !units.some(unit => unit.id === input.unitId && unit.productId === input.productId)) {
      return say("العبوة المختارة لا تتبع المنتج المحدد."), false;
    }
    if ((input.suspectedIngredientIds || []).some(id => !ingredients.some(item => item.id === id))) {
      return say("توجد مكونات مشتبه بها لم تعد موجودة في المكتبة."), false;
    }
    const checked = validateSkinReaction(input, todayKey);
    if (!checked.ok) return say(checked.error), false;
    setBusy(true);
    try {
      const saved = await store.api.put(SKINCARE_COLLECTIONS.reactions, { ...checked.value, id: uid() });
      if (!saved) throw new Error("لم يؤكد النظام حفظ التفاعل.");
      say("تم تسجيل التفاعل. راجع المنتج والروتين يدويًا، ولم يتم إيقاف أي خطوة تلقائيًا.");
      return true;
    } catch (error) { say(error?.message || "تعذر تسجيل التفاعل."); return false; }
    finally { setBusy(false); }
  };

  const resolveReaction = async reaction => {
    if (!canEdit || reaction.status !== "open") return false;
    const checked = validateSkinReaction({ ...reaction, resolvedDate: todayKey, status: "resolved" }, todayKey);
    if (!checked.ok) return say(checked.error), false;
    setBusy(true);
    try {
      const saved = await store.api.put(SKINCARE_COLLECTIONS.reactions, { ...checked.value, id: reaction.id });
      if (!saved) throw new Error("لم يؤكد النظام حفظ التحديث.");
      say("تم تسجيل تاريخ حل التفاعل.");
      return true;
    } catch (error) { say(error?.message || "تعذر تحديث التفاعل."); return false; }
    finally { setBusy(false); }
  };

  const archiveReaction = async reaction => {
    if (!canEdit || reaction.status !== "open") return false;
    const checked = validateSkinReaction({ ...reaction, status: "archived" }, todayKey);
    if (!checked.ok) return say(checked.error), false;
    setBusy(true);
    try {
      const saved = await store.api.put(SKINCARE_COLLECTIONS.reactions, { ...checked.value, id: reaction.id });
      if (!saved) throw new Error("لم يؤكد النظام أرشفة التفاعل.");
      say("تمت أرشفة التفاعل مع الاحتفاظ بسجله.");
      return true;
    } catch (error) { say(error?.message || "تعذرت أرشفة التفاعل."); return false; }
    finally { setBusy(false); }
  };

  const uploadPhoto = async payload => {
    if (!canEdit || isDemo) return say("رفع الصور يتطلب صلاحية تعديل واتصالًا بمساحة عمل فعلية.");
    setBusy(true);
    try {
      await uploadSkinPhoto({ workspaceId: ws?.id, ...payload, photoId: uid(), storeApi: store.api });
      say("تم رفع الصورة والنسخة المصغرة وربطهما بإدخال اليوم.");
      return true;
    } catch (error) {
      say(error?.message || "تعذر رفع الصورة بأمان.");
      return false;
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
    if (!canEdit || busy) return;
    const checked = validateRoutine(routine);
    if (!checked.ok) return say(checked.error);
    const seenSteps = new Set();
    const validatedSteps = [];
    for (const step of checked.value.steps || []) {
      if (seenSteps.has(step.id)) return say("يوجد معرف مكرر لإحدى خطوات الروتين.");
      seenSteps.add(step.id);
      const stepCheck = validateRoutineStep({ ...step, avoidConfirmed: settings?.requireConfirmAvoid === false ? true : step.avoidConfirmed }, products);
      if (!stepCheck.ok) return say(stepCheck.error);
      validatedSteps.push(stepCheck.value);
    }
    setBusy(true);
    try {
      const saved = await store.api.put(SKINCARE_COLLECTIONS.routines, { ...checked.value, steps: validatedSteps, id: routine.id || uid(), updatedAt: new Date().toISOString() });
      if (!saved) throw new Error("لم يؤكد النظام حفظ الروتين.");
      say(routine.id ? "تم تحديث الروتين." : "تم إنشاء الروتين.");
      return true;
    } catch (error) { say(error?.message || "تعذر حفظ الروتين."); return false; }
    finally { setBusy(false); }
  };
  const toggleRoutine = async routine => {
    if (!canEdit || busy) return;
    setBusy(true);
    try {
      const saved = await store.api.put(SKINCARE_COLLECTIONS.routines, { ...routine, status: routine.status === "paused" ? "active" : "paused", updatedAt: new Date().toISOString() });
      if (saved) say(routine.status === "paused" ? "تم تفعيل الروتين." : "تم إيقاف الروتين مؤقتًا.");
      else say("لم يؤكد النظام تحديث حالة الروتين.");
    } catch (error) { say(error?.message || "تعذر تحديث حالة الروتين."); }
    finally { setBusy(false); }
  };
  const copyRoutine = async routine => {
    if (!canEdit || busy) return;
    const copy = { ...routine, id: uid(), name: routine.name + " (نسخة)", status: "paused", steps: (routine.steps || []).map(step => ({ ...step, id: uid() })), createdAt: new Date().toISOString() };
    setBusy(true);
    try {
      const saved = await store.api.put(SKINCARE_COLLECTIONS.routines, copy);
      if (saved) say("تم نسخ الروتين وخطواته.");
      else say("لم يؤكد النظام نسخ الروتين.");
    } catch (error) { say(error?.message || "تعذر نسخ الروتين."); }
    finally { setBusy(false); }
  };
  const logRoutineStep = async (routine, step, status) => {
    if (!canEdit || busy || routine.status !== "active") return;
    if (!["done", "skipped"].includes(status)) return say("حالة تسجيل الروتين غير صحيحة.");
    const date = today(settings?.timezone || "Africa/Cairo");
    const currentProduct = products.find(product => product.id === step.productId);
    if (!currentProduct || ["paused", "finished", "discarded", "stopped"].includes(currentProduct.status)) return say("لا يمكن تسجيل خطوة بمنتج غير متاح أو متوقف.");
    if (currentProduct.suitability === "avoid" && !step.avoidConfirmed) return say("هذا المنتج مصنف للتجنب؛ أعد مراجعة الخطوة قبل تسجيلها.");
    const id = routineLogId(routine.id, date, step.id);
    if (routineLogs.some(log => log.id === id || log.client_generated_id === id || (log.routineId === routine.id && log.stepId === step.id && log.date === date))) return say("تم تسجيل هذه الخطوة بالفعل اليوم.");
    setBusy(true);
    try {
      const saved = await store.api.put(SKINCARE_COLLECTIONS.routineLogs, { id, client_generated_id: id, routineId: routine.id, stepId: step.id, date, status, createdAt: new Date().toISOString() });
      if (saved) say(status === "done" ? "تم تسجيل تنفيذ الخطوة." : "تم تسجيل تخطي الخطوة.");
      else say("لم يؤكد النظام تسجيل الخطوة.");
    } catch (error) { say(error?.message || "تعذر تسجيل خطوة الروتين."); }
    finally { setBusy(false); }
  };
  const undoRoutineLog = async () => {
    if (!canEdit || busy || !routineLogs.length) return;
    const latest = [...routineLogs].sort((a, b) => String(b.createdAt || b.updated_at || "").localeCompare(String(a.createdAt || a.updated_at || "")))[0];
    if (!latest || !window.confirm("هل تريد التراجع عن آخر تسجيل؟")) return;
    setBusy(true);
    try {
      const result = await store.api.softDelete(SKINCARE_COLLECTIONS.routineLogs, latest.id);
      if (result) say("تم التراجع عن آخر تسجيل.");
      else say("لم يؤكد النظام التراجع عن التسجيل.");
    } catch (error) { say(error?.message || "تعذر التراجع عن التسجيل."); }
    finally { setBusy(false); }
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
    {store.ready && !store.error && page === "dashboard" && <SkinDashboard endDate={todayKey} diaryEntries={diaryEntries} trials={trials} reactions={reactions} photos={photos} routines={routines} routineLogs={routineLogs} products={products} />}
    {store.ready && !store.error && page === "followups" && <SkinFollowUps today={todayKey} timezone={settings?.timezone || "Africa/Cairo"} weekStartDay={settings?.weekStartDay ?? 6} expiryWindowDays={settings?.expirySoonDays ?? 30} products={products} units={units} routines={routines} routineLogs={routineLogs} trials={trials} reactions={reactions} setPage={setPage} />}
    {store.ready && !store.error && page === "settings" && <><ProfileView profile={profile} draft={profileDraft} setDraft={setProfileDraft} onSave={saveProfile} canEdit={canEdit} busy={busy} /><SkinSettingsView settings={settings} canEdit={canEdit} busy={busy} onSave={saveSettings} /><SkincareBackup records={store.recs} canEdit={canEdit} pending={store.pending > 0} workspaceId={ws?.id} isDemo={isDemo} onRestored={() => store.api.reload()} /></>}
    {store.ready && !store.error && page === "products" && <ProductsView products={products} deletedProducts={deletedProducts} onRestore={restoreProduct} draft={productDraft} setDraft={setProductDraft} onSave={saveProduct} onImportCsv={importProductsCsv} onEdit={editProduct} onDelete={deleteProduct} editing={editingProduct} setEditing={setEditingProduct} canEdit={canEdit} busy={busy} todayKey={todayKey} />}
    {store.ready && !store.error && page === "units" && <UnitsView units={units} deletedUnits={deletedUnits} onRestore={restoreUnit} products={products} todayKey={todayKey} expirySoonDays={settings?.expirySoonDays ?? 30} draft={unitDraft} setDraft={setUnitDraft} onSave={saveUnit} onEdit={editUnit} onDelete={deleteUnit} editing={editingUnit} setEditing={setEditingUnit} canEdit={canEdit} busy={busy} />}
    {store.ready && !store.error && page === "routines" && <RoutinesView routines={routines} logs={routineLogs} products={products} reactions={reactions.filter(item => item.status === "open")} canEdit={canEdit} busy={busy} todayKey={todayKey} timezone={settings?.timezone || "Africa/Cairo"} weekStartDay={settings?.weekStartDay ?? 6} requireConfirmAvoid={settings?.requireConfirmAvoid !== false} onSave={saveRoutine} onArchive={toggleRoutine} onCopy={copyRoutine} onLog={logRoutineStep} onUndo={undoRoutineLog} />}
    {store.ready && !store.error && page === "routine_logs" && <RoutineLogsView logs={routineLogs} deletedLogs={deletedRoutineLogs} routines={routines} products={products} canEdit={canEdit} busy={busy} onRestore={async log => { if (!canEdit || busy) return; if (!canRestoreSkinRoutineLog(log, routines, products, routineLogs)) return say("لا يمكن استعادة السجل: الروتين أو الخطوة أو المنتج المرتبط غير متاح، أو يوجد سجل نشط مكرر."); setBusy(true); try { const ok=await store.api.restore(SKINCARE_COLLECTIONS.routineLogs,log.id); if(ok) say("تمت استعادة سجل التنفيذ."); else say("لم يؤكد النظام استعادة السجل."); } catch(error) { say(error?.message || "تعذرت استعادة سجل التنفيذ."); } finally { setBusy(false); } }} onUndo={async log => { if (!canEdit || busy || !window.confirm("نقل سجل التنفيذ إلى المحذوفات؟")) return; setBusy(true); try { const ok=await store.api.softDelete(SKINCARE_COLLECTIONS.routineLogs,log.id); if(ok) say("تم نقل سجل التنفيذ إلى المحذوفات."); else say("لم يؤكد النظام حذف السجل."); } catch(error) { say(error?.message || "تعذر حذف سجل التنفيذ."); } finally { setBusy(false); } }} />}
    {store.ready && !store.error && page === "compare" && <SkinCompareView products={products} units={units} ingredients={ingredients} todayKey={todayKey} />}
    {store.ready && !store.error && page === "lists" && <SkinListsView lists={lists} deletedLists={deletedLists} products={products} canEdit={canEdit} busy={busy} onSave={saveList} onDelete={deleteList} onRestore={async list => { if (!canEdit || busy) return; if (hasDuplicateSkinListName(list, lists)) return say("يوجد اسم قائمة نشط مطابق؛ غيّر الاسم قبل الاستعادة."); if (!canRestoreSkinList(list, products)) return say("لا يمكن استعادة القائمة قبل استعادة المنتجات المرتبطة بها."); setBusy(true); try { const ok=await store.api.restore(SKINCARE_COLLECTIONS.lists,list.id); if(ok) say("تمت استعادة القائمة."); else say("لم يؤكد النظام استعادة القائمة."); } catch(error) { say(error?.message || "تعذرت استعادة القائمة."); } finally { setBusy(false); } }} onToggleProduct={toggleListProduct} />}
    {store.ready && !store.error && page === "diary" && <DiaryView entries={diaryEntries} deletedEntries={deletedDiaryEntries} trials={trials} selectedDate={diaryDate} setSelectedDate={setDiaryDate} draft={diaryDraft} setDraft={setDiaryDraft} editing={editingDiary} setEditing={setEditingDiary} onSave={saveDiaryEntry} onEdit={editDiaryEntry} onDelete={deleteDiaryEntry} onRestore={restoreDiaryEntry} canEdit={canEdit} busy={busy} />}
    {store.ready && !store.error && page === "photos" && <PhotosView workspaceId={ws?.id} entries={diaryEntries} photos={photos} deletedPhotos={deletedPhotos} isDemo={isDemo} canEdit={canEdit} busy={busy} onUpload={uploadPhoto} onDelete={removePhoto} onPurge={removePhoto} />}
    {store.ready && !store.error && page === "ingredients" && <IngredientsView ingredients={ingredients} deletedIngredients={deletedIngredients} products={products} canEdit={canEdit} busy={busy} onSave={saveIngredient} onDelete={deleteIngredient} onRestore={restoreIngredient} onImportCatalog={importIngredientCatalog} />}
    {store.ready && !store.error && page === "trials" && <TrialsView trials={trials} products={products} diaryEntries={diaryEntries} reactions={reactions} photos={photos} canEdit={canEdit} busy={busy} onCreate={createTrial} onTransition={updateTrialStatus} onAddDiary={openTrialDiary} />}
    {store.ready && !store.error && page === "reactions" && <ReactionsView reactions={reactions} products={products} units={units} ingredients={ingredients} routines={routines} canEdit={canEdit} busy={busy} onCreate={createReaction} onResolve={resolveReaction} onArchive={archiveReaction} setPage={setPage} />}
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

function ProductsView({ products, deletedProducts, onRestore, draft, setDraft, onSave, onImportCsv, onEdit, onDelete, editing, setEditing, canEdit, busy, todayKey }) {
  const [query, setQuery] = useState("");
  const [csvPreview, setCsvPreview] = useState(null);
  const [csvMessage, setCsvMessage] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const filteredProducts = products.filter(product => {
    const needle = normalizeSkinSearchText(query);
    const matchesQuery = !needle || [product.name, product.brand, product.ingredients, product.notes].some(value => normalizeSkinSearchText(value).includes(needle));
    return matchesQuery && (categoryFilter === "all" || product.category === categoryFilter) && (statusFilter === "all" || product.status === statusFilter);
  });
  return <><Panel title={editing ? "تعديل منتج" : "إضافة منتج"}>
    {canEdit ? <form onSubmit={onSave} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 11 }}>
      <Field title="اسم المنتج" value={draft.name} onChange={v => setDraft(d => ({ ...d, name: v }))} required />
      <Field title="العلامة التجارية" value={draft.brand} onChange={v => setDraft(d => ({ ...d, brand: v }))} />
      <Select title="التصنيف" value={draft.category} onChange={v => setDraft(d => ({ ...d, category: v }))} options={[["cleanser","غسول"],["moisturizer","مرطب"],["sunscreen","واقي شمس"],["serum","سيروم"],["treatment","علاج"],["toner","تونر"],["mask","قناع"],["other","أخرى"]]} />
      <Select title="الحالة" value={draft.status} onChange={v => setDraft(d => ({ ...d, status: v }))} options={[["active","نشط"],["paused","متوقف مؤقتًا"],["finished","منتهي"],["discarded","تم التخلص منه"]]} />
      <Select title="ملاءمة المنتج" value={draft.suitability || "suitable"} onChange={v => setDraft(d => ({ ...d, suitability: v }))} options={[["suitable","مناسب مبدئيًا"],["review","يحتاج مراجعة"],["avoid","تجنب"]]} />
      <Field title="تاريخ البدء" type="date" value={draft.startDate} onChange={v => setDraft(d => ({ ...d, startDate: v }))} />
      <Field title="تاريخ الانتهاء" type="date" value={draft.expiryDate} onChange={v => setDraft(d => ({ ...d, expiryDate: v }))} />
      <Field title="رابط المنتج" type="url" value={draft.url} onChange={v => setDraft(d => ({ ...d, url: v }))} />
      <Field title="موضع الاستخدام" value={draft.stepSlot} onChange={v => setDraft(d => ({ ...d, stepSlot: v }))} placeholder="مثال: AM / PM" />
      <label style={{ ...label, gridColumn: "1 / -1" }}>المكونات<textarea style={{ ...field, minHeight: 65 }} value={draft.ingredients} onChange={e => setDraft(d => ({ ...d, ingredients: e.target.value }))} maxLength={2000} /></label>
      <label style={{ ...label, gridColumn: "1 / -1" }}>طريقة الاستخدام<textarea style={{ ...field, minHeight: 65 }} value={draft.instructions} onChange={e => setDraft(d => ({ ...d, instructions: e.target.value }))} maxLength={1000} /></label>
      <label style={{ ...label, gridColumn: "1 / -1" }}>ملاحظات<textarea style={{ ...field, minHeight: 65 }} value={draft.notes} onChange={e => setDraft(d => ({ ...d, notes: e.target.value }))} maxLength={2000} /></label>
      <div style={{ display: "flex", gap: 8 }}><button style={button(true)} disabled={busy}> {editing ? "حفظ التعديل" : "إضافة المنتج"} </button>{editing && <button type="button" style={button()} onClick={() => { setEditing(""); setDraft(EMPTY_PRODUCT); }}>إلغاء</button>}</div>
    </form> : <p style={{ color: C.muted, fontSize: 12 }}>صلاحية العرض فقط.</p>}
  </Panel><Panel title={"قائمة المنتجات (" + filteredProducts.length + " من " + products.length + ")"}>
    {canEdit && <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", margin: "10px 0" }}>
      <label style={{ ...button(), display: "inline-flex", alignItems: "center", gap: 6 }}>استيراد CSV<input type="file" accept=".csv,text/csv" style={{ display: "none" }} onChange={async event => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { setCsvMessage("ملف CSV أكبر من 5 ميجابايت."); setCsvPreview(null); return; }
        const parsed = parseSkinProductsCsv(await file.text());
        if (!parsed.ok) { setCsvMessage((parsed.errors || [parsed.error]).join(" · ")); setCsvPreview(null); return; }
        setCsvPreview(parsed); setCsvMessage("");
      }} /></label>
      <button type="button" style={button()} onClick={() => {
        const blob = new Blob([serializeSkinProductsCsv(products)], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url; anchor.download = "skincare-products-" + todayKey + ".csv";
        document.body.appendChild(anchor); anchor.click(); anchor.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }}>تصدير المنتجات CSV</button>
    </div>}
    {csvMessage && <p role="status" style={{ color: C.danger, fontSize: 11 }}>{csvMessage}</p>}
    {csvPreview && <div style={{ border: "1px solid " + C.line, borderRadius: 10, padding: 10, margin: "8px 0 12px" }}>
      <b style={{ fontSize: 12 }}>معاينة استيراد المنتجات</b>
      <p style={{ color: C.muted, fontSize: 11 }}>عدد الصفوف: {csvPreview.rows.length}. سيتم تجاهل المنتج الموجود مسبقًا بنفس الاسم والعلامة التجارية، ولن يتم استبدال بياناته.</p>
      {csvPreview.unknownHeaders?.length > 0 && <p style={{ color: "#B45309", fontSize: 10 }}>أعمدة غير مدعومة سيتم تجاهلها: {csvPreview.unknownHeaders.join("، ")}</p>}
      <div style={{ maxHeight: 150, overflow: "auto", fontSize: 11 }}>{csvPreview.rows.slice(0, 10).map((row, index) => <div key={index} style={{ padding: "5px 0", borderBottom: "1px solid " + C.line }}>{row.name} · {row.brand || "بدون علامة"} · {row.category}</div>)}</div>
      {csvPreview.rows.length > 10 && <p style={{ color: C.muted, fontSize: 10 }}>يُعرض أول 10 منتجات فقط في المعاينة.</p>}
      <div style={{ display: "flex", gap: 7, marginTop: 8 }}><button type="button" style={button(true)} disabled={busy || !csvPreview.rows.length} onClick={async () => {
        const result = await onImportCsv(csvPreview.rows);
        setCsvMessage(result ? "أُضيف " + result.added + "، وتُجاوز " + result.skipped + " موجودًا." + (result.failed ? " توقف الاستيراد ويمكن إعادة المحاولة بعد مراجعة السبب." : "") : "تعذر استيراد الملف.");
        if (result && !result.failed) setCsvPreview(null);
      }}>تأكيد الاستيراد</button><button type="button" style={button()} disabled={busy} onClick={() => setCsvPreview(null)}>إلغاء</button></div>
    </div>}
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 8, margin: "10px 0" }}>
      <input aria-label="البحث في المنتجات" style={field} value={query} onChange={e => setQuery(e.target.value)} placeholder="ابحث بالاسم أو العلامة أو المكونات" />
      <select aria-label="تصفية حسب التصنيف" style={field} value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}><option value="all">كل التصنيفات</option>{[["cleanser","غسول"],["moisturizer","مرطب"],["sunscreen","واقي شمس"],["serum","سيروم"],["treatment","علاج"],["toner","تونر"],["mask","قناع"],["other","أخرى"]].map(([value,title]) => <option key={value} value={value}>{title}</option>)}</select>
      <select aria-label="تصفية حسب الحالة" style={field} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option value="all">كل الحالات</option>{[["active","نشط"],["paused","متوقف مؤقتًا"],["finished","منتهي"],["discarded","تم التخلص منه"]].map(([value,title]) => <option key={value} value={value}>{title}</option>)}</select>
    </div>
    {filteredProducts.map(p => <article key={p.id} style={{ padding: "12px 0", borderTop: "1px solid " + C.line, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
      <div><b>{p.name}</b><div style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>{p.brand || "بدون علامة"} · {p.category} · {p.status}{p.expiryDate ? " · ينتهي " + p.expiryDate : ""}</div>{p.ingredients && <p style={{ color: C.muted, fontSize: 11, margin: "5px 0" }}>المكونات: {p.ingredients}</p>}{p.url && <a href={p.url} target="_blank" rel="noreferrer" style={{fontSize:11}}>فتح صفحة المنتج ↗</a>}</div>
      {canEdit && <div style={{ display: "flex", gap: 6 }}><button style={button()} onClick={() => onEdit(p)}>تعديل</button><button style={{ ...button(), color: C.danger }} onClick={() => onDelete(p)}>حذف</button></div>}
    </article>)}
    {!products.length && <p style={{ color: C.muted, fontSize: 12 }}>لم تتم إضافة منتجات بعد.</p>}
    {!!products.length && !filteredProducts.length && <p style={{ color: C.muted, fontSize: 12 }}>لا توجد منتجات تطابق البحث والفلاتر الحالية.</p>}
    {!!deletedProducts.length && <details style={{ marginTop: 12 }}><summary style={{ cursor: "pointer", color: C.muted, fontSize: 12 }}>المحذوفات ({deletedProducts.length})</summary>{deletedProducts.map(p => <div key={p.id} style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "9px 0", borderTop: "1px solid " + C.line }}><span style={{ fontSize: 12 }}>{p.name}</span>{canEdit && <button type="button" style={button()} onClick={() => onRestore(p)}>استعادة</button>}</div>)}</details>}
  </Panel></>;
}

function UnitsView({ units, deletedUnits, onRestore, products, todayKey, expirySoonDays = 30, draft, setDraft, onSave, onEdit, onDelete, editing, setEditing, canEdit, busy }) {
  const [query, setQuery] = useState("");
  const [productFilter, setProductFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const filteredUnits = units.filter(unit => {
    const needle = normalizeSkinSearchText(query);
    const productName = products.find(product => product.id === unit.productId)?.name || "";
    const matchesQuery = !needle || [unit.name, unit.sizeNote, unit.notes, productName].some(value => normalizeSkinSearchText(value).includes(needle));
    return matchesQuery && (productFilter === "all" || unit.productId === productFilter) && (statusFilter === "all" || skinUnitStatus(unit, todayKey, expirySoonDays) === statusFilter);
  });
  return <><Panel title={editing ? "تعديل عبوة" : "تسجيل عبوة"}>
    {canEdit ? <form onSubmit={onSave} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 11 }}>
      <Field title="اسم العبوة" value={draft.name} onChange={v => setDraft(d => ({ ...d, name: v }))} required />
      <Select title="المنتج" value={draft.productId} onChange={v => setDraft(d => ({ ...d, productId: v }))} options={[["","بدون ربط"], ...products.map(p => [p.id, p.name])]} />
      <Field title="تاريخ الشراء" type="date" value={draft.purchaseDate} onChange={v => setDraft(d => ({ ...d, purchaseDate: v }))} />
      <Field title="تاريخ الفتح" type="date" value={draft.openedOn} onChange={v => setDraft(d => ({ ...d, openedOn: v }))} />
      <Field title="مدة الصلاحية بعد الفتح (شهر)" type="number" value={draft.paoMonths} onChange={v => setDraft(d => ({ ...d, paoMonths: v }))} />
      <Field title="تاريخ الانتهاء المطبوع" type="date" value={draft.expiresOn} onChange={v => setDraft(d => ({ ...d, expiresOn: v }))} />
      <Field title="بدء الاستخدام" type="date" value={draft.startedUseDate} onChange={v => setDraft(d => ({ ...d, startedUseDate: v }))} />
      <Field title="تاريخ الانتهاء الفعلي" type="date" value={draft.finishedDate} onChange={v => setDraft(d => ({ ...d, finishedDate: v }))} />
      <Field title="السعر" type="number" value={draft.price} onChange={v => setDraft(d => ({ ...d, price: v }))} />
      <Field title="العملة (ISO)" value={draft.currency} onChange={v => setDraft(d => ({ ...d, currency: v }))} />
      <Field title="الحجم / الكمية" value={draft.sizeNote} onChange={v => setDraft(d => ({ ...d, sizeNote: v }))} />
      <Field title="سبب الانتهاء" value={draft.finishReason} onChange={v => setDraft(d => ({ ...d, finishReason: v }))} />
      <label style={{ ...label, gridColumn: "1 / -1" }}>ملاحظات<textarea style={{ ...field, minHeight: 65 }} value={draft.notes} onChange={e => setDraft(d => ({ ...d, notes: e.target.value }))} maxLength={1000} /></label>
      <div style={{ display: "flex", gap: 8 }}><button style={button(true)} disabled={busy}>{editing ? "حفظ التعديل" : "إضافة العبوة"}</button>{editing && <button type="button" style={button()} onClick={() => { setEditing(""); setDraft(EMPTY_UNIT); }}>إلغاء</button>}</div>
    </form> : <p style={{ color: C.muted, fontSize: 12 }}>صلاحية العرض فقط.</p>}
  </Panel><Panel title={"العبوات (" + filteredUnits.length + " من " + units.length + ")"}>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 8, margin: "10px 0" }}>
      <input aria-label="البحث في العبوات" style={field} value={query} onChange={e => setQuery(e.target.value)} placeholder="ابحث باسم العبوة أو المنتج" />
      <select aria-label="تصفية العبوات حسب المنتج" style={field} value={productFilter} onChange={e => setProductFilter(e.target.value)}><option value="all">كل المنتجات</option>{products.map(product => <option key={product.id} value={product.id}>{product.name}</option>)}</select>
      <select aria-label="تصفية العبوات حسب الحالة" style={field} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option value="all">كل الحالات</option>{[["unopened","غير مفتوحة"],["active","قيد الاستخدام"],["expiring_soon","قريبة الانتهاء"],["expired","منتهية الصلاحية"],["finished","منتهية الاستخدام"]].map(([value,title]) => <option key={value} value={value}>{title}</option>)}</select>
    </div>
    {filteredUnits.map(u => <article key={u.id} style={{ padding: "12px 0", borderTop: "1px solid " + C.line, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
      <div><b>{u.name}</b><div style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>{products.find(p => p.id === u.productId)?.name || "غير مرتبطة بمنتج"} · شراء: {u.purchaseDate || "—"} · فتح: {u.openedOn || "—"} · انتهاء فعلي/محسوب: {effectiveSkinUnitExpiry(u) || "غير معروف"} · الحالة: {skinUnitStatus(u,todayKey,expirySoonDays)} · السعر: {u.price==null||u.price===""?"—":u.price+" "+(u.currency||"")} · تكلفة الاستخدام اليومية: {unitCostPerDay(u,todayKey)==null?"غير متاحة":unitCostPerDay(u,todayKey).toFixed(2)+" "+(u.currency||"")} </div></div>
      {canEdit && <div style={{ display: "flex", gap: 6 }}><button style={button()} onClick={() => onEdit(u)}>تعديل</button><button style={{ ...button(), color: C.danger }} onClick={() => onDelete(u)}>حذف</button></div>}
    </article>)}
    {!units.length && <p style={{ color: C.muted, fontSize: 12 }}>لا توجد عبوات مسجلة.</p>}
    {!!units.length && !filteredUnits.length && <p style={{ color: C.muted, fontSize: 12 }}>لا توجد عبوات تطابق البحث والفلاتر الحالية.</p>}
    {!!deletedUnits.length && <details style={{ marginTop: 12 }}><summary style={{ cursor: "pointer", color: C.muted, fontSize: 12 }}>العبوات المحذوفة ({deletedUnits.length})</summary>{deletedUnits.map(u => <div key={u.id} style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "9px 0", borderTop: "1px solid " + C.line }}><span style={{ fontSize: 12 }}>{u.name}</span>{canEdit && <button type="button" style={button()} onClick={() => onRestore(u)}>استعادة</button>}</div>)}</details>}
  </Panel></>;
}

