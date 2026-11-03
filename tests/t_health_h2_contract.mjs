import fs from "node:fs";
import assert from "node:assert/strict";

const ui = fs.readFileSync("src/systems/health/index.jsx", "utf8");
const repository = fs.readFileSync("src/systems/health/repository.js", "utf8");
const core = fs.readFileSync("src/core/core.js", "utf8");
const migration = fs.readFileSync("supabase/migrations/20261103135639_health_os_h2_core_records.sql", "utf8");

assert.ok(core.includes('phase:"H4 · المتابعة اليومية والعوامل"') && core.includes('conditions:الحالات والحساسيات:🧾|symptoms:الأعراض:🩹'), "Health registry must expose H2 pages");
assert.match(ui, /page === "conditions"/, "Condition and allergy screen must exist");
assert.match(ui, /page === "symptoms"/, "Symptom screen must exist");
for (const method of ["listConditions","createCondition","updateCondition","deleteCondition","listAllergies","createAllergy","updateAllergy","deleteAllergy","listSymptomDefinitions","createSymptomDefinition","updateSymptomDefinition","deleteSymptomDefinition","listSymptomLogs","createSymptomLog","updateSymptomLog","deleteSymptomLog"]) {
  assert.match(repository, new RegExp("async " + method + "\\("), "Missing repository method: " + method);
}
for (const table of ["health_conditions","health_allergies","health_symptom_definitions","health_symptom_logs"]) {
  assert.match(migration, new RegExp("create table if not exists public\\." + table), "Missing table: " + table);
  assert.match(migration, new RegExp("alter table public\\." + table + " enable row level security"), "RLS must be enabled for " + table);
}
assert.match(migration, /security invoker/i, "Scope helper must not bypass RLS");
assert.match(migration, /health_has_access\(profile_id,'symptoms','create'\)/, "Symptom writes must require explicit scoped access");
assert.match(migration, /symptom_name_snapshot/, "Logs must preserve the symptom name as a historical snapshot");
assert.match(migration, /severity smallint not null check\(severity between 1 and 10\)/, "Symptom severity must be constrained to 1–10");
assert.match(migration, /from anon,public/i, "New medical tables must not grant anonymous/public privileges");
assert.ok(migration.includes("'condition_created'") && migration.includes("'symptom_log_deleted'"), "Audit allowlist must cover H2 operations");
assert.doesNotMatch(repository, /workspace_records|workspace_data/, "Health records must not use generic workspace storage");
console.log("Health H2 contract checks passed.");
