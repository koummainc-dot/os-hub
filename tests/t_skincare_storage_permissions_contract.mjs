import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const sql = readFileSync("supabase/migrations/20261103160000_skincare_os_private_storage_and_collection_permissions.sql", "utf8");
const expected = [
  ["skin_profile", "settings"], ["skin_products", "products"], ["skin_units", "units"],
  ["skin_diary", "diary"], ["skin_routines", "routines"], ["skin_routine_logs", "routines"],
  ["skin_ingredients", "ingredients"], ["skin_trials", "trials"], ["skin_reactions", "reactions"],
  ["skin_photos", "photos"], ["skin_lists", "lists"], ["skin_settings", "settings"],
];
for (const [collection, section] of expected) {
  assert.match(sql, new RegExp("\\('skincare','" + collection + "','" + section + "'\\)"), `missing section mapping: ${collection} -> ${section}`);
}
assert.match(sql, /'skincare-progress',[\\s\\S]*?false[\\s\\S]*?10485760/);
assert.match(sql, /array\\['image\\/jpeg','image\\/png','image\\/webp'\\]/);
for (const action of ["select", "insert", "delete"]) {
  assert.match(sql, new RegExp("create policy skincare_progress_" + action), `missing storage ${action} policy`);
}
assert.match(sql, /ws_access_level\\([^;]*'skincare', 'photos'/);
assert.match(sql, /photo\\.collection = 'skin_photos'/);
assert.match(sql, /photo\\.data->>'objectPath' = name or photo\\.data->>'thumbnailPath' = name/);
assert.match(sql, /diary\\.collection = 'skin_diary'/);
assert.match(sql, /public = false/);
assert.match(sql, /drop policy if exists skincare_progress_update/);
assert.match(sql, /begin;[\\s\\S]*commit;/);
console.log("Skincare storage and collection permission migration contract: PASS");
