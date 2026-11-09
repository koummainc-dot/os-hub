import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { activityEventText } from "../src/systems/projects/lookups.js";

const projectScreens = await readFile(new URL("../src/systems/projects/screens_b.jsx", import.meta.url), "utf8");
const projectIndex = await readFile(new URL("../src/systems/projects/index.jsx", import.meta.url), "utf8");
const store = await readFile(new URL("../src/systems/projects/store.jsx", import.meta.url), "utf8");
const entities = await readFile(new URL("../src/systems/projects/entities.jsx", import.meta.url), "utf8");
const screens = await readFile(new URL("../src/systems/projects/screens_c.jsx", import.meta.url), "utf8");
const parts = await readFile(new URL("../src/systems/projects/parts.jsx", import.meta.url), "utf8");
const domain = await readFile(new URL("../src/systems/projects/domain.js", import.meta.url), "utf8");

assert.ok(entities.includes('onClick={() => openProject(o.project_id, "prds", { kind: "prd", id: o.prd_id })}') && entities.includes(">متطلب:"),
  "output requirement reference must navigate to the owning PRD section");
assert.ok(entities.includes('reqOutputs.map((o) => <button key={o.id} type="button" onClick={() => openProject(d.project_id, "outputs", { kind: "output", id: o.id })}'),
  "PRD requirement output evidence must navigate to the outputs section");
assert.ok(entities.includes('req.status === "Verified" && !linkedOutputs.some((o) => o.prd_requirement_id === req.id && o.approval === "Final")'),
  "PRD requirement cannot be verified without a linked Final output");
assert.ok(entities.includes('data.outputs.filter((o) => o.prd_id === d.id && D.isActiveRec(o))'),
  "archived or deleted outputs must not count as verification evidence");
assert.ok(entities.includes('const linkedRisks = data.risks.filter((risk) => risk.prd_id === d.id && D.isActiveRec(risk))') &&
  entities.includes('{ id: "risks", label: "المخاطر", count: linkedRisks.length }') &&
  entities.includes('onClick={() => openProject(risk.project_id, "risks", { kind: "risk", id: risk.id })}'),
  "PRD must show active linked risks and provide navigation to them");
assert.ok(entities.includes('data.decisions.filter((decision) => D.isActiveRec(decision) && (decision.prd_id === d.id'),
  "archived or deleted decisions must not appear as active PRD relationships");
assert.ok(screens.includes('g.kind === "win" ? setPage("wins")') && screens.includes('items.map((item) =>'),
  "stakeholder update achievement references must be actionable");
assert.ok(screens.includes('{w.output_ids?.length > 0 && <Btn small onClick={() => w.project_id && openProject(w.project_id, "outputs")}>'),
  "achievement output evidence must navigate to the project's outputs");
assert.ok(screens.includes('g.kind === "output" ? openProject(item.project_id || u.project_id, "outputs")') && screens.includes('related_output_ids: d.related_output_ids || []'),
  "stakeholder update output references must navigate to the outputs section");
assert.ok(screens.includes('!data.wins.some((w) => w.task_id === t.id || (w.task_ids || []).includes(t.id))'),
  "achievement suggestions must deduplicate both legacy and multi-task relationships");
assert.ok(parts.includes('linkedDecisions.length ? linkedDecisions.map((decision) => <button') && parts.includes('openProject(decision.project_id, "decisions", { kind: "decision", id: decision.id })'),
  "task decision backlinks must be actionable");
assert.ok(parts.includes('linkedWins.length ? linkedWins.map((win) => <button') && parts.includes('setPage("wins")'),
  "task achievement backlinks must be actionable");

assert.equal((screens.match(/المهام المرتبطة بالهدف/g) || []).length, 1,
  "objective card must render one task relationship section, not duplicate the same list");

assert.ok(store.includes("focusRecord, ...(focusRecord?.kind === \"issue\" ? { issueStatusFilter: \"all\" } : {})"),
  "project navigation must carry a typed exact-record target and reveal resolved issues");
assert.ok(entities.includes("function RecordDetailModal({ title, fields, onClose })") &&
  (entities.match(/عرض التفاصيل/g) || []).length >= 6,
  "Outputs, Risks, Issues, Decisions, PRDs, and Discovery must expose independent read-only detail views");
