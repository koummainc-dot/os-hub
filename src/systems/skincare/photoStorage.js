import { supabase } from "../../core/supabase.js";
import { buildSkinPhotoPaths, validateSkinPhotoFile, validateSkinPhotoMetadata } from "./photoDomain.js";

const BUCKET = "skincare-progress";
const MAX_EDGE = 3200;
const THUMB_EDGE = 480;
const MAX_PIXELS = 40000000;

function canvasBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("تعذر تجهيز الصورة بأمان داخل المتصفح.")), type, quality);
  });
}

async function prepareImageAssets(file) {
  if (typeof createImageBitmap !== "function") throw new Error("المتصفح لا يدعم معالجة الصور الآمنة المطلوبة.");
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    if (!bitmap.width || !bitmap.height || bitmap.width * bitmap.height > MAX_PIXELS) throw new Error("أبعاد الصورة كبيرة جدًا؛ الحد الأقصى 40 ميجابكسل.");
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const originalCanvas = document.createElement("canvas");
    originalCanvas.width = width;
    originalCanvas.height = height;
    const originalContext = originalCanvas.getContext("2d", { alpha: file.type === "image/png" });
    if (!originalContext) throw new Error("تعذر تجهيز الصورة.");
    originalContext.drawImage(bitmap, 0, 0, width, height);
    const original = await canvasBlob(originalCanvas, file.type, file.type === "image/png" ? undefined : 0.9);
    if (original.size > 10 * 1024 * 1024) throw new Error("الصورة بعد تجهيزها ما زالت أكبر من 10 ميجابايت.");

    const thumbScale = Math.min(1, THUMB_EDGE / Math.max(width, height));
    const thumbCanvas = document.createElement("canvas");
    thumbCanvas.width = Math.max(1, Math.round(width * thumbScale));
    thumbCanvas.height = Math.max(1, Math.round(height * thumbScale));
    const thumbContext = thumbCanvas.getContext("2d");
    if (!thumbContext) throw new Error("تعذر إنشاء الصورة المصغرة.");
    thumbContext.drawImage(originalCanvas, 0, 0, thumbCanvas.width, thumbCanvas.height);
    const thumbnail = await canvasBlob(thumbCanvas, "image/webp", 0.78);
    if (thumbnail.type !== "image/webp") throw new Error("المتصفح لا يدعم إنشاء صورة مصغرة WebP آمنة.");
    return { original, thumbnail, mimeType: original.type, width, height };
  } finally {
    bitmap.close?.();
  }
}

