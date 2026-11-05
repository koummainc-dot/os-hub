# Ventures OS — Master Source Gap Audit
Date: 2026-11-05
Source: `VENTURES_OS_BUILD_SPEC_v1 (1).md`

This is the ordered implementation ledger. A feature is marked **DONE** only when the source requirement is represented in code and/or database behavior, not merely mentioned in documentation.

## Phase 0 — verification gates

| Gate | Source requirement | Current status |
|---|---|---|
| V1 | Verify whether platform-integrations is read by Today/Notifications/Calendar | **CLOSED — NEGATIVE**. No verified read dependency exists; Ventures remains on in-app alerts until a platform read contract is intentionally added. |
| V2 | Read Projects records from `workspace_records` | **CLOSED for the current read boundary** — Ventures source adapter reads authoritative Projects records; project-specific migration/metrics work remains Phase 3. |
| V3 | Read Content OS plan/blob and determine account/platform health storage | **PARTIAL** — authoritative ContentOS reads exist, but the source-defined plan/blob + `_pageHealth` runtime contract is not yet verified. |
| V4 | Knowledge project link after #97 | **PARTIAL** — Projects lookup/external-link validation exist; final Ventures→Knowledge UX acceptance remains. |
| V5 | Projects write RPC for Masterplan import with traceability rules | **CLOSED — server boundary implemented**. `ventures_import_apply/undo` now enforce Ventures+Projects edit access, record traceability decisions, preserve visibility, and support 14-day optimistic-concurrency undo. Full wizard/UI remains Phase 3. |

## V6 — website/email platform gate

| Gate | Source requirement | Current status |
|---|---|---|
| V6 | Verify `website` platform id reaches ContentOS category/runtime path | **PARTIAL** — literal `website` seed exists in Ventures config, but runtime ContentOS acceptance is still missing. |

## Phase 1 — foundation

| Requirement | Status |
|---|---|
| First-class Ventures OS registration | DONE |
| Sensitive system / workspace permissions | DONE |
| Core workspace storage | DONE |
| Demo/fallback loading | DONE |
| Collection-section registration | DONE for the current implemented collections |
| 29 Masterplan units represented | DONE at navigation/data-model level; current shell also exposes Settings |
| Source-of-truth boundaries | DONE |
| Import/export foundation | DONE |
| RLS smoke coverage | DONE |
| Save failure/conflict cache rollback | DONE |
| Extracted reusable CSV/KPI engines | OPEN |
| Final phase-1 gate tests | OPEN |

## Phase 2 — metrics and weekly tracking

**Phase 2 implementation is substantially complete; hosted acceptance remains open.**

| Requirement | Status |
|---|---|
| `ventures_metric_values` relational table | **DONE — just added** |
| `ventures_sku_period_values` | **DONE — just added** |
| `ventures_counters` | **DONE — just added** |
| RLS for ops/fin separation | **DONE — just added** |
| `ventures_metrics_upsert` batch + optimistic versioning | **DONE — just added** |
| `ventures_metrics_get` | **DONE — just added** |
| `ventures_sku_upsert` | **DONE — just added** |
| `ventures_next_code` | **DONE — just added** |
| Metric definition engine (`evalMetric`, aggregation, scorecards, thresholds) | **PARTIAL/DONE** — source-aligned metric definitions and formula evaluation added; exact portfolio decision formulas remain Phase 6. |
| Weekly Entry screen | **DONE/PARTIAL** — source-aligned basic/full grid, period navigation, copy previous week, no-data semantics, atomic save, derived read-only values, CSV export. |
| Basic/Full metric toggle | **DONE** |
| Paste/Sheets parsing | **DONE/PARTIAL** — shared delimited parser, Arabic/Hindi numerals, Arabic decimal separator, TSV/CSV paste and 500-row validation added. |
| No-data vs zero semantics | **DONE** |
| Offline metric queue | **DONE/PARTIAL** — persistent queue now has automatic online/interval replay; hosted acceptance still required. |
| Weekly period navigation | **DONE** |
| Real two-project weekly entry acceptance | **OPEN** — requires hosted authenticated acceptance run. |

## Phase 3 — projects and Masterplan migration

OPEN:
- Project creation/selection bridge to Projects OS.
- Project subtype/module matrix.
- 27-project CSV batch creation.
- Four-step Masterplan import wizard. **DONE/PARTIAL — integrated into Projects OS with File → Review → Dry Run/Execution → Report/Undo.**
- Dry-run/apply batches. **DONE/PARTIAL — local dry-run validation plus V5 RPC execution in 200-record resumable batches.**
- Deterministic import IDs and source hashes. **DONE/PARTIAL — deterministic browser-safe IDs/source metadata; full source-hash parity remains to verify.**
- Conflict resolution where edited user data wins.
- Projects traceability exception handling.
- 14-day undo. **DONE — server boundary implemented and exposed by wizard.**
- Private-project `visible_to` inheritance. **DONE/PARTIAL — importer carries visibility and V5 preserves it; full multi-user acceptance remains open.**
- Project status transition effects for Scale/Fix/Pause/Kill.
- Full MP-01…MP-30 acceptance coverage.

## Phase 4 — money and content

PARTIAL:
- Finance source adapter and write-through exist.
- Content source adapter and write-through exist.

OPEN:
- Project finance block with Finance-derived metrics.
- Finance category → Ventures metric mapping.
- Manual finance entry only where Finance is unavailable.
- Content account/platform health contract.
- Website platform integration and CW-01…CW-08 acceptance coverage.

## Phase 5 — units

