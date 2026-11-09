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

export function validateTaskDependencies(task, tasksById = {}) {
  const errors = [];
  const raw = task?.dependency_task_ids;
  if (raw != null && !Array.isArray(raw)) return ["قائمة المهام السابقة يجب أن تكون قائمة صالحة."];
  const ids = Array.isArray(raw) ? raw : [];
  if (new Set(ids).size !== ids.length) errors.push("لا يمكن تكرار المهمة السابقة في قائمة الاعتماد.");
  for (const dependencyId of ids) {
    if (!dependencyId) { errors.push("توجد علاقة اعتماد بلا مهمة محددة."); continue; }
    if (dependencyId === task.id) { errors.push("لا يمكن أن تعتمد المهمة على نفسها."); continue; }
    const dependency = tasksById[dependencyId];
    if (!dependency || dependency.deleted_at || dependency.archived_at) {
      errors.push("إحدى المهام السابقة غير موجودة أو مؤرشفة.");
      continue;
    }
    if (dependency.project_id !== task.project_id) {
      errors.push("المهمة السابقة يجب أن تكون من المشروع نفسه.");
      continue;
    }
    let parentId = task.parent_task_id;
    const ancestorIds = new Set();
    while (parentId && !ancestorIds.has(parentId)) {
      ancestorIds.add(parentId);
      if (parentId === dependencyId) break;
      parentId = tasksById[parentId]?.parent_task_id || null;
    }
    if (ancestorIds.has(dependencyId)) {
      errors.push("لا يمكن ربط المهمة بمهمة أب لها داخل شجرة المهام؛ استخدم مهمة تنفيذ مستقلة من نفس المستوى.");
      continue;
    }
    let dependencyParentId = dependency.parent_task_id;
    const hierarchySeen = new Set();
    let isDescendant = false;
    while (dependencyParentId && !hierarchySeen.has(dependencyParentId)) {
      if (dependencyParentId === task.id) { isDescendant = true; break; }
      hierarchySeen.add(dependencyParentId);
      dependencyParentId = tasksById[dependencyParentId]?.parent_task_id || null;
    }
    if (isDescendant) {
      errors.push("لا يمكن ربط المهمة بمهمة فرعية تابعة لها؛ استخدم مهمة تنفيذ مستقلة.");
      continue;
    }
    // A dependency edge is task → predecessor. Adding it is cyclic when
    // the predecessor already reaches this task through its own predecessors.
    const stack = [dependencyId];
    const seen = new Set();
    let cycle = false;
    while (stack.length && !cycle) {
      const currentId = stack.pop();
      if (currentId === task.id) { cycle = true; break; }
      if (seen.has(currentId)) continue;
      seen.add(currentId);
      const current = tasksById[currentId];
      (Array.isArray(current?.dependency_task_ids) ? current.dependency_task_ids : []).forEach((id) => {
        if (tasksById[id] && !tasksById[id].deleted_at && !tasksById[id].archived_at) stack.push(id);
      });
    }
    if (cycle) errors.push("علاقة الاعتماد ستنشئ دورة بين المهام؛ راجع ترتيب المهام السابقة.");
  }
  return [...new Set(errors)];
}

