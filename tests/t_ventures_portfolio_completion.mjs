import assert from "node:assert/strict";
import { portfolioTrendSeries, missingWeekCount } from "../src/systems/ventures/domain.js";

const projects=[{project_id:"p1"},{project_id:"p2"},{project_id:"p3"}];
const metrics=[
  {project_id:"p1",key:"revenue",value_num:100,period_start:"2026-10-01"},
  {project_id:"p1",key:"revenue",value_num:150,period_start:"2026-10-08"},
  {project_id:"p2",key:"revenue",value_num:50,period_start:"2026-10-08"}
];
assert.deepEqual(portfolioTrendSeries(projects,metrics,"revenue",12),[
  {period:"2026-10-01",value:100},
  {period:"2026-10-08",value:200}
]);
const now=new Date("2026-10-20T00:00:00Z").getTime();
assert.equal(missingWeekCount(projects,metrics,3,now),3);
assert.equal(missingWeekCount(projects,metrics,20,now),1);
console.log("t_ventures_portfolio_completion: OK");
