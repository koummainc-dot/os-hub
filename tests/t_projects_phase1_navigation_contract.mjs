import assert from "node:assert/strict";
import fs from "node:fs";

const router = fs.readFileSync(new URL("../src/systems/projects/index.jsx", import.meta.url), "utf8");
const detail = fs.readFileSync(new URL("../src/systems/projects/screens_b.jsx", import.meta.url), "utf8");
const styles = fs.readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
const core = fs.readFileSync(new URL("../src/core/core.js", import.meta.url), "utf8");

assert.ok(router.includes("decisions: GovernancePage"), "legacy decisions route resolves to the unified Governance page");
assert.ok(router.includes("issues: GovernancePage"), "legacy issues route resolves to the unified Governance page");
assert.ok(router.includes('{ id: "governance", label: "الحوكمة"'), "global navigation has a single Governance group");
assert.ok(router.includes('{ id: "results", label: "النتائج والتقارير"'), "global navigation has a Results & Reporting group");
assert.ok(router.includes('{ id: "admin", label: "الإدارة"'), "global navigation has an Administration group");
assert.ok(!router.includes('{ id: "decisions", label: "القرارات", icon: "⚖" }'), "decisions is not duplicated as a separate global navigation item");

assert.ok(detail.includes("function ProjectWorkspaceNav"), "project detail has a dedicated workspace navigation component");
assert.ok(detail.includes("projects-workspace-nav-mobile"), "project workspace has a mobile navigation mode");
assert.ok(detail.includes("projects-workspace-nav-desktop"), "project workspace has a desktop navigation mode");
assert.ok(detail.includes('aria-label="تنقل المشروع"'), "project workspace navigation is accessible");
assert.ok(detail.includes('id: "governance"'), "project workspace keeps the governance group");
assert.ok(detail.includes('id: "collaboration"'), "project workspace keeps the collaboration group");
assert.ok(router.includes('{ id: "execution", label: "التنفيذ"'), "global navigation keeps the execution group");

assert.ok(core.includes("myWork:مهامي"), "core registry exposes the myWork route used by the grouped Projects navigation");
assert.ok(core.includes("tasks:المهام"), "core registry keeps the canonical tasks route");

assert.ok(styles.includes("--accent:#EF9F27 !important"), "global accent token matches the existing Core UI accent");
assert.ok(styles.includes(".projects-workspace-nav-mobile"), "responsive workspace navigation styles are present");
assert.ok(styles.includes("@media (max-width:700px)"), "mobile breakpoint is defined for the workspace navigation");

console.log("t_projects_phase1_navigation_contract: OK");
