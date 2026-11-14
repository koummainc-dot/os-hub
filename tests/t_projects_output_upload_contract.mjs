import assert from "node:assert/strict";
import fs from "node:fs";
import {
  OUTPUT_STORAGE_BUCKET,
  OUTPUT_MAX_BYTES,
  validateOutputUpload,
  outputObjectPath,
  outputFileMetadata,
  uploadOutputFileWithRetry,
  createOutputUploadIntent,
  findOutputUploadIntent,
  mergeOutputUploadIntents,
  removeOutputUploadIntent,
  uploadOutputFilesWithRecovery,
} from "../src/systems/projects/outputStorage.js";

const entities = fs.readFileSync(new URL("../src/systems/projects/entities.jsx", import.meta.url), "utf8");
const parts = fs.readFileSync(new URL("../src/systems/projects/parts.jsx", import.meta.url), "utf8");
const outputs = entities.slice(entities.indexOf("export function OutputsView"));
const styles = fs.readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
const projectsIndex = fs.readFileSync(new URL("../src/systems/projects/index.jsx", import.meta.url), "utf8");
const migration = fs.readFileSync(new URL("../supabase/migrations/20261107150000_projects_output_storage.sql", import.meta.url), "utf8");
const pathParserHardening = fs.readFileSync(new URL("../supabase/migrations/20261114160000_projects_output_storage_invoker_hardening.sql", import.meta.url), "utf8");

assert.ok(outputs.includes("files || []"), "Outputs already has a canonical file-metadata collection");
assert.ok(outputs.includes("label: \"الملفات\""), "Output details expose attached-file metadata");
assert.ok(!outputs.includes("data:URL") && !outputs.includes("base64"), "Direct upload must not be faked by embedding base64/data URLs in records");
assert.ok(!outputs.includes("localStorage"), "Outputs upload contract must not introduce a second local-only persistence path");
assert.ok(outputs.includes("uploadOutputFilesWithRecovery"), "Outputs use the shared persisted-intent recovery boundary");
assert.ok(outputs.includes("findOutputUploadIntent(values.upload_intents, file)"), "Outputs restore the persisted file ID when the same file is reselected after reload");
assert.ok(outputs.includes("upload_intents"), "Outputs persist and surface incomplete upload intents on the canonical record");
assert.ok(outputs.includes("const latestFiles = uploadProgressRef.current.get(rec.id)"), "Outputs retain per-form progress when reporting a failed later file");
assert.ok(outputs.includes('setForm({ id: uid(), project_id: projectId })'), "Project-scoped Output forms create a stable Output ID before Storage upload");
assert.ok(outputs.includes("نوايا الملفات غير المكتملة محفوظة داخل سجل المخرج") && outputs.includes("أعد اختيار الملف نفسه"), "Outputs explain reload recovery using the persisted intent instead of claiming form-memory retry");
assert.ok(!outputs.includes("remove(uploaded.map"), "A failed later file does not blindly delete earlier files that may already be linked");
assert.ok(outputs.includes("createSignedUrl"), "Private Output files use signed URLs rather than public bucket URLs");
assert.ok(migration.includes("projects_outputs_select") && migration.includes("projects_outputs_insert") && migration.includes("projects_outputs_delete"), "Storage migration defines the three required private-object policies");
assert.ok(!migration.includes("create policy projects_outputs_update"), "Storage migration deliberately forbids object UPDATE/upsert");
assert.ok(migration.includes("collection = 'outputs'"), "Storage policies authorize against the persisted Output record");
assert.match(pathParserHardening, /security invoker/i, "Storage path parser must not run with elevated privileges");
assert.match(pathParserHardening, /set search_path = ''/i, "Storage path parser must pin an empty search_path");
assert.match(pathParserHardening, /revoke all on function public\.projects_output_workspace_id\(text\) from public, anon/i, "Storage path parser is not executable by public or anonymous clients");
assert.match(pathParserHardening, /grant execute on function public\.projects_output_workspace_id\(text\) to authenticated/i, "authenticated Storage RLS checks can call the path parser");

assert.equal(OUTPUT_STORAGE_BUCKET, "projects-outputs", "Outputs use a dedicated private bucket name");
assert.equal(OUTPUT_MAX_BYTES, 10 * 1024 * 1024, "Application upload limit is conservative and below the Supabase Free global maximum");
assert.equal(validateOutputUpload({ name: "report.pdf", type: "application/pdf", size: 1024 }).ok, true, "allowed PDF passes validation");
assert.equal(validateOutputUpload({ name: "script.js", type: "application/javascript", size: 1024 }).ok, false, "executable JavaScript is rejected");
assert.equal(validateOutputUpload({ name: "large.pdf", type: "application/pdf", size: OUTPUT_MAX_BYTES + 1 }).ok, false, "oversized files are rejected");

