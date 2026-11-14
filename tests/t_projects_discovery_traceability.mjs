import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const entities = await readFile(new URL("../src/systems/projects/entities.jsx", import.meta.url), "utf8");
const store = await readFile(new URL("../src/systems/projects/store.jsx", import.meta.url), "utf8");
const migration = await readFile(new URL("../supabase/migrations/20261114253000_projects_discovery_traceability.sql", import.meta.url), "utf8");

const discoveryStart = entities.indexOf("export function DiscoveryView");
const discoveryEnd = entities.indexOf("// ═════", discoveryStart + 30);
const discoveryUi = entities.slice(discoveryStart, discoveryEnd > discoveryStart ? discoveryEnd : undefined);

assert.ok(discoveryUi.includes('key: "source_url"') && discoveryUi.includes('key: "source_title"'),
  "Discovery must capture an external source title and URL");
assert.ok(discoveryUi.includes('key: "objective_ids"'),
  "Discovery must support links to strategic Objectives");
assert.ok(discoveryUi.includes("validateDiscoveryTraceability"),
  "Discovery must validate source URL and Objective/project alignment before save");
assert.ok(discoveryUi.includes('window.open(d.source_url, "_blank", "noopener,noreferrer")'),
  "Discovery cards must open the original source without replacing the record");
assert.ok(discoveryUi.includes("detail.objective_ids") && discoveryUi.includes("detail.source_url"),
  "Discovery details must expose the Objective and source backlinks");

const taskStart = store.indexOf("async convertDiscoveryToTask(discoveryId, projectId)");
const taskEnd = store.indexOf("async convertDiscoveryToProject", taskStart);
const taskConversion = store.slice(taskStart, taskEnd);
assert.ok(taskConversion.includes("discovery_ids: [discoveryId]") && taskConversion.includes("await R.putAtomic("),
  "Discovery -> Task must preserve source backlink atomically");
assert.ok(!/objective_id\s*:/.test(taskConversion),
  "Task must not receive a direct Objective link; objective contribution remains derived through Project/KR");

const prdStart = store.indexOf("async convertDiscoveryToPrd(discoveryId, projectId)");
const prdEnd = store.indexOf("async convertDiscoveryToIssue", prdStart);
const prdConversion = store.slice(prdStart, prdEnd);
assert.ok(prdConversion.includes("discovery_ids: [discoveryId]") && prdConversion.includes("await R.putAtomic("),
  "Discovery -> PRD must preserve source/evidence traceability atomically");

const issueStart = store.indexOf("async convertDiscoveryToIssue(discoveryId, projectId, discoveredAt)");
const issueEnd = store.indexOf("// Save a risk", issueStart);
const issueConversion = store.slice(issueStart, issueEnd);
assert.ok(issueConversion.includes("from_discovery_id: discovery.id") && issueConversion.includes("await R.putAtomic("),
  "Discovery -> Issue must preserve an exact source backlink atomically");

const projectStart = store.indexOf("async convertDiscoveryToProject(discoveryId)");
const projectEnd = store.indexOf("async convertDiscoveryToPrd", projectStart);
const projectConversion = store.slice(projectStart, projectEnd);
assert.ok(projectConversion.includes("source_discovery_id: discovery.id") && projectConversion.includes("await R.putAtomic("),
  "Discovery -> Project must preserve an exact source backlink atomically");

assert.ok(migration.includes("new.data->'objective_ids'") && migration.includes("discovery.objective_ids"),
  "Database guard must validate Discovery Objective references");
assert.ok(migration.includes("Discovery objective must be supported by a KR linked to one of the discovery projects"),
  "Database guard must enforce Objective -> KR -> Project alignment");
assert.ok(migration.includes("source_url") && migration.includes("!~* '^https?://'"),
  "Database guard must reject non-http(s) external source URLs");

console.log("✓ Projects Discovery source, Objective, Project and conversion traceability contracts passed");
