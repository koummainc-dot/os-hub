import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
const [fx, debts, recurring, assets, goals, redesign, finance] = await Promise.all([
  read("../src/systems/finance/FXRates.jsx"),
  read("../src/systems/finance/Debts.jsx"),
  read("../src/systems/finance/Recurring.jsx"),
  read("../src/systems/finance/Assets.jsx"),
  read("../src/systems/finance/Goals.jsx"),
  read("../src/systems/finance/FinanceRedesign.jsx"),
  read("../src/systems/finance/index.jsx"),
]);

// Currency and exchange-rate workflows must use authenticated Finance RPCs,
// validate their inputs, surface modal forms, and reload persisted state.
for (const rpc of ["fin_currencies_get", "fin_currency_save", "fin_add_rate"]) {
  assert.ok(fx.includes(rpc), `FX screen must call ${rpc}`);
}
assert.ok(fx.includes("showCurrencyModal") && fx.includes("showRateModal"),
  "currency and exchange-rate forms must have independent modal state");
assert.ok(fx.includes("async function saveCurrency") && fx.includes("async function save(e)"),
  "currency and exchange-rate forms must have explicit save handlers");
assert.ok(fx.includes("await load()"), "FX changes must refresh from persisted records");
assert.ok(fx.includes("role=\"dialog\""), "FX forms must render accessible dialogs");

// Debt creation, installment generation, payments, and lifecycle changes.
for (const rpc of ["fin_debt_create", "fin_debt_payment", "fin_debt_set_lifecycle"]) {
  assert.ok(debts.includes(rpc), `Debt screen must call ${rpc}`);
}
assert.ok(debts.includes("installmentsPayload"), "debt schedules must generate installment payloads");
assert.ok(debts.includes("role=\"dialog\""), "debt forms must render accessible dialogs");
assert.ok(debts.includes("await load()"), "debt mutations must refresh persisted state");
assert.ok(debts.includes("debtCreateKeyRef.current || (debtCreateKeyRef.current = \"debt-create-\" + crypto.randomUUID())"),
  "debt creation must reuse the same idempotency key when a request is retried");
assert.ok(debts.includes("debtPaymentKeyRef.current || (debtPaymentKeyRef.current = \"debt-payment-\" + crypto.randomUUID())"),
  "debt payment must reuse the same idempotency key when a request is retried");

// Recurring items must create/update through the server and payment must be
// idempotent while creating the linked ledger transaction.
assert.ok(recurring.includes("fin_recurring_save"), "recurring CRUD must use its Finance RPC");
assert.ok(recurring.includes("fin_recurring_log_payment"), "recurring payments must use their Finance RPC");
assert.ok(recurring.includes("idempotency_key"), "recurring payments must send an idempotency key");
assert.ok(recurring.includes("recurringPaymentKeyRef.current||(recurringPaymentKeyRef.current=\"recurring-payment-\"+crypto.randomUUID())"),
  "recurring payment must reuse the same idempotency key when a request is retried");
assert.ok(recurring.includes("await load()"), "recurring mutations must refresh persisted state");
assert.ok(recurring.includes("role=\"dialog\""), "recurring forms must render accessible dialogs");

// Assets and valuations must remain distinct server operations.
assert.ok(assets.includes("fin_asset_upsert"), "asset CRUD must use the asset RPC");
assert.ok(assets.includes("fin_asset_confirm_valuation"), "valuation confirmation must use its dedicated RPC");
assert.ok(assets.includes("fin_net_worth"), "asset screen must read server-calculated net worth");
assert.ok(assets.includes("role=\"dialog\""), "asset forms must render accessible dialogs");

// Goals and budgets must remain reachable through Planning and use the same
// Finance workspace rather than a local-only store.
assert.ok(goals.includes("fin_goal_progress"), "goals must read server-calculated progress");
assert.ok(goals.includes("openCreate") && goals.includes("onRequestAdd"),
  "goal creation must support the Planning and global Add flows");
assert.ok(finance.includes("fin_budgets_get") && finance.includes("fin_budget_upsert"),
  "budget read/write must use Finance RPCs");
assert.ok(redesign.includes('["budgets","الميزانيات"],["goals","الأهداف"],["reports","التقارير"]'),
  "Planning must expose Budgets, Goals, and Reports tabs");
assert.ok(redesign.includes('navigate("budgets")'),
  "the Planning entry point must resolve to the registered Budgets page");
assert.ok(redesign.includes("internalPage") && redesign.includes("activePage"),
  "nested Finance navigation must have a local fallback state when the host shell does not immediately update");
assert.ok(redesign.includes('navigate(target)'),
  "settings cards must navigate through the shared Finance navigation handler");
assert.ok(redesign.includes('["وسوم السياق"'),
  "settings must expose the context-tags section");
assert.ok(redesign.includes('page==="context-tags"') || redesign.includes('activePage==="context-tags"'),
  "the context-tags settings page must be reachable by navigation");
assert.match(redesign, /planningTab\s*===\s*"budgets"/);
assert.match(redesign, /planningTab\s*===\s*"goals"/);
assert.match(redesign, /planningTab\s*===\s*"reports"/);

console.log("Finance UI workflow contract tests passed.");
