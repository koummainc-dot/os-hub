# Projects OS v5 — Master Specification Traceability

**Source of truth:** `Projects_OS_v5_Unified_Refactor_Spec.md` (Library version uploaded 2026-11-12).  
**Implementation branch:** `feat/projects-v5-phase1-navigation`  
**PR:** #188  
**Evidence commit reviewed:** `689cd1be328efa8ec03b59b7e2e990cebfc44fd2`  
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
| **0 — Inventory & protect current state** | Route/component inventory, readers/writers, migration inventory, token conflict, test map, branch plan; no destructive change | **PASS for baseline inventory; migration reconciliation remains open** | Phase 0 route/component and relationship inventory; migration-history discrepancy report; read-only live inspection; baseline tests and build/lint findings documented. No production DDL/write was made. | Reconcile the known repository/live migration-history mismatch against an isolated test environment; finish the current no-loss reader/writer map for legacy Knowledge and KR/Task fields; attach the complete test-to-requirement map. |
| **1 — Design System & Navigation** | Shared tokens/components, global navigation, backward-compatible routes, responsive Project Workspace; no schema change | **PARTIAL** | Global nav groups; unified Governance route; legacy global `issues`/`decisions` routes; Core `myWork` registration; desktop/mobile Project Workspace navigation; legacy project `related` route kept; primary accent/focus/selected states aligned to `#EF9F27`. Contract test passes. | Full shared component consolidation (Head/Tabs/Badge/Progress/Empty/Error/Modal/SideSheet), confirm every route/redirect, test at 360px and tablet/desktop in RTL, keyboard/focus/contrast, browser Back and deep links. Product/design approval of D-01 is still open. |
| **2 — Project Overview & Portfolio** | Project list/Portfolio/search/filters/Saved Views, Project Header/Overview, contextual actions, correct clickable metrics | **PARTIAL — primary view modes, filters and drill-downs implemented** | Portfolio Cards/Table/Board/Timeline/Calendar modes; search includes project ID/name/description/goal; filters for status/type/health/lead/team/priority/visibility/target-date range/high-open-risk/delayed; permission-gated Project create; Table includes days remaining/lead/team/priority/issues/risks; Not Measurable is not coerced to 0%; Timeline marks today. Overview progress/task counts open Tasks, target date opens Timeline, estimated/actual time opens Work, overdue/high/open risk/open/critical issue metrics open exact filtered project views, and traceability opens exact unlinked Task IDs. Portfolio task/overdue/issue/risk counts open the selected project's filtered records. Project Header has permission-gated contextual create actions that switch to the canonical Task, Output, PRD, Risk, Issue, Decision or project-owned Resource section and immediately open its existing form; validation and storage remain owned by the original section, with no duplicate forms. `t_projects_overview_metric_navigation.mjs` covers metric filters, filter empty states, portfolio modes and contextual permission checks. | Still missing Saved Views (D-06), Finance Link Status/read-model and currency filter, drag-to-change Board workflow, richer Calendar events (milestones/reviews/meetings), manual Preview acceptance of direct opening and correct prefilled project context for each Header create modal, and manual UX/mobile/keyboard acceptance. Board/Calendar/timeline are currently read-only apart from opening their records. |
| **3 — Planning & Traceability** | Discovery context, PRD/Requirement/Task/Output links, Task Sheet/storage copy, Milestones, KR→Project→Task after data audit | **PARTIAL** | Project-scoped Discovery filter/prefill added; PRD review gate and requirement/task/output contracts; task tree, cross-project guards, output upload/link contracts, derived KR path contracts; existing tests include domain 66/66, output upload contract, PRD gate, task/issue traceability and atomic tree operations. | Complete real end-to-end Discovery→PRD→Requirement→Task→Output with exact backlinks and persisted reload; resolve the legacy KR/Task data audit before changing fields; decide and implement Milestone model (D-08); test existing Storage direct upload in the target Preview with real user data. |
| **4 — Governance** | One global Governance Center; project-scoped Risk/Issue/Decision; mitigation/affected/remediation/implementation links; lifecycle/idempotency | **PARTIAL — core navigation and contracts present** | One global Governance destination with Risks/Issues/Decisions tabs; project workspace Governance tabs; risk→issue and decision traceability; issue repair task; relationship navigation/permission contracts passed. | Verify every create/detail/edit/close/reopen/archive path against real records; prove backlinks from both ends; real role and private-project RLS tests; confirm all global views have project filters and permission-safe record-level navigation. |
| **5 — Knowledge & Resources** | Separate Meetings/Resources, canonical project_ref, stable follow-up IDs, server-scoped reads, exact source links, legacy mapping after dry run | **PARTIAL; server scoping is a security blocker** | Meetings and project-owned external links have separate tabs; old `related` deep link retained; new linked tasks write `source_followup_id` and legacy index; explicit follow-up ID preferred; legacy text identity is normalized/content keyed; old task matching checks stable ID/title before index; reorder/identity tests pass. | `listKnowledgeMeetings` still loads a workspace-level Knowledge snapshot and filters in the client. This is not server-side project isolation. Need Knowledge-owned project-scoped query/RLS, canonical `project_ref` mapping, legacy reference dry-run, exact backlink from Task to source Meeting, retry/permission tests and concurrent duplicate protection. Do not backfill or migrate until the no-loss mapping is approved. |
| **6 — Finance & Reporting** | Finance tab, handoff, Finance-owned summary and permissions, all Activity aggregation, Wins/Updates project/global consistency | **PARTIAL; Finance read model not implemented** | Project Finance tab hands off to Finance OS with ephemeral `projectRef`; Finance opens existing profile or pre-fills its own form and requires explicit Finance save; no duplicate Finance record/transaction is written by Projects. Project-scoped Wins and Updates read views added. Finance UI and PostgreSQL smoke workflows passed. | No Finance-owned read model/snapshot yet. Still need Not linked/Linked/Stale/Error/Permission denied/Currency Mismatch states, financial summary (income/expense/net/budget burn/ROI as allowed), transaction attribution, `as_of`/last sync, one-active-profile decision, planned-budget transfer policy, Finance role tests and Activity aggregation across all entity types. |
| **7 — Global polish & Release** | Today/Week/Search/Calendar/Notification consistency, mobile/offline/accessibility, regression/migration rehearsal, Preview with two permitted and one restricted account, release notes/rollback | **PARTIAL — automated gates pass; release acceptance is open** | Evidence commit build/tests pass; Preview is READY; CI, Verify app, Finance Family Center Checks, Finance PostgreSQL smoke and Spiritual PostgreSQL smoke passed. Automated full suite includes Projects domain/relationship/permission/navigation/output/Knowledge follow-up contracts. | Manual 360px/tablet/desktop RTL, keyboard/screen reader/contrast, offline/conflict/retry, performance, two authorized accounts plus one restricted account, production migration rehearsal/rollback, owner approval, release notes and staged release. Do not merge/promote until G0–G7 are closed. |

