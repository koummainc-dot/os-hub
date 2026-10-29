import React, { createContext, useContext, useMemo, useState, useEffect, useCallback, useRef } from "react";
import { useRecordStore, uid, nowIso, arr } from "../../core/records.jsx";
import { todayStr, dateOf, weekStart } from "../../core/dates.js";
import * as D from "./domain.js";
import { persistTemplateBundle } from "./templateWrites.js";
import { persistTaskTreeMove } from "./taskTreeMoveWrites.js";
import { DEFAULT_LOOKUPS, BUILTIN_TEMPLATES, PRD_TEMPLATE } from "./lookups.js";
import { useConfirm } from "../../core/kit.jsx";

export const Ctx = createContext(null);
export const useP = () => useContext(Ctx);

export const GENERAL_ID = "proj_general";
const COLLS = ["projects", "tasks", "outputs", "sessions", "timers", "prds", "discovery", "decisions", "risks", "issues", "contacts", "objectives", "krs", "checkins", "reviews", "wins", "updates", "templates", "teams", "profiles", "settings", "lookups", "activity"];

export function ProjectsProvider({ api, access, authUser, ws, members, isDemo, demoStore, seed, shell, page, setPage, children }) {
  const toast = shell && shell.toast ? shell.toast : () => {};
  const store = useRecordStore({ wsId: ws.id, systemId: "projects", isDemo, demoStore, seed, onToast: toast });
  const { recs, ready, error, pending, online } = store; const R = store.api;
  const [confirm, confirmNode] = useConfirm();
  const [view, setView] = useState({ projectId: null, tab: "overview", taskId: null });
  const me = authUser.id;
  const role = access.owner ? "Owner" : access.manage ? "Admin" : access.level === "edit" ? "Member" : "Viewer";

  // ── people (platform members ARE the project members)
  const people = useMemo(() => {
    const m = new Map();
    if (ws.ownerId) m.set(ws.ownerId, { id: ws.ownerId, name: ws.ownerName || "المالك", email: "" });
    (members || []).forEach((x) => m.set(x.userId, { id: x.userId, name: x.name || x.email, email: x.email }));
    if (!m.has(me)) m.set(me, { id: me, name: authUser.name, email: authUser.email });
    else m.set(me, { ...m.get(me), name: m.get(me).name || authUser.name });
    return [...m.values()];
  }, [ws.ownerId, ws.ownerName, members, me, authUser.name, authUser.email]);
  const nameOf = useCallback((id) => { const p = people.find((x) => x.id === id); return p ? p.name : id ? "—" : "غير مسند"; }, [people]);

  // ── settings / lookups
  const settings = useMemo(() => { const s = (recs.settings || {}).ws || {}; return { ...D.DEFAULT_SETTINGS, ...s, automations: { ...D.DEFAULT_SETTINGS.automations, ...(s.automations || {}) } }; }, [recs.settings]);
  const lookups = useMemo(() => { const l = (recs.lookups || {}).main || {}; return { ...DEFAULT_LOOKUPS, ...(l.lists || {}) }; }, [recs.lookups]);
  const [today, setToday] = useState(() => todayStr(settings.timezone));
  useEffect(() => { setToday(todayStr(settings.timezone)); const iv = setInterval(() => setToday(todayStr(settings.timezone)), 60000); return () => clearInterval(iv); }, [settings.timezone]);
  const weekStartStr = weekStart(today, settings.weekStartDay);

  // ── live data
  const live = (c) => arr(recs, c).filter((r) => !r.deleted_at);
  const data = useMemo(() => ({
    projects: live("projects"), tasks: live("tasks"), outputs: live("outputs"), sessions: live("sessions"), timers: arr(recs, "timers"), prds: live("prds"), discovery: live("discovery"),
    decisions: live("decisions"), risks: live("risks"), issues: live("issues"), contacts: live("contacts"), objectives: live("objectives"), krs: live("krs"), checkins: arr(recs, "checkins"),
    reviews: live("reviews"), wins: live("wins"), updates: live("updates"), templates: live("templates"), teams: live("teams"), profiles: live("profiles"), activity: arr(recs, "activity"),
  }), [recs]);
  const trash = useMemo(() => COLLS.filter((c) => !["settings", "lookups", "activity", "timers", "checkins"].includes(c)).flatMap((c) => arr(recs, c).filter((r) => r.deleted_at).map((r) => ({ coll: c, rec: r }))), [recs]);
  const projectsById = useMemo(() => Object.fromEntries(data.projects.map((p) => [p.id, p])), [data.projects]);
  const prdsById = useMemo(() => Object.fromEntries(data.prds.map((p) => [p.id, p])), [data.prds]);
  const idx = useMemo(() => D.buildTaskIndex(data.tasks, data.sessions), [data.tasks, data.sessions]);
  const metrics = useMemo(() => {
    const o = {}; const base = { idx, risks: data.risks, issues: data.issues, decisions: data.decisions, outputs: data.outputs, sessions: data.sessions, settings, today };
    data.projects.filter((p) => !p.archived_at || true).forEach((p) => { o[p.id] = D.projectMetrics(p, base); });
    return o;
  }, [data, idx, settings, today]);
  const projectProgress = useMemo(() => Object.fromEntries(Object.entries(metrics).filter(([id]) => id !== GENERAL_ID).map(([id, m]) => [id, m.progress])), [metrics]);

  // ── permissions (plan §13.2). Server enforces system-level view/edit; the rest is enforced here.
  const projectRole = useCallback((p) => { if (!p) return null; if (p.lead_id === me) return "Lead"; const m = (p.members || []).find((x) => x.member_id === me); return m ? m.role : null; }, [me]);
  const can = useCallback((action, p) => {
    if (role === "Owner" || role === "Admin") return true;
    if (role === "Viewer") return false;
    const pr = projectRole(p); const sys = p && p.is_system; const lead = pr === "Lead" || (p && p.created_by === me);
    const work = pr === "Lead" || pr === "Contributor" || sys;
    switch (action) {
      case "project.create": return true;
      case "project.edit": case "project.archive": case "project.delete": case "project.members": return lead;
      case "task.write": case "session.write": case "risk.write": case "issue.write": case "decision.write": case "prd.write": case "output.write": return work;
      case "output.approve": case "prd.approve": return pr === "Lead" || pr === "Reviewer";
      case "update.write": return lead;
      case "discovery.write": case "win.write": case "contact.write": case "review.write": return true;
      case "okr.write": return true; // restricted to own objectives in the screen
      case "admin": return false;
      default: return false;
    }
  }, [role, projectRole, me]);
  const visFor = useCallback((p) => (p && p.visibility === "private" ? [...new Set([p.lead_id, p.created_by, me, ...(p.members || []).map((m) => m.member_id)].filter(Boolean))] : null), [me]);

  // ── activity log
  const act = useCallback((entity, id, action, summary) => R.put("activity", { id: uid(), entity, entity_id: id, action, summary: summary || "", actor_id: me, at: nowIso() }), [R, me]);
  const stamp = useCallback((rec) => ({ ...rec, created_by: rec.created_by || me, updated_by_member: me }), [me]);

  // ── generic writes (child records inherit project privacy)
  const putIn = useCallback((coll, rec, project) => { const r = stamp(rec); if (project) r._vis = visFor(project); return R.put(coll, r); }, [R, stamp, visFor]);
  const del = useCallback(async (coll, id, label) => { await R.softDelete(coll, id, me); act(coll, id, "deleted", label); toast("🗑 نُقل إلى السلة — يمكن استرجاعه من الإعدادات"); }, [R, me, act, toast]);

  // ensure the General system project exists (editors)
  useEffect(() => {
    if (!ready || isDemo || access.level !== "edit") return;
    if (!(recs.projects || {})[GENERAL_ID]) R.put("projects", { id: GENERAL_ID, name: "عام (General)", is_system: true, type: "أخرى", status: "In Progress", priority: "Low", visibility: "workspace", members: [], description: "مشروع النظام: للمهام بلا مشروع. لا يدخل في الصحة أو الأهداف.", created_by: me });
  }, [ready]);

  // A-07: weekly review draft is created automatically at the start of the week (private by default)
  useEffect(() => {
    if (!ready || role === "Viewer" || access.level !== "edit" || settings.automations.reviewDraft === false) return;
    const id = "rev_" + me + "_" + weekStartStr;
    if (!(recs.reviews || {})[id]) R.put("reviews", { id, member_id: me, week_start: weekStartStr, status: "Draft", visibility: "private", _vis: [me], rating: null, energy: null, what_worked: "", what_stumbled: "", learned: "", will_change: "", next_week_focus: "", auto: true, created_by: me });
  }, [ready, weekStartStr]);

  // ── actions ─────────────────────────────────────────────────────────
  const A = useMemo(() => ({
    // projects
    async saveProject(v, isNew) {
      const errs = [...D.validateDates(v.start_date, v.target_date, "V-14: تاريخ البدء بعد الموعد المستهدف")]; if (errs.length) throw new Error(errs[0]);
      const rec = { ...v, id: v.id || uid() };
      if (isNew) { rec.status = rec.status || "Planned"; rec.lead_id = rec.lead_id || me; rec.members = rec.members && rec.members.length ? rec.members : [{ member_id: rec.lead_id, role: "Lead" }]; rec.created_by = me; }
      const saved = await putIn("projects", rec, rec); if (!saved) throw new Error("تعذّر الحفظ");
      if (!isNew) { // privacy changes cascade to children
        const vis = visFor(rec);
        const kids = [["tasks", data.tasks], ["outputs", data.outputs], ["risks", data.risks], ["issues", data.issues], ["decisions", data.decisions], ["prds", data.prds], ["updates", data.updates]];
        for (const [c, list] of kids) for (const k of list.filter((x) => x.project_id === rec.id)) { const a = JSON.stringify(k._vis || null), b = JSON.stringify(vis); if (a !== b) await R.put(c, { ...k, _vis: vis }); }
      }
      act("projects", rec.id, isNew ? "created" : "updated", rec.name); return saved;
    },
    async setProjectStatus(p, to) {
      const chk = D.canChangeProjectStatus(p, to, idx); if (!chk.ok) { toast("⛔ " + chk.error); return false; }
      if (to === "Completed") {
        const plan = D.completionPlan(p, idx);
        if (plan.needsDecision) {
          const affected = plan.openLeaves.slice(0, 12).map((t) => `• ${t.title}${t.assignee_id ? " — " + nameOf(t.assignee_id) : ""}${t.due_date ? " — " + t.due_date : ""}`).join("\n");
          const more = plan.openLeaves.length > 12 ? `\n… و${plan.openLeaves.length - 12} مهام أخرى` : "";
          const choice = await confirm(`يوجد ${plan.openLeaves.length} مهمة مفتوحة ستُلغى ولن تدخل في التقدم:\n\n${affected}${more}\n\nهل تريد إلغاء كل المهام المفتوحة ثم إكمال المشروع؟`, { title: "راجع المهام المتأثرة", ok: "إلغاء المهام المفتوحة وإكمال المشروع", cancel: "رجوع", danger: true });
          if (!choice) return false;
          for (const t of plan.openLeaves) await R.put("tasks", { ...t, status: "Cancelled", cancelled_reason: "أُلغيت عند إكمال المشروع", completed_at: null });
        }
      }
      if (to === "Cancelled" && !(await confirm("إلغاء المشروع؟ سيبقى في السجل ولا يدخل في الصحة.", { danger: true }))) return false;
      await R.put("projects", { ...p, status: to, status_changed_at: nowIso(), completed_at: to === "Completed" ? nowIso() : p.completed_at || null }); act("projects", p.id, "status", p.status + " → " + to); return true;
    },
    async archiveProject(p) { if (p.archived_at) return; await R.put("projects", { ...p, archived_from_status: p.status === "Archived" ? (p.archived_from_status || "Planned") : p.status, status: "Archived", archived_at: nowIso() }); act("projects", p.id, "archived", p.name); },
    async restoreProject(p) { const { archived_from_status, ...rest } = p; const restoredStatus = archived_from_status || "Planned"; await R.put("projects", { ...rest, status: restoredStatus, archived_at: null }); act("projects", p.id, "restored", p.name + " → " + restoredStatus); },
    async deleteProject(p) {
      const kids = idx.list.filter((t) => t.project_id === p.id);
      const related = {
        "مهام": kids.length,
        "مخرجات": data.outputs.filter((x) => x.project_id === p.id && !x.deleted_at).length,
        "مخاطر": data.risks.filter((x) => x.project_id === p.id && !x.deleted_at).length,
        "مشاكل": data.issues.filter((x) => x.project_id === p.id && !x.deleted_at).length,
        "قرارات": data.decisions.filter((x) => x.project_id === p.id && !x.deleted_at).length,
        "مواصفات": data.prds.filter((x) => x.project_id === p.id && !x.deleted_at).length,
        "تحديثات": data.updates.filter((x) => x.project_id === p.id && !x.deleted_at).length,
      };
      const summary = Object.entries(related).filter(([, count]) => count > 0).map(([label, count]) => `• ${label}: ${count}`).join("\n") || "لا توجد سجلات تابعة ظاهرة.";
      const sessionCount = data.sessions.filter((session) => kids.some((task) => task.id === session.task_id)).length;
      const message = `نقل المشروع «${p.name}» إلى السلة؟\n\nالسجلات التي ستُنقل إلى السلة معه:\n${summary}\n\nجلسات الوقت التاريخية: ${sessionCount} — ستبقى محفوظة كسجل تاريخي، ولن تُحذف تلقائيًا. يمكنك استرجاع المشروع وسجلاته من السلة.`;
      if (!(await confirm(message, { title: "مراجعة أثر حذف المشروع", danger: true, ok: "نقل إلى السلة" }))) return false;
      for (const c of ["tasks", "outputs", "risks", "issues", "decisions", "prds", "updates"]) for (const k of arr(recs, c).filter((x) => x.project_id === p.id && !x.deleted_at)) await R.softDelete(c, k.id, me);
      await del("projects", p.id, p.name); return true;
    },
    async createFromTemplate(tpl, opts) {
      const r = D.instantiateProjectTemplate(tpl, opts, uid); r.project.created_by = me; if (!r.project.members.length) r.project.members = [{ member_id: me, role: "Lead" }], r.project.lead_id = me;
      await persistTemplateBundle({
        project: r.project, tasks: r.tasks, risks: r.risks, stamp, actorId: me,
        put: (collection, record) => R.put(collection, record),
        softDelete: (collection, id, actorId) => R.softDelete(collection, id, actorId),
      });
      act("projects", r.project.id, "created_from_template", tpl.name); return r.project;
    },
    // tasks
    async saveTask(v, isNew) {
      const project = projectsById[v.project_id];
      const errs = D.validateTaskRefs({ ...v, id: v.id || "new" }, { projectsById, tasksById: idx.byId, prdsById }); if (errs.length) throw new Error(errs[0]);
      for (const discoveryId of (v.discovery_ids || [])) { const discovery = data.discovery.find((d) => d.id === discoveryId); if (!discovery) throw new Error("عنصر اكتشاف مرتبط غير موجود"); if ((discovery.project_ids || []).length && !discovery.project_ids.includes(v.project_id)) throw new Error("عنصر الاكتشاف يجب أن يكون مرتبطاً بالمشروع نفسه"); }
      if (D.traceabilityBlocked(settings, project && project.type, project && project.is_system, v)) throw new Error("سياسة التتبع: هذا النوع من المشاريع يتطلب ربط المهمة بمواصفة أو اكتشاف");
      const rec = { ...v, id: v.id || uid(), planning_bucket: v.planning_bucket || "Inbox", status: v.status || "Not Started" };
      const prev = v.id ? idx.byId[v.id] || (recs.tasks || {})[v.id] : null;
      if (isNew) { rec.created_by = me; rec.sort_order = rec.sort_order || Date.now(); if (rec.parent_task_id) { const par = idx.byId[rec.parent_task_id]; if (par && idx.isLeaf(par.id)) { const fc = D.onFirstChild(par); if (fc.warnCompleted && !(await confirm("المهمة الأب كانت «مكتملة». ستصبح مجمّعاً وتُشتق حالتها من أبنائها. متابعة؟"))) return null; await R.put("tasks", fc.patch); } } }
      const becameDone = D.cat(rec.status) === "done" && (!prev || D.cat(prev.status) !== "done");
      if (becameDone) { rec.completed_at = nowIso(); rec.completed_by = me; } else if (prev && D.cat(rec.status) !== "done") { rec.completed_at = null; }
      if (D.cat(rec.status) === "cancelled" && !rec.cancelled_reason) throw new Error("V-19: سبب الإلغاء مطلوب");
      if (prev && rec.assignee_id !== prev.assignee_id && rec.assignee_id && rec.assignee_id !== me) act("tasks", rec.id, "assigned", nameOf(rec.assignee_id));
      const saved = await putIn("tasks", rec, project); return saved;
    },
    async setTaskStatus(t, to, reason) {
      if (!idx.isLeaf(t.id)) { toast("ℹ️ حالة المهمة الأب مشتقة من أبنائها — عدّل الأوراق"); return false; }
      if (to === "Cancelled" && !reason) { toast("⛔ سبب الإلغاء مطلوب"); return false; }
      const patch = { ...t, status: to };
      if (to === "Completed") { patch.completed_at = nowIso(); patch.completed_by = me; } else patch.completed_at = null;
      if (to === "Cancelled") patch.cancelled_reason = reason;
      await R.put("tasks", patch); return true;
    },
    async moveBucket(t, bucket) { if (!idx.isLeaf(t.id)) return; await R.put("tasks", { ...t, planning_bucket: bucket }); },
    async reparent(taskId, newParentId) {
      const chk = D.canReparent(taskId, newParentId, idx); if (!chk.ok) { toast("⛔ " + chk.error); return false; }
      const t = idx.byId[taskId];
      if (newParentId) { const par = idx.byId[newParentId]; if (par && idx.isLeaf(par.id)) { const fc = D.onFirstChild(par); await R.put("tasks", fc.patch); } }
      await R.put("tasks", { ...t, parent_task_id: newParentId || null, sort_order: Date.now() }); return true;
    },
    async moveTree(taskId, targetProjectId) {
      const target = projectsById[targetProjectId];
      if (!target || !idx.byId[taskId]) { toast("⛔ المشروع أو المهمة غير موجودة"); return false; }
      const source = idx.byId[taskId];
      if (source.project_id === targetProjectId) { toast("ℹ️ المهمة موجودة بالفعل في هذا المشروع"); return false; }
      const plan = D.planTreeMove(taskId, targetProjectId, idx, prdsById, data.tasks, Object.fromEntries(data.discovery.map((x) => [x.id, x])));
      const outputPatches = data.outputs.filter((x) => plan.ids.includes(x.task_id)).map((o) => ({ before: o, after: { ...o, project_id: targetProjectId, _vis: visFor(target) } }));
      const taskPatches = plan.patches.map((p) => ({ before: data.tasks.find((t) => t.id === p.id), after: { ...p, _vis: visFor(target) } }));
      const prdCount = plan.patches.filter((p, i) => data.tasks.find((t) => t.id === plan.ids[i])?.prd_id && !p.prd_id).length;
      const discoveryCount = plan.patches.reduce((n, p, i) => n + ((data.tasks.find((t) => t.id === plan.ids[i])?.discovery_ids || []).length - (p.discovery_ids || []).length), 0);
      const prompt = `نقل ${plan.ids.length} مهمة إلى مشروع «${target.name}»؟\nسيتم نقل ${outputPatches.length} مخرج مرتبط، مع الحفاظ على روابط الأبناء داخل الشجرة.\n${prdCount ? `سيتم مسح ${prdCount} رابط مواصفة لا يتبع المشروع الهدف.\n` : ""}${discoveryCount ? `سيتم مسح ${discoveryCount} رابط اكتشاف غير صالح للمشروع الهدف.\n` : ""}سيُحفظ النقل كعملية واحدة على الخادم؛ يلزم الاتصال المباشر لضمان عدم نقل جزء فقط.`;
      if (!(await confirm(prompt, { title: "نقل شجرة المهام", ok: "نقل الشجرة" }))) return false;
      try {
        await persistTaskTreeMove({
          taskPatches, outputPatches,
          putAtomic: R.putAtomic,
          put: (collection, record) => R.put(collection, record),
        });
      } catch (error) {
        toast("⛔ " + (error?.message || "تعذّر نقل الشجرة"));
        return false;
      }
      act("tasks", taskId, "moved_tree", `${plan.ids.length} مهمة → ${target.name}`);
      toast("✅ نُقلت الشجرة بالكامل");
      return true;
    },
    async completeAll(taskId) {
      const open = D.completeAllBranches(taskId, idx); if (!open.length) { toast("لا توجد فروع مفتوحة"); return; }
      if (!(await confirm(`إكمال ${open.length} مهمة في هذا الفرع؟`))) return;
      for (const t of open) await R.put("tasks", { ...t, status: "Completed", completed_at: nowIso(), completed_by: me }); toast("✅ تم إكمال الفرع");
    },
    async archiveTree(taskId) {
      const ids = [taskId, ...idx.descendants(taskId)]; if (!(await confirm(`أرشفة ${ids.length} مهمة؟ لن تدخل في أي عدّاد.`))) return;
      for (const id of ids) await R.put("tasks", { ...idx.byId[id], archived_at: nowIso() });
    },
    async deleteTree(taskId) {
      const ids = [taskId, ...idx.descendants(taskId)]; if (!(await confirm(`نقل ${ids.length} مهمة إلى السلة؟`, { danger: true }))) return;
      for (const id of ids) await R.softDelete("tasks", id, me); act("tasks", taskId, "deleted", idx.byId[taskId].title);
    },
    // time
    async startTimer(taskId) {
      const cur = (recs.timers || {})["timer_" + me]; if (cur && cur.task_id && !cur.ended_at) { toast("⛔ TIMER_ALREADY_RUNNING — أوقف المؤقّت الحالي أولاً"); return false; }
      await R.put("timers", { id: "timer_" + me, member_id: me, task_id: taskId, started_at: nowIso(), ended_at: null }); return true;
    },
    async stopTimer(note) {
      const cur = (recs.timers || {})["timer_" + me]; if (!cur || !cur.task_id || cur.ended_at) return null;
      const end = nowIso(); const minutes = Math.min(1440, Math.max(1, Math.round((new Date(end) - new Date(cur.started_at)) / 60000)));
      const s = { id: D.sessionId(me, cur.started_at), member_id: me, task_id: cur.task_id, date: dateOf(cur.started_at, settings.timezone), minutes, started_at: cur.started_at, ended_at: end, note: note || "", source: "timer", client_generated_id: cur.started_at };
      const errs = D.validateSession(s); if (errs.length) { toast("⛔ " + errs[0]); return null; }
      await R.put("sessions", stamp(s)); await R.put("timers", { ...cur, task_id: null, started_at: null, ended_at: end }); return s;
    },
    async discardTimer() { const cur = (recs.timers || {})["timer_" + me]; if (cur) await R.put("timers", { ...cur, task_id: null, started_at: null, ended_at: nowIso() }); },
    async addSession(v) {
      const s = { member_id: me, source: "manual", ...v, id: v.id || D.sessionId(me, uid()) }; const errs = D.validateSession(s); if (errs.length) throw new Error(errs[0]);
      return R.put("sessions", stamp(s));
    },
    async voidSession(s, reason) { await R.put("sessions", { ...s, voided_at: nowIso(), voided_by: me, void_reason: reason || "" }); },
    // generic
    put: (coll, rec, project) => putIn(coll, rec, project), del, restore: (coll, id) => R.restore(coll, id).then(() => toast("♻️ تم الاسترجاع")),
    async saveSettings(patch) { return R.put("settings", { id: "ws", ...((recs.settings || {}).ws || {}), ...patch }); },
    async saveLookups(lists) { return R.put("lookups", { id: "main", lists }); },
    act,
  }), [R, recs, idx, data, settings, projectsById, prdsById, me, confirm, toast, putIn, visFor, stamp, act, del, nameOf]);

  const alerts = useMemo(() => (ready ? D.computeAlerts(me, { idx, issues: data.issues, projects: data.projects, contacts: data.contacts, discovery: data.discovery, krs: data.krs, checkins: data.checkins, timers: data.timers, wins: data.wins, today, settings, metrics }) : []), [ready, me, idx, data, today, settings, metrics]);
  const timer = (recs.timers || {})["timer_" + me]; const runningTimer = timer && timer.task_id && !timer.ended_at ? timer : null;

  // shell bridge: badges + notification bell
  useEffect(() => { if (shell && shell.publish) shell.publish("projects", { notifCount: alerts.length, openNotifs: () => setPage("today") }); }, [alerts.length]);

  const value = { shell, ws, isDemo, me, role, access, people, nameOf, settings, lookups, today, weekStartStr, recs, data, trash, projectsById, prdsById, idx, metrics, projectProgress, can, projectRole, visFor, A, R, confirm, toast, alerts, runningTimer, view, setView, page, setPage, pending, online, ready, error, store,
    openProject: (id, tab) => { setView({ projectId: id, tab: tab || "overview", taskId: null }); setPage("projects"); },
    openTask: (id) => setView((v) => ({ ...v, taskId: id })), closeTask: () => setView((v) => ({ ...v, taskId: null })), templates: [...BUILTIN_TEMPLATES, ...data.templates], PRD_TEMPLATE };
  return <Ctx.Provider value={value}>{children}{confirmNode}</Ctx.Provider>;
}
