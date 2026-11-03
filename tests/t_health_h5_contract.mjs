import fs from "node:fs";
import assert from "node:assert/strict";

const ui=fs.readFileSync("src/systems/health/index.jsx","utf8");
const component=fs.readFileSync("src/systems/health/HealthAnalytics.jsx","utf8");
const core=fs.readFileSync("src/core/core.js","utf8");
const plan=fs.readFileSync("plans/HEALTH_WELLNESS_OS_UNIFIED_MASTER_PLAN_v1_AR.md","utf8");

assert.ok(ui.includes('import HealthAnalytics from "./HealthAnalytics.jsx"'),"H5 component must be integrated");
assert.ok(ui.includes('page === "reports"'),"Reports route must render");
assert.ok(ui.includes('["reports","التقارير"]'),"Reports navigation must be visible");
assert.ok(core.includes('phase:"H5 · التحليلات والتقارير"'),"H5 must be the active phase");
assert.ok(core.includes("reports:التقارير الصحية:📊"),"H5 section must be registered in OS navigation");
assert.ok(component.includes('canRead("reports","read")'),"Reports must require explicit reports read scope");
assert.ok(component.includes('canRead("sensitive_trackers","read")'),"Sensitive factors must require the separate sensitive scope");
assert.ok(component.includes("window.print()"),"PDF output must use the browser print/save flow");
assert.ok(component.includes('type:"text/csv;charset=utf-8"'),"CSV must be UTF-8");
assert.ok(component.includes("source"),"Report rows must include data source metadata");
assert.ok(component.includes("لا يُستنتج علاقة سببية"),"Analytics must not imply causation");
assert.ok(component.includes("لا يتم استيراد أو نسخ الوجبات أو الماء أو التمارين"),"Nutrition and Sports records must not be duplicated");
assert.ok(!component.includes("cycleEntries"),"Cycle records must not enter H5 reports");
assert.ok(!component.includes("notes"),"Free-text clinical notes must not be exported");
assert.ok(plan.includes("H5 — التحليلات والتقارير")&&plan.includes("تغطية التسجيل"),"Master plan must document the H5 scope and descriptive coverage");
console.log("Health H5 contract checks passed.");
