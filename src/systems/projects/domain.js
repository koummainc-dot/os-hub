// ════════════════════════════════════════════════════════════════════
// Projects OS — domain engine (pure functions; no React, no I/O).
// Everything derived (progress, health, scores, parent status…) is computed here, never edited by hand
// and never computed inside UI components (plan §3 principle 3, §6).
// ════════════════════════════════════════════════════════════════════
import { todayStr, addDays, diffDays, weekStart, quarterLabel, dateOf } from "../../core/dates.js";

export const DEFAULT_SETTINGS = {
  timezone: "Africa/Cairo", weekStartDay: 6, defaultReminderTime: "09:00",
  traceabilityPolicy: "warn", traceabilityTypes: [],
  yellowDays: 14, yellowProgress: 0.7, riskHigh: 15, riskMedium: 8,
  paceOnTrack: 0.1, paceAtRisk: 0.25, inboxStaleDays: 14, timerMaxHours: 8, dueSoonDays: 1,
  cyclesEnabled: false, krWeights: false,
  automations: { reviewDraft: true, dueReminders: true, overdueDigest: true, healthAlerts: true, staleInbox: true, krCheckin: true, timerLong: true, winSuggest: true, pioSuggest: true },
};

// ── statuses & categories ───────────────────────────────────────────
export const TASK_STATUS = { "Not Started": "todo", "In Progress": "active", Completed: "done", Cancelled: "cancelled" };
export const PROJECT_STATUS = { Idea: "todo", Planned: "todo", "In Progress": "active", "On Hold": "active", Completed: "done", Cancelled: "cancelled", Archived: "done" };
export const PRIORITIES = ["Low", "Medium", "High", "Urgent"];
export const BUCKETS = ["Inbox", "Soon", "This Week", "Icebox"];
export const cat = (s) => TASK_STATUS[s] || "todo";

export const isLive = (r) => !!r && !r.deleted_at;
export const isActiveRec = (r) => isLive(r) && !r.archived_at;

// ── task tree ───────────────────────────────────────────────────────
// Builds the index over live, non-archived tasks. Returns helpers and a derived map.
export function buildTaskIndex(tasks, sessions) {
  const list = (tasks || []).filter(isActiveRec);
  const byId = {}; list.forEach((t) => { byId[t.id] = t; });
  const children = {}; list.forEach((t) => { if (t.parent_task_id && byId[t.parent_task_id]) (children[t.parent_task_id] = children[t.parent_task_id] || []).push(t.id); });
  Object.values(children).forEach((ids) => ids.sort((a, b) => (byId[a].sort_order || 0) - (byId[b].sort_order || 0)));
  const own = {}; (sessions || []).filter((s) => isLive(s) && !s.voided_at).forEach((s) => { own[s.task_id] = (own[s.task_id] || 0) + (s.minutes || 0); });
  const derived = {};
  const compute = (id, depth, seen) => {
    if (derived[id]) return derived[id];
    if (seen[id]) return { isLeaf: true, progress: null, leafTotal: 0, leafDone: 0, estimated: 0, actual: 0, dueMax: null, depth }; // cycle guard
    seen[id] = true;
    const t = byId[id]; const kids = children[id] || [];
    let d;
    if (!kids.length) {
      const c = cat(t.status);
      const activeLeaf = c !== "cancelled";
      d = { isLeaf: true, depth, leafTotal: activeLeaf ? 1 : 0, leafDone: c === "done" ? 1 : 0, estimated: activeLeaf ? t.estimated_minutes || 0 : 0, actual: own[id] || 0, dueMax: t.due_date || null, status: t.status };
    } else {
      const kd = kids.map((k) => compute(k, depth + 1, { ...seen }));
      const leafTotal = kd.reduce((a, x) => a + x.leafTotal, 0), leafDone = kd.reduce((a, x) => a + x.leafDone, 0);
      let st;
      if (leafTotal === 0) st = "Cancelled";
      else if (leafDone === leafTotal) st = "Completed";
      else if (kd.every((x) => x.isLeaf ? x.status === "Not Started" || x.status === "Cancelled" : x.status === "Not Started" || x.status === "Cancelled")) st = "Not Started";
      else st = "In Progress";
      const dues = kd.map((x) => x.dueMax).filter(Boolean);
      d = { isLeaf: false, depth, leafTotal, leafDone, estimated: kd.reduce((a, x) => a + x.estimated, 0), actual: (own[id] || 0) + kd.reduce((a, x) => a + x.actual, 0), dueMax: dues.length ? dues.sort().slice(-1)[0] : null, status: st };
    }
    d.progress = d.leafTotal ? d.leafDone / d.leafTotal : null;
    d.variance = d.actual - d.estimated;
    derived[id] = d; return d;
  };
  list.forEach((t) => compute(t.id, 0, {}));
  const roots = list.filter((t) => !t.parent_task_id || !byId[t.parent_task_id]).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  const descendants = (id) => { const out = []; const walk = (x) => (children[x] || []).forEach((k) => { out.push(k); walk(k); }); walk(id); return out; };
  const ancestors = (id) => { const out = []; let cur = byId[id]; const seen = {}; while (cur && cur.parent_task_id && byId[cur.parent_task_id] && !seen[cur.parent_task_id]) { seen[cur.parent_task_id] = 1; out.push(cur.parent_task_id); cur = byId[cur.parent_task_id]; } return out; };
  return { list, byId, children, roots, derived, descendants, ancestors, isLeaf: (id) => !(children[id] || []).length };
}
export function effectiveStatus(task, idx) { const d = idx.derived[task.id]; return d && !d.isLeaf ? d.status : task.status; }

