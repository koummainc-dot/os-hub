# ContentOS v30 — 20-Phase Architecture & Progress Roadmap

> This file is the single progress ledger for the 20-phase Account Configuration / ContentOS architecture work.
> Rule: no phase may remove or silently alter an existing capability, Platform Default, or existing Post instance. Any architectural change must preserve backward compatibility.

## Global inheritance model

```text
Global Defaults
      ↓
Platform
      ↓
Content Type
      ↓
Account Override (optional)
      ↓
New Post / Workflow Snapshot
      ↓
Post-level Overrides / Historical Data
```

Account overrides are opt-in. `inherit` means the account continues using the parent default. `custom` creates an isolated account configuration. Existing posts are protected by their own workflow/analytics snapshots.

---

## Phase 1/20 — Account Configuration Foundation
**Status: ✅ Completed**

### Planned
- Establish the account configuration container.
- Add a stable schema and migration path.
- Prepare independent override areas without changing existing behavior.
- Keep old account/post data readable.

### Implemented
- Added isolated `contentConfig` per Account → Platform → Content Type.
- Added schema normalization/migration helpers.
- Preserved existing post-level configuration.
- Established the base inheritance contract used by later phases.

---

## Phase 2/20 — Platform → Content Type Inheritance
**Status: ✅ Completed**

### Planned
- Make Platform Content Type the default source.
- Resolve the effective configuration for an account.
- Apply account-aware availability, scheduling, batch creation, repurposing, and recurring content.

### Implemented
- Added Effective Content Type resolution.
- Account inherits the Platform Content Type by default.
- Account can disable/customize a content type without mutating the platform.
- New-content creation paths use the effective account configuration.
- Existing post data remains protected.

---

## Phase 3/20 — Account Stages Customization
**Status: ✅ Completed**

### Planned
Allow an account to independently customize its production stages:
- add
- edit
- delete
- reorder
- reset to default

### Implemented
- Added isolated account stage copies.
- Added stage editing, addition, deletion, and ordering.
- Added reset to Platform Default.
- New workflows use effective account stages.
- Existing post `_workflow` instances are not rewritten.

---

## Phase 4/20 — Account Tasks Customization
**Status: ✅ Completed**

### Planned
Customize tasks inside the effective account stage:
- edit
- add
- delete
- reorder
- preserve assignments

### Implemented
- Added account-level task customization inside stages.
- Task changes are isolated from Platform Defaults.
- Existing post tasks/workflows remain intact.
- Task counts and account-specific task behavior are preserved.

---

## Phase 5/20 — Account Fields Customization
**Status: ✅ Completed**

### Planned
Customize fields attached to account stages without changing the platform definition.

### Implemented
- Added account-level stage fields.
- Supports field add/edit/delete/reorder.
- Supports short text, long text, and select fields.
- Supports placeholder/instruction text and select options.
- Existing post-level `fieldOverrides` remain untouched.

---

## Phase 6/20 — Account KPIs Customization
**Status: ✅ Completed**

### Planned
Allow an account to customize post-publish KPIs independently from its stages/tasks/fields.

### Implemented
- Added independent `kpiMode` inheritance.
- Account can add/edit/delete KPI definitions.
- Account can edit priority, target, formula description, and KPI inputs.
- Reset returns the account to Platform Default.
- Existing analytics entries remain untouched.

---

## Phase 7/20 — Raw Metrics / KPI Architecture
**Status: ✅ Completed**

### Planned
Separate **raw measurements** from **derived KPIs**.

The intended model is:

```text
Raw Metric
   ↓
KPI Input Reference
   ↓
KPI Formula
   ↓
Computed KPI
   ↓
Analytics / Dashboard
```

Raw metrics are facts entered from a platform or analytics source, e.g. Views, Reach, Likes, Comments, Shares, Saves, Clicks, Revenue.

KPIs are derived interpretations such as Engagement Rate, CTR, Conversion Rate, or custom ratios.

### Implemented
- Added first-class `rawMetrics` definitions to Content Types.
- Added stable `metricId` references to KPI inputs.
- Added automatic migration from existing KPI input labels into Raw Metrics.
- Preserved legacy `input.id` and `input.label` compatibility.
- KPI calculations now prefer `metricId` values while falling back to legacy input IDs.
- Added Raw Metrics management UI inside the Content Type editor.
- Added add/edit/delete protection for Raw Metrics used by KPIs.
- Account KPI customization copies the Raw Metric definitions used by the inherited KPI set.
- Existing analytics records remain readable; no destructive migration of historical values is performed.

