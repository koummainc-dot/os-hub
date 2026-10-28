# Finance OS Extensions — Family, Occasions & Giving

> Status: implementation specification. This document defines the full feature scope and acceptance criteria. It does not imply that the database migration or UI has been deployed.

## Product direction

Add three first-class areas inside Finance OS, not separate disconnected apps:

1. **Family Finance Center (مركز مصاريف الأسرة):** track spending and budgets for household members while keeping one authoritative ledger.
2. **Occasions, Gifts & Social Obligations (المناسبات والهدايا):** one calendar and register for weddings, engagements, births, visits, holidays, gifts, contributions and received gifts, replacing notebooks and scattered notes.
3. **Sadaqat & Donations (الصدقات والتبرعات):** private, auditable records of voluntary giving, pledges, recurring donations and campaigns, connected to actual money movements.

All three inherit the Finance OS workspace, authentication, roles, currencies, accounts, transaction ledger, categories, attachments policy, audit trail, exports and reports. They must not create a second balance ledger: a payment is recorded once in `finance_transactions`; feature records reference the transaction.

## Shared design rules

- Arabic-first RTL UI, accessible labels, responsive mobile layouts.
- Use the authenticated session and workspace membership as the source of identity; never trust a client-supplied user ID as authorization.
- Respect Finance OS access levels: read-only members can view permitted records; editors can create/update; managers/owners can manage settings and archive records.
- Every record is workspace-scoped. Every query and mutation must verify workspace membership and role server-side.
- Money is stored as a numeric amount plus ISO currency code. Never sum different currencies without a disclosed conversion rate and conversion date.
- Preserve records used by posted transactions. Prefer archive/void with reason over hard deletion.
- Distinguish planned amounts from actual posted amounts. A plan, pledge or gift intention must not change account balances.
- Record creation/update/archive and financial linkage in the audit log where supported.
- All reports must provide date range, member/category/status filters and CSV export; protect exported text from spreadsheet formula injection.
- Demo mode must use clearly labeled synthetic sample data and must not write to production.
- Empty states should explain the next action, and errors should be shown in Arabic without hiding the underlying diagnostic in logs.

---

# 1. Family Finance Center — مركز مصاريف الأسرة

## Purpose and main screens

### A. Family overview
Cards:
- Household spend this month, compared with previous month.
- Budget vs actual, with remaining amount and percentage used.
- Spending by family member.
- Shared household expenses vs individually attributed expenses.
- Upcoming recurring household bills.
- Unassigned expenses that need a member or shared-household designation.
- Alerts for budget thresholds and missing allocations.

### B. Family members
Manage member profiles, with:
- Display name (required), optional nickname, avatar/color.
- Relationship label (parent, spouse, child, sibling, other/custom).
- Status (active/archived).
- Optional date of birth; visibility is restricted to members allowed to see family details.
- Optional monthly allowance / target (currency + amount).
- Optional notes.
- Optional link to an existing workspace user. A family member does not need a login.
- Default responsibility: personal, shared household, or not assigned.
- Created/updated timestamps and actor IDs.

Do not require government IDs, bank credentials, or other unnecessary sensitive information. Do not infer a child’s age or expose member data outside the workspace.

### C. Family expense attribution
Every relevant ledger transaction may be classified as:
- **Personal:** belongs to one family member.
- **Shared:** household expense shared among selected members.
- **Household/unassigned:** household expense not yet apportioned.
- **Reimbursement:** one member repays another or the shared household; model as a real transfer/income-expense according to ledger rules, not as a category-only adjustment.

Fields:
- Transaction reference (required for actual posted expense).
- Allocation mode.
- Primary family member (optional).
- Notes and allocation status (unassigned, allocated, reviewed).
- Allocation rows: member, fixed amount or percentage, optional note.
- For percentage allocations, the total must equal 100% within a small defined rounding tolerance.
- For fixed allocations, total must equal the transaction amount in the transaction currency; rounding residual must be explicitly assigned.
- Transfers, reversals, voided entries and refunds must not be double-counted as spending.
- If transaction amount/category/date changes, allocation validity must be rechecked; preserve an audit trail.

A single transaction may be split among members without creating duplicate ledger transactions. Reports use allocation rows for member attribution and the original transaction for household totals, avoiding double-counting.

