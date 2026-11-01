import React, { useEffect, useMemo } from "react";
import { AccessDenied } from "../../core/ui.jsx";
import { osSectionLevel } from "../../core/core.js";
import { Skeleton, ErrorState, Chip } from "../../core/kit.jsx";
import { todayStr } from "../../core/dates.js";
import { LearningProvider, useL, Ctx } from "./store.jsx";
import { TimerBar, UndoBar } from "./parts.jsx";
import { Dashboard, Analytics } from "./screens_a.jsx";
import { Areas, Courses } from "./screens_b.jsx";
import { Skills, Placement, CareerGoals, Vocab, Settings } from "./screens_c.jsx";
import { buildSeed } from "./demo.js";

const SCREENS = { dashboard: Dashboard, areas: Areas, courses: Courses, skills: Skills, placement: Placement, careergoals: CareerGoals, vocab: Vocab, analytics: Analytics, settings: Settings };

function Router() {
  const ctx = useL(); const { page, ready, error, store, access } = ctx; const lvl = osSectionLevel(access, page);
  if (error) return <ErrorState error={error} onRetry={() => store.api.reload()} />;
  if (!ready) return <Skeleton />;
  if (lvl === "none") return <AccessDenied />;
  const Screen = SCREENS[page] || Dashboard;
  const ro = lvl === "view" && access.level === "edit";
  const body = ro ? <Ctx.Provider value={{ ...ctx, canEdit: false }}><div style={{ marginBottom: 10 }}><Chip color="#3B82F6">👁 هذا القسم للعرض فقط</Chip></div><Screen /></Ctx.Provider> : <Screen />;
  return <div style={{ animation: "fadeIn 0.25s ease-out" }}>
    {ctx.pending > 0 && <div style={{ position: "fixed", top: 8, insetInlineEnd: 12, fontSize: 10.5, color: "#6E7781", zIndex: 3000 }}>⟳ جارٍ الحفظ…</div>}
    {ctx.online === false && !ctx.isDemo && <div style={{ fontSize: 11, color: "#B7791F", marginBottom: 8 }}>⚠ التحديث اللحظي غير متصل — تُحمَّل التغييرات عند العودة للنافذة.</div>}
    {body}<TimerBar /><UndoBar /></div>;
}

export default function LearningSystem(props) {
  const seed = useMemo(() => () => buildSeed({ today: todayStr("Africa/Cairo") }), []);
  return <LearningProvider {...props} seed={seed}><Router /></LearningProvider>;
}