for (const label of ["تفاصيل المخرج:", "تفاصيل الخطر:", "تفاصيل المشكلة:", "تفاصيل القرار:", "تفاصيل المواصفة:", "تفاصيل الاكتشاف:"]) {
  assert.ok(entities.includes(label), `read-only details must include the ${label} view`);
}
assert.ok(entities.includes('onClick={(e) => { e.stopPropagation(); setDetail(prd); }}'),
  "opening PRD details from the selected specification must not bubble into its editor");
assert.ok(entities.includes('onClick={(e) => { e.stopPropagation(); setDetail(d); }}'),
  "opening Discovery details must not trigger the editable discovery form underneath");

assert.ok(entities.includes("function useRecordFocus(view, kind, projectId, listLength)") &&
  entities.includes("scrollIntoView?.({ behavior: \"smooth\", block: \"center\" })"),
  "relationship navigation must scroll the target record into view");
assert.ok(entities.includes('openProject(i.project_id, "risks", { kind: "risk", id: i.from_risk_id })'),
  "Issue → source Risk must focus the exact source Risk");
assert.ok(entities.includes('openProject(r.project_id, "issues", { kind: "issue", id: r.converted_issue_id })'),
  "Risk → converted Issue must focus the exact converted Issue");
assert.ok(entities.includes('openProject(i.project_id, "decisions", { kind: "decision", id: d.id })'),
  "Issue → related Decision must focus the exact Decision");
assert.ok(entities.includes("openDiscovery(i.from_discovery_id)") && store.includes("openDiscovery: (id) =>"),
  "Issue → source Discovery must focus the exact Discovery");
assert.ok(entities.includes('openProject(decision.project_id, "decisions", { kind: "decision", id: decision.id })'),
  "PRD → related Decision must focus the exact Decision");
assert.ok(entities.includes('id={recordDomId("output", o.id)}') && entities.includes('id={recordDomId("risk", r.id)}') &&
  entities.includes('id={recordDomId("issue", i.id)}') && entities.includes('id={recordDomId("decision", d.id)}'),
  "linked record rows must expose stable DOM targets for navigation");

const decisionsView = entities.slice(entities.indexOf("export function DecisionsView"), entities.indexOf("// ═════ PRDs"));
assert.ok(decisionsView.indexOf("const list = data.decisions") < decisionsView.indexOf('useRecordFocus(view, "decision", projectId, list.length)'),
  "DecisionsView must derive its record list before passing its length to the focus hook");


assert.ok(projectScreens.includes('const tabGroups = [') &&
  projectScreens.includes('{ id: "plan", label: "التخطيط"') &&
  projectScreens.includes('{ id: "delivery", label: "التسليم"') &&
  projectScreens.includes('{ id: "governance", label: "الحوكمة"') &&
  projectScreens.includes('{ id: "collaboration", label: "التعاون"'),
  "Project Detail must group its 12 destinations into practical navigation categories");
for (const tabId of ["overview", "tasks", "outputs", "work", "prds", "risks", "issues", "decisions", "people", "okr", "related", "activity"]) {
  assert.ok(projectScreens.includes(`id: "${tabId}"`), `legacy project tab id ${tabId} must remain stable for deep links`);
}
assert.ok(projectScreens.includes('import { listKnowledgeMeetings } from "../knowledge/repository.js"') &&
  projectScreens.includes('String(meeting.relatedId) === String(p.id)') &&
  projectScreens.includes('source_meeting_id: meeting.id') &&
  projectScreens.includes('source_followup_index: index'),
  "Project Detail must read its linked meetings from Knowledge OS and preserve meeting provenance when creating follow-up tasks");
assert.ok(projectScreens.includes('task.source_meeting_id === meeting.id && Number(task.source_followup_index) === index'),
  "Project Detail meeting follow-ups must not create duplicate tasks after a task already exists");

const risksPage = projectIndex.slice(projectIndex.indexOf("function RisksPage()"), projectIndex.indexOf("const SCREENS"));
assert.ok(projectIndex.includes('issues: IssuesView') &&
  risksPage.includes('id: "risks"') && risksPage.includes('id: "decisions"') &&
  !risksPage.includes('id: "issues"') && !risksPage.includes('<IssuesView'),
  "global Issues must have one dedicated destination; the Risks page must not duplicate its tab");