## 2. Approval gates (§18.7)

| Gate | Original closure requirement | Evidence now available | Status |
|---|---|---|---|
| **G0 Code Inventory** | Data sources, relationships, APIs and tests inventoried on a specific commit | Phase 0 route/component/relationship and migration inventory; Overview/Portfolio and contextual create contracts added; latest code evidence commit `5b2664a` passed CI/Verify/Finance/Spiritual smoke and Vercel Preview | **PASS baseline / PARTIAL current legacy inventory** |
| **G1 UX Architecture** | Approved Global IA, Project Workspace navigation and user journeys | Navigation implementation + route contract; no signed/recorded human UX approval or full browser journey proof | **PARTIAL** |
| **G2 Design System** | Unified tokens and Arabic/RTL responsive components | Accent conflict and remaining blue focus/selection states fixed; responsive navigation CSS and contract assertion | **PARTIAL** |
| **G3 Relationship Integrity** | Relations validated, persisted, visible, navigable and tested | Domain/relationship/permission/traceability contracts pass; lifecycle/atomicity tests pass | **PARTIAL** — complete live bidirectional relation cycle and cross-workspace negative tests remain |
| **G4 Finance & Knowledge** | Contracts, permissions, idempotency and failure states proven | Finance handoff and follow-up stable-ID client bridge; Finance SQL/Family smoke pass | **BLOCKED/PARTIAL** — Knowledge server-scoping and Finance read model/role acceptance remain |
| **G5 Data Safety** | No-loss inventory, dry run, rollback, migration approval | Read-only inventory and explicit no-production-write boundary; legacy mapping risks documented | **BLOCKED** — no approved full dry run/rollback/migration plan |
| **G6 QA** | Unit, integration, E2E, accessibility and responsive acceptance | Latest code commit `5b2664a` passed CI, Verify app, Regression, Full OS suite, Finance Family Center, Finance PostgreSQL and Spiritual PostgreSQL; Vercel Preview READY | **PARTIAL** — manual responsive/accessibility and real-account end-to-end acceptance missing |
| **G7 Release** | Preview with test data, product-owner approval, staged release | Vercel Preview READY for evidence commit; no production deployment | **BLOCKED** — three-account acceptance, owner approval, migration rehearsal and release/rollback plan required |

