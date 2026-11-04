# Supabase migration history reconciliation — 2026-11-04

**Repository:** `koummainc-dot/os-hub`  
**Branch:** `main` at `ce79b179b74dc29aa1998543f37938752449c569`  
**Supabase project:** `cvcngvlickozahecgmij`  
**Evidence:** read-only GitHub migration-directory listing + Supabase migration-history listing.  
**Safety:** no production DDL, migration apply, history repair, or paid Supabase branch was created.

## Snapshot

- Live migration history entries: **94**
- SQL migration files on `main`: **101**
- Repository files with one or more same-name live history entries: **87**
- Repository files with no same-name live history entry (candidate pending): **14**
- Same-name entries whose file timestamp differs from live history: **40**
- Live history entries not mapped to a same-name repository file: **10**
- Duplicate live versions: **0**

This is a reconciliation inventory, not authorization to push. Name equality is only a candidate mapping; SQL content/checksum and dependency review are still required.

## Candidate one-to-one map

| Repository file | File prefix | Live version(s) | Status |
|---|---:|---:|---|
| `20261025000000_platform_core.sql` | `20261025000000` | `20261025041105` | timestamp mismatch |
| `20261025010000_records_visibility_realtime.sql` | `20261025010000` | `20261025155657` | timestamp mismatch |
| `20261025020000_collection_sections_map.sql` | `20261025020000` | `20261026155131` | timestamp mismatch |
| `20261027180744_finance_internal_function_permissions.sql` | `20261027180744` | `20261027180744`, `20261027180756` | exact prefix |
| `20261027180756_finance_internal_function_permissions.sql` | `20261027180756` | `20261027180744`, `20261027180756` | exact prefix |
| `20261027180815_records_touch_search_path.sql` | `20261027180815` | `20261027180815` | exact prefix |
| `20261027180948_finance_budgets_phase_2.sql` | `20261027180948` | `20261027180948` | exact prefix |
| `20261027181412_finance_transaction_splits_table.sql` | `20261027181412` | `20261027181412` | exact prefix |
| `20261027181420_finance_post_transaction_with_splits.sql` | `20261027181420` | `20261027181420` | exact prefix |
| `20261027181535_finance_budget_split_aggregation.sql` | `20261027181535` | `20261027181535` | exact prefix |
| `20261027182240_finance_budget_templates_phase_4.sql` | `20261027182240` | `20261027181925` | timestamp mismatch |
| `20261027182600_finance_budget_rollover_phase_5.sql` | `20261027182600` | `20261027182235` | timestamp mismatch |
| `20261027182630_finance_budget_rollover_json_array_fix.sql` | `20261027182630` | `20261027182248` | timestamp mismatch |
| `20261027183200_finance_reconciliation_lock_search_path.sql` | `20261027183200` | `20261027182619` | timestamp mismatch |
| `20261027184000_finance_recurring_phase_9.sql` | `20261027184000` | `20261027183913` | timestamp mismatch |
| `20261027190000_finance_recurring_quarterly_and_skip_phase_13.sql` | `20261027190000` | `20261027184945` | timestamp mismatch |
| `20261027191500_finance_recurring_date_anchor_correction_phase_14.sql` | `20261027191500` | `20261027185651` | timestamp mismatch |
| `20261027192500_finance_projects_ledger_lens_phase_15.sql` | `20261027192500` | `20261027185938` | timestamp mismatch |
| `20261027194000_finance_net_worth_history_phase_17.sql` | `20261027194000` | `20261027190403` | timestamp mismatch |
| `20261028092121_finance_budget_categories_debt_upgrade.sql` | `20261028092121` | `20261028092121` | exact prefix |
| `20261028092600_finance_category_bank_interest_income.sql` | `20261028092600` | `20261028092718` | timestamp mismatch |
| `20261028110150_finance_family_center.sql` | `20261028110150` | `20261028110150` | exact prefix |
| `20261028110153_finance_family_allocation_rpc.sql` | `20261028110153` | `20261028110153` | exact prefix |
| `20261028110238_finance_family_rpc_privilege_hardening.sql` | `20261028110238` | `20261028110238` | exact prefix |
| `20261028120000_inventory_p0_foundation.sql` | `20261028120000` | — | NO LIVE MATCH |
| `20261028130000_finance_default_category_seeding.sql` | `20261028130000` | — | NO LIVE MATCH |
| `20261028130000_inventory_p1_domain_schema.sql` | `20261028130000` | — | NO LIVE MATCH |
| `20261028150000_inventory_snapshot_rpc.sql` | `20261028150000` | — | NO LIVE MATCH |
| `20261028200000_finance_asset_valuation_history_phase_20.sql` | `20261028200000` | `20261027212802` | timestamp mismatch |
| `20261028203000_finance_asset_function_search_path_hardening.sql` | `20261028203000` | `20261027212952` | timestamp mismatch |
| `20261028210000_finance_budget_period_validation_fix.sql` | `20261028210000` | `20261028051847` | timestamp mismatch |
| `20261028213000_finance_currency_catalog.sql` | `20261028213000` | `20261028052101` | timestamp mismatch |
| `20261028214000_finance_fx_rate_currency_validation.sql` | `20261028214000` | `20261028052216` | timestamp mismatch |
| `20261028220000_finance_budget_insights_read_model.sql` | `20261028220000` | `20261028052603` | timestamp mismatch |
| `20261028223000_finance_projects_link_to_projects_os.sql` | `20261028223000` | `20261028052945` | timestamp mismatch |
| `20261028230000_finance_reports_server_analytics.sql` | `20261028230000` | `20261028053220` | timestamp mismatch |
| `20261028233000_finance_recurring_defer_catchup.sql` | `20261028233000` | `20261028053543` | timestamp mismatch |
| `20261028240000_finance_asset_lifecycle.sql` | `20261028240000` | `20261028054012` | timestamp mismatch |
| `20261029100000_relationships_atomic_batch.sql` | `20261029100000` | `20261029061352` | timestamp mismatch |
| `20261029121500_relationships_atomic_batch_null_access_fix.sql` | `20261029121500` | `20261029061546` | timestamp mismatch |
| `20261029160000_projects_atomic_records_batch.sql` | `20261029160000` | `20261029155533` | timestamp mismatch |
| `20261029170000_projects_atomic_completion_batch.sql` | `20261029170000` | `20261029173536` | timestamp mismatch |
| `20261029180000_projects_atomic_trash_batch.sql` | `20261029180000` | `20261029211950` | timestamp mismatch |
| `20261029190000_projects_purge_records_batch.sql` | `20261029190000` | `20261029213602` | timestamp mismatch |
| `20261030100000_projects_final_output_guard.sql` | `20261030100000` | — | NO LIVE MATCH |
| `20261030110000_projects_task_issue_traceability.sql` | `20261030110000` | — | NO LIVE MATCH |
| `20261030120000_projects_task_issue_deferred_validation.sql` | `20261030120000` | — | NO LIVE MATCH |
| `20261030130000_finance_family_cash_tracking.sql` | `20261030130000` | — | NO LIVE MATCH |
| `20261030140000_knowledge_resource_os.sql` | `20261030140000` | `20261030150615` | timestamp mismatch |
| `20261030153224_learning_os_normalized_storage.sql` | `20261030153224` | `20261030153224` | exact prefix |
| `20261101030716_sports_private_body_progress_storage.sql` | `20261101030716` | `20261101030716` | exact prefix |
| `20261101102730_nutrition_os_p0_p1_foundation.sql` | `20261101102730` | `20261101102730` | exact prefix |
| `20261101102904_nutrition_os_fk_delete_safety.sql` | `20261101102904` | `20261101102904` | exact prefix |
| `20261101102957_nutrition_os_privilege_hardening.sql` | `20261101102957` | `20261101102957` | exact prefix |
| `20261101103115_nutrition_os_audit_immutability.sql` | `20261101103115` | `20261101103115` | exact prefix |
| `20261101103428_nutrition_os_p2_recipes_goals_planning_grocery.sql` | `20261101103428` | `20261101103428` | exact prefix |
| `20261101103850_nutrition_food_aliases_and_household_portions.sql` | `20261101103850` | `20261101103850` | exact prefix |
| `20261101113637_home_os_phase1_foundation.sql` | `20261101113637` | `20261101113637` | exact prefix |
| `20261101113640_home_os_phase2_operations.sql` | `20261101113640` | `20261101113640` | exact prefix |
| `20261101113644_home_os_operations_snapshot.sql` | `20261101113644` | `20261101113644` | exact prefix |
| `20261101113647_home_os_atomic_purchase_receipts.sql` | `20261101113647` | `20261101113647` | exact prefix |
| `20261101113653_home_os_relational_operations.sql` | `20261101113653` | `20261101113653` | exact prefix |
| `20261101113656_home_os_operations_concurrency.sql` | `20261101113656` | `20261101113656` | exact prefix |
| `20261101113659_home_os_atomic_inventory_movements.sql` | `20261101113659` | `20261101113659` | exact prefix |
| `20261101113703_home_os_inventory_ledger_guard.sql` | `20261101113703` | `20261101113703` | exact prefix |
| `20261101113707_home_os_snapshot_concurrency.sql` | `20261101113707` | `20261101113707` | exact prefix |
| `20261101113714_home_finance_outbox_reader.sql` | `20261101113714` | `20261101113714` | exact prefix |
| `20261101113720_home_today_outbox_reader.sql` | `20261101113720` | `20261101113720` | exact prefix |
| `20261101113723_home_operations_reconciliation_report.sql` | `20261101113723` | `20261101113723` | exact prefix |
| `20261101113726_home_finance_outbox_ack.sql` | `20261101113726` | `20261101113726` | exact prefix |
| `20261101113730_home_os_stock_version_bump.sql` | `20261101113730` | `20261101113730` | exact prefix |
| `20261101130000_spiritual_values_foundation.sql` | `20261101130000` | `20261103090432` | timestamp mismatch |
| `20261101143000_spiritual_practice_logs.sql` | `20261101143000` | `20261103090434` | timestamp mismatch |
| `20261101150000_os_integration_events.sql` | `20261101150000` | — | NO LIVE MATCH |
| `20261101160000_spiritual_practice_log_integrity.sql` | `20261101160000` | `20261103090436` | timestamp mismatch |
| `20261101173000_spiritual_client_side_encryption.sql` | `20261101173000` | `20261103090438` | timestamp mismatch |
| `20261101200000_spiritual_record_relations.sql` | `20261101200000` | `20261103090441` | timestamp mismatch |
| `20261101213000_spiritual_integration_privacy.sql` | `20261101213000` | `20261103090443` | timestamp mismatch |
| `20261102103000_hobbies_journal_private_visibility.sql` | `20261102103000` | — | NO LIVE MATCH |
| `20261102110000_hobbies_journal_private_storage.sql` | `20261102110000` | — | NO LIVE MATCH |
| `20261102120000_hobbies_journal_audit_history.sql` | `20261102120000` | — | NO LIVE MATCH |
| `20261102130000_hobbies_journal_attachment_lifecycle.sql` | `20261102130000` | — | NO LIVE MATCH |
| `20261103090000_hobbies_import_records_batch.sql` | `20261103090000` | `20261103091014` | timestamp mismatch |
| `20261103134221_health_os_h1_foundation.sql` | `20261103134221` | `20261103134221` | exact prefix |
| `20261103134401_health_os_h1_storage_scope_fix.sql` | `20261103134401` | `20261103134401` | exact prefix |
| `20261103135639_health_os_h2_core_records.sql` | `20261103135639` | `20261103135639` | exact prefix |
| `20261103140304_health_os_h1_document_registry.sql` | `20261103140304` | `20261103140304` | exact prefix |
| `20261103141026_health_os_h3_medications_flare_events.sql` | `20261103141026` | `20261103141026` | exact prefix |
| `20261103141038_health_os_h3_integrity_fix.sql` | `20261103141038` | `20261103141038` | exact prefix |
| `20261103142005_health_os_h4_daily_trackers.sql` | `20261103142005` | `20261103142005` | exact prefix |
| `20261103142017_health_os_h4_daily_trackers_schema.sql` | `20261103142017` | `20261103142017` | exact prefix |
| `20261103142200_health_os_h4_cycle_settings_owner_only.sql` | `20261103142200` | `20261103142324` | timestamp mismatch |
| `20261103142324_health_os_h4_cycle_settings_owner_only.sql` | `20261103142324` | `20261103142324` | exact prefix |
| `20261103142823_health_os_grant_rls_recursion_fix.sql` | `20261103142823` | `20261103142823` | exact prefix |
| `20261103142910_health_h4_grant_scope_allowlist.sql` | `20261103142910` | `20261103142910` | exact prefix |
| `20261103143000_health_os_grant_rls_recursion_fix.sql` | `20261103143000` | `20261103142823` | timestamp mismatch |
| `20261103143500_health_h4_grant_scope_allowlist.sql` | `20261103143500` | `20261103142910` | timestamp mismatch |
| `20261103145907_health_h2_1_vital_measurements.sql` | `20261103145907` | `20261103145907` | exact prefix |
| `20261103150138_health_h2_1_measurement_audit_policy_hardening.sql` | `20261103150138` | `20261103150138` | exact prefix |
| `20261103151035_health_h2_2_body_map_symptom_locations.sql` | `20261103151035` | `20261103151035` | exact prefix |
| `20261103160000_skincare_os_private_storage_and_collection_permissions.sql` | `20261103160000` | — | NO LIVE MATCH |

