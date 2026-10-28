import React, { useState } from "react";
import { supabase } from "../../core/supabase.js";

const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Cairo" });
const tomorrow = () => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toLocaleDateString("en-CA", { timeZone: "Africa/Cairo" }); };
const input = { width: "100%", boxSizing: "border-box", border: "1px solid #E4EBE6", borderRadius: 8, padding: "8px 9px", font: "inherit", fontSize: 12, background: "#fff" };

export default function RecurringDueAction({ ws, item, onDone, disabled = false }) {
 const [busy, setBusy] = useState(false), [open, setOpen] = useState(false);
 const [newDate, setNewDate] = useState(tomorrow()), [reason, setReason] = useState("تأجيل الاستحقاق");
 async function defer(e) {
  e.preventDefault();
  if (busy || disabled) return;
  if (!newDate || newDate <= today() || newDate <= item.next_payment_date) { onDone?.("اختر تاريخًا مستقبليًا بعد تاريخ الاستحقاق الأصلي.", true); return; }
  if (reason.trim().length < 3) { onDone?.("اكتب سببًا مختصرًا للتأجيل.", true); return; }
  setBusy(true);
  try {
   const key = globalThis.crypto?.randomUUID?.() || (Date.now() + "-" + Math.random().toString(36).slice(2));
   const p = { workspace_id: ws.id, recurring_id: item.id, defer_to_date: newDate, reason: reason.trim(), idempotency_key: "recurring-defer-" + key };
   const { data, error } = await supabase.rpc("fin_recurring_defer", { p });
   if (error) throw error;
   setOpen(false);
   onDone?.("تم نقل الاستحقاق من " + (data?.old_due_date || item.next_payment_date) + " إلى " + (data?.next_payment_date || newDate) + " دون إنشاء حركة مالية.");
  } catch (e) { onDone?.(e?.message || "تعذّر تأجيل الاستحقاق.", true); }
  finally { setBusy(false); }
 }
 return <div style={{ display: "grid", gap: 7, minWidth: open ? 230 : "auto" }}>
  <button type="button" disabled={busy || disabled} onClick={() => { setOpen(v => !v); setNewDate(tomorrow()); }} style={{ border: "1px solid #E4EBE6", background: "#fff", color: "#17211D", borderRadius: 9, padding: "10px 13px", fontWeight: 750, cursor: busy || disabled ? "not-allowed" : "pointer", opacity: busy || disabled ? 0.6 : 1, fontFamily: "inherit", fontSize: 12 }}>{open ? "إلغاء التأجيل" : "تأجيل إلى تاريخ…"}</button>
  {open && <form onSubmit={defer} style={{ display: "grid", gap: 7, padding: 10, border: "1px solid #E4EBE6", borderRadius: 10, background: "#F8FAF8" }}>
   <label style={{ display: "grid", gap: 4, fontSize: 11, color: "#46544B", fontWeight: 700 }}>الموعد الجديد<input required type="date" min={tomorrow()} style={input} value={newDate} onChange={e => setNewDate(e.target.value)} /></label>
   <label style={{ display: "grid", gap: 4, fontSize: 11, color: "#46544B", fontWeight: 700 }}>سبب التأجيل<input required minLength={3} maxLength={300} style={input} value={reason} onChange={e => setReason(e.target.value)} /></label>
   <button type="submit" disabled={busy || disabled} style={{ border: 0, background: "#059669", color: "#fff", borderRadius: 8, padding: "9px 10px", fontWeight: 750, cursor: busy || disabled ? "not-allowed" : "pointer", fontFamily: "inherit", fontSize: 12 }}>{busy ? "جارٍ إعادة الجدولة…" : "تأكيد الموعد الجديد"}</button>
  </form>}
 </div>;
}
