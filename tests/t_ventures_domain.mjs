import assert from "node:assert/strict";
import {VENTURES_MODULES,VENTURES_PLATFORM} from "../src/systems/ventures/config.js";
import {summarizeVentures,getContentWorkflow} from "../src/systems/ventures/domain.js";
assert.equal(VENTURES_MODULES.length,30);
assert.ok(VENTURES_MODULES.some(x=>x.id==="cro"));
assert.equal(VENTURES_PLATFORM.platform.id,"website");
assert.ok(VENTURES_PLATFORM.platform.contentTypes.length>=11);
assert.ok(VENTURES_PLATFORM.platform.contentTypes.every(x=>Array.isArray(x.stages)));
const blog=VENTURES_PLATFORM.platform.contentTypes.find(x=>x.name.includes("مقال مدونة"));
assert.equal(blog.stages.length,10);
assert.ok(blog.stages.every(s=>Array.isArray(s.tasks)&&Array.isArray(s.fields)));
assert.equal(getContentWorkflow(blog.id).length,10);
const summary=summarizeVentures({keywords:[{id:"1"}],content:[{id:"2",_deleted_at:null},{id:"3",_deleted_at:"x"}]});
assert.equal(summary.records,2);
assert.equal(summary.contentRecords,1);
console.log("Ventures domain contract: PASS");

const expectedOperational=["phases","team","members","calendar","notes","tech","assets","email","distribution","health","kpi","alerts","priority","finance","cro"];
assert.ok(expectedOperational.every(id=>VENTURES_MODULES.some(x=>x.id===id)));
const summary2=summarizeVentures({phases:[{id:"p1"}],notes:[{id:"n1"}],kpi:[{id:"k1",_deleted_at:"x"}],finance:[{id:"f1"}]});
assert.equal(summary2.moduleCounts.phases,1);
assert.equal(summary2.moduleCounts.notes,1);
assert.equal(summary2.moduleCounts.kpi,0);
assert.equal(summary2.moduleCounts.finance,1);
console.log("Ventures operations/insights contract: PASS");

import {sourceSummary,requestVenturesSourceWrite} from "../src/systems/ventures/integrations.js";
const sourceSummaryCheck=sourceSummary({sources:{projects:[{id:"p1"}],content:[{id:"c1"},{id:"c2"}],finance:{data:{transactions:[{id:"f1"}]}},knowledge:{notes:[{id:"n1"}]}},errors:{}});
assert.deepEqual(sourceSummaryCheck,{projects:1,content:2,finance:1,knowledge:1,errors:[]});
console.log("Ventures source-of-truth adapter contract: PASS");

assert.equal(typeof requestVenturesSourceWrite,"function");
console.log("Ventures write-through request contract: PASS");
