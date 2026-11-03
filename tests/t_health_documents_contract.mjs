import fs from "node:fs";
import assert from "node:assert/strict";

const ui = fs.readFileSync("src/systems/health/index.jsx", "utf8");
const repository = fs.readFileSync("src/systems/health/repository.js", "utf8");
const migration = fs.readFileSync("supabase/migrations/20261103140304_health_os_h1_document_registry.sql", "utf8");
const h1 = fs.readFileSync("supabase/migrations/20261103134221_health_os_h1_foundation.sql", "utf8");

assert.match(ui, /async function uploadMedicalDocument/);
assert.match(ui, /async function downloadMedicalDocument/);
assert.match(ui, /async function removeMedicalDocument/);
assert.match(ui, /documentFile\.size\/1024\/1024/);
assert.match(repository, /storage\.from\("health-documents"\)\.upload/);
assert.match(repository, /createSignedUrl\(objectPath, 60/);
assert.match(repository, /storage\.from\("health-documents"\)\.remove/);
assert.match(repository, /await supabase\.storage\.from\("health-documents"\)\.remove\(\[objectPath\]\)/, "Upload must compensate if metadata insert fails");
assert.match(migration, /create table if not exists public\.health_documents/);
assert.match(migration, /alter table public\.health_documents enable row level security/);
assert.match(migration, /health_has_access\(profile_id,'documents','read'\)/);
assert.match(migration, /health_has_access\(profile_id,'documents','create'\)/);
assert.match(migration, /health_has_access\(profile_id,'documents','delete'\)/);
assert.match(migration, /size_bytes bigint not null check\(size_bytes between 1 and 10485760\)/);
assert.match(migration, /constraint health_documents_path_profile_check/);
assert.match(h1, /values \('health-documents','health-documents',false/);
assert.match(h1, /g\.scope_keys @> array\['documents'\]/);
console.log("Health document lifecycle contract checks passed.");
