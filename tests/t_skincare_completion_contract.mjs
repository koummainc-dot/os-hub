import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL(path, import.meta.url), "utf8");
const domain = read("../src/systems/skincare/domain.js");
const index = read("../src/systems/skincare/index.jsx");
const tools = read("../src/systems/skincare/WorkspaceTools.jsx");
const backup = read("../src/systems/skincare/Backup.jsx");
const photo = read("../src/systems/skincare/photoStorage.js");
const ingredients = read("../src/systems/skincare/Ingredients.jsx");
const followups = read("../src/systems/skincare/FollowUps.jsx");
const dashboard = read("../src/systems/skincare/Dashboard.jsx");
const routines = read("../src/systems/skincare/Routines.jsx");
const trials = read("../src/systems/skincare/Trials.jsx");
const reactions = read("../src/systems/skincare/Reactions.jsx");
const migration = read("../supabase/migrations/20261103160000_skincare_os_private_storage_and_collection_permissions.sql");

assert.match(domain, /effectiveSkinUnitExpiry/);
assert.match(domain, /skinUnitStatus/);
assert.match(domain, /validateSkinSettings/);
assert.match(domain, /validateSkinList/);
assert.match(domain, /timezone = "Africa\/Cairo"/);
assert.match(domain, /effectiveSkinUnitExpiry\(unit\)/);
assert.match(domain, /unit\.paoMonths/);

assert.match(tools, /export function SkinCompareView/);
assert.match(tools, /export function SkinListsView/);
assert.match(tools, /export function RoutineLogsView/);
assert.match(tools, /export function SkinSettingsView/);
assert.match(domain, /export function skinUnitCostPerDay/);
assert.match(index, /skinUnitCostPerDay/);
assert.match(tools, /تصدير المقارنة CSV/);
assert.match(tools, /buildSkinComparisonMatrix/);
assert.match(domain, /summarizeSkinProductUnits/);
assert.match(domain, /serializeSkinComparisonCsv/);

assert.match(index, /"routine_logs"/);
assert.match(index, /"compare"/);
assert.match(index, /"lists"/);
assert.match(index, /saveList/);
assert.match(index, /saveSettings/);
assert.match(index, /يوجد منتج بالاسم والعلامة التجارية نفسيهما/);
assert.match(index, /normalizeINCIName\(item\.inciName\)/);
assert.match(tools, /disabled=\{!canEdit \|\| busy\}/);
assert.match(index, /integrations\.notifications\.upsert/);
assert.match(index, /integrations\.calendar\.upsert/);
assert.match(index, /today\(settings\?\.timezone/);

assert.match(ingredients, /معاينة استيراد الكتالوج/);
assert.match(ingredients, /تأكيد الاستيراد/);
assert.match(ingredients, /catalogPreview/);

assert.match(photo, /exportSkinPhotoFiles/);
assert.match(photo, /restoreSkinPhotoFiles/);
assert.match(photo, /createSignedUrl/);
assert.match(backup, /skincare_restore_records_atomic/);
assert.match(backup, /photoFiles/);
assert.match(backup, /restoreSkinPhotoFiles/);
assert.match(backup, /existingRecords/);
assert.match(followups, /timezone/);
assert.match(routines, /onClick=\{\(\)=>removeStep\(step\)\}/);
assert.doesNotMatch(routines, /onClick=\{\(\)=>onClick/);
assert.match(routines, /weekStartDay/);
assert.match(routines, /disabled=\{busy\} onClick=\{\(\)=>onLog\(r,step,"done"\)\}/);
assert.match(routines, /disabled=\{busy\} onClick=\{\(\)=>onLog\(r,step,"skipped"\)\}/);

assert.match(migration, /skincare-progress/);
assert.match(migration, /collection_sections/);
assert.match(migration, /ws_access_level/);

assert.match(index, /if \(!canEdit \|\| busy \|\| routine\.status !== "active"\) return/);
assert.match(index, /\["done", "skipped"\]\.includes\(status\)/);
assert.match(index, /log\.routineId === routine\.id && log\.stepId === step\.id && log\.date === date/);
assert.match(index, /const deleteUnit = async unit => \{\s*if \(!canEdit \|\| busy/);
assert.match(index, /const toggleRoutine = async routine => \{\s*if \(!canEdit \|\| busy/);
assert.match(index, /busy=\{busy\} onRestore=\{async log/);
assert.match(index, /finally \{ setBusy\(false\); \} \} onUndo=\{async log/);
assert.match(tools, /RoutineLogsView\(\{logs=\[\],deletedLogs=\[\],routines=\[\],products=\[\],canEdit=false,busy=false/);
assert.match(tools, /disabled=\{busy\} onClick=\{\(\)=>onUndo\(log\)\}/);
assert.match(tools, /disabled=\{busy\} onClick=\{\(\)=>onRestore\(log\)\}/);


assert.match(domain, /export function normalizeSkinSearchText/);
assert.match(index, /normalizeSkinSearchText\(query\)/);
assert.match(tools, /بحث في السجلات/);
assert.match(tools, /normalizeSkinSearchText\(query\)/);
assert.match(tools, /from&&to&&from>to\?\[\]/);


assert.match(index, /skinUnitCostPerDay/);
assert.match(index, /expirySoonDays=\{settings\?\.expirySoonDays \?\? 30\}/);
assert.match(index, /skinUnitStatus\(unit, todayKey, expirySoonDays\)/);
assert.match(followups, /expiryWindowDays = 30/);
assert.match(followups, /weekStartDay = 0/);
assert.match(followups, /buildSkinFollowUps\(\{ today, timezone, weekStartDay, expiryWindowDays/);
assert.match(domain, /export function isValidSkinDateKey/);
assert.match(domain, /export function skinUnitCostPerDay/);
assert.match(domain, /export function skinProductDeletionBlockers/);
assert.match(index, /skinProductDeletionBlockers\(product\.id/);


assert.match(index, /productNameSnapshot: product\.name/);
assert.match(index, /productNameSnapshot: currentProduct\.name/);
assert.match(index, /routineNameSnapshot: routine\.name/);
assert.match(index, /productBrandSnapshot: product\.brand \|\| ""/);
assert.match(trials, /trial\.productNameSnapshot/);
assert.match(reactions, /reaction\.productNameSnapshot/);
assert.match(tools, /log\.productNameSnapshot/);

console.log("Skincare completion contract tests passed.");

assert.match(domain, /productSummary/);
assert.match(dashboard, /data\.productSummary\.activeCount/);
assert.match(dashboard, /data\.productSummary\.inactiveCount/);
assert.match(dashboard, /data\.productSummary\.deletedCount/);
assert.match(index, /deletedProducts=\{deletedProducts\}/);

assert.match(dashboard, /buildSkinDashboardExportMatrix/);
assert.match(dashboard, /تصدير التقرير والسجل CSV/);
assert.match(index, /serializeSkinProductsCsv\(products, deletedProducts\)/);
assert.match(domain, /deleted_at/);