export function isOverdueLeaf(task, idx, today) {
  if (!idx.isLeaf(task.id)) return false;
  const c = cat(task.status);
  return (c === "todo" || c === "active") && !!task.due_date && task.due_date < today && task.planning_bucket !== "Icebox";
}

// ── project metrics & health ────────────────────────────────────────
export function riskScore(r) { return (r.probability || 0) * (r.impact || 0); }
export function riskLevel(r, s) { const sc = riskScore(r); const set = s || DEFAULT_SETTINGS; return sc >= set.riskHigh ? "High" : sc >= set.riskMedium ? "Medium" : "Low"; }
export const isOpenRisk = (r) => isActiveRec(r) && (r.status === "Open" || r.status === "In Mitigation");
export const isOpenIssue = (i) => isActiveRec(i) && (i.status === "Open" || i.status === "In Progress");
// Match the source relationship first; the risk backlink may be missing after a partial write.
export const issueForRisk = (risk, issues) => (issues || []).find((i) => isActiveRec(i) && (i.from_risk_id === risk?.id || i.id === risk?.converted_issue_id)) || null;

export function projectMetrics(p, ctx) {
  const { idx, risks, issues, decisions, outputs, sessions, settings } = ctx; const today = ctx.today; const set = settings || DEFAULT_SETTINGS;
  const tasks = idx.list.filter((t) => t.project_id === p.id);
  const leaves = tasks.filter((t) => idx.isLeaf(t.id));
  const active = leaves.filter((t) => cat(t.status) !== "cancelled");
  const done = active.filter((t) => cat(t.status) === "done");
  const overdue = leaves.filter((t) => isOverdueLeaf(t, idx, today));
  const progress = active.length ? done.length / active.length : null;
  const pRisks = (risks || []).filter((r) => r.project_id === p.id && isOpenRisk(r));
  const highRisks = pRisks.filter((r) => riskScore(r) >= set.riskHigh);
  const pIssues = (issues || []).filter((i) => i.project_id === p.id && isOpenIssue(i));
  const critical = pIssues.filter((i) => i.severity === "Critical");
  const daysRemaining = p.target_date ? diffDays(p.target_date, today) : null;
  const estimated = active.reduce((a, t) => a + (t.estimated_minutes || 0), 0);
  const projSessions = (sessions || []).filter((s) => isLive(s) && !s.voided_at && tasks.some((t) => t.id === s.task_id));
  const actual = projSessions.reduce((a, s) => a + (s.minutes || 0), 0);
  const outs = (outputs || []).filter((o) => isActiveRec(o) && o.project_id === p.id);
  const covered = active.filter((t) => t.prd_id || (t.discovery_ids && t.discovery_ids.length));
  const reasons = []; let health;
  if (["Idea", "Cancelled", "Archived"].includes(p.status)) health = "NotEvaluated";
  else if (p.status === "On Hold") health = "OnHold";
  else if (p.status === "Completed") health = "Completed";
  else {
    if (critical.length) reasons.push({ code: "CRITICAL_ISSUE_OPEN", level: "Red", ids: critical.map((i) => i.id), kind: "issue" });
    if (overdue.length) reasons.push({ code: "OVERDUE_TASKS", level: "Red", ids: overdue.map((t) => t.id), kind: "task" });
    if (p.target_date && p.target_date < today) reasons.push({ code: "PAST_DEADLINE", level: "Red", ids: [], kind: "project" });
    if (highRisks.length) reasons.push({ code: "HIGH_RISK_OPEN", level: "Orange", ids: highRisks.map((r) => r.id), kind: "risk" });
    if (daysRemaining != null && daysRemaining >= 0 && daysRemaining <= set.yellowDays && (progress == null ? 0 : progress) < set.yellowProgress) reasons.push({ code: "DEADLINE_NEAR_LOW_PROGRESS", level: "Yellow", ids: [], kind: "project" });
    const rank = { Red: 3, Orange: 2, Yellow: 1 };
    health = reasons.length ? reasons.slice().sort((a, b) => rank[b.level] - rank[a.level])[0].level : "Green";
  }
  return {
    leafTotal: active.length, leafCompleted: done.length, progress, overdueLeafCount: overdue.length, health, healthReasons: reasons,
    daysRemaining, estimated, actual, timeRatio: estimated ? actual / estimated : null, outputsCount: outs.length, outputsFinal: outs.filter((o) => o.approval === "Final").length,
    openRisks: pRisks.length, highOpenRisks: highRisks.length, openIssues: pIssues.length, criticalOpenIssues: critical.length,
    decisionsCount: (decisions || []).filter((d) => isActiveRec(d) && d.project_id === p.id).length,
    coverage: active.length ? covered.length / active.length : null,
  };
}
export const REASON_LABEL = {
  CRITICAL_ISSUE_OPEN: "مشكلة حرجة مفتوحة", OVERDUE_TASKS: "مهام متأخرة", PAST_DEADLINE: "تجاوز الموعد المستهدف",
  HIGH_RISK_OPEN: "خطر عالٍ مفتوح", DEADLINE_NEAR_LOW_PROGRESS: "الموعد قريب والتقدم منخفض",
};
export const HEALTH_META = {
  Red: { label: "حرج", color: "#EF4444", icon: "🔴" }, Orange: { label: "تحذير", color: "#F97316", icon: "🟠" }, Yellow: { label: "انتباه", color: "#EAB308", icon: "🟡" },
  Green: { label: "سليم", color: "#10B981", icon: "🟢" }, OnHold: { label: "متوقف", color: "#94A3B8", icon: "⏸" }, Completed: { label: "مكتمل", color: "#3B82F6", icon: "✅" }, NotEvaluated: { label: "—", color: "#94A3B8", icon: "⚪" },
};

