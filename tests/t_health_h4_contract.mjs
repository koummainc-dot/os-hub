import fs from "node:fs";
import assert from "node:assert/strict";

const ui=fs.readFileSync("src/systems/health/index.jsx","utf8");
const repo=fs.readFileSync("src/systems/health/repository.js","utf8");
const core=fs.readFileSync("src/core/core.js","utf8");
const migration=fs.readFileSync("supabase/migrations/20261103142017_health_os_h4_daily_trackers_schema.sql","utf8");
const privacyMigration=fs.readFileSync("supabase/migrations/20261103142324_health_os_h4_cycle_settings_owner_only.sql","utf8");
const grantFix=fs.readFileSync("supabase/migrations/20261103142823_health_os_grant_rls_recursion_fix.sql","utf8");
const scopeFix=fs.readFileSync("supabase/migrations/20261103142910_health_h4_grant_scope_allowlist.sql","utf8");

assert.ok(core.includes('phase:"H2.1 · القياسات الحيوية"'),"H2.1 is the active Health phase");
assert.ok(core.includes("checkins:المتابعة اليومية:📅|factors:العوامل والمتتبعات:📈|cycle_tracking:الدورة الاختيارية:🔒"),"Previously completed H4 sections must remain registered");
assert.ok(core.includes('checkins:المتابعة اليومية:📅|factors:العوامل والمتتبعات:📈|cycle_tracking:الدورة الاختيارية:🔒'),"H4 pages must be registered");
for(const page of ["checkins","factors","cycle_tracking"]) assert.match(ui,new RegExp('page === "'+page+'"'),"Missing H4 screen "+page);
for(const method of ["listDailyCheckins","upsertDailyCheckin","deleteDailyCheckin","listFactors","createFactor","updateFactor","listFactorLogs","createFactorLog","updateFactorLog","deleteFactorLog","updateCycleTrackingPreference","listCycleEntries","upsertCycleEntry","deleteCycleEntry"]) assert.match(repo,new RegExp("async "+method+"\\("),"Missing H4 repository method "+method);
for(const table of ["health_daily_checkins","health_factors","health_factor_logs","health_cycle_entries"]) {
 assert.match(migration,new RegExp("create table if not exists public\\."+table),"Missing H4 table "+table);
 assert.match(migration,new RegExp("alter table public\\."+table+" enable row level security"),"RLS missing on "+table);
}
assert.match(privacyMigration,/enabled boolean not null default false/,"Cycle tracker must be disabled by default");
assert.ok(privacyMigration.includes("join public.health_cycle_settings cs on cs.profile_id=hp.id") && privacyMigration.includes("and cs.enabled"),"Cycle data must be owner-only and inaccessible while disabled");
assert.ok(repo.includes('from("health_cycle_settings")'),"Cycle setting must be read from the owner-only relation");
assert.doesNotMatch(repo,/cycle_tracking_enabled,created_at/,"Cycle setting must not be selected from shareable profile rows");
assert.match(migration,/case when is_sensitive then 'sensitive_trackers' else 'trackers' end/,"Sensitive custom factors must use a separate scope");
assert.match(migration,/create trigger health_factor_logs_validate_value/,"Factor values must be validated against their definition in the database");
assert.match(migration,/daily_checkin_created/,"Check-in audit action must be allowed");
assert.match(grantFix,/health_private\.is_profile_owner\(profile_id\)/,"Grant mutations must avoid recursive RLS checks");
assert.match(grantFix,/security definer[\s\S]*?set search_path = ''/,"Owner helper must be hardened and have an empty search path");
assert.match(grantFix,/revoke all on schema health_private from public,anon,authenticated/,"Private helper schema must not be broadly exposed");
assert.match(scopeFix,/'checkins','trackers','sensitive_trackers'/,"H4 scopes must be accepted by grant validation");
assert.match(ui,/لم تُضف سجلات للطعام أو التمرين أو الماء/,"Check-ins must not duplicate Nutrition or Sports records");
assert.match(ui,/لا يحسب التطبيق الخصوبة أو يتنبأ بالدورة/,"Cycle tracking must not make fertility predictions");
assert.doesNotMatch(repo,/workspace_records|workspace_data/,"Health records must not use generic workspace storage");
console.log("Health H4 contract checks passed.");
