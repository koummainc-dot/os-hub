import React, { useEffect, useMemo, useState } from "react";

const palette = { ink: "#172033", muted: "#64748B", line: "#E2E8F0", accent: "#7C3AED", soft: "#F3E8FF", green: "#047857", red: "#B91C1C", white: "#FFFFFF" };
const ratingNames = { again: "لم أتذكر", hard: "صعب", good: "جيد", easy: "سهل" };
const day = (date = new Date(), timeZone = "Africa/Cairo") => new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
const shift = (date, days) => { const value = new Date(String(date) + "T12:00:00Z"); value.setUTCDate(value.getUTCDate() + days); return value.toISOString().slice(0, 10); };

export function nextReviewSchedule(item, rating, date = day()) {
  const previous = Math.max(0, Number(item.reviewIntervalDays) || 0);
  const ease = Math.max(1.3, Math.min(3, Number(item.reviewEase) || 2.3));
  if (rating === "again") return { nextReviewDate: shift(date, 1), reviewIntervalDays: 1, reviewEase: Math.max(1.3, ease - 0.2), status: "Learning", lapseCount: (Number(item.lapseCount) || 0) + 1 };
  if (rating === "hard") { const interval = Math.max(1, Math.round(previous ? previous * 1.2 : 2)); return { nextReviewDate: shift(date, interval), reviewIntervalDays: interval, reviewEase: Math.max(1.3, ease - 0.15), status: "Review" }; }
  if (rating === "good") { const interval = Math.max(2, Math.round(previous ? previous * ease : 3)); return { nextReviewDate: shift(date, interval), reviewIntervalDays: interval, reviewEase: ease, status: "Review" }; }
  const interval = Math.max(4, Math.round(previous ? previous * (ease + 0.5) : 7));
  return { nextReviewDate: shift(date, interval), reviewIntervalDays: interval, reviewEase: Math.min(3, ease + 0.1), status: interval >= 30 ? "Mastered" : "Review" };
}

