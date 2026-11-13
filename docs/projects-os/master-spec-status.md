# Projects OS v5 — Master Specification Traceability

**Source of truth:** `Projects_OS_v5_Unified_Refactor_Spec.md` (Library version uploaded 2026-11-12).  
**Implementation branch:** `feat/projects-v5-phase1-navigation`  
**PR:** #188  
**Latest verified implementation/test commit:** `a828dc5b29e743a24472ff9158b5ead236a53f6a` — includes the forward-only Projects server-guard reconciliation and both isolated PostgreSQL smoke paths.
**Latest verified Preview build:** Vercel check **SUCCESS** on `a828dc5b29e743a24472ff9158b5ead236a53f6a` (target: `https://vercel.com/koumma/os-hub/9rynry8gdUKCuMDTasRiMKi3wx5Y`).
**Review date:** 2026-11-13

This document maps the original v5 specification to the implementation and evidence in the repository. It deliberately distinguishes an existing screen or unit test from a complete acceptance result. No production database operation or production release is authorized by this status report.

## Status vocabulary

- **PASS (automated):** the code path has an assertion or automated workflow that passed on the evidence commit. This does not claim full live-data acceptance.
- **PARTIAL:** code or tests exist, but one or more requirements in the source specification remain unmet or unverified.
- **BLOCKED:** the next safe step depends on an owner decision, source-system contract, no-loss inventory, permission/RLS review, or manual access not established here.
- **DEFERRED:** explicitly left outside this batch; it remains recorded and is not treated as complete.
- **NOT VERIFIED:** no sufficient current evidence was found to claim completion.

---

## 1. Master phases (§19)

