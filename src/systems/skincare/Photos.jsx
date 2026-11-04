import React, { useEffect, useState } from "react";
import { getSkinPhotoSignedUrls } from "./photoStorage.js";

const C = { ink: "#182230", muted: "#64748B", line: "#E2E8F0", white: "#FFFFFF", accent: "#A855F7", danger: "#B91C1C", soft: "#FAF5FF" };
const panel = { background: C.white, border: "1px solid " + C.line, borderRadius: 14, padding: 15, marginBottom: 12 };
const field = { width: "100%", boxSizing: "border-box", padding: "9px 10px", border: "1px solid " + C.line, borderRadius: 9, font: "inherit", color: C.ink, background: C.white };
const label = { display: "grid", gap: 5, color: C.muted, fontSize: 12, fontWeight: 650 };
const btn = (primary = false, danger = false) => ({ border: "1px solid " + (primary ? C.accent : danger ? "#FECACA" : C.line), background: primary ? C.accent : C.white, color: primary ? C.white : danger ? C.danger : C.ink, borderRadius: 9, padding: "8px 11px", font: "inherit", fontSize: 12, fontWeight: 700, cursor: "pointer" });
const dateLabel = value => { try { return new Date(value + "T12:00:00Z").toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" }); } catch { return value; } };

export default function PhotosView({ workspaceId, entries, photos, deletedPhotos, isDemo, canEdit, busy, onUpload, onDelete, onPurge }) {
  const [diaryId, setDiaryId] = useState(entries[0]?.id || "");
  const [file, setFile] = useState(null);
  const [lighting, setLighting] = useState("natural");
  const [angle, setAngle] = useState("front");
  const [notes, setNotes] = useState("");
  const [signed, setSigned] = useState({});
  const [signErrors, setSignErrors] = useState({});
  const [leftId, setLeftId] = useState(photos[1]?.id || photos[0]?.id || "");
  const [rightId, setRightId] = useState(photos[0]?.id || "");
  const [loadingUrls, setLoadingUrls] = useState(false);
  const [urlVersion, setUrlVersion] = useState(0);

  const selectedDiary = entries.find(entry => entry.id === diaryId) || null;

  useEffect(() => {
    if (!entries.some(entry => entry.id === diaryId)) setDiaryId(entries[0]?.id || "");
  }, [entries, diaryId]);

  useEffect(() => {
    if (!photos.length || isDemo || !workspaceId) { setSigned({}); setSignErrors({}); setLoadingUrls(false); return; }
    let cancelled = false;
    setSigned({});
    setSignErrors({});
    setLoadingUrls(true);
    Promise.all(photos.map(async photo => {
      try {
        const urls = await getSkinPhotoSignedUrls({ workspaceId, photo });
        return { id: photo.id, urls };
      } catch (error) {
        return { id: photo.id, error: error?.message || "تعذر إنشاء رابط آمن." };
      }
    })).then(results => {
      if (cancelled) return;
      const nextUrls = {};
      const nextErrors = {};
      results.forEach(result => {
        if (result.urls) nextUrls[result.id] = result.urls;
        else nextErrors[result.id] = result.error;
      });
      setSigned(nextUrls);
      setSignErrors(nextErrors);
    }).finally(() => { if (!cancelled) setLoadingUrls(false); });
    return () => { cancelled = true; };
  }, [workspaceId, isDemo, photos, urlVersion]);

  const compareLeft = photos.find(photo => photo.id === leftId) || null;
  const compareRight = photos.find(photo => photo.id === rightId) || null;

  const submit = async e => {
    e.preventDefault();
    if (!file || !selectedDiary || !canEdit || busy || isDemo) return;
    const saved = await onUpload({ file, diaryEntry: selectedDiary, lighting, angle, notes });
    if (!saved) return;
    setFile(null);
    setNotes("");
    const input = document.getElementById("skincare-photo-file");
    if (input) input.value = "";
  };

  return <>
    <section style={panel}>
      <b>صور تقدم البشرة</b>
      <p style={{ color: C.muted, fontSize: 11, lineHeight: 1.8, margin: "6px 0 12px" }}>الصور تُحفظ في مخزن خاص، وتُعاد معالجتها داخل المتصفح لإزالة بيانات EXIF وتقليل الأبعاد قبل الرفع. روابط العرض مؤقتة وليست روابط عامة.</p>
      {isDemo ? <p style={{ color: C.muted, fontSize: 12 }}>رفع الصور غير متاح في الوضع التجريبي؛ لا نحتفظ بصور البشرة في تخزين محلي.</p> : !canEdit ? <p style={{ color: C.muted, fontSize: 12 }}>صلاحية العرض فقط. يمكنك مشاهدة الصور المصرح بها دون رفع أو حذف.</p> : !entries.length ? <p style={{ color: C.muted, fontSize: 12 }}>سجّل يومًا في مفكرة البشرة أولًا، ثم أضف صورة مرتبطة به.</p> :
      <form onSubmit={submit} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 10 }}>
        <label style={label}>إدخال اليوم المرتبط
          <select style={field} value={diaryId} onChange={e => setDiaryId(e.target.value)}>
            {entries.map(entry => <option key={entry.id} value={entry.id}>{dateLabel(entry.date)}</option>)}
          </select>
        </label>
        <label style={label}>الصورة (JPG / PNG / WEBP، حتى 10MB)
          <input id="skincare-photo-file" type="file" accept="image/jpeg,image/png,image/webp" style={{ ...field, padding: 7 }} onChange={e => setFile(e.target.files?.[0] || null)} />
        </label>
        <label style={label}>الإضاءة
          <select style={field} value={lighting} onChange={e => setLighting(e.target.value)}>
            <option value="natural">ضوء طبيعي</option><option value="indoor">إضاءة داخلية</option><option value="flash">فلاش</option><option value="unknown">غير محددة</option>
          </select>
        </label>
        <label style={label}>زاوية التصوير
          <select style={field} value={angle} onChange={e => setAngle(e.target.value)}>
            <option value="front">أمامية</option><option value="left">الجانب الأيسر</option><option value="right">الجانب الأيمن</option><option value="closeup">لقطة قريبة</option><option value="unknown">غير محددة</option>
          </select>
        </label>
        <label style={{ ...label, gridColumn: "1 / -1" }}>ملاحظات التصوير<textarea style={{ ...field, minHeight: 65 }} maxLength={1000} value={notes} onChange={e => setNotes(e.target.value)} placeholder="مثال: نفس المكان والوقت قدر الإمكان" /></label>
        <div style={{ gridColumn: "1 / -1" }}><button type="submit" style={btn(true)} disabled={!file || !selectedDiary || busy}>{busy ? "جارٍ تجهيز ورفع الصورة…" : "رفع الصورة وربطها باليوم"}</button></div>
      </form>}
    </section>

    <section style={panel}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <b>معرض الصور ({photos.length})</b><div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ color: C.muted, fontSize: 11 }}>{loadingUrls ? "جارٍ تجهيز روابط عرض مؤقتة…" : "الروابط صالحة لمدة 5 دقائق"}</span><button type="button" style={btn()} disabled={loadingUrls || isDemo} onClick={() => setUrlVersion(value => value + 1)}>تحديث الصور</button></div>
      </div>
      {!photos.length && <p style={{ color: C.muted, fontSize: 12 }}>لا توجد صور نشطة بعد.</p>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(190px,1fr))", gap: 12, marginTop: 12 }}>
        {photos.map(photo => <article key={photo.id} style={{ border: "1px solid " + C.line, borderRadius: 12, overflow: "hidden" }}>
          {signed[photo.id]?.thumbnailUrl ? <a href={signed[photo.id].originalUrl} target="_blank" rel="noreferrer"><img src={signed[photo.id].thumbnailUrl} alt={"صورة تقدم بتاريخ " + photo.date} loading="lazy" style={{ display: "block", width: "100%", aspectRatio: "4 / 3", objectFit: "cover" }} /></a> :
            <div style={{ aspectRatio: "4 / 3", display: "grid", placeItems: "center", background: C.soft, color: C.muted, fontSize: 11, padding: 12, textAlign: "center" }}>{signErrors[photo.id] || "جارٍ تحميل الصورة"}</div>}
          <div style={{ padding: 10 }}>
            <b style={{ fontSize: 12 }}>{dateLabel(photo.date)}</b>
            <div style={{ color: C.muted, fontSize: 10, marginTop: 4 }}>الإضاءة: {({natural:"طبيعية",indoor:"داخلية",flash:"فلاش",unknown:"غير محددة"})[photo.lighting] || "غير محددة"} · الزاوية: {({front:"أمامية",left:"يسار",right:"يمين",closeup:"قريبة",unknown:"غير محددة"})[photo.angle] || "غير محددة"}</div>
            {photo.notes && <p style={{ color: C.muted, fontSize: 11, margin: "6px 0 0" }}>{photo.notes}</p>}
            {canEdit && <button type="button" style={{ ...btn(false, true), marginTop: 8 }} disabled={busy} onClick={() => onDelete(photo)}>حذف الصورة والنسخة المصغرة</button>}
          </div>
        </article>)}
      </div>
    </section>

    <section style={panel}>
      <b>مقارنة صورتين</b>
      <p style={{ color: C.muted, fontSize: 11, margin: "5px 0 12px" }}>المقارنة هنا بصرية جنبًا إلى جنب؛ لا يصدر النظام حكمًا طبيًا أو تقييمًا آليًا لتغير البشرة. راعِ اختلاف الإضاءة والزاوية.</p>
      {photos.length < 2 ? <p style={{ color: C.muted, fontSize: 12 }}>أضف صورتين على الأقل لتفعيل المقارنة.</p> : <>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 10 }}>
          <label style={label}>الصورة الأولى<select style={field} value={leftId} onChange={e => setLeftId(e.target.value)}>{photos.map(photo => <option key={photo.id} value={photo.id}>{dateLabel(photo.date)}</option>)}</select></label>
          <label style={label}>الصورة الثانية<select style={field} value={rightId} onChange={e => setRightId(e.target.value)}>{photos.map(photo => <option key={photo.id} value={photo.id}>{dateLabel(photo.date)}</option>)}</select></label>
        </div>
        {compareLeft && compareRight && leftId === rightId && <p style={{ color: C.danger, fontSize: 11 }}>اختر صورتين مختلفتين.</p>}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12, marginTop: 12 }}>
          {[compareLeft, compareRight].map((photo, index) => photo && <div key={photo.id + "-" + index} style={{ border: "1px solid " + C.line, borderRadius: 10, overflow: "hidden" }}>
            {signed[photo.id]?.originalUrl ? <img src={signed[photo.id].originalUrl} alt={"مقارنة صورة " + (index + 1)} style={{ width: "100%", display: "block", maxHeight: 420, objectFit: "contain", background: "#F8FAFC" }} /> : <div style={{ padding: 30, color: C.muted, fontSize: 11 }}>الصورة غير متاحة أو انتهت صلاحية رابطها.</div>}
            <div style={{ padding: 10, fontSize: 11 }}><b>{dateLabel(photo.date)}</b><div style={{ color: C.muted, marginTop: 4 }}>الإضاءة: {photo.lighting} · الزاوية: {photo.angle}</div></div>
          </div>)}
        </div>
      </>}
    </section>

    {!!deletedPhotos.length && <section style={panel}>
      <b>سجل الصور المحذوفة ({deletedPhotos.length})</b>
      <p style={{ color: C.muted, fontSize: 11 }}>تُحتفظ ببيانات السجل فقط لأغراض الأثر والتدقيق؛ ملفات الصور الأصلية والمصغرة تُحذف من التخزين ولا يمكن استعادتها.</p>
      {deletedPhotos.map(photo => <div key={photo.id} style={{ borderTop: "1px solid " + C.line, padding: "8px 0", fontSize: 11, color: C.muted }}>{dateLabel(photo.date)} · {photo.storagePurgedAt ? "تم حذف الملفات" : "حذف الملفات قيد الاستكمال"} {canEdit && !photo.storagePurgedAt && <button type="button" style={btn(false, true)} disabled={busy} onClick={() => onPurge(photo)}>إعادة محاولة تنظيف الملفات</button>}</div>)}
    </section>}
  </>;
}
