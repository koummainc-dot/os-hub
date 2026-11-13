import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const projectScreens = await readFile(new URL("../src/systems/projects/screens_b.jsx", import.meta.url), "utf8");
const projectIndex = await readFile(new URL("../src/systems/projects/index.jsx", import.meta.url), "utf8");
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
  entities.includes('onClick={() => openProject(risk.project_id, "risks", { kind: "risk", id: risk.id })}'),
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
assert.ok(entities.includes("function RecordDetailModal({ title, fields, onClose })") &&
  (entities.match(/عرض التفاصيل/g) || []).length >= 6,
  "Outputs, Risks, Issues, Decisions, PRDs, and Discovery must expose independent read-only detail views");
for (const label of ["تفاصيل المخرج:", "تفاصيل الخطر:", "تفاصيل المشكلة:", "تفاصيل القرار:", "تفاصيل المواصفة:", "تفاصيل الاكتشاف:"]) {
  assert.ok(entities.includes(label), `read-only details must include the ${label} view`);
}
assert.ok(entities.includes('onClick={(e) => { e.stopPropagation(); setDetail(p); }}'),
  "opening PRD details must not trigger the editable PRD editor underneath");
assert.ok(entities.includes('onClick={(e) => { e.stopPropagation(); setDetail(d); }}'),
  "opening Discovery details must not trigger the editable discovery form underneath");

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

const decisionsView = entities.slice(entities.indexOf("export function DecisionsView"), entities.indexOf("// ═════ PRDs"));
assert.ok(decisionsView.indexOf("const list = data.decisions") < decisionsView.indexOf('useRecordFocus(view, "decision", projectId, list.length)'),
  "DecisionsView must derive its record list before passing its length to the focus hook");


assert.ok(projectScreens.includes('const tabGroups = [') &&
  projectScreens.includes('{ id: "plan", label: "التخطيط"') &&
  projectScreens.includes('{ id: "delivery", label: "التسليم"') &&
  projectScreens.includes('{ id: "governance", label: "الحوكمة"') &&
  projectScreens.includes('{ id: "collaboration", label: "التعاون"'),
  "Project Detail must group its 12 destinations into practical navigation categories");
for (const tabId of ["overview", "tasks", "outputs", "work", "prds", "risks", "issues", "decisions", "people", "okr", "related", "activity"]) {
  assert.ok(projectScreens.includes(`id: "${tabId}"`), `legacy project tab id ${tabId} must remain stable for deep links`);
}
assert.ok(projectScreens.includes('import { listKnowledgeMeetings } from "../knowledge/repository.js"') &&
  projectScreens.includes('String(meeting.relatedId) === String(p.id)') &&
  projectScreens.includes('source_meeting_id: meeting.id') &&
  projectScreens.includes('source_followup_index: index'),
  "Project Detail must read its linked meetings from Knowledge OS and preserve meeting provenance when creating follow-up tasks");
assert.ok(projectScreens.includes('findKnowledgeFollowupTask(data.tasks, meeting.id, followup, index)') &&
  projectScreens.includes('source_followup_id: followupIdentity') &&
  projectScreens.includes('source_followup_index: index'),
  "Project Detail meeting follow-ups must reuse stable source identity and retain the legacy index fallback");

const governancePage = projectIndex.slice(projectIndex.indexOf("function GovernancePage()"), projectIndex.indexOf("const SCREENS"));
assert.ok(projectIndex.includes('issues: GovernancePage') &&
  governancePage.includes('id: "risks"') && governancePage.includes('id: "issues"') && governancePage.includes('id: "decisions"') &&
  governancePage.includes('{tab === "issues" && <IssuesView />'),
  "global Governance must provide one unified destination for risks, issues, and decisions");
const projectOkr = projectScreens.slice(projectScreens.indexOf("function ProjectOkr"), projectScreens.indexOf("function RelatedTab"));
const okrScreens = await readFile(new URL("../src/systems/projects/screens_c.jsx", import.meta.url), "utf8");
assert.ok(projectOkr.includes('openOkrRecord("objective", o.id)') && projectOkr.includes('openOkrRecord("kr", k.id)') &&
  projectOkr.includes('setView({ ...view, okrFocus: { kind, id } })') && projectOkr.includes('setPage("okrs")'),
  "Project Detail OKR links must navigate with the exact Objective or KR ID");
assert.ok(okrScreens.includes('const target = view?.okrFocus') &&
  okrScreens.includes('document.getElementById(okrFocusDomId(target.kind, target.id))') &&
  okrScreens.includes('element.scrollIntoView') &&
  okrScreens.includes('setFilter("all")'),
  "OKRs destination must reveal, scroll to, and highlight the exact target even when its status is outside the default filter");

assert.ok(projectScreens.includes("const tabGroups = [") &&
  projectScreens.includes('defaultTab: "tasks"') &&
  projectScreens.includes('defaultTab: "outputs"') &&
  projectScreens.includes('defaultTab: "risks"') &&
  projectScreens.includes("const setGroup = (groupId) =>") &&
  projectScreens.includes("setTab(group.defaultTab)"),
  "group navigation must expose grouped subtabs and select a safe default destination");

console.log("✓ Projects relationship navigation contracts passed");
