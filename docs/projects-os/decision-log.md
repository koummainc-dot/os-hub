# Projects OS — Master Refactor Decision Log

Source: `Projects_OS_v5_Unified_Refactor_Spec.md`, §22. This log records the current state of every decision; it does not imply product approval where noted.

## D-01 — Final Accent
**Applied technically:** shared focus/selection/hover values checked in this pass use Core accent `#EF9F27`; the contract test rejects old blue accent declarations.

**Open:** Product Owner / Design approval after unified screen review and shared-component alignment.

## D-02 — Finance Project Profile cardinality
**Decision: explicit active-primary selection; do not enforce one-to-one.** A Project may reference multiple Finance profiles only when Finance's existing domain permits it, but exactly one may be marked primary for Project read-model presentation. Projects never chooses silently. Duplicate/ambiguous existing profiles require explicit Finance-side selection. No uniqueness migration until inventory and no-loss proof.

## D-03 — Resource ownership
**Decision: ownership follows source system.** Projects owns external URL references and project-specific notes/labels only. Knowledge owns Knowledge documents, meeting notes and Knowledge attachments. Outputs owns deliverable files. Core Files owns generic workspace files if/when its canonical API is available. Project Resources is a federated reference view; it must never copy source files or metadata blobs into Projects.

## D-04 — Stable Follow-up ID
**Decision: mandatory source-owned immutable ID.** Knowledge must issue a stable follow-up ID at creation. Projects uses `(source_system, source_type, source_id)` as idempotency identity. Legacy index/title identity remains read-only compatibility and must be reconciled before legacy mutation.

## D-05 — Canonical Knowledge project_ref
**Decision: approve Knowledge-owned external relation contract.** Canonical relation is `knowledge_external_links(target_system='projects', target_id=workspace_records.id, relation_type='related')`; legacy metadata is compatibility-only. Knowledge remains owner and enforces both Knowledge and Projects visibility.

## D-06 — Saved Views
**Decision: personal by default, optional Workspace sharing.** Saved view stores query/filter/sort/visible columns/column order/view mode and schema version. Personal owner can edit/delete; shared view requires explicit share permission and only authorized managers can edit/delete. Do not persist in Projects-local tables or browser-only localStorage. Implement via Core user-preferences/saved-view service; if the canonical Core adapter is absent, ship the UI contract disabled with a clear dependency state rather than creating parallel persistence.

## D-07 — Unified Inbox
**Decision: Platform Notification owns inbox records and per-recipient read state.** Projects publishes typed events/outbox references only. Inbox queries the shared service, permission-checks target on open, and stores no copied task/meeting/finance content. No Projects-local inbox table.

## D-08 — Milestone model
**Decision: standalone Project Milestone record.** Milestones are reportable commitments with title, due date, status, owner, optional description and explicit related task IDs; they are not Tasks and do not count toward task progress. Roadmap displays Milestones alongside project dates, PRD ship dates and significant Outputs. A single milestone may group multiple tasks; completion is explicit and never inferred solely from one task.

## D-09 — Language scope
**Decision: Arabic-first and RTL in V1; no Projects-specific language switch.** Projects follows the platform locale/i18n contract. English strings must be translation-ready, but locale selection and persistence remain Core-owned. No second local language preference.

## D-10 — Finance budget handoff
**Decision: one-time, explicit, user-confirmed initial transfer only.** On Finance profile setup, show planned Project budget as a suggested initial value with currency; user must confirm in Finance before saving. Once a Finance profile exists, Projects budget changes never overwrite Finance budget. No ongoing two-way sync. Mismatched currencies require explicit conversion outside Projects; never infer rates.

## D-11 — Knowledge resource query
**Decision: approve Knowledge-owned project-scoped server query and canonical links.** Project-specific reads must fail closed if scoped RPC/permission check is unavailable. No workspace-wide client filtering for private project records.

## D-12 — Legacy KR/Task paths
**Decision: preserve legacy fields read-only; new relationships use the canonical derived path.** A Task's Objective/KR contribution is derived through its Project → linked KR/Objective, not a new direct Task→Objective association. Existing objective_id/task_ids/project_ids remain readable until a full reader/writer inventory, duplicate/orphan report and no-loss dry run are approved. No destructive backfill or field removal in this pass.
## Standing safety decisions
- No production DB migration, RLS policy change, destructive data operation or production deploy in this pass.
- Finance remains owner of Finance Project Profiles and transactions.
- Knowledge remains owner of Meetings, Resources and source follow-ups.
- Projects stores only its own records and cross-system references.
- Do not introduce duplicate storage to make a screen appear complete.
