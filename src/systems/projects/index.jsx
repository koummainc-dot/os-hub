import React, { useEffect, useMemo, useState } from "react";
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
import { readOSEvents, subscribeOSEvents, loadDurableOSEvents, subscribeDurableOSEvents } from "../integrationEvents.js";

function RisksPage() {
  const [tab, setTab] = useState("risks"); const { data } = useP();
  return <div><div style={{ fontSize: 21, fontWeight: 700, marginBottom: 12 }}>المخاطر والمشاكل والقرارات</div>
    <Tabs value={tab} onChange={setTab} tabs={[{ id: "risks", label: "⚠️ المخاطر", count: data.risks.length }, { id: "issues", label: "🔥 المشاكل", count: data.issues.length }, { id: "decisions", label: "⚖️ القرارات", count: data.decisions.length }]} />
    {tab === "risks" && <RisksView />}{tab === "issues" && <IssuesView />}{tab === "decisions" && <DecisionsView />}</div>;
}
const SCREENS = { dashboard: Dashboard, today: Today, week: Week, projects: Projects, tasks: Tasks, issues: IssuesView, discovery: DiscoveryView, prds: PrdsView, okrs: Okrs, outputs: OutputsView, risks: RisksPage, meetings: Meetings, updates: Updates, wins: Wins, reviews: Reviews, contacts: Contacts, team: Team, templates: Templates, settings: Settings };

