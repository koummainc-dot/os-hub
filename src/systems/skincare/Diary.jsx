import React, { useMemo, useState } from "react";

const C = { ink: "#182230", muted: "#64748B", line: "#E2E8F0", white: "#FFFFFF", accent: "#A855F7", danger: "#B91C1C", soft: "#FAF5FF" };
const panel = { background: C.white, border: "1px solid " + C.line, borderRadius: 14, padding: 15, marginBottom: 12 };
const field = { width: "100%", boxSizing: "border-box", padding: "9px 10px", border: "1px solid " + C.line, borderRadius: 9, font: "inherit", color: C.ink, background: C.white };
const label = { display: "grid", gap: 5, color: C.muted, fontSize: 12, fontWeight: 650 };
const btn = (primary = false, danger = false) => ({ border: "1px solid " + (primary ? C.accent : danger ? "#FECACA" : C.line), background: primary ? C.accent : C.white, color: primary ? C.white : danger ? C.danger : C.ink, borderRadius: 9, padding: "8px 11px", font: "inherit", fontSize: 12, fontWeight: 700, cursor: "pointer" });
const dateLabel = value => { try { return new Date(value + "T12:00:00Z").toLocaleDateString("ar-EG", { weekday: "long", year: "numeric", month: "long", day: "numeric" }); } catch { return value; } };
const EMPTY = { date: "", skinRating: "", issuesText: "", note: "", sleepHours: "", sleepQuality: "", mood: "", exerciseMinutes: "", waterGlasses: "", trialId: "" };
const AREA_FIELDS = [["forehead", "الجبهة"], ["leftCheek", "الخد الأيسر"], ["rightCheek", "الخد الأيمن"], ["nose", "الأنف"], ["chin", "الذقن"], ["jawline", "الفك"]];

function NumberField({ title, value, onChange, min, max, step = 1 }) {
  return <label style={label}>{title}<input type="number" min={min} max={max} step={step} style={field} value={value ?? ""} onChange={e => onChange(e.target.value)} /></label>;
}