const projectOkr = projectScreens.slice(projectScreens.indexOf("function ProjectOkr"), projectScreens.indexOf("function RelatedTab"));
const okrScreens = await readFile(new URL("../src/systems/projects/screens_c.jsx", import.meta.url), "utf8");
assert.ok(projectOkr.includes('openOkrRecord("objective", o.id)') && projectOkr.includes('openOkrRecord("kr", k.id)') &&
  projectOkr.includes('setView({ ...view, okrFocus: { kind, id } })') && projectOkr.includes('setPage("okrs")'),
  "Project Detail OKR links must navigate with the exact Objective or KR ID");
assert.ok(okrScreens.includes('const target = view?.okrFocus') &&
  okrScreens.includes('document.getElementById(okrFocusDomId(target.kind, target.id))') &&
  okrScreens.includes('element.scrollIntoView') &&
  okrScreens.includes('setFilter("all")'),
  "OKRs destination must reveal, scroll to, and highlight the exact target even when its status is outside the default filter");

assert.ok(projectScreens.includes("activeGroup.tabs.length > 1") &&
  projectScreens.includes("setTab(group.defaultTab)"),
  "group navigation must reveal relevant subtabs and select a safe default destination");

assert.equal(activityEventText({ entity: "tasks", action: "created", summary: "مهمة الاختبار" }), "أنشأ المهمة «مهمة الاختبار»");
assert.ok(parts.includes("activityEventText(a)") && projectScreens.includes("activityEventText(event)"),
  "Task Sheet and Project Activity Hub must share the localized human-readable event formatter");

assert.ok(parts.includes("const newOutputDraft = (extra = {})") &&
  parts.includes("D.defaultOutputRelationsForTask(t, data.prds)") &&
  parts.includes("setOutputForm(newOutputDraft())") &&
  parts.includes("setOutputForm(newOutputDraft({ url: /^https?:/.test(t.result_note)"),
  "New outputs from Task Sheet and quick-result flow must inherit only valid task specification relationships");

assert.ok(screens.includes("إنشاء قالب من مشروع") &&
  screens.includes("D.projectToTemplateSeed(project, data)") &&
  screens.includes("!project.is_system && !project.archived_at && !project.deleted_at") &&
  screens.includes('can("project.read", project)'),
  "Project-to-template conversion must be available to editors, scoped to readable active projects, and routed through the pure identity-stripping converter");

assert.ok(screens.includes('import { prepareTemplateSave, restoreTemplateVersion } from "./templateVersions.js"') &&
  screens.includes("prepareTemplateSave(previous, rec, nowIso())") &&
  screens.includes("restoreTemplateVersion(current, version, nowIso())") &&
  screens.includes("version_history") &&
  screens.includes("الإصدارات"),
  "Template editing creates versions and the history UI restores an old snapshot as a new version");

assert.ok(domain.includes("const dependencyDefinitions = []") &&
  domain.includes("definition.task.dependency_task_ids") &&
  domain.includes("conversion_warnings"),
  "Project-to-template conversion and template instantiation preserve predecessor links with fresh task IDs and report ambiguous links");

assert.ok(domain.includes("export function validateTaskDependencies") &&
  domain.includes("export function analyzeTaskSchedule") &&
  domain.includes("dependency_task_ids"),
  "Task dependency graph validation and critical-path analysis are part of the Projects domain");
assert.ok(parts.includes('key: "dependency_task_ids"') &&
  parts.includes("const taskDependencies = (t.dependency_task_ids || [])") &&
  parts.includes("const taskDependents = idx.list.filter((task) => (task.dependency_task_ids || []).includes(t.id))"),
  "TaskForm can set dependencies and Task Sheet exposes both predecessor and successor relations");
assert.ok(parts.includes('D.cat(task.status) === "cancelled" ? " · ملغاة — استبدل الاعتماد" : ""') &&
  parts.includes("المهام الملغاة تظهر بعلامة تحذير لتستبدل اعتمادها"),
  "Existing cancelled predecessor links remain selectable so users can replace them safely");