export function analyzeTaskSchedule(tasks = []) {
  const list = (tasks || []).filter((task) => task && !task.deleted_at && !task.archived_at);
  const byId = Object.fromEntries(list.map((task) => [task.id, task]));
  const dated = list.filter((task) => task.start_date || task.due_date);
  const datedById = Object.fromEntries(dated.map((task) => [task.id, task]));
  const ids = dated.map((task) => task.id);
  const predecessors = {};
  const successors = {};
  const durations = {};
  const missingPredecessors = [];
  const cancelledPredecessors = [];
  for (const task of dated) {
    const allDeps = [...new Set(Array.isArray(task.dependency_task_ids) ? task.dependency_task_ids : [])];
    predecessors[task.id] = allDeps.filter((id) => !!datedById[id]);
    successors[task.id] = [];
    const missing = allDeps.filter((id) => !byId[id] || !datedById[id]);
    missing.forEach((id) => missingPredecessors.push({ task_id: task.id, dependency_task_id: id }));
    allDeps.filter((id) => byId[id] && cat(byId[id].status) === "cancelled")
      .forEach((id) => cancelledPredecessors.push({ task_id: task.id, dependency_task_id: id }));
    const from = task.start_date || task.due_date;
    const to = task.due_date || task.start_date;
    durations[task.id] = Math.max(1, diffDays(to < from ? from : to, to < from ? to : from) + 1);
  }
  for (const task of dated) {
    for (const predecessorId of predecessors[task.id]) successors[predecessorId].push(task.id);
  }
  const indegree = Object.fromEntries(ids.map((id) => [id, predecessors[id].length]));
  const queue = ids.filter((id) => indegree[id] === 0);
  const order = [];
  while (queue.length) {
    const id = queue.shift();
    order.push(id);
    for (const nextId of successors[id]) {
      indegree[nextId] -= 1;
      if (indegree[nextId] === 0) queue.push(nextId);
    }
  }
  const cyclic = order.length !== ids.length;
  const conflicts = [];
  for (const task of dated) {
    const start = task.start_date || task.due_date;
    for (const predecessorId of predecessors[task.id]) {
      const predecessor = datedById[predecessorId];
      const predecessorEnd = predecessor.due_date || predecessor.start_date;
      if (start <= predecessorEnd) conflicts.push({
        task_id: task.id,
        dependency_task_id: predecessorId,
        start_date: start,
        predecessor_end: predecessorEnd,
      });
    }
  }
  if (!dated.length || cyclic) {
    return {
      task_count: dated.length,
      project_duration_days: null,
      critical_task_ids: [],
      earliest_start: {},
      earliest_finish: {},
      latest_start: {},
      total_float: {},
      edges: dated.flatMap((task) => predecessors[task.id].map((id) => ({ from: id, to: task.id }))),
      missing_predecessors: missingPredecessors,
      cancelled_predecessors: cancelledPredecessors,
      conflicts,
      cyclic,
      complete: dated.length > 0 && !cyclic && !missingPredecessors.length && !cancelledPredecessors.length,
    };
  }
  const earliestStart = {};
  const earliestFinish = {};
  for (const id of order) {
    earliestStart[id] = predecessors[id].reduce((max, previousId) => Math.max(max, earliestFinish[previousId] || 0), 0);
    earliestFinish[id] = earliestStart[id] + durations[id];
  }
  const projectDuration = Math.max(0, ...ids.map((id) => earliestFinish[id] || 0));
  const latestStart = {};
  const latestFinish = {};
  for (const id of [...order].reverse()) {
    latestFinish[id] = successors[id].length
      ? Math.min(...successors[id].map((nextId) => latestStart[nextId]))
      : projectDuration;
    latestStart[id] = latestFinish[id] - durations[id];
  }
  const totalFloat = {};
  for (const id of ids) totalFloat[id] = latestStart[id] - earliestStart[id];
  const criticalTaskIds = ids.filter((id) => totalFloat[id] === 0);
  return {
    task_count: dated.length,
    project_duration_days: missingPredecessors.length || cancelledPredecessors.length ? null : projectDuration,
    critical_task_ids: missingPredecessors.length || cancelledPredecessors.length ? [] : criticalTaskIds,
    earliest_start: earliestStart,
    earliest_finish: earliestFinish,
    latest_start: latestStart,
    total_float: totalFloat,
    edges: dated.flatMap((task) => predecessors[task.id].map((id) => ({ from: id, to: task.id }))),
    missing_predecessors: missingPredecessors,
    cancelled_predecessors: cancelledPredecessors,
    conflicts,
    cyclic: false,
    complete: missingPredecessors.length === 0 && cancelledPredecessors.length === 0,
  };
}

