import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const sql = readFileSync("supabase/migrations/20261103160000_skincare_os_private_storage_and_collection_permissions.sql", "utf8");
const storage = readFileSync("src/systems/skincare/photoStorage.js", "utf8");
const records = readFileSync("src/core/records.jsx", "utf8");
const expected = [
  ["skin_profile", "settings"], ["skin_products", "products"], ["skin_units", "units"],
  ["skin_diary", "diary"], ["skin_routines", "routines"], ["skin_routine_logs", "routines"],
  ["skin_ingredients", "ingredients"], ["skin_trials", "trials"], ["skin_reactions", "reactions"],
  ["skin_photos", "photos"], ["skin_lists", "lists"], ["skin_settings", "settings"],
];
for (const [collection, section] of expected) {
  assert.ok(sql.includes("('skincare','" + collection + "','" + section + "')"), `missing section mapping: ${collection} -> ${section}`);
}
assert.ok(sql.includes("'skincare-progress','skincare-progress',false,10485760"));
assert.ok(sql.includes("array['image/jpeg','image/png','image/webp']"));
for (const action of ["select", "insert", "delete"]) {
  assert.ok(sql.includes("create policy skincare_progress_" + action), "missing storage " + action + " policy");
}
assert.equal(sql.split("create policy skincare_progress_").length - 1, 3, "only select/insert/delete policies should exist");
assert.ok(sql.includes("photo.collection = 'skin_photos'"));
assert.ok(sql.includes("photo.data->>'objectPath' = name or photo.data->>'thumbnailPath' = name"));
assert.ok(sql.includes("diary.collection = 'skin_diary'"));
assert.ok(sql.includes("public = false"));
assert.ok(sql.includes("drop policy if exists skincare_progress_update"));
assert.ok(!sql.includes("create policy skincare_progress_update"));
assert.equal(sql.split("begin;").length - 1, 1, "migration must have one BEGIN");
assert.equal(sql.split("commit;").length - 1, 1, "migration must have one COMMIT");
assert.ok(sql.trimEnd().endsWith("commit;"), "migration must end at COMMIT without trailing SQL");
assert.ok(!sql.includes("is not distinct from case"), "invalid thumbnail predicate must not return");
const deletePolicy = sql.slice(sql.indexOf("create policy skincare_progress_delete"));
assert.ok(deletePolicy.includes("for delete to authenticated"));
assert.ok(deletePolicy.includes("storage.filename(name) ~*"));
assert.ok(deletePolicy.includes("ws_access_level(((storage.foldername(name))[1])::uuid, 'skincare', 'photos') = 'edit'"));
const insertPolicy = sql.slice(sql.indexOf("create policy skincare_progress_insert"), sql.indexOf("-- Uploads use upsert=false"));
assert.ok(insertPolicy.includes("diary.id = (storage.foldername(name))[2]"));
assert.ok(insertPolicy.includes("ws_access_level(((storage.foldername(name))[1])::uuid, 'skincare', 'photos') = 'edit'"));

assert.ok(storage.includes('storeApi.putStrict("skin_photos", record)'));
assert.ok(storage.includes("createSignedUrl(row.data.objectPath, 300)"));
assert.ok(storage.includes("expectedPaths.objectPath !== row.data?.objectPath"));
assert.ok(storage.includes("removeObjects([row.data.objectPath, row.data.thumbnailPath])"));
assert.ok(storage.includes("storagePurgePending: true"));
assert.ok(records.includes("persist(coll, next, prev, false, false)"), "strict metadata writes must not enter the offline queue");
console.log("Skincare storage and collection permission migration contract: PASS");