assert.ok(parts.includes("D.analyzeTaskSchedule(projectTasks)") &&
  parts.includes("dependencyPaths") &&
  parts.includes("schedule.critical_task_ids.includes(task.id)") &&
  parts.includes("markerEnd"),
  "Project Timeline draws dependency connectors and highlights the calculated critical path");

assert.ok(screens.includes("task_dependencies_text: flattenTaskDependencies(tpl.task_tree || [])") &&
  screens.includes("parseTaskDependenciesText(v.task_dependencies_text, tree)") &&
  screens.includes("علاقات الاعتماد بين المهام") &&
  screens.includes("dependency_titles.join"),
  "Template editor preserves, edits and previews predecessor links in a readable relation field");
assert.ok(screens.includes("conversion_warnings: Array.isArray(tpl.conversion_warnings) ? tpl.conversion_warnings : []") &&
  screens.includes("روابط لم تُنقل تلقائيًا — راجعها يدويًا") &&
  screens.includes("v.conversion_warnings.map((warning, index)"),
  "Project-to-template conversion warnings remain visible in the editable template review form");
assert.ok(screens.includes("D.instantiateProjectTemplate(") &&
  screens.includes("قالب قيد التحقق"),
  "Template saves run an in-memory instantiation check to reject missing or cyclic dependency links");

assert.ok(domain.includes("export function validateTaskDependencies") &&
  domain.includes("export function analyzeTaskSchedule") &&
  domain.includes("cancelled_predecessors"),
  "Dependency validation and critical-path calculations account for cycles and cancelled or undated predecessors");
assert.ok(parts.includes('key: "dependency_task_ids"') &&
  parts.includes("const taskDependencies = (t.dependency_task_ids || [])") &&
  parts.includes("const taskDependents = idx.list.filter((task) => (task.dependency_task_ids || []).includes(t.id))"),
  "TaskForm sets prerequisite tasks and Task Sheet navigates to predecessors and dependent tasks from both ends");
assert.ok(parts.includes("D.analyzeTaskSchedule(projectTasks)") &&
  parts.includes("dependencyPaths") &&
  parts.includes("schedule.critical_task_ids.includes(task.id)") &&
  parts.includes("markerEnd") &&
  parts.includes("اعتمادات دائرية"),
  "Project Timeline draws dependency connectors and shows the calculated critical path and schedule warnings");
assert.ok(parts.includes('task.dependency_task_ids || []') &&
  parts.includes('openDependencies.length ? "ينتظر " + openDependencies.length + " مهمة" : "الاعتمادات مكتملة"'),
  "Task Tree surfaces whether prerequisite tasks have been completed");

assert.ok(parts.includes('import { listKnowledgeMeetings } from "../knowledge/repository.js"') &&
  parts.includes("listKnowledgeMeetings(ws.id)") &&
  parts.includes("meeting.relatedSystem === \"projects\"") &&
  parts.includes("String(meeting.relatedId) === String(projectId)"),
  "Project Calendar loads only active Knowledge OS meetings linked to the current project");
assert.ok(parts.includes('kind: "decision", date: String(decision.decided_at).slice(0, 10)') &&
  parts.includes('kind: "output", date: String(output.due_date).slice(0, 10)') &&
  parts.includes('kind: "project", date: String(project.target_date).slice(0, 10)') &&
  parts.includes('kind: "meeting", date: String(meeting.date).slice(0, 10)'),
  "Project Calendar contains only source-backed dated decisions, output due dates, project target and linked meetings");
assert.ok(parts.includes("const dayEvents = (date) => calendarEvents.filter((event) => event.date === date)") &&
  parts.includes('openProject(projectId, "decisions", { kind: "decision", id: event.id })') &&
  parts.includes('openProject(projectId, "outputs", { kind: "output", id: event.id })') &&
  parts.includes('setPage("meetings")'),
  "Calendar events navigate to their source record or owning system");
assert.ok(entities.includes('{ key: "due_date", label: "موعد التسليم", type: "date" }') &&
  parts.includes('{ key: "due_date", label: "موعد التسليم", type: "date" }'),
  "Output due dates can be entered from both Outputs and Task Sheet forms");

console.log("✓ Projects relationship navigation contracts passed");
