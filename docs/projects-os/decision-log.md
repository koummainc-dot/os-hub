# Projects OS — Phase 1 Decision Log

## D-01 — Accent token
**Phase 1 technical decision:** normalize the shared CSS accent token to the existing Core UI accent `#EF9F27` so CSS and the existing `A` token no longer disagree.

**Status:** Technical alignment applied. Final product/brand color remains open until the unified screen is reviewed.

## Navigation compatibility
**Decision:** keep existing project tab IDs and legacy global `issues` / `decisions` route IDs while rendering them through the unified Governance experience.

**Reason:** preserve deep links and existing callers while removing duplicate navigation concepts.

## Data safety
**Decision:** Phase 1 changes are UI/navigation/token only. No Projects schema migration, RLS change, data deletion, or production deployment is included.

## Milestones
**Status:** D-08 remains open. Phase 1 does not introduce a new Milestone data model or duplicate the Task concept.
