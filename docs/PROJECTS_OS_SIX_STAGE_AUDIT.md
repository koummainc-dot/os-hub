# Projects OS — Six-Stage Review & Remediation Plan

**Review date:** 2026-11-06  
**Authority:** `plans/Projects_OS_v4_Unified_Master_Plan.md` is the product source of truth. This review does not authorize a schema rewrite or production data migration by itself.  
**Scope:** Projects OS only, including its cross-system contracts with Knowledge OS and the shared platform.  
**Acceptance rule:** Projects OS is not complete because screens exist. Each required flow must validate, persist, survive reload, expose both relationship directions, navigate to the exact record, enforce permissions, and pass lifecycle tests.

---

## 1. Information Architecture

### Current route inventory

The current router exposes Dashboard, Today, This Week, Projects, Tasks, Issues, Discovery, PRDs, OKRs, Outputs, Risks, Meetings, Updates, Wins, Weekly Reviews, Contacts, Team, Templates, Settings, and Masterplan Import.

Project Detail separately exposes 12 tabs: Overview, Tasks, Outputs, Work & Time, PRDs, Risks, Issues, Decisions, People, OKR, References, and Activity.

### Confirmed IA problems

1. **Risk / Issue duplication:** the global `risks` route already groups Risks, Issues, and Decisions in tabs, while a separate `issues` route exposes Issues again.
2. **Repeated navigation without a clear ownership rule:** Tasks, PRDs, Outputs, Risks, Issues, and OKRs exist globally and again inside Project Detail. Global views and project-scoped views should be explicit variants of the same records, not separate workflows.
3. **Project Detail is over-tabbed:** 12 horizontal tabs make the core project journey hard to scan and are not a practical mobile navigation model.
4. **References tab integration:** PR #166 adds a read-only list of Knowledge OS meetings linked to the current Project and explicit follow-up-to-task creation with source provenance. Browser acceptance and deployment are still pending.
5. **Meetings ownership must remain in Knowledge OS:** Projects may filter/read meetings by project reference and create tasks from action items, but must not become a second meeting database.

### Recommended IA (preserve existing record ownership)

- **Command Center:** Overview, Today, This Week.
- **Portfolio & Execution:** Projects/Roadmap, Tasks.
- **Discovery & Definition:** Discovery (PIO), PRDs.
- **Goals:** Objectives & KRs.
- **Delivery:** Outputs, Work Sessions, Wins.
- **Governance:** Risks, Issues, Decisions (one grouped destination).
- **Collaboration:** Knowledge Meetings (read-only source), Team, Contacts.
- **Reporting:** Stakeholder Updates, Weekly Reviews.
- **Administration:** Templates, Settings, Import.

Project Detail should use a smaller set of grouped destinations:
- Overview
- Plan (Tasks + PRDs)
- Delivery (Outputs + Work Sessions + Wins)
- Governance (Risks + Issues + Decisions)
- Goals (derived Objective/KR links)
- People & Meetings
- Activity

This is the target structure for the wireframe pass; do not remove existing routes until all inbound links and deep-link callers have been inventoried.

---

## 2. User Flows

| Flow | Current implementation evidence | Review result / remaining work |
|---|---|---|
| Project → Tasks → Work Session → Output | Project, task tree, timer/session, and output records exist | Lifecycle and exact output navigation still need end-to-end verification |
| Discovery → Project | Conversion action exists and preserves resolution links | Atomic batch support for `discovery` was missing from the live RPC contract; forward correction merged in PR #155. Production migration is not yet applied |
| Discovery → Task / PRD / Issue | Conversion actions exist and retain source references | Verify each conversion after reload and verify idempotent repeat-click behavior |
| PRD → Requirement → Task → Output evidence | Requirement/task/output relationships exist | PRD requirement rendering used undefined count variables; PR #159 fixes the crash and adds direct task creation with Project + PRD + exact Requirement prefilled. Verify in browser after deployment |
| Risk → Issue → Repair / Mitigation Task | Conversion and task-creation service actions exist | Exact source/target navigation is incomplete; test conversion and retry after reload |
| Decision → Implementation Task | Atomic task + decision write exists | Related records often open a collection tab rather than the exact record |
| Objective → KR → Project → Task | Domain supports project-derived task execution | Project Detail incorrectly read legacy `objective.project_ids`; PR #158 fixes it to derive Objectives through linked KRs. Production has no KR rows in the inspected workspace, so the complete chain is not yet proven with live data |
| Knowledge Meeting → Project → Action Item Task | Meetings screen reads Knowledge OS and offers task creation | Project Detail does not yet show the exact linked meeting records; verify project_ref and task provenance |
| Weekly Review → selected tasks / project activity | Review screen stores selected task IDs and a closing snapshot | Full create → reload → edit → close → reload lifecycle and privacy matrix remain to be verified |

### Required flow behavior

