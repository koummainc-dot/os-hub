# Personal Inventory OS — P1 domain schema review

Status: **Draft only — not applied to any Supabase database**  
Migration: `20261028130000_inventory_p1_domain_schema.sql`  
Depends on: `20261028120000_inventory_p0_foundation.sql`

## Scope added
- Categories and nested locations.
- Items: item kind, condition, ownership status, category/location, quantity, purchase amount/currency, optional estimated value, sensitivity, and soft reference to a person.
- Multiple identifiers per item (serial, IMEI, asset tag, barcode, registration, other).
- Append-only ownership timeline.
- Multiple warranties per item and warranty claims.
- Replacement plans with optional soft Shopping wishlist reference; no automatic purchase creation.
- Append-only valuations, explicitly separate from Finance transactions/net worth.
- Loans with direction, person snapshot, due date and return state.
- Maintenance/service logs.
- Attachments as references to Core Files; this migration stores no file bytes.

## Authorization and data boundaries
- All tables are workspace-scoped. Child records use composite workspace/parent foreign keys where applicable.
- RLS uses `public.ws_access_level(workspace_id, 'inventory', section)` for sections: `categories`, `places`, `items`, `history`, `warranty`, `replacement`, `loans`, `maintenance`, and `documents`.
- Anonymous Data API access is revoked.
- Ownership events, valuations, and attachments are append-only through authenticated Data API operations.
- Sensitive offline persistence remains disabled; this migration does not implement encryption or the sync engine.
- Cross-system IDs remain soft references; no cross-system foreign keys are introduced.

## Static review update

- Corrected malformed PL/pgSQL dollar-quote delimiters in `inventory_p1_stamp_row()` and `inventory_p1_stamp_append()` (`as $ ... $;`). This was a source-level syntax defect found during static inspection. The migration has **not** been executed against PostgreSQL, so the correction is not a claim that the migration parses or applies successfully.
- Before building the normalized repository adapter, add an explicit mapping between the current aggregate event vocabulary and normalized ownership events/audit records. The aggregate contains events such as `ItemUpdated`, `LoanReturned`, and category/place events that do not all belong in `inventory_ownership_events`.
- Add mapping/default logic for aggregate fields that differ from the normalized schema (for example, category `slug`, loan `status` vs `returned_at`, and `placeId` vs `current_location_id`) before enabling any data migration.

## Review blockers (not tested)
1. Confirm `ws_access_level` recognizes each section ID and uses the expected `view`/`edit` values.
2. Physical deletes for categories/locations referenced by other rows are restricted to preserve workspace-bound composite foreign keys. UI should use soft-delete/archive and offer a clear explanation when a category/location is still referenced.
3. Review the P0/P1 row-stamping conventions and ensure the application never trusts client-supplied actor or owner IDs.
4. Derived values such as current location and ownership status are not calculated from the event log yet. Do not expose the event log as if it automatically controls current state.
5. Duplicate identifier policy (workspace-wide vs per item) remains open; current schema does not add a unique constraint.
6. Sensitive/Secret search and notification suppression still require application-layer implementation.
7. Run the full migration chain against an isolated database and complete the RLS matrix before any production rollout.

## Explicitly not done
- No Supabase branch created.
- No SQL executed against Supabase.
- No tests or build commands run, per request.
- No merge or deployment.
