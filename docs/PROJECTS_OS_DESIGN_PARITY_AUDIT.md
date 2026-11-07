# Projects OS — Design Parity & Interaction Inventory

**Review date:** 2026-11-07  
**Design source:** `OS Hub — تصميم مقترح لصفحة المشروع ولوحة المهمة.html` (12 embedded screen prototypes; 1,267 KB).  
**Code source:** `feat/projects-phase-a-navigation-quick-wins` / PR #173.  
**Status rule:** `Implemented` means a matching code path exists; it does not mean the screen is pixel-identical or passed live acceptance. `Partial` means only some sections/actions are represented. `Missing` means no dedicated matching route/workflow was found in the inspected source. `Unverified` means the code path exists but deployed/mobile/persistence behavior has not been proven.

## 1. Screen-by-screen inventory

| # | Reference screen | Reference content / interactions | Current implementation evidence | Parity status | Acceptance still needed |
|---|---|---|---|---|---|
| 1 | صفحة المشروع المقترحة | Project header, breadcrumb, project sections, task views, task side sheet, linked PRD/requirement/risk/decision, comments/activity | ProjectDetail with grouped navigation; TaskSheet; contextual breadcrumb and deep links on PR #173; Task list modes | **Partial** | Compare full project header, tab grouping, task sheet sections, relationship chips, comments/activity and exact layout against reference |
| 2 | عرض اللوحة بالحالة | Status columns, custom status, drag/move task cards, add task | Task Board mode and status categories; project/task status updates | **Partial / unverified** | Verify custom status handling, drag-and-drop persistence, WIP/empty states, permissions and reload |
| 3 | نظرة عامة على المشروع | Health reasons linked to affected records, next actions, progress, target, recent update, linked OKRs | Project overview and derived health metrics; health reasons now deep-link to tasks/issues/risks; Objective/KR navigation | **Partial** | Visual comparison, recent update navigation, metric consistency and populated live OKR data |
| 4 | عملي | Cross-project personal queue: overdue/today/upcoming, grouped tasks, today's meetings, work timer | Today, This Week, global Tasks, TimerBar and task timer exist; no exact dedicated `عملي` route in SCREENS registry | **Partial** | Decide whether Today/Tasks is an acceptable equivalent or add dedicated My Work screen matching the reference; verify meeting agenda and timer |
| 5 | الخط الزمني | Task timeline with start/due dates and zoom | Fifth Tasks view (Timeline) added in PR #173 | **Implemented / unverified** | Compare row labels, date scale, zoom, tasks without start dates, narrow screen behavior and persistence |
| 6 | المخاطر والمشاكل | Risks, Issues, Decisions, status/actions, 5×5 probability-impact matrix | Risks/Issues/Decisions entities and risk matrix exist; duplicate global Issues tab removed; detail modals and exact-record focus | **Implemented / partial** | Verify every transition, matrix click-to-record, mitigation tasks, role restrictions, restore and mobile |
| 7 | التخطيط والمواصفات | PRDs, Discovery, decisions, requirement coverage and create implementation task | PRDs, Discovery, Decisions and requirement-to-task flow exist; PR #159 fixed requirement rendering and task prefill | **Implemented / unverified** | Verify full requirement coverage after reload, PRD approvals/locks, backlinks and visual structure |
| 8 | الوارد | Unified notifications/review requests/discovery signals/cross-system events with read/unread and actions | Knowledge owns its own inbox and notifications; Platform owns invitations; integrationEvents provides a durable but source-scoped event API (Projects currently subscribes to Hobbies only). No shared cross-OS notification center or common read-state contract was found. | **Missing; architecture decision required** | Define a Platform-owned notification contract, ownership, per-user read state, retention, permission filtering and source deep links before implementing a second inbox. Do not copy Knowledge or invitation records into Projects. |
| 9 | التقويم | Monthly calendar with task cards and drag-to-reschedule | Tasks Calendar mode and project calendar view exist | **Partial / unverified** | Reference shows task drag-to-reschedule; verify implemented drag behavior, timezone/week-start, overflow, mobile and persisted date changes |
| 10 | المخرجات والمراجع | Outputs, approval state, related task/PRD/risk, external references, file upload | Outputs CRUD, approval/final lock, links, media embeds, detail modal; References includes Knowledge meetings and explicit follow-up-to-task | **Partial** | Reference explicitly proposes direct file upload; current inspected output form exposes URL/notes and files as metadata, not a verified upload workflow. Implement storage upload only with existing free/available storage and safe limits, or mark deferred |
| 11 | الفريق والنشاط | Project activity feed, weekly updates, wins, meetings, people and workload | Project Activity, Updates, Wins, Meetings read from Knowledge, People/Team screens and workload sections exist | **Partial** | Verify activity completeness, update snapshot, win links, meeting provenance, member roles, workload accuracy and responsive layout |
| 12 | المحفظة | Portfolio-wide project health/progress/lead/deadline, overdue tasks, open risks, linked objectives | Dedicated `portfolio` route with project health/progress, open/overdue task counts, issue/risk counts, search/status filters and active Objective progress/pace cards | **Implemented / unverified** | Verify KPI semantics against populated live records, linked Objective progress, project lead/deadline visibility, permissions, keyboard/touch and mobile layout |

