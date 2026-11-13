import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const screensB = await readFile(new URL("../src/systems/projects/screens_b.jsx", import.meta.url), "utf8");
const screensA = await readFile(new URL("../src/systems/projects/screens_a.jsx", import.meta.url), "utf8");
const parts = await readFile(new URL("../src/systems/projects/parts.jsx", import.meta.url), "utf8");
const entities = await readFile(new URL("../src/systems/projects/entities.jsx", import.meta.url), "utf8");

const overview = screensB.slice(screensB.indexOf("function Overview("), screensB.indexOf("function ProjectTimeline("));
assert.ok(overview.includes('tab: "tasks", taskFilter: "overdue"'), "overdue count opens the project task tab with an overdue-only filter");
assert.ok(overview.includes('tab: "risks", riskStatusFilter: "open", riskHighOnly: false'), "open risk count opens the open-risk list");
assert.ok(overview.includes('tab: "risks", riskStatusFilter: "open", riskHighOnly: true'), "high-risk count opens the high open-risk filter");
assert.ok(overview.includes('tab: "issues", issueStatusFilter: "open", issueSeverityFilter: ""'), "open issue count opens the open issue list");
assert.ok(overview.includes('tab: "issues", issueStatusFilter: "open", issueSeverityFilter: "Critical"'), "critical issue count opens the critical issue filter");
assert.ok(overview.includes("const unlinkedTaskIds = (cov?.unlinked || []).map((task) => task.id)"), "traceability navigation is based on the exact unlinked task IDs");
assert.ok(overview.includes('onClick={() => openTasksView()}') && overview.includes("فتح المهام"), "progress and leaf task counts open the project task list");
assert.ok(overview.includes('tab: "timeline", taskFilter: null'), "target date metric opens the project Timeline");
assert.ok(overview.includes('tab: "work", focusRecord: null'), "estimated and actual time metrics open Work");
assert.ok(overview.includes('taskFilter: "ids", taskFilterIds: unlinkedTaskIds'), "traceability metric opens only the unlinked tasks");


const detail = screensB.slice(screensB.indexOf("function ProjectDetail()"), screensB.indexOf("function Overview("));
assert.ok(detail.includes('view.taskFilter === "overdue"') && detail.includes("D.isOverdueLeaf(task, idx, today)"), "Project Detail translates the overdue filter using the canonical domain rule");
assert.ok(detail.includes('view.taskFilter === "ids"') && detail.includes('(view.taskFilterIds || []).includes(task.id)'), "Project Detail restores exact task-ID filters from Overview");
assert.ok(detail.includes('filterLabel={taskFilterLabel}') && detail.includes('filter={taskFilter}'), "Project Detail passes filter and explanation into the canonical task tree");
assert.ok(overview.includes("taskFilterIds: []"), "opening the all-tasks view clears stale metric IDs");

assert.ok(detail.includes('<TaskTree projectId={p.id} filter={taskFilter} filterLabel={taskFilterLabel} />'), "Project Detail passes the metric filter into the canonical task tree");
assert.ok(detail.includes("＋ إضافة") && detail.includes('can("task.write", p)'), "Project Header exposes the contextual add menu when the user can create records");
for (const [permission,tab] of [["task.write","tasks"],["output.write","outputs"],["prd.write","prds"],["risk.write","risks"],["issue.write","issues"],["decision.write","decisions"]]) {
  assert.ok(detail.includes(`can("${permission}", p)`) && detail.includes(`tab: "${tab}"`), `Project Header contextual add menu routes ${permission} to its canonical section`);
}
assert.ok(detail.includes("canE && <button") && detail.includes('tab: "resources"'), "Project Header only exposes project-owned reference creation to project editors");
for (const [kind, tab] of [["task","tasks"],["output","outputs"],["prd","prds"],["risk","risks"],["issue","issues"],["decision","decisions"],["resource","resources"]]) {
  assert.ok(detail.includes(`openQuickCreate("${kind}", "${tab}"`), `Project Header ${kind} action targets its canonical form`);
}
assert.ok(detail.includes('closest("details")?.removeAttribute("open")'), "quick-create closes the contextual menu after selection");
assert.ok(taskTree.includes('view.quickCreate !== "task"') && taskTree.includes("setForm({})") && taskTree.includes("quickCreate: null"), "Tasks opens its existing TaskForm from the contextual action");
for (const [kind, start] of [["output", "export function OutputsView"],["risk", "export function RisksView"],["issue", "export function IssuesView"],["decision", "export function DecisionsView"],["prd", "export function PrdsView"]]) {
  const section = entities.slice(entities.indexOf(start));
  assert.ok(section.includes(`view.quickCreate !== "${kind}"`) && section.includes("setForm({ project_id: projectId })") && section.includes("quickCreate: null"), `${kind} opens its existing canonical form`);
}
const related = screensB.slice(screensB.indexOf("function RelatedTab"), screensB.indexOf("function ProjectFinanceTab"));
assert.ok(related.includes('view.quickCreate !== "resource"') && related.includes("setF(true)") && related.includes("quickCreate: null"), "Resources opens its existing project-link form");


const taskTree = parts.slice(parts.indexOf("export function TaskTree"), parts.indexOf("function StatusChipSm"));
assert.ok(taskTree.includes("&& matches(t)"), "task filters apply to table, board, calendar and timeline data");
assert.ok(taskTree.includes("const visibleRoots = roots.filter((root) => visible(root))"), "tree view retains ancestors of matching overdue leaves");
assert.ok(taskTree.includes("taskFilter: null, taskFilterIds: []"), "task filter can be explicitly cleared without keeping stale metric IDs");
assert.ok(taskTree.includes('taskFilterIds: []'), "clearing a task filter also clears exact metric IDs");
assert.ok(taskTree.includes('filterLabel || "تُعرض المهام المطابقة للفلتر داخل هذا المشروع."'), "task filter banner uses the matching filter description");

