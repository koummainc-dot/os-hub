# Spiritual & Values OS — Phase 1 gap tracker
**Status:** In progress; not accepted for production. Implement independent work while explicitly deferring blockers; do not merge/deploy until the production safety gates are met.
**Authoritative specification:** `plans/SPIRITUAL_VALUES_OS_UNIFIED_MASTER_PLAN_v4.md` (v4.0). This tracker supplements and never replaces it.
**Branch:** `feat/spiritual-values-phase1-foundation`
**PR:** #103

## Work completed in this continuation
- Fixed the save-event call to match `publishOSEvent(event, workspaceId, source)`.
- Save events are now emitted only for non-private records. After the privacy-by-default change, all current Spiritual collections are private, so no record-save event is emitted.
- Changed the domain privacy classification so all ten collections are private by default.
- Updated the foundation migration to allow all ten collections in the owner-scoped private table and mark every collection sensitive with external summaries disabled.
- Expanded contract tests for event API compatibility and privacy defaults.
- Added initial typed P1 domain constructors/validators for values, principles, practices, and flexible frequency configurations.
- Added a versioned compatibility adapter (`spiritual.typed.v1`) that serializes typed values/principles/practices into the current generic owner-scoped row envelope and safely decodes them; invalid/unknown payloads fall back to legacy display rather than being treated as typed records. Specialized Arabic forms for values, principles and practices are now connected to typed constructors, validators and the adapter; typed list summaries avoid printing serialized JSON. The adapter still stores a versioned payload in the existing generic `body` field, so entity-specific schema/relations and full acceptance coverage remain open.
- A prior head (`84afe5ca09a3276469148535418b97fefa512eb6`) had successful Verify app and CI runs, but those results do not cover current changes. CI on the later head `3ce0d7716c9c31c6497f3569d92eda138b1cd3ef` failed because literal `\\n` sequences remained in `domain.js` and Vite could not parse the file. Those sequences were replaced with real line breaks on the newer head; a regression assertion was added. The repaired head still requires fresh CI confirmation. No authenticated browser test or production migration has been completed.
- Latest P1 hardening adds explicit upper bounds and type checks for value tags/description/meaning source and principle text fields, with regression assertions. The commits are saved, but not yet CI-verified.

## Phase 1 acceptance gates — close when possible; defer blocked environment/security work without blocking independent development
- [x] Correct integration-event API shape.
- [x] Prevent Spiritual record-save events from serializing private record metadata into browser localStorage.
- [x] Mark all ten current collections private by default in the domain contract.
- [x] Expand private-table collection constraint and policy metadata to all ten collections.
- [ ] Run full CI on the latest PR head and verify every required job. **The typed UI, adapter and regression-test commits are newer than the last completed CI evidence; inspect the latest runs before acceptance.**
- [ ] Run local contract tests and production build in a reproducible environment. **Deferred until a reproducible runtime is available; repository edits alone are not test evidence.**
- [ ] Verify both migrations against the actual current Supabase schema in a rollback-only transaction, including policy/constraint idempotency and FK compatibility. **Deferred if safe read/transaction access is unavailable.**
- [ ] Authenticated multi-user integration test: owner can read/write their own records; another user and workspace collaborator cannot select, mutate, or archive them. **Deferred until two safe test identities and a non-production test environment are available.**
- [ ] Confirm private records are excluded from global search, Today, Calendar, notifications, admin tooling, analytics, exports, and logs unless an explicit, consented contract allows a minimal derived signal.
- [ ] Decide and implement encryption-at-rest for sensitive free text. JSONB plus RLS is access control, not field-level encryption; do not claim end-to-end encryption. **Deferred as a security architecture task; do not ship sensitive real data before it is resolved.**
- [ ] Verify authenticated-user ownership is enforced server-side, not only by UI role checks.
- [ ] Confirm backup, deletion, retention, export, audit and key-recovery behavior before production rollout. **Deferred until the encryption/retention design and test environment are ready.**
- [ ] Keep system status `planned` until all required gates pass.

