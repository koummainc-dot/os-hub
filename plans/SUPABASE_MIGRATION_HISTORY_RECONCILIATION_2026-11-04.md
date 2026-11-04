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


## 2026-11-04 follow-up — repository blob identity and unmatched entries

A fresh read-only comparison was run against the current `main` Git tree and live Supabase migration history on 2026-11-04.

- Repository migration files: **101**
- Live history entries: **94**
- Exact version-prefix matches: **47**
- Unique migration-name matches with timestamp mismatch: **37**
- Live entries with no same-name repository file: **10**
- Repository files with no same-name live entry (pending candidates, not authorization to apply): **14**

The SHA column below is the **Git blob SHA of the current repository file**, not a checksum recorded by Supabase. Supabase migration history does not expose the historical SQL file checksum here; therefore a name match plus Git blob identity does not prove that the exact bytes previously applied are identical. The live schema/object checks and original historical SQL still need review before any reconciliation action.

### Live history → repository file mapping

| Live version | Live name | Candidate repository file | Git blob SHA | Mapping |
|---|---|---|---|---|
| `20261025041105` | `platform_core` | `supabase/migrations/20261025000000_platform_core.sql` | `19a998d65ff1c5a9ddbbab3485361885c6b4722c` | unique-name |
| `20261025155657` | `records_visibility_realtime` | `supabase/migrations/20261025010000_records_visibility_realtime.sql` | `4dee61541719f4c231aa92e95e21b3c9576f9353` | unique-name |
| `20261026155131` | `collection_sections_map` | `supabase/migrations/20261025020000_collection_sections_map.sql` | `5521b8f9df9f50806812ea2b66c03b6fd0780312` | unique-name |
| `20261027074905` | `finance_a_schema` | — | `—` | unmatched |
| `20261027075030` | `finance_b_engine` | — | `—` | unmatched |
| `20261027075354` | `finance_c_rpcs` | — | `—` | unmatched |
| `20261027075441` | `finance_d_fix_asset_upsert` | — | `—` | unmatched |
| `20261027075509` | `finance_e_fix_id_ambiguity` | — | `—` | unmatched |
| `20261027174438` | `finance_f_fix_err_null_detail` | — | `—` | unmatched |
| `20261027180744` | `finance_internal_function_permissions` | `supabase/migrations/20261027180744_finance_internal_function_permissions.sql` | `8df564be03c8b72dfe414ab6a7fbc373c1a97424` | exact-version |
| `20261027180756` | `finance_internal_function_permissions` | `supabase/migrations/20261027180756_finance_internal_function_permissions.sql` | `8df564be03c8b72dfe414ab6a7fbc373c1a97424` | exact-version |
| `20261027180815` | `records_touch_search_path` | `supabase/migrations/20261027180815_records_touch_search_path.sql` | `f36cb1b216ad4d291a9df675e3d7fbf6573f1925` | exact-version |
| `20261027180948` | `finance_budgets_phase_2` | `supabase/migrations/20261027180948_finance_budgets_phase_2.sql` | `4269f73c2cd803138b9e7382c2897ac4ffd03e57` | exact-version |
| `20261027181412` | `finance_transaction_splits_table` | `supabase/migrations/20261027181412_finance_transaction_splits_table.sql` | `98a70bb168521723f203643bd0caf1a5f17d65be` | exact-version |
| `20261027181420` | `finance_post_transaction_with_splits` | `supabase/migrations/20261027181420_finance_post_transaction_with_splits.sql` | `97f352d5e03e72f09cb7a640dc0d456fc110a309` | exact-version |
| `20261027181535` | `finance_budget_split_aggregation` | `supabase/migrations/20261027181535_finance_budget_split_aggregation.sql` | `f823838ca7868f9545b1de09671186f0abe2b397` | exact-version |
| `20261027181925` | `finance_budget_templates_phase_4` | `supabase/migrations/20261027182240_finance_budget_templates_phase_4.sql` | `dfcd37a82ab9b09d61b379f3c8df0b73f0e9ae68` | unique-name |
| `20261027182235` | `finance_budget_rollover_phase_5` | `supabase/migrations/20261027182600_finance_budget_rollover_phase_5.sql` | `2e090e838263acb7704b3a2d35bb1093df64c257` | unique-name |
| `20261027182248` | `finance_budget_rollover_json_array_fix` | `supabase/migrations/20261027182630_finance_budget_rollover_json_array_fix.sql` | `51cbd8b972615b18323cd09e265aad15718c061c` | unique-name |
| `20261027182619` | `finance_reconciliation_lock_search_path` | `supabase/migrations/20261027183200_finance_reconciliation_lock_search_path.sql` | `cfa44fbe1be62ef21dcece6d39d5840e0e61c93d` | unique-name |
| `20261027183913` | `finance_recurring_phase_9` | `supabase/migrations/20261027184000_finance_recurring_phase_9.sql` | `906860210c2a732e8a11686418870fc17a1d6c8a` | unique-name |
| `20261027184945` | `finance_recurring_quarterly_and_skip_phase_13` | `supabase/migrations/20261027190000_finance_recurring_quarterly_and_skip_phase_13.sql` | `45a7a48ee36669e90012eecdb1e42d2c6af52e3f` | unique-name |
| `20261027185041` | `finance_recurring_defer_rpc_wrapper_phase_13` | — | `—` | unmatched |
| `20261027185651` | `finance_recurring_date_anchor_correction_phase_14` | `supabase/migrations/20261027191500_finance_recurring_date_anchor_correction_phase_14.sql` | `083a20755b5f0abd474e98e379035459c08200f8` | unique-name |
| `20261027185938` | `finance_projects_ledger_lens_phase_15` | `supabase/migrations/20261027192500_finance_projects_ledger_lens_phase_15.sql` | `eb6b92ce9eb6252e54bc3b984445421bcb5fec90` | unique-name |
| `20261027190403` | `finance_net_worth_history_phase_17` | `supabase/migrations/20261027194000_finance_net_worth_history_phase_17.sql` | `51331bb73a7f7896d972696c393fa0a147f16249` | unique-name |
| `20261027190550` | `finance_net_worth_snapshot_json_alias_fix` | — | `—` | unmatched |
| `20261027212802` | `finance_asset_valuation_history_phase_20` | `supabase/migrations/20261028200000_finance_asset_valuation_history_phase_20.sql` | `177e18fc5107d87534ceeac6267b3cbc49ed5a02` | unique-name |
| `20261027212952` | `finance_asset_function_search_path_hardening` | `supabase/migrations/20261028203000_finance_asset_function_search_path_hardening.sql` | `79b80eede4f7b956240d1591f6720ac51b887a2f` | unique-name |
| `20261028051847` | `finance_budget_period_validation_fix` | `supabase/migrations/20261028210000_finance_budget_period_validation_fix.sql` | `e64b428f99d9ec7e193b34dcbb80b29886717b04` | unique-name |
| `20261028052101` | `finance_currency_catalog` | `supabase/migrations/20261028213000_finance_currency_catalog.sql` | `f4fcfe603f309b929354e69455170fc03ce9c298` | unique-name |
| `20261028052216` | `finance_fx_rate_currency_validation` | `supabase/migrations/20261028214000_finance_fx_rate_currency_validation.sql` | `38173fd31933c385ee0cde81ebd2d24cb1bd0125` | unique-name |
| `20261028052603` | `finance_budget_insights_read_model` | `supabase/migrations/20261028220000_finance_budget_insights_read_model.sql` | `da9847061f8fb6d967fdae62100c4c1b6c792980` | unique-name |
| `20261028052945` | `finance_projects_link_to_projects_os` | `supabase/migrations/20261028223000_finance_projects_link_to_projects_os.sql` | `331f36d51d67ed4353d0d09b97b722a88e122e11` | unique-name |
| `20261028053220` | `finance_reports_server_analytics` | `supabase/migrations/20261028230000_finance_reports_server_analytics.sql` | `5e266e00f795625a39323eaeeec5f63b78e19207` | unique-name |
| `20261028053543` | `finance_recurring_defer_catchup` | `supabase/migrations/20261028233000_finance_recurring_defer_catchup.sql` | `30c451b3f7c95ed9bf74f7cf168d2991ee12f94c` | unique-name |
| `20261028054012` | `finance_asset_lifecycle` | `supabase/migrations/20261028240000_finance_asset_lifecycle.sql` | `bcc247fe89d5b7a7f97d7cde258293c3409bf4d8` | unique-name |
| `20261028054205` | `finance_asset_lifecycle_permission_hardening` | — | `—` | unmatched |
| `20261028092121` | `finance_budget_categories_debt_upgrade` | `supabase/migrations/20261028092121_finance_budget_categories_debt_upgrade.sql` | `15876ebfc14266cb474887effb0e52fe4af1ecd1` | exact-version |
| `20261028092718` | `finance_category_bank_interest_income` | `supabase/migrations/20261028092600_finance_category_bank_interest_income.sql` | `d9d36850e593e255f50070f2e7a2f4232729eca0` | unique-name |
| `20261028110150` | `finance_family_center` | `supabase/migrations/20261028110150_finance_family_center.sql` | `2036572e206d9a7b2a208d4f238cce65e0ae4b14` | exact-version |
| `20261028110153` | `finance_family_allocation_rpc` | `supabase/migrations/20261028110153_finance_family_allocation_rpc.sql` | `23e7b07f38a808e873f7858c39248795b72f673d` | exact-version |
| `20261028110238` | `finance_family_rpc_privilege_hardening` | `supabase/migrations/20261028110238_finance_family_rpc_privilege_hardening.sql` | `31b30d1e0200ac275b64fbd49dff231a66df3573` | exact-version |
| `20261029061352` | `relationships_atomic_batch` | `supabase/migrations/20261029100000_relationships_atomic_batch.sql` | `6e8c47563a832d473bc1d1bc1108a2517bf6eadf` | unique-name |
| `20261029061546` | `relationships_atomic_batch_null_access_fix` | `supabase/migrations/20261029121500_relationships_atomic_batch_null_access_fix.sql` | `b6270b5095855ac7b167ae08b27e6a3c4700370e` | unique-name |
| `20261029155533` | `projects_atomic_records_batch` | `supabase/migrations/20261029160000_projects_atomic_records_batch.sql` | `ba39221a4f3f9889b7ecb7f891ce78efed33e614` | unique-name |
| `20261029173536` | `projects_atomic_completion_batch` | `supabase/migrations/20261029170000_projects_atomic_completion_batch.sql` | `c00f7c5cd907eaffdaf43ab97f28b3a581601360` | unique-name |
| `20261029211950` | `projects_atomic_trash_batch` | `supabase/migrations/20261029180000_projects_atomic_trash_batch.sql` | `e530d532bb924322a09e782c005ab189f1ec5948` | unique-name |
| `20261029213602` | `projects_purge_records_batch` | `supabase/migrations/20261029190000_projects_purge_records_batch.sql` | `1daebb263adb65a60e537b2f8be03fbc03c061a8` | unique-name |
| `20261030150615` | `knowledge_resource_os` | `supabase/migrations/20261030140000_knowledge_resource_os.sql` | `7847684adf3dde467062e0e2cbf5fb6a70657433` | unique-name |
| `20261030153224` | `learning_os_normalized_storage` | `supabase/migrations/20261030153224_learning_os_normalized_storage.sql` | `6b9e5a37ae8ac0e16c8cb6f89493426b3d73a7bf` | exact-version |
| `20261101030716` | `sports_private_body_progress_storage` | `supabase/migrations/20261101030716_sports_private_body_progress_storage.sql` | `daadeb5f0e58ad1fcb16a35ccf10bc1e9d2ea97f` | exact-version |
| `20261101102730` | `nutrition_os_p0_p1_foundation` | `supabase/migrations/20261101102730_nutrition_os_p0_p1_foundation.sql` | `f3c3358f4790bb9bb88121ce5dc5f54ff7bfd300` | exact-version |
| `20261101102904` | `nutrition_os_fk_delete_safety` | `supabase/migrations/20261101102904_nutrition_os_fk_delete_safety.sql` | `04127834de3b2868dbaf0c54c20916d2bf730913` | exact-version |
| `20261101102957` | `nutrition_os_privilege_hardening` | `supabase/migrations/20261101102957_nutrition_os_privilege_hardening.sql` | `58b66f2f0de687dadeac8cb937398e0fab4582cb` | exact-version |
| `20261101103115` | `nutrition_os_audit_immutability` | `supabase/migrations/20261101103115_nutrition_os_audit_immutability.sql` | `33480ed01631277e66d53e0c9d00431215dc4d49` | exact-version |
| `20261101103428` | `nutrition_os_p2_recipes_goals_planning_grocery` | `supabase/migrations/20261101103428_nutrition_os_p2_recipes_goals_planning_grocery.sql` | `ea9d8f11529261809c60db2a4634dbecc7e343ae` | exact-version |
| `20261101103850` | `nutrition_food_aliases_and_household_portions` | `supabase/migrations/20261101103850_nutrition_food_aliases_and_household_portions.sql` | `9a7ce29d793201e44f7c1bd3afabb37dfde69b99` | exact-version |
| `20261101113637` | `home_os_phase1_foundation` | `supabase/migrations/20261101113637_home_os_phase1_foundation.sql` | `2ad94e7735a7e6caf6365c95a5435c889f3ccd97` | exact-version |
| `20261101113640` | `home_os_phase2_operations` | `supabase/migrations/20261101113640_home_os_phase2_operations.sql` | `358c8d8820f90a0f0011ccc1c95a50a22c6b04ac` | exact-version |
| `20261101113644` | `home_os_operations_snapshot` | `supabase/migrations/20261101113644_home_os_operations_snapshot.sql` | `7ca74de1a029de3663495432d734c686c95da0d0` | exact-version |
| `20261101113647` | `home_os_atomic_purchase_receipts` | `supabase/migrations/20261101113647_home_os_atomic_purchase_receipts.sql` | `80378ca75a7b9be915f06dd51fbbe6bb5a36d877` | exact-version |
| `20261101113653` | `home_os_relational_operations` | `supabase/migrations/20261101113653_home_os_relational_operations.sql` | `22c8603e75e0b01be1d3a38f1beb3ead0edbfa53` | exact-version |
| `20261101113656` | `home_os_operations_concurrency` | `supabase/migrations/20261101113656_home_os_operations_concurrency.sql` | `07b247ffc582dd677941d26adaabd27cf699e90b` | exact-version |
| `20261101113659` | `home_os_atomic_inventory_movements` | `supabase/migrations/20261101113659_home_os_atomic_inventory_movements.sql` | `78cc76cea31a2cc4877e9a5ff57bb570cf13e8cc` | exact-version |
| `20261101113703` | `home_os_inventory_ledger_guard` | `supabase/migrations/20261101113703_home_os_inventory_ledger_guard.sql` | `93882b06f8b28c146b9f94f412ba62c26f10b54a` | exact-version |
| `20261101113707` | `home_os_snapshot_concurrency` | `supabase/migrations/20261101113707_home_os_snapshot_concurrency.sql` | `29b6c982491bc354e1eff991338726e3d92691bf` | exact-version |
| `20261101113714` | `home_finance_outbox_reader` | `supabase/migrations/20261101113714_home_finance_outbox_reader.sql` | `b97a335d9b1cd1281751b89ec0ee53b1075af56d` | exact-version |
| `20261101113720` | `home_today_outbox_reader` | `supabase/migrations/20261101113720_home_today_outbox_reader.sql` | `d80e151cf9da2c99fb8c949130ff5bd919d5b568` | exact-version |
| `20261101113723` | `home_operations_reconciliation_report` | `supabase/migrations/20261101113723_home_operations_reconciliation_report.sql` | `c5d1d28cc925c2ce215020fb3a2cb78e9a2d57c9` | exact-version |
| `20261101113726` | `home_finance_outbox_ack` | `supabase/migrations/20261101113726_home_finance_outbox_ack.sql` | `f393f46640c802ca7899bcca31158fa90b1c469b` | exact-version |
| `20261101113730` | `home_os_stock_version_bump` | `supabase/migrations/20261101113730_home_os_stock_version_bump.sql` | `692239bfbfd7a93126f56f4388bba410a741bdcf` | exact-version |
| `20261103090432` | `spiritual_values_foundation` | `supabase/migrations/20261101130000_spiritual_values_foundation.sql` | `bab1321c2683253889f553cb16a02bfd9d118919` | unique-name |
| `20261103090434` | `spiritual_practice_logs` | `supabase/migrations/20261101143000_spiritual_practice_logs.sql` | `26dd80b58a2e5270e6a6e6cab74a41e735166537` | unique-name |
| `20261103090436` | `spiritual_practice_log_integrity` | `supabase/migrations/20261101160000_spiritual_practice_log_integrity.sql` | `be834738c2ab833a24e8ad03b1ae2c2cd18702a5` | unique-name |
| `20261103090438` | `spiritual_client_side_encryption` | `supabase/migrations/20261101173000_spiritual_client_side_encryption.sql` | `1488d8fcaeb1a6728a461acd066ae2f5c6dd3587` | unique-name |
| `20261103090441` | `spiritual_record_relations` | `supabase/migrations/20261101200000_spiritual_record_relations.sql` | `af97d76d93735709e0df16a2d369fd4e7ce9f20e` | unique-name |
| `20261103090443` | `spiritual_integration_privacy` | `supabase/migrations/20261101213000_spiritual_integration_privacy.sql` | `2a8e5d9c24ad159944473085b6941f0b16a3fb84` | unique-name |
| `20261103091014` | `hobbies_import_records_batch` | `supabase/migrations/20261103090000_hobbies_import_records_batch.sql` | `52299e2f4254deb16138871d1804667b6f8b4455` | unique-name |
| `20261103134221` | `health_os_h1_foundation` | `supabase/migrations/20261103134221_health_os_h1_foundation.sql` | `1fd3fae27b67f0912e3c9b4112173164598ad890` | exact-version |
| `20261103134401` | `health_os_h1_storage_scope_fix` | `supabase/migrations/20261103134401_health_os_h1_storage_scope_fix.sql` | `8bacaee4869a3cc47a503fdd819f937dd8ecf087` | exact-version |
| `20261103135639` | `health_os_h2_core_records` | `supabase/migrations/20261103135639_health_os_h2_core_records.sql` | `3b1afb84bab20ed3d228d55dd9d0afe1ee8dd6ec` | exact-version |
| `20261103140304` | `health_os_h1_document_registry` | `supabase/migrations/20261103140304_health_os_h1_document_registry.sql` | `cc5373b67b434f238899dbbad25151dcfabb2666` | exact-version |
| `20261103141026` | `health_os_h3_medications_flare_events` | `supabase/migrations/20261103141026_health_os_h3_medications_flare_events.sql` | `514459042ab20e61ad2f16fabaade7304766f322` | exact-version |
| `20261103141038` | `health_os_h3_integrity_fix` | `supabase/migrations/20261103141038_health_os_h3_integrity_fix.sql` | `ca90dddf73df74f315da54e49a7804e9f9c6b616` | exact-version |
| `20261103141516` | `health_os_h3_state_constraints` | — | `—` | unmatched |
| `20261103142005` | `health_os_h4_daily_trackers` | `supabase/migrations/20261103142005_health_os_h4_daily_trackers.sql` | `f702b0f0bbb10ff3e41bd1485fbaba7084462323` | exact-version |
| `20261103142017` | `health_os_h4_daily_trackers_schema` | `supabase/migrations/20261103142017_health_os_h4_daily_trackers_schema.sql` | `7a840d45c5589f8e7586f4da1461473b322f51a9` | exact-version |
| `20261103142324` | `health_os_h4_cycle_settings_owner_only` | `supabase/migrations/20261103142324_health_os_h4_cycle_settings_owner_only.sql` | `3d4677848a82e6dd9c8f7edf29555f8591d8c362` | exact-version |
| `20261103142823` | `health_os_grant_rls_recursion_fix` | `supabase/migrations/20261103142823_health_os_grant_rls_recursion_fix.sql` | `384123c813e4ff0500f41da84bc6c68044128980` | exact-version |
| `20261103142910` | `health_h4_grant_scope_allowlist` | `supabase/migrations/20261103142910_health_h4_grant_scope_allowlist.sql` | `b35c22d08021095c3496ba7d1970f9fc0108c7f9` | exact-version |
| `20261103145907` | `health_h2_1_vital_measurements` | `supabase/migrations/20261103145907_health_h2_1_vital_measurements.sql` | `29ca95f385bea3dce98f7f39b35f6532e6d1ea4d` | exact-version |
| `20261103150138` | `health_h2_1_measurement_audit_policy_hardening` | `supabase/migrations/20261103150138_health_h2_1_measurement_audit_policy_hardening.sql` | `57ea6fdb63b7b4b9979e74290d117344f0baa64f` | exact-version |
| `20261103151035` | `health_h2_2_body_map_symptom_locations` | `supabase/migrations/20261103151035_health_h2_2_body_map_symptom_locations.sql` | `850d5dd3f2f4592799dd3420ba0fa5b20e7401c7` | exact-version |

