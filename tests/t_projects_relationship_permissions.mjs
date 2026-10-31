import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const store = await readFile(new URL("../src/systems/projects/store.jsx", import.meta.url), "utf8");
const entities = await readFile(new URL("../src/systems/projects/entities.jsx", import.meta.url), "utf8");

const repairStart = store.indexOf("async createRepairTask(issue)");
const repairEnd = store.indexOf("async createRiskMitigationTask", repairStart);
assert.ok(repairStart >= 0 && repairEnd > repairStart, "repair-task action must exist");
const repair = store.slice(repairStart, repairEnd);
assert.ok(repair.includes('!can("issue.write", project) || !can("task.write", project)'),
  "repair-task writes require both issue and task permissions");
assert.ok(entities.includes('can("issue.write", projectsById[i.project_id]) && can("task.write", projectsById[i.project_id])'),
  "repair-task action must only be offered when both permissions are available");

const riskStart = store.indexOf("async convertRiskToIssue(riskId)");
const riskEnd = store.indexOf("async convertDiscoveryToTask", riskStart);
assert.ok(riskStart >= 0 && riskEnd > riskStart, "risk conversion action must exist");
assert.ok(store.slice(riskStart, riskEnd).includes('!can("risk.write", project) || !can("issue.write", project)'),
  "risk-to-issue conversion requires both risk and issue permissions");
assert.ok(entities.includes('s !== "Materialized" || can("issue.write", projectsById[r.project_id])'),
  "risk conversion option must be hidden without issue-write permission");

const mitigationStart = store.indexOf("async createRiskMitigationTask(riskId)");
const mitigationEnd = store.indexOf("async createDecisionTask", mitigationStart);
const mitigationAction = store.slice(mitigationStart, mitigationEnd);
assert.ok(mitigationAction.includes('!can("risk.write", project) || !can("task.write", project)'),
  "risk mitigation task requires both risk and task permissions");
assert.ok(mitigationAction.includes('const stableTaskId = "risk_mitigation_task_" + risk.id') && mitigationAction.includes("await R.putAtomic("),
  "risk mitigation creation must be idempotent and atomic");

const decisionStart = store.indexOf("async createDecisionTask(decisionId)");
const decisionEnd = store.indexOf("// tasks", decisionStart);
assert.ok(decisionStart >= 0 && decisionEnd > decisionStart, "decision implementation action must exist");
const decisionAction = store.slice(decisionStart, decisionEnd);
assert.ok(decisionAction.includes('decision.status !== "Approved"'), "decision implementation task requires an approved decision");
assert.ok(decisionAction.includes('!can("decision.write", project) || !can("task.write", project)'), "decision implementation requires decision and task permissions");
assert.ok(decisionAction.includes('const stableTaskId = "decision_task_" + decision.id') && decisionAction.includes("await R.putAtomic("),
  "decision implementation creation must be idempotent and atomic");
console.log("✓ Projects relationship permission and action contracts passed");
