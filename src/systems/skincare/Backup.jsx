import React, { useMemo, useRef, useState } from "react";
import { createSkinBackup, validateSkinBackup, compareSkinBackupWithCurrent } from "./backupDomain.js";

const box = { background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 14, padding: 15, marginBottom: 12 };
const muted = { color: "#64748B", fontSize: 12, lineHeight: 1.8 };
const button = (primary = false) => ({ border: "1px solid " + (primary ? "#A855F7" : "#E2E8F0"), background: primary ? "#A855F7" : "#FFFFFF", color: primary ? "#FFFFFF" : "#182230", borderRadius: 9, padding: "9px 12px", font: "inherit", fontSize: 12, fontWeight: 700, cursor: "pointer" });

export default function SkincareBackup({ records, canEdit, pending = false }) {
  const inputRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);
  const comparison = useMemo(() => preview?.validated?.ok ? compareSkinBackupWithCurrent(preview.validated, records) : null, [preview, records]);

  const exportBackup = () => {
    if (!canEdit || pending) return;
    setError("");
    setExporting(true);
    try {
      const result = createSkinBackup({ records });
      if (!result.ok) throw new Error(result.error);
      const blob = new Blob([JSON.stringify(result.backup, null, 2)], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "skincare-os-backup-" + new Date().toISOString().slice(0, 10) + ".json";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (cause) {
      setError(cause?.message || "تعذر إنشاء النسخة الاحتياطية.");
    } finally {
      setExporting(false);
    }
  };

  const readBackup = async file => {
    setError("");
    setPreview(null);
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) return setError("حجم الملف أكبر من 50 ميجابايت.");
    try {
      const raw = await file.text();
      const validated = validateSkinBackup(raw);
      setPreview({ name: file.name, validated });
    } catch (cause) {
      setError(cause?.message || "تعذر قراءة الملف.");
    }
  };

  return <section style={box}>
    <h3 style={{ margin: "0 0 6px", fontSize: 15 }}>النسخ الاحتياطي والاستعادة</h3>
    <p style={muted}>أنشئ نسخة JSON من سجلات Skincare OS، بما فيها السجلات المحذوفة منطقيًا. ملف النسخة لا يحتوي ملفات الصور نفسها أو مرفقاتها الثنائية.</p>
    {canEdit ? <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      <button type="button" style={button(true)} disabled={pending || exporting} onClick={exportBackup}>{exporting ? "جارٍ إنشاء النسخة…" : "تصدير نسخة احتياطية"}</button>
      <button type="button" style={button()} onClick={() => inputRef.current?.click()}>اختيار ملف للاستعادة</button>
      <input ref={inputRef} type="file" accept="application/json,.json" hidden onChange={event => readBackup(event.target.files?.[0])} />
    </div> : <p style={muted}>تحتاج صلاحية تعديل لاستخدام النسخ الاحتياطي.</p>}
    {pending && <p role="status" style={{ ...muted, color: "#B45309" }}>هناك عمليات حفظ جارية؛ انتظر اكتمالها قبل التصدير.</p>}
    {error && <p role="alert" style={{ color: "#B91C1C", fontSize: 12 }}>{error}</p>}
    {preview && <div style={{ borderTop: "1px solid #E2E8F0", marginTop: 14, paddingTop: 12 }}>
      <b style={{ fontSize: 13 }}>معاينة الملف: {preview.name}</b>
      {preview.validated.ok ? <>
        <p style={{ color: "#15803D", fontSize: 12 }}>الملف سليم بنيويًا واجتاز فحص العلاقات الداخلية.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(125px,1fr))", gap: 8, margin: "10px 0" }}>
          <div><b>{preview.validated.totalRecords}</b><div style={muted}>إجمالي السجلات</div></div>
          <div><b>{comparison?.newRecords || 0}</b><div style={muted}>معرّفات غير موجودة حاليًا</div></div>
          <div><b>{comparison?.existingRecords || 0}</b><div style={muted}>تعارضات مع سجلات حالية</div></div>
        </div>
        <div style={muted}>{Object.entries(preview.validated.counts).filter(([, count]) => count).map(([name, count]) => name + ": " + count).join(" · ") || "النسخة لا تحتوي سجلات."}</div>
        {preview.validated.warnings.map((warning, index) => <p key={index} style={{ color: "#B45309", fontSize: 12 }}>{warning}</p>)}
        <p style={{ ...muted, color: "#B91C1C" }}>هذه معاينة فقط. لم يتم استيراد أي سجل أو تغيير بيانات مساحة العمل. تنفيذ الاستعادة ينتظر إكمال S7.2 (الاستيراد الذري وسياسة التعارض).</p>
      </> : <div role="alert"><p style={{ color: "#B91C1C", fontSize: 12 }}>تعذر اعتماد الملف:</p><ul style={muted}>{preview.validated.errors.map((item, index) => <li key={index}>{item}</li>)}</ul></div>}
    </div>}
  </section>;
}
