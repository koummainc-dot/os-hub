import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../src/systems/projects/entities.jsx", import.meta.url), "utf8");
assert.match(source, /المهمة المرتبطة يجب أن تكون من المشروع نفسه/, "outputs must reject tasks from another project");
assert.match(source, /المواصفة المرتبطة يجب أن تكون من المشروع نفسه/, "outputs must reject PRDs from another project");
assert.match(source, /if \(!project \|\| project\.is_system\)/, "outputs must require a real project");
console.log("Projects output-link validation contract tests passed.");
