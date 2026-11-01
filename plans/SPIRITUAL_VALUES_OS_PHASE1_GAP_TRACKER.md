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
- [Partial] Per-date expected-day evaluation respects inactive/archived practices, explicit pause periods, explicit date-range schedule overrides (`Pause`, `NotExpected`, `Expected`), and now user-defined season overrides supplied through `context.seasons`. Precedence is: inactive/archive and pause periods => explicit date-range overrides => season overrides => base frequency. Season `Pause`/`NotExpected` suppresses expected days only inside the season range; `Expected` makes the practice expected inside that range; outside the range the unchanged base schedule resumes. Overlapping season rules return `null` (unknown) rather than guessing. UI and persistence for season management are still open.
- [Partial] Supported base calendar patterns remain Daily, Weekdays, EveryNDays, explicit Dates, and Gregorian MonthDay. Count-based weekly/monthly, Flexible without an override, and Hijri MonthDay remain unknown (`null`) rather than guessed.
- [Remaining] Configurable day boundary/timezone, real season precedence/overlap validation and persistence, `TimesPerWeek/TimesPerMonth` accounting and full consistency/continuity calculations.
- [Remaining] Configurable day boundary/timezone; `TimesPerWeek/TimesPerMonth` and full consistency/continuity calculations.
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
- [Partial] Season domain contract validates user-defined date ranges, statuses and per-practice overrides; rejects conflicting overlapping scheduled/active seasons on the same practice and exposes a date-scoped resolver. The resolver is now wired into isPracticeExpectedOnDate through `context.seasons`; schedule overlays are derived at calculation time and never mutate base frequency. Regression assertions cover Pause, Expected, restoration after season end, explicit override precedence, and overlap-as-unknown. UI and persistence for seasons remain open.
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


## Latest continuation — season calculation wiring
- Wired `context.seasons` into `isPracticeExpectedOnDate` without changing or persisting over the practice's base frequency.
- Calculation precedence is explicit: inactive/archived and pause periods are checked first; explicit date-range schedule overrides win over season rules; season rules apply only within their own date range; otherwise the base frequency decides.
- `Pause` and `NotExpected` return not-expected for the season interval; `Expected` returns expected for that interval. After the season ends, the original base frequency applies automatically.
- If multiple season rules overlap for the same practice/date, calculation returns `null` (unknown) rather than selecting a rule silently.
- Added regression assertions for all the above. These tests are committed but have **not yet been executed in a reproducible runtime**, and latest-head CI must be checked before acceptance.


## Latest continuation — season management UI
- Added an Arabic season form in Spiritual & Values OS with name, description, start/end dates, status, and a repeatable list of practice overrides (`Pause`, `NotExpected`, `Expected`). A season can affect multiple distinct practices.
- Each override row can be added or removed; practices already selected in another row are disabled in the other dropdowns. Empty practice selections are filtered out before domain validation, and the domain validator remains responsible for duplicate IDs and overlapping scheduled/active seasons affecting the same practice.
- Editing preloads all stored `practiceOverrides`, not just the first. Reset/cancel returns to one empty row. The list view renders each affected practice.
- Seasons continue to use the existing private-record persistence path; no new database migration was introduced. Explicit archive/complete actions, persistence/schema review, authenticated E2E tests, and robust cross-user RLS verification remain open.
- Latest code commits: `66c437abfa762e8005bc989659fee94726ddb8e9` (repeatable override UI) and `e245f78a2eb047c2bbff7542ffe8167a1edbb364` (draft state/save/edit/reset alignment). These are implementation changes, not proof of test success. Latest-head CI and privacy checks must be confirmed before acceptance.


## Latest verification — 2026-11-01
- CI, Verify app, and Finance Family Center Checks ran against head `df54bc03a6a267f63a00e4ded592fb07ba7aedad` and failed at the Spiritual foundation test. The precise failure was a mismatch in the `AtLeast(n)` slot requirement validator: the regex was over-escaped, causing valid values such as `AtLeast(2)` to be rejected as `invalid-slots-required` before the slot-count rule could run.
- Fixed the regex in `src/systems/spiritual/domain.js` on commit `fd6070ac75ce246cbe42eed69404f036d88c2d44`. A fresh Verify app run was queued for that commit at last check; it has not yet produced a final result. Do not mark CI green until the latest-head jobs complete.
- The multi-practice season UI and duplicate-practice domain test are present. Remaining gaps are still substantial: current typed records are stored in a versioned JSON payload in a generic row envelope; encrypted storage/key lifecycle, complete offline queue/sync/conflict handling, full settings/lock controls, normalized schema/relations, safe edit/delete for normalized practice logs, legacy log backfill, complete frequency accounting (including TimesPerWeek/TimesPerMonth and Hijri dates), season lifecycle actions, authenticated multi-user RLS/E2E, migration validation, privacy-boundary verification, and full P0–P8 coverage remain open.
- No production migration, merge, or deployment was performed. Production deployment remains blocked by the Vercel daily deployment quota; sensitive real user content must not be entered before encryption and access-isolation acceptance gates are closed.


