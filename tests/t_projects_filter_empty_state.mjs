import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const source = await readFile(new URL("../src/systems/projects/screens_b.jsx", import.meta.url), "utf8");
assert.ok(source.includes("مسح البحث والفلاتر"), "empty project search state must expose a clear-filters action");
assert.ok(source.includes('setQ(""); setSt("active"); setType(""); setLead(""); setHealth("");'), "clear-filters action must reset every project list filter");
assert.ok(source.includes('s === "Archived" ? !!p.archived_at : !p.archived_at && p.status === s'), "all-projects board must place archived projects in the Archived column, not their previous status");
assert.ok(source.includes('<StatusChip s={p.archived_at ? "Archived" : p.status} />'), "table must show archived state instead of stale pre-archive status");
console.log("Projects filter empty-state and archive classification contract tests passed.");
