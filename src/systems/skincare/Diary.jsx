import React from "react";

const C = { ink: "#182230", muted: "#64748B", line: "#E2E8F0", white: "#FFFFFF", accent: "#A855F7", danger: "#B91C1C", soft: "#FAF5FF" };
const panel = { background: C.white, border: "1px solid " + C.line, borderRadius: 14, padding: 15, marginBottom: 12 };
const field = { width: "100%", boxSizing: "border-box", padding: "9px 10px", border: "1px solid " + C.line, borderRadius: 9, font: "inherit", color: C.ink, background: C.white };
const label = { display: "grid", gap: 5, color: C.muted, fontSize: 12, fontWeight: 650 };
const btn = (primary = false, danger = false) => ({ border: "1px solid " + (primary ? C.accent : danger ? "#FECACA" : C.line), background: primary ? C.accent : C.white, color: primary ? C.white : danger ? C.danger : C.ink, borderRadius: 9, padding: "8px 11px", font: "inherit", fontSize: 12, fontWeight: 700, cursor: "pointer" });
const dateLabel = value => { try { return new Date(value + "T12:00:00").toLocaleDateString("ar-EG", { weekday: "long", year: "numeric", month: "long", day: "numeric" }); } catch { return value; } };
const EMPTY = { date: "", skinRating: "", issuesText: "", note: "", sleepHours: "", sleepQuality: "", mood: "", exerciseMinutes: "", waterGlasses: "", trialId: "" };

function NumberField({ title, value, onChange, min, max, step = 1 }) {
  return <label style={label}>{title}<input type="number" min={min} max={max} step={step} style={field} value={value ?? ""} onChange={e => onChange(e.target.value)} /></label>;
}

export default function DiaryView({ entries, deletedEntries, selectedDate, setSelectedDate, draft, setDraft, editing, setEditing, onSave, onEdit, onDelete, onRestore, canEdit, busy }) {
  const active = entries.find(entry => entry.date === selectedDate);
  const setDate = value => {
    setSelectedDate(value);
    const found = entries.find(entry => entry.date === value);
    if (found) onEdit(found);
    else {
      setEditing("");
      setDraft({ ...EMPTY, date: value });
    }
  };
  const moveDate = delta => {
    const date = new Date((selectedDate || draft.date || new Date().toISOString().slice(0, 10)) + "T12:00:00");
    date.setDate(date.getDate() + delta);
    const key = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
    setDate(key);
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
          <button type="button" style={btn()} onClick={() => moveDate(1)}>اليوم التالي</button>
        </div>
      </div>
      <label style={{ ...label, maxWidth: 260 }}>التاريخ المحدد<input type="date" style={field} value={selectedDate || draft.date} max={new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo" }).format(new Date())} onChange={e => setDate(e.target.value)} /></label>
      {active && !editing && <p style={{ color: C.muted, fontSize: 12 }}>يوجد تسجيل لهذا اليوم. <button type="button" style={{ ...btn(true), marginInlineStart: 6 }} onClick={() => onEdit(active)}>تعديل تسجيل اليوم</button></p>}
    </section>
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
