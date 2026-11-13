# Projects OS — Master Refactor Progress

## Current branch
- PR: #188 — `feat(projects): v5 workspace and cross-system traceability`
- Branch: `feat/projects-v5-phase1-navigation`
- Base: `main`
- Production database: unchanged; no new production migration, RLS change or production deployment in this pass.

## Latest verified code baseline
- Latest implementation and test evidence commit: `8218791d9a151b26b07fbb5331ad8210c792fcb0`.
- GitHub CI: **SUCCESS**; Verify app: **SUCCESS**; Finance Family Center Checks: **SUCCESS**; Finance PostgreSQL smoke: **SUCCESS**; Spiritual PostgreSQL smoke: **SUCCESS**.
- Full OS test suite, existing regression suite, Finance acceptance, production build, Project Header quick-create contracts and retry-safe Output upload contract passed on this code commit.
- Projects domain assertions: **66 PASS / 0 FAIL**; template write/rollback contract: **4 PASS / 0 FAIL**.
- Overview/Portfolio navigation, seven permission-gated quick-create flows, stable Knowledge follow-up, and Task Sheet/Outputs file-upload retry contracts passed.
- Vercel Preview: **READY** — `https://os-jygby3wwv-koumma.vercel.app`.
- This is automated/code evidence only: actual user file upload/download, Storage RLS permissions, mobile RTL, and real-data lifecycle still require manual Preview acceptance.

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
- **Planning & Outputs:** project-scoped Discovery filtering/prefill; existing PRD/Requirement/Task/Output and KR contracts retained. Task Sheet and Outputs share the existing private `projects-outputs` Storage helper; stable per-file IDs and object paths make retries idempotent; metadata is persisted after each completed file; downloads use short-lived signed URLs; a failed later file leaves earlier links and the Draft record available for retry.
- **Governance:** global unified route and project tabs; risk/issue/decision traceability and lifecycle contracts remain passing.
- **Knowledge:** separate Meetings and project-owned References tabs; new task links use stable follow-up identity with legacy index/title fallback.
- **Finance:** context handoff to Finance OS; Finance selects its existing profile or pre-fills its own form; no finance profile/transaction is written by Projects.
- **Results:** project-scoped Wins and Updates read views; canonical records remain in Projects.
- **Overview & Portfolio:** actionable Project Overview metrics open Tasks/Timeline/Work or exact Risk/Issue lists; traceability opens the exact unlinked task IDs. Portfolio supports Cards/Table/Board/Timeline/Calendar, project-ID search, combined filters, Project create permission, metric drill-downs, a Timeline today marker and explicit Not Measurable state. Project Header has permission-gated create actions that open the existing canonical Task/Output/PRD/Risk/Issue/Decision/Resource form directly. Saved Views and Finance Link Status remain deferred on their owners' contracts.
- **Style:** remaining blue focus/selection/hover values checked in the stylesheet were aligned to the shared orange accent. Shared component consolidation and manual visual approval remain open.

## Open release blockers
- Knowledge reads still load the workspace snapshot and filter client-side; this is not server-side project isolation.
- Canonical Knowledge `project_ref`, old reference backfill and server-side follow-up idempotency remain blocked by data-contract/no-loss work.
- Finance read model, sync states, currency mismatch handling, transaction attribution and real role-specific visibility are not implemented/proven.
- Saved Views (D-06), Unified Inbox (D-07), Milestone model (D-08), language scope (D-09) and legacy KR/Task migration (D-12) remain open or deferred.
- Project Header shortcuts now open canonical create modals directly; automated contracts pass, while live Preview acceptance remains pending. Task Sheet and Outputs upload failures now retain completed files and support retry against the same Storage object path; real file upload/download and Storage RLS permission acceptance remain unverified. Portfolio Saved Views/Finance Link Status and richer Calendar events remain open; Activity aggregation, Weekly Review privacy and immutable Update Snapshot/Addendum E2E are not fully accepted.
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