export default function DiaryView({ entries, deletedEntries, trials = [], selectedDate, setSelectedDate, draft, setDraft, editing, setEditing, onSave, onEdit, onDelete, onRestore, canEdit, busy }) {
  const active = entries.find(entry => entry.date === selectedDate);
  const setDate = value => {
    if (value > todayKey) return;
    setSelectedDate(value);
    const found = entries.find(entry => entry.date === value);
    if (found) onEdit(found);
    else {
      setEditing("");
      setDraft({ ...EMPTY, date: value });
    }
  };
  const todayKey = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const moveDate = delta => {
    const [year, month, day] = (selectedDate || draft.date || todayKey).split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day + delta, 12));
    const key = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
    if (key <= todayKey) setDate(key);
  };
  const clearForm = () => {
    setEditing("");
    setDraft({ ...EMPTY, date: selectedDate || new Date().toISOString().slice(0, 10) });
  };
  return <>
    <section style={panel}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
        <div><b>مفكرة البشرة</b><div style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>سجل يومي لمتابعة البشرة والعادات المرتبطة بها، دون تشخيص طبي.</div></div>
        <div style={{ display: "flex", gap: 6 }}>
          <button type="button" style={btn()} onClick={() => moveDate(-1)}>اليوم السابق</button>
          <button type="button" style={btn()} onClick={() => setDate(new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo" }).format(new Date()))}>اليوم</button>
          <button type="button" style={btn()} disabled={(selectedDate || todayKey) >= todayKey} onClick={() => moveDate(1)}>اليوم التالي</button>
        </div>
      </div>
      <label style={{ ...label, maxWidth: 260 }}>التاريخ المحدد<input type="date" style={field} value={selectedDate || draft.date} max={new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo" }).format(new Date())} onChange={e => setDate(e.target.value)} /></label>
      {active && !editing && <p style={{ color: C.muted, fontSize: 12 }}>يوجد تسجيل لهذا اليوم. <button type="button" style={{ ...btn(true), marginInlineStart: 6 }} onClick={() => onEdit(active)}>تعديل تسجيل اليوم</button></p>}
    </section>
    <CalendarInsights entries={entries} selectedDate={selectedDate} onSelect={setDate} />
    <section style={panel}>
      <b>{editing ? "تعديل إدخال المفكرة" : "تسجيل اليوم"}</b>
      <p style={{ color: C.muted, fontSize: 11, margin: "5px 0 13px" }}>{dateLabel(draft.date || selectedDate)}</p>
      {canEdit ? <form onSubmit={onSave} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(155px,1fr))", gap: 11 }}>
        <label style={label}>تاريخ التسجيل<input type="date" required max={new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo" }).format(new Date())} style={field} value={draft.date || ""} onChange={e => { setDraft(d => ({ ...d, date: e.target.value })); setSelectedDate(e.target.value); }} /></label>
        <NumberField title="تقييم البشرة (1–5)" value={draft.skinRating} min={1} max={5} onChange={v => setDraft(d => ({ ...d, skinRating: v }))} />
        <label style={label}>المشكلات/الملاحظات السريعة<input style={field} value={draft.issuesText || ""} maxLength={500} placeholder="جفاف، احمرار، حبوب..." onChange={e => setDraft(d => ({ ...d, issuesText: e.target.value }))} /></label>
        <NumberField title="ساعات النوم" value={draft.sleepHours} min={0} max={24} step={0.5} onChange={v => setDraft(d => ({ ...d, sleepHours: v }))} />
        <NumberField title="جودة النوم (1–5)" value={draft.sleepQuality} min={1} max={5} onChange={v => setDraft(d => ({ ...d, sleepQuality: v }))} />
        <NumberField title="المزاج (1–5)" value={draft.mood} min={1} max={5} onChange={v => setDraft(d => ({ ...d, mood: v }))} />
        <NumberField title="النشاط بالدقائق" value={draft.exerciseMinutes} min={0} max={1440} onChange={v => setDraft(d => ({ ...d, exerciseMinutes: v }))} />
        <NumberField title="أكواب المياه" value={draft.waterGlasses} min={0} max={100} onChange={v => setDraft(d => ({ ...d, waterGlasses: v }))} />
        <label style={label}>التجربة المرتبطة بهذا اليوم (اختياري)
          <select style={field} value={draft.trialId || ""} onChange={event => setDraft(d => ({ ...d, trialId: event.target.value }))}>
            <option value="">بدون ربط بتجربة</option>
            {trials.filter(trial => trial.status !== "cancelled" && draft.date >= trial.startDate && (!trial.endDate || draft.date <= trial.endDate)).map(trial => <option key={trial.id} value={trial.id}>{trial.question}</option>)}
          </select>
          {draft.trialId && <span style={{ color: C.accent, fontSize: 10, lineHeight: 1.6 }}>هذا الإدخال مرتبط بتجربة محددة، وسيظهر ضمن يومياتها. أضف الملاحظات والتقييمات أدناه، ويمكنك إرفاق الصور من معرض صور البشرة.</span>}
        </label>
        <div style={{ gridColumn: "1 / -1", border: "1px solid " + C.line, borderRadius: 10, padding: 11 }}>
          <b style={{ fontSize: 12 }}>قياسات مناطق الوجه</b>
          <p style={{ color: C.muted, fontSize: 10, margin: "4px 0 10px" }}>سجّل شدة المشكلة في كل منطقة من 0 إلى 5؛ اتركها فارغة إذا لم تقيّم المنطقة، واستخدم 0 عند عدم وجود مشكلة.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 9 }}>
            {AREA_FIELDS.map(([key, title]) => <NumberField key={key} title={title + " (0–5)"} value={draft.areaMeasurements?.[key] ?? ""} min={0} max={5} onChange={value => setDraft(d => ({ ...d, areaMeasurements: { ...(d.areaMeasurements || {}), [key]: value } }))} />)}
          </div>
        </div>
        <label style={{ ...label, gridColumn: "1 / -1" }}>ملاحظات اليوم<textarea style={{ ...field, minHeight: 85, resize: "vertical" }} value={draft.note || ""} maxLength={3000} onChange={e => setDraft(d => ({ ...d, note: e.target.value }))} /></label>
        <div style={{ display: "flex", gap: 8, gridColumn: "1 / -1" }}>
          <button type="submit" style={btn(true)} disabled={busy || !draft.date}>{busy ? "جارٍ الحفظ…" : editing ? "حفظ التعديل" : "حفظ اليوم"}</button>
          {editing && <button type="button" style={btn()} onClick={clearForm}>إلغاء التعديل</button>}
        </div>
      </form> : <p style={{ color: C.muted, fontSize: 12 }}>صلاحية العرض فقط.</p>}
    </section>
    <section style={panel}>
      <b>سجل الأيام ({entries.length})</b>
      {!entries.length && <p style={{ color: C.muted, fontSize: 12 }}>لا توجد إدخالات بعد. ابدأ بتسجيل يومك.</p>}
      {entries.map(entry => <article key={entry.id} style={{ borderTop: "1px solid " + C.line, padding: "12px 0", display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ minWidth: 190, flex: 1 }}>
          <b>{dateLabel(entry.date)}</b>
          <div style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>
            {entry.skinRating ? "تقييم البشرة: " + entry.skinRating + "/5" : "دون تقييم"} · {entry.issues?.length ? entry.issues.join("، ") : "لا توجد مشكلات مسجلة"}
          </div>
          <div style={{ color: C.muted, fontSize: 11, marginTop: 3 }}>
            {entry.sleepHours != null ? "النوم " + entry.sleepHours + " س" : ""}
            {entry.mood != null ? " · المزاج " + entry.mood + "/5" : ""}
            {entry.waterGlasses != null ? " · المياه " + entry.waterGlasses + " أكواب" : ""}
          </div>
          {entry.areaMeasurements && Object.values(entry.areaMeasurements).some(value => value !== null && value !== undefined && value !== "") && <div style={{ color: C.muted, fontSize: 10, marginTop: 4 }}>شدة المناطق: {AREA_FIELDS.filter(([key]) => entry.areaMeasurements[key] !== null && entry.areaMeasurements[key] !== undefined && entry.areaMeasurements[key] !== "").map(([key, title]) => title + " " + entry.areaMeasurements[key] + "/5").join(" · ")}</div>}
          {entry.note && <p style={{ fontSize: 12, margin: "7px 0 0", whiteSpace: "pre-wrap" }}>{entry.note}</p>}
        </div>
        {canEdit && <div style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
          <button type="button" style={btn()} onClick={() => onEdit(entry)}>تعديل</button>
          <button type="button" style={btn(false, true)} onClick={() => onDelete(entry)}>حذف</button>
        </div>}
      </article>)}
      {!!deletedEntries.length && <details style={{ borderTop: "1px solid " + C.line, paddingTop: 10 }}><summary style={{ cursor: "pointer", color: C.muted, fontSize: 12 }}>المحذوفات ({deletedEntries.length})</summary>
        {deletedEntries.map(entry => <div key={entry.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "8px 0" }}><span style={{ fontSize: 12 }}>{dateLabel(entry.date)}</span>{canEdit && <button type="button" style={btn()} onClick={() => onRestore(entry)}>استعادة</button>}</div>)}
      </details>}
    </section>
  </>;
}


