# Projects OS — Canonical Relationship Model & UX Contract

**Status:** Reconciliation contract; no database migration or production data mutation is authorized.
**Authority:** `plans/Projects_OS_v4_Unified_Master_Plan.md` is the primary specification. Older traceability notes are historical implementation evidence and do not override v4.
**Baseline:** Current `main` source and Supabase migration `20261031120000_projects_entity_relationship_integrity.sql`.
**Purpose:** Make every relationship validated, persisted, visible, navigable to the exact record, and lifecycle-tested.

## 1. Non-negotiable principles

1. A relationship is complete only when it is validated, persisted, visible from both relevant records, navigable to the exact target, and covered by lifecycle tests.
2. Do not create duplicate relationship sources for the same meaning. Prefer canonical ownership and derived views.
3. Cross-project/workspace links must be rejected unless v4 explicitly allows them.
4. Archive/delete must not silently erase historical evidence. Use explicit detach, archive, or safe-delete behavior.
5. Pickers show title, project, and status; every link opens the exact record.
6. Derived progress/health is calculated from source records, never manually overwritten.
7. No production migration until the repository-wide writer/reader inventory, persisted-data inventory, and no-loss backfill plan are reviewed.

## 2. Canonical Objective / KR / Project / Task model — v4

The v4 model is authoritative:

`Objective → KR → Project (via kr_projects) → Project Tasks → Parent/Child/Leaf Task`

- Objective owns its KRs through `KR.objective_id`.
- A KR relates to one or more Projects through the logical `kr_projects` relationship. Current code stores project links as `kr.project_ids`; this storage representation must be reconciled with the v4 relation contract before schema changes.
- Every task belongs to one Project through `task.project_id`. Task hierarchy is represented by `parent_task_id` and the existing unbounded task tree.
- **Task → Objective/KR is derived:** `Task → Project → KR → Objective`. The v4 specification explicitly says this association is not stored on Task.
- Project Based KR progress is derived from its measurable linked Projects. Numeric KR progress comes from check-ins. Objective progress is the average of measurable KR progress. Task execution/Project health is a separate operational metric and must not be blended into measured KR or Objective progress.
- The v4 plan does **not** define KR task groups as the canonical relationship. Do not introduce a task-group table or make `KR.task_ids` the canonical Objective/KR link.
- Current code still reads `task.objective_id` for Objective task cards and `kr.task_ids` for KR task execution. These are legacy/implementation paths that conflict with the v4 derived relationship and must be reconciled without losing existing links.
- Current SQL trigger validates `kr.objective_id`, `kr.project_ids`, and `kr.task_ids`; it does not establish that the current persisted rows have been reconciled to the v4 model. Do not remove those guards until replacement validation and data reconciliation are proven.

### Safe interim rule

Keep all current fields and records unchanged. Do not add a task-group table. Do not remove `task.objective_id`, `kr.task_ids`, `kr.project_ids`, or their SQL guards in this pass. First inventory all readers/writers and existing values, then propose a deterministic mapping from legacy direct task links to the v4 Project/KR relationship. Flag tasks whose project is not linked to the KR; do not silently widen a KR's scope or discard the legacy association.

## 3. Other canonical record relationships

| Record | Canonical relationships | Required behavior |
|---|---|---|
| Project | Tasks, KRs, PRDs, outputs, risks, issues, decisions, meetings, updates, wins, members | Project is the Roadmap entity; exact-record navigation and derived health |
| Task | Project; parent/children; PRD + requirement; discovery; issues; outputs/sessions | Same-project validation, exact backlinks, inherited Objective/KR shown as derived |
| PRD | Project; requirements; tasks per requirement; outputs/evidence; decisions, risks, discoveries; versions/reviews | Requirement view shows implementing tasks and acceptance evidence |
| Issue | Project; affected tasks; remediation tasks; originating risk | Separate affected work from remediation; preserve source/backlinks |
| Risk | Project; affected PRD/tasks; mitigation tasks; converted Issue; decisions | Conversion traceable and idempotent; closed risk history retained |
| Decision | Project; affected tasks/PRDs/issues/risks/discoveries; implementation tasks | Preserve rationale, alternatives, impact, owner, effective date, and outcome |
| Update | Project/period; snapshot of completed/upcoming/late tasks, wins, issues, risks, decisions | Draft from live source; inspect before publish; immutable published snapshot |
| Win | Project; source task(s); Objective/KR where derivable; output/evidence | Avoid duplicate recognition; open exact source |
| Discovery | Source/evidence; Projects; resulting task/PRD/issue/decision | Explicit, idempotent conversion with provenance |
| Output | Project; task; PRD requirement; approval/version; win | Validate same-project links and navigate to exact source |
| Weekly Review | Member/week; selected tasks; snapshot of wins and project activity | Private by default; preserve historical snapshot and exact navigation |

