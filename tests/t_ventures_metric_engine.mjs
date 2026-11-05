import assert from "node:assert/strict";
import {
  evalMetric, aggregatePeriod, thresholdState, scorecardFor,
  decisionMetric, portfolioQuestions, suggestCall, canApplyCall, ventureAlerts
} from "../src/systems/ventures/domain.js";

const ratio=evalMetric({op:"ratio",inputs:["clicks","delivered"]},{clicks:20,delivered:100});
assert.equal(ratio.value,20);
assert.equal(evalMetric({op:"ratio",inputs:["clicks","delivered"]},{clicks:20,delivered:0}).value,null);

assert.equal(aggregatePeriod({aggregation:"sum"},[{value_num:2},{value_num:3}],"W"),5);
assert.equal(aggregatePeriod({aggregation:"last"},[{period_start:"2026-01-01",value_num:2},{period_start:"2026-01-08",value_num:7}],"W"),7);

assert.equal(thresholdState({key:"profit"},50,{good:40,warn:10,bad:0}),"good");
assert.equal(thresholdState({key:"profit"},-2,{good:40,warn:10,bad:0}),"bad");
assert.equal(thresholdState({key:"profit"},20,{good:40,warn:10,bad:0}),"warn");
assert.equal(thresholdState({key:"profit"},20,{}),"none");

assert.equal(scorecardFor({kind:"store"},[
  {key:"revenue",applies_to:["store"]},{key:"app",applies_to:["app"]}
]).length,1);

assert.deepEqual(decisionMetric({}, {net_profit:12}),{key:"net_profit",value:12});
assert.equal(portfolioQuestions({
  projects:[{id:"p1"},{id:"p2"}],
  values:{p1:{net_profit:100,decision_metric:80,decision_trend:1,health:"Green"},p2:{net_profit:-2,decision_metric:20,review_overdue:true}}
}).q4.length,1);
assert.equal(suggestCall({}, {values:{net_profit:100},thresholds:{net_profit:{good:50,bad:0}}}).decision,"Scale");
assert.equal(suggestCall({}, {values:{net_profit:-1},thresholds:{net_profit:{good:50,bad:0}}}).decision,"Fix");

assert.equal(canApplyCall({status:"In Progress"},{decision:"Pause"}).ok,true);
assert.equal(canApplyCall({status:"Idea"},{decision:"Pause"}).ok,false);

const alerts=ventureAlerts("m1",{projects:[{id:"p1",kind:"app"}],values:{p1:{crash_free_under_threshold:true}}});
assert.equal(alerts[0].key,"V-A5:p1");
console.log("Ventures metric/portfolio domain contract: PASS");