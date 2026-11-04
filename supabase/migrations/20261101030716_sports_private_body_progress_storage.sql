-- Private body-progress photos for Sports OS.
-- Files are owned by the authenticated uploader and are never served from a public bucket.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'sports-body-progress',
  'sports-body-progress',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set name = excluded.name,
    public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists sports_body_progress_select_own on storage.objects;
create policy sports_body_progress_select_own
on storage.objects for select to authenticated
using (
  bucket_id = 'sports-body-progress'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists sports_body_progress_insert_own on storage.objects;
create policy sports_body_progress_insert_own
on storage.objects for insert to authenticated
with check (
  bucket_id = 'sports-body-progress'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists sports_body_progress_update_own on storage.objects;
create policy sports_body_progress_update_own
on storage.objects for update to authenticated
using (
  bucket_id = 'sports-body-progress'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'sports-body-progress'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists sports_body_progress_delete_own on storage.objects;
create policy sports_body_progress_delete_own
on storage.objects for delete to authenticated
using (
  bucket_id = 'sports-body-progress'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);