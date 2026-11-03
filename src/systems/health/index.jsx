import React, { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../core/supabase.js";
import { healthRepository } from "./repository.js";
import HealthAnalytics from "./HealthAnalytics.jsx";
import HealthVisitSummary from "./HealthVisitSummary.jsx";
import HealthBodyMap, { BODY_REGION_LABELS } from "./HealthBodyMap.jsx";
import HealthSearch from "./HealthSearch.jsx";
import HealthTimeline from "./HealthTimeline.jsx";

const COLORS = { ink: "#182230", muted: "#64748B", border: "#E2E8F0", blue: "#0EA5E9", bg: "#F8FAFC", green: "#047857", red: "#B91C1C" };
const CARD = { background: "#fff", border: "1px solid " + COLORS.border, borderRadius: 16, padding: 20, boxShadow: "0 4px 14px rgba(15,23,42,.035)" };
const FIELD = { width: "100%", boxSizing: "border-box", padding: "11px 12px", border: "1px solid #CBD5E1", borderRadius: 10, background: "#fff", color: COLORS.ink, fontSize: 14 };
const LABEL = { display: "block", fontSize: 12, color: COLORS.muted, marginBottom: 6, fontWeight: 700 };
const PRIMARY = { border: 0, borderRadius: 10, padding: "11px 15px", background: COLORS.blue, color: "#fff", fontWeight: 800, cursor: "pointer" };
const SECONDARY = { border: "1px solid #CBD5E1", borderRadius: 10, padding: "10px 13px", background: "#fff", color: COLORS.ink, fontWeight: 700, cursor: "pointer" };
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SCOPE_OPTIONS = [
  ["symptoms", "الأعراض"], ["flare_events", "نوبات التهيّج"], ["medications", "الأدوية والعلاجات"],
  ["measurements", "القياسات"], ["conditions", "الحالات الطبية"], ["documents", "الوثائق الطبية"], ["reports", "التقارير"], ["checkins", "المتابعة اليومية"], ["trackers", "العوامل والمتتبعات"], ["sensitive_trackers", "المتتبعات الحساسة"]
];

function fmtDate(value) {
  if (!value) return "—";
  try { return new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); }
  catch { return String(value); }
}
function demoKey(prefix, userId) { return "health-h1:" + prefix + ":" + userId; }
function readDemo(store, key, fallback) {
  if (!store.current[key]) store.current[key] = fallback;
  return store.current[key];
}

