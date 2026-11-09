import assert from "node:assert/strict";
import fs from "node:fs";

const screens = fs.readFileSync(new URL("../src/systems/projects/screens_a.jsx", import.meta.url), "utf8");
const router = fs.readFileSync(new URL("../src/systems/projects/index.jsx", import.meta.url), "utf8");
const projectScreens = fs.readFileSync(new URL("../src/systems/projects/screens_b.jsx", import.meta.url), "utf8");
const taskParts = fs.readFileSync(new URL("../src/systems/projects/parts.jsx", import.meta.url), "utf8");
const entities = fs.readFileSync(new URL("../src/systems/projects/entities.jsx", import.meta.url), "utf8");
const portfolio = screens.slice(screens.indexOf("export function Portfolio()"));

assert.ok(router.includes("portfolio: Portfolio"), "Portfolio is registered as a Projects route");
assert.ok(router.includes("myWork: MyWork"), "My Work is registered as a dedicated Projects route");
assert.ok(screens.includes("export function MyWork()"), "My Work has a dedicated hub component");
const myWork = screens.slice(screens.indexOf("export function MyWork()"));
assert.ok(myWork.includes('{ id: "today", label: "اليوم" }'), "My Work exposes a Today tab");
assert.ok(myWork.includes('{ id: "week", label: "هذا الأسبوع" }'), "My Work exposes a This Week tab");
assert.ok(myWork.includes('{ id: "tasks", label: "كل المهام" }'), "My Work exposes an all-tasks tab");
assert.ok(myWork.includes("<Today />") && myWork.includes("<Week />") && myWork.includes("<Tasks />"), "My Work reuses the canonical existing views instead of duplicating task logic");
assert.ok(screens.includes('import { listKnowledgeMeetings } from "../knowledge/repository.js";'), "My Work reads meetings through the canonical Knowledge repository");
const todayView = screens.slice(screens.indexOf("export function Today()"), screens.indexOf("// ═════ This Week ═════"));
assert.ok(todayView.includes("listKnowledgeMeetings(ws.id)"), "Today loads the authoritative Knowledge meeting records");
assert.ok(todayView.includes('String(meeting.date || "").slice(0, 10) === String(today).slice(0, 10)'), "Today filters meetings to the workspace-local date already used by Projects");
assert.ok(todayView.includes('meeting.status !== "archived"'), "Today excludes archived meetings");
assert.ok(todayView.includes('setPage("meetings")'), "Meeting agenda links to the existing Knowledge-owned meeting workflow");

assert.ok(portfolio.includes("const [query, setQuery] = useState(\"\")"), "Portfolio search is controlled by React state");
assert.ok(portfolio.includes("const [status, setStatus] = useState(\"active\")"), "Portfolio starts with the active-project filter");
assert.ok(portfolio.includes("projectProgress"), "Portfolio receives derived project progress for OKR calculations");
assert.ok(portfolio.includes("D.objectiveProgress(objective, data.krs, projectProgress)"), "Portfolio derives Objective progress through canonical KR/project relations");
assert.ok(portfolio.includes("const projectIds = [...new Set(krs.flatMap((kr) => kr.project_ids || []))]"), "Portfolio derives contributing Projects only from KR.project_ids");
assert.ok(!portfolio.includes("objective.project_ids"), "Portfolio does not restore legacy direct Objective→Project links");
assert.ok(portfolio.includes("id: \"governance\"") && portfolio.includes("id: \"outputs\"") && portfolio.includes("id: \"specs\""), "Portfolio groups governance, outputs, and specifications in shared tabs");
assert.ok(portfolio.includes("D.pace(progress, objective.period_start, objective.period_end, objective.status, today, settings)"), "Portfolio shows time-aware OKR pace");
assert.ok(portfolio.includes("aria-label=\"بحث في المشاريع\""), "Portfolio search has an accessible Arabic label");
assert.ok(portfolio.includes("aria-label=\"تصفية المشاريع\""), "Portfolio filter has an accessible Arabic label");
assert.ok(portfolio.includes("openProject(project.id)"), "Portfolio comparison rows navigate to the exact project");
assert.ok(portfolio.includes("<table style={{ width: \"100%\", minWidth: 890"), "Portfolio overview uses a cross-project comparison table");
assert.ok(portfolio.includes("D.isOverdueLeaf(t, idx, today)"), "Portfolio overdue counts use the canonical task date/status rule");
assert.ok(portfolio.includes("D.isOpenIssue(i)"), "Portfolio issue counts exclude closed issues");
assert.ok(portfolio.includes("D.isOpenRisk(r)"), "Portfolio risk counts exclude closed risks");
assert.ok(portfolio.includes("setPage(\"okrs\")"), "Portfolio links to OKR management");
assert.ok(!portfolio.includes("localStorage"), "Portfolio does not persist duplicate local-only project state");

const overview = projectScreens.slice(projectScreens.indexOf("function Overview"), projectScreens.indexOf("function ProjectTimeline"));
assert.ok(overview.includes("قائمة جاهزية المشروع من القالب"), "project overview displays the checklist seeded by the project template");
assert.ok(overview.includes("p.template_roles") && overview.includes("الأدوار المطلوبة حسب القالب"), "project overview surfaces unassigned template roles without inventing workspace members");
assert.ok(overview.includes("p.decision_prompts") && overview.includes("أسئلة قرارات مطلوب حسمها"), "project overview surfaces unresolved decision prompts from the template");
assert.ok(overview.includes('setView({ ...view, tab: "people" })') && overview.includes('setView({ ...view, tab: "decisions" })'), "template role and decision prompts navigate to their canonical project sections");

const taskTree = taskParts.slice(taskParts.indexOf("export function TaskTree"), taskParts.indexOf("function StatusChipSm"));
assert.ok(taskTree.includes('useState("month")') && taskTree.includes('[["month","شهر"],["week","أسبوع"],["day","يوم"]]'), "project calendar exposes month, week and day views");
assert.ok(taskTree.includes("calendarMode === \"week\" ? weekDates") && taskTree.includes("calendarMode === \"day\" ? [calendarDate]"), "project calendar renders the selected week/day date range");
assert.ok(taskTree.includes("إضافة مهمة بتاريخ ") && taskTree.includes("moveTask(task, date)"), "calendar day cells can create dated tasks and drop tasks to reschedule");
assert.ok(taskParts.includes('key: "start_date"') && taskParts.includes('key: "due_date"'), "task form stores both planning start and due dates for timeline/calendar");

assert.ok(entities.includes("مصفوفة المخاطر 5×5") && entities.includes('setMode(projectId ? "matrix" : "list")'), "project risk view opens on an actionable 5x5 risk matrix");
const issueView = entities.slice(entities.indexOf("export function IssuesView"), entities.indexOf("// ═════ Decisions ═════"));\nassert.ok(issueView.includes("لوحة حسب الحالة") && issueView.includes('setMode(projectId ? "matrix" : "list")'), "project issues open on a status matrix rather than relying only on the global list");
assert.ok(entities.includes("مصفوفة القرارات") && entities.includes('const [mode, setMode] = useState("matrix")'), "decisions use a status matrix by default");
assert.ok(screens.includes('import { L, opts, SEV_COLOR } from "./lookups.js";'), "Portfolio imports severity metadata used in its governance view");
assert.ok(projectScreens.includes("function ProjectActivityHub") && projectScreens.includes("label: \"التحديثات\"") && projectScreens.includes("label: \"الاجتماعات\""), "project activity hub brings activity, updates, wins and Knowledge meetings together");

console.log("t_projects_portfolio_contract: OK");
