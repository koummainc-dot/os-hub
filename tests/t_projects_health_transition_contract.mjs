import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const migration = await readFile(new URL("../supabase/migrations/20261114273000_core_projects_health_transition_log.sql", import.meta.url), "utf8");
const helper = await readFile(new URL("../src/core/projectHealth.js", import.meta.url), "utf8");
const screen = await readFile(new URL("../src/systems/projects/screens_b.jsx", import.meta.url), "utf8");

assert.ok(migration.includes("core_project_health_state") && migration.includes("core_project_health_transitions"),
  "Core must retain a rebuildable current state and append-only Project health transition history");
assert.ok(migration.includes("pg_try_advisory_xact_lock"),
  "only one scheduled health scan may update transition state at a time");
assert.ok(migration.includes("is_baseline") && migration.includes("previous_state") && migration.includes("next_state"),
  "the history must distinguish an initial baseline from an actual state change");
assert.ok(migration.includes("project_health_changed") && migration.includes("project_health_transition:"),
  "a changed health state must emit one Core notification keyed to its transition");
assert.ok(migration.includes("core_projects_emit_health_transitions()") &&
  migration.includes("v_health:=public.core_projects_emit_health_transitions()"),
  "the local-time scheduled worker must invoke the health transition processor");
assert.ok(!migration.includes("'project_health_'||lower(v_health)") &&
  !migration.includes("project_health:'||r.project_id"),
  "the old daily repeated Red/Orange reminder must not remain beside transition notifications");
assert.ok(migration.includes("core_projects_list_health_transitions") &&
  migration.includes("auth.uid()=any(project.visible_to)") &&
  migration.includes("grant execute on function public.core_projects_list_health_transitions"),
  "the health history reader must enforce authenticated Project visibility");

assert.ok(helper.includes('supabase.rpc("core_projects_list_health_transitions"'),
  "the frontend must read transition history through the Core RPC, not the internal table");
assert.ok(screen.includes("function ProjectHealthHistory") &&
  screen.includes("listProjectHealthTransitions(") &&
  screen.includes("عرض سجل تغيّر الصحة"),
  "Project Overview must expose the historical health transition list");
assert.ok(screen.includes("row.is_baseline") && screen.includes("row.previous_state") && screen.includes("row.next_state"),
  "the health history UI must distinguish baseline from transitions and display the state change");

console.log("✓ Project health transition, Core notification, visibility and Overview history contracts passed");
