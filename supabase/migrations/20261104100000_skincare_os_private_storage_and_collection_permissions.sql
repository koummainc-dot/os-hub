-- Skincare OS — private progress-photo storage and section-level record permissions.
-- This migration is intentionally committed to the repository only; it has not been
-- applied to the connected production Supabase project.
begin;

insert into public.collection_sections(system_id, collection, section_id) values
  ('skincare','skin_profile','settings'),
  ('skincare','skin_products','products'),
  ('skincare','skin_units','units'),
  ('skincare','skin_diary','diary'),
  ('skincare','skin_routines','routines'),
  ('skincare','skin_routine_logs','routines'),
  ('skincare','skin_ingredients','ingredients'),
  ('skincare','skin_trials','trials'),
  ('skincare','skin_reactions','reactions'),
  ('skincare','skin_photos','photos'),
  ('skincare','skin_lists','lists'),
  ('skincare','skin_settings','settings')
on conflict (system_id, collection) do update set section_id = excluded.section_id;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'skincare-progress',
  'skincare-progress',
  false,
  10485760,
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do update set
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists skincare_progress_select on storage.objects;
create policy skincare_progress_select
on storage.objects for select to authenticated
using (
  bucket_id = 'skincare-progress'
  and case
    when (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then public.ws_access_level(((storage.foldername(name))[1])::uuid, 'skincare', 'photos') in ('view','edit')
    else false
  end
);

drop policy if exists skincare_progress_insert on storage.objects;
create policy skincare_progress_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'skincare-progress'
  and case
    when (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then public.ws_access_level(((storage.foldername(name))[1])::uuid, 'skincare', 'photos') = 'edit'
    else false
  end
);

drop policy if exists skincare_progress_update on storage.objects;
create policy skincare_progress_update
on storage.objects for update to authenticated
using (
  bucket_id = 'skincare-progress'
  and case
    when (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then public.ws_access_level(((storage.foldername(name))[1])::uuid, 'skincare', 'photos') = 'edit'
    else false
  end
)
with check (
  bucket_id = 'skincare-progress'
  and case
    when (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then public.ws_access_level(((storage.foldername(name))[1])::uuid, 'skincare', 'photos') = 'edit'
    else false
  end
);

drop policy if exists skincare_progress_delete on storage.objects;
create policy skincare_progress_delete
on storage.objects for delete to authenticated
using (
  bucket_id = 'skincare-progress'
  and case
    when (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then public.ws_access_level(((storage.foldername(name))[1])::uuid, 'skincare', 'photos') = 'edit'
    else false
  end
);

commit;
