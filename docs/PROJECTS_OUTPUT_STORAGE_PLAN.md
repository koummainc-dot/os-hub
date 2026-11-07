# Projects Outputs — Direct Upload Safety Plan

Status: **upload contract prepared; Storage bucket/RLS implementation intentionally deferred until access contracts are verified.**

## Free-path decision

Use the existing Supabase project `os-hub` and Supabase Storage; do not create a paid branch or separate paid environment.

Supabase's current Storage documentation supports browser uploads through supabase-js and RLS policies on `storage.objects`. The Free path is suitable for the planned Outputs attachment workflow provided the application keeps a conservative per-file limit and does not rely on paid infrastructure.

## Prepared Outputs contract

The repository now contains pure upload-contract utilities in `src/systems/projects/outputStorage.js` and a contract test in `tests/t_projects_output_upload_contract.mjs`.

The prepared contract provides:
- dedicated bucket name: `projects-outputs`;
- application file-size limit: 10 MB;
- allow-listed document/image MIME types;
- executable JavaScript rejection;
- workspace/project/output-scoped object paths;
- filename sanitization;
- opaque file IDs in object paths;
- metadata-only Output records;
- no base64/data-URL persistence;
- no localStorage upload persistence.

This is **not** a Storage migration and does not create a bucket or policy.

## Proposed object model

One private Files bucket dedicated to Projects outputs.

Example object path:

`workspace/{workspaceId}/project/{projectId}/output/{outputId}/{opaqueFileId}-{safeName}`

Rules:
- Never trust a client-supplied workspace/user path for authorization.
- The application Output record remains the source of truth; Storage holds the binary.
- Output `files[]` stores metadata only: object path, filename, MIME type, byte size, uploaded timestamp, and optional checksum.
- No public bucket.
- No `service_role` key in the browser.
- Prefer non-overwriting uploads with unique object paths.
- If deletion is implemented, Storage deletion and Output metadata must be reconciled so a failed object deletion cannot silently claim the file is gone.

## Required RLS design before migration

Storage policies must reuse the application's real workspace membership/role contract rather than inventing a second authorization model.

Minimum operations:
- INSERT for authorized Project output writers.
- SELECT only for users authorized to read the same Project/workspace output.
- DELETE only for users authorized to remove the output attachment.
- UPDATE only if replacement/upsert is explicitly supported.

The policy must enforce both workspace membership and project/output scope encoded in the object path. `TO authenticated` alone is insufficient.

## Migration gate

**Do not create the bucket or Storage policies yet.**

Before migration:
1. inspect the actual Projects workspace membership and permission helper/RLS contracts;
2. confirm how Projects Output rows are persisted in the current backend;
3. keep the upload contract tests passing;
4. add disposable PostgreSQL/Storage RLS smoke coverage for owner/admin/lead/contributor/viewer, two unrelated members, cross-workspace access, object-path spoofing, and update/delete restrictions;
5. generate the migration only after the access model is confirmed;
6. run Supabase advisors and disposable Storage/RLS smoke tests;
7. only then consider applying the migration to the intended target after explicit release review.

## Current repository state

Projects Outputs already supports `files[]` metadata and displays attached-file metadata. The real Storage upload is **not** wired into the UI yet. The new contract utilities prepare the safe upload boundary without introducing a bucket, migration, public access, or paid Supabase resource.

## Release status

- [x] CI/build/test suite currently passing on the PR head before the latest contract-only commits.
- [x] Responsive baseline contract added for Projects.
- [x] Upload contract test exists and now covers size/type/path/metadata safety.
- [x] No Production Storage migration applied.
- [ ] Verify the latest contract-only commits in CI.
- [ ] Inspect exact workspace membership/RLS helpers.
- [ ] Add disposable Storage/RLS smoke tests.
- [ ] Implement actual Direct Upload only after those gates pass.
- [ ] Preview acceptance.
- [ ] Real authenticated workspace acceptance.
- [ ] Production verification.