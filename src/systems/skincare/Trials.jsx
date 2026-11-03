import React, { useMemo, useState } from "react";
import { summarizeSkinTrial } from "./domain.js";

const C = { ink: "#182230", muted: "#64748B", line: "#E2E8F0", white: "#FFFFFF", accent: "#A855F7", soft: "#FAF5FF", warn: "#B45309" };
const panel = { background: C.white, border: "1px solid " + C.line, borderRadius: 14, padding: 15, marginBottom: 12 };
const field = { width: "100%", boxSizing: "border-box", padding: "9px 10px", border: "1px solid " + C.line, borderRadius: 9, font: "inherit", color: C.ink, background: C.white };
const label = { display: "grid", gap: 5, color: C.muted, fontSize: 12, fontWeight: 650 };
const btn = (primary = false) => ({ border: "1px solid " + (primary ? C.accent : C.line), background: primary ? C.accent : C.white, color: primary ? C.white : C.ink, borderRadius: 9, padding: "8px 11px", font: "inherit", fontSize: 12, fontWeight: 700, cursor: "pointer" });
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const addDays = (key, delta) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + delta)).toISOString().slice(0, 10);
};
const STATUS = { planned: "مخططة", running: "جارية", paused: "متوقفة مؤقتًا", completed: "مكتملة", cancelled: "ملغاة" };
const VERDICTS = [["improved", "تحسن ملحوظ"], ["unchanged", "لم يتغير بوضوح"], ["worse", "تدهور ملحوظ"], ["inconclusive", "نتيجة غير حاسمة"]];