## Remaining implementation scope from v4.0
The current interface is a foundation shell and generic record form, not the complete system. Do not mark a section done because its tab exists.

### P0 — Foundation, privacy, settings, offline/sync
- Schema aligned with §5.0–5.14; user-owned rows; composite ownership constraints; soft delete/versioning; no cross-system foreign keys.
- Settings: timezone, practice-day cutoff, calendar algorithm/offset, privacy tiers, quiet hours, daily notification cap, neutral names, optional metrics, Silent Mode, pause-all.
- Unlock/lock flow, session timeout, encrypted local store, server-side access rules, privacy-aware export/delete and retention.
- Offline-first local queue, idempotent client operations, sync status and explicit conflict resolution.
- Accessibility, Arabic RTL, mobile/responsive layouts, loading/empty/error/offline states.
- Acceptance tests PT-10, PT-58, PT-59, PT-65 and security cases.

### P1 — Values, principles, practices and versions
- [Partial] Typed domain constructors/validators now cover core values, principles, practices, slot constraints, Habit-linked mode consistency, and frequency configuration shapes. Recent hardening validates tag types/lengths, bounded free text, unique/non-empty explicit dates, unique month-day selections, weekly limits, intervals up to 365 days, and required slot count not exceeding configured slots. These assertions are committed but await fresh CI.
- [x] Specialized Arabic create/edit forms for values, principles and practices use typed constructors, validation and versioned adapter persistence.
- [x] Typed list summaries render structured fields rather than raw serialized payload; legacy records retain generic fallback display and can still be edited through the generic form.
- [x] Added adapter round-trip contract assertions for values, principles, practices, invalid payloads and legacy fallback; these tests await CI confirmation.
- [Partial] Versioned adapter maps typed values/principles/practices into the current row envelope without assuming new database columns; decoder preserves legacy fallback. This is compatibility storage, not the final normalized schema.
- [Remaining] Entity-specific persistence/schema and relations from §5.2–5.4; user-controlled ordering; full legacy-edit workflow; no mandatory moral score.
- Principle drift signals are user-defined and private; never label them as moral violations.
- Practice type/unit, targets/minimum, flexible frequency, slots, preferred time, Habit link mode, versions, pause/archive/restore lifecycle.
- P2 partial: typed own-practice log constructor/validator; accepted statuses Done/Partial/Excused only; date/practice/slot validation; deterministic `(practiceId,date,slotKey)` record identity; canonical `_` key for a single slot; multiple configured slots supported; optional actual/duration/note; source and client operation ID.
- P2 partial: quick logging UI on practice cards, date and slot selection, status/quantity/duration/note, day summary labels Maintained/Partial/Excused/Unrecorded; HabitLinked practices are explicitly read-only and never create duplicate logs.
- P2 contract tests cover date/status/slot validation, completion levels, multiple slots, unrecorded semantics, and Habit-linked rejection. These checks await CI.
- [Partial] Added additive `spiritual_practice_logs` migration with owner/workspace scope, unique `(user_id,practice_id,log_date,slot_key)` and `(user_id,client_op_id)`, RLS, parent-practice ownership checks on insert/update, and an index for owner/date history.
- [Partial] Practice quick entry now writes to the normalized table and the Daily Log view reads normalized history. The legacy generic `practice_logs` rows are not automatically migrated; a reviewed backfill remains required.
- [Security hold] Free-text practice notes are not written in plaintext to the new table: ciphertext columns are reserved, and the UI blocks note saving until the approved encryption/key lifecycle is implemented. Existing private generic JSON records are still not field-encrypted; do not use real sensitive content before P0 encryption closes.
- Duplicate-name, ownership, date, range and state-transition validations.

