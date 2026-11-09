// Domain acceptance tests for Projects OS (plan §18). Run: node tests/t_projects_domain.mjs
import assert from "node:assert/strict";
import * as D from "../src/systems/projects/domain.js";
import { BUILTIN_TEMPLATES, activityEventText } from "../src/systems/projects/lookups.js";

let pass = 0, fail = 0;
const t = (name, fn) => { try { fn(); pass++; console.log("  ✓", name); } catch (e) { fail++; console.log("  ✗", name, "\n     ", e.message); } };
const task = (id, o = {}) => ({ id, project_id: "p1", parent_task_id: null, title: id, status: "Not Started", planning_bucket: "Inbox", ...o });
const TODAY = "2026-10-25";
const ctx = (tasks, extra = {}) => ({ idx: D.buildTaskIndex(tasks, extra.sessions || []), risks: [], issues: [], decisions: [], outputs: [], sessions: [], today: TODAY, settings: D.DEFAULT_SETTINGS, ...extra });
const P = (o = {}) => ({ id: "p1", name: "P", status: "In Progress", target_date: null, ...o });

console.log("Tree & progress");
t("T-01 parent is never a leaf", () => { const i = D.buildTaskIndex([task("a"), task("b", { parent_task_id: "a" })]); assert.equal(i.isLeaf("a"), false); assert.equal(i.isLeaf("b"), true); });
t("T-02 two leaves, one done => 50%", () => { const m = D.projectMetrics(P(), ctx([task("a", { status: "Completed" }), task("b")])); assert.equal(m.progress, 0.5); });
t("T-04 cancelled leaf leaves numerator+denominator", () => { const m = D.projectMetrics(P(), ctx([task("a", { status: "Completed" }), task("b", { status: "Cancelled", cancelled_reason: "x" }), task("c")])); assert.equal(m.progress, 0.5); assert.equal(m.leafTotal, 2); });
t("T-05 no active leaves => Not Measurable (null)", () => { assert.equal(D.projectMetrics(P(), ctx([])).progress, null); assert.equal(D.projectMetrics(P(), ctx([task("a", { status: "Cancelled" })])).progress, null); });
t("T-06 progress works across 3+ levels", () => { const i = D.buildTaskIndex([task("a"), task("b", { parent_task_id: "a" }), task("c", { parent_task_id: "b" }), task("d", { parent_task_id: "b", status: "Completed" }), task("e", { parent_task_id: "a", status: "Completed" })]); assert.equal(i.derived.a.progress, 2 / 3); assert.equal(i.derived.b.progress, 0.5); });
t("T-07 parent status is derived", () => { const i = D.buildTaskIndex([task("a", { status: "Completed" }), task("b", { parent_task_id: "a", status: "Not Started" })]); assert.equal(D.effectiveStatus(i.byId.a, i), "Not Started"); const j = D.buildTaskIndex([task("a"), task("b", { parent_task_id: "a", status: "Completed" }), task("c", { parent_task_id: "a", status: "In Progress" })]); assert.equal(D.effectiveStatus(j.byId.a, j), "In Progress"); const k = D.buildTaskIndex([task("a"), task("b", { parent_task_id: "a", status: "Completed" })]); assert.equal(D.effectiveStatus(k.byId.a, k), "Completed"); const l = D.buildTaskIndex([task("a"), task("b", { parent_task_id: "a", status: "Cancelled" })]); assert.equal(D.effectiveStatus(l.byId.a, l), "Cancelled"); });
t("T-08 first child keeps previous status + warns when Completed", () => { const r = D.onFirstChild(task("a", { status: "Completed" })); assert.equal(r.patch.previous_status, "Completed"); assert.equal(r.warnCompleted, true); });
t("T-09 parent returns to leaf when last child archived", () => { const i = D.buildTaskIndex([task("a"), task("b", { parent_task_id: "a", archived_at: "2026-01-01" })]); assert.equal(i.isLeaf("a"), true); });
t("T-10 reparent rejects self and cycles", () => { const i = D.buildTaskIndex([task("a"), task("b", { parent_task_id: "a" }), task("c", { parent_task_id: "b" })]); assert.equal(D.canReparent("a", "a", i).ok, false); assert.equal(D.canReparent("a", "c", i).ok, false); assert.equal(D.canReparent("c", "a", i).ok, true); assert.equal(D.canReparent("c", null, i).ok, true); });
t("T-11 different project parent rejected", () => { const i = D.buildTaskIndex([task("a"), task("b", { project_id: "p2" })]); assert.equal(D.canReparent("b", "a", i).ok, false); const errs = D.validateTaskRefs({ id: "x", project_id: "p2", parent_task_id: "a", status: "Not Started" }, { projectsById: { p1: {}, p2: {} }, tasksById: i.byId, prdsById: {} }); assert.ok(errs.some((e) => e.includes("V-05"))); });
t("T-12 tree move moves descendants and clears foreign prd", () => { const i = D.buildTaskIndex([task("a", { prd_id: "prd1" }), task("b", { parent_task_id: "a", prd_id: "prd2" })]); const r = D.planTreeMove("a", "p2", i, { prd1: { project_id: "p1" }, prd2: { project_id: "p2" } }); assert.equal(r.ids.length, 2); assert.ok(r.patches.every((p) => p.project_id === "p2")); assert.equal(r.patches[0].prd_id, null); assert.equal(r.patches[1].prd_id, "prd2"); assert.equal(r.patches[0].parent_task_id, null); });
t("T-12a tree move includes archived descendants and clears invalid discovery links", () => { const tasks = [task("a"), task("b", { parent_task_id: "a", archived_at: "2026-01-01", discovery_ids: ["d1", "d2"] })]; const i = D.buildTaskIndex(tasks); const r = D.planTreeMove("a", "p2", i, {}, tasks, { d1: { project_ids: ["p1"] }, d2: { project_ids: [] } }); assert.deepEqual(r.ids, ["a", "b"]); assert.equal(r.patches[1].archived_at, "2026-01-01"); assert.deepEqual(r.patches[1].discovery_ids, ["d2"]); assert.equal(r.patches[1].parent_task_id, "a"); });
t("T-13 explicit project_id required (V-01)", () => { assert.ok(D.validateTaskRefs({ id: "x", status: "Not Started" }, {}).some((e) => e.includes("V-01"))); });
t("T-14/V-15 parent estimated is the sum of children", () => { const i = D.buildTaskIndex([task("a", { estimated_minutes: 999 }), task("b", { parent_task_id: "a", estimated_minutes: 30 }), task("c", { parent_task_id: "a", estimated_minutes: 45 })]); assert.equal(i.derived.a.estimated, 75); });
t("T-14 parent due is max of children", () => { const i = D.buildTaskIndex([task("a"), task("b", { parent_task_id: "a", due_date: "2026-11-01" }), task("c", { parent_task_id: "a", due_date: "2026-11-09" })]); assert.equal(i.derived.a.dueMax, "2026-11-09"); });
t("T-15 Icebox not overdue, stays in denominator", () => { const m = D.projectMetrics(P(), ctx([task("a", { due_date: "2026-01-01", planning_bucket: "Icebox" }), task("b", { status: "Completed" })])); assert.equal(m.overdueLeafCount, 0); assert.equal(m.progress, 0.5); });
t("T-16 archived/deleted excluded from counters", () => { const m = D.projectMetrics(P(), ctx([task("a"), task("b", { deleted_at: "x" }), task("c", { archived_at: "x" })])); assert.equal(m.leafTotal, 1); });
t("T-17 complete-all-branches lists open leaves only", () => { const i = D.buildTaskIndex([task("a"), task("b", { parent_task_id: "a" }), task("c", { parent_task_id: "a", status: "Completed" }), task("d", { parent_task_id: "a", status: "Cancelled" })]); assert.deepEqual(D.completeAllBranches("a", i).map((x) => x.id), ["b"]); });
t("T-20 statuses evaluated by category", () => { assert.equal(D.cat("Completed"), "done"); assert.equal(D.cat("In Progress"), "active"); assert.equal(D.cat("Cancelled"), "cancelled"); });
t("T-25 property: progress = done leaves / active leaves for random trees", () => {
  let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let n = 0; n < 200; n++) {
    const tasks = []; const count = 1 + Math.floor(rnd() * 25);
    for (let i = 0; i < count; i++) tasks.push(task("t" + i, { parent_task_id: i && rnd() < 0.6 ? "t" + Math.floor(rnd() * i) : null, status: ["Not Started", "In Progress", "Completed", "Cancelled"][Math.floor(rnd() * 4)] }));
    const idx = D.buildTaskIndex(tasks); const leaves = tasks.filter((x) => idx.isLeaf(x.id)); const act = leaves.filter((x) => x.status !== "Cancelled"); const dn = act.filter((x) => x.status === "Completed");
    const m = D.projectMetrics(P(), ctx(tasks)); assert.equal(m.progress, act.length ? dn.length / act.length : null);
  }
});
t("T-24 5,000-node tree builds fast", () => { const tasks = []; for (let i = 0; i < 5000; i++) tasks.push(task("t" + i, { parent_task_id: i ? "t" + Math.floor((i - 1) / 4) : null, status: i % 3 ? "Not Started" : "Completed" })); const t0 = Date.now(); const idx = D.buildTaskIndex(tasks); D.projectMetrics(P(), ctx(tasks)); assert.ok(Date.now() - t0 < 1500, "took " + (Date.now() - t0) + "ms"); assert.ok(idx.derived.t0.leafTotal > 0); });

