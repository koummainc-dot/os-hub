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
| Follow-ups | Follow-up records, due dates, priority, notes, open/completed states and due views | Core workflow is present; no evidence yet of OS-level/push/email notifications | Partial |
| Occasions and birthdays | Occasion records, date, recurrence, reminder lead-days, notes | Scheduling metadata and views exist; actual scheduled delivery/background notification is not implemented/verified | Partial |
| Gifts | Gift ideas, optional occasion, state, budget, currency, target date and notes; purchased/presented views | Core tracking exists; no external purchase integrations are implied | Implemented in app; E2E pending |
| Relationship circles | Create/manage named circles with description and hex color; associate people | UI/domain support exists; validate access boundaries and persistence | Partial |
| Professional relationships / networking | Professional role/company/link fields and networking section | Basic professional relationship management exists; advanced networking workflows need explicit acceptance criteria | Partial |
| Search and insights | Unified relationship search; operational indicators such as missing contact details, missing contact history, open follow-ups, undated occasions, gifts not presented, people overdue for contact | Operational insights exist. A dedicated relationship-health score/model is not confirmed | Partial |
| Duplicate detection and merge | Merge planner, keeper/duplicate selection, field completion preview, relationship reassignment preview | Atomic RPC is referenced by UI but does not exist in the connected Supabase database yet; final merge cannot be called production-ready | Blocked |
| Import/export | Import validation, duplicate-ID rejection, preview of added/unchanged/conflicting/overwritten records, explicit overwrite option | Atomic RPC migration not applied; do not rely on production import until database function is deployed and tested | Blocked |
| Settings and privacy | Default follow-up reminder days and a privacy-related UI setting/reminder | Current privacy lock is not an independent server-side security boundary. Actual access control remains workspace permissions/RLS | Partial |
| Authentication and permissions | Shared workspace auth/access layer used by the app; batch RPC intended to enforce current user's access | RPC needs deployment and authenticated integration tests for owner/editor/viewer/unauthenticated cases | Partial |
| Automated notifications | Reminder lead-days and due-date metadata exist | No notification delivery integration found in Relationships UI; needs product decision and implementation if required | Missing / unverified |
| Relationship health | General operational indicators exist | No dedicated health score, trend, or configurable relationship-quality model confirmed | Missing / unverified |

## Required production checks before closing PR #64

1. Apply migration `20261029100000_relationships_atomic_batch.sql` to Supabase and confirm `public.relationships_apply_batch(uuid,jsonb,jsonb)` exists.
2. Verify the RPC executes as `SECURITY INVOKER`, is not executable by `anon`, and respects RLS plus `ws_access_level` for each collection.
3. Authenticated integration test: authorized editor can import a valid multi-collection batch.
4. Atomic rollback test: deliberately invalid/unauthorized item causes no rows from the batch to be committed.
5. Authorization tests: unauthenticated and read-only/viewer users cannot write; an editor lacking permission for one target collection cannot partially apply the batch.
6. Merge test: keeper is updated, related timeline/follow-ups/occasions/gifts are reassigned, duplicate person is archived, and all changes commit or roll back together.
7. Import test: conflict-preserve default, explicit overwrite, duplicate-ID rejection, unchanged rows skipped, and settings handling.
8. End-to-end CRUD checks for every screen using a real authenticated workspace, not only demo/local state.
9. Decide whether reminders require in-app, browser push, email, or external calendar delivery; implement and test the chosen channel.
10. Decide the intended meaning of relationship health and define a transparent score/model if it is required.
11. Review the Supabase security-advisor findings separately; the current audit reported RLS-enabled tables without policies in the Finance area. Do not assume these findings are fixed by the Relationships RPC.

## Current CI/deployment evidence

- GitHub Actions run 52 on head `7f94024ffdc193c381cde544e441bba76579d0fa`: test suite and production build succeeded.
- Vercel preview for that head reached READY.
- This does not prove that the Supabase migration is deployed or that the database integration works.
