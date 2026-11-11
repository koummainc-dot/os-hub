import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
const [fx, debts, recurring, assets, goals, redesign, finance, family, familyCash, netWorthHistory, financeChart] = await Promise.all([
  read("../src/systems/finance/FXRates.jsx"),
  read("../src/systems/finance/Debts.jsx"),
  read("../src/systems/finance/Recurring.jsx"),
  read("../src/systems/finance/Assets.jsx"),
  read("../src/systems/finance/Goals.jsx"),
  read("../src/systems/finance/FinanceRedesign.jsx"),
  read("../src/systems/finance/index.jsx"),
  read("../src/systems/finance/Family.jsx"),
  read("../src/systems/finance/FamilyCash.jsx"),
  read("../src/systems/finance/NetWorthHistory.jsx"),
  read("../src/systems/finance/FinanceChart.jsx"),
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
assert.ok(debts.includes("createStep") && debts.includes("الخطوة {createStep} من 5"),
  "debt creation must use a five-step staged flow instead of showing every field at once");
for (const stage of ["createStep===1", "createStep===2", "createStep===3", "createStep===4", "createStep===5"]) {
  assert.ok(debts.includes(stage), `debt wizard must render ${stage}`);
}
assert.ok(debts.includes("السابق") && debts.includes("التالي →") && debts.includes("مراجعة قبل الحفظ"),
  "debt wizard must support previous/next navigation and a final review step");
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
assert.ok(assets.includes("assetStep") && assets.includes("الخطوة {assetStep} من 3") && assets.includes("assetStep===1") && assets.includes("assetStep===2") && assets.includes("assetStep===3"),
  "asset creation must use a three-step modal flow covering identity, valuation, and review");
assert.ok(assets.includes("تأكيد التقييم") && assets.includes("fin_asset_confirm_valuation"),
  "asset lifecycle must expose a real valuation confirmation workflow");

// Goals and budgets must remain reachable through Planning and use the same
// Finance workspace rather than a local-only store.
assert.ok(goals.includes("fin_goal_progress"), "goals must read server-calculated progress");
assert.ok(goals.includes("fin_post_transaction_with_splits"), "goal contributions must post through the shared Finance ledger RPC");
assert.ok(goals.includes('purpose:"GoalContribution"') && goals.includes("goal_id:goal.id"), "goal contributions must be linked to their goal and use the canonical contribution purpose");
assert.ok(goals.includes("idempotency_key") && goals.includes("client_generated_id"), "goal contribution retries must be idempotent");
assert.ok(goals.includes("＋ إضافة مساهمة") && goals.includes("حفظ المساهمة"), "active goals must expose a contribution workflow");
assert.ok(goals.includes("goalTransactions") && goals.includes("سجل المساهمات والحركات المرتبطة"), "goal contribution history must be visible on the goal");
assert.ok(goals.includes("linked_account_id") && goals.includes("حساب الإيداع المرتبط بالهدف"), "account-balance goals must receive contributions into their linked account");

assert.ok(goals.includes("openCreate") && goals.includes("onRequestAdd"),
  "goal creation must support the Planning and global Add flows");
assert.ok(finance.includes("fin_budgets_get") && finance.includes("fin_budget_upsert"),
  "budget read/write must use Finance RPCs");
assert.ok(redesign.includes('["budgets","الميزانيات"],["goals","الأهداف"],["reports","التقارير"]'),
  "Planning must expose Budgets, Goals, and Reports tabs");
assert.ok(redesign.includes('activePage==="planning"') && redesign.includes("planningPage()"), "Planning must have a dedicated route");
assert.ok(redesign.includes('navigate("budgets")'),
  "the Planning entry point must resolve to the registered Budgets page");
assert.ok(redesign.includes("internalPage") && redesign.includes("activePage"),
  "nested Finance navigation must have a local fallback state when the host shell does not immediately update");
assert.ok(redesign.includes('navigate(target)'),
  "settings cards must navigate through the shared Finance navigation handler");
assert.ok(redesign.includes('["وسوم السياق"') && redesign.includes('"fx"'),
  "settings must route currencies to the installed FX screen");
assert.ok(redesign.includes('autoOpenAddType==="debt"') && redesign.includes('activePage!=="debts"') && redesign.includes('autoOpenAddType==="asset"') && redesign.includes('autoOpenAddType==="recurring"'),
  "global Add chooser must open debt, asset, and recurring forms as modal overlays without changing page navigation");
assert.ok(redesign.includes('Segmented items={[["overview","نظرة عامة"],["investments","الاستثمارات"],["debts","الديون"]]}' ),
  "wealth must merge overview and net worth into one wealth overview instead of a standalone net-worth tab");
assert.ok(redesign.includes('["وسوم السياق"'), "settings must expose the context-tags section");
assert.ok(redesign.includes('page==="context-tags"') || redesign.includes('activePage==="context-tags"'),
  "the context-tags settings page must be reachable by navigation");
assert.ok(redesign.includes('["family", "الأسرة"]'), "Family must be reachable from the Finance navigation");
assert.ok(redesign.includes('["family-cash","العُهد ومصروفات الأفراد"]') && redesign.includes("legacyFamilyCash"), "Family cash advances must be reachable as a Family sub-section");
assert.ok(redesign.includes('contextTags.filter(tag=>tag.context_type==="Family"'), "context-tags view must only show family-linked records");
assert.ok(redesign.includes("contextSearch") && redesign.includes("contextMemberFilter"), "family context records must have search and member filters");
assert.ok(!redesign.includes('<option value="Personal">شخصي</option>') && !redesign.includes('<option value="Project">مشروع</option>'), "Personal and Projects must not be offered as context types until Projects OS is ready");
assert.ok(finance.includes("netWorthSnapshots") && finance.includes("fin_net_worth_snapshots_get"), "dashboard net-worth chart must use persisted snapshots");
assert.ok(redesign.includes('activePage==="planning"') && redesign.includes('["budgets", "التخطيط"]'), "Finance navigation must expose Planning as a real section");
assert.ok(finance.includes("fin_family_list_expenses") && finance.includes("fin_family_set_transaction_allocation"), "family context must use the existing Family allocation ledger RPCs");
assert.ok(!finance.includes("fin_transaction_context_get") && !finance.includes("fin_transaction_context_set"), "family context must not call context RPCs that are not part of the installed Family ledger");
assert.ok(finance.includes("recurringItems") && finance.includes("finance_recurring_items"), "dashboard upcoming payments must use persisted recurring records");
assert.ok(finance.includes("FinanceRedesign") && !finance.includes("const navGroups = ["), "Finance index must delegate rendering/navigation to the single FinanceRedesign orchestrator and must not keep a second navigation tree");
assert.ok(!finance.includes("if (true)"), "Finance index must not retain an always-true legacy renderer branch");
assert.ok(!redesign.includes("legacyNetWorth"), "Net worth must not be reintroduced as a separate Planning/legacy screen");
assert.ok(redesign.includes('activePage==="wealth" || activePage==="assets" || activePage==="debts"'), "Wealth must own the assets and debts subsections");

assert.ok(!redesign.includes('value="+35,000"') && !redesign.includes('value="+1.1%"') && !redesign.includes("قسط السيارة"), "dashboard must not display fabricated performance or payment examples");
assert.ok(!redesign.includes("[35,42,39,48") && !redesign.includes("[42,48,45,53"), "wealth charts must not contain hard-coded sample series");
assert.ok(redesign.includes("assets_total") && redesign.includes("payables_total"), "wealth indicators must use the canonical net-worth RPC fields");
assert.ok(redesign.includes("performancePeriod") && redesign.includes("txFromDate") && redesign.includes("txToDate") && redesign.includes("txAccountFilter"), "dashboard and transaction ledger must have working period and record filters");
assert.ok(family.includes("finance_family_members") && family.includes("finance_family_budgets") && family.includes("finance_family_allowances"), "Family must manage members, budgets, and allowances from persisted records");
assert.ok(family.includes("filteredMembers") && family.includes("filteredBudgets") && family.includes("filteredExpenses") && family.includes("filteredAllowances"), "Family record sections must expose working filters");
assert.ok(family.includes("renderBars") && family.includes("توزيع الحركات حسب حالة الإسناد"), "Family sections must include charts based on actual records");
assert.ok(goals.includes("FinanceChart") && goals.includes("filteredGoals") && goals.includes("goalStatusFilter"), "Goals must have a progress chart and searchable status-filtered records");
assert.ok(debts.includes("FinanceChart") && debts.includes("filteredDebts") && debts.includes("debtStatusFilter"), "Debts must have a payoff chart and record filters");
assert.ok(assets.includes("FinanceChart") && assets.includes("filteredAssets") && assets.includes("assetStatusFilter"), "Assets must have a valuation chart and record filters");
assert.ok(recurring.includes("FinanceChart") && recurring.includes("filteredItems") && recurring.includes("recurringStatusFilter"), "Recurring must have a chart and searchable status/type filters");
assert.ok(fx.includes("FinanceChart") && fx.includes("filteredRates") && fx.includes("rateFromDate") && fx.includes("rateToDate"), "FX history must have a chart and date/currency filters");
assert.ok(netWorthHistory.includes("FinanceChart") && netWorthHistory.includes("filteredSnapshots") && netWorthHistory.includes("snapshotFrom"), "Net-worth history must have a chart and snapshot date filters");
assert.ok(familyCash.includes("FinanceChart") && familyCash.includes("filteredAdvances") && familyCash.includes("filteredEntries"), "Family cash advances and entries must have charts and record filters");
assert.ok(familyCash.includes("account_id") && familyCash.includes("حساب المصدر"), "Family cash must make the source account of each advance explicit");
assert.ok(familyCash.includes("fin_family_cash_disburse"), "Family cash must expose the real-money disbursement workflow");
assert.ok(familyCash.includes("disbursementAccountId") && familyCash.includes("disbursementAmount"), "Family cash disbursement must choose a source account and amount");
assert.ok(familyCash.includes("تسليم المبلغ وإنشاء العهدة"), "Family cash must expose one action for posting the disbursement and creating its linked advance");
assert.ok(familyCash.includes("الميزانية والمخصص لا يخصمان أي مبلغ"), "Family cash must clearly distinguish planning/allowance from actual disbursement");
assert.ok(familyCash.includes("netUsed") && familyCash.includes("entry_type===\"Return\""), "Family cash remaining balance must subtract returns from net used amount");

assert.ok(financeChart.includes("role=\"img\"") && financeChart.includes("rows"), "Shared Finance chart must render accessible data-driven bars");
assert.ok(redesign.includes("FinanceChart") && redesign.includes("filteredRows") && redesign.includes("filteredAccounts") && redesign.includes("filteredCategories"), "Finance budgets, accounts, categories, and transactions must expose charts/filters");
assert.match(redesign, /planningTab\s*===\s*"budgets"/);
assert.match(redesign, /planningTab\s*===\s*"goals"/);
assert.match(redesign, /planningTab\s*===\s*"reports"/);

console.log("Finance UI workflow contract tests passed.");