## Repository files with no live same-name history entry

- `20261028120000_inventory_p0_foundation.sql`
- `20261028130000_finance_default_category_seeding.sql`
- `20261028130000_inventory_p1_domain_schema.sql`
- `20261028150000_inventory_snapshot_rpc.sql`
- `20261030100000_projects_final_output_guard.sql`
- `20261030110000_projects_task_issue_traceability.sql`
- `20261030120000_projects_task_issue_deferred_validation.sql`
- `20261030130000_finance_family_cash_tracking.sql`
- `20261101150000_os_integration_events.sql`
- `20261102103000_hobbies_journal_private_visibility.sql`
- `20261102110000_hobbies_journal_private_storage.sql`
- `20261102120000_hobbies_journal_audit_history.sql`
- `20261102130000_hobbies_journal_attachment_lifecycle.sql`
- `20261103160000_skincare_os_private_storage_and_collection_permissions.sql`

These are candidates for pending migrations only. In particular, the Projects-related files include:
- `20261030100000_projects_final_output_guard.sql`
- `20261030110000_projects_task_issue_traceability.sql`
- `20261030120000_projects_task_issue_deferred_validation.sql`

Do not apply them until their exact effects, prerequisites, and relationship to the live schema have been tested.

## Live history entries without a same-name file