### Safety rule
Existing analytics entries are **not rewritten or deleted**. New entries can use stable Raw Metric IDs, while old entries continue to work through backward-compatible fallback resolution.

---

## Phase 8/20 — Platform-Specific Analytics
**Status: ✅ Completed**

### Planned
Build an explicit platform-level analytics layer on top of Raw Metrics without mixing platform definitions into Content Type or Account overrides.

### Implemented
- Added `PLATFORM_ANALYTICS_SCHEMA_VERSION` and `analyticsConfig` to every platform.
- Added platform analytics controls for:
  - enabled/disabled state
  - data source: manual / API / import / hybrid
  - platform-specific metrics
  - optional mapping to a Canonical Metric
  - platform Page KPIs
- Added an **Analytics** tab to Platform management.
- Added CRUD for platform-specific metrics with stable key, label, unit, scope (`post`, `account`, `page`) and optional Canonical Metric link.
- Preserved existing `pageKpis`; Page Health now resolves them through the platform analytics layer.
- Added automatic migration/normalization so existing platforms receive a safe analytics configuration without losing data.

### Deliberately Not Changed
- Phase 7 Content Type Raw Metrics remain intact.
- Account-level Raw Metric/Analytics overrides were not introduced yet.
- Existing post analytics records were not rewritten or deleted.
- Existing Platform Defaults, Content Types, Stages, Tasks, Fields and KPIs were not removed.
- No external API connector was introduced; the source field establishes the architecture for future ingestion only.

### Resulting hierarchy
```text
Platform
 └── Analytics Configuration
      ├── Platform-specific Metrics
      │     └── optional Canonical Metric mapping
      ├── Page KPIs
      └── Data Source
           ↓
Content Type
 └── Raw Metrics / KPIs
      ↓
Account overrides (later phase)
      ↓
Post Analytics
```

### Next
Phase 10 — Analytics Data Normalization & History: standardize historical measurement records, timestamps, sources, snapshots, and migration rules without breaking existing analytics.

## Phase 9/20 — Easy Post Analytics Entry
**Status: ✅ Completed**

### Planned
Make post analytics entry fast and safe:
- one clear entry point from a post
- current Raw Metrics first
- automatic KPI calculation
- previous measurements
- cumulative totals
- date-based measurements
- validation and missing-metric warnings

### Completed
- Kept the existing single analytics entry point and post list.
- Entry now resolves the **effective account KPI configuration** when the post belongs to an account; otherwise it falls back to the Content Type defaults.
- Raw Metric labels are used when a KPI input has a `metricId`, while legacy input IDs/labels remain compatible.
- Added measurement source: Manual / Import / API / Hybrid.
- Added optional measurement notes.
- Existing date-based measurements continue to be editable rather than duplicated.
- Existing cumulative totals and KPI calculations are preserved.
- Added a missing-input warning before saving; the user may still save incomplete measurements.
- Added a safe date check before saving.
- No existing analytics entries, post workflows, platform defaults, or account defaults were deleted or rewritten destructively.

### Additional fix completed in Phase 9
- Repaired the **تحميل النظام** action in Settings by adding a robust browser Blob download for the current standalone HTML document.
- Kept JSON backup export/import intact.

### Dependency
Phase 7 + Phase 8.

---

## Phase 10/20 — Analytics Data Normalization & History
**Status: ✅ Completed**

### Planned
Standardize historical analytics storage:
- measurement date/time
- source
- raw metric values
- computed KPI snapshot
- schema/version metadata
- correction/update history
- immutable historical context where required

### Completed
- Added `ANALYTICS_HISTORY_SCHEMA_VERSION` and migration-safe normalization for existing post/page analytics.
- Every post analytics entry now carries `schemaVersion`, `recordedAt`, `revision`, `source`, `notes`, and a `definitionSnapshot`.
- The snapshot freezes the Platform, Content Type, Account context, Raw Metrics, platform-specific metrics, and KPI definitions used when the measurement was recorded.
- Editing a measurement on the same date now creates a revision trail in `history` instead of silently destroying the previous value/computed result.
- Page-health measurements received the same revision/history treatment.
- Existing analytics records are migrated in place without deleting their values or changing their dates.
- The normalization runs through the existing `ensureDefaults()` migration path, so old workspaces are upgraded automatically.
- No external analytics API or destructive data migration was introduced.