| Source phase | Scope in the original spec | Current status | Implemented / evidenced | Still required to close |
|---|---|---|---|---|
| **0 — Inventory & protect current state** | Route/component inventory, readers/writers, migration inventory, token conflict, test map, branch plan; no destructive change | **PARTIAL — Projects guard effects repaired on branch and verified; overall migration history reconciliation remains open** | Read-only production baseline: 62 Projects records; 20/20 active Task parent links and the single Task→PRD link resolve correctly; no active Outputs, Issues, KRs, PRD requirement links or legacy Projects `workspace_data` parts. Knowledge contains no items/follow-ups/external links; Finance has no project profiles/transactions. Migration audit after adding the PR forward migration: 103 applied rows vs 126 SQL files; 79 exact version+name, 24 same-name version/timestamp drift, 23 SQL filenames without same-name ledger entries (22 pre-existing repository files + this not-yet-applied PR migration). Seven legacy Projects migration files with missing history names are consolidated into the forward repair; four Projects timestamp-drift migrations have matching live effects (OKR function, Output bucket/policies, privilege hardening, atomic trash RPC), while the live Discovery allowlist is corrected by the new forward migration. | Complete remaining 24 timestamp drift and 15 unrelated OS unmatched-file effect reviews; keep the new PR migration unapplied on Production until the Production-specific no-loss/rollback plan and owner approval. |
| **1 — Design System & Navigation** | Shared tokens/components, global navigation, backward-compatible routes, responsive Project Workspace; no schema change | **PARTIAL** | Global nav groups; unified Governance route; legacy global `issues`/`decisions` routes; Core `myWork` registration; desktop/mobile Project Workspace navigation; legacy project `related` route kept; primary accent/focus/selected states aligned to `#EF9F27`. Contract test passes. | Full shared component consolidation (Head/Tabs/Badge/Progress/Empty/Error/Modal/SideSheet), confirm every route/redirect, test at 360px and tablet/desktop in RTL, keyboard/focus/contrast, browser Back and deep links. Product/design approval of D-01 is still open. |
| **2 — Project Overview & Portfolio** | Project list/Portfolio/search/filters/Saved Views, Project Header/Overview, contextual actions, correct clickable metrics | **PARTIAL — primary view modes, filters and drill-downs implemented** | Portfolio Cards/Table/Board/Timeline/Calendar modes; search includes project ID/name/description/goal; filters for status/type/health/lead/team/priority/visibility/target-date range/high-open-risk/delayed; permission-gated Project create; Table includes days remaining/lead/team/priority/issues/risks; Not Measurable is not coerced to 0%; Timeline marks today. Overview progress/task counts open Tasks, target date opens Timeline, estimated/actual time opens Work, overdue/high/open risk/open/critical issue metrics open exact filtered project views, and traceability opens exact unlinked Task IDs. Portfolio task/overdue/issue/risk counts open the selected project's filtered records. Project Header has permission-gated contextual create actions that open the canonical Task/Output/PRD/Risk/Issue/Decision/Resource form. `t_projects_overview_metric_navigation.mjs` covers navigation and contextual permissions. | Still missing Saved Views (D-06), Finance Link Status and UI currency/link-state presentation (the Finance-owned `fin_projects_get` read model already exists), drag-to-change Board workflow, richer Calendar events, manual Preview acceptance of all seven contextual create modals, and UX/mobile/keyboard acceptance. Board/Calendar/Timeline remain read-only apart from opening records. |
| Complete real end-to-end Discovery→PRD→Requirement→Task→Output with exact backlinks and persisted reload; manually test real-file upload/retry/signed download and role permissions in Preview. Persisted upload-intent recovery is now implemented for both Outputs and Task Sheet: the pending `file_id`, exact `object_path`, file identity and timestamp are saved on the canonical Output record before Storage upload. If Storage accepts the object but metadata persistence fails, the intent survives reload; reselecting the same file reuses the original path, attaches metadata and clears the intent. `t_projects_output_upload_contract.mjs` now simulates this exact failure → reload → reselect → same-path retry → metadata recovery sequence. Still required: real Supabase acceptance, stale-intent/orphan-object inventory and safe reconciliation, authorized/restricted-account Storage RLS tests; resolve the legacy KR/Task data audit before changing fields; decide and implement Milestone model (D-08).
| **4 — Governance** | One global Governance Center; project-scoped Risk/Issue/Decision; mitigation/affected/remediation/implementation links; lifecycle/idempotency | **PARTIAL — core navigation and contracts present** | One global Governance destination with Risks/Issues/Decisions tabs; project workspace Governance tabs; risk→issue and decision traceability; issue repair task; relationship navigation/permission contracts passed. | Verify every create/detail/edit/close/reopen/archive path against real records; prove backlinks from both ends; real role and private-project RLS tests; confirm all global views have project filters and permission-safe record-level navigation. |
| **5 — Knowledge & Resources** | Separate Meetings/Resources, canonical project_ref, stable follow-up IDs, server-scoped reads, exact source links, legacy mapping after dry run | **PARTIAL; server scoping is a security blocker** | Meetings and project-owned external links have separate tabs; old `related` deep link retained; new linked tasks write `source_followup_id` and legacy index; explicit follow-up ID preferred; legacy text identity is normalized/content keyed; old task matching checks stable ID/title before index; reorder/identity tests pass. | `listKnowledgeMeetings` still loads a workspace-level Knowledge snapshot and filters in the client. This is not server-side project isolation. Need Knowledge-owned project-scoped query/RLS, canonical `project_ref` mapping, legacy reference dry-run, exact backlink from Task to source Meeting, retry/permission tests and concurrent duplicate protection. Do not backfill or migrate until the no-loss mapping is approved. |
| **6 — Finance & Reporting** | Finance tab, handoff, Finance-owned summary and permissions, all Activity aggregation, Wins/Updates project/global consistency | **PARTIAL — Finance server read model exists; integration/acceptance incomplete** | Finance-owned `fin_projects_get(p_ws uuid)` exists in the live database and returns project profiles, linked transactions, revenue, expenses, net profit, budget usage and ROI; its body checks `fin__need(p_ws,'dashboard','view')` and fixes `search_path` to empty. Finance UI consumes this RPC and performs explicit Finance-owned save on handoff. | Still need profile duplication/primary decision (D-02), explicit Not linked/Linked/Stale/Error/Permission denied/Currency Mismatch states, transaction attribution, `as_of`/last sync, planned-budget transfer policy, role/visibility tests and Activity aggregation across entity types. Do not replace Finance's read model or duplicate its records in Projects. |
| **7 — Global polish & Release** | Today/Week/Search/Calendar/Notification consistency, mobile/offline/accessibility, regression/migration rehearsal, Preview with two permitted and one restricted account, release notes/rollback | **PARTIAL — automated gates pass; release acceptance is open** | Evidence commit build/tests pass; Preview is READY; CI, Verify app, Finance Family Center Checks, Finance PostgreSQL smoke and Spiritual PostgreSQL smoke passed. Automated full suite includes Projects domain/relationship/permission/navigation/output/Knowledge follow-up contracts. | Manual 360px/tablet/desktop RTL, keyboard/screen reader/contrast, offline/conflict/retry, performance, two authorized accounts plus one restricted account, production migration rehearsal/rollback, owner approval, release notes and staged release. Do not merge/promote until G0–G7 are closed. |

