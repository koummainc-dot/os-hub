# Projects OS — Relationship & Workflow Implementation Status

**Branch:** `codex/projects-os-relationship-workflows`  
**Pull request:** Draft PR #93  
**Production status:** No merge, deploy, or Supabase production migration has been performed.

## Implemented in this branch

### 1. Objectives, key results, and task execution
- Objectives can reference one or more projects through `project_ids`.
- Key results can reference supporting task groups or individual tasks through `task_ids`.
- A selected task group contributes its active leaf tasks; overlapping groups are deduplicated.
- Cancelled leaves are excluded from the execution denominator. Archived tasks are excluded by the task index.
- Objective and KR outcome progress remains separate from supporting-task execution progress.
- The project OKR tab now shows objectives directly linked to the project as well as project-based KRs.
- Task details expose the reverse link to supporting KRs; objective and KR views expose linked tasks and achievements.

### 2. PRD requirements, tasks, and outputs
- PRDs now support an embedded `requirements[]` registry. Each requirement has a stable ID, title, description, acceptance criteria, priority, and status.
- Tasks retain the existing `prd_id` link and may additionally set `prd_requirement_id`.
- Outputs retain `prd_id` and may additionally set `prd_requirement_id`.
- PRD requirement views show their linked tasks and outputs.
- A requirement cannot be marked `Verified` unless a linked output has `approval = Final`.
- Task and output forms validate that a selected requirement belongs to the selected PRD and project.
- A database trigger migration validates task/output PRD and requirement references on write.

### 3. Decisions
- Decisions can reference affected tasks, PRDs, risks, issues, and discoveries.
- Decisions can reference implementation tasks.
- Approved decisions can create an implementation task from the decision.
- Creation is atomic across the task and decision records and uses a stable task ID to avoid duplicate task creation on retries.
- Task and PRD views expose decision backlinks.
- Supersession validation rejects self-reference and cross-project references.

### 4. Risks
- Risks can reference prevention/mitigation tasks through `task_ids`.
- Users with the required permissions can create a mitigation task from an open risk.
- Creation is atomic and idempotent.
- Risk views expose linked tasks and related decisions; task details expose the risks they mitigate.

### 5. Achievements
- Achievements can reference an objective, key result, multiple tasks, and final outputs.
- A selected KR must belong to the selected objective.
- Linked tasks and outputs must belong to one project; a project is inferred when possible.
- Non-final outputs are rejected as evidence.
- Achievement creation does not mutate task or objective state.
- Objective, KR, task, and output views expose achievement backlinks.

### 6. Stakeholder updates
- Draft updates can reference tasks, risks, issues, decisions, PRDs, outputs, and achievements.
- The editor displays linked entities and supports editing the links while the update is a draft.
- Publishing freezes the related entity IDs into the snapshot; published updates remain immutable except for addenda.

### 7. Weekly reviews
- The live review now includes completed tasks, current-week tasks, overdue tasks, achievements, new issues, new risks, decisions, and related projects.
- Closing a review snapshots entity IDs and display names so the review remains historically readable.
- Review entries provide navigation to the relevant tasks, projects, issues, risks, and decisions.

## Canonical relationship policy

- Relationship ownership stays on one canonical record: e.g. `KR.task_ids`, `Risk.task_ids`, `Decision.affected_task_ids`, `Win.task_ids`, and `Update.related_task_ids`.
- Reverse views derive their links from those canonical fields instead of writing a second copy onto the related record.
- Existing singular/legacy references such as `task_id` and `prd_id` are retained for compatibility while new multi-link fields are introduced.
- Derived execution metrics never overwrite outcome measurements or task statuses.

## Database rollout status and blockers

- New migration: `20261031110000_projects_prd_requirement_traceability.sql`.
- It is committed to this branch only and has **not** been applied to production.
- The connected Supabase project's migration history does not show these existing repository migrations as applied: `20261030100000`, `20261030110000`, and `20261030120000`.
- Therefore, migration rollout must first reconcile the pending migrations in timestamp order, review their effects against the live schema, and test them in a disposable/preview database. Do not apply only the newest migration out of order.
- The new trigger protects task/output PRD and requirement references. Other new JSON relationship arrays currently receive application-level validation; equivalent server-side validation for every decision/risk/win/update relationship remains a hardening item before final production approval.

## Validation status

- Domain tests were added for OKR task-group execution, deduplication, outcome/execution separation, PRD requirement ownership, and weekly-review relationship coverage.
- Earlier CI failures exposed two incorrect test expectations; both were corrected (template fixture count and linked task-list count).
- CI, production build, and Supabase smoke checks for the latest branch head are pending.
- Manual browser acceptance tests for the complete relationship flows have not yet been performed.
- The draft PR is intentionally not merged.
