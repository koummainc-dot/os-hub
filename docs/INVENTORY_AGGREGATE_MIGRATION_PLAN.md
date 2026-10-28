# Inventory aggregate → normalized-table migration plan

**Status: dry-run planning only. No database writes; not connected to the live repository.**

## What was added
- `src/systems/inventory/migration-plan.js` converts the current `workspace_data` aggregate into proposed rows for P0 settings and the P1 category, location, item, ownership-event, warranty, loan, replacement, service-log and audit tables.
- `tests/t_inventory_migration_plan.mjs` checks ID resolution, relation mapping, privacy, decimal preservation, unknown-value handling and routing non-ownership events to the audit stream.
- The converter is pure: it returns a plan, blockers and warnings. It does not call Supabase, execute SQL, create users, or persist an ID map.

## Required before an isolated migration
1. Supply a stable UUID resolver for any legacy IDs that are not UUIDs. It must persist a durable old-ID → UUID mapping and return the same UUID on every run. Random IDs per run are prohibited.
2. Resolve every blocker and review every warning. Do not apply a partial plan that silently drops unresolved rows or relationships.
3. Review slug collisions and parent/item references, then validate the complete row set against the actual database constraints in an isolated database.
4. Decide actor attribution. The plan intentionally does not fabricate `created_by` / `updated_by` user IDs.
5. Define how legacy demo data is handled and how category/place/item soft-deletion should be reconciled.
6. Run a read-only inventory/count comparison before and after migration; test idempotency by rerunning the same plan against the same ID map.
7. Only after review and explicit approval, implement a transactional writer and test it against an isolated database. Production remains untouched.

## Deliberate mappings and limits
- Item `placeId` maps to `current_location_id`; place `parentId` maps to `parent_id`.
- Category slug derives from the explicit slug or category name; duplicate slug candidates receive an ID suffix where detected.
- Loan direction maps to `loan_direction`; a populated `returnedAt` or legacy Returned status maps to normalized Returned status.
- Money stays a decimal string and unknown values remain `null`; zero is preserved as zero.
- Only the ownership event types accepted by the P1 enum enter `inventory_ownership_events`. Other legacy event types are routed to `inventory_audit_log` so they are not incorrectly forced into an ownership event.
- This is a migration plan, not proof that every row will satisfy the live schema. Constraints, RLS, UUID validity, duplicate IDs/slugs, missing relationships and dates still require isolated-database validation.
