import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const core = await readFile(new URL("../src/core/records.jsx", import.meta.url), "utf8");
const store = await readFile(new URL("../src/systems/projects/store.jsx", import.meta.url), "utf8");
const screens = await readFile(new URL("../src/systems/projects/screens_c.jsx", import.meta.url), "utf8");
const migration = await readFile(new URL("../supabase/migrations/20261114230000_projects_atomic_milestone_purge.sql", import.meta.url), "utf8");
const activePurge = await readFile(new URL("../supabase/migrations/20261114269500_projects_purge_v2_wins.sql", import.meta.url), "utf8");

assert.ok(core.includes('supabase.rpc("projects_purge_records_batch_v2"'), "purge must execute through the active transactional v2 server RPC");
assert.ok(core.includes('navigator.onLine === false'), "permanent deletion must not queue offline");
assert.ok(core.includes('type: "drop", coll: collection, id'), "purged records must be removed from local state");
assert.ok(store.includes("permanentlyDeleteProject: async (p)"), "project permanent delete action must exist on the action API");
assert.ok(store.includes("R.purgeAtomic("), "project bundle must use atomic purge");
assert.ok(store.includes("record.deleted_at === p.deleted_at"), "only children in the same delete batch are included");
assert.ok(store.includes("(record.deleted_by || null) === (p.deleted_by || null)"), "deletion actor must match");
assert.ok(store.includes("جلسات الوقت التاريخية ستبقى محفوظة"), "historical sessions must be preserved");
assert.ok(store.includes("ops.length > 1000"), "oversized purge must be rejected");
assert.ok(screens.includes("act.permanentlyDeleteProject(rec)"), "trash UI must expose project permanent deletion");

assert.ok(activePurge.includes("'milestones'") && activePurge.includes("'wins'"),
  "the forward migration must extend the active v2 server purge RPC to every collection included in the project deletion batch");
assert.match(migration, /projects_purge_records_batch_v2/i, "base migration must define the active purge v2 RPC");
assert.match(migration, /security definer/i, "active purge RPC must use its audited security boundary");
assert.ok(migration.includes("auth.uid() is null"), "purge RPC must require authentication");
assert.match(migration, /expected_updated_at/i, "purge RPC must check optimistic concurrency");
assert.match(migration, /deleted_at/i, "purge RPC must verify the deletion marker");
assert.match(migration, /revoke all on function public.projects_purge_records_batch/i, "public execution must be revoked");
assert.match(migration, /grant execute on function public.projects_purge_records_batch\(uuid, text, timestamptz, uuid, jsonb\) to authenticated/i, "only authenticated users receive execute permission");
console.log("Projects safe permanent-trash-delete contract tests passed.");
