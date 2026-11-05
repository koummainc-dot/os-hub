import assert from "node:assert/strict";
import {parseVenturesProjectBatchCsv} from "../src/core/csv.js";

const header="unit_code,name,kind,subtype,owner_email,currency,status,link,area_sqm";
const rows=Array.from({length:27},(_,i)=>`V${String(i+1).padStart(2,"0")},Project ${i+1},website_content,site,owner${i+1},USD,active,https://example.com/${i+1},${100+i}`);
const parsed=parseVenturesProjectBatchCsv([header,...rows].join("\n"));
assert.equal(parsed.errors.length,0);
assert.equal(parsed.rows.length,27);
assert.equal(parsed.rows[0].unit_code,"V01");
assert.equal(parsed.rows[26].area_sqm,126);

const tooMany=[header,...Array.from({length:28},(_,i)=>`V${i+1},P${i+1},store,shop,owner,USD,active,,`)].join("\n");
const rejected=parseVenturesProjectBatchCsv(tooMany);
assert.equal(rejected.rows.length,28);
assert.equal(rejected.errors.some(x=>x.includes("27")),true);

const invalid=[header,"V01,Project,store,shop,owner,USD,active,,abc"].join("\n");
const bad=parseVenturesProjectBatchCsv(invalid);
assert.equal(bad.rows.length,0);
assert.equal(bad.errors.length,1);

console.log("Ventures 27-project CSV tests passed");