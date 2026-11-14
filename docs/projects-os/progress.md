# Projects OS — Master Refactor Progress

## Current branch
- PR: #188 — `feat(projects): v5 workspace and cross-system traceability`
- Branch: `feat/projects-v5-phase1-navigation`
- Base: `main`
- Production database: unchanged; no new production migration, RLS change or production deployment in this pass.
- **Live migration audit (read-only, 2026-11-13):** Supabase project `os-hub` reports 103 applied migration-history rows; current branch contains 127 SQL migration files. By normalized migration name: 103/103 applied rows have a matching file name, 79 match both name and timestamp, 24 have a same-name timestamp mismatch, and 24 SQL file names have no matching applied-history name (22 pre-existing repository files plus two PR-only forward migrations). Projects-related unmatched SQL names include `projects_final_output_guard`, `projects_task_issue_traceability`, `projects_task_issue_deferred_validation`, `projects_prd_requirement_traceability`, `projects_entity_relationship_integrity`, `projects_prd_verified_evidence_guard` and `projects_atomic_discovery_batch_fix`. This is a reconciliation list, **not** evidence that the files should be applied; compare the live SQL effects and any consolidated migrations first. No production migration or data write was run.

## Latest verified code baseline
- **Latest PR head automated acceptance (2026-11-13):** code commit `a828dc5b29e743a24472ff9158b5ead236a53f6a`. CI `43489919598` SUCCESS; Verify app `43489919045` SUCCESS; Finance Family Center `43489919211` SUCCESS; Finance SQL `43489919061` SUCCESS; Knowledge SQL `43489918892` SUCCESS; Ventures SQL `43489919069` SUCCESS; Projects SQL `43489919057` SUCCESS; Vercel Preview check SUCCESS. Projects SQL workflow includes (1) full source migration suite and (2) separate legacy-baseline test applying only the forward reconciliation migration, then validating functions/triggers/ACLs, deferred constraints, Discovery atomic rollback, PRD/Requirement/Output/Session/Governance guards, two-identity privacy, and data lifecycle.
- Latest end-to-end automated acceptance code commit: `a828dc5b29e743a24472ff9158b5ead236a53f6a`.
- GitHub CI: **SUCCESS**; Verify app: **SUCCESS**; Finance Family Center Checks: **SUCCESS**; Finance PostgreSQL smoke: **SUCCESS**; Spiritual PostgreSQL smoke: **SUCCESS**.
- Full OS test suite, Finance acceptance suite and production build passed on the recovery implementation commit; Verify app's additional full test/build workflow was still running at the last status check.
- Projects domain assertions: **66 PASS / 0 FAIL**; template write/rollback contract: **4 PASS / 0 FAIL**.
- Overview/Portfolio navigation, seven permission-gated quick-create flows, stable Knowledge follow-up, and persisted Output upload-intent recovery contracts passed in the full OS test suite.
- Vercel Preview: **READY** — `https://os-jygby3wwv-koumma.vercel.app`.
- This is automated/code evidence only: the post-Storage metadata-write failure → reload → reselect → same-object-path recovery is mocked in the contract suite; actual Supabase upload/download, Storage RLS with different accounts, mobile RTL and real-data lifecycle still require manual Preview acceptance.

## Master specification coverage
The full phase/gate/decision/feature map is now recorded in **[`master-spec-status.md`](./master-spec-status.md)**. It maps:
- all eight source phases (0–7);
- approval gates G0–G7;
- decision register D-01 to D-12;
- baseline requirements F-01 to F-26 and S2 items;
- exact automated evidence, missing manual acceptance and production hard stops.