// project completion (plan §6.2): open leaves force an explicit choice
export function completionPlan(project, idx) {
  const open = idx.list.filter((t) => t.project_id === project.id && idx.isLeaf(t.id) && ["todo", "active"].includes(cat(t.status)));
  return { openLeaves: open, needsDecision: open.length > 0 };
}
export function canChangeProjectStatus(project, to, idx) {
  const from = project.status;
  const allowed = { Idea: ["Planned", "Cancelled"], Planned: ["In Progress", "On Hold", "Cancelled", "Idea"], "In Progress": ["On Hold", "Completed", "Cancelled", "Planned"], "On Hold": ["In Progress", "Cancelled", "Planned"], Completed: ["Archived", "In Progress"], Cancelled: ["Archived", "Planned"], Archived: ["Planned", "In Progress", "Completed", "Cancelled"] };
  if (from === to) return { ok: true };
  if (!(allowed[from] || []).includes(to)) return { ok: false, error: `لا يُسمح بالانتقال من «${from}» إلى «${to}»` };
  if (to === "Completed" && from === "Planned") return { ok: false, error: "لا يمكن إكمال مشروع مخطَّط مباشرة" };
  if (to === "Completed") { const tasks = idx.list.filter((t) => t.project_id === project.id); if (!tasks.length) return { ok: false, error: "لا يمكن إكمال مشروع بلا مهام — أضف مهاماً أو ألغِ المشروع" }; }
  return { ok: true };
}