t("T-80 project-to-template conversion preserves reusable structure and strips runtime state", () => {
  const project = {
    id: "source_project", name: "Koumma Source", type: "business", status: "In Progress",
    description: "Project description", final_goal: "Final goal",
    start_date: "2026-01-10", target_date: "2026-02-09",
    lead_id: "real_person_1", members: [{ member_id: "real_person_1", role: "Lead" }],
    template_roles: ["Product", "QA"], decision_prompts: ["حسم سياسة الإطلاق"],
    template_checklist: ["اعتماد النطاق"], archived_at: null
  };
  const tasks = [
    { id: "root", project_id: "source_project", title: "مرحلة البحث", sort_order: 1, status: "Completed", assignee_id: "real_person_1", completed_at: "2026-01-20", start_date: "2026-01-11", due_date: "2026-01-12", estimated_minutes: 90 },
    { id: "child", project_id: "source_project", parent_task_id: "root", title: "مقابلات المستخدمين", sort_order: 2, status: "Cancelled", assignee_id: "real_person_2", start_date: "2026-01-15", due_date: "2026-01-17", estimated_minutes: 45, prd_id: "prd1", prd_requirement_id: "req1" },
    { id: "orphan", project_id: "source_project", parent_task_id: "missing_parent", title: "مهمة يتيمة", sort_order: 3, status: "In Progress" },
    { id: "duplicate_a", project_id: "source_project", title: "مهمة مكررة", sort_order: 4, prd_id: "prd1", prd_requirement_id: "req2" },
    { id: "duplicate_b", project_id: "source_project", title: "مهمة مكررة", sort_order: 5 },
    { id: "other_project", project_id: "another_project", title: "لا تنقلني", sort_order: 1 }
  ];
  const prds = [{
    id: "prd1", project_id: "source_project", title: "Platform Architecture", tldr: "Architecture brief",
    status: "Approved", version: 3, lead_id: "real_person_1", approvals: [{ id: "approval1" }],
    requirements: [
      { id: "req1", title: "ERD", status: "Active", acceptance_criteria: "ERD documented", priority: "High" },
      { id: "req2", title: "Duplicate title task", status: "Active" },
      { id: "req3", title: "Old requirement", status: "Deprecated" }
    ]
  }];
  const outputs = [
    { id: "output1", project_id: "source_project", name: "ERD", type: "Document", task_id: "child", prd_id: "prd1", prd_requirement_id: "req1", approval: "Final", approved_by: "real_person_1", approved_at: "2026-01-20", url: "https://example.com", files: [{ object_path: "secret/path" }] },
    { id: "output2", project_id: "source_project", name: "Ambiguous output", type: "Document", task_id: "duplicate_a", prd_id: "prd1", prd_requirement_id: "req2", approval: "Draft" }
  ];
  const seed = D.projectToTemplateSeed(project, {
    tasks, prds, outputs,
    risks: [{ id: "risk1", project_id: "source_project", title: "Launch scope", probability: 4, impact: 5, status: "Closed", owner_id: "real_person_1", mitigation: "Phase the rollout", created_at: "2026-01-20" }],
    sessions: [{ id: "session1", task_id: "child", minutes: 90, member_id: "real_person_1" }]
  });
  assert.equal(seed.name, "Koumma Source — قالب");
  assert.equal(seed.project_type, "business");
  assert.equal(seed.duration_days, 30);
  assert.deepEqual(seed.team_roles, ["Product", "QA"]);
  assert.deepEqual(seed.decision_prompts, ["حسم سياسة الإطلاق"]);
  assert.deepEqual(seed.checklist, ["اعتماد النطاق"]);
  assert.equal(seed.task_tree.length, 4, "roots and recovered orphan tasks are all retained");
  assert.equal(seed.task_tree[0].title, "مرحلة البحث");
  assert.equal(seed.task_tree[0].children[0].title, "مقابلات المستخدمين");
  assert.equal(seed.task_tree[0].offset_days, 1);
  assert.equal(seed.task_tree[0].children[0].offset_days, 5);
  assert.equal(seed.task_tree[0].status, undefined);
  assert.equal(seed.task_tree[0].assignee_id, undefined);
  assert.equal(seed.task_tree[0].completed_at, undefined);
  assert.equal(seed.prd_templates.length, 1);
  assert.equal(seed.prd_templates[0].requirements.length, 2, "deprecated requirements are excluded");
  assert.equal(seed.prd_templates[0].requirements[0].task_title, "مقابلات المستخدمين");
  assert.equal(seed.prd_templates[0].requirements[1].task_title, null, "ambiguous duplicate task titles are not linked");
  assert.equal(seed.output_templates.length, 2);
  assert.deepEqual(seed.output_templates[0], {
    name: "ERD", type: "Document", task_title: "مقابلات المستخدمين",
    prd_title: "Platform Architecture", requirement_title: "ERD"
  });
  assert.equal(seed.output_templates[1].task_title, null, "ambiguous task links are not copied");
  assert.deepEqual(seed.risks, [{ title: "Launch scope", probability: 4, impact: 5, mitigation: "Phase the rollout" }]);
  assert.equal(seed.lead_id, undefined);
  assert.equal(seed.members, undefined);
  assert.equal(seed.sessions, undefined);
  assert.equal(seed.id, undefined, "template gets a new id only when saved");
});
t("T-79 output defaults inherit only valid task PRD and requirement links", () => {
  const task = { id: "task_1", project_id: "project_1", prd_id: "prd_1", prd_requirement_id: "req_1" };
  const validPrds = [{ id: "prd_1", project_id: "project_1", requirements: [{ id: "req_1", status: "Active" }] }];
  assert.deepEqual(D.defaultOutputRelationsForTask(task, validPrds), { prd_id: "prd_1", prd_requirement_id: "req_1" });
  assert.deepEqual(D.defaultOutputRelationsForTask({ ...task, project_id: "project_2" }, validPrds), { prd_id: "", prd_requirement_id: "" });
  assert.deepEqual(D.defaultOutputRelationsForTask({ ...task, prd_requirement_id: "req_missing" }, validPrds), { prd_id: "prd_1", prd_requirement_id: "" });
  assert.deepEqual(D.defaultOutputRelationsForTask(task, [{ ...validPrds[0], archived_at: "2026-11-01" }]), { prd_id: "", prd_requirement_id: "" });
  assert.deepEqual(D.defaultOutputRelationsForTask(task, [{ ...validPrds[0], requirements: [{ id: "req_1", status: "Deprecated" }] }]), { prd_id: "prd_1", prd_requirement_id: "" });
});
t("T-78 activity events use human-readable Arabic descriptions", () => {
  assert.equal(activityEventText({ entity: "tasks", action: "created", summary: "تحليل المنافسين" }), "أنشأ المهمة «تحليل المنافسين»");
  assert.equal(activityEventText({ entity: "projects", action: "created_from_template", summary: "تطبيق" }), "أنشأ مشروعًا من قالب «تطبيق»");
  assert.equal(activityEventText({ entity: "risks", action: "materialized", summary: "تأخر الإطلاق" }), "حوّل خطرًا إلى مشكلة «تأخر الإطلاق»");
  assert.equal(activityEventText({ entity: "prds", action: "version_created", summary: "Platform Architecture v2" }), "أنشأ إصدارًا جديدًا للمواصفة «Platform Architecture v2»");
  assert.equal(activityEventText({ entity: "issues", action: "unknown_action", summary: "خطأ حفظ" }), "حدّث المشكلة «خطأ حفظ»");
});
console.log("Health, risks, issues, time, outputs");
const H = (p, tasks, extra) => D.projectMetrics(P(p), ctx(tasks, extra));
t("T-26 past deadline => Red PAST_DEADLINE", () => { const m = H({ target_date: "2026-10-01" }, [task("a")]); assert.equal(m.health, "Red"); assert.ok(m.healthReasons.some((r) => r.code === "PAST_DEADLINE")); });
t("T-27 one overdue leaf => Red", () => { const m = H({}, [task("a", { due_date: "2026-10-01" })]); assert.equal(m.health, "Red"); assert.ok(m.healthReasons.some((r) => r.code === "OVERDUE_TASKS")); });
t("T-28 critical issue => Red; resolved => back", () => { const open = H({}, [task("a")], { issues: [{ id: "i", project_id: "p1", severity: "Critical", status: "Open" }] }); assert.equal(open.health, "Red"); const res = H({}, [task("a")], { issues: [{ id: "i", project_id: "p1", severity: "Critical", status: "Resolved" }] }); assert.equal(res.health, "Green"); });
t("T-29 score>=15 open risk => Orange (not Red), also In Mitigation", () => { for (const st of ["Open", "In Mitigation"]) { const m = H({}, [task("a")], { risks: [{ id: "r", project_id: "p1", probability: 5, impact: 3, status: st }] }); assert.equal(m.health, "Orange"); } });
t("T-30 <=14 days & progress<70% => Yellow", () => { const m = H({ target_date: "2026-11-03" }, [task("a"), task("b", { status: "Completed" })]); assert.equal(m.health, "Yellow"); });
t("T-31 no leaves + near deadline => Yellow (Not Measurable as 0)", () => { assert.equal(H({ target_date: "2026-11-01" }, []).health, "Yellow"); });
t("T-32 priority Red > Orange > Yellow and all reasons listed", () => { const m = H({ target_date: "2026-10-30" }, [task("a", { due_date: "2026-10-01" })], { risks: [{ id: "r", project_id: "p1", probability: 5, impact: 5, status: "Open" }] }); assert.equal(m.health, "Red"); const codes = m.healthReasons.map((r) => r.code); assert.ok(codes.includes("OVERDUE_TASKS") && codes.includes("HIGH_RISK_OPEN") && codes.includes("DEADLINE_NEAR_LOW_PROGRESS")); });
t("T-33 Completed/OnHold/Idea health", () => { assert.equal(H({ status: "Completed" }, []).health, "Completed"); assert.equal(H({ status: "On Hold" }, []).health, "OnHold"); assert.equal(H({ status: "Idea" }, []).health, "NotEvaluated"); });
t("T-34 completing with open leaves requires a decision", () => { const i = D.buildTaskIndex([task("a"), task("b", { status: "Completed" })]); assert.equal(D.completionPlan(P(), i).needsDecision, true); assert.equal(D.completionPlan(P(), D.buildTaskIndex([task("b", { status: "Completed" })])).needsDecision, false); });
t("T-35 due today is not overdue", () => { const m = H({}, [task("a", { due_date: TODAY })]); assert.equal(m.overdueLeafCount, 0); });
t("T-37 probability/impact outside 1..5 or fractional rejected", () => { assert.ok(D.validateRisk({ probability: 0, impact: 3 }).length); assert.ok(D.validateRisk({ probability: 6, impact: 3 }).length); assert.ok(D.validateRisk({ probability: 2.5, impact: 3 }).length); assert.equal(D.validateRisk({ probability: 3, impact: 5 }).length, 0); });
t("T-38 risk score & level", () => { const lv = (p, i) => D.riskLevel({ probability: p, impact: i }); assert.equal(lv(2, 7 / 1 > 5 ? 5 : 5), "Medium"); assert.equal(D.riskScore({ probability: 3, impact: 5 }), 15); assert.equal(lv(3, 5), "High"); assert.equal(D.riskLevel({ probability: 2, impact: 4 }), "Medium"); assert.equal(D.riskLevel({ probability: 1, impact: 7 }), "Low"); assert.equal(D.riskLevel({ probability: 2, impact: 3 }), "Low"); });
t("T-39 materialized risk is not open", () => { assert.equal(D.isOpenRisk({ status: "Materialized" }), false); assert.equal(D.isOpenRisk({ status: "Open" }), true); });
t("T-39a risk conversion finds issue by source even when backlink write failed", () => { const risk = { id: "r1", converted_issue_id: null }; const issues = [{ id: "i1", from_risk_id: "r1", status: "Open" }]; assert.equal(D.issueForRisk(risk, issues).id, "i1"); });
t("T-39b risk conversion follows backlink when source link is absent", () => { const risk = { id: "r1", converted_issue_id: "i1" }; assert.equal(D.issueForRisk(risk, [{ id: "i1", status: "Open" }]).id, "i1"); });
t("T-39c deleted issues are not treated as valid conversion targets", () => { const risk = { id: "r1" }; assert.equal(D.issueForRisk(risk, [{ id: "i1", from_risk_id: "r1", status: "Open", deleted_at: "x" }]), null); });
t("T-40 resolved needs resolution; closed needs resolved", () => { assert.ok(D.validateIssueStatus({ status: "Open", resolution: "" }, "Resolved")); assert.equal(D.validateIssueStatus({ status: "Open", resolution: "fixed" }, "Resolved"), null); assert.ok(D.validateIssueStatus({ status: "Open" }, "Closed")); assert.equal(D.validateIssueStatus({ status: "Resolved" }, "Closed"), null); });
t("T-41 actual = Σ non-voided sessions (task + project)", () => { const tasks = [task("a"), task("b", { parent_task_id: "a" })]; const sessions = [{ id: "1", task_id: "a", minutes: 10 }, { id: "2", task_id: "b", minutes: 20 }, { id: "3", task_id: "b", minutes: 99, voided_at: "x" }]; const i = D.buildTaskIndex(tasks, sessions); assert.equal(i.derived.b.actual, 20); assert.equal(i.derived.a.actual, 30); assert.equal(H({}, tasks, { sessions }).actual, 30); });
t("T-42 deterministic session id (idempotency)", () => { assert.equal(D.sessionId("m1", "c1"), D.sessionId("m1", "c1")); assert.notEqual(D.sessionId("m1", "c1"), D.sessionId("m2", "c1")); });
t("V-08/V-09 session validation", () => { assert.ok(D.validateSession({ minutes: 10 }).length); assert.ok(D.validateSession({ task_id: "a", minutes: 0 }).length); assert.ok(D.validateSession({ task_id: "a", minutes: 1441 }).length); assert.equal(D.validateSession({ task_id: "a", minutes: 30 }).length, 0); });
t("T-45 time_ratio null when estimated=0", () => { assert.equal(H({}, [task("a")]).timeRatio, null); assert.equal(H({}, [task("a", { estimated_minutes: 60 })], { sessions: [{ id: "s", task_id: "a", minutes: 30 }] }).timeRatio, 0.5); });
t("T-47 output completion does not change progress", () => { const a = H({}, [task("a")]); const b = H({}, [task("a")], { outputs: [{ id: "o", project_id: "p1", approval: "Final" }] }); assert.equal(a.progress, b.progress); assert.equal(b.outputsFinal, 1); });
t("status change rules", () => { const i = D.buildTaskIndex([task("a")]); assert.equal(D.canChangeProjectStatus(P({ status: "Planned" }), "Completed", i).ok, false); assert.equal(D.canChangeProjectStatus(P({ status: "In Progress" }), "Completed", i).ok, true); assert.equal(D.canChangeProjectStatus(P({ status: "Idea" }), "In Progress", i).ok, false); });

