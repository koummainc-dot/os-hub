import assert from "node:assert/strict";
import fs from "node:fs";
const src=fs.readFileSync(new URL("../src/systems/ventures/realWorkspace.jsx",import.meta.url),"utf8");
for (const collection of ["email_campaigns","email_lists","email_flows","email_checks"]) {
  assert.equal(src.includes('rows("'+collection+'")'),true,collection+" active rows");
  assert.equal(src.includes('emailTrash("'+collection+'")'),true,collection+" restore UI");
}
assert.equal(src.includes("const allRows=k=>Array.isArray(data[k])?data[k]:[];"),true,"retain all rows including deleted");
assert.equal(src.includes("const softDeleteEmail=async(k,x)=>"),true,"soft delete");
assert.equal(src.includes("const restoreEmail=async(k,x)=>"),true,"restore");
assert.equal(src.includes("created_at:editing?.created_at||new Date().toISOString()"),true,"generic edit preserves created_at");
assert.equal(src.includes("created_at:existing?.created_at||new Date().toISOString()"),true,"campaign edit preserves created_at");
assert.equal(src.includes("const currentRows=allRows(\"email_campaigns\")"),true,"campaign writes preserve deleted rows");
assert.equal(src.includes("const existing=new Map(currentRows.map(x=>[x.import_row_hash||x.id,x]));"),true,"ESP dedupe index");
assert.equal(src.includes("existing.set(r.import_row_hash,row)"),true,"dedupe duplicate rows within same CSV");
assert.equal(src.includes("import_row_hash"),true);
assert.equal(src.includes("saveVenturesMetrics(workspaceId,Object.entries"),true);
assert.equal(src.includes('systemId:"finance",action:"create",recordId:id'),true);
assert.equal(src.includes('systemId:"projects",action:"create_risk",recordId:r.recordId'),true,"Email Check dispatches a Risk-specific Projects action");
console.log("t_ventures_email_lifecycle_contract: OK");
