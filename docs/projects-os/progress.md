# Projects OS — Master Refactor Progress

## Current branch
- PR: #188 — `feat(projects): v5 workspace and cross-system traceability`
- Branch: `feat/projects-v5-phase1-navigation`
- Base: `main`
- Production database: unchanged; no new production migration, RLS change or production deployment in this pass.

## Latest verified code baseline
- Latest code evidence commit: `5b2664abab8eee4dca1b010e9817dd7cc3a7af9b`.
- GitHub CI: **SUCCESS**; Verify app: **SUCCESS**; Finance Family Center Checks: **SUCCESS**; Finance PostgreSQL smoke: **SUCCESS**; Spiritual PostgreSQL smoke: **SUCCESS**.
- Full OS test suite, existing regression suite, Finance acceptance and production build all passed on this code commit.
- Projects domain assertions: **66 PASS / 0 FAIL**; template write/rollback contract: **4 PASS / 0 FAIL**.
- Overview/Portfolio metric-navigation, exact filter, Project Header contextual permission, stable Knowledge follow-up and navigation/integration contracts passed.
- Vercel Preview: **READY** — `https://os-ngobn4vzc-koumma.vercel.app` (deployment `dpl_F49Hj9nPy5MUB5v2phFfNbKCDUY5`).
- Automated results do not constitute manual RTL/accessibility/three-account acceptance.

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
- **Planning:** project-scoped Discovery filtering/prefill; existing PRD/Requirement/Task/Output and KR domain contracts retained.
- **Governance:** global unified route and project tabs; risk/issue/decision traceability and lifecycle contracts remain passing.
- **Knowledge:** separate Meetings and project-owned References tabs; new task links use stable follow-up identity with legacy index/title fallback.
- **Finance:** context handoff to Finance OS; Finance selects its existing profile or pre-fills its own form; no finance profile/transaction is written by Projects.
- **Results:** project-scoped Wins and Updates read views; canonical records remain in Projects.
- **Overview & Portfolio:** actionable Project Overview metrics open Tasks/Timeline/Work or exact Risk/Issue lists; traceability opens the exact unlinked task IDs. Portfolio supports Cards/Table/Board/Timeline/Calendar, project-ID search, combined filters, Project create permission, metric drill-downs, a Timeline today marker and explicit Not Measurable state. Project Header has permission-gated shortcuts to canonical create sections. Saved Views and Finance Link Status remain deferred on their owners' contracts.
- **Style:** remaining blue focus/selection/hover values checked in the stylesheet were aligned to the shared orange accent. Shared component consolidation and manual visual approval remain open.

## Open release blockers
- Knowledge reads still load the workspace snapshot and filter client-side; this is not server-side project isolation.
- Canonical Knowledge `project_ref`, old reference backfill and server-side follow-up idempotency remain blocked by data-contract/no-loss work.
- Finance read model, sync states, currency mismatch handling, transaction attribution and real role-specific visibility are not implemented/proven.
- Saved Views (D-06), Unified Inbox (D-07), Milestone model (D-08), language scope (D-09) and legacy KR/Task migration (D-12) remain open or deferred.
- Project Header shortcuts navigate to canonical creation sections but do not yet directly open each create modal; Portfolio Saved Views/Finance Link Status and richer Calendar events remain open; Activity aggregation, Weekly Review privacy and immutable Update Snapshot/Addendum E2E are not fully accepted.
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
Continue only the safe, code-only parts of Phase 2/3: open create modals directly from the Project Header shortcuts where supported, reconcile Task Sheet/Outputs Storage messaging and retry states, and add remaining exact-record/empty/error/permission assertions. Do not add Saved Views persistence, Milestones, Finance Link Status or Knowledge/Finance schema changes until their D-06/D-08/G4/G5 gates are resolved.
