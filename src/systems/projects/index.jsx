import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AccessDenied } from "../../core/ui.jsx";
import { osSectionLevel } from "../../core/core.js";
import { Tabs, Skeleton, ErrorState, Chip } from "../../core/kit.jsx";
import { todayStr } from "../../core/dates.js";
import { ProjectsProvider, useP, Ctx } from "./store.jsx";
import { TaskSheet, TimerBar } from "./parts.jsx";
import { Dashboard, Today, Week, Tasks, MyWork, Portfolio } from "./screens_a.jsx";
import { Projects } from "./screens_b.jsx";
import { OutputsView, RisksView, IssuesView, DecisionsView, PrdsView, DiscoveryView } from "./entities.jsx";
import { Okrs, Updates, Wins, Reviews, Contacts, Team, Templates, Meetings, Settings } from "./screens_c.jsx";
import { buildSeed } from "./demo.js";
import { loadDurableOSEvents, subscribeDurableOSEvents } from "../integrationEvents.js";
import MasterplanWizard from "./masterplanWizard.jsx";

function GovernancePage() {
  const { page } = useP();
  const initialTab = page === "issues" ? "issues" : page === "decisions" ? "decisions" : "risks";
  const [tab, setTab] = useState(initialTab);
  useEffect(() => {
    if (page === "issues") setTab("issues");
    else if (page === "decisions") setTab("decisions");
    else if (page === "risks") setTab("risks");
  }, [page]);
  const { data, setPage } = useP();
  const tabs = [
    { id: "risks", label: "المخاطر", count: data.risks.length },
    { id: "issues", label: "المشاكل", count: data.issues.length },
    { id: "decisions", label: "القرارات", count: data.decisions.length },
  ];
  const selectTab = (next) => {
    setTab(next);
    setPage(next === "risks" ? "risks" : next);
  };
  return <div>
    <div style={{ fontSize: 21, fontWeight: 700, marginBottom: 12 }}>مركز الحوكمة</div>
    <Tabs value={tab} onChange={selectTab} tabs={tabs} />
    {tab === "risks" && <RisksView />}
    {tab === "issues" && <IssuesView />}
    {tab === "decisions" && <DecisionsView />}
  </div>;
}

const SCREENS = { dashboard: Dashboard, today: Today, week: Week, myWork: MyWork, portfolio: Portfolio, projects: Projects, tasks: Tasks, issues: GovernancePage, discovery: DiscoveryView, prds: PrdsView, okrs: Okrs, outputs: OutputsView, risks: GovernancePage, decisions: GovernancePage, meetings: Meetings, updates: Updates, wins: Wins, reviews: Reviews, contacts: Contacts, team: Team, templates: Templates, settings: Settings, masterplanImport: MasterplanWizard };

function ProjectsDurableEventBridge({ ws, isDemo, children }) {
  const ctx = useP();
  const [events, setEvents] = useState([]);
  useEffect(() => {
    if (isDemo || !ws?.id) { setEvents([]); return; }
    let active = true;
    const mergeEvent = (event) => {
      const key = event?.idempotencyKey || event?.id;
      if (!key) return;
      setEvents((current) => [event, ...current.filter((item) => (item.idempotencyKey || item.id) !== key)].slice(0, 100));
    };
    const unsubscribe = subscribeDurableOSEvents(ws.id, "hobbies", mergeEvent);
    loadDurableOSEvents(ws.id, "hobbies", 100).then((result) => {
      if (!active || !result?.ok) return;
      setEvents((current) => {
        const byKey = new Map((result.events || []).map((event) => [event.idempotencyKey || event.id, event]));
        current.forEach((event) => byKey.set(event.idempotencyKey || event.id, event));
        return [...byKey.values()].slice(-100);
      });
    });
    return () => { active = false; unsubscribe(); };
  }, [ws?.id, isDemo]);
  return <Ctx.Provider value={{ ...ctx, durableOSEvents: events }}>{children}</Ctx.Provider>;
}