### D. Family budgets and allowances
Budget scopes:
- Entire household.
- One member.
- One category for the household or a member.
- A time window (monthly default; allow custom start/end dates).
- Optional rollover rule (off, unused budget rolls forward, capped rollover).
- Optional alert thresholds (for example 70%, 90%, 100%).
- Optional allowance amount and payout schedule per member.

Actual spend comes from posted ledger entries and allocations. Planned budgets/allowances never alter account balances. Alerts should be in-app first; notifications can be added through the platform notification system later.

### E. Household recurring costs
Use existing recurring transactions and allow an optional household/member attribution. Do not create a second recurring engine. Recurring entries should prefill the correct family/member attribution when generated, and generated ledger entries should be linked to their recurrence source.

### F. Family reports
- Spending by member and category.
- Shared vs personal expenses.
- Budget vs actual by month.
- Allowance planned vs paid vs spent (keep these as separate measures).
- Essential vs discretionary spending if the existing category model supports it.
- Reimbursements and outstanding amounts between members.
- Unassigned expenses.
- Month-over-month trends.
- CSV export with filters and clear currency labels.

## Family data model (logical)
- `finance_family_members`: workspace, name, relationship, status, optional workspace user link, allowance settings, notes.
- `finance_family_allocations`: workspace, transaction ID, member ID, allocation mode, amount/percentage, currency, note, status.
- Optional `finance_family_budgets`: workspace, member scope, category scope, period, amount/currency, rollover and alert settings.
- Existing `finance_transactions` remains the source of truth for actual payments. Add an optional member/household context only if needed; prefer allocation rows for multi-member support.

## Acceptance criteria
1. An editor can add, edit, archive and filter family members.
2. An existing posted expense can be assigned to one member or split across several without duplicating the ledger entry.
3. Invalid allocations (percentage not 100%, fixed totals inconsistent with transaction amount) are rejected with actionable Arabic errors.
4. A shared expense appears once in the household total and apportioned amounts in member totals.
5. Reversed/voided entries are excluded from actual spend according to ledger status rules.
6. Budget calculations handle refunds, date ranges and currencies without silent mixing.
7. Read-only users cannot mutate data by calling an API directly.
8. Export follows current filters and contains all matching records, not only the visible page.

---

# 2. Occasions, Gifts & Social Obligations — المناسبات والهدايا

## Purpose and main screens

### A. Occasions calendar
Unified calendar/list with:
- Weddings, engagements, births, visits, Eid/holiday occasions, birthdays, graduations, condolences, invitations, family gatherings and custom types.
- Event name/type, date/time, optional end date, location, person/household associated, importance, status (planned, attended, cancelled, completed).
- Reminder dates, expected budget, actual total cost, notes and attachments if the app supports secure files.
- Filters by month, type, person, status, and budget.
- Privacy setting for personal/sensitive occasions.

Dates are user-entered or explicitly chosen; do not auto-create religious dates without a maintained calendar source and clear locale/time-zone settings.

### B. Person and occasion details
Each occasion can link to:
- A family member, contact, or free-text recipient.
- One or more gifts.
- Contributions paid by the user or received from others.
- Linked transactions.
- Notes such as preferences, size/color, gift ideas and “avoid buying again”.
- A record of what was given/received and when, so future gift choices can avoid duplication.

Do not require a separate contacts system. Integrate with an existing relationships/contacts area when available; otherwise allow a minimal recipient name.

### C. Gift register
For each gift:
- Direction: given, received, planned, returned/exchanged.
- Recipient/giver name or linked person.
- Occasion link (optional).
- Gift name/description (required for gift record; transaction descriptions remain optional elsewhere).
- Planned amount, actual amount, currency.
- Date planned, purchased, gifted/received.
- Status (idea, planned, purchased, delivered, received, returned, cancelled).
- Store/merchant and link/receipt if supported.
- Transaction reference for actual payment.
- Notes, preference/taste tags, and duplicate-avoidance flag.

A planned gift does not count as an expense. It becomes an actual expense only when linked to a posted ledger transaction. A gift received is not automatically income unless the user explicitly records a monetary gift as an income transaction.

### D. Gift and contribution ledger
Track cash gifts and contributions for an event separately from in-kind gifts:
- Contribution type: cash gift, group contribution, event contribution, gift purchase, received cash gift.
- Direction: paid or received.
- Contributor/recipient.
- Event link.
- Amount/currency/date/status.
- Transaction link, receipt/reference and notes.
- Optional “expected back / customary reciprocal gift” note; this is a reminder only, not a receivable asset unless the user explicitly records a genuine receivable.

