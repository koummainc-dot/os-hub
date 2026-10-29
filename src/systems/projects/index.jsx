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

function RisksPage() {
  const [tab, setTab] = useState("risks"); const { data } = useP();
  return <div><div style={{ fontSize: 21, fontWeight: 700, marginBottom: 12 }}>المخاطر والمشاكل والقرارات</div>
    <Tabs value={tab} onChange={setTab} tabs={[{ id: "risks", label: "⚠️ المخاطر", count: data.risks.length }, { id: "issues", label: "🔥 المشاكل", count: data.issues.length }, { id: "decisions", label: "⚖️ القرارات", count: data.decisions.length }]} />
    {tab === "risks" && <RisksView />}{tab === "issues" && <IssuesView />}{tab === "decisions" && <DecisionsView />}</div>;
}
const SCREENS = { dashboard: Dashboard, today: Today, week: Week, projects: Projects, tasks: Tasks, issues: IssuesView, discovery: DiscoveryView, prds: PrdsView, okrs: Okrs, outputs: OutputsView, risks: RisksPage, meetings: Meetings, updates: Updates, wins: Wins, reviews: Reviews, contacts: Contacts, team: Team, templates: Templates, settings: Settings };

function Router() {
  const ctx = useP(); const { page, ready, error, store, access, role, shell } = ctx; const lvl = osSectionLevel(access, page);
  // sections hidden for Viewers (plan §13.2) are removed from the shell menu
  useEffect(() => { if (shell && shell.publish) shell.publish("projects", { visible: Object.keys(SCREENS).filter((k) => !(role === "Viewer" && ["reviews", "contacts"].includes(k))) }); }, [role]);
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
  return <ProjectsProvider {...props} seed={seed}><Router /></ProjectsProvider>;
}