## 2. Approval gates (§18.7)

| Gate | Original closure requirement | Evidence now available | Status |
|---|---|---|---|
| **G0 Code Inventory** | Data sources, relationships, APIs and tests inventoried on a specific commit | **PARTIAL** — Projects readers/writers, data counts and missing guard effects inventoried; forward repair passes legacy-baseline PostgreSQL | 103 applied history rows; 126 repository SQL files; 79 exact version+name matches; 24 timestamp drifts; 23 unmatched SQL filenames (22 legacy files plus the new PR forward migration). Seven legacy Projects SQL files without matching history names are covered by `20261113190000_projects_forward_guard_reconciliation.sql`; four Projects version-drift files have matching existing live effects. The live Discovery RPC is corrected in the forward repair. | Complete effect-level review for all 24 timestamp drift items and 15 non-Projects legacy unmatched files; distinguish applied effects from files that are truly pending. Do not blindly apply or rewrite migration history. Production dry run/rollback remains a hard gate. |
| **G1 UX Architecture** | Approved Global IA, Project Workspace navigation and user journeys | Navigation implementation + route contract; no signed/recorded human UX approval or full browser journey proof | **PARTIAL** |
| **G2 Design System** | Unified tokens and Arabic/RTL responsive components | Accent conflict and remaining blue focus/selection states fixed; responsive navigation CSS and contract assertion | **PARTIAL** |
| **G3 Relationship Integrity** | Relations validated, persisted, visible, navigable and tested | **PARTIAL — isolated database guard and lifecycle tests pass; production remains unchanged** | Projects SQL smoke run `43489919057` **SUCCESS**: both the complete source migration path and separate legacy-baseline forward-reconciliation path passed. The latter verifies all 9 attached triggers, SECURITY DEFINER and app-role ACLs, deferred Task↔Issue validation, atomic Discovery conversion/permission rollback, PRD/Requirement/Task/Output/Session/Governance guards, two-identity privacy and Create→Reload→Edit→Archive/Restore→Reload. | Deploy only through an approved no-loss plan, then verify both-direction Objective/KR/Project/Task, Task/Issue, PRD/Requirement/Task/Output and Governance relationships on real accounts and real persisted records. |
| **G4 Finance & Knowledge** | Contracts, permissions, idempotency and failure states proven | Finance read model `fin_projects_get` exists and checks Finance view permission. Knowledge project link is now Knowledge-owned via `knowledge_external_links`; Project picker reads canonical `workspace_records`; `knowledge_list_project_meetings` enforces project-scoped server reads. Isolated Knowledge SQL run `43502229776` passed canonical create/reassign/unlink, project isolation, and both Knowledge/Projects permission-denied tests. | **PARTIAL** — Knowledge contract/code/isolated SQL pass on branch; Production migration and real-user acceptance pending. Finance link/sync/error/currency, attribution, profile cardinality, budget policy and role acceptance remain incomplete. | Apply only through approved G5 process; test authorized and restricted real accounts. Close Finance profile and sync decisions separately; do not duplicate Finance data. |
| **G5 Data Safety** | No-loss inventory, dry run, rollback, migration approval | **PARTIAL — existing data and links counted; forward migration passes isolated legacy-baseline test** | No production record content was exported or changed. The known forward migration defines guards/RPC and attaches triggers only; it contains no top-level legacy-record UPDATE/DELETE/backfill, does not recreate the Output bucket or alter Storage policies. Existing 20 parent links and the single Task→PRD link were counted and found valid; no current Objective.project_ids payloads were found. | Still required: full migration ledger/effect reconciliation, Production-compatible schema dry run, lock/latency assessment, before/after counts, backup/restore rehearsal, explicit owner approval and controlled deployment/rollback. |
| **G6 QA** | Unit, integration, E2E, accessibility and responsive acceptance | **PASS for automated checks on code commit `a828dc5b29e743a24472ff9158b5ead236a53f6a`; manual/production acceptance remains PARTIAL** | CI `43489919598`, Verify app `43489919045`, Finance Family Center `43489919211`, Finance SQL `43489919061`, Knowledge SQL `43489918892`, Ventures SQL `43489919069`, Projects SQL `43489919057`, and Vercel check all **SUCCESS**. Projects SQL verifies both the original migration bundle and the new forward-only reconciliation from a legacy baseline. | Actual Supabase file upload/download and role-specific Storage RLS; manual Header flows; 360px/tablet/desktop RTL; keyboard/accessibility; browser Back/deep links; offline/conflict and real-data lifecycle acceptance remain. |
| **G7 Release** | Preview with test data, product-owner approval, staged release | Vercel Preview READY for evidence commit; no production deployment | **BLOCKED** — three-account acceptance, owner approval, migration rehearsal and release/rollback plan required |