assert.ok(taskTree.includes('view.taskFilter === "overdue" ? "لا توجد مهام متأخرة حاليًا في هذا المشروع."') && taskTree.includes('view.taskFilter === "ids" ? "لا توجد مهام بلا مواصفة أو اكتشاف حاليًا."'), "empty overdue and traceability filters have truthful filter-specific empty states");

const riskView = entities.slice(entities.indexOf("export function RisksView"), entities.indexOf("export function IssuesView"));
assert.ok(riskView.includes("view.riskHighOnly === true"), "Risk view restores the high-risk filter from navigation state");
assert.ok(riskView.includes("D.isOpenRisk(r) && D.riskScore(r) >= settings.riskHigh"), "high-risk filter uses the canonical open-risk score threshold");
assert.ok(riskView.includes("المخاطر العالية المفتوحة فقط"), "Risk view exposes the active high-risk filter");
assert.ok(riskView.includes("riskHighOnly: checked"), "Risk view stores its filter in shared navigation state");

const portfolio = screensA.slice(screensA.indexOf("export function Portfolio()"));
assert.ok(portfolio.includes("const [delayedOnly, setDelayedOnly] = useState(false)"), "Portfolio has a delayed-only filter");
assert.ok(portfolio.includes("!delayedOnly || delayed.includes(p)"), "delayed metric filters the project list, not only the status dropdown");
assert.ok(portfolio.includes("[p.id, p.name, p.description, p.final_goal]"), "Portfolio search includes project ID as well as display text");
assert.ok(portfolio.includes("setDelayedOnly(true)"), "delayed-project metric activates the filtered list");
assert.ok(portfolio.includes("activeProjectsOnly: true"), "open task metric carries active-project scope to Tasks");
assert.ok(portfolio.includes("riskHighOnly: true"), "high-risk portfolio metric opens the same high-risk filter");
assert.ok(portfolio.includes('const [mode, setMode] = useState("cards")'), "Portfolio has an explicit view mode");
for (const mode of ['v: "table"', 'v: "board"', 'v: "timeline"', 'v: "calendar"']) assert.ok(portfolio.includes(mode), `Portfolio exposes ${mode} view`);
assert.ok(portfolio.includes(': mode === "table"') && portfolio.includes(': mode === "board"') && portfolio.includes(': mode === "timeline"') && portfolio.includes(': mode === "calendar"'), "all required Portfolio presentations have render paths");
for (const filter of ["typeFilter", "healthFilter", "leadFilter", "teamFilter", "priorityFilter", "visibilityFilter", "dateFrom", "dateTo", "highRiskOnly"]) assert.ok(portfolio.includes(filter), `Portfolio supports the ${filter} filter`);
assert.ok(portfolio.includes("timelinePosition(finish)") && portfolio.includes("timelineDates"), "Project Timeline uses project start/target dates");
assert.ok(portfolio.includes('today >= timelineMin && today <= timelineMax') && portfolio.includes('title="اليوم"'), "Project Timeline marks the current day within the visible range");
assert.ok(portfolio.includes('projectId: p.id, tab: "issues", issueStatusFilter: "open"'), "Portfolio issue counts navigate to the selected project issue list");
assert.ok(portfolio.includes('projectId: p.id, tab: "risks", riskStatusFilter: "open"'), "Portfolio risk counts navigate to the selected project risk list");
assert.ok(portfolio.includes('projectId: p.id, tab: "tasks", taskFilter: "overdue"'), "Portfolio card overdue counts open only the selected project's overdue tasks");

assert.ok(portfolio.includes("calendarDates") && portfolio.includes("p.target_date === date"), "Project Calendar uses target dates and opens exact projects");
assert.ok(portfolio.includes("p.members || []"), "Team filter reads the canonical Project.members relation");
assert.ok(portfolio.includes('right={can("project.create") && <Btn kind="primary"'), "Portfolio exposes a permission-gated Project create action");
assert.ok(portfolio.includes('{newProjectOpen && <ProjectForm initial={{}}'), "Portfolio create opens the canonical ProjectForm");
assert.ok(portfolio.includes('m.progress == null ? "غير قابل للقياس"'), "Portfolio cards and views do not coerce Not Measurable progress to zero");
assert.ok(portfolio.includes('"الأيام المتبقية"') && portfolio.includes("m.daysRemaining"), "Portfolio table includes the target date and remaining-days metric");
assert.ok(portfolio.includes('["المشروع","الحالة","الصحة","التقدم","الموعد","الأيام المتبقية","القائد","الفريق"'), "Portfolio table includes the lead and team columns");
assert.ok(portfolio.includes("إلغاء فلتر المشاريع المتأخرة") === false, "delayed-only indicator is represented by the combined filter reset");


const tasks = screensA.slice(screensA.indexOf("export function Tasks()"), screensA.indexOf("// ═════ Portfolio"));
assert.ok(tasks.includes("view.activeProjectsOnly === true"), "Tasks restores the active-project scope from Portfolio navigation");
assert.ok(tasks.includes('!projectsById[t.project_id].is_system && !["Completed", "Cancelled"].includes(projectsById[t.project_id].status)'), "active-project task scope excludes system, completed and cancelled projects");
assert.ok(tasks.includes("activeProjectsOnly: false"), "task filter reset clears the shared Portfolio scope");

console.log("t_projects_overview_metric_navigation: OK");
