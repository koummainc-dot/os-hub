# Knowledge OS reminders — setup and rollout

## What is implemented
- Saving a resource with a review date creates or updates a pending in-app review reminder.
- Saving an event with a date creates or updates an in-app event reminder (default reminder time is 09:00 in the item's timezone when no start time is supplied).
- The Edge Function at `supabase/functions/knowledge-reminders/index.ts` processes up to 100 due `in_app` reminders per invocation and writes to `knowledge_notifications`.
- The Knowledge OS navigation has a **التذكيرات** inbox where the recipient can read and mark their notifications as read.
- The function does not send email or push notifications; those channels remain unprocessed until providers are configured.

## Required environment variables
Configure these as Edge Function secrets, never in browser-visible environment variables:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `KNOWLEDGE_REMINDER_CRON_SECRET` — use a long random secret.

## Schedule after database rollout
Do not schedule this function until the Knowledge migration has been tested and Issue #85 migration-history reconciliation is complete.

Deploy the function named `knowledge-reminders`, then configure Supabase Cron (or an external scheduler) to send an HTTP POST to the function URL every 5 minutes with headers `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>` and `x-knowledge-cron-secret: <KNOWLEDGE_REMINDER_CRON_SECRET>`. Store both values only in the scheduler's secret store; never put either in browser code or a public repository. A successful response reports `scanned`, `delivered`, `skipped`, and `failed` counts.

## Safety and operational notes
- The bucket is private; signed attachment URLs expire after 10 minutes.
- Attachment size is capped at 10 MiB and the accepted MIME types are allowlisted.
- The preview SQL at `docs/sql/knowledge_migration_preview.sql` is read-only and reports counts/bytes, not item content.
- The Edge Function and migration are committed to the Knowledge PR but have not been deployed or applied to production.
- Verify SQL runtime and workspace-role RLS on a dedicated migrated test database before production rollout.