## 3. Decision register (§22: D-01 to D-12)

| ID | Topic from source spec | Current implementation / evidence | Status and required closure |
|---|---|---|---|
| **D-01** | Final primary Accent | CSS focus/selection/hover and global accent aligned to Core orange `#EF9F27`; contract ensures old blue values are absent in checked styles | **PARTIAL** — owner/design sign-off after reviewing unified screens and all shared components |
| **D-02** | Finance Project Profile relationship | Projects passes project reference to Finance; Finance opens first matching linked profile or pre-fills its own form | **BLOCKED** — inventory multiple/duplicate profiles; decide 1:1 vs explicit primary selection; do not add uniqueness constraint yet |
| **D-03** | Resource ownership | Project-owned links stay in Projects; Knowledge remains owner of meetings/resources; Outputs attachments remain in Outputs | **PARTIAL** — decide which file/reference types are Projects-owned; build unified resource cards without copying Knowledge content |
| **D-04** | Stable Follow-up ID | New Tasks persist `source_followup_id`; explicit Knowledge ID is preferred; legacy strings use normalized identity; index kept for compatibility; reorder tests pass | **PARTIAL** — actual canonical ID still must be owned/persisted by Knowledge; no legacy backfill; duplicate legacy text and concurrent idempotency need server contract |
| **D-05** | Canonical `project_ref` in Knowledge | Current project meeting association still uses legacy Knowledge relationship fields including `relatedId` | **BLOCKED** — inspect `knowledge_external_links` and all legacy fields/data; agree mapping and write/read bridge before migration |
| **D-06** | Saved Views | Existing filters/search/Portfolio remain; no approved Core storage contract or persistent Saved Views adapter added | **DEFERRED/BLOCKED** — decide personal vs Workspace-shared storage and permissions |
| **D-07** | Unified Inbox | No duplicate notification store created in Projects | **DEFERRED** — must use Platform Notification owner and approved notification contract |
| **D-08** | Milestone model | Timeline continues to visualize dated leaf Tasks; no duplicate Milestone table/entity created | **BLOCKED** — product decision: Project Milestones vs typed Tasks, then one model only |
| **D-09** | Language switch | Arabic-first/RTL screens are retained; language switch V1 scope is not implemented by this batch | **OPEN** — product decision on English/i18n scope and locale persistence |
| **D-10** | Finance budget handoff | Project context opens Finance; existing profile is selected or Finance form is prefilled; explicit Finance save only | **PARTIAL** — define whether/how planned budget transfers on initial profile creation and how later updates are prevented from overwriting Finance-owned values |
| **D-11** | Knowledge resource query | Current repository read is Workspace snapshot then client-side filtering | **BLOCKED** — Knowledge-owned server-scoped query/RLS and permission tests |
| **D-12** | Legacy KR/Task paths | Existing derived KR→Project→Task contracts pass and explicit `task_ids` path remains; no legacy migration performed | **BLOCKED** — full readers/writers/data inventory and no-loss report required before touching `objective_id`, legacy `task_ids` or related paths |

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
| **F-08** Budget/spend/remaining | Planned budget shown; Finance context handoff implemented; no Finance read-model summary yet | **PARTIAL** |
| **F-09** Outputs | Upload/link/requirement contracts pass; real file permission and upload acceptance remains | **PARTIAL** |
| **F-10** Work Sessions/Timer/Void/Idempotency | Session actual-time aggregation, deterministic IDs, validation and write guards | **PASS (domain/contract)** |
| **F-11** Decisions | Governance view and decision traceability contracts pass | **PARTIAL** — real record lifecycle and permissions still open |
| **F-12** Risks | Risk scoring/health/materialization traceability contracts pass | **PARTIAL** — live lifecycle and role proof remain |
| **F-13** Issues | Issue resolution and repair-task/traceability contracts pass | **PARTIAL** — live lifecycle and role proof remain |
| **F-14** Contacts | Contact status thresholds/last meeting domain assertion exists | **PARTIAL** — merge/privacy/multi-project acceptance remains |
| **F-15** OKRs | Objective/KR aggregation and KR task-group contracts pass | **PARTIAL** — legacy data audit and live update cycle remain |
| **F-16** Weekly Review | Existing screen/domain baseline retained; not fully evidenced for privacy and snapshot closure | **NOT VERIFIED end-to-end** |
| **F-17** Today | Today feed domain rules and navigation are covered; manual responsive acceptance missing | **PARTIAL** |
| **F-18** Direct Task Result | No complete requirement-to-evidence acceptance proof recorded in this batch | **NOT VERIFIED** |
| **F-19** Owner for Task/Risk/Issue | Existing assignment/permission/domain paths and relationship tests | **PARTIAL** |
| **F-20** Project Detail | Project detail, workspace nav and current route contract | **PARTIAL** |
| **F-21** Ideas/Meetings/Events/Domain | Discovery, Knowledge Meetings and project links exist; canonical server references and full event models remain | **PARTIAL** |
| **F-22** Source IDs and deduplication | Stable task/session/source reference contracts and follow-up reorder tests | **PARTIAL** — Knowledge-side canonical ID and server idempotency remain |
| **F-23** Not Measurable | Null/zero distinction asserted in domain and KR calculations | **PASS (domain)** |
| **F-24** Tree/hierarchy constraints | Cycle, parent, cross-project, tree move and atomic rollback contracts pass | **PASS (domain/contract)** |
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