### Repository files with no same-name live entry

- `supabase/migrations/20261028120000_inventory_p0_foundation.sql` — Git blob `257aa2893c59e411ad344eefb6f864190452a4be`
- `supabase/migrations/20261028130000_finance_default_category_seeding.sql` — Git blob `c2b249bcfab0ac4be7f65509978029dd8fdfc040`
- `supabase/migrations/20261028130000_inventory_p1_domain_schema.sql` — Git blob `5ac6f884950d3144305021dd45998354c5fe2c52`
- `supabase/migrations/20261028150000_inventory_snapshot_rpc.sql` — Git blob `4f4bd9d4059437f82df88b4f835c1776d457109a`
- `supabase/migrations/20261030100000_projects_final_output_guard.sql` — Git blob `1614ad91b41cee63b7f51e7472460d982f536087`
- `supabase/migrations/20261030110000_projects_task_issue_traceability.sql` — Git blob `d8035c25bba9aae602b8e0316615e66168ad2ab8`
- `supabase/migrations/20261030120000_projects_task_issue_deferred_validation.sql` — Git blob `f39260c9b389a3a1f81924ca491a5e7bddbbb466`
- `supabase/migrations/20261030130000_finance_family_cash_tracking.sql` — Git blob `ea60c7484707d97a11bc8021f07a6076fdb93997`
- `supabase/migrations/20261101150000_os_integration_events.sql` — Git blob `33e1f4ead18acb0070d318bae73c36fd0fe14972`
- `supabase/migrations/20261102103000_hobbies_journal_private_visibility.sql` — Git blob `1ff2d6adb356fb5ebe501bee9cd4641851e94d9d`
- `supabase/migrations/20261102110000_hobbies_journal_private_storage.sql` — Git blob `b03263e7a005b88046cdaf3cce51c3e6bd88aa00`
- `supabase/migrations/20261102120000_hobbies_journal_audit_history.sql` — Git blob `576e0b548ee5484a1761c36da8f9dbb6a9ce3717`
- `supabase/migrations/20261102130000_hobbies_journal_attachment_lifecycle.sql` — Git blob `3ef233848a0df38a870dae82270185ee446657b5`
- `supabase/migrations/20261103160000_skincare_os_private_storage_and_collection_permissions.sql` — Git blob `8144971a5fa98587e4f2126c2f28185ab5aeca05`