async function readWorkspaceRecord({ workspaceId, collection, id }) {
  const { data, error } = await supabase.from("workspace_records")
    .select("id,data,deleted")
    .eq("workspace_id", workspaceId)
    .eq("system_id", "skincare")
    .eq("collection", collection)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

async function verifyDiaryEntry(workspaceId, diaryEntry) {
  if (!diaryEntry?.id || !diaryEntry?.date) throw new Error("اختر إدخالًا يوميًا صالحًا قبل رفع الصورة.");
  const row = await readWorkspaceRecord({ workspaceId, collection: "skin_diary", id: diaryEntry.id });
  if (!row || row.deleted || row.data?.deleted_at || row.data?.date !== diaryEntry.date) {
    throw new Error("إدخال اليوم غير موجود أو لم تعد لديك صلاحية الوصول إليه.");
  }
}

async function removeObjects(paths) {
  const unique = [...new Set(paths.filter(Boolean))];
  if (!unique.length) return;
  const { error } = await supabase.storage.from(BUCKET).remove(unique);
  if (error) throw error;
}

export async function uploadSkinPhoto({ workspaceId, diaryEntry, file, lighting, angle, notes, photoId, storeApi }) {
  if (!workspaceId) throw new Error("مساحة العمل غير محددة.");
  if (!storeApi?.putStrict) throw new Error("طبقة التخزين لا تدعم الحفظ الصارم؛ أوقفنا الرفع لتجنب سجل يتيم.");
  const fileCheck = validateSkinPhotoFile(file);
  if (!fileCheck.ok) throw new Error(fileCheck.error);
  const metadataCheck = validateSkinPhotoMetadata({ lighting, angle, notes });
  await verifyDiaryEntry(workspaceId, diaryEntry);

  const assets = await prepareImageAssets(file);
  const paths = buildSkinPhotoPaths({ workspaceId, diaryId: diaryEntry.id, photoId, mimeType: assets.mimeType });
  const bucket = supabase.storage.from(BUCKET);
  let originalUploaded = false;
  let thumbnailUploaded = false;
  try {
    const { error: originalError } = await bucket.upload(paths.objectPath, assets.original, {
      contentType: assets.mimeType, cacheControl: "60", upsert: false,
    });
    if (originalError) throw originalError;
    originalUploaded = true;
    const { error: thumbnailError } = await bucket.upload(paths.thumbnailPath, assets.thumbnail, {
      contentType: "image/webp", cacheControl: "60", upsert: false,
    });
    if (thumbnailError) throw thumbnailError;
    thumbnailUploaded = true;

    const record = {
      id: photoId,
      diaryId: diaryEntry.id,
      date: diaryEntry.date,
      ...paths,
      mimeType: assets.mimeType,
      sizeBytes: assets.original.size,
      width: assets.width,
      height: assets.height,
      lighting: metadataCheck.value.lighting,
      angle: metadataCheck.value.angle,
      notes: metadataCheck.value.notes,
      createdAt: new Date().toISOString(),
    };
    const saved = await storeApi.putStrict("skin_photos", record);
    if (!saved || saved._syncPending) throw new Error("لم يؤكد الخادم تسجيل الصورة؛ لن نترك ملفًا دون سجل.");
    return saved;
  } catch (error) {
    try {
      await removeObjects([
        originalUploaded ? paths.objectPath : null,
        thumbnailUploaded ? paths.thumbnailPath : null,
      ]);
    } catch (cleanupError) {
      throw new Error((error?.message || "فشل رفع الصورة.") + " كما تعذر تنظيف كل الملفات المؤقتة؛ أبقيناها خاصة وسجّلنا الحاجة إلى مراجعة التخزين.");
    }
    throw error;
  }
}

export async function getSkinPhotoSignedUrls({ workspaceId, photo }) {
  if (!workspaceId || !photo?.id || !photo.objectPath || !photo.thumbnailPath) throw new Error("بيانات الصورة غير مكتملة.");
  const row = await readWorkspaceRecord({ workspaceId, collection: "skin_photos", id: photo.id });
  if (!row || row.deleted || row.data?.deleted_at) throw new Error("الصورة محذوفة أو لا تملك صلاحية عرضها.");
  const expectedPaths = buildSkinPhotoPaths({ workspaceId, diaryId: row.data?.diaryId, photoId: row.id, mimeType: row.data?.mimeType });
  if (
    expectedPaths.objectPath !== row.data?.objectPath ||
    expectedPaths.thumbnailPath !== row.data?.thumbnailPath ||
    row.data?.objectPath !== photo.objectPath ||
    row.data?.thumbnailPath !== photo.thumbnailPath ||
    row.data?.diaryId !== photo.diaryId ||
    row.data?.date !== photo.date
  ) throw new Error("بيانات الصورة أو مساراتها لا تطابق العقد الموثوق؛ أوقفنا إنشاء الرابط.");
  const [original, thumbnail] = await Promise.all([
    supabase.storage.from(BUCKET).createSignedUrl(row.data.objectPath, 300),
    supabase.storage.from(BUCKET).createSignedUrl(row.data.thumbnailPath, 300),
  ]);
  if (original.error) throw original.error;
  if (thumbnail.error) throw thumbnail.error;
  if (!original.data?.signedUrl || !thumbnail.data?.signedUrl) throw new Error("تعذر إنشاء روابط عرض مؤقتة للصورة.");
  return { originalUrl: original.data.signedUrl, thumbnailUrl: thumbnail.data.signedUrl, expiresIn: 300 };
}

export async function deleteSkinPhoto({ workspaceId, photo, storeApi }) {
  if (!workspaceId || !photo?.id || !photo.objectPath || !photo.thumbnailPath) throw new Error("بيانات الصورة غير صالحة للحذف.");
  const row = await readWorkspaceRecord({ workspaceId, collection: "skin_photos", id: photo.id });
  if (!row || row.deleted) throw new Error("سجل الصورة غير موجود أو لم تعد تملك صلاحية الوصول.");
  const expectedPaths = buildSkinPhotoPaths({ workspaceId, diaryId: row.data?.diaryId, photoId: row.id, mimeType: row.data?.mimeType });
  if (
    expectedPaths.objectPath !== row.data?.objectPath ||
    expectedPaths.thumbnailPath !== row.data?.thumbnailPath ||
    row.data?.objectPath !== photo.objectPath ||
    row.data?.thumbnailPath !== photo.thumbnailPath
  ) throw new Error("مسارات الملفات لا تطابق سجل الصورة؛ أوقفنا الحذف.");

  let tombstone = photo;
  if (!row.data?.deleted_at) {
    tombstone = await storeApi.putStrict("skin_photos", {
      ...photo,
      deleted_at: new Date().toISOString(),
      storagePurgePending: true,
    });
    if (!tombstone) throw new Error("تعذر أرشفة سجل الصورة؛ لم نحذف الملفات.");
  }
  if (row.data?.storagePurgedAt || tombstone?.storagePurgedAt) return tombstone;

  await removeObjects([row.data.objectPath, row.data.thumbnailPath]);
  const saved = await storeApi.putStrict("skin_photos", {
    ...tombstone,
    storagePurgedAt: new Date().toISOString(),
    storagePurgePending: false,
  });
  if (!saved) {
    await storeApi.reload?.();
    throw new Error("أُخفيت الصورة من المعرض، لكن تعذر تأكيد حذف ملفاتها. أعد محاولة التنظيف من سجل المحذوفات.");
  }
  return saved;
}


function blobToDataUrl(blob) {
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>resolve(String(reader.result||""));
    reader.onerror=()=>reject(new Error("تعذر قراءة ملف الصورة للنسخ الاحتياطي."));
    reader.readAsDataURL(blob);
  });
}

