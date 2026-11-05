import assert from "node:assert/strict";
global.localStorage={_m:new Map(),getItem(k){return this._m.get(k)||null},setItem(k,v){this._m.set(k,String(v))}};
global.crypto={randomUUID:()=> "queue-test-id"};
const repo=await import("../src/systems/ventures/repository.js");
const q=repo.enqueueVenturesMetrics("ws-1",[{project_id:"p1",key:"revenue",value_num:100,period_type:"W",period_start:"2026-11-01"}]);
assert.equal(q.count,1);
assert.equal(repo.venturesMetricQueueStatus().count,1);
console.log("Ventures offline queue tests passed");