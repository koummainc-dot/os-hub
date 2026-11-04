import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const directory = path.resolve("supabase/migrations");
const files = fs.readdirSync(directory).filter(name => name.endsWith(".sql")).sort();
const byVersion = new Map();
for (const file of files) {
  const match = file.match(/^(\d{14})_(.+)\.sql$/);
  assert.ok(match, `Migration filename must begin with a 14-digit version: ${file}`);
  const [, version] = match;
  const previous = byVersion.get(version) || [];
  previous.push(file);
  byVersion.set(version, previous);
}
const duplicates = [...byVersion.entries()].filter(([, names]) => names.length > 1);
assert.deepEqual(duplicates, [], "Supabase migration version prefixes must be unique");

assert.ok(files.includes("20261028130000_finance_default_category_seeding.sql"));
assert.ok(files.includes("20261028140000_inventory_p1_domain_schema.sql"));
assert.ok(files.includes("20261028150000_inventory_snapshot_rpc.sql"));
assert.ok(
  files.indexOf("20261028130000_finance_default_category_seeding.sql") <
  files.indexOf("20261028140000_inventory_p1_domain_schema.sql") &&
  files.indexOf("20261028140000_inventory_p1_domain_schema.sql") <
  files.indexOf("20261028150000_inventory_snapshot_rpc.sql"),
  "inventory domain schema must remain between its foundation and snapshot RPC migrations"
);

console.log("Supabase migration version uniqueness tests passed.");
