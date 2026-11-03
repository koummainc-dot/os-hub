import assert from "node:assert/strict";
import fs from "node:fs";
import { normalizeHealthSearch } from "../src/systems/health/HealthSearch.jsx";
assert.equal(normalizeHealthSearch("إِلتِهابٌ"),normalizeHealthSearch("التهاب"));
assert.equal(normalizeHealthSearch("ملوخية"),normalizeHealthSearch("ملوخيه"));
assert.equal(normalizeHealthSearch("على"),normalizeHealthSearch("علي"));
assert.equal(normalizeHealthSearch("ألم ١٢"),normalizeHealthSearch("الم 12"));
const ui=fs.readFileSync("src/systems/health/index.jsx","utf8"),core=fs.readFileSync("src/core/core.js","utf8"),plan=fs.readFileSync("plans/HEALTH_WELLNESS_OS_UNIFIED_MASTER_PLAN_v1_AR.md","utf8"),component=fs.readFileSync("src/systems/health/HealthSearch.jsx","utf8");
assert.match(ui,/import HealthSearch from ".\\/HealthSearch\\.jsx"/);assert.match(ui,/page === "search"/);assert.match(core,/search:البحث الصحي:🔎/);assert.match(component,/canRead\\(scope,"read"\\)/);assert.match(component,/sensitive_trackers/);assert.match(component,/لا يبحث داخل محتوى ملفات PDF/);assert.doesNotMatch(component,/cycleEntries|cycle_tracking/);assert.match(plan,/H2.3 — البحث الصحي الموحّد \\(منفذ جزئيًا\\)/);console.log("Health H2.3 contract checks passed");