### Current implementation summary
- **Navigation:** global route groups, unified Governance, legacy routes and missing Core `myWork` registration.
- **Workspace:** responsive desktop/mobile navigation with retained historical project tab IDs.
- **Planning & Outputs:** project-scoped Discovery filtering/prefill; existing PRD/Requirement/Task/Output and KR contracts retained. Task Sheet and Outputs share the existing private `projects-outputs` Storage boundary. Persisted upload-intent recovery is now implemented for both Outputs and Task Sheet: the pending `file_id`, exact `object_path`, file identity and timestamp are saved on the canonical Output record before Storage upload. If Storage accepts the object but metadata persistence fails, the intent survives reload; reselecting the same file reuses the original path, attaches metadata and clears the intent. `t_projects_output_upload_contract.mjs` now simulates this exact failure → reload → reselect → same-path retry → metadata recovery sequence. Private downloads continue using short-lived signed URLs; no new bucket/table or production migration was added.
- **Governance:** global unified route and project tabs; risk/issue/decision traceability and lifecycle contracts remain passing.
- **Knowledge:** separate Meetings and project-owned References tabs; new task links use stable follow-up identity with legacy index/title fallback.
- **Finance:** context handoff to Finance OS; Finance selects its existing profile or pre-fills its own form; no finance profile/transaction is written by Projects.
- **Results:** project-scoped Wins and Updates read views; canonical records remain in Projects.
- **Overview & Portfolio:** actionable Project Overview metrics open Tasks/Timeline/Work or exact Risk/Issue lists; traceability opens the exact unlinked task IDs. Portfolio supports Cards/Table/Board/Timeline/Calendar, project-ID search, combined filters, Project create permission, metric drill-downs, a Timeline today marker and explicit Not Measurable state. Project Header has permission-gated create actions that open the existing canonical Task/Output/PRD/Risk/Issue/Decision/Resource form directly. Saved Views and Finance Link Status remain deferred on their owners' contracts.
- **Style:** remaining blue focus/selection/hover values checked in the stylesheet were aligned to the shared orange accent. Shared component consolidation and manual visual approval remain open.

