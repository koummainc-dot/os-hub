import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { A, S } from "./ui.jsx";

// ════════════════════════════════════════════════════════════════════
// UI kit shared by every system module (RTL, uses the platform CSS variables).
// ════════════════════════════════════════════════════════════════════
export const C = { text: "#16181D", dim: "#57606A", muted: "#6E7781", line: "rgba(0,0,0,0.08)", ok: "#10B981", warn: "#F59E0B", orange: "#F97316", bad: "#EF4444", info: "#3B82F6", violet: "#8B5CF6", accent: A };

export function Btn({ kind, small, danger, disabled, onClick, children, title, style, type }) {
  const base = kind === "primary" ? S.btnA : S.btn;
  const st = { ...base, ...(small ? { padding: "4px 10px", fontSize: 11.5 } : {}), ...(danger ? { color: C.bad, borderColor: "rgba(239,68,68,0.35)" } : {}), ...(disabled ? { opacity: 0.5, cursor: "not-allowed" } : {}), fontFamily: "inherit", ...style };
  return <button type={type || "button"} title={title} disabled={disabled} onClick={disabled ? undefined : onClick} style={st}>{children}</button>;
}
export function Chip({ color, children, title, solid, style }) {
  const c = color || C.muted;
  return <span title={title} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10.5, padding: "2px 8px", borderRadius: 10, fontWeight: 700, whiteSpace: "nowrap", background: solid ? c : c + "18", color: solid ? "#fff" : c, border: solid ? "none" : `1px solid ${c}33`, ...style }}>{children}</span>;
}
export function Dot({ color, size }) { return <span style={{ display: "inline-block", width: size || 9, height: size || 9, borderRadius: "50%", background: color, flexShrink: 0 }} />; }
export function Avatar({ name, color, size }) {
  const sz = size || 24; const c = color || A; const ch = (String(name || "?").trim()[0] || "?").toUpperCase();
  return <span title={name} style={{ width: sz, height: sz, borderRadius: "50%", background: c + "22", border: `1.5px solid ${c}66`, color: c, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: sz * 0.42, fontWeight: 800, flexShrink: 0 }}>{ch}</span>;
}
export function Progress({ value, color, height, showLabel }) {
  if (value == null) return <span style={{ fontSize: 10.5, color: C.muted }}>غير قابل للقياس</span>;
  const v = Math.max(0, Math.min(1, value)); const col = color || (v >= 1 ? C.ok : A);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, width: "100%" }}>
      <span style={{ flex: 1, height: height || 6, background: "rgba(0,0,0,0.07)", borderRadius: 4, overflow: "hidden", minWidth: 40 }}><span style={{ display: "block", width: v * 100 + "%", height: "100%", background: col, borderRadius: 4 }} /></span>
      {showLabel !== false && <span style={{ fontSize: 10.5, color: C.dim, minWidth: 30, textAlign: "end" }}>{Math.round(v * 100)}%</span>}
    </span>
  );
}
export function Empty({ icon, title, sub, action }) {
  return (
    <div style={{ ...S.card, textAlign: "center", padding: "34px 20px", color: C.muted }}>
      <div style={{ fontSize: 34, marginBottom: 6 }}>{icon || "📭"}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 4 }}>{title}</div>
      {sub && <div style={{ fontSize: 12, lineHeight: 1.8, marginBottom: action ? 12 : 0 }}>{sub}</div>}
      {action}
    </div>
  );
}
export function Head({ title, sub, right }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
      <div><div style={{ fontSize: 21, fontWeight: 700 }}>{title}</div>{sub && <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{sub}</div>}</div>
      {right && <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>{right}</div>}
    </div>
  );
}
export function Tabs({ tabs, value, onChange, small }) {
  return (
    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 14, borderBottom: `1px solid ${C.line}`, paddingBottom: 0, overflowX: "auto" }}>
      {tabs.map((t) => (
        <button key={t.id} onClick={() => onChange(t.id)} style={{ padding: small ? "6px 10px" : "8px 14px", border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: small ? 12 : 13, fontWeight: value === t.id ? 700 : 500, color: value === t.id ? C.text : C.muted, borderBottom: value === t.id ? `2px solid ${A}` : "2px solid transparent", whiteSpace: "nowrap" }}>
          {t.icon ? t.icon + " " : ""}{t.label}{t.count != null && <span style={{ marginInlineStart: 5, fontSize: 10, color: C.muted }}>({t.count})</span>}
        </button>
      ))}
    </div>
  );
}
export function Seg({ options, value, onChange, small }) {
  return (
    <span style={{ display: "inline-flex", border: `1px solid ${C.line}`, borderRadius: 8, overflow: "hidden" }}>
      {options.map((o) => (
        <button key={o.v} onClick={() => onChange(o.v)} style={{ padding: small ? "3px 9px" : "5px 12px", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: small ? 11 : 12, fontWeight: value === o.v ? 700 : 500, background: value === o.v ? A : "transparent", color: value === o.v ? "#1a0f00" : C.dim }}>{o.l}</button>
      ))}
    </span>
  );
}
export function Modal({ title, onClose, children, footer, wide }) {
  useEffect(() => { const f = (e) => { if (e.key === "Escape") onClose && onClose(); }; window.addEventListener("keydown", f); return () => window.removeEventListener("keydown", f); }, [onClose]);
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 6500, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "4vh 12px", overflowY: "auto" }} onMouseDown={(e) => e.target === e.currentTarget && onClose && onClose()}>
      <div role="dialog" aria-label={title} style={{ background: "#fff", borderRadius: 14, width: "100%", maxWidth: wide ? 860 : 560, direction: "rtl", boxShadow: "0 24px 60px rgba(0,0,0,0.3)" }}>
        <div style={{ padding: "13px 18px", borderBottom: `1px solid ${C.line}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>{title}</div>
          <button aria-label="إغلاق" onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, lineHeight: 1, cursor: "pointer", color: C.dim }}>×</button>
        </div>
        <div style={{ padding: 18 }}>{children}</div>
        {footer && <div style={{ padding: "12px 18px", borderTop: `1px solid ${C.line}`, display: "flex", gap: 8, flexWrap: "wrap" }}>{footer}</div>}
      </div>
    </div>
  );
}
// promise-based confirm dialog: const [confirm, node] = useConfirm();  if (await confirm("...")) ...
export function useConfirm() {
  const [st, setSt] = useState(null);
  const confirm = useCallback((message, opts) => new Promise((res) => setSt({ message, opts: opts || {}, res })), []);
  const done = (v) => { if (st) st.res(v); setSt(null); };
  const node = st ? (
    <Modal title={(st.opts && st.opts.title) || "تأكيد"} onClose={() => done(false)} footer={<>
      <Btn kind="primary" onClick={() => done(true)} style={st.opts.danger ? { background: C.bad, color: "#fff" } : undefined}>{st.opts.ok || "تأكيد"}</Btn>
      {st.opts.alt && <Btn onClick={() => { st.res(st.opts.alt.value); setSt(null); }}>{st.opts.alt.label}</Btn>}
      <Btn onClick={() => done(false)}>{st.opts.cancel || "إلغاء"}</Btn></>}>
      <div style={{ fontSize: 13, lineHeight: 1.9, whiteSpace: "pre-wrap" }}>{st.message}</div>
    </Modal>
  ) : null;
  return [confirm, node];
}
export function Field({ label, hint, error, children, required }) {
  return (
    <label style={{ display: "block", marginBottom: 12 }}>
      {label && <span style={{ ...S.lbl, display: "block" }}>{label}{required && <span style={{ color: C.bad }}> *</span>}</span>}
      {children}
      {hint && !error && <span style={{ display: "block", fontSize: 10.5, color: C.muted, marginTop: 3 }}>{hint}</span>}
      {error && <span style={{ display: "block", fontSize: 11, color: C.bad, marginTop: 3 }}>{error}</span>}
    </label>
  );
}
export function MultiPick({ options, value, onChange, placeholder }) {
  const val = value || [];
  const [q, setQ] = useState("");
  const opts = options.filter((o) => !val.includes(o.v) && (!q || String(o.l).toLowerCase().includes(q.toLowerCase())));
  return (
    <div>
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: val.length ? 6 : 0 }}>
        {val.map((id) => { const o = options.find((x) => x.v === id); return <Chip key={id} color={C.info}>{o ? o.l : id}<button type="button" onClick={() => onChange(val.filter((x) => x !== id))} style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", padding: 0, fontSize: 13, lineHeight: 1 }}>×</button></Chip>; })}
      </div>
      <input style={S.inp} placeholder={placeholder || "ابحث وأضف..."} value={q} onChange={(e) => setQ(e.target.value)} />
      {q && opts.length > 0 && <div style={{ border: `1px solid ${C.line}`, borderRadius: 8, maxHeight: 150, overflowY: "auto", marginTop: 4, background: "#fff" }}>{opts.slice(0, 30).map((o) => <div key={o.v} onClick={() => { onChange([...val, o.v]); setQ(""); }} style={{ padding: "6px 10px", cursor: "pointer", fontSize: 12.5 }}>{o.l}</div>)}</div>}
    </div>
  );
}
function FieldInput({ f, v, set, values }) {
  const val = v == null ? "" : v;
  switch (f.type) {
    case "textarea": return <textarea style={{ ...S.ta, minHeight: f.rows ? f.rows * 22 : 80 }} value={val} placeholder={f.placeholder} onChange={(e) => set(e.target.value)} />;
    case "number": return <input style={S.inp} type="number" min={f.min} max={f.max} step={f.step} value={val} placeholder={f.placeholder} onChange={(e) => set(e.target.value === "" ? null : Number(e.target.value))} />;
    case "date": return <input style={{ ...S.inp, direction: "ltr", textAlign: "right" }} type="date" value={val || ""} onChange={(e) => set(e.target.value || null)} />;
    case "select": return (
      <select style={S.sel} value={val} onChange={(e) => set(e.target.value === "" ? null : e.target.value)}>
        {f.allowEmpty !== false && <option value="">{f.emptyLabel || "—"}</option>}
        {(typeof f.options === "function" ? f.options(values) : f.options || []).map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>);
    case "multi": return <MultiPick options={typeof f.options === "function" ? f.options(values) : f.options || []} value={v || []} onChange={set} placeholder={f.placeholder} />;
    case "bool": return <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}><input type="checkbox" checked={!!v} onChange={(e) => set(e.target.checked)} />{f.checkLabel || ""}</label>;
    case "url": return <input style={{ ...S.inp, direction: "ltr", textAlign: "right" }} type="url" value={val} placeholder="https://" onChange={(e) => set(e.target.value)} />;
    case "email": return <input style={{ ...S.inp, direction: "ltr", textAlign: "right" }} type="email" value={val} onChange={(e) => set(e.target.value)} />;
    case "time": return <input style={{ ...S.inp, direction: "ltr", textAlign: "right" }} type="time" value={val} onChange={(e) => set(e.target.value || null)} />;
    case "stars": return <Seg value={v} onChange={set} options={[1, 2, 3, 4, 5].map((n) => ({ v: n, l: "★".repeat(n) }))} small />;
    default: return <input style={S.inp} type="text" value={val} placeholder={f.placeholder} onChange={(e) => set(e.target.value)} />;
  }
}
// Schema-driven form. fields: [{key,label,type,options,required,hint,show,validate,span,disabled}]
export function FormModal({ title, fields, initial, onSubmit, onClose, submitLabel, wide, validate, footerExtra, children }) {
  const [values, setValues] = useState(initial || {});
  const baseline = useRef(JSON.stringify(initial || {}));
  const [errors, setErrors] = useState({}); const [busy, setBusy] = useState(false); const [formErr, setFormErr] = useState("");
  const dirty = JSON.stringify(values) !== baseline.current;
  const closeSafely = () => {
    if (busy) return;
    if (dirty && typeof window !== "undefined" && !window.confirm("لديك تغييرات غير محفوظة. هل تريد الإغلاق والتخلص منها؟")) return;
    if (onClose) onClose();
  };
  const set = (k, v) => setValues((p) => ({ ...p, [k]: v }));
  async function submit() {
    const errs = {};
    fields.forEach((f) => {
      if (f.show && !f.show(values)) return;
      const v = values[f.key];
      const empty = v == null || v === "" || (Array.isArray(v) && !v.length);
      if (f.required && (typeof f.required === "function" ? f.required(values) : true) && empty) errs[f.key] = "مطلوب";
      else if (f.validate && !empty) { const m = f.validate(v, values); if (m) errs[f.key] = m; }
    });
    const formLevel = validate ? validate(values) : null;
    if (formLevel) { if (typeof formLevel === "string") setFormErr(formLevel); else Object.assign(errs, formLevel); }
    setErrors(errs); if (Object.keys(errs).length || (typeof formLevel === "string" && formLevel)) return;
    setFormErr(""); setBusy(true);
    try { const r = await onSubmit(values); if (r === false) { setBusy(false); return; } baseline.current = JSON.stringify(values); } catch (e) { setFormErr(e && e.message ? e.message : "تعذّر الحفظ"); setBusy(false); return; }
    setBusy(false);
  }
  return (
    <Modal title={title} onClose={closeSafely} wide={wide} footer={<><Btn kind="primary" onClick={submit} disabled={busy}>{busy ? "جاري الحفظ..." : submitLabel || "حفظ"}</Btn><Btn onClick={closeSafely} disabled={busy}>إلغاء</Btn>{footerExtra}</>}>
      <div style={{ display: "grid", gridTemplateColumns: wide ? "repeat(2,minmax(0,1fr))" : "1fr", gap: "0 14px" }}>
        {fields.filter((f) => !f.show || f.show(values)).map((f) => (
          <div key={f.key} style={{ gridColumn: f.span === 2 || f.type === "textarea" ? "1 / -1" : undefined }}>
            <Field label={f.label} hint={f.hint} error={errors[f.key]} required={!!f.required}>
              {f.disabled && f.disabled(values) ? <div style={{ fontSize: 12.5, color: C.muted, padding: "8px 0" }}>{String(values[f.key] ?? "—")}</div> : <FieldInput f={f} v={values[f.key]} set={(x) => set(f.key, x)} values={values} />}
            </Field>
          </div>
        ))}
      </div>
      {children && children(values, set)}
      {formErr && <div style={{ fontSize: 12, color: C.bad, background: "rgba(239,68,68,0.07)", padding: "8px 10px", borderRadius: 8 }}>{formErr}</div>}
    </Modal>
  );
}
// Drag-and-drop board: columns [{id,label,color,items:[...]}], renderCard(item), onMove(itemId, toColId)
export function Board({ columns, renderCard, onMove, empty }) {
  const [over, setOver] = useState(null);
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${columns.length},minmax(220px,1fr))`, gap: 10, overflowX: "auto", paddingBottom: 6 }}>
      {columns.map((col) => (
        <div key={col.id} onDragOver={(e) => { e.preventDefault(); setOver(col.id); }} onDragLeave={() => setOver(null)}
          onDrop={(e) => { e.preventDefault(); setOver(null); const id = e.dataTransfer.getData("text/plain"); if (id && onMove) onMove(id, col.id); }}
          style={{ background: over === col.id ? "rgba(239,159,39,0.08)" : "rgba(0,0,0,0.03)", borderRadius: 10, padding: 8, minHeight: 120, border: `1px solid ${over === col.id ? A : "transparent"}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, marginBottom: 8, color: C.dim }}>{col.color && <Dot color={col.color} />}{col.label}<span style={{ fontWeight: 500, color: C.muted }}>({col.items.length})</span></div>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {col.items.map((it) => <div key={it.id} draggable={!!onMove} onDragStart={(e) => e.dataTransfer.setData("text/plain", it.id)} style={{ cursor: onMove ? "grab" : "default" }}>{renderCard(it)}</div>)}
            {!col.items.length && <div style={{ fontSize: 11, color: C.muted, textAlign: "center", padding: 10 }}>{empty || "—"}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}
export function SearchBar({ value, onChange, placeholder, children }) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
      <input style={{ ...S.inp, maxWidth: 280 }} placeholder={placeholder || "بحث..."} value={value} onChange={(e) => onChange(e.target.value)} />
      {children}
    </div>
  );
}
export function Stat({ label, value, sub, color, onClick }) {
  return (
    <div onClick={onClick} style={{ ...S.card, padding: "12px 14px", cursor: onClick ? "pointer" : "default", borderTop: `3px solid ${color || A}` }}>
      <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color: color || C.text, lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 10.5, color: C.muted, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}
export function Skeleton() { return <div style={{ textAlign: "center", padding: 50, color: C.muted, fontSize: 13 }}><div style={{ width: 28, height: 28, border: `3px solid ${A}30`, borderTopColor: A, borderRadius: "50%", margin: "0 auto 10px", animation: "spin 0.8s linear infinite" }} />جاري التحميل...</div>; }
export function ErrorState({ error, onRetry }) {
  return <div style={{ ...S.card, textAlign: "center", padding: 30 }}><div style={{ fontSize: 30 }}>⚠️</div><div style={{ fontSize: 14, fontWeight: 700, margin: "6px 0" }}>تعذّر تحميل البيانات</div><div dir="ltr" style={{ fontSize: 10, color: C.muted, marginBottom: 10 }}>{String((error && error.message) || error || "")}{error && error.code ? " [" + error.code + "]" : ""}</div><Btn kind="primary" onClick={onRetry}>🔄 إعادة المحاولة</Btn></div>;
}
