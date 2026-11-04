import { SKINCARE_COLLECTIONS } from "./domain.js";

export const SKINCARE_BACKUP_FORMAT = "os-hub-skincare-backup";
export const SKINCARE_BACKUP_VERSION = 1;
export const SKINCARE_BACKUP_MAX_RECORDS = 10000;

const COLLECTION_NAMES = Object.values(SKINCARE_COLLECTIONS);
const isObject = value => !!value && typeof value === "object" && !Array.isArray(value);
const cleanRecord = record => {
  const data = { ...record };
  delete data._vis;
  delete data._deleted;
  delete data._syncPending;
  delete data._serverUpdatedAt;
  return data;
};

export function createSkinBackup({ records = {}, exportedAt = new Date().toISOString() } = {}) {
  const collections = {};
  let totalRecords = 0;
  let pendingRecords = 0;
  for (const collection of COLLECTION_NAMES) {
    const values = Object.values(records[collection] || {});
    collections[collection] = values.map(record => {
      if (record?._syncPending) pendingRecords++;
      return {
        id: String(record?.id || ""),
        data: cleanRecord(record || {}),
        deleted: !!record?._deleted,
        visibleTo: Array.isArray(record?._vis) ? record._vis : null,
      };
    });
    totalRecords += values.length;
  }
  if (pendingRecords) {
    return { ok: false, error: "توجد تعديلات محلية لم يؤكد الخادم مزامنتها؛ أعد المزامنة قبل إنشاء النسخة الاحتياطية.", pendingRecords };
  }
  if (totalRecords > SKINCARE_BACKUP_MAX_RECORDS) {
    return { ok: false, error: "عدد السجلات يتجاوز الحد المسموح للنسخة الواحدة.", totalRecords };
  }
  return {
    ok: true,
    backup: {
      format: SKINCARE_BACKUP_FORMAT,
      version: SKINCARE_BACKUP_VERSION,
      systemId: "skincare",
      exportedAt,
      includes: { records: true, deletedRecords: true, photoFiles: false },
      counts: Object.fromEntries(COLLECTION_NAMES.map(name => [name, collections[name].length])),
      collections,
    },
    totalRecords,
  };
}

function checkReferences(collections) {
  const errors = [];
  const ids = Object.fromEntries(COLLECTION_NAMES.map(name => [name, new Set((collections[name] || []).map(row => row.id))]));
  const rows = name => collections[name] || [];
  const has = (name, id) => !id || ids[name]?.has(String(id));

  for (const unit of rows(SKINCARE_COLLECTIONS.units)) {
    if (!has(SKINCARE_COLLECTIONS.products, unit.data.productId)) errors.push("العبوة " + unit.id + " تشير إلى منتج غير موجود.");
  }
  for (const routine of rows(SKINCARE_COLLECTIONS.routines)) {
    for (const step of routine.data.steps || []) {
      if (!has(SKINCARE_COLLECTIONS.products, step.productId)) errors.push("الروتين " + routine.id + " يحتوي خطوة تشير إلى منتج غير موجود.");
    }
  }
  for (const trial of rows(SKINCARE_COLLECTIONS.trials)) {
    if (!has(SKINCARE_COLLECTIONS.products, trial.data.productId)) errors.push("التجربة " + trial.id + " تشير إلى منتج غير موجود.");
  }
  for (const entry of rows(SKINCARE_COLLECTIONS.diary)) {
    if (!has(SKINCARE_COLLECTIONS.trials, entry.data.trialId)) errors.push("إدخال المفكرة " + entry.id + " يشير إلى تجربة غير موجودة.");
  }
  for (const photo of rows(SKINCARE_COLLECTIONS.photos)) {
    if (!has(SKINCARE_COLLECTIONS.diary, photo.data.diaryId)) errors.push("الصورة " + photo.id + " تشير إلى إدخال مفكرة غير موجود.");
  }
  for (const log of rows(SKINCARE_COLLECTIONS.routineLogs)) {
    if (!has(SKINCARE_COLLECTIONS.routines, log.data.routineId)) errors.push("سجل الروتين " + log.id + " يشير إلى روتين غير موجود.");
    const routine = rows(SKINCARE_COLLECTIONS.routines).find(item => item.id === String(log.data.routineId));
    if (routine && log.data.stepId && !(routine.data.steps || []).some(step => step.id === log.data.stepId)) {
      errors.push("سجل الروتين " + log.id + " يشير إلى خطوة غير موجودة في الروتين.");
    }
  }
  for (const reaction of rows(SKINCARE_COLLECTIONS.reactions)) {
    if (!has(SKINCARE_COLLECTIONS.products, reaction.data.productId)) errors.push("التفاعل " + reaction.id + " يشير إلى منتج غير موجود.");
    if (!has(SKINCARE_COLLECTIONS.units, reaction.data.unitId)) errors.push("التفاعل " + reaction.id + " يشير إلى عبوة غير موجودة.");
  }
  return errors;
}

