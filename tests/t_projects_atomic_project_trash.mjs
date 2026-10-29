import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const store = await readFile(new URL("../src/systems/projects/store.jsx", import.meta.url), "utf8");
const start = store.indexOf("    async deleteProject(p) {");
const end = store.indexOf("    async createFromTemplate(tpl, opts) {", start);
assert.notEqual(start, -1, "deleteProject action must exist");
assert.ok(end > start, "deleteProject action must have a bounded body");
const body = store.slice(start, end);
assert.match(body, /await R\.putAtomic\(ops\)/, "project and related records must be saved atomically");
assert.match(body, /ops\.push\(\{ coll: "projects"/, "project itself must be in the atomic batch");
assert.match(body, /"tasks", "outputs", "risks", "issues", "decisions", "prds", "updates"/, "all currently cascaded collections must be included");
assert.match(body, /total > 1000/, "oversized batches must be rejected rather than partially applied");
assert.match(body, /جلسات الوقت التاريخية[\s\S]*ستبقى محفوظة/, "historical time sessions must remain preserved");
assert.match(body, /catch \(error\)/, "atomic failure must be surfaced");
assert.doesNotMatch(body, /await R\.softDelete\(/, "must not sequentially soft-delete child records");
assert.doesNotMatch(body, /await del\("projects"/, "must not delete the project in a separate write");
console.log("Projects atomic project-trash contract tests passed.");