## 3. Decision register (§22: D-01 to D-12)

| ID | Topic from source spec | Current implementation / evidence | Status and required closure |
|---|---|---|---|
| **D-01** | Final primary Accent | CSS focus/selection/hover and global accent aligned to Core orange `#EF9F27`; contract ensures old blue values are absent in checked styles | **PARTIAL** — owner/design sign-off after reviewing unified screens and all shared components |
| **D-02** | Finance Project Profile relationship | Read-only inventory found 0 Finance project profiles and 0 Finance transactions/project links in the connected database; `fin_projects_get(p_ws)` exists. | **BLOCKED for product decision, but no current duplicate rows** — decide 1:1 vs explicit primary selection and define link state before creating the first Finance profile; no uniqueness constraint yet. |
| **D-03** | Resource ownership | Project-owned links stay in Projects; Knowledge remains owner of meetings/resources; Outputs attachments remain in Outputs | **PARTIAL** — decide which file/reference types are Projects-owned; build unified resource cards without copying Knowledge content |
| **D-04** | Stable Follow-up ID | Stable ID bridge and reorder contracts exist in code; live Knowledge has 0 items/follow-ups/external links, so there are no current follow-up rows to backfill. | **PARTIAL** — Knowledge must own/persist the canonical ID and server-side idempotency before real meetings/follow-ups are accepted. |
| **D-05** | Canonical `project_ref` in Knowledge | Knowledge-owned `knowledge_external_links` is now canonical (`target_system='projects'`, `target_id=workspace_records.id`, `relation_type='related'`); legacy metadata remains compatibility input. No existing Production Knowledge rows or links needed backfill. | **PARTIAL** — migration and isolated create/reassign/unlink/access smoke pass on PR; awaiting real account/Production acceptance and owner confirmation. |
| **D-06** | Saved Views | Existing filters/search/Portfolio remain; no approved Core storage contract or persistent Saved Views adapter added | **DEFERRED/BLOCKED** — decide personal vs Workspace-shared storage and permissions |
| **D-07** | Unified Inbox | No duplicate notification store created in Projects | **DEFERRED** — must use Platform Notification owner and approved notification contract |
| **D-08** | Milestone model | Timeline continues to visualize dated leaf Tasks; no duplicate Milestone table/entity created | **BLOCKED** — product decision: Project Milestones vs typed Tasks, then one model only |
| **D-09** | Language switch | Arabic-first/RTL screens are retained; language switch V1 scope is not implemented by this batch | **OPEN** — product decision on English/i18n scope and locale persistence |
| **D-10** | Finance budget handoff | Project context opens Finance; existing profile is selected or Finance form is prefilled; explicit Finance save only | **PARTIAL** — define whether/how planned budget transfers on initial profile creation and how later updates are prevented from overwriting Finance-owned values |
| **D-11** | Knowledge resource query | `listKnowledgeMeetings(workspaceId, projectId)` calls Knowledge-owned `knowledge_list_project_meetings`; selected-project filters run server-side, and the Projects screen no longer filters workspace snapshot results client-side. Missing scoped RPC fails closed for project-filtered requests. | **PARTIAL** — Knowledge SQL `43502229776` passes scoped filtering and dual permission-denied tests in disposable PostgreSQL; Production deployment and actual account acceptance remain open. |
| **D-12** | Legacy KR/Task paths | Live Projects has 0 KR rows; 3 Objectives but none has legacy `project_ids`; 29 active Tasks have no `objective_id` or `kr_id`; no legacy `workspace_data` Projects snapshot exists. Twenty existing parent Task links and one Task→PRD link are valid. | **PARTIAL — no current KR/Objective link data requires backfill; code reader/writer map is still required before changing fields or future data model.** |

