# Ventures OS — Original Data Coverage Audit

Date: 2026-11-06
Branch: main (follow-up status)
PRs: #134–#146 (current-main follow-up)

## Audit rule

This audit compares the original Ventures operating model against the current implementation at the data-domain level, not only by screen labels.

Status:
- ✅ = represented in the current Ventures data model/workspace
- 🟡 = represented but the current implementation still needs a stronger persistence/integration/acceptance proof
- 🔴 = known original requirement not yet represented
- ⏸️ = intentionally deferred

## Core project data

| Original requirement | Current status | Notes |
|---|---|---|
| Project ID / code / name | ✅ | Project records are keyed by project_id and support name/code-style identity. |
| Type / subtype | ✅ | Project definition fields are represented. |
| Audience / countries | ✅ | Business profile data is part of project context. |
| Business model | ✅ | Stored as project/business profile data. |
| Revenue sources | ✅ | Revenue/business metrics are represented. |
| Target revenue | ✅ | KPI/threshold layer supports targets. |
| Visits / conversion / EPC / AOV | ✅ | Metric engine supports project performance metrics and derived formulas. |
| Break-even / budget / CAC / valuation / exit | 🟡 | Supported by the business/finance model, but requires field-level persistence acceptance rather than UI-only verification. |

## Finance

| Requirement | Status |
|---|---|
| Revenue / Expense | ✅ |
| Category | ✅ |
| Date | ✅ |
| Currency | ✅ |
| Note | ✅ |
| Project linkage | ✅ |
| Finance write-through from Ventures | 🟡 | The bridge now uses a stable campaign key and the Finance transaction schema fields (`purpose=Regular`, `pnl_effect`, `flow_class`); SQL insert/update/rollback smoke test passed. Authenticated app-level reload and campaign-edit no-duplicate acceptance remain open. |

The current PR explicitly preserves the Projects/Finance source-write contract. A real authenticated create → reload → edit → delete/restore acceptance test is still required.

## SEO / search visibility

| Requirement | Status |
|---|---|
| Keywords | ✅ |
| Volume / KD / CPC | ✅ |
| Intent | ✅ |
| Position / target | ✅ |
| Cluster | ✅ |
| SERP / opportunity / cannibalization | ✅ |
| SEO audit: metadata/content/images/schema/CWV/crawl/index/mobile UX | ✅ |
| GEO market/city/page/URL/keyword/competition/status | ✅ |
| AI search query/engine/mention/citation/recommendation/position | ✅ |
| Competitor traffic/keywords/DR/pages/revenue model/gaps | ✅ |
| Backlinks/source/target/anchor/type/status/authority/first/last seen | ✅ |

## Content / distribution

| Requirement | Status |
|---|---|
| Content records | ✅ |
| ContentOS linkage | ✅ |
| Distribution channel/asset/campaign/audience/status/published_at/URL | ✅ |
| Content workflow / publishing lifecycle | 🟡 |
| Calendar linkage | 🟡 |

The important architectural rule remains: Ventures analyzes and coordinates source systems; it must not silently become a second source of truth for ContentOS.

## Email

| Requirement | Status |
|---|---|
| Campaigns | ✅ |
| Lists | ✅ |
| Flows / automations | ✅ |
| Checks / compliance | ✅ |
| ESP CSV import + mapping | ✅ |
| Duplicate protection via import row hash | ✅ |
| Derived delivery/open/CTR/CTOR/unsubscribe/bounce/spam/conversion/revenue metrics | ✅ |
| A/B winner + reason | ✅ |
| Email Check → Projects Risk/Issue bridge | 🟡 | PR #138 routes checks through a dedicated Projects Risk action and PR #143 adds the validated `A.saveRisk` persistence method; the saved record inherits project visibility and source linkage. Authenticated persistence/reload acceptance remains open. |
| Email → Finance revenue write-through | 🟡 | Schema mismatch and undefined error-variable defects fixed in PRs #139 and #140; database transaction smoke test passed with rollback. Authenticated Finance UI visibility/reload remains unverified. |
| Full lifecycle Create → Reload → Edit → Delete/Restore | 🟡 | UI actions are implemented for all four collections. Supabase JSONB persistence smoke test passed for create/read/edit/read/soft-delete/restore/read across all four collections; temporary QA row was cleaned up. Authenticated browser acceptance is still open. |
| Real ESP same-CSV-twice no-duplicate acceptance | 🟡 | PR #146 extracts the production merge into a pure domain helper and CI tests duplicate hashes within one CSV, the same CSV twice, stable IDs/created_at, updated_at, and preservation of soft-deleted rows. Authenticated UI upload/reload acceptance is still open. |

