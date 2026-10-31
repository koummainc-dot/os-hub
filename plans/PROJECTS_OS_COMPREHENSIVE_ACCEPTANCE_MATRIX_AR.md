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
| P-02 | OKR | Link a KR to an existing task or task group without duplicating tasks | PASS — automated domain validation for duplicate/missing task references |
| P-03 | OKR | Expand a linked task group to active leaf tasks and deduplicate overlapping groups | PASS — automated domain test T-65a/T-65b |
| P-04 | OKR | Exclude cancelled and archived leaves from execution denominator | PASS — automated domain test T-65a |
| P-05 | OKR | Keep KR outcome progress independent from task execution progress | PASS — automated domain test T-65b |
| P-06 | OKR | Open a KR from a task and open supporting tasks from a KR | PENDING — browser |
| P-07 | OKR | Aggregate objective execution from its KRs without counting tasks twice | PASS — automated domain test T-65b |
| P-08 | OKR | Change task status and confirm execution progress refreshes without mutating KR measured value | PENDING — browser/runtime |
| P-09 | PRD | Create/edit requirements with stable IDs, acceptance criteria, priority, and status | PENDING — browser |
| P-10 | PRD | Reject a task requirement that does not belong to its selected PRD | PASS — domain validation + SQL smoke |
| P-11 | PRD | Reject an output requirement without a PRD or from another PRD/project | PASS — source validation + SQL smoke |
| P-12 | PRD | Prevent marking a requirement Verified without linked Final output evidence | PASS — domain/SQL guard path; browser evidence pending |
| P-13 | PRD | Show requirement's linked tasks and outputs and navigate to them | PENDING — browser |
| P-14 | PRD | Create a new PRD version atomically and preserve/supersede the predecessor | PASS — contract test for atomic PRD versioning |
| P-15 | PRD | Require complete PRD content and current-version reviewer approvals before final approval | PASS — PRD review-gate test |
| P-16 | PRD | Reject edits to approved/superseded PRDs while allowing safe trash/restore metadata changes | PASS — PRD review-gate contract tests |
| P-17 | Decisions | Link a decision to affected tasks, PRDs, risks, issues, and discoveries | PENDING — browser/runtime |
| P-18 | Decisions | Create an implementation task only from an Approved decision | PENDING — browser/runtime |
| P-19 | Decisions | Retry implementation-task creation without duplicate task IDs; reject archived/deleted orphan tasks | PENDING — browser/runtime |
| P-20 | Decisions | Navigate from decision to affected entities and back | PENDING — browser |
| P-21 | Risks | Create a mitigation task and link it atomically to the risk | PENDING — runtime |
| P-22 | Risks | Retry mitigation-task creation without duplicates and reject closed risks | PENDING — runtime |
| P-23 | Risks | Convert a risk to an issue atomically; prevent duplicate issue ownership and broken backlinks | PASS — risk/issue integrity and conversion contract tests |
| P-24 | Risks | Navigate between risk, mitigation task, related decision, and resulting issue | PENDING — browser |
| P-25 | Discovery | Convert discovery to task/issue/project/PRD with source link in one atomic operation | PASS — conversion contract tests |
| P-26 | Discovery | Retry conversion idempotently and reject cross-project reuse | PASS — conversion contract tests |
| P-27 | Discovery | For discoveries linked to multiple projects, require an explicit eligible target project | PASS — conversion contract tests |
| P-28 | Discovery | Navigate from each generated entity back to its discovery source | PENDING — browser |
| P-29 | Issues | Create a repair task and persist issue/task links atomically; prevent duplicate repair tasks | PASS — repair-task contract test |
| P-30 | Updates | Edit draft entity links, publish an immutable snapshot, and add an addendum without rewriting the snapshot | PENDING — browser/runtime |
| P-31 | Achievements | Link achievement to objective/KR/tasks/Final outputs and ensure it does not mutate task/goal status | PENDING — browser/runtime |
| P-32 | Weekly review | Snapshot completed/current/overdue tasks, achievements, issues, risks, decisions, and projects; navigate to source entities | PASS — live domain aggregation test; browser snapshot/navigation pending |

## Cross-cutting database integrity checks

The Projects SQL smoke workflow runs on disposable PostgreSQL 16 and passed on the previous tested application commit. It applies both new migrations and checks valid relationships plus rejection of invalid/missing/cross-project/non-final references.

The guards cover:
- Task and output PRD/requirement references.
- Task parent, issue, and discovery references.
- Decision, risk, win, update, objective, KR, discovery, and issue relationships.
- Same-workspace/project boundaries and active-record checks for the guarded relationship fields.

## Current acceptance result

- CI test suite and production build: passed on the last verified branch head before the latest navigation-only acceptance additions.
- Projects SQL smoke: passed on the last verified SQL/application commit; the latest navigation additions do not change SQL.
- New relationship-navigation contract test: added to the main test script; awaiting CI execution.
- Browser acceptance: **not yet passed**. The available Vercel Preview is 14 commits behind the current PR head, and a browser automation tool is not available in this execution context. The Preview must be redeployed from the exact tested head before browser sign-off.
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