## 4. Required UX journeys

### Objective / KR
- Objective shows its KRs and measured progress/pace.
- KR editor manages its Project relationships according to v4; it must not create a second task-group relationship as a substitute.
- Objective task execution, if displayed, is derived from Projects linked through its KRs, deduplicated by task ID, and shown separately from measured Objective progress.
- Remove direct task creation with `objective_id` only after a no-loss reconciliation and a replacement flow that creates/links a Project or task under the correct Project.
- Do not infer that every task in a Project is a measured KR contribution. Show task execution as operational context, not as KR measurement.

### PRD / requirement
- Open PRD → select requirement → see implementation tasks, linked outputs, and acceptance evidence.
- Create task from requirement with the requirement pre-linked.
- A task's `prd_requirement_id` must belong to its selected `prd_id`, and both must belong to the same Project.

### Issue / risk / decision / discovery
- Each detail view shows incoming and outgoing relationships in named sections.
- Creation flows inherit the current Project/source record where appropriate.
- Conversion actions explain what will be created and preserve provenance/backlinks.
- Report success only after persistence returns successfully.

### Update / win
- Update draft shows source counts and lets the user inspect included records before publish.
- Published updates are immutable snapshots; corrections are addenda.
- Wins link to verifiable work/evidence and navigate to exact sources.

## 5. Current-main evidence and gaps (2026-11-06)

### Source code
- `src/systems/projects/domain.js`: `krProgress` reads `kr.project_ids` for Project Based KRs; `krTaskExecution` reads `kr.task_ids`; `objectiveTaskExecution` finds KRs by `objective_id` and aggregates `task_ids`.
- `src/systems/projects/screens_c.jsx`: Objective card still reads tasks by `task.objective_id`; the KR form exposes `project_ids` only for Project Based KRs. The UI therefore has two competing task-execution paths and does not yet fully implement the v4 derived Task→Project→KR→Objective relationship.
- `src/systems/projects/store.jsx`: task save validates direct `objective_id`; KR persistence merges and validates task IDs in addition to project IDs.
- `supabase/migrations/20261031120000_projects_entity_relationship_integrity.sql`: validates `kr.project_ids`, `kr.objective_id`, and `kr.task_ids`; task validation enforces `project_id`, `parent_task_id`, issue links, and discovery links. The trigger is a guard, not proof that all existing data is correct.
- `plans/Projects_OS_v4_Unified_Master_Plan.md` §4.2 explicitly says Task→Objective/KR is derived via Project→KR→Objective and is not stored. §5.11 defines KRs with `objective_id` and Projects via `kr_projects`. The older `plans/PROJECTS_OS_RELATIONSHIP_TRACEABILITY.md` describes an earlier branch's `KR.task_ids` implementation and is not the controlling contract.

### Confirmed code changes already merged
- PR #145 removed the duplicate “المهام المرتبطة بالهدف” section and added a regression assertion.
- The source scan confirms the existing task tree uses `parent_task_id`; no task-group table has been introduced.

### Not yet verified
- All repository-wide readers/writers outside Projects.
- Actual persisted values and counts for `task.objective_id`, `kr.task_ids`, `kr.project_ids`, `objective.project_ids`, and all join/backlink fields.
- Whether the live Supabase database has all relevant migrations applied, and whether its data satisfies the current trigger.
- Authenticated UI lifecycle, RLS, two-account privacy, and production behavior.