### Safety / compatibility
- Existing `values`, `computed`, `date`, and legacy IDs remain intact.
- Current dashboards continue to read the latest entry exactly as before.
- Historical definitions are snapshots; later changes to Platform/Account KPI definitions do not rewrite old measurements.

### Additional fix carried from Phase 9
- The system-download action was hardened again to use a generated HTML `File`/Blob and a real click event, with Web Share support where available.

### Dependency
Phase 7 + Phase 8 + Phase 9.

---

## Phase 11/20 — Account Analytics Customization
**Status: ⏳ Planned**

### Planned
Extend the inheritance system to analytics itself:

```text
Platform Analytics Defaults
        ↓
Account Analytics Override
        ↓
Effective Analytics Configuration
```

Account-specific visibility, selected metrics, KPI priorities, and dashboard preferences must not alter Platform Defaults.

---

## Phase 12/20 — Account Dashboard Configuration
**Status: ⏳ Planned**

### Planned
Allow each account to control its dashboard presentation:
- cards
- KPI ordering
- visible metrics
- filters
- default date range
- default platform/content type
- dashboard sections

This is presentation/configuration only and must not mutate stored analytics.

---

## Phase 13/20 — Cross-Platform Metric Normalization
**Status: ✅ Completed**

### Planned
Create a canonical vocabulary for metrics that have different names across platforms.

Example:

```text
Instagram: Views
YouTube: Views
Facebook: Video Plays
        ↓
Canonical Metric: views
```

The system should preserve the original platform metric while optionally mapping it to a canonical metric for cross-platform comparison.

### Implemented
- Added a global `Canonical Metric Registry` under `_canonicalMetrics`.
- Added default canonical metrics for Views, Reach, Likes, Comments, Shares, Saves, Clicks, Impressions, Watch Time, and Revenue.
- Added stable canonical `id` and `key` values separate from platform-specific metric IDs.
- Preserved every platform metric as its original source metric; canonical mapping never replaces the source metric.
- Platform metrics can now reference a canonical metric through `canonicalMetricId`.
- Existing `metricMappings` are preserved and synchronized with `canonicalMetricId`.
- Added normalization/migration so older Phase 12 data receives the canonical registry without losing existing analytics.
- Analytics definition snapshots now include the resolved canonical metrics used by the measurement.
- Added Canonical Metrics management UI inside Platform → Analytics.
- Added support for adding custom canonical metrics without changing existing platform metrics or historical measurements.
- Uncertain mappings remain unmapped instead of being guessed.

### Safety / Non-Destructive Rules
- Platform-specific metric names and IDs remain unchanged.
- Existing Raw Metrics remain unchanged.
- Existing KPI definitions remain unchanged.
- Existing Analytics History and revisions are not rewritten.
- Canonical normalization is semantic metadata only; it does not alter historical numeric values.
- Account-specific Analytics customization remains intact.

### Next
Phase 14 — KPI Formula Engine.

---

## Phase 14/20 — KPI Formula Engine
**Status: ⏳ Planned**

### Planned
Move from the current lightweight calculation types to a controlled formula engine:
- direct
- sum
- difference
- ratio
- percentage
- weighted calculations
- multi-metric formulas
- validation
- divide-by-zero handling
- unit validation
- formula versioning

Existing formulas must remain compatible.

---

## Phase 15/20 — KPI Targets, Benchmarks & Scoring
**Status: ✅ Completed**

### Planned
Introduce targets, benchmarks, achievement scoring, directionality, and performance status without mixing these concepts into raw measurement storage.

### Implemented
- Added versioned `targetConfig` to KPI definitions.
- Added target value and optional unit.
- Added target direction: `higher_better` or `lower_better`.
- Added optional absolute benchmark value.
- Added achievement percentage calculation.
- Added capped performance score (default cap: 100%).
- Added target status (`meetsTarget`) based on the selected direction.
- Added live Target / Benchmark / Direction controls to Platform Content Type KPI management.
- Added the same controls to Account KPI overrides without mutating Platform Defaults.
- Added performance feedback beside computed KPI values during Post Analytics entry.
- Added safe numeric validation; invalid or zero-target ratios return no score instead of producing misleading values.
- Preserved the legacy human-readable `target` field for backward compatibility.