// ── validation (V-xx) ───────────────────────────────────────────────
export function validateTaskRefs(task, ctx) {
  const errors = []; const { projectsById, tasksById, prdsById } = ctx;
  if (!task.project_id) errors.push("V-01: المهمة تحتاج مشروعاً صريحاً");
  else if (projectsById && !projectsById[task.project_id]) errors.push("V-22: المشروع غير موجود");
  if (task.parent_task_id) {
    if (task.parent_task_id === task.id) errors.push("V-02: المهمة لا يمكن أن تكون أباً لنفسها");
    const par = tasksById && tasksById[task.parent_task_id];
    if (!par) errors.push("الأب غير موجود");
    else if (par.project_id !== task.project_id) errors.push("V-05: الأب والابن يجب أن يكونا في نفس المشروع");
  }
  if (task.prd_id) { const prd = prdsById && prdsById[task.prd_id]; if (!prd) errors.push("V-22: المواصفة غير موجودة"); else if (prd.project_id !== task.project_id) errors.push("V-06: المواصفة يجب أن تتبع نفس مشروع المهمة"); }
  if (cat(task.status) === "cancelled" && !task.cancelled_reason) errors.push("V-19: سبب الإلغاء مطلوب");
  return errors;
}
export function canReparent(taskId, newParentId, idx) {
  const t = idx.byId[taskId]; if (!t) return { ok: false, error: "المهمة غير موجودة" };
  if (!newParentId) return { ok: true };
  if (newParentId === taskId) return { ok: false, error: "V-02: لا يمكن أن تكون المهمة أباً لنفسها" };
  const np = idx.byId[newParentId]; if (!np) return { ok: false, error: "الأب الجديد غير موجود" };
  if (np.project_id !== t.project_id) return { ok: false, error: "V-05: استخدم «نقل الشجرة» للانتقال لمشروع آخر" };
  if (idx.descendants(taskId).includes(newParentId)) return { ok: false, error: "V-03: لا يمكن نقل المهمة تحت أحد أحفادها (دورة)" };
  return { ok: true, warnDepth: idx.ancestors(newParentId).length + 1 > 8 };
}
// Moving a whole tree preserves hierarchy, including archived descendants. Invalid project-scoped references are cleared.
export function planTreeMove(taskId, targetProjectId, idx, prdsById, allTasks, discoveriesById = {}) {
  if (!idx.byId[taskId]) throw new Error("المهمة غير موجودة");
  const sourceTasks = (allTasks || idx.list).filter((t) => !t.deleted_at);
  const byId = Object.fromEntries(sourceTasks.map((t) => [t.id, t]));
  const children = {};
  sourceTasks.forEach((t) => { if (t.parent_task_id && byId[t.parent_task_id]) (children[t.parent_task_id] = children[t.parent_task_id] || []).push(t.id); });
  const ids = [];
  const seen = new Set();
  const walk = (id) => {
    if (seen.has(id) || !byId[id]) return;
    seen.add(id); ids.push(id);
    (children[id] || []).forEach(walk);
  };
  walk(taskId);
  const patches = ids.map((id) => {
    const t = byId[id]; const p = { ...t, project_id: targetProjectId };
    if (id === taskId) p.parent_task_id = null;
    if (t.prd_id && (!prdsById[t.prd_id] || prdsById[t.prd_id].project_id !== targetProjectId)) p.prd_id = null;
    if (t.discovery_ids && t.discovery_ids.length) {
      p.discovery_ids = t.discovery_ids.filter((discoveryId) => {
        const discovery = discoveriesById[discoveryId];
        return !!discovery && (!(discovery.project_ids || []).length || discovery.project_ids.includes(targetProjectId));
      });
    }
    return p;
  });
  return { ids, patches };
}
// adding the first child to a leaf: keep its manual status in previous_status (plan §9.3)
export function onFirstChild(parent) {
  return { patch: { ...parent, previous_status: parent.status }, warnCompleted: cat(parent.status) === "done" };
}
export function completeAllBranches(taskId, idx) {
  return [taskId, ...idx.descendants(taskId)].map((id) => idx.byId[id]).filter((t) => t && idx.isLeaf(t.id) && ["todo", "active"].includes(cat(t.status)));
}
export function validateSession(s) {
  const errors = [];
  if (!s.task_id) errors.push("V-08: الجلسة تحتاج مهمة");
  if (!(s.minutes >= 1 && s.minutes <= 1440)) errors.push("V-09: الدقائق بين 1 و1440");
  if (s.started_at && s.ended_at && !(s.started_at < s.ended_at)) errors.push("V-09: وقت البدء يجب أن يسبق الانتهاء");
  return errors;
}
export const sessionId = (memberId, clientId) => "ses_" + memberId + "_" + clientId; // V-10 idempotency
export function validateRisk(r) {
  const e = []; const ok = (n) => Number.isInteger(n) && n >= 1 && n <= 5;
  if (!ok(r.probability) || !ok(r.impact)) e.push("V-12: الاحتمال والتأثير بين 1 و5");
  return e;
}
export function validateKR(k, ctx = {}) {
  const e = [];
  if (k.type === "Numeric" && k.target_value === k.initial_value) e.push("V-13: القيمة المستهدفة يجب أن تختلف عن القيمة الابتدائية");
  if (k.task_ids != null && !Array.isArray(k.task_ids)) e.push("قائمة المهام المرتبطة غير صالحة");
  const taskIds = Array.isArray(k.task_ids) ? k.task_ids : [];
  if (new Set(taskIds).size !== taskIds.length) e.push("لا يمكن ربط المهمة نفسها أكثر من مرة بالنتيجة");
  if (ctx.tasksById) taskIds.forEach((id) => { if (!ctx.tasksById[id]) e.push("توجد مهمة مرتبطة غير موجودة أو غير نشطة: " + id); });
  return e;
}
export function validateDates(a, b, msg) { return a && b && a > b ? [msg || "V-14: تاريخ البداية بعد النهاية"] : []; }
export function validateIssueStatus(i, to) {
  if (to === "Resolved" && !String(i.resolution || "").trim()) return "V-17: الحل (resolution) مطلوب عند الإغلاق بحالة Resolved";
  if (to === "Closed" && i.status !== "Resolved" && i.status !== "Closed") return "لا يُغلق إلا بعد Resolved";
  return null;
}
export function validateDiscoveryStatus(d, to, linked) {
  if (to === "Dropped" && !String(d.dropped_reason || "").trim()) return "V-18: سبب الإسقاط مطلوب";
  if (to === "Working On" && !d.owner_id) return "V-18: لا بد من مسؤول عند «قيد العمل»";
  if (to === "Completed" && !linked && !String(d.resolution_note || "").trim()) return "الإكمال يتطلب رابط حل (مهمة/مواصفة/مشروع) أو ملاحظة حل";
  return null;
}
export function validateDecisionStatus(d, to) {
  if (to === "Superseded" && !d.superseded_by_id) return "V-16: القرار الذي حلّ محله مطلوب";
  return null;
}
// risk lifecycle
export const RISK_NEXT = { Open: ["In Mitigation", "Closed", "Materialized"], "In Mitigation": ["Open", "Closed", "Materialized"], Closed: ["Open"], Materialized: [] };
export const ISSUE_NEXT = { Open: ["In Progress", "Resolved"], "In Progress": ["Open", "Resolved"], Resolved: ["Closed", "In Progress"], Closed: ["In Progress"] };