export function validateSkinBackup(input) {
  const backup = typeof input === "string" ? (() => { try { return JSON.parse(input); } catch { return null; } })() : input;
  if (!isObject(backup)) return { ok: false, errors: ["ملف النسخة الاحتياطية ليس JSON صالحًا."] };
  if (backup.format !== SKINCARE_BACKUP_FORMAT) return { ok: false, errors: ["صيغة الملف ليست نسخة Skincare OS معتمدة."] };
  if (backup.version !== SKINCARE_BACKUP_VERSION) return { ok: false, errors: ["إصدار النسخة الاحتياطية غير مدعوم."] };
  if (backup.systemId !== "skincare") return { ok: false, errors: ["الملف لا ينتمي إلى Skincare OS."] };
  if (!isObject(backup.collections)) return { ok: false, errors: ["قسم collections مفقود أو غير صالح."] };

  const errors = [];
  const collections = {};
  let totalRecords = 0;
  for (const name of COLLECTION_NAMES) {
    const list = backup.collections[name] ?? [];
    if (!Array.isArray(list)) { errors.push("مجموعة " + name + " ليست قائمة سجلات."); continue; }
    const seen = new Set();
    collections[name] = [];
    for (const row of list) {
      if (!isObject(row) || typeof row.id !== "string" || !row.id.trim() || !isObject(row.data) || String(row.data.id || "") !== row.id) {
        errors.push("يوجد سجل غير صالح أو لا يتطابق معرّفه في مجموعة " + name + ".");
        continue;
      }
      if (seen.has(row.id)) { errors.push("معرّف مكرر " + row.id + " في مجموعة " + name + "."); continue; }
      seen.add(row.id);
      if (row.visibleTo != null && (!Array.isArray(row.visibleTo) || row.visibleTo.some(id => typeof id !== "string"))) {
        errors.push("قائمة صلاحيات السجل " + row.id + " غير صالحة.");
        continue;
      }
      collections[name].push({ id: row.id, data: cleanRecord(row.data), deleted: !!row.deleted, visibleTo: row.visibleTo || null });
      totalRecords++;
    }
  }
  const unknown = Object.keys(backup.collections).filter(name => !COLLECTION_NAMES.includes(name));
  if (unknown.length) errors.push("الملف يحتوي مجموعات غير معروفة: " + unknown.join("، "));
  if (totalRecords > SKINCARE_BACKUP_MAX_RECORDS) errors.push("عدد السجلات يتجاوز الحد الأقصى المسموح.");
  if (errors.length) return { ok: false, errors, totalRecords };
  const referenceErrors = checkReferences(collections);
  if (referenceErrors.length) return { ok: false, errors: referenceErrors, totalRecords };
  return {
    ok: true,
    backup: { ...backup, collections },
    totalRecords,
    counts: Object.fromEntries(COLLECTION_NAMES.map(name => [name, collections[name].length])),
    includesPhotoFiles: backup.includes?.photoFiles === true,
    warnings: backup.includes?.photoFiles === true ? [] : ["النسخة تحتوي بيانات الصور الوصفية ومساراتها فقط؛ ملفات الصور نفسها غير مضمنة."],
  };
}

export function compareSkinBackupWithCurrent(validated, currentRecords = {}) {
  if (!validated?.ok) return { conflicts: [], newRecords: 0, existingRecords: 0 };
  const conflicts = [];
  let newRecords = 0;
  let existingRecords = 0;
  for (const [collection, list] of Object.entries(validated.backup.collections)) {
    const current = currentRecords[collection] || {};
    for (const row of list) {
      if (current[row.id]) {
        existingRecords++;
        conflicts.push({ collection, id: row.id });
      } else newRecords++;
    }
  }
  return { conflicts, newRecords, existingRecords };
}