**Commit:** `689cd1be328efa8ec03b59b7e2e990cebfc44fd2`

| Evidence | Result |
|---|---|
| GitHub CI workflow | **SUCCESS** — run `43408583917` |
| Verify app | **SUCCESS** — run `43408584004` |
| Finance Family Center Checks | **SUCCESS** — run `43408584067` |
| Finance PostgreSQL smoke | **SUCCESS** — run `43408584030` |
| Spiritual PostgreSQL smoke | **SUCCESS** — job passed in CI run `43408583917` |
| Projects domain | **PASS 66 / FAIL 0** |
| Template write/rollback contract | **PASS 4 / FAIL 0** |
| Projects relationship navigation | **PASS** |
| Projects relationship permission, traceability, PRD, output, risk and decision contracts | **PASS** in automated suite |
| Knowledge stable follow-up identity/reorder test | **PASS** |
| Projects navigation/integration contract | **PASS** |
| Vercel Preview | **READY** — deployment `dpl_6oMwjUSnyqYMAgy4WFzKhBxzpymA`, URL `https://os-8jmikhbot-koumma.vercel.app` |
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
- reconcile Task Sheet and Outputs upload messaging with the current Storage adapter and test failure/retry states;
- complete exact-record empty/error/permission assertions for remaining Governance and cross-system views;
- do not add Saved Views persistence, Milestones, Finance Link Status or Knowledge/Finance server data models until their D-06/D-08/G4/G5 contracts are decided.

In parallel, request the Knowledge and Finance owners' current API/schema/RLS contracts for the blocked read-model work. Production changes remain gated.
