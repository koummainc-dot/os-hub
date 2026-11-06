import assert from "node:assert/strict";
import fs from "node:fs";
import {mergeVenturesEspCampaignRows} from "../src/systems/ventures/domain.js";
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
assert.equal(src.includes("mergeVenturesEspCampaignRows(currentRows,parsed.rows)"),true,"ESP import uses tested merge helper");
assert.equal(src.includes("mergeVenturesEspCampaignRows"),true,"ESP merge helper is wired");
assert.equal(src.includes("import_row_hash"),true);
assert.equal(src.includes("saveVenturesMetrics(workspaceId,Object.entries"),true);
assert.equal(src.includes('systemId:"finance",action:"create",recordId:id'),true);
assert.equal(src.includes('systemId:"projects",action:"create_risk",recordId:r.recordId'),true,"Email Check dispatches a Risk-specific Projects action");
console.log("t_ventures_email_lifecycle_contract: OK");

const csvRows=[
  {import_row_hash:"campaign-1|project-1|2026-11-05|100|90|40|20",campaign_code:"campaign-1",sent:100},
  {import_row_hash:"campaign-1|project-1|2026-11-05|100|90|40|20",campaign_code:"campaign-1",sent:100}
];
const first=mergeVenturesEspCampaignRows([],csvRows,"2026-11-06T10:00:00.000Z");
assert.equal(first.added,1,"duplicate hashes within one CSV create one campaign");
assert.equal(first.updated,1,"the repeated hash updates the same campaign");
assert.equal(first.rows.length,1,"one campaign after first import");
const second=mergeVenturesEspCampaignRows(first.rows,csvRows,"2026-11-06T11:00:00.000Z");
assert.equal(second.added,0,"re-importing the same CSV adds no campaigns");
assert.equal(second.updated,2,"same CSV rows match the existing campaign");
assert.equal(second.rows.length,1,"same CSV twice leaves one campaign");
assert.equal(second.rows[0].id,first.rows[0].id,"campaign identity is stable");
assert.equal(second.rows[0].created_at,first.rows[0].created_at,"created_at is preserved");
assert.equal(second.rows[0].updated_at,"2026-11-06T11:00:00.000Z","updated_at advances");
const deleted={...first.rows[0],_deleted_at:"2026-11-06T09:00:00.000Z"};
const reimport=mergeVenturesEspCampaignRows([deleted],[csvRows[0]],"2026-11-06T12:00:00.000Z");
assert.equal(reimport.rows.length,1,"deleted campaign is not duplicated");
assert.equal(reimport.rows[0]._deleted_at,deleted._deleted_at,"import does not silently restore deleted data");
assert.equal(reimport.rows[0].id,deleted.id,"deleted campaign identity remains stable");
console.log("ESP idempotency scenarios: OK");