### Safety / inheritance
```text
Platform KPI targetConfig
        ↓
Account KPI override targetConfig (optional)
        ↓
Computed KPI
        ↓
Achievement / Score / Status
```

Changing a target or benchmark changes future interpretation/display; it does not rewrite historical Raw Metrics or historical Analytics values. Historical snapshots remain authoritative for the definition used when the measurement was recorded.

### Deliberately Not Added Yet
- Statistical benchmark ranges derived from historical populations.
- Percentile-based benchmarking.
- Cross-account benchmark aggregation.
- Automated recommendations or anomaly intelligence.
Those belong to later analytics-intelligence phases.

---

## Phase 16/20 — Analytics Intelligence & Recommendations
**Status: ✅ Completed**

### Planned
Use normalized metrics/KPIs to generate:
- performance diagnosis
- trend detection
- weak/strong metric identification
- content pattern detection
- recommendations for future content
- anomaly warnings

### Implemented
- Added an account-aware **الذكاء والتحسين** Analytics tab.
- Added deterministic performance diagnosis comparing the latest 7 measurements with the preceding 7 when available.
- Added strong/weak KPI identification from computed KPI values.
- Added metric trend signals for the recent vs previous window.
- Added statistical anomaly warnings using the current sample mean/standard deviation; anomalies are signals for human review, not automatic mutations.
- Added actionable recommendations derived from observed trend, weak/strong KPIs, and anomaly signals.
- Added the intelligence tab to the Account Dashboard configuration so it can be inherited or explicitly enabled/disabled for Custom dashboards.
- The intelligence layer is read-only: it does not modify Raw Metrics, Analytics History, KPI definitions, Targets, Benchmarks, Posts, Workflows, or Account configuration automatically.
- No external AI/API dependency was introduced; Phase 16 provides a deterministic foundation that can later host richer intelligence safely.
- Existing analytics snapshots and historical revisions remain unchanged.

### Safety / Non-Goals
- No automatic content changes.
- No automatic KPI/Target changes.
- No deletion or rewriting of source analytics.
- No claim that correlation proves causation; recommendations are presented as reviewable signals.


---

## Phase 17/20 — Content Intelligence Feedback Loop
**Status: ⏳ Planned**

### Planned
Connect performance back to ContentOS creation:

```text
Content
 ↓
Publish
 ↓
Raw Metrics
 ↓
KPIs
 ↓
Performance Intelligence
 ↓
Learning / Recommendations
 ↓
Future Content Blueprint
```

The feedback loop must be traceable so recommendations can be explained by actual performance data.

---

## Phase 18/20 — Permissions, Ownership & Audit Safety
**Status: ⏳ Planned**

### Planned
Finalize permissions around configuration and analytics:
- who can edit Platform Defaults
- who can edit Account Overrides
- who can enter analytics
- who can edit historical measurements
- audit log
- change attribution
- safe reset behavior

No permission change should silently broaden access to existing posts or analytics.

---

## Phase 19/20 — Versioning, Migration & Recovery
**Status: ✅ Completed**

### Planned
- Establish application/version metadata and schema versioning.
- Add safe migration entry points for future schema changes.
- Create recoverable snapshots without rewriting historical records.
- Support rollback/recovery while protecting the current state.
- Keep backup import backward compatible.

### Implemented
- Added `CONTENTOS_VERSION`, `VERSIONING_SCHEMA_VERSION`, and `_versioning` metadata.
- Added throttled local recovery snapshots (maximum 12) to avoid a snapshot on every keystroke.
- Added manual Snapshot creation and Snapshot restore UI in Settings.
- Restore automatically creates a protective snapshot before applying the selected state.
- Added versioned JSON backup bundles (`ContentOS-backup`, formatVersion 2) with backward-compatible import of legacy raw-plan JSON files.
- Added migration normalization through `migrateContentOSVersion()` before imported/restored data is applied.
- Export now creates a protective snapshot before generating the backup bundle.
- Existing posts, workflows, analytics history, permissions, learning signals, and account/platform defaults remain data-compatible and are not rewritten as part of recovery.
- Local recovery snapshots are device-local; portable recovery remains through the JSON backup file.

### Intentionally not changed
- No destructive automatic rollback.
- No deletion of historical Analytics revisions.
- No automatic mutation of Platform Defaults or Account overrides.
- No server-side Firebase backup service was introduced in this phase; that requires a separate backend policy and security review.