// ── PRD ─────────────────────────────────────────────────────────────
export const PRD_REQUIRED = ["tldr", "problem_overview", "proposed_solution", "success_metrics"];
export function prdApprovalReady(prd, sections, approvals) {
  const missing = [];
  if (!String(prd.tldr || "").trim()) missing.push("TLDR");
  const get = (k) => String(((sections || []).find((s) => s.key === k) || {}).content || "").trim();
  if (!get("problem_overview")) missing.push("نظرة عامة على المشكلة");
  if (!get("proposed_solution")) missing.push("الحل المقترح");
  if (!get("success_metrics")) missing.push("مقاييس النجاح");
  const reviewers = prd.reviewer_ids || [];
  const notApproved = reviewers.filter((r) => !(approvals || []).some((a) => a.reviewer_id === r && a.decision === "approve" && a.version === (prd.version || 1)));
  return { ok: !missing.length && !notApproved.length, missing, pendingReviewers: notApproved };
}

// ── OKR ─────────────────────────────────────────────────────────────
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export function krProgress(kr, projectProgress) {
  if (kr.type === "Project Based") {
    const vals = (kr.project_ids || []).map((id) => projectProgress[id]).filter((v) => v != null);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  }
  const den = (kr.target_value ?? 0) - (kr.initial_value ?? 0); if (!den) return null;
  const raw = ((kr.current_value ?? kr.initial_value ?? 0) - (kr.initial_value ?? 0)) / den;
  return { raw, clamped: clamp(raw, 0, 1) };
}
export function krProgressValue(kr, pp) { const r = krProgress(kr, pp); if (r == null) return null; return typeof r === "number" ? r : r.clamped; }

