import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const sql = await readFile(new URL("../supabase/migrations/20261103090436_spiritual_practice_log_integrity.sql", import.meta.url), "utf8");
assert.match(sql, /begin;[\s\S]*commit;/i);
assert.match(sql, /left join public\.spiritual_private_records p/i);
assert.match(sql, /p\.user_id = l\.user_id[\s\S]*p\.workspace_id = l\.workspace_id[\s\S]*p\.id = l\.practice_id[\s\S]*p\.collection = 'practices'/i);
assert.match(sql, /raise exception 'Spiritual practice-log integrity check failed[\s\S]*using errcode = '23503'/i);
assert.match(sql, /add column if not exists practice_collection text not null default 'practices'[\s\S]*check \(practice_collection = 'practices'\)/i);
assert.match(sql, /create unique index if not exists spiritual_private_records_user_workspace_id_collection_uidx[\s\S]*\(user_id, workspace_id, id, collection\)/i);
assert.match(sql, /foreign key \(user_id, workspace_id, practice_id, practice_collection\)[\s\S]*references public\.spiritual_private_records\(user_id, workspace_id, id, collection\)[\s\S]*on delete cascade[\s\S]*not valid/i);
assert.match(sql, /validate constraint spiritual_practice_logs_user_workspace_practice_fk/i);
assert.match(sql, /if not exists \([\s\S]*pg_constraint[\s\S]*spiritual_practice_logs_user_workspace_practice_fk/i);

const ui = await readFile(new URL("../src/systems/spiritual/index.jsx", import.meta.url), "utf8");
assert.match(ui, /async function archiveRow\(ws,collection,id\)[\s\S]*?supabase\.auth\.getUser\(\)[\s\S]*?if\(privateRow\)request=request\.eq\("user_id",user\.id\)/);

assert.doesNotMatch(ui, /localStorage\.(?:setItem|getItem)\([^)]*(?:spiritual|reflection|practice|commitment)/i, "sensitive Spiritual content must not be persisted to browser localStorage by this module");
assert.doesNotMatch(ui, /console\.(?:log|info|debug)\([^)]*(?:rows|record|reflection|practice|commitment|body)/i, "sensitive record payloads must not be written to console logs");
assert.match(ui, /publishOSEvent\(\{type:"spiritual\.record\.saved",entityType:"spiritual_record",entityId:item\.id,payload:\{collection\}\}/, "integration events must expose only the collection name, not record content");
assert.doesNotMatch(ui, /payload:\{[^}]*\b(?:body|description|note|reflection|data|record)\s*:/i, "integration event payloads must not contain sensitive content fields");
console.log("Spiritual normalized practice-log integrity migration contract passed.");
