# Relationships OS — Feature Completion Audit

Audit date: 2026-10-29
Scope: Relationships OS implementation in `src/systems/relationships`, current PR branch `relationships-safe-duplicate-merge`.
This audit distinguishes UI/code presence from verified end-to-end behavior. A rendered screen or passing unit test is not proof of production persistence, reminders, or authorization.

## Feature matrix

| Internal area | Implemented in code | Verified / limitation | Status |
|---|---|---|---|
| Home / dashboard | Relationship counts, due follow-ups, upcoming occasions, possible duplicates, attention cues | UI/domain behavior exists; production data and time-based behavior still need end-to-end checks | Partial |
| People directory and profiles | People records; contact channels; relationship type and importance; birthday; circle; organization/role; professional link; how met; interests; what matters; notes | Core profile fields are present. Validate all CRUD paths and data persistence against an authenticated workspace | Partial |
| Communication history | Timeline records with person, communication type, date, summary, notes | Core history feature is present; confirm create/edit/archive and last-contact calculations end-to-end | Partial |
| Follow-ups | Follow-up records, due dates, priority, notes, open/completed states and due views | Core workflow is present; reminders are currently in-app only, with no push/email/background delivery | Partial |
| Occasions and birthdays | Occasion records, date, recurrence, reminder lead-days, notes | Per-occasion reminder lead time is applied in-app; configurable birthday lead time is now supported. Scheduled push/email/background delivery is not implemented | Partial |
| Gifts | Gift ideas, optional occasion, state, budget, currency, target date and notes; purchased/presented views | Core tracking exists; no external purchase integrations are implied | Implemented in app; E2E pending |
| Relationship circles | Create/manage named circles with description and hex color; associate people | UI/domain support exists; validate access boundaries and persistence | Partial |
| Professional relationships / networking | Professional role/company/link fields and networking section | Basic professional relationship management exists; advanced networking workflows need explicit acceptance criteria | Partial |
| Search and insights | Unified relationship search; operational indicators such as missing contact details, missing contact history, open follow-ups, undated occasions, gifts not presented, people overdue for contact | Operational insights exist. A dedicated relationship-health score/model is not confirmed | Partial |
| Duplicate detection and merge | Merge planner, keeper/duplicate selection, field completion preview, relationship reassignment preview | Atomic RPC is deployed and its signature/privileges were verified; authenticated editor/viewer integration tests and end-to-end merge still pending | Blocked |
| Import/export | Import validation, duplicate-ID rejection, preview of added/unchanged/conflicting/overwritten records, explicit overwrite option | Atomic RPC migration is applied and function/execute grants verified; authenticated multi-collection import and rollback tests remain pending | Blocked |
| Settings and privacy | Default follow-up days, configurable birthday reminder lead days, configurable contact-review threshold, and a privacy-related UI setting/reminder | Current privacy lock is not an independent server-side security boundary. Actual access control remains workspace permissions/RLS | Partial |
| Authentication and permissions | Shared workspace auth/access layer used by the app; batch RPC intended to enforce current user's access | RPC is deployed as SECURITY INVOKER; execute grants were checked (authenticated=true, anon=false), unauthenticated rejection was exercised, and collection permission checks use IS DISTINCT FROM so NULL/missing access is rejected. Authenticated owner/editor/viewer integration tests remain pending | Partial |
| Automated notifications | Reminder lead-days and due-date metadata exist | In-app reminders are supported. Browser push, email, and background delivery are not implemented and must not be marked complete | Missing / unverified |
| Relationship health | General operational indicators exist | Operational attention indicators and configurable contact-review threshold exist. No subjective relationship-quality score is used; trends/history remain unimplemented | Missing / unverified |

## Required production checks before closing PR #64

1. DONE: Applied `relationships_atomic_batch` and the follow-up `relationships_atomic_batch_null_access_fix`; confirmed `public.relationships_apply_batch(uuid,jsonb,jsonb)` exists.
2. DONE for function mode and grants: confirmed `SECURITY INVOKER`, `authenticated` execute=true, `anon` execute=false; unauthenticated call rejected before writes; SQL definition contains null-safe `IS DISTINCT FROM 'edit'` checks. RLS/collection authorization still needs authenticated integration tests.
3. Authenticated integration test: authorized editor can import a valid multi-collection batch.
4. Atomic rollback test: deliberately invalid/unauthorized item causes no rows from the batch to be committed.
5. Authorization tests: unauthenticated and read-only/viewer users cannot write; an editor lacking permission for one target collection cannot partially apply the batch.
6. Merge test: keeper is updated, related timeline/follow-ups/occasions/gifts are reassigned, duplicate person is archived, and all changes commit or roll back together.
7. Import test: conflict-preserve default, explicit overwrite, duplicate-ID rejection, unchanged rows skipped, and settings handling.
8. End-to-end CRUD checks for every screen using a real authenticated workspace, not only demo/local state.
9. DONE for current scope: configurable in-app birthday reminders and per-occasion reminder windows. Browser push, email, and background delivery remain out of scope/unimplemented.
10. Current approach: transparent operational attention indicators and a configurable contact-review threshold, not a subjective score of relationship quality. Add trend/history only if required by the product spec.
11. Review the Supabase security-advisor findings separately; the current audit reported RLS-enabled tables without policies in the Finance area. Do not assume these findings are fixed by the Relationships RPC.

## Current CI/deployment evidence

- GitHub Actions run 53 on head `f8d3e9afc7d9cb01fd3d18bfb1005a4219023de5` passed before the latest reminder and permission-hardening edits. CI is running again for the newest commit; do not mark this latest revision passed until that run completes.
- Vercel previews for earlier commits reached READY; deployment for the latest commit is pending.
- Supabase migrations are applied and function/privileges are verified. This still does not prove authenticated editor/viewer flows work end-to-end.
