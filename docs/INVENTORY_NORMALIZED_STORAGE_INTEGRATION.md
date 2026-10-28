# Inventory normalized-storage integration

## Current behavior

The Inventory UI now uses `createNormalizedInventoryRepository`. The repository detects whether the normalized snapshot RPCs are installed and whether this workspace has been marked as migrated.

- If the RPC is not installed, reads and writes continue through the existing `workspace_data` API.
- If the RPC exists but this workspace has not been migrated, the legacy aggregate remains the source of truth until the first successful normalized save.
- On the first normalized save, the adapter persists a durable old-ID-to-UUID map to the legacy aggregate, builds a dry-run migration plan, and calls the transactional snapshot RPC.
- After `preferences.normalized_storage_version = 1` is present, loads and saves use the normalized snapshot.
- Failed normalized writes are returned as failures; the adapter does not silently claim success.
- The RPC never physically deletes rows missing from a client snapshot. Archived records use `deleted_at`; absent rows survive saves.

## New code

- `src/systems/inventory/normalized-repository.js`: aggregate ↔ normalized row mapping and repository mode switch.
- `src/core/core.js`: workspace-scoped RPC wrappers using the existing authenticated Supabase client.
- `supabase/migrations/20261028150000_inventory_snapshot_rpc.sql`: `SECURITY INVOKER` load/save RPCs, transaction-level snapshot writes, RLS-preserving permissions, stable-ID upserts and legacy-audit de-duplication.
- `tests/t_inventory_normalized_repository.mjs`: mapping, ID stability, round-trip, first activation and repeat-save tests.

## Important safety constraints

1. P0, P1 and this RPC migration must be applied and validated in an isolated Supabase project before normalized mode can activate.
2. This branch does not apply SQL to Supabase and does not alter production schema.
3. The first normalized write is a transaction through one RPC. Legacy `workspace_data` is kept as a migration/retry backup during first activation; after the workspace marker is set, the normalized snapshot is authoritative.
4. The durable ID map is scoped by entity type and stored in `inventory_settings.preferences.inventory_id_map` so retries do not generate new UUIDs.
5. Missing ownership-history dates are migration blockers rather than fabricated timestamps.
6. RLS and grants remain active because both RPCs use `SECURITY INVOKER`; write operations must satisfy the relevant table policies as well as the workspace main permission check.
7. The RPC currently synchronizes the domain collections used by the UI. Warranty claims, valuations, and Core Files attachments are schema extensions, not yet editable UI flows.
8. No normalized table is physically deleted by a snapshot save. Review archival behavior and retention requirements before any future purge workflow.

## Validation still required

- Run `npm test` and `npm run build` on this branch.
- Apply P0 → P1 → snapshot RPC migrations to an isolated Supabase project.
- Test RLS for main/view/edit and each section key (`categories`, `places`, `items`, `history`, `warranty`, `replacement`, `loans`, `maintenance`, `documents`).
- Verify repeat save is idempotent, including ownership history and legacy audit events.
- Verify the migration path against an actual export from `workspace_data`; this code has not read or migrated production Inventory data.
- Only after those checks should the migrations be considered for production rollout.
