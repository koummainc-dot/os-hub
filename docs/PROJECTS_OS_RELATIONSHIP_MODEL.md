# Projects OS — Canonical Relationship Model & UX Contract

**Status:** Proposed implementation contract; no database migration is authorized by this document.
**Baseline reviewed:** `main` source and `plans/Projects_OS_v4_Unified_Master_Plan.md`.
**Purpose:** Make every record navigable through meaningful relationships, with one clear source of truth and useful actions.

## 1. Non-negotiable principles

1. A relationship is complete only when it is validated, persisted, visible from the relevant records, navigable to the exact target record, and covered by lifecycle tests.
2. Do not create duplicate relationship sources for the same meaning. Prefer canonical ownership and derived views.
3. Cross-project relationships must be rejected unless a relationship type explicitly permits cross-project scope.
4. Deleting/archiving a record must not silently orphan or erase historical evidence. Use explicit detach, archive, or safe-delete behavior.
5. Every relationship picker must show enough context (title, project, status) to avoid linking the wrong record.
6. Every displayed relationship must open the exact record, not a generic list.
7. Optional relationships remain optional; do not force meaningless links.

## 2. Canonical objective / KR / task model

Canonical hierarchy:

`Objective → Key Result → Task Group (root task) → Child Tasks → Leaf Tasks`

- An Objective owns multiple KRs.
- A KR may link to one or more task groups (represented by existing root tasks and their descendants); do not introduce a separate task-group table unless a proven requirement cannot be met by the existing task tree.
- A task group is a root task plus its descendants. The root task is the navigable entry point.
- A task may have one parent in the same project. Cycles and cross-project parent links are invalid.
- Objective execution is derived from the unique leaf tasks in its linked KR groups. A leaf task must not be counted twice when linked through multiple KRs.
- KR measured progress and task execution progress are separate metrics and must never be blended.
- Direct `task.objective_id` and `kr.task_ids` must not become competing sources of truth. The v4 plan says Objective association is derived through KR/project relationships. Before changing existing data, inventory all existing values and define a deterministic backfill/reconciliation. Do not drop either field until data is reconciled and all readers/writers are migrated.
- The current UI creates a task with `objective_id` directly, while the KR editor does not expose task-group selection. This is a contract mismatch requiring a deliberate migration, not a cosmetic field addition.

## 3. Required record relationships

| Record | Canonical relationships | Required behavior |
|---|---|---|
| Objective | KRs; task groups through KRs; wins; reviews; decisions affecting it | Show KR progress and distinct leaf-task execution separately; open exact KR/task/win |
| KR | Objective; task groups; check-ins; linked projects where Project Based | Select/add/remove task groups; validate same workspace and project scope; deduplicate execution |
| Task | Parent/children; project; PRD requirement; output; discovery; issue/risk/decision; KR group membership | Show relationship chips; open exact record; explain blocked/inherited links |
| PRD | Project; requirements; tasks per requirement; outputs; decisions; risks; discoveries; versions/reviews | Each requirement shows implementing tasks and acceptance evidence |
| Issue | Project; affected tasks; resolution tasks; originating risk; PRD/decision when applicable | Separate affected work from remediation work; exact backlinks in both directions |
| Risk | Project; affected PRD/tasks; mitigation tasks; converted issue; decisions | Risk-to-issue conversion is traceable and idempotent; closed risks retain history |
| Decision | Project; affected objectives/KRs, PRDs, tasks, issues, risks, discoveries; implementation tasks | Record rationale, alternatives, impact, owner, effective date, implementation status and outcome |
| Update | Project/period; snapshot of completed/upcoming/late tasks, wins, issues, risks and decisions | Draft from source data; review; publish immutable snapshot; later addenda do not rewrite history |
| Win | Project; source task/group; objective/KR; output/evidence | Prefer creation from completed work; prevent duplicate recognition; open exact source |
| Discovery | Source/evidence; project; optional objective/KR; resulting task/PRD/issue/decision | Preserve provenance; conversion is explicit and idempotent |
| Output | Project; task; PRD requirement; approval/version; win | Validate same-project links and open exact task/requirement/win |

## 4. User journeys and useful actions

### Objective
- Open objective → inspect KRs → expand task groups → open root task or leaf task.
- Add KR; link an existing task group; create a root task; review progress.
- Show measured KR progress separately from execution progress.
- Do not show the same task list twice.

### KR
- Create/edit KR → select one or more eligible task groups → preview unique leaf-task count → save.
- Remove a group with an explicit confirmation if it changes reported progress.
- For Project Based KRs, show project selection separately from task-group links.

### PRD / requirement
- Open PRD → select requirement → see implementation tasks, linked outputs and acceptance evidence.
- Create task from requirement with the requirement pre-linked.
- A task linked to a requirement must validate that the requirement belongs to the selected PRD and project.

### Issue / risk / decision / discovery
- Each detail view shows incoming and outgoing relationships in named sections.
- Creation flows inherit the current project and source record where appropriate.
- Conversion actions explain what will be created and preserve source backlinks.
- Actions must open exact records and show success/failure only after persistence returns.

### Update / win
- Update draft must show source counts and let the user inspect included records before publish.
- Published updates are immutable snapshots; corrections are addenda.
- Wins must link to verifiable work or evidence and navigate to the source.

## 5. Current source findings (not a completion claim)

- `src/systems/projects/screens_c.jsx`: Objective card rendered the “المهام المرتبطة بالهدف” section twice. One duplicate was removed in the accompanying code change.
- The current Objective UI creates tasks with direct `objective_id`; the KR form exposes project selection for Project Based KRs but no task-group picker.
- The current code calculates KR task execution from `kr.task_ids` and objective task execution from `objective_id`, creating two paths that must be reconciled against the v4 plan.
- Some relationship links route to generic pages (for example, win links use the general wins page) instead of opening a specific record.
- Other parts of Projects already validate important same-project relationships (examples include task/output/PRD requirement and risk/issue paths); those validations should be retained and expanded rather than replaced wholesale.

## 6. Implementation sequence

1. Inventory all writers/readers and persisted values for `objective_id`, `task_ids`, `parent_task_id`, `prd_id`, `prd_requirement_id`, and record backlink arrays.
2. Decide the single canonical KR-to-task-group representation and produce a no-loss backfill plan. Do not run a production migration before review.
3. Add domain-level validators and pure tests for same-project scope, invalid/missing references, cycles, duplicate groups, and unique leaf-task aggregation.
4. Update KR create/edit UX to select existing root task groups and create a task group from the KR flow.
5. Migrate objective cards to derived relationships and remove the direct objective task path only after all old data and readers are reconciled.
6. Standardize detail panels and exact-record navigation for PRD, issue, risk, decision, update, win, and discovery.
7. Add lifecycle tests: create → reload → edit relationship → reload → detach/archive → reload; include permission-denied and cross-workspace cases.
8. Run authenticated UI acceptance with at least two accounts and verify production only after the deployment contains the tested commit.

## 7. Acceptance checklist

- [ ] One canonical source of truth for Objective/KR/task-group membership.
- [ ] Existing links reconciled without loss or duplicate progress.
- [ ] KR form can add/remove task groups.
- [ ] Objective and KR progress are distinct and correctly deduplicated.
- [ ] Every relationship opens the exact record.
- [ ] Every create/convert action preserves provenance and backlinks.
- [ ] Cross-project/workspace links are rejected unless explicitly supported.
- [ ] All relationship changes survive reload and restore.
- [ ] Permission matrix and two-account isolation pass.
- [ ] UI acceptance and deployed commit are recorded.