### Read-only Supabase data inventory (2026-11-06)

Queried the connected `os-hub` Supabase project's `workspace_records` using aggregate counts only; no record payloads or personal contents were read or changed.

| Collection | Rows | Notes |
|---|---:|---|
| Projects | 6 | all active |
| Objectives | 1 | active; no `project_ids` values |
| KRs | 0 | no persisted KR rows in this workspace |
| Tasks | 29 | all active; all have a Project |
| Parent links | 20 | all resolve to an active task in the same Project |
| Risks | 2 | active |
| Reviews | 2 | active |
| Activity | 9 | active |

Additional aggregate checks:
- Total Projects-system records: 49 in one workspace; 49 active, 0 soft-deleted.
- Task `objective_id`: 0 non-empty values in the queried Projects collections.
- KR `task_ids`: no KR records exist, so there are no persisted KR task-group links to backfill in this snapshot.
- Task `prd_id` / `prd_requirement_id`: 0 non-empty values.
- Task tree integrity: 0 self-parent links, 0 missing/inactive parents, and 0 cross-project parent links.
- `workspace_data` has no `projects/main` row; the observed records are in `workspace_records`.

**Interpretation:** The connected database snapshot contains no current task→Objective or KR→task links to reconcile. It also contains no KRs, so the canonical Objective→KR→Project chain cannot yet be exercised with live records. This is a scoped snapshot of the connected project/workspace, not proof about demo/localStorage data, other environments, backups, or future records.

### Applied migration inventory

The Supabase migration history includes the Projects atomic batch/trash/purge migrations, but does **not** include the repository migrations `20261030110000_projects_task_issue_traceability.sql`, `20261031110000_projects_prd_requirement_traceability.sql`, `20261031120000_projects_entity_relationship_integrity.sql`, or `20261031130000_projects_prd_verified_evidence_guard.sql`. Do not assume those guards are active in the connected database. Their rollout remains a separate review and migration gate.

## 6. Implementation sequence

1. Complete repository-wide writer/reader inventory for `objective_id`, `task_ids`, `project_ids`, `parent_task_id`, `prd_id`, `prd_requirement_id`, and related backlinks.
2. Perform a **read-only** inventory of persisted values/counts by workspace and project. Do not expose private record contents in logs.
3. Produce a no-loss reconciliation proposal to the v4 model: map legacy task links to Project/KR links only where the relationship is unambiguous; isolate mismatches for explicit review.
4. Add pure domain tests for v4 progress semantics, task execution derivation, duplicate project/task handling, invalid/missing references, same-workspace/project scope, and legacy-link preservation.
5. Implement the KR→Project relationship UX and derived Objective task execution; do not store direct task→Objective/KR links.
6. Update Objective/task detail navigation and the remaining PRD/Issue/Risk/Decision/Update/Win/Discovery relationship panels to open exact records.
7. Only after review and tests, prepare a migration that preserves legacy fields until backfill verification, updates SQL guards, and has a rollback/no-loss plan.
8. Run lifecycle acceptance: create → reload → edit relationship → reload → detach/archive → reload; include denied permissions, cross-workspace cases, and at least two accounts.
9. Verify the tested commit is deployed before calling Projects complete.

## 7. Acceptance checklist

- [ ] v4 is implemented: Objective→KR→Project→Task; Task→Objective/KR is derived, not stored.
- [ ] Legacy `task.objective_id` and `kr.task_ids` are reconciled without data loss.
- [ ] KR→Project editor and reverse navigation are complete.
- [ ] Measured KR/Objective progress is separate from task execution.
- [ ] All links are validated, persisted, visible, and open exact records.
- [ ] Create/edit/detach/archive/restore survive reload.
- [ ] SQL guards match the canonical relationship contract.
- [ ] Permission matrix and two-account isolation pass.
- [ ] Authenticated UI acceptance and deployed commit are recorded.