// Task execution is deliberately separate from KR outcome progress. A linked task group
// contributes its active leaf tasks; overlapping groups are counted once.
export function krTaskExecution(kr, idx) {
  const roots = [...new Set(Array.isArray(kr?.task_ids) ? kr.task_ids.filter(Boolean) : [])];
  if (!idx) return { roots: [], tasks: [], leafTotal: 0, leafDone: 0, progress: null };
  const ids = new Set();
  roots.forEach((id) => { if (idx.byId[id]) { ids.add(id); idx.descendants(id).forEach((childId) => ids.add(childId)); } });
  const tasks = [...ids].map((id) => idx.byId[id]).filter(Boolean);
  const leaves = tasks.filter((task) => idx.isLeaf(task.id) && cat(task.status) !== "cancelled");
  const leafDone = leaves.filter((task) => cat(task.status) === "done").length;
  return { roots: roots.filter((id) => !!idx.byId[id]), tasks, leafTotal: leaves.length, leafDone, progress: leaves.length ? leafDone / leaves.length : null };
}
export function objectiveTaskExecution(obj, krs, idx) {
  const linkedKrs = (krs || []).filter((kr) => kr.objective_id === obj?.id && isActiveRec(kr));
  const ids = new Set();
  linkedKrs.forEach((kr) => (kr.task_ids || []).forEach((id) => {
    if (idx?.byId[id]) { ids.add(id); idx.descendants(id).forEach((childId) => ids.add(childId)); }
  }));
  const tasks = [...ids].map((id) => idx.byId[id]).filter(Boolean);
  const leaves = tasks.filter((task) => idx.isLeaf(task.id) && cat(task.status) !== "cancelled");
  const leafDone = leaves.filter((task) => cat(task.status) === "done").length;
  return { tasks, leafTotal: leaves.length, leafDone, progress: leaves.length ? leafDone / leaves.length : null };
}
export function objectiveProgress(obj, krs, pp) {
  const vals = krs.filter((k) => k.objective_id === obj.id && isActiveRec(k)).map((k) => krProgressValue(k, pp)).filter((v) => v != null);
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
}
export function pace(progress, startDate, endDate, status, today, settings) {
  const set = settings || DEFAULT_SETTINGS;
  if (status === "Achieved") return "Achieved";
  if (progress == null) return "NotMeasurable";
  if (today < startDate) return "NotStarted";
  const total = Math.max(1, diffDays(endDate, startDate)); const expected = clamp(diffDays(today, startDate) / total, 0, 1);
  const gap = progress - expected;
  if (gap >= -set.paceOnTrack) return "OnTrack"; if (gap >= -set.paceAtRisk) return "AtRisk"; return "Behind";
}
export const PACE_META = { OnTrack: { label: "على المسار", color: "#10B981" }, AtRisk: { label: "معرّض للخطر", color: "#F59E0B" }, Behind: { label: "متأخر", color: "#EF4444" }, Achieved: { label: "تحقق", color: "#3B82F6" }, NotStarted: { label: "لم يبدأ", color: "#94A3B8" }, NotMeasurable: { label: "غير قابل للقياس", color: "#94A3B8" } };

// ── contacts ────────────────────────────────────────────────────────
export function contactStatus(c, today) {
  const last = [c.last_contact_at, c.last_meeting_at].filter(Boolean).sort().slice(-1)[0];
  if (!last) return { status: "NoContact", daysSince: null, last: null };
  const d = diffDays(today, last);
  return { status: d > 60 ? "Needs" : d > 30 ? "Soon" : "InTouch", daysSince: d, last };
}
export const CONTACT_META = { NoContact: { label: "لا تواصل مسجّل", color: "#94A3B8" }, Needs: { label: "يحتاج تواصلاً", color: "#EF4444" }, Soon: { label: "قريباً", color: "#F59E0B" }, InTouch: { label: "على تواصل", color: "#10B981" } };
export function possibleDuplicates(contacts, c) {
  const n = (s) => String(s || "").trim().toLowerCase();
  return contacts.filter((o) => o.id !== c.id && isLive(o) && ((n(o.email) && n(o.email) === n(c.email)) || (n(o.name) && n(o.name) === n(c.name))));
}

