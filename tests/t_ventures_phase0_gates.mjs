import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const source=fs.readFileSync(path.join(root,"docs/VENTURES_OS_PHASE0_GATE_RESULTS.md"),"utf8");

for(const gate of ["V1","V2","V3","V4","V5"]){
  assert.match(source,new RegExp("^## "+gate+"\\b","m"),gate+" result missing");
}
assert.match(source,/V1[\s\S]*Decision:/);
assert.match(source,/V2[\s\S]*Decision:/);
assert.match(source,/V3[\s\S]*Decision:/);
assert.match(source,/V4[\s\S]*Decision:/);
assert.match(source,/V5[\s\S]*Decision:/);
console.log("Ventures Phase 0 gate contract tests passed");
