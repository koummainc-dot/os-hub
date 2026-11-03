import React, { useState } from "react";

const C = { ink: "#182230", muted: "#64748B", line: "#E2E8F0", white: "#FFFFFF", accent: "#A855F7", soft: "#FAF5FF", danger: "#B91C1C", warn: "#B45309" };
const panel = { background: C.white, border: "1px solid " + C.line, borderRadius: 14, padding: 15, marginBottom: 12 };
const field = { width: "100%", boxSizing: "border-box", padding: "9px 10px", border: "1px solid " + C.line, borderRadius: 9, font: "inherit", color: C.ink, background: C.white };
const label = { display: "grid", gap: 5, color: C.muted, fontSize: 12, fontWeight: 650 };
const btn = (primary = false) => ({ border: "1px solid " + (primary ? C.accent : C.line), background: primary ? C.accent : C.white, color: primary ? C.white : C.ink, borderRadius: 9, padding: "8px 11px", font: "inherit", fontSize: 12, fontWeight: 700, cursor: "pointer" });
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const EMPTY = { productId: "", unitId: "", dateStarted: today(), severity: "mild", symptomsText: "", area: "", actionTaken: "", suspectedIngredientIds: [], note: "" };
const SEVERITY = { mild: "خفيف", moderate: "متوسط", severe: "شديد" };
const STATUS = { open: "مفتوح", resolved: "تم الحل", archived: "مؤرشف" };