const objectPath = outputObjectPath({
  workspaceId: "ws-1",
  projectId: "project-1",
  outputId: "output-1",
  fileId: "opaque-123",
  filename: "تقرير نهائي 2026.pdf",
});
assert.equal(objectPath, "workspace/ws-1/project/project-1/output/output-1/opaque-123-تقرير-نهائي-2026.pdf", "Storage path is workspace/project/output scoped and filename-safe");
assert.ok(!objectPath.includes(".."), "Storage path cannot contain parent traversal");

const metadata = outputFileMetadata({
  file: { name: "report.pdf", type: "application/pdf", size: 1024 },
  objectPath,
  uploadedAt: "2026-11-07T00:00:00.000Z",
});
assert.deepEqual(metadata, {
  object_path: objectPath,
  name: "report.pdf",
  mime_type: "application/pdf",
  size_bytes: 1024,
  uploaded_at: "2026-11-07T00:00:00.000Z",
  checksum: null,
}, "Output records persist metadata only, not binary/base64 content");

const retryFile = { name: "retry.pdf", type: "application/pdf", size: 2048, lastModified: 1794582000000 };
const retryItem = { file: retryFile, fileId: "retry-stable-id", uploadedAt: "2026-11-13T15:00:00.000Z" };
const retryOutput = { id: "output-retry", project_id: "project-1", files: [] };
const uploadedPaths = [];
const successfulStorage = {
  from(bucket) {
    assert.equal(bucket, OUTPUT_STORAGE_BUCKET);
    return {
      async upload(path, file, options) {
        uploadedPaths.push(path);
        assert.equal(options.upsert, false, "Storage object uploads never overwrite");
        assert.equal(file, retryFile);
        return { data: { path }, error: null };
      },
      async createSignedUrl() { return { data: { signedUrl: "https://signed.example/file" }, error: null }; },
    };
  },
};
const firstUpload = await uploadOutputFileWithRetry({
  storage: successfulStorage, workspaceId: "ws-1", output: retryOutput, pendingFile: retryItem,
});
assert.equal(firstUpload.object_path, uploadedPaths[0], "first upload returns metadata for the exact opaque Storage path");
const existingObjectStorage = {
  from() {
    return {
      async upload(path) {
        uploadedPaths.push(path);
        return { data: null, error: { message: "object already exists" } };
      },
      async createSignedUrl(path) {
        return { data: { signedUrl: "https://signed.example/retry" }, error: null };
      },
    };
  },
};
const retriedUpload = await uploadOutputFileWithRetry({
  storage: existingObjectStorage, workspaceId: "ws-1", output: retryOutput, pendingFile: retryItem,
});
assert.equal(retriedUpload.object_path, firstUpload.object_path, "retry reuses the same stable object path instead of creating a duplicate");
assert.equal(uploadedPaths[1], uploadedPaths[0], "retry never changes the file's opaque id/path");
const failedStorage = {
  from() {
    return {
      async upload() { return { data: null, error: { message: "network unavailable" } }; },
      async createSignedUrl() { return { data: null, error: { message: "object not found" } }; },
    };
  },
};
await assert.rejects(
  () => uploadOutputFileWithRetry({ storage: failedStorage, workspaceId: "ws-1", output: retryOutput, pendingFile: retryItem }),
  /network unavailable/,
  "a failed upload without an existing object remains a visible retryable error",
);

const recoveryFile = { name: "recovery.pdf", type: "application/pdf", size: 3072, lastModified: 1794582100000 };
const recoveryItem = { file: recoveryFile, fileId: "persisted-recovery-id", uploadedAt: "2026-11-13T15:10:00.000Z" };
const recoveryIntent = createOutputUploadIntent({
  workspaceId: "ws-1", output: retryOutput, pendingFile: recoveryItem,
});
assert.equal(recoveryIntent.file_id, recoveryItem.fileId, "upload intent stores the stable opaque file ID");
assert.equal(recoveryIntent.object_path, outputObjectPath({
  workspaceId: "ws-1", projectId: "project-1", outputId: "output-retry",
  fileId: recoveryItem.fileId, filename: recoveryFile.name,
}), "upload intent stores the exact deterministic private object path");
assert.equal(findOutputUploadIntent([recoveryIntent], recoveryFile).file_id, recoveryItem.fileId, "reselected file metadata matches its persisted intent");
assert.equal(mergeOutputUploadIntents([recoveryIntent], [recoveryIntent]).length, 1, "intent merge is idempotent by file ID");
assert.equal(removeOutputUploadIntent([recoveryIntent], recoveryItem.fileId).length, 0, "a successfully linked file clears its intent");

