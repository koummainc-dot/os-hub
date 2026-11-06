import assert from "node:assert/strict";
import { emailDerivedMetrics, validateEmailCampaign, emailAlerts } from "../src/systems/ventures/domain.js";

const c={sent:1000,delivered:950,opens:190,clicks:38,unsubs:5,bounces_hard:20,bounces_soft:10,spam_complaints:1,conversions:8,revenue:1900};
const m=emailDerivedMetrics(c);
assert.equal(Number(m.deliveryRate.toFixed(2)),95);
assert.equal(Number(m.openRate.toFixed(2)),20);
assert.equal(Number(m.ctr.toFixed(2)),4);
assert.equal(Number(m.ctor.toFixed(2)),20);
assert.equal(Number(m.bounceRate.toFixed(2)),3);
assert.equal(Number(m.rpr.toFixed(2)),2);
assert.deepEqual(validateEmailCampaign({sent:10,delivered:11}),["delivered cannot exceed sent"]);
const alerts=emailAlerts([{id:"c1",status:"Scheduled",scheduled_at:"2020-01-01",...c}],[{id:"l1",last_cleaned_at:"2020-01-01"}],[{id:"e1",status:"Open",risk:"SPF"}],{list_clean_days:30});
assert.equal(alerts.some(x=>x.key==="email_schedule_c1"),true);
assert.equal(alerts.some(x=>x.key==="email_list_clean_l1"),true);
assert.equal(alerts.some(x=>x.key==="email_check_e1"),true);
console.log("t_ventures_email_engine: OK");
