import React, { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../core/supabase.js";
import { healthRepository } from "./repository.js";

const COLORS = { ink: "#182230", muted: "#64748B", border: "#E2E8F0", blue: "#0EA5E9", bg: "#F8FAFC", green: "#047857", red: "#B91C1C" };
const CARD = { background: "#fff", border: "1px solid " + COLORS.border, borderRadius: 16, padding: 20, boxShadow: "0 4px 14px rgba(15,23,42,.035)" };
const FIELD = { width: "100%", boxSizing: "border-box", padding: "11px 12px", border: "1px solid #CBD5E1", borderRadius: 10, background: "#fff", color: COLORS.ink, fontSize: 14 };
const LABEL = { display: "block", fontSize: 12, color: COLORS.muted, marginBottom: 6, fontWeight: 700 };
const PRIMARY = { border: 0, borderRadius: 10, padding: "11px 15px", background: COLORS.blue, color: "#fff", fontWeight: 800, cursor: "pointer" };
const SECONDARY = { border: "1px solid #CBD5E1", borderRadius: 10, padding: "10px 13px", background: "#fff", color: COLORS.ink, fontWeight: 700, cursor: "pointer" };
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SCOPE_OPTIONS = [
  ["symptoms", "الأعراض"], ["flare_events", "نوبات التهيّج"], ["medications", "الأدوية والعلاجات"],
  ["measurements", "القياسات"], ["conditions", "الحالات الطبية"], ["documents", "الوثائق الطبية"], ["reports", "التقارير"]
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

  const selected = useMemo(() => profiles.find(p => p.id === selectedId) || profiles[0] || null, [profiles, selectedId]);
  const isOwner = !!selected && (isDemo || selected.owner_user_id === userId);

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
      setProfiles(rows => rows.map(p => p.id === selected.id ? updated : p));
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

  const box = (title, description, children) => <section style={{ ...CARD, marginBottom: 16 }}><h2 style={{ margin: "0 0 7px", fontSize: 17, color: COLORS.ink }}>{title}</h2>{description && <p style={{ margin: "0 0 16px", color: COLORS.muted, fontSize: 13, lineHeight: 1.8 }}>{description}</p>}{children}</section>;
  const field = (label, value, onChange, extra = {}) => <label style={{ display: "block", marginBottom: 13 }}><span style={LABEL}>{label}</span><input style={FIELD} value={value} onChange={e => onChange(e.target.value)} {...extra} /></label>;
  const pageTitle = ({ home: "نظرة عامة", profile: "الملف الصحي", access: "المشاركة والتفويض", documents: "الوثائق الطبية", settings: "الإعدادات والخصوصية" })[page] || "نظرة عامة";

  return <div dir="rtl" style={{ maxWidth: 1050, margin: "0 auto", color: COLORS.ink }}>
    <header style={{ ...CARD, marginBottom: 16, background: "linear-gradient(130deg,#FFFFFF,#F0F9FF)" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div style={{ minWidth: 220, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 8 }}><span style={{ fontSize: 26 }}>🩺</span><span style={{ fontSize: 11, fontWeight: 900, color: COLORS.blue }}>HEALTH & WELLNESS OS · H1</span></div>
          <h1 style={{ margin: "0 0 8px", fontSize: 25 }}>الصحة والعافية</h1>
          <p style={{ margin: 0, color: COLORS.muted, fontSize: 13, lineHeight: 1.9 }}>ملف صحي خاص، مع صلاحيات مشاركة صريحة وقابلة للإلغاء. لا تُشارك البيانات تلقائيًا مع مساحة العمل أو أي نظام آخر.</p>
        </div>
        <div style={{ border: "1px solid #BAE6FD", background: "#F0F9FF", borderRadius: 12, padding: "10px 13px", fontSize: 12, color: "#075985", maxWidth: 240 }}>
          <strong>الخصوصية أولًا</strong><div style={{ marginTop: 4, lineHeight: 1.7 }}>المرحلة الحالية تجهّز الملف والوصول فقط؛ لا تُعد تشخيصًا أو بديلًا للرعاية الطبية.</div>
        </div>
      </div>
      <nav style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 18 }}>
        {[["home","الرئيسية"],["profile","الملف الصحي"],["access","المشاركة"],["documents","الوثائق"],["settings","الخصوصية"]].map(([id,label]) => <button key={id} style={page===id?PRIMARY:SECONDARY} onClick={() => setPage?.(id)}>{label}</button>)}
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
        {selected && box("حالة المرحلة", "هذه هي النواة الآمنة. المتتبعات الطبية والأدوية والتحاليل ستُضاف في مراحل لاحقة بعد اجتياز اختبارات الخصوصية.", <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10 }}>
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
      {page === "documents" && box("الوثائق الطبية", "تم إنشاء مخزن خاص بسياسات وصول على مستوى الملف الصحي. واجهة رفع/معاينة/تنزيل الوثائق ستُبنى في مرحلة السجلات الطبية، بعد اختبار سياسات Storage بحسابين.", <div style={{ border: "1px solid #BAE6FD", background: "#F0F9FF", borderRadius: 10, padding: 12, color: "#075985", fontSize: 13 }}>لا ترفع وثائق حقيقية في هذه المرحلة. لم يتم تفعيل واجهة رفع الملفات بعد.</div>)}
      {page === "settings" && <>
        {box("الخصوصية والأمان", "البيانات الصحية لا تستخدم صلاحيات مساحة العمل. كل ملف يملك مالكًا واحدًا، والتفويضات محددة النطاق وقابلة للإلغاء.", <ul style={{ margin: 0, paddingInlineStart: 20, lineHeight: 2, fontSize: 13 }}><li>المالك فقط يستطيع إنشاء ملف وتعديل إعداداته ومنح الصلاحيات.</li><li>لا توجد صلاحيات للزوار المجهولين.</li><li>الوثائق مخزنة في bucket خاص وليس عامًا.</li><li>لا نضع تفاصيل طبية داخل بيانات مساحة العمل أو سجلات التدقيق.</li><li>إلغاء التفويض يغيّر صلاحية الخادم، وليس شكل الواجهة فقط.</li></ul>)}
        {selected && isOwner && box("آخر أحداث التدقيق", "سجل تشغيلي لا يُفترض أن يحتوي على أعراض أو ملاحظات طبية أو تفاصيل تشخيصية.", auditEvents.length ? <div>{auditEvents.map(ev=><div key={ev.id} style={{ padding: "10px 0", borderBottom: "1px solid "+COLORS.border, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", fontSize: 12 }}><span>{ev.action} · {ev.resource_type}</span><span style={{ color: COLORS.muted }}>{fmtDate(ev.created_at)}</span></div>)}</div> : <div style={{ color: COLORS.muted, fontSize: 13 }}>لا توجد أحداث بعد أو لا توجد أحداث قابلة للعرض.</div>)}
      </>}
    </>}
    <footer style={{ color: COLORS.muted, fontSize: 11, lineHeight: 1.8, padding: "8px 4px 20px" }}>H1 لا يقدّم تشخيصًا أو توصية علاجية. لا تُدخل بيانات طبية حقيقية قبل اجتياز اختبارات الخصوصية والاستعادة.</footer>
  </div>;
}