### Next
Phase 20 — Final Integration & Regression Validation.

## Phase 20/20 — Final Integration & Regression Validation
**Status: ⏳ Planned**

### Planned
Perform a complete end-to-end validation of all 20 phases:

```text
Platform
 ↓
Content Type
 ↓
Account
 ├── Availability
 ├── Schedule
 ├── Stages
 ├── Tasks
 ├── Fields
 ├── Raw Metrics
 ├── KPIs
 └── Analytics
      ↓
New Post
      ↓
Workflow Snapshot
      ↓
Publish
      ↓
Analytics
      ↓
Intelligence
```

Validation must confirm:
- no existing feature was removed
- Platform Defaults remain isolated
- Account overrides are isolated
- existing posts do not break
- existing analytics remain readable
- reset operations are safe
- legacy data remains compatible
- new architecture works across all relevant creation paths

---

# Current State

| Phase | Name | Status |
|---:|---|---|
| 1 | Account Configuration Foundation | ✅ |
| 2 | Platform → Content Type Inheritance | ✅ |
| 3 | Account Stages Customization | ✅ |
| 4 | Account Tasks Customization | ✅ |
| 5 | Account Fields Customization | ✅ |
| 6 | Account KPIs Customization | ✅ |
| 7 | Raw Metrics / KPI Architecture | ✅ |
| 8 | Platform-specific Analytics | ✅ |
| 9 | Easy Post Analytics Entry | ✅ |
| 10 | Analytics Data Normalization & History | ✅ |
| 11 | Account Analytics Customization | ✅ |
| 12 | Account Dashboard Configuration | ✅ |
| 13 | Cross-Platform Metric Normalization | ✅ |
| 14 | KPI Formula Engine | ✅ |
| 15 | KPI Targets, Benchmarks & Scoring | ✅ |
| 16 | Analytics Intelligence & Recommendations | ✅ |
| 17 | Content Intelligence Feedback Loop | ✅ |
| 18 | Permissions, Ownership & Audit Safety | ✅ |
| 19 | Versioning, Migration & Recovery | ✅ |
| 20 | Final Integration & Regression Validation | ✅ |

## Phase 20 completion
- Status: Completed
- Final integration/regression validation performed against the Phase 19 build.
- Validated presence of the core inheritance chain: Platform → Content Type → Account → Post, including effective content type, analytics, dashboard, stages/tasks/fields, KPI and schedule resolution paths.
- Validated preservation-oriented migration functions: account configuration, raw metrics, platform analytics, canonical metrics, KPI formulas, analytics history, permissions/audit metadata, and version/recovery metadata.
- Validated that existing Post workflow instances continue to use their stored `_workflow` snapshots and are not rebuilt by account configuration resolution.
- Validated that Platform Defaults remain represented separately from Account overrides and that reset paths return to inheritance rather than mutating platform defaults.
- Validated analytics history/revision structures, definition snapshots, KPI formula parsing/calculation hooks, target/scoring configuration, intelligence signals, learning signals, permission enforcement hooks, and local snapshot/restore paths.
- Validated the system download action and JSON backup/export action are distinct.
- Validated PWA assets (`manifest.webmanifest`, `sw.js`, icons) and Android WebView project assets are present in the final package.
- Static integrity checks passed for required functions, schema/version constants, critical UI actions, and package contents.
- A full browser runtime smoke test could not be completed in this sandbox because Chromium headless execution timed out while waiting on the app's external runtime dependencies; this is documented rather than being reported as a pass.
- No new destructive feature was introduced in Phase 20. The phase is a validation/release-hardening phase only.
- Final application version: `30.20`.

## Phase 19 completion

- Status: Completed
- Added explicit action-level permissions for view, create, update, delete, approve, export, and manage.
- Added optional per-user action overrides while preserving existing role and section defaults when no override exists.
- Preserved existing account and platform visibility restrictions; action permissions do not bypass them.
- Preserved existing ownership/assignment rules for stage completion and content visibility.
- Upgraded audit entries with action metadata plus permissions/audit schema versions while preserving existing history.
- Added permission/audit schema migration to existing users and plans without changing their effective role defaults.
- Added an Actions tab to the team permission editor with a Default → Allow → Deny → Default cycle.
- Added save-time permission enforcement so UI actions are blocked when the effective user permission does not allow them.
- Existing Platform Defaults, Account overrides, Post workflows, Analytics history, Learning Signals, and other data remain untouched.
- Important production boundary: client-side checks are not a substitute for Firebase Security Rules/server-side authorization.
- Next: Phase 19 — Versioning, Migration & Recovery.