### P2 — Practice logs, flexible slots, consistency and continuity
- [Partial] Own-mode log domain contract and quick-entry UI implemented against the private generic record envelope; multiple slots per day use stable slot keys, with `_` for a single slot. This is not yet normalized `sp_practice_logs` persistence.
- [Partial] Completion-level derivation (Full/Minimum/Partial/None/Excused) and neutral per-day slot summary implemented; missing rows remain Unrecorded, never Missed.
- [Partial] Database uniqueness and owner-scoped RLS for normalized practice logs are specified in the additive migration; actual execution against a non-production Supabase environment and two-user RLS tests remain open.
- [Partial] Daily Log view reads normalized history and now supports date-range, status and text filters. Generic edit/archive actions are intentionally hidden for normalized log rows until dedicated safe update/delete operations are implemented. Legacy generic log backfill, pagination, multi-slot edit/delete UX, and explicit `client_op_id` retry behavior remain open.
- [Partial] Added `isPracticeExpectedOnDate` for Daily, Weekdays, EveryNDays, explicit Dates, and Gregorian MonthDay schedules. Count-based weekly/monthly schedules, Flexible schedules and Hijri MonthDay return `null` (unknown), rather than guessing a date. Daily summaries now distinguish `NotExpected` from `Unrecorded`, and scope records to the selected date.
- [x] Fixed literal escaped newlines in both the repository module and domain validator that caused JavaScript parsing/build failure; added a regression assertion against escaped newlines, plus schedule semantics and date-isolated summary tests. The repair is committed; fresh CI is pending.
- [Partial] Per-date expected-day evaluation now respects inactive/archived practices, explicit pause periods, and explicit date-range schedule overrides (`Pause`, `NotExpected`, `Expected`). This is a domain contract only; the UI and persistence schema for managing these periods/overrides and season-to-practice inheritance are not yet implemented.
- [Partial] Supported base calendar patterns remain Daily, Weekdays, EveryNDays, explicit Dates, and Gregorian MonthDay. Count-based weekly/monthly, Flexible without an override, and Hijri MonthDay remain unknown (`null`) rather than guessed.
- [Remaining] Configurable day boundary/timezone, real season precedence/overlap validation and persistence, `TimesPerWeek/TimesPerMonth` accounting and full consistency/continuity calculations.
- [Remaining] Configurable day boundary/timezone and pause/expected-day calculations; `TimesPerWeek/TimesPerMonth` and full consistency/continuity calculations.
- Multiple occurrences per practice/day using a stable slot key.
- Expected-day calculation and completion levels; missing log is not Missed.
- Neutral consistency/continuity metrics are optional, hidden by default, and never replace Habit-owned streaks or Daily Logs.
- Habit-linked mode is read-only for Habit logs and must not duplicate records.
- Day boundary configurable (recommended 03:00); timezone and past-date behavior tested.

### P3 — Private reflections, gratitude and prompts
- Optional reflection fields, gratitude entries, user-editable prompts and tags.
- Reflection content stays inside the private store and local search; journal linking is a reference only and never copies content.
- No text or content in events, notifications, analytics or global search.

### P4 — Goals, commitments and seasons
- [Partial] Season domain contract now validates user-defined date ranges, statuses and per-practice overrides; rejects conflicting overlapping scheduled/active seasons on the same practice and exposes a date-scoped resolver. Not yet wired to persistence or UI.
- Derived goal progress with transparent inputs, milestones and adjustment history.
- Commitment check-ins use dignified neutral states; no “failure” status; progress is derived.
- Custom seasons can override selected practice schedules only for the selected period, then restore base settings automatically.
- Conflict/overlap and lifecycle validation.

### P5 — Important dates and reminders
- User-defined dates only; Gregorian/Hijri, monthly/weekly/yearly recurrence, leap-day rule and day offset.
- Configurable local reminders, quiet hours, dedupe keys, notification cap, neutral lock-screen text, and Silent Mode.
- Calendar feed and ICS are off by default; only explicit user-selected dates can appear.
- No hard-coded religious date list or prayer-time calculation in v4.0.

