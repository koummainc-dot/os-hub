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


/**
 * Persist a recoverable, non-binary upload intent on the canonical Output record
 * before Storage is touched. The same intent survives a full page reload.
 */
export function createOutputUploadIntent({ workspaceId, output, pendingFile }) {
  const file = pendingFile?.file || null;
  const validation = validateOutputUpload(file);
  if (!validation.ok) throw new Error(validation.error);
  const fileId = String(pendingFile?.fileId || pendingFile?.file_id || "").trim();
  if (!fileId || fileId.includes("/") || fileId.includes("..")) {
    throw new Error("معرّف الملف المؤقت غير صالح.");
  }
  if (!output?.id || !output?.project_id) {
    throw new Error("يجب حفظ سجل المخرج وربطه بالمشروع قبل إنشاء نية الرفع.");
  }
  const objectPath = outputObjectPath({
    workspaceId,
    projectId: output.project_id,
    outputId: output.id,
    fileId,
    filename: file.name,
  });
  return {
    file_id: fileId,
    object_path: objectPath,
    name: String(file.name || "file"),
    mime_type: String(file.type || "").toLowerCase(),
    size_bytes: file.size,
    last_modified: Number.isFinite(file.lastModified) ? file.lastModified : null,
    uploaded_at: pendingFile?.uploadedAt || pendingFile?.uploaded_at || new Date().toISOString(),
  };
}

export function findOutputUploadIntent(intents, file) {
  if (!file) return null;
  return (Array.isArray(intents) ? intents : []).find((intent) =>
    intent &&
    intent.name === String(file.name || "file") &&
    intent.mime_type === String(file.type || "").toLowerCase() &&
    Number(intent.size_bytes) === Number(file.size) &&
    (intent.last_modified == null || !Number.isFinite(file.lastModified) || Number(intent.last_modified) === Number(file.lastModified))
  ) || null;
}

export function mergeOutputUploadIntents(...groups) {
  const merged = new Map();
  for (const intent of groups.flat()) {
    const id = String(intent?.file_id || "").trim();
    if (id) merged.set(id, { ...(merged.get(id) || {}), ...intent });
  }
  return [...merged.values()];
}

export function removeOutputUploadIntent(intents, fileId) {
  const id = String(fileId || "");
  return (Array.isArray(intents) ? intents : []).filter((intent) => String(intent?.file_id || "") !== id);
}

function mergeOutputFileMetadata(...groups) {
  const merged = new Map();
  for (const file of groups.flat()) {
    if (!file) continue;
    const key = typeof file === "string" ? "legacy:" + file : file.object_path || "file:" + (file.name || "");
    if (!merged.has(key)) merged.set(key, file);
  }
  return [...merged.values()];
}

/**
 * Recoverable Output upload lifecycle:
 * 1. Persist the intent on the Output row.
 * 2. Upload or detect the exact same private Storage object.
 * 3. Persist file metadata and remove the intent.
 *
 * If step 2 succeeds but step 3 fails, the persisted intent remains available
 * after reload. Reselecting the same file reuses its file_id/object_path.
 */
export async function uploadOutputFilesWithRecovery({
  storage,
  workspaceId,
  output,
  pendingFiles,
  saveOutput,
  bucket = OUTPUT_STORAGE_BUCKET,
}) {
  if (typeof saveOutput !== "function") throw new Error("خدمة حفظ سجل المخرج غير متاحة.");
  if (!workspaceId) throw new Error("المساحة الحالية غير متاحة للرفع.");
  let current = output;

  const persist = async (record) => {
    const saved = await saveOutput(record);
    if (!saved || saved._syncPending) {
      throw new Error("لم يؤكد الخادم حفظ بيانات المخرج؛ لم تتم متابعة رفع الملف.");
    }
    return saved;
  };

  for (const pendingFile of Array.from(pendingFiles || []).filter(Boolean)) {
    const file = pendingFile.file || null;
    const validation = validateOutputUpload(file);
    if (!validation.ok) throw new Error(validation.error);

    const matchedIntent =
      (current.upload_intents || []).find((intent) => intent?.file_id === (pendingFile.fileId || pendingFile.file_id)) ||
      findOutputUploadIntent(current.upload_intents, file);
    const stableFileId = matchedIntent?.file_id || pendingFile.fileId || pendingFile.file_id;
    const stablePendingFile = {
      ...pendingFile,
      fileId: stableFileId,
      uploadedAt: matchedIntent?.uploaded_at || pendingFile.uploadedAt || pendingFile.uploaded_at,
    };
    const intent = matchedIntent || createOutputUploadIntent({
      workspaceId,
      output: current,
      pendingFile: stablePendingFile,
    });
    const expectedIntent = createOutputUploadIntent({
      workspaceId,
      output: current,
      pendingFile: stablePendingFile,
    });
    if (intent.object_path !== expectedIntent.object_path) {
      throw new Error("مسار نية الرفع لا يطابق المشروع والمخرج الحاليين؛ لم يتم رفع الملف.");
    }

    const alreadyLinked = (current.files || []).some((item) =>
      item && typeof item === "object" && item.object_path === intent.object_path
    );
    if (alreadyLinked) {
      const remaining = removeOutputUploadIntent(current.upload_intents, intent.file_id);
      if (remaining.length !== (current.upload_intents || []).length) {
        current = await persist({ ...current, upload_intents: remaining });
      }
      continue;
    }

    if (!matchedIntent) {
      current = await persist({
        ...current,
        upload_intents: mergeOutputUploadIntents(current.upload_intents || [], [intent]),
      });
    }

    const metadata = await uploadOutputFileWithRetry({
      storage,
      workspaceId,
      output: current,
      pendingFile: stablePendingFile,
      bucket,
    });
    current = await persist({
      ...current,
      files: mergeOutputFileMetadata(current.files || [], [metadata]),
      upload_intents: removeOutputUploadIntent(current.upload_intents, intent.file_id),
    });
  }

  return current;
}
