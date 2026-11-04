import React, { useMemo, useRef, useState } from "react";
import { createSkinBackup, validateSkinBackup, compareSkinBackupWithCurrent } from "./backupDomain.js";
import { supabase } from "../../core/supabase.js";
import { exportSkinPhotoFiles, restoreSkinPhotoFiles } from "./photoStorage.js";

const box = { background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 14, padding: 15, marginBottom: 12 };
const muted = { color: "#64748B", fontSize: 12, lineHeight: 1.8 };
const button = (primary = false) => ({ border: "1px solid " + (primary ? "#A855F7" : "#E2E8F0"), background: primary ? "#A855F7" : "#FFFFFF", color: primary ? "#FFFFFF" : "#182230", borderRadius: 9, padding: "9px 12px", font: "inherit", fontSize: 12, fontWeight: 700, cursor: "pointer" });

export default function SkincareBackup({ records, canEdit, pending = false, workspaceId, onRestored }) {
  const inputRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [includePhotos, setIncludePhotos] = useState(true);
  const [restoring, setRestoring] = useState(false);
  const [restoreReport, setRestoreReport] = useState(null);
  const [pendingPhotoRestore, setPendingPhotoRestore] = useState([]);
  const [photoRetryBackup, setPhotoRetryBackup] = useState(null);
  const comparison = useMemo(() => preview?.validated?.ok ? compareSkinBackupWithCurrent(preview.validated, records) : null, [preview, records]);

  const exportBackup = async () => {
    if (!canEdit || pending || !workspaceId) return;
    setError(""); setExporting(true); setRestoreReport(null);
    try {
      const result = createSkinBackup({ records });
      if (!result.ok) throw new Error(result.error);
      let backup = result.backup;
      if (includePhotos) {
        const photos = Object.values(records?.skin_photos || {});
        const photoBundle = await exportSkinPhotoFiles({ workspaceId, photos });
        backup = { ...backup, includes: { ...backup.includes, photoFiles: true }, photoFiles: photoBundle.files,
          photoManifest: { count: photoBundle.photoCount, bytes: photoBundle.totalBytes, format: "data-url-base64" } };
      }
      const blob = new Blob([JSON.stringify(backup)], { type: "application/json;charset=utf-8" });
      if (blob.size > 50 * 1024 * 1024) throw new Error("حجم النسخة تجاوز 50 ميجابايت؛ أزل الصور أو قسّم النسخة.");
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "skincare-os-full-backup-" + new Date().toISOString().slice(0, 10) + ".json";
      document.body.appendChild(anchor); anchor.click(); anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (cause) {
      setError(cause?.message || "تعذر إنشاء النسخة الاحتياطية.");
    } finally { setExporting(false); }
  };

  const restoreBackup = async () => {
    if (!canEdit || !workspaceId || !preview?.validated?.ok || restoring || pending) return;
    if (comparison?.existingRecords) return setError("توجد معرّفات متعارضة. سياسة الاستعادة الحالية ترفض العملية بالكامل ولا تستبدل أي سجل.");
    const backup = preview.validated.backup;
    if (Object.values(backup.collections || {}).flat().some(row => Array.isArray(row.visibleTo) && row.visibleTo.length)) {
      return setError("تحتوي النسخة على صلاحيات مرئية لأعضاء مساحة العمل المصدر. لا يمكن نقل هذه الصلاحيات تلقائيًا؛ أزلها أو أنشئ نسخة مخصصة بعد مراجعة الأعضاء.");
    }
    if (!window.confirm("سيتم استيراد كل السجلات في معاملة واحدة. أي تعارض يوقف العملية بالكامل. هل تريد المتابعة؟")) return;
    setRestoring(true); setError(""); setRestoreReport(null); setPendingPhotoRestore([]); setPhotoRetryBackup(backup);
    try {
      const { data, error: rpcError } = await supabase.rpc("skincare_restore_records_atomic", {
        p_workspace_id: workspaceId,
        p_collections: backup.collections,
      });
      if (rpcError) throw rpcError;
      if (!data || data.ok !== true) throw new Error(data?.error || "لم يؤكد الخادم اكتمال الاستعادة الذرية.");
      await onRestored?.();
      let restoredPhotos=0; const failed=[];
      if (backup.includes?.photoFiles === true) {
        const photoRows=backup.collections?.skin_photos || [];
        for (const row of photoRows) {
          const assets=backup.photoFiles?.[row.id];
          if (!assets || row.deleted || row.data?.deleted_at || row.data?.storagePurgedAt) continue;
          try { await restoreSkinPhotoFiles({workspaceId,photo:row.data,assets}); restoredPhotos++; }
          catch(cause){ failed.push({photoId:row.id,error:cause?.message||"تعذر رفع الصورة"}); }
        }
      }
      await onRestored?.();
      setPendingPhotoRestore(failed);
      setRestoreReport({records:data.inserted ?? preview.validated.totalRecords,restoredPhotos,failedPhotos:failed.length,metadataOnly:backup.includes?.photoFiles!==true});
      setPreview(null);
    } catch (cause) {
      setError(cause?.message || "فشلت الاستعادة؛ لم يتم استبدال أي سجل موجود.");
    } finally { setRestoring(false); }
  };

  const retryPhotoRestore = async () => {
    if (!workspaceId || !pendingPhotoRestore.length || !photoRetryBackup || restoring) return;
    setRestoring(true); setError("");
    const remaining=[];
    let restored=0;
    try {
      for (const item of pendingPhotoRestore) {
        const row=(photoRetryBackup.collections?.skin_photos||[]).find(x=>x.id===item.photoId);
        const assets=photoRetryBackup.photoFiles?.[item.photoId];
        if(!row||!assets){remaining.push(item);continue;}
        try { await restoreSkinPhotoFiles({workspaceId,photo:row.data,assets}); restored++; }
        catch(cause){remaining.push({photoId:item.photoId,error:cause?.message||"تعذر رفع الصورة"});}
      }
      setPendingPhotoRestore(remaining);
      setRestoreReport(current=>current?({...current,restoredPhotos:current.restoredPhotos+restored,failedPhotos:remaining.length}):current);
      if(!remaining.length) setPhotoRetryBackup(null);
      await onRestored?.();
    } finally { setRestoring(false); }
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
    <p style={muted}>أنشئ نسخة JSON من السجلات وملفات الصور الخاصة. الصور تُضمّن كبيانات Base64 داخل الملف؛ احتفظ بالنسخة في مكان مشفر وآمن.</p>
    {canEdit ? <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      <label style={{display:"flex",alignItems:"center",gap:6,fontSize:11,color:"#64748B"}}><input type="checkbox" checked={includePhotos} onChange={e=>setIncludePhotos(e.target.checked)} disabled={exporting}/> تضمين ملفات الصور</label>
      <button type="button" style={button(true)} disabled={pending || exporting || !workspaceId} onClick={exportBackup}>{exporting ? "جارٍ إنشاء النسخة…" : "تصدير نسخة احتياطية كاملة"}</button>
      <button type="button" style={button()} onClick={() => inputRef.current?.click()}>اختيار ملف للاستعادة</button>
      <input ref={inputRef} type="file" accept="application/json,.json" hidden onChange={event => readBackup(event.target.files?.[0])} />
    </div> : <p style={muted}>تحتاج صلاحية تعديل لاستخدام النسخ الاحتياطي.</p>}
    {pending && <p role="status" style={{ ...muted, color: "#B45309" }}>هناك عمليات حفظ جارية؛ انتظر اكتمالها قبل التصدير.</p>}
    {error && <p role="alert" style={{ color: "#B91C1C", fontSize: 12 }}>{error}</p>}
    {restoreReport && <p role="status" style={{fontSize:12,color:restoreReport.failedPhotos?"#B45309":"#15803D"}}>اكتملت استعادة {restoreReport.records} سجلًا. الصور المرفوعة: {restoreReport.restoredPhotos}. الصور التي تحتاج إعادة محاولة: {restoreReport.failedPhotos}. {restoreReport.metadataOnly?"النسخة لم تتضمن ملفات الصور.":""}</p>}
    {!!pendingPhotoRestore.length&&<div style={{fontSize:11,color:"#B45309"}}>تعذر استعادة الملفات التالية: {pendingPhotoRestore.map(x=>x.photoId).join("، ")}.<button type="button" style={button()} disabled={restoring} onClick={retryPhotoRestore}>إعادة محاولة رفع الصور</button></div>}
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
        {preview.validated.includesPhotoFiles && <p style={{fontSize:11,color:"#15803D"}}>الملف يحتوي على {preview.validated.backup.photoManifest?.count ?? Object.keys(preview.validated.backup.photoFiles||{}).length} حزمة صورة.</p>}
        <button type="button" style={button(true)} disabled={restoring || pending || !workspaceId || !!comparison?.existingRecords} onClick={restoreBackup}>{restoring?"جارٍ الاستعادة الذرية…":"تأكيد الاستعادة الآمنة"}</button>
        {comparison?.existingRecords>0&&<p style={{fontSize:11,color:"#B91C1C"}}>تم إيقاف الاستعادة بسبب {comparison.existingRecords} تعارض. لا يوجد استبدال أو تخطي تلقائي.</p>}
        <p style={{...muted,color:"#B45309"}}>استعادة سجلات قاعدة البيانات ذرية عبر RPC. ملفات Storage تُرفع بعدها كمرحلة مستقلة؛ إذا فشل رفع صورة، تظل السجلات محفوظة وتحتاج إعادة محاولة الصورة.</p>
        <p style={{ ...muted, color: "#B91C1C" }}>هذه معاينة فقط. لم يتم استيراد أي سجل أو تغيير بيانات مساحة العمل. تنفيذ الاستعادة ينتظر إكمال S7.2 (الاستيراد الذري وسياسة التعارض).</p>
      </> : <div role="alert"><p style={{ color: "#B91C1C", fontSize: 12 }}>تعذر اعتماد الملف:</p><ul style={muted}>{preview.validated.errors.map((item, index) => <li key={index}>{item}</li>)}</ul></div>}
    </div>}
  </section>;
}