## 2. Task interaction inventory

The design file includes these principal task controls and interaction patterns:

- Five views: List, Board, Table, Calendar, Timeline.
- Create task / Quick Add with explicit Project selection.
- Task Sheet: status, assignee, due date, priority, planning bucket, subtasks, linked PRD/requirement/risk/decision, comments/activity.
- Inline editing and bulk status changes.
- Task-to-project and task-to-related-record navigation.
- Timeline date positioning and Calendar rescheduling.
- Project status and health navigation.

**Code evidence on the remediation branch:** List/Board/Table/Calendar/Timeline, right-side Task Sheet, Quick Add project picker, inline title/status/priority/due-date editing, bulk status action, custom fields and task deep-link/Browser Back harness coverage.

**Important gap:** the current browser harness covers selected task flows; it does not establish that every visible control in all 12 mockups is implemented or that all success/error/loading/permission states work.

## 3. Interaction acceptance matrix (required per action)

For every actionable control in each reference screen, add/verify a test for:

1. Correct affordance and accessible name (including Arabic/RTL).
2. Enabled/disabled state under Owner, Admin, Lead, Contributor, Viewer.
3. Validation errors and permission denial.
4. Loading/in-progress feedback; prevent duplicate submission.
5. Success feedback only after persistence succeeds.
6. Reload hydration and exact record identity.
7. Cancel/close behavior without accidental writes.
8. Archive/delete/restore behavior and backlink integrity.
9. Keyboard operation, focus return and Escape behavior for dialogs/sheets.
10. Narrow viewport layout and touch target behavior.

Do not count a control as accepted solely because it is present in the HTML or responds to a click in a seeded demo.

## 4. Free test strategy

- Unit/domain/contract tests: existing Node test suite.
- Browser flows: existing Playwright/browser acceptance harness with deterministic seeded data.
- Database lifecycle, RLS and migration smoke: disposable local PostgreSQL in GitHub Actions.
- Cross-system integration: deterministic source-event fixtures and idempotency tests.
- Mobile: Playwright viewport matrix (e.g. 360×800, 390×844, 768×1024) with screenshot and overflow assertions.
- No paid Supabase branch, paid browser service, Production test data, or Production migration is required for these tests.

Real authenticated workspace acceptance remains a separate user-side gate; test fixtures and disposable PostgreSQL cannot prove behavior in the user's actual authenticated session.

## 5. Explicit release blockers

- [ ] Complete pixel/structure parity review for all 12 reference screens.
- [ ] Define the shared Platform notification contract before implementing the Inbox (Knowledge inbox, Platform invitations and durable OS integration events currently have separate ownership and read-state behavior).
- [ ] Resolve the My Work screen ownership/equivalence decision; Portfolio now has a dedicated route but still needs acceptance.
- [ ] Implement or explicitly defer direct output file upload (the mockup labels it as proposed).
- [ ] Audit all controls and state transitions; expand browser acceptance beyond the current selected paths.
- [ ] Calendar drag-to-reschedule acceptance.
- [ ] Team roles, project membership, activity, and update snapshot acceptance.
- [ ] Mobile viewport acceptance for every screen and modal/sheet.
- [ ] Real workspace lifecycle, meeting conversion persistence, two-account role matrix and populated OKR chain.
- [ ] Preview acceptance and Production release review.

## 6. Source files inspected

- `src/systems/projects/index.jsx` — route registry, access wrapper, Project/Knowledge/Ventures integration bridges.
- `src/systems/projects/screens_a.jsx` — Dashboard, Today, This Week and Tasks.
- `src/systems/projects/screens_b.jsx` — Projects list, Project Detail, project tabs and Knowledge references.
- `src/systems/projects/screens_c.jsx` — OKRs, updates, wins, reviews, contacts, team, templates and meetings.
- `src/systems/projects/parts.jsx` — ProjectForm, TaskForm, TaskSheet and reusable task/project UI.
- `src/systems/projects/entities.jsx` — Outputs, Risks, Issues, Decisions, PRDs and Discovery.
- `docs/PROJECTS_OS_SIX_STAGE_AUDIT.md` — architecture, integration, persistence, privacy and release gates.

**Decision:** Projects OS remains not approved / not complete. This inventory is a source-backed parity audit, not a claim of visual or live acceptance.
