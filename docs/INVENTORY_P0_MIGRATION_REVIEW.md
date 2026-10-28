# Personal Inventory OS — P0 migration review and safe-test plan

Status: **Draft only — not applied to any Supabase database**  
Target migration: `20261028120000_inventory_p0_foundation.sql`  
Approved access decision: workspace members can access Inventory only at the effective workspace/system/section permission granted by `public.ws_access_level()`.  
Offline-sensitive-data decision: no client-side sensitive offline storage or encryption claim is enabled by this migration.

## Environment finding

The connected Supabase account currently exposes only project `os-hub` (`cvcngvlickozahecgmij`). It is the active project and is treated as production. No separate test project was found. No Supabase branch was created, and the production database was not changed.

Because there is no isolated database available, database integration tests must be marked **BLOCKED / NOT RUN**, not reported as passing. Before executing DDL, provision or connect an existing non-production Supabase project, or run Supabase local development with disposable data. Do not use production as a test target.

## Required test matrix (run only against isolated disposable DB)

1. Migration applies cleanly on the current platform schema.
2. Re-running migration is safe: tables/indexes/triggers/policies are created or replaced without duplicate-object failures.
3. Anonymous role cannot select or mutate any Inventory table.
4. Authenticated non-member cannot read, insert, update, or delete rows for a workspace.
5. Active workspace member with no Inventory permission gets zero rows / denied writes.
6. Member with Inventory `view` can read but cannot write.
7. Member with Inventory `edit` can read/write only rows in workspaces where that permission is granted.
8. A member suspended or removed from `workspace_members` loses access immediately.
9. Altering `actor_id`, `created_by`, or `updated_by` in a request cannot impersonate another user (triggers/policies own these fields).
10. Updating `workspace_id` is rejected by the immutable-boundary trigger.
11. Duplicate `(workspace_id, actor_id, idempotency_key)` is rejected, preventing duplicate queued operations.
12. A conflict must reference an operation in the same workspace (composite foreign key).
13. Audit log update/delete is rejected; audit log insert is limited to members with Inventory history edit permission.
14. `Secret` and `Sensitive` values are not copied into notification payloads or general search; that behavior is an application-layer gate and needs separate tests.
15. Migration rollback/recovery is documented and verified before any production rollout.

## Review notes / known caveats

- This migration provides server-side queue/conflict metadata, not a complete offline sync engine.
- It intentionally does not enable client-side offline persistence, encryption, or secure key management.
- The effective permission model uses the existing system ID `inventory` and sections `main`, `sync`, `history`, and `links`. UI permission configuration must use matching IDs; otherwise section overrides may hide data unexpectedly.
- `inventory_audit_log` is append-only for authenticated Data API access, but privileged database roles can still alter it. Restrict privileged credentials and operational access.
- Audit and sync payloads must avoid storing full Secret details. Store minimal metadata; sensitive snapshots require separate retention and encryption review.
- The migration is not sufficient to ship P0 until an isolated DB run and RLS matrix above are green.