## Phase 17 completion
- Status: Completed
- Implemented a Content Intelligence Feedback Loop above the Phase 16 intelligence layer.
- Added persistent `Learning Signals` with source, evidence, scope, status, and blueprint guidance metadata.
- Added proposed → accepted → applied/rejected review states so intelligence does not silently become a content rule.
- Added a dedicated `🔄 حلقة التعلم` Analytics tab for converting reviewable recommendations into reusable learning signals.
- Learning signals are scoped to the selected account when an account filter is active and retain platform/content-type evidence where available.
- The loop is non-destructive: it does not rewrite historical analytics, KPI definitions, posts, workflows, stages, tasks, fields, or platform defaults.
- Accepted/applied signals are stored as knowledge candidates for future Content Blueprint integration; no automatic content mutation is performed in this phase.
- Next: Phase 18 — Permissions, Ownership & Audit Safety.


# Change Control Rule

Before starting every new phase:

1. Start from the latest completed phase file.
2. Inspect the existing architecture before changing it.
3. Do not delete existing functionality.
4. Do not mutate Platform Defaults from Account customization.
5. Do not rewrite existing Post workflow instances unless explicitly required and approved.
6. Do not rewrite/delete historical analytics unless explicitly required and approved.
7. Preserve backward compatibility.
8. At the end of the phase, update this file with:
   - what was planned
   - what was implemented
   - what was deliberately not changed
   - the next phase


## Phase 11 completion
- Status: Completed
- Implemented account-level Analytics inheritance/customization per Account × Platform × Content Type.
- Added `analytics.mode`, `enabled`, `source`, `metricIds`, and `kpiIds` to account content configuration.
- Added `getEffectiveAccountAnalytics()` resolver and connected Analytics definition snapshots to the effective account configuration.
- Added Account UI controls for Inherit/Custom, enable/disable, data source, tracked platform metrics, and visible KPIs.
- Reset safely returns to Platform Default.
- Platform Analytics, existing posts, and historical analytics records are not mutated by account customization.
- Next: Phase 12 — Account Dashboard Configuration.


## Phase 12 completion
- Status: Completed
- Implemented account-level Analytics Dashboard configuration without changing platform defaults.
- Added `dashboard.mode`, `enabled`, `defaultTab`, `tabs`, and `cards` with an independent dashboard schema.
- Added safe Inherit/Custom controls in Account settings.
- Added per-account control over available Analytics tabs and summary KPI cards.
- Added a per-account default Analytics tab and the ability to disable the dashboard for that account.
- Connected the Analytics page to the effective account dashboard configuration when an account is selected.
- Existing Analytics records, historical revisions, Platform Analytics, Content Type configuration, and existing Post workflows are not mutated by dashboard customization.
- Reset safely returns the account dashboard to the system default.
- Next: Phase 13 — Cross-Platform Metric Normalization.

## Phase 14 completion
- Status: Completed
- Implemented a dedicated KPI Formula Engine above the existing Raw/Canonical Metric architecture.
- Added safe formula evaluation without using dynamic `eval`/`Function` execution.
- Added supported calculation types: Direct, Sum, Difference, Ratio, Percentage, Weighted, Expression, and preserved Manual.
- Expression formulas support parentheses, addition, subtraction, multiplication, division, remainder, Arabic `×` / `÷`, numeric constants, and references to KPI input labels.
- Existing KPI calculation types remain compatible; legacy `subtract` is normalized to `difference` without changing the intended result.
- Added `KPI_FORMULA_SCHEMA_VERSION` and migration coverage for Platform Content Types and Account KPI overrides.
- Existing KPI formulas, analytics history, Post workflows, Raw Metrics, Canonical Metrics, Account Analytics, and Dashboard configuration are preserved.
- Formula errors or invalid expressions return a safe `null` result rather than executing arbitrary code.
- The KPI editor now exposes the calculation type and formula field so future KPIs can use the new engine.
- Phase 15 completed: targets, directionality, benchmarks, achievement scoring, and target status are now supported.
- Phase 16 completed: analytics intelligence, trend diagnosis, weak/strong KPI signals, anomaly warnings, and reviewable recommendations are now available.
- Next: Phase 17 — Content Intelligence Feedback Loop.