## 4. Baseline v4 requirements (§23: F-01 to F-26)

The table below records only the strongest current evidence. “Automated” means the named domain/contract path passed, not that the entire user journey has been accepted.

| Requirement | Current evidence / test coverage | Status |
|---|---|---|
| **F-01** Project fields, type, status, priority, dates, goal, links | Existing project form/detail/portfolio; project UI regression tests | **PARTIAL** |
| **F-02** Unlimited-depth task tree | `t_projects_domain.mjs` tree tests and 5,000-node performance assertion | **PASS (domain)** |
| **F-03** Leaf Task progress | Domain progress rules and parent/leaf tests | **PASS (domain)** |
| **F-04** Health Engine | Overdue/deadline/risk/issue/status thresholds in Projects domain tests | **PASS (domain)** |
| **F-05** Project counters | Domain counters; Overview and Portfolio task/overdue/risk/issue/critical issue and traceability counters open exact project-scoped filtered lists; contract tests cover drill-down | **PARTIAL** — finance sync/read-model, milestone and richer calendar counters depend on open contracts |
| **F-06** Days remaining | Project dates and days remaining in Portfolio Table; Project Overview target date opens project Timeline | **PARTIAL** — manual date/timezone and real-data acceptance remains |
| **F-07** Estimated/actual time | Time/session domain tests and task/project views | **PASS (domain/contract)** |
| **F-08** Budget/spend/remaining | Planned budget and Finance context handoff; live Finance read model now verified | **PARTIAL** — the Finance-owned `fin_projects_get` RPC returns `budget_used_pct`, revenue/expense/net values, ROI and linked transaction rows after `fin__need(...,'dashboard','view')`; no mirrored Finance data is written by Projects. | Still need UI acceptance for project link states, currency/unvalued transactions, profile duplication/primary decision, budget transfer policy and Finance role visibility. |
| **F-09** Outputs | Existing private Storage bucket, per-file upload/retry/download and final-output guard | Reload-safe upload intents are persisted on the canonical Output and recover the same file ID/path after a metadata-write failure and reload. The private 10 MB Output bucket and role-scoped Storage policies exist. The forward repair migration reinstalls the Final immutability/approval guard and it passes the isolated PRD/Output smoke. | **PARTIAL** — real Supabase file upload, signed download, and Storage RLS with permitted/restricted real accounts are not yet manually accepted; orphan intent/object reconciliation is still needed. |
| **F-10** Work Sessions/Timer/Void/Idempotency | Session actual-time aggregation, deterministic IDs, validation and write guards | Forward reconciliation installs `projects_guard_work_sessions`; isolated legacy-baseline smoke validates authenticated member ownership, active leaf-task linkage and function ACL. | **PARTIAL** — production trigger not installed; manual start/stop/void/retry and idempotency with real accounts remain. |
| **F-11** Decisions | Governance view and decision traceability contracts | Forward reconciliation installs current `projects_guard_entity_relationships` and trigger; isolated smoke validates Governance relationships, project boundaries and ACL. | **PARTIAL** — production trigger not installed; full real create/edit/close/reopen/archive lifecycle and role-denied paths remain. |
| **F-12** Risks | Risk scoring/health/materialization traceability | Forward reconciliation installs risk/issue link guard and entity relationship guard; isolated SQL validates cross-project links and conversion boundaries. | **PARTIAL** — production triggers not installed; real record lifecycle and role-specific negative acceptance remain. |
| **F-13** Issues | Issue resolution and repair-task/traceability contracts | Forward reconciliation installs Task↔Issue validation as DEFERRABLE INITIALLY DEFERRED; isolated SQL validates atomic two-sided linkage, cross-project rejection and rollback. | **PARTIAL** — production deferred trigger not installed; real repair-task cycle and role-denied acceptance remain. |
| **F-14** Contacts | Contact status thresholds/last meeting domain assertion exists | **PARTIAL** — merge/privacy/multi-project acceptance remains |
| **F-15** OKRs | Objective/KR aggregation and KR task-group contracts pass | Code contracts exist, but live data has 3 Objectives and 0 KRs; no Objective→Project or Task→Objective/KR links currently exist. | **PARTIAL — domain path exists, live OKR chain has not been exercised with real records; legacy code map still required.** |
| **F-16** Weekly Review | Existing screen/domain baseline retained; not fully evidenced for privacy and snapshot closure | **NOT VERIFIED end-to-end** |
| **F-17** Today | Today feed domain rules and navigation are covered; manual responsive acceptance missing | **PARTIAL** |
| **F-18** Direct Task Result | Task result → Output/evidence/verified PRD requirement | Forward reconciliation installs `projects_guard_prd_verified_requirement_evidence` and `projects_guard_prd_requirement_links`; isolated smoke verifies Final evidence and requirement lifecycle. | **PARTIAL** — real record flow/roles and production trigger installation remain unverified. |
| **F-19** Owner for Task/Risk/Issue | Existing assignment/permission/domain paths and relationship tests | **PARTIAL** |
| **F-20** Project Detail | Project detail, workspace nav and current route contract | **PARTIAL** |
| **F-21** Ideas/Meetings/Events/Domain | Discovery, Knowledge Meetings and project links exist; canonical server references and full event models remain | **PARTIAL** |
| **F-22** Source IDs and deduplication | Stable task/session/source reference contracts and follow-up reorder tests | **PARTIAL** — Knowledge-side canonical ID and server idempotency remain |
| **F-23** Not Measurable | Null/zero distinction asserted in domain and KR calculations | **PASS (domain)** |
| **F-24** Tree/hierarchy constraints | Cycle, parent, cross-project, tree move and atomic rollback contracts | Forward reconciliation installs `projects_assert_linked_records` and entity trigger; isolated smoke checks parent/cross-project relationship rejection. Existing 20 production Task parent links are valid and no parent cycle was found. | **PARTIAL** — production trigger not installed; real tree move/rollback and role-scoped acceptance remain. |
| **F-25** Derived values are read-only | Domain-derived progress/health/KR contracts pass | **PARTIAL** — confirm every UI/API mutation path |
| **F-26** Demo/Sandbox separation | Demo and permission regression tests exist | **PARTIAL** — verify isolated datasets and no leakage in interactive acceptance |

