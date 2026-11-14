import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const migration = await readFile(new URL("../supabase/migrations/20261114265000_projects_published_updates_review_privacy.sql", import.meta.url), "utf8");
const integrityMigration = await readFile(new URL("../supabase/migrations/20261114266000_projects_review_projection_integrity.sql", import.meta.url), "utf8");
const screens = await readFile(new URL("../src/systems/projects/screens_c.jsx", import.meta.url), "utf8");

assert.ok(migration.includes("projects_guard_published_update_and_review_privacy"),
  "a database trigger must guard published Updates and Weekly Reviews");
assert.ok(migration.includes("Published Update content and snapshot are immutable"),
  "published Update body and frozen snapshot must be immutable");
assert.ok(migration.includes("Published Update addenda are append-only") &&
  migration.includes("Existing Published Update addenda cannot be edited or removed"),
  "published Update addenda may only be appended");
assert.ok(migration.includes("A Weekly Review may only be written by its owner") &&
  migration.includes("Weekly Review source records must remain private to their owner"),
  "a Weekly Review must be private and writable only by its owner");
assert.ok(migration.includes("Closed Weekly Review snapshots are immutable"),
  "a Closed Weekly Review snapshot must be immutable");
assert.ok(migration.includes("Only the Review owner may publish or edit its shared projection"),
  "a user cannot publish or update another member's review projection");
assert.ok(migration.includes("Only the owner may delete a private Review or its shared projection"),
  "a user cannot physically delete another member's review or share");
assert.ok(integrityMigration.includes("Shared Review metrics must exactly match the closed source snapshot"),
  "shared metrics must be identical to the closed source snapshot");
assert.ok(integrityMigration.includes("Shared Review item was not part of the closed source snapshot"),
  "shared list items must exist in the closed source snapshot");
assert.ok(integrityMigration.includes("Shared Review reflection does not match the closed source"),
  "shared reflection values must be identical to the private source");
assert.ok(integrityMigration.includes("m.access->'systems'->'projects'->>'level' in ('view','edit')"),
  "Workspace shares count only recipients allowed to read Projects");
assert.ok(integrityMigration.includes("v_recipients <@ v_project_visible"),
  "every shared Project must be visible to every recipient");

const updateStart = screens.indexOf("function UpdateEditor(");
const updateEnd = screens.indexOf("// ═════ Wins", updateStart);
const updateEditor = screens.slice(updateStart, updateEnd);
assert.ok(updateEditor.includes("by: nameOf(me)"),
  "published Update addenda must record the active author, not the original Update author");
assert.ok(updateEditor.includes("const published = u.status === \"Published\"") &&
  updateEditor.includes("const canW = can(\"update.write\", project) && !published"),
  "published Update content editing must be disabled in the UI");
assert.ok(updateEditor.includes("published && can(\"update.write\", project)"),
  "authorized project editors may append to a published Update");

const reviewStart = screens.indexOf("function ReviewEditor(");
const reviewEnd = screens.indexOf("// ═════ Contacts", reviewStart);
const reviewEditor = screens.slice(reviewStart, reviewEnd);
assert.ok(reviewEditor.includes("visibility: \"private\"") && reviewEditor.includes("_vis: [r.member_id]"),
  "the source Weekly Review must remain private to its owner");
assert.ok(reviewEditor.includes("status: \"Closed\"") && reviewEditor.includes("snapshot"),
  "closing a Weekly Review must preserve a historical snapshot");
assert.ok(reviewEditor.includes("isWorkspaceProject") && reviewEditor.includes("containsPrivateProject"),
  "the UI projection must omit private-project records and metrics");
assert.ok(reviewEditor.includes("shareSections.includes(key)") && reviewEditor.includes("shared_sections: [...shareSections]"),
  "the share projection must contain only explicitly selected sections");

console.log("✓ Published Update immutability and Weekly Review privacy/projection contracts passed");