### Live entries without a same-name repository file

- `20261027074905` `finance_a_schema` — no matching migration filename in current `main`; recover historical SQL or prove the resulting schema state before deciding whether a repair migration is required.
- `20261027075030` `finance_b_engine` — no matching migration filename in current `main`; recover historical SQL or prove the resulting schema state before deciding whether a repair migration is required.
- `20261027075354` `finance_c_rpcs` — no matching migration filename in current `main`; recover historical SQL or prove the resulting schema state before deciding whether a repair migration is required.
- `20261027075441` `finance_d_fix_asset_upsert` — no matching migration filename in current `main`; recover historical SQL or prove the resulting schema state before deciding whether a repair migration is required.
- `20261027075509` `finance_e_fix_id_ambiguity` — no matching migration filename in current `main`; recover historical SQL or prove the resulting schema state before deciding whether a repair migration is required.
- `20261027174438` `finance_f_fix_err_null_detail` — no matching migration filename in current `main`; recover historical SQL or prove the resulting schema state before deciding whether a repair migration is required.
- `20261027185041` `finance_recurring_defer_rpc_wrapper_phase_13` — no matching migration filename in current `main`; recover historical SQL or prove the resulting schema state before deciding whether a repair migration is required.
- `20261027190550` `finance_net_worth_snapshot_json_alias_fix` — no matching migration filename in current `main`; recover historical SQL or prove the resulting schema state before deciding whether a repair migration is required.
- `20261028054205` `finance_asset_lifecycle_permission_hardening` — no matching migration filename in current `main`; recover historical SQL or prove the resulting schema state before deciding whether a repair migration is required.
- `20261103141516` `health_os_h3_state_constraints` — no matching migration filename in current `main`; recover historical SQL or prove the resulting schema state before deciding whether a repair migration is required.

