import assert from "node:assert/strict";
import {validateMasterplanExport,masterplanToVenture} from "../src/systems/ventures/importMasterplan.js";

const raw={sites:[
 {id:"site-1",name:"Alpha",type:"website_content",priority:"High"},
 {id:"site-2",name:"Store",type:"store"}
],data:{
 tasks:[
  {id:"t1",siteId:"site-1",title:"Write",status:"Done"},
  {id:"t2",siteId:"site-1",title:"Review",status:"Review"}
 ],
 keywords:[{id:"k1",siteId:"site-1",keyword:"alpha"}],
 finance:[{id:"f1",siteId:"site-1",month:"2026-10",amount:"$1,200"}],
 members:[{id:"m1",siteId:"site-1",name:"No transfer"}],
 content:[{id:"c1",siteId:"site-1",title:"Keep in ContentOS"}],
 orphan:[{id:"o1",siteId:"missing"}]
},phaseDefs:[{id:"p1",siteId:"site-1",name:"Research"}]};

const v=validateMasterplanExport(raw);
assert.equal(v.ok,true);
assert.equal(v.stats.orphans,1);
const a=masterplanToVenture(raw,{importId:"imp_test"});
assert.equal(a.ok,true);
assert.equal(a.summary.projects,2);
const task=a.records.find(x=>x.id.includes("t1"));
assert.equal(task.data.status,"Completed");
assert.equal(task.data.project_id,"mp_5dbf0b0d08cf6dbd4efc0f3c");
assert.equal(a.report.some(x=>x.module==="members"&&x.status==="deferred"),true);
assert.equal(a.report.some(x=>x.module==="content"&&x.status==="deferred"),true);
const finance=a.records.find(x=>x.collection==="metric_import");
assert.equal(finance.data.period_start,"2026-10-01");
assert.equal(finance.data.value_num,1200);
const phase=a.records.find(x=>x.data?.is_phase);
assert.equal(phase.data.status,null);
assert.equal(phase.data.estimate,null);
assert.equal(phase.data.due_date,null);
const second=masterplanToVenture(raw,{importId:"imp_test"});
assert.deepEqual(second.records.map(x=>x.id),a.records.map(x=>x.id));
console.log("Ventures Masterplan import tests passed");
