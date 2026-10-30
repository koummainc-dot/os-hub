# Knowledge & Resource OS — Implementation Contract

## Scope
Arabic-first workspace-scoped knowledge capture and retrieval, integrated into OS Hub's shared authentication and system permission model.

## Current UI capabilities
- Home dashboard and counts; inbox; resources/bookmarks; ideas; standalone notes; meetings; events; date-based calendar view; categories; source types; global search; settings.
- Create/edit/archive/restore/pin/review items; title, URL, summary, full note body, extracted notes/quotes, next action, category, tags, priority, author/published/read/review dates, rating, idea lifecycle, meeting attendees/decisions/follow-ups, event location/date/time. Due review items surface on the home page.
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
- RLS delegates workspace authorization to `ws_access_level(workspace_id, 'knowledge', 'main')`, and only the workspace owner can hard-delete records.

## Lifecycle and behavior rules
- Archive is soft-delete; restoring means toggling the archived filter and setting status back to an active lifecycle value.
- Inbox is triage: capture → review → processed; preserve original URL/source metadata.
- Resource lifecycle: unread → reviewing → processed; review_at powers the review queue.
- Idea lifecycle: captured → exploring → validated → planned → implemented/rejected.
- Meeting follow-ups are actions, not just meeting text; the UI's newline field remains a transitional representation until repository integration is complete.
- Search covers title, summary, notes, URL, type, tags, category, dates, decisions and follow-ups.
- A relation must not cross workspace boundaries; category and tag names are unique per workspace.
- Exports are data portability, not a server backup; imports replace the current workspace payload after confirmation.

## Important integration status
The UI currently persists through the existing workspace `workspace_data` API adapter. The normalized SQL migration is committed as the target schema but is **not applied to production** and is not yet wired into the UI repository. The next integration slice must implement repository/API methods, backfill current JSON payloads transactionally, dual-read/verify, then cut over and remove legacy writes only after migration-history reconciliation (Issue #85). Do not run the migration in production before that reconciliation.

## Acceptance checklist
- [ ] Verify owner/member view/edit RLS on every table.
- [ ] Add transactional JSON-to-normalized backfill and idempotent reconciliation report.
- [ ] Wire category/tag/item/relation/follow-up repositories to the component.
- [ ] Add actual storage bucket/policies for attachments.
- [ ] Validate date/time and source URL input; test imports against malformed/oversized JSON.
- [ ] Verify concurrent saves, multi-user workspace isolation, archive/restore and export/import.
- [ ] Connect relationships to Projects/Learning/Content through supported APIs, not free-text IDs.
- [ ] Run build/lint and feature contract tests before merge/deploy.