### Decision

- Do not run `db push` against this mixed history.
- Do not rename timestamped files to match the live versions while the historical content is unverified.
- Do not manually insert, update, or delete rows in `supabase_migrations.schema_migrations`.
- Continue with read-only catalog inspection and disposable PostgreSQL smoke tests. A paid Supabase branch remains excluded by the user's instruction.


## Read-only schema evidence for unmatched live entries (2026-11-04)

A read-only catalog inspection was run against production after identifying the 10 live history entries with no same-name migration file in the current repository tree.

- Finance catalog: **36** `finance_*` tables exist; **36/36** have RLS enabled; **0** were found without RLS.
- Finance RPC catalog includes `fin_asset_upsert`, `fin_asset_status_update`, `fin_asset_confirm_valuation`, `fin_asset_valuation_history_get`, `fin_budget_upsert`, `fin_budgets_get`, `fin_recurring_save`, `fin_recurring_defer`, `fin_recurring_skip`, and `fin_recurring_log_payment`.
- Health catalog includes the expected medication and flare status/severity constraints, including `health_medications_status_check`, `health_flare_events_status_check`, `health_flare_events_status_date_check`, and severity checks on symptom/flare records.

This is evidence that major schema effects of the unmatched Finance and Health history entries are present. It is **not** proof that the historical SQL bytes match the deleted/missing source migrations. Do not reconstruct or replay those migrations from guessed intent. Recover their original SQL from a trusted historical source or compare exact catalog definitions and migration dependencies before proposing a non-replaying repair.


