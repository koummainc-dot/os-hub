import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const platform = await readFile(new URL("../src/platform/Platform.jsx", import.meta.url), "utf8");
const core = await readFile(new URL("../src/core/core.js", import.meta.url), "utf8");
const records = await readFile(new URL("../src/core/records.jsx", import.meta.url), "utf8");
const projects = await readFile(new URL("../src/systems/projects/store.jsx", import.meta.url), "utf8");
const financeProjects = await readFile(new URL("../src/systems/finance/Projects.jsx", import.meta.url), "utf8");
const notifications = await readFile(new URL("../src/core/notifications.js", import.meta.url), "utf8");

const demoApiStart = core.indexOf("function osMakeDemoApi(");
const demoApiEnd = core.indexOf("\n}", demoApiStart);
assert.ok(demoApiStart >= 0 && demoApiEnd > demoApiStart, "the ephemeral Demo API must exist");
const demoApi = core.slice(demoApiStart, demoApiEnd);
assert.ok(demoApi.includes("store.current[key]") && demoApi.includes("async save(data)"),
  "Demo writes must be stored only in the in-memory demo store");
assert.ok(!demoApi.includes("supabase"), "Demo API must never call Supabase");

assert.ok(platform.includes("isDemo?osMakeDemoApi(demoStore,ws.id+':'+sys.id"),
  "the system host must select an in-memory API whenever Demo mode is active");
assert.ok(records.includes("if (isDemo) {") && records.includes("const k = \"recs:\" + wsId + \":\" + systemId"),
  "record loading must use the per-demo workspace/system store instead of workspace_records");
assert.ok(records.includes("if (isDemo) {") && records.includes("const result = await put(op.coll, op.rec)"),
  "atomic operations in Demo must use only the Demo store");
assert.ok(projects.includes("if (!saved || !ws?.id || isDemo) return saved;"),
  "Demo writes must not emit persistent Core notifications");
assert.ok(financeProjects.includes("const canEdit=!isDemo") && financeProjects.includes("if(isDemo)return <Card>"),
  "Finance Demo mode must be read-only and cannot mutate Finance records");
assert.ok(notifications.includes("export async function listCoreNotifications"),
  "Core notifications remain a shared persistent service, not part of Demo data");

console.log("✓ Demo and Sandbox data-isolation contracts passed");