### E. Occasion budget
Per event:
- Budget target.
- Actual expenses linked from ledger.
- Cash contributions paid/received.
- Gifts planned and gifts purchased.
- Remaining budget.
- Group contribution members and expected vs received amounts.
- Alerts when actual spending crosses a threshold.
- Do not sum incoming contributions against outgoing expenses without displaying both sides separately; provide a net figure only as an explicitly labeled calculation.

### F. Social history and summaries
- Gift history by person.
- Events attended / upcoming.
- Planned vs actual spend by event type.
- Contributions owed/received for group events.
- Gifts purchased recently to prevent repeats.
- Annual spending on weddings, holidays, family events and gifts.
- Export all event/gift records with filters.

## Occasions data model (logical)
- `finance_occasions`: workspace, name, occasion type, dates, location, linked person/member, status, budget amount/currency, privacy and notes.
- `finance_gifts`: workspace, occasion ID, direction, gift description, person/recipient, status, planned/actual amounts, currency, dates, linked transaction.
- `finance_occasion_contributions`: workspace, occasion ID, direction/type, person, amount/currency/date/status, linked transaction and notes.
- Keep ledger transactions authoritative; never create a duplicate transaction just because an occasion/gift record exists.

## Acceptance criteria
1. User can create an occasion and set reminders/budget without changing account balances.
2. User can add multiple gifts and contributions to one occasion.
3. Linking a purchase to an existing transaction does not post a second transaction.
4. Gift history can be retrieved by recipient and flags recently purchased gifts.
5. Planned, purchased, delivered and received states are distinct.
6. Event cost, outgoing contributions and incoming contributions are displayed separately.
7. Cancelled events preserve linked transaction history.
8. Occasion exports respect workspace access and filters.

---

# 3. Sadaqat & Donations — الصدقات والتبرعات

## Purpose and main screens

### A. Giving dashboard
- Total paid this month/year.
- Total pledged but unpaid.
- Recurring commitments due soon.
- Giving by cause/category/recipient.
- Paid vs planned vs cancelled pledges.
- Monthly/yearly target progress.
- Recent donations and receipts requiring confirmation.
- Privacy-first default: this section is visible only to authorized workspace members; individual records may have a restricted visibility setting if supported by the platform’s permissions model.

Do not label a donation as Zakat unless the user explicitly chooses that type; voluntary sadaqah, Zakat, Zakat al-Fitr, endowment/waqf, emergency relief, sponsorship, and general donations must remain distinct categories.

### B. Recipient/charity directory
Fields:
- Recipient/organization name.
- Type: individual, registered charity, mosque, food program, medical aid, education, emergency relief, waqf, other.
- Optional country/region, website/contact, payment reference and notes.
- Verification status (not checked, user verified, evidence recorded) and last verification date.
- Optional notes/evidence for user’s own due diligence; do not claim the platform certifies a charity.
- Status active/archived.
- Avoid storing bank account credentials or sensitive beneficiary identity details.

### C. Donation record
Fields:
- Date paid or planned.
- Donation type: Sadaqah, Zakat, Zakat al-Fitr, Waqf, recurring charity, emergency relief, in-kind, other.
- Recipient/campaign.
- Amount and currency; for in-kind donations, estimated value is optional and clearly labeled.
- Payment method/account.
- Status: planned, pledged, paid, partially paid, cancelled, refunded.
- Linked transaction (required for paid monetary donation when paid through a tracked account; optional for cash/outside-ledger donation with explicit reconciliation note).
- Receipt/reference number and receipt file if secure attachment storage exists.
- Notes, tags, anonymity flag, recurring schedule link.
- Optional impact note (for example, meals supplied) without treating impact as verified unless evidence is attached.

### D. Pledges and installment payments
- Pledge amount/currency, pledge date, due date, recipient, campaign and optional installments.
- Each payment is its own ledger transaction linked to the pledge; do not book the full pledge as paid at creation.
- Partial payments reduce the outstanding pledge balance.
- Cancelled unpaid remainder must be recorded with reason.
- Refunds are linked to the original donation/payment and shown transparently.
- Do not count pledge and installment payment both as actual donation spend.

