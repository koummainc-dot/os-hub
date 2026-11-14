import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const projectsFinance = await readFile(new URL("../src/systems/projects/screens_b.jsx", import.meta.url), "utf8");
const portfolio = await readFile(new URL("../src/systems/projects/screens_a.jsx", import.meta.url), "utf8");
const financePage = await readFile(new URL("../src/systems/finance/Projects.jsx", import.meta.url), "utf8");
const syncMigration = await readFile(new URL("../supabase/migrations/20261114250000_finance_project_sync_read_model.sql", import.meta.url), "utf8");

for (const [name, source] of [["Project Finance", projectsFinance], ["Portfolio", portfolio], ["Finance Projects", financePage]]) {
  assert.ok(source.includes("fin_projects_sync_get"), `${name} must consume the Finance-owned sync read model`);
  assert.ok(source.includes("last_synced_at") && source.includes("as_of"), `${name} must expose Finance sync metadata`);
}
assert.ok(projectsFinance.includes('setState("stale")') && projectsFinance.includes('setState("permission")'),
  "Project Finance must distinguish transport staleness from denied access");
assert.ok(projectsFinance.includes("lastGoodSync.current = null") && projectsFinance.includes("setProfiles([])"),
  "Project Finance must clear cached values when Finance read permission is revoked");
assert.ok(portfolio.includes('setFinanceLinkState("stale")') && portfolio.includes('setFinanceLinkState("permission")'),
  "Portfolio must distinguish stale data from denied Finance access");
assert.ok(financePage.includes('setSyncStatus("stale")') && financePage.includes('setSyncStatus("permission")'),
  "Finance Projects must distinguish stale data from denied access");
assert.ok(financePage.includes("setProjects([]);setTransactions([]);setPrimaryProfiles([])"),
  "Finance Projects must invalidate sensitive cached rows after permission revocation");
assert.ok(syncMigration.includes("'sync_status', 'fresh'") && syncMigration.includes("'contract_version', 1"),
  "Finance sync metadata must be server-owned and versioned");

console.log("✓ Finance sync freshness, last-good snapshot and permission-revocation contracts passed");
