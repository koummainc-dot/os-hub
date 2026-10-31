import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const entities = await readFile(new URL("../src/systems/projects/entities.jsx", import.meta.url), "utf8");
const screens = await readFile(new URL("../src/systems/projects/screens_c.jsx", import.meta.url), "utf8");

assert.ok(entities.includes('onClick={() => openProject(o.project_id, "prds")}') && entities.includes(">متطلب:"),
  "output requirement reference must navigate to the owning PRD section");
assert.ok(entities.includes('reqOutputs.map((o) => <button key={o.id} type="button" onClick={() => openProject(d.project_id, "outputs")}'),
  "PRD requirement output evidence must navigate to the outputs section");
assert.ok(screens.includes('related.wins.map((x) => <Btn key={x.id} small onClick={() => setPage("wins")}>'),
  "stakeholder update achievement references must be actionable");
assert.ok(screens.includes('{w.output_ids?.length > 0 && <Btn small onClick={() => w.project_id && openProject(w.project_id, "outputs")}>'),
  "achievement output evidence must navigate to the project's outputs");
assert.ok(screens.includes('related.outputs.map((x) => <Btn key={x.id} small onClick={() => openProject(u.project_id, "outputs")}>'),
  "stakeholder update output references must navigate to the outputs section");
console.log("✓ Projects relationship navigation contracts passed");