export default function ReviewQueue({ data, canEdit, onSave, onOpenSource, workspaceId = "demo" }) {
  const [revealed, setRevealed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [index, setIndex] = useState(0);
  const [sharedLogs, setSharedLogs] = useState([]);
  const workspaceKey = String(workspaceId || data.preferences?.workspaceId || "demo");
  const refreshSharedLogs = () => { try { setSharedLogs(JSON.parse(localStorage.getItem("os-hub:shared-review-history:" + workspaceKey) || "[]")); } catch { setSharedLogs([]); } };
  useEffect(() => { refreshSharedLogs(); const handler = () => refreshSharedLogs(); window.addEventListener("os-hub:review-recorded", handler); window.addEventListener("storage", handler); return () => { window.removeEventListener("os-hub:review-recorded", handler); window.removeEventListener("storage", handler); }; }, [workspaceKey]);
  const today = day(new Date(), data.preferences?.timezone || "Africa/Cairo");
  const due = useMemo(() => (data.vocabulary || [])
    .filter(item => item.status !== "Archived" && item.status !== "Mastered" && (!(item.nextReviewDate || item.dueDate) || (item.nextReviewDate || item.dueDate) <= today))
    .sort((a, b) => String(a.nextReviewDate || a.dueDate || "").localeCompare(String(b.nextReviewDate || b.dueDate || ""))), [data, today]);
  const logs = [...(data.reviewLogs || []), ...sharedLogs].filter((log, index, rows) => rows.findIndex(x => x.id === log.id) === index).sort((a,b) => String(b.reviewedAt || b.date || "").localeCompare(String(a.reviewedAt || a.date || "")));
  const todayLogs = logs.filter(log => String(log.reviewedAt || log.date || "").slice(0, 10) === today);
  const item = due[Math.min(index, Math.max(0, due.length - 1))];
  const recentLogs = useMemo(() => logs.slice().sort((a, b) => String(b.reviewedAt || b.date || "").localeCompare(String(a.reviewedAt || a.date || ""))).slice(0, 12), [logs]);
  const box = { border: "1px solid " + palette.line, borderRadius: 14, padding: 16, background: palette.white };
  const button = (label, action, primary = false, disabled = false) => <button type="button" disabled={busy || disabled} onClick={action} style={{ border: "1px solid " + (primary ? palette.accent : palette.line), background: primary ? palette.accent : palette.white, color: primary ? palette.white : palette.ink, borderRadius: 10, padding: "10px 12px", font: "inherit", fontSize: 12, fontWeight: 750, opacity: busy || disabled ? 0.6 : 1, cursor: "pointer" }}>{label}</button>;

  const rate = async rating => {
    if (!item || !canEdit || busy) return;
    setBusy(true); setMessage("");
    const reviewedAt = new Date().toISOString();
    const schedule = nextReviewSchedule(item, rating, today);
    const log = {
      id: globalThis.crypto?.randomUUID?.() || "review-" + Date.now(),
      itemType: "vocabulary", itemId: item.id, term: item.term, rating, reviewedAt, reviewDate: today,
      previousDueDate: item.nextReviewDate || item.dueDate || null,
      nextReviewDate: schedule.nextReviewDate, intervalDays: schedule.reviewIntervalDays,
      meaningSnapshot: item.meaning || "",
      source: { areaId: item.areaId || null, lessonId: item.lessonId || null, sourceUrl: item.sourceUrl || null }
    };
    const next = {
      ...data,
      vocabulary: data.vocabulary.map(row => row.id === item.id ? {
        ...row, ...schedule, dueDate: schedule.nextReviewDate, lastReviewedAt: reviewedAt,
        reviewCount: (Number(row.reviewCount) || 0) + 1, lastReviewRating: rating, updatedAt: reviewedAt
      } : row),
      reviewLogs: [...logs, log]
    };
    const ok = await onSave(next);
    if (ok !== false) {
      const sharedLog = { ...log, workspaceId: workspaceKey, itemType: "learning_vocabulary", title: item.term || "", sourceUrl: item.sourceUrl || null };
      try { const key = "os-hub:shared-review-history:" + workspaceKey; const current = JSON.parse(localStorage.getItem(key) || "[]"); localStorage.setItem(key, JSON.stringify([...current, sharedLog].slice(-1000))); window.dispatchEvent(new CustomEvent("os-hub:review-recorded", { detail: sharedLog })); } catch {}
      refreshSharedLogs(); setMessage("تم تسجيل المراجعة. الموعد التالي: " + schedule.nextReviewDate); setRevealed(false); setIndex(0);
    }
    else setMessage("لم يتم الحفظ؛ لم نغيّر ترتيب المراجعات.");
    setBusy(false);
  };

  return <div dir="rtl" style={{ display: "grid", gap: 12, color: palette.ink }}>
    <div style={{ ...box, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 12 }}>
      {[[ "مستحقة اليوم", due.length ], [ "مراجعات مسجلة اليوم", todayLogs.length ], [ "إجمالي سجل المراجعة", logs.length ]].map(([label, value]) => <div key={label}><div style={{ fontSize: 12, color: palette.muted }}>{label}</div><strong style={{ fontSize: 24 }}>{value}</strong></div>)}
    </div>
    {item ? <article style={{ ...box, display: "grid", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, color: palette.muted }}>بطاقة {Math.min(index + 1, due.length)} من {due.length}</span>
        <span style={{ fontSize: 12, color: palette.muted }}>الموعد السابق: {item.nextReviewDate || item.dueDate || "مستحقة فورًا"}</span>
      </div>
      <h2 style={{ fontSize: 27, margin: "4px 0" }}>{item.term}</h2>
      {item.pronunciation && <div style={{ color: palette.muted, fontSize: 13 }}>{item.pronunciation}</div>}
      {revealed ? <div style={{ background: palette.soft, borderRadius: 12, padding: 14, display: "grid", gap: 8 }}>
        <strong>الإجابة / المعنى</strong><div style={{ lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{item.meaning}</div>
        {item.example && <div><b>مثال:</b> {item.example}</div>}{item.notes && <div style={{ fontSize: 12, color: palette.muted }}>{item.notes}</div>}
      </div> : <div style={{ color: palette.muted }}>حاول تذكر المعنى قبل إظهار الإجابة.</div>}
      {!revealed ? button("إظهار الإجابة", () => setRevealed(true), true, false) : <>
        <div style={{ fontSize: 12, fontWeight: 800 }}>كيف كان التذكر؟</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {button("لم أتذكر", () => rate("again"), false, !canEdit)}
          {button("صعب", () => rate("hard"), false, !canEdit)}
          {button("جيد", () => rate("good"), true, !canEdit)}
          {button("سهل", () => rate("easy"), false, !canEdit)}
        </div>
      </>}
      {item.lessonId && onOpenSource && button("فتح الدرس المرتبط", () => onOpenSource(item.lessonId), false, false)}
      {item.sourceUrl && <a href={item.sourceUrl} target="_blank" rel="noreferrer" style={{fontSize:12,color:palette.accent}}>فتح المصدر المرتبط ↗</a>}
      {message && <div role="status" style={{ fontSize: 12, color: message.startsWith("لم") ? palette.red : palette.green }}>{message}</div>}
    </article> : <div style={{ ...box, textAlign: "center", padding: 28 }}><div style={{ fontSize: 28 }}>✓</div><b>لا توجد مراجعات مستحقة الآن</b><p style={{ color: palette.muted, fontSize: 13 }}>أضف مفردات وحدد موعد مراجعتها؛ ستظهر هنا عند استحقاقها.</p></div>}
    <section style={{ ...box, display: "grid", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}><h3 style={{ margin: 0, fontSize: 16 }}>سجل المراجعات الأخير</h3><span style={{ fontSize: 12, color: palette.muted }}>كل محاولة محفوظة كسجل مستقل</span></div>
      {recentLogs.length ? <div style={{ display: "grid", gap: 8 }}>{recentLogs.map(log => <div key={log.id} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 8, alignItems: "center", borderTop: "1px solid " + palette.line, paddingTop: 9 }}>
        <div><b style={{ fontSize: 13 }}>{log.term || log.title || log.itemName || "عنصر مراجعة"}</b><div style={{ fontSize: 11, color: palette.muted, marginTop: 3 }}>{String(log.reviewedAt || log.date || "").replace("T", " ").slice(0, 16)} · الموعد التالي: {log.nextReviewDate || "غير محدد"}{Number.isFinite(Number(log.intervalDays)) ? " · الفاصل " + log.intervalDays + " يوم" : ""}</div></div>
        <span style={{ fontSize: 11, padding: "4px 8px", borderRadius: 99, background: log.rating === "again" ? "#FEE2E2" : log.rating === "hard" ? "#FEF3C7" : palette.soft, color: log.rating === "again" ? palette.red : log.rating === "hard" ? "#92400E" : palette.accent }}>{ratingNames[log.rating] || log.rating || "مراجعة"}</span>
      </div>)}</div> : <div style={{ fontSize: 13, color: palette.muted }}>لا يوجد سجل بعد. ستظهر هنا محاولات المراجعة التي تسجلها.</div>}
    </section>
  </div>;
}
