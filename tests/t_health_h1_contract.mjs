import fs from "node:fs";
import assert from "node:assert/strict";

const core = fs.readFileSync("src/core/core.js", "utf8");
const moduleSource = fs.readFileSync("src/systems/health/index.jsx", "utf8");
const platform = fs.readFileSync("src/platform/Platform.jsx", "utf8");
const repository = fs.readFileSync("src/systems/health/repository.js", "utf8");
const migration = fs.readFileSync("supabase/migrations/20261103140000_health_os_h1_foundation.sql", "utf8");
const storageFix = fs.readFileSync("supabase/migrations/20261103141500_health_os_h1_storage_scope_fix.sql", "utf8");

const registry = core.match(/id:"health"[\s\S]*?sections:osSec\("([^"]+)"\)/);
assert.ok(registry, "Health OS must be registered in the unified OS registry");
const registeredSections = registry[1].split("|").map(item => item.split(":")[0]);
const renderedSections = [...moduleSource.matchAll(/\["(home|profile|access|documents|settings)","[^"]+"\]/g)].map(m => m[1]);
assert.deepEqual([...new Set(renderedSections)].sort(), [...new Set(registeredSections)].sort(), "Health internal navigation must match registry sections");
assert.match(core, /id:"health"[\s\S]*?scope:"personal"[\s\S]*?sensitive:true/, "Health OS must be personal and sensitive");
assert.match(moduleSource, /healthRepository\.listProfiles\(\)/, "Health UI must load from the dedicated repository");
assert.match(repository, /from\("health_profiles"\)/, "Repository must use dedicated health tables");
assert.doesNotMatch(repository, /workspace_records|workspace_data/, "Health repository must not use the shared workspace record store");
assert.match(migration, /alter table public\.health_profiles enable row level security/i);
assert.match(migration, /alter table public\.health_profile_grants enable row level security/i);
assert.match(migration, /owner_user_id = \(select auth\.uid\(\)\)/i, "Profile ownership must be enforced in RLS");
assert.match(migration, /granted_by = \(select auth\.uid\(\)\)/i, "Only the grantor/owner can manage grants");
assert.match(migration, /revoke all on table public\.health_profiles from anon, public/i, "Anonymous/public access must be revoked");
assert.match(migration, /values \('health-documents','health-documents',false/i, "Medical documents bucket must be private");
assert.match(storageFix, /g\.scope_keys @> array\['documents'\]/i, "Storage policies must check explicit document scope");
assert.match(storageFix, /g\.revoked_at is null/i, "Storage policies must deny revoked grants");
assert.doesNotMatch(migration, /grant all on table public\.health_/i, "Do not grant broad table access");
console.log("Health H1 contract checks passed.");
