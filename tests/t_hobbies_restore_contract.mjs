import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const records = readFileSync(new URL("../src/core/records.jsx", import.meta.url), "utf8");
const ui = readFileSync(new URL("../src/systems/hobbies/index.jsx", import.meta.url), "utf8");

const trashCollections = [
  "habits",
  "habitLogs",
  "relapses",
  "books",
  "readingSessions",
  "weeklyFocus",
  "habitReminders",
];

for (const collection of trashCollections) {
  assert.match(
    ui,
    new RegExp('\\["' + collection + '"'),
    collection + " must be included in the unified trash matrix"
  );
}

const activeCollections = [
  "habits",
  "habitLogs",
  "relapses",
  "books",
  "readingSessions",
  "weeklyFocus",
  "habitReminders",
];
for (const collection of activeCollections) {
  assert.ok(
    ui.includes('live(arr(store.recs,"' + collection + '"))'),
    collection + " must derive its active screen data from live records"
  );
}

assert.match(ui, /const restoreTrashItem=async item=>/);
assert.match(ui, /store\.api\.restore\(item\.collection,item\.id\)/);
assert.match(ui, /<UnifiedTrashView items=\{trashItems\} onRestore=\{restoreTrashItem\}/);
assert.match(ui, /function UnifiedTrashView\(\{items,onRestore,canEdit\}\)/);
assert.match(ui, /onClick=\{\(\)=>onRestore\(item\)\}/);

assert.match(records, /const restore = useCallback\(\(coll, id\) =>/);
assert.match(records, /put\(coll, \{ \.\.\.prev, deleted_at: null, deleted_by: null \}\)/);
assert.match(records, /const toRec = \(row\) => \(\{ \.\.\.\(row\.data \|\| \{\}\), id: row\.id, _vis: row\.visible_to \|\| null, _deleted: !!row\.deleted \}\)/);
assert.match(records, /if \(!row\.deleted \|\| \(row\.data && row\.data\.deleted_at\)\) recs\[row\.collection\]\[row\.id\] = toRec\(row\)/);
assert.match(records, /export const live = \(list\) => \(list \|\| \[\]\)\.filter\(\(r\) => !r\.deleted_at\)/);

// Journal has a separate trash route and a separate restore handler.
assert.match(ui, /const restoreJournalEntry=async j=>/);
assert.match(ui, /store\.api\.restore\("journalEntries",j\.id\)/);
assert.match(ui, /if\\(journalShowTrash\\?\\!j\\.deleted_at:!!j\\.deleted_at\\)return false/);
assert.match(ui, /journalShowTrash\?\<><Btn onClick=\{\(\)=>restoreJournalEntry\(j\)\}>استعادة/);

console.log("Hobbies restore matrix contract passed: seven trash collections + Journal, restore persistence mapping, and active-screen filtering.");
