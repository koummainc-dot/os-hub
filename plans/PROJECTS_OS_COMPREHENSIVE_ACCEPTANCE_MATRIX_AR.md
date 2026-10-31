# Projects OS — Comprehensive Acceptance Matrix (AR)

**Branch:** `codex/projects-os-relationship-workflows`  
**Scope:** relationship traceability and end-to-end project workflows  
**Environment:** disposable PostgreSQL 16 for database tests; Vercel Preview is currently behind the latest branch head.  
**Rule:** a source-code assertion or unit test is not evidence that the browser workflow has passed.

## Status definitions

- **PASS — automated:** executed by CI/domain/SQL test and reported successful.
- **PASS — contract:** automated source-contract test confirms a required implementation guard/path exists; it does not simulate a real user interaction.
- **PENDING — browser:** requires interaction with a preview built from the exact current commit.
- **PENDING — runtime:** requires a real authenticated workspace/session and database-backed user flow.

## Acceptance cases

| ID | Area | Acceptance scenario | Evidence/status |
|---|---|---|---|
| P-01 | OKR | Link an objective to one or more active projects and show it in each project's OKR view | PENDING — browser |
| P-02 | OKR | Link a KR to an existing task or task group without duplicating tasks or crossing the selected project scope | PASS — automated domain validation for duplicate/missing/cross-project task references |
| P-03 | OKR | Expand a linked task group to active leaf tasks and deduplicate overlapping groups | PASS — automated domain test T-65a/T-65b |
| P-04 | OKR | Exclude cancelled and archived leaves from execution denominator | PASS — automated domain test T-65a |
| P-05 | OKR | Keep KR outcome progress independent from task execution progress | PASS — automated domain test T-65b |
| P-06 | OKR | Open a KR from a task and open supporting tasks from a KR | PENDING — browser |
| P-07 | OKR | Aggregate objective execution from its KRs without counting tasks twice | PASS — automated domain test T-65b |
| P-08 | OKR | Change task status and confirm execution progress refreshes without mutating KR measured value | PENDING — browser/runtime |
| P-09 | PRD | Create/edit requirements with stable IDs, acceptance criteria, priority, and status | PENDING — browser |
| P-10 | PRD | Reject a task requirement that does not belong to its selected PRD | PASS — domain validation + SQL smoke |
| P-11 | PRD | Reject an output requirement without a PRD or from another PRD/project | PASS — source validation + SQL smoke |
| P-12 | PRD | Prevent marking a requirement Verified without linked Final output evidence, and prevent removal of its last proof | PASS — UI guard plus new PostgreSQL trigger and SQL smoke scenarios; browser evidence pending |
| P-13 | PRD | Show requirement's linked tasks and outputs, show linked risks, and navigate to them | PASS — PRD risks tab and requirement navigation controls added; browser confirmation pending |
| P-14 | PRD | Create a new PRD version atomically and preserve/supersede the predecessor | PASS — contract test for atomic PRD versioning |
| P-15 | PRD | Require complete PRD content and current-version reviewer approvals before final approval | PASS — PRD review-gate test |
| P-16 | PRD | Reject edits to approved/superseded PRDs while allowing safe trash/restore metadata changes | PASS — PRD review-gate contract tests |
| P-17 | Decisions | Link a decision to affected tasks, PRDs, risks, issues, and discoveries | PENDING — browser/runtime |
| P-18 | Decisions | Create an implementation task only from an Approved decision | PASS — source contract enforces Approved state; browser/runtime confirmation pending |
| P-19 | Decisions | Retry implementation-task creation without duplicate task IDs; reject archived/deleted orphan tasks | PASS — stable task ID and atomic write contract; runtime retry confirmation pending |
| P-20 | Decisions | Navigate from decision to affected entities and back | PENDING — browser |
| P-21 | Risks | Create a mitigation task and link it atomically to the risk | PASS — stable task ID, atomic write, and permission contract; runtime confirmation pending |
| P-22 | Risks | Retry mitigation-task creation without duplicates and reject closed risks | PASS — existing-task lookup and open-risk guard; runtime retry confirmation pending |
| P-23 | Risks | Convert a risk to an issue atomically; prevent duplicate issue ownership and broken backlinks | PASS — risk/issue integrity and conversion contract tests |
| P-24 | Risks | Navigate between risk, mitigation task, related decision, and resulting issue | PENDING — browser |
| P-25 | Discovery | Convert discovery to task/issue/project/PRD with source link in one atomic operation | PASS — conversion contract tests |
| P-26 | Discovery | Retry conversion idempotently and reject cross-project reuse | PASS — conversion contract tests |
| P-27 | Discovery | For discoveries linked to multiple projects, require an explicit eligible target project | PASS — conversion contract tests |
| P-28 | Discovery | Navigate from each generated entity back to its discovery source | PENDING — browser |
| P-29 | Issues | Create a repair task and persist issue/task links atomically; prevent duplicate repair tasks | PASS — atomic repair-task contract plus both issue/task permissions; runtime confirmation pending |
| P-30 | Updates | Edit draft entity links, publish an immutable snapshot, and add an addendum without rewriting the snapshot | PENDING — browser/runtime; create controls now limited to projects where the user can publish updates |
| P-31 | Achievements | Link achievement to objective/KR/tasks/Final outputs and ensure it does not mutate task/goal status | PENDING — browser/runtime; write controls now respect win permissions and multi-task suggestion deduplication is fixed |
| P-32 | Weekly review | Snapshot completed/current/overdue tasks, achievements, issues, risks, decisions, and projects; navigate to source entities | PASS — live domain aggregation test; browser snapshot/navigation pending |