function CalendarInsights({ entries, selectedDate, onSelect }) {
  const todayKey = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const [monthKey, setMonthKey] = useState((selectedDate || todayKey).slice(0, 7));
  React.useEffect(() => setMonthKey((selectedDate || todayKey).slice(0, 7)), [selectedDate]);
  const byDate = useMemo(() => new Map(entries.map(entry => [entry.date, entry])), [entries]);
  const [year, month] = monthKey.split("-").map(Number);
  const first = new Date(Date.UTC(year, month - 1, 1));
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const offset = first.getUTCDay();
  const monthTitle = first.toLocaleDateString("ar-EG", { month: "long", year: "numeric", timeZone: "UTC" });
  const cells = [...Array(offset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const moveMonth = delta => {
    const next = new Date(Date.UTC(year, month - 1 + delta, 1));
    const key = next.toISOString().slice(0, 7);
    if (key <= todayKey.slice(0, 7)) setMonthKey(key);
  };
  const keyFor = day => year + "-" + String(month).padStart(2, "0") + "-" + String(day).padStart(2, "0");
  const recent = entries.filter(entry => entry.date <= todayKey && entry.date >= addDays(todayKey, -29));
  const rated = recent.filter(entry => Number.isFinite(Number(entry.skinRating)) && entry.skinRating !== null && entry.skinRating !== "");
  const average = rated.length ? rated.reduce((sum, entry) => sum + Number(entry.skinRating), 0) / rated.length : null;
  const last7 = rated.filter(entry => entry.date >= addDays(todayKey, -6));
  const previous7 = rated.filter(entry => entry.date >= addDays(todayKey, -13) && entry.date <= addDays(todayKey, -7));
  const avg7 = last7.length ? last7.reduce((sum, entry) => sum + Number(entry.skinRating), 0) / last7.length : null;
  const prev7 = previous7.length ? previous7.reduce((sum, entry) => sum + Number(entry.skinRating), 0) / previous7.length : null;
  const issueCounts = new Map();
  recent.forEach(entry => (entry.issues || []).forEach(issue => issueCounts.set(issue, (issueCounts.get(issue) || 0) + 1)));
  const topIssues = [...issueCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
  const weekdayLabels = ["أحد", "إثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];
  return <section style={panel}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
      <div><b>تقويم البشرة</b><div style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>الأيام المسجلة تظهر بعلامة، اختر أي يوم سابق لعرضه أو تسجيله</div></div>
      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        <button type="button" style={btn()} onClick={() => moveMonth(-1)}>السابق</button>
        <b style={{ fontSize: 12, minWidth: 115, textAlign: "center" }}>{monthTitle}</b>
        <button type="button" style={btn()} disabled={monthKey >= todayKey.slice(0, 7)} onClick={() => moveMonth(1)}>التالي</button>
      </div>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(7,minmax(0,1fr))", gap: 5 }}>
      {weekdayLabels.map(day => <div key={day} style={{ textAlign: "center", color: C.muted, fontSize: 10, padding: "5px 0" }}>{day}</div>)}
      {cells.map((day, index) => {
        if (!day) return <div key={"blank-" + index} />;
        const key = keyFor(day);
        const entry = byDate.get(key);
        const future = key > todayKey;
        const selected = key === selectedDate;
        return <button key={key} type="button" disabled={future} onClick={() => onSelect(key)} aria-label={key + (entry ? " — مسجل" : " — بدون تسجيل")} style={{
          minHeight: 43, border: selected ? "2px solid " + C.accent : "1px solid " + C.line,
          borderRadius: 9, background: entry ? C.soft : C.white, color: future ? "#CBD5E1" : C.ink,
          opacity: future ? .45 : 1, cursor: future ? "not-allowed" : "pointer", display: "grid", placeItems: "center",
          padding: 3, font: "inherit"
        }}>
          <span style={{ fontSize: 12, fontWeight: selected ? 800 : 600 }}>{day}</span>
          <span style={{ width: 5, height: 5, borderRadius: 8, background: entry ? C.accent : "transparent" }} />
        </button>;
      })}
    </div>
    <div style={{ display: "flex", gap: 6, alignItems: "center", color: C.muted, fontSize: 10, marginTop: 8 }}><span style={{ width: 7, height: 7, borderRadius: 8, background: C.accent }} /> يوم به تسجيل</div>
    <div style={{ borderTop: "1px solid " + C.line, marginTop: 14, paddingTop: 13 }}>
      <b style={{ fontSize: 13 }}>ملخص آخر 30 يومًا</b>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 8, marginTop: 10 }}>
        <Insight label="أيام مسجلة" value={recent.length + " / 30"} />
        <Insight label="متوسط تقييم البشرة" value={average == null ? "—" : average.toFixed(1) + " / 5"} />
        <Insight label="تغير آخر 7 أيام" value={avg7 == null || prev7 == null ? "بيانات غير كافية" : (avg7 - prev7 > 0 ? "+" : "") + (avg7 - prev7).toFixed(1) + " نقطة"} />
      </div>
      <div style={{ marginTop: 12 }}>
        <div style={{ color: C.muted, fontSize: 11, marginBottom: 7 }}>أكثر الملاحظات تكرارًا</div>
        {topIssues.length ? <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>{topIssues.map(([issue, count]) => <span key={issue} style={{ border: "1px solid " + C.line, borderRadius: 20, padding: "5px 9px", fontSize: 11 }}>{issue} · {count}</span>)}</div> : <div style={{ color: C.muted, fontSize: 11 }}>لا توجد مشكلات متكررة مسجلة في الفترة.</div>}
      </div>
      <p style={{ color: C.muted, fontSize: 10, margin: "10px 0 0" }}>المؤشرات وصفية وتعتمد على الأيام التي أدخلتها فقط؛ لا تمثل تقييمًا طبيًا أو استنتاجًا لسبب تغير البشرة.</p>
    </div>
  </section>;
}

function Insight({ label, value }) {
  return <div style={{ border: "1px solid " + C.line, borderRadius: 10, padding: 10 }}>
    <div style={{ color: C.muted, fontSize: 10 }}>{label}</div>
    <b style={{ display: "block", marginTop: 5, fontSize: 16 }}>{value}</b>
  </div>;
}

function addDays(dateKey, delta) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + delta)).toISOString().slice(0, 10);
}