export default function TrialsView({ trials, products, diaryEntries, reactions, canEdit, busy, onCreate, onTransition }) {
  const [productId, setProductId] = useState("");
  const [question, setQuestion] = useState("");
  const [plannedDays, setPlannedDays] = useState("28");
  const [verdicts, setVerdicts] = useState({});
  const todayKey = today();
  const baseline = useMemo(() => diaryEntries.filter(entry =>
    entry.date >= addDays(todayKey, -7) && entry.date < todayKey &&
    entry.skinRating !== null && entry.skinRating !== undefined && entry.skinRating !== ""
  ), [diaryEntries, todayKey]);
  const activeByProduct = new Set(trials.filter(t => t.status === "running" || t.status === "paused").map(t => t.productId));
  const selectedProduct = products.find(item => item.id === productId);
  const baselineAverage = baseline.length ? baseline.reduce((sum, item) => sum + Number(item.skinRating), 0) / baseline.length : null;
  const create = async event => {
    event.preventDefault();
    if (!selectedProduct) return;
    const ok = await onCreate({
      productId,
      question,
      startDate: todayKey,
      plannedDays: Number(plannedDays),
      status: "running",
      verdict: "pending",
      baselineDiaryIds: baseline.map(entry => entry.id),
    });
    if (ok) { setQuestion(""); setProductId(""); setPlannedDays("28"); }
  };
  return <>
    <section style={panel}>
      <b>بدء تجربة منتج</b>
      <p style={{ color: C.muted, fontSize: 11, lineHeight: 1.7 }}>حاول تغيير عامل واحد قدر الإمكان. التجربة أداة لتنظيم الملاحظات وليست إثباتًا طبيًا لسبب التحسن أو التهيّج.</p>
      {canEdit ? <form onSubmit={create} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10 }}>
        <label style={label}>المنتج
          <select required style={field} value={productId} onChange={event => setProductId(event.target.value)}>
            <option value="">اختر منتجًا</option>
            {products.filter(item => item.status === "active").map(item => <option key={item.id} value={item.id} disabled={activeByProduct.has(item.id)}>{item.name}{activeByProduct.has(item.id) ? " — لديه تجربة نشطة" : ""}</option>)}
          </select>
        </label>
        <label style={label}>المدة المخططة (يومًا)
          <input required type="number" min="1" max="180" style={field} value={plannedDays} onChange={event => setPlannedDays(event.target.value)} />
        </label>
        <label style={{ ...label, gridColumn: "1 / -1" }}>سؤال التجربة
          <textarea required maxLength={500} style={{ ...field, minHeight: 65 }} value={question} onChange={event => setQuestion(event.target.value)} placeholder="مثال: هل ألاحظ تحسنًا في الجفاف عند استخدام هذا المرطب؟" />
        </label>
        {selectedProduct && <div style={{ gridColumn: "1 / -1", border: "1px solid " + C.line, borderRadius: 10, padding: 10 }}>
          <b style={{ fontSize: 12 }}>معاينة خط الأساس قبل البدء</b>
          <div style={{ color: C.muted, fontSize: 11, marginTop: 5 }}>سيتم ربط {baseline.length} إدخالًا من الأيام السبعة السابقة التي تحتوي على تقييم للبشرة.</div>
          <div style={{ fontSize: 12, marginTop: 5 }}>متوسط التقييم المتاح: {baselineAverage === null ? "لا توجد بيانات كافية" : baselineAverage.toFixed(1) + " / 5"}</div>
          {activeByProduct.has(productId) && <div style={{ color: C.warn, fontSize: 11, marginTop: 6 }}>يوجد بالفعل اختبار جارٍ أو متوقف مؤقتًا لهذا المنتج.</div>}
        </div>}
        <div style={{ gridColumn: "1 / -1" }}><button type="submit" style={btn(true)} disabled={busy || !selectedProduct || activeByProduct.has(productId)}>ابدأ التجربة واحفظ خط الأساس</button></div>
      </form> : <p style={{ color: C.muted, fontSize: 12 }}>صلاحية العرض فقط.</p>}
    </section>

    <section style={panel}>
      <b>سجل التجارب ({trials.length})</b>
      {!trials.length && <p style={{ color: C.muted, fontSize: 12 }}>لا توجد تجارب مسجلة حتى الآن.</p>}
      {trials.slice().sort((a, b) => String(b.startDate).localeCompare(String(a.startDate))).map(trial => {
        const product = products.find(item => item.id === trial.productId);
        const summary = summarizeSkinTrial(trial, diaryEntries, reactions, trials);
        return <article key={trial.id} style={{ borderTop: "1px solid " + C.line, padding: "12px 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
            <div><b style={{ fontSize: 13 }}>{product?.name || "منتج غير موجود"}</b><div style={{ color: C.muted, fontSize: 10, marginTop: 3 }}>{trial.startDate} · {trial.plannedDays} يومًا · {STATUS[trial.status] || trial.status}</div></div>
            <span style={{ background: C.soft, color: C.ink, borderRadius: 20, padding: "4px 9px", fontSize: 10 }}>{trial.verdict === "pending" ? "لم تُسجل نتيجة" : (VERDICTS.find(x => x[0] === trial.verdict)?.[1] || trial.verdict)}</span>
          </div>
          <p style={{ fontSize: 12, margin: "8px 0" }}>{trial.question}</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(110px,1fr))", gap: 7 }}>
            <Metric label="خط الأساس" value={summary.baselineAverage == null ? "—" : summary.baselineAverage.toFixed(1) + " / 5"} />
            <Metric label="المتابعة" value={summary.followupAverage == null ? "—" : summary.followupAverage.toFixed(1) + " / 5"} />
            <Metric label="فرق المتوسط" value={summary.delta == null ? "—" : (summary.delta > 0 ? "+" : "") + summary.delta} />
            <Metric label="تفاعلات مسجلة" value={summary.reactionCount} />
            <Metric label="تجارب متزامنة أخرى" value={summary.concurrentTrialCount} />
          </div>
          {!summary.enoughData && <div style={{ color: C.warn, fontSize: 10, marginTop: 7 }}>البيانات أقل من 3 تقييمات في خط الأساس أو المتابعة؛ اعرض المتوسطات بحذر.</div>}
          <div style={{ color: C.muted, fontSize: 10, lineHeight: 1.6, marginTop: 7 }}>{summary.interpretation}</div>
          {canEdit && <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
            {trial.status === "planned" && <button type="button" style={btn()} disabled={busy} onClick={() => onTransition(trial, "running", {})}>بدء</button>}
            {trial.status === "running" && <button type="button" style={btn()} disabled={busy} onClick={() => onTransition(trial, "paused", {})}>إيقاف مؤقت</button>}
            {trial.status === "paused" && <button type="button" style={btn()} disabled={busy} onClick={() => onTransition(trial, "running", {})}>استكمال</button>}
            {(trial.status === "running" || trial.status === "paused") && <>
              <select style={{ ...field, width: 165 }} value={verdicts[trial.id] || "inconclusive"} onChange={event => setVerdicts(state => ({ ...state, [trial.id]: event.target.value }))}>
                {VERDICTS.map(([value, title]) => <option key={value} value={value}>{title}</option>)}
              </select>
              <button type="button" style={btn(true)} disabled={busy} onClick={() => onTransition(trial, "completed", { verdict: verdicts[trial.id] || "inconclusive", endDate: todayKey })}>إنهاء وتسجيل النتيجة</button>
              <button type="button" style={btn()} disabled={busy} onClick={() => onTransition(trial, "cancelled", {})}>إلغاء التجربة</button>
            </>}
          </div>}
        </article>;
      })}
    </section>
  </>;
}

function Metric({ label, value }) {
  return <div style={{ border: "1px solid " + C.line, borderRadius: 9, padding: 8 }}>
    <div style={{ color: C.muted, fontSize: 10 }}>{label}</div><b style={{ fontSize: 13, display: "block", marginTop: 4 }}>{value}</b>
  </div>;
}
