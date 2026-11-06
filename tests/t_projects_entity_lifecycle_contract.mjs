import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const store = await readFile(new URL("../src/systems/projects/store.jsx", import.meta.url), "utf8");
const records = await readFile(new URL("../src/core/records.jsx", import.meta.url), "utf8");
const screens = await readFile(new URL("../src/systems/projects/screens_c.jsx", import.meta.url), "utf8");

const collectionsMatch = store.match(/const COLLS = \[([^\]]+)\]/);
assert.ok(collectionsMatch, "Projects collection registry must exist");
const collections = [...collectionsMatch[1].matchAll(/"([^"]+)"/g)].map((match) => match[1]);
const lifecycleCollections = [
  "projects", "tasks", "outputs", "prds", "discovery", "decisions", "risks", "issues",
  "contacts", "objectives", "krs", "reviews", "wins", "updates", "templates", "teams", "profiles"
];
for (const collection of lifecycleCollections) {
  assert.ok(collections.includes(collection), `${collection} must be registered for persistence and trash handling`);
}

assert.match(store, /const live = \(c\) => arr\(recs, c\)\.filter\(\(r\) => !r\.deleted_at\)/,
  "deleted records must disappear from live collection views");
assert.match(store, /const trash = useMemo\(\(\) => COLLS\.filter[\s\S]*?arr\(recs, c\)\.filter\(\(r\) => r\.deleted_at\)/,
  "registered user collections must be visible in the trash after soft deletion");
assert.match(store, /const del = useCallback\(async \(coll, id, label\) => \{ await R\.softDelete\(coll, id, me\)/,
  "entity delete action must use a soft-delete tombstone, not remove the row");
assert.match(store, /restoreTrashRecord: async \(coll, rec\) => \{[\s\S]*?await R\.restore\(coll, rec\.id\)/,
  "individual trash restore must route through the repository restore action");
assert.match(store, /async restoreProjectFromTrash\(p\)[\s\S]*?await R\.putAtomic\(ops\)/,
  "project bundle restore must be atomic");
assert.match(store, /async deleteProject\(p\)[\s\S]*?await R\.putAtomic\(ops\)/,
  "project bundle delete must be atomic");
assert.match(screens, /act\.restoreTrashRecord\(coll, rec\)/,
  "trash UI must call the batch-aware restore action");

assert.match(records, /\.from\("workspace_records"\)\.select\("collection,id,data,deleted,updated_at,visible_to"\)/,
  "reload must hydrate persisted records from the workspace record table");
assert.match(records, /const put = useCallback\(\(coll, rec\) => \{[\s\S]*?return persist\(coll, next, prev\)/,
  "create and edit must persist through the same serialized repository write path");
assert.match(records, /const softDelete = useCallback\(\(coll, id, by\) => \{[\s\S]*?deleted_at: nowIso\(\), deleted_by: by \|\| null/,
  "soft delete must stamp both deletion time and actor");
assert.match(records, /const restore = useCallback\(\(coll, id\) => \{[\s\S]*?deleted_at: null, deleted_by: null/,
  "restore must clear both tombstone fields");
assert.match(records, /const k = "recs:" \+ wsId \+ ":" \+ systemId;[\s\S]*?demoStore\.current\[k\]/,
  "demo mode must retain collection writes across provider remounts in the shared demo store");

console.log("✓ Projects entity lifecycle persistence/trash/restore contracts passed");
