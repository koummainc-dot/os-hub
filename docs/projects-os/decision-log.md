# Projects OS — Master Refactor Decision Log

## D-01 — Accent token
**Technical alignment applied:** shared focus, selected, and primary-hover states use the existing OS accent `#EF9F27`.

**Status:** product/brand approval remains open until the unified screen is reviewed.

## D-04 — Knowledge meeting follow-up identity
**Implementation:** new Projects follow-up tasks store `source_followup_id`. An explicit ID on the Knowledge follow-up is canonical. Legacy text-only follow-ups use a normalized content-derived identity. `source_followup_index` remains as a read-compatibility field for existing tasks.

**Safety:** old references are not backfilled or rewritten in the Knowledge snapshot. The lookup checks stable ID first, then the legacy index, then a legacy title match.

**Open:** dry-run mapping of existing Knowledge meetings/follow-ups, duplicate-text review, and migration plan are still required before adding canonical IDs to old Knowledge records. This client-side ID does not provide server-side uniqueness for concurrent requests.

## D-05 / D-11 — Project-scoped Knowledge reads
**Status: blocked by current data contract.** The repository loads a workspace-level normalized Knowledge snapshot. UI filtering after that load is not server-side scoping and must not be treated as a security boundary. A project-filtered RPC/query and its RLS contract require inventory of the normalized snapshot and legacy `workspace_data` fallback first.

## D-10 — Finance handoff
**Implementation:** Projects opens the canonical Finance Projects page with an ephemeral `projectRef`. Finance either opens the existing Finance Project Profile or pre-fills its own form. No Finance record is auto-created and no transaction is copied.

**Status:** integration path implemented; role-based tests and explicit user save remain required.

## D-08 — Milestones
**Status: open.** The current timeline continues to visualize dated leaf Tasks. No second Milestone model/table has been introduced pending the decision between Project Milestones and Task subtype.

## Navigation compatibility
Keep existing project tab IDs and legacy global `issues` / `decisions` route IDs while rendering them through unified Governance and keeping the old project `related` deep link resolvable.

## Data safety
No Projects, Finance, or Knowledge schema migration, RLS change, production DB write, data deletion, or production deployment is part of this commit.
