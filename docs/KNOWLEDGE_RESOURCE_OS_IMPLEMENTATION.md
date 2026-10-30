# Knowledge & Resource OS — Implementation Contract

## Scope
Arabic-first workspace-scoped knowledge capture and retrieval, integrated into OS Hub's shared authentication and system permission model.

## Current UI capabilities
- Home dashboard and counts; inbox; resources/bookmarks; ideas; standalone notes; meetings; events; date-based calendar view; categories; source types; global search; settings.
- Create/edit/archive/restore/pin/review items; manage categories and source types (rename/delete with usage checks); title, URL, summary, full note body, extracted notes/quotes, next action, category, tags, priority, author/published/read/review dates, rating, idea lifecycle, meeting attendees/decisions/follow-ups, event location/date/time. Due review items surface on the home page.
- JSON backup export/import; demo seed; optimistic compare-and-set saves through the existing workspace API.
- Related-system reference fields can store Projects/Learning/Content/Habit identifiers, but are not yet validated foreign-key relationships.

## Data model (normalized target)
- `knowledge_categories`: workspace-owned hierarchical categories, color/order/archive.
- `knowledge_items`: resources, ideas, meetings, events, notes and inbox entries with lifecycle, metadata, dates, rating, notes and next action.
- `knowledge_tags` + `knowledge_item_tags`: deduplicated tags and many-to-many item tagging.
- `knowledge_relations`: typed item-to-item relations, enforced to remain within a workspace.
- `knowledge_external_links`: references to Projects/Learning/Content/Habit and other OS records.
- `knowledge_reminders`: scheduled review/event/follow-up reminders with delivery status and snooze state.
- `knowledge_followups`: independently trackable actions with due dates, assignee and lifecycle.
- `knowledge_attachments`: Storage object metadata; actual uploads require a Storage bucket and policy.
- `knowledge_activity`: append-only-style audit history of meaningful actions.
- RLS delegates workspace authorization to `ws_access_level(workspace_id, 'knowledge', 'main')`; editor access is required for snapshot writes and deletes, and read-only members cannot mutate data.

## Lifecycle and behavior rules
- Archive is soft-delete; restoring means toggling the archived filter and setting status back to an active lifecycle value.
- Inbox is triage: capture → review → processed; preserve original URL/source metadata.
- Resource lifecycle: unread → reviewing → processed; review_at powers the review queue.
- Idea lifecycle: captured → exploring → validated → planned → implemented/rejected.
- Meeting follow-ups are persisted as individual rows while the UI keeps a newline-based editing experience.
- Search covers title, summary, notes, URL, type, tags, category, dates, decisions and follow-ups.
- A relation must not cross workspace boundaries; category and tag names are unique per workspace.
- Exports are data portability, not a server backup; imports replace the current workspace payload after confirmation.

## Important integration status
The UI now has a repository adapter that prefers normalized Knowledge RPCs and falls back to the existing workspace `workspace_data` API only when the normalized migration is not present. When normalized storage has no saved snapshot, the UI loads the legacy JSON payload and attempts a one-time transactional backfill for editors. `knowledge_save_snapshot` uses an optimistic timestamp check plus a workspace-scoped advisory lock; it upserts items, categories, tags, relations, meeting follow-ups and preferences while preserving attachments, external links and non-UI relation/follow-up records for retained items. Custom source types are stored independently of source records. The normalized SQL migration and repository adapter are committed but **not applied to production**. Migration-history reconciliation (Issue #85) remains a hard blocker before production rollout. The fallback does not silently write to the legacy store after normalized storage has become active.

## Acceptance checklist
- [ ] Verify owner/member view/edit RLS on every table against real workspace roles.
- [ ] Add a read-only migration preview/reconciliation report before production cutover; current UI backfill is transactional and only runs when the normalized workspace has no saved snapshot.
- [x] Wire category/tag/item/relation/follow-up snapshot persistence through the normalized repository RPC.
- [ ] Add actual storage bucket/policies for attachments.
- [ ] Validate date/time and source URL input; test imports against malformed/oversized JSON.
- [ ] Run concurrency, multi-user workspace isolation, archive/restore and export/import tests against a migrated test database.
- [ ] Connect relationships to Projects/Learning/Content through supported APIs, not free-text IDs.
- [ ] Run build/lint and feature contract tests against the final head; SQL execution and RLS role-matrix verification still require a migrated test database.
