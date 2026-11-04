# SQL source drift follow-up — 2026-11-04

## Scope and safety

This is a read-only comparison of the five remaining Finance/platform migration-history rows whose repository filename prefixes differ from the applied production version. The complete stored SQL statement was retrieved for each row from Supabase migration history and compared with the corresponding file on `main`.

No production DDL, migration-history writes, migration push, or paid Supabase branch was used.

## Results

Each production row contains one stored statement. Every source pair differs both byte-for-byte and after removing SQL comments and normalizing whitespace. Therefore, none of these five differences is merely line-ending or formatting drift.

| Applied version | Applied name | Repository file | Stored SQL chars | Repository SQL chars | Finding |
|---|---|---|---:|---:|---|
| `20261025041105` | `platform_core` | `20261025000000_platform_core.sql` | 14,570 | 16,925 | substantive source drift |
| `20261027181925` | `finance_budget_templates_phase_4` | `20261027182240_finance_budget_templates_phase_4.sql` | 7,175 | 7,151 | substantive source drift |
| `20261027182235` | `finance_budget_rollover_phase_5` | `20261027182600_finance_budget_rollover_phase_5.sql` | 4,115 | 3,996 | substantive source drift |
| `20261027182248` | `finance_budget_rollover_json_array_fix` | `20261027182630_finance_budget_rollover_json_array_fix.sql` | 3,379 | 3,261 | substantive source drift |
| `20261027183913` | `finance_recurring_phase_9` | `20261027184000_finance_recurring_phase_9.sql` | 8,966 | 8,812 | substantive source drift |

These five remain part of the existing 17 timestamp/name mismatches and therefore do not change the previously reported total of 28 applied-source drift entries.

## Required disposition

1. Keep both historical stored SQL and current repository SQL intact.
2. Diff each pair at statement/token level and identify intended later corrections.
3. Inspect the final live catalog definition after all subsequent migrations, not just the original applied statement.
4. If a repository change is still required in production, represent it as a separately reviewed forward migration with a new version.
5. Do not rename a changed file to the production version or rewrite `supabase_migrations.schema_migrations`.

## Test coverage being added alongside this audit

Three separate PostgreSQL 16 disposable-database workflows are being introduced for Inventory, Finance family cash, and Skincare private Storage. They exercise schema application, selected RPC behavior, RLS boundaries, and workspace isolation without connecting to the production database. These are migration-slice smoke tests, not a substitute for the remaining complete Finance catalog/source reconciliation or authenticated two-account live Storage testing.


## Read-only live catalog cross-check for Finance routines

A follow-up query inspected the final production definitions and ACLs for these eight routines:

- `fin_budget_templates_get(uuid)`
- `fin_budget_template_save(jsonb)`
- `fin_budget_template_apply(jsonb)`
- `fin_budget_rollover_apply(jsonb)`
- `fin_recurring_save(jsonb)`
- `fin_recurring_log_payment(jsonb)`
- `fin_recurring_skip(jsonb)`
- `fin_recurring_defer(jsonb)`

All eight routines exist in `public`. All are `SECURITY DEFINER` and have the function-level `search_path=""` setting. The live ACL check returned `anon EXECUTE = false` and `authenticated EXECUTE = true` for each routine.

This confirms that later hardening is reflected in the final production catalog even where an earlier historical statement may show a different function-level search path or privilege state. It does **not** establish that every current repository file matches the final catalog, and it does not make it safe to rewrite any historical migration source. The remaining source pairs still require token-level diff plus chronological review of follow-up migrations.
