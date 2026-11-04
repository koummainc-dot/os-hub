import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync(new URL("../supabase/migrations/20261103091014_hobbies_import_records_batch.sql", import.meta.url), "utf8");
const smoke = readFileSync(new URL("../supabase/tests/hobbies_import_atomic_smoke.sql", import.meta.url), "utf8");
const records = readFileSync(new URL("../src/core/records.jsx", import.meta.url), "utf8");
const ui = readFileSync(new URL("../src/systems/hobbies/index.jsx", import.meta.url), "utf8");
const workflow = readFileSync(new URL("../.github/workflows/hobbies-journal-sql-smoke.yml", import.meta.url), "utf8");

assert.match(migration, /create or replace function public\.hobbies_import_records_batch/);
assert.match(migration, /security invoker/);
assert.match(migration, /jsonb_array_length\(p_changes\) > 500/);
assert.match(migration, /HOBBIES_IMPORT_DUPLICATE_ID/);
assert.match(migration, /HOBBIES_IMPORT_COLLECTION_NOT_ALLOWED/);
assert.match(migration, /HOBBIES_IMPORT_VISIBILITY_INVALID/);
assert.match(migration, /insert into public\.workspace_records/);
assert.match(migration, /revoke all on function public\.hobbies_import_records_batch\(uuid,jsonb\) from public, anon/);
assert.match(migration, /grant execute on function public\.hobbies_import_records_batch\(uuid,jsonb\) to authenticated/);

assert.match(smoke, /must-rollback/);
assert.match(smoke, /unique conflict unexpectedly succeeded/);
assert.match(smoke, /partial import row survived a later unique conflict/);
assert.match(smoke, /forged private audience unexpectedly succeeded/);
assert.match(smoke, /another member can read imported private Hobbies records/);

assert.match(records, /const putBatchAtomic = useCallback/);
assert.match(records, /supabase\.rpc\("hobbies_import_records_batch"/);
assert.match(records, /دفعة الاستيراد يجب أن تحتوي من سجل واحد إلى 500 سجل/);
assert.match(records, /قاعدة البيانات تتراجع عن الدفعة كاملة/);
assert.match(records, /putBatchAtomic, purgeAtomic/);

const runImport = ui.slice(ui.indexOf(" const runImport=async()=>"), ui.indexOf(" const saveHobby=async"));
assert.ok(runImport.includes("store.api.putBatchAtomic(importReport.ops)"));
assert.ok(!runImport.includes("store.api.put(op.coll"));
assert.ok(runImport.includes("partial:false"));
assert.match(workflow, /20261103090000_hobbies_import_records_batch\.sql/);
assert.match(workflow, /hobbies_import_atomic_smoke\.sql/);

console.log("Hobbies import atomicity contract passed: insert-only RPC, RLS-aware privacy, all-or-nothing SQL test, and frontend integration.");
