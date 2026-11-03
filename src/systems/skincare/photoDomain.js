const MIME_EXTENSIONS = Object.freeze({
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
});

export function validateSkinPhotoFile(file) {
  if (!file || !MIME_EXTENSIONS[file.type]) return { ok: false, error: "صيغة الصورة غير مدعومة. استخدم JPG أو PNG أو WEBP." };
  if (!Number.isFinite(file.size) || file.size < 1 || file.size > 10 * 1024 * 1024) {
    return { ok: false, error: "حجم الصورة يجب أن يكون أكبر من صفر ولا يتجاوز 10 ميجابايت." };
  }
  return { ok: true, value: { mimeType: file.type, extension: MIME_EXTENSIONS[file.type], sizeBytes: file.size } };
}

export function buildSkinPhotoPaths({ workspaceId, diaryId, photoId, mimeType }) {
  const checked = validateSkinPhotoFile({ type: mimeType, size: 1 });
  if (!checked.ok) throw new Error(checked.error);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(workspaceId || ""))) {
    throw new Error("معرّف مساحة العمل غير صالح.");
  }
  if (!/^diary-\d{4}-\d{2}-\d{2}$/.test(String(diaryId || ""))) {
    throw new Error("يجب ربط الصورة بإدخال يومي صالح.");
  }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(photoId || ""))) {
    throw new Error("معرّف الصورة غير صالح.");
  }
  const folder = workspaceId + "/" + diaryId + "/";
  return {
    objectPath: folder + photoId + "." + checked.value.extension,
    thumbnailPath: folder + photoId + ".thumb.webp",
  };
}

export function validateSkinPhotoMetadata(input = {}) {
  const lighting = ["natural", "indoor", "flash", "unknown"].includes(input.lighting) ? input.lighting : "unknown";
  const angle = ["front", "left", "right", "closeup", "unknown"].includes(input.angle) ? input.angle : "unknown";
  const notes = String(input.notes || "").trim().slice(0, 1000);
  return { ok: true, value: { lighting, angle, notes } };
}
