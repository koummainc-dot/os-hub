# Personal Inventory OS — first application slice

Status: **implemented on the review branch; untested; not deployed**.

## What is present in `src/systems/inventory/index.jsx`
- The module is auto-discovered by the existing lazy system loader.
- Arabic RTL interface for Home, Items, Categories, Places, Warranty, Replacement, Documents, Loans, History, Audit, Collections, Maintenance, Archive, and Settings.
- Item add/edit/archive/restore, text search, category/status filters, condition/ownership status, location, quantity, brand/model, purchase date/price/currency, estimated value, sensitivity and notes.
- Category and place creation/editing, with guardrails against archiving records still referenced by active items.
- Initial warranty, loan, replacement-plan and maintenance record forms.
- Demo seed data, dashboard summaries, and an event timeline.
- Uses the existing system API contract and permission model; UI edit controls are gated by section access.

## Important integration boundary
The UI now uses `src/systems/inventory/repository.js` as a repository boundary. That repository currently delegates to the existing `workspace_data` adapter (one Inventory `main` part), because the P1 normalized tables are still draft migrations and have not been applied. The boundary validates the aggregate shape and isolates screens from the storage adapter; it does **not** yet read/write the normalized `inventory_*` tables.

## Known limitations
- Failed persistence now rolls back the optimistic local UI update instead of leaving an unsaved state displayed.
- The current application slice is not tested, per request.
- Secret items are excluded from dashboard, collection views, document references, archive lists, and text-search results. An explicit checkbox can reveal them in the item list only; broad views remain filtered. Search does not index notes. This is UI-level privacy handling, not a replacement for server-side item-level authorization or encryption.
- Added storage-agnostic domain helpers for derived warranty, loan, and replacement states, plus validation for item references, warranty date ranges, loan dates/person, and non-negative replacement/service costs. These are UI/application rules only; server-side enforcement and full lifecycle workflows remain future work.
- Creating/updating warranty, loan, replacement, or service records now adds an application timeline event; marking a loan returned also records a timeline event.
- Document section displays references status only; Core Files upload integration is not connected.
- Event history is an application-level aggregate log; server-enforced append-only normalized history is not active until the migration is reviewed and applied.
- Offline encryption/sync remains disabled.
- No Supabase migration executed, no Supabase branch created, no merge, and no deployment.
