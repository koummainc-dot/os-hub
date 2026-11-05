# Ventures OS — Master Source Gap Audit
Date: 2026-11-05
Source: `VENTURES_OS_BUILD_SPEC_v1 (1).md`

This is the ordered implementation ledger. A feature is marked **DONE** only when the source requirement is represented in code and/or database behavior, not merely mentioned in documentation.

## Phase 0 — verification gates

| Gate | Source requirement | Current status |
|---|---|---|
| V1 | Verify whether platform-integrations is read by Today/Notifications/Calendar | **OPEN** — current integration service exposes write/upsert/cancel contracts; no Ventures read path was verified. |
| V2 | Read Projects records from `workspace_records` | **PARTIAL/DONE for snapshot counts** — Ventures source adapter reads Projects records; full project-page/metrics contract remains. |
| V3 | Read Content OS plan/blob and determine account/platform health storage | **PARTIAL** — Ventures reads authoritative ContentOS `workspace_records`; the full ContentOS platform-plan contract from the source is not yet implemented. |
| V4 | Knowledge project link after #97 | **DONE/PARTIAL** — Knowledge snapshot read/write bridge exists; final UX link contract still needs acceptance coverage. |
| V5 | Projects write RPC for Masterplan import with traceability rules | **OPEN** — no `ventures_import_apply` / `ventures_import_undo` implementation yet. |

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

**This is the next implementation block.**

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
| Metric definition engine (`evalMetric`, aggregation, scorecards, thresholds) | OPEN |
| Weekly Entry screen | OPEN |
| Basic/Full metric toggle | OPEN |
| Paste/Sheets parsing | OPEN |
| No-data vs zero semantics | OPEN |
| Offline metric queue | OPEN |
| Weekly period navigation | OPEN |
| Real two-project weekly entry acceptance | OPEN |

## Phase 3 — projects and Masterplan migration

OPEN:
- Project creation/selection bridge to Projects OS.
- Project subtype/module matrix.
- 27-project CSV batch creation.
- Four-step Masterplan import wizard.
- Dry-run/apply batches.
- Deterministic import IDs and source hashes.
- Conflict resolution where edited user data wins.
- Projects traceability exception handling.
- 14-day undo.
- Private-project `visible_to` inheritance.
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

1. Finish Phase 2 domain metric engine + weekly Entry.
2. Add the real metric RPC client and acceptance tests.
3. Close Phase 0 V1/V3/V5 and the remaining Phase 1 extraction gates.
4. Build Phase 3 project creation + 27-project Masterplan import/undo.
5. Complete Phase 4 Finance/Content blocks.
6. Complete Phase 5 grouped units + Email + Tools.
7. Complete Phase 6 portfolio engine/review/alerts.
8. Complete Phase 7 scorecards and final parity.
9. Full test/build/preview.
10. Merge/deploy only after the above gates pass.

No item is considered closed merely because a generic CRUD table exists.
