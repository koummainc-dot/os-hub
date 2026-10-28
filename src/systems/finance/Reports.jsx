import React, { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../core/supabase.js";

const GREEN = "#059669", MUTED = "#718078", LINE = "#E4EBE6", BG = "#F5F8F5";
const money = (v, c = "EGP") => { try { return new Intl.NumberFormat("ar-EG", { style: "currency", currency: c, maximumFractionDigits: 2 }).format(Number(v || 0)); } catch { return String(v || 0) + " " + c; } };
const monthNow = () => new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Cairo" }).slice(0, 7);
const input = { width: "100%", minWidth: 0, boxSizing: "border-box", border: "1px solid #D8E2DB", borderRadius: 9, padding: "10px 11px", background: "#fff", color: "#17211D", font: "inherit", fontSize: 12 };
function Card({ children, style = {} }) { return <div style={{ background: "#fff", border: "1px solid " + LINE, borderRadius: 14, padding: 16, ...style }}>{children}</div>; }
function Metric({ label, value, detail, tone }) { return <div style={{ border: "1px solid " + LINE, borderRadius: 12, padding: 13, minWidth: 0 }}><div style={{ fontSize: 11, color: MUTED }}>{label}</div><b style={{ display: "block", fontSize: 19, marginTop: 6, overflowWrap: "anywhere", color: tone || "#17211D" }}>{value}</b>{detail && <div style={{ fontSize: 10, color: MUTED, marginTop: 5 }}>{detail}</div>}</div>; }
function changePeriod(period, delta) { const [y, m] = period.split("-").map(Number); if (!y || !m) return monthNow(); return new Date(Date.UTC(y, m - 1 + delta, 1)).toISOString().slice(0, 7); }

export default function FinanceReports({ ws, isDemo = false, baseCurrency = "EGP" }) {
 const [report, setReport] = useState(null), [accounts, setAccounts] = useState([]);
 const [period, setPeriod] = useState(monthNow()), [accountId, setAccountId] = useState(""), [type, setType] = useState("All");
 const [searchInput, setSearchInput] = useState(""), [search, setSearch] = useState("");
 const [loading, setLoading] = useState(true), [error, setError] = useState("");
 const load = useCallback(async () => {
  if (!ws?.id || isDemo) { setLoading(false); return; }
  setLoading(true); setError("");
  try {
   const [r, a] = await Promise.all([
    supabase.rpc("fin_reports_analytics_get", { p: { workspace_id: ws.id, period, account_id: accountId || null, transaction_type: type, search: search || null } }),
    supabase.from("finance_accounts").select("id,name,currency,status").eq("workspace_id", ws.id).order("name")
   ]);
   if (r.error) throw r.error;
   if (a.error) throw a.error;
   setReport(r.data || null); setAccounts(a.data || []);
  } catch (e) { setError(e?.message || "تعذّر تحميل التحليلات المالية."); }
  finally { setLoading(false); }
 }, [ws?.id, isDemo, period, accountId, type, search]);
 useEffect(() => { load(); }, [load]);

 const summary = report?.summary || {};
 const previous = report?.previous_summary || {};
 const totals = { income: Number(summary.income || 0), expense: Number(summary.expense || 0), net: Number(summary.net || 0), transfers: Number(summary.transfers || 0), unvalued: Number(summary.unvalued || 0), count: Number(summary.transaction_count || 0) };
 const previousTotals = { income: Number(previous.income || 0), expense: Number(previous.expense || 0), net: Number(previous.net || 0), transfers: Number(previous.transfers || 0), unvalued: Number(previous.unvalued || 0), count: Number(previous.transaction_count || 0) };
 const previousPeriod = useMemo(() => changePeriod(period, -1), [period]);
 const savingsRate = type === "All" && !search && totals.income > 0 ? totals.net / totals.income * 100 : null;
 const percentChange = (current, prev) => prev === 0 ? (current === 0 ? 0 : null) : (current - prev) / Math.abs(prev) * 100;
 const months = report?.months || [];
 const expenseCategories = (report?.expense_categories || []).map(x => ({ ...x, amount: Number(x.amount || 0), count: Number(x.transaction_count || 0), unvalued: Number(x.unvalued_count || 0) }));
 const incomeCategories = (report?.income_categories || []).map(x => ({ ...x, amount: Number(x.amount || 0), count: Number(x.transaction_count || 0), unvalued: Number(x.unvalued_count || 0) }));
 const merchants = (report?.merchants || []).map(x => ({ ...x, amount: Number(x.amount || 0), count: Number(x.transaction_count || 0) }));
 const recent = report?.recent_transactions || [];
 const max = Math.max(1, ...months.flatMap(m => [Number(m.income || 0), Number(m.expense || 0)]));
 const moneyChange = (current, prev) => { const delta = percentChange(current, prev); return { delta, label: delta === null ? "لا توجد قاعدة مقارنة" : (delta > 0 ? "+" : "") + delta.toLocaleString("ar-EG", { maximumFractionDigits: 1 }) + "%", tone: delta === null ? MUTED : delta > 0 ? GREEN : "#B42318" }; };

 if (isDemo) return <Card><h3>التقارير والتحليلات المالية</h3><p>التقارير الفعلية متاحة بعد ربط مساحة مالية حقيقية.</p></Card>;
 return <div style={{ display: "grid", gap: 14, direction: "rtl" }}>
  {error && <Card><div role="alert" style={{ color: "#B42318", fontSize: 12 }}>{error}</div></Card>}
  <Card>
   <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
    <div><h3 style={{ margin: 0 }}>التقارير والتحليلات المالية</h3><p style={{ fontSize: 12, color: MUTED, margin: "6px 0 0", lineHeight: 1.8 }}>تحليل مبني على كامل دفتر الحركات المنشورة، وليس آخر مجموعة حركات محمّلة في الواجهة.</p></div>
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}><button type="button" onClick={() => setPeriod(p => changePeriod(p, -1))} style={{ ...input, width: "auto", cursor: "pointer" }}>‹</button><input aria-label="الفترة" type="month" value={period} onChange={e => setPeriod(e.target.value)} style={{ ...input, width: 160 }} /><button type="button" onClick={() => setPeriod(p => changePeriod(p, 1))} style={{ ...input, width: "auto", cursor: "pointer" }}>›</button><button type="button" onClick={() => setPeriod(monthNow())} style={{ ...input, width: "auto", cursor: "pointer" }}>هذا الشهر</button></div>
   </div>
   <form onSubmit={e => { e.preventDefault(); setSearch(searchInput.trim()); }} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(155px,1fr))", gap: 9, marginTop: 15, padding: 12, background: BG, borderRadius: 12 }}>
    <label style={{ display: "grid", gap: 5, fontSize: 11, color: MUTED }}>الحساب<select style={input} value={accountId} onChange={e => setAccountId(e.target.value)}><option value="">كل الحسابات</option>{accounts.filter(a => a.status !== "Archived").map(a => <option key={a.id} value={a.id}>{a.name} · {a.currency}</option>)}</select></label>
    <label style={{ display: "grid", gap: 5, fontSize: 11, color: MUTED }}>نوع الحركة<select style={input} value={type} onChange={e => setType(e.target.value)}><option value="All">كل الأنواع</option><option value="Income">الدخل فقط</option><option value="Expense">المصروف فقط</option><option value="Transfer">التحويلات فقط</option></select></label>
    <label style={{ display: "grid", gap: 5, fontSize: 11, color: MUTED }}>بحث بالوصف أو التاجر<input style={input} value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder="مثال: إيجار، راتب، متجر…" /></label>
    <div style={{ display: "flex", gap: 7, alignItems: "end" }}><button type="submit" style={{ ...input, background: GREEN, color: "#fff", borderColor: GREEN, cursor: "pointer", fontWeight: 750 }}>تطبيق الفلاتر</button><button type="button" onClick={() => { setAccountId(""); setType("All"); setSearchInput(""); setSearch(""); }} style={{ ...input, width: "auto", cursor: "pointer" }}>مسح</button></div>
   </form>
   {loading ? <p style={{ padding: 24, textAlign: "center", color: MUTED }}>جارٍ تجميع التقرير من دفتر الحركات…</p> : <>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(155px,1fr))", gap: 10, marginTop: 16 }}>
     <Metric label="إجمالي الدخل" value={money(totals.income, baseCurrency)} />
     <Metric label="إجمالي المصروف" value={money(totals.expense, baseCurrency)} />
     <Metric label="صافي التدفق" value={money(totals.net, baseCurrency)} tone={totals.net >= 0 ? GREEN : "#B42318"} />
     <Metric label="معدل الادخار" value={savingsRate === null ? "لا يمكن حسابه" : savingsRate.toLocaleString("ar-EG", { maximumFractionDigits: 1 }) + "%"} tone={savingsRate === null ? undefined : savingsRate >= 0 ? GREEN : "#B42318"} detail="(الدخل − المصروف) ÷ الدخل" />
     <Metric label="التحويلات" value={totals.transfers.toLocaleString("ar-EG")} detail="لا تُحسب كدخل أو مصروف" />
     <Metric label="الحركات المنشورة" value={totals.count.toLocaleString("ar-EG")} />
    </div>
    {totals.unvalued > 0 && <p style={{ background: "#FFFAEB", color: "#92400E", padding: 10, borderRadius: 9, fontSize: 12 }}>تنبيه: {totals.unvalued} حركة دخل/مصروف غير مقيمة أو ناقصة سعر الصرف؛ تم استبعاد قيمتها من الإجماليات.</p>}
    <h4 style={{ margin: "22px 0 8px" }}>مقارنة بالشهر السابق ({previousPeriod})</h4>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 10 }}>
     {[["الدخل", totals.income, previousTotals.income], ["المصروف", totals.expense, previousTotals.expense], ["صافي التدفق", totals.net, previousTotals.net]].map(([label, current, prev]) => { const delta = moneyChange(current, prev); return <div key={label} style={{ border: "1px solid " + LINE, borderRadius: 12, padding: 12 }}><div style={{ fontSize: 11, color: MUTED }}>{label} — الشهر السابق</div><b>{money(prev, baseCurrency)}</b><div style={{ fontSize: 11, marginTop: 5, color: delta.tone }}>{delta.label}</div><div style={{ fontSize: 10, color: MUTED, marginTop: 3 }}>الحالي: {money(current, baseCurrency)}</div></div>; })}
    </div>
    {(totals.unvalued > 0 || previousTotals.unvalued > 0) && <p style={{ fontSize: 11, color: "#92400E" }}>المقارنة تستبعد القيم غير المقيمة: {totals.unvalued} في الفترة الحالية و{previousTotals.unvalued} في الشهر السابق.</p>}
   </>}
  </Card>
  {!loading && <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,350px),1fr))", gap: 14 }}>
   <Card><h4 style={{ margin: "0 0 12px" }}>التدفق النقدي — 12 شهرًا حتى الفترة المحددة</h4>{months.map(m => <div key={m.month} style={{ display: "grid", gridTemplateColumns: "65px minmax(0,1fr) 95px", gap: 9, alignItems: "center", fontSize: 11, marginBottom: 10 }}><b>{m.month}</b><div style={{ display: "grid", gap: 4 }}><div style={{ height: 7, background: "#EEF2EF", borderRadius: 99, overflow: "hidden" }}><div style={{ height: "100%", width: Math.min(100, Number(m.income || 0) / max * 100) + "%", background: GREEN }} /></div><div style={{ height: 7, background: "#FCE7E7", borderRadius: 99, overflow: "hidden" }}><div style={{ height: "100%", width: Math.min(100, Number(m.expense || 0) / max * 100) + "%", background: "#D92D20" }} /></div></div><span style={{ textAlign: "left", color: Number(m.net || 0) >= 0 ? GREEN : "#B42318" }}>{money(m.net, baseCurrency)}</span></div>)}<div style={{ fontSize: 10, color: MUTED }}>الأخضر: الدخل · الأحمر: المصروف. يتغير الرسم مع فلاتر الحساب والنوع والبحث.</div></Card>
   <Card><h4 style={{ margin: "0 0 12px" }}>أعلى 10 تجار حسب المصروف</h4>{merchants.length ? merchants.map(m => <div key={m.merchant} style={{ display: "flex", justifyContent: "space-between", gap: 10, borderBottom: "1px solid " + LINE, padding: "9px 0", fontSize: 12 }}><span>{m.merchant}<div style={{ color: MUTED, fontSize: 10, marginTop: 3 }}>{m.count} حركة</div></span><b>{money(m.amount, baseCurrency)}</b></div>) : <p style={{ color: MUTED, fontSize: 12 }}>لا توجد مصروفات باسم تاجر في هذه الفترة.</p>}</Card>
   <Card><h4 style={{ margin: "0 0 12px" }}>المصروف حسب التصنيف</h4>{expenseCategories.length ? expenseCategories.map(c => <div key={c.category_id || "none"} style={{ marginBottom: 12 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 12 }}><span>{c.category_name} ({c.count})</span><b>{money(c.amount, baseCurrency)}</b></div><div style={{ height: 6, background: "#EEF2EF", borderRadius: 99, overflow: "hidden", marginTop: 5 }}><div style={{ height: "100%", width: (totals.expense > 0 ? Math.min(100, c.amount / totals.expense * 100) : 0) + "%", background: GREEN }} /></div>{c.unvalued > 0 && <div style={{ fontSize: 10, color: "#92400E" }}>{c.unvalued} حركة غير مقيمة</div>}</div>) : <p style={{ fontSize: 12, color: MUTED }}>لا توجد مصروفات في هذه الفترة.</p>}</Card>
   <Card><h4 style={{ margin: "0 0 12px" }}>الدخل حسب التصنيف</h4>{incomeCategories.length ? incomeCategories.map(c => <div key={c.category_id || "none"} style={{ display: "flex", justifyContent: "space-between", gap: 8, borderBottom: "1px solid " + LINE, padding: "9px 0", fontSize: 12 }}><span>{c.category_name} ({c.count})</span><b>{money(c.amount, baseCurrency)}</b></div>) : <p style={{ fontSize: 12, color: MUTED }}>لا يوجد دخل في هذه الفترة.</p>}</Card>
  </div>}
  {!loading && <Card><h4 style={{ margin: "0 0 10px" }}>أحدث الحركات في الفترة — {recent.length} من أحدث 25</h4>{recent.length ? recent.map(t => <div key={t.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, borderBottom: "1px solid " + LINE, padding: "9px 0", fontSize: 12 }}><span><b>{t.name}</b><div style={{ fontSize: 10, color: MUTED, marginTop: 3 }}>{t.local_date} · {t.category_name || "بدون تصنيف"} · {t.account_name || "حساب غير محدد"} · {t.type === "Transfer" ? "تحويل" : t.type === "Income" ? "دخل" : "مصروف"}{t.merchant ? " · " + t.merchant : ""}</div></span><b>{t.base_missing || t.base_amount == null ? "غير مُقيّم" : money(t.base_amount, baseCurrency)}</b></div>) : <p style={{ fontSize: 12, color: MUTED }}>لا توجد حركات منشورة مطابقة للفلاتر في هذه الفترة.</p>}</Card>}
 </div>;
}