function Router() {
  const ctx = useP(); const { page, ready, error, store, access, role, shell, ws } = ctx; const lvl = osSectionLevel(access, page);
  const [crossSystemActivity, setCrossSystemActivity] = useState([]);
  useEffect(() => {
    const handler = async (event) => {
      const d = event?.detail || {};
      if (d.systemId !== "projects" || (d.workspaceId && String(d.workspaceId) !== String(ws?.id))) return;
      try {
        if (d.action === "create") {
          await A.saveProject({ ...(d.payload || {}), id: d.recordId || undefined }, true);
        } else if (d.action === "update" && d.recordId) {
          const current = data.projects.find((item) => String(item.id) === String(d.recordId));
          if (!current) throw new Error("المشروع المرتبط غير موجود أو غير متاح.");
          await A.saveProject({ ...current, ...(d.payload || {}), id: current.id }, false);
        }
        window.dispatchEvent(new CustomEvent("os:source-write-result", {
          detail: { systemId: "projects", action: d.action, recordId: d.recordId || null, ok: true, source: "projects" }
        }));
      } catch (error) {
        window.dispatchEvent(new CustomEvent("os:source-write-result", {
          detail: { systemId: "projects", action: d.action, recordId: d.recordId || null, ok: false, error: error?.message || String(error), source: "projects" }
        }));
      }
    };
    window.addEventListener("os:source-write", handler);
    return () => window.removeEventListener("os:source-write", handler);
  }, [ws?.id, A, data.projects]);

  useEffect(() => {
    let alive = true;
    const options = { workspaceId: ws?.id || "default", limit: 10, types: ["learning.study_session.completed", "learning.lesson.completed", "learning.course.completed", "hobbies.practice_session.completed"] };
    const mergeEvents = (items, incoming) => {
      const byKey = new Map();
      [...items, ...incoming].forEach((event) => byKey.set(event.idempotencyKey || event.id, event));
      return [...byKey.values()].sort((a, b) => String(b.occurredAt || "").localeCompare(String(a.occurredAt || ""))).slice(0, 5);
    };
    setCrossSystemActivity(readOSEvents(options).reverse());
    const loadServer = async () => {
      const result = await loadDurableOSEvents(ws?.id, "hobbies", 10);
      if (alive && result.ok) setCrossSystemActivity((items) => mergeEvents(items, result.events));
    };
    loadServer();
    const refresh = () => { if (typeof document === "undefined" || document.visibilityState !== "hidden") loadServer(); };
    if (typeof window !== "undefined") window.addEventListener("focus", refresh);
    if (typeof document !== "undefined") document.addEventListener("visibilitychange", refresh);
    const unsubscribeDurable = subscribeDurableOSEvents(ws?.id, "hobbies", (event) => {
      setCrossSystemActivity((items) => mergeEvents(items, [event]));
    });
    const unsubscribe = subscribeOSEvents((event) => {
      setCrossSystemActivity((items) => mergeEvents(items, [event]));
    }, options);
    return () => {
      alive = false;
      unsubscribe();
      unsubscribeDurable();
      if (typeof window !== "undefined") window.removeEventListener("focus", refresh);
      if (typeof document !== "undefined") document.removeEventListener("visibilitychange", refresh);
    };
  }, [ws?.id]);
  // sections hidden for Viewers (plan §13.2) are removed from the shell menu
  useEffect(() => { if (shell && shell.publish) shell.publish("projects", { visible: Object.keys(SCREENS).filter((k) => !(role === "Viewer" && ["reviews", "contacts"].includes(k))) }); }, [role]);
  if (error) return <ErrorState error={error} onRetry={() => store.api.reload()} />;
  if (!ready) return <Skeleton />;
  if (lvl === "none") return <AccessDenied />;
  const Screen = SCREENS[page] || Dashboard;
  const readOnlyScope = lvl === "view" && access.level === "edit";
  const body = readOnlyScope ? <Ctx.Provider value={{ ...ctx, can: () => false, role: "Viewer" }}><div style={{ marginBottom: 10 }}><Chip color="#3B82F6">👁 هذا القسم للعرض فقط</Chip></div><Screen /></Ctx.Provider> : <Screen />;
  return <div style={{ animation: "fadeIn 0.25s ease-out" }}>{ctx.pending > 0 && <div style={{ position: "fixed", top: 8, insetInlineEnd: 12, fontSize: 10.5, color: "#6E7781", zIndex: 3000 }}>⟳ جارٍ الحفظ…</div>}{ctx.online === false && !ctx.isDemo && <div style={{ fontSize: 11, color: "#B7791F", marginBottom: 8 }}>⚠ التحديث اللحظي غير متصل — تُحمَّل التغييرات عند العودة للنافذة.</div>}{crossSystemActivity.length > 0 && <div role="status" style={{ marginBottom: 12, padding: "12px 14px", border: "1px solid #DDD6FE", background: "#F5F3FF", borderRadius: 12, color: "#5B21B6", fontSize: 12 }}><div style={{ fontWeight: 800, marginBottom: 6 }}>🔗 نشاط حديث من أنظمة أخرى</div>{crossSystemActivity.map((event) => <div key={event.id} style={{ marginTop: 4 }}>{event.type === "hobbies.practice_session.completed" ? `Hobbies OS · ${event.payload?.hobbyName || "هواية"} · ${Number(event.payload?.minutes) || 0} دقيقة · ${event.payload?.sessionDate || ""}` : event.type === "learning.study_session.completed" ? `Learning OS · جلسة دراسة · ${Number(event.payload?.minutes) || 0} دقيقة` : event.type === "learning.lesson.completed" ? `Learning OS · إكمال درس: ${event.payload?.lessonName || "درس"}` : `Learning OS · إكمال دورة: ${event.payload?.courseName || "دورة"}`}</div>)}<button type="button" onClick={() => setCrossSystemActivity([])} style={{ marginTop: 8, border: 0, background: "transparent", color: "#6D28D9", cursor: "pointer", font: "inherit" }}>إخفاء</button></div>}{body}<TaskSheet /><TimerBar /></div>;
}

export default function ProjectsSystem(props) {
  const { authUser, ws, members, isDemo } = props;
  const seed = useMemo(() => () => buildSeed({ me: authUser.id, ownerId: ws.ownerId, members: (members || []).map((m) => m.userId), today: todayStr("Africa/Cairo") }), [authUser.id, ws.ownerId, members]);
  return <ProjectsProvider {...props} seed={seed}><Router /></ProjectsProvider>;
}
