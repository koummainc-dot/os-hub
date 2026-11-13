import assert from "node:assert/strict";
import fs from "node:fs";

const router = fs.readFileSync(new URL("../src/systems/projects/index.jsx", import.meta.url), "utf8");
const detail = fs.readFileSync(new URL("../src/systems/projects/screens_b.jsx", import.meta.url), "utf8");
const styles = fs.readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
const core = fs.readFileSync(new URL("../src/core/core.js", import.meta.url), "utf8");
const entities = fs.readFileSync(new URL("../src/systems/projects/entities.jsx", import.meta.url), "utf8");
const platform = fs.readFileSync(new URL("../src/platform/Platform.jsx", import.meta.url), "utf8");
const finance = fs.readFileSync(new URL("../src/systems/finance/Projects.jsx", import.meta.url), "utf8");
const followups = fs.readFileSync(new URL("../src/systems/knowledge/followupIdentity.js", import.meta.url), "utf8");

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
assert.ok(detail.includes('id: "knowledge"'), "project workspace has a Knowledge-owned meetings/resources group");
assert.ok(detail.includes('id: "finance"'), "project workspace has a Finance-owned project profile handoff");
assert.ok(detail.includes('id: "results"'), "project workspace exposes project-scoped results");
assert.ok(detail.includes('id: "discovery"'), "project workspace includes project-scoped discovery");
assert.ok(detail.includes('section="meetings"') && detail.includes('section="resources"'), "meetings and project-owned resources are separate tabs");
assert.ok(detail.includes('id: "related", label: "المراجع (مسار قديم)", hidden: true'), "legacy related deep link is retained but removed from primary navigation");
assert.ok(detail.includes("source_followup_id: followupIdentity"), "new meeting tasks persist stable follow-up references");
assert.ok(detail.includes("ProjectFinanceTab"), "Project Finance tab is a handoff, not a duplicate financial ledger");
assert.ok(entities.includes("export function DiscoveryView({ projectId = null } = {})") && entities.includes("scopedProjectId"), "Discovery supports project-scoped rendering");
assert.ok(platform.includes("routeContext={route.context || null}"), "Platform forwards ephemeral route context");
assert.ok(finance.includes("initialProjectRef") && finance.includes("setShowForm(true)"), "Finance opens or pre-fills its canonical profile without auto-writing");
assert.ok(followups.includes("stableKnowledgeFollowupId") && followups.includes("findKnowledgeFollowupTask"), "Knowledge follow-up identity contract is present");
assert.ok(router.includes('{ id: "execution", label: "التنفيذ"'), "global navigation keeps the execution group");

assert.ok(core.includes("myWork:مهامي"), "core registry exposes the myWork route used by the grouped Projects navigation");
assert.ok(core.includes("tasks:المهام"), "core registry keeps the canonical tasks route");

assert.ok(styles.includes("--accent:#EF9F27 !important"), "global accent token matches the existing Core UI accent");
assert.ok(styles.includes(".projects-workspace-nav-mobile"), "responsive workspace navigation styles are present");
assert.ok(styles.includes("@media (max-width:700px)"), "mobile breakpoint is defined for the workspace navigation");
assert.ok(!styles.includes("37,99,235") && !styles.includes("#1D4ED8") && !styles.includes("#BFDBFE"), "focus and selected states do not retain the old blue accent");

console.log("t_projects_phase1_navigation_contract: OK");