### Additional Finance function privilege evidence

A read-only `has_function_privilege` catalog query for the Finance asset, budget, and recurring RPCs found:

- `fin_asset_upsert`, `fin_asset_status_update`, `fin_asset_confirm_valuation`, and `fin_asset_valuation_history_get` are SECURITY DEFINER with an empty search path configuration; `anon` cannot execute them and `authenticated` can.
- `fin_budget_upsert`, `fin_budget_template_save`, `fin_recurring_defer`, `fin_recurring_save`, and `fin_recurring_skip` showed the same privilege pattern in this query.

This supports that the security-hardening effects associated with some unmatched Finance history names are present in the live catalog. It still does not recover the original migration source or prove every statement in those historical migrations.


## Read-only verification of pending-candidate schema effects (2026-11-04)

The 14 pending candidates were not treated as one push batch. A targeted catalog query confirmed that the following expected objects are currently absent:

- Inventory foundation/domain: `inventory_settings`, `inventory_sync_operations`, `inventory_categories`, and `inventory_items` are absent.
- Finance pending candidates: `fin_seed_default_categories(uuid)`, `finance_family_cash_advances`, and `finance_family_cash_entries` are absent.
- Projects pending candidates: `projects_guard_final_outputs()`, `projects_guard_work_sessions()`, `projects_guard_task_references()`, `projects_guard_prd_review()`, `projects_guard_risk_issue_links()`, and `projects_guard_task_issue_references()` are absent.
- Integration Events: `os_integration_events` is absent, despite the current app code containing event consumers; this is a concrete DB integration gap, not proof that the event system works end-to-end.
- Hobbies journal privacy/audit/attachment candidates: `hobbies_journal_audit_events`, `hobbies_journal_attachment_cleanup`, `hobbies_journal_visibility_guard()`, `hobbies_journal_write_audit_event()`, and `hobbies_journal_attachment_lifecycle_guard()` are absent.
- Storage/collection candidates: the `hobbies-journal-files` and `skincare-progress` storage buckets were not found; no `skincare` rows were found in `collection_sections`.

