import React, { useCallback, useEffect, useState } from "react";
import { supabase } from "../../core/supabase.js";

const GREEN = "#059669", INK = "#17211D", MUTED = "#718078", LINE = "#E4EBE6", BG = "#F5F8F5";
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Cairo" });
function scheduleDueDate(firstDueDate, frequency, index) {
  const [year, month, day] = String(firstDueDate || "").split("-").map(Number);
  if (!year || !month || !day) return firstDueDate;
  if (frequency === "Weekly") {
    return new Date(Date.UTC(year, month - 1, day + 7 * index)).toISOString().slice(0, 10);
  }
  const monthOffset = frequency === "Quarterly" ? 3 * index : frequency === "Yearly" ? 12 * index : index;
  const targetMonth = new Date(Date.UTC(year, month - 1 + monthOffset, 1));
  const targetYear = targetMonth.getUTCFullYear();
  const targetMonthIndex = targetMonth.getUTCMonth();
  const lastDayOfAnchorMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const lastDayOfTargetMonth = new Date(Date.UTC(targetYear, targetMonthIndex + 1, 0)).getUTCDate();
  const targetDay = day === lastDayOfAnchorMonth ? lastDayOfTargetMonth : Math.min(day, lastDayOfTargetMonth);
  return new Date(Date.UTC(targetYear, targetMonthIndex, targetDay)).toISOString().slice(0, 10);
}
const money = (v, c = "EGP") => { try { return new Intl.NumberFormat("ar-EG", { style: "currency", currency: c, maximumFractionDigits: 2 }).format(Number(v || 0)); } catch { return String(v || 0) + " " + c; } };
const input = { width: "100%", minWidth: 0, boxSizing: "border-box", border: "1px solid #D8E2DB", borderRadius: 9, padding: "10px 11px", background: "#fff", color: INK, font: "inherit", fontSize: 13 };
function Field({ label, children }) { return <label style={{ display: "grid", gap: 6, color: "#46544B", fontSize: 12, fontWeight: 700 }}>{label}{children}</label>; }
function Btn({ children, secondary, ...props }) { return <button {...props} style={{ border: secondary ? "1px solid " + LINE : "1px solid " + GREEN, background: secondary ? "#fff" : GREEN, color: secondary ? INK : "#fff", borderRadius: 9, padding: "10px 13px", fontWeight: 750, cursor: props.disabled ? "not-allowed" : "pointer", opacity: props.disabled ? .6 : 1, fontFamily: "inherit", fontSize: 12 }}>{children}</button>; }
function Card({ children }) { return <div style={{ background: "#fff", border: "1px solid " + LINE, borderRadius: 14, padding: 16 }}>{children}</div>; }

