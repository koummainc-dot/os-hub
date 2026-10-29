import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../src/systems/projects/screens_b.jsx", import.meta.url), "utf8");
assert.match(source, /مسح البحث والفلاتر/, "empty project search state must expose a clear-filters action");
assert.match(source, /setQ\("\"); setSt\("active"\); setType\("\"); setLead\("\"); setHealth\("\");/, "clear-filters action must reset every project list filter");
console.log("Projects filter empty-state contract tests passed.");