- `20261027074905` — `finance_a_schema`
- `20261027075030` — `finance_b_engine`
- `20261027075354` — `finance_c_rpcs`
- `20261027075441` — `finance_d_fix_asset_upsert`
- `20261027075509` — `finance_e_fix_id_ambiguity`
- `20261027174438` — `finance_f_fix_err_null_detail`
- `20261027185041` — `finance_recurring_defer_rpc_wrapper_phase_13`
- `20261027190550` — `finance_net_worth_snapshot_json_alias_fix`
- `20261028054205` — `finance_asset_lifecycle_permission_hardening`
- `20261103141516` — `health_os_h3_state_constraints`

These require locating historical source/content or proving they were consolidated/renamed. Do not create replacement files or alter history based on names alone.

## Timestamp mismatches

- `20261025000000_platform_core.sql` → live `20261025041105`
- `20261025010000_records_visibility_realtime.sql` → live `20261025155657`
- `20261025020000_collection_sections_map.sql` → live `20261026155131`
- `20261027182240_finance_budget_templates_phase_4.sql` → live `20261027181925`
- `20261027182600_finance_budget_rollover_phase_5.sql` → live `20261027182235`
- `20261027182630_finance_budget_rollover_json_array_fix.sql` → live `20261027182248`
- `20261027183200_finance_reconciliation_lock_search_path.sql` → live `20261027182619`
- `20261027184000_finance_recurring_phase_9.sql` → live `20261027183913`
- `20261027190000_finance_recurring_quarterly_and_skip_phase_13.sql` → live `20261027184945`
- `20261027191500_finance_recurring_date_anchor_correction_phase_14.sql` → live `20261027185651`
- `20261027192500_finance_projects_ledger_lens_phase_15.sql` → live `20261027185938`
- `20261027194000_finance_net_worth_history_phase_17.sql` → live `20261027190403`
- `20261028092600_finance_category_bank_interest_income.sql` → live `20261028092718`
- `20261028200000_finance_asset_valuation_history_phase_20.sql` → live `20261027212802`
- `20261028203000_finance_asset_function_search_path_hardening.sql` → live `20261027212952`
- `20261028210000_finance_budget_period_validation_fix.sql` → live `20261028051847`
- `20261028213000_finance_currency_catalog.sql` → live `20261028052101`
- `20261028214000_finance_fx_rate_currency_validation.sql` → live `20261028052216`
- `20261028220000_finance_budget_insights_read_model.sql` → live `20261028052603`
- `20261028223000_finance_projects_link_to_projects_os.sql` → live `20261028052945`
- `20261028230000_finance_reports_server_analytics.sql` → live `20261028053220`
- `20261028233000_finance_recurring_defer_catchup.sql` → live `20261028053543`
- `20261028240000_finance_asset_lifecycle.sql` → live `20261028054012`
- `20261029100000_relationships_atomic_batch.sql` → live `20261029061352`
- `20261029121500_relationships_atomic_batch_null_access_fix.sql` → live `20261029061546`
- `20261029160000_projects_atomic_records_batch.sql` → live `20261029155533`
- `20261029170000_projects_atomic_completion_batch.sql` → live `20261029173536`
- `20261029180000_projects_atomic_trash_batch.sql` → live `20261029211950`
- `20261029190000_projects_purge_records_batch.sql` → live `20261029213602`
- `20261030140000_knowledge_resource_os.sql` → live `20261030150615`
- `20261101130000_spiritual_values_foundation.sql` → live `20261103090432`
- `20261101143000_spiritual_practice_logs.sql` → live `20261103090434`
- `20261101160000_spiritual_practice_log_integrity.sql` → live `20261103090436`
- `20261101173000_spiritual_client_side_encryption.sql` → live `20261103090438`
- `20261101200000_spiritual_record_relations.sql` → live `20261103090441`
- `20261101213000_spiritual_integration_privacy.sql` → live `20261103090443`
- `20261103090000_hobbies_import_records_batch.sql` → live `20261103091014`
- `20261103142200_health_os_h4_cycle_settings_owner_only.sql` → live `20261103142324`
- `20261103143000_health_os_grant_rls_recursion_fix.sql` → live `20261103142823`
- `20261103143500_health_h4_grant_scope_allowlist.sql` → live `20261103142910`