export default function FinanceDebts({ ws, access, isDemo = false }) {
  const [debts, setDebts] = useState([]), [movements, setMovements] = useState([]), [accounts, setAccounts] = useState([]), [installments, setInstallments] = useState([]);
  const [loading, setLoading] = useState(true), [saving, setSaving] = useState(false), [error, setError] = useState(""), [notice, setNotice] = useState("");
  const [showCreate, setShowCreate] = useState(false), [payDebt, setPayDebt] = useState(null);
  const [form, setForm] = useState({ name: "", counterparty: "", direction: "IOwe", principal: "", currency: "EGP", start_date: today(), interest_method: "None", disbursement_account_id: "", schedule_count: "0", schedule_first_due_date: today(), schedule_frequency: "Monthly" });
  const [payment, setPayment] = useState({ account_id: "", principal: "", interest: "0", fees: "0", local_date: today(), reason: "", installment_id: "" });
  const canEdit = !isDemo && (access?.level === "edit" || access?.manage || access?.owner);

  const load = useCallback(async () => {
    if (!ws?.id || isDemo) { setLoading(false); return; }
    setLoading(true); setError("");
    try {
      const [d, m, a, ins] = await Promise.all([
        supabase.from("finance_debts").select("*").eq("workspace_id", ws.id).order("created_at", { ascending: false }),
        supabase.from("finance_debt_movements").select("*").eq("workspace_id", ws.id).is("reversed_at", null).order("local_date", { ascending: false }).limit(300),
        supabase.from("finance_accounts").select("id,name,currency,nature,status").eq("workspace_id", ws.id).order("name"),
        supabase.from("finance_debt_installments").select("*").eq("workspace_id", ws.id).order("due_date")
      ]);
      if (d.error) throw d.error;
      if (m.error) throw m.error;
      if (a.error) throw a.error;
      if (ins.error) throw ins.error;
      setDebts(d.data || []); setMovements(m.data || []); setAccounts(a.data || []); setInstallments(ins.data || []);
    } catch (e) { setError(e?.message || "تعذّر تحميل بيانات الديون"); }
    finally { setLoading(false); }
  }, [ws?.id, isDemo]);
  useEffect(() => { load(); }, [load]);

  const metrics = (d) => {
    const ms = movements.filter(m => m.debt_id === d.id);
    const principalPaid = ms.reduce((s,m) => s + (m.kind === "Payment" ? Number(m.principal || 0) : 0), 0);
    const interestFees = ms.reduce((s,m) => s + (m.kind === "Payment" ? Number(m.interest || 0) + Number(m.fees || 0) : m.kind === "InterestCharge" || m.kind === "LateFee" ? Number(m.interest || 0) + Number(m.fees || 0) : 0), 0);
    return { paid: principalPaid, remaining: Math.max(0, Number(d.principal_amount || 0) - principalPaid), interestFees };
  };
  async function createDebt(e) {
    e.preventDefault(); if (!canEdit || saving) return;
    if (!form.name.trim() || !(Number(form.principal) > 0) || !/^[A-Z]{3}$/.test(form.currency) || !form.start_date) { setError("راجع الاسم والمبلغ والعملة والتاريخ."); return; }
    setSaving(true); setError("");
    try {
      const count = Math.max(0, Math.min(600, Number.parseInt(form.schedule_count || "0", 10) || 0));
      const principalCents = Math.round(Number(form.principal) * 100);
      const installmentsPayload = count > 0 ? Array.from({ length: count }, (_, i) => { const dueDate = scheduleDueDate(form.schedule_first_due_date, form.schedule_frequency, i); const cents = Math.floor(principalCents / count) + (i === count - 1 ? principalCents - Math.floor(principalCents / count) * count : 0); return { due_date: dueDate, principal: (cents / 100).toFixed(2), interest: "0", fees: "0" }; }) : [];
      if (count > 0 && !form.schedule_first_due_date) { setError("حدد تاريخ أول قسط."); return; }
      const p = { workspace_id: ws.id, name: form.name.trim(), counterparty: form.counterparty.trim() || null, direction: form.direction, principal: String(form.principal), currency: form.currency, start_date: form.start_date, interest_method: form.interest_method, disbursement_account_id: form.disbursement_account_id || null, installments: installmentsPayload, idempotency_key: "debt-create-" + crypto.randomUUID() };
      const { error: err } = await supabase.rpc("fin_debt_create", { p });
      if (err) throw err;
      setNotice("تم تسجيل الدين بنجاح."); setShowCreate(false); setForm({ name: "", counterparty: "", direction: "IOwe", principal: "", currency: "EGP", start_date: today(), interest_method: "None", disbursement_account_id: "", schedule_count: "0", schedule_first_due_date: today(), schedule_frequency: "Monthly" }); await load();
    } catch (e) { setError(e?.message || "تعذّر تسجيل الدين"); }
    finally { setSaving(false); }
  }
  async function recordPayment(e) {
    e.preventDefault(); if (!canEdit || saving || !payDebt) return;
    if (!payment.account_id || Number(payment.principal || 0) < 0 || Number(payment.interest || 0) < 0 || Number(payment.fees || 0) < 0 || (Number(payment.principal || 0) + Number(payment.interest || 0) + Number(payment.fees || 0) <= 0)) { setError("اختر الحساب وأدخل مبلغ سداد موجبًا."); return; }
    setSaving(true); setError("");
    try {
      const p = { workspace_id: ws.id, debt_id: payDebt.id, account_id: payment.account_id, principal: String(payment.principal || 0), interest: String(payment.interest || 0), fees: String(payment.fees || 0), installment_id: payment.installment_id || null, local_date: payment.local_date, reason: payment.reason.trim() || null, idempotency_key: "debt-payment-" + crypto.randomUUID() };
      const { error: err } = await supabase.rpc("fin_debt_payment", { p });
      if (err) throw err;
      setNotice("تم تسجيل السداد وربطه بالحركات المالية."); setPayDebt(null); setPayment({ account_id: "", principal: "", interest: "0", fees: "0", local_date: today(), reason: "", installment_id: "" }); await load();
    } catch (e) { setError(e?.message || "تعذّر تسجيل السداد"); }
    finally { setSaving(false); }
  }
  async function closeDebt(d) {
    if (!canEdit || saving) return;
    const remaining = metrics(d).remaining;
    const to = remaining <= 0 ? "Closed" : "Cancelled";
    const reason = globalThis.prompt(to === "Closed" ? "سبب إغلاق الدين (اختياري)" : "لا يمكن إلغاء دين له سداد مسجل. إذا كان الرصيد قائمًا، عالج الرصيد أولًا. اكتب سبب الإلغاء");
    if (reason === null) return;
    if (to === "Cancelled" && movements.some(m => m.debt_id === d.id && m.kind === "Payment")) { setError("لا يمكن إلغاء دين له دفعات مسجلة؛ يلزم عكس الدفعات عبر إجراء معتمد أولًا."); return; }
    if (to === "Closed" && remaining > 0) { setError("لا يمكن إغلاق دين له رصيد متبقٍ. يلزم تسجيل التسوية أو الشطب عبر الإجراء المحاسبي."); return; }
    setSaving(true); setError("");
    try {
      const { error: err } = await supabase.rpc("fin_debt_set_lifecycle", { p: { workspace_id: ws.id, debt_id: d.id, to, reason: reason.trim() || null } });
      if (err) throw err;
      setNotice(to === "Closed" ? "تم إغلاق الدين." : "تم إلغاء الدين."); await load();
    } catch (e) { setError(e?.message || "تعذّر تغيير حالة الدين"); }
    finally { setSaving(false); }
  }

  if (isDemo) return <Card><h3 style={{ marginTop: 0 }}>الديون والأقساط</h3><p style={{ color: "#92400E", fontSize: 13 }}>وضع العرض التجريبي للقراءة فقط؛ لن تُحفظ بيانات حقيقية.</p></Card>;
  return <div style={{ display: "grid", gap: 14 }}>
    {notice && <div role="status" style={{ background: "#ECFDF3", color: "#067647", padding: 11, borderRadius: 10, fontSize: 12 }}>{notice}</div>}
    {error && <div role="alert" style={{ background: "#FEF3F2", color: "#B42318", padding: 11, borderRadius: 10, fontSize: 12 }}>{error}<button onClick={() => setError("")} style={{ float: "left", border: 0, background: "transparent", cursor: "pointer" }}>×</button></div>}
    <Card><div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}><div><h3 style={{ margin: 0 }}>الديون والأقساط</h3><p style={{ margin: "6px 0 0", color: MUTED, fontSize: 12 }}>إدارة ما عليك وما لك، مع تسجيل السداد كحركات دفتر مالية مرتبطة بالدين.</p></div>{canEdit && <Btn onClick={() => setShowCreate(v => !v)}>＋ تسجيل دين</Btn>}</div>
      {loading ? <p style={{ color: MUTED, textAlign: "center", padding: 20 }}>جارٍ تحميل الديون…</p> : !debts.length ? <div style={{ padding: 35, textAlign: "center", color: MUTED }}><div style={{ fontSize: 28 }}>🤝</div><b>لا توجد ديون مسجلة</b><p style={{ fontSize: 12 }}>أضف دينًا عليك أو مبلغًا مستحقًا لك.</p></div> : <div style={{ display: "grid", gap: 10, marginTop: 15 }}>{debts.map(d => { const m = metrics(d); const active = d.lifecycle === "Active"; const pct = Number(d.principal_amount) > 0 ? Math.min(100, m.paid / Number(d.principal_amount) * 100) : 0; return <div key={d.id} style={{ border: "1px solid " + LINE, borderRadius: 12, padding: 14, background: "#fff" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}><div><b style={{ fontSize: 14 }}>{d.name}</b><div style={{ color: MUTED, fontSize: 11, marginTop: 4 }}>{d.counterparty || "بدون طرف مقابل"} · {d.direction === "IOwe" ? "دين عليّ" : "مبلغ مستحق لي"} · بدأ {d.start_date}</div></div><span style={{ background: active ? "#ECFDF3" : "#F2F4F7", color: active ? "#067647" : MUTED, borderRadius: 999, padding: "5px 9px", fontSize: 11, fontWeight: 800 }}>{({ Active: "نشط", Closed: "مغلق", Cancelled: "ملغي" })[d.lifecycle] || d.lifecycle}</span></div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(125px,1fr))", gap: 10, marginTop: 14 }}><div><div style={{ color: MUTED, fontSize: 11 }}>أصل الدين</div><b>{money(d.principal_amount,d.currency)}</b></div><div><div style={{ color: MUTED, fontSize: 11 }}>المسدّد من الأصل</div><b>{money(m.paid,d.currency)}</b></div><div><div style={{ color: MUTED, fontSize: 11 }}>المتبقي من الأصل</div><b style={{ color: m.remaining > 0 ? "#B54708" : "#047857" }}>{money(m.remaining,d.currency)}</b></div></div>
        <div style={{ height: 7, borderRadius: 99, background: "#EEF2EF", overflow: "hidden", marginTop: 12 }}><div style={{ width: pct + "%", height: "100%", background: GREEN, borderRadius: 99 }} /></div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>{canEdit && active && <Btn onClick={() => { setPayDebt(d); setPayment({ account_id: "", principal: String(m.remaining), interest: "0", fees: "0", local_date: today(), reason: "", installment_id: "" }); }}>＋ تسجيل سداد</Btn>}{canEdit && active && m.remaining === 0 && <Btn secondary onClick={() => closeDebt(d)} disabled={saving}>إغلاق الدين</Btn>}{canEdit && active && m.paid === 0 && <Btn secondary onClick={() => closeDebt(d)} disabled={saving}>إلغاء الدين</Btn>}</div>
        {installments.some(i => i.debt_id === d.id) && <div style={{ marginTop: 14, borderTop: "1px solid " + LINE, paddingTop: 12 }}><b style={{ fontSize: 12 }}>جدول الأقساط</b><div style={{ display: "grid", gap: 6, marginTop: 8 }}>{installments.filter(i => i.debt_id === d.id).map(i => { const paid = movements.some(mv => mv.installment_id === i.id && mv.kind === "Payment"); const overdue = !paid && i.due_date < today(); return <div key={i.id} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto auto", gap: 10, alignItems: "center", fontSize: 11, padding: "7px 0", borderBottom: "1px solid #F0F3F1" }}><span>#{i.seq} · {i.due_date}</span><b>{money(i.principal_due, d.currency)}</b><span style={{ color: paid ? "#047857" : overdue ? "#B42318" : MUTED }}>{paid ? "مسدد" : overdue ? "متأخر" : "قادم"}</span></div>; })}</div></div>}
      </div>; })}</div>}
    </Card>
    {showCreate && <Card><h3 style={{ marginTop: 0 }}>تسجيل دين جديد</h3><form onSubmit={createDebt} style={{ display: "grid", gap: 12 }}><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 12 }}>
      <Field label="اسم الدين *"><input required style={input} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="مثال: قرض السيارة" /></Field>
      <Field label="الشخص / الجهة"><input style={input} value={form.counterparty} onChange={e => setForm({ ...form, counterparty: e.target.value })} /></Field>
      <Field label="الاتجاه"><select style={input} value={form.direction} onChange={e => setForm({ ...form, direction: e.target.value, disbursement_account_id: "" })}><option value="IOwe">دين عليّ</option><option value="OwedToMe">مبلغ مستحق لي</option></select></Field>
      <Field label="أصل الدين *"><input required type="number" min="0.01" step="0.01" style={input} value={form.principal} onChange={e => setForm({ ...form, principal: e.target.value })} /></Field>
      <Field label="العملة"><input required maxLength={3} style={input} value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value.toUpperCase() })} /></Field>
      <Field label="تاريخ بدء الدين"><input required type="date" style={input} value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} /></Field>
      <Field label="طريقة الفائدة"><select style={input} value={form.interest_method} onChange={e => setForm({ ...form, interest_method: e.target.value })}><option value="None">بدون فائدة</option></select></Field>
      <Field label="حساب صرف المبلغ (اختياري)"><select style={input} value={form.disbursement_account_id} onChange={e => setForm({ ...form, disbursement_account_id: e.target.value })}><option value="">عدم إنشاء حركة صرف تلقائية</option>{accounts.filter(a => a.status === "Active" && a.currency === form.currency && (form.direction === "IOwe" ? a.nature !== "LIABILITY" : true)).map(a => <option key={a.id} value={a.id}>{a.name} · {a.currency}</option>)}</select></Field>
      <Field label="عدد الأقساط (اختياري)"><input type="number" min="0" max="600" step="1" style={input} value={form.schedule_count} onChange={e => setForm({ ...form, schedule_count: e.target.value })} /><small style={{ color: MUTED, fontWeight: 400 }}>0 = بدون جدول أقساط</small></Field>
      {Number(form.schedule_count) > 0 && <><Field label="تاريخ أول قسط"><input required type="date" style={input} value={form.schedule_first_due_date} onChange={e => setForm({ ...form, schedule_first_due_date: e.target.value })} /></Field><Field label="تكرار الأقساط"><select style={input} value={form.schedule_frequency} onChange={e => setForm({ ...form, schedule_frequency: e.target.value })}><option value="Monthly">شهري</option><option value="Weekly">أسبوعي</option><option value="Quarterly">ربع سنوي</option><option value="Yearly">سنوي</option></select></Field></>}
    </div>{Number(form.schedule_count) > 0 && <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 10, padding: 11, fontSize: 12, color: "#166534" }}>سيتم إنشاء {Math.min(600, Math.max(0, Number.parseInt(form.schedule_count || "0", 10) || 0))} قسطًا متساويًا من أصل الدين، مع ضبط فرق التقريب في القسط الأخير. الفوائد والرسوم تُسجّل عند الدفع.</div>}<div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}><Btn type="button" secondary onClick={() => setShowCreate(false)}>إلغاء</Btn><Btn type="submit" disabled={saving}>{saving ? "جارٍ التسجيل…" : "حفظ الدين"}</Btn></div></form></Card>}
    {payDebt && <Card><h3 style={{ marginTop: 0 }}>تسجيل سداد — {payDebt.name}</h3><p style={{ color: MUTED, fontSize: 12 }}>سيتم إنشاء الحركات المحاسبية اللازمة من خلال خدمة الدين؛ لا تسجّل حركة مكررة يدويًا.</p><form onSubmit={recordPayment} style={{ display: "grid", gap: 12 }}><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 12 }}>
      <Field label="القسط (اختياري)"><select style={input} value={payment.installment_id} onChange={e => { const id = e.target.value; const ins = installments.find(i => i.id === id); setPayment({ ...payment, installment_id: id, principal: ins ? String(ins.principal_due) : String(metrics(payDebt).remaining), interest: ins ? String(ins.interest_due) : "0", fees: ins ? String(ins.fees_due) : "0", local_date: ins?.due_date || payment.local_date }); }}><option value="">سداد يدوي / بدون ربط بقسط</option>{installments.filter(i => i.debt_id === payDebt.id && !movements.some(mv => mv.installment_id === i.id && mv.kind === "Payment")).map(i => <option key={i.id} value={i.id}>#{i.seq} · {i.due_date} · {money(i.principal_due, payDebt.currency)}</option>)}</select></Field>
      <Field label="حساب السداد *"><select required style={input} value={payment.account_id} onChange={e => setPayment({ ...payment, account_id: e.target.value })}><option value="">اختر الحساب</option>{accounts.filter(a => a.status === "Active" && a.currency === payDebt.currency && (payDebt.direction === "IOwe" ? a.nature !== "LIABILITY" : true)).map(a => <option key={a.id} value={a.id}>{a.name} · {a.currency}</option>)}</select></Field>
      <Field label="سداد أصل الدين"><input type="number" min="0" step="0.01" style={input} value={payment.principal} onChange={e => setPayment({ ...payment, principal: e.target.value })} /></Field>
      <Field label="الفائدة"><input type="number" min="0" step="0.01" style={input} value={payment.interest} onChange={e => setPayment({ ...payment, interest: e.target.value })} /></Field>
      <Field label="الرسوم"><input type="number" min="0" step="0.01" style={input} value={payment.fees} onChange={e => setPayment({ ...payment, fees: e.target.value })} /></Field>
      <Field label="تاريخ السداد"><input type="date" required style={input} value={payment.local_date} onChange={e => setPayment({ ...payment, local_date: e.target.value })} /></Field>
      <Field label="ملاحظة / مرجع"><input style={input} value={payment.reason} onChange={e => setPayment({ ...payment, reason: e.target.value })} /></Field>
    </div><div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}><Btn type="button" secondary onClick={() => setPayDebt(null)}>إلغاء</Btn><Btn type="submit" disabled={saving}>{saving ? "جارٍ التسجيل…" : "تأكيد السداد"}</Btn></div></form></Card>}
    <Card><h4 style={{ margin: "0 0 10px" }}>آخر حركات الديون</h4>{movements.length ? <div style={{ display: "grid", gap: 8 }}>{movements.slice(0, 15).map(m => { const d = debts.find(x => x.id === m.debt_id); return <div key={m.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, borderBottom: "1px solid " + LINE, padding: "8px 0", fontSize: 12 }}><span><b>{d?.name || "دين"}</b><span style={{ color: MUTED }}> · {m.local_date} · {m.kind === "Payment" ? "سداد" : m.kind}</span></span><b>{money(Number(m.principal || 0) + Number(m.interest || 0) + Number(m.fees || 0), d?.currency || "EGP")}</b></div>; })}</div> : <p style={{ color: MUTED, fontSize: 12 }}>لا توجد حركات سداد حتى الآن.</p>}</Card>
  </div>;
}