function OfflineQueuePanel(){
  const { queueItems=[], isDemo, idx, projectsById, nameOf, discardQueuedWrite, rebaseQueuedWrite, store, toast } = useP();
  if(isDemo || !queueItems.length) return null;
  const conflicts=queueItems.filter(item=>item.conflict);
  const fields=[
    ["title","العنوان"],["description","الوصف"],["priority","الأولوية"],
    ["due_date","تاريخ الاستحقاق"],["assignee_id","المسؤول"],["planning_bucket","قائمة التخطيط"]
  ];
  const fieldValue=(key,value)=>{
    if(key==="assignee_id") return value ? nameOf(value) : "غير مسند";
    if(value===null||value===undefined||value==="") return "—";
    return String(value);
  };
  const discard=async(item)=>{
    discardQueuedWrite(item.coll,item.rec.id);
    await store.api.reload();
    toast("تم تجاهل التعديل المحلي والعودة إلى آخر نسخة من الخادم.");
  };
  const rebase=async(item)=>{
    const result=rebaseQueuedWrite(item.coll,item.rec.id);
    if(!result.ok){
      if(result.reason==="overlapping-edits"){
        const labels=result.conflictingFields.map(key=>fields.find(([field])=>field===key)?.[1]||key);
        toast("تعذر الدمج التلقائي لأن الطرفين عدّلا: "+labels.join("، ")+". افتح المهمة واحسم هذه الحقول يدويًا.");
      }else{
        toast("لا يمكن إعادة دمج هذا التعديل: "+(item.conflictReason==="deleted-on-server"?"السجل حُذف على الخادم.":item.conflictReason==="missing-on-server"?"السجل لم يعد موجودًا على الخادم.":"تعذر جلب النسخة الحالية."));
      }
      return;
    }
    await store.api.flushQueue();
    toast("تم دمج الحقول غير المتعارضة مع آخر نسخة للخادم وإعادة محاولة الحفظ.");
  };
  return <section role="region" aria-label="حالة مزامنة التعديلات المحلية" style={{border:"1px solid "+(conflicts.length?"#D97706":"#CBD5E1"),background:conflicts.length?"#FFFBEB":"#F8FAFC",borderRadius:10,padding:12,marginBottom:12,display:"grid",gap:9}}>
    <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
      <b style={{fontSize:12.5,color:conflicts.length?"#92400E":"#334155"}}>مزامنة التعديلات المحلية</b>
      <span style={{fontSize:11,color:"#64748B"}}>{queueItems.length} تعديل · {conflicts.length} تعارض</span>
      <span style={{flex:1}}/>
      <button type="button" onClick={()=>store.api.flushQueue()} disabled={!store?.online} style={{border:"1px solid #CBD5E1",background:"#fff",borderRadius:7,padding:"5px 9px",fontSize:11,cursor:store?.online?"pointer":"not-allowed"}}>إعادة المحاولة</button>
    </div>
    {queueItems.map(item=>{
      const task=idx.byId[item.rec.id];
      const changed=fields.filter(([key])=>item.baseRec&&JSON.stringify(item.baseRec[key])!==JSON.stringify(item.rec[key]));
      const title=task?.title||item.rec.title||"مهمة";
      return <article key={item.coll+":"+item.rec.id} style={{borderTop:"1px solid "+(conflicts.length?"#F3D49A":"#E2E8F0"),paddingTop:8,display:"grid",gap:6}}>
        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
          <b style={{fontSize:12,flex:1}}>{title}</b>
          <span style={{fontSize:10.5,color:item.conflict?"#B45309":"#64748B"}}>{item.conflict?"تعارض نسخة":"بانتظار الاتصال/المزامنة"}</span>
          {task?.project_id&&<span style={{fontSize:10.5,color:"#64748B"}}>{projectsById[task.project_id]?.name||"مشروع"}</span>}
        </div>
        {item.conflict ? <>
          <div style={{fontSize:11,color:"#92400E",lineHeight:1.8}}>
            {item.conflictReason==="deleted-on-server"?"تم حذف المهمة على الخادم بعد حفظ تعديلك محليًا. لا يمكن دمج التعديل تلقائيًا.":
             item.conflictReason==="missing-on-server"?"المهمة لم تعد موجودة على الخادم. احتفظ بنسخة من التعديل أو تجاهله.":
             item.conflictReason==="server-read-failed"?"تعذر جلب آخر نسخة من الخادم؛ لن نعيد الكتابة فوقها.":
             "تغيّرت نسخة المهمة على الخادم بعد بدء تعديلك دون اتصال. قارن القيم قبل الدمج."}
          </div>
          {item.serverRec&&changed.length>0&&<div style={{display:"grid",gap:5}}>
            {changed.map(([key,label])=><div key={key} style={{display:"grid",gridTemplateColumns:"minmax(90px,0.5fr) repeat(2,minmax(0,1fr))",gap:6,fontSize:10.5}}>
              <b>{label}</b>
              <span style={{color:"#64748B",overflowWrap:"anywhere"}}>الخادم: {fieldValue(key,item.serverRec[key])}</span>
              <span style={{color:"#92400E",overflowWrap:"anywhere"}}>تعديلك: {fieldValue(key,item.rec[key])}</span>
            </div>)}
          </div>}
          <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
            <button type="button" onClick={()=>rebase(item)} disabled={!item.serverRec||!!item.serverRec._deleted||!!item.serverRec.deleted_at||!store?.online} style={{border:0,background:"#92400E",color:"#fff",borderRadius:7,padding:"6px 10px",fontSize:11,cursor:"pointer"}}>دمج الحقول غير المتعارضة</button>
            <button type="button" onClick={()=>discard(item)} style={{border:"1px solid #D6A35D",background:"#fff",color:"#92400E",borderRadius:7,padding:"6px 10px",fontSize:11,cursor:"pointer"}}>استخدام نسخة الخادم / تجاهل المحلي</button>
            <button type="button" onClick={()=>{store.api.reload();}} style={{border:"1px solid #CBD5E1",background:"#fff",borderRadius:7,padding:"6px 10px",fontSize:11,cursor:"pointer"}}>تحديث السجل</button>
          </div>
        </> : <div style={{fontSize:11,color:"#64748B"}}>{changed.map(([key,label])=>label).join("، ")||"تعديل مهمة"} محفوظ على هذا الجهاز فقط حتى الآن.</div>}
      </article>;
    })}
    <div style={{fontSize:10.5,color:"#64748B"}}>Offline في Projects يسمح بتعديلات حقول أساسية لمهمة موجودة فقط. الإنشاء والعلاقات والنقل والملفات والعمليات الذرية تحتاج اتصالًا. لا يتم استبدال حقل متعارض تلقائيًا.</div>
  </section>;
}

