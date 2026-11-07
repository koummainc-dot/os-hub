import assert from "node:assert/strict";
import fs from "node:fs";

const screens = fs.readFileSync(new URL("../src/systems/projects/screens_a.jsx", import.meta.url), "utf8");
const router = fs.readFileSync(new URL("../src/systems/projects/index.jsx", import.meta.url), "utf8");
const portfolio = screens.slice(screens.indexOf("export function Portfolio()"));

assert.ok(router.includes("portfolio: Portfolio"), "Portfolio is registered as a Projects route");
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