Every flow must explicitly cover:
- success, validation failure, permission denial, cancellation, retry, and stale/concurrent edit;
- source record remains intact after conversion;
- conversion is idempotent and preserves provenance;
- backlinks update on both records;
- archive/delete/restore behavior is explicit and does not silently orphan history;
- success is shown only after persistence succeeds.

---

## 3. Wireframes & Navigation

### Confirmed navigation gaps

- **Resolved by PR #161:** Issue → originating Risk, Issue → originating Discovery, Issue → related Decision, Risk → converted Issue, Decision → related Issue/Risk/Discovery, PRD → related Decision/Risk/Output, Discovery → converted records, and Task backlinks now navigate to exact rows and highlight them.
- Project Detail → Objective/KR names are not yet exact-record navigation targets; retain as a remaining relationship-navigation gap until tested.
- **PR #166 merged:** Project Detail → Collaboration → References reads Knowledge OS meetings filtered to the exact project; verify on a deployed build and confirm action-item task persistence after reload.

### Wireframe requirements

Before visual polish:
1. **PR #167 merged:** a reusable read-only detail modal now exists for Risk, Issue, Decision, PRD, Discovery, and Output; verify all six on a deployed build, including keyboard and narrow-screen behavior.
2. Keep every relationship chip/link opening the exact record, with a visible breadcrumb to its Project; remaining Objective/KR links still need exact targets.
3. Relationship pickers must show title + Project + status and must filter invalid/cross-project targets.
4. Grouped Project Detail navigation is implemented in PR #163; preserve a clear global “all projects” view.
5. Verify grouped navigation and detail modals on mobile; do not rely on horizontal scrolling as the only way to reach core actions.

---

## 4. Data Model & Permissions

### Canonical v4 relationships

`Objective → KR → Project → Task`  
`Task → Objective/KR` is derived, not stored.  
`Project` is the Roadmap entity; there must not be a second Roadmap record for the same project.

### Confirmed model mismatches / migration gates

1. Current code stores KR-to-Project links in `kr.project_ids`; v4 describes a logical `kr_projects` relation. Decide and document the canonical persistence shape before normalizing or migrating.
2. Legacy `task.objective_id` and `kr.task_ids` compatibility paths remain in code. Preserve them until all readers/writers and persisted values are reconciled.
3. `objective.project_ids` is not a canonical v4 relationship. Project Detail no longer reads it after PR #158; do not reintroduce it.
4. Migration `20261031120000_projects_entity_relationship_integrity.sql` contains Objective/KR checks that conflict with the v4 derived relationship. **Do not apply this migration unchanged.** Rewrite its Objective/KR branch and tests only after the no-loss reconciliation proposal is reviewed.
5. Other Projects guard migrations are not all present in the inspected Production migration history. Review their ordering and dependencies as one release set; do not infer that a migration in Git is already active in Production.

### Read-only Production inventory already recorded

In the inspected workspace: 6 active Projects, 1 active Objective, 0 KRs, 29 active Tasks, 2 active Risks, 2 active Reviews, and 9 Activity records. All 29 Tasks have an active Project; 20 parent links resolve within the same Project; no self-parent, missing parent, cross-project parent, or parent cycles were found. No non-empty Task `objective_id`, Task PRD links, or KR task links were found in that snapshot.

**Interpretation:** the inspected workspace has no existing KR rows to validate the live Objective → KR → Project chain. This does not prove demo/local data or other workspaces are identical.

### Permission acceptance

- Workspace isolation and server-side authorization must be tested independently of UI visibility.
- Verify Owner, Admin, Lead, Contributor, Reviewer, Stakeholder, and Viewer behavior for each write/approve/archive/delete action.
- Verify private Project visibility with two real accounts.
- Verify cross-workspace and cross-project relationship rejection.
- Keep server-side ownership/access checks authoritative; never trust client-provided member IDs.

---

## 5. Implementation Log

- **PR #155 — merged:** added a forward-only correction so `projects_apply_records_batch` accepts `discovery`; added SQL smoke tests for success, permission denial, and rollback. No Production migration has been applied yet.
- **PR #158 — merged:** Project Detail derives Objectives through linked KRs instead of the obsolete `objective.project_ids` field; added domain and UI contract tests.
- **PR #159 — merged:** fixed undefined requirement-count identifiers that broke PRD requirement rendering; added direct task creation from a requirement with Project, PRD, and requirement prefilled; added regression assertions.

- **PR #163 — merged, production deployment pending:** grouped Project Detail navigation into seven functional destinations while preserving all 12 existing child tab IDs and deep links. CI, Verify App, and Finance Family Center checks passed. Merge commit: `1ee7ed9c110f7c4ab1f289d4b5bc198fb0bd9988`. Vercel's Hobby daily deployment-creation quota returned HTTP 402 (retry after 24 hours), so this commit is not yet confirmed on Production.
- **PR #164 — merged:** fixes a render-time temporal-dead-zone bug in `DecisionsView`: the exact-record focus hook read `list.length` before `list` was initialized. The list is now derived before the hook runs, and a regression assertion protects the declaration order. CI, Verify App, Finance Family Center Checks, and the Spiritual PostgreSQL smoke test passed. Merge commit: `060d1db46d9d0bf90f978c35b2c0456e35b886d3`. Vercel's preview build status reported the Hobby build-rate limit; Production remains pending due the separate daily deployment-creation quota.

