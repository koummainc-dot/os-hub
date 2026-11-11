# Projects OS v4.2 — Relationship Matrix & Integration Contract

## Status

This document is the implementation contract for the integrated Projects & Outputs OS. v4.0 and v4.1 remain historical references. v4.2 is the active architectural reference.

## 1. Ownership rules

| Domain | Owner of Record | Projects behavior |
|---|---|---|
| Projects | Projects OS | Create/read/update/archive/restore |
| Tasks / Subtasks | Projects OS | Canonical execution records |
| PRD / Requirements | Projects OS | Canonical specification records |
| Outputs | Projects OS | Canonical deliverables |
| Risks / Issues / Decisions | Projects OS | Canonical governance records |
| Work Sessions / Timers | Projects OS | Canonical work-time records |
| Objectives / KRs | OKR domain inside Projects OS | Project links to KR; Objective is derived through KR |
| Meetings | Knowledge OS | Projects reads linked meetings; never creates a parallel Meeting entity |
| Contacts / Team identity | Core / shared identity | Projects stores relationship references |
| Transactions / spend | Finance OS | Projects stores only finance-link/context and read-only snapshots |
| Files | Core/Storage contract | Projects stores references/metadata; storage remains authoritative |
| Weekly Reviews | Projects OS / workspace review domain | Links to projects; not duplicated per project |
| Portfolio | Projects OS projection | Derived from canonical Projects records; no Portfolio entity |

## 2. Relationship Matrix

| From | To | Type | Cardinality | Create behavior | UI behavior | Source of truth |
|---|---|---|---|---|---|---|
| Objective | KR | hierarchy | 1:N | create KR under Objective | choose Objective then KR | OKR |
| KR | Project | shared link | M:N | link existing KR | Project → Goals → Link KR | KR/project_ids |
| Project | Task | ownership | 1:N | create task in project | project is fixed in project context | Projects |
| Task | Task | hierarchy | 1:N | create subtask | parent selector/tree | Projects |
| Project | PRD | ownership | 1:N | create/link PRD | project-scoped picker | Projects |
| Task | PRD Requirement | execution link | N:1 optional | choose project PRD + requirement | requirement picker | Projects |
| Project | Output | ownership | 1:N | create output in project | output form | Projects |
| Task | Output | evidence link | 1:N optional | choose task | task/output backlinks | Projects |
| PRD | Output | evidence link | 1:N optional | choose requirement/PRD | requirement evidence | Projects |
| Project | Risk | ownership | 1:N | create risk | project governance | Projects |
| Risk | Issue | lifecycle | 0..1 active | materialize risk | conversion action | Projects |
| Issue | Task | remediation | M:N | create/link repair task | repair task links | Projects |
| Decision | Risk | impact link | M:N | link affected risks | relationship picker | Projects |
| Decision | Issue | impact link | M:N | link affected issues | relationship picker | Projects |
| Decision | PRD | impact link | M:N | link affected PRDs | relationship picker | Projects |
| Decision | Task | execution link | M:N | link affected tasks | relationship picker | Projects |
| Discovery | PRD | promotion/reference | M:N | promote or link | discovery references | Projects |
| Discovery | Project | promotion/reference | M:N | promote/link | discovery references | Projects |
| Meeting | Project | external reference | M:N | Knowledge supplies project_ref | Project Agenda | Knowledge |
| Meeting | Task | source conversion | 1:N action items | convert each action once | source badge + task link | Knowledge → Projects |
| Project | Finance Project | external integration | 1:1 preferred | link existing/create through Finance contract | Finance tab | Finance |
| Project | Finance transactions | derived reference | 1:N | never create transaction here | spend snapshot only | Finance |
| Project | Contacts | shared link | M:N | link contact | Team & Contacts | Contacts/Core |
| Project | Resources | external reference | M:N | link resource | source badge | Core/Knowledge |
| Project | Weekly Review | reference | M:N | review links projects | review backlink | Reviews |
| Project | Update | ownership | 1:N | create project update | Updates tab | Projects |
| Project | Win | reference | 1:N/M:N | link project/task/output/KR | Wins backlink | Projects |
| Project | Template | source | N:1 | instantiate template | template provenance | Projects |
| Project | Portfolio | projection | derived | never create portfolio record | portfolio filters/KPIs | Projects |

## 3. Relationship guardrails

1. A child execution record must use the same project_id as the project context.
2. Do not duplicate external records locally.
3. Do not create a second transaction store for Finance.
4. Do not create a local Meeting entity in Projects.
5. Do not create a Roadmap entity; Roadmap is a view over Projects.
6. Do not create a Portfolio entity; Portfolio is a view over Projects.
7. Do not make every section link to every other section. Only supported relationship types are exposed by the UI.
8. Cross-project links are allowed only where the matrix says M:N or external reference.
9. Derived values must identify their source and freshness when they come from another OS.
10. Archived/deleted records are excluded from active relationship lists unless an explicit history view requests them.

## 4. Project creation — financial context

Project creation must ask:

- هل للمشروع جانب مالي؟ نعم / لا
- إذا نعم:
  - Finance link: existing Finance project or create/select through Finance
  - planned budget
  - budget currency
  - financial purpose/category (expense, funding, revenue/profit, mixed)
- Projects does not create transaction rows.
- Finance remains the owner of transactions, funding, revenue and spend.
- Projects displays linked Finance status and read-only spend snapshots when the Finance contract is available.

## 5. Global navigation

The global sidebar contains one destination per domain. Governance is one destination with Risks / Issues / Decisions tabs. There must not be separate duplicate navigation destinations for Issues and Decisions.

Portfolio is a derived workspace view. Today, My Work and This Week are derived views over the same canonical Task/Meeting records.

## 6. Project navigation

Project Detail is the connected workspace:

- Overview
- Projects
- Planning: Tasks, PRDs
- Goals: OKR
- Agenda
- Updates
- Delivery: Outputs, Work & Time, Timeline, Related
- Governance: Risks, Issues, Decisions
- Collaboration: People, Activity
- Finance: Finance & Budget

Legacy deep-link tab IDs remain stable.

## 7. External contracts

### Finance

Projects may request:
- linked Finance project identity
- link status
- spend snapshot
- currency
- as_of / source time
- transactions_count
- sync status
- last sync

Projects may send:
- project_id
- project name
- budget context
- requested link/unlink action

Projects must never accept raw transaction ownership.

### Knowledge

Projects may request meetings by project_ref. A Knowledge meeting action item can be selected during Task creation; Projects stores source_ref + source_meeting_id + source_followup_index only. Conversion is idempotent and never creates a local Meeting entity.

### Core

Projects uses workspace identity, membership, permissions and file/storage contracts supplied by Core.

## 8. Acceptance gates

- One global navigation destination per domain.
- Project Detail is the connected workspace.
- Portfolio opens real project-derived data.
- Governance opens Risks/Issues/Decisions from one route.
- Project creation exposes optional Finance context without a parallel transaction table.
- All supported links are navigable in both directions where applicable.
- Create → Reload → Edit → Reload → Archive/Restore → Reload remains valid.
- Cross-workspace privacy is enforced.
- External integrations show source and freshness and fail closed on unavailable permissions/contracts.