console.log("Discovery, PRD, traceability, templates");
t("T-53 Working On needs owner; Dropped needs reason", () => { assert.ok(D.validateDiscoveryStatus({}, "Working On", false)); assert.equal(D.validateDiscoveryStatus({ owner_id: "m" }, "Working On", false), null); assert.ok(D.validateDiscoveryStatus({}, "Dropped", false)); });
t("T-54 Completed needs a linked solution or note", () => { assert.ok(D.validateDiscoveryStatus({}, "Completed", false)); assert.equal(D.validateDiscoveryStatus({}, "Completed", true), null); assert.equal(D.validateDiscoveryStatus({ resolution_note: "ok" }, "Completed", false), null); });
t("T-49 task.prd from another project => mismatch", () => { const errs = D.validateTaskRefs({ id: "x", project_id: "p1", prd_id: "q", status: "Not Started" }, { projectsById: { p1: {} }, tasksById: {}, prdsById: { q: { project_id: "p2" } } }); assert.ok(errs.some((e) => e.includes("V-06"))); });
t("T-49a task requirement must belong to linked PRD", () => { const prd = { project_id: "p1", requirements: [{ id: "req1" }] }; assert.equal(D.validateTaskRefs({ id: "t", project_id: "p1", prd_id: "prd1", prd_requirement_id: "req1" }, { projectsById: { p1: {} }, tasksById: {}, prdsById: { prd1: prd } }).length, 0); assert.ok(D.validateTaskRefs({ id: "t", project_id: "p1", prd_id: "prd1", prd_requirement_id: "req2" }, { projectsById: { p1: {} }, tasksById: {}, prdsById: { prd1: prd } }).some((e) => e.includes("V-23"))); assert.ok(D.validateTaskRefs({ id: "t", project_id: "p1", prd_requirement_id: "req1" }, { projectsById: { p1: {} }, tasksById: {}, prdsById: { prd1: prd } }).some((e) => e.includes("V-23"))); });
t("T-55 PRD needs 4 sections + all reviewers", () => { const prd = { tldr: "x", reviewer_ids: ["r1"], version: 1 }; const secs = [{ key: "problem_overview", content: "a" }, { key: "proposed_solution", content: "b" }, { key: "success_metrics", content: "c" }]; assert.equal(D.prdApprovalReady(prd, secs, []).ok, false); assert.equal(D.prdApprovalReady(prd, secs, [{ reviewer_id: "r1", decision: "approve", version: 1 }]).ok, true); assert.equal(D.prdApprovalReady({ ...prd, tldr: "" }, secs, [{ reviewer_id: "r1", decision: "approve", version: 1 }]).ok, false); });
t("T-58 coverage index + traceability policy", () => { const idx = D.buildTaskIndex([task("a", { prd_id: "x" }), task("b"), task("c", { discovery_ids: ["d"] }), task("d")]); const c = D.coverageOf(P(), idx); assert.equal(c.ratio, 0.5); assert.equal(D.traceabilityBlocked({ traceabilityPolicy: "require", traceabilityTypes: ["تطبيق"] }, "تطبيق", false, task("z")), true); assert.equal(D.traceabilityBlocked({ traceabilityPolicy: "require", traceabilityTypes: ["تطبيق"] }, "تطبيق", false, task("issue-linked", { issue_ids: ["i1"] })), false); assert.equal(D.traceabilityBlocked({ traceabilityPolicy: "warn", traceabilityTypes: ["تطبيق"] }, "تطبيق", false, task("z")), false); assert.equal(D.traceabilityBlocked({ traceabilityPolicy: "require", traceabilityTypes: ["تطبيق"] }, "تطبيق", true, task("z")), false); });
t("T-59 project template copies tree with explicit project_id and shifts dates", () => { let n = 0; const id = () => "id" + ++n; const tpl = { id: "tpl", task_tree: [{ title: "A", offset_days: 5, children: [{ title: "A1", offset_days: 7, estimate_minutes: 60 }] }, { title: "B", offset_days: 20 }], risks: [{ title: "r", probability: 3, impact: 4 }] }; const r = D.instantiateProjectTemplate(tpl, { name: "N", start_date: "2026-11-01" }, id); assert.equal(r.tasks.length, 3); assert.ok(r.tasks.every((x) => x.project_id === r.project.id)); assert.equal(r.tasks[0].due_date, "2026-11-06"); assert.equal(r.tasks[1].parent_task_id, r.tasks[0].id); assert.equal(r.tasks[1].due_date, "2026-11-08"); assert.equal(r.risks[0].project_id, r.project.id); });
t("T-59b full project template seeds linked PRD requirements and planned outputs", () => {
  let n = 0; const id = () => "seed" + ++n;
  const tpl = {
    id: "tpl_full", name: "قالب متكامل",
    task_tree: [{ title: "تصميم الواجهة", offset_days: 4 }, { title: "تسليم النسخة", offset_days: 10, milestone: true }],
    prd_templates: [{ title: "مواصفة الواجهة", tldr: "مواصفة أولية", requirements: [{ title: "تجربة الدخول", acceptance_criteria: "يدخل المستخدم بنجاح", task_title: "تصميم الواجهة" }] }],
    output_templates: [{ name: "تصميم معتمد", type: "Design", task_title: "تصميم الواجهة", prd_title: "مواصفة الواجهة", requirement_title: "تجربة الدخول" }],
    risks: [{ title: "تأخر الاعتماد", probability: 3, impact: 4, mitigation: "مراجعة مبكرة" }],
    team_roles: ["مصمم", "مطور"], decision_prompts: ["ما معيار الإطلاق؟"], checklist: ["راجع النطاق"]
  };
  const result = D.instantiateProjectTemplate(tpl, { name: "K", start_date: "2026-11-01", lead_id: "owner" }, id);
  assert.equal(result.prds.length, 1);
  assert.equal(result.prds[0].project_id, result.project.id);
  assert.equal(result.prds[0].requirements.length, 1);
  assert.equal(result.tasks[0].prd_id, result.prds[0].id);
  assert.equal(result.tasks[0].prd_requirement_id, result.prds[0].requirements[0].id);
  assert.equal(result.outputs[0].task_id, result.tasks[0].id);
  assert.equal(result.outputs[0].prd_id, result.prds[0].id);
  assert.equal(result.outputs[0].prd_requirement_id, result.prds[0].requirements[0].id);
  assert.equal(result.outputs[0].approval, "Draft");
  assert.equal(result.risks[0].needs_review, true);
  assert.deepEqual(result.project.template_roles, ["مصمم", "مطور"]);
  assert.deepEqual(result.project.decision_prompts, ["ما معيار الإطلاق؟"]);
  assert.deepEqual(result.project.template_checklist, ["راجع النطاق"]);
  assert.equal(result.tasks[1].milestone, true);
});
t("T-59c template output rejects ambiguous or broken source links", () => {
  let n = 0; const id = () => "bad" + ++n;
  const ambiguous = { task_tree: [{ title: "مهمة" }, { title: "مهمة" }], output_templates: [{ name: "مخرج", task_title: "مهمة" }] };
  assert.throws(() => D.instantiateProjectTemplate(ambiguous, { name: "A" }, id), /تطابق مهمة واحدة بالضبط/);
});


