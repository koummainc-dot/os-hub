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
import { subscribeOSEvents } from "../integrationEvents.js";

function RisksPage() {
  const [tab, setTab] = useState("risks"); const { data } = useP();
  return <div><div style={{ fontSize: 21, fontWeight: 700, marginBottom: 12 }}>المخاطر والمشاكل والقرارات</div>
    <Tabs value={tab} onChange={setTab} tabs={[{ id: "risks", label: "⚠️ المخاطر", count: data.risks.length }, { id: "issues", label: "🔥 المشاكل", count: data.issues.length }, { id: "decisions", label: "⚖️ القرارات", count: data.decisions.length }]} />
    {tab === "risks" && <RisksView />}{tab === "issues" && <IssuesView />}{tab === "decisions" && <DecisionsView />}</div>;
}
const SCREENS = { dashboard: Dashboard, today: Today, week: Week, projects: Projects, tasks: Tasks, issues: IssuesView, discovery: DiscoveryView, prds: PrdsView, okrs: Okrs, outputs: OutputsView, risks: RisksPage, meetings: Meetings, updates: Updates, wins: Wins, reviews: Reviews, contacts: Contacts, team: Team, templates: Templates, settings: Settings };

function Router() {
  const ctx = useP(); const { page, ready, error, store, access, role, shell, ws } = ctx; const lvl = osSectionLevel(access, page);
  const [learningActivity, setLearningActivity] = useState([]);
  useEffect(() => subscribeOSEvents((event) => {
    setLearningActivity((items) => [event, ...items.filter((x) => x.id !== event.id)].slice(0, 3));
  }, { workspaceId: ws?.id || "default", source: "learning", types: ["learning.study_session.completed", "learning.lesson.completed", "learning.course.completed"] }), [ws?.id]);
  // sections hidden for Viewers (plan §13.2) are removed from the shell menu
  useEffect(() => { if (shell && shell.publish) shell.publish("projects", { visible: Object.keys(SCREENS).filter((k) => !(role === "Viewer" && ["reviews", "contacts"].includes(k))) }); }, [role]);
  if (error) return <ErrorState error={error} onRetry={() => store.api.reload()} />;
  if (!ready) return <Skeleton />;
  if (lvl === "none") return <AccessDenied />;
  const Screen = SCREENS[page] || Dashboard;
  const readOnlyScope = lvl === "view" && access.level === "edit";
  const body = readOnlyScope ? <Ctx.Provider value={{ ...ctx, can: () => false, role: "Viewer" }}><div style={{ marginBottom: 10 }}><Chip color="#3B82F6">👁 هذا القسم للعرض فقط</Chip></div><Screen /></Ctx.Provider> : <Screen />;
  return <div style={{ animation: "fadeIn 0.25s ease-out" }}>{ctx.pending > 0 && <div style={{ position: "fixed", top: 8, insetInlineEnd: 12, fontSize: 10.5, color: "#6E7781", zIndex: 3000 }}>⟳ جارٍ الحفظ…</div>}{ctx.online === false && !ctx.isDemo && <div style={{ fontSize: 11, color: "#B7791F", marginBottom: 8 }}>⚠ التحديث اللحظي غير متصل — تُحمَّل التغييرات عند العودة للنافذة.</div>}{learningActivity.length > 0 && <div role="status" style={{ marginBottom: 12, padding: "12px 14px", border: "1px solid #DDD6FE", background: "#F5F3FF", borderRadius: 12, color: "#5B21B6", fontSize: 12 }}><div style={{ fontWeight: 800, marginBottom: 6 }}>🔗 نشاط جديد من Learning OS</div>{learningActivity.map((event) => <div key={event.id} style={{ marginTop: 4 }}>{event.type === "learning.study_session.completed" ? `تم تسجيل جلسة دراسة — ${Number(event.payload?.minutes) || 0} دقيقة` : event.type === "learning.lesson.completed" ? `تم إكمال درس: ${event.payload?.lessonName || "درس"}` : `تم إكمال دورة: ${event.payload?.courseName || "دورة"}`}</div>)}<button type="button" onClick={() => setLearningActivity([])} style={{ marginTop: 8, border: 0, background: "transparent", color: "#6D28D9", cursor: "pointer", font: "inherit" }}>إخفاء</button></div>}{body}<TaskSheet /><TimerBar /></div>;
}

export default function ProjectsSystem(props) {
  const { authUser, ws, members, isDemo } = props;
  const seed = useMemo(() => () => buildSeed({ me: authUser.id, ownerId: ws.ownerId, members: (members || []).map((m) => m.userId), today: todayStr("Africa/Cairo") }), [authUser.id, ws.ownerId, members]);
  return <ProjectsProvider {...props} seed={seed}><Router /></ProjectsProvider>;
}