## Findings fixed during acceptance

1. Requirement evidence inside a PRD was displayed as plain text. It now navigates to the project's Outputs section.
2. Achievement links in stakeholder updates were non-interactive; they now navigate to Achievements.
3. Achievement output evidence was only a count; it now navigates to Outputs.
4. Output cards now expose a navigable PRD requirement link.
5. Repair-task and risk-conversion actions now check both source-entity and task/issue write permissions. Their UI controls are aligned with those permission requirements.
6. Decision implementation-task controls now require both decision-write and task-write permissions, matching the store guard.
7. Task details had non-clickable decision and achievement references; both now navigate to their owning sections.
8. PRD details did not show risks linked through `risk.prd_id`; an active-risks tab with navigation was added.
9. KR task links now reject tasks outside the KR's selected project scope, and the task picker filters to the selected projects.
10. Discovery conversion actions now enforce source and target write permissions; conversion controls and discovery editing/moving are hidden or filtered for users without the required access.
11. Risk, decision, discovery, and issue conversion retries now reject archived/deleted source or linked records and cross-project reused tasks.
12. PRD save failures now release the busy state, and the requirement editor stays open unless the save is confirmed.
13. Achievement suggestions now deduplicate legacy `task_id` and multi-link `task_ids` records.
14. Achievement and stakeholder-update create/edit controls now respect their respective write permissions.

New source-contract tests cover the relationship navigation and permission/idempotency guards. They are included in the repository's main test command; their final CI result is pending.

## Cross-cutting database integrity checks

The Projects SQL smoke workflow runs on disposable PostgreSQL 16. It now applies three new migrations and checks valid relationships plus rejection of invalid/missing/cross-project/non-final references, missing Final evidence, and destructive changes that would orphan verified PRD requirements.

The guards cover:
- Task and output PRD/requirement references.
- A Verified PRD requirement must have active Final output evidence. The last Final evidence cannot be downgraded, archived, or deleted while the requirement remains Verified.
- A referenced PRD or requirement cannot be removed/archived while active tasks or outputs still point to it.
- Task parent, issue, and discovery references.
- Decision, risk, win, update, objective, KR, discovery, and issue relationships.
- Same-workspace/project boundaries and active-record checks for the guarded relationship fields.

## Current acceptance result

- CI test suite and production build: passed on commit `22d1caf`, including the expanded navigation, permission, retry, PRD evidence, and KR project-scope contract tests.
- Projects SQL smoke: passed on commit `9c08664` after applying all three migrations and running the positive/negative evidence and relationship cases.
- The current PR head after those code/test checks contains documentation updates only.
- Browser acceptance: **not yet passed**. The available Vercel Preview is 14 commits behind the current PR head. A fresh deployment from the exact branch commit was blocked by Vercel's `402 payment_required` limit (more than 100 deployments/day; retry after 24 hours). No browser automation tool is available in this execution context.
- Supabase production migration: **not applied**. Existing migration history must be reconciled in order before rollout.
- Merge/deploy to production: **not performed**.

## Exit criteria

Projects OS is accepted only when:
1. All automated tests and SQL smoke checks pass on the exact PR head.
2. All 32 browser/runtime scenarios are exercised on a preview built from that exact head.
3. Role-based access is verified with owner/admin/member/viewer accounts.
4. Failure/retry paths are exercised against a real test workspace, including atomic rollback and idempotency.
5. Pending production migrations are reconciled and applied in order in a controlled rollout.
6. The acceptance report is updated with evidence for every case; no pending case is silently marked passed.
