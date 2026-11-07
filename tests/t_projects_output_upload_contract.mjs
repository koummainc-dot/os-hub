import assert from "node:assert/strict";
import fs from "node:fs";
import {
  OUTPUT_STORAGE_BUCKET,
  OUTPUT_MAX_BYTES,
  validateOutputUpload,
  outputObjectPath,
  outputFileMetadata,
} from "../src/systems/projects/outputStorage.js";

const entities = fs.readFileSync(new URL("../src/systems/projects/entities.jsx", import.meta.url), "utf8");
const outputs = entities.slice(entities.indexOf("export function OutputsView"));
const styles = fs.readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
const migration = fs.readFileSync(new URL("../supabase/migrations/20261107150000_projects_output_storage.sql", import.meta.url), "utf8");

assert.ok(outputs.includes("files || []"), "Outputs already has a canonical file-metadata collection");
assert.ok(outputs.includes("label: \"الملفات\""), "Output details expose attached-file metadata");
assert.ok(!outputs.includes("data:URL") && !outputs.includes("base64"), "Direct upload must not be faked by embedding base64/data URLs in records");
assert.ok(!outputs.includes("localStorage"), "Outputs upload contract must not introduce a second local-only persistence path");
assert.ok(outputs.includes("supabase.storage.from(OUTPUT_STORAGE_BUCKET).upload"), "Outputs use the Supabase Storage upload boundary");
assert.ok(outputs.includes("createSignedUrl"), "Private Output files use signed URLs rather than public bucket URLs");
assert.ok(migration.includes("projects_outputs_select") && migration.includes("projects_outputs_insert") && migration.includes("projects_outputs_delete"), "Storage migration defines the three required private-object policies");
assert.ok(!migration.includes("create policy projects_outputs_update"), "Storage migration deliberately forbids object UPDATE/upsert");
assert.ok(migration.includes("collection = 'outputs'"), "Storage policies authorize against the persisted Output record");

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

assert.ok(styles.includes("html, body, #root { min-width: 0 !important; overflow-x: hidden; }"), "Responsive baseline prevents Projects from forcing viewport overflow");
assert.ok(styles.includes("table { min-width: 640px; }"), "Dense Projects tables retain a bounded horizontal-scroll fallback");
assert.ok(styles.includes("[role=\"dialog\"] { width: calc(100vw - 16px) !important; margin-inline: 8px; }"), "Projects dialogs have a mobile-width constraint");
assert.ok(styles.includes(".os-mobile-scroll { overflow-x: auto; max-width: 100%; }"), "Responsive surfaces have an explicit horizontal-scroll utility");

console.log("t_projects_output_upload_contract: OK");