// ── feeds, workload, alerts ─────────────────────────────────────────
export function taskVisibleToMember(t, memberId) { return t.assignee_id === memberId; }
export function todayFeed(memberId, ctx) {
  const { idx, issues, projects, contacts, today, settings } = ctx; const set = settings || DEFAULT_SETTINGS;
  const mine = idx.list.filter((t) => idx.isLeaf(t.id) && t.assignee_id === memberId && ["todo", "active"].includes(cat(t.status)));
  const overdue = mine.filter((t) => isOverdueLeaf(t, idx, today));
  const dueToday = mine.filter((t) => t.due_date === today);
  const thisWeek = mine.filter((t) => t.planning_bucket === "This Week" && !overdue.includes(t) && !dueToday.includes(t));
  const criticalIssues = (issues || []).filter((i) => isOpenIssue(i) && i.severity === "Critical" && i.owner_id === memberId);
  const ledSoon = (projects || []).filter((p) => isActiveRec(p) && p.lead_id === memberId && ["Planned", "In Progress"].includes(p.status) && p.target_date && diffDays(p.target_date, today) >= 0 && diffDays(p.target_date, today) <= 7);
  const followUps = (contacts || []).filter((c) => isActiveRec(c) && c.follow_up_date && c.follow_up_date <= today);
  return { overdue, dueToday, thisWeek, criticalIssues, ledSoon, followUps };
}
export function memberWorkload(memberId, ws, ctx) {
  const { idx } = ctx; const end = addDays(ws, 6);
  const mine = idx.list.filter((t) => idx.isLeaf(t.id) && t.assignee_id === memberId && ["todo", "active"].includes(cat(t.status)) && (t.planning_bucket === "This Week" || (t.due_date && t.due_date >= ws && t.due_date <= end)));
  return { tasks: mine, minutes: mine.reduce((a, t) => a + (t.estimated_minutes || 0), 0) };
}
export function coverageOf(project, idx) {
  const active = idx.list.filter((t) => t.project_id === project.id && idx.isLeaf(t.id) && cat(t.status) !== "cancelled");
  if (!active.length) return null;
  const unlinked = active.filter((t) => !t.prd_id && !(t.discovery_ids && t.discovery_ids.length));
  return { ratio: (active.length - unlinked.length) / active.length, unlinked };
}
export function traceabilityBlocked(policy, projectType, isSystem, task) {
  if (policy.traceabilityPolicy !== "require" || isSystem) return false;
  if (!(policy.traceabilityTypes || []).includes(projectType)) return false;
  return !task.prd_id && !(task.discovery_ids && task.discovery_ids.length) && !(task.issue_ids && task.issue_ids.length);
}
// client-side automations → in-app alerts with dedupe keys (A-09/10/11/12/15/16/17/18/20/21)
export function computeAlerts(memberId, ctx) {
  const { idx, issues, projects, contacts, discovery, krs, checkins, timers, wins, today, settings, metrics } = ctx; const set = settings || DEFAULT_SETTINGS; const au = set.automations || {}; const out = [];
  const mine = idx.list.filter((t) => idx.isLeaf(t.id) && t.assignee_id === memberId && ["todo", "active"].includes(cat(t.status)));
  if (au.overdueDigest !== false) { const od = mine.filter((t) => isOverdueLeaf(t, idx, today)); if (od.length) out.push({ key: "overdue:" + today, kind: "overdue", level: "bad", text: `${od.length} مهمة متأخرة مسندة إليك`, ids: od.map((t) => t.id) }); }
  if (au.dueReminders !== false) { const soon = mine.filter((t) => t.due_date && diffDays(t.due_date, today) >= 0 && diffDays(t.due_date, today) <= set.dueSoonDays); if (soon.length) out.push({ key: "due:" + today, kind: "due", level: "warn", text: `${soon.length} مهمة مستحقة خلال ${set.dueSoonDays === 0 ? "اليوم" : set.dueSoonDays + " يوم"}`, ids: soon.map((t) => t.id) }); }
  if (au.healthAlerts !== false) (projects || []).filter((p) => isActiveRec(p) && (p.lead_id === memberId || (p.members || []).some((m) => m.member_id === memberId))).forEach((p) => { const m = metrics && metrics[p.id]; if (m && (m.health === "Red" || m.health === "Orange")) out.push({ key: "health:" + p.id + ":" + m.health, kind: "health", level: m.health === "Red" ? "bad" : "warn", text: `صحة مشروع «${p.name}»: ${HEALTH_META[m.health].label}`, project: p.id }); });
  (issues || []).filter((i) => isOpenIssue(i) && i.severity === "Critical" && i.owner_id === memberId).forEach((i) => out.push({ key: "crit:" + i.id, kind: "issue", level: "bad", text: `مشكلة حرجة مفتوحة: ${i.title}`, project: i.project_id }));
  (contacts || []).filter((c) => isActiveRec(c) && c.follow_up_date && c.follow_up_date <= today).forEach((c) => out.push({ key: "fu:" + c.id + ":" + c.follow_up_date, kind: "contact", level: "warn", text: `موعد متابعة: ${c.name}` }));
  if (au.staleInbox !== false) { const st = (discovery || []).filter((d) => isActiveRec(d) && d.status === "Inbox" && d.logged_at && diffDays(today, d.logged_at) > set.inboxStaleDays); if (st.length) out.push({ key: "stale:" + today, kind: "inbox", level: "warn", text: `${st.length} عنصر في صندوق الاكتشاف أقدم من ${set.inboxStaleDays} يوماً — يحتاج فرزاً` }); }
  if (au.krCheckin !== false) (krs || []).filter((k) => isActiveRec(k) && k.type === "Numeric" && k.owner_id === memberId).forEach((k) => { const last = (checkins || []).filter((c) => c.kr_id === k.id).map((c) => c.checked_at).sort().slice(-1)[0]; if (!last || diffDays(today, dateOf(last, set.timezone)) >= 7) out.push({ key: "kr:" + k.id + ":" + weekStart(today, set.weekStartDay), kind: "kr", level: "info", text: `حان Check-in للنتيجة: ${k.name}` }); });
  if (au.timerLong !== false) (timers || []).filter((t) => t.member_id === memberId && !t.ended_at).forEach((t) => { if ((Date.now() - new Date(t.started_at).getTime()) / 3600000 > set.timerMaxHours) out.push({ key: "timer:" + t.id, kind: "timer", level: "warn", text: `المؤقّت شغّال منذ أكثر من ${set.timerMaxHours} ساعات` }); });
  return out;
}

