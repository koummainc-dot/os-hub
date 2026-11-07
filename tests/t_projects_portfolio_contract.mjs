import assert from "node:assert/strict";
import fs from "node:fs";

const screens = fs.readFileSync(new URL("../src/systems/projects/screens_a.jsx", import.meta.url), "utf8");
const router = fs.readFileSync(new URL("../src/systems/projects/index.jsx", import.meta.url), "utf8");
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
assert.ok(portfolio.includes("D.objectiveProgress(o, data.krs, projectProgress)"), "Portfolio derives Objective progress through canonical KR/project relations");
assert.ok(portfolio.includes("D.pace(progress, o.period_start, o.period_end, o.status, today, settings)"), "Portfolio shows time-aware OKR pace");
assert.ok(portfolio.includes("aria-label=\"بحث في المشاريع\""), "Portfolio search has an accessible Arabic label");
assert.ok(portfolio.includes("aria-label=\"تصفية المشاريع\""), "Portfolio filter has an accessible Arabic label");
assert.ok(portfolio.includes("openProject(p.id)"), "Portfolio cards navigate to the exact project");
assert.ok(portfolio.includes("D.isOverdueLeaf(t, idx, today)"), "Portfolio overdue counts use the canonical task date/status rule");
assert.ok(portfolio.includes("D.isOpenIssue(i)"), "Portfolio issue counts exclude closed issues");
assert.ok(portfolio.includes("D.isOpenRisk(r)"), "Portfolio risk counts exclude closed risks");
assert.ok(portfolio.includes("setPage(\"okrs\")"), "Portfolio links to OKR management");
assert.ok(!portfolio.includes("localStorage"), "Portfolio does not persist duplicate local-only project state");

console.log("t_projects_portfolio_contract: OK");