## Open release blockers
- Knowledge reads still load the workspace snapshot and filter client-side; this is not server-side project isolation.
- Canonical Knowledge `project_ref`, old reference backfill and server-side follow-up idempotency remain blocked by data-contract/no-loss work.
- **Projects SQL smoke is now a required PR check for Projects code/status changes:** run `43484207157` **SUCCESS** on PR head `8955654a50e650e01c45faab94bfe493a2981a95`. It applied the branch Projects guard/Discovery/Storage SQL migrations to disposable PostgreSQL and passed atomic Discovery write/permission/rollback tests, Task-Issue/PRD/relationship guards, two-identity privacy, Output Storage policy contract, and Create → Reload → Edit → Archive → Restore → Reload. This proves the migration bundle works in the disposable harness, not that those DDL changes are installed on the connected production DB.
- **Current production data baseline (read-only):** 62 Projects records: Projects 6 (5 active), Tasks 30 (29 active), PRDs 3, Objectives 3 (2 active, 1 soft-deleted), Risks 2, Discovery 1, Reviews 3 and Activity 14. No Outputs, Issues or KRs. Twenty active Task parent links all resolve to active same-project parents (zero missing/cross-project/inactive/self links); the one Task→PRD link resolves to an active PRD in the same project. No PRD requirement links and no legacy Projects `workspace_data` parts. Knowledge: 0 items/follow-ups/external links/relations/attachments, 1 activity, 3 categories, 1 workspace_state, and no legacy Knowledge snapshot parts. Finance: 0 profiles, transactions or project-transaction links. Counts only; no record contents were exported or modified.
- **Projects migration discrepancy classification (read-only):** Seven pre-existing Projects migration files have no same-name history row: final-output/session/task-reference/PRD-review/risk-issue guards; Task↔Issue guard; deferred Task↔Issue trigger; PRD requirement guard; entity relationship guard; verified-evidence guard; and atomic Discovery batch correction. The forward migration now consolidates those effects in one tested, forward-only file. Four Projects migrations with timestamp drift have corresponding live effects: OKR v4 function, private Output bucket/policies, guard-function privilege hardening, and atomic trash/purge functions. The last live atomic batch RPC still lacked `discovery`, which the forward correction adds. The remaining 15 pre-existing unmatched filenames are outside Projects (Inventory, Finance, OS integration events, Hobbies, Skincare and Ventures) and still need their owning OS migration reconciliation.
- **Knowledge project-scoped integration smoke:** run `43502229776` **SUCCESS** on branch commit `c6e9afe59f23606f15983d3c07709d31db8d6618`. Test applies Knowledge base migration + new Project link/query migration and passes RLS workspace isolation, canonical relation create/reassign/unlink, Project A/B server-side isolation, invalid Project rejection, missing Projects permission denial and missing Knowledge permission denial. No production migration was applied.
- **Knowledge ↔ Projects integration added on PR branch:** `supabase/migrations/20261113210000_knowledge_project_scoped_links.sql` makes Knowledge's existing `knowledge_external_links` table the canonical Project relation, synchronizes current `metadata.relatedSystem/relatedId` writes through a Knowledge-owned trigger, and exposes `knowledge_list_project_meetings(workspace_id, project_id)` with Knowledge RLS plus Projects visibility enforcement. `src/systems/knowledge/repository.js` now reads Projects from canonical `workspace_records`; a selected-project meeting request uses the server RPC and fails closed if it is unavailable; `src/systems/projects/screens_c.jsx` no longer performs the filter in the browser. The all-meetings transitional view retains a read-only legacy fallback. No new tables and no legacy record backfill were added; live Knowledge inventory had zero meetings/items/external links.
- **Forward-only Projects reconciliation migration:** `supabase/migrations/20261113190000_projects_forward_guard_reconciliation.sql` (commit `f1f1280491d4fad86bd372efb0dc5e2ebd515648`) restores the existing guard function definitions and atomic Discovery batch RPC, reattaches 9 workspace-record triggers, preserves the deferred Task↔Issue check, and hardens trigger-only execution ACLs. It intentionally omits the historical OKR v4 Objective.project_ids UPDATE; the live read-only inventory found no Objective.project_ids payloads. The migration executes no legacy-record backfill or top-level data UPDATE/DELETE, and changes no Storage bucket or policy.
- **Live Projects integrity audit (read-only):** `public.workspace_records` currently has only the shared `records_touch_trg`; the expected guard functions `projects_guard_final_outputs`, `projects_guard_work_sessions`, `projects_guard_task_references`, `projects_guard_prd_review`, `projects_guard_risk_issue_links`, `projects_guard_task_issue_references`, `projects_guard_prd_requirement_links`, `projects_assert_linked_records` and `projects_guard_prd_verified_requirement_evidence` are absent. `projects_guard_entity_relationships` exists as a SECURITY DEFINER function but is not attached to a trigger. The live `projects_apply_records_batch` allowlist is `tasks, outputs, projects, risks, issues, decisions, prds, updates` and omits `discovery`, while the branch correction adds it. This is a concrete live schema/application mismatch; Discovery atomic conversions and server-side relationship/final-output protections must not be considered production-verified.
- **Finance live read-model audit:** `fin_projects_get(p_ws uuid)` exists in the live database, reads Finance-owned project profiles and linked transaction detail, calculates revenue/expenses/net/budget usage/ROI, and checks `fin__need(p_ws,'dashboard','view')`. Its current function definition uses an empty search_path. The Finance module consumes this RPC; Finance read model is therefore **present**, while cross-OS link states, currency/last-sync, profile cardinality, budget-transfer policy and real role acceptance remain incomplete.
- Saved Views (D-06), Unified Inbox (D-07), Milestone model (D-08), language scope (D-09) and legacy KR/Task migration (D-12) remain open or deferred.
- Project Header shortcuts still have manual Preview acceptance pending. Task Sheet and Outputs now persist upload intents before Storage and recover the same object after reload by reselecting the file; automated failure/recovery contract passes, while real file upload/download and Storage RLS acceptance remain unverified. Portfolio Saved Views/Finance Link Status and richer Calendar events remain open; Activity aggregation, Weekly Review privacy and immutable Update Snapshot/Addendum E2E are not fully accepted.
- Manual 360px/tablet/desktop RTL, keyboard/accessibility, offline/conflict/retry, performance and browser Back/deep-link acceptance remain unverified.
- Real-data Create → Reload → Edit → Reload → Archive/Restore → Reload and at least two authorized accounts plus one restricted account remain unrun.
- No production migration, rollback rehearsal, owner release approval or production deployment has occurred.

## Data safety
- Knowledge remains owner of meetings and source follow-ups.
- Finance remains owner of Finance Project Profiles and transactions.
- Projects stores project-side links and task traceability metadata only.
- No legacy references were backfilled; no production schema/RLS contract was changed.
- No duplicate Milestone, Saved View, Inbox or finance ledger model was introduced.

## Next work batch
Next acceptance batch: manually verify all seven Project Header quick-create flows and the Task Sheet/Outputs upload → retry → signed-download path in Preview using real files and accounts with different permissions; then run the real-data Create → Reload → Edit → Reload → Archive/Restore → Reload cycle and exact bidirectional links. Keep Saved Views persistence, Milestones, Finance Link Status and Knowledge/Finance schema changes blocked until their D-06/D-08/G4/G5 gates and owner decisions are resolved.

