import assert from "node:assert/strict";
import {scorecardFor,portfolioQuestions,suggestCall} from "../src/systems/ventures/domain.js";

const profile={kind:"store",subtype:"ecommerce",decision_metric:"net_profit"};
const defs=[
  {key:"revenue",kind:"input",class:"fin",better:"up",applies_to:["store"]},
  {key:"net_profit",kind:"input",class:"fin",better:"up",applies_to:["store"]},
  {key:"cac",kind:"input",class:"ops",better:"down",applies_to:["store"]}
];
const scorecard=scorecardFor(profile,defs);
assert.equal(scorecard.length,3);
assert.equal(scorecard.filter(x=>x.required).length,1);

const good=suggestCall(profile,{values:{net_profit:1200},thresholds:{net_profit:{good:1000,warn:500,bad:0}}});
assert.equal(good.decision,"Scale");

const bad=suggestCall(profile,{values:{net_profit:-50},thresholds:{net_profit:{good:1000,warn:500,bad:0}}});
assert.equal(bad.decision,"Fix");

const ctx={
  projects:[
    {id:"p1",health:"active",decision_metric_key:"net_profit",decision_metric:1200},
    {id:"p2",health:"critical",decision_metric_key:"net_profit",decision_metric:-50}
  ],
  values:{p1:{net_profit:1200,revenue:5000},p2:{net_profit:-50,revenue:1000}}
};
const q=portfolioQuestions(ctx);
assert.equal(q.q1.length,1);
assert.equal(q.q5.length,1);
console.log("PASS ventures portfolio engine");
