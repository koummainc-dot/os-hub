# Skincare live RLS / Storage tests

These tests are opt-in and must run against a disposable Supabase test project or isolated development branch, never against a user's production workspace.

## Required environment

Set these variables in the local shell or CI secret store; do not commit JWTs or service-role keys:

- `SKINCARE_LIVE_TESTS=1`
- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SKINCARE_TEST_WORKSPACE_ID`
- `SKINCARE_OWNER_JWT`
- `SKINCARE_EDITOR_JWT`
- `SKINCARE_VIEWER_JWT`
- `SKINCARE_OTHER_WORKSPACE_ID`
- `SKINCARE_OTHER_VIEWER_JWT`
- Optional: `SKINCARE_TEST_DIARY_DATE` (default: `1900-01-01`, choose an unused date)
- Optional: `SKINCARE_VIEWER_CAN_VIEW=1` when the viewer has explicit view access to the diary and photo sections.

The test users must be actual authenticated users in the test project. The owner token must own the first workspace; the editor token must have edit access to Skincare; the viewer token must have view or no access according to the optional flag; the other viewer must belong only to the second workspace.

## Run

```bash
npm run test:skincare:live
```

The harness creates one diary row, one photo metadata row, and two tiny Storage objects, then attempts unauthorized viewer and cross-workspace operations. It cleans up by soft-deleting the test rows and removing the test objects.

The test requires the Skincare collection mapping migration and private Storage bucket/policies to be installed in the isolated project first. It does not create users, workspaces, migrations, or buckets. If any setup is missing, the test should fail rather than silently passing.