export default function ReactionsView({ reactions, products, units, ingredients, canEdit, busy, onCreate, onResolve, onArchive, setPage }) {
  const [draft, setDraft] = useState(EMPTY);
  const submit = async event => {
    event.preventDefault();
    const ok = await onCreate({
      ...draft,
      symptoms: draft.symptomsText.split(/[,،;\n]/).map(value => value.trim()).filter(Boolean),
    });
    if (ok) setDraft(EMPTY);
  };
  const selectedProductUnits = units.filter(unit => unit.productId === draft.productId);
  return <>
    <section style={panel}>
      <b>تسجيل تفاعل جلدي</b>
      <p style={{ color: C.muted, fontSize: 11, lineHeight: 1.7 }}>سجّل ما لاحظته وتوقيت حدوثه. لا يعني الارتباط الزمني أن المنتج أو مكوّنًا بعينه هو السبب. عند وجود أعراض شديدة أو مقلقة، اطلب تقييمًا طبيًا مناسبًا ولا تعتمد على التطبيق.</p>
      {canEdit ? <form onSubmit={submit} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10 }}>
        <label style={label}>المنتج المرتبط
          <select required style={field} value={draft.productId} onChange={event => setDraft(d => ({ ...d, productId: event.target.value, unitId: "" }))}>
            <option value="">اختر منتجًا</option>
            {products.map(product => <option key={product.id} value={product.id}>{product.name}</option>)}
          </select>
        </label>
        <label style={label}>العبوة (اختياري)
          <select style={field} value={draft.unitId} onChange={event => setDraft(d => ({ ...d, unitId: event.target.value }))}>
            <option value="">غير محددة</option>
            {selectedProductUnits.map(unit => <option key={unit.id} value={unit.id}>{unit.name}</option>)}
          </select>
        </label>
        <label style={label}>تاريخ بداية التفاعل<input required type="date" style={field} value={draft.dateStarted} max={today()} onChange={event => setDraft(d => ({ ...d, dateStarted: event.target.value }))} /></label>
        <label style={label}>درجة الشدة
          <select style={field} value={draft.severity} onChange={event => setDraft(d => ({ ...d, severity: event.target.value }))}>
            <option value="mild">خفيف</option><option value="moderate">متوسط</option><option value="severe">شديد</option>
          </select>
        </label>
        <label style={{ ...label, gridColumn: "1 / -1" }}>الأعراض أو العلامات (افصل بينها بفواصل)
          <input style={field} maxLength={1000} value={draft.symptomsText} onChange={event => setDraft(d => ({ ...d, symptomsText: event.target.value }))} placeholder="احمرار، حكة، جفاف..." />
        </label>
        <label style={label}>المنطقة المتأثرة<input style={field} maxLength={200} value={draft.area} onChange={event => setDraft(d => ({ ...d, area: event.target.value }))} /></label>
        <label style={label}>الإجراء الذي اتخذته<input style={field} maxLength={1000} value={draft.actionTaken} onChange={event => setDraft(d => ({ ...d, actionTaken: event.target.value }))} placeholder="إيقاف المنتج مؤقتًا..." /></label>
        <label style={{ ...label, gridColumn: "1 / -1" }}>مكونات تشتبه بارتباطها (اختياري)
          <select multiple style={{ ...field, minHeight: 100 }} value={draft.suspectedIngredientIds} onChange={event => setDraft(d => ({ ...d, suspectedIngredientIds: [...event.target.selectedOptions].map(option => option.value) }))}>
            {ingredients.map(item => <option key={item.id} value={item.id}>{item.inciName}</option>)}
          </select>
          <span style={{ fontSize: 10, fontWeight: 400 }}>تحديد المكوّن هنا يسجل اشتباهك الشخصي فقط، ولا يثبت أنه سبب التفاعل.</span>
        </label>
        <label style={{ ...label, gridColumn: "1 / -1" }}>ملاحظات<textarea style={{ ...field, minHeight: 65 }} maxLength={2000} value={draft.note} onChange={event => setDraft(d => ({ ...d, note: event.target.value }))} /></label>
        <div style={{ gridColumn: "1 / -1" }}><button type="submit" style={btn(true)} disabled={busy || !draft.productId}>حفظ التفاعل</button></div>
      </form> : <p style={{ color: C.muted, fontSize: 12 }}>صلاحية العرض فقط.</p>}
    </section>

    <section style={panel}>
      <b>سجل التفاعلات ({reactions.length})</b>
      {!reactions.length && <p style={{ color: C.muted, fontSize: 12 }}>لا توجد تفاعلات مسجلة.</p>}
      {reactions.slice().sort((a, b) => String(b.dateStarted).localeCompare(String(a.dateStarted))).map(reaction => {
        const product = products.find(item => item.id === reaction.productId);
        const suspected = ingredients.filter(item => (reaction.suspectedIngredientIds || []).includes(item.id));
        return <article key={reaction.id} style={{ borderTop: "1px solid " + C.line, padding: "12px 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
            <div><b style={{ fontSize: 13 }}>{product?.name || "منتج غير موجود"}</b><div style={{ color: C.muted, fontSize: 10, marginTop: 3 }}>{reaction.dateStarted} · {SEVERITY[reaction.severity] || reaction.severity} · {STATUS[reaction.status] || reaction.status}</div></div>
            {reaction.severity === "severe" && <span style={{ color: C.danger, fontSize: 10, fontWeight: 800 }}>تفاعل شديد — لا يُحذف</span>}
          </div>
          {(reaction.symptoms || []).length > 0 && <div style={{ fontSize: 12, marginTop: 7 }}>الأعراض: {reaction.symptoms.join("، ")}</div>}
          {reaction.area && <div style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>المنطقة: {reaction.area}</div>}
          {reaction.actionTaken && <div style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>الإجراء: {reaction.actionTaken}</div>}
          {suspected.length > 0 && <div style={{ color: C.warn, fontSize: 11, marginTop: 5 }}>مكونات مشتبه بها حسب تسجيلك: {suspected.map(item => item.inciName).join("، ")}</div>}
          {reaction.note && <div style={{ color: C.muted, fontSize: 11, marginTop: 5 }}>{reaction.note}</div>}
          {reaction.resolvedDate && <div style={{ color: C.muted, fontSize: 10, marginTop: 5 }}>تاريخ الحل: {reaction.resolvedDate}</div>}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 9 }}>
            <button type="button" style={btn()} onClick={() => setPage("products")}>مراجعة المنتجات</button>
            <button type="button" style={btn()} onClick={() => setPage("routines")}>مراجعة الروتين يدويًا</button>
            {!!suspected.length && <button type="button" style={btn()} onClick={() => setPage("ingredients")}>مراجعة المكونات المشتبه بها</button>}
          </div>
          {canEdit && reaction.status === "open" && <div style={{ display: "flex", gap: 6, marginTop: 9 }}>
            <button type="button" style={btn()} disabled={busy} onClick={() => onResolve(reaction)}>تسجيل الحل اليوم</button>
            <button type="button" style={btn()} disabled={busy} onClick={() => onArchive(reaction)}>أرشفة</button>
          </div>}
        </article>;
      })}
    </section>
  </>;
}