- **PR #166 — merged:** adds Knowledge OS meetings to Project Detail → Collaboration → References using the existing `listKnowledgeMeetings` read contract. Meeting records remain owned by Knowledge OS; follow-up tasks are created only on explicit action, with meeting ID/index provenance and duplicate detection. CI, Verify App, Finance Family Center, and PostgreSQL smoke checks passed. No schema or migration changes. Browser verification and post-deploy persistence checks remain outstanding.
- **PR #167 — merged:** adds independent read-only detail modals for Outputs, Risks, Issues, Decisions, PRDs, and Discovery. Details are separate from edit/delete controls and include the main fields and related record names without exposing raw foreign-key IDs. CI, Verify App, Finance Family Center, and PostgreSQL smoke checks passed. Browser acceptance and accessibility checks remain pending.
- **PR #168 — merged:** removes the duplicate Issues tab from the global Risks page. The dedicated global Issues route remains the single global destination; project-scoped Issues remains under each project's Governance group. Risks and Decisions stay together on the Risks page. CI, Verify App, Finance Family Center, and PostgreSQL smoke checks passed; no data or schema changes.
- **PR #169 — merged:** adds a lifecycle contract test for all primary Projects collections, checking registry membership, live-vs-trash filtering, soft delete, individual restore, reload hydration, and atomic project-bundle delete/restore. CI, Verify App, Finance Family Center, and PostgreSQL smoke checks passed. This remains source-contract coverage, not a substitute for live database create → reload → edit → restore tests.
- **PR #170 — merged:** extends the Projects browser harness to open and close the read-only detail modal for Outputs, Risks, Decisions, PRDs, Discovery, and Issues, checking the correct record type appears and that no console errors occur. CI, Verify App, Finance Family Center, and PostgreSQL smoke checks passed.
- **PR #171 — in progress:** makes Objective and Key Result names in Project Detail → Goals exact navigation links. The global OKR screen reveals filtered/archived targets, scrolls to the exact record, and highlights it; contract tests protect both directions.
- **PR #161 — merged and deployed:** introduced typed focus targets for related records. Following links from Issues, Risks, Decisions, PRDs, Discovery, and Task backlinks now opens the owning Projects tab, reveals filtered-out closed Issues / Risks when necessary, scrolls the exact target row into view, and highlights it. Added regression assertions. Production deployment `dpl_7ukDQFTWHZCZVyu7KPQZvhN7GW8f` reached `READY` on commit `30987042d7117df0be316aed2a69c221a66323b6`; production alias `os-hub-seven.vercel.app`.

This improves exact-record discovery, but does not yet provide a dedicated read-only record detail drawer/page for every entity. That remains part of the wireframe/navigation follow-up. It also does not close the broader data-model and live acceptance gaps listed above.

---

## 6. Testing & Approval

### Passing evidence

- PR #155: CI, Verify App, Finance checks, Knowledge SQL smoke, Projects SQL smoke, and Ventures SQL smoke passed before merge.
- PR #158: CI, Verify App, and Finance checks passed before merge.
- PR #159: CI, Verify App, and Finance checks passed before merge.
- Projects domain tests now cover derived Objective lookup through KR links.
- PRD review-gate tests now assert the requirement task flow and correct linked-record counts.

### Still required before Projects OS approval

- [ ] Browser acceptance on the deployed commit for PRD requirement rendering and create-task prefill.
- [ ] Browser acceptance for Project Detail → OKR derived Objective links.
- [x] Core exact-record focus navigation for Issue, Risk, Decision, PRD, Output, and Discovery links (PR #161; row scroll + highlight).\n- [ ] Dedicated read-only detail surface for every related entity, plus remaining global links not yet covered.
- [ ] Knowledge Meeting → Project linking and Action Item → Task persistence after reload.
- [ ] Collection lifecycle matrix: create → reload → edit relationship → reload → archive/delete → restore → reload.
- [ ] Real two-account privacy and role-permission tests.
- [ ] Live test data for at least one Objective, multiple KRs, multiple Projects, and linked Tasks; no live KRs exist in the inspected workspace yet.
- [ ] Rewrite and review the conflicting Objective/KR SQL guard migration before applying any related guard set.
- [ ] Apply the PR #155 forward migration only after reviewing migration ordering and confirming the intended Production target.
- [ ] Verify the tested commit is deployed; do not mark the unit complete from CI-only evidence.

**Approval status:** Not approved / not complete. This is a staged remediation record, not a claim that Projects OS has passed final acceptance.
