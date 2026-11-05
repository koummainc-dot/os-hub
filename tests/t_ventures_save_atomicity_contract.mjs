import fs from "node:fs";
import assert from "node:assert/strict";

const core=fs.readFileSync("src/core/core.js","utf8");
const saveStart=core.indexOf("async save(data,expected)");
assert(saveStart>=0,"workspace save contract must exist");
const save=core.slice(saveStart,saveStart+7000);
assert(save.includes("restoreLocal"),"save must restore the previous local cache on failure/conflict");
assert(save.includes("commitLocal"),"save must commit the new local cache only after server success");
assert(save.includes("return{ok:false,conflict:true"),"save must surface optimistic concurrency conflict");
assert(save.includes("workspace_data"),"save must persist the workspace snapshot through workspace_data");
console.log("Ventures workspace save atomicity contract: PASS");