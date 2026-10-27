import React, { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../core/supabase.js";
import FinanceDebts from "./Debts.jsx";
import FinanceGoals from "./Goals.jsx";

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
const nextPeriod = (period) => { if (!/^\\d{4}-(0[1-9]|1[0-2])$/.test(period || "")) return ""; const [y, m] = period.split("-").map(Number); return new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 7); };
const fmtDate = (v) => { try { return new Date(v + "T12:00:00").toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" }); } catch { return v || "—"; } };
const TYPES = [{ value: "Expense", label: "مصروف" }, { value: "Income", label: "دخل" }, { value: "Transfer", label: "تحويل" }];
const ACCOUNT_TYPES = ["Bank", "Cash", "Mobile Wallet", "Credit Card", "E-Wallet", "Payment Platform", "Investment", "Savings", "Other"];
const TYPE_AR = { Bank: "بنك", Cash: "نقدي", "Mobile Wallet": "محفظة موبايل", "Credit Card": "بطاقة ائتمان", "E-Wallet": "محفظة إلكترونية", "Payment Platform": "منصة دفع", Investment: "استثمار", Savings: "ادخار", Other: "أخرى" };
const initialTx = () => ({ name: "", type: "Expense", purpose: "Regular", amount: "", currency: "EGP", local_date: today(), from_account_id: "", to_account_id: "", category_id: "", merchant: "", notes: "" });

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
  const [categories, setCategories] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [reconciliations, setReconciliations] = useState([]);
  const [reconForm, setReconForm] = useState({ account_id: "", cutoff_date: today(), statement_balance: "", reason: "" });
  const [lockDate, setLockDate] = useState("");
  const [lockReason, setLockReason] = useState("");
  const [budgets, setBudgets] = useState([]);
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
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [showTx, setShowTx] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const [showCategory, setShowCategory] = useState(false);
  const [tx, setTx] = useState(initialTx);
  const [splitMode, setSplitMode] = useState(false);
  const [splitRows, setSplitRows] = useState([{ category_id: "", amount: "" }, { category_id: "", amount: "" }]);
  const [accountForm, setAccountForm] = useState({ name: "", account_type: "Bank", currency: "EGP", initial_balance: "0", include_in_net_worth: true, nature: "ASSET" });
  const [categoryForm, setCategoryForm] = useState({ name: "", kind: "Expense" });

  const canEdit = !isDemo && (access?.level === "edit" || access?.manage || access?.owner);
  const baseCurrency = settings.base_currency || "EGP";
  const targetBudgetPeriod = nextPeriod(budgetPeriod);
  const section = page || "dashboard";
  const go = (id) => setPage && setPage(id);

  const load = useCallback(async () => {
    if (!ws?.id || isDemo) { setLoading(false); return; }
    setLoading(true); setError("");
    try {
      const [ar, cr, tr, sr, br, nr, settingsRes, bu, bt, rr] = await Promise.all([
        supabase.from("finance_accounts").select("*").eq("workspace_id", ws.id).order("created_at", { ascending: false }),
        supabase.from("finance_categories").select("*").eq("workspace_id", ws.id).eq("archived", false).order("name"),
        supabase.from("finance_transactions").select("*").eq("workspace_id", ws.id).order("local_date", { ascending: false }).limit(150),
        supabase.rpc("fin_period_summary", { p_ws: ws.id, p_from: monthStart(), p_to: today() }),
        supabase.rpc("fin_balances", { p_ws: ws.id }),
        supabase.rpc("fin_net_worth", { p_ws: ws.id, p_as_of: today() }),
        supabase.from("finance_settings").select("base_currency,timezone,lock_before_date,overdraft_policy").eq("workspace_id", ws.id).maybeSingle(),
        supabase.rpc("fin_budgets_get", { p_ws: ws.id, p_period: budgetPeriod }),
        supabase.rpc("fin_budget_templates_get", { p_ws: ws.id }),
        supabase.from("finance_reconciliations").select("*").eq("workspace_id", ws.id).order("created_at", { ascending: false }).limit(50)
      ]);
      for (const r of [ar, cr, tr]) if (r.error) throw r.error;
      setAccounts(ar.data || []); setCategories(cr.data || []); setTransactions(tr.data || []);
      setSummary(sr.error ? null : sr.data); setBalances(br.error ? [] : (Array.isArray(br.data) ? br.data : []));
      setNetWorth(nr.error ? null : nr.data); setSettings(settingsRes.data || { base_currency: "EGP", timezone: "Africa/Cairo" });
      setBudgets(bu.error ? [] : (Array.isArray(bu.data) ? bu.data : []));
      setBudgetTemplates(bt.error ? [] : (Array.isArray(bt.data) ? bt.data : []));
      setReconciliations(rr.error ? [] : (Array.isArray(rr.data) ? rr.data : []));
      setLockDate(settingsRes.data?.lock_before_date || "");
      const rpcErrors = [sr, br, nr].filter(x => x.error);
      if (rpcErrors.length || bu.error || bt.error || rr.error) setNotice("بعض المؤشرات أو بيانات الميزانية غير متاحة حاليًا؛ راجع صلاحيات الوصول.");
    } catch (e) { setError(e?.message || "تعذّر تحميل بيانات الماليات"); }
    finally { setLoading(false); }
  }, [ws?.id, isDemo, budgetPeriod]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (!notice) return; const t = setTimeout(() => setNotice(""), 5000); return () => clearTimeout(t); }, [notice]);

  const accountById = useMemo(() => Object.fromEntries(accounts.map(a => [a.id, a])), [accounts]);
  const categoryById = useMemo(() => Object.fromEntries(categories.map(c => [c.id, c])), [categories]);
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

  async function saveTransaction(e) {
    e.preventDefault(); if (!canEdit || saving) return;
    if (!tx.name.trim() || !(Number(tx.amount) > 0) || !tx.local_date || !tx.from_account_id) { setError("أكمل اسم الحركة والمبلغ والتاريخ والحساب."); return; }
    if (tx.type === "Transfer" && (!tx.to_account_id || tx.to_account_id === tx.from_account_id)) { setError("اختر حسابًا مستلمًا مختلفًا عن حساب المصدر."); return; }
    const validSplits = splitRows.filter(s => s.category_id && Number(s.amount) > 0);
    if (splitMode && tx.type === "Transfer") { setError("تقسيم التحويلات غير متاح؛ اختر دخلًا أو مصروفًا."); return; }
    if (splitMode && (validSplits.length < 2 || Math.abs(validSplits.reduce((sum, s) => sum + Number(s.amount), 0) - Number(tx.amount)) > 0.0001)) { setError("أضف تصنيفين على الأقل، وتأكد أن مجموع التقسيمات يساوي مبلغ الحركة بالكامل."); return; }
    if (tx.type === "Transfer" && accountById[tx.from_account_id]?.currency !== accountById[tx.to_account_id]?.currency) { setError("التحويل بين عملتين مختلفتين سيُفعّل في مرحلة أسعار الصرف؛ استخدم حسابين بنفس العملة حاليًا."); return; }
    setSaving(true); setError("");
    try {
      const sourceAccount = accountById[tx.from_account_id];
      const payload = {
        workspace_id: ws.id, name: tx.name.trim(), type: tx.type, purpose: tx.purpose || "Regular", status: "Posted",
        amount: String(tx.amount), currency: tx.currency || sourceAccount?.currency || baseCurrency, local_date: tx.local_date,
        from_account_id: tx.from_account_id, to_account_id: tx.type === "Transfer" ? tx.to_account_id : null,
        category_id: tx.type === "Transfer" || splitMode ? null : (tx.category_id || null), merchant: tx.merchant || null, notes: tx.notes || null,
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

  async function saveAccount(e) {
    e.preventDefault(); if (!canEdit || saving) return;
    if (!accountForm.name.trim()) { setError("اكتب اسم الحساب."); return; }
    setSaving(true); setError("");
    try {
      const { error: err } = await supabase.from("finance_accounts").insert({ ...accountForm, workspace_id: ws.id, name: accountForm.name.trim(), currency: accountForm.currency.toUpperCase(), initial_balance: String(accountForm.initial_balance || "0") });
      if (err) throw err;
      setShowAccount(false); setAccountForm({ name: "", account_type: "Bank", currency: baseCurrency, initial_balance: "0", include_in_net_worth: true, nature: "ASSET" }); setNotice("تم إنشاء الحساب."); await load();
    } catch (e) { setError(e?.message || "تعذّر إنشاء الحساب"); }
    finally { setSaving(false); }
  }

  async function saveCategory(e) {
    e.preventDefault(); if (!canEdit || saving) return;
    if (!categoryForm.name.trim()) { setError("اكتب اسم التصنيف."); return; }
    setSaving(true); setError("");
    try {
      const { error: err } = await supabase.from("finance_categories").insert({ ...categoryForm, workspace_id: ws.id, name: categoryForm.name.trim() });
      if (err) throw err;
      setShowCategory(false); setCategoryForm({ name: "", kind: "Expense" }); setNotice("تم إنشاء التصنيف."); await load();
    } catch (e) { setError(e?.message || "تعذّر إنشاء التصنيف"); }
    finally { setSaving(false); }
  }

  async function saveBudget(e) {
    e.preventDefault(); if (!canEdit || saving) return;
    if (!budgetPeriod || !/^\d{4}-(0[1-9]|1[0-2])$/.test(budgetPeriod) || budgetForm.budget_amount === "" || Number(budgetForm.budget_amount) < 0) { setError("اختر شهرًا صحيحًا وأدخل ميزانية صفرًا أو أكثر."); return; }
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

  const pageTitle = ({ dashboard: "لوحة القيادة", inbox: "الوارد", transactions: "الحركات المالية", accounts: "الحسابات", categories: "التصنيفات", budgets: "الميزانيات", reconciliation: "التسوية البنكية", assets: "الأصول والاستثمارات", debts: "الديون والأقساط", recurring: "المتكرر والاشتراكات", projects: "المشاريع المالية", networth: "صافي الثروة", fx: "أسعار الصرف", reports: "التقارير", settings: "الإعدادات والأمان" })[section] || "الماليات";
  const nav = [
    ["dashboard", "لوحة القيادة", "⌂"], ["inbox", "الوارد", "📥"], ["transactions", "الحركات", "🧾"], ["accounts", "الحسابات", "🏦"], ["categories", "التصنيفات", "🗂️"], ["budgets", "الميزانيات", "📊"], ["reconciliation", "التسوية البنكية", "☑️"], ["assets", "الأصول", "📈"], ["debts", "الديون والأقساط", "💳"], ["goals", "الأهداف المالية", "🎯"], ["recurring", "المتكرر والاشتراكات", "🔁"], ["projects", "المشاريع المالية", "📁"], ["networth", "صافي الثروة", "💎"], ["fx", "أسعار الصرف", "💱"], ["reports", "التقارير", "📑"], ["settings", "الإعدادات والأمان", "🔐"]
  ];
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

    <div style={{ display: "flex", gap: 7, overflowX: "auto", paddingBottom: 10, marginBottom: 12 }}>
      {nav.map(([id, label, icon]) => <button key={id} onClick={() => go(id)} style={{ flex: "0 0 auto", border: "1px solid " + (section === id ? "#A7DCC4" : LINE), background: section === id ? "#E8F7EF" : "#fff", color: section === id ? "#047857" : "#66736B", borderRadius: 10, padding: "9px 12px", fontFamily: "inherit", fontWeight: section === id ? 800 : 600, fontSize: 12, cursor: "pointer" }}>{icon} {label}</button>)}
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

      {section === "transactions" && <Card>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 14 }}><div><h3 style={{ margin: 0, fontSize: 16 }}>دفتر الحركات</h3><p style={{ color: MUTED, fontSize: 12, margin: "5px 0 0" }}>المصدر المحاسبي للحسابات والتقارير.</p></div>{canEdit && <Button onClick={() => setShowTx(true)}>＋ إضافة حركة</Button>}</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}><Input placeholder="ابحث بالاسم أو التاجر أو الملاحظات…" value={search} onChange={e => setSearch(e.target.value)} style={{ flex: "1 1 220px" }} /><Select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ width: 150 }}><option value="all">كل الأنواع</option>{TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</Select></div>
        {!visibleTransactions.length ? <Empty title="لا توجد حركات مطابقة" detail="غيّر البحث أو سجّل حركة جديدة." /> : <div style={tableWrap}><table style={{ borderCollapse: "collapse", width: "100%", minWidth: 720 }}><thead><tr>{["الحركة","النوع","التصنيف","الحساب","التاريخ","الحالة","المبلغ"].map(x => <th key={x} style={th}>{x}</th>)}</tr></thead><tbody>{visibleTransactions.map(t => <tr key={t.id}><td style={{ ...td, fontWeight: 750 }}>{t.name}<div style={{ color: MUTED, fontSize: 10, marginTop: 3 }}>{t.merchant || ""}</div></td><td style={td}>{TYPES.find(x => x.value === t.type)?.label || t.type}</td><td style={td}>{categoryById[t.category_id]?.name || "—"}</td><td style={td}>{accountById[t.from_account_id]?.name || accountById[t.to_account_id]?.name || "—"}</td><td style={td}>{fmtDate(t.local_date)}</td><td style={td}><span style={{ borderRadius: 20, padding: "4px 8px", background: t.status === "Posted" ? "#ECFDF3" : "#FFFAEB", color: t.status === "Posted" ? "#067647" : "#92400E" }}>{t.status === "Posted" ? "منشورة" : t.status === "Proposed" ? "مقترحة" : t.status}</span></td><td style={{ ...td, fontWeight: 800, color: t.type === "Income" ? "#047857" : t.type === "Expense" ? "#B42318" : INK }}>{money(t.amount, t.currency)}</td></tr>)}</tbody></table></div>}
      </Card>}

      {section === "accounts" && <Card><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 14 }}><div><h3 style={{ margin: 0, fontSize: 16 }}>الحسابات المالية</h3><p style={{ color: MUTED, fontSize: 12, margin: "5px 0 0" }}>الأرصدة تُحسب من الرصيد الافتتاحي وقيود الدفتر.</p></div>{canEdit && <Button onClick={() => setShowAccount(true)}>＋ حساب جديد</Button>}</div>
        {!accounts.length ? <Empty title="لا توجد حسابات" detail="أنشئ حسابًا قبل تسجيل الحركات." /> : <div style={grid}>{accounts.map(a => { const b = balances.find(x => x.account_id === a.id); return <div key={a.id} style={{ border: "1px solid " + LINE, borderRadius: 13, padding: 16 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><div style={{ fontSize: 15, fontWeight: 800 }}>{a.name}</div><span style={{ color: a.status === "Active" ? "#047857" : MUTED, fontSize: 10 }}>{a.status === "Active" ? "نشط" : a.status}</span></div><div style={{ color: MUTED, fontSize: 11, marginTop: 6 }}>{TYPE_AR[a.account_type] || a.account_type} · {a.currency}</div><div style={{ fontSize: 22, fontWeight: 850, marginTop: 18 }}>{money(b?.balance ?? a.initial_balance, a.currency)}</div><div style={{ color: MUTED, fontSize: 11, marginTop: 6 }}>القيمة بعملة الأساس: {b?.base_value == null ? "غير مُقيّمة" : money(b.base_value, baseCurrency)}</div><div style={{ color: MUTED, fontSize: 10, marginTop: 10 }}> {a.include_in_net_worth ? "✓ داخل صافي الثروة" : "مستبعد من صافي الثروة"}</div></div>; })}</div>}
      </Card>}

      {section === "categories" && <Card><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 14 }}><div><h3 style={{ margin: 0, fontSize: 16 }}>التصنيفات</h3><p style={{ color: MUTED, fontSize: 12, margin: "5px 0 0" }}>تصنيفات الدخل والمصروف المستخدمة في دفتر الحركات.</p></div>{canEdit && <Button onClick={() => setShowCategory(true)}>＋ تصنيف جديد</Button>}</div>
        {!categories.length ? <Empty title="أضف تصنيفاتك" detail="مثال: الطعام، المواصلات، الراتب، العمل الحر." /> : <div style={tableWrap}><table style={{ borderCollapse: "collapse", width: "100%", minWidth: 420 }}><thead><tr>{["اسم التصنيف","النوع","الاستخدام"].map(x => <th key={x} style={th}>{x}</th>)}</tr></thead><tbody>{categories.map(c => <tr key={c.id}><td style={{ ...td, fontWeight: 750 }}>{c.name}</td><td style={td}>{c.kind === "Income" ? "دخل" : c.kind === "Expense" ? "مصروف" : "مشترك"}</td><td style={td}>{transactions.filter(t => t.category_id === c.id).length} حركة</td></tr>)}</tbody></table></div>}
      </Card>}

      {section === "budgets" && <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
          <div><h3 style={{ margin: 0, fontSize: 16 }}>الميزانيات الشهرية</h3><p style={{ color: MUTED, fontSize: 12, margin: "5px 0 0" }}>الإنفاق محسوب من الحركات المنشورة بعملة الأساس. القيم غير المقيمة تظهر كتنبيه منفصل.</p></div>
          <Field label="الفترة المالية"><Input type="month" value={budgetPeriod} onChange={e => setBudgetPeriod(e.target.value)} style={{ width: 170 }} /></Field>
        </div>
        {canEdit && <form onSubmit={saveBudget} style={{ background: BG, border: "1px solid " + LINE, borderRadius: 12, padding: 14, display: "grid", gap: 11, marginBottom: 16 }}>
          <b style={{ fontSize: 13 }}>إضافة ميزانية أو تعديلها</b><div style={formGrid}>
            <Field label="النطاق"><Select value={budgetForm.category_id} onChange={e => setBudgetForm({ ...budgetForm, category_id: e.target.value })}><option value="">ميزانية إجمالية</option>{categories.filter(c => c.kind === "Expense" || c.kind === "Both").map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
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
        </div>; })}</div>}
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

      {section === "networth" && <Card><h3 style={{ marginTop: 0 }}>صافي الثروة</h3>{netWorth ? <><div style={{ fontSize: 30, fontWeight: 850, margin: "18px 0" }}>{netValue == null ? "غير متاح" : money(netValue, baseCurrency)}</div><p style={{ color: MUTED, fontSize: 12 }}>يتم إظهار الأصول والالتزامات غير المقيمة أو المستبعدة بوضوح؛ لا تُعامل القيمة المجهولة كصفر.</p><pre style={{ whiteSpace: "pre-wrap", fontSize: 11, background: BG, padding: 12, borderRadius: 10, overflow: "auto" }}>{JSON.stringify(netWorth, null, 2)}</pre></> : <Empty title="تعذّر حساب صافي الثروة" detail="تأكد من صلاحية الوصول وأسعار الصرف وإعدادات الحسابات." />}</Card>}

      {section === "debts" && <FinanceDebts ws={ws} access={access} isDemo={isDemo} />}
      {section === "goals" && <FinanceGoals ws={ws} access={access} isDemo={isDemo} />}

      {!["dashboard", "transactions", "accounts", "categories", "budgets", "reconciliation", "settings", "networth", "debts", "goals"].includes(section) && <Card><div style={{ fontSize: 32, marginBottom: 8 }}>{nav.find(x => x[0] === section)?.[2] || "💰"}</div><h3 style={{ margin: "0 0 8px" }}>{pageTitle}</h3><p style={{ color: MUTED, fontSize: 13, lineHeight: 1.9 }}>هذا القسم موجود ضمن خريطة Finance OS v4.2، وسيُفعّل على مراحل مع الالتزام بنفس دفتر الحركات ومصدر الحقيقة المحاسبي. لم يتم تفعيل عمليات الكتابة لهذا القسم بعد حتى لا تُسجّل بيانات غير مكتملة.</p><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><Button secondary onClick={() => go("dashboard")}>العودة للوحة القيادة</Button>{section === "fx" && <Button onClick={() => go("settings")}>إعدادات العملة</Button>}</div></Card>}
    </>}

    {showTx && <div role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setShowTx(false); }} style={{ position: "fixed", inset: 0, zIndex: 1000, background: "#14251DB8", display: "grid", placeItems: "center", padding: 20, overflowY: "auto" }}><div className="fin-modal" role="dialog" aria-modal="true" aria-label="حركة مالية جديدة" style={{ background: "#fff", width: "min(680px,100%)", maxHeight: "calc(100vh - 40px)", overflowY: "auto", borderRadius: 18, padding: 22, boxSizing: "border-box" }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}><h2 style={{ margin: 0, fontSize: 19 }}>تسجيل حركة مالية</h2><button onClick={() => setShowTx(false)} aria-label="إغلاق" style={{ border: 0, background: "transparent", fontSize: 22, cursor: "pointer" }}>×</button></div><form onSubmit={saveTransaction} style={{ display: "grid", gap: 13 }}><div style={formGrid}><Field label="اسم الحركة *"><Input required value={tx.name} onChange={e => setTx({ ...tx, name: e.target.value })} placeholder="مثال: مشتريات البقالة" /></Field><Field label="نوع الحركة *"><Select value={tx.type} onChange={e => setTx({ ...tx, type: e.target.value, category_id: "" })}>{TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</Select></Field><Field label="المبلغ *"><Input required type="number" min="0.01" step="0.01" value={tx.amount} onChange={e => setTx({ ...tx, amount: e.target.value })} placeholder="0.00" /></Field><Field label="العملة"><Input maxLength={3} value={tx.currency} onChange={e => setTx({ ...tx, currency: e.target.value.toUpperCase() })} /></Field><Field label="التاريخ *"><Input required type="date" value={tx.local_date} onChange={e => setTx({ ...tx, local_date: e.target.value })} /></Field><Field label={tx.type === "Transfer" ? "من حساب *" : "الحساب *"}><Select required value={tx.from_account_id} onChange={e => setTx({ ...tx, from_account_id: e.target.value, currency: accountById[e.target.value]?.currency || tx.currency })}><option value="">اختر حسابًا</option>{accounts.filter(a => a.status === "Active").map(a => <option key={a.id} value={a.id}>{a.name} · {a.currency}</option>)}</Select></Field>{tx.type === "Transfer" ? <Field label="إلى حساب *"><Select required value={tx.to_account_id} onChange={e => setTx({ ...tx, to_account_id: e.target.value })}><option value="">اختر الحساب المستلم</option>{accounts.filter(a => a.status === "Active" && a.id !== tx.from_account_id).map(a => <option key={a.id} value={a.id}>{a.name} · {a.currency}</option>)}</Select></Field> : <Field label="التصنيف"><Select value={tx.category_id} onChange={e => setTx({ ...tx, category_id: e.target.value })}><option value="">بدون تصنيف</option>{categories.filter(c => c.kind === "Both" || c.kind === tx.type).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>}<Field label="التاجر / المستفيد"><Input value={tx.merchant} onChange={e => setTx({ ...tx, merchant: e.target.value })} placeholder="اختياري" /></Field></div>{tx.type !== "Transfer" && <div style={{ border: "1px solid " + LINE, borderRadius: 12, padding: 13, background: BG }}><label style={{ display: "flex", gap: 9, alignItems: "center", fontSize: 13, fontWeight: 750 }}><input type="checkbox" checked={splitMode} onChange={e => setSplitMode(e.target.checked)} /> توزيع الحركة على عدة تصنيفات</label>{splitMode && <div style={{ display: "grid", gap: 9, marginTop: 12 }}>{splitRows.map((row, idx) => <div key={idx} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(110px,.6fr) auto", gap: 8, alignItems: "end" }}><Field label={"التصنيف " + (idx + 1)}><Select value={row.category_id} onChange={e => setSplitRows(rows => rows.map((x,i) => i === idx ? { ...x, category_id: e.target.value } : x))}><option value="">اختر التصنيف</option>{categories.filter(c => c.kind === "Both" || c.kind === tx.type).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field><Field label="المبلغ"><Input type="number" min="0.01" step="0.01" value={row.amount} onChange={e => setSplitRows(rows => rows.map((x,i) => i === idx ? { ...x, amount: e.target.value } : x))} /></Field>{splitRows.length > 2 && <Button secondary onClick={() => setSplitRows(rows => rows.filter((_,i) => i !== idx))}>حذف</Button>}</div>)}<div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, fontSize: 12, color: Math.abs(splitRows.reduce((sum,s) => sum + (Number(s.amount)||0),0) - (Number(tx.amount)||0)) < 0.0001 ? "#047857" : "#B42318" }}><span>مجموع التقسيمات: {money(splitRows.reduce((sum,s) => sum + (Number(s.amount)||0),0), tx.currency)}</span><span>مبلغ الحركة: {money(Number(tx.amount)||0, tx.currency)}</span></div><div><Button secondary onClick={() => setSplitRows(rows => [...rows, { category_id: "", amount: "" }])}>＋ إضافة تصنيف</Button></div></div>}</div>}<Field label="ملاحظات"><textarea value={tx.notes} onChange={e => setTx({ ...tx, notes: e.target.value })} rows={3} style={{ ...inputStyle, resize: "vertical" }} /></Field><div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 5 }}><Button secondary onClick={() => setShowTx(false)}>إلغاء</Button><Button type="submit" disabled={saving || !accounts.length}>{saving ? "جارٍ الحفظ…" : "حفظ الحركة ونشرها"}</Button></div>{!accounts.length && <div style={{ color: "#B42318", fontSize: 12 }}>أنشئ حسابًا أولًا لتسجيل حركة مالية.</div>}</form></div></div>}

    {showAccount && <div onMouseDown={e => { if (e.target === e.currentTarget) setShowAccount(false); }} style={{ position: "fixed", inset: 0, zIndex: 1000, background: "#14251DB8", display: "grid", placeItems: "center", padding: 20 }}><div className="fin-modal" role="dialog" aria-modal="true" style={{ background: "#fff", width: "min(560px,100%)", borderRadius: 18, padding: 22, boxSizing: "border-box" }}><h2 style={{ margin: "0 0 16px", fontSize: 19 }}>إنشاء حساب مالي</h2><form onSubmit={saveAccount} style={{ display: "grid", gap: 13 }}><div style={formGrid}><Field label="اسم الحساب *"><Input required value={accountForm.name} onChange={e => setAccountForm({ ...accountForm, name: e.target.value })} placeholder="مثال: حساب البنك" /></Field><Field label="نوع الحساب"><Select value={accountForm.account_type} onChange={e => setAccountForm({ ...accountForm, account_type: e.target.value })}>{ACCOUNT_TYPES.map(t => <option key={t} value={t}>{TYPE_AR[t] || t}</option>)}</Select></Field><Field label="العملة"><Input maxLength={3} required value={accountForm.currency} onChange={e => setAccountForm({ ...accountForm, currency: e.target.value.toUpperCase() })} /></Field><Field label="الرصيد الافتتاحي"><Input type="number" step="0.01" value={accountForm.initial_balance} onChange={e => setAccountForm({ ...accountForm, initial_balance: e.target.value })} /></Field></div><label style={{ display: "flex", gap: 9, alignItems: "center", fontSize: 12 }}><input type="checkbox" checked={accountForm.include_in_net_worth} onChange={e => setAccountForm({ ...accountForm, include_in_net_worth: e.target.checked })} /> تضمين الحساب في صافي الثروة</label><div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}><Button secondary onClick={() => setShowAccount(false)}>إلغاء</Button><Button type="submit" disabled={saving}>{saving ? "جارٍ الحفظ…" : "إنشاء الحساب"}</Button></div></form></div></div>}

    {showCategory && <div onMouseDown={e => { if (e.target === e.currentTarget) setShowCategory(false); }} style={{ position: "fixed", inset: 0, zIndex: 1000, background: "#14251DB8", display: "grid", placeItems: "center", padding: 20 }}><div className="fin-modal" role="dialog" aria-modal="true" style={{ background: "#fff", width: "min(500px,100%)", borderRadius: 18, padding: 22, boxSizing: "border-box" }}><h2 style={{ margin: "0 0 16px", fontSize: 19 }}>تصنيف جديد</h2><form onSubmit={saveCategory} style={{ display: "grid", gap: 13 }}><Field label="اسم التصنيف *"><Input required value={categoryForm.name} onChange={e => setCategoryForm({ ...categoryForm, name: e.target.value })} placeholder="مثال: الطعام" /></Field><Field label="نوع التصنيف"><Select value={categoryForm.kind} onChange={e => setCategoryForm({ ...categoryForm, kind: e.target.value })}><option value="Expense">مصروف</option><option value="Income">دخل</option><option value="Both">مشترك</option></Select></Field><div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}><Button secondary onClick={() => setShowCategory(false)}>إلغاء</Button><Button type="submit" disabled={saving}>{saving ? "جارٍ الحفظ…" : "حفظ التصنيف"}</Button></div></form></div></div>}
  </div>;
}