console.log("OKR, pace, contacts, feeds, alerts");
t("T-65a Project detail derives Objectives through linked KRs (v4)", () => {
  const objectives = [{ id: "o1" }, { id: "o2", archived_at: "2026-01-01" }, { id: "o3", deleted_at: "2026-01-01" }];
  const krs = [
    { id: "k1", objective_id: "o1", type: "Project Based", project_ids: ["p1"] },
    { id: "k2", objective_id: "o1", type: "Numeric", project_ids: ["p2"] },
    { id: "k3", objective_id: "o2", project_ids: ["p1"] },
    { id: "k4", objective_id: "o3", project_ids: ["p1"] },
    { id: "k5", objective_id: "missing-objective", project_ids: ["p1"] },
  ];
  assert.deepEqual(D.objectivesForProject("p1", objectives, krs).map((o) => o.id), ["o1"]);
  assert.deepEqual(D.objectivesForProject("p2", objectives, krs).map((o) => o.id), ["o1"]);
  assert.deepEqual(D.objectivesForProject("p3", objectives, krs), []);
});
t("T-61 numeric KR up and down", () => { assert.equal(D.krProgressValue({ type: "Numeric", initial_value: 0, target_value: 100, current_value: 50 }, {}), 0.5); assert.equal(D.krProgressValue({ type: "Numeric", initial_value: 100, target_value: 50, current_value: 75 }, {}), 0.5); });
t("T-62 target=initial rejected", () => { assert.ok(D.validateKR({ type: "Numeric", initial_value: 5, target_value: 5 }).length); });
t("T-63 value beyond target: raw 130%, clamped 100%", () => { const r = D.krProgress({ type: "Numeric", initial_value: 0, target_value: 100, current_value: 130 }, {}); assert.equal(r.raw, 1.3); assert.equal(r.clamped, 1); });
t("T-64 project-based KR averages measurable projects", () => { assert.equal(D.krProgressValue({ type: "Project Based", project_ids: ["a", "b", "c"] }, { a: 1, b: 0.5, c: null }), 0.75); assert.equal(D.krProgressValue({ type: "Project Based", project_ids: ["c"] }, { c: null }), null); });
t("T-65 objective = mean of measurable KRs; none => null", () => { const krs = [{ id: "1", objective_id: "o", type: "Numeric", initial_value: 0, target_value: 10, current_value: 10 }, { id: "2", objective_id: "o", type: "Numeric", initial_value: 0, target_value: 10, current_value: 0 }, { id: "3", objective_id: "o", type: "Project Based", project_ids: [] }]; assert.equal(D.objectiveProgress({ id: "o" }, krs, {}), 0.5); assert.equal(D.objectiveProgress({ id: "z" }, krs, {}), null); });
const okrTasks = [
  task("p1-root", { project_id: "p1" }),
  task("p1-done", { project_id: "p1", parent_task_id: "p1-root", status: "Completed" }),
  task("p1-open", { project_id: "p1", parent_task_id: "p1-root" }),
  task("p2-root", { project_id: "p2" }),
  task("p2-done", { project_id: "p2", parent_task_id: "p2-root", status: "Completed" }),
  task("p3-root", { project_id: "p3", objective_id: "o1" }),
  task("p3-leaf", { project_id: "p3", parent_task_id: "p3-root" }),
];
const okrIdx = D.buildTaskIndex(okrTasks);
t("T-65a KR task execution uses the explicit task group when task_ids is present", () => {
  const r = D.krTaskExecution({ project_ids: ["p1", "p2"], task_ids: ["p3-root"] }, okrIdx);
  assert.deepEqual(r.projectIds, ["p1", "p2"]);
  assert.deepEqual(r.roots, ["p3-root"]);
  assert.equal(r.tasks.length, 2);
  assert.equal(r.leafTotal, 1);
  assert.equal(r.leafDone, 0);
  assert.equal(r.progress, 0);
});
t("T-65b Objective task execution follows each KR's explicit task group and keeps legacy KRs compatible", () => {
  const krs = [
    { id: "kr1", objective_id: "o1", type: "Project Based", project_ids: ["p1", "p2"], task_ids: ["p3-root"] },
    { id: "kr2", objective_id: "o1", type: "Project Based", project_ids: ["p2"], task_ids: ["p2-root"] },
  ];
  const r = D.objectiveTaskExecution({ id: "o1" }, krs, okrIdx);
  assert.deepEqual(r.projectIds, ["p1", "p2"]);
  assert.equal(r.tasks.length, 4);
  assert.equal(r.leafTotal, 2);
  assert.equal(r.leafDone, 1);
  assert.equal(r.progress, 0.5);
  assert.equal(r.legacyTaskCount, 0);
});
t("T-65c legacy KR task groups remain visible only when task_ids is absent", () => {
  const r = D.krTaskExecution({ task_ids: ["p3-root"] }, okrIdx);
  assert.deepEqual(r.roots, ["p3-root"]);
  assert.equal(r.tasks.length, 2);
  assert.equal(r.leafTotal, 1);
});
t("T-67 pace thresholds", () => { const s = D.DEFAULT_SETTINGS; assert.equal(D.pace(0.5, "2026-10-01", "2026-12-01", "Active", "2026-11-01", s), "OnTrack"); assert.equal(D.pace(0.35, "2026-10-01", "2026-12-01", "Active", "2026-11-01", s), "AtRisk"); assert.equal(D.pace(0.05, "2026-10-01", "2026-12-01", "Active", "2026-11-01", s), "Behind"); assert.equal(D.pace(null, "2026-10-01", "2026-12-01", "Active", "2026-11-01", s), "NotMeasurable"); assert.equal(D.pace(0, "2026-12-01", "2027-01-01", "Active", "2026-11-01", s), "NotStarted"); assert.equal(D.pace(1, "2026-10-01", "2026-12-01", "Achieved", "2026-11-01", s), "Achieved"); });
t("T-68 quarter label", () => { assert.equal(D.quarterOf("2026-07-01"), "Q3 2026"); assert.equal(D.quarterOf("2026-12-31"), "Q4 2026"); });
t("T-73 contact status thresholds incl. last meeting", () => { assert.equal(D.contactStatus({}, TODAY).status, "NoContact"); assert.equal(D.contactStatus({ last_contact_at: "2026-08-01" }, TODAY).status, "Needs"); assert.equal(D.contactStatus({ last_contact_at: "2026-09-10" }, TODAY).status, "Soon"); assert.equal(D.contactStatus({ last_contact_at: "2026-10-20" }, TODAY).status, "InTouch"); assert.equal(D.contactStatus({ last_contact_at: "2026-06-01", last_meeting_at: "2026-10-20" }, TODAY).status, "InTouch"); });
t("week start (Saturday default)", () => { assert.equal(D.weekStart("2026-10-25", 6), "2026-10-24"); assert.equal(D.weekStart("2026-10-24", 6), "2026-10-24"); assert.equal(D.weekStart("2026-10-23", 6), "2026-10-17"); assert.equal(D.weekStart("2026-10-25", 0), "2026-10-25"); });
t("T-76 today feed reflects overdue/due/this-week/assignment", () => { const tasks = [task("a", { assignee_id: "m", due_date: "2026-10-01" }), task("b", { assignee_id: "m", due_date: TODAY }), task("c", { assignee_id: "m", planning_bucket: "This Week" }), task("d", { assignee_id: "other", due_date: TODAY })]; const f = D.todayFeed("m", { ...ctx(tasks), projects: [], contacts: [] }); assert.deepEqual(f.overdue.map((x) => x.id), ["a"]); assert.deepEqual(f.dueToday.map((x) => x.id), ["b"]); assert.deepEqual(f.thisWeek.map((x) => x.id), ["c"]); });
t("T-60 alerts: stale inbox once (dedupe key stable), overdue digest", () => { const c = { ...ctx([task("a", { assignee_id: "m", due_date: "2026-10-01" })]), projects: [], contacts: [], krs: [], checkins: [], timers: [], issues: [], discovery: [{ id: "d", status: "Inbox", logged_at: "2026-09-01" }], metrics: {} }; const a1 = D.computeAlerts("m", c), a2 = D.computeAlerts("m", c); assert.ok(a1.some((x) => x.kind === "inbox")); assert.ok(a1.some((x) => x.kind === "overdue")); assert.deepEqual(a1.map((x) => x.key), a2.map((x) => x.key)); });

