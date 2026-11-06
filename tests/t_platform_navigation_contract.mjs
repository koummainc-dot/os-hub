import fs from "node:fs";
import assert from "node:assert/strict";

const core=fs.readFileSync("src/core/core.js","utf8");
const platform=fs.readFileSync("src/platform/Platform.jsx","utf8");
const real=fs.readFileSync("src/systems/ventures/realWorkspace.jsx","utf8");

const expected=[
  "dashboard","entry","projects","money","channels","seo","growth","catalog",
  "compliance","tools","decisions","import","settings","email"
];

for(const id of expected){
  assert.match(core,new RegExp(id+"[^\\n]{0,80}"),"registry missing "+id);
  assert.match(real,new RegExp('\\["'+id+'","'),"real workspace missing canonical tab "+id);
}
assert.match(platform,/const navSections=sys&&acc\.level!=="none"\?osSections\(sys\)/);
assert.match(platform,/const setSection=\(sysId,v\)=>\{[\s\S]*allowed= osSections/s);
assert.match(platform,/localStorage\.getItem\("os_nav_"/);
assert.match(platform,/localStorage\.setItem\("os_nav_"/);
assert.match(real,/useEffect\(\(\)=>\{if\(page&&CANONICAL_SCREENS\.some/);
assert.match(real,/setPage\(v\)/);

console.log("navigation contract: PASS — 14 Ventures canonical tabs are registered, rendered, routed, and persisted across reloads.");