These findings confirm that several pending migrations represent genuinely missing live schema capabilities. They must be applied only after the history/version reconciliation and dependency order are resolved. In particular, the missing `os_integration_events` table means the current client event integration must remain treated as incomplete until the database migration is safely applied and verified.


## Pending migration version collision resolved in PR #114

A repository-wide scan of the 101 migration files found one duplicate 14-digit version prefix: `20261028130000` was used by both `finance_default_category_seeding` and `inventory_p1_domain_schema`. Both are pending candidates; production history contains neither Inventory version 130000 nor the new 140000 version. PR #114 renames only the Inventory file to `20261028140000`, preserving the dependency order `inventory_p0_foundation (120000) → inventory_p1_domain_schema (140000) → inventory_snapshot_rpc (150000)`. It also adds a CI test that fails on any duplicate migration version. This resolves the repository filename collision only; it does not authorize a production migration push or repair any live history rows.


## Durable Integration Events migration validation

Draft PR #115 adds an ephemeral PostgreSQL smoke workflow for the existing `20261101150000_os_integration_events.sql` migration. On commit `ab40c127828d73b16903747cb6d7c101d74f5d6c`, the disposable migration test, idempotent publish/load checks, RLS permission checks, RPC grants, realtime publication membership, repository CI, app build, Finance checks, and Knowledge SQL smoke all passed. Production still has no `os_integration_events` table or durable RPC path; the migration remains pending and was not applied. This is validation of the migration's behavior in a disposable database, not authorization to push it into the mixed production history.