## Latest continuation — daily-summary expected-state fix (2026-11-01)
- Latest available CI evidence for head `fd6070ac75ce246cbe42eed69404f036d88c2d44` showed the Spiritual contract test failing at `tests/t_spiritual_foundation.mjs:93`: an empty log set for a date on which a Weekdays practice is not scheduled was reported as `Unrecorded` instead of `NotExpected`. This contradicted the existing schedule-summary contract and caused CI, Verify app, and Finance Family Center regression checks to fail; the Knowledge SQL smoke test passed.
- Fixed `getPracticeDaySummary(logs, practice, date, context)` so a date that evaluates to explicitly not expected returns `NotExpected` when there are no qualifying logs; real log states still take precedence, and unknown frequency evaluation remains `Unrecorded` rather than guessing. Existing callers remain compatible because `context` is optional.
- Fix committed on the feature branch as `e0eb7042359b3064cc1448b90ac4d1dcf535b006`. At the time of this note, the workflow lookup had not yet surfaced runs for that new commit; the fix is **not verified until fresh CI/Verify/Finance checks complete**. Do not treat this code change as a passing test result.
- Read-only Supabase review confirms the connected `os-hub` project is active and its applied migration list does not include either Spiritual migration. No migration was applied, no production data was changed, and no deployment or merge was attempted.
- Next: wait for/inspect fresh workflow runs on the latest head; if green, proceed to season lifecycle actions (explicit complete/archive/restore behavior rather than status-only form choices), then test season create/edit/multi-practice/overlap/end-date behavior and access boundaries. Keep the OS `planned` until encryption/key lifecycle, server-side owner isolation, multi-user E2E, private-data leakage checks, rollback-only migration validation, and remaining v4.0 P0–P8 acceptance criteria are closed.

## Continuation — CI recheck and season lifecycle actions (2026-11-01)
- Rechecked the runs associated with tracker commit `4d00d7f42c1d89a3a2f2408cfe8f893c070644a8`: **CI #860, Verify app #952, Finance Family Center Checks #695, and Knowledge SQL smoke tests #585 all completed successfully**. Their job summaries report success. This confirms the expected-day summary fix and existing regression suite at that tested point.
- Implemented explicit season lifecycle controls in `src/systems/spiritual/index.jsx`: Draft → Scheduled; Scheduled → Active; Scheduled/Active → Completed; any non-Archived season → Archived; Archived → Draft (restore); Completed → Draft (reopen). Each transition requires edit/owner permission, explicit confirmation, domain validation (including overlap checks for Scheduled/Active), and a successful save before the local list is updated. Failed saves retain the existing row and show an error.
- Lifecycle archiving now changes the season status rather than soft-deleting its private row, so the season remains visible and can be restored. Archived/Completed seasons are excluded from schedule overrides by the existing domain rule; the test suite now asserts archived seasons do not affect schedules and that the UI exposes lifecycle actions.
- Latest commits: `d94ff4aa6e9a796ca9edc6813f87bbdac35d708a` (lifecycle UI) and `5f6b1399dda3092f2465b58c8d1f18f0a5af80ed` (lifecycle regression assertions). **Fresh CI/Verify/Finance results for these latest commits have not surfaced yet**, so these new changes remain unverified in a real CI run. The only combined commit status currently visible for the latest commit is a Vercel failure linked to the deployment build-rate limit; no deployment was attempted by this workflow.
- No merge, production migration, or deployment was performed. The OS remains `planned`. Still open: encryption and key lifecycle, server-side multi-user isolation/RLS adversarial tests, private-data leakage checks, rollback-only migration validation, normalized schema/relations, safe log editing/deletion, frequency/Hijri completeness, offline encryption and sync conflict handling, import/export/wipe, accessibility/mobile/RTL acceptance, and complete P0–P8 acceptance coverage.
