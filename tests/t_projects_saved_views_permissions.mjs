import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const portfolio = await readFile(new URL("../src/systems/projects/screens_a.jsx", import.meta.url), "utf8");
const service = await readFile(new URL("../src/core/savedViews.js", import.meta.url), "utf8");
const migration = await readFile(new URL("../supabase/migrations/20261114263000_core_saved_views_manager_permissions.sql", import.meta.url), "utf8");
const baseMigration = await readFile(new URL("../supabase/migrations/20261114220000_core_saved_views.sql", import.meta.url), "utf8");

assert.ok(service.includes("export async function listCoreSavedViews"), "Saved Views list must use Core storage");
assert.ok(service.includes("export async function saveCoreSavedView"), "Saved Views creation must use Core storage");
assert.ok(service.includes("export async function updateCoreSavedView"), "Saved Views updates must use Core storage");
assert.ok(service.includes("export async function deleteCoreSavedView"), "Saved Views deletion must use Core storage");
assert.ok(!service.includes("localStorage"), "Saved Views must not be persisted in a browser-only parallel store");

assert.ok(portfolio.includes("const canManageSharedViews = role === \"Owner\" || role === \"Admin\""),
  "only workspace Owners/Admins may create shared Saved Views");
assert.ok(portfolio.includes("activeSavedView.scope === \"workspace\" ? canManageSharedViews"),
  "shared view edits must be manager-only while personal edits remain owner-only");
assert.ok(portfolio.includes("updateCoreSavedView(") && portfolio.includes("deleteCoreSavedView(row.id)"),
  "the Portfolio UI must support authorized update and delete of a selected Saved View");

assert.ok(baseMigration.includes("scope in ('personal','workspace')"), "Core supports personal and workspace scopes");
assert.ok(migration.includes("core_saved_views_can_manage") && migration.includes("systems'->p_system_id->>'manage'"),
  "workspace sharing must check explicit system manager permission");
assert.ok(migration.includes("scope = 'workspace'\n    and public.core_saved_views_can_manage"),
  "shared-view updates and deletes must require a manager");
assert.ok(migration.includes("Saved View identity is immutable"),
  "shared-view managers may not transfer the original creator identity");

console.log("✓ Core Saved Views personal/shared role and ownership contracts passed");
