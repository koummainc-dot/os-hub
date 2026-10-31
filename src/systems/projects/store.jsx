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
      let saved;
      if (isNew) {
        saved = await putIn("projects", rec, rec);
        if (!saved) throw new Error("تعذّر الحفظ");
      } else {
        const vis = visFor(rec);
        const kids = [["tasks", data.tasks], ["outputs", data.outputs], ["risks", data.risks], ["issues", data.issues], ["decisions", data.decisions], ["prds", data.prds], ["updates", data.updates]];
        const changed = kids.flatMap(([coll, list]) => list
          .filter((child) => child.project_id === rec.id && JSON.stringify(child._vis || null) !== JSON.stringify(vis))
          .map((child) => ({ coll, rec: { ...child, _vis: vis } })));
        if (!isDemo && changed.length) {
          const ops = [{ coll: "projects", rec: stamp({ ...rec, _vis: vis }) }, ...changed];
          if (ops.length > 1000) throw new Error("تغيير خصوصية المشروع يحتاج تحديث أكثر من 999 سجلًا تابعًا. لم يُحفظ أي تغيير؛ قسّم العملية أو نفّذها في نافذة صيانة.");
          const batch = await R.putAtomic(ops);
          if (!Array.isArray(batch) || batch.length !== ops.length) throw new Error("لم يؤكد الخادم تحديث خصوصية المشروع وسجلاته التابعة معًا.");
          saved = batch[0];
        } else {
          saved = await putIn("projects", rec, rec);
          if (!saved) throw new Error("تعذّر الحفظ");
          for (const { coll, rec: child } of changed) {
            const updated = await R.put(coll, child);
            if (!updated) throw new Error("تغيّرت خصوصية المشروع، لكن تعذّر تحديث " + coll + "/" + child.id + ". راجع صلاحيات السجلات التابعة.");
          }
        }
      }
      act("projects", rec.id, isNew ? "created" : "updated", rec.name); return saved;
    },
    async setProjectStatus(p, to) {
      const chk = D.canChangeProjectStatus(p, to, idx); if (!chk.ok) { toast("⛔ " + chk.error); return false; }
      let plan = null;
      if (to === "Completed") {
        plan = D.completionPlan(p, idx);
        if (plan.needsDecision) {
          const affected = plan.openLeaves.slice(0, 12).map((t) => `• ${t.title}${t.assignee_id ? " — " + nameOf(t.assignee_id) : ""}${t.due_date ? " — " + t.due_date : ""}`).join("\n");
          const more = plan.openLeaves.length > 12 ? `\n… و${plan.openLeaves.length - 12} مهام أخرى` : "";
          const choice = await confirm(`يوجد ${plan.openLeaves.length} مهمة مفتوحة ستُلغى ولن تدخل في التقدم:\n\n${affected}${more}\n\nهل تريد إلغاء كل المهام المفتوحة ثم إكمال المشروع؟`, { title: "راجع المهام المتأثرة", ok: "إلغاء المهام المفتوحة وإكمال المشروع", cancel: "رجوع", danger: true });
          if (!choice) return false;
        }
      }
      if (to === "Cancelled" && !(await confirm("إلغاء المشروع؟ سيبقى في السجل ولا يدخل في الصحة.", { danger: true }))) return false;
      const at = nowIso();
      const ops = [];
      if (to === "Completed" && plan) {
        for (const t of plan.openLeaves) ops.push({ coll: "tasks", rec: { ...t, status: "Cancelled", cancelled_reason: "أُلغيت عند إكمال المشروع", completed_at: null } });
      }
      ops.push({ coll: "projects", rec: { ...p, status: to, status_changed_at: at, completed_at: to === "Completed" ? at : p.completed_at || null } });
      try {
        await R.putAtomic(ops);
      } catch (error) {
        toast("⛔ لم يتغير وضع المشروع: " + (error?.message || "فشل الحفظ") + ". لم تُحفظ مجموعة جزئية.");
        return false;
      }
      act("projects", p.id, "status", p.status + " → " + to); return true;
    },
    async archiveProject(p) { if (p.archived_at) return; await R.put("projects", { ...p, archived_from_status: p.status === "Archived" ? (p.archived_from_status || "Planned") : p.status, status: "Archived", archived_at: nowIso() }); act("projects", p.id, "archived", p.name); },
    async restoreProject(p) { const { archived_from_status, ...rest } = p; const restoredStatus = archived_from_status || "Planned"; await R.put("projects", { ...rest, status: restoredStatus, archived_at: null }); act("projects", p.id, "restored", p.name + " → " + restoredStatus); },

    async restoreProjectFromTrash(p) {
      if (!p || !p.deleted_at) { toast("⛔ المشروع ليس في السلة أو لا يحتوي على علامة حذف صالحة."); return false; }
      if (p.id === GENERAL_ID || p.is_system) { toast("⛔ لا يمكن استرجاع مشروع النظام من السلة."); return false; }
      const collections = ["tasks", "outputs", "risks", "issues", "decisions", "prds", "updates"];
      // Shared deletion timestamp + actor identifies records from this exact batch.
      const related = collections.flatMap((coll) =>
        arr(recs, coll).filter((record) =>
          record.project_id === p.id &&
          record.deleted_at === p.deleted_at &&
          (record.deleted_by || null) === (p.deleted_by || null)
        ).map((rec) => ({ coll, rec }))
      );
      const counts = {};
      for (const { coll } of related) counts[coll] = (counts[coll] || 0) + 1;
      const labels = { tasks: "مهام", outputs: "مخرجات", risks: "مخاطر", issues: "مشاكل", decisions: "قرارات", prds: "مواصفات", updates: "تحديثات" };
      const summary = Object.entries(counts).map(([coll, count]) => `• ${labels[coll] || coll}: ${count}`).join("\n") || "لا توجد سجلات تابعة تحمل علامة الحذف نفسها.";
      if (related.length + 1 > 1000) {
        toast("⛔ يتجاوز الاسترجاع 1000 سجل؛ لم يُسترجع أي سجل لأن العملية يجب أن تكون ذرّية.");
        return false;
      }
      const message = `استرجاع المشروع «${p.name}» من السلة؟\n\nسيتم استرجاع المشروع والسجلات التي نُقلت معه في عملية الحذف نفسها:\n${summary}\n\nالسجلات التي كانت في السلة قبل حذف المشروع لن تُسترجع معه، وجلسات الوقت التاريخية ستظل كما هي.`;
      if (!(await confirm(message, { title: "مراجعة أثر استرجاع المشروع", ok: "استرجاع المشروع وسجلاته" }))) return false;
      const ops = related.map(({ coll, rec }) => ({ coll, rec: { ...rec, deleted_at: null, deleted_by: null } }));
      ops.push({ coll: "projects", rec: { ...p, deleted_at: null, deleted_by: null } });
      try {
        await R.putAtomic(ops);
      } catch (error) {
        toast("⛔ لم يُسترجع المشروع: " + (error?.message || "فشل الحفظ") + ". لم تُحفظ مجموعة جزئية.");
        return false;
      }
      act("projects", p.id, "restored_from_trash", p.name);
      toast("♻️ تم استرجاع المشروع والسجلات التابعة المرتبطة بعملية الحذف نفسها.");
      return true;
    },
    async deleteProject(p) {
      if (!p || p.id === GENERAL_ID || p.is_system) {
        toast("⛔ لا يمكن نقل مشروع النظام إلى السلة");
        return false;
      }
      const collections = ["tasks", "outputs", "risks", "issues", "decisions", "prds", "updates"];
      const related = collections.flatMap((coll) =>
        arr(recs, coll)
          .filter((record) => record.project_id === p.id && !record.deleted_at)
          .map((rec) => ({ coll, rec }))
      );
      const counts = {};
      for (const { coll } of related) counts[coll] = (counts[coll] || 0) + 1;
      const labels = { tasks: "مهام", outputs: "مخرجات", risks: "مخاطر", issues: "مشاكل", decisions: "قرارات", prds: "مواصفات", updates: "تحديثات" };
      const summary = Object.entries(counts).map(([coll, count]) => `• ${labels[coll] || coll}: ${count}`).join("\n") || "لا توجد سجلات تابعة ظاهرة.";
      const sessionCount = data.sessions.filter((session) => idx.list.some((task) => task.project_id === p.id && task.id === session.task_id)).length;
      const total = related.length + 1;
      if (total > 1000) {
        toast("⛔ المشروع يحتوي على أكثر من 999 سجلًا تابعًا؛ لم يُحذف شيء لأن العملية يجب أن تكون ذرّية.");
        return false;
      }
      const message = `نقل المشروع «${p.name}» إلى السلة؟\n\nالسجلات التابعة التي ستُنقل معه في عملية واحدة:\n${summary}\n\nجلسات الوقت التاريخية: ${sessionCount} — ستبقى محفوظة ولن تُحذف تلقائيًا. يمكن استرجاع المشروع وسجلاته من السلة.`;
      if (!(await confirm(message, { title: "مراجعة أثر حذف المشروع", danger: true, ok: "نقل المشروع وسجلاته إلى السلة" }))) return false;
      const deletedAt = nowIso();
      const ops = related.map(({ coll, rec }) => ({
        coll,
        rec: { ...rec, deleted_at: deletedAt, deleted_by: me },
      }));
      ops.push({ coll: "projects", rec: { ...p, deleted_at: deletedAt, deleted_by: me } });
      try {
        await R.putAtomic(ops);
      } catch (error) {
        toast("⛔ لم يُنقل المشروع إلى السلة: " + (error?.message || "فشل الحفظ") + ". لم تُحفظ مجموعة جزئية.");
        return false;
      }
      act("projects", p.id, "deleted", p.name);
      toast("🗑 نُقل المشروع وسجلاته إلى السلة؛ جلسات الوقت التاريخية محفوظة.");
      return true;
    },
    async createPrdVersion(prd) {
      const project = prd && projectsById[prd.project_id];
      if (!prd || prd.status !== "Approved" || !project || project.is_system) {
        throw new Error("لا يمكن إنشاء نسخة جديدة إلا من مواصفة معتمدة في مشروع صالح.");
      }
      if (!can("prd.approve", project)) throw new Error("إنشاء نسخة جديدة يحتاج صلاحية قائد المشروع أو المراجع.");
      const next = stamp({
        ...prd,
        id: uid(),
        version: (prd.version || 1) + 1,
        supersedes_id: prd.id,
        status: "In Progress",
        approved_at: null,
        approvals: [],
        created_by: me,
      });
      const previous = stamp({ ...prd, status: "Superseded" });
      const saved = await R.putAtomic([
        { coll: "prds", rec: next },
        { coll: "prds", rec: previous },
      ]);
      if (!Array.isArray(saved) || saved.length !== 2) throw new Error("لم يؤكد الخادم إنشاء النسخة وتحديث السابقة معًا.");
      act("prds", next.id, "version_created", next.title + " v" + next.version);
      return next;
    },
    async createFromTemplate(tpl, opts) {
      const r = D.instantiateProjectTemplate(tpl, opts, uid); r.project.created_by = me; if (!r.project.members.length) r.project.members = [{ member_id: me, role: "Lead" }], r.project.lead_id = me;
      await persistTemplateBundle({
        project: r.project, tasks: r.tasks, risks: r.risks, stamp, actorId: me,
        atomic: !isDemo,
        putAtomic: R.putAtomic,
        put: (collection, record) => R.put(collection, record),
        softDelete: (collection, id, actorId) => R.softDelete(collection, id, actorId),
      });
      act("projects", r.project.id, "created_from_template", tpl.name); return r.project;
    },
    // Convert a discovery to an issue and complete its source link in one server transaction.
    async convertRiskToIssue(riskId) {
      const risk = (data.risks || []).find((item) => item.id === riskId);
      const project = risk && projectsById[risk.project_id];
      if (!risk || !project || project.is_system || project.archived_at) throw new Error("الخطر أو المشروع غير صالح.");
      const existing = D.issueForRisk(risk, data.issues);
      if (existing) {
        if (existing.project_id !== risk.project_id) throw new Error("المشكلة المرتبطة بالخطر موجودة في مشروع مختلف؛ لم يتم تغيير الارتباط.");
        if (existing.from_risk_id && existing.from_risk_id !== risk.id) throw new Error("المشكلة مرتبطة بالفعل بخطر آخر؛ لم يتم تغيير أي ارتباط.");
        const issuePatch = existing.from_risk_id === risk.id ? null : { ...existing, from_risk_id: risk.id };
        const riskPatch = { ...risk, status: "Materialized", converted_issue_id: existing.id };
        const ops = [
          ...(issuePatch ? [{ coll: "issues", rec: issuePatch }] : []),
          { coll: "risks", rec: riskPatch },
        ];
        await R.putAtomic(ops);
        return issuePatch || existing;
      }
      if (risk.status === "Materialized" || risk.converted_issue_id) throw new Error("الخطر معلّم كمحوّل لكن المشكلة المرتبطة غير موجودة؛ راجع السجلات قبل إعادة التحويل.");
      const issueId = uid();
      const issue = {
        id: issueId,
        title: risk.title,
        project_id: risk.project_id,
        severity: D.riskScore(risk) >= settings.riskHigh ? "High" : "Medium",
        status: "Open",
        discovered_at: todayStr(),
        owner_id: risk.owner_id || null,
        description: risk.notes || risk.mitigation || "",
        from_risk_id: risk.id,
      };
      const riskPatch = { ...risk, status: "Materialized", converted_issue_id: issueId };
      await R.putAtomic([{ coll: "issues", rec: issue }, { coll: "risks", rec: riskPatch }]);
      act("risks", risk.id, "materialized", risk.title);
      return issue;
    },
    async convertDiscoveryToTask(discoveryId, projectId) {
      const discovery = (data.discovery || []).find((item) => item.id === discoveryId);
      const project = projectsById[projectId];
      if (!discovery || !project || project.is_system || project.archived_at) throw new Error("اختر اكتشافًا ومشروعًا نشطًا صالحين.");
      const linkedProjects = (discovery.project_ids || []).filter((id) => projectsById[id] && !projectsById[id].archived_at);
      if ((discovery.project_ids || []).length && !linkedProjects.includes(projectId)) throw new Error("المشروع الهدف يجب أن يكون من المشاريع المرتبطة النشطة بالاكتشاف.");
      const existing = (data.tasks || []).find((item) => (item.discovery_ids || []).includes(discoveryId));
      if (existing && existing.project_id !== projectId) throw new Error("يوجد بالفعل مسار مهمة لهذا الاكتشاف في مشروع آخر. افتح المهمة الحالية أو حدّث ارتباطها قبل إعادة التحويل.");
      if (existing) {
        const links = [...new Map([...(discovery.resolution_links || []), { kind: "task", id: existing.id }].map((link) => [link.kind + ":" + link.id, link])).values()];
        await R.putAtomic([{ coll: "discovery", rec: { ...discovery, status: "Completed", resolution_links: links } }]);
        return existing;
      }
      if ((discovery.resolution_links || []).some((link) => link.kind === "task")) throw new Error("للاكتشاف رابط مهمة قائم؛ حدّث الرابط بدل إنشاء نسخة جديدة.");
      const taskId = uid();
      const task = {
        id: taskId,
        title: discovery.title,
        project_id: projectId,
        description: discovery.proposed_solution || discovery.description || "",
        assignee_id: discovery.owner_id || null,
        priority: discovery.impact_level === "Critical" ? "Urgent" : discovery.impact_level === "High" ? "High" : "Medium",
        status: "Not Started",
        planning_bucket: "Inbox",
        discovery_ids: [discoveryId],
        created_by: me,
        sort_order: Date.now(),
      };
      const errs = D.validateTaskRefs({ ...task, id: taskId }, { projectsById, tasksById: idx.byId, prdsById });
      if (errs.length) throw new Error(errs[0]);
      if (D.traceabilityBlocked(settings, project.type, project.is_system, task)) throw new Error("سياسة التتبع تمنع إنشاء مهمة دون ربط مواصفة أو اكتشاف.");
      const links = [...new Map([...(discovery.resolution_links || []), { kind: "task", id: taskId }].map((link) => [link.kind + ":" + link.id, link])).values()];
      await R.putAtomic([{ coll: "tasks", rec: task }, { coll: "discovery", rec: { ...discovery, status: "Completed", resolution_links: links } }]);
      act("discovery", discovery.id, "converted_to_task", task.title);
      return task;
    },
    async convertDiscoveryToProject(discoveryId) {
      const discovery = (data.discovery || []).find((item) => item.id === discoveryId);
      if (!discovery) throw new Error("الاكتشاف غير موجود.");
      const existing = (data.projects || []).find((item) => item.source_discovery_id === discoveryId);
      if (existing) {
        const links = [...new Map([...(discovery.resolution_links || []), { kind: "project", id: existing.id }].map((link) => [link.kind + ":" + link.id, link])).values()];
        const projectIds = [...new Set([...(discovery.project_ids || []), existing.id])];
        await R.putAtomic([{ coll: "discovery", rec: { ...discovery, project_ids: projectIds, status: "Completed", resolution_links: links } }]);
        return existing;
      }
      const projectId = uid();
      const project = {
        id: projectId, name: discovery.title, type: "أخرى", status: "Idea",
        priority: discovery.impact_level === "Critical" ? "High" : "Medium",
        description: discovery.description || "", visibility: "workspace",
        source_discovery_id: discovery.id, lead_id: discovery.owner_id || me,
        members: [{ member_id: discovery.owner_id || me, role: "Lead" }],
        created_by: me,
      };
      const links = [...new Map([...(discovery.resolution_links || []), { kind: "project", id: projectId }].map((link) => [link.kind + ":" + link.id, link])).values()];
      const projectIds = [...new Set([...(discovery.project_ids || []), projectId])];
      await R.putAtomic([
        { coll: "projects", rec: project },
        { coll: "discovery", rec: { ...discovery, project_ids: projectIds, status: "Completed", resolution_links: links } },
      ]);
      act("projects", projectId, "created_from_discovery", project.name);
      return project;
    },
    async convertDiscoveryToPrd(discoveryId, projectId) {
      const discovery = (data.discovery || []).find((item) => item.id === discoveryId);
      const project = projectsById[projectId];
      if (!discovery || !project || project.is_system || project.archived_at) throw new Error("اختر اكتشافًا ومشروعًا نشطًا صالحين.");
      const linkedProjects = (discovery.project_ids || []).filter((id) => projectsById[id] && !projectsById[id].archived_at);
      if ((discovery.project_ids || []).length && !linkedProjects.includes(projectId)) throw new Error("المشروع الهدف يجب أن يكون من المشاريع المرتبطة النشطة بالاكتشاف.");
      const existing = (data.prds || []).find((item) => (item.discovery_ids || []).includes(discoveryId));
      if (existing && existing.project_id !== projectId) throw new Error("توجد مواصفة مرتبطة بهذا الاكتشاف في مشروع آخر؛ لن نعيد ربطها بمشروع غير مطابق.");
      const prdId = existing?.id || uid();
      const prd = existing || {
        id: prdId, title: discovery.title, project_id: projectId, status: "In Progress", version: 1, lead_id: me,
        tldr: discovery.description || "",
        sections: [
          { key: "problem_overview", title: "نظرة عامة", group: "المشكلة", content: discovery.description || "" },
          { key: "evidence", title: "الأدلة", group: "المشكلة", content: discovery.insights || "" },
          { key: "proposed_solution", title: "الحل المقترح (ملخص)", group: "المشكلة", content: discovery.proposed_solution || "" },
        ],
        approvals: [], reviewer_ids: [], discovery_ids: [discoveryId],
      };
      const links = [...new Map([...(discovery.resolution_links || []), { kind: "prd", id: prdId }].map((link) => [link.kind + ":" + link.id, link])).values()];
      await R.putAtomic([
        { coll: "prds", rec: prd },
        { coll: "discovery", rec: { ...discovery, status: "Completed", resolution_links: links } },
      ]);
      if (!existing) act("discovery", discovery.id, "converted_to_prd", prd.title);
      return prd;
    },
    async convertDiscoveryToIssue(discoveryId, projectId, discoveredAt) {
      const discovery = (data.discovery || []).find((item) => item.id === discoveryId);
      const project = projectsById[projectId];
      if (!discovery || !project || project.is_system || project.archived_at) throw new Error("اختر اكتشافًا ومشروعًا نشطًا صالحين.");
      const linkedProjects = (discovery.project_ids || []).filter((id) => projectsById[id] && !projectsById[id].archived_at);
      if ((discovery.project_ids || []).length && !linkedProjects.includes(projectId)) throw new Error("المشروع الهدف يجب أن يكون من المشاريع المرتبطة النشطة بالاكتشاف.");
      const existing = (data.issues || []).find((item) => item.from_discovery_id === discoveryId);
      if (existing && existing.project_id !== projectId) throw new Error("توجد مشكلة مرتبطة بهذا الاكتشاف في مشروع آخر؛ لن نعيد ربط الاكتشاف بمشروع غير مطابق.");
      if (existing) {
        const links = [...new Map([...(discovery.resolution_links || []), { kind: "issue", id: existing.id }].map((link) => [link.kind + ":" + link.id, link])).values()];
        await R.putAtomic([{ coll: "discovery", rec: { ...discovery, status: "Completed", resolution_links: links } }]);
        return existing;
      }
      if ((discovery.resolution_links || []).some((link) => link.kind === "issue")) throw new Error("للاكتشاف رابط مشكلة قائم؛ حدّث الرابط بدل إنشاء نسخة جديدة.");
      const issueId = uid();
      const issue = {
        id: issueId,
        title: discovery.title,
        project_id: projectId,
        severity: discovery.impact_level || "Medium",
        status: "Open",
        discovered_at: discoveredAt || todayStr(),
        owner_id: discovery.owner_id || null,
        description: discovery.description || "",
        from_discovery_id: discovery.id,
      };
      const links = [...new Map([...(discovery.resolution_links || []), { kind: "issue", id: issueId }].map((link) => [link.kind + ":" + link.id, link])).values()];
      await R.putAtomic([{ coll: "issues", rec: issue }, { coll: "discovery", rec: { ...discovery, status: "Completed", resolution_links: links } }]);
      act("discovery", discovery.id, "converted_to_issue", issue.title);
      return issue;
    },
    // Create a repair task and link it to its issue in one server transaction.
    async createRepairTask(issue) {
      if (!issue?.id || !issue.project_id || !projectsById[issue.project_id] || projectsById[issue.project_id].is_system) throw new Error("المشكلة أو المشروع غير صالح.");
      const currentIssue = (data.issues || []).find((item) => item.id === issue.id);
      if (!currentIssue || currentIssue.project_id !== issue.project_id) throw new Error("تعذّر العثور على المشكلة في المشروع نفسه.");
      const linkedIds = new Set([...(currentIssue.task_ids || []), ...idx.list.filter((t) => (t.issue_ids || []).includes(currentIssue.id)).map((t) => t.id)]);
      if ([...linkedIds].some((id) => idx.byId[id])) throw new Error("توجد مهمة إصلاح مرتبطة بالفعل بهذه المشكلة.");
      const taskId = uid();
      const task = {
        id: taskId,
        title: `إصلاح: ${currentIssue.title}`,
        project_id: currentIssue.project_id,
        description: currentIssue.description || "",
        priority: currentIssue.severity === "Critical" ? "Urgent" : currentIssue.severity === "High" ? "High" : "Medium",
        status: "Not Started",
        planning_bucket: "Inbox",
        issue_ids: [currentIssue.id],
        created_by: me,
        sort_order: Date.now(),
      };
      const issuePatch = { ...currentIssue, task_ids: [...new Set([...(currentIssue.task_ids || []), taskId])] };
      const errs = D.validateTaskRefs({ ...task, id: taskId }, { projectsById, tasksById: idx.byId, prdsById });
      if (errs.length) throw new Error(errs[0]);
      if (D.traceabilityBlocked(settings, projectsById[task.project_id].type, projectsById[task.project_id].is_system, task)) throw new Error("سياسة التتبع تمنع إنشاء مهمة إصلاح دون ربط مواصفة أو اكتشاف.");
      await R.putAtomic([{ coll: "tasks", rec: task }, { coll: "issues", rec: issuePatch }]);
      act("issues", currentIssue.id, "repair_task_created", task.title);
      return task;
    },
    async createDecisionTask(decisionId) {
      const decision = (data.decisions || []).find((x) => x.id === decisionId);
      const project = decision && projectsById[decision.project_id];
      if (!decision || !project || project.is_system || project.archived_at) throw new Error("القرار أو المشروع غير صالح.");
      if (decision.status !== "Approved") throw new Error("اعتمد القرار قبل إنشاء مهمة تنفيذ له.");
      if (!can("decision.write", project) || !can("task.write", project)) throw new Error("لا تملك صلاحية اعتماد إجراءات القرار في هذا المشروع.");
      const linkedIds = [...new Set(decision.implementation_task_ids || [])];
      const stableTaskId = "decision_task_" + decision.id;
      const existing = linkedIds.map((id) => idx.byId[id]).find(Boolean) || idx.byId[stableTaskId];
      if (existing) {
        if (!linkedIds.includes(existing.id)) await R.put("decisions", { ...decision, implementation_task_ids: [...linkedIds, existing.id] });
        return existing;
      }
      if (linkedIds.some((id) => (data.tasks || []).some((t) => t.id === id)) || (data.tasks || []).some((t) => t.id === stableTaskId)) throw new Error("توجد مهمة تنفيذ مؤرشفة أو في السلة؛ استعدها بدل إنشاء نسخة مكررة.");
      const taskId = stableTaskId;
      const prdId = decision.prd_id || (decision.affected_prd_ids || []).find((id) => data.prds.some((p) => p.id === id && p.project_id === decision.project_id)) || null;
      const task = { id: taskId, title: "تنفيذ القرار: " + decision.title, project_id: decision.project_id, description: [decision.rationale, decision.expected_impact && ("الأثر المتوقع: " + decision.expected_impact)].filter(Boolean).join("\\n\\n"), priority: "Medium", status: "Not Started", planning_bucket: "Inbox", prd_id: prdId, discovery_ids: [...new Set(decision.affected_discovery_ids || [])], created_by: me, sort_order: Date.now() };
      const errs = D.validateTaskRefs(task, { projectsById, tasksById: idx.byId, prdsById });
      if (errs.length) throw new Error(errs[0]);
      if (D.traceabilityBlocked(settings, project.type, project.is_system, task)) throw new Error("سياسة التتبع تتطلب ربط القرار بمواصفة أو اكتشاف قبل إنشاء المهمة.");
      const decisionPatch = { ...decision, implementation_task_ids: [...linkedIds, taskId] };
      await R.putAtomic([{ coll: "tasks", rec: task }, { coll: "decisions", rec: decisionPatch }]);
      act("decisions", decision.id, "implementation_task_created", task.title);
      return task;
    },
    // tasks
    async saveTask(v, isNew) {
      const project = projectsById[v.project_id];
      const errs = D.validateTaskRefs({ ...v, id: v.id || "new" }, { projectsById, tasksById: idx.byId, prdsById }); if (errs.length) throw new Error(errs[0]);
      for (const discoveryId of (v.discovery_ids || [])) { const discovery = data.discovery.find((d) => d.id === discoveryId); if (!discovery) throw new Error("عنصر اكتشاف مرتبط غير موجود"); if ((discovery.project_ids || []).length && !discovery.project_ids.includes(v.project_id)) throw new Error("عنصر الاكتشاف يجب أن يكون مرتبطاً بالمشروع نفسه"); }
      if (D.traceabilityBlocked(settings, project && project.type, project && project.is_system, v)) throw new Error("سياسة التتبع: هذا النوع من المشاريع يتطلب ربط المهمة بمواصفة أو اكتشاف");
      const rec = { ...v, id: v.id || uid(), planning_bucket: v.planning_bucket || "Inbox", status: v.status || "Not Started" };
      const prev = v.id ? idx.byId[v.id] || (recs.tasks || {})[v.id] : null;
      let firstChildParentPatch = null;
      if (isNew) {
        rec.created_by = me; rec.sort_order = rec.sort_order || Date.now();
        if (rec.parent_task_id) {
          const par = idx.byId[rec.parent_task_id];
          if (par && idx.isLeaf(par.id)) {
            const fc = D.onFirstChild(par);
            if (fc.warnCompleted && !(await confirm("المهمة الأب كانت «مكتملة». ستصبح مجمّعاً وتُشتق حالتها من أبنائها. متابعة؟"))) return null;
            firstChildParentPatch = fc.patch;
          }
        }
      }
      const becameDone = D.cat(rec.status) === "done" && (!prev || D.cat(prev.status) !== "done");
      if (becameDone) { rec.completed_at = nowIso(); rec.completed_by = me; } else if (prev && D.cat(rec.status) !== "done") { rec.completed_at = null; }
      if (D.cat(rec.status) === "cancelled" && !rec.cancelled_reason) throw new Error("V-19: سبب الإلغاء مطلوب");
      if (prev && rec.assignee_id !== prev.assignee_id && rec.assignee_id && rec.assignee_id !== me) act("tasks", rec.id, "assigned", nameOf(rec.assignee_id));
      if (firstChildParentPatch) {
        const parentProject = projectsById[firstChildParentPatch.project_id] || project;
        const saved = await R.putAtomic([
          { coll: "tasks", rec: { ...stamp(firstChildParentPatch), _vis: visFor(parentProject) } },
          { coll: "tasks", rec: { ...stamp(rec), _vis: visFor(project) } },
        ]);
        if (!Array.isArray(saved) || !saved[1]) throw new Error("لم يتم حفظ المهمة الجديدة وتحديث المهمة الأب معًا.");
        return saved[1];
      }
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
      const nextTask = { ...t, parent_task_id: newParentId || null, sort_order: Date.now() };
      if (newParentId) {
        const par = idx.byId[newParentId];
        if (par && idx.isLeaf(par.id)) {
          const fc = D.onFirstChild(par);
          if (fc.warnCompleted && !(await confirm("المهمة الأب مكتملة. عند إضافة ابن ستصبح حالتها مشتقة من أبنائها. هل تريد المتابعة؟", { title: "تغيير بنية المهام", ok: "متابعة" }))) return false;
          const project = projectsById[par.project_id] || projectsById[t.project_id];
          const saved = await R.putAtomic([
            { coll: "tasks", rec: { ...stamp(fc.patch), _vis: visFor(project) } },
            { coll: "tasks", rec: { ...stamp(nextTask), _vis: visFor(projectsById[t.project_id] || project) } },
          ]);
          if (!Array.isArray(saved) || !saved[1]) throw new Error("لم يتم حفظ نقل المهمة وتحديث الأب معًا.");
          return true;
        }
      }
      await putIn("tasks", nextTask, projectsById[t.project_id]); return true;
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
      const open = D.completeAllBranches(taskId, idx); if (!open.length) { toast("لا توجد فروع مفتوحة"); return false; }
      if (!(await confirm(`إكمال ${open.length} مهمة في هذا الفرع؟`))) return false;
      try {
        await R.putAtomic(open.map((t) => ({ coll: "tasks", rec: { ...t, status: "Completed", completed_at: nowIso(), completed_by: me } })));
      } catch (error) {
        toast("⛔ لم يكتمل تحديث الفرع: " + (error?.message || "فشل الحفظ") + ". لم تُحفظ مجموعة جزئية.");
        return false;
      }
      toast("✅ تم إكمال الفرع"); return true;
    },
    async archiveTree(taskId) {
      const root = idx.byId[taskId]; if (!root) { toast("⛔ المهمة غير موجودة"); return false; }
      const ids = [taskId, ...idx.descendants(taskId)];
      if (!(await confirm(`أرشفة ${ids.length} مهمة؟ لن تدخل في أي عدّاد.`))) return false;
      const archivedAt = nowIso();
      try {
        await R.putAtomic(ids.map((id) => ({ coll: "tasks", rec: { ...idx.byId[id], archived_at: archivedAt } })));
      } catch (error) {
        toast("⛔ لم تكتمل الأرشفة: " + (error?.message || "فشل الحفظ") + ". لم تُحفظ مجموعة جزئية.");
        return false;
      }
      toast("✅ تمت أرشفة الشجرة"); return true;
    },
    async deleteTree(taskId) {
      const root = idx.byId[taskId]; if (!root) { toast("⛔ المهمة غير موجودة"); return false; }
      const ids = [taskId, ...idx.descendants(taskId)];
      if (!(await confirm(`نقل ${ids.length} مهمة إلى السلة؟`, { danger: true }))) return false;
      const deletedAt = nowIso();
      try {
        await R.putAtomic(ids.map((id) => ({ coll: "tasks", rec: { ...idx.byId[id], deleted_at: deletedAt, deleted_by: me } })));
      } catch (error) {
        toast("⛔ لم يكتمل النقل إلى السلة: " + (error?.message || "فشل الحفظ") + ". لم تُحفظ مجموعة جزئية.");
        return false;
      }
      act("tasks", taskId, "deleted", root.title); toast("🗑 نُقلت الشجرة إلى السلة"); return true;
    },
    // time
    async startTimer(taskId) {
      const task = idx.byId[taskId];
      if (!task || !idx.isLeaf(taskId)) throw new Error("اختَر مهمة موجودة ونهائية في شجرة المهام قبل بدء المؤقّت.");
      if (!can("session.write", projectsById[task.project_id])) throw new Error("لا تملك صلاحية تسجيل جلسة لهذا المشروع.");
      const cur = (recs.timers || {})["timer_" + me]; if (cur && cur.task_id && !cur.ended_at) { toast("⛔ TIMER_ALREADY_RUNNING — أوقف المؤقّت الحالي أولاً"); return false; }
      await R.put("timers", { id: "timer_" + me, member_id: me, task_id: taskId, started_at: nowIso(), ended_at: null }); return true;
    },
    async stopTimer(note) {
      const cur = (recs.timers || {})["timer_" + me]; if (!cur || !cur.task_id || cur.ended_at) return null;
      const task = idx.byId[cur.task_id];
      if (!task || !idx.isLeaf(cur.task_id) || !can("session.write", projectsById[task.project_id])) {
        toast("⛔ تعذّر تسجيل الجلسة: المهمة لم تعد متاحة أو تغيّرت صلاحيات المشروع.");
        return null;
      }
      const end = nowIso(); const minutes = Math.min(1440, Math.max(1, Math.round((new Date(end) - new Date(cur.started_at)) / 60000)));
      const s = { id: D.sessionId(me, cur.started_at), member_id: me, task_id: cur.task_id, date: dateOf(cur.started_at, settings.timezone), minutes, started_at: cur.started_at, ended_at: end, note: note || "", source: "timer", client_generated_id: cur.started_at };
      const errs = D.validateSession(s); if (errs.length) { toast("⛔ " + errs[0]); return null; }
      await R.put("sessions", stamp(s)); await R.put("timers", { ...cur, task_id: null, started_at: null, ended_at: end }); return s;
    },
    async discardTimer() { const cur = (recs.timers || {})["timer_" + me]; if (cur) await R.put("timers", { ...cur, task_id: null, started_at: null, ended_at: nowIso() }); },
    async addSession(v) {
      const task = idx.byId[v?.task_id];
      if (!task || !idx.isLeaf(task.id)) throw new Error("الجلسة يجب أن ترتبط بمهمة موجودة ونهائية في شجرة المهام.");
      if (!can("session.write", projectsById[task.project_id])) throw new Error("لا تملك صلاحية تسجيل جلسة لهذا المشروع.");
      const s = { ...v, member_id: me, source: v.source || "manual", id: v.id || D.sessionId(me, uid()) };
      const errs = D.validateSession(s); if (errs.length) throw new Error(errs[0]);
      return R.put("sessions", stamp(s));
    },
    async voidSession(s, reason) { await R.put("sessions", { ...s, voided_at: nowIso(), voided_by: me, void_reason: reason || "" }); },
    // generic
    put: (coll, rec, project) => putIn(coll, rec, project), del, restore: (coll, id) => R.restore(coll, id).then(() => toast("♻️ تم الاسترجاع")), permanentlyDeleteProject: async (p) => { if (!p || !p.deleted_at) return false; if (p.id === GENERAL_ID || p.is_system) { toast("⛔ لا يمكن حذف مشروع النظام نهائيًا."); return false; } const collections = ["tasks", "outputs", "risks", "issues", "decisions", "prds", "updates"]; const related = collections.flatMap((coll) => arr(recs, coll).filter((record) => record.project_id === p.id && record.deleted_at === p.deleted_at && (record.deleted_by || null) === (p.deleted_by || null)).map((rec) => ({ coll, rec }))); const counts = {}; for (const { coll } of related) counts[coll] = (counts[coll] || 0) + 1; const labels = { tasks: "مهام", outputs: "مخرجات", risks: "مخاطر", issues: "مشكلات", decisions: "قرارات", prds: "مواصفات", updates: "تحديثات" }; const summary = Object.entries(counts).map(([coll, count]) => "• " + (labels[coll] || coll) + ": " + count).join("\\n") || "لا توجد سجلات تابعة من دفعة الحذف نفسها."; const ops = [...related, { coll: "projects", rec: p }]; if (ops.length > 1000) { toast("⛔ يتجاوز الحذف النهائي 1000 سجل؛ لم يُحذف شيء."); return false; } const message = "تحذير: هذا الإجراء نهائي ولا يمكن التراجع عنه.\\n\\nسيُحذف المشروع «" + p.name + "» وجميع السجلات التي نُقلت معه في دفعة الحذف نفسها:\\n" + summary + "\\n\\nالسجلات التي كانت في السلة قبل حذف المشروع لن تُحذف معه. جلسات الوقت التاريخية ستبقى محفوظة.\\n\\nهل تريد المتابعة؟"; if (!(await confirm(message, { title: "حذف نهائي لا يمكن التراجع عنه", danger: true, ok: "حذف المشروع وسجلاته نهائيًا", cancel: "إلغاء" }))) return false; try { await R.purgeAtomic({ projectId: p.id, deletedAt: p.deleted_at, deletedBy: p.deleted_by, ops }); } catch (error) { toast("⛔ لم يُحذف المشروع نهائيًا: " + (error?.message || "فشل الحذف") + "."); return false; } act("projects", p.id, "permanently_deleted", p.name); toast("🧹 تم حذف المشروع وسجلات دفعة الحذف نفسها نهائيًا. جلسات الوقت التاريخية محفوظة."); return true; }, restoreTrashRecord: async (coll, rec) => { if (!rec) return false; if (coll === "projects") return A.restoreProjectFromTrash(rec); const project = rec.project_id && arr(recs, "projects").find((item) => item.id === rec.project_id && item.deleted_at); if (project && rec.deleted_at === project.deleted_at && (rec.deleted_by || null) === (project.deleted_by || null)) { toast("ℹ️ هذا السجل جزء من مشروع موجود في السلة؛ استرجع المشروع لاسترجاعهما معًا."); return false; } try { const restored = await R.restore(coll, rec.id); if (!restored) throw new Error("لم يؤكد مخزن البيانات الاسترجاع"); toast("♻️ تم استرجاع السجل"); return true; } catch (error) { toast("⛔ تعذّر استرجاع السجل: " + (error?.message || "فشل الحفظ")); return false; } },
    async saveSettings(patch) { return R.put("settings", { id: "ws", ...((recs.settings || {}).ws || {}), ...patch }); },
    async saveLookups(lists) { return R.put("lookups", { id: "main", lists }); },
    act,
  }), [R, recs, idx, data, settings, projectsById, prdsById, me, confirm, toast, putIn, visFor, stamp, act, del, nameOf, can]);

  const alerts = useMemo(() => (ready ? D.computeAlerts(me, { idx, issues: data.issues, projects: data.projects, contacts: data.contacts, discovery: data.discovery, krs: data.krs, checkins: data.checkins, timers: data.timers, wins: data.wins, today, settings, metrics }) : []), [ready, me, idx, data, today, settings, metrics]);
  const timer = (recs.timers || {})["timer_" + me]; const runningTimer = timer && timer.task_id && !timer.ended_at ? timer : null;

  // shell bridge: badges + notification bell
  useEffect(() => { if (shell && shell.publish) shell.publish("projects", { notifCount: alerts.length, openNotifs: () => setPage("today") }); }, [alerts.length]);

  const value = { shell, ws, isDemo, me, role, access, people, nameOf, settings, lookups, today, weekStartStr, recs, data, trash, projectsById, prdsById, idx, metrics, projectProgress, can, projectRole, visFor, A, R, confirm, toast, alerts, runningTimer, view, setView, page, setPage, pending, online, ready, error, store,
    openProject: (id, tab) => { setView({ projectId: id, tab: tab || "overview", taskId: null }); setPage("projects"); },
    openTask: (id) => setView((v) => ({ ...v, taskId: id })), closeTask: () => setView((v) => ({ ...v, taskId: null })), templates: [...BUILTIN_TEMPLATES, ...data.templates], PRD_TEMPLATE };
  return <Ctx.Provider value={value}>{children}{confirmNode}</Ctx.Provider>;
}
