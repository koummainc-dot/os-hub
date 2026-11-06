import assert from "node:assert/strict";
import { emailWinnerPatch, emailCheckProjectIssue, validateEmailABTest } from "../src/systems/ventures/domain.js";

assert.deepEqual(validateEmailABTest({ab_test:true,variant_a:"A",variant_b:"B",winner_variant:"A",winner_reason:"CTR أعلى"}),[]);
assert.deepEqual(validateEmailABTest({ab_test:true,variant_a:"A",variant_b:"B",winner_variant:"A"}),["winner_reason is required when a winner is selected"]);
assert.equal(validateEmailABTest({ab_test:true,variant_a:"A"}).includes("variant_b is required"),true);

const winner=emailWinnerPatch({id:"cmp_1"}, "B", "CTOR أعلى");
assert.equal(winner.ok,true);
assert.equal(winner.patch.winner_variant,"B");
assert.equal(winner.patch.winner_reason,"CTOR أعلى");
assert.equal(winner.patch.ab_test,true);

const issue=emailCheckProjectIssue({id:"e1",project_id:"p1",type:"DMARC",status:"Open",risk:"High",note:"Policy missing"});
assert.equal(issue.ok,true);
assert.equal(issue.recordId,"email-check-e1");
assert.equal(issue.payload.kind,"Risk");
assert.equal(issue.payload.source_record_id,"e1");
assert.equal(issue.payload.project_id,"p1");

console.log("t_ventures_email_ab_project_bridge: OK");