export default function HealthSystem({ authUser, isDemo, demoStore, page = "home", setPage, shell }) {
  const userId = authUser?.id || "demo-user";
  const [profiles, setProfiles] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [grants, setGrants] = useState([]);
  const [auditEvents, setAuditEvents] = useState([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [newName, setNewName] = useState("ملفي الصحي");
  const [editName, setEditName] = useState("");
  const [timezone, setTimezone] = useState("Africa/Cairo");
  const [locale, setLocale] = useState("ar-EG");
  const [granteeId, setGranteeId] = useState("");
  const [grantRole, setGrantRole] = useState("viewer");
  const [scopes, setScopes] = useState(["documents"]);
  const [expiresDate, setExpiresDate] = useState("");
  const [conditions, setConditions] = useState([]);
  const [allergies, setAllergies] = useState([]);
  const [symptomDefinitions, setSymptomDefinitions] = useState([]);
  const [symptomLogs, setSymptomLogs] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [medications, setMedications] = useState([]);
  const [medicationVersions, setMedicationVersions] = useState([]);
  const [medicationEvents, setMedicationEvents] = useState([]);
  const [sideEffects, setSideEffects] = useState([]);
  const [medicationReminders, setMedicationReminders] = useState([]);
  const [flareEvents, setFlareEvents] = useState([]);
  const [dailyCheckins, setDailyCheckins] = useState([]);
  const [factors, setFactors] = useState([]);
  const [factorLogs, setFactorLogs] = useState([]);
  const [cycleEntries, setCycleEntries] = useState([]);
  const [measurements, setMeasurements] = useState([]);
  const [measurementDraft, setMeasurementDraft] = useState({id:"",measurement_type:"weight",value_primary:"",value_secondary:"",recorded_at:new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16),source:"manual",context:"",notes:""});
  const [medicationDraft, setMedicationDraft] = useState({name:"",brand:"",medication_type:"medication",dose_amount:"",dose_unit:"mg",route:"oral",frequency:"once_daily",schedule_times:"08:00",effective_from:new Date().toISOString().slice(0,10),start_date:new Date().toISOString().slice(0,10),prescribed_by:"",instructions:""});
  const [versionDraft, setVersionDraft] = useState({medication_id:"",dose_amount:"",dose_unit:"mg",route:"oral",frequency:"once_daily",schedule_times:"08:00",effective_from:new Date().toISOString().slice(0,10),instructions:""});
  const [sideEffectDraft, setSideEffectDraft] = useState({medication_id:"",medication_event_id:"",name:"",severity:"unknown",occurred_at:new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16),notes:""});
  const [reminderDraft, setReminderDraft] = useState({medication_id:"",remind_at:""});
  const [flareDraft, setFlareDraft] = useState({title:"",severity:"3",started_at:new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16),symptoms:"",suspected_triggers:"",relief_actions:"",notes:""});
  const [checkinDraft, setCheckinDraft] = useState({entry_date:new Date().toISOString().slice(0,10),mood_score:"",energy_score:"",stress_score:"",sleep_hours:"",sleep_quality:"",digestion_status:"",digestion_severity:"",notes:""});
  const [factorDraft, setFactorDraft] = useState({name:"",category:"general",value_type:"scale",unit:"",scale_min:"1",scale_max:"5",choice_options:"",is_sensitive:false});
  const [factorLogDraft, setFactorLogDraft] = useState({id:"",factor_id:"",recorded_at:new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16),value:"",notes:""});
  const [cycleDraft, setCycleDraft] = useState({entry_date:new Date().toISOString().slice(0,10),flow_intensity:"unknown",period_start:"",period_end:"",symptoms:"",notes:""});

  const [documentFile, setDocumentFile] = useState(null);
  const [documentDraft, setDocumentDraft] = useState({ display_name:"", document_type:"other", document_date:"", notes:"" });

  const [conditionDraft, setConditionDraft] = useState({ name:"", condition_type:"unknown", diagnosed_on:"", diagnosed_by:"", notes:"" });
  const [allergyDraft, setAllergyDraft] = useState({ allergen:"", reaction:"", severity:"unknown", first_observed_on:"", notes:"" });
  const [symptomDraft, setSymptomDraft] = useState({ name:"", category:"" });
  const [symptomLogDraft, setSymptomLogDraft] = useState({ symptom_definition_id:"", severity:"3", recorded_at:new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16), duration_minutes:"", body_location:"", body_region_code:null, body_view:null, body_x:null, body_y:null, notes:"" });
  const [bodyMapTargetId,setBodyMapTargetId] = useState("");
  const [symptomMapView,setSymptomMapView] = useState("front");
  const [bodyMapView,setBodyMapView] = useState("front");
  const [bodyMapDraft,setBodyMapDraft] = useState({body_region_code:null,body_view:"front",body_x:null,body_y:null,body_location:""});


  const selected = useMemo(() => profiles.find(p => p.id === selectedId) || profiles[0] || null, [profiles, selectedId]);
  const isOwner = !!selected && (isDemo || selected.owner_user_id === userId);
  const hasScopeAction = (scope, action) => {
    if (isOwner) return true;
    const now = Date.now();
    return grants.some(g => g.grantee_user_id === userId && !g.revoked_at && new Date(g.starts_at).getTime() <= now && (!g.expires_at || new Date(g.expires_at).getTime() > now) && (g.scope_keys?.includes("all") || g.scope_keys?.includes(scope)) && g.actions?.includes(action));
  };
  const storeDemoRows = (type, rows) => { if (isDemo && demoStore?.current && selected?.id) demoStore.current[demoKey(type + ":" + selected.id, userId)] = rows; };


  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      let rows;
      if (isDemo) {
        rows = readDemo(demoStore, demoKey("profiles", userId), []).map(p => ({ ...p }));
      } else {
        rows = await healthRepository.listProfiles();
      }
      setProfiles(rows);
      setSelectedId(current => rows.some(p => p.id === current) ? current : (rows[0]?.id || ""));
    } catch (e) {
      setError(e?.message || "تعذر تحميل الملف الصحي.");
    } finally { setLoading(false); }
  }, [isDemo, demoStore, userId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!selected) { setGrants([]); setAuditEvents([]); setEditName(""); return; }
    setEditName(selected.display_name || "");
    setTimezone(selected.timezone || "Africa/Cairo");
    setLocale(selected.locale || "ar-EG");
    let cancelled = false;
    (async () => {
      try {
        if (isDemo) {
          const g = readDemo(demoStore, demoKey("grants:" + selected.id, userId), []);
          if (!cancelled) { setGrants(g.map(x => ({ ...x }))); setAuditEvents([]); }
        } else {
          const [g, a] = await Promise.all([
            healthRepository.listGrants(selected.id),
            selected.owner_user_id === userId ? healthRepository.listAuditEvents(selected.id) : Promise.resolve([])
          ]);
          if (!cancelled) { setGrants(g); setAuditEvents(a); }
        }
      } catch (e) { if (!cancelled) setError(e?.message || "تعذر تحميل صلاحيات المشاركة."); }
    })();
    return () => { cancelled = true; };
  }, [selected?.id, selected?.owner_user_id, isDemo, demoStore, userId]);


  useEffect(() => {
    if (!selected?.id) { setConditions([]); setAllergies([]); setSymptomDefinitions([]); setSymptomLogs([]); setDocuments([]); setMedications([]); setMedicationVersions([]); setMedicationEvents([]); setSideEffects([]); setMedicationReminders([]); setFlareEvents([]); setDailyCheckins([]); setFactors([]); setFactorLogs([]); setCycleEntries([]); setMeasurements([]); setBodyMapTargetId(""); setBodyMapDraft({body_region_code:null,body_view:"front",body_x:null,body_y:null,body_location:""}); setMeasurements([]); setBodyMapTargetId(""); setBodyMapDraft({body_region_code:null,body_view:"front",body_x:null,body_y:null,body_location:""}); return; }
    let cancelled = false;
    setDailyCheckins([]); setFactors([]); setFactorLogs([]); setCycleEntries([]);
    (async () => {
      try {
        let rows;
        if (isDemo) rows = {
          conditions: readDemo(demoStore, demoKey("conditions:" + selected.id, userId), []).map(x=>({...x})),
          allergies: readDemo(demoStore, demoKey("allergies:" + selected.id, userId), []).map(x=>({...x})),
          definitions: readDemo(demoStore, demoKey("symptoms:" + selected.id, userId), []).map(x=>({...x})),
          logs: readDemo(demoStore, demoKey("symptom-logs:" + selected.id, userId), []).map(x=>({...x})),
          documents: readDemo(demoStore, demoKey("documents:" + selected.id, userId), []).map(x=>({...x})),
          medications: readDemo(demoStore, demoKey("medications:" + selected.id, userId), []).map(x=>({...x})),
          versions: readDemo(demoStore, demoKey("medication-versions:" + selected.id, userId), []).map(x=>({...x})),
          events: readDemo(demoStore, demoKey("medication-events:" + selected.id, userId), []).map(x=>({...x})),
          sideEffects: readDemo(demoStore, demoKey("medication-side-effects:" + selected.id, userId), []).map(x=>({...x})),
          reminders: readDemo(demoStore, demoKey("medication-reminders:" + selected.id, userId), []).map(x=>({...x})),
          flares: readDemo(demoStore, demoKey("flare-events:" + selected.id, userId), []).map(x=>({...x})),
          checkins: readDemo(demoStore, demoKey("daily-checkins:" + selected.id, userId), []).map(x=>({...x})),
          factors: readDemo(demoStore, demoKey("factors:" + selected.id, userId), []).map(x=>({...x})),
          factorLogs: readDemo(demoStore, demoKey("factor-logs:" + selected.id, userId), []).map(x=>({...x})),
          cycleEntries: (isOwner && selected.cycle_tracking_enabled) ? readDemo(demoStore, demoKey("cycle-entries:" + selected.id, userId), []).map(x=>({...x})) : [],
          measurements: readDemo(demoStore, demoKey("measurements:" + selected.id, userId), []).map(x=>({...x}))
        };
        else {
          const result = await Promise.all([healthRepository.listConditions(selected.id),healthRepository.listAllergies(selected.id),healthRepository.listSymptomDefinitions(selected.id),healthRepository.listSymptomLogs(selected.id),healthRepository.listDocuments(selected.id),healthRepository.listMedications(selected.id),healthRepository.listMedicationVersions(selected.id),healthRepository.listMedicationEvents(selected.id),healthRepository.listMedicationSideEffects(selected.id),healthRepository.listMedicationReminders(selected.id),healthRepository.listFlareEvents(selected.id),healthRepository.listDailyCheckins(selected.id),healthRepository.listFactors(selected.id),healthRepository.listFactorLogs(selected.id),(selected.owner_user_id===userId&&selected.cycle_tracking_enabled)?healthRepository.listCycleEntries(selected.id):Promise.resolve([]),healthRepository.listMeasurements(selected.id)]);
          rows = {conditions:result[0],allergies:result[1],definitions:result[2],logs:result[3],documents:result[4],medications:result[5],versions:result[6],events:result[7],sideEffects:result[8],reminders:result[9],flares:result[10],checkins:result[11],factors:result[12],factorLogs:result[13],cycleEntries:result[14],measurements:result[15]};
        }
        if (!cancelled) { setConditions(rows.conditions); setAllergies(rows.allergies); setSymptomDefinitions(rows.definitions); setSymptomLogs(rows.logs); setDocuments(rows.documents || []); setMedications(rows.medications||[]); setMedicationVersions(rows.versions||[]); setMedicationEvents(rows.events||[]); setSideEffects(rows.sideEffects||[]); setMedicationReminders(rows.reminders||[]); setFlareEvents(rows.flares||[]); setDailyCheckins(rows.checkins||[]); setFactors(rows.factors||[]); setFactorLogs(rows.factorLogs||[]); setCycleEntries(rows.cycleEntries||[]); setMeasurements(rows.measurements||[]); }
      } catch(e) { if(!cancelled) setError(e?.message || "تعذر تحميل السجل الصحي."); }
    })();
    return () => { cancelled = true; };
  }, [selected?.id,selected?.owner_user_id,selected?.cycle_tracking_enabled,isDemo,demoStore,userId]);

  useEffect(() => {
    const existing = dailyCheckins.find(row => row.entry_date === checkinDraft.entry_date);
    if (existing) setCheckinDraft({
      entry_date: existing.entry_date, mood_score: existing.mood_score ?? "", energy_score: existing.energy_score ?? "",
      stress_score: existing.stress_score ?? "", sleep_hours: existing.sleep_hours ?? "", sleep_quality: existing.sleep_quality ?? "",
      digestion_status: existing.digestion_status ?? "", digestion_severity: existing.digestion_severity ?? "", notes: existing.notes ?? ""
    });
    else setCheckinDraft(d => ({ ...d, mood_score:"",energy_score:"",stress_score:"",sleep_hours:"",sleep_quality:"",digestion_status:"",digestion_severity:"",notes:"" }));
  }, [dailyCheckins, checkinDraft.entry_date]);

  useEffect(() => {
    const existing = cycleEntries.find(row => row.entry_date === cycleDraft.entry_date);
    if (existing) setCycleDraft({
      entry_date: existing.entry_date, flow_intensity: existing.flow_intensity || "unknown",
      period_start: existing.period_start || "", period_end: existing.period_end || "",
      symptoms: existing.symptoms || "", notes: existing.notes || ""
    });
    else setCycleDraft(d => ({ ...d, flow_intensity:"unknown",period_start:"",period_end:"",symptoms:"",notes:"" }));
  }, [cycleEntries, cycleDraft.entry_date, selected?.id]);

  async function createProfile(e) {
    e?.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const name = newName.trim();
      if (!name) throw new Error("اكتب اسمًا للملف الصحي.");
      let profile;
      if (isDemo) {
        profile = { id: "demo-health-" + userId, owner_user_id: userId, display_name: name, profile_type: "self", status: "active", timezone: "Africa/Cairo", locale: "ar-EG", created_at: new Date().toISOString() };
        const key = demoKey("profiles", userId);
        demoStore.current[key] = [...readDemo(demoStore, key, []), profile];
      } else {
        profile = await healthRepository.createProfile({ ownerUserId: userId, displayName: name, timezone, locale });
      }
      setProfiles(current => [profile, ...current]); setSelectedId(profile.id);
      setNewName("ملفي الصحي"); setNotice("تم إنشاء الملف الصحي. لم تُضف أي بيانات طبية بعد.");
    } catch (e) { setError(e?.message || "تعذر إنشاء الملف الصحي."); }
    finally { setBusy(false); }
  }

  async function saveProfile(e) {
    e?.preventDefault(); if (!selected || !isOwner) return;
    setBusy(true); setError(""); setNotice("");
    try {
      let updated;
      if (isDemo) updated = { ...selected, display_name: editName.trim(), timezone, locale, updated_at: new Date().toISOString() };
      else updated = await healthRepository.updateProfile({ profileId: selected.id, ownerUserId: userId, displayName: editName, timezone, locale });
      setProfiles(rows => rows.map(p => p.id === selected.id ? { ...updated, cycle_tracking_enabled: !!selected.cycle_tracking_enabled } : p));
      if (isDemo) {
        const key = demoKey("profiles", userId);
        demoStore.current[key] = (demoStore.current[key] || []).map(p => p.id === selected.id ? updated : p);
      }
      setNotice("تم حفظ إعدادات الملف الصحي.");
    } catch (e) { setError(e?.message || "تعذر حفظ الملف الصحي."); }
    finally { setBusy(false); }
  }

  async function addGrant(e) {
    e?.preventDefault(); if (!selected || !isOwner) return;
    setBusy(true); setError(""); setNotice("");
    try {
      if (!UUID_RE.test(granteeId.trim())) throw new Error("أدخل UUID صحيحًا لحساب المستخدم المستهدف.");
      if (granteeId.trim() === userId) throw new Error("لا تحتاج إلى منح نفسك صلاحية.");
      const expiry = expiresDate ? new Date(expiresDate + "T23:59:59").toISOString() : null;
      if (expiry && new Date(expiry) <= new Date()) throw new Error("تاريخ انتهاء التفويض يجب أن يكون في المستقبل.");
      const scopeKeys = Array.from(new Set(["profile", ...scopes]));
      let grant;
      if (isDemo) {
        grant = { id: "demo-grant-" + Date.now(), profile_id: selected.id, grantee_user_id: granteeId.trim(), granted_by: userId, grant_role: grantRole, scope_keys: scopeKeys, actions: grantRole === "viewer" ? ["read"] : ["read","create","update","delete"], starts_at: new Date().toISOString(), expires_at: expiry, revoked_at: null, created_at: new Date().toISOString() };
        const key = demoKey("grants:" + selected.id, userId);
        const prior = readDemo(demoStore, key, []).filter(g => g.grantee_user_id !== grant.grantee_user_id);
        demoStore.current[key] = [grant, ...prior];
      } else {
        grant = await healthRepository.saveGrant({ profileId: selected.id, ownerUserId: userId, granteeUserId: granteeId.trim(), grantRole, scopeKeys, expiresAt: expiry });
      }
      setGrants(current => [grant, ...current.filter(g => g.grantee_user_id !== grant.grantee_user_id)]);
      setGranteeId(""); setExpiresDate(""); setNotice("تم حفظ التفويض. سيظل الوصول خاضعًا لسياسات قاعدة البيانات.");
    } catch (e) { setError(e?.message || "تعذر إنشاء التفويض."); }
    finally { setBusy(false); }
  }

  async function revokeGrant(grant) {
    if (!selected || !isOwner || !grant || grant.revoked_at) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const revokedAt = new Date().toISOString();
      let updated;
      if (isDemo) updated = { ...grant, revoked_at: revokedAt, updated_at: revokedAt };
      else updated = await healthRepository.revokeGrant({ grantId: grant.id, profileId: selected.id, ownerUserId: userId });
      setGrants(rows => rows.map(g => g.id === grant.id ? updated : g));
      if (isDemo) {
        const key = demoKey("grants:" + selected.id, userId);
        demoStore.current[key] = (demoStore.current[key] || []).map(g => g.id === grant.id ? updated : g);
      }
      setNotice("أُلغي التفويض. يجب أن تمنع قاعدة البيانات الوصول من الطلبات التالية.");
    } catch (e) { setError(e?.message || "تعذر إلغاء التفويض."); }
    finally { setBusy(false); }
  }


  async function addCondition(e) {
    e?.preventDefault(); if(!selected || !hasScopeAction("conditions","create")) return;
    setBusy(true);setError("");setNotice("");
    try {
      const payload={...conditionDraft,name:conditionDraft.name.trim(),diagnosed_on:conditionDraft.diagnosed_on||null,diagnosed_by:conditionDraft.diagnosed_by.trim()||null,notes:conditionDraft.notes.trim()||null};
      if(!payload.name) throw new Error("اكتب اسم الحالة الطبية.");
      let row;
      if(isDemo){row={...payload,id:"demo-condition-"+Date.now(),profile_id:selected.id,status:"active",created_by:userId,created_at:new Date().toISOString()};const rows=[row,...conditions];storeDemoRows("conditions",rows);setConditions(rows);}
      else{row=await healthRepository.createCondition({profileId:selected.id,actorUserId:userId,condition:payload});setConditions(rows=>[row,...rows]);}
      setConditionDraft({name:"",condition_type:"unknown",diagnosed_on:"",diagnosed_by:"",notes:""});setNotice("تمت إضافة الحالة الطبية.");
    }catch(e){setError(e?.message||"تعذرت إضافة الحالة.");}finally{setBusy(false);}
  }
  async function toggleCondition(row) {
    if(!selected||!hasScopeAction("conditions","update"))return;const patch={status:row.status==="active"?"resolved":"active",resolved_on:row.status==="active"?new Date().toISOString().slice(0,10):null};setBusy(true);setError("");
    try{if(isDemo){const rows=conditions.map(x=>x.id===row.id?{...x,...patch}:x);storeDemoRows("conditions",rows);setConditions(rows);}else{const updated=await healthRepository.updateCondition({profileId:selected.id,actorUserId:userId,id:row.id,patch});setConditions(rows=>rows.map(x=>x.id===row.id?updated:x));}setNotice("تم تحديث حالة السجل.");}
    catch(e){setError(e?.message||"تعذر تحديث الحالة.");}finally{setBusy(false);}
  }
  async function removeCondition(row) {
    if(!selected||!hasScopeAction("conditions","delete")||!window.confirm("حذف الحالة الطبية؟"))return;setBusy(true);setError("");
    try{if(isDemo){const rows=conditions.filter(x=>x.id!==row.id);storeDemoRows("conditions",rows);setConditions(rows);}else{await healthRepository.deleteCondition({profileId:selected.id,actorUserId:userId,id:row.id});setConditions(rows=>rows.filter(x=>x.id!==row.id));}setNotice("تم حذف الحالة.");}
    catch(e){setError(e?.message||"تعذر حذف الحالة.");}finally{setBusy(false);}
  }
  async function addAllergy(e) {
    e?.preventDefault();if(!selected||!hasScopeAction("conditions","create"))return;setBusy(true);setError("");setNotice("");
    try{const payload={...allergyDraft,allergen:allergyDraft.allergen.trim(),reaction:allergyDraft.reaction.trim()||null,first_observed_on:allergyDraft.first_observed_on||null,notes:allergyDraft.notes.trim()||null};if(!payload.allergen)throw new Error("اكتب اسم المادة المسببة للحساسية.");let row;
      if(isDemo){row={...payload,id:"demo-allergy-"+Date.now(),profile_id:selected.id,status:"active",created_by:userId,created_at:new Date().toISOString()};const rows=[row,...allergies];storeDemoRows("allergies",rows);setAllergies(rows);}
      else{row=await healthRepository.createAllergy({profileId:selected.id,actorUserId:userId,allergy:payload});setAllergies(rows=>[row,...rows]);}
      setAllergyDraft({allergen:"",reaction:"",severity:"unknown",first_observed_on:"",notes:""});setNotice("تمت إضافة الحساسية.");
    }catch(e){setError(e?.message||"تعذرت إضافة الحساسية.");}finally{setBusy(false);}
  }
  async function toggleAllergy(row) {
    if(!selected||!hasScopeAction("conditions","update"))return;const patch={status:row.status==="active"?"inactive":"active"};setBusy(true);setError("");
    try{if(isDemo){const rows=allergies.map(x=>x.id===row.id?{...x,...patch}:x);storeDemoRows("allergies",rows);setAllergies(rows);}else{const updated=await healthRepository.updateAllergy({profileId:selected.id,actorUserId:userId,id:row.id,patch});setAllergies(rows=>rows.map(x=>x.id===row.id?updated:x));}setNotice("تم تحديث حالة الحساسية.");}
    catch(e){setError(e?.message||"تعذر تحديث الحساسية.");}finally{setBusy(false);}
  }
  async function removeAllergy(row) {
    if(!selected||!hasScopeAction("conditions","delete")||!window.confirm("حذف الحساسية؟"))return;setBusy(true);setError("");
    try{if(isDemo){const rows=allergies.filter(x=>x.id!==row.id);storeDemoRows("allergies",rows);setAllergies(rows);}else{await healthRepository.deleteAllergy({profileId:selected.id,actorUserId:userId,id:row.id});setAllergies(rows=>rows.filter(x=>x.id!==row.id));}setNotice("تم حذف الحساسية.");}
    catch(e){setError(e?.message||"تعذر حذف الحساسية.");}finally{setBusy(false);}
  }
  async function addSymptomDefinition(e) {
    e?.preventDefault();if(!selected||!hasScopeAction("symptoms","create"))return;setBusy(true);setError("");setNotice("");
    try{const name=symptomDraft.name.trim();if(!name)throw new Error("اكتب اسم العَرَض.");let row;
      if(isDemo){row={id:"demo-symptom-"+Date.now(),profile_id:selected.id,name,category:symptomDraft.category.trim()||null,is_active:true,created_by:userId,created_at:new Date().toISOString()};const rows=[...symptomDefinitions,row];storeDemoRows("symptoms",rows);setSymptomDefinitions(rows);}
      else{row=await healthRepository.createSymptomDefinition({profileId:selected.id,actorUserId:userId,name,category:symptomDraft.category});setSymptomDefinitions(rows=>[...rows,row].sort((a,b)=>a.name.localeCompare(b.name,"ar")));}
      setSymptomDraft({name:"",category:""});setSymptomLogDraft(d=>({...d,symptom_definition_id:row.id}));setNotice("تمت إضافة العَرَض إلى قائمتك.");
    }catch(e){setError(e?.message||"تعذرت إضافة العَرَض.");}finally{setBusy(false);}
  }
  async function toggleSymptomDefinition(row) {
    if(!selected||!hasScopeAction("symptoms","update"))return;setBusy(true);setError("");
    try{if(isDemo){const rows=symptomDefinitions.map(x=>x.id===row.id?{...x,is_active:!x.is_active}:x);storeDemoRows("symptoms",rows);setSymptomDefinitions(rows);}else{const updated=await healthRepository.updateSymptomDefinition({profileId:selected.id,actorUserId:userId,id:row.id,patch:{is_active:!row.is_active}});setSymptomDefinitions(rows=>rows.map(x=>x.id===row.id?updated:x));}}
    catch(e){setError(e?.message||"تعذر تحديث العَرَض.");}finally{setBusy(false);}
  }
  async function removeSymptomDefinition(row) {
    if(!selected||!hasScopeAction("symptoms","delete")||!window.confirm("حذف العَرَض من القائمة؟ ستبقى السجلات السابقة محفوظة."))return;setBusy(true);setError("");
    try{if(isDemo){const rows=symptomDefinitions.filter(x=>x.id!==row.id);storeDemoRows("symptoms",rows);setSymptomDefinitions(rows);const logs=symptomLogs.map(x=>x.symptom_definition_id===row.id?{...x,symptom_definition_id:null}:x);storeDemoRows("symptom-logs",logs);setSymptomLogs(logs);}else{await healthRepository.deleteSymptomDefinition({profileId:selected.id,actorUserId:userId,id:row.id});setSymptomDefinitions(rows=>rows.filter(x=>x.id!==row.id));}setNotice("تم حذف العَرَض من القائمة مع الحفاظ على السجلات السابقة.");}
    catch(e){setError(e?.message||"تعذر حذف العَرَض.");}finally{setBusy(false);}
  }
  function selectBodyMapTarget(id) {
    const row=symptomLogs.find(x=>x.id===id);
    setBodyMapTargetId(id);
    setBodyMapView(row?.body_view||"front");
    setBodyMapDraft(row?{body_region_code:row.body_region_code||null,body_view:row.body_view||null,body_x:row.body_x??null,body_y:row.body_y??null,body_location:row.body_location||""}:{body_region_code:null,body_view:"front",body_x:null,body_y:null,body_location:""});
  }
  async function saveSymptomBodyLocation() {
    const row=symptomLogs.find(x=>x.id===bodyMapTargetId);
    if(!row||!hasScopeAction("symptoms","update"))return;
    if(bodyMapDraft.body_region_code&&(!bodyMapDraft.body_view||bodyMapDraft.body_x==null||bodyMapDraft.body_y==null)){setError("أكمل تحديد المنطقة والاتجاه والموقع.");return;}
    setBusy(true);setError("");setNotice("");
    try {
      const patch={body_region_code:bodyMapDraft.body_region_code||null,body_view:bodyMapDraft.body_region_code?bodyMapDraft.body_view:null,body_x:bodyMapDraft.body_region_code?bodyMapDraft.body_x:null,body_y:bodyMapDraft.body_region_code?bodyMapDraft.body_y:null,body_location:bodyMapDraft.body_location?.trim()||null};
      let updated;
      if(isDemo){updated={...row,...patch,updated_at:new Date().toISOString()};const rows=symptomLogs.map(x=>x.id===row.id?updated:x);storeDemoRows("symptom-logs",rows);setSymptomLogs(rows);}
      else {updated=await healthRepository.updateSymptomLog({profileId:selected.id,actorUserId:userId,id:row.id,patch});setSymptomLogs(rows=>rows.map(x=>x.id===row.id?updated:x));}
      setBodyMapDraft({body_region_code:updated.body_region_code||null,body_view:updated.body_view||null,body_x:updated.body_x??null,body_y:updated.body_y??null,body_location:updated.body_location||""});
      setNotice("تم حفظ موضع العرض على مخطط الجسم.");
    }catch(e){setError(e?.message||"تعذر حفظ موضع العرض.");}finally{setBusy(false);}
  }

  async function addSymptomLog(e) {
    e?.preventDefault();if(!selected||!hasScopeAction("symptoms","create"))return;setBusy(true);setError("");setNotice("");
    try{const definition=symptomDefinitions.find(x=>x.id===symptomLogDraft.symptom_definition_id);if(!definition)throw new Error("اختر عَرَضًا نشطًا.");const when=new Date(symptomLogDraft.recorded_at);if(Number.isNaN(when.getTime()))throw new Error("وقت التسجيل غير صحيح.");
      const payload={symptom_definition_id:definition.id,symptom_name_snapshot:definition.name,severity:Number(symptomLogDraft.severity),recorded_at:when.toISOString(),duration_minutes:symptomLogDraft.duration_minutes===""?null:Number(symptomLogDraft.duration_minutes),body_location:symptomLogDraft.body_location.trim()||null,body_region_code:symptomLogDraft.body_region_code||null,body_view:symptomLogDraft.body_region_code?symptomLogDraft.body_view:null,body_x:symptomLogDraft.body_region_code?symptomLogDraft.body_x:null,body_y:symptomLogDraft.body_region_code?symptomLogDraft.body_y:null,notes:symptomLogDraft.notes.trim()||null,source:"manual"};
      if(!Number.isInteger(payload.severity)||payload.severity<1||payload.severity>10)throw new Error("الشدة يجب أن تكون من 1 إلى 10.");if(payload.duration_minutes!==null&&(!Number.isInteger(payload.duration_minutes)||payload.duration_minutes<1||payload.duration_minutes>10080))throw new Error("المدة يجب أن تكون بين 1 و10080 دقيقة.");
      let row;if(isDemo){row={...payload,id:"demo-symptom-log-"+Date.now(),profile_id:selected.id,created_by:userId,created_at:new Date().toISOString()};const rows=[row,...symptomLogs];storeDemoRows("symptom-logs",rows);setSymptomLogs(rows);}else{row=await healthRepository.createSymptomLog({profileId:selected.id,actorUserId:userId,log:payload});setSymptomLogs(rows=>[row,...rows]);}
      setSymptomLogDraft(d=>({...d,duration_minutes:"",body_location:"",body_region_code:null,body_view:null,body_x:null,body_y:null,notes:""}));setNotice("تم تسجيل العَرَض. التسجيل لا يشخّص سبب الأعراض.");
    }catch(e){setError(e?.message||"تعذر تسجيل العَرَض.");}finally{setBusy(false);}
  }
  async function updateSymptomSeverity(row,value) {
    if(!selected||!hasScopeAction("symptoms","update"))return;const severity=Number(value);if(!Number.isInteger(severity)||severity<1||severity>10||severity===row.severity)return;setBusy(true);setError("");
    try{if(isDemo){const rows=symptomLogs.map(x=>x.id===row.id?{...x,severity}:x);storeDemoRows("symptom-logs",rows);setSymptomLogs(rows);}else{const updated=await healthRepository.updateSymptomLog({profileId:selected.id,actorUserId:userId,id:row.id,patch:{severity}});setSymptomLogs(rows=>rows.map(x=>x.id===row.id?updated:x));}setNotice("تم تعديل شدة العَرَض.");}
    catch(e){setError(e?.message||"تعذر تعديل السجل.");}finally{setBusy(false);}
  }
  async function removeSymptomLog(row) {
    if(!selected||!hasScopeAction("symptoms","delete")||!window.confirm("حذف سجل العَرَض؟"))return;setBusy(true);setError("");
    try{if(isDemo){const rows=symptomLogs.filter(x=>x.id!==row.id);storeDemoRows("symptom-logs",rows);setSymptomLogs(rows);}else{await healthRepository.deleteSymptomLog({profileId:selected.id,actorUserId:userId,id:row.id});setSymptomLogs(rows=>rows.filter(x=>x.id!==row.id));}setNotice("تم حذف سجل العَرَض.");}
    catch(e){setError(e?.message||"تعذر حذف السجل.");}finally{setBusy(false);}
  }



  function latestMedicationVersion(medicationId) {
    return medicationVersions.filter(v=>v.medication_id===medicationId).sort((a,b)=>Number(b.version_no)-Number(a.version_no))[0] || null;
  }
  function parseScheduleTimes(value) {
    return String(value||"").split(",").map(x=>x.trim()).filter(Boolean);
  }
  async function addMedication(e) {
    e?.preventDefault(); if(!selected||!hasScopeAction("medications","create"))return;
    setBusy(true);setError("");setNotice("");
    try {
      const name=medicationDraft.name.trim(), amount=Number(medicationDraft.dose_amount), unit=medicationDraft.dose_unit.trim();
      if(!name)throw new Error("اكتب اسم الدواء أو العلاج.");
      if(!Number.isFinite(amount)||amount<=0)throw new Error("أدخل جرعة رقمية موجبة كما هي موثقة.");
      if(!unit)throw new Error("اكتب وحدة الجرعة.");
      const times=parseScheduleTimes(medicationDraft.schedule_times);
      if(times.some(t=>!/^([01]\\d|2[0-3]):[0-5]\\d$/.test(t)))throw new Error("اكتب أوقاتًا بصيغة HH:MM مفصولة بفواصل.");
      const medication={name,brand:medicationDraft.brand.trim()||null,medication_type:medicationDraft.medication_type,status:"active",instructions:medicationDraft.instructions.trim()||null,prescribed_by:medicationDraft.prescribed_by.trim()||null,start_date:medicationDraft.start_date||null,end_date:null};
      const version={dose_amount:amount,dose_unit:unit,route:medicationDraft.route,frequency:medicationDraft.frequency,schedule_times:times,effective_from:medicationDraft.effective_from||new Date().toISOString().slice(0,10),instructions:medicationDraft.instructions.trim()||null};
      let row,dose;
      if(isDemo){
        row={...medication,id:"demo-med-"+Date.now(),profile_id:selected.id,created_by:userId,created_at:new Date().toISOString()};
        dose={...version,id:"demo-med-version-"+Date.now(),profile_id:selected.id,medication_id:row.id,version_no:1,created_by:userId,created_at:new Date().toISOString()};
        const ms=[row,...medications],vs=[dose,...medicationVersions];storeDemoRows("medications",ms);storeDemoRows("medication-versions",vs);setMedications(ms);setMedicationVersions(vs);
      } else {
        const result=await healthRepository.createMedication({profileId:selected.id,actorUserId:userId,medication,version});row=result.medication;dose=result.version;setMedications(rows=>[row,...rows]);setMedicationVersions(rows=>[dose,...rows]);
      }
      setMedicationDraft({name:"",brand:"",medication_type:"medication",dose_amount:"",dose_unit:"mg",route:"oral",frequency:"once_daily",schedule_times:"08:00",effective_from:new Date().toISOString().slice(0,10),start_date:new Date().toISOString().slice(0,10),prescribed_by:"",instructions:""});
      setNotice("تم تسجيل العلاج وإنشاء النسخة الأولى للجرعة. هذا سجل توثيقي وليس توصية علاجية.");
    }catch(e){setError(e?.message||"تعذر تسجيل العلاج.");}finally{setBusy(false);}
  }
  async function addMedicationVersion(e) {
    e?.preventDefault();const med=medications.find(x=>x.id===versionDraft.medication_id);if(!selected||!med||!hasScopeAction("medications","create"))return;
    setBusy(true);setError("");setNotice("");
    try{
      const amount=Number(versionDraft.dose_amount),unit=versionDraft.dose_unit.trim(),times=parseScheduleTimes(versionDraft.schedule_times);
      if(!Number.isFinite(amount)||amount<=0||!unit)throw new Error("أدخل الجرعة والوحدة كما هما موثقتان.");
      if(times.some(t=>!/^([01]\\d|2[0-3]):[0-5]\\d$/.test(t)))throw new Error("صيغة الوقت يجب أن تكون HH:MM.");
      const payload={dose_amount:amount,dose_unit:unit,route:versionDraft.route,frequency:versionDraft.frequency,schedule_times:times,effective_from:versionDraft.effective_from||new Date().toISOString().slice(0,10),instructions:versionDraft.instructions.trim()||null};
      let row;
      if(isDemo){row={...payload,id:"demo-med-version-"+Date.now(),profile_id:selected.id,medication_id:med.id,version_no:Math.max(0,...medicationVersions.filter(x=>x.medication_id===med.id).map(x=>Number(x.version_no)))+1,created_by:userId,created_at:new Date().toISOString()};const rows=[row,...medicationVersions];storeDemoRows("medication-versions",rows);setMedicationVersions(rows);}
      else{row=await healthRepository.createMedicationVersion({profileId:selected.id,actorUserId:userId,medicationId:med.id,version:payload});setMedicationVersions(rows=>[row,...rows]);}
      setVersionDraft({medication_id:"",dose_amount:"",dose_unit:"mg",route:"oral",frequency:"once_daily",schedule_times:"08:00",effective_from:new Date().toISOString().slice(0,10),instructions:""});
      setNotice("تم إنشاء نسخة جرعة جديدة. النسخ السابقة وسجلات الجرعات الفعلية محفوظة دون تعديل.");
    }catch(e){setError(e?.message||"تعذر إضافة نسخة الجرعة.");}finally{setBusy(false);}
  }
  async function updateMedicationStatus(med,status) {
    if(!selected||!hasScopeAction("medications","update"))return;setBusy(true);setError("");
    try{const patch={status,end_date:status==="stopped"?(new Date().toISOString().slice(0,10)):null};let row;
      if(isDemo){row={...med,...patch,updated_at:new Date().toISOString()};const rows=medications.map(x=>x.id===med.id?row:x);storeDemoRows("medications",rows);setMedications(rows);}
      else{row=await healthRepository.updateMedication({profileId:selected.id,actorUserId:userId,id:med.id,patch});setMedications(rows=>rows.map(x=>x.id===med.id?row:x));}
      setNotice("تم تحديث حالة العلاج. لم تُعدّل سجلات الجرعات السابقة.");
    }catch(e){setError(e?.message||"تعذر تحديث حالة العلاج.");}finally{setBusy(false);}
  }
  async function recordDoseEvent(med,status) {
    if(!selected||!hasScopeAction("medications","create"))return;const version=latestMedicationVersion(med.id);if(!version){setError("لا توجد نسخة جرعة لهذا العلاج.");return;}
    setBusy(true);setError("");setNotice("");
    try{
      const now=new Date(),iso=now.toISOString(),taken=status==="taken";
      const payload={medication_id:med.id,medication_version_id:version.id,event_status:status,scheduled_for:iso,occurred_at:taken?iso:null,dose_amount:Number(version.dose_amount),dose_unit:version.dose_unit,medication_name_snapshot:med.name,notes:null};
      let row;
      if(isDemo){row={...payload,id:"demo-med-event-"+Date.now(),profile_id:selected.id,created_by:userId,created_at:iso};const rows=[row,...medicationEvents];storeDemoRows("medication-events",rows);setMedicationEvents(rows);}
      else{row=await healthRepository.createMedicationEvent({profileId:selected.id,actorUserId:userId,event:payload});setMedicationEvents(rows=>[row,...rows]);}
      setNotice(status==="taken"?"سُجلت الجرعة على أنها تم تناولها.":status==="skipped"?"سُجلت الجرعة على أنها متخطاة، ولم تُحتسب كجرعة متناولة.":status==="missed"?"سُجلت الجرعة على أنها فائتة، ولم تُحتسب كجرعة متناولة.":status==="held"?"سُجلت الجرعة على أنها موقوفة مؤقتًا.":"سُجلت الحالة على أنها غير معروفة.");
    }catch(e){setError(e?.message||"تعذر تسجيل الجرعة.");}finally{setBusy(false);}
  }
  async function addSideEffect(e) {
    e?.preventDefault();if(!selected||!hasScopeAction("medications","create"))return;
    setBusy(true);setError("");setNotice("");
    try{
      const med=medications.find(x=>x.id===sideEffectDraft.medication_id);if(!med)throw new Error("اختر علاجًا.");
      const payload={medication_id:med.id,medication_event_id:sideEffectDraft.medication_event_id||null,name:sideEffectDraft.name.trim(),severity:sideEffectDraft.severity,occurred_at:sideEffectDraft.occurred_at?new Date(sideEffectDraft.occurred_at).toISOString():new Date().toISOString(),notes:sideEffectDraft.notes.trim()||null};
      if(!payload.name)throw new Error("اكتب الأثر الجانبي الذي تريد توثيقه.");
      let row;
      if(isDemo){row={...payload,id:"demo-side-effect-"+Date.now(),profile_id:selected.id,created_by:userId,created_at:new Date().toISOString()};const rows=[row,...sideEffects];storeDemoRows("medication-side-effects",rows);setSideEffects(rows);}
      else{row=await healthRepository.createMedicationSideEffect({profileId:selected.id,actorUserId:userId,sideEffect:payload});setSideEffects(rows=>[row,...rows]);}
      setSideEffectDraft({medication_id:"",medication_event_id:"",name:"",severity:"unknown",occurred_at:new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16),notes:""});
      setNotice("تم توثيق الأثر الجانبي. هذا التسجيل لا يثبت أن العلاج سببه.");
    }catch(e){setError(e?.message||"تعذر تسجيل الأثر الجانبي.");}finally{setBusy(false);}
  }
  async function removeSideEffect(row) {
    if(!selected||!hasScopeAction("medications","delete")||!window.confirm("حذف سجل الأثر الجانبي؟"))return;setBusy(true);setError("");
    try{if(isDemo){const rows=sideEffects.filter(x=>x.id!==row.id);storeDemoRows("medication-side-effects",rows);setSideEffects(rows);}else{await healthRepository.deleteMedicationSideEffect({profileId:selected.id,actorUserId:userId,id:row.id});setSideEffects(rows=>rows.filter(x=>x.id!==row.id));}setNotice("تم حذف سجل الأثر الجانبي.");}
    catch(e){setError(e?.message||"تعذر حذف سجل الأثر الجانبي.");}finally{setBusy(false);}
  }
  async function addMedicationReminder(e,med) {
    e?.preventDefault();if(!selected||!med||!hasScopeAction("medications","create"))return;const version=latestMedicationVersion(med.id);if(!version){setError("لا توجد نسخة جرعة مرتبطة بالتذكير.");return;}
    setBusy(true);setError("");setNotice("");
    try{const raw=reminderDraft.medication_id===med.id?reminderDraft.remind_at:"";if(!raw)throw new Error("اختر وقت التذكير.");
      const payload={medication_id:med.id,medication_version_id:version.id,remind_at:new Date(raw).toISOString(),status:"pending",completed_at:null,linked_event_id:null};
      let row;
      if(isDemo){row={...payload,id:"demo-med-reminder-"+Date.now(),profile_id:selected.id,created_by:userId,created_at:new Date().toISOString()};const rows=[row,...medicationReminders];storeDemoRows("medication-reminders",rows);setMedicationReminders(rows);}
      else{row=await healthRepository.createMedicationReminder({profileId:selected.id,actorUserId:userId,reminder:payload});setMedicationReminders(rows=>[row,...rows]);}
      setReminderDraft({medication_id:"",remind_at:""});setNotice("تم إنشاء تذكير داخل التطبيق. لا يرسل هذا الإصدار إشعارًا في الخلفية.");
    }catch(e){setError(e?.message||"تعذر إنشاء التذكير.");}finally{setBusy(false);}
  }
  async function updateMedicationReminder(row,action) {
    if(!selected||!hasScopeAction("medications","update"))return;setBusy(true);setError("");
    try{let patch;
      if(action==="snooze")patch={remind_at:new Date(Date.now()+15*60000).toISOString(),status:"pending",completed_at:null};
      else patch={status:action==="complete"?"completed":"dismissed",completed_at:action==="complete"?new Date().toISOString():null};
      let updated;
      if(isDemo){updated={...row,...patch,updated_at:new Date().toISOString()};const rows=medicationReminders.map(x=>x.id===row.id?updated:x);storeDemoRows("medication-reminders",rows);setMedicationReminders(rows);}
      else{updated=await healthRepository.updateMedicationReminder({profileId:selected.id,actorUserId:userId,id:row.id,patch});setMedicationReminders(rows=>rows.map(x=>x.id===row.id?updated:x));}
      setNotice(action==="snooze"?"تم تأجيل التذكير 15 دقيقة.":action==="complete"?"تمت مراجعة التذكير؛ هذا لا يعني تلقائيًا أن الجرعة أُخذت.":"تم إخفاء التذكير.");
    }catch(e){setError(e?.message||"تعذر تحديث التذكير.");}finally{setBusy(false);}
  }
  async function addFlareEvent(e) {
    e?.preventDefault();if(!selected||!hasScopeAction("flare_events","create"))return;setBusy(true);setError("");setNotice("");
    try{const title=flareDraft.title.trim(),severity=Number(flareDraft.severity);if(!title)throw new Error("اكتب اسمًا للنوبة.");if(!Number.isInteger(severity)||severity<1||severity>10)throw new Error("الشدة يجب أن تكون من 1 إلى 10.");
      const payload={title,status:"ongoing",severity,started_at:new Date(flareDraft.started_at).toISOString(),ended_at:null,symptoms:flareDraft.symptoms.trim()||null,suspected_triggers:flareDraft.suspected_triggers.trim()||null,relief_actions:flareDraft.relief_actions.trim()||null,notes:flareDraft.notes.trim()||null};
      let row;
      if(isDemo){row={...payload,id:"demo-flare-"+Date.now(),profile_id:selected.id,created_by:userId,created_at:new Date().toISOString()};const rows=[row,...flareEvents];storeDemoRows("flare-events",rows);setFlareEvents(rows);}
      else{row=await healthRepository.createFlareEvent({profileId:selected.id,actorUserId:userId,flare:payload});setFlareEvents(rows=>[row,...rows]);}
      setFlareDraft({title:"",severity:"3",started_at:new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16),symptoms:"",suspected_triggers:"",relief_actions:"",notes:""});setNotice("تم تسجيل النوبة. العوامل المذكورة وصفية ولا تثبت سببًا طبيًا.");
    }catch(e){setError(e?.message||"تعذر تسجيل النوبة.");}finally{setBusy(false);}
  }
  async function resolveFlare(row) {
    if(!selected||!hasScopeAction("flare_events","update"))return;setBusy(true);setError("");
    try{const patch=row.status==="ongoing"?{status:"resolved",ended_at:new Date().toISOString()}:{status:"ongoing",ended_at:null};let updated;
      if(isDemo){updated={...row,...patch,updated_at:new Date().toISOString()};const rows=flareEvents.map(x=>x.id===row.id?updated:x);storeDemoRows("flare-events",rows);setFlareEvents(rows);}
      else{updated=await healthRepository.updateFlareEvent({profileId:selected.id,actorUserId:userId,id:row.id,patch});setFlareEvents(rows=>rows.map(x=>x.id===row.id?updated:x));}
      setNotice("تم تحديث حالة النوبة.");
    }catch(e){setError(e?.message||"تعذر تحديث النوبة.");}finally{setBusy(false);}
  }
  async function removeFlare(row) {
    if(!selected||!hasScopeAction("flare_events","delete")||!window.confirm("حذف سجل النوبة؟"))return;setBusy(true);setError("");
    try{if(isDemo){const rows=flareEvents.filter(x=>x.id!==row.id);storeDemoRows("flare-events",rows);setFlareEvents(rows);}else{await healthRepository.deleteFlareEvent({profileId:selected.id,actorUserId:userId,id:row.id});setFlareEvents(rows=>rows.filter(x=>x.id!==row.id));}setNotice("تم حذف سجل النوبة.");}
    catch(e){setError(e?.message||"تعذر حذف سجل النوبة.");}finally{setBusy(false);}
  }

  async function saveDailyCheckin(e) {
    e?.preventDefault();
    if(!selected||!hasScopeAction("checkins","create"))return;
    setBusy(true);setError("");setNotice("");
    try {
      const d=checkinDraft;
      const payload={
        entry_date:d.entry_date,
        mood_score:d.mood_score===""?null:Number(d.mood_score),
        energy_score:d.energy_score===""?null:Number(d.energy_score),
        stress_score:d.stress_score===""?null:Number(d.stress_score),
        sleep_hours:d.sleep_hours===""?null:Number(d.sleep_hours),
        sleep_quality:d.sleep_quality===""?null:Number(d.sleep_quality),
        digestion_status:d.digestion_status||null,
        digestion_severity:d.digestion_severity===""?null:Number(d.digestion_severity),
        notes:d.notes.trim()||null,
        recorded_at:new Date().toISOString()
      };
      if(!payload.entry_date||![payload.mood_score,payload.energy_score,payload.stress_score,payload.sleep_hours,payload.sleep_quality,payload.digestion_status,payload.digestion_severity,payload.notes].some(v=>v!==null)) throw new Error("أدخل قيمة واحدة على الأقل قبل الحفظ.");
      let row;
      if(isDemo) {
        const existing=dailyCheckins.find(x=>x.entry_date===payload.entry_date);
        row={...existing,...payload,id:existing?.id||"demo-checkin-"+Date.now(),profile_id:selected.id,created_by:userId,created_at:existing?.created_at||new Date().toISOString(),updated_at:new Date().toISOString()};
      } else row=await healthRepository.upsertDailyCheckin({profileId:selected.id,actorUserId:userId,checkin:payload});
      const rows=[row,...dailyCheckins.filter(x=>x.entry_date!==row.entry_date)].sort((a,b)=>b.entry_date.localeCompare(a.entry_date));
      storeDemoRows("daily-checkins",rows);setDailyCheckins(rows);setNotice("تم حفظ المتابعة اليومية. لم تُضف سجلات للطعام أو التمرين أو الماء.");
    } catch(e){setError(e?.message||"تعذر حفظ المتابعة اليومية.");}finally{setBusy(false);}
  }
  async function removeDailyCheckin(row) {
    if(!selected||!hasScopeAction("checkins","delete")||!window.confirm("حذف متابعة هذا اليوم؟"))return;
    setBusy(true);setError("");setNotice("");
    try{const rows=dailyCheckins.filter(x=>x.id!==row.id);if(!isDemo)await healthRepository.deleteDailyCheckin({profileId:selected.id,actorUserId:userId,id:row.id});storeDemoRows("daily-checkins",rows);setDailyCheckins(rows);setNotice("تم حذف المتابعة اليومية.");}
    catch(e){setError(e?.message||"تعذر حذف المتابعة.");}finally{setBusy(false);}
  }

  async function addFactor(e) {
    e?.preventDefault();if(!selected)return;
    const scope=factorDraft.is_sensitive?"sensitive_trackers":"trackers";
    if(!hasScopeAction(scope,"create"))return;
    setBusy(true);setError("");setNotice("");
    try{
      const name=factorDraft.name.trim();if(!name)throw new Error("اكتب اسم العامل أو المتتبّع.");
      const choices=factorDraft.value_type==="choice"?factorDraft.choice_options.split(",").map(x=>x.trim()).filter(Boolean).slice(0,30):[];
      if(factorDraft.value_type==="choice"&&!choices.length)throw new Error("أدخل خيارًا واحدًا على الأقل، وافصل الخيارات بفواصل.");
      const min=factorDraft.value_type==="scale"?Number(factorDraft.scale_min):null;
      const max=factorDraft.value_type==="scale"?Number(factorDraft.scale_max):null;
      if(factorDraft.value_type==="scale"&&(!Number.isFinite(min)||!Number.isFinite(max)||max<=min))throw new Error("حدود المقياس غير صحيحة.");
      const payload={name,category:factorDraft.category,value_type:factorDraft.value_type,unit:factorDraft.unit.trim()||null,scale_min:min,scale_max:max,choice_options:choices,is_sensitive:!!factorDraft.is_sensitive,status:"active"};
      let row;
      if(isDemo)row={...payload,id:"demo-factor-"+Date.now(),profile_id:selected.id,created_by:userId,created_at:new Date().toISOString(),updated_at:new Date().toISOString()};
      else row=await healthRepository.createFactor({profileId:selected.id,actorUserId:userId,factor:payload});
      const rows=[row,...factors];storeDemoRows("factors",rows);setFactors(rows);
      setFactorDraft({name:"",category:"general",value_type:"scale",unit:"",scale_min:"1",scale_max:"5",choice_options:"",is_sensitive:false});setNotice("تم إنشاء المتتبّع. لا تُعدّل القيم التاريخية عند تغيير حالته إلى مؤرشف.");
    }catch(e){setError(e?.message||"تعذر إنشاء المتتبّع.");}finally{setBusy(false);}
  }
  function editFactorLog(log,factor) {
    if(!hasScopeAction(factor.is_sensitive?"sensitive_trackers":"trackers","update"))return;
    const date=new Date(new Date(log.recorded_at).getTime()-new Date(log.recorded_at).getTimezoneOffset()*60000).toISOString().slice(0,16);
    const value=factor.value_type==="boolean"?String(log.value_boolean):factor.value_type==="text"?log.value_text:factor.value_type==="choice"?log.value_choice:log.value_numeric;
    setFactorLogDraft({id:log.id,factor_id:factor.id,recorded_at:date,value:String(value??""),notes:log.notes||""});
  }
  async function saveFactorLog(e) {
    e?.preventDefault();if(!selected)return;
    setBusy(true);setError("");setNotice("");
    try{
      const factor=factors.find(x=>x.id===factorLogDraft.factor_id);if(!factor)throw new Error("اختر متتبّعًا صالحًا.");
      const scope=factor.is_sensitive?"sensitive_trackers":"trackers";
      if(!hasScopeAction(scope,factorLogDraft.id?"update":"create"))throw new Error("لا تملك صلاحية تعديل هذا المتتبّع.");
      if(factorLogDraft.value==="")throw new Error("أدخل قيمة للسجل.");
      const payload={factor_id:factor.id,recorded_at:new Date(factorLogDraft.recorded_at).toISOString(),value_numeric:null,value_boolean:null,value_text:null,value_choice:null,notes:factorLogDraft.notes.trim()||null};
      if(factor.value_type==="scale"||factor.value_type==="number"){
        const value=Number(factorLogDraft.value);if(!Number.isFinite(value))throw new Error("أدخل رقمًا صحيحًا.");
        if(factor.value_type==="scale"&&(value<Number(factor.scale_min)||value>Number(factor.scale_max)))throw new Error("القيمة خارج حدود المقياس.");
        payload.value_numeric=value;
      }else if(factor.value_type==="boolean")payload.value_boolean=factorLogDraft.value==="true";
      else if(factor.value_type==="text")payload.value_text=factorLogDraft.value;
      else {if(!(factor.choice_options||[]).includes(factorLogDraft.value))throw new Error("اختر قيمة من الخيارات المتاحة.");payload.value_choice=factorLogDraft.value;}
      let row;
      if(isDemo){
        const previous=factorLogs.find(x=>x.id===factorLogDraft.id);
        row={...previous,...payload,id:factorLogDraft.id||"demo-factor-log-"+Date.now(),profile_id:selected.id,created_by:userId,created_at:previous?.created_at||new Date().toISOString(),updated_at:new Date().toISOString()};
      }else if(factorLogDraft.id)row=await healthRepository.updateFactorLog({profileId:selected.id,actorUserId:userId,id:factorLogDraft.id,patch:payload});
      else row=await healthRepository.createFactorLog({profileId:selected.id,actorUserId:userId,log:payload});
      const rows=[row,...factorLogs.filter(x=>x.id!==row.id)].sort((a,b)=>new Date(b.recorded_at)-new Date(a.recorded_at));
      storeDemoRows("factor-logs",rows);setFactorLogs(rows);setFactorLogDraft({id:"",factor_id:factor.id,recorded_at:new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16),value:"",notes:""});setNotice("تم حفظ سجل المتتبّع.");
    }catch(e){setError(e?.message||"تعذر حفظ سجل المتتبّع.");}finally{setBusy(false);}
  }
  async function removeFactorLog(row,factor) {
    if(!selected||!hasScopeAction(factor.is_sensitive?"sensitive_trackers":"trackers","delete")||!window.confirm("حذف قراءة المتتبّع؟"))return;
    setBusy(true);setError("");setNotice("");
    try{const rows=factorLogs.filter(x=>x.id!==row.id);if(!isDemo)await healthRepository.deleteFactorLog({profileId:selected.id,actorUserId:userId,id:row.id});storeDemoRows("factor-logs",rows);setFactorLogs(rows);if(factorLogDraft.id===row.id)setFactorLogDraft({id:"",factor_id:factor.id,recorded_at:new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16),value:"",notes:""});setNotice("تم حذف قراءة المتتبّع.");}
    catch(e){setError(e?.message||"تعذر حذف القراءة.");}finally{setBusy(false);}
  }
  async function toggleFactorArchive(factor) {
    const scope=factor.is_sensitive?"sensitive_trackers":"trackers";if(!selected||!hasScopeAction(scope,"update"))return;
    setBusy(true);setError("");setNotice("");
    try{const patch={status:factor.status==="active"?"archived":"active"};let row;
      if(isDemo)row={...factor,...patch,updated_at:new Date().toISOString()};
      else row=await healthRepository.updateFactor({profileId:selected.id,actorUserId:userId,id:factor.id,patch});
      const rows=factors.map(x=>x.id===factor.id?row:x);storeDemoRows("factors",rows);setFactors(rows);setNotice(row.status==="archived"?"تم أرشفة المتتبّع مع الاحتفاظ بتاريخه.":"تمت إعادة تفعيل المتتبّع.");
    }catch(e){setError(e?.message||"تعذر تحديث المتتبّع.");}finally{setBusy(false);}
  }

  async function toggleCycleTracking(enabled) {
    if(!selected||!isOwner)return;setBusy(true);setError("");setNotice("");
    try{let updated;
      if(isDemo)updated={...selected,cycle_tracking_enabled:!!enabled,updated_at:new Date().toISOString()};
      else {await healthRepository.updateCycleTrackingPreference({profileId:selected.id,ownerUserId:userId,enabled});updated={...selected,cycle_tracking_enabled:!!enabled};}
      setProfiles(rows=>rows.map(p=>p.id===selected.id?updated:p));
      if(!enabled)setCycleEntries([]);
      setNotice(enabled?"تم تفعيل سجل الدورة الاختياري. لا يحسب التطبيق الخصوبة أو يتنبأ بالدورة.":"تم تعطيل سجل الدورة. ستبقى السجلات محفوظة وغير متاحة حتى إعادة التفعيل.");
    }catch(e){setError(e?.message||"تعذر تحديث إعداد الدورة.");}finally{setBusy(false);}
  }
  async function saveCycleEntry(e) {
    e?.preventDefault();if(!selected||!isOwner||!selected.cycle_tracking_enabled)return;
    setBusy(true);setError("");setNotice("");
    try{
      if(cycleDraft.period_start&&cycleDraft.period_end&&cycleDraft.period_end<cycleDraft.period_start)throw new Error("تاريخ نهاية الفترة لا يمكن أن يسبق تاريخ بدايتها.");
      const payload={entry_date:cycleDraft.entry_date,flow_intensity:cycleDraft.flow_intensity,period_start:cycleDraft.period_start||null,period_end:cycleDraft.period_end||null,symptoms:cycleDraft.symptoms.trim()||null,notes:cycleDraft.notes.trim()||null};
      let row;
      if(isDemo){const old=cycleEntries.find(x=>x.entry_date===payload.entry_date);row={...old,...payload,id:old?.id||"demo-cycle-"+Date.now(),profile_id:selected.id,created_by:userId,created_at:old?.created_at||new Date().toISOString(),updated_at:new Date().toISOString()};}
      else row=await healthRepository.upsertCycleEntry({profileId:selected.id,actorUserId:userId,entry:payload});
      const rows=[row,...cycleEntries.filter(x=>x.entry_date!==row.entry_date)].sort((a,b)=>b.entry_date.localeCompare(a.entry_date));storeDemoRows("cycle-entries",rows);setCycleEntries(rows);setNotice("تم حفظ سجل الدورة.");
    }catch(e){setError(e?.message||"تعذر حفظ سجل الدورة.");}finally{setBusy(false);}
  }
  async function removeCycleEntry(row) {
    if(!selected||!isOwner||!selected.cycle_tracking_enabled||!window.confirm("حذف سجل هذا اليوم؟"))return;
    setBusy(true);setError("");setNotice("");
    try{const rows=cycleEntries.filter(x=>x.id!==row.id);if(!isDemo)await healthRepository.deleteCycleEntry({profileId:selected.id,actorUserId:userId,id:row.id});storeDemoRows("cycle-entries",rows);setCycleEntries(rows);setNotice("تم حذف سجل الدورة.");}
    catch(e){setError(e?.message||"تعذر حذف السجل.");}finally{setBusy(false);}
  }

  async function uploadMedicalDocument(e) {
    e?.preventDefault(); if (!selected || !hasScopeAction("documents","create")) return;
    setBusy(true); setError(""); setNotice("");
    try {
      if (isDemo) throw new Error("رفع الملفات متاح فقط في الحساب الفعلي، وليس في وضع Demo.");
      if (!documentFile) throw new Error("اختر ملفًا أولًا.");
      const row = await healthRepository.uploadDocument({
        profileId:selected.id, actorUserId:userId, file:documentFile,
        displayName:documentDraft.display_name || documentFile.name,
        documentType:documentDraft.document_type, documentDate:documentDraft.document_date,
        notes:documentDraft.notes
      });
      setDocuments(rows=>[row,...rows]); setDocumentFile(null);
      setDocumentDraft({display_name:"",document_type:"other",document_date:"",notes:""});
      setNotice("تم رفع الوثيقة إلى المخزن الخاص وتسجيل بياناتها.");
    } catch(e) { setError(e?.message || "تعذر رفع الوثيقة."); }
    finally { setBusy(false); }
  }
  async function downloadMedicalDocument(row) {
    if (!selected || !hasScopeAction("documents","read")) return;
    setBusy(true); setError("");
    try {
      if (isDemo) throw new Error("الوثائق الحقيقية غير متاحة في وضع Demo.");
      const url = await healthRepository.createDocumentDownloadUrl({objectPath:row.object_path,downloadName:row.original_filename});
      if (!url) throw new Error("لم يتم إنشاء رابط تنزيل.");
      window.open(url,"_blank","noopener,noreferrer");
    } catch(e) { setError(e?.message || "تعذر فتح الوثيقة."); }
    finally { setBusy(false); }
  }
  async function removeMedicalDocument(row) {
    if (!selected || !hasScopeAction("documents","delete") || !window.confirm("حذف الوثيقة نهائيًا من المخزن الخاص؟")) return;
    setBusy(true); setError(""); setNotice("");
    try {
      if (isDemo) { const rows=documents.filter(x=>x.id!==row.id); storeDemoRows("documents",rows); setDocuments(rows); }
      else { await healthRepository.deleteDocument({profileId:selected.id,actorUserId:userId,document:row}); setDocuments(rows=>rows.filter(x=>x.id!==row.id)); }
      setNotice("تم حذف الوثيقة من المخزن والسجل.");
    } catch(e) { setError(e?.message || "تعذر حذف الوثيقة. إذا تعذر حذف بياناتها، أعد المحاولة بعد التحقق من حالة الملف."); }
    finally { setBusy(false); }
  }

  const measurementMeta = {
    weight:{label:"الوزن",unit:"kg",unitLabel:"كجم",min:0.1,max:1000,step:"0.1"},
    height:{label:"الطول",unit:"cm",unitLabel:"سم",min:20,max:300,step:"0.1"},
    blood_pressure:{label:"ضغط الدم",unit:"mmHg",unitLabel:"mmHg",min:20,max:300,step:"1",secondaryLabel:"الانبساطي",secondaryMin:10,secondaryMax:200},
    heart_rate:{label:"معدل ضربات القلب",unit:"bpm",unitLabel:"نبضة/دقيقة",min:1,max:300,step:"1"},
    body_temperature:{label:"درجة حرارة الجسم",unit:"°C",unitLabel:"°م",min:25,max:45,step:"0.1"},
    oxygen_saturation:{label:"تشبع الأكسجين",unit:"%",unitLabel:"%",min:0,max:100,step:"0.1"},
    respiratory_rate:{label:"معدل التنفس",unit:"breaths/min",unitLabel:"نفس/دقيقة",min:1,max:100,step:"1"},
    waist_circumference:{label:"محيط الخصر",unit:"cm",unitLabel:"سم",min:10,max:300,step:"0.1"},
    body_fat_percentage:{label:"نسبة دهون الجسم",unit:"%",unitLabel:"%",min:0,max:80,step:"0.1"}
  };
  async function saveMeasurement(e) {
    e?.preventDefault();
    const isUpdate=!!measurementDraft.id;
    if(!selected||!hasScopeAction("measurements",isUpdate?"update":"create"))return;
    setBusy(true);setError("");setNotice("");
    try {
      const meta=measurementMeta[measurementDraft.measurement_type];
      if(!meta)throw new Error("اختر نوع قياس صحيحًا.");
      const primary=Number(measurementDraft.value_primary);
      const secondary=measurementDraft.measurement_type==="blood_pressure"?Number(measurementDraft.value_secondary):null;
      if(!Number.isFinite(primary)||primary<meta.min||primary>meta.max)throw new Error("قيمة القياس خارج النطاق المسموح لهذا النوع.");
      if(measurementDraft.measurement_type==="blood_pressure"&&(!Number.isFinite(secondary)||secondary<meta.secondaryMin||secondary>meta.secondaryMax||primary<=secondary))throw new Error("أدخل ضغطًا انقباضيًا وانبساطيًا صحيحين.");
      const recorded=new Date(measurementDraft.recorded_at);
      if(Number.isNaN(recorded.getTime()))throw new Error("تاريخ ووقت القياس غير صحيح.");
      const payload={measurement_type:measurementDraft.measurement_type,value_primary:primary,value_secondary:secondary,unit:meta.unit,recorded_at:recorded.toISOString(),source:measurementDraft.source,context:measurementDraft.context.trim()||null,notes:measurementDraft.notes.trim()||null};
      let row;
      if(isDemo){row={...payload,id:measurementDraft.id||"demo-measurement-"+Date.now(),profile_id:selected.id,created_by:userId,created_at:new Date().toISOString(),updated_at:new Date().toISOString()};const rows=isUpdate?measurements.map(x=>x.id===row.id?row:x):[row,...measurements];storeDemoRows("measurements",rows);setMeasurements(rows);}
      else if(isUpdate){row=await healthRepository.updateMeasurement({profileId:selected.id,actorUserId:userId,id:measurementDraft.id,patch:payload});setMeasurements(rows=>rows.map(x=>x.id===row.id?row:x));}
      else{row=await healthRepository.createMeasurement({profileId:selected.id,actorUserId:userId,measurement:payload});setMeasurements(rows=>[row,...rows]);}
      setMeasurementDraft({id:"",measurement_type:"weight",value_primary:"",value_secondary:"",recorded_at:new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16),source:"manual",context:"",notes:""});
      setNotice(isUpdate?"تم تحديث القياس.":"تم تسجيل القياس.");
    }catch(err){setError(err?.message||"تعذر حفظ القياس.");}finally{setBusy(false);}
  }
  async function removeMeasurement(row) {
    if(!selected||!hasScopeAction("measurements","delete")||!window.confirm("حذف سجل القياس؟"))return;
    setBusy(true);setError("");setNotice("");
    try{if(isDemo){const rows=measurements.filter(x=>x.id!==row.id);storeDemoRows("measurements",rows);setMeasurements(rows);}else{await healthRepository.deleteMeasurement({profileId:selected.id,actorUserId:userId,id:row.id});setMeasurements(rows=>rows.filter(x=>x.id!==row.id));}setNotice("تم حذف سجل القياس.");}
    catch(err){setError(err?.message||"تعذر حذف القياس.");}finally{setBusy(false);}
  }
  function editMeasurement(row) {
    if(!hasScopeAction("measurements","update"))return;
    setMeasurementDraft({id:row.id,measurement_type:row.measurement_type,value_primary:String(row.value_primary),value_secondary:row.value_secondary==null?"":String(row.value_secondary),recorded_at:new Date(new Date(row.recorded_at).getTime()-new Date(row.recorded_at).getTimezoneOffset()*60000).toISOString().slice(0,16),source:row.source||"manual",context:row.context||"",notes:row.notes||""});
    window.scrollTo({top:0,behavior:"smooth"});
  }

  const box = (title, description, children) => <section style={{ ...CARD, marginBottom: 16 }}><h2 style={{ margin: "0 0 7px", fontSize: 17, color: COLORS.ink }}>{title}</h2>{description && <p style={{ margin: "0 0 16px", color: COLORS.muted, fontSize: 13, lineHeight: 1.8 }}>{description}</p>}{children}</section>;
  const field = (label, value, onChange, extra = {}) => <label style={{ display: "block", marginBottom: 13 }}><span style={LABEL}>{label}</span><input style={FIELD} value={value} onChange={e => onChange(e.target.value)} {...extra} /></label>;
  const pageTitle = ({ home: "نظرة عامة", profile: "الملف الصحي", search: "البحث الصحي", timeline: "الخط الزمني الصحي", body_map: "مخطط الجسم", measurements: "القياسات الحيوية", conditions: "الحالات والحساسيات", symptoms: "الأعراض", medications: "الأدوية والعلاجات", flare_events: "نوبات التهيّج", checkins: "المتابعة اليومية", factors: "العوامل والمتتبعات", cycle_tracking: "متابعة الدورة الاختيارية", access: "المشاركة والتفويض", documents: "الوثائق الطبية", settings: "الإعدادات والخصوصية" })[page] || "نظرة عامة";

  return <div dir="rtl" style={{ maxWidth: 1050, margin: "0 auto", color: COLORS.ink }}>
    <header style={{ ...CARD, marginBottom: 16, background: "linear-gradient(130deg,#FFFFFF,#F0F9FF)" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div style={{ minWidth: 220, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 8 }}><span style={{ fontSize: 26 }}>🩺</span><span style={{ fontSize: 11, fontWeight: 900, color: COLORS.blue }}>HEALTH & WELLNESS OS · H2.4</span></div>
          <h1 style={{ margin: "0 0 8px", fontSize: 25 }}>الصحة والعافية</h1>
          <p style={{ margin: 0, color: COLORS.muted, fontSize: 13, lineHeight: 1.9 }}>ملف صحي خاص، مع صلاحيات مشاركة صريحة وقابلة للإلغاء. لا تُشارك البيانات تلقائيًا مع مساحة العمل أو أي نظام آخر.</p>
        </div>
        <div style={{ border: "1px solid #BAE6FD", background: "#F0F9FF", borderRadius: 12, padding: "10px 13px", fontSize: 12, color: "#075985", maxWidth: 240 }}>
          <strong>الخصوصية أولًا</strong><div style={{ marginTop: 4, lineHeight: 1.7 }}>Health OS يوثّق معلوماتك فقط ولا يُعد تشخيصًا أو بديلًا للرعاية الطبية.</div>
        </div>
      </div>
      <nav style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 18 }}>
        {[["home","الرئيسية"],["profile","الملف الصحي"],["measurements","القياسات الحيوية"],["conditions","الحالات والحساسيات"],["symptoms","الأعراض"],["medications","الأدوية والعلاجات"],["flare_events","نوبات التهيّج"],["checkins","المتابعة اليومية"],["factors","العوامل والمتتبعات"],["reports","التقارير"],["visit_summary","ملخص زيارة الطبيب"],...(selected&&isOwner&&selected.cycle_tracking_enabled?[["cycle_tracking","الدورة الاختيارية"]]:[]),["access","المشاركة"],["documents","الوثائق"],["settings","الخصوصية"]].map(([id,label]) => <button key={id} style={page===id?PRIMARY:SECONDARY} onClick={() => setPage?.(id)}>{label}</button>)}
      </nav>
    </header>

    {error && <div role="alert" style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: COLORS.red, borderRadius: 12, padding: 12, marginBottom: 14, fontSize: 13 }}>{error}</div>}
    {notice && <div role="status" style={{ background: "#ECFDF5", border: "1px solid #A7F3D0", color: COLORS.green, borderRadius: 12, padding: 12, marginBottom: 14, fontSize: 13 }}>{notice}</div>}
    {loading ? <div style={{ ...CARD, textAlign: "center", padding: 40 }}>جارٍ تحميل ملفاتك الصحية…</div> : <>
      {page === "home" && <>
        {box("ملفاتك الصحية", "يمكن أن يكون لكل مستخدم ملف شخصي مستقل. مشاركة الملف لا تمنح صلاحية لمساحة العمل.", <>
          {profiles.length ? <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 10 }}>
            {profiles.map(p => <button key={p.id} onClick={() => { setSelectedId(p.id); setPage?.("profile"); }} style={{ textAlign: "right", border: p.id===selected?.id?"2px solid "+COLORS.blue:"1px solid "+COLORS.border, borderRadius: 12, padding: 14, background: "#fff", cursor: "pointer" }}>
              <div style={{ fontWeight: 800 }}>{p.display_name}</div><div style={{ color: COLORS.muted, fontSize: 12, marginTop: 5 }}>{p.status==="active"?"نشط":"مؤرشف"} · {p.profile_type==="self"?"ملفي الشخصي":"ملف تابع"}</div>
            </button>)}
          </div> : <div style={{ padding: 22, border: "1px dashed #CBD5E1", borderRadius: 12, textAlign: "center" }}><div style={{ fontSize: 28, marginBottom: 8 }}>🗂️</div><strong>لم تنشئ ملفًا صحيًا بعد</strong><p style={{ color: COLORS.muted, fontSize: 13, lineHeight: 1.8 }}>أنشئ الملف أولًا؛ لن نضيف أي معلومات طبية تلقائيًا.</p></div>}
        </>)}
        {!profiles.length && box("إنشاء ملف صحي", "الملف الأول خاص بحسابك. يمكنك تعديل الاسم والمنطقة الزمنية لاحقًا.", <form onSubmit={createProfile}>
          {field("اسم الملف", newName, setNewName, { maxLength: 120 })}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12 }}>
            {field("المنطقة الزمنية", timezone, setTimezone, { maxLength: 80 })}
            {field("اللغة", locale, setLocale, { maxLength: 20 })}
          </div>
          <button disabled={busy} style={{ ...PRIMARY, opacity: busy ? .65 : 1 }}>{busy?"جارٍ الإنشاء…":"إنشاء الملف الصحي"}</button>
        </form>)}
        {selected && box("حالة المرحلة", "تم تفعيل الملف الصحي والسجل الطبي والأدوية والنوبات والمتابعة اليومية والعوامل. أصبحت القياسات الحيوية متاحة؛ وأصبحت مراحل مخطط الجسم والبحث الصحي والخط الزمني متاحة للمراجعة؛ ولا تزال اختبارات القبول الشاملة مطلوبة.", <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10 }}>
          {[["الملفات",profiles.length],["التفويضات النشطة",grants.filter(g=>!g.revoked_at && (!g.expires_at||new Date(g.expires_at)>new Date())).length],["أحداث التدقيق",auditEvents.length]].map(([label,value]) => <div key={label} style={{ border: "1px solid "+COLORS.border, borderRadius: 12, padding: 13 }}><div style={{ color: COLORS.muted, fontSize: 12 }}>{label}</div><strong style={{ display: "block", fontSize: 22, marginTop: 5 }}>{value}</strong></div>)}
        </div>)}
      </>}
      {page === "profile" && (selected ? box("إعدادات الملف", "المالك فقط يستطيع تغيير إعدادات الملف. التفويض للمستخدمين الآخرين لا يسمح بتغيير ملكية الملف.", isOwner ? <form onSubmit={saveProfile}>
        {field("اسم الملف", editName, setEditName, { maxLength: 120 })}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12 }}>
          {field("المنطقة الزمنية", timezone, setTimezone, { maxLength: 80 })}
          {field("اللغة", locale, setLocale, { maxLength: 20 })}
        </div>
        <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 14 }}>أنشئ: {fmtDate(selected.created_at)} · المعرّف الداخلي: <code>{selected.id}</code></div>
        <button disabled={busy} style={{ ...PRIMARY, opacity: busy ? .65 : 1 }}>حفظ التغييرات</button>
      </form> : <p style={{ color: COLORS.muted }}>يمكنك عرض الملف الذي تمت مشاركته معك، لكن تعديل إعداداته يظل للمالك.</p>) : box("لا يوجد ملف محدد", "أنشئ ملفًا من الصفحة الرئيسية أولًا.", <button style={PRIMARY} onClick={() => setPage?.("home")}>العودة للرئيسية</button>))}
      {page === "access" && (selected ? <>
        {isOwner && box("منح صلاحية", "استخدم معرّف حساب Supabase للمستخدم المقصود. لا نستخدم البريد كهوية تفويض ولا نمنح الوصول بناءً على عضوية مساحة العمل.", <form onSubmit={addGrant}>
          {field("معرّف المستخدم المستهدف (UUID)", granteeId, setGranteeId, { placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx", autoComplete: "off" })}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 12 }}>
            <label><span style={LABEL}>نوع الصلاحية</span><select style={FIELD} value={grantRole} onChange={e => setGrantRole(e.target.value)}><option value="viewer">قارئ — عرض فقط</option><option value="editor">محرر — حسب النطاق الممنوح</option></select></label>
            <label><span style={LABEL}>تاريخ الانتهاء (اختياري)</span><input type="date" style={FIELD} value={expiresDate} onChange={e => setExpiresDate(e.target.value)} /></label>
          </div>
          <div style={{ margin: "8px 0 14px" }}><div style={LABEL}>النطاقات الإضافية (يظل الملف الشخصي ظاهرًا بالحد الأدنى)</div><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{SCOPE_OPTIONS.map(([key,label]) => <label key={key} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 10px", border: "1px solid "+COLORS.border, borderRadius: 9, fontSize: 12 }}><input type="checkbox" checked={scopes.includes(key)} onChange={e => setScopes(prev => e.target.checked ? [...prev,key] : prev.filter(s=>s!==key))} />{label}</label>)}</div></div>
          <button disabled={busy} style={{ ...PRIMARY, opacity: busy ? .65 : 1 }}>حفظ التفويض</button>
        </form>)}
        {box("التفويضات", "يمكن إلغاء التفويض في أي وقت. لا يؤدي الإلغاء إلى حذف بيانات الملف.", grants.length ? <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 620 }}><thead><tr>{["الحساب","الدور","النطاق","الحالة","الانتهاء","الإجراء"].map(h=><th key={h} style={{ textAlign: "right", padding: 10, borderBottom: "1px solid "+COLORS.border, color: COLORS.muted }}>{h}</th>)}</tr></thead><tbody>{grants.map(g=>{const expired=g.expires_at&&new Date(g.expires_at)<=new Date();const active=!g.revoked_at&&!expired&&new Date(g.starts_at)<=new Date();return <tr key={g.id}><td style={{ padding: 10, borderBottom: "1px solid "+COLORS.border }}><code>{g.grantee_user_id}</code></td><td style={{ padding: 10, borderBottom: "1px solid "+COLORS.border }}>{g.grant_role==="viewer"?"قارئ":g.grant_role==="editor"?"محرر":"مخصص"}</td><td style={{ padding: 10, borderBottom: "1px solid "+COLORS.border }}>{(g.scope_keys||[]).map(k=>k==="profile"?"الملف":SCOPE_OPTIONS.find(s=>s[0]===k)?.[1]||k).join("، ")}</td><td style={{ padding: 10, borderBottom: "1px solid "+COLORS.border, color: active?COLORS.green:COLORS.muted }}>{active?"نشط":g.revoked_at?"ملغي":expired?"منتهي":"لم يبدأ"}</td><td style={{ padding: 10, borderBottom: "1px solid "+COLORS.border }}>{fmtDate(g.expires_at)}</td><td style={{ padding: 10, borderBottom: "1px solid "+COLORS.border }}>{isOwner&&active?<button disabled={busy} style={{ ...SECONDARY, color: COLORS.red }} onClick={()=>revokeGrant(g)}>إلغاء</button>:"—"}</td></tr>})}</tbody></table></div> : <div style={{ color: COLORS.muted, fontSize: 13 }}>لا توجد تفويضات حتى الآن.</div>)}
      </> : box("لا يوجد ملف صحي", "أنشئ ملفًا أولًا ثم يمكنك إدارة التفويض.", <button style={PRIMARY} onClick={() => setPage?.("home")}>العودة للرئيسية</button>))}

      {page === "measurements" && (selected ? <>
        {box("تسجيل قياس حيوي أو قياس للجسم","يُسجّل القياس بوحدته القياسية مع وقت ومصدر واضحين. القيم المدخلة توثيق شخصي وليست تفسيرًا طبيًا أو تنبيهًا تشخيصيًا.",hasScopeAction("measurements",measurementDraft.id?"update":"create")?<form onSubmit={saveMeasurement}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:12}}>
            <label><span style={LABEL}>نوع القياس</span><select style={FIELD} value={measurementDraft.measurement_type} onChange={e=>setMeasurementDraft(d=>({...d,measurement_type:e.target.value,value_primary:"",value_secondary:""}))}>{Object.entries(measurementMeta).map(([key,m])=><option key={key} value={key}>{m.label}</option>)}</select></label>
            {field(measurementDraft.measurement_type==="blood_pressure"?"الانقباضي (mmHg)":measurementMeta[measurementDraft.measurement_type].label+" ("+measurementMeta[measurementDraft.measurement_type].unitLabel+")",measurementDraft.value_primary,v=>setMeasurementDraft(d=>({...d,value_primary:v})),{type:"number",min:measurementMeta[measurementDraft.measurement_type].min,max:measurementMeta[measurementDraft.measurement_type].max,step:measurementMeta[measurementDraft.measurement_type].step,required:true})}
            {measurementDraft.measurement_type==="blood_pressure"&&field("الانبساطي (mmHg)",measurementDraft.value_secondary,v=>setMeasurementDraft(d=>({...d,value_secondary:v})),{type:"number",min:measurementMeta.blood_pressure.secondaryMin,max:measurementMeta.blood_pressure.secondaryMax,step:1,required:true})}
            {field("تاريخ ووقت القياس",measurementDraft.recorded_at,v=>setMeasurementDraft(d=>({...d,recorded_at:v})),{type:"datetime-local",required:true})}
            <label><span style={LABEL}>مصدر القياس</span><select style={FIELD} value={measurementDraft.source} onChange={e=>setMeasurementDraft(d=>({...d,source:e.target.value}))}><option value="manual">إدخال يدوي</option><option value="device">جهاز</option><option value="imported">مستورد</option><option value="other">أخرى</option></select></label>
            {field("السياق (اختياري)",measurementDraft.context,v=>setMeasurementDraft(d=>({...d,context:v})),{maxLength:80,placeholder:"مثل: أثناء الراحة / بعد النشاط"})}
          </div>
          <label style={{display:"block",marginBottom:13}}><span style={LABEL}>ملاحظات اختيارية</span><textarea style={{...FIELD,minHeight:65}} maxLength={2000} value={measurementDraft.notes} onChange={e=>setMeasurementDraft(d=>({...d,notes:e.target.value}))}/></label>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}><button disabled={busy} style={PRIMARY}>{measurementDraft.id?"حفظ تعديل القياس":"تسجيل القياس"}</button>{measurementDraft.id&&<button type="button" style={SECONDARY} onClick={()=>setMeasurementDraft({id:"",measurement_type:"weight",value_primary:"",value_secondary:"",recorded_at:new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16),source:"manual",context:"",notes:""})}>إلغاء التعديل</button>}</div>
        </form>:<p style={{fontSize:13,color:COLORS.muted}}>لا تملك صلاحية إضافة أو تعديل القياسات.</p>)}
        {(()=>{
          const latestWeight=measurements.filter(x=>x.measurement_type==="weight").sort((a,b)=>new Date(b.recorded_at)-new Date(a.recorded_at))[0];
          const latestHeight=measurements.filter(x=>x.measurement_type==="height").sort((a,b)=>new Date(b.recorded_at)-new Date(a.recorded_at))[0];
          const bmi=latestWeight&&latestHeight?Number(latestWeight.value_primary)/(Number(latestHeight.value_primary)/100)**2:null;
          return bmi&&Number.isFinite(bmi)?box("مؤشر كتلة الجسم المحسوب","قيمة حسابية تقريبية من أحدث وزن وأحدث طول مسجلين. قد لا تكون القياسات متزامنة، ولا تُستخدم هنا للتشخيص أو تصنيف الحالة.",<div style={{display:"flex",alignItems:"center",gap:18,flexWrap:"wrap"}}><strong style={{fontSize:30}}>{bmi.toFixed(1)}</strong><span style={{fontSize:12,color:COLORS.muted}}>الوزن: {latestWeight.value_primary} كجم · {fmtDate(latestWeight.recorded_at)}<br/>الطول: {latestHeight.value_primary} سم · {fmtDate(latestHeight.recorded_at)}</span></div>):null;
        })()}
        {box("سجل القياسات","يمكن تعديل السجل أو حذفه وفق صلاحيات الملف. القيم محفوظة كما أدخلتها مع مصدرها وتوقيتها.",measurements.length?<div style={{display:"grid",gap:9}}>{[...measurements].sort((a,b)=>new Date(b.recorded_at)-new Date(a.recorded_at)).map(row=>{const meta=measurementMeta[row.measurement_type];return <article key={row.id} style={{border:"1px solid "+COLORS.border,borderRadius:12,padding:13}}><div style={{display:"flex",justifyContent:"space-between",gap:10,flexWrap:"wrap"}}><strong>{meta?.label||row.measurement_type}</strong><span style={{fontSize:12,color:COLORS.muted}}>{fmtDate(row.recorded_at)}</span></div><div style={{fontSize:20,fontWeight:800,marginTop:7}}>{row.measurement_type==="blood_pressure"?row.value_primary+" / "+row.value_secondary+" mmHg":row.value_primary+" "+row.unit}</div><div style={{fontSize:12,color:COLORS.muted,marginTop:5}}>المصدر: {({manual:"يدوي",device:"جهاز",imported:"مستورد",other:"أخرى"})[row.source]||row.source}{row.context?" · "+row.context:""}</div>{row.notes&&<p style={{fontSize:12,whiteSpace:"pre-wrap",marginBottom:0}}>{row.notes}</p>}<div style={{display:"flex",gap:7,marginTop:10}}>{hasScopeAction("measurements","update")&&<button style={SECONDARY} disabled={busy} onClick={()=>editMeasurement(row)}>تعديل</button>}{hasScopeAction("measurements","delete")&&<button style={{...SECONDARY,color:COLORS.red}} disabled={busy} onClick={()=>removeMeasurement(row)}>حذف</button>}</div></article>})}</div>:<p style={{fontSize:13,color:COLORS.muted}}>لا توجد قياسات مسجلة لهذا الملف بعد.</p>)}
      </> : box("لا يوجد ملف صحي","أنشئ ملفًا صحيًا أولًا.",<button style={PRIMARY} onClick={()=>setPage?.("home")}>الرئيسية</button>))}
      {page === "conditions" && (selected ? <>
        {hasScopeAction("conditions","create") && box("إضافة حالة طبية","سجّل الحالات كما وثّقها مختص. التطبيق لا يستنتج تشخيصًا ولا يغيّر العلاج.",<form onSubmit={addCondition}>
          {field("اسم الحالة",conditionDraft.name,v=>setConditionDraft(d=>({...d,name:v})),{maxLength:160,required:true})}
          <label style={{display:"block",marginBottom:12}}><span style={LABEL}>النوع</span><select style={FIELD} value={conditionDraft.condition_type} onChange={e=>setConditionDraft(d=>({...d,condition_type:e.target.value}))}><option value="unknown">غير محدد</option><option value="chronic">مزمنة</option><option value="acute">حادة/مؤقتة</option><option value="other">أخرى</option></select></label>
          {field("تاريخ التشخيص",conditionDraft.diagnosed_on,v=>setConditionDraft(d=>({...d,diagnosed_on:v})),{type:"date"})}
          {field("الطبيب/المصدر (اختياري)",conditionDraft.diagnosed_by,v=>setConditionDraft(d=>({...d,diagnosed_by:v})),{maxLength:160})}
          <label style={{display:"block",marginBottom:12}}><span style={LABEL}>ملاحظات</span><textarea style={{...FIELD,minHeight:70}} maxLength={4000} value={conditionDraft.notes} onChange={e=>setConditionDraft(d=>({...d,notes:e.target.value}))}/></label>
          <button disabled={busy} style={PRIMARY}>إضافة الحالة</button>
        </form>)}
        {box("الحالات الطبية","تحويل الحالة إلى منتهية لا يحذف تاريخها.",conditions.length?<div style={{display:"grid",gap:10}}>{conditions.map(row=><article key={row.id} style={{border:"1px solid "+COLORS.border,borderRadius:12,padding:13}}><div style={{display:"flex",justifyContent:"space-between",gap:10,flexWrap:"wrap"}}><strong>{row.name}</strong><span style={{color:row.status==="active"?COLORS.green:COLORS.muted,fontSize:12}}>{row.status==="active"?"نشطة":"منتهية"}</span></div><div style={{fontSize:12,color:COLORS.muted,marginTop:6}}>{({chronic:"مزمنة",acute:"حادة/مؤقتة",other:"أخرى",unknown:"غير محدد"})[row.condition_type]||row.condition_type} · تاريخ التشخيص: {row.diagnosed_on||"غير محدد"}</div>{row.notes&&<p style={{fontSize:13,whiteSpace:"pre-wrap"}}>{row.notes}</p>}<div style={{display:"flex",gap:8}}>{hasScopeAction("conditions","update")&&<button style={SECONDARY} disabled={busy} onClick={()=>toggleCondition(row)}>{row.status==="active"?"تحديد كمنتهية":"إعادة إلى نشطة"}</button>}{hasScopeAction("conditions","delete")&&<button style={{...SECONDARY,color:COLORS.red}} disabled={busy} onClick={()=>removeCondition(row)}>حذف</button>}</div></article>)}</div>:<p style={{color:COLORS.muted,fontSize:13}}>لا توجد حالات مسجلة بعد.</p>)}
        {hasScopeAction("conditions","create") && box("إضافة حساسية","سجّل المادة والتفاعل المعروفين فقط. التطبيق ليس خدمة طوارئ.",<form onSubmit={addAllergy}>
          {field("المادة/المسبب",allergyDraft.allergen,v=>setAllergyDraft(d=>({...d,allergen:v})),{maxLength:160,required:true})}
          {field("التفاعل المعروف",allergyDraft.reaction,v=>setAllergyDraft(d=>({...d,reaction:v})),{maxLength:1000})}
          <label style={{display:"block",marginBottom:12}}><span style={LABEL}>الشدة الموثقة</span><select style={FIELD} value={allergyDraft.severity} onChange={e=>setAllergyDraft(d=>({...d,severity:e.target.value}))}><option value="unknown">غير معروفة</option><option value="mild">خفيفة</option><option value="moderate">متوسطة</option><option value="severe">شديدة</option></select></label>
          {field("أول ظهور معروف",allergyDraft.first_observed_on,v=>setAllergyDraft(d=>({...d,first_observed_on:v})),{type:"date"})}
          <label style={{display:"block",marginBottom:12}}><span style={LABEL}>ملاحظات</span><textarea style={{...FIELD,minHeight:60}} maxLength={3000} value={allergyDraft.notes} onChange={e=>setAllergyDraft(d=>({...d,notes:e.target.value}))}/></label>
          <button disabled={busy} style={PRIMARY}>إضافة الحساسية</button>
        </form>)}
        {box("الحساسيات","تغيير الحالة هنا توثيق شخصي وليس إثباتًا لزوال الحساسية.",allergies.length?<div style={{display:"grid",gap:10}}>{allergies.map(row=><article key={row.id} style={{border:"1px solid "+COLORS.border,borderRadius:12,padding:13}}><div style={{display:"flex",justifyContent:"space-between",gap:10,flexWrap:"wrap"}}><strong>{row.allergen}</strong><span style={{fontSize:12,color:row.severity==="severe"?COLORS.red:COLORS.muted}}>{({mild:"خفيفة",moderate:"متوسطة",severe:"شديدة",unknown:"الشدة غير معروفة"})[row.severity]||row.severity} · {row.status==="active"?"نشطة":"غير نشطة"}</span></div>{row.reaction&&<p style={{fontSize:13}}>التفاعل: {row.reaction}</p>}{row.notes&&<p style={{fontSize:12,color:COLORS.muted,whiteSpace:"pre-wrap"}}>{row.notes}</p>}<div style={{display:"flex",gap:8}}>{hasScopeAction("conditions","update")&&<button style={SECONDARY} disabled={busy} onClick={()=>toggleAllergy(row)}>{row.status==="active"?"تحديد كغير نشطة":"إعادة إلى نشطة"}</button>}{hasScopeAction("conditions","delete")&&<button style={{...SECONDARY,color:COLORS.red}} disabled={busy} onClick={()=>removeAllergy(row)}>حذف</button>}</div></article>)}</div>:<p style={{color:COLORS.muted,fontSize:13}}>لا توجد حساسيات مسجلة بعد.</p>)}
      </> : box("لا يوجد ملف صحي","أنشئ ملفًا صحيًا أولًا.",<button style={PRIMARY} onClick={()=>setPage?.("home")}>الرئيسية</button>))}
      {page === "timeline" && (selected ? <HealthTimeline data={{conditions,allergies,symptomLogs,medications,medicationVersions,medicationEvents,sideEffects,flareEvents,measurements,dailyCheckins,documents}} canRead={hasScopeAction} timezone={selected.timezone||timezone||"Africa/Cairo"} onOpen={targetPage=>setPage?.(targetPage)} /> : box("لا يوجد ملف صحي","أنشئ ملفًا صحيًا أولًا.",<button style={PRIMARY} onClick={()=>setPage?.("home")}>الرئيسية</button>))}
      {page === "search" && (selected ? <HealthSearch data={{conditions,allergies,symptomDefinitions,symptomLogs,documents,medications,medicationVersions,medicationEvents,sideEffects,flareEvents,dailyCheckins,factors,factorLogs,measurements}} canRead={hasScopeAction} onOpen={(targetPage)=>setPage?.(targetPage)} /> : box("لا يوجد ملف صحي","أنشئ ملفًا صحيًا أولًا.",<button style={PRIMARY} onClick={()=>setPage?.("home")}>الرئيسية</button>))}
      {page === "body_map" && (selected ? <>
        {box("مخطط الجسم التفاعلي","اختر سجل أعراض لتعديل موضعه، ثم حدد المنطقة على المخطط الأمامي أو الخلفي. لا يستنتج النظام تشخيصًا من موقع العرض.",<>
          <label style={{display:"block",marginBottom:12}}><span style={LABEL}>سجل العَرَض المراد ربطه بالمخطط</span><select style={FIELD} value={bodyMapTargetId} onChange={e=>selectBodyMapTarget(e.target.value)}><option value="">اختر سجلًا محفوظًا</option>{symptomLogs.map(row=><option key={row.id} value={row.id}>{row.symptom_name_snapshot} · {fmtDate(row.recorded_at)} · الشدة {row.severity}/10</option>)}</select></label>
          <HealthBodyMap view={bodyMapView} onViewChange={v=>{setBodyMapView(v);setBodyMapDraft(d=>({...d,body_region_code:null,body_view:null,body_x:null,body_y:null,body_location:""}));}} selectedRegionCode={bodyMapDraft.body_region_code||""} selectedPoint={bodyMapDraft} onSelect={loc=>setBodyMapDraft(d=>({...d,...loc}))} disabled={busy||!hasScopeAction("symptoms","read")}/>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:12}}><button type="button" style={PRIMARY} disabled={busy||!bodyMapTargetId||!hasScopeAction("symptoms","update")} onClick={saveSymptomBodyLocation}>حفظ موضع العرض</button><button type="button" style={SECONDARY} disabled={busy||!bodyMapTargetId} onClick={()=>setBodyMapDraft({body_region_code:null,body_view:null,body_x:null,body_y:null,body_location:""})}>مسح الموقع المحدد</button></div>
          {!hasScopeAction("symptoms","update")&&<p style={{fontSize:12,color:COLORS.muted,marginBottom:0}}>تحتاج صلاحية تعديل الأعراض لتغيير موقع السجل.</p>}
        </>)}
        {box("السجلات حسب المنطقة","هذه قائمة من سجلات الأعراض الأصلية؛ لا يتم إنشاء سجلات منفصلة للمخطط.",symptomLogs.filter(x=>x.body_region_code&&(!bodyMapDraft.body_region_code||x.body_region_code===bodyMapDraft.body_region_code)).length?<div style={{display:"grid",gap:8}}>{symptomLogs.filter(x=>x.body_region_code&&(!bodyMapDraft.body_region_code||x.body_region_code===bodyMapDraft.body_region_code)).sort((a,b)=>new Date(b.recorded_at)-new Date(a.recorded_at)).map(row=><article key={row.id} style={{border:"1px solid "+COLORS.border,borderRadius:10,padding:11,display:"flex",justifyContent:"space-between",gap:8,flexWrap:"wrap"}}><div><strong>{row.symptom_name_snapshot}</strong><div style={{fontSize:12,color:COLORS.muted}}>{BODY_REGION_LABELS[row.body_region_code]||row.body_location||"موضع مخصص"} · {row.body_view==="front"?"الأمام":"الخلف"} · {fmtDate(row.recorded_at)}</div></div><button type="button" style={SECONDARY} onClick={()=>selectBodyMapTarget(row.id)}>عرض على المخطط</button></article>)}</div>:<p style={{fontSize:13,color:COLORS.muted}}>لا توجد سجلات مرتبطة بهذه المنطقة بعد. اختر سجلًا بالأعلى لتحديد موضعه أو انتقل إلى صفحة الأعراض لتسجيل عرض جديد.</p>)}
      </> : box("لا يوجد ملف صحي","أنشئ ملفًا صحيًا أولًا.",<button style={PRIMARY} onClick={()=>setPage?.("home")}>الرئيسية</button>))}
      {page === "symptoms" && (selected ? <>
        {hasScopeAction("symptoms","create") && box("قائمة الأعراض","أضف الأعراض التي تريد تتبعها. الأسماء خاصة بالملف.",<form onSubmit={addSymptomDefinition}>
          {field("اسم العَرَض",symptomDraft.name,v=>setSymptomDraft(d=>({...d,name:v})),{maxLength:120,required:true})}
          {field("التصنيف (اختياري)",symptomDraft.category,v=>setSymptomDraft(d=>({...d,category:v})),{maxLength:80})}
          <button disabled={busy} style={PRIMARY}>إضافة إلى قائمة الأعراض</button>
        </form>)}
        {box("الأعراض المحفوظة","إيقاف عَرَض من القائمة لا يمحو سجلاته السابقة.",symptomDefinitions.length?<div style={{display:"grid",gap:8}}>{symptomDefinitions.map(row=><div key={row.id} style={{border:"1px solid "+COLORS.border,borderRadius:10,padding:11,display:"flex",justifyContent:"space-between",gap:10,alignItems:"center",flexWrap:"wrap"}}><div><strong>{row.name}</strong><div style={{fontSize:12,color:COLORS.muted}}>{row.category||"بلا تصنيف"} · {row.is_active?"نشط":"متوقف"}</div></div><div style={{display:"flex",gap:6}}>{hasScopeAction("symptoms","update")&&<button style={SECONDARY} disabled={busy} onClick={()=>toggleSymptomDefinition(row)}>{row.is_active?"إيقاف":"تفعيل"}</button>}{hasScopeAction("symptoms","delete")&&<button style={{...SECONDARY,color:COLORS.red}} disabled={busy} onClick={()=>removeSymptomDefinition(row)}>حذف</button>}</div></div>)}</div>:<p style={{color:COLORS.muted,fontSize:13}}>أضف أول عَرَض ثم سجّل شدته.</p>)}
        {hasScopeAction("symptoms","create") && box("تسجيل عَرَض","الشدة من 1 (خفيف جدًا) إلى 10 (شديد جدًا). الارتباطات لا تثبت السببية.",<form onSubmit={addSymptomLog}>
          <label style={{display:"block",marginBottom:12}}><span style={LABEL}>العَرَض</span><select style={FIELD} required value={symptomLogDraft.symptom_definition_id} onChange={e=>setSymptomLogDraft(d=>({...d,symptom_definition_id:e.target.value}))}><option value="">اختر عَرَضًا</option>{symptomDefinitions.filter(x=>x.is_active).map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
          <label style={{display:"block",marginBottom:12}}><span style={LABEL}>الشدة (1–10)</span><input type="number" min="1" max="10" required style={FIELD} value={symptomLogDraft.severity} onChange={e=>setSymptomLogDraft(d=>({...d,severity:e.target.value}))}/></label>
          <label style={{display:"block",marginBottom:12}}><span style={LABEL}>تاريخ ووقت البداية</span><input type="datetime-local" required style={FIELD} value={symptomLogDraft.recorded_at} onChange={e=>setSymptomLogDraft(d=>({...d,recorded_at:e.target.value}))}/></label>
          <label style={{display:"block",marginBottom:12}}><span style={LABEL}>المدة بالدقائق (اختياري)</span><input type="number" min="1" max="10080" style={FIELD} value={symptomLogDraft.duration_minutes} onChange={e=>setSymptomLogDraft(d=>({...d,duration_minutes:e.target.value}))}/></label>
          {field("وصف إضافي لموضع الجسم (اختياري)",symptomLogDraft.body_location,v=>setSymptomLogDraft(d=>({...d,body_location:v})),{maxLength:120,placeholder:"مثال: قرب مفصل الكتف"})}
          <HealthBodyMap view={symptomMapView} onViewChange={v=>{setSymptomMapView(v);setSymptomLogDraft(d=>({...d,body_region_code:null,body_view:null,body_x:null,body_y:null,body_location:""}));}} selectedRegionCode={symptomLogDraft.body_region_code||""} selectedPoint={symptomLogDraft} onSelect={loc=>setSymptomLogDraft(d=>({...d,...loc}))} disabled={busy}/>
          <label style={{display:"block",marginBottom:12}}><span style={LABEL}>ملاحظات</span><textarea style={{...FIELD,minHeight:60}} maxLength={3000} value={symptomLogDraft.notes} onChange={e=>setSymptomLogDraft(d=>({...d,notes:e.target.value}))}/></label>
          <button disabled={busy||!symptomDefinitions.some(x=>x.id===symptomLogDraft.symptom_definition_id&&x.is_active)} style={PRIMARY}>حفظ السجل</button>
        </form>)}
        {box("سجل الأعراض","أحدث السجلات أولًا. حذف اسم العَرَض لا يمحو السجلات السابقة.",symptomLogs.length?<div style={{display:"grid",gap:10}}>{symptomLogs.map(row=><article key={row.id} style={{border:"1px solid "+COLORS.border,borderRadius:12,padding:13}}><div style={{display:"flex",justifyContent:"space-between",gap:10,flexWrap:"wrap"}}><strong>{row.symptom_name_snapshot}</strong><span style={{fontSize:12,color:COLORS.muted}}>{fmtDate(row.recorded_at)}</span></div><div style={{fontSize:13,marginTop:6}}>الشدة: <strong>{row.severity}/10</strong>{row.duration_minutes?(" · المدة "+row.duration_minutes+" دقيقة"):""}{row.body_location?(" · "+row.body_location):""}</div>{row.notes&&<p style={{fontSize:12,color:COLORS.muted,whiteSpace:"pre-wrap"}}>{row.notes}</p>}<div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>{hasScopeAction("symptoms","update")&&<label style={{fontSize:12}}>تعديل الشدة <select style={{...FIELD,width:85,padding:6}} value={row.severity} disabled={busy} onChange={e=>updateSymptomSeverity(row,e.target.value)}>{Array.from({length:10},(_,i)=>i+1).map(n=><option key={n} value={n}>{n}</option>)}</select></label>}{hasScopeAction("symptoms","delete")&&<button disabled={busy} style={{...SECONDARY,color:COLORS.red}} onClick={()=>removeSymptomLog(row)}>حذف السجل</button>}</div></article>)}</div>:<p style={{color:COLORS.muted,fontSize:13}}>لا توجد سجلات أعراض بعد.</p>)}
      </> : box("لا يوجد ملف صحي","أنشئ ملفًا صحيًا أولًا.",<button style={PRIMARY} onClick={()=>setPage?.("home")}>الرئيسية</button>))}

      {page === "medications" && (selected ? <>
        {hasScopeAction("medications","create") && box("إضافة دواء أو علاج","أدخل الجرعة والجدول كما وردا في وصفة أو خطة موثوقة. لا يقترح التطبيق جرعات ولا يعدّلها نيابة عنك.",<form onSubmit={addMedication}>
          {field("اسم الدواء أو العلاج",medicationDraft.name,v=>setMedicationDraft(d=>({...d,name:v})),{required:true,maxLength:180})}
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12}}>
            {field("الاسم التجاري (اختياري)",medicationDraft.brand,v=>setMedicationDraft(d=>({...d,brand:v})),{maxLength:120})}
            <label><span style={LABEL}>الفئة</span><select style={FIELD} value={medicationDraft.medication_type} onChange={e=>setMedicationDraft(d=>({...d,medication_type:e.target.value}))}><option value="medication">دواء</option><option value="supplement">مكمل</option><option value="therapy">علاج آخر</option><option value="other">أخرى</option></select></label>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:12}}>
            {field("الجرعة الرقمية",medicationDraft.dose_amount,v=>setMedicationDraft(d=>({...d,dose_amount:v})),{type:"number",min:"0.0001",step:"any",required:true})}
            {field("وحدة الجرعة",medicationDraft.dose_unit,v=>setMedicationDraft(d=>({...d,dose_unit:v})),{required:true,maxLength:40,placeholder:"mg / ml / قرص"})}
            <label><span style={LABEL}>طريقة الاستخدام</span><select style={FIELD} value={medicationDraft.route} onChange={e=>setMedicationDraft(d=>({...d,route:e.target.value}))}><option value="oral">عن طريق الفم</option><option value="topical">موضعي</option><option value="inhaled">استنشاق</option><option value="injection">حقن</option><option value="ophthalmic">العين</option><option value="otic">الأذن</option><option value="nasal">الأنف</option><option value="rectal">شرجي</option><option value="sublingual">تحت اللسان</option><option value="other">أخرى</option><option value="unknown">غير محدد</option></select></label>
            <label><span style={LABEL}>التكرار الموثق</span><select style={FIELD} value={medicationDraft.frequency} onChange={e=>setMedicationDraft(d=>({...d,frequency:e.target.value}))}><option value="once_daily">مرة يوميًا</option><option value="twice_daily">مرتان يوميًا</option><option value="three_times_daily">3 مرات يوميًا</option><option value="four_times_daily">4 مرات يوميًا</option><option value="weekly">أسبوعيًا</option><option value="as_needed">عند الحاجة</option><option value="as_directed">حسب التوجيه</option><option value="custom">مخصص</option></select></label>
          </div>
          {field("أوقات الجدول (اختياري، HH:MM مفصولة بفواصل)",medicationDraft.schedule_times,v=>setMedicationDraft(d=>({...d,schedule_times:v})),{placeholder:"08:00, 20:00"})}
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12}}>
            {field("تاريخ بدء الخطة",medicationDraft.start_date,v=>setMedicationDraft(d=>({...d,start_date:v})),{type:"date"})}
            {field("تاريخ سريان نسخة الجرعة",medicationDraft.effective_from,v=>setMedicationDraft(d=>({...d,effective_from:v})),{type:"date",required:true})}
            {field("الطبيب/المصدر (اختياري)",medicationDraft.prescribed_by,v=>setMedicationDraft(d=>({...d,prescribed_by:v})),{maxLength:180})}
          </div>
          <label style={{display:"block",marginBottom:12}}><span style={LABEL}>تعليمات مكتوبة (اختياري)</span><textarea style={{...FIELD,minHeight:65}} maxLength={2000} value={medicationDraft.instructions} onChange={e=>setMedicationDraft(d=>({...d,instructions:e.target.value}))}/></label>
          <button disabled={busy} style={PRIMARY}>حفظ العلاج والنسخة الأولى للجرعة</button>
        </form>)}
        {box("قائمة الأدوية والعلاجات","تعديل الجرعة ينشئ نسخة جديدة؛ لا يعيد كتابة النسخة القديمة. سجل الجرعات الفعلية منفصل عن الخطة.",medications.length?<div style={{display:"grid",gap:12}}>{medications.map(med=>{const versions=medicationVersions.filter(v=>v.medication_id===med.id).sort((a,b)=>Number(b.version_no)-Number(a.version_no));const version=versions[0];const events=medicationEvents.filter(ev=>ev.medication_id===med.id).slice(0,5);const reminderValue=reminderDraft.medication_id===med.id?reminderDraft.remind_at:"";return <article key={med.id} style={{border:"1px solid "+COLORS.border,borderRadius:13,padding:14}}>
          <div style={{display:"flex",justifyContent:"space-between",gap:10,flexWrap:"wrap"}}><div><strong>{med.name}</strong>{med.brand&&<span style={{fontSize:12,color:COLORS.muted}}> · {med.brand}</span>}<div style={{fontSize:12,color:COLORS.muted,marginTop:4}}>{({medication:"دواء",supplement:"مكمل",therapy:"علاج",other:"أخرى"})[med.medication_type]||med.medication_type} · {version?("الجرعة الحالية: "+version.dose_amount+" "+version.dose_unit+" · النسخة "+version.version_no):"لا توجد نسخة جرعة"} · {med.start_date||"بلا تاريخ بدء"}</div></div><span style={{fontSize:12,color:med.status==="active"?COLORS.green:COLORS.muted}}>{({active:"نشط",paused:"موقوف مؤقتًا",stopped:"متوقف"})[med.status]||med.status}</span></div>
          {med.instructions&&<p style={{fontSize:12,whiteSpace:"pre-wrap"}}>{med.instructions}</p>}
          <div style={{display:"flex",gap:7,flexWrap:"wrap",marginTop:8}}>{hasScopeAction("medications","update")&&<><button style={SECONDARY} disabled={busy} onClick={()=>updateMedicationStatus(med,med.status==="active"?"paused":"active")}>{med.status==="active"?"إيقاف مؤقت":"إعادة إلى نشط"}</button>{med.status!=="stopped"&&<button style={{...SECONDARY,color:COLORS.red}} disabled={busy} onClick={()=>updateMedicationStatus(med,"stopped")}>تسجيل التوقف</button>}</>}{hasScopeAction("medications","create")&&version&&<button style={SECONDARY} disabled={busy} onClick={()=>setVersionDraft(d=>({...d,medication_id:d.medication_id===med.id?"":med.id,dose_amount:String(version.dose_amount),dose_unit:version.dose_unit,route:version.route,frequency:version.frequency,schedule_times:(version.schedule_times||[]).join(", "),effective_from:new Date().toISOString().slice(0,10),instructions:version.instructions||""}))}>{versionDraft.medication_id===med.id?"إغلاق تعديل الجرعة":"إنشاء نسخة جرعة جديدة"}</button>}</div>
          {versionDraft.medication_id===med.id&&<form onSubmit={addMedicationVersion} style={{marginTop:12,padding:12,background:COLORS.bg,borderRadius:10}}>
            <strong style={{fontSize:13}}>نسخة جرعة جديدة — لن تتغير السجلات السابقة</strong>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(135px,1fr))",gap:10,marginTop:10}}>
              {field("الجرعة",versionDraft.dose_amount,v=>setVersionDraft(d=>({...d,dose_amount:v})),{type:"number",min:"0.0001",step:"any",required:true})}
              {field("الوحدة",versionDraft.dose_unit,v=>setVersionDraft(d=>({...d,dose_unit:v})),{required:true,maxLength:40})}
              <label><span style={LABEL}>طريقة الاستخدام</span><select style={FIELD} value={versionDraft.route} onChange={e=>setVersionDraft(d=>({...d,route:e.target.value}))}><option value="oral">عن طريق الفم</option><option value="topical">موضعي</option><option value="inhaled">استنشاق</option><option value="injection">حقن</option><option value="ophthalmic">العين</option><option value="otic">الأذن</option><option value="nasal">الأنف</option><option value="rectal">شرجي</option><option value="sublingual">تحت اللسان</option><option value="other">أخرى</option><option value="unknown">غير محدد</option></select></label>
              <label><span style={LABEL}>التكرار</span><select style={FIELD} value={versionDraft.frequency} onChange={e=>setVersionDraft(d=>({...d,frequency:e.target.value}))}><option value="once_daily">مرة يوميًا</option><option value="twice_daily">مرتان يوميًا</option><option value="three_times_daily">3 مرات يوميًا</option><option value="four_times_daily">4 مرات يوميًا</option><option value="weekly">أسبوعيًا</option><option value="as_needed">عند الحاجة</option><option value="as_directed">حسب التوجيه</option><option value="custom">مخصص</option></select></label>
            </div>
            {field("الأوقات",versionDraft.schedule_times,v=>setVersionDraft(d=>({...d,schedule_times:v})),{placeholder:"08:00, 20:00"})}
            {field("تاريخ السريان",versionDraft.effective_from,v=>setVersionDraft(d=>({...d,effective_from:v})),{type:"date",required:true})}
            <label style={{display:"block",marginBottom:10}}><span style={LABEL}>تعليمات النسخة</span><textarea style={{...FIELD,minHeight:50}} maxLength={2000} value={versionDraft.instructions} onChange={e=>setVersionDraft(d=>({...d,instructions:e.target.value}))}/></label>
            <button style={PRIMARY} disabled={busy}>حفظ النسخة الجديدة</button>
          </form>}
          {version&&hasScopeAction("medications","create")&&<div style={{marginTop:12,paddingTop:10,borderTop:"1px solid "+COLORS.border}}>
            <strong style={{fontSize:13}}>تسجيل الجرعة الفعلية</strong><div style={{display:"flex",gap:7,flexWrap:"wrap",marginTop:8}}><button style={SECONDARY} disabled={busy} onClick={()=>recordDoseEvent(med,"taken")}>تم تناولها</button><button style={SECONDARY} disabled={busy} onClick={()=>recordDoseEvent(med,"skipped")}>تم تخطيها</button><button style={SECONDARY} disabled={busy} onClick={()=>recordDoseEvent(med,"missed")}>فاتت الجرعة</button><button style={SECONDARY} disabled={busy} onClick={()=>recordDoseEvent(med,"held")}>موقوفة مؤقتًا</button><button style={SECONDARY} disabled={busy} onClick={()=>recordDoseEvent(med,"unknown")}>غير معروف</button></div>
            {events.length>0&&<div style={{marginTop:8,fontSize:12,color:COLORS.muted}}>{events.map(ev=><div key={ev.id} style={{padding:"5px 0",borderTop:"1px solid "+COLORS.border}}>{({taken:"تم تناولها",skipped:"متخطاة",missed:"فائتة",held:"موقوفة مؤقتًا",unknown:"غير معروفة"})[ev.event_status]||ev.event_status} · {fmtDate(ev.occurred_at||ev.scheduled_for)} · {ev.dose_amount} {ev.dose_unit}</div>)}</div>}
          </div>}
          {hasScopeAction("medications","create")&&<form onSubmit={e=>addMedicationReminder(e,med)} style={{marginTop:12,display:"flex",gap:8,alignItems:"end",flexWrap:"wrap"}}><label style={{flex:"1 1 210px"}}><span style={LABEL}>تذكير داخل التطبيق</span><input type="datetime-local" required style={FIELD} value={reminderValue} onChange={e=>setReminderDraft({medication_id:med.id,remind_at:e.target.value})}/></label><button style={SECONDARY} disabled={busy||!reminderValue}>إضافة تذكير</button></form>}
        </article>})}</div>:<p style={{fontSize:13,color:COLORS.muted}}>لم تُسجل أدوية أو علاجات بعد.</p>)}
        {box("التذكيرات داخل التطبيق","هذه تذكيرات تظهر في هذه الصفحة فقط. لا توجد إشعارات خلفية أو تنبيهات هاتف في هذه المرحلة، وإكمال التذكير لا يعني أن الجرعة أُخذت.",medicationReminders.length?<div style={{display:"grid",gap:8}}>{[...medicationReminders].sort((a,b)=>new Date(a.remind_at)-new Date(b.remind_at)).map(row=>{const med=medications.find(m=>m.id===row.medication_id);return <div key={row.id} style={{border:"1px solid "+COLORS.border,borderRadius:10,padding:11,display:"flex",justifyContent:"space-between",gap:10,flexWrap:"wrap"}}><div><strong>{med?.name||"علاج محذوف"}</strong><div style={{fontSize:12,color:COLORS.muted}}>{fmtDate(row.remind_at)} · {({pending:"معلّق",completed:"تمت المراجعة",dismissed:"مخفي"})[row.status]||row.status}</div></div>{row.status==="pending"&&hasScopeAction("medications","update")&&<div style={{display:"flex",gap:6,flexWrap:"wrap"}}><button style={SECONDARY} disabled={busy} onClick={()=>updateMedicationReminder(row,"complete")}>تمت المراجعة</button><button style={SECONDARY} disabled={busy} onClick={()=>updateMedicationReminder(row,"snooze")}>تأجيل 15 دقيقة</button><button style={SECONDARY} disabled={busy} onClick={()=>updateMedicationReminder(row,"dismiss")}>إخفاء</button></div>}</div>})}</div>:<p style={{fontSize:13,color:COLORS.muted}}>لا توجد تذكيرات بعد.</p>)}
        {hasScopeAction("medications","create")&&box("تسجيل أثر جانبي","سجل الملاحظة كما حدثت؛ لا يستنتج النظام أن الدواء سببها. عند وجود أعراض خطرة اطلب مساعدة طبية عاجلة.",<form onSubmit={addSideEffect}>
          <label style={{display:"block",marginBottom:12}}><span style={LABEL}>العلاج المرتبط</span><select required style={FIELD} value={sideEffectDraft.medication_id} onChange={e=>setSideEffectDraft(d=>({...d,medication_id:e.target.value,medication_event_id:""}))}><option value="">اختر العلاج</option>{medications.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
          <label style={{display:"block",marginBottom:12}}><span style={LABEL}>ربط بجرعة مسجلة (اختياري)</span><select style={FIELD} value={sideEffectDraft.medication_event_id} onChange={e=>setSideEffectDraft(d=>({...d,medication_event_id:e.target.value}))}><option value="">بدون ربط بجرعة محددة</option>{medicationEvents.filter(ev=>ev.medication_id===sideEffectDraft.medication_id).map(ev=><option key={ev.id} value={ev.id}>{fmtDate(ev.occurred_at||ev.scheduled_for)} · {ev.event_status}</option>)}</select></label>
          {field("وصف الأثر الجانبي",sideEffectDraft.name,v=>setSideEffectDraft(d=>({...d,name:v})),{required:true,maxLength:180})}
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12}}><label><span style={LABEL}>الشدة المسجلة</span><select style={FIELD} value={sideEffectDraft.severity} onChange={e=>setSideEffectDraft(d=>({...d,severity:e.target.value}))}><option value="unknown">غير معروفة</option><option value="mild">خفيفة</option><option value="moderate">متوسطة</option><option value="severe">شديدة</option></select></label>{field("وقت الملاحظة",sideEffectDraft.occurred_at,v=>setSideEffectDraft(d=>({...d,occurred_at:v})),{type:"datetime-local",required:true})}</div>
          <label style={{display:"block",marginBottom:12}}><span style={LABEL}>ملاحظات</span><textarea style={{...FIELD,minHeight:55}} maxLength={2000} value={sideEffectDraft.notes} onChange={e=>setSideEffectDraft(d=>({...d,notes:e.target.value}))}/></label>
          <button style={PRIMARY} disabled={busy||!medications.length}>حفظ الأثر الجانبي</button>
        </form>)}
        {box("سجل الآثار الجانبية","ملاحظات شخصية مرتبطة بالعلاج، وليست إثباتًا للسببية.",sideEffects.length?<div style={{display:"grid",gap:8}}>{sideEffects.map(row=><article key={row.id} style={{border:"1px solid "+COLORS.border,borderRadius:10,padding:11}}><div style={{display:"flex",justifyContent:"space-between",gap:10,flexWrap:"wrap"}}><strong>{row.name}</strong><span style={{fontSize:12,color:row.severity==="severe"?COLORS.red:COLORS.muted}}>{({mild:"خفيف",moderate:"متوسط",severe:"شديد",unknown:"غير معروف"})[row.severity]||row.severity} · {fmtDate(row.occurred_at)}</span></div><div style={{fontSize:12,color:COLORS.muted}}>{medications.find(m=>m.id===row.medication_id)?.name||"علاج"}</div>{row.notes&&<p style={{fontSize:12,whiteSpace:"pre-wrap"}}>{row.notes}</p>}{hasScopeAction("medications","delete")&&<button style={{...SECONDARY,color:COLORS.red}} disabled={busy} onClick={()=>removeSideEffect(row)}>حذف السجل</button>}</article>)}</div>:<p style={{fontSize:13,color:COLORS.muted}}>لا توجد آثار جانبية مسجلة بعد.</p>)}
      </> : box("لا يوجد ملف صحي","أنشئ ملفًا صحيًا أولًا.",<button style={PRIMARY} onClick={()=>setPage?.("home")}>الرئيسية</button>))}

      {page === "flare_events" && (selected ? <>
        {hasScopeAction("flare_events","create")&&box("تسجيل نوبة تهيّج أو اشتداد","سجل وقت البداية والشدة والملاحظات كما لاحظتها. العوامل المحتملة لا تعني إثبات السبب ولا تتضمن توصية علاجية.",<form onSubmit={addFlareEvent}>
          {field("عنوان النوبة",flareDraft.title,v=>setFlareDraft(d=>({...d,title:v})),{required:true,maxLength:180})}
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12}}>
            <label><span style={LABEL}>الشدة (1–10)</span><input type="number" min="1" max="10" required style={FIELD} value={flareDraft.severity} onChange={e=>setFlareDraft(d=>({...d,severity:e.target.value}))}/></label>
            {field("وقت البداية",flareDraft.started_at,v=>setFlareDraft(d=>({...d,started_at:v})),{type:"datetime-local",required:true})}
          </div>
          {field("الأعراض المصاحبة (اختياري)",flareDraft.symptoms,v=>setFlareDraft(d=>({...d,symptoms:v})),{maxLength:3000})}
          {field("العوامل المحتملة (اختياري)",flareDraft.suspected_triggers,v=>setFlareDraft(d=>({...d,suspected_triggers:v})),{maxLength:3000})}
          {field("ما لاحظته من تخفيف (اختياري)",flareDraft.relief_actions,v=>setFlareDraft(d=>({...d,relief_actions:v})),{maxLength:3000})}
          <label style={{display:"block",marginBottom:12}}><span style={LABEL}>ملاحظات</span><textarea style={{...FIELD,minHeight:60}} maxLength={4000} value={flareDraft.notes} onChange={e=>setFlareDraft(d=>({...d,notes:e.target.value}))}/></label>
          <button style={PRIMARY} disabled={busy}>حفظ النوبة</button>
        </form>)}
        {box("سجل النوبات","يمكن إنهاء النوبة دون حذف تاريخها، ثم إعادة فتحها إذا لزم تصحيح الحالة.",flareEvents.length?<div style={{display:"grid",gap:10}}>{flareEvents.map(row=><article key={row.id} style={{border:"1px solid "+COLORS.border,borderRadius:12,padding:13}}><div style={{display:"flex",justifyContent:"space-between",gap:10,flexWrap:"wrap"}}><strong>{row.title}</strong><span style={{fontSize:12,color:row.status==="ongoing"?COLORS.red:COLORS.muted}}>{row.status==="ongoing"?"مستمرة":"منتهية"} · الشدة {row.severity}/10</span></div><div style={{fontSize:12,color:COLORS.muted,marginTop:5}}>البداية: {fmtDate(row.started_at)}{row.ended_at?" · النهاية: "+fmtDate(row.ended_at):""}</div>{row.symptoms&&<p style={{fontSize:13,whiteSpace:"pre-wrap"}}>الأعراض: {row.symptoms}</p>}{row.suspected_triggers&&<p style={{fontSize:13,whiteSpace:"pre-wrap"}}>عوامل محتملة: {row.suspected_triggers}</p>}{row.relief_actions&&<p style={{fontSize:13,whiteSpace:"pre-wrap"}}>ما خففها: {row.relief_actions}</p>}{row.notes&&<p style={{fontSize:12,color:COLORS.muted,whiteSpace:"pre-wrap"}}>{row.notes}</p>}<div style={{display:"flex",gap:8}}>{hasScopeAction("flare_events","update")&&<button style={SECONDARY} disabled={busy} onClick={()=>resolveFlare(row)}>{row.status==="ongoing"?"إنهاء النوبة":"إعادة فتح النوبة"}</button>}{hasScopeAction("flare_events","delete")&&<button style={{...SECONDARY,color:COLORS.red}} disabled={busy} onClick={()=>removeFlare(row)}>حذف السجل</button>}</div></article>)}</div>:<p style={{fontSize:13,color:COLORS.muted}}>لا توجد نوبات مسجلة بعد.</p>)}
      </> : box("لا يوجد ملف صحي","أنشئ ملفًا صحيًا أولًا.",<button style={PRIMARY} onClick={()=>setPage?.("home")}>الرئيسية</button>))}

      {page === "documents" && (selected ? <>
        {hasScopeAction("documents","create") && box("رفع وثيقة طبية","الملفات تُحفظ في مخزن خاص، باسم كائن عشوائي لا يكشف اسم الملف. الأنواع المسموحة PDF/JPG/PNG/WEBP وبحد أقصى 10 ميجابايت.",<form onSubmit={uploadMedicalDocument}>
          {field("اسم ظاهر للوثيقة",documentDraft.display_name,v=>setDocumentDraft(d=>({...d,display_name:v})),{maxLength:180,placeholder:"مثال: تحليل الدم"})
          }
          <label style={{display:"block",marginBottom:12}}><span style={LABEL}>نوع الوثيقة</span><select style={FIELD} value={documentDraft.document_type} onChange={e=>setDocumentDraft(d=>({...d,document_type:e.target.value}))}><option value="lab_result">نتيجة تحليل</option><option value="imaging">تصوير طبي</option><option value="prescription">وصفة طبية</option><option value="visit_summary">ملخص زيارة</option><option value="discharge_summary">ملخص خروج</option><option value="insurance">تأمين صحي</option><option value="other">أخرى</option></select></label>
          {field("تاريخ الوثيقة (اختياري)",documentDraft.document_date,v=>setDocumentDraft(d=>({...d,document_date:v})),{type:"date"})}
          <label style={{display:"block",marginBottom:12}}><span style={LABEL}>الملف</span><input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" style={{...FIELD,padding:8}} onChange={e=>setDocumentFile(e.target.files?.[0]||null)} /></label>
          {documentFile && <div style={{fontSize:12,color:COLORS.muted,marginBottom:12}}>{documentFile.name} · {(documentFile.size/1024/1024).toFixed(2)} MB</div>}
          <label style={{display:"block",marginBottom:12}}><span style={LABEL}>ملاحظات غير ضرورية (اختياري)</span><textarea style={{...FIELD,minHeight:60}} maxLength={3000} value={documentDraft.notes} onChange={e=>setDocumentDraft(d=>({...d,notes:e.target.value}))}/></label>
          {isDemo&&<p style={{fontSize:12,color:COLORS.muted}}>وضع Demo يسمح باستعراض الشاشة فقط ولا يرفع ملفات حقيقية.</p>}
          <button disabled={busy||isDemo||!documentFile} style={PRIMARY}>{busy?"جارٍ الرفع…":"رفع الوثيقة"}</button>
        </form>)}
        {box("الوثائق المحفوظة","تُنشأ روابط تنزيل مؤقتة لمدة 60 ثانية بعد التحقق من صلاحية القراءة. لا تشارك الرابط المؤقت.",hasScopeAction("documents","read")?(documents.length?<div style={{display:"grid",gap:10}}>{documents.map(row=><article key={row.id} style={{border:"1px solid "+COLORS.border,borderRadius:12,padding:13}}><div style={{display:"flex",justifyContent:"space-between",gap:10,flexWrap:"wrap"}}><strong>{row.display_name}</strong><span style={{fontSize:12,color:COLORS.muted}}>{row.document_date||"التاريخ غير محدد"}</span></div><div style={{fontSize:12,color:COLORS.muted,marginTop:6}}>{({lab_result:"نتيجة تحليل",imaging:"تصوير طبي",prescription:"وصفة طبية",visit_summary:"ملخص زيارة",discharge_summary:"ملخص خروج",insurance:"تأمين صحي",other:"أخرى"})[row.document_type]||row.document_type} · {(Number(row.size_bytes)/1024/1024).toFixed(2)} MB · {fmtDate(row.created_at)}</div>{row.notes&&<p style={{fontSize:12,whiteSpace:"pre-wrap"}}>{row.notes}</p>}<div style={{display:"flex",gap:8,flexWrap:"wrap"}}><button style={SECONDARY} disabled={busy||isDemo} onClick={()=>downloadMedicalDocument(row)}>تنزيل آمن</button>{hasScopeAction("documents","delete")&&<button style={{...SECONDARY,color:COLORS.red}} disabled={busy} onClick={()=>removeMedicalDocument(row)}>حذف الوثيقة</button>}</div></article>)}</div>:<p style={{color:COLORS.muted,fontSize:13}}>لا توجد وثائق محفوظة لهذا الملف.</p>):<p style={{color:COLORS.muted,fontSize:13}}>لا يملك هذا الحساب صلاحية قراءة الوثائق الطبية.</p>)}
      </> : box("لا يوجد ملف صحي","أنشئ ملفًا صحيًا أولًا.",<button style={PRIMARY} onClick={()=>setPage?.("home")}>الرئيسية</button>))}
      {page === "checkins" && (selected ? <>
        {box("المتابعة اليومية", "سجّل ما تلاحظه عن المزاج والطاقة والضغط والنوم والهضم. هذه بيانات ذاتية وليست قياسات تشخيصية؛ الطعام والماء والتمرين تبقى في Nutrition OS وSports OS.", hasScopeAction("checkins","create") ? <form onSubmit={saveDailyCheckin}>
          {field("تاريخ المتابعة",checkinDraft.entry_date,v=>setCheckinDraft(d=>({...d,entry_date:v})),{type:"date",required:true})}
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:12}}>
            {[["المزاج","mood_score"],["الطاقة","energy_score"],["الضغط النفسي","stress_score"],["جودة النوم","sleep_quality"]].map(([label,key])=><label key={key}><span style={LABEL}>{label} (1–5)</span><select style={FIELD} value={checkinDraft[key]} onChange={e=>setCheckinDraft(d=>({...d,[key]:e.target.value}))}><option value="">لم أسجل</option>{[1,2,3,4,5].map(n=><option key={n} value={n}>{n}{key==="mood_score"?({1:" — سيئ جدًا",2:" — سيئ",3:" — متوسط",4:" — جيد",5:" — جيد جدًا"})[n]:""}</option>)}</select></label>)}
            {field("مدة النوم (ساعات)",checkinDraft.sleep_hours,v=>setCheckinDraft(d=>({...d,sleep_hours:v})),{type:"number",min:"0",max:"24",step:"0.25"})}
            <label><span style={LABEL}>ملاحظة الهضم</span><select style={FIELD} value={checkinDraft.digestion_status} onChange={e=>setCheckinDraft(d=>({...d,digestion_status:e.target.value}))}><option value="">لم أسجل</option><option value="normal">طبيعي</option><option value="bloating">انتفاخ</option><option value="constipation">إمساك</option><option value="diarrhea">إسهال</option><option value="nausea">غثيان</option><option value="reflux">ارتجاع</option><option value="pain">ألم</option><option value="other">أخرى</option><option value="unknown">غير معروف</option></select></label>
            {field("شدة مشكلة الهضم (0–10)",checkinDraft.digestion_severity,v=>setCheckinDraft(d=>({...d,digestion_severity:v})),{type:"number",min:"0",max:"10",step:"1"})}
          </div>
          <label style={{display:"block",marginBottom:12}}><span style={LABEL}>ملاحظات (اختياري)</span><textarea style={{...FIELD,minHeight:76}} maxLength={3000} value={checkinDraft.notes} onChange={e=>setCheckinDraft(d=>({...d,notes:e.target.value}))}/></label>
          <button disabled={busy} style={PRIMARY}>{busy?"جارٍ الحفظ…":"حفظ اليوم"}</button>
        </form> : <p style={{fontSize:13,color:COLORS.muted}}>لا تملك صلاحية إنشاء أو تعديل المتابعة اليومية.</p>)}
        {box("السجل اليومي","يمكن حفظ سجل واحد لكل يوم وتعديله بإعادة اختيار التاريخ نفسه.",dailyCheckins.length?<div style={{display:"grid",gap:9}}>{[...dailyCheckins].sort((a,b)=>b.entry_date.localeCompare(a.entry_date)).map(row=><article key={row.id} style={{border:"1px solid "+COLORS.border,borderRadius:12,padding:12}}><div style={{display:"flex",justifyContent:"space-between",gap:10,flexWrap:"wrap"}}><strong>{row.entry_date}</strong>{hasScopeAction("checkins","delete")&&<button style={{...SECONDARY,color:COLORS.red}} disabled={busy} onClick={()=>removeDailyCheckin(row)}>حذف</button>}</div><div style={{fontSize:13,lineHeight:1.9,marginTop:6}}>{[["المزاج",row.mood_score],["الطاقة",row.energy_score],["الضغط",row.stress_score],["النوم",row.sleep_hours==null?null:Number(row.sleep_hours)+" ساعة"],["جودة النوم",row.sleep_quality],["الهضم",({normal:"طبيعي",bloating:"انتفاخ",constipation:"إمساك",diarrhea:"إسهال",nausea:"غثيان",reflux:"ارتجاع",pain:"ألم",other:"أخرى",unknown:"غير معروف"})[row.digestion_status]||row.digestion_status],["شدة الهضم",row.digestion_severity]].filter(([,v])=>v!==null&&v!==undefined&&v!=="").map(([label,value])=><span key={label} style={{display:"inline-block",marginInlineEnd:12}}><b>{label}:</b> {value}</span>)}</div>{row.notes&&<p style={{fontSize:12,color:COLORS.muted,whiteSpace:"pre-wrap"}}>{row.notes}</p>}<button style={SECONDARY} onClick={()=>{setCheckinDraft({entry_date:row.entry_date,mood_score:row.mood_score??"",energy_score:row.energy_score??"",stress_score:row.stress_score??"",sleep_hours:row.sleep_hours??"",sleep_quality:row.sleep_quality??"",digestion_status:row.digestion_status??"",digestion_severity:row.digestion_severity??"",notes:row.notes??""});window.scrollTo({top:0,behavior:"smooth"});}}>تعديل هذا اليوم</button></article>)}</div>:<p style={{fontSize:13,color:COLORS.muted}}>لا توجد متابعات بعد. يمكنك تسجيل بعض الحقول فقط وترك الباقي فارغًا.</p>)}
      </> : box("لا يوجد ملف صحي","أنشئ ملفًا صحيًا أولًا.",<button style={PRIMARY} onClick={()=>setPage?.("home")}>الرئيسية</button>))}

      {page === "factors" && (selected ? <>
        {box("إنشاء عامل أو متتبّع شخصي","أمثلة: صداع، حساسية للضوء، التعرض للتوتر، أو شدة التعب. سجّل فقط ما تريده؛ لا يستنتج النظام علاقات سببية تلقائيًا.", (hasScopeAction("trackers","create")||hasScopeAction("sensitive_trackers","create")) ? <form onSubmit={addFactor}>
          {field("اسم المتتبّع",factorDraft.name,v=>setFactorDraft(d=>({...d,name:v})),{required:true,maxLength:120})}
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:12}}>
            <label><span style={LABEL}>التصنيف</span><select style={FIELD} value={factorDraft.category} onChange={e=>setFactorDraft(d=>({...d,category:e.target.value}))}><option value="general">عام</option><option value="mood">المزاج</option><option value="sleep">النوم</option><option value="digestion">الهضم</option><option value="environment">البيئة</option><option value="symptom">أعراض</option><option value="other">أخرى</option></select></label>
            <label><span style={LABEL}>نوع القيمة</span><select style={FIELD} value={factorDraft.value_type} onChange={e=>setFactorDraft(d=>({...d,value_type:e.target.value}))}><option value="scale">مقياس رقمي محدود</option><option value="number">رقم</option><option value="boolean">نعم / لا</option><option value="text">نص قصير/ملاحظة</option><option value="choice">اختيار من قائمة</option></select></label>
            {factorDraft.value_type!=="boolean"&&factorDraft.value_type!=="text"&&factorDraft.value_type!=="choice"&&field("الوحدة (اختياري)",factorDraft.unit,v=>setFactorDraft(d=>({...d,unit:v})),{maxLength:32,placeholder:"مثال: درجة"})}
          </div>
          {factorDraft.value_type==="scale"&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:12}}>{field("أقل قيمة",factorDraft.scale_min,v=>setFactorDraft(d=>({...d,scale_min:v})),{type:"number",step:"any",required:true})}{field("أعلى قيمة",factorDraft.scale_max,v=>setFactorDraft(d=>({...d,scale_max:v})),{type:"number",step:"any",required:true})}</div>}
          {factorDraft.value_type==="choice"&&field("الخيارات مفصولة بفواصل",factorDraft.choice_options,v=>setFactorDraft(d=>({...d,choice_options:v})),{required:true,maxLength:1000,placeholder:"منخفض، متوسط، مرتفع"})}
          <label style={{display:"flex",alignItems:"center",gap:8,margin:"6px 0 14px",fontSize:13}}><input type="checkbox" checked={factorDraft.is_sensitive} onChange={e=>setFactorDraft(d=>({...d,is_sensitive:e.target.checked}))}/> متتبّع حساس: يتطلب نطاق تفويض منفصلًا للمشاركة</label>
          <button disabled={busy} style={PRIMARY}>{busy?"جارٍ الحفظ…":"إنشاء المتتبّع"}</button>
        </form>:<p style={{fontSize:13,color:COLORS.muted}}>لا تملك صلاحية إنشاء متتبّع بهذا النطاق.</p>)}
        {box("المتتبّعات","أرشفة المتتبّع تحفظ قراءاته القديمة وتمنع إضافة قراءات جديدة. لا يتم تسجيل الطعام أو التمرين هنا.",factors.length?<div style={{display:"grid",gap:12}}>{[...factors].sort((a,b)=>(a.status==="active"?0:1)-(b.status==="active"?0:1)).map(factor=>{
          const logs=factorLogs.filter(x=>x.factor_id===factor.id).sort((a,b)=>new Date(b.recorded_at)-new Date(a.recorded_at));
          const scope=factor.is_sensitive?"sensitive_trackers":"trackers";
          const valueLabel=log=>factor.value_type==="boolean"?(log.value_boolean?"نعم":"لا"):factor.value_type==="text"?log.value_text:factor.value_type==="choice"?log.value_choice:[log.value_numeric,factor.unit].filter(x=>x!==null&&x!==undefined&&x!=="").join(" ");
          return <article key={factor.id} style={{border:"1px solid "+COLORS.border,borderRadius:13,padding:13}}>
            <div style={{display:"flex",justifyContent:"space-between",gap:10,flexWrap:"wrap"}}><div><strong>{factor.name}</strong><div style={{fontSize:12,color:COLORS.muted,marginTop:4}}>{({general:"عام",mood:"المزاج",sleep:"النوم",digestion:"الهضم",environment:"البيئة",symptom:"أعراض",other:"أخرى"})[factor.category]||factor.category} · {factor.is_sensitive?"حساس":"عادي"} · {factor.status==="active"?"نشط":"مؤرشف"}</div></div>{hasScopeAction(scope,"update")&&<button style={SECONDARY} disabled={busy} onClick={()=>toggleFactorArchive(factor)}>{factor.status==="active"?"أرشفة":"إعادة تفعيل"}</button>}</div>
            {factor.status==="active"&&hasScopeAction(scope,"create")&&(factorLogDraft.factor_id===factor.id?<form onSubmit={saveFactorLog} style={{background:COLORS.bg,borderRadius:10,padding:12,marginTop:12}}>
              {field("وقت القراءة",factorLogDraft.recorded_at,v=>setFactorLogDraft(d=>({...d,recorded_at:v})),{type:"datetime-local",required:true})}
              {factor.value_type==="boolean"?<label style={{display:"block",marginBottom:12}}><span style={LABEL}>القيمة</span><select style={FIELD} value={factorLogDraft.value} onChange={e=>setFactorLogDraft(d=>({...d,value:e.target.value}))} required><option value="">اختر</option><option value="true">نعم</option><option value="false">لا</option></select></label>:factor.value_type==="choice"?<label style={{display:"block",marginBottom:12}}><span style={LABEL}>القيمة</span><select style={FIELD} value={factorLogDraft.value} onChange={e=>setFactorLogDraft(d=>({...d,value:e.target.value}))} required><option value="">اختر</option>{(factor.choice_options||[]).map(x=><option key={x} value={x}>{x}</option>)}</select></label>:field("القيمة",factorLogDraft.value,v=>setFactorLogDraft(d=>({...d,value:v})),{required:true,type:factor.value_type==="scale"||factor.value_type==="number"?"number":"text",min:factor.value_type==="scale"?factor.scale_min:undefined,max:factor.value_type==="scale"?factor.scale_max:undefined,step:"any",maxLength:3000})}
              {field("ملاحظة اختيارية",factorLogDraft.notes,v=>setFactorLogDraft(d=>({...d,notes:v})),{maxLength:2000})}
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}><button style={PRIMARY} disabled={busy}>{factorLogDraft.id?"حفظ التعديل":"حفظ القراءة"}</button><button type="button" style={SECONDARY} onClick={()=>setFactorLogDraft({id:"",factor_id:"",recorded_at:new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16),value:"",notes:""})}>إلغاء</button></div>
            </form>:<button style={{...SECONDARY,marginTop:12}} onClick={()=>setFactorLogDraft({id:"",factor_id:factor.id,recorded_at:new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16),value:"",notes:""})}>إضافة قراءة</button>)}
            {logs.length>0&&<div style={{display:"grid",gap:7,marginTop:12}}>{logs.map(log=><div key={log.id} style={{borderTop:"1px solid "+COLORS.border,paddingTop:8,display:"flex",justifyContent:"space-between",gap:10,flexWrap:"wrap"}}><div><strong style={{fontSize:13}}>{valueLabel(log)||"—"}</strong><div style={{fontSize:11,color:COLORS.muted}}>{fmtDate(log.recorded_at)}{log.notes?" · "+log.notes:""}</div></div><div style={{display:"flex",gap:6}}>{hasScopeAction(scope,"update")&&<button style={SECONDARY} onClick={()=>editFactorLog(log,factor)}>تعديل</button>}{hasScopeAction(scope,"delete")&&<button style={{...SECONDARY,color:COLORS.red}} disabled={busy} onClick={()=>removeFactorLog(log,factor)}>حذف</button>}</div></div>)}</div>}
          </article>;
        })}</div>:<p style={{fontSize:13,color:COLORS.muted}}>لم تنشئ متتبّعات بعد.</p>)}
      </> : box("لا يوجد ملف صحي","أنشئ ملفًا صحيًا أولًا.",<button style={PRIMARY} onClick={()=>setPage?.("home")}>الرئيسية</button>))}

      {page === "cycle_tracking" && (selected ? (isOwner&&selected.cycle_tracking_enabled ? <>
        {box("سجل الدورة الاختياري","هذه الوحدة معطلة افتراضيًا وخاصة بمالك الملف فقط. لا توجد تنبؤات أو حسابات خصوبة أو استنتاجات طبية.",<form onSubmit={saveCycleEntry}>
          {field("تاريخ السجل",cycleDraft.entry_date,v=>setCycleDraft(d=>({...d,entry_date:v})),{type:"date",required:true})}
          <label style={{display:"block",marginBottom:12}}><span style={LABEL}>شدة التدفق</span><select style={FIELD} value={cycleDraft.flow_intensity} onChange={e=>setCycleDraft(d=>({...d,flow_intensity:e.target.value}))}><option value="unknown">غير محدد</option><option value="none">لا يوجد</option><option value="spotting">تنقيط</option><option value="light">خفيف</option><option value="medium">متوسط</option><option value="heavy">غزير</option></select></label>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:12}}>{field("بداية الفترة (اختياري)",cycleDraft.period_start,v=>setCycleDraft(d=>({...d,period_start:v})),{type:"date"})}{field("نهاية الفترة (اختياري)",cycleDraft.period_end,v=>setCycleDraft(d=>({...d,period_end:v})),{type:"date"})}</div>
          <label style={{display:"block",marginBottom:12}}><span style={LABEL}>أعراض تودين تسجيلها (اختياري)</span><textarea style={{...FIELD,minHeight:64}} maxLength={2000} value={cycleDraft.symptoms} onChange={e=>setCycleDraft(d=>({...d,symptoms:e.target.value}))}/></label>
          <label style={{display:"block",marginBottom:12}}><span style={LABEL}>ملاحظات (اختياري)</span><textarea style={{...FIELD,minHeight:64}} maxLength={2000} value={cycleDraft.notes} onChange={e=>setCycleDraft(d=>({...d,notes:e.target.value}))}/></label>
          <button style={PRIMARY} disabled={busy}>حفظ سجل اليوم</button>
        </form>)}
        {box("السجلات السابقة","تعطيل الوحدة يخفي هذه البيانات ويمنع الوصول إليها حتى إعادة التفعيل، لكنه لا يحذفها.",cycleEntries.length?<div style={{display:"grid",gap:8}}>{[...cycleEntries].sort((a,b)=>b.entry_date.localeCompare(a.entry_date)).map(row=><article key={row.id} style={{border:"1px solid "+COLORS.border,borderRadius:10,padding:12}}><div style={{display:"flex",justifyContent:"space-between",gap:10,flexWrap:"wrap"}}><strong>{row.entry_date}</strong><span style={{fontSize:12,color:COLORS.muted}}>{({none:"لا يوجد",spotting:"تنقيط",light:"خفيف",medium:"متوسط",heavy:"غزير",unknown:"غير محدد"})[row.flow_intensity]||row.flow_intensity}</span></div>{row.period_start&&<div style={{fontSize:12,marginTop:5}}>بداية الفترة: {row.period_start}{row.period_end?" · النهاية: "+row.period_end:""}</div>}{row.symptoms&&<p style={{fontSize:12,whiteSpace:"pre-wrap"}}>{row.symptoms}</p>}{row.notes&&<p style={{fontSize:12,color:COLORS.muted,whiteSpace:"pre-wrap"}}>{row.notes}</p>}<button style={{...SECONDARY,color:COLORS.red}} disabled={busy} onClick={()=>removeCycleEntry(row)}>حذف</button></article>)}</div>:<p style={{fontSize:13,color:COLORS.muted}}>لا توجد سجلات حتى الآن.</p>)}
      </> : box("الوحدة غير مفعلة","سجل الدورة اختياري ومعطل افتراضيًا. يمكنك تفعيله من إعدادات الخصوصية إذا كان هذا ملفك الشخصي.",<button style={PRIMARY} onClick={()=>setPage?.("settings")}>إعدادات الخصوصية</button>)) : box("لا يوجد ملف صحي","أنشئ ملفًا صحيًا أولًا.",<button style={PRIMARY} onClick={()=>setPage?.("home")}>الرئيسية</button>))}

        {selected && isOwner && box("الوحدات الحساسة الاختيارية", "متابعة الدورة معطلة افتراضيًا. عند تعطيلها، لا يمكن قراءة سجلاتها أو إضافتها حتى إعادة التفعيل؛ لا تُحذف السجلات تلقائيًا. لا تتم مشاركة هذه الوحدة مع المفوضين.", <label style={{display:"flex",alignItems:"center",gap:10,fontSize:14}}><input type="checkbox" checked={!!selected.cycle_tracking_enabled} disabled={busy} onChange={e=>toggleCycleTracking(e.target.checked)}/><span><strong>تفعيل سجل الدورة</strong><div style={{fontSize:12,color:COLORS.muted,marginTop:4}}>خاص بمالك الملف فقط؛ دون توقعات أو حساب خصوبة.</div></span></label>)}
      {page === "reports" && (selected ? <HealthAnalytics profile={selected} checkins={dailyCheckins} factors={factors} factorLogs={factorLogs} symptomLogs={symptomLogs} flareEvents={flareEvents} canRead={hasScopeAction} /> : box("لا يوجد ملف صحي","أنشئ ملفًا صحيًا أولًا.",<button style={PRIMARY} onClick={()=>setPage?.("home")}>الرئيسية</button>))}
      {page === "visit_summary" && (selected ? <HealthVisitSummary profile={selected} conditions={conditions} allergies={allergies} symptomLogs={symptomLogs} medications={medications} medicationVersions={medicationVersions} sideEffects={sideEffects} flareEvents={flareEvents} checkins={dailyCheckins} factors={factors} factorLogs={factorLogs} measurements={measurements} canRead={hasScopeAction} /> : box("لا يوجد ملف صحي","أنشئ ملفًا صحيًا أولًا.",<button style={PRIMARY} onClick={()=>setPage?.("home")}>الرئيسية</button>))}
      {page === "settings" && <>
        {box("الخصوصية والأمان", "البيانات الصحية لا تستخدم صلاحيات مساحة العمل. كل ملف يملك مالكًا واحدًا، والتفويضات محددة النطاق وقابلة للإلغاء.", <ul style={{ margin: 0, paddingInlineStart: 20, lineHeight: 2, fontSize: 13 }}><li>المالك فقط يستطيع إنشاء ملف وتعديل إعداداته ومنح الصلاحيات.</li><li>لا توجد صلاحيات للزوار المجهولين.</li><li>الوثائق مخزنة في bucket خاص وليس عامًا.</li><li>لا نضع تفاصيل طبية داخل بيانات مساحة العمل أو سجلات التدقيق.</li><li>إلغاء التفويض يغيّر صلاحية الخادم، وليس شكل الواجهة فقط.</li></ul>)}
        {selected && isOwner && box("آخر أحداث التدقيق", "سجل تشغيلي لا يُفترض أن يحتوي على أعراض أو ملاحظات طبية أو تفاصيل تشخيصية.", auditEvents.length ? <div>{auditEvents.map(ev=><div key={ev.id} style={{ padding: "10px 0", borderBottom: "1px solid "+COLORS.border, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", fontSize: 12 }}><span>{ev.action} · {ev.resource_type}</span><span style={{ color: COLORS.muted }}>{fmtDate(ev.created_at)}</span></div>)}</div> : <div style={{ color: COLORS.muted, fontSize: 13 }}>لا توجد أحداث بعد أو لا توجد أحداث قابلة للعرض.</div>)}
      </>}
    </>}
    <footer style={{ color: COLORS.muted, fontSize: 11, lineHeight: 1.8, padding: "8px 4px 20px" }}>Health OS يسجّل المعلومات التي تدخلها ولا يقدّم تشخيصًا أو توصية علاجية. المتابعة اليومية لا تكرر سجلات الطعام أو الماء أو الرياضة، ووحدة الدورة اختيارية ومعطلة افتراضيًا. لا توجد إشعارات خلفية في هذه المرحلة.</footer>
  </div>;
}