### S2 baseline items

| S2 item | Current status |
|---|---|
| Roadmap | **PARTIAL** — Timeline/Portfolio foundations exist; unified project-level Milestones remain open |
| Team OKRs | **PARTIAL** — KR/Objective relationships covered by domain tests; role-based live acceptance remains |
| Teams/People | **PARTIAL** — Team and People screens exist; membership/lead change lifecycle and privacy require real-account tests |
| Meetings + templates | **PARTIAL** — Knowledge Meetings are surfaced; server-scoped reads, canonical references and template acceptance remain |
| Tasks + `planning_bucket` | **PARTIAL** — Today/Week/Board/Task domain paths exist; verify complete persisted planning-bucket lifecycle |
| PRD | **PARTIAL** — review-gate/requirement traceability contracts pass; full versioned approval/evidence E2E remains |
| PIO Discovery | **PARTIAL** — project-scoped Discovery view/prefill added; full promotion traceability remains |
| Wins | **PARTIAL** — project-scoped read view added; global record CRUD and evidence relationship acceptance remain |
| Updates | **PARTIAL** — project-scoped read view added; immutable published Snapshot/Addendum E2E still needs proof |
| This Week / Board / Timeline | **PARTIAL** — current views/domain exist; full responsive/focus/back-navigation manual test remains |
| Notion import dry_run/apply | **DEFERRED** — source spec places this behind a dedicated migration plan; do not mix into this UI/integration batch |

