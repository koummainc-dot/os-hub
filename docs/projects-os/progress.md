# Projects OS — Master Refactor Progress

## Current branch
- PR: #188 — `feat(projects): v5 workspace, integrations, and navigation`
- Branch: `feat/projects-v5-phase1-navigation`
- Base: `main`
- Production database: unchanged; no new migration or production deployment in this pass.

## Verified before this pass
- Phase 0 inventory and safety baseline recorded.
- Phase 1 global navigation, Governance consolidation, responsive workspace shell, legacy route compatibility, and Core `myWork` registration implemented.
- Automated CI, Verify app, Finance Family Center workflow, and production build passed on commit `d16450b6bdca390faf647af1c32d33c0737f11f2`.
- Preview deployment was READY. Static HTTP response showed the Arabic RTL shell; this is not a substitute for interactive browser acceptance.

## Master-spec implementation completed in this pass
- **Project Workspace / Planning:** Discovery can now be opened within a project context, filters to records already linked to that project, and pre-fills the project relationship when creating a new discovery record.
- **Project Workspace / Knowledge:** meetings and project-owned external references have separate navigation tabs. The historical `related` route remains accepted as a compatibility path.
- **Knowledge → Projects follow-ups:** new task links persist a stable `source_followup_id` plus the legacy numeric index for backward compatibility. Explicit Knowledge IDs are preferred; legacy string follow-ups use normalized-content identity. Existing tasks are searched by stable ID first, then legacy index/title to avoid recreating already-linked follow-ups after reorder.
- **Project Workspace / Finance:** an explicit handoff opens Finance OS on its canonical Projects page with the selected Projects OS project reference. Finance selects an existing profile or pre-fills its own profile form; it never auto-creates a finance profile or duplicates transactions inside Projects.
- **Project Workspace / Results:** project-scoped views surface linked achievements and stakeholder updates while keeping their canonical records in Projects collections.
- **Design tokens:** remaining CSS blue focus/selection/hover values were aligned to the shared orange accent token; semantic risk/status colors were not blanket-replaced.
- Added contract coverage for the new navigation, route context, scoped Discovery, stable Knowledge follow-up identity, and Finance ownership.

## Still open in the master spec (not claimed complete)
- **G1 / G2:** final human product/design approval for D-01 accent and interactive 360px/RTL/focus/keyboard/contrast acceptance.
- **G3:** perform real-data, cross-project invalid-reference, bidirectional traceability, archive/restore, and multi-account permission cycles against a controlled test workspace.
- **G4 — Knowledge:** `listKnowledgeMeetings` still reads a workspace snapshot and then filters in the client. The current storage contract is a normalized workspace snapshot, not a project-scoped meeting query. Server-side project scoping and D-05 canonical project references need a no-loss schema/data inventory and permission review before any RPC/migration change. The UI split does not close that security gate.
- **G4 — Finance:** the Finance handoff is implemented, but linked-profile visibility, finance-specific read/write permission, missing/stale currency values, transaction attribution, and two-account isolation still require live role-based tests. No finance numbers are copied into Projects.
- **D-08 Milestones:** remains open; no duplicate Milestone entity/table was introduced. Timeline currently visualizes dated leaf Tasks.
- **D-04 Follow-up migration:** stable IDs are written for new tasks and old index links remain readable. Existing Knowledge snapshot records have not been backfilled; that requires a dry-run mapping and explicit duplicate/legacy review. The stable client identity is not a server-side uniqueness constraint; concurrent duplicate protection still needs a database contract.
- **P7 / G5–G7:** full create/reload/edit/archive/restore and all cross-system end-to-end cycles, offline conflict/retry, performance, accessibility, mobile/tablet, and final release acceptance remain to be evidenced. No production rollout was performed.
- **D-06/D-07:** Saved Views and Unified Inbox ownership remain deferred to their platform contracts; this pass did not create duplicate storage.

## Data safety decisions
- No database migration, RLS policy change, RPC replacement, or destructive data operation was performed.
- Finance remains the owner of Finance Project Profiles and finance transactions.
- Knowledge remains the owner of meetings and source follow-ups.
- Projects stores only the project-side task reference and stable follow-up link metadata.
- The Project Finance button carries an ephemeral route context; only the user action inside Finance OS can save a profile.

## Next acceptance gate
Run the new and existing automated suites on the updated commit; confirm the new Preview deployment is READY; then complete interactive acceptance (360px/desktop RTL, browser Back/deep links, finance permissions, and a controlled Knowledge reorder/retry). Do not merge or deploy production until those results are recorded.
