# Projects OS — Master Refactor Decision Log

Source: `Projects_OS_v5_Unified_Refactor_Spec.md`, §22. This log records the current state of every decision; it does not imply product approval where noted.

## D-01 — Final Accent
**Applied technically:** shared focus/selection/hover values checked in this pass use Core accent `#EF9F27`; the contract test rejects old blue accent declarations.

**Open:** Product Owner / Design approval after unified screen review and shared-component alignment.

## D-02 — Finance Project Profile cardinality
**Current:** Projects sends `projectRef` to Finance; Finance opens a matching profile or pre-fills its own profile form.

**Open / blocked:** audit existing duplicate profiles and choose one-to-one vs explicit active-primary selection before adding uniqueness constraints. Current UI handoff must not be read as proof that profile cardinality is resolved.

## D-03 — Resource ownership
**Current:** Projects-owned external links remain on the Project record; Knowledge owns Meetings and Knowledge resources; Outputs owns its attachments.

**Open:** decide which local file/reference types are truly Projects-owned and define the unified resource card contract. Do not copy Knowledge content into Projects.

## D-04 — Stable Follow-up ID
**Current:** newly linked Projects tasks store `source_followup_id`; explicit Knowledge ID is preferred, text-only legacy items use normalized content identity; legacy index/title fallback remains readable. Reorder/identity tests pass.

**Open:** Knowledge must own and persist the canonical ID. No Knowledge records were backfilled. Review duplicate legacy text items and define server-side uniqueness/idempotency for concurrent retries.

## D-05 — Canonical Knowledge `project_ref`
**Status: PARTIAL — contract and implementation are now defined on the Projects PR branch; Production migration remains unapplied.**

- Knowledge remains the owner of Meeting/Resource records. The canonical Project relation is a Knowledge-owned `knowledge_external_links` row: `target_system='projects'`, `target_id=workspace_records.id`, `relation_type='related'`.
- Knowledge item `metadata.relatedSystem/relatedId` remains a compatibility input/output for the current editor and older records; a Knowledge-owned trigger synchronizes it to the canonical link table on insert/update.
- The Knowledge-owned `knowledge_list_project_meetings(workspace_id, project_id)` returns a `project_ref` field from the canonical link, with legacy metadata as a read-only fallback.
- The Projects picker/validator reads the canonical Projects `workspace_records` table under RLS. No Knowledge content is copied into Projects. Current Production Knowledge inventory has zero items/external links, so no backfill was needed or performed.
- Evidence: `supabase/migrations/20261113210000_knowledge_project_scoped_links.sql` and `supabase/tests/knowledge_project_scoped_links_smoke.sql`; Knowledge SQL workflow `43502229776` passed.

**Still open:** Production migration/rollback approval, real two-account RLS acceptance, and confirmation from the owner that this canonical relation contract is the intended long-term API.

## D-06 — Saved Views
**Status: DEFERRED/BLOCKED.** Existing search/filter views remain. Personal Saved Views with optional Workspace sharing need a Core storage contract and permission model. Do not add Projects-local persistence.

## D-07 — Unified Inbox
**Status: DEFERRED.** Platform Notification owns notification/inbox records; Projects must not copy Knowledge reminders or invitations. Wait for the shared Notification contract.

## D-08 — Milestone model
**Status: OPEN/BLOCKED.** Choose one model only: standalone Project Milestones or a defined Task subtype. Current timeline remains based on dated leaf Tasks; no duplicate Milestone entity/table was added.

## D-09 — Language switch
**Current:** Arabic-first/RTL is retained.

**Open:** Product Owner to define whether English/language switch is in V1 and how it follows existing platform i18n/locale persistence.

## D-10 — Finance budget handoff
**Current:** Projects opens Finance with ephemeral `projectRef`; Finance opens an existing profile or pre-fills Finance-owned form; Finance save is an explicit user action. Planned budget is not silently written to Finance.

**Open:** approve whether planned budget may be transferred once on initial profile creation, and how later changes remain separated from Finance-owned values. Finance read-model and sync states remain a separate requirement.

## D-11 — Knowledge resource query
**Status: PARTIAL — server-side project-scoped query implemented on the PR branch and verified in isolated PostgreSQL; Production remains unchanged.**

- `listKnowledgeMeetings(workspaceId, projectId)` calls the Knowledge-owned `knowledge_list_project_meetings` RPC.
- A selected Project is filtered in SQL under Knowledge RLS and a separate Projects view/visibility check. The Projects screen no longer filters a workspace-wide meeting array locally.
- A project-specific request fails closed if the scoped RPC is missing or fails; only the all-meetings transitional view can use the old normalized/workspace snapshot fallback.
- Evidence: `supabase/tests/knowledge_project_scoped_links_smoke.sql` passes link create/reassign/unlink, isolated project results, invalid target rejection, missing Projects permission denial and missing Knowledge permission denial.

**Still open:** Production migration/rollback approval and real two-account account-level RLS acceptance.

## D-12 — Legacy KR/Task paths
**Status: BLOCKED.** Existing explicit `task_ids` and derived KR→Project→Task contracts remain covered by domain tests. No legacy field was changed or backfilled.

**Open:** complete readers/writers inventory and no-loss report for `objective_id`, `task_ids`, project/KR link fields, and historical task groups before changing or removing any legacy relation.

---

## Standing safety decisions
- No production DB migration, RLS policy change, destructive data operation or production deploy in this pass.
- Finance remains owner of Finance Project Profiles and transactions.
- Knowledge remains owner of Meetings, Resources and source follow-ups.
- Projects stores only its own records and cross-system references.
- Do not introduce duplicate storage to make a screen appear complete.