let saveCountBeforeReload = 0;
let persistedBeforeReload = null;
let storageAcceptedBeforeMetadataFailure = false;
const storageAcceptsThenMetadataFails = {
  from() {
    return {
      async upload(path) {
        assert.ok(persistedBeforeReload?.upload_intents?.some((intent) => intent.file_id === recoveryItem.fileId),
          "the upload intent must reach the Output record before Storage receives the file");
        storageAcceptedBeforeMetadataFailure = true;
        assert.equal(path, recoveryIntent.object_path);
        return { data: { path }, error: null };
      },
      async createSignedUrl() { return { data: { signedUrl: "https://signed.example/recovery" }, error: null }; },
    };
  },
};
await assert.rejects(
  () => uploadOutputFilesWithRecovery({
    storage: storageAcceptsThenMetadataFails,
    workspaceId: "ws-1",
    output: retryOutput,
    pendingFiles: [recoveryItem],
    saveOutput: async (record) => {
      saveCountBeforeReload += 1;
      if (saveCountBeforeReload === 1) {
        persistedBeforeReload = structuredClone(record);
        return record;
      }
      return null; // Simulate Storage success followed by failed Output metadata persistence.
    },
  }),
  /لم يؤكد الخادم حفظ نية الرفع أو بيانات الملف|لم يؤكد الخادم/,
  "a metadata write failure must leave the already-persisted intent available for recovery",
);
assert.equal(storageAcceptedBeforeMetadataFailure, true, "the simulated failure happens after Storage accepted the object");
assert.equal(persistedBeforeReload.upload_intents[0].file_id, recoveryItem.fileId, "the intent remains on the Output record after metadata persistence fails");
assert.equal(persistedBeforeReload.files.length, 0, "the failed metadata write does not falsely mark the file as linked");

const reloadedOutput = structuredClone(persistedBeforeReload);
const reselectedIntent = findOutputUploadIntent(reloadedOutput.upload_intents, recoveryFile);
assert.equal(reselectedIntent.file_id, recoveryItem.fileId, "after reload, the same file resolves to its original file ID");
const reselectedFile = {
  file: recoveryFile,
  fileId: reselectedIntent.file_id,
  uploadedAt: reselectedIntent.uploaded_at,
};
const storageObjectAlreadyExists = {
  from() {
    return {
      async upload(path) {
        assert.equal(path, recoveryIntent.object_path, "recovery retries the original path rather than creating another Storage object");
        return { data: null, error: { message: "object already exists" } };
      },
      async createSignedUrl(path) {
        assert.equal(path, recoveryIntent.object_path);
        return { data: { signedUrl: "https://signed.example/existing-recovery" }, error: null };
      },
    };
  },
};
let recoveredOutput = null;
const recoveryResult = await uploadOutputFilesWithRecovery({
  storage: storageObjectAlreadyExists,
  workspaceId: "ws-1",
  output: reloadedOutput,
  pendingFiles: [reselectedFile],
  saveOutput: async (record) => {
    recoveredOutput = structuredClone(record);
    return record;
  },
});
assert.equal(recoveryResult.files[0].object_path, recoveryIntent.object_path, "reload recovery attaches metadata for the already-uploaded object");
assert.equal(recoveryResult.upload_intents.length, 0, "successful recovery removes the pending intent");
assert.equal(recoveredOutput.upload_intents.length, 0, "the cleared intent is persisted after metadata recovery");
const taskSheet = parts.slice(parts.indexOf("export function TaskSheet"), parts.indexOf("export function SessionForm"));
assert.ok(taskSheet.includes("uploadOutputFilesWithRecovery"), "Task Sheet outputs use the same persisted-intent recovery helper");
assert.ok(taskSheet.includes("findOutputUploadIntent(values.upload_intents, file)"), "Task Sheet restores the persisted file ID when the same file is reselected after reload");
assert.ok(taskSheet.includes("createSignedUrl(file.object_path, 60)"), "Task Sheet downloads private files with short-lived signed URLs");
assert.ok(taskSheet.includes("نوايا الملفات غير المكتملة محفوظة داخل سجل المخرج") && taskSheet.includes("أعد اختيار الملف نفسه"), "Task Sheet explains reload recovery for incomplete attachment links");
assert.ok(!taskSheet.includes("رفع الملفات غير متاح في هذا الإصدار"), "Task Sheet no longer incorrectly claims file upload is unavailable");
assert.ok(taskSheet.includes('title="المهمة غير متاحة"'), "Task Sheet has a clear state for stale task deep links");

assert.ok(styles.includes("html, body, #root { min-width: 0 !important; overflow-x: hidden; }"), "Responsive baseline prevents Projects from forcing viewport overflow");
assert.ok(styles.includes("table { min-width: 640px; }"), "Dense Projects tables retain a bounded horizontal-scroll fallback");
assert.ok(styles.includes("[role=\"dialog\"] { width: calc(100vw - 16px) !important; margin-inline: 8px; }"), "Projects dialogs have a mobile-width constraint");
assert.ok(styles.includes(".os-mobile-scroll { overflow-x: auto; max-width: 100%; }"), "Responsive surfaces have an explicit horizontal-scroll utility");
assert.ok(projectsIndex.includes("className=\"projects-system\""), "Projects screens have a scoped responsive root");
assert.ok(styles.includes(".projects-system [style*=\"grid-template-columns: 1fr 1fr\"]"), "Projects two-column forms collapse on narrow screens");
assert.ok(styles.includes(".projects-system [style*=\"grid-template-columns: repeat(7,1fr)\"]"), "Projects weekly/calendar grids retain a bounded mobile scroll surface");

console.log("t_projects_output_upload_contract: OK");
