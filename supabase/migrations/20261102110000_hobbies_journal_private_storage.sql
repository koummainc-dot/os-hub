-- Private storage for Hobbies Journal attachments.
begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'hobbies-journal-private',
  'hobbies-journal-private',
  false,
  10485760,
  array['image/jpeg','image/png','image/webp','application/pdf']::text[]
)
on conflict (id) do update
set name = excluded.name,
    public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists hobbies_journal_files_select_own on storage.objects;
create policy hobbies_journal_files_select_own
on storage.objects for select to authenticated
using (
  bucket_id = 'hobbies-journal-private'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists hobbies_journal_files_insert_own on storage.objects;
create policy hobbies_journal_files_insert_own
on storage.objects for insert to authenticated
with check (
  bucket_id = 'hobbies-journal-private'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists hobbies_journal_files_delete_own on storage.objects;
create policy hobbies_journal_files_delete_own
on storage.objects for delete to authenticated
using (
  bucket_id = 'hobbies-journal-private'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

commit;
