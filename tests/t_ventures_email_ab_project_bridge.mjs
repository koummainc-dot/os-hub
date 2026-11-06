import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { emailWinnerPatch, emailCheckProjectIssue, validateEmailABTest } from "../src/systems/ventures/domain.js";
const projects = readFileSync(new URL("../src/systems/projects/index.jsx", import.meta.url), "utf8");
const ventures = readFileSync(new URL("../src/systems/ventures/realWorkspace.jsx", import.meta.url), "utf8");

assert.deepEqual(validateEmailABTest({ab_test:true,variant_a:"A",variant_b:"B",winner_variant:"A",winner_reason:"CTR أعلى"}),[]);
assert.deepEqual(validateEmailABTest({ab_test:true,variant_a:"A",variant_b:"B",winner_variant:"A"}),["winner_reason is required when a winner is selected"]);
assert.equal(validateEmailABTest({ab_test:true,variant_a:"A"}).includes("variant_b is required"),true);
const winner=emailWinnerPatch({id:"cmp_1"}, "B", "CTOR أعلى");
assert.equal(winner.ok,true); assert.equal(winner.patch.winner_variant,"B"); assert.equal(winner.patch.winner_reason,"CTOR أعلى"); assert.equal(winner.patch.ab_test,true);
const issue=emailCheckProjectIssue({id:"e1",project_id:"p1",type:"DMARC",status:"Open",risk:"High",note:"Policy missing"});
assert.equal(issue.ok,true); assert.equal(issue.recordId,"email-check-e1"); assert.equal(issue.payload.kind,"Risk"); assert.equal(issue.payload.source_record_id,"e1"); assert.equal(issue.payload.project_id,"p1");
assert.match(ventures,/action:"create_risk",recordId:r\.recordId,payload:r\.payload/,"Email Check must dispatch a Risk-specific action");
assert.match(projects,/d\.action === "create_risk"/,"Projects must handle risk creation rather than treating it as a project");
assert.match(projects,/A\.put\("risks", risk, project\)/,"risk is persisted in Projects risks collection");
assert.match(projects,/source_record_id: payload\.source_record_id/,"source record link is retained");
assert.match(projects,/ctx\.can\("risk\.write", project\)/,"Projects permission check is enforced");
console.log("t_ventures_email_ab_project_bridge: OK");

const finance = readFileSync(new URL("../src/systems/finance/index.jsx", import.meta.url), "utf8");
assert.match(finance,/\.from\("finance_transactions"\)\.select\("id"\).*\.maybeSingle\(\)/s,"lookup existing transaction before creating");
assert.match(finance,/\.eq\("client_generated_id", stableId\)/,"stable campaign write key");
assert.match(finance,/\.update\(txPayload\)/,"repeat revenue write updates existing transaction");
assert.match(finance,/source_system: "ventures"/,"finance source metadata");
assert.match(finance,/source_type: "email_campaign"/,"email campaign source type");
assert.doesNotMatch(finance,/idempotency_key: "ventures-finance-/,"do not send nonexistent idempotency_key column");

const financeSource = readFileSync(new URL("../src/systems/finance/index.jsx", import.meta.url), "utf8");
assert.match(financeSource,/purpose: "Regular"/,"Finance purpose must match allowed enum");
assert.match(financeSource,/pnl_effect: type === "Income" \? "Income" : "Expense"/,"required P&L effect is supplied");
assert.match(financeSource,/flow_class: "Operating"/,"required flow class is supplied");
assert.doesNotMatch(financeSource,/if \(txError\) throw txError/,"do not reference an undefined create-branch error variable");

const financeAcks = [...financeSource.matchAll(/os:source-write-result/g)];
assert.ok(financeAcks.length >= 3, "all Finance outcomes dispatch a result");
const ackSlices = financeAcks.map((m) => financeSource.slice(m.index, m.index + 500));
for (const ack of ackSlices) assert.match(ack,/source: "ventures"/,"Finance result must be accepted by Ventures listener");

const projectStore = readFileSync(new URL("../src/systems/projects/store.jsx", import.meta.url), "utf8");
assert.match(projects,/await A\.saveRisk\(risk\)/,"Projects event handler uses the public risk save action");
assert.doesNotMatch(projects,/A\.put\("risks"/,"Projects event handler must not call a nonexistent generic action");
assert.match(projectStore,/async saveRisk\(v\)/,"Projects exposes a real risk persistence action");
assert.match(projectStore,/D\.validateRisk\(v\)/,"risk score validation runs before persistence");
assert.match(projectStore,/putIn\("risks", risk, project\)/,"risk persistence inherits project visibility");
