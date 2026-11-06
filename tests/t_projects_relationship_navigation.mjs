import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const store = await readFile(new URL("../src/systems/projects/store.jsx", import.meta.url), "utf8");
const entities = await readFile(new URL("../src/systems/projects/entities.jsx", import.meta.url), "utf8");
const screens = await readFile(new URL("../src/systems/projects/screens_c.jsx", import.meta.url), "utf8");
const parts = await readFile(new URL("../src/systems/projects/parts.jsx", import.meta.url), "utf8");

assert.ok(entities.includes('onClick={() => openProject(o.project_id, "prds", { kind: "prd", id: o.prd_id })}') && entities.includes(">متطلب:"),
  "output requirement reference must navigate to the owning PRD section");
assert.ok(entities.includes('reqOutputs.map((o) => <button key={o.id} type="button" onClick={() => openProject(d.project_id, "outputs", { kind: "output", id: o.id })}'),
  "PRD requirement output evidence must navigate to the outputs section");
assert.ok(entities.includes('req.status === "Verified" && !linkedOutputs.some((o) => o.prd_requirement_id === req.id && o.approval === "Final")'),
  "PRD requirement cannot be verified without a linked Final output");
assert.ok(entities.includes('data.outputs.filter((o) => o.prd_id === d.id && D.isActiveRec(o))'),
  "archived or deleted outputs must not count as verification evidence");
assert.ok(entities.includes('const linkedRisks = data.risks.filter((risk) => risk.prd_id === d.id && D.isActiveRec(risk))') &&
  entities.includes('{ id: "risks", label: "المخاطر", count: linkedRisks.length }') &&
  entities.includes('onClick={() => openProject(risk.project_id, "risks")}'),
  "PRD must show active linked risks and provide navigation to them");
assert.ok(entities.includes('data.decisions.filter((decision) => D.isActiveRec(decision) && (decision.prd_id === d.id'),
  "archived or deleted decisions must not appear as active PRD relationships");
assert.ok(screens.includes('g.kind === "win" ? setPage("wins")') && screens.includes('items.map((item) =>'),
  "stakeholder update achievement references must be actionable");
assert.ok(screens.includes('{w.output_ids?.length > 0 && <Btn small onClick={() => w.project_id && openProject(w.project_id, "outputs")}>'),
  "achievement output evidence must navigate to the project's outputs");
assert.ok(screens.includes('g.kind === "output" ? openProject(item.project_id || u.project_id, "outputs")') && screens.includes('related_output_ids: d.related_output_ids || []'),
  "stakeholder update output references must navigate to the outputs section");
assert.ok(screens.includes('!data.wins.some((w) => w.task_id === t.id || (w.task_ids || []).includes(t.id))'),
  "achievement suggestions must deduplicate both legacy and multi-task relationships");
assert.ok(parts.includes('linkedDecisions.length ? linkedDecisions.map((decision) => <button') && parts.includes('openProject(decision.project_id, "decisions", { kind: "decision", id: decision.id })'),
  "task decision backlinks must be actionable");
assert.ok(parts.includes('linkedWins.length ? linkedWins.map((win) => <button') && parts.includes('setPage("wins")'),
  "task achievement backlinks must be actionable");

assert.equal((screens.match(/المهام المرتبطة بالهدف/g) || []).length, 1,
  "objective card must render one task relationship section, not duplicate the same list");

assert.ok(store.includes("focusRecord, ...(focusRecord?.kind === \"issue\" ? { issueStatusFilter: \"all\" } : {})"),
  "project navigation must carry a typed exact-record target and reveal resolved issues");
assert.ok(entities.includes("function useRecordFocus(view, kind, projectId, listLength)") &&
  entities.includes("scrollIntoView?.({ behavior: \"smooth\", block: \"center\" })"),
  "relationship navigation must scroll the target record into view");
assert.ok(entities.includes('openProject(i.project_id, "risks", { kind: "risk", id: i.from_risk_id })'),
  "Issue → source Risk must focus the exact source Risk");
assert.ok(entities.includes('openProject(r.project_id, "issues", { kind: "issue", id: r.converted_issue_id })'),
  "Risk → converted Issue must focus the exact converted Issue");
assert.ok(entities.includes('openProject(i.project_id, "decisions", { kind: "decision", id: d.id })'),
  "Issue → related Decision must focus the exact Decision");
assert.ok(entities.includes("openDiscovery(i.from_discovery_id)") && store.includes("openDiscovery: (id) =>"),
  "Issue → source Discovery must focus the exact Discovery");
assert.ok(entities.includes('openProject(decision.project_id, "decisions", { kind: "decision", id: decision.id })'),
  "PRD → related Decision must focus the exact Decision");
assert.ok(entities.includes('id={recordDomId("output", o.id)}') && entities.includes('id={recordDomId("risk", r.id)}') &&
  entities.includes('id={recordDomId("issue", i.id)}') && entities.includes('id={recordDomId("decision", d.id)}'),
  "linked record rows must expose stable DOM targets for navigation");

console.log("✓ Projects relationship navigation contracts passed");