### E. Recurring giving
Reuse the Finance OS recurring transaction engine wherever possible:
- Frequency: weekly, monthly, quarterly, yearly or custom interval if supported.
- Start/end date, next due date, amount/currency, recipient/campaign, payment account, pause/cancel.
- Generated transactions link back to the recurring schedule and donation record.
- Handle insufficient funds or failed payment as a reminder/status, never silently mark it paid.
- Recurring giving does not imply automatic external payment; unless a supported payment integration is explicitly configured, it creates a reminder or draft transaction only.

### F. Giving goals and reports
- Monthly/yearly giving target.
- Progress by donation type, recipient, cause and currency.
- Planned vs pledged vs paid.
- Annual history and receipt export.
- Cash and in-kind giving shown separately.
- Optional private notes and anonymous-display setting.
- Tax receipts, if relevant, are stored as evidence and not represented as tax advice or a guarantee of deductibility.

## Sadaqat data model (logical)
- `finance_giving_recipients`: workspace, name, type, region, contact/website, verification metadata, status, notes.
- `finance_donations`: workspace, recipient/campaign, donation type, amount/currency, date, status, payment method/account, transaction link, pledge and receipt metadata, privacy fields.
- `finance_donation_installments`: workspace, donation/pledge ID, due date, expected amount, paid amount, status, linked transaction.
- Reuse existing recurring transaction and goal entities where their schemas can represent the use case safely; do not duplicate those engines without a documented gap.

## Acceptance criteria
1. User can record planned giving without changing account balances.
2. Marking a donation paid requires a valid linked ledger transaction or an explicit cash/off-ledger explanation.
3. Pledges and installment payments never double-count actual spend.
4. Recurring schedules generate reminders/drafts unless actual payment integration is configured.
5. Refunds and partial payments are traceable to the original donation.
6. Reports separate planned, pledged, paid, refunded and in-kind values.
7. Zakat and voluntary sadaqah remain distinct in data and reports.
8. Users can export their records and receipts within their permission scope.

---

# Cross-feature navigation and integration

Add these Finance OS pages:
- `family` — مركز الأسرة
- `occasions` — المناسبات والهدايا
- `giving` — الصدقات والتبرعات

Suggested navigation grouping:
- **إدارة الأسرة:** مركز الأسرة، المناسبات والهدايا.
- **العطاء:** الصدقات والتبرعات.

Dashboard widgets:
- Family budget usage.
- Next 3 occasions and gift plans.
- Giving due soon and progress toward target.

Transactions integration:
- Optional contextual links from transactions to a family member/allocation, occasion/gift, or donation.
- The ledger transaction remains the only source of actual account movement.
- One transaction may carry one primary feature link plus explicit allocation/link rows where needed; prevent duplicate posting using the existing idempotency conventions.
- Reports should have drill-down links back to the transaction and the feature record.

## Suggested delivery sequence

### Phase 1 — data and permissions
- Confirm existing workspace membership and finance RPC authorization patterns.
- Add schema/migrations with workspace ownership, foreign keys, checks, indexes and safe archive behavior.
- Implement server-side RPCs for writes and reads; avoid broad client-side table access until RLS policies are reviewed.
- Add audit events and idempotency for operations that create or link transactions.
- Test migrations on an isolated Supabase branch before production.

### Phase 2 — usable workflows
- Build family member CRUD, transaction allocation, occasion calendar/gifts, donation registry and pledge payments.
- Connect each paid record to an existing transaction without double-posting.
- Add demo data and empty/loading/error states.

### Phase 3 — reports and reminders
- Family and giving dashboards, occasion summaries, CSV exports, reminders.
- Cross-check report totals against the ledger.
- Accessibility, mobile and RTL testing.

### Phase 4 — release gate
- Unit tests for allocation arithmetic, pledges, refunds, currencies and date boundaries.
- Permission tests for owner/manager/editor/read-only and cross-workspace access.
- Migration idempotency and rollback/recovery plan.
- Browser tests for create/edit/archive/link/export flows.
- Verify production deployment and database migration separately; a merged PR alone is not proof of deployment.

## Global definition of done
A feature is not complete merely because its tables or screens exist. It is complete only when schema, permission enforcement, UI, transaction linkage, audit trail, reports, exports, demo mode, automated tests and deployment verification are all covered.