// ── validation (V-xx) ───────────────────────────────────────────────
export function validateTaskRefs(task, ctx) {
  const errors = []; const { projectsById, tasksById, prdsById } = ctx;
  errors.push(...validateTaskDependencies(task, tasksById));
  if (!task.project_id) errors.push("V-01: المهمة تحتاج مشروعاً صريحاً");
  else if (projectsById && !projectsById[task.project_id]) errors.push("V-22: المشروع غير موجود");
  if (task.parent_task_id) {
    if (task.parent_task_id === task.id) errors.push("V-02: المهمة لا يمكن أن تكون أباً لنفسها");
    const par = tasksById && tasksById[task.parent_task_id];
    if (!par) errors.push("الأب غير موجود");
    else if (par.project_id !== task.project_id) errors.push("V-05: الأب والابن يجب أن يكونا في نفس المشروع");
  }
  if (task.prd_id) { const prd = prdsById && prdsById[task.prd_id]; if (!prd) errors.push("V-22: المواصفة غير موجودة"); else if (prd.project_id !== task.project_id) errors.push("V-06: المواصفة يجب أن تتبع نفس مشروع المهمة"); else if (task.prd_requirement_id && !(prd.requirements || []).some((x) => x.id === task.prd_requirement_id)) errors.push("V-23: متطلب المواصفة لا ينتمي إلى المواصفة المرتبطة"); }
  else if (task.prd_requirement_id) errors.push("V-23: لا يمكن ربط متطلب دون ربط المواصفة");
  if (cat(task.status) === "cancelled" && !task.cancelled_reason) errors.push("V-19: سبب الإلغاء مطلوب");
  return errors;
}
// Prefill a new output with only the still-valid specification relations of its source task.
export function defaultOutputRelationsForTask(task, prds) {
  const prd = task?.prd_id ? (prds || []).find((item) =>
    item.id === task.prd_id && item.project_id === task.project_id && !item.deleted_at && !item.archived_at
  ) : null;
  if (!prd) return { prd_id: "", prd_requirement_id: "" };
  const requirement = task.prd_requirement_id
    ? (prd.requirements || []).find((item) => item.id === task.prd_requirement_id && item.status !== "Deprecated")
    : null;
  return {
    prd_id: prd.id,
    prd_requirement_id: requirement?.id || "",
  };
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
    if (t.prd_id && (!prdsById[t.prd_id] || prdsById[t.prd_id].project_id !== targetProjectId)) { p.prd_id = null; p.prd_requirement_id = null; }
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
  if (ctx.tasksById) taskIds.forEach((id) => { const task = ctx.tasksById[id]; if (!task) e.push("توجد مهمة مرتبطة غير موجودة أو غير نشطة: " + id); else if (Array.isArray(k.project_ids) && k.project_ids.length && !k.project_ids.includes(task.project_id)) e.push("المهمة المرتبطة يجب أن تتبع أحد المشاريع المحددة للنتيجة الرئيسية: " + id); });
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

// Project→Objective is derived through KR→Project→Objective (v4).
// Objectives do not own project_ids; KR.project_ids is the canonical relationship.
export function objectivesForProject(projectId, objectives, krs) {
  if (!projectId) return [];
  const linkedObjectiveIds = new Set((krs || [])
    .filter((kr) => isActiveRec(kr) && Array.isArray(kr.project_ids) && kr.project_ids.includes(projectId))
    .map((kr) => kr.objective_id)
    .filter(Boolean));
  return (objectives || []).filter((objective) => isActiveRec(objective) && linkedObjectiveIds.has(objective.id));
}

// Task execution is derived from KR-linked Projects (v4: Task → Project → KR → Objective).
// Legacy direct task links remain visible as a read-only compatibility fallback until reconciled.
function expandLegacyTaskRoots(rootIds, idx) {
  const ids = new Set();
  const fallbackDescendants = (rootId) => {
    const children = new Map();
    (idx?.list || []).forEach((task) => {
      if (task.parent_task_id) {
        const bucket = children.get(task.parent_task_id) || [];
        bucket.push(task.id);
        children.set(task.parent_task_id, bucket);
      }
    });
    const out = [];
    const queue = [...(children.get(rootId) || [])];
    while (queue.length) {
      const childId = queue.shift();
      out.push(childId);
      queue.push(...(children.get(childId) || []));
    }
    return out;
  };
  (rootIds || []).forEach((id) => {
    if (idx?.byId?.[id]) {
      ids.add(id);
      const descendants = typeof idx.descendants === "function" ? idx.descendants(id) : fallbackDescendants(id);
      descendants.forEach((childId) => ids.add(childId));
    }
  });
  return [...ids].map((id) => idx.byId[id]).filter(Boolean);
}
function taskExecutionSummary(tasks, idx, extra = {}) {
  const byId = new Map((tasks || []).filter(Boolean).map((task) => [task.id, task]));
  const uniqueTasks = [...byId.values()];
  const leaves = uniqueTasks.filter((task) => idx?.isLeaf?.(task.id) && cat(task.status) !== "cancelled");
  const leafDone = leaves.filter((task) => cat(task.status) === "done").length;
  return { tasks: uniqueTasks, leafTotal: leaves.length, leafDone, progress: leaves.length ? leafDone / leaves.length : null, ...extra };
}
export function krTaskExecution(kr, idx) {
  if (!idx) return { roots: [], tasks: [], leafTotal: 0, leafDone: 0, progress: null, projectIds: [] };
  const projectIds = [...new Set(Array.isArray(kr?.project_ids) ? kr.project_ids.filter(Boolean) : [])];
  // New KRs use an explicit task group. Older records without task_ids retain
  // their legacy project-wide execution behavior for backward compatibility.
  const hasExplicitTaskLinks = Array.isArray(kr?.task_ids);
  const linkedRoots = hasExplicitTaskLinks ? [...new Set(kr.task_ids.filter(Boolean))] : [];
  const explicitTasks = expandLegacyTaskRoots(linkedRoots, idx);
  const projectSet = new Set(projectIds);
  const legacyProjectTasks = !hasExplicitTaskLinks && projectIds.length
    ? (idx.list || []).filter((task) => projectSet.has(task.project_id))
    : [];
  const result = taskExecutionSummary([...explicitTasks, ...legacyProjectTasks], idx, {
    roots: linkedRoots.filter((id) => !!idx.byId[id]),
    projectIds,
    legacy: !hasExplicitTaskLinks && legacyProjectTasks.length > 0,
  });
  return result;
}
export function objectiveTaskExecution(obj, krs, idx) {
  if (!idx) return { tasks: [], leafTotal: 0, leafDone: 0, progress: null, projectIds: [], legacyTaskCount: 0 };
  const linkedKrs = (krs || []).filter((kr) => kr.objective_id === obj?.id && isActiveRec(kr));
  const projectIds = [...new Set(linkedKrs.flatMap((kr) => Array.isArray(kr.project_ids) ? kr.project_ids.filter(Boolean) : []))];
  const directLegacyRoots = (idx.list || []).filter((task) => task.objective_id === obj?.id).map((task) => task.id);
  const directLegacyTasks = expandLegacyTaskRoots(directLegacyRoots, idx);
  const krTaskGroups = linkedKrs.map((kr) => {
    const explicit = Array.isArray(kr.task_ids);
    const tasks = explicit
      ? expandLegacyTaskRoots(kr.task_ids || [], idx)
      : (Array.isArray(kr.project_ids) && kr.project_ids.length
        ? (idx.list || []).filter((task) => kr.project_ids.includes(task.project_id))
        : []);
    return { kr, tasks, legacy: !explicit };
  });
  const linkedTasks = krTaskGroups.flatMap(({ tasks }) => tasks);
  const legacyKrTasks = krTaskGroups.filter(({ legacy }) => legacy).flatMap(({ tasks }) => tasks);
  const legacyTasks = [...directLegacyTasks, ...linkedTasks];
  const linkedTaskIds = new Set(linkedTasks.map((task) => task.id));
  const legacyDirectOnly = directLegacyTasks.filter((task) => !linkedTaskIds.has(task.id));
  const legacyTaskCount = new Set([...legacyDirectOnly, ...legacyKrTasks].map((task) => task.id)).size;
  const result = taskExecutionSummary(legacyTasks, idx, {
    projectIds,
    legacyTaskCount,
  });
  return result;
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
// Build a reusable, identity-free template draft from a live project.
// Runtime state (people, sessions, approvals, completion and absolute dates) is deliberately omitted.
export function projectToTemplateSeed(project, data = {}) {
  if (!project?.id) throw new Error("اختر مشروعًا صالحًا لتحويله إلى قالب.");
  const tasks = (data.tasks || []).filter((task) =>
    task.project_id === project.id && !task.deleted_at && !task.archived_at
  );
  const taskById = Object.fromEntries(tasks.map((task) => [task.id, task]));
  const dependencyTitleCounts = new Map();
  for (const task of tasks) {
    const title = String(task.title || "").trim();
    dependencyTitleCounts.set(title, (dependencyTitleCounts.get(title) || 0) + 1);
  }
  const conversionWarnings = [];
  const ordered = (items) => [...items].sort((a, b) =>
    (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0) ||
    String(a.created_at || "").localeCompare(String(b.created_at || "")) ||
    String(a.title || "").localeCompare(String(b.title || ""))
  );
  const children = new Map();
  const roots = [];
  for (const task of ordered(tasks)) {
    const parent = task.parent_task_id && taskById[task.parent_task_id];
    if (parent && parent.id !== task.id) {
      const list = children.get(parent.id) || [];
      list.push(task);
      children.set(parent.id, list);
    } else {
      roots.push(task);
    }
  }
  // An invalid cycle or orphan must not disappear from the converted structure.
  const treeIds = new Set();
  const toNode = (task, ancestry = new Set()) => {
    if (treeIds.has(task.id) || ancestry.has(task.id)) return null;
    treeIds.add(task.id);
    const nextAncestry = new Set(ancestry);
    nextAncestry.add(task.id);
    const dependencyTitles = [];
    const sourceTitle = String(task.title || "").trim();
    if ((task.dependency_task_ids || []).length && dependencyTitleCounts.get(sourceTitle) !== 1) {
      conversionWarnings.push("لم تُنقل روابط الاعتماد من «" + sourceTitle + "» لأن عنوان المهمة المصدر مكرر.");
    }
    for (const dependencyId of (dependencyTitleCounts.get(sourceTitle) === 1 ? (task.dependency_task_ids || []) : [])) {
      const dependency = taskById[dependencyId];
      if (!dependency) {
        conversionWarnings.push("تعذر نقل اعتماد غير متاح من المهمة «" + task.title + "».");
        continue;
      }
      const dependencyTitle = String(dependency.title || "").trim();
      if (!dependencyTitle || dependencyTitleCounts.get(dependencyTitle) !== 1) {
        conversionWarnings.push("لم يُنقل اعتماد «" + task.title + "» إلى «" + dependencyTitle + "» لأن عنوان المهمة السابقة مكرر أو فارغ.");
        continue;
      }
      if (dependency.id === task.id) {
        conversionWarnings.push("أُزيل اعتماد ذاتي من المهمة «" + task.title + "» أثناء تحويلها إلى قالب.");
        continue;
      }
      dependencyTitles.push(dependencyTitle);
    }
    const node = {
      title: String(task.title || "").trim(),
      ...(Number(task.estimated_minutes) > 0 ? { estimate_minutes: Number(task.estimated_minutes) } : {}),
      ...(!!(task.milestone || task.template_kind === "Milestone") ? { milestone: true } : {}),
      ...(dependencyTitles.length ? { dependency_titles: [...new Set(dependencyTitles)] } : {}),
    };
    const date = task.start_date || task.due_date || null;
    if (date) node.__template_date = String(date).slice(0, 10);
    const nested = ordered(children.get(task.id) || []).map((child) => toNode(child, nextAncestry)).filter(Boolean);
    if (nested.length) node.children = nested;
    return node;
  };
  let taskTree = ordered(roots).map((task) => toNode(task)).filter(Boolean);
  // Recover any nodes left unvisited by cyclic parent references as independent roots.
  for (const task of ordered(tasks)) {
    if (!treeIds.has(task.id)) {
      const node = toNode(task);
      if (node) taskTree.push(node);
    }
  }

  const dateValues = [
    project.start_date,
    ...tasks.flatMap((task) => [task.start_date, task.due_date]),
  ].filter(Boolean).map((value) => String(value).slice(0, 10)).filter((value) => /^\d{4}-\d{2}-\d{2}$/.test(value)).sort();
  const baseline = dateValues[0] || null;
  const utcDay = (value) => Date.parse(value + "T00:00:00Z");
  const toOffsets = (nodes) => nodes.forEach((node) => {
    if (node.__template_date && baseline) {
      const offset = Math.round((utcDay(node.__template_date) - utcDay(baseline)) / 86400000);
      if (Number.isFinite(offset) && offset >= 0) node.offset_days = offset;
    }
    delete node.__template_date;
    toOffsets(node.children || []);
  });
  toOffsets(taskTree);
  const durationDays = baseline && project.target_date
    ? Math.round((utcDay(String(project.target_date).slice(0, 10)) - utcDay(baseline)) / 86400000)
    : null;

  const prds = (data.prds || []).filter((prd) =>
    prd.project_id === project.id && !prd.deleted_at && !prd.archived_at
  );
  const taskCountsByTitle = new Map();
  for (const task of tasks) {
    const title = String(task.title || "").trim();
    taskCountsByTitle.set(title, (taskCountsByTitle.get(title) || 0) + 1);
  }
  const uniqueTaskTitle = (taskId) => {
    const task = taskById[taskId];
    if (!task) return null;
    const title = String(task.title || "").trim();
    return title && taskCountsByTitle.get(title) === 1 ? title : null;
  };
  const prdTemplates = prds.map((prd) => ({
    title: String(prd.title || "").trim(),
    tldr: String(prd.tldr || "").trim(),
    requirements: (prd.requirements || []).filter((req) => req.status !== "Deprecated").map((req) => {
      const linked = tasks.filter((task) => task.prd_id === prd.id && task.prd_requirement_id === req.id);
      if (linked.length > 0 && (linked.length !== 1 || !uniqueTaskTitle(linked[0].id))) {
        conversionWarnings.push("لم يُنقل ربط المتطلب «" + req.title + "» بمهمة محددة لأن رابط المهمة مكرر أو ملتبس.");
      }
      return {
        title: String(req.title || "").trim(),
        acceptance_criteria: String(req.acceptance_criteria || "").trim(),
        priority: req.priority || "Medium",
        task_title: linked.length === 1 ? uniqueTaskTitle(linked[0].id) : null,
      };
    }),
  })).filter((prd) => prd.title);
  const prdById = Object.fromEntries(prds.map((prd) => [prd.id, prd]));
  const outputs = (data.outputs || []).filter((output) =>
    output.project_id === project.id && !output.deleted_at && !output.archived_at
  ).map((output) => {
    const prd = output.prd_id ? prdById[output.prd_id] : null;
    const requirement = prd && output.prd_requirement_id
      ? (prd.requirements || []).find((item) => item.id === output.prd_requirement_id)
      : null;
    const taskTitle = output.task_id ? uniqueTaskTitle(output.task_id) : null;
    if (output.task_id && !taskTitle) {
      conversionWarnings.push("لم يُنقل ربط المخرج «" + output.name + "» بمهمة محددة لأن عنوان المهمة المصدر مكرر أو غير متاح.");
    }
    return {
      name: String(output.name || "").trim(),
      type: output.type || "Other",
      task_title: taskTitle,
      prd_title: prd?.title || null,
      requirement_title: requirement?.status === "Deprecated" ? null : (requirement?.title || null),
    };
  }).filter((output) => output.name);

  const sourceObjectives = (data.objectives || []).filter((objective) => isActiveRec(objective));
  const sourceKrs = (data.krs || []).filter((kr) =>
    isActiveRec(kr) && kr.objective_id &&
    Array.isArray(kr.project_ids) && kr.project_ids.includes(project.id)
  );
  const sourceObjectiveIds = new Set(sourceKrs.map((kr) => kr.objective_id));
  const sourceObjectiveMap = new Map(sourceObjectives.map((objective) => [objective.id, objective]));
  const objectiveTemplates = [];
  for (const kr of sourceKrs) {
    if (!sourceObjectiveMap.has(kr.objective_id)) {
      conversionWarnings.push("تعذر نقل النتيجة «" + kr.name + "» لأن الهدف المصدر غير متاح.");
    }
  }
  const selectedObjectives = sourceObjectives
    .filter((objective) => sourceObjectiveIds.has(objective.id))
    .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
  selectedObjectives.forEach((objective, objectiveIndex) => {
    const key = "objective_" + (objectiveIndex + 1);
    const keyResults = sourceKrs.filter((kr) => kr.objective_id === objective.id).map((kr) => {
      const sourceTaskIds = Array.isArray(kr.task_ids) ? kr.task_ids : tasks.map((task) => task.id);
      const linkedTasks = sourceTaskIds.map((id) => taskById[id]).filter((task) => task && task.project_id === project.id);
      const taskTitles = [];
      for (const task of linkedTasks) {
        const title = String(task.title || "").trim();
        if (!title || dependencyTitleCounts.get(title) !== 1) {
          conversionWarnings.push("لم تُنقل مهمة مرتبطة بنتيجة «" + kr.name + "» لأن عنوانها مكرر أو فارغ.");
          continue;
        }
        if (!taskTitles.includes(title)) taskTitles.push(title);
      }
      if (kr.type === "Numeric") {
        const initialValue = Number(kr.initial_value);
        const targetValue = Number(kr.target_value);
        if (!Number.isFinite(initialValue) || !Number.isFinite(targetValue) || initialValue === targetValue) {
          conversionWarnings.push("لم تُنقل القيم الرقمية للنتيجة «" + kr.name + "» لأنها لا تحتوي على خط أساس وهدف صالحين.");
          return null;
        }
        return { name: String(kr.name || "").trim(), type: "Numeric", unit: String(kr.unit || ""), initial_value: initialValue, target_value: targetValue, task_titles: taskTitles };
      }
      if (kr.type !== "Project Based") {
        conversionWarnings.push("لم تُنقل النتيجة «" + kr.name + "» لأن نوعها غير مدعوم في قوالب المشاريع.");
        return null;
      }
      return { name: String(kr.name || "").trim(), type: "Project Based", task_titles: taskTitles };
    }).filter(Boolean);
    objectiveTemplates.push({ key, name: String(objective.name || "").trim(), why: String(objective.why || "").trim(), key_results: keyResults });
  });
  for (const objective of objectiveTemplates) {
    if (!objective.key_results.length) conversionWarnings.push("الهدف «" + objective.name + "» لا يحتوي على نتائج رئيسية قابلة للنقل إلى القالب.");
  }
  const risks = (data.risks || []).filter((risk) =>
    risk.project_id === project.id && !risk.deleted_at && !risk.archived_at
  ).map((risk) => ({
    title: String(risk.title || "").trim(),
    probability: Math.max(1, Math.min(5, Number(risk.probability) || 3)),
    impact: Math.max(1, Math.min(5, Number(risk.impact) || 3)),
    mitigation: String(risk.mitigation || "").trim(),
  })).filter((risk) => risk.title);

  return {
    name: String(project.name || "مشروع").trim() + " — قالب",
    description: String(project.description || "").trim(),
    final_goal: String(project.final_goal || "").trim(),
    project_type: project.type || "أخرى",
    duration_days: Number.isFinite(durationDays) && durationDays >= 0 ? durationDays : "",
    task_tree: taskTree,
    objective_templates: objectiveTemplates.filter((objective) => objective.key_results.length > 0),
    conversion_warnings: conversionWarnings,
    prd_templates: prdTemplates,
    output_templates: outputs,
    risks,
    decision_prompts: [...new Set((project.decision_prompts || []).map((value) => String(value || "").trim()).filter(Boolean))],
    team_roles: [...new Set((project.template_roles || []).map((value) => String(value || "").trim()).filter(Boolean))],
    checklist: [...new Set((project.template_checklist || []).map((value) => String(value || "").trim()).filter(Boolean))],
  };
}

export function instantiateProjectTemplate(tpl, opts, newId) {
  const start = opts.start_date || null; const projectId = newId();
  const project = {
    id: projectId, name: opts.name, type: opts.type || tpl.project_type || "أخرى", status: "Planned",
    priority: opts.priority || "Medium", start_date: start,
    target_date: opts.target_date || (start && tpl.duration_days ? addDays(start, tpl.duration_days) : null),
    description: opts.description || tpl.description || "", final_goal: opts.final_goal || tpl.final_goal || "",
    lead_id: opts.lead_id || null, visibility: "workspace", template_id: tpl.id,
    members: opts.lead_id ? [{ member_id: opts.lead_id, role: "Lead" }] : [], links: [],
    template_roles: [...new Set((tpl.team_roles || []).map((role) => String(role || "").trim()).filter(Boolean))],
    decision_prompts: (tpl.decision_prompts || []).map((prompt) => String(prompt || "").trim()).filter(Boolean),
    template_checklist: (tpl.checklist || []).map((item) => String(item || "").trim()).filter(Boolean),
    template_checklist_state: {},
    template_seed: true,
  };
  const tasks = []; let order = 0; const taskByTitle = new Map(); const dependencyDefinitions = [];
  const walk = (nodes, parentId) => (nodes || []).forEach((n) => {
    const id = newId(); order += 1;
    const task = {
      id, project_id: projectId, parent_task_id: parentId, title: n.title, description: n.description || "",
      status: "Not Started", priority: n.priority || "Medium", planning_bucket: "Inbox",
      due_date: start && n.offset_days != null ? addDays(start, n.offset_days) : null,
      estimated_minutes: n.estimate_minutes || null, sort_order: order,
      ...(n.milestone ? { milestone: true, template_kind: "Milestone" } : {}),
    };
    tasks.push(task);
    const sameTitle = taskByTitle.get(String(n.title || "")) || [];
    sameTitle.push(task); taskByTitle.set(String(n.title || ""), sameTitle);
    if (Array.isArray(n.dependency_titles) && n.dependency_titles.length) dependencyDefinitions.push({ task, titles: n.dependency_titles });
    if (n.children && n.children.length) walk(n.children, id);
  });
  walk(tpl.task_tree || [], null);
  for (const definition of dependencyDefinitions) {
    const dependencies = [];
    for (const title of definition.titles) {
      const matches = taskByTitle.get(String(title || "").trim()) || [];
      if (matches.length !== 1) throw new Error("المهمة السابقة «" + title + "» المرتبطة بالمهمة «" + definition.task.title + "» يجب أن تطابق مهمة واحدة بالضبط.");
      if (matches[0].id === definition.task.id) throw new Error("المهمة «" + title + "» لا يمكن أن تعتمد على نفسها.");
      dependencies.push(matches[0].id);
    }
    definition.task.dependency_task_ids = [...new Set(dependencies)];
  }
  const tasksById = Object.fromEntries(tasks.map((task) => [task.id, task]));
  for (const task of tasks) {
    const dependencyErrors = validateTaskDependencies(task, tasksById);
    if (dependencyErrors.length) throw new Error(dependencyErrors[0]);
  }

  const objectives = [];
  const krs = [];
  const objectiveDefinitions = Array.isArray(tpl.objective_templates) ? tpl.objective_templates : [];
  if (objectiveDefinitions.length && (!project.start_date || !project.target_date || project.start_date > project.target_date)) {
    throw new Error("هذا القالب يحتوي على أهداف ونتائج رئيسية؛ حدد تاريخ بدء وموعدًا مستهدفًا للمشروع أو مدة إرشادية حتى تُنشأ فترة الهدف بصورة صحيحة.");
  }
  const objectiveNames = new Set();
  for (const definition of objectiveDefinitions) {
    const objectiveName = String(definition.name || "").trim();
    if (!objectiveName) throw new Error("كل هدف داخل القالب يجب أن يحتوي على اسم.");
    if (objectiveNames.has(objectiveName)) throw new Error("اسم الهدف مكرر داخل القالب: " + objectiveName);
    objectiveNames.add(objectiveName);
    const objectiveId = newId();
    const objective = {
      id: objectiveId, name: objectiveName, why: String(definition.why || "").trim(),
      period_start: project.start_date, period_end: project.target_date,
      status: "Active", owner_id: opts.lead_id || null, template_seed: true,
    };
    const definitions = Array.isArray(definition.key_results) ? definition.key_results : [];
    if (!definitions.length) throw new Error("الهدف «" + objectiveName + "» لا يحتوي على نتائج رئيسية.");
    const krNames = new Set();
    for (const krDefinition of definitions) {
      const krName = String(krDefinition.name || "").trim();
      if (!krName) throw new Error("كل نتيجة رئيسية داخل الهدف «" + objectiveName + "» يجب أن تحتوي على اسم.");
      if (krNames.has(krName)) throw new Error("اسم النتيجة الرئيسية مكرر ضمن الهدف «" + objectiveName + "»: " + krName);
      krNames.add(krName);
      const taskIds = [];
      for (const title of (krDefinition.task_titles || [])) {
        const matches = taskByTitle.get(String(title || "").trim()) || [];
        if (matches.length !== 1) throw new Error("المهمة «" + title + "» المرتبطة بالنتيجة «" + krName + "» يجب أن تطابق مهمة واحدة بالضبط.");
        if (matches[0].project_id !== projectId) throw new Error("كل مهمة مرتبطة بالنتيجة «" + krName + "» يجب أن تتبع المشروع الجديد.");
        if (!taskIds.includes(matches[0].id)) taskIds.push(matches[0].id);
      }
      const kr = {
        id: newId(), name: krName, objective_id: objectiveId,
        type: krDefinition.type, owner_id: opts.lead_id || null,
        project_ids: [projectId], task_ids: taskIds, template_seed: true,
        ...(krDefinition.type === "Numeric" ? {
          unit: String(krDefinition.unit || ""),
          initial_value: Number(krDefinition.initial_value),
          target_value: Number(krDefinition.target_value),
          current_value: Number(krDefinition.initial_value),
        } : {}),
      };
      const krErrors = validateKR(kr, { tasksById });
      if (krErrors.length) throw new Error("النتيجة الرئيسية «" + krName + "»: " + krErrors[0]);
      krs.push(kr);
    }
    objectives.push(objective);
  }
  const prds = [];
  const outputs = [];
  const prdByTitle = new Map();
  for (const definition of (tpl.prd_templates || [])) {
    const prdId = newId();
    const requirements = (definition.requirements || []).map((req) => ({
      ...req, id: newId(), title: String(req.title || "").trim(),
      status: "Active", priority: req.priority || "Medium",
      acceptance_criteria: req.acceptance_criteria || "",
    }));
    const prd = {
      id: prdId, project_id: projectId, title: String(definition.title || "").trim(),
      tldr: definition.tldr || "", status: "Not Started", version: 1,
      sections: (definition.sections || []).map((section) => ({ ...section, content: "" })),
      requirements, approvals: [], reviewer_ids: [], lead_id: opts.lead_id || null,
      template_seed: true,
    };
    if (!prd.title) throw new Error("كل مواصفة داخل القالب يجب أن تحتوي على عنوان.");
    if (prdByTitle.has(prd.title)) throw new Error("اسم المواصفة مكرر داخل القالب: " + prd.title);
    prdByTitle.set(prd.title, prd); prds.push(prd);

    for (const req of requirements) {
      if (!req.task_title) continue;
      const matches = taskByTitle.get(String(req.task_title).trim()) || [];
      if (matches.length > 1) throw new Error("عنوان المهمة «" + req.task_title + "» مكرر؛ استخدم عنوانًا فريدًا لربط متطلب القالب.");
      if (matches.length === 1) {
        matches[0].prd_id = prd.id;
        matches[0].prd_requirement_id = req.id;
      }
    }
  }

  for (const definition of (tpl.output_templates || [])) {
    const name = String(definition.name || "").trim();
    if (!name) throw new Error("كل مخرج متوقع داخل القالب يجب أن يحتوي على اسم.");
    let taskId = null, prdId = null, requirementId = null;
    if (definition.task_title) {
      const matches = taskByTitle.get(String(definition.task_title).trim()) || [];
      if (matches.length !== 1) throw new Error("المهمة المصدر للمخرج «" + name + "» يجب أن تطابق مهمة واحدة بالضبط.");
      taskId = matches[0].id;
    }
    if (definition.prd_title) {
      const prd = prdByTitle.get(String(definition.prd_title).trim());
      if (!prd) throw new Error("المواصفة المصدر للمخرج «" + name + "» غير موجودة داخل القالب.");
      prdId = prd.id;
      if (definition.requirement_title) {
        const req = prd.requirements.find((item) => item.title === String(definition.requirement_title).trim());
        if (!req) throw new Error("متطلب المخرج «" + name + "» غير موجود ضمن المواصفة المحددة.");
        requirementId = req.id;
      }
    } else if (definition.requirement_title) {
      throw new Error("لا يمكن ربط مخرج بمتطلب دون تحديد المواصفة.");
    }
    outputs.push({
      id: newId(), project_id: projectId, name, type: definition.type || "Other",
      task_id: taskId, prd_id: prdId, prd_requirement_id: requirementId,
      approval: "Draft", url: "", files: [], notes: definition.notes || "مخرج متوقع من قالب المشروع — أضف الملف أو الرابط عند توفره.",
      template_seed: true,
    });
  }

  const risks = (tpl.risks || []).map((r) => ({
    id: newId(), project_id: projectId, title: r.title, probability: r.probability || 2,
    impact: r.impact || 3, status: "Open", mitigation: r.mitigation || "",
    template_seed: true, needs_review: true,
  }));
  return { project, tasks, objectives, krs, risks, prds, outputs };
}

// ── weekly review live metrics ──────────────────────────────────────
export function reviewLive(memberId, weekStartDate, ctx) {
  const { idx, wins, sessions, issues, risks, decisions, checkins, projects, metrics, settings } = ctx; const end = addDays(weekStartDate, 6); const tz = settings && settings.timezone;
  const inWeek = (d) => d && d >= weekStartDate && d <= end;
  const doneTasks = idx.list.filter((t) => idx.isLeaf(t.id) && cat(t.status) === "done" && t.assignee_id === memberId && t.completed_at && inWeek(dateOf(t.completed_at, tz)));
  const overdue = idx.list.filter((t) => idx.isLeaf(t.id) && t.assignee_id === memberId && isOverdueLeaf(t, idx, addDays(end, 0) < ctx.today ? end : ctx.today));
  const weekTasks = idx.list.filter((t) => idx.isLeaf(t.id) && t.assignee_id === memberId && ["todo", "active"].includes(cat(t.status)) && (t.planning_bucket === "This Week" || inWeek(t.due_date)));
  const weekIssues = (issues || []).filter((i) => isActiveRec(i) && inWeek(i.discovered_at));
  const weekRisks = (risks || []).filter((r) => isActiveRec(r) && inWeek(dateOf(r.created_at || end, tz)));
  const weekDecisions = (decisions || []).filter((d) => isActiveRec(d) && inWeek(dateOf(d.decided_at || d.created_at, tz)));
  const projectIds = new Set([...doneTasks, ...overdue, ...weekTasks, ...weekIssues, ...weekRisks, ...weekDecisions].map((x) => x.project_id).filter(Boolean));
  const relatedProjects = (projects || []).filter((p) => isActiveRec(p) && (projectIds.has(p.id) || (metrics && metrics[p.id] && metrics[p.id].health === "Red")));
  const minutes = (sessions || []).filter((s) => isLive(s) && !s.voided_at && s.member_id === memberId && inWeek(s.date)).reduce((a, s) => a + (s.minutes || 0), 0);
  return {
    wins: (wins || []).filter((w) => isActiveRec(w) && w.member_id === memberId && inWeek(w.achieved_on)),
    doneTasks, weekTasks, overdueTasks: overdue, minutes, overdueCount: overdue.length,
    issues: weekIssues, risks: weekRisks, decisions: weekDecisions, relatedProjects,
    newIssues: weekIssues.length, newRisks: weekRisks.length, decisionsCount: weekDecisions.length,
    checkins: (checkins || []).filter((c) => c.member_id === memberId && inWeek(dateOf(c.checked_at, tz))).length,
    redProjects: (projects || []).filter((p) => isActiveRec(p) && metrics && metrics[p.id] && metrics[p.id].health === "Red").length,
  };
}
export const quarterOf = quarterLabel;
export { todayStr, addDays, diffDays, weekStart };