t("T-77 built-in template PRD/output task links resolve uniquely", () => {
  let sequence = 0;
  for (const template of BUILTIN_TEMPLATES) {
    const titles = [];
    const walk = (nodes) => (nodes || []).forEach((node) => { titles.push(node.title); walk(node.children || []); });
    walk(template.task_tree || []);
    const references = [
      ...(template.prd_templates || []).flatMap((prd) => (prd.requirements || []).map((req) => req.task_title).filter(Boolean)),
      ...(template.output_templates || []).map((output) => output.task_title).filter(Boolean),
    ];
    for (const title of references) {
      assert.equal(titles.filter((candidate) => candidate === title).length, 1,
        template.name + ": linked task title must resolve exactly once: " + title);
    }
    const instance = D.instantiateProjectTemplate(
      template,
      { name: "Template test — " + template.name, start_date: "2026-01-01", lead_id: "member_1" },
      () => "template_test_" + (++sequence)
    );
    for (const prd of instance.prds) for (const req of prd.requirements || []) if (req.task_title) {
      const linkedTask = instance.tasks.find((candidate) => candidate.title === req.task_title);
      assert.ok(linkedTask, template.name + ": requirement task exists: " + req.task_title);
      assert.equal(linkedTask.prd_id, prd.id, template.name + ": requirement task links to its PRD");
      assert.equal(linkedTask.prd_requirement_id, req.id, template.name + ": requirement task links to the exact requirement");
    }
    for (const outputDefinition of template.output_templates || []) if (outputDefinition.task_title) {
      const linkedTask = instance.tasks.find((candidate) => candidate.title === outputDefinition.task_title);
      const output = instance.outputs.find((candidate) => candidate.name === outputDefinition.name);
      assert.ok(output, template.name + ": output was instantiated: " + outputDefinition.name);
      assert.equal(output.task_id, linkedTask.id, template.name + ": output links to its unique source task: " + outputDefinition.name);
    }
  }
});

console.log(`\nPASS ${pass} · FAIL ${fail}`); process.exit(fail ? 1 : 0);
