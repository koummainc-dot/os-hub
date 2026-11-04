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
assert.match(tools, /costPerDay/);

assert.match(index, /"routine_logs"/);
assert.match(index, /"compare"/);
assert.match(index, /"lists"/);
assert.match(index, /saveList/);
assert.match(index, /saveSettings/);
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

assert.match(migration, /skincare-progress/);
assert.match(migration, /collection_sections/);
assert.match(migration, /ws_access_level/);
console.log("Skincare completion contract tests passed.");
