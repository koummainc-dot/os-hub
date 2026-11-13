export const OUTPUT_STORAGE_BUCKET = "projects-outputs";
export const OUTPUT_MAX_BYTES = 10 * 1024 * 1024;

export const OUTPUT_ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "text/plain",
  "text/csv",
  "application/json",
  "application/zip",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);

const sanitizeName = (name) => String(name || "file")
  .normalize("NFKC")
  .replace(/[^\p{L}\p{N}._-]+/gu, "-")
  .replace(/-+/g, "-")
  .replace(/^[-.]+|[-.]+$/g, "")
  .slice(0, 120) || "file";

export function validateOutputUpload(file) {
  if (!file) return { ok: false, error: "الملف غير موجود." };
  if (!Number.isFinite(file.size) || file.size <= 0) return { ok: false, error: "حجم الملف غير صالح." };
  if (file.size > OUTPUT_MAX_BYTES) return { ok: false, error: "حجم الملف يتجاوز الحد المسموح للمخرجات." };
  if (!OUTPUT_ALLOWED_MIME_TYPES.has(String(file.type || "").toLowerCase())) return { ok: false, error: "نوع الملف غير مسموح." };
  return { ok: true };
}

export function outputObjectPath({ workspaceId, projectId, outputId, fileId, filename }) {
  for (const [name, value] of Object.entries({ workspaceId, projectId, outputId, fileId })) {
    if (!String(value || "").trim()) throw new Error(name + " مطلوب.");
  }
  return [
    "workspace", String(workspaceId).trim(),
    "project", String(projectId).trim(),
    "output", String(outputId).trim(),
    String(fileId).trim() + "-" + sanitizeName(filename),
  ].join("/");
}

export function outputFileMetadata({ file, objectPath, uploadedAt, checksum = null }) {
  const validation = validateOutputUpload(file);
  if (!validation.ok) throw new Error(validation.error);
  if (!objectPath || !String(objectPath).startsWith("workspace/")) throw new Error("مسار Storage غير صالح.");
  return {
    object_path: objectPath,
    name: sanitizeName(file.name),
    mime_type: String(file.type).toLowerCase(),
    size_bytes: file.size,
    uploaded_at: uploadedAt || new Date().toISOString(),
    checksum: checksum || null,
  };
}


/**
 * Upload one Output file using an id that is created when the user selects it.
 * If the network fails after Storage accepted the object, a retry can verify
 * the same opaque path with a signed URL instead of creating a duplicate.
 */
export async function uploadOutputFileWithRetry({
  storage,
  workspaceId,
  output,
  pendingFile,
  bucket = OUTPUT_STORAGE_BUCKET,
}) {
  const file = pendingFile?.file || null;
  const fileId = String(pendingFile?.fileId || pendingFile?.file_id || "").trim();
  const uploadedAt = pendingFile?.uploadedAt || pendingFile?.uploaded_at || null;
  const validation = validateOutputUpload(file);
  if (!validation.ok) throw new Error(validation.error);
  if (!fileId || fileId.includes("/") || fileId.includes("..")) {
    throw new Error("معرّف الملف المؤقت غير صالح.");
  }
  if (!storage || typeof storage.from !== "function") {
    throw new Error("خدمة تخزين المخرجات غير متاحة.");
  }
  if (!output?.id || !output?.project_id) {
    throw new Error("يجب حفظ سجل المخرج وربطه بالمشروع قبل رفع الملف.");
  }

  const objectPath = outputObjectPath({
    workspaceId,
    projectId: output.project_id,
    outputId: output.id,
    fileId,
    filename: file.name,
  });
  const bucketApi = storage.from(bucket);
  const { error } = await bucketApi.upload(objectPath, file, {
    upsert: false,
    contentType: file.type,
  });

  if (error) {
    // The previous attempt may have reached Storage even if its response was
    // lost. The random, stable fileId makes this path unique to this form item.
    let alreadyUploaded = false;
    try {
      const existing = await bucketApi.createSignedUrl(objectPath, 60);
      alreadyUploaded = !existing?.error && !!existing?.data?.signedUrl;
    } catch {
      alreadyUploaded = false;
    }
    if (!alreadyUploaded) {
      throw new Error(error.message || "تعذر رفع الملف إلى مساحة التخزين.");
    }
  }

  return outputFileMetadata({ file, objectPath, uploadedAt });
}
