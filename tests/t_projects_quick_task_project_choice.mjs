import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../src/systems/projects/screens_a.jsx", import.meta.url), "utf8");
assert.ok(source.includes('project_id: proj || ""'), "quick task form must not silently default to the general system project");
assert.ok(source.includes('projectId={proj || undefined}'), "when no project filter is selected, task creation must ask the user to choose a project");
console.log("Projects quick-task explicit project selection contract tests passed.");