PARTIAL:
- CRUD schemas exist for most units.

OPEN:
- SEO five-unit UX as one grouped screen.
- 40-item SEO checklist seeding.
- Competitor summary cards/calculations.
- Backlink pipeline states and summary cards.
- Product SKU generator and product-type behavior.
- Affiliate contact linkage and balance/commission behavior.
- Compliance/security conversion to Projects risks/issues.
- Full email subsystem from §18:
  - email_campaigns
  - email_lists
  - email_flows
  - email_checks
  - derived delivery/open/CTR/CTOR/unsubscribe/bounce/conversion/RPR metrics
  - ESP CSV mapping/idempotency
  - delivery/expiry alerts
- UTM builder.
- SKU builder.
- Analytics event dictionary.
- Full tools screen.

## Phase 6 — portfolio decisions

OPEN:
- Decision metric engine.
- Threshold states.
- Q1–Q5 portfolio questions.
- Suggestion-only decision engine.
- portfolio_calls lifecycle.
- Scale/Fix/Pause/Kill effects.
- Quarterly review wizard.
- Alert engine V-A1…V-A13.
- Notification dedupe/snooze.
- Portfolio charts and missing-week counter.
- PF-01…PF-32 acceptance coverage.

## Phase 7 — scorecard completeness

OPEN:
- App scorecard A01–A03.
- Ground-business O01/O02 scorecards.
- POD/digital/store variants.
- Unified UTM/SKU/events tools.
- Portfolio exports.
- Remaining acceptance tests and full source parity.

## Cross-cutting source requirements still open

- 14-screen IA matching the source (dashboard, entry, projects, money, channels, email, SEO, growth, catalog, compliance, decisions, tools, import, settings).
- Source-specific buttons and empty/loading/error/offline states.
- Project-specific tab visibility by kind/subtype/modules_override.
- Private-project visibility inheritance.
- Full offline queue behavior.
- Source-defined CSV import/export behavior.
- Complete demo seed for every screen.
- Complete acceptance test matrix MP-01…30, PF-01…32, X-01…15, VN-01…15, EM-01…10, CW-01…08.

## Current execution order

1. Finish Phase 2 hosted acceptance: two-project weekly entry + real offline replay.
2. Phase 0 gate decisions are documented; V5 remains the blocker for Phase 3 and V3/V6 remain runtime integration gaps.
3. Phase 3.1 **DONE/PARTIAL**: deterministic Masterplan JSON validation/conversion planner + mapping/idempotency tests are now implemented. Next: wire the approved 4-step UI into Projects OS and connect Dry Run → V5 RPC batches.
4. Build Phase 3 project creation + 27-project Masterplan import/undo.
7. Complete Phase 4 Finance/Content blocks.
8. Complete Phase 5 grouped units + Email + Tools.
9. **Phase 6 PARTIAL:** portfolio engine, decision approval bridge, and quarterly review are now implemented; next is full alert lifecycle + PF-01…PF-32.
10. **Phase 6 PARTIAL:** alert lifecycle V-A1…V-A13 now has persisted dedupe/snooze/dismissal handling in the portfolio workspace. Remaining: full alert source coverage validation, portfolio charts, missing-week counter, and PF-01…PF-32.
11. Full test/build/preview.
12. Merge/deploy only after the above gates pass.

No item is considered closed merely because a generic CRUD table exists.


## 2026-11-05 execution note

- Portfolio-first UX was rebuilt in PR #128 and is now the primary Ventures workspace.
- The next portfolio-engine slice was implemented on branch `feat/ventures-portfolio-engine`: scorecard evaluation now uses source metric definitions, Q1–Q5 are surfaced, and suggestion-only decision logic is connected to the workspace.
- Proposed decisions are recorded from the project diagnosis without automatically changing Projects status.
- A dedicated contract test `tests/t_ventures_portfolio_engine.mjs` was added.
- Vercel preview for commit `c2bb9a8084438a0f913aab902d48ef92649fd75c` reached READY: `os-f9vrdx3gj-koumma.vercel.app`.
- Full CI remains blocked by pre-existing Projects/ContentOS harness failures (`ReferenceError: A is not defined`); these failures are outside the Ventures diff and must be repaired separately before treating the whole repository CI as green.


- PR #129 merged to `main` at `67112aebf6609304b30a95694cbdc0209109fb09`.
- Decision lifecycle now captures reason, evidence snapshot, next review date, owner, follow-up-task preference, validates the Projects transition with `canApplyCall`, and sends an `apply_ventures_decision` bridge event to Projects after approval.
- Quarterly review is surfaced in Decisions with a current-quarter summary and CSV export.
- Production deployment of the merged commit is currently blocked by Vercel's free deployment quota (`api-deployments-free-per-day`); no paid environment/plan was created.


- PR #130 merged to `main` at `5f7a1534a7126169f9ae3323d2d5555429966087`.
- Alerts now reconcile source-generated V-A1…V-A13 keys into persisted `venture_alerts`, dedupe by alert key, support 7-day snooze and dismissal, and derive V-A1 missing-week and V-A9 overdue-review context from current Ventures data.
- Production deployment remains deferred because Vercel free deployment quota is exhausted; no paid environment was created.


- PR #131 merged to `main` at `c9ac8d2fa649894ff98559bd7933a233b83b1d20`.
- Final portfolio slice implemented: revenue trend visualization, 3-day missing-week counter, project scorecards, and aggregation contract tests.
- Phase 6/7 implementation work is complete for the currently source-backed portfolio scope. Remaining external integrations/paid infrastructure are deferred per the master plan.
