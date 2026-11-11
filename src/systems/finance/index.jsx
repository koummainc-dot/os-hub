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
import FinanceFXRates from "./FXRates.jsx";
import TransactionImport from "./TransactionImport.jsx";
import FinanceRedesign from "./FinanceRedesign.jsx";
import { readOSEvents, subscribeOSEvents, subscribeToStoredOSEvents } from "../integrationEvents.js";

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
const initialTx = () => ({ name: "", type: "Expense", purpose: "Regular", amount: "", currency: "EGP", local_date: today(), from_account_id: "", to_account_id: "", category_id: "", goal_id: "", merchant: "", notes: "", context_type: "", context_project_id: "", context_family_member_id: "" });

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
  const [contextFamilyMembers, setContextFamilyMembers] = useState([]);
  const [contextTags, setContextTags] = useState([]);
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
  const [netWorthSnapshots, setNetWorthSnapshots] = useState([]);
  const [recurringItems, setRecurringItems] = useState([]);
  const [settings, setSettings] = useState({ base_currency: "EGP", timezone: "Africa/Cairo" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exportingTransactions, setExportingTransactions] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [learningActivity, setLearningActivity] = useState([]);
  const [shoppingPurchases, setShoppingPurchases] = useState([]);
  const [homeBillPayments, setHomeBillPayments] = useState([]);
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
      const [ar, cr, tr, sr, br, nr, settingsRes, bu, bt, rr, gr, cu, bi, fm, ct, nwh, ri] = await Promise.all([
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
        supabase.rpc("fin_budget_insights_get", { p_ws: ws.id, p_period: budgetPeriod }),
        supabase.from("finance_family_members").select("id,display_name,status").eq("workspace_id",ws.id).eq("status","Active").order("display_name"),
        supabase.rpc("fin_family_list_expenses",{p_workspace_id:ws.id,p_limit:200}),
        supabase.rpc("fin_net_worth_snapshots_get",{p_ws:ws.id}),
        supabase.from("finance_recurring_items").select("id,name,amount,currency,type,frequency,next_payment_date,auto_renew,active").eq("workspace_id",ws.id).order("next_payment_date",{ascending:true})
      ]);
      for (const r of [ar, cr, tr]) if (r.error) throw r.error;
      setAccounts(ar.data || []); setCurrencies(Array.isArray(cu.data) ? cu.data.filter(c => c.is_active) : []); setAllCategories(cr.data || []); setCategories((cr.data || []).filter(c => !c.archived)); setTransactions(tr.data || []);
      setSummary(sr.error ? null : sr.data); setBalances(br.error ? [] : (Array.isArray(br.data) ? br.data : []));
      setNetWorth(nr.error ? null : nr.data); setNetWorthSnapshots(nwh.error ? [] : (Array.isArray(nwh.data) ? nwh.data : [])); setRecurringItems(ri.error ? [] : (Array.isArray(ri.data) ? ri.data : [])); setSettings(settingsRes.data || { base_currency: "EGP", timezone: "Africa/Cairo" });
      setBudgets(bu.error ? [] : (Array.isArray(bu.data) ? bu.data : []));
      setBudgetInsights(bi.error ? null : bi.data || null);
      setBudgetTemplates(bt.error ? [] : (Array.isArray(bt.data) ? bt.data : []));
      setReconciliations(rr.error ? [] : (Array.isArray(rr.data) ? rr.data : []));
      setGoals(gr.error ? [] : (Array.isArray(gr.data) ? gr.data : []));
      setContextFamilyMembers(fm.error ? [] : (fm.data || []));
      const familyExpenseRows=Array.isArray(ct.data)?ct.data:[];
      const mappedFamilyTags=familyExpenseRows.flatMap(row=>{
        const allocations=Array.isArray(row.allocations)?row.allocations:[];
        if(allocations.length)return allocations.map(a=>({transaction_id:row.transaction_id,context_type:"Family",family_member_id:a.family_member_id,family_member_name:a.member_name,transaction_name:row.transaction_name,local_date:row.local_date,amount:a.amount??(Number(row.amount)*Number(a.percentage||0)/100),currency:row.currency,allocation_method:a.allocation_method,percentage:a.percentage}));
        if(row.primary_family_member_id)return [{transaction_id:row.transaction_id,context_type:"Family",family_member_id:row.primary_family_member_id,family_member_name:fm.data?.find(m=>m.id===row.primary_family_member_id)?.display_name,transaction_name:row.transaction_name,local_date:row.local_date,amount:row.amount,currency:row.currency}];
        return [];
      });
      setContextTags(mappedFamilyTags);
      setLockDate(settingsRes.data?.lock_before_date || "");
      const rpcErrors = [sr, br, nr].filter(x => x.error);
      if (rpcErrors.length || bu.error || bt.error || rr.error || cu.error || bi.error || ct.error || nwh.error || ri.error) setNotice("بعض المؤشرات أو بيانات الميزانية أو العملات أو وسوم السياق غير متاحة حاليًا؛ راجع صلاحيات الوصول.");
    } catch (e) { setError(e?.message || "تعذّر تحميل بيانات الماليات"); }
    finally { setLoading(false); }
  }, [ws?.id, isDemo, budgetPeriod]);

  useEffect(() => subscribeOSEvents((event) => setLearningActivity((items) => [event, ...items.filter((x) => x.id !== event.id)].slice(0, 3)), { workspaceId: ws?.id || "default", source: "learning", types: ["learning.study_session.completed", "learning.lesson.completed", "learning.course.completed"] }), [ws?.id]);
  useEffect(() => {
    if (isDemo || !ws?.id) return;
    const type = "shopping.purchase.completed";
    const key = "os-finance-shopping-linked:" + ws.id;
    const handled = () => { try { return new Set(JSON.parse(localStorage.getItem(key) || "[]")); } catch { return new Set(); } };
    const sync = events => { const done = handled(); setShoppingPurchases([...new Map(events.filter(e => e.type === type && e.payload?.sourcePurchaseId && !done.has(e.payload.sourcePurchaseId)).map(e => [e.payload.sourcePurchaseId, e])).values()]); };
    sync(readOSEvents({ workspaceId: ws.id, types: [type], limit: 100 }));
    const offEvent = subscribeOSEvents(event => sync([...readOSEvents({ workspaceId: ws.id, types: [type], limit: 100 }), event]), { workspaceId: ws.id, types: [type] });
    const offStorage = subscribeToStoredOSEvents(sync, { workspaceId: ws.id, types: [type], limit: 100 });
    return () => { offEvent(); offStorage(); };
  }, [ws?.id, isDemo]);
  useEffect(() => {
    if (isDemo || !ws?.id) return;
    const types = ["home.bill.payment.recorded", "home.purchase.receipt.recorded", "home.maintenance.cost.recorded"];
    const key = "os-finance-home-bills-linked:" + ws.id;
    const handled = () => { try { return new Set(JSON.parse(localStorage.getItem(key) || "[]")); } catch { return new Set(); } };
    let serverEvents = [];
    const sync = events => {
      const done = handled();
      // The persisted Finance transaction is the cross-device source for already-recorded proposals.
      for (const transaction of transactions) {
        for (const field of [transaction.idempotency_key, transaction.idempotencyKey, transaction.client_generated_id, transaction.clientGeneratedId]) {
          const prefix = "home-bill-payment-";
          if (typeof field === "string" && field.startsWith(prefix)) done.add(field.slice(prefix.length));
        }
      }
      const merged = [...events, ...serverEvents];
      setHomeBillPayments([...new Map(merged.filter(e => types.includes(e.type) && e.payload?.sourcePaymentId && !done.has(e.payload.sourcePaymentId)).map(e => [e.payload.sourcePaymentId, e])).values()]);
    };
    const localEvents = () => readOSEvents({ workspaceId: ws.id, types, limit: 100 });
    sync(localEvents());
    const loadServerOutbox = async () => {
      try {
        const { data, error } = await supabase.rpc("home_finance_outbox_load", { p_workspace_id: ws.id });
        if (!error && Array.isArray(data)) {
          serverEvents = data;
          sync(localEvents());
        }
      } catch { /* the browser event path remains a best-effort compatibility fallback */ }
    };
    loadServerOutbox();
    const offEvent = subscribeOSEvents(event => sync([...localEvents(), event]), { workspaceId: ws.id, types });
    const offStorage = subscribeToStoredOSEvents(sync, { workspaceId: ws.id, types, limit: 100 });
    return () => { offEvent(); offStorage(); };
  }, [ws?.id, isDemo, transactions]);
  useEffect(() => {
    if (isDemo || !ws?.id || typeof window === "undefined") return;
    const handler = async (event) => {
      const d = event?.detail;
      if (!d || d.systemId !== "finance" || d.workspaceId !== ws.id || d.source !== "ventures") return;
      if (!canEdit || !d.action || !["create", "update"].includes(d.action)) {
        window.dispatchEvent(new CustomEvent("os:source-write-result", { detail: { workspaceId: ws.id, systemId: "finance", action: d.action || "update", recordId: d.recordId || null, ok: false, source: "ventures", error: "صلاحية الكتابة غير متاحة." } }));
        return;
      }
      setSaving(true); setError("");
      try {
        const p = d.payload || {};
        const type = p.type === "Revenue" ? "Income" : p.type === "Expense" ? "Expense" : (p.type || "Expense");
        const amount = Number(p.amount ?? (type === "Income" ? p.revenue : p.expense));
        if (!(amount > 0) || !p.local_date) throw new Error("بيانات الحركة المالية القادمة من Ventures غير مكتملة.");
        if (d.action === "create") {
          const { data: accountsData, error: accountsError } = await supabase.from("finance_accounts").select("id,currency,status").eq("workspace_id", ws.id).eq("status", "Active").limit(50);
          if (accountsError) throw accountsError;
          const account = (accountsData || []).find(a => a.currency === (p.currency || baseCurrency)) || (accountsData || [])[0];
          if (!account) throw new Error("لا يوجد حساب مالي نشط مناسب للعملة لتسجيل حركة Ventures.");
          const stableId = "ventures-finance-" + String(d.recordId || globalThis.crypto?.randomUUID?.() || Date.now());
          const txPayload = {
            name: p.name || (type === "Income" ? "دخل من Ventures" : "مصروف Ventures"),
            type,
            purpose: "Regular",
            pnl_effect: type === "Income" ? "Income" : "Expense",
            flow_class: "Operating",
            status: "Posted",
            amount: String(amount),
            currency: p.currency || account.currency || baseCurrency,
            local_date: p.local_date,
            from_account_id: account.id,
            category_id: p.category_id || null,
            merchant: p.merchant || null,
            notes: [p.note, p.notes].filter(Boolean).join(" · ") || null,
            source_system: "ventures",
            source_type: "email_campaign",
            source_id: String(d.recordId || "")
          };
          const { data: existingTx, error: lookupError } = await supabase.from("finance_transactions").select("id").eq("workspace_id", ws.id).eq("client_generated_id", stableId).maybeSingle();
          if (lookupError) throw lookupError;
          const write = existingTx
            ? await supabase.from("finance_transactions").update(txPayload).eq("workspace_id", ws.id).eq("id", existingTx.id)
            : await supabase.from("finance_transactions").insert({ ...txPayload, workspace_id: ws.id, client_generated_id: stableId });
          if (write.error) throw write.error;
        } else {
          const clientGeneratedId = "ventures-finance-" + String(d.recordId || p.finance_transaction_id || "");
          if (!d.recordId && !p.finance_transaction_id) throw new Error("تحديث حركة Ventures يحتاج معرف السجل.");
          const { error: txError } = await supabase.from("finance_transactions").update({
            name: p.name || undefined,
            type,
            amount: String(amount),
            currency: p.currency || undefined,
            local_date: p.local_date,
            category_id: p.category_id || null,
            merchant: p.merchant || null,
            notes: [p.note, p.notes].filter(Boolean).join(" · ") || null
          }).eq("workspace_id", ws.id).eq("client_generated_id", clientGeneratedId);
          if (txError) throw txError;
        }
        window.dispatchEvent(new CustomEvent("os:source-write-result", { detail: { workspaceId: ws.id, systemId: "finance", action: d.action, recordId: d.recordId || null, ok: true, source: "ventures" } }));
        setNotice(d.action === "create" ? "تم تسجيل حركة Ventures داخل Finance OS." : "تم تحديث حركة Ventures داخل Finance OS.");
        await load();
      } catch (e) {
        window.dispatchEvent(new CustomEvent("os:source-write-result", { detail: { workspaceId: ws.id, systemId: "finance", action: d.action, recordId: d.recordId || null, ok: false, source: "ventures", error: e?.message || String(e) } }));
      } finally { setSaving(false); }
    };
    window.addEventListener("os:source-write", handler);
    return () => window.removeEventListener("os:source-write", handler);
  }, [ws?.id, isDemo, canEdit, baseCurrency, load]);
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

  async function saveTransaction(e, overrideDraft = null, overrideSplitMode = null, overrideSplitRows = null) {
    e?.preventDefault?.(); if (!canEdit || saving) return {ok:false,error:"لا تملك صلاحية تسجيل الحركات الآن."};
    const draft = overrideDraft || tx;
    const currentSplitMode = overrideSplitMode == null ? currentSplitMode : overrideSplitMode;
    const currentSplitRows = overrideSplitRows || currentSplitRows;
    if (!(Number(draft.amount) > 0) || !draft.local_date || !draft.from_account_id) { setError("أكمل المبلغ والتاريخ والحساب."); return; }
    if (draft.type !== "Transfer" && !currentSplitMode && !draft.category_id) { setError("اختَر تصنيفًا للحركة؛ اسم الحركة غير مطلوب."); return; }
    if (draft.type === "Transfer" && (!draft.to_account_id || draft.to_account_id === draft.from_account_id)) { setError("اختر حسابًا مستلمًا مختلفًا عن حساب المصدر."); return; }
    if (draft.context_type === "Project" && !draft.context_project_id) { setError("اختر المشروع المرتبط بالحركة."); return; }
    if (draft.context_type === "Family" && !draft.context_family_member_id) { setError("اختر فرد الأسرة المرتبط بالحركة."); return; }
    if (draft.goal_id && draft.type !== "Transfer") { setError("مساهمة الهدف أو السحب منه يجب أن تكون تحويلًا بين حسابين."); return; }
    const validSplits = currentSplitRows.filter(s => s.category_id && Number(s.amount) > 0);
    if (currentSplitMode && draft.type === "Transfer") { setError("تقسيم التحويلات غير متاح؛ اختر دخلًا أو مصروفًا."); return; }
    if (currentSplitMode && (validSplits.length < 2 || Math.abs(validSplits.reduce((sum, s) => sum + Number(s.amount), 0) - Number(draft.amount)) > 0.0001)) { setError("أضف تصنيفين على الأقل، وتأكد أن مجموع التقسيمات يساوي مبلغ الحركة بالكامل."); return; }
    if (draft.type === "Transfer" && accountById[draft.from_account_id]?.currency !== accountById[draft.to_account_id]?.currency) { setError("التحويل بين عملتين مختلفتين سيُفعّل في مرحلة أسعار الصرف؛ استخدم حسابين بنفس العملة حاليًا."); return; }
    setSaving(true); setError("");
    try {
      const sourceAccount = accountById[draft.from_account_id];
      const payload = {
        workspace_id: ws.id, name: (draft.type === "Transfer" ? "تحويل بين حسابات" : currentSplitMode ? "حركة موزعة على تصنيفات" : (categoryById[draft.category_id]?.name || (draft.type === "Income" ? "دخل" : "مصروف"))), type: draft.type, purpose: draft.purpose || "Regular", status: "Posted",
        amount: String(draft.amount), currency: draft.currency || sourceAccount?.currency || baseCurrency, local_date: draft.local_date,
        from_account_id: draft.from_account_id, to_account_id: draft.type === "Transfer" ? draft.to_account_id : null,
        category_id: draft.type === "Transfer" || currentSplitMode ? null : (draft.category_id || null), goal_id: draft.goal_id || null, merchant: draft.merchant || null, notes: draft.notes || null,
        splits: currentSplitMode ? validSplits.map(s => ({ category_id: s.category_id, amount: String(s.amount) })) : [],
        client_generated_id: draft.shoppingPurchaseId ? "shopping-purchase-" + draft.shoppingPurchaseId : draft.homeBillPaymentId ? "home-bill-payment-" + draft.homeBillPaymentId : "web-" + (globalThis.crypto?.randomUUID?.() || (Date.now() + "-" + Math.random().toString(36).slice(2))),
        idempotency_key: draft.shoppingPurchaseId ? "shopping-purchase-" + draft.shoppingPurchaseId : draft.homeBillPaymentId ? "home-bill-payment-" + draft.homeBillPaymentId : "finance-ui-" + (globalThis.crypto?.randomUUID?.() || Date.now() + "-" + Math.random().toString(36).slice(2))
      };
      const { data, error: rpcError } = await supabase.rpc("fin_post_transaction_with_splits", { p: payload });
      if (rpcError) throw rpcError;
      if (data?.duplicate) setNotice("تم اكتشاف حركة موجودة مسبقًا؛ لم يتم إنشاء نسخة أخرى.");
      else setNotice(data?.warnings?.length ? "تم حفظ الحركة مع تنبيه: " + data.warnings.join(", ") : "تم تسجيل الحركة بنجاح.");
      if (data?.transaction_id && draft.context_type === "Family" && draft.type === "Expense") {
        const { error: contextError } = await supabase.rpc("fin_family_set_transaction_allocation", {
          p_workspace_id:ws.id,p_transaction_id:data.transaction_id,p_responsibility_type:"Personal",
          p_primary_family_member_id:draft.context_family_member_id,
          p_allocations:[{family_member_id:draft.context_family_member_id,allocation_method:"Percentage",percentage:100}],
          p_mark_reviewed:false
        });
        if (contextError) setNotice("تم تسجيل المصروف، لكن تعذّر ربطه بفرد الأسرة: " + contextError.message);
      }
      if (draft.shoppingPurchaseId) {
        const key = "os-finance-shopping-linked:" + ws.id;
        try { const ids = new Set(JSON.parse(localStorage.getItem(key) || "[]")); ids.add(draft.shoppingPurchaseId); localStorage.setItem(key, JSON.stringify([...ids])); } catch {}
        setShoppingPurchases(rows => rows.filter(event => event.payload?.sourcePurchaseId !== draft.shoppingPurchaseId));
      }
      if (draft.homeBillPaymentId) {
        const key = "os-finance-home-bills-linked:" + ws.id;
        try { const ids = new Set(JSON.parse(localStorage.getItem(key) || "[]")); ids.add(draft.homeBillPaymentId); localStorage.setItem(key, JSON.stringify([...ids])); } catch {}
        // The transaction has been posted or deduplicated by Finance; acknowledge
        // the durable Home proposal so it no longer appears in the pending feed.
        try {
          await supabase.rpc("home_finance_outbox_ack", {
            p_workspace_id: ws.id,
            p_source_payment_id: draft.homeBillPaymentId
          });
        } catch { /* Finance transaction idempotency still protects against duplicate posting */ }
        setHomeBillPayments(rows => rows.filter(event => event.payload?.sourcePaymentId !== draft.homeBillPaymentId));
      }
      setShowTx(false); setTx(initialTx()); setSplitMode(false); setSplitRows([{ category_id: "", amount: "" }, { category_id: "", amount: "" }]); await load(); return {ok:true};
    } catch (e) { const message=e?.message || "تعذّر تسجيل الحركة"; setError(message); return {ok:false,error:message}; }
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

  async function saveBudget(e, override = null) {
    e?.preventDefault?.(); if (!canEdit || saving) return {ok:false,error:"لا تملك صلاحية تعديل الميزانيات الآن."};
    const draft = override || budgetForm;
    const period = override?.period || budgetPeriod;
    if (!period || !/^[0-9]{4}-(0[1-9]|1[0-2])$/.test(period) || draft.budget_amount === "" || Number(draft.budget_amount) < 0 || !draft.category_id) { setError("اختر شهرًا وفئة مصروف صحيحة وأدخل ميزانية صفرًا أو أكثر."); return {ok:false,error:"اختر شهرًا وفئة مصروف صحيحة وأدخل ميزانية صفرًا أو أكثر."}; }
    setSaving(true); setError("");
    try {
      const { error: err } = await supabase.rpc("fin_budget_upsert", { p: { workspace_id: ws.id, category_id: draft.category_id, period, budget_amount: String(draft.budget_amount), notes: draft.notes || null, source: "Manual" } });
      if (err) throw err;
      setNotice("تم حفظ الميزانية."); setBudgetForm({ category_id: "", budget_amount: "", notes: "" }); await load(); return {ok:true};
    } catch (e) { const message=e?.message || "تعذّر حفظ الميزانية"; setError(message); return {ok:false,error:message}; }
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

  const pageTitle = ({ "family-cash": "عهد ومصروفات الأفراد", dashboard: "لوحة القيادة", inbox: "الوارد", transactions: "الحركات المالية", accounts: "الحسابات", categories: "التصنيفات", budgets: "الميزانيات", reconciliation: "التسوية البنكية", assets: "الأصول والاستثمارات", debts: "الديون والأقساط", recurring: "المتكرر والاشتراكات", projects: "المشاريع المالية", networth: "صافي الثروة", fx: "أسعار الصرف", reports: "التقارير", planning: "التخطيط والميزانية", settings: "الإعدادات والأمان", "context-tags": "وسوم السياق", family: "مركز مصاريف الأسرة" })[section] || "الماليات";
  return (
    <FinanceRedesign
      page={section}
      setPage={setPage}
      isDemo={isDemo}
      data={{
        accounts,
        transactions,
        categories,
        balances,
        summary,
        netWorth,
        budgets,
        budgetInsights,
        goals,
        baseCurrency,
        currencies,
        contextTags,
        contextFamilyMembers,
        netWorthSnapshots,
        recurringItems,
        error,
      }}
      actions={{
        onAdd: () => { setError(""); setShowTx(true); },
        onSaveTransaction: (draft, split, rows) => saveTransaction(null, draft, split, rows),
        transactionSaving: saving,
        onRefresh: load,
        onAddAccount: startCreateAccount,
        onOpenAccount: startEditAccount,
        onAddCategory: startCategoryCreate,
        onEditCategory: startCategoryEdit,
        onToggleCategory: toggleCategoryArchive,
        onRollover: rolloverBudget,
        onSaveBudget: payload => saveBudget(null, payload),
        onSaveContext: async (transactionId, context) => {
          const transaction=transactions.find(t=>t.id===transactionId);
          if(!transaction||transaction.type!=="Expense"||transaction.status!=="Posted")throw new Error("ربط الأسرة متاح للمصروفات المنشورة فقط.");
          if(!context.family_member_id)throw new Error("اختر فرد الأسرة أولًا.");
          const { error: err } = await supabase.rpc("fin_family_set_transaction_allocation", {
            p_workspace_id:ws.id,p_transaction_id:transactionId,p_responsibility_type:"Personal",
            p_primary_family_member_id:context.family_member_id,
            p_allocations:[{family_member_id:context.family_member_id,allocation_method:"Percentage",percentage:100}],
            p_mark_reviewed:false
          });
          if (err) throw err;
          await load();
        },
        onExport: exportVisibleTransactionsCsv,
      }}
      legacyDebt={<FinanceDebts ws={ws} access={access} isDemo={isDemo} currencies={currencies} />}
      legacyAssets={<FinanceAssets ws={ws} access={access} isDemo={isDemo} currencies={currencies} />}
      legacyGoals={<FinanceGoals ws={ws} access={access} isDemo={isDemo} currencies={currencies} />}
      legacyRecurring={<FinanceRecurring ws={ws} access={access} isDemo={isDemo} currencies={currencies} />}
      legacyProjects={<FinanceProjects ws={ws} access={access} isDemo={isDemo} currencies={currencies} />}
      legacyFamily={<FinanceFamily ws={ws} access={access} isDemo={isDemo} currencies={currencies} />}
      legacyFamilyCash={<FinanceFamilyCash ws={ws} access={access} isDemo={isDemo} />}
      legacyReports={<FinanceReports ws={ws} isDemo={isDemo} baseCurrency={baseCurrency} />}
      legacyCurrencies={<FinanceFXRates ws={ws} access={access} isDemo={isDemo} baseCurrency={baseCurrency} />}
    />
  );
}