The lifecycle UI and JSONB persistence mechanism have been implemented and smoke-tested. PR #135 added edit/soft-delete/restore controls; PR #136 fixed campaign metadata preservation; PR #146 extracted and tested the ESP idempotent merge helper and wired it into the real import path; PR #138 repaired the Email Check → Projects Risk route; PRs #139–#140 repaired Finance idempotency and the actual transaction schema contract; PR #142 fixed missing Finance result-event source markers so Ventures can display success/failure acknowledgements. A rolled-back SQL smoke test verified that a Finance transaction can be inserted and updated with the expected schema fields. Authenticated end-to-end UI acceptance remains open. PR #145 and PR #146 are merged to `main`, and CI passed on the resulting merge commits. Production has not received these commits: the connected Vercel team is on Hobby, and the deployment API rejected a new deployment with HTTP 402 (`api-deployments-free-per-day`, retry after 24 hours). No paid upgrade or resource was created. The last verified Production commit remains `21a0a93762289d0bf56e849e67afaf85471bd6a7`.

### Deployment status (2026-11-06)

- Current Vercel team plan: Hobby (free).
- Latest merged code is on GitHub `main` at `3289d231dc3cc0b7d1324b3db3a1d5d6ea03e68b`; main CI passed.
- The latest verified Production deployment still points to the older commit `21a0a93762289d0bf56e849e67afaf85471bd6a7`.
- A new deployment attempt was rejected by Vercel's free daily deployment API limit (HTTP 402; retry after 24 hours). The local environment has no checked-out repository or Vercel CLI, so there is no safe CLI fallback from this session.
- Next free path: allow the 24-hour limit window to reset, then deploy the tested `main` commit using the existing Hobby project/Git integration. Do not upgrade the plan or create paid resources.

## CRO / experiments

| Requirement | Status |
|---|---|
| Affiliate CTR | ✅ |
| CTA CTR | ✅ |
| Table CTR | ✅ |
| Outbound CTR | ✅ |
| Signup | ✅ |
| Revenue/session | ✅ |
| Hypothesis | ✅ |
| Control / variant | ✅ |
| Metric / lift | ✅ |
| Winner / decision / rollback | ✅ |

## Products / monetization

| Requirement | Status |
|---|---|
| Product name / SKU / type | ✅ |
| Price / cost / margin | ✅ |
| URL / status | ✅ |
| Affiliate programs/networks | ✅ |
| Commission / cookie / balance / status | ✅ |

## Portfolio intelligence

| Requirement | Status |
|---|---|
| Performance scorecards | ✅ |
| Threshold/derived metric engine | ✅ |
| Portfolio trend | ✅ |
| Missing-period detection | ✅ |
| Q1–Q5 portfolio questions | ✅ |
| Scale / Fix / Pause / Kill suggestion | ✅ |
| Decision reason / evidence / owner / review date | 🟡 |
| Quarterly review / portfolio call | 🟡 |
| Decision write-through to Projects | 🟡 |

## Operations / governance

| Requirement | Status |
|---|---|
| Team / members / role / responsibility / allocation / status | ✅ |
| Assets | ✅ |
| Tech stack | ✅ |
| KPI target/actual/unit/period/source/status | ✅ |
| Alerts trigger/severity/owner/status/due date | ✅ |
| Priority score/reason/owner/status | ✅ |
| Compliance/security checklist | ✅ |
| Convert compliance item into Risk/Issue | ✅ |

## Original operating model

The intended flow is preserved:

**Portfolio → Venture → Performance → Diagnosis → Decision → Operations**

The current canonical 14-screen workspace is a presentation/navigation layer over that model. It does not replace the underlying domain collections.

## Remaining work before declaring “field-for-field identical”

1. Run a literal field-by-field diff against the original masterplan/source dataset, not a conceptual comparison.
2. Complete authenticated browser acceptance for Email:
   **Create → Reload → Edit → Reload → Soft Delete → Verify hidden → Restore → Reload** across campaigns, lists, flows, and checks. The database-layer JSONB smoke test is complete; this is not a substitute for the authenticated UI test.
3. Verify Finance revenue written from Email is visible from the Finance source system after reload and does not duplicate when a campaign is edited. SQL schema/write smoke test is complete; authenticated UI verification remains open.
4. Run the same ESP CSV twice through the authenticated UI and assert zero duplicate records after reload; deterministic helper tests now pass in CI, but browser upload/reload is still pending.
5. Verify A/B winner and winner_reason persist after reload.
6. Verify Email Check → Projects Risk/Issue persists and remains linked to the originating Email Check.
7. Verify Portfolio Decision → Projects write-through persists and remains traceable.
8. Perform the real two-account ownership/privacy test before calling the system production-complete.

## Important conclusion

The current implementation is **not missing the original Ventures data model at a conceptual level**. The remaining risk is primarily proof of exact field parity and end-to-end persistence/integration. Therefore no new duplicate project-level source-of-truth tables should be introduced merely to satisfy the audit.
