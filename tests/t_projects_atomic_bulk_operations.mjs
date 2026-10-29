import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const store = await readFile(new URL("../src/systems/projects/store.jsx", import.meta.url), "utf8");
const records = await readFile(new URL("../src/core/records.jsx", import.meta.url), "utf8");

for (const method of ["completeAll", "archiveTree", "deleteTree"]) {
  const start = store.indexOf(`    async ${method}(`);
  assert.notEqual(start, -1, `missing ${method}`);
  const next = store.indexOf("    // time", start);
  const body = store.slice(start, next === -1 ? undefined : next);
  assert.match(body, /R\.putAtomic\(/, `${method} must use atomic batch persistence`);
  assert.doesNotMatch(body, /for\s*\([^)]*\)\s*await R\.(put|softDelete)/, `${method} must not sequentially write records`);
  assert.match(body, /catch \(error\)/, `${method} must surface batch failures`);
}
assert.match(records, /if \(!\["tasks", "outputs", "projects"\]\.includes\(coll\) \|\| !rec\?\.id\)/);
assert.match(records, /does not enqueue offline changes/i);
console.log("Projects task bulk atomic-operation contract tests passed.");
