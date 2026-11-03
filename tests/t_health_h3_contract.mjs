import fs from "node:fs";
import assert from "node:assert/strict";

const ui=fs.readFileSync("src/systems/health/index.jsx","utf8");
const repo=fs.readFileSync("src/systems/health/repository.js","utf8");
const core=fs.readFileSync("src/core/core.js","utf8");
const migration=fs.readFileSync("supabase/migrations/20261103141026_health_os_h3_medications_flare_events.sql","utf8");
const fix=fs.readFileSync("supabase/migrations/20261103141038_health_os_h3_integrity_fix.sql","utf8");

assert.ok(core.includes('phase:"H4 · المتابعة اليومية والعوامل"') && core.includes('medications:الأدوية والعلاجات:💊|flare_events:نوبات التهيّج:🌡️'),"H3 sections must be registered");
assert.match(ui,/page === "medications"/,"Medication screen must exist");
assert.match(ui,/page === "flare_events"/,"Flare screen must exist");
for(const method of ["listMedications","listMedicationVersions","listMedicationEvents","listMedicationSideEffects","listMedicationReminders","createMedication","updateMedication","createMedicationVersion","createMedicationEvent","updateMedicationEvent","deleteMedicationEvent","createMedicationSideEffect","updateMedicationSideEffect","deleteMedicationSideEffect","createMedicationReminder","updateMedicationReminder","deleteMedicationReminder","listFlareEvents","createFlareEvent","updateFlareEvent","deleteFlareEvent"]) {
 assert.match(repo,new RegExp("async "+method+"\\("),"Missing repository method "+method);
}
for(const table of ["health_medications","health_medication_versions","health_medication_events","health_medication_side_effects","health_medication_reminders","health_flare_events"]) {
 assert.match(migration,new RegExp("create table if not exists public\\."+table),"Missing H3 table "+table);
 assert.match(migration,new RegExp("alter table public\\."+table+" enable row level security"),"RLS missing on "+table);
 assert.match(migration,new RegExp("health_has_access\\(profile_id"),"H3 rows must be scoped");
}
assert.match(migration,/event_status text not null check\(event_status in \('taken','skipped','missed','held','unknown'\)\)/,"Actual medication event status must distinguish non-taken states");
assert.match(migration,/medication_name_snapshot/,"Dose event must preserve medication name snapshot");
assert.match(migration,/unique\(medication_id,version_no\)/,"Dose versions must be numbered");
assert.match(migration,/flare_events/,"Flare events need their own scope");
assert.match(migration,/medication_version_created/,"Dose version audit action must be allowed");
assert.match(fix,/drop column if exists effective_to/,"Dose versions must not be edited in place");
assert.match(fix,/on delete restrict/,"Linked clinical history must not be nulled or cascade-deleted accidentally");
assert.match(ui,/لا يرسل هذا الإصدار إشعارًا في الخلفية/,"UI must not claim background notifications");
assert.match(ui,/لم تُعدّل سجلات الجرعات السابقة/,"UI must explain history preservation");
assert.doesNotMatch(repo,/workspace_records|workspace_data/,"Health records must not use generic workspace storage");
console.log("Health H3 contract checks passed.");