### P6 — Reviews, alignment and re-entry
- Weekly/monthly/annual reviews and templates; scheduled reviews off until opted in; skip without judgment.
- Descriptive alignment view connecting values to principles/practices/commitments, hidden by default.
- Re-entry card after inactivity uses welcoming language; no streak reset or guilt language.

### P7 — Integrations and event contracts
- All outbound integrations off by default and consented per integration.
- Habit, Today, Calendar, Learning, Relationships and Nutrition use explicit API/event contracts only; no duplicated entities or cross-system foreign keys.
- Outbound events contain only minimal IDs/counts, never names or free text; all current Spiritual collections remain private by default.
- Nutrition fasting/abstinence signal remains closed until its owner contract is approved.
- Learning completion creates a suggestion, not an automatic practice log.
- No Spiritual data in Core Search or admin views by default.

### P8 — Import/export, deletion and final quality
- Dry-run/apply import with mapping, duplicate detection, validation and rollback.
- JSON encrypted export and per-table CSV only after authorization/unlock; import template is optional and must never be assumed to represent the user's beliefs.
- Account/data deletion, retention, backup restore and audit review.
- Full PT-01…PT-70 acceptance matrix, prohibited-language CI checks, regression suite, accessibility checks and security testing.
- Giving/Zakat/Sadaqat appendix is future scope within Spiritual OS; no donation ledger in Finance. Any actual money movement remains owned by Finance and links to exactly one existing transaction.

## Critical design gaps still open
1. **Encryption:** current private table stores `data jsonb`; RLS does not encrypt content. Choose and implement the v4.0 envelope-encryption design before production use.
2. **Generic record model:** current UI stores only `title/description/body/status`; it does not implement the typed schemas, derived calculations, validation or workflows described in v4.0.
3. **Settings and lock:** current Settings screen is explanatory copy, not functional controls.
4. **No complete offline engine:** no encrypted local database, queue, sync engine or conflict UI has been proven.
5. **No real reminders/calendar/review automation:** none may be claimed implemented yet.
6. **No complete API/service layer:** the documented REST surface and service contracts are not implemented by this foundation.
7. **No authenticated E2E privacy test:** RLS policy text alone is not proof of actual access isolation.
8. **No production migration or deployment:** migration has not been applied to production; production deployment must remain unchanged until the quota issue and acceptance gates are resolved.

## Deferred items and unblock conditions
- **Latest CI/build verification:** deferred until a run for the latest head can be triggered or retrieved; rerun after any subsequent code change.
- **Authenticated multi-user RLS/E2E:** deferred until a non-production Supabase environment and two test identities are available.
- **Encryption/key lifecycle:** deferred to a dedicated design/implementation task; never represent RLS as encryption and do not put real sensitive content into the system before this closes.
- **Production migration/deployment:** deferred until the migration has been validated against the live schema in rollback-only mode, security tests pass, and deployment quota is available. Production remains unchanged.
- **Offline encrypted sync/conflict handling:** deferred until the local encrypted storage and key lifecycle are chosen; basic UI/domain work may proceed independently.
- **Calendar/ICS, push notifications, cross-system integrations and automated review schedules:** defer until their opt-in contracts and permissions are defined; no integration should silently activate.

## Change and acceptance protocol
- Close any P0 gates that can be safely verified now. Explicitly defer environment-dependent gates instead of pretending they passed, and continue with independent domain/UI work in P1–P8 on the feature branch. No merge or production deployment while privacy-critical gates remain open.
- Each phase must have: schema/domain change, UI workflow, permission/privacy tests, calculation tests where relevant, regression/build, and an updated checklist.
- Never merge or deploy with failing or unverified privacy controls.
- Do not silently change v4.0 decisions. Record any proposed deviation as a decision for explicit approval.