The full candidate map above includes all detected mismatches, not just the previously documented core/Projects examples.

## Duplicate live migration names

- `finance_internal_function_permissions`: `20261027180744`, `20261027180756`

## Additional known dependency

Issue #85 comment records that PR #84 changed the Projects atomic batch allowlist to include `discovery` in both client and server paths, with the repository migration updated only on its branch at that time. That change must be included in the historical SQL/content audit before rollout.

## Required gates before production rollout

1. Retrieve and hash the exact SQL content for every repository migration and historical live-only version; establish a one-to-one intent map, including duplicate-name entries.
2. Inspect the live schema and function definitions read-only to establish which effects already exist.
3. Determine which migrations were applied under alternate versions and whether their SQL content matches the current repository files.
4. Review every candidate pending migration in timestamp order, including migrations outside Projects that precede the Projects chain.
5. Run the complete migration chain against a clean disposable PostgreSQL database and a schema-equivalent snapshot. User explicitly declined paid Supabase branches, so use local PostgreSQL/CI or another already-available non-billable disposable environment; do not create a paid branch.
6. Only after all evidence is complete, propose a documented Supabase-supported reconciliation path. Never edit `supabase_migrations.schema_migrations` manually.
7. Re-run read-only schema/function checks and CI smoke tests before any production apply.

## Projects merge gate

PR #92 and PR #93 are both based on the older mainline and diverged by 371 commits. Do not merge either branch wholesale. Rebuild the Projects behavior selectively on a branch from the current mainline, then run the full application test/build suite and the Projects PostgreSQL smoke workflow. Browser acceptance remains separate and must not be marked passed without a preview built from the exact tested commit.

## Other OS reconciliation remains in scope

- Learning: compare PR #90 against current main; do not replay its already-applied storage migration.
- Nutrition: preserve the current main implementation; extract only verified missing UI/domain improvements from PR #99.
- Habit/Hobbies: PR #107 is already merged; do not replay PR #106. Keep the remaining privacy, reload/restore, timezone, pause/streak, and notification tests visible in the master gap list.
- Projects: consolidate #92/#93 without duplicate or destructive replacement.
