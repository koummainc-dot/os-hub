import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const migration=readFileSync(new URL("../supabase/migrations/20261102103000_hobbies_journal_private_visibility.sql",import.meta.url),"utf8");
const ui=readFileSync(new URL("../src/systems/hobbies/index.jsx",import.meta.url),"utf8");
const storage=readFileSync(new URL("../supabase/migrations/20261102110000_hobbies_journal_private_storage.sql",import.meta.url),"utf8");
const records=readFileSync(new URL("../src/core/records.jsx",import.meta.url),"utf8");

assert.match(migration,/new\.system_id <> 'hobbies' or new\.collection <> 'journalEntries'/);
assert.match(migration,/new\.visible_to := array\[auth\.uid\(\)\]/);
assert.match(migration,/HOBBIES_JOURNAL_VISIBILITY_IMMUTABLE/);
assert.match(migration,/security invoker/);
assert.match(migration,/before insert or update on public\.workspace_records/);
assert.match(ui,/supabase\.auth\.getUser\(\)/);
assert.match(ui,/visibility\._vis=\[data\.user\.id\]/);
assert.match(ui,/const editJournalEntry/);
assert.match(ui,/journalQuery/);
assert.match(ui,/journalTypeFilter/);
assert.match(ui,/journalMoodFilter/);
assert.match(ui,/journalFromDate/);
assert.match(ui,/makeJournalPrivate/);\nassert.match(ui,/hobbies-journal-private/);\nassert.match(ui,/createSignedUrl/);\nassert.match(ui,/journalFiles/);\nassert.match(storage,/public = false/);\nassert.match(storage,/hobbies_journal_files_select_own/);\nassert.match(storage,/hobbies_journal_files_insert_own/);\nassert.match(storage,/hobbies_journal_files_delete_own/);\nassert.match(storage,/storage\.foldername\(name\)\)\[1\] = \(select auth\.uid\(\)\)::text/);
assert.match(records,/visible_to: rec\._vis \|\| null/);
console.log("Hobbies Journal privacy, edit, and search contract tests passed.");
