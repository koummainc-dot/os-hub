import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const entities = await readFile(new URL("../src/systems/projects/entities.jsx", import.meta.url), "utf8");
const screens = await readFile(new URL("../src/systems/projects/screens_c.jsx", import.meta.url), "utf8");
const parts = await readFile(new URL("../src/systems/projects/parts.jsx", import.meta.url), "utf8");

assert.ok(entities.includes('onClick={() => openProject(o.project_id, "prds")}') && entities.includes(">متطلب:"),
  "output requirement reference must navigate to the owning PRD section");
assert.ok(entities.includes('reqOutputs.map((o) => <button key={o.id} type="button" onClick={() => openProject(d.project_id, "outputs")}'),
  "PRD requirement output evidence must navigate to the outputs section");
assert.ok(entities.includes('req.status === "Verified" && !linkedOutputs.some((o) => o.prd_requirement_id === req.id && o.approval === "Final")'),
  "PRD requirement cannot be verified without a linked Final output");
assert.ok(entities.includes('data.outputs.filter((o) => o.prd_id === d.id && D.isActiveRec(o))'),
  "archived or deleted outputs must not count as verification evidence");
assert.ok(entities.includes('const linkedRisks = data.risks.filter((risk) => risk.prd_id === d.id && D.isActiveRec(risk))') &&
  entities.includes('{ id: "risks", label: "المخاطر", count: linkedRisks.length }') &&
  entities.includes('onClick={() => openProject(risk.project_id, "risks")}'),
  "PRD must show active linked risks and provide navigation to them");
assert.ok(screens.includes('related.wins.map((x) => <Btn key={x.id} small onClick={() => setPage("wins")}>'),
  "stakeholder update achievement references must be actionable");
assert.ok(screens.includes('{w.output_ids?.length > 0 && <Btn small onClick={() => w.project_id && openProject(w.project_id, "outputs")}>'),
  "achievement output evidence must navigate to the project's outputs");
assert.ok(screens.includes('related.outputs.map((x) => <Btn key={x.id} small onClick={() => openProject(u.project_id, "outputs")}>'),
  "stakeholder update output references must navigate to the outputs section");
assert.ok(screens.includes('!data.wins.some((w) => w.task_id === t.id || (w.task_ids || []).includes(t.id))'),
  "achievement suggestions must deduplicate both legacy and multi-task relationships");
assert.ok(parts.includes('linkedDecisions.map((x) => <button key={x.id} type="button" onClick={() => { closeTask(); openProject(x.project_id, "decisions"); }}'),
  "task decision backlinks must be actionable");
assert.ok(parts.includes('linkedWins.map((x) => <button key={x.id} type="button" onClick={() => { closeTask(); setPage("wins"); }}'),
  "task achievement backlinks must be actionable");
console.log("✓ Projects relationship navigation contracts passed");