function dataUrlToBlob(value, expectedType) {
  const match=/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(value||""));
  if(!match||match[1]!==expectedType) throw new Error("ملف صورة النسخة الاحتياطية غير صالح أو نوعه لا يطابق metadata.");
  const binary=atob(match[2]);
  const bytes=new Uint8Array(binary.length);
  for(let i=0;i<binary.length;i++) bytes[i]=binary.charCodeAt(i);
  return new Blob([bytes],{type:match[1]});
}

export async function exportSkinPhotoFiles({workspaceId,photos=[],maxBytes=32*1024*1024}={}) {
  const files={};let totalBytes=0;
  for(const photo of photos.filter(item=>!item.deleted_at&&!item._deleted&&!item.storagePurgedAt)){
    const urls=await getSkinPhotoSignedUrls({workspaceId,photo});
    const [originalResponse,thumbResponse]=await Promise.all([fetch(urls.originalUrl),fetch(urls.thumbnailUrl)]);
    if(!originalResponse.ok||!thumbResponse.ok) throw new Error("تعذر تنزيل صورة أو مصغرها أثناء إنشاء النسخة الاحتياطية.");
    const [original,thumbnail]=await Promise.all([originalResponse.blob(),thumbResponse.blob()]);
    totalBytes+=original.size+thumbnail.size;
    if(totalBytes>maxBytes) throw new Error("إجمالي ملفات الصور تجاوز 32 ميجابايت حتى تبقى نسخة JSON ضمن حد الرفع. صدّر بيانات السجلات دون الصور أو قسّم النسخ.");
    files[photo.id]={original:await blobToDataUrl(original),thumbnail:await blobToDataUrl(thumbnail),originalType:original.type,thumbnailType:thumbnail.type,originalBytes:original.size,thumbnailBytes:thumbnail.size};
  }
  return {files,totalBytes,photoCount:Object.keys(files).length};
}

export async function restoreSkinPhotoFiles({workspaceId,photo,assets}={}) {
  if(!workspaceId||!photo?.id||!assets?.original||!assets?.thumbnail) throw new Error("ملفات الصورة غير مكتملة.");
  const row=await readWorkspaceRecord({workspaceId,collection:"skin_diary",id:photo.diaryId});
  if(!row||row.deleted||row.data?.deleted_at||row.data?.date!==photo.date) throw new Error("إدخال اليوم غير موجود بعد استعادة السجلات؛ لم نرفع الصورة.");
  const expected=buildSkinPhotoPaths({workspaceId,diaryId:photo.diaryId,photoId:photo.id,mimeType:photo.mimeType});
  if(expected.objectPath!==photo.objectPath||expected.thumbnailPath!==photo.thumbnailPath) throw new Error("مسارات ملفات الصورة لا تطابق مسارات مساحة العمل الحالية.");
  const original=dataUrlToBlob(assets.original,photo.mimeType);
  const thumbnail=dataUrlToBlob(assets.thumbnail,"image/webp");
  if(original.size>10*1024*1024||thumbnail.size>10*1024*1024) throw new Error("أحد ملفات الصورة يتجاوز الحد المسموح.");
  const bucket=supabase.storage.from(BUCKET);
  let originalUploaded=false;
  try{
    const a=await bucket.upload(expected.objectPath,original,{contentType:photo.mimeType,cacheControl:"60",upsert:false});
    if(a.error) throw a.error;
    originalUploaded=true;
    const b=await bucket.upload(expected.thumbnailPath,thumbnail,{contentType:"image/webp",cacheControl:"60",upsert:false});
    if(b.error) throw b.error;
    return {ok:true,photoId:photo.id,bytes:original.size+thumbnail.size};
  }catch(error){
    if(originalUploaded){try{await removeObjects([expected.objectPath]);}catch{}}
    throw error;
  }
}
