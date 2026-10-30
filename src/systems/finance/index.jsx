import React, { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../core/supabase.js";
import FinanceDebts from "./Debts.jsx";
import FinanceFamily from "./Family.jsx";
import FinanceFamilyCash from "./FamilyCash.jsx";
import FinanceGoals from "./Goals.jsx";
import FinanceRecurring from "./Recurring.jsx";
import FinanceReports from "./Reports.jsx";
import FinanceProjects from "./Projects.jsx";
import FinanceAssets from "./Assets.jsx";
import FinanceNetWorthHistory from "./NetWorthHistory.jsx";
import FinanceFXRates from "./FXRates.jsx";
import TransactionImport from "./TransactionImport.jsx";

const GREEN = "#059669";
const INK = "#17211D";
const MUTED = "#718078";
const LINE = "#E4EBE6";
const BG = "#F5F8F5";
const money = (v, c = "EGP") => {
  if (v === null || v === undefined || v === "") return "غير مُقيّم";
  try { return new Intl.NumberFormat("ar-EG", { style: "currency", currency: c, maximumFractionDigits: 2 }).format(Number(v)); }
  catch { return String(v) + " " + c; }
};
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Cairo" });
const monthStart = () => today().slice(0, 7) + "-01";
const nextPeriod = (period) => { if (!/^[0-9]{4}-(0[1-9]|1[0-2])$/.test(period || "")) return ""; const [y, m] = period.split("-").map(Number); return new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 7); };
const fmtDate = (v) => { try { return new Date(v + "T12:00:00").toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" }); } catch { return v || "—"; } };
const TYPES = [{ value: "Expense", label: "مصروف" }, { value: "Income", label: "دخل" }, { value: "Transfer", label: "تحويل" }];
const ACCOUNT_TYPES = ["Bank", "Cash", "Mobile Wallet", "Credit Card", "E-Wallet", "Payment Platform", "Investment", "Savings", "Other"];
const TYPE_AR = { Bank: "بنك", Cash: "نقدي", "Mobile Wallet": "محفظة موبايل", "Credit Card": "بطاقة ائتمان", "E-Wallet": "محفظة إلكترونية", "Payment Platform": "منصة دفع", Investment: "استثمار", Savings: "ادخار", Other: "أخرى" };
const initialTx = () => ({ name: "", type: "Expense", purpose: "Regular", amount: "", currency: "EGP", local_date: today(), from_account_id: "", to_account_id: "", category_id: "", goal_id: "", merchant: "", notes: "" });

function Card({ children, style = {} }) { return <div style={{ background: "#fff", border: "1px solid " + LINE, borderRadius: 16, padding: 18, ...style }}>{children}</div>; }
function Button({ children, onClick, secondary = false, disabled = false, type = "button" }) {
  return <button type={type} disabled={disabled} onClick={onClick} style={{ border: secondary ? "1px solid " + LINE : "1px solid " + GREEN, background: secondary ? "#fff" : GREEN, color: secondary ? INK : "#fff", borderRadius: 10, padding: "10px 14px", fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? .55 : 1, fontFamily: "inherit", fontSize: 13 }}>{children}</button>;
}
function Field({ label, children }) { return <label style={{ display: "grid", gap: 6, color: "#46544B", fontSize: 12, fontWeight: 700 }}>{label}{children}</label>; }
const inputStyle = { width: "100%", minWidth: 0, border: "1px solid #D8E2DB", borderRadius: 9, padding: "10px 11px", background: "#fff", color: INK, font: "inherit", fontSize: 13, boxSizing: "border-box", outlineColor: GREEN };
function Input(props) { return <input {...props} style={{ ...inputStyle, ...(props.style || {}) }} />; }
function Select(props) { return <select {...props} style={{ ...inputStyle, ...(props.style || {}) }}>{props.children}</select>; }
function Empty({ title, detail }) { return <div style={{ padding: "36px 16px", textAlign: "center", color: MUTED }}><div style={{ fontSize: 30, marginBottom: 8 }}>🧾</div><b style={{ color: INK }}>{title}</b><div style={{ marginTop: 6, fontSize: 13 }}>{detail}</div></div>; }

export default function FinanceOS({ ws, access, page = "dashboard", setPage, isDemo = false, shell }) {
  const [accounts, setAccounts] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [categories, setCategories] = useState([]);
  const [allCategories, setAllCategories] = useState([]);
  const [goals, setGoals] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [reconciliations, setReconciliations] = useState([]);
  const [reconForm, setReconForm] = useState({ account_id: "", cutoff_date: today(), statement_balance: "", reason: "" });
  const [lockDate, setLockDate] = useState("");
  const [lockReason, setLockReason] = useState("");
  const [budgets, setBudgets] = useState([]);
  const [budgetInsights, setBudgetInsights] = useState(null);
  const [budgetTemplates, setBudgetTemplates] = useState([]);
  const [templateName, setTemplateName] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [budgetPeriod, setBudgetPeriod] = useState(today().slice(0, 7));
  const [budgetForm, setBudgetForm] = useState({ category_id: "", budget_amount: "", notes: "" });
  const [balances, setBalances] = useState([]);
  const [summary, setSummary] = useState(null);
  const [netWorth, setNetWorth] = useState(null);
  const [settings, setSettings] = useState({ base_currency: "EGP", timezone: "Africa/Cairo" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exportingTransactions, setExportingTransactions] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [showTx, setShowTx] = useState(false);
  const [txAction, setTxAction] = useState(null);
  const [txActionReason, setTxActionReason] = useState("");
  const [showAccount, setShowAccount] = useState(false);
  const [editingAccountId, setEditingAccountId] = useState(null);
  const [showCategory, setShowCategory] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [tx, setTx] = useState(initialTx);
  const [splitMode, setSplitMode] = useState(false);
  const [splitRows, setSplitRows] = useState([{ category_id: "", amount: "" }, { category_id: "", amount: "" }]);
  const [accountForm, setAccountForm] = useState({ name: "", account_type: "Bank", currency: "EGP", initial_balance: "0", include_in_net_worth: true, nature: "ASSET" });
  const [categoryForm, setCategoryForm] = useState({ name: "", kind: "Expense", parent_id: "" });

  const canEdit = !isDemo && (access?.level === "edit" || access?.manage || access?.owner);
  const baseCurrency = settings.base_currency || "EGP";
  const targetBudgetPeriod = nextPeriod(budgetPeriod);
  const section = page || "dashboard";
  const go = (id) => setPage && setPage(id);

  const load = useCallback(async () => {
    if (!ws?.id || isDemo) { setLoading(false); return; }
    setLoading(true); setError("");
    try {
      const [ar, cr, tr, sr, br, nr, settingsRes, bu, bt, rr, gr, cu, bi] = await Promise.all([
        supabase.from("finance_accounts").select("*").eq("workspace_id", ws.id).order("created_at", { ascending: false }),
        supabase.from("finance_categories").select("*").eq("workspace_id", ws.id).order("name"),
        supabase.from("finance_transactions").select("*").eq("workspace_id", ws.id).order("local_date", { ascending: false }).limit(150),
        supabase.rpc("fin_period_summary", { p_ws: ws.id, p_from: monthStart(), p_to: today() }),
        supabase.rpc("fin_balances", { p_ws: ws.id }),
        supabase.rpc("fin_net_worth", { p_ws: ws.id, p_as_of: today() }),
        supabase.from("finance_settings").select("base_currency,timezone,lock_before_date,overdraft_policy").eq("workspace_id", ws.id).maybeSingle(),
        supabase.rpc("fin_budgets_get", { p_ws: ws.id, p_period: budgetPeriod }),
        supabase.rpc("fin_budget_templates_get", { p_ws: ws.id }),
        supabase.from("finance_reconciliations").select("*").eq("workspace_id", ws.id).order("created_at", { ascending: false }).limit(50),
        supabase.from("finance_goals").select("id,name,currency,status").eq("workspace_id", ws.id).in("status", ["Active","Paused"]).order("name"),
        supabase.rpc("fin_currencies_get", { p_ws: ws.id }),
        supabase.rpc("fin_budget_insights_get", { p_ws: ws.id, p_period: budgetPeriod })
      ]);
      for (const r of [ar, cr, tr]) if (r.error) throw r.error;
      setAccounts(ar.data || []); setCurrencies(Array.isArray(cu.data) ? cu.data.filter(c => c.is_active) : []); setAllCategories(cr.data || []); setCategories((cr.data || []).filter(c => !c.archived)); setTransactions(tr.data || []);
      setSummary(sr.error ? null : sr.data); setBalances(br.error ? [] : (Array.isArray(br.data) ? br.data : []));
      setNetWorth(nr.error ? null : nr.data); setSettings(settingsRes.data || { base_currency: "EGP", timezone: "Africa/Cairo" });
      setBudgets(bu.error ? [] : (Array.isArray(bu.data) ? bu.data : []));
      setBudgetInsights(bi.error ? null : bi.data || null);
      setBudgetTemplates(bt.error ? [] : (Array.isArray(bt.data) ? bt.data : []));
      setReconciliations(rr.error ? [] : (Array.isArray(rr.data) ? rr.data : []));
      setGoals(gr.error ? [] : (Array.isArray(gr.data) ? gr.data : []));
      setLockDate(settingsRes.data?.lock_before_date || "");
      const rpcErrors = [sr, br, nr].filter(x => x.error);
      if (rpcErrors.length || bu.error || bt.error || rr.error || cu.error || bi.error) setNotice("بعض المؤشرات أو بيانات الميزانية أو العملات غير متاحة حاليًا؛ راجع صلاحيات الوصول.");
    } catch (e) { setError(e?.message || "تعذّر تحميل بيانات الماليات"); }
    finally { setLoading(false); }
  }, [ws?.id, isDemo, budgetPeriod]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (!notice) return; const t = setTimeout(() => setNotice(""), 5000); return () => clearTimeout(t); }, [notice]);

  const accountById = useMemo(() => Object.fromEntries(accounts.map(a => [a.id, a])), [accounts]);
  const categoryById = useMemo(() => Object.fromEntries(allCategories.map(c => [c.id, c])), [allCategories]);
  const visibleTransactions = useMemo(() => transactions.filter(t => {
    const text = [t.name, t.merchant, t.notes, categoryById[t.category_id]?.name].join(" ").toLowerCase();
    return (!search || text.includes(search.toLowerCase())) && (filterType === "all" || t.type === filterType);
  }), [transactions, search, filterType, categoryById]);
  const posted = transactions.filter(t => t.status === "Posted");
  const monthTransactions = posted.filter(t => t.local_date >= monthStart() && t.local_date <= today());
  const monthIncomeFallback = monthTransactions.filter(t => t.pnl_effect === "Income").reduce((s, t) => s + Number(t.base_amount || 0), 0);
  const monthExpenseFallback = monthTransactions.filter(t => t.pnl_effect === "Expense").reduce((s, t) => s + Number(t.base_amount || 0), 0);
  const income = Number(summary?.income ?? monthIncomeFallback);
  const expense = Number(summary?.expense ?? monthExpenseFallback);
  const net = income - expense;
  const totalLiquid = balances.reduce((sum, b) => sum + (b.base_value == null ? 0 : Number(b.base_value)), 0);
  const netValue = netWorth?.net_worth ?? netWorth?.netWorth ?? null;
  const budgetInsightCategories = budgetInsights?.categories || [];
  const overallBudgetInsight = budgetInsights?.overall_budget || budgets.find(b => !b.category_id) || null;
  const plannedBudgetTotal = overallBudgetInsight
    ? Number(overallBudgetInsight.budget_amount || 0) + Number(overallBudgetInsight.rollover_in || 0)
    : budgets.filter(b => b.category_id).reduce((sum, b) => sum + Number(b.budget_amount || 0) + Number(b.rollover_in || 0), 0);
  const actualBudgetSpend = Number(budgetInsights?.summary?.total_spent ?? budgets.reduce((sum, b) => sum + Number(b.spent || 0), 0));
  const budgetRemaining = plannedBudgetTotal - actualBudgetSpend;
  const unbudgetedRows = budgetInsightCategories.filter(row => row.is_unbudgeted && Number(row.spent || 0) > 0);
  const [budgetYear, budgetMonthNumber] = budgetPeriod.split("-").map(Number);
  const budgetMonthDays = budgetYear && budgetMonthNumber ? new Date(Date.UTC(budgetYear, budgetMonthNumber, 0)).getUTCDate() : 0;
  const budgetIsCurrentMonth = budgetPeriod === today().slice(0, 7);
  const budgetDaysLeft = budgetIsCurrentMonth ? Math.max(1, budgetMonthDays - Number(today().slice(8, 10)) + 1) : budgetPeriod > today().slice(0, 7) ? budgetMonthDays : 0;
  const suggestedDailyLimit = budgetDaysLeft > 0 ? budgetRemaining / budgetDaysLeft : null;

  async function saveTransaction(e) {
    e.preventDefault(); if (!canEdit || saving) return;
    if (!(Number(tx.amount) > 0) || !tx.local_date || !tx.from_account_id) { setError("أكمل المبلغ والتاريخ والحساب."); return; }
    if (tx.type !== "Transfer" && !splitMode && !tx.category_id) { setError("اختَر تصنيفًا للحركة؛ اسم الحركة غير مطلوب."); return; }
    if (tx.type === "Transfer" && (!tx.to_account_id || tx.to_account_id === tx.from_account_id)) { setError("اختر حسابًا مستلمًا مختلفًا عن حساب المصدر."); return; }
    if (tx.goal_id && tx.type !== "Transfer") { setError("مساهمة الهدف أو السحب منه يجب أن تكون تحويلًا بين حسابين."); return; }
    const validSplits = splitRows.filter(s => s.category_id && Number(s.amount) > 0);
    if (splitMode && tx.type === "Transfer") { setError("تقسيم التحويلات غير متاح؛ اختر دخلًا أو مصروفًا."); return; }
    if (splitMode && (validSplits.length < 2 || Math.abs(validSplits.reduce((sum, s) => sum + Number(s.amount), 0) - Number(tx.amount)) > 0.0001)) { setError("أضف تصنيفين على الأقل، وتأكد أن مجموع التقسيمات يساوي مبلغ الحركة بالكامل."); return; }
    if (tx.type === "Transfer" && accountById[tx.from_account_id]?.currency !== accountById[tx.to_account_id]?.currency) { setError("التحويل بين عملتين مختلفتين سيُفعّل في مرحلة أسعار الصرف؛ استخدم حسابين بنفس العملة حاليًا."); return; }
    setSaving(true); setError("");
    try {
      const sourceAccount = accountById[tx.from_account_id];
      const payload = {
        workspace_id: ws.id, name: (tx.type === "Transfer" ? "تحويل بين حسابات" : splitMode ? "حركة موزعة على تصنيفات" : (categoryById[tx.category_id]?.name || (tx.type === "Income" ? "دخل" : "مصروف"))), type: tx.type, purpose: tx.purpose || "Regular", status: "Posted",
        amount: String(tx.amount), currency: tx.currency || sourceAccount?.currency || baseCurrency, local_date: tx.local_date,
        from_account_id: tx.from_account_id, to_account_id: tx.type === "Transfer" ? tx.to_account_id : null,
        category_id: tx.type === "Transfer" || splitMode ? null : (tx.category_id || null), goal_id: tx.goal_id || null, merchant: tx.merchant || null, notes: tx.notes || null,
        splits: splitMode ? validSplits.map(s => ({ category_id: s.category_id, amount: String(s.amount) })) : [],
        client_generated_id: "web-" + (globalThis.crypto?.randomUUID?.() || (Date.now() + "-" + Math.random().toString(36).slice(2))),
        idempotency_key: "finance-ui-" + (globalThis.crypto?.randomUUID?.() || Date.now() + "-" + Math.random().toString(36).slice(2))
      };
      const { data, error: rpcError } = await supabase.rpc("fin_post_transaction_with_splits", { p: payload });
      if (rpcError) throw rpcError;
      if (data?.duplicate) setNotice("تم اكتشاف حركة موجودة مسبقًا؛ لم يتم إنشاء نسخة أخرى.");
      else setNotice(data?.warnings?.length ? "تم حفظ الحركة مع تنبيه: " + data.warnings.join(", ") : "تم تسجيل الحركة بنجاح.");
      setShowTx(false); setTx(initialTx()); setSplitMode(false); setSplitRows([{ category_id: "", amount: "" }, { category_id: "", amount: "" }]); await load();
    } catch (e) { setError(e?.message || "تعذّر تسجيل الحركة"); }
    finally { setSaving(false); }
  }

  async function confirmTransactionAction(e) {
    e.preventDefault();
    if (!canEdit || saving || !txAction || txActionReason.trim().length < 3) { if (txActionReason.trim().length < 3) setError("اكتب سببًا لا يقل عن 3 أحرف."); return; }
    setSaving(true); setError("");
    try {
      const rpc = txAction.kind === "reverse" ? "fin_reverse_transaction" : "fin_void_transaction";
      const payload = { workspace_id: ws.id, transaction_id: txAction.transaction.id, reason: txActionReason.trim(), idempotency_key: "finance-" + txAction.kind + "-" + (globalThis.crypto?.randomUUID?.() || Date.now() + "-" + Math.random().toString(36).slice(2)) };
      const { data, error: rpcError } = await supabase.rpc(rpc, { p: payload });
      if (rpcError) throw rpcError;
      setNotice(txAction.kind === "reverse" ? "تم عكس الحركة بقيد تصحيحي؛ لم تُحذف الحركة الأصلية." : "تم إلغاء الحركة المقترحة دون نشرها في الدفتر.");
      setTxAction(null); setTxActionReason(""); await load();
    } catch (e) { setError(e?.message || "تعذّر تنفيذ تصحيح الحركة."); }
    finally { setSaving(false); }
  }

  async function exportVisibleTransactionsCsv() {
    if (exportingTransactions) return;
    setExportingTransactions(true);
    setError("");
    try {
      // The screen is intentionally limited to 150 rows; export pages through the full ledger.
      let exportTransactions = transactions;
      if (!isDemo) {
        if (!ws?.id) throw new Error("تعذّر تحديد مساحة العمل لتصدير الحركات.");
        const pageSize = 1000;
        const allRows = [];
        for (let offset = 0; ; offset += pageSize) {
          const { data, error: queryError } = await supabase
            .from("finance_transactions")
            .select("*")
            .eq("workspace_id", ws.id)
            .order("local_date", { ascending: false })
            .order("id", { ascending: false })
            .range(offset, offset + pageSize - 1);
          if (queryError) throw queryError;
          const pageRows = data || [];
          allRows.push(...pageRows);
          if (pageRows.length < pageSize) break;
        }
        exportTransactions = allRows;
      }

      const filteredTransactions = exportTransactions.filter((t) => {
        const text = [t.name, t.merchant, t.notes, categoryById[t.category_id]?.name].join(" ").toLowerCase();
        return (!search || text.includes(search.toLowerCase())) && (filterType === "all" || t.type === filterType);
      });
      const headers = ["التاريخ", "التصنيف / البيان", "النوع", "المبلغ", "العملة", "الحالة", "التصنيف", "الحساب", "التاجر", "الغرض", "ملاحظات", "معرّف الحركة"];
      const cell = (value) => {
        let text = String(value ?? "");
        // Prevent spreadsheet formula execution for user-controlled text fields.
        if (/^[\\t\\r ]*[=+@-]/.test(text)) text = "'" + text;
        return '"' + text.replace(/"/g, '""') + '"';
      };
      const rows = filteredTransactions.map((t) => [
        t.local_date,
        categoryById[t.category_id]?.name || t.name || (t.type === "Transfer" ? "تحويل بين حسابات" : t.type === "Income" ? "دخل" : "مصروف"),
        TYPES.find((x) => x.value === t.type)?.label || t.type,
        t.amount,
        t.currency,
        t.status,
        categoryById[t.category_id]?.name || "",
        accountById[t.from_account_id]?.name || accountById[t.to_account_id]?.name || "",
        t.merchant || "",
        t.purpose || "",
        t.notes || "",
        t.id
      ]);
      const csv = "\\uFEFF" + [headers, ...rows].map((row) => row.map(cell).join(",")).join("\\r\\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "finance-transactions-" + today() + ".csv";
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice("تم تصدير " + rows.length + " حركة مطابقة للفلاتر من إجمالي " + exportTransactions.length + " حركة.");
    } catch (e) {
      setError(e?.message || "تعذّر تصدير الحركات المالية كاملة.");
    } finally {
      setExportingTransactions(false);
    }
  }

  function startCreateAccount() { setEditingAccountId(null); setAccountForm({ name: "", account_type: "Bank", currency: baseCurrency, initial_balance: "0", include_in_net_worth: true, nature: "ASSET" }); setShowAccount(true); setError(""); }
  function startEditAccount(account) {
    setEditingAccountId(account.id);
    setAccountForm({ name: account.name || "", account_type: account.account_type || "Bank", currency: account.currency || baseCurrency, initial_balance: String(account.initial_balance ?? "0"), include_in_net_worth: !!account.include_in_net_worth, nature: account.nature || "ASSET" });
    setShowAccount(true); setError("");
  }
  async function archiveAccount(account) {
    if (!canEdit || saving) return;
    const nextStatus = account.status === "Archived" ? "Active" : "Archived";
    if (!globalThis.confirm(nextStatus === "Archived" ? "سيتم أرشفة الحساب ومنع استخدامه في الحركات الجديدة. ستظل الحركات والسجلات السابقة محفوظة. هل تريد المتابعة؟" : "سيتم إعادة تفعيل الحساب. هل تريد المتابعة؟")) return;
    setSaving(true); setError("");
    try {
      const { error: err } = await supabase.from("finance_accounts").update({ status: nextStatus }).eq("id", account.id).eq("workspace_id", ws.id);
      if (err) throw err;
      setNotice(nextStatus === "Archived" ? "تمت أرشفة الحساب مع الحفاظ على سجله المالي." : "تمت إعادة تفعيل الحساب.");
      await load();
    } catch (e) { setError(e?.message || "تعذّر تغيير حالة الحساب"); }
    finally { setSaving(false); }
  }
  async function saveAccount(e) {
    e.preventDefault(); if (!canEdit || saving) return;
    const name = accountForm.name.trim();
    const currency = accountForm.currency.trim().toUpperCase();
    if (!name) { setError("اكتب اسم الحساب."); return; }
    if (!/^[A-Z]{3}$/.test(currency)) { setError("اكتب رمز عملة صحيحًا من 3 أحرف لاتينية، مثل EGP أو USD."); return; }
    if (accountForm.initial_balance === "" || !Number.isFinite(Number(accountForm.initial_balance))) { setError("أدخل رصيدًا افتتاحيًا صحيحًا."); return; }
    setSaving(true); setError("");
    try {
      const payload = { name, account_type: accountForm.account_type, currency, initial_balance: String(accountForm.initial_balance || "0"), include_in_net_worth: !!accountForm.include_in_net_worth, nature: accountForm.nature || "ASSET" };
      const query = editingAccountId
        ? supabase.from("finance_accounts").update(payload).eq("id", editingAccountId).eq("workspace_id", ws.id)
        : supabase.from("finance_accounts").insert({ ...payload, workspace_id: ws.id });
      const { error: err } = await query;
      if (err) throw err;
      const wasEditing = !!editingAccountId;
      setShowAccount(false); setEditingAccountId(null);
      setAccountForm({ name: "", account_type: "Bank", currency: baseCurrency, initial_balance: "0", include_in_net_worth: true, nature: "ASSET" });
      setNotice(wasEditing ? "تم تحديث الحساب. إذا كان له سجل مالي، سيمنع النظام تغيير العملة أو الرصيد الافتتاحي حفاظًا على صحة الدفتر." : "تم إنشاء الحساب.");
      await load();
    } catch (e) { setError(e?.message || "تعذّر حفظ الحساب"); }
    finally { setSaving(false); }
  }

  function startCategoryCreate() { setEditingCategoryId(null); setCategoryForm({ name: "", kind: "Expense", parent_id: "" }); setShowCategory(true); setError(""); }
  function startCategoryEdit(category) { setEditingCategoryId(category.id); setCategoryForm({ name: category.name, kind: category.kind, parent_id: category.parent_id || "" }); setShowCategory(true); setError(""); }
  async function toggleCategoryArchive(category) {
    if (!canEdit || saving) return;
    const archived = !category.archived;
    if (archived && category.system_key) { setError("تصنيف نظامي لا يمكن أرشفته."); return; }
    setSaving(true); setError("");
    try {
      const { error: err } = await supabase.from("finance_categories").update({ archived }).eq("workspace_id", ws.id).eq("id", category.id);
      if (err) throw err;
      setNotice(archived ? "تمت أرشفة التصنيف مع الاحتفاظ بالحركات التاريخية." : "تمت إعادة تفعيل التصنيف.");
      await load();
    } catch (e) { setError(e?.message || "تعذّر تغيير حالة التصنيف"); }
    finally { setSaving(false); }
  }
  async function saveCategory(e) {
    e.preventDefault(); if (!canEdit || saving) return;
    const name = categoryForm.name.trim();
    if (!name) { setError("اكتب اسم التصنيف."); return; }
    setSaving(true); setError("");
    try {
      const parent = categoryForm.parent_id ? allCategories.find(c => c.id === categoryForm.parent_id) : null;
      if (parent && (parent.parent_id || parent.kind !== categoryForm.kind || parent.id === editingCategoryId)) { setError("التصنيف الفرعي يجب أن يرتبط بتصنيف رئيسي مختلف من النوع نفسه."); return; }
      const payload = { name, parent_id: categoryForm.parent_id || null };
      const query = editingCategoryId
        ? supabase.from("finance_categories").update(payload).eq("workspace_id", ws.id).eq("id", editingCategoryId)
        : supabase.from("finance_categories").insert({ ...categoryForm, ...payload, workspace_id: ws.id, name });
      const { error: err } = await query;
      if (err) throw err;
      setShowCategory(false); setEditingCategoryId(null); setCategoryForm({ name: "", kind: "Expense", parent_id: "" }); setNotice(editingCategoryId ? "تم تحديث التصنيف." : "تم إنشاء التصنيف."); await load();
    } catch (e) { setError(e?.message || "تعذّر حفظ التصنيف"); }
    finally { setSaving(false); }
  }

  async function saveBudget(e) {
    e.preventDefault(); if (!canEdit || saving) return;
    if (!budgetPeriod || !/^[0-9]{4}-(0[1-9]|1[0-2])$/.test(budgetPeriod) || budgetForm.budget_amount === "" || Number(budgetForm.budget_amount) < 0) { setError("اختر شهرًا صحيحًا وأدخل ميزانية صفرًا أو أكثر."); return; }
    setSaving(true); setError("");
    try {
      const { error: err } = await supabase.rpc("fin_budget_upsert", { p: { workspace_id: ws.id, category_id: budgetForm.category_id || null, period: budgetPeriod, budget_amount: String(budgetForm.budget_amount), notes: budgetForm.notes || null, source: "Manual" } });
      if (err) throw err;
      setNotice("تم حفظ الميزانية."); setBudgetForm({ category_id: "", budget_amount: "", notes: "" }); await load();
    } catch (e) { setError(e?.message || "تعذّر حفظ الميزانية"); }
    finally { setSaving(false); }
  }

  async function rolloverBudget() {
    if (!canEdit || saving) return;
    if (!budgets.length) { setError("لا توجد ميزانيات في الفترة الحالية لترحيلها."); return; }
    if (!globalThis.confirm("سيتم إنشاء أو تحديث ميزانيات " + targetBudgetPeriod + " بنسخ حدود الشهر الحالي وإضافة المتبقي الموجب إلى خانة الترحيل. لن يمكن تكرار العملية لنفس الشهرين. هل تريد المتابعة؟")) return;
    setSaving(true); setError("");
    try {
      const { data, error: err } = await supabase.rpc("fin_budget_rollover_apply", { p: { workspace_id: ws.id, source_period: budgetPeriod, target_period: targetBudgetPeriod } });
      if (err) throw err;
      setNotice("تم تجهيز ميزانيات " + targetBudgetPeriod + " (" + (data?.copied_count || 0) + " بند)، والمتبقي المُرحّل: " + money(data?.rollover_amount || 0, baseCurrency) + ".");
      setBudgetPeriod(targetBudgetPeriod);
    } catch (e) { setError(e?.message || "تعذّر ترحيل الميزانيات"); }
    finally { setSaving(false); }
  }

  async function saveBudgetTemplate(e) {
    e.preventDefault(); if (!canEdit || saving) return;
    if (!templateName.trim()) { setError("اكتب اسمًا للقالب."); return; }
    if (!budgets.length) { setError("لا توجد ميزانيات في هذه الفترة لحفظها كقالب."); return; }
    setSaving(true); setError("");
    try {
      const { data, error: err } = await supabase.rpc("fin_budget_template_save", { p: { workspace_id: ws.id, period: budgetPeriod, name: templateName.trim() } });
      if (err) throw err;
      setNotice("تم حفظ قالب الميزانية (" + (data?.line_count || budgets.length) + " بند).");
      setTemplateName(""); await load();
      if (data?.id) setSelectedTemplateId(data.id);
    } catch (e) { setError(e?.message || "تعذّر حفظ قالب الميزانية"); }
    finally { setSaving(false); }
  }

  async function applyBudgetTemplate(e) {
    e.preventDefault(); if (!canEdit || saving) return;
    if (!selectedTemplateId) { setError("اختر قالبًا أولًا."); return; }
    if (!globalThis.confirm("سيتم إنشاء أو تحديث الميزانيات المطابقة في " + budgetPeriod + ". القيم الحالية للبنود الموجودة ستُستبدل. هل تريد المتابعة؟")) return;
    setSaving(true); setError("");
    try {
      const { data, error: err } = await supabase.rpc("fin_budget_template_apply", { p: { workspace_id: ws.id, template_id: selectedTemplateId, period: budgetPeriod } });
      if (err) throw err;
      setNotice("تم تطبيق القالب على " + (data?.applied_count || 0) + " بند في " + budgetPeriod + ".");
      await load();
    } catch (e) { setError(e?.message || "تعذّر تطبيق قالب الميزانية"); }
    finally { setSaving(false); }
  }

  async function createReconciliation(e) {
    e.preventDefault(); if (!canEdit || saving) return;
    if (!reconForm.account_id || !reconForm.cutoff_date || reconForm.statement_balance === "" || !Number.isFinite(Number(reconForm.statement_balance))) { setError("اختر الحساب وتاريخ الكشف وأدخل الرصيد الختامي."); return; }
    setSaving(true); setError("");
    try {
      const { data, error: err } = await supabase.rpc("fin_reconciliation_create", { p: { workspace_id: ws.id, account_id: reconForm.account_id, cutoff_date: reconForm.cutoff_date, statement_balance: String(reconForm.statement_balance) } });
      if (err) throw err;
      setNotice("تم إنشاء مسودة التسوية. فرق الرصيد: " + money(data?.difference || 0, accountById[reconForm.account_id]?.currency || baseCurrency));
      setReconForm({ account_id: reconForm.account_id, cutoff_date: today(), statement_balance: "", reason: "" });
      await load();
    } catch (e) { setError(e?.message || "تعذّر إنشاء التسوية"); }
    finally { setSaving(false); }
  }

  async function reviewReconciliation(row, decision) {
    if (!canEdit || saving) return;
    let reason = "";
    if (decision === "adjust") { reason = globalThis.prompt("اكتب سبب تعديل الرصيد (مطلوب للتدقيق):", "فرق كشف الحساب"); if (!reason || reason.trim().length < 3) return; }
    setSaving(true); setError("");
    try {
      const { error: err } = await supabase.rpc("fin_reconciliation_review", { p: { workspace_id: ws.id, reconciliation_id: row.id, decision, reason: reason.trim() || null } });
      if (err) throw err;
      setNotice(decision === "match" ? "تمت مراجعة التسوية دون فرق." : "تمت مراجعة فرق الرصيد مع اعتماد التسوية المقترحة؛ لم تُنشأ حركة التعديل بعد.");
      await load();
    } catch (e) { setError(e?.message || "تعذّرت مراجعة التسوية"); }
    finally { setSaving(false); }
  }

  async function completeReconciliation(row) {
    if (!canEdit || saving) return;
    if (!globalThis.confirm("سيتم إكمال التسوية ووضع علامة مطابقة على الحركات حتى تاريخ الكشف. إذا اعتمدت التعديل، ستُنشأ حركة Adjustment منفصلة. هل تريد المتابعة؟")) return;
    setSaving(true); setError("");
    try {
      const { data, error: err } = await supabase.rpc("fin_reconciliation_complete", { p: { workspace_id: ws.id, reconciliation_id: row.id, idempotency_key: "recon-ui-" + (globalThis.crypto?.randomUUID?.() || Date.now() + "-" + Math.random().toString(36).slice(2)) } });
      if (err) throw err;
      setNotice("اكتملت التسوية. " + (data?.adjustment_tx_id ? "تم إنشاء حركة تعديل مرتبطة بالتسوية." : "لم تكن هناك حاجة إلى حركة تعديل."));
      await load();
    } catch (e) { setError(e?.message || "تعذّر إكمال التسوية"); }
    finally { setSaving(false); }
  }

  async function cancelReconciliation(row) {
    if (!(access?.manage || access?.owner) || saving) return;
    const reason = globalThis.prompt("سبب إلغاء التسوية المكتملة (مطلوب للتدقيق):", "");
    if (!reason || reason.trim().length < 3) return;
    if (!globalThis.confirm("سيُلغى اعتماد التسوية، وسيُعكس أي تعديل مالي أنشأته. هل تريد المتابعة؟")) return;
    setSaving(true); setError("");
    try {
      const { error: err } = await supabase.rpc("fin_reconciliation_cancel", { p: { workspace_id: ws.id, reconciliation_id: row.id, reason: reason.trim() } });
      if (err) throw err;
      setNotice("تم إلغاء التسوية وعكس تعديلها إن وُجد.");
      await load();
    } catch (e) { setError(e?.message || "تعذّر إلغاء التسوية"); }
    finally { setSaving(false); }
  }

  async function savePeriodLock(e) {
    e.preventDefault(); if (!(access?.manage || access?.owner) || saving) return;
    const previous = settings.lock_before_date || null;
    const next = lockDate || null;
    if (previous && (!next || next < previous) && lockReason.trim().length < 3) { setError("اكتب سببًا من 3 أحرف على الأقل عند فتح فترة مقفلة أو تقليل نطاق القفل."); return; }
    setSaving(true); setError("");
    try {
      const { error: err } = await supabase.rpc("fin_set_lock", { p: { workspace_id: ws.id, lock_before_date: next, reason: lockReason.trim() || null } });
      if (err) throw err;
      setSettings(old => ({ ...old, lock_before_date: next }));
      setLockReason("");
      setNotice(next ? "تم تحديث قفل الفترات. الحركات قبل " + next + " ستظل مقفلة." : "تم فتح الفترات المقفلة.");
      await load();
    } catch (e) { setError(e?.message || "تعذّر تحديث قفل الفترات"); }
    finally { setSaving(false); }
  }

  const pageTitle = ({ "family-cash": "عهد ومصروفات الأفراد", dashboard: "لوحة القيادة", inbox: "الوارد", transactions: "الحركات المالية", accounts: "الحسابات", categories: "التصنيفات", budgets: "الميزانيات", reconciliation: "التسوية البنكية", assets: "الأصول والاستثمارات", debts: "الديون والأقساط", recurring: "المتكرر والاشتراكات", projects: "المشاريع المالية", networth: "صافي الثروة", fx: "أسعار الصرف", reports: "التقارير", settings: "الإعدادات والأمان", family: "مركز مصاريف الأسرة" })[section] || "الماليات";
  const navGroups = [
    { id: "overview", label: "الرئيسية", items: [["dashboard", "لوحة القيادة", "⌂"], ["inbox", "الوارد (الدخل)", "📥"], ["transactions", "الحركات المالية", "🧾"], ["accounts", "الحسابات", "🏦"]] },
    { id: "family", label: "الأسرة", items: [["family", "مركز مصاريف الأسرة", "👪"], ["family-cash", "عهد ومصروفات الأفراد", "👪"]] },
    { id: "planning", label: "التخطيط والميزانية", items: [["budgets", "الميزانيات", "📊"], ["goals", "الأهداف المالية", "🎯"], ["recurring", "المتكرر والاشتراكات", "🔁"], ["projects", "مشاريع مرتبطة بالمشاريع الأساسية", "📁"]] },
    { id: "wealth", label: "الثروة والالتزامات", items: [["assets", "الأصول", "📈"], ["debts", "الديون والأقساط", "💳"], ["networth", "صافي الثروة", "💎"], ["reconciliation", "التسوية البنكية", "☑️"]] },
    { id: "analysis", label: "التحليل والإعدادات", items: [["reports", "التقارير والتحليلات", "📑"], ["categories", "التصنيفات", "🗂️"], ["fx", "العملات وأسعار الصرف", "💱"], ["settings", "الإعدادات والأمان", "🔐"]] }
  ];
  const nav = navGroups.flatMap(group => group.items);
  const activeNavGroup = navGroups.find(group => group.items.some(([id]) => id === section)) || navGroups[0];
  const pageStyle = { minWidth: 0, color: INK, fontFamily: "inherit", direction: "rtl" };
  const labelStyle = { color: MUTED, fontSize: 12, marginBottom: 7 };
  const valueStyle = { color: INK, fontSize: 22, fontWeight: 800, letterSpacing: "-.4px", overflowWrap: "anywhere" };
  const grid = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 12 };
  const formGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 };
  const tableWrap = { overflowX: "auto", width: "100%" };
  const th = { textAlign: "right", padding: "12px 10px", color: MUTED, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap", borderBottom: "1px solid " + LINE };
  const td = { padding: "13px 10px", borderBottom: "1px solid #EEF2EF", fontSize: 12, whiteSpace: "nowrap" };

  return <div style={pageStyle}>
    <style>{`@media(max-width:640px){.fin-header{align-items:flex-start!important;flex-direction:column!important}.fin-actions{width:100%;display:flex;flex-wrap:wrap}.fin-actions button{flex:1}.fin-modal{padding:14px!important}.fin-tile{padding:14px!important}}`}</style>
    <div className="fin-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, marginBottom: 18 }}>
      <div><div style={{ color: GREEN, fontSize: 11, fontWeight: 800, letterSpacing: ".3px", marginBottom: 5 }}>FINANCE OS · {ws?.name || "مساحتي"}</div><h1 style={{ fontSize: 25, margin: 0, fontWeight: 850 }}>{pageTitle}</h1><p style={{ color: MUTED, fontSize: 12, margin: "7px 0 0" }}>كل حركة مالية لها أثر واضح وسجل قابل للمراجعة.</p></div>
      <div className="fin-actions" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Button secondary onClick={() => load()}>↻ تحديث</Button>
        {canEdit && <Button onClick={() => { setError(""); setShowTx(true); }}>＋ حركة جديدة</Button>}
      </div>
    </div>

    <div style={{ display: "flex", gap: 7, flexWrap: "wrap", paddingBottom: 8, marginBottom: 7 }}>
      {navGroups.map(group => <button key={group.id} onClick={() => go(group.items[0][0])} aria-pressed={activeNavGroup.id === group.id} style={{ flex: "0 0 auto", border: "1px solid " + (activeNavGroup.id === group.id ? "#A7DCC4" : LINE), background: activeNavGroup.id === group.id ? "#E8F7EF" : "#fff", color: activeNavGroup.id === group.id ? "#047857" : "#66736B", borderRadius: 10, padding: "9px 13px", fontFamily: "inherit", fontWeight: activeNavGroup.id === group.id ? 800 : 600, fontSize: 12, cursor: "pointer" }}>{group.label}</button>)}
    </div>
    <div style={{ display: "flex", gap: 7, overflowX: "auto", padding: "0 0 12px", marginBottom: 12, borderBottom: "1px solid " + LINE }}>
      {activeNavGroup.items.map(([id, label, icon]) => <button key={id} onClick={() => go(id)} aria-current={section === id ? "page" : undefined} style={{ flex: "0 0 auto", border: "1px solid " + (section === id ? "#A7DCC4" : LINE), background: section === id ? "#E8F7EF" : "#fff", color: section === id ? "#047857" : "#66736B", borderRadius: 10, padding: "8px 11px", fontFamily: "inherit", fontWeight: section === id ? 800 : 600, fontSize: 12, cursor: "pointer" }}>{icon} {label}</button>)}
    </div>

    {error && <div role="alert" style={{ padding: "11px 14px", marginBottom: 12, borderRadius: 10, background: "#FFF1F0", color: "#B42318", border: "1px solid #FECACA", fontSize: 12, overflowWrap: "anywhere" }}>{error}<button onClick={() => setError("")} style={{ float: "left", border: 0, background: "transparent", cursor: "pointer" }}>✕</button></div>}
    {notice && <div role="status" style={{ padding: "11px 14px", marginBottom: 12, borderRadius: 10, background: "#ECFDF3", color: "#067647", border: "1px solid #ABEFC6", fontSize: 12 }}>{notice}</div>}
    {isDemo && <div style={{ padding: 12, borderRadius: 10, background: "#FFFAEB", color: "#92400E", marginBottom: 12, fontSize: 12 }}>وضع العرض التجريبي: لا تُحفظ أي بيانات مالية حقيقية في هذا الإصدار التجريبي.</div>}

    {loading ? <Card><div style={{ padding: 32, textAlign: "center", color: MUTED }}>جارٍ تحميل بياناتك المالية…</div></Card> : <>
      {section === "dashboard" && <>
        <div style={grid}>
          <Card className="fin-tile" style={{ background: "#F0FDF4", borderColor: "#BBF7D0" }}><div style={labelStyle}>صافي التدفق التشغيلي · هذا الشهر</div><div style={{ ...valueStyle, color: net >= 0 ? "#047857" : "#B42318" }}>{money(net, baseCurrency)}</div><div style={{ color: MUTED, fontSize: 11, marginTop: 8 }}>الدخل مطروحًا منه المصروف التشغيلي</div></Card>
          <Card className="fin-tile"><div style={labelStyle}>الدخل · هذا الشهر</div><div style={valueStyle}>{money(income, baseCurrency)}</div><div style={{ color: MUTED, fontSize: 11, marginTop: 8 }}>من الحركات المنشورة</div></Card>
          <Card className="fin-tile"><div style={labelStyle}>المصروف · هذا الشهر</div><div style={valueStyle}>{money(expense, baseCurrency)}</div><div style={{ color: MUTED, fontSize: 11, marginTop: 8 }}>لا يشمل التحويلات بين الحسابات</div></Card>
          <Card className="fin-tile"><div style={labelStyle}>صافي الثروة</div><div style={valueStyle}>{netValue == null ? "غير متاح" : money(netValue, baseCurrency)}</div><div style={{ color: MUTED, fontSize: 11, marginTop: 8 }}>القيم غير المقيمة لا تُحسب صفرًا</div></Card>
        </div>
        <div style={{ ...grid, marginTop: 12, gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))" }}>
          <Card><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 10 }}><h3 style={{ fontSize: 15, margin: 0 }}>الحسابات</h3><Button secondary onClick={() => go("accounts")}>كل الحسابات</Button></div>
            {!accounts.length ? <Empty title="ابدأ بإضافة حساب" detail="أضف البنك أو المحفظة أو النقدية لتسجيل الحركات." /> : accounts.slice(0, 5).map(a => { const b = balances.find(x => x.account_id === a.id); return <div key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "12px 0", borderBottom: "1px solid #EEF2EF" }}><div><div style={{ fontSize: 13, fontWeight: 750 }}>{a.name}</div><div style={{ color: MUTED, fontSize: 11, marginTop: 4 }}>{TYPE_AR[a.account_type] || a.account_type} · {a.currency}</div></div><div style={{ fontSize: 13, fontWeight: 800 }}>{money(b?.balance ?? a.initial_balance, a.currency)}</div></div>; })}
          </Card>
          <Card><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 10 }}><h3 style={{ fontSize: 15, margin: 0 }}>أحدث الحركات</h3><Button secondary onClick={() => go("transactions")}>عرض الكل</Button></div>
            {!transactions.length ? <Empty title="لا توجد حركات بعد" detail="سجّل أول دخل أو مصروف لتبدأ." /> : transactions.slice(0, 6).map(t => <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid #EEF2EF" }}><div style={{ minWidth: 0 }}><div style={{ fontSize: 12, fontWeight: 750, overflow: "hidden", textOverflow: "ellipsis" }}>{t.name}</div><div style={{ color: MUTED, fontSize: 10, marginTop: 4 }}>{fmtDate(t.local_date)} · {t.status === "Posted" ? "منشورة" : t.status === "Proposed" ? "مقترحة" : t.status}</div></div><div style={{ color: t.type === "Income" ? "#047857" : t.type === "Expense" ? "#B42318" : INK, fontWeight: 800, fontSize: 12 }}>{t.type === "Income" ? "+" : t.type === "Expense" ? "−" : "↔"} {money(t.amount, t.currency)}</div></div>)}
          </Card>
        </div>
        {summary?.unvalued > 0 && <div style={{ marginTop: 12, background: "#FFFAEB", border: "1px solid #FEDF89", borderRadius: 12, padding: 13, fontSize: 12, color: "#92400E" }}>⚠️ توجد {summary.unvalued} حركة دون تقييم بعملة الأساس؛ راجع أسعار الصرف قبل الاعتماد على التقارير.</div>}
      </>}

      {section === "inbox" && <Card><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,flexWrap:"wrap"}}><div><h3 style={{margin:0}}>الوارد المالي · الدخل</h3><p style={{color:MUTED,fontSize:12,margin:"5px 0 0"}}>هذا القسم مخصص للأموال الداخلة إلى حساباتك، وليس لصندوق رسائل أو استيراد بنكي تلقائي.</p></div>{canEdit && <Button onClick={() => { setTx({...initialTx(),type:"Income"}); setShowTx(true); setError(""); }}>＋ تسجيل دخل</Button>}</div><div style={{...grid,marginTop:14}}><div style={{border:"1px solid "+LINE,borderRadius:12,padding:14}}><div style={labelStyle}>إجمالي الدخل المحمّل</div><div style={valueStyle}>{money(visibleTransactions.filter(t=>t.type==="Income"&&t.status==="Posted").reduce((sum,t)=>sum+Number(t.base_amount||0),0),baseCurrency)}</div></div><div style={{border:"1px solid "+LINE,borderRadius:12,padding:14}}><div style={labelStyle}>عدد الحركات</div><div style={valueStyle}>{visibleTransactions.filter(t=>t.type==="Income").length}</div></div></div><div style={{marginTop:14,display:"grid",gap:8}}>{visibleTransactions.filter(t=>t.type==="Income").map(t=><div key={t.id} style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",padding:"12px 0",borderBottom:"1px solid "+LINE}}><div><b>{categoryById[t.category_id]?.name||t.name||"دخل"}</b><div style={{color:MUTED,fontSize:11,marginTop:4}}>{fmtDate(t.local_date)} · {accountById[t.to_account_id||t.from_account_id]?.name||"حساب"} · {t.merchant||"بدون جهة"}</div></div><b>{money(t.amount,t.currency)}</b></div>)}{!visibleTransactions.some(t=>t.type==="Income")&&<Empty title="لا توجد إيرادات مسجلة" detail="سجّل راتبًا أو دخل عمل حر أو أي مبلغ وارد إلى حسابك."/>}</div></Card>}
      {section === "transactions" && <Card>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 14 }}><div><h3 style={{ margin: 0, fontSize: 16 }}>دفتر الحركات</h3><p style={{ color: MUTED, fontSize: 12, margin: "5px 0 0" }}>المصدر المحاسبي للحسابات والتقارير.</p></div>{canEdit && <Button onClick={() => setShowTx(true)}>＋ إضافة حركة</Button>}</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}><Input placeholder="ابحث بالاسم أو التاجر أو الملاحظات…" value={search} onChange={e => setSearch(e.target.value)} style={{ flex: "1 1 220px" }} /><Select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ width: 150 }}><option value="all">كل الأنواع</option>{TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</Select></div>
        <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 12 }}>
          <Button secondary onClick={exportVisibleTransactionsCsv} disabled={exportingTransactions}>{exportingTransactions ? "جارٍ تجهيز التصدير…" : "⇩ تصدير كل النتائج CSV"}</Button>
          <TransactionImport ws={ws} accounts={accounts} categories={categories} existingTransactions={transactions} canEdit={canEdit} onDone={async (message) => { setNotice(message); await load(); }} />
        </div>
        {!visibleTransactions.length ? <Empty title="لا توجد حركات مطابقة" detail="غيّر البحث أو سجّل حركة جديدة." /> : <div style={tableWrap}><table style={{ borderCollapse: "collapse", width: "100%", minWidth: 820 }}><thead><tr>{["الحركة","النوع","التصنيف","الحساب","التاريخ","الحالة","المبلغ","إجراء"].map(x => <th key={x} style={th}>{x}</th>)}</tr></thead><tbody>{visibleTransactions.map(t => <tr key={t.id}><td style={{ ...td, fontWeight: 750 }}>{t.name}<div style={{ color: MUTED, fontSize: 10, marginTop: 3 }}>{t.merchant || ""}</div></td><td style={td}>{TYPES.find(x => x.value === t.type)?.label || t.type}</td><td style={td}>{categoryById[t.category_id]?.name || "—"}</td><td style={td}>{accountById[t.from_account_id]?.name || accountById[t.to_account_id]?.name || "—"}</td><td style={td}>{fmtDate(t.local_date)}</td><td style={td}><span style={{ borderRadius: 20, padding: "4px 8px", background: t.status === "Posted" ? "#ECFDF3" : "#FFFAEB", color: t.status === "Posted" ? "#067647" : "#92400E" }}>{t.status === "Posted" ? "منشورة" : t.status === "Proposed" ? "مقترحة" : t.status}</span></td><td style={{ ...td, fontWeight: 800, color: t.type === "Income" ? "#047857" : t.type === "Expense" ? "#B42318" : INK }}>{money(t.amount, t.currency)}</td><td style={td}>{canEdit && t.status === "Posted" && !t.reversal_of_id ? <Button secondary onClick={() => { setTxAction({ kind: "reverse", transaction: t }); setTxActionReason(""); setError(""); }}>عكس</Button> : canEdit && t.status === "Proposed" ? <Button secondary onClick={() => { setTxAction({ kind: "void", transaction: t }); setTxActionReason(""); setError(""); }}>إلغاء المقترح</Button> : "—"}</td></tr>)}</tbody></table></div>}
      </Card>}

      {section === "accounts" && <Card><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 14 }}><div><h3 style={{ margin: 0, fontSize: 16 }}>الحسابات المالية</h3><p style={{ color: MUTED, fontSize: 12, margin: "5px 0 0" }}>الأرصدة تُحسب من الرصيد الافتتاحي وقيود الدفتر.</p></div>{canEdit && <Button onClick={startCreateAccount}>＋ حساب جديد</Button>}</div>
        {!accounts.length ? <Empty title="لا توجد حسابات" detail="أنشئ حسابًا قبل تسجيل الحركات." /> : <div style={grid}>{accounts.map(a => { const b = balances.find(x => x.account_id === a.id); return <div key={a.id} style={{ border: "1px solid " + LINE, borderRadius: 13, padding: 16 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><div style={{ fontSize: 15, fontWeight: 800 }}>{a.name}</div><span style={{ color: a.status === "Active" ? "#047857" : MUTED, fontSize: 10 }}>{a.status === "Active" ? "نشط" : a.status}</span></div><div style={{ color: MUTED, fontSize: 11, marginTop: 6 }}>{TYPE_AR[a.account_type] || a.account_type} · {a.currency}</div><div style={{ fontSize: 22, fontWeight: 850, marginTop: 18 }}>{money(b?.balance ?? a.initial_balance, a.currency)}</div><div style={{ color: MUTED, fontSize: 11, marginTop: 6 }}>القيمة بعملة الأساس: {b?.base_value == null ? "غير مُقيّمة" : money(b.base_value, baseCurrency)}</div><div style={{ color: MUTED, fontSize: 10, marginTop: 10 }}> {a.include_in_net_worth ? "✓ داخل صافي الثروة" : "مستبعد من صافي الثروة"}</div>{canEdit && <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 12 }}><Button secondary onClick={() => startEditAccount(a)}>تعديل</Button><Button secondary disabled={saving} onClick={() => archiveAccount(a)}>{a.status === "Archived" ? "إعادة تفعيل" : "أرشفة"}</Button></div>}</div>; })}</div>}
      </Card>}

      {section === "categories" && <Card><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 14 }}><div><h3 style={{ margin: 0, fontSize: 16 }}>التصنيفات</h3><p style={{ color: MUTED, fontSize: 12, margin: "5px 0 0" }}>تصنيفات الدخل والمصروف المستخدمة في دفتر الحركات.</p></div>{canEdit && <Button onClick={startCategoryCreate}>＋ تصنيف جديد</Button>}</div>
        {!allCategories.length ? <Empty title="أضف تصنيفاتك" detail="مثال: الطعام، المواصلات، الراتب، العمل الحر." /> : <div style={tableWrap}><table style={{ borderCollapse: "collapse", width: "100%", minWidth: 620 }}><thead><tr>{["اسم التصنيف","النوع","الاستخدام المحمّل","الحالة","الإجراءات"].map(x => <th key={x} style={th}>{x}</th>)}</tr></thead><tbody>{[...allCategories].sort((a,b) => (a.parent_id ? 1 : 0) - (b.parent_id ? 1 : 0) || a.name.localeCompare(b.name,"ar")).map(c => <tr key={c.id}><td style={{ ...td, fontWeight: 750, paddingRight: c.parent_id ? 28 : 10 }}>{c.parent_id ? "↳ " : "▸ "}{c.parent_id ? (categoryById[c.parent_id]?.name || "") + " / " : ""}{c.name}{c.system_key&&<div style={{fontSize:10,color:MUTED}}>تصنيف نظامي</div>}</td><td style={td}>{c.kind === "Income" ? "دخل" : c.kind === "Expense" ? "مصروف" : "مشترك"}</td><td style={td}>{transactions.filter(t => t.category_id === c.id).length} حركة من آخر 150</td><td style={td}><span style={{color:c.archived?MUTED:GREEN}}>{c.archived?"مؤرشف":"نشط"}</span></td><td style={td}>{canEdit&&<div style={{display:"flex",gap:6}}>{!c.archived&&<Button secondary onClick={()=>startCategoryEdit(c)}>تعديل الاسم</Button>}<Button secondary disabled={saving||!!c.system_key} onClick={()=>toggleCategoryArchive(c)}>{c.archived?"إعادة تفعيل":"أرشفة"}</Button></div>}</td></tr>)}</tbody></table></div>}
      </Card>}

      {section === "budgets" && <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
          <div><h3 style={{ margin: 0, fontSize: 16 }}>الميزانيات الشهرية</h3><p style={{ color: MUTED, fontSize: 12, margin: "5px 0 0" }}>الإنفاق محسوب من الحركات المنشورة بعملة الأساس. القيم غير المقيمة تظهر كتنبيه منفصل.</p></div>
          <Field label="الفترة المالية"><Input type="month" value={budgetPeriod} onChange={e => setBudgetPeriod(e.target.value)} style={{ width: 170 }} /></Field>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(175px,1fr))", gap: 10, marginBottom: 16 }}>
          <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 12, padding: 14 }}><div style={{ color: MUTED, fontSize: 11 }}>المخطط للإنفاق</div><b style={{ display: "block", fontSize: 20, marginTop: 6 }}>{money(plannedBudgetTotal, baseCurrency)}</b><div style={{ color: MUTED, fontSize: 10, marginTop: 5 }}>{overallBudgetInsight ? "الميزانية الإجمالية" : "مجموع حدود التصنيفات"}</div></div>
          <div style={{ border: "1px solid " + LINE, borderRadius: 12, padding: 14 }}><div style={{ color: MUTED, fontSize: 11 }}>المصروف الفعلي</div><b style={{ display: "block", fontSize: 20, marginTop: 6 }}>{money(actualBudgetSpend, baseCurrency)}</b><div style={{ color: MUTED, fontSize: 10, marginTop: 5 }}>{Number(budgetInsights?.summary?.transaction_count || 0)} حركة منشورة</div></div>
          <div style={{ border: "1px solid " + (budgetRemaining < 0 ? "#FDA29B" : LINE), borderRadius: 12, padding: 14, background: budgetRemaining < 0 ? "#FEF3F2" : "#fff" }}><div style={{ color: MUTED, fontSize: 11 }}>المتبقي من الخطة</div><b style={{ display: "block", fontSize: 20, marginTop: 6, color: budgetRemaining < 0 ? "#B42318" : GREEN }}>{money(budgetRemaining, baseCurrency)}</b><div style={{ color: MUTED, fontSize: 10, marginTop: 5 }}>{plannedBudgetTotal > 0 ? Math.round(actualBudgetSpend / plannedBudgetTotal * 100) + "% من الخطة" : "لم تُحدد ميزانية بعد"}</div></div>
          <div style={{ border: "1px solid " + LINE, borderRadius: 12, padding: 14 }}><div style={{ color: MUTED, fontSize: 11 }}>متوسط متاح يوميًا</div><b style={{ display: "block", fontSize: 20, marginTop: 6 }}>{suggestedDailyLimit == null ? "—" : money(suggestedDailyLimit, baseCurrency)}</b><div style={{ color: MUTED, fontSize: 10, marginTop: 5 }}>{budgetDaysLeft > 0 ? "على " + budgetDaysLeft + " يوم متبقٍ" : "الفترة انتهت"}</div></div>
        </div>
        {Number(budgetInsights?.summary?.unvalued_transactions || 0) > 0 && <div style={{ background: "#FFFAEB", border: "1px solid #FEDF89", borderRadius: 10, padding: 11, color: "#92400E", fontSize: 12, marginBottom: 14 }}>توجد {budgetInsights.summary.unvalued_transactions} حركة مصروف غير مقيمة بعملة الأساس؛ إجمالي المصروف الفعلي قد يكون أقل من الحقيقة حتى تضيف سعر الصرف.</div>}
        {canEdit && <form id="budget-editor" onSubmit={saveBudget} style={{ background: BG, border: "1px solid " + LINE, borderRadius: 12, padding: 14, display: "grid", gap: 11, marginBottom: 16 }}>
          <b style={{ fontSize: 13 }}>إضافة ميزانية أو تعديلها</b><div style={formGrid}>
            <Field label="النطاق"><Select value={budgetForm.category_id} onChange={e => setBudgetForm({ ...budgetForm, category_id: e.target.value })}><option value="">ميزانية إجمالية</option>{categories.filter(c => (c.kind === "Expense" || c.kind === "Both") && !categories.some(child => child.parent_id === c.id)).map(c => <option key={c.id} value={c.id}>{c.parent_id ? (categoryById[c.parent_id]?.name || "تصنيف رئيسي") + " ← " + c.name : c.name}</option>)}</Select></Field>
            <Field label={"الحد المالي (" + baseCurrency + ") *"}><Input required type="number" min="0" step="0.01" value={budgetForm.budget_amount} onChange={e => setBudgetForm({ ...budgetForm, budget_amount: e.target.value })} placeholder="مثال: 5000" /></Field>
            <Field label="ملاحظات"><Input value={budgetForm.notes} onChange={e => setBudgetForm({ ...budgetForm, notes: e.target.value })} placeholder="اختياري" /></Field>
          </div><div><Button type="submit" disabled={saving}>{saving ? "جارٍ الحفظ…" : "حفظ الميزانية"}</Button></div>
        </form>}
        {canEdit && <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 12, marginBottom: 16 }}>
          <form onSubmit={saveBudgetTemplate} style={{ border: "1px solid " + LINE, borderRadius: 12, padding: 13, display: "grid", gap: 9 }}>
            <b style={{ fontSize: 13 }}>حفظ الفترة كقالب</b><div style={{ color: MUTED, fontSize: 11 }}>يحفظ حدود الميزانيات وتصنيفاتها وملاحظاتها من الشهر المحدد، دون نسخ الإنفاق الفعلي.</div>
            <Field label="اسم القالب"><Input required maxLength={100} value={templateName} onChange={e => setTemplateName(e.target.value)} placeholder="مثال: ميزانية شهر عادي" /></Field>
            <Button type="submit" disabled={saving || !budgets.length}>{saving ? "جارٍ الحفظ…" : "حفظ كقالب"}</Button>
          </form>
          <form onSubmit={applyBudgetTemplate} style={{ border: "1px solid " + LINE, borderRadius: 12, padding: 13, display: "grid", gap: 9 }}>
            <b style={{ fontSize: 13 }}>تطبيق قالب على الفترة المحددة</b><div style={{ color: MUTED, fontSize: 11 }}>ينشئ البنود الناقصة ويحدّث حدود البنود المطابقة؛ لا يحذف الميزانيات الأخرى.</div>
            <Field label="قالب الميزانية"><Select value={selectedTemplateId} onChange={e => setSelectedTemplateId(e.target.value)}><option value="">اختر قالبًا</option>{budgetTemplates.map(t => <option key={t.id} value={t.id}>{t.name} · {t.line_count} بند</option>)}</Select></Field>
            {selectedTemplateId && <div style={{ background: BG, borderRadius: 8, padding: 9, fontSize: 11, color: MUTED }}>{budgetTemplates.find(t => t.id === selectedTemplateId)?.lines?.map(l => (l.category_name || "الميزانية الإجمالية") + ": " + money(l.budget_amount, baseCurrency)).join(" · ")}</div>}
            <Button type="submit" disabled={saving || !selectedTemplateId}>{saving ? "جارٍ التطبيق…" : "تطبيق القالب"}</Button>
          </form>
        <div style={{ border: "1px solid " + LINE, borderRadius: 12, padding: 13, display: "grid", gap: 9 }}>
            <b style={{ fontSize: 13 }}>ترحيل ميزانيات الشهر التالي</b>
            <div style={{ color: MUTED, fontSize: 11 }}>ينسخ حدود الميزانية إلى {targetBudgetPeriod}، ويرحّل المتبقي الموجب فقط. الميزانيات الموجودة تُحدّث خانة الترحيل ولا تتغير حدودها، ولا يُسمح بتكرار العملية لنفس الشهرين.</div>
            <Button onClick={rolloverBudget} disabled={saving || !budgets.length || !targetBudgetPeriod}>{saving ? "جارٍ الترحيل…" : "ترحيل إلى " + targetBudgetPeriod}</Button>
          </div>
        </div>}
        {!budgets.length ? <Empty title="لا توجد ميزانيات لهذه الفترة" detail="أضف ميزانية إجمالية أو حدًا لكل تصنيف لتتابع الإنفاق." /> : <div style={{ display: "grid", gap: 10 }}>{budgets.map(b => { const cap = Number(b.budget_amount || 0) + Number(b.rollover_in || 0); const spent = Number(b.spent || 0); const pct = b.used_pct == null ? (cap > 0 ? spent / cap * 100 : null) : Number(b.used_pct); const over = pct !== null && pct >= 100; const warn = pct !== null && pct >= 75; return <div key={b.id} style={{ border: "1px solid " + (over ? "#FDA29B" : LINE), borderRadius: 12, padding: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}><div><b style={{ fontSize: 13 }}>{b.category_id ? b.category_name || "تصنيف" : "الميزانية الإجمالية"}</b><div style={{ color: MUTED, fontSize: 11, marginTop: 4 }}>{b.period} · {b.source === "Manual" ? "يدوية" : b.source}</div></div><div style={{ textAlign: "left" }}><div style={{ fontSize: 15, fontWeight: 850, color: over ? "#B42318" : INK }}>{money(spent, b.currency || baseCurrency)}</div><div style={{ fontSize: 11, color: MUTED }}>من {money(cap, b.currency || baseCurrency)}</div></div></div>
          <div style={{ height: 8, background: "#E8EEE9", borderRadius: 99, overflow: "hidden", marginTop: 12 }}><div style={{ height: "100%", width: Math.min(100, Math.max(0, pct || 0)) + "%", background: over ? "#D92D20" : warn ? "#F79009" : GREEN, borderRadius: 99 }} /></div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginTop: 8, fontSize: 11, color: over ? "#B42318" : warn ? "#B54708" : MUTED }}><span>{pct == null ? "لم تُحدد ميزانية موجبة" : pct.toFixed(1) + "% مستخدم"}</span><span>المتبقي: {money(Number(b.remaining || 0), b.currency || baseCurrency)}</span></div>
          {Number(b.unvalued_count || 0) > 0 && <div style={{ color: "#92400E", background: "#FFFAEB", padding: 8, borderRadius: 8, fontSize: 11, marginTop: 8 }}>تنبيه: توجد {b.unvalued_count} حركة مصروف غير مقيمة بعملة الأساس.</div>}
          {b.notes && <div style={{ color: MUTED, fontSize: 11, marginTop: 8 }}>{b.notes}</div>}
          {canEdit && <div style={{ display: "flex", gap: 7, marginTop: 10 }}><Button secondary onClick={() => { setBudgetForm({ category_id: b.category_id || "", budget_amount: String(b.budget_amount || 0), notes: b.notes || "" }); document.getElementById("budget-editor")?.scrollIntoView({ behavior: "smooth", block: "center" }); }}>تعديل الحد</Button></div>}
        </div>; })}</div>}
        {unbudgetedRows.length > 0 && <div style={{ border: "1px solid #FEDF89", borderRadius: 12, padding: 14, marginTop: 14, background: "#FFFCF5" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}><div><b>إنفاق خارج الميزانية</b><div style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>تصنيفات صُرف عليها خلال الشهر ولم تُحدد لها ميزانية بعد.</div></div><b>{money(unbudgetedRows.reduce((sum, row) => sum + Number(row.spent || 0), 0), baseCurrency)}</b></div>
          <div style={{ display: "grid", gap: 8, marginTop: 10 }}>{unbudgetedRows.map(row => <div key={row.category_id || "uncategorized"} style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", borderTop: "1px solid #FDE7B2", paddingTop: 8 }}><div><b style={{ fontSize: 12 }}>{row.category_name}</b><div style={{ color: MUTED, fontSize: 10, marginTop: 3 }}>{row.transaction_count} حركة</div></div><div style={{ display: "flex", alignItems: "center", gap: 8 }}><b style={{ fontSize: 12 }}>{money(row.spent, baseCurrency)}</b>{canEdit && row.category_id && <Button secondary onClick={() => { setBudgetForm({ category_id: row.category_id, budget_amount: String(Math.ceil(Number(row.spent || 0) * 100) / 100), notes: "" }); document.getElementById("budget-editor")?.scrollIntoView({ behavior: "smooth", block: "center" }); }}>تحديد ميزانية</Button>}</div></div>)}</div>
        </div>}
      </Card>}

      {section === "reconciliation" && <Card>
        <div style={{ marginBottom: 16 }}><h3 style={{ margin: 0 }}>التسوية البنكية</h3><p style={{ color: MUTED, fontSize: 12, lineHeight: 1.8 }}>قارن رصيد دفتر الحساب مع كشف البنك عند تاريخ محدد. فرق الرصيد لا يُعدّل تلقائيًا: يجب مراجعته واعتماد السبب، ثم إكمال التسوية لإنشاء حركة تعديل منفصلة عند الحاجة.</p></div>
        {canEdit && <form onSubmit={createReconciliation} style={{ background: BG, border: "1px solid " + LINE, borderRadius: 12, padding: 14, display: "grid", gap: 11, marginBottom: 16 }}>
          <b style={{ fontSize: 13 }}>بدء تسوية جديدة</b><div style={formGrid}>
            <Field label="الحساب *"><Select required value={reconForm.account_id} onChange={e => setReconForm({ ...reconForm, account_id: e.target.value })}><option value="">اختر الحساب</option>{accounts.filter(a => a.status !== "Archived").map(a => <option key={a.id} value={a.id}>{a.name} · {a.currency}</option>)}</Select></Field>
            <Field label="تاريخ الكشف *"><Input required type="date" max={today()} value={reconForm.cutoff_date} onChange={e => setReconForm({ ...reconForm, cutoff_date: e.target.value })} /></Field>
            <Field label={"الرصيد الختامي في الكشف * (" + (accountById[reconForm.account_id]?.currency || baseCurrency) + ")"}><Input required type="number" step="0.01" value={reconForm.statement_balance} onChange={e => setReconForm({ ...reconForm, statement_balance: e.target.value })} placeholder="0.00" /></Field>
          </div><div><Button type="submit" disabled={saving || !accounts.length}>{saving ? "جارٍ الإنشاء…" : "حساب الفرق وإنشاء مسودة"}</Button></div>
        </form>}
        {!reconciliations.length ? <Empty title="لا توجد تسويات بعد" detail="ابدأ بتسوية حساب مقابل كشف البنك أو المحفظة." /> : <div style={{ display: "grid", gap: 10 }}>{reconciliations.map(r => { const curr = accountById[r.account_id]?.currency || baseCurrency; const diff = Number(r.difference || 0); return <div key={r.id} style={{ border: "1px solid " + LINE, borderRadius: 12, padding: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}><div><b>{accountById[r.account_id]?.name || "حساب مالي"}</b><div style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>حتى {fmtDate(r.cutoff_date)} · أنشئت {fmtDate(String(r.created_at || "").slice(0,10))}</div></div><span style={{ background: r.status === "Completed" ? "#ECFDF3" : r.status === "Cancelled" ? "#F2F4F7" : "#FFFAEB", color: r.status === "Completed" ? "#067647" : r.status === "Cancelled" ? MUTED : "#92400E", borderRadius: 999, padding: "5px 9px", fontSize: 11, fontWeight: 800 }}>{({ Draft: "مسودة", Reviewed: "تمت المراجعة", Completed: "مكتملة", Cancelled: "ملغاة" })[r.status] || r.status}</span></div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(125px,1fr))", gap: 9, marginTop: 12 }}><div><div style={labelStyle}>رصيد الدفتر</div><b>{money(r.ledger_balance,curr)}</b></div><div><div style={labelStyle}>رصيد الكشف</div><b>{money(r.statement_balance,curr)}</b></div><div><div style={labelStyle}>الفرق</div><b style={{ color: Math.abs(diff) < 0.0001 ? "#047857" : "#B42318" }}>{money(diff,curr)}</b></div></div>
          {r.reason && <div style={{ color: MUTED, fontSize: 11, marginTop: 8 }}>السبب: {r.reason}</div>}
          {r.status === "Draft" && canEdit && <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>{Math.abs(diff) < 0.0001 ? <Button onClick={() => reviewReconciliation(r,"match")} disabled={saving}>مراجعة: متطابق</Button> : <Button onClick={() => reviewReconciliation(r,"adjust")} disabled={saving}>مراجعة الفرق واعتماد التعديل</Button>}</div>}
          {r.status === "Reviewed" && canEdit && <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}><Button onClick={() => completeReconciliation(r)} disabled={saving}>إكمال التسوية</Button></div>}
          {r.status === "Completed" && (access?.manage || access?.owner) && <div style={{ marginTop: 12 }}><Button secondary onClick={() => cancelReconciliation(r)} disabled={saving}>إلغاء التسوية المكتملة</Button></div>}
        </div>; })}</div>}
      </Card>}

      {section === "settings" && <Card>
        <h3 style={{ marginTop: 0 }}>الإعدادات والأمان</h3>
        <p style={{ color: MUTED, fontSize: 12, lineHeight: 1.8 }}>قفل الفترات يمنع تسجيل أو تعديل الحركات بتاريخ أقدم من حد القفل. فتح فترة سابقة يتطلب صلاحية إدارة وسببًا مسجلًا في سجل التدقيق.</p>
        <div style={{ background: BG, border: "1px solid " + LINE, borderRadius: 12, padding: 14, marginBottom: 14 }}>
          <div style={{ color: MUTED, fontSize: 11 }}>الحد الحالي لقفل الفترات</div><b>{settings.lock_before_date ? fmtDate(settings.lock_before_date) : "لا يوجد قفل نشط"}</b><div style={{ color: MUTED, fontSize: 11, marginTop: 5 }}>عند تحديد تاريخ، تكون التواريخ الأقدم منه مقفلة؛ التاريخ نفسه وما بعده يظل مفتوحًا.</div>
        </div>
        {(access?.manage || access?.owner) ? <form onSubmit={savePeriodLock} style={{ display: "grid", gap: 12 }}>
          <Field label="قفل كل التواريخ قبل"><Input type="date" value={lockDate} onChange={e => setLockDate(e.target.value)} /></Field>
          <Field label="سبب التغيير (مطلوب عند فتح فترة أو تقليل القفل)"><textarea value={lockReason} onChange={e => setLockReason(e.target.value)} rows={2} style={{ ...inputStyle, resize: "vertical" }} placeholder="مثال: تصحيح كشف بنكي معتمد" /></Field>
          <div><Button type="submit" disabled={saving}>{saving ? "جارٍ الحفظ…" : "حفظ إعداد قفل الفترات"}</Button></div>
        </form> : <div style={{ color: MUTED, fontSize: 12 }}>تحتاج صلاحية إدارة لتغيير قفل الفترات.</div>}
      </Card>}

      {section === "networth" && <FinanceNetWorthHistory ws={ws} access={access} isDemo={isDemo} />}

      {section === "debts" && <FinanceDebts ws={ws} access={access} isDemo={isDemo} currencies={currencies} />}
      {section === "family" && <FinanceFamily ws={ws} access={access} isDemo={isDemo} currencies={currencies} />}
      {section === "family-cash" && <FinanceFamilyCash ws={ws} access={access} isDemo={isDemo} />}
      {section === "goals" && <FinanceGoals ws={ws} access={access} isDemo={isDemo} currencies={currencies} />}
      {section === "recurring" && <FinanceRecurring ws={ws} access={access} isDemo={isDemo} currencies={currencies} />}
      {section === "projects" && <FinanceProjects ws={ws} access={access} isDemo={isDemo} currencies={currencies} />}
      {section === "assets" && <FinanceAssets ws={ws} access={access} isDemo={isDemo} currencies={currencies} />}
      {section === "fx" && <FinanceFXRates ws={ws} access={access} isDemo={isDemo} baseCurrency={baseCurrency} />}
      {section === "reports" && <FinanceReports ws={ws} isDemo={isDemo} baseCurrency={baseCurrency} />}

      {!["dashboard", "transactions", "accounts", "categories", "budgets", "reconciliation", "settings", "networth", "debts", "goals", "recurring", "reports", "projects", "assets", "fx", "family", "family-cash"].includes(section) && <Card><div style={{ fontSize: 32, marginBottom: 8 }}>{nav.find(x => x[0] === section)?.[2] || "💰"}</div><h3 style={{ margin: "0 0 8px" }}>{pageTitle}</h3><p style={{ color: MUTED, fontSize: 13, lineHeight: 1.9 }}>هذا القسم موجود ضمن خريطة Finance OS v4.2، وسيُفعّل على مراحل مع الالتزام بنفس دفتر الحركات ومصدر الحقيقة المحاسبي. لم يتم تفعيل عمليات الكتابة لهذا القسم بعد حتى لا تُسجّل بيانات غير مكتملة.</p><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><Button secondary onClick={() => go("dashboard")}>العودة للوحة القيادة</Button>{section === "fx" && <Button onClick={() => go("settings")}>إعدادات العملة</Button>}</div></Card>}
    </>}

    {txAction && <div role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setTxAction(null); }} style={{ position: "fixed", inset: 0, zIndex: 1001, background: "#14251DB8", display: "grid", placeItems: "center", padding: 20, overflowY: "auto" }}><div className="fin-modal" role="dialog" aria-modal="true" aria-label="تصحيح حركة مالية" style={{ background: "#fff", width: "min(520px,100%)", borderRadius: 18, padding: 22, boxSizing: "border-box" }}><h2 style={{ margin: "0 0 8px", fontSize: 19 }}>{txAction.kind === "reverse" ? "عكس حركة مالية" : "إلغاء حركة مقترحة"}</h2><p style={{ color: MUTED, fontSize: 12, lineHeight: 1.8 }}>الحركة: <b>{txAction.transaction.name}</b> · {money(txAction.transaction.amount,txAction.transaction.currency)}. {txAction.kind === "reverse" ? "سيُنشأ قيد عكسي مرتبط بالأصل؛ لن تُحذف الحركة الأصلية." : "سيتم إلغاء المقترح قبل نشره في الدفتر."}</p><form onSubmit={confirmTransactionAction} style={{ display: "grid", gap: 12 }}><Field label="سبب التصحيح (مطلوب)"><textarea required minLength={3} rows={3} style={{ ...inputStyle, resize: "vertical" }} value={txActionReason} onChange={e => setTxActionReason(e.target.value)} placeholder="اشرح سبب العكس أو الإلغاء…" /></Field><div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}><Button secondary onClick={() => setTxAction(null)}>إلغاء</Button><Button type="submit" disabled={saving || txActionReason.trim().length < 3}>{saving ? "جارٍ التنفيذ…" : txAction.kind === "reverse" ? "تأكيد العكس" : "تأكيد الإلغاء"}</Button></div></form></div></div>}

    {showTx && <div role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setShowTx(false); }} style={{ position: "fixed", inset: 0, zIndex: 1000, background: "#14251DB8", display: "grid", placeItems: "center", padding: 20, overflowY: "auto" }}><div className="fin-modal" role="dialog" aria-modal="true" aria-label="حركة مالية جديدة" style={{ background: "#fff", width: "min(680px,100%)", maxHeight: "calc(100vh - 40px)", overflowY: "auto", borderRadius: 18, padding: 22, boxSizing: "border-box" }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}><h2 style={{ margin: 0, fontSize: 19 }}>تسجيل حركة مالية</h2><button onClick={() => setShowTx(false)} aria-label="إغلاق" style={{ border: 0, background: "transparent", fontSize: 22, cursor: "pointer" }}>×</button></div><form onSubmit={saveTransaction} style={{ display: "grid", gap: 13 }}><div style={formGrid}><Field label="نوع الحركة *"><Select disabled={!!tx.goal_id} value={tx.type} onChange={e => setTx({ ...tx, type: e.target.value, category_id: "" })}>{TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</Select></Field><Field label="المبلغ *"><Input required type="number" min="0.01" step="0.01" value={tx.amount} onChange={e => setTx({ ...tx, amount: e.target.value })} placeholder="0.00" /></Field><Field label="عملة الحركة"><Select disabled value={accountById[tx.from_account_id]?.currency || tx.currency}>{!currencies.some(c => c.currency === (accountById[tx.from_account_id]?.currency || tx.currency)) && <option value={accountById[tx.from_account_id]?.currency || tx.currency}>{accountById[tx.from_account_id]?.currency || tx.currency}</option>}{currencies.map(c => <option key={c.currency} value={c.currency}>{c.currency} · {c.display_name}</option>)}</Select></Field><Field label="التاريخ *"><Input required type="date" value={tx.local_date} onChange={e => setTx({ ...tx, local_date: e.target.value })} /></Field><Field label={tx.type === "Transfer" ? "من حساب *" : "الحساب *"}><Select required value={tx.from_account_id} onChange={e => setTx({ ...tx, from_account_id: e.target.value, currency: accountById[e.target.value]?.currency || tx.currency })}><option value="">اختر حسابًا</option>{accounts.filter(a => a.status === "Active" && (!tx.goal_id || a.currency === goals.find(g => g.id === tx.goal_id)?.currency)).map(a => <option key={a.id} value={a.id}>{a.name} · {a.currency}</option>)}</Select></Field>{tx.type === "Transfer" ? <Field label="إلى حساب *"><Select required value={tx.to_account_id} onChange={e => setTx({ ...tx, to_account_id: e.target.value })}><option value="">اختر الحساب المستلم</option>{accounts.filter(a => a.status === "Active" && a.id !== tx.from_account_id && (!tx.goal_id || a.currency === goals.find(g => g.id === tx.goal_id)?.currency)).map(a => <option key={a.id} value={a.id}>{a.name} · {a.currency}</option>)}</Select></Field> : <Field label="التصنيف"><Select value={tx.category_id} onChange={e => setTx({ ...tx, category_id: e.target.value })}><option value="">بدون تصنيف</option>{categories.filter(c => c.kind === "Both" || c.kind === tx.type).map(c => <option key={c.id} value={c.id}>{c.parent_id ? (categoryById[c.parent_id]?.name || "تصنيف رئيسي") + " ← " + c.name : c.name}</option>)}</Select></Field>}<Field label="الهدف المالي (اختياري)"><Select value={tx.goal_id} onChange={e => { const g = goals.find(x => x.id === e.target.value); setTx({ ...tx, goal_id: e.target.value, purpose: e.target.value ? "GoalContribution" : "Regular", type: e.target.value ? "Transfer" : "Expense", category_id: "", currency: g?.currency || tx.currency }); setSplitMode(false); }}><option value="">بدون ربط بهدف</option>{goals.map(g => <option key={g.id} value={g.id}>{g.name} · {g.currency}</option>)}</Select></Field>{tx.goal_id && <Field label="نوع حركة الهدف"><Select value={tx.purpose} onChange={e => setTx({ ...tx, purpose: e.target.value, type: "Transfer" })}><option value="GoalContribution">مساهمة في الهدف</option><option value="GoalWithdrawal">سحب من الهدف</option></Select></Field>}<Field label="التاجر / المستفيد"><Input value={tx.merchant} onChange={e => setTx({ ...tx, merchant: e.target.value })} placeholder="اختياري" /></Field></div>{tx.type !== "Transfer" && <div style={{ border: "1px solid " + LINE, borderRadius: 12, padding: 13, background: BG }}><label style={{ display: "flex", gap: 9, alignItems: "center", fontSize: 13, fontWeight: 750 }}><input type="checkbox" checked={splitMode} onChange={e => setSplitMode(e.target.checked)} /> توزيع الحركة على عدة تصنيفات</label>{splitMode && <div style={{ display: "grid", gap: 9, marginTop: 12 }}>{splitRows.map((row, idx) => <div key={idx} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(110px,.6fr) auto", gap: 8, alignItems: "end" }}><Field label={"التصنيف " + (idx + 1)}><Select value={row.category_id} onChange={e => setSplitRows(rows => rows.map((x,i) => i === idx ? { ...x, category_id: e.target.value } : x))}><option value="">اختر التصنيف</option>{categories.filter(c => c.kind === "Both" || c.kind === tx.type).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field><Field label="المبلغ"><Input type="number" min="0.01" step="0.01" value={row.amount} onChange={e => setSplitRows(rows => rows.map((x,i) => i === idx ? { ...x, amount: e.target.value } : x))} /></Field>{splitRows.length > 2 && <Button secondary onClick={() => setSplitRows(rows => rows.filter((_,i) => i !== idx))}>حذف</Button>}</div>)}<div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, fontSize: 12, color: Math.abs(splitRows.reduce((sum,s) => sum + (Number(s.amount)||0),0) - (Number(tx.amount)||0)) < 0.0001 ? "#047857" : "#B42318" }}><span>مجموع التقسيمات: {money(splitRows.reduce((sum,s) => sum + (Number(s.amount)||0),0), tx.currency)}</span><span>مبلغ الحركة: {money(Number(tx.amount)||0, tx.currency)}</span></div><div><Button secondary onClick={() => setSplitRows(rows => [...rows, { category_id: "", amount: "" }])}>＋ إضافة تصنيف</Button></div></div>}</div>}<Field label="ملاحظات"><textarea value={tx.notes} onChange={e => setTx({ ...tx, notes: e.target.value })} rows={3} style={{ ...inputStyle, resize: "vertical" }} /></Field><div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 5 }}><Button secondary onClick={() => setShowTx(false)}>إلغاء</Button><Button type="submit" disabled={saving || !accounts.length}>{saving ? "جارٍ الحفظ…" : "حفظ الحركة ونشرها"}</Button></div>{!accounts.length && <div style={{ color: "#B42318", fontSize: 12 }}>أنشئ حسابًا أولًا لتسجيل حركة مالية.</div>}</form></div></div>}

    {showAccount && <div onMouseDown={e => { if (e.target === e.currentTarget) setShowAccount(false); }} style={{ position: "fixed", inset: 0, zIndex: 1000, background: "#14251DB8", display: "grid", placeItems: "center", padding: 20 }}><div className="fin-modal" role="dialog" aria-modal="true" style={{ background: "#fff", width: "min(560px,100%)", borderRadius: 18, padding: 22, boxSizing: "border-box" }}><h2 style={{ margin: "0 0 16px", fontSize: 19 }}>{editingAccountId ? "تعديل الحساب المالي" : "إنشاء حساب مالي"}</h2><p style={{ color: MUTED, fontSize: 12, lineHeight: 1.7, marginTop: -8 }}>لا يمكن تغيير العملة أو الرصيد الافتتاحي بعد وجود حركات دفتر مرتبطة بالحساب. أرشف الحساب بدل حذفه للحفاظ على السجل.</p><form onSubmit={saveAccount} style={{ display: "grid", gap: 13 }}><div style={formGrid}><Field label="اسم الحساب *"><Input required value={accountForm.name} onChange={e => setAccountForm({ ...accountForm, name: e.target.value })} placeholder="مثال: حساب البنك" /></Field><Field label="نوع الحساب"><Select value={accountForm.account_type} onChange={e => setAccountForm({ ...accountForm, account_type: e.target.value })}>{ACCOUNT_TYPES.map(t => <option key={t} value={t}>{TYPE_AR[t] || t}</option>)}</Select></Field><Field label="العملة"><Select required value={accountForm.currency} onChange={e => setAccountForm({ ...accountForm, currency: e.target.value })}>{!currencies.some(c => c.currency === accountForm.currency) && accountForm.currency && <option value={accountForm.currency}>{accountForm.currency} · العملة الحالية</option>}{currencies.map(c => <option key={c.currency} value={c.currency}>{c.currency} · {c.display_name}</option>)}</Select></Field><Field label="الرصيد الافتتاحي"><Input type="number" step="0.01" value={accountForm.initial_balance} onChange={e => setAccountForm({ ...accountForm, initial_balance: e.target.value })} /></Field></div><label style={{ display: "flex", gap: 9, alignItems: "center", fontSize: 12 }}><input type="checkbox" checked={accountForm.include_in_net_worth} onChange={e => setAccountForm({ ...accountForm, include_in_net_worth: e.target.checked })} /> تضمين الحساب في صافي الثروة</label><div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}><Button secondary onClick={() => { setShowAccount(false); setEditingAccountId(null); }}>إلغاء</Button><Button type="submit" disabled={saving}>{saving ? "جارٍ الحفظ…" : editingAccountId ? "حفظ التعديلات" : "إنشاء الحساب"}</Button></div></form></div></div>}

    {showCategory && <div onMouseDown={e => { if (e.target === e.currentTarget) setShowCategory(false); }} style={{ position: "fixed", inset: 0, zIndex: 1000, background: "#14251DB8", display: "grid", placeItems: "center", padding: 20 }}><div className="fin-modal" role="dialog" aria-modal="true" style={{ background: "#fff", width: "min(500px,100%)", borderRadius: 18, padding: 22, boxSizing: "border-box" }}><h2 style={{ margin: "0 0 16px", fontSize: 19 }}>{editingCategoryId?"تعديل اسم التصنيف":"تصنيف جديد"}</h2><form onSubmit={saveCategory} style={{ display: "grid", gap: 13 }}><Field label="اسم التصنيف *"><Input required value={categoryForm.name} onChange={e => setCategoryForm({ ...categoryForm, name: e.target.value })} placeholder="مثال: الطعام" /></Field><Field label="نوع التصنيف"><Select disabled={!!editingCategoryId} value={categoryForm.kind} onChange={e => setCategoryForm({ ...categoryForm, kind: e.target.value, parent_id: "" })}><option value="Expense">مصروف</option><option value="Income">دخل</option><option value="Both">مشترك</option></Select></Field><Field label="التصنيف الرئيسي (اختياري)"><Select value={categoryForm.parent_id} onChange={e => setCategoryForm({ ...categoryForm, parent_id: e.target.value })}><option value="">تصنيف رئيسي</option>{allCategories.filter(c => !c.parent_id && !c.archived && c.kind === categoryForm.kind).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field><div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}><Button secondary onClick={() => {setShowCategory(false);setEditingCategoryId(null);}}>إلغاء</Button><Button type="submit" disabled={saving}>{saving ? "جارٍ الحفظ…" : editingCategoryId?"حفظ الاسم":"حفظ التصنيف"}</Button></div></form></div></div>}
  </div>;
}
