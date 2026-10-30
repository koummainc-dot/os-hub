import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const migration = await readFile(new URL("../supabase/migrations/20261030130000_finance_family_cash_tracking.sql", import.meta.url), "utf8");
const ui = await readFile(new URL("../src/systems/finance/FamilyCash.jsx", import.meta.url), "utf8");
const finance = await readFile(new URL("../src/systems/finance/index.jsx", import.meta.url), "utf8");

assert.match(migration, /create table if not exists public\.finance_family_cash_advances/i);
assert.match(migration, /create table if not exists public\.finance_family_cash_entries/i);
assert.match(migration, /unique \(workspace_id,disbursement_transaction_id\)/i,
  "a posted finance transaction cannot be linked as a second cash advance");
assert.match(migration, /t\.status <> 'Posted' or t\.type not in \('Expense','Transfer'\)/i,
  "only posted outflow transactions may be linked");
assert.match(migration, /perform public\.fin_family_need\(p_workspace_id,'edit',false\)/i,
  "cash mutations must enforce Family edit access on the server");
assert.match(migration, /FAMILY_CASH_AMOUNT_EXCEEDS_REMAINING/,
  "entries must not exceed the unaccounted advance balance");
assert.match(migration, /alter table public\.finance_family_cash_advances enable row level security/i);
assert.match(migration, /alter table public\.finance_family_cash_entries enable row level security/i);
assert.match(migration, /revoke all on function public\.fin_family_cash_link_transaction\(uuid,uuid,uuid,text\) from public, anon/i);
assert.match(migration, /grant execute on function public\.fin_family_cash_add_entry\(uuid,uuid,text,numeric,date,uuid,text,text\) to authenticated/i);
assert.match(ui, /fin_family_cash_link_transaction/);
assert.match(ui, /fin_family_cash_add_entry/);
assert.match(ui, /مصروفات العهدة هنا سجل توثيقي ولا تُضاف مرة ثانية إلى دفتر الماليات/,
  "family cash expense entries must not double-count the finance ledger");
assert.match(finance, /section === "family-cash" && <FinanceFamilyCash/,
  "cash tracking page must be reachable from Finance OS");
assert.match(finance, /\["family-cash", "عهد ومصروفات الأفراد", "👪"\]/);
console.log("Finance family cash tracking contract tests passed.");
