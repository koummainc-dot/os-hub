-- Skincare OS — private progress-photo storage and section-level record permissions.
-- Repository-only until explicitly reviewed and applied.
-- Paths: {workspace_uuid}/{diary-YYYY-MM-DD}/{photo_uuid}.{jpg|png|webp}
-- Thumbnails: {workspace_uuid}/{diary-YYYY-MM-DD}/{photo_uuid}.thumb.webp
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
values ('skincare-progress','skincare-progress',false,10485760,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists skincare_progress_select on storage.objects;
create policy skincare_progress_select on storage.objects
for select to authenticated
using (
  bucket_id = 'skincare-progress'
  and case
    when (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      and (storage.foldername(name))[2] ~ '^diary-[0-9]{4}-[0-9]{2}-[0-9]{2}$'
      and storage.filename(name) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}(\.thumb)?\.(jpg|png|webp)$'
    then
      public.ws_access_level(((storage.foldername(name))[1])::uuid, 'skincare', 'photos') in ('view','edit')
      and exists (
        select 1
        from public.workspace_records photo
        join public.workspace_records diary
          on diary.workspace_id = photo.workspace_id
         and diary.system_id = 'skincare'
         and diary.collection = 'skin_diary'
         and diary.id = photo.data->>'diaryId'
         and diary.deleted = false
         and diary.data->>'deleted_at' is null
        where photo.workspace_id = ((storage.foldername(name))[1])::uuid
          and photo.system_id = 'skincare'
          and photo.collection = 'skin_photos'
          and photo.id = split_part(storage.filename(name), '.', 1)
          and photo.deleted = false
          and photo.data->>'deleted_at' is null
          and photo.data->>'objectPath' is not distinct from case
            when storage.filename(name) ~* '\.thumb\.webp$' then null
            else name
          end
          and (photo.data->>'objectPath' = name or photo.data->>'thumbnailPath' = name)
          and diary.data->>'date' = photo.data->>'date'
      )
    else false
  end
);

drop policy if exists skincare_progress_insert on storage.objects;
create policy skincare_progress_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'skincare-progress'
  and case
    when (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      and (storage.foldername(name))[2] ~ '^diary-[0-9]{4}-[0-9]{2}-[0-9]{2}$'
      and storage.filename(name) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}(\.thumb)?\.(jpg|png|webp)$'
    then
      public.ws_access_level(((storage.foldername(name))[1])::uuid, 'skincare', 'photos') = 'edit'
      and exists (
        select 1
        from public.workspace_records diary
        where diary.workspace_id = ((storage.foldername(name))[1])::uuid
          and diary.system_id = 'skincare'
          and diary.collection = 'skin_diary'
          and diary.id = (storage.foldername(name))[2]
          and diary.data->>'date' = substring((storage.foldername(name))[2] from 7)
          and diary.deleted = false
          and diary.data->>'deleted_at' is null
      )
    else false
  end
);

-- Uploads use upsert=false; deliberately do not grant object UPDATE.
drop policy if exists skincare_progress_update on storage.objects;

drop policy if exists skincare_progress_delete on storage.objects;
create policy skincare_progress_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'skincare-progress'
  and case
    when (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      and (storage.foldername(name))[2] ~ '^diary-[0-9]{4}-[0-9]{2}-[0-9]{2}$'
      and storage.filename(name) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}(\.thumb)?\.(jpg|png|webp)$'
    then public.ws_access_level(((storage.foldername(name))[1])::uuid, 'skincare', 'photos') = 'edit'
    else false
  end
);

commit;
