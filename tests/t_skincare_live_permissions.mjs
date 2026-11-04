import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const enabled = process.env.SKINCARE_LIVE_TESTS === "1";
if (!enabled) {
  console.log("Skincare live permission/storage tests skipped (set SKINCARE_LIVE_TESTS=1 in an isolated test project).");
  process.exit(0);
}

const required = [
  "SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY", "SKINCARE_TEST_WORKSPACE_ID",
  "SKINCARE_OWNER_JWT", "SKINCARE_EDITOR_JWT", "SKINCARE_VIEWER_JWT", "SKINCARE_OTHER_WORKSPACE_ID",
  "SKINCARE_OTHER_VIEWER_JWT",
];
const missing = required.filter(key => !process.env[key]);
if (missing.length) throw new Error("Missing isolated Skincare live-test environment variables: " + missing.join(", "));

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_PUBLISHABLE_KEY;
const wsId = process.env.SKINCARE_TEST_WORKSPACE_ID;
const otherWsId = process.env.SKINCARE_OTHER_WORKSPACE_ID;
const client = jwt => createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { headers: { Authorization: "Bearer " + jwt } },
});
const owner = client(process.env.SKINCARE_OWNER_JWT);
const editor = client(process.env.SKINCARE_EDITOR_JWT);
const viewer = client(process.env.SKINCARE_VIEWER_JWT);
const otherViewer = client(process.env.SKINCARE_OTHER_VIEWER_JWT);
const date = process.env.SKINCARE_TEST_DIARY_DATE || "1900-01-01";
assert.match(date, /^\d{4}-\d{2}-\d{2}$/);
const diaryId = "diary-" + date;
const photoId = crypto.randomUUID();
const deniedId = "live-viewer-deny-" + crypto.randomUUID();
const folder = wsId + "/" + diaryId + "/";
const objectPath = folder + photoId + ".jpg";
const thumbnailPath = folder + photoId + ".thumb.webp";
const now = new Date().toISOString();
const diaryData = { id: diaryId, date, skinRating: 3, issues: [], note: "isolated live RLS test fixture" };
const photoData = {
  id: photoId, diaryId, date, objectPath, thumbnailPath,
  mimeType: "image/jpeg", sizeBytes: 3, width: 1, height: 1,
  lighting: "unknown", angle: "unknown", notes: "isolated live storage test fixture",
  createdAt: now,
};

const insertRecord = (db, collection, id, data) => db.from("workspace_records").insert({
  workspace_id: wsId, system_id: "skincare", collection, id, data,
  deleted: false, visible_to: null,
});
const softDeleteRecord = (db, collection, id, data) => db.from("workspace_records")
  .update({ data: { ...data, deleted_at: new Date().toISOString() }, deleted: true })
  .eq("workspace_id", wsId).eq("system_id", "skincare").eq("collection", collection).eq("id", id);

let diaryCreated = false;
let photoCreated = false;
let uploaded = false;
try {
  const existing = await editor.from("workspace_records").select("id")
    .eq("workspace_id", wsId).eq("system_id", "skincare").eq("collection", "skin_diary").eq("id", diaryId).maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data) throw new Error("Test fixture already exists; choose another SKINCARE_TEST_DIARY_DATE.");

  const diaryInsert = await insertRecord(editor, "skin_diary", diaryId, diaryData);
  if (diaryInsert.error) throw diaryInsert.error;
  diaryCreated = true;

  const viewerInsert = await insertRecord(viewer, "skin_profile", deniedId, { id: deniedId, skinType: "unknown" });
  assert.ok(viewerInsert.error, "Viewer must not be able to insert a Skincare record.");

  const editorUpload = await editor.storage.from("skincare-progress").upload(objectPath, new Blob([new Uint8Array([0xff,0xd8,0xff])], { type: "image/jpeg" }), {
    contentType: "image/jpeg", upsert: false,
  });
  if (editorUpload.error) throw editorUpload.error;
  uploaded = true;
  const thumbUpload = await editor.storage.from("skincare-progress").upload(thumbnailPath, new Blob([new Uint8Array([0x52,0x49,0x46])], { type: "image/webp" }), {
    contentType: "image/webp", upsert: false,
  });
  if (thumbUpload.error) throw thumbUpload.error;

  const photoInsert = await insertRecord(editor, "skin_photos", photoId, photoData);
  if (photoInsert.error) throw photoInsert.error;
  photoCreated = true;

  const ownerRead = await owner.from("workspace_records").select("id")
    .eq("workspace_id", wsId).eq("system_id", "skincare").eq("collection", "skin_diary").eq("id", diaryId);
  if (ownerRead.error) throw ownerRead.error;
  assert.equal(ownerRead.data.length, 1, "Workspace owner should read the fixture.");
  const ownerSigned = await owner.storage.from("skincare-progress").createSignedUrl(objectPath, 60);
  if (ownerSigned.error || !ownerSigned.data?.signedUrl) throw ownerSigned.error || new Error("Workspace owner should be able to sign the private photo.");

  const editorSigned = await editor.storage.from("skincare-progress").createSignedUrl(objectPath, 60);
  if (editorSigned.error || !editorSigned.data?.signedUrl) throw editorSigned.error || new Error("Editor should be able to sign its own photo.");

  const viewerUpload = await viewer.storage.from("skincare-progress").upload(folder + crypto.randomUUID() + ".jpg", new Blob([new Uint8Array([1])], { type: "image/jpeg" }), {
    contentType: "image/jpeg", upsert: false,
  });
  assert.ok(viewerUpload.error, "Viewer must not be able to upload a private photo.");

  const viewerSigned = await viewer.storage.from("skincare-progress").createSignedUrl(objectPath, 60);
  if (process.env.SKINCARE_VIEWER_CAN_VIEW === "1") {
    if (viewerSigned.error || !viewerSigned.data?.signedUrl) throw viewerSigned.error || new Error("Viewer with photo view access should be able to sign the photo.");
  } else assert.ok(viewerSigned.error, "Viewer without photo view access must not sign the photo.");

  const viewerRead = await viewer.from("workspace_records").select("id")
    .eq("workspace_id", wsId).eq("system_id", "skincare").eq("collection", "skin_diary").eq("id", diaryId);
  if (viewerRead.error) throw viewerRead.error;
  if (process.env.SKINCARE_VIEWER_CAN_VIEW === "1") assert.equal(viewerRead.data.length, 1, "Viewer should see the fixture when section view access is granted.");

  const crossWorkspace = await otherViewer.from("workspace_records").select("id")
    .eq("workspace_id", wsId).eq("system_id", "skincare").eq("collection", "skin_diary").eq("id", diaryId);
  if (crossWorkspace.error) throw crossWorkspace.error;
  assert.equal(crossWorkspace.data.length, 0, "A user from another workspace must not read the fixture.");

  const otherSigned = await otherViewer.storage.from("skincare-progress").createSignedUrl(objectPath, 60);
  assert.ok(otherSigned.error, "A different workspace must not create a signed URL for this photo.");
  console.log("Skincare live RLS and private Storage tests passed.");
} finally {
  if (photoCreated) await softDeleteRecord(editor, "skin_photos", photoId, photoData);
  if (uploaded) await editor.storage.from("skincare-progress").remove([objectPath, thumbnailPath]);
  if (diaryCreated) await softDeleteRecord(editor, "skin_diary", diaryId, diaryData);
}