## 5. Acceptance evidence on the reviewed commit

**Latest verified branch Preview build:** `https://os-krabn6h9y-koumma.vercel.app` — deployment is READY for docs-only commit `6ee5a3f42ac362a838b6551bef9103caa421a3f3`; the application code is unchanged from implementation/test commit `8218791...`. READY confirms deployment status, not manual browser acceptance.


**Latest verified code/test commit:** `8218791d9a151b26b07fbb5331ad8210c792fcb0`  
**Successful workflow evidence was rerun on the docs-only descendant:** `085d63068bc5e78d939ba5ed05536debce9aa696` (same implementation tree).

| Evidence | Result |
|---|---|
| GitHub CI workflow | **SUCCESS** — run `43460714320` |
| Verify app | **SUCCESS** — run `43460714316` |
| Finance Family Center Checks | **SUCCESS** — run `43460714386` |
| Finance PostgreSQL smoke | **SUCCESS** — run `43460714292` |
| Spiritual PostgreSQL smoke | **SUCCESS** — job passed in CI run `43460714320` |
| Full OS suite (informational CI job) | **SUCCESS** |
| Production build / Finance acceptance | **SUCCESS** |
| Projects domain | **PASS 66 / FAIL 0** (as recorded by the earlier test report; latest workflow also passed the full test job) |
| Template write/rollback contract | **PASS 4 / FAIL 0** (as recorded by the earlier test report) |
| Projects relationship/navigation/permission and follow-up identity contracts | **PASS** in automated suite |
| Output upload retry contract | **PASS (mock/contract only)**; live Supabase Storage/RLS remains unverified |
| Code-evidence Preview for commit `8218791...` | **READY** — `https://os-jygby3wwv-koumma.vercel.app` |
| Manual 360px/tablet RTL, keyboard/accessibility and browser Back | **NOT RUN** |
| Two authorized accounts + one restricted account | **NOT RUN** |
| Production migration rehearsal/rollback | **NOT RUN** |
| Production deployment | **NOT performed** |

## 6. Hard stops before production

1. Do not treat client-side filtering of Knowledge workspace snapshots as security isolation.
2. Do not add a database uniqueness constraint to Finance profiles before duplicate inventory and product approval.
3. Do not backfill canonical Knowledge project/follow-up IDs before a dry-run mapping and duplicate review.
4. Do not change legacy KR/Task fields before the full reader/writer and data inventory.
5. Do not invent or duplicate a Milestone/Inbox/Saved View data model to satisfy a UI.
6. Do not merge or promote to Production until gates G0–G7 are all evidenced and owner approval is recorded.

## 7. Next single work batch

Close the remaining safe, code-only gaps from Phase 2/3 without adding schema:
- verify Project Header quick-create flows in Preview and confirm each existing form is prefilled with the active project;
- manually accept Task Sheet and Outputs file upload/retry/signed-download flows in Preview with real files and authorized/restricted accounts; code-level retry contracts pass, but live Storage/RLS permissions are not proven;
- complete exact-record empty/error/permission assertions for remaining Governance and cross-system views;
- do not add Saved Views persistence, Milestones, Finance Link Status or Knowledge/Finance server data models until their D-06/D-08/G4/G5 contracts are decided.

In parallel, request the Knowledge and Finance owners' current API/schema/RLS contracts for the blocked read-model work. Production changes remain gated.
