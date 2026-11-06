# Ventures OS — Original Data Coverage Audit

Date: 2026-11-06
Branch: main (follow-up status)
PRs: #134, #135, #136

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
| Email Check → Projects Risk/Issue bridge | 🟡 | PR #138 routes checks through a dedicated Projects Risk action and PR #143 adds the real validated `A.saveRisk` persistence method (the prior generic `A.put` call did not exist); the saved record inherits project visibility and source linkage. Authenticated persistence/reload acceptance remains open. Authenticated persistence/reload acceptance remains open. |
| Email → Finance revenue write-through | 🟡 | Schema mismatch and undefined error-variable defects fixed in PRs #139 and #140; database transaction smoke test passed with rollback. Authenticated Finance UI visibility/reload remains unverified. |
| Full lifecycle Create → Reload → Edit → Delete/Restore | 🟡 | UI actions are implemented for all four collections. Supabase JSONB persistence smoke test passed for create/read/edit/read/soft-delete/restore/read across all four collections; temporary QA row was cleaned up. Authenticated browser acceptance is still open. |
| Real ESP same-CSV-twice no-duplicate acceptance | 🟡 | Import merge now preserves soft-deleted rows and updates its hash index during a file pass to prevent repeated hashes in one file; actual same-file-twice acceptance is still open. |

The lifecycle UI and JSONB persistence mechanism have been implemented and smoke-tested. PR #135 added edit/soft-delete/restore controls; PR #136 fixed campaign metadata preservation and ESP import merge behavior; PR #138 repaired the Email Check → Projects Risk route; PRs #139–#140 repaired Finance idempotency and the actual transaction schema contract; PR #142 fixed missing Finance result-event source markers so Ventures can display success/failure acknowledgements. A rolled-back SQL smoke test verified that a Finance transaction can be inserted and updated with the expected schema fields. Authenticated end-to-end UI acceptance remains open. The latest Finance/Projects bridge commits have not yet been confirmed on Production; Vercel build-rate limits have blocked automatic deployment checks.

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
4. Run the same ESP CSV twice through the real UI and assert zero duplicate records after reload.
5. Verify A/B winner and winner_reason persist after reload.
6. Verify Email Check → Projects Risk/Issue persists and remains linked to the originating Email Check.
7. Verify Portfolio Decision → Projects write-through persists and remains traceable.
8. Perform the real two-account ownership/privacy test before calling the system production-complete.

## Important conclusion

The current implementation is **not missing the original Ventures data model at a conceptual level**. The remaining risk is primarily proof of exact field parity and end-to-end persistence/integration. Therefore no new duplicate project-level source-of-truth tables should be introduced merely to satisfy the audit.