// ── templates ───────────────────────────────────────────────────────
export function instantiateProjectTemplate(tpl, opts, newId) {
  const start = opts.start_date || null; const projectId = newId();
  const project = { id: projectId, name: opts.name, type: opts.type || tpl.project_type || "أخرى", status: "Planned", priority: opts.priority || "Medium", start_date: start, target_date: opts.target_date || (start && tpl.duration_days ? addDays(start, tpl.duration_days) : null), description: tpl.description || "", final_goal: opts.final_goal || tpl.final_goal || "", lead_id: opts.lead_id || null, visibility: "workspace", template_id: tpl.id, members: opts.lead_id ? [{ member_id: opts.lead_id, role: "Lead" }] : [], links: [] };
  const tasks = []; let order = 0;
  const walk = (nodes, parentId) => nodes.forEach((n) => {
    const id = newId(); order += 1;
    tasks.push({ id, project_id: projectId, parent_task_id: parentId, title: n.title, description: n.description || "", status: "Not Started", priority: n.priority || "Medium", planning_bucket: "Inbox", due_date: start && n.offset_days != null ? addDays(start, n.offset_days) : null, estimated_minutes: n.estimate_minutes || null, sort_order: order });
    if (n.children && n.children.length) walk(n.children, id);
  });
  walk(tpl.task_tree || [], null);
  const risks = (tpl.risks || []).map((r) => ({ id: newId(), project_id: projectId, title: r.title, probability: r.probability || 2, impact: r.impact || 3, status: "Open", mitigation: r.mitigation || "" }));
  return { project, tasks, risks };
}

// ── weekly review live metrics ──────────────────────────────────────
export function reviewLive(memberId, weekStartDate, ctx) {
  const { idx, wins, sessions, issues, risks, checkins, projects, metrics, settings } = ctx; const end = addDays(weekStartDate, 6); const tz = settings && settings.timezone;
  const inWeek = (d) => d && d >= weekStartDate && d <= end;
  const doneTasks = idx.list.filter((t) => idx.isLeaf(t.id) && cat(t.status) === "done" && t.assignee_id === memberId && t.completed_at && inWeek(dateOf(t.completed_at, tz)));
  const minutes = (sessions || []).filter((s) => isLive(s) && !s.voided_at && s.member_id === memberId && inWeek(s.date)).reduce((a, s) => a + (s.minutes || 0), 0);
  const overdue = idx.list.filter((t) => idx.isLeaf(t.id) && t.assignee_id === memberId && isOverdueLeaf(t, idx, addDays(end, 0) < ctx.today ? end : ctx.today));
  return {
    wins: (wins || []).filter((w) => isActiveRec(w) && w.member_id === memberId && inWeek(w.achieved_on)),
    doneTasks, minutes, overdueCount: overdue.length,
    newIssues: (issues || []).filter((i) => isActiveRec(i) && inWeek(i.discovered_at)).length,
    newRisks: (risks || []).filter((r) => isActiveRec(r) && inWeek(dateOf(r.created_at || end, tz))).length,
    checkins: (checkins || []).filter((c) => c.member_id === memberId && inWeek(dateOf(c.checked_at, tz))).length,
    redProjects: (projects || []).filter((p) => isActiveRec(p) && metrics && metrics[p.id] && metrics[p.id].health === "Red").length,
  };
}
export const quarterOf = quarterLabel;
export { todayStr, addDays, diffDays, weekStart };
