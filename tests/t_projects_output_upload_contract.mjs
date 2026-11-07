import assert from "node:assert/strict";
import fs from "node:fs";

const entities = fs.readFileSync(new URL("../src/systems/projects/entities.jsx", import.meta.url), "utf8");
const outputs = entities.slice(entities.indexOf("export function OutputsView"));
const styles = fs.readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");

assert.ok(outputs.includes("files || []"), "Outputs already has a canonical file-metadata collection");
assert.ok(outputs.includes("label: \"الملفات\""), "Output details expose attached-file metadata");
assert.ok(!outputs.includes("data:URL") && !outputs.includes("base64"), "Direct upload must not be faked by embedding base64/data URLs in records");
assert.ok(!outputs.includes("localStorage"), "Outputs upload contract must not introduce a second local-only persistence path");

assert.ok(styles.includes("html, body, #root { min-width: 0 !important; overflow-x: hidden; }"), "Responsive baseline prevents Projects from forcing viewport overflow");
assert.ok(styles.includes("table { min-width: 640px; }"), "Dense Projects tables retain a bounded horizontal-scroll fallback");
assert.ok(styles.includes("[role=\"dialog\"] { width: calc(100vw - 16px) !important; margin-inline: 8px; }"), "Projects dialogs have a mobile-width constraint");
assert.ok(styles.includes(".os-mobile-scroll { overflow-x: auto; max-width: 100%; }"), "Responsive surfaces have an explicit horizontal-scroll utility");

console.log("t_projects_output_upload_contract: OK");
