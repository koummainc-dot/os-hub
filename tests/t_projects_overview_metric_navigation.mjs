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

const detail = screensB.slice(screensB.indexOf("function ProjectDetail()"), screensB.indexOf("function Overview("));
assert.ok(detail.includes("const overdueTaskFilter = view.taskFilter === \"overdue\" ? (task) => D.isOverdueLeaf(task, idx, today) : undefined"), "Project Detail translates the task filter state using the domain overdue rule");
assert.ok(detail.includes('<TaskTree projectId={p.id} filter={overdueTaskFilter} />'), "Project Detail passes its filter into the canonical task tree");

const taskTree = parts.slice(parts.indexOf("export function TaskTree"), parts.indexOf("function StatusChipSm"));
assert.ok(taskTree.includes("&& matches(t)"), "task filters apply to table, board, calendar and timeline data");
assert.ok(taskTree.includes("const visibleRoots = roots.filter((root) => visible(root))"), "tree view retains ancestors of matching overdue leaves");
assert.ok(taskTree.includes('setView((current) => ({ ...current, taskFilter: null }))'), "task filter can be explicitly cleared");
assert.ok(taskTree.includes("لا توجد مهام متأخرة حاليًا في هذا المشروع"), "empty overdue filter has a truthful empty state");

const riskView = entities.slice(entities.indexOf("export function RisksView"), entities.indexOf("export function IssuesView"));
assert.ok(riskView.includes("view.riskHighOnly === true"), "Risk view restores the high-risk filter from navigation state");
assert.ok(riskView.includes("D.isOpenRisk(r) && D.riskScore(r) >= settings.riskHigh"), "high-risk filter uses the canonical open-risk score threshold");
assert.ok(riskView.includes("المخاطر العالية المفتوحة فقط"), "Risk view exposes the active high-risk filter");
assert.ok(riskView.includes("riskHighOnly: checked"), "Risk view stores its filter in shared navigation state");

const portfolio = screensA.slice(screensA.indexOf("export function Portfolio()"));
assert.ok(portfolio.includes("const [delayedOnly, setDelayedOnly] = useState(false)"), "Portfolio has a delayed-only filter");
assert.ok(portfolio.includes("!delayedOnly || delayed.includes(p)"), "delayed metric filters the project list, not only the status dropdown");
assert.ok(portfolio.includes("setDelayedOnly(true)"), "delayed-project metric activates the filtered list");
assert.ok(portfolio.includes("activeProjectsOnly: true"), "open task metric carries active-project scope to Tasks");
assert.ok(portfolio.includes("riskHighOnly: true"), "high-risk portfolio metric opens the same high-risk filter");

const tasks = screensA.slice(screensA.indexOf("export function Tasks()"), screensA.indexOf("// ═════ Portfolio"));
assert.ok(tasks.includes("view.activeProjectsOnly === true"), "Tasks restores the active-project scope from Portfolio navigation");
assert.ok(tasks.includes('!projectsById[t.project_id].is_system && !["Completed", "Cancelled"].includes(projectsById[t.project_id].status)'), "active-project task scope excludes system, completed and cancelled projects");
assert.ok(tasks.includes("activeProjectsOnly: false"), "task filter reset clears the shared Portfolio scope");

console.log("t_projects_overview_metric_navigation: OK");