- **Knowledge ↔ Projects integration (current step):** Implemented canonical project validation against `workspace_records`, synchronized `knowledge_external_links` on Knowledge item save, and a server-scoped `knowledge_list_project_meetings(workspace_id, project_id)` RPC. Projects Meetings now passes the selected project to Knowledge instead of loading all meetings and filtering locally. Added disposable PostgreSQL smoke coverage plus a JS contract test; no production backfill is required because the live Knowledge inventory has no meeting/project links. CI/Preview acceptance is the remaining gate.


---

## Latest status addendum — 2026-11-13

**This addendum supersedes any earlier statement in this file that says Knowledge Meetings are still loaded workspace-wide and filtered in the Projects browser.**

- Latest tested code head: `d6797bccc9202d4cb23b35a405235d73317cd0c5`.
- Vercel Preview: **READY** — https://os-1l5h0dtoh-koumma.vercel.app (same exact commit).
- GitHub checks all **SUCCESS** on this commit: CI `43504831970`; Verify app `43504832011`; Finance Family Center `43504832300`; Finance SQL `43504832115`; Knowledge SQL `43504832110`; Projects SQL `43504832081`; Ventures SQL `43504832090`.
- Knowledge ↔ Projects uses Knowledge-owned `knowledge_external_links` as the canonical Project relation and a server-scoped `knowledge_list_project_meetings(workspace_id, project_id)` read. Selected-project reads fail closed if the RPC is missing; both Knowledge access and the selected Project's visibility are checked.
- Disposable PostgreSQL smoke passes create, reassign, unlink, Project A/B filtering, invalid-Project rejection, missing Knowledge/Projects permission, and a second identity that cannot read or link to private Project A through either the Knowledge save trigger or direct external-link write.
- Projects Meetings refresh/retry buttons call `refresh()` without passing the click event; the JS contract covers this regression.
- **Still PARTIAL:** authenticated Preview acceptance with two real accounts; real Follow-up→Task duplicate/reload check; other Projects hard gates (real data lifecycle, Outputs Storage, responsive/accessibility, role privacy and migration reconciliation).
- **Preview data target: BLOCKED FOR WRITES.** Vercel has no configured project environment variables (0 entries); `src/core/supabase.js` therefore uses the built-in `https://cvcngvlickozahecgmij.supabase.co` default. Supabase lists exactly one project (`os-hub`) and zero development branches. Read-only production checks confirm 103 migration-history rows, the base `knowledge_resource_os` migration present, the new `knowledge_project_scoped_links` migration absent, and the new RPC/trigger absent. The Knowledge item/external-link counts are zero; six active Project records exist. Do not create/edit data from this Preview.
- Supabase Branching requires Pro per the current Deployment & Branching guide. The separate-project quote for `os-hub-preview-qa` in the existing organization is **$0/month**, but project creation was stopped because the Supabase tool requires an explicit cost confirmation ID. No test project or branch has been created.
- Production remains unchanged: no migration, data backfill, write, merge, or Production deployment was performed.


---

## Current status correction — 2026-11-14

The authoritative current phase report is [phase-status-report-2026-11-14.md](./phase-status-report-2026-11-14.md). It supersedes older blockers in this progress file where later commits or QA evidence have closed them.

- Current branch head reviewed: `b5f4bd37b4270fd74648c032ea826385cad573f8`; PR #188 remains open and Draft.
- All current CI workflows passed: CI, Verify app, Finance Family Center, Projects SQL, Finance SQL, Ventures SQL and Knowledge SQL.
- The isolated QA Supabase project exists and has been used. The Finance Projects reference visibility guard was applied and tested on QA only; the unauthorized private Project reference is rejected and a shared visible Project is accepted.
- Knowledge selected-Project meeting reads are now server-scoped; the earlier workspace-snapshot/client-filter blocker is superseded.
- Preview is READY on the current code commit. Preview-only Supabase variables are configured for this branch, but their encrypted values could not be verified against the QA URL; do not perform Preview writes until the effective host is confirmed.
- The next batch remains real Outputs/Task Sheet Storage acceptance against QA: actual upload, reload, signed download, interrupted-upload recovery, and permitted/restricted Storage RLS. No new features, Production migrations, merge, or Production deployment in this batch.