function Router({ sourceWriteRequest, routeContext }) {
  const ctx = useP(); const { page, ready, error, store, access, role, shell, ws, A, data, openProject, openTask } = ctx; const lvl = osSectionLevel(access, page);
  const lastHandledRouteContext = useRef(null);
  useEffect(() => {
    if (!routeContext || !ready) return;
    const signature = JSON.stringify(routeContext);
    if (lastHandledRouteContext.current === signature) return;
    lastHandledRouteContext.current = signature;
    const projectId = routeContext.projectId ? String(routeContext.projectId) : "";
    const taskId = routeContext.taskId ? String(routeContext.taskId) : "";
    const recordId = routeContext.recordId ? String(routeContext.recordId) : "";
    const tab = String(routeContext.tab || "overview");
    const allowedTabs = new Set(["overview","tasks","milestones","prds","outputs","risks","issues","decisions","discovery","meetings","finance","timeline"]);
    if (projectId && ctx.projectsById[projectId]) {
      const focusRecord = recordId && routeContext.recordKind ? { kind: String(routeContext.recordKind), id: recordId } : null;
      openProject(projectId, allowedTabs.has(tab) ? tab : "overview", focusRecord);
      if (taskId) openTask(taskId);
      return;
    }
    if (taskId && ctx.idx.byId[taskId]) {
      const task = ctx.idx.byId[taskId];
      openProject(task.project_id, "tasks");
      openTask(taskId);
    }
  }, [routeContext, ready, ctx.projectsById, ctx.idx, openProject, openTask]);
  // sections hidden for Viewers (plan §13.2) are removed from the shell menu
  useEffect(() => {
    if (!shell || !shell.publish) return;
    const visible = Object.keys(SCREENS).filter((k) => k !== "masterplanImport" && !(role === "Viewer" && ["reviews", "contacts"].includes(k)));
    const groups = [
      { id: "today", label: "مساحة اليوم", items: [
        { id: "dashboard", label: "الرئيسية", icon: "⌂" },
        { id: "today", label: "اليوم", icon: "☀" },
        { id: "myWork", label: "مهامي", icon: "✓" },
        { id: "week", label: "هذا الأسبوع", icon: "🗓️" },
      ]},
      { id: "portfolio", label: "محفظة المشاريع", items: [
        { id: "projects", label: "المشاريع", icon: "📁" },
        { id: "portfolio", label: "محفظة المشاريع", icon: "▦" },
      ]},
      { id: "planning", label: "التخطيط", items: [
        { id: "discovery", label: "الاكتشاف", icon: "↘" },
        { id: "prds", label: "المواصفات", icon: "▤" },
        { id: "okrs", label: "الأهداف (OKR)", icon: "🎯" },
      ]},
      { id: "execution", label: "التنفيذ", items: [
        { id: "tasks", label: "المهام", icon: "☑" },
        { id: "outputs", label: "المخرجات", icon: "📦" },
      ]},
      { id: "governance", label: "الحوكمة", items: [
        { id: "risks", label: "مركز الحوكمة", icon: "⚖" },
      ]},
      { id: "collaboration", label: "التعاون والمعرفة", items: [
        { id: "meetings", label: "الاجتماعات", icon: "👥" },
        { id: "team", label: "الفريق", icon: "👥" },
        { id: "contacts", label: "جهات الاتصال", icon: "👤" },
      ]},
      { id: "results", label: "النتائج والتقارير", items: [
        { id: "wins", label: "الإنجازات", icon: "🏆" },
        { id: "updates", label: "التحديثات", icon: "↗" },
        { id: "reviews", label: "المراجعات الأسبوعية", icon: "↻" },
      ]},
      { id: "admin", label: "الإدارة", items: [
        { id: "templates", label: "القوالب", icon: "◇" },
        { id: "settings", label: "الإعدادات", icon: "⚙" },
      ]},
    ].map(group => ({ ...group, items: group.items.filter(item => visible.includes(item.id)) })).filter(group => group.items.length);
    shell.publish("projects", { visible, navGroups: groups });
  }, [role]);
  const processedVenturesRiskWrites = useRef(new Set());
  const handleVenturesRisk = useCallback(async (d) => {
    if (!(d?.source === "ventures" && d.systemId === "projects" && d.action === "create_risk")) return;
    const publishResult = (detail) => window.dispatchEvent(new CustomEvent("os:source-write-result", { detail: { workspaceId: ws?.id || null, systemId: "projects", source: "ventures", ...detail } }));
    if (d.workspaceId && String(d.workspaceId) !== String(ws?.id)) return;
    const payload = d.payload || {};
    const project = ctx.projectsById?.[payload.project_id];
    if (!project) { publishResult({ action: d.action, recordId: d.recordId || null, ok: false, error: "المشروع المرتبط بفحص البريد غير موجود أو غير متاح." }); return; }
    if (osSectionLevel(access, "risks") !== "edit" || !ctx.can("risk.write", project)) { publishResult({ action: d.action, recordId: d.recordId || null, ok: false, error: "لا تملك صلاحية إنشاء مخاطر في هذا المشروع." }); return; }
    const requestKey = String(d.recordId || payload.source_record_id || payload.id || "");
    if (requestKey && processedVenturesRiskWrites.current.has(requestKey)) {
      publishResult({ action: d.action, recordId: d.recordId || requestKey, ok: true });
      return;
    }
    if (requestKey) processedVenturesRiskWrites.current.add(requestKey);
    const existing = (ctx.data.risks || []).find((item) => item.source === "ventures_email" && String(item.source_record_id) === String(payload.source_record_id));
    const risk = { ...payload, ...(existing?.id ? { id: existing.id } : { id: undefined }), project_id: project.id, source_record_id: payload.source_record_id };
    try {
      const saved = await A.saveRisk(risk);
      publishResult({ action: d.action, recordId: saved.id, requestRecordId: d.recordId || null, ok: true });
    } catch (error) {
      if (requestKey) processedVenturesRiskWrites.current.delete(requestKey);
      publishResult({ action: d.action, recordId: d.recordId || null, ok: false, error: error?.message || "تعذر حفظ الخطر في Projects." });
    }
  }, [A, access, ctx.can, ctx.data.risks, ctx.projectsById, ws?.id]);
  const processedKnowledgeMeetingWrites = useRef(new Set());
  const handleKnowledgeMeetingTasks = useCallback(async (d) => {
    if (!(d?.source === "knowledge" && d.systemId === "projects" && d.action === "create_meeting_tasks")) return;
    const publishResult = (detail) => window.dispatchEvent(new CustomEvent("os:source-write-result", { detail: { workspaceId: ws?.id || null, systemId: "projects", source: "knowledge", ...detail } }));
    if (d.workspaceId && String(d.workspaceId) !== String(ws?.id)) return;
    const payload = d.payload || {};
    const project = ctx.projectsById?.[payload.project_id];
    if (!project || project.is_system || project.archived_at) { publishResult({ action: d.action, recordId: d.recordId || null, ok: false, error: "المشروع المرتبط بالاجتماع غير موجود أو غير نشط." }); return; }
    if (osSectionLevel(access, "tasks") !== "edit" || !ctx.can("task.write", project)) { publishResult({ action: d.action, recordId: d.recordId || null, ok: false, error: "لا تملك صلاحية إنشاء مهام في هذا المشروع." }); return; }
    const requestKey = String(d.recordId || payload.meeting_id || "");
    if (requestKey && processedKnowledgeMeetingWrites.current.has(requestKey)) {
      publishResult({ action: d.action, recordId: d.recordId || requestKey, ok: true, duplicateRequest: true });
      return;
    }
    if (requestKey) processedKnowledgeMeetingWrites.current.add(requestKey);
    const rows = Array.isArray(payload.tasks) ? payload.tasks : [];
    const createdTaskIds = [], errors = [];
    for (const item of rows) {
      const sourceRecordId = String(item?.source_followup_id || item?.source_record_id || "");
      const title = String(item?.title || "").trim();
      if (!sourceRecordId || !title) { errors.push("توجد متابعة بلا هوية ثابتة أو عنوان صالح."); continue; }
      const trashed = (ctx.trash || []).find((entry) => entry.coll === "tasks" && entry.rec?.source === "knowledge_meeting" && String(entry.rec?.source_record_id) === sourceRecordId);
      if (trashed) { errors.push(title + ": المهمة السابقة في سلة المحذوفات؛ استعدها صراحةً قبل إعادة التحويل."); continue; }
      const existing = (ctx.data.tasks || []).find((task) => task.source === "knowledge_meeting" && String(task.source_record_id || task.source_followup_id || "") === sourceRecordId);
      if (existing?.archived_at) { errors.push(title + ": المهمة السابقة مؤرشفة؛ أزل الأرشفة صراحةً قبل إعادة التحويل."); continue; }
      try {
        const task = {
          ...item,
          id: existing?.id || ("knowledge_meeting_task_" + encodeURIComponent(sourceRecordId)),
          title,
          project_id: project.id,
          source: "knowledge_meeting",
          source_record_id: sourceRecordId,
          source_meeting_id: String(payload.meeting_id || ""),
          source_followup_id: sourceRecordId,
          source_followup_title: String(item?.source_followup_title || title),
          source_meeting_title: String(item?.source_meeting_title || ""),
        };
        const saved = await A.saveTask(task, !existing);
        if (!saved?.id) throw new Error("لم يؤكد مخزن Projects حفظ المهمة.");
        createdTaskIds.push(saved.id);
      } catch (error) { errors.push(title + ": " + (error?.message || "تعذر الحفظ.")); }
    }
    const ok = rows.length > 0 && errors.length === 0;
    if (!ok && requestKey) processedKnowledgeMeetingWrites.current.delete(requestKey);
    publishResult({ action: d.action, recordId: d.recordId || null, ok, createdTaskIds, error: errors.join(" | ") || (rows.length ? null : "لا توجد متابعات لتحويلها.") });
  }, [A, access, ctx.can, ctx.data.tasks, ctx.projectsById, ctx.trash, ws?.id]);
  const handleSourceWrite = useCallback((d) => {
    if (d?.source === "ventures") return handleVenturesRisk(d);
    if (d?.source === "knowledge") return handleKnowledgeMeetingTasks(d);
  }, [handleVenturesRisk, handleKnowledgeMeetingTasks]);
  useEffect(() => {
    if (!sourceWriteRequest || !ready) return;
    void handleSourceWrite(sourceWriteRequest);
  }, [sourceWriteRequest, ready, handleSourceWrite]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const listener = (event) => { void handleSourceWrite(event?.detail || {}); };
    window.addEventListener("os:source-write", listener);
    return () => window.removeEventListener("os:source-write", listener);
  }, [handleSourceWrite]);

  if (error) return <ErrorState error={error} onRetry={() => store.api.reload()} />;
  if (!ready) return <Skeleton />;
  if (lvl === "none") return <AccessDenied />;
  const Screen = SCREENS[page] || Dashboard;
  const readOnlyScope = lvl === "view" && access.level === "edit";
  const body = readOnlyScope ? <Ctx.Provider value={{ ...ctx, can: () => false, role: "Viewer" }}><div style={{ marginBottom: 10 }}><Chip color="#3B82F6">👁 هذا القسم للعرض فقط</Chip></div><Screen /></Ctx.Provider> : <Screen />;
  return <div className="projects-system" style={{ animation: "fadeIn 0.25s ease-out" }}>{ctx.pending > 0 && <div style={{ position: "fixed", top: 8, insetInlineEnd: 12, fontSize: 10.5, color: "#6E7781", zIndex: 3000 }}>⟳ جارٍ الحفظ…</div>}{ctx.online === false && !ctx.isDemo && <div role="status" style={{ fontSize: 11, color: "#B7791F", marginBottom: 8 }}>⚠ أنت غير متصل. التغييرات التي يمكن حفظها محليًا ستظل في انتظار المزامنة.</div>}<OfflineQueuePanel />{body}<TaskSheet /><TimerBar /></div>;
}

export default function ProjectsSystem(props) {
  const { authUser, ws, members, isDemo } = props;
  const seed = useMemo(() => () => buildSeed({ me: authUser.id, ownerId: ws.ownerId, members: (members || []).map((m) => m.userId), today: todayStr("Africa/Cairo") }), [authUser.id, ws.ownerId, members]);
  return <ProjectsProvider {...props} seed={seed}><ProjectsDurableEventBridge ws={ws} isDemo={isDemo}><Router sourceWriteRequest={props.sourceWriteRequest} routeContext={props.routeContext} /></ProjectsDurableEventBridge></ProjectsProvider>;
}
