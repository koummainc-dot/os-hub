import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const entities = await readFile(new URL("../src/systems/projects/entities.jsx", import.meta.url), "utf8");
const screens = await readFile(new URL("../src/systems/projects/screens_c.jsx", import.meta.url), "utf8");

assert.match(entities, /onClick=\{\(\) => openProject\(o\.project_id, "prds"\)\}[^>]*>متطلب:/,
  "output requirement reference must navigate to the owning PRD section");
assert.match(screens, /related\.wins\.map\(\(x\) => <Btn[^>]*onClick=\{\(\) => setPage\("wins"\)\}/,
  "stakeholder update achievement references must be actionable");
assert.match(screens, /w\.output_ids\?\.length > 0 && <Btn[^>]*openProject\(w\.project_id, "outputs"\)/,
  "achievement output evidence must navigate to the project's outputs");
assert.match(screens, /related\.outputs\.map\(\(x\) => <Btn[^>]*openProject\(u\.project_id, "outputs"\)/,
  "stakeholder update output references must navigate to the outputs section");
console.log("✓ Projects relationship navigation contracts passed");
