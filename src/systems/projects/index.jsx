import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AccessDenied } from "../../core/ui.jsx";
import { osSectionLevel } from "../../core/core.js";
import { Tabs, Skeleton, ErrorState, Chip } from "../../core/kit.jsx";
import { todayStr } from "../../core/dates.js";
import { ProjectsProvider, useP, Ctx } from "./store.jsx";
import { TaskSheet, TimerBar } from "./parts.jsx";
import { Dashboard, Today, Week, Tasks } from "./screens_a.jsx";
import { Projects } from "./screens_b.jsx";
import { OutputsView, RisksView, IssuesView, DecisionsView, PrdsView, DiscoveryView } from "./entities.jsx";
import { Okrs, Updates, Wins, Reviews, Contacts, Team, Templates, Meetings, Settings } from "./screens_c.jsx";
import { buildSeed } from "./demo.js";
import { loadDurableOSEvents, subscribeDurableOSEvents } from "../integrationEvents.js";
import MasterplanWizard from "./masterplanWizard.jsx";

function RisksPage() {
  const [tab, setTab] = useState("risks"); const { data } = useP();
  return <div><div style={{ fontSize: 21, fontWeight: 700, marginBottom: 12 }}>المخاطر والقرارات</div>
    <Tabs value={tab} onChange={setTab} tabs={[{ id: "risks", label: "⚠️ المخاطر", count: data.risks.length }, { id: "decisions", label: "⚖️ القرارات", count: data.decisions.length }]} />
    {tab === "risks" && <RisksView />}{tab === "decisions" && <DecisionsView />}</div>;
}
const SCREENS = { dashboard: Dashboard, today: Today, week: Week, projects: Projects, tasks: Tasks, issues: IssuesView, discovery: DiscoveryView, prds: PrdsView, okrs: Okrs, outputs: OutputsView, risks: RisksPage, meetings: Meetings, updates: Updates, wins: Wins, reviews: Reviews, contacts: Contacts, team: Team, templates: Templates, settings: Settings, masterplanImport: MasterplanWizard };

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

function Router({ sourceWriteRequest }) {
  const ctx = useP(); const { page, ready, error, store, access, role, shell, ws, A, data } = ctx; const lvl = osSectionLevel(access, page);
  // sections hidden for Viewers (plan §13.2) are removed from the shell menu
  useEffect(() => { if (shell && shell.publish) shell.publish("projects", { visible: Object.keys(SCREENS).filter((k) => k !== "masterplanImport" && !(role === "Viewer" && ["reviews", "contacts"].includes(k))) }); }, [role]);
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
      const sourceRecordId = String(item?.source_record_id || "");
      const title = String(item?.title || "").trim();
      if (!sourceRecordId || !title) { errors.push("توجد متابعة بلا معرّف أو عنوان صالح."); continue; }
      const existing = (ctx.data.tasks || []).find((task) => task.source === "knowledge_meeting" && String(task.source_record_id) === sourceRecordId);
      try {
        const task = { ...item, id: existing?.id || ("knowledge_meeting_task_" + encodeURIComponent(sourceRecordId)), title, project_id: project.id, source: "knowledge_meeting", source_record_id: sourceRecordId, source_meeting_id: String(payload.meeting_id || "") };
        const saved = await A.saveTask(task, !existing);
        if (!saved?.id) throw new Error("لم يؤكد مخزن Projects حفظ المهمة.");
        createdTaskIds.push(saved.id);
      } catch (error) { errors.push(title + ": " + (error?.message || "تعذر الحفظ.")); }
    }
    const ok = rows.length > 0 && errors.length === 0;
    if (!ok && requestKey) processedKnowledgeMeetingWrites.current.delete(requestKey);
    publishResult({ action: d.action, recordId: d.recordId || null, ok, createdTaskIds, error: errors.join(" | ") || (rows.length ? null : "لا توجد متابعات لتحويلها.") });
  }, [A, access, ctx.can, ctx.data.tasks, ctx.projectsById, ws?.id]);
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
  return <div style={{ animation: "fadeIn 0.25s ease-out" }}>{ctx.pending > 0 && <div style={{ position: "fixed", top: 8, insetInlineEnd: 12, fontSize: 10.5, color: "#6E7781", zIndex: 3000 }}>⟳ جارٍ الحفظ…</div>}{ctx.online === false && !ctx.isDemo && <div style={{ fontSize: 11, color: "#B7791F", marginBottom: 8 }}>⚠ التحديث اللحظي غير متصل — تُحمَّل التغييرات عند العودة للنافذة.</div>}{body}<TaskSheet /><TimerBar /></div>;
}

export default function ProjectsSystem(props) {
  const { authUser, ws, members, isDemo } = props;
  const seed = useMemo(() => () => buildSeed({ me: authUser.id, ownerId: ws.ownerId, members: (members || []).map((m) => m.userId), today: todayStr("Africa/Cairo") }), [authUser.id, ws.ownerId, members]);
  return <ProjectsProvider {...props} seed={seed}><ProjectsDurableEventBridge ws={ws} isDemo={isDemo}><Router sourceWriteRequest={props.sourceWriteRequest} /></ProjectsDurableEventBridge></ProjectsProvider>;
}
