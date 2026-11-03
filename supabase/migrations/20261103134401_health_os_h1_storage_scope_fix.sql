-- Fix Storage authorization so document-only grants do not depend on visibility of the profile row.
-- Object path format: <profile-uuid>/<opaque-filename>. Never put medical details in object names.
drop policy if exists health_documents_select_authorized on storage.objects;
create policy health_documents_select_authorized on storage.objects for select to authenticated using (
 bucket_id='health-documents' and (
  exists(select 1 from public.health_profiles hp where hp.id=case when split_part(name,'/',1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then split_part(name,'/',1)::uuid else null end and hp.owner_user_id=(select auth.uid()))
  or exists(select 1 from public.health_profile_grants g where g.profile_id=case when split_part(name,'/',1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then split_part(name,'/',1)::uuid else null end and g.grantee_user_id=(select auth.uid()) and g.revoked_at is null and g.starts_at<=now() and (g.expires_at is null or g.expires_at>now()) and g.actions @> array['read']::text[] and (g.scope_keys @> array['documents']::text[] or g.scope_keys @> array['all']::text[]))
 ));
drop policy if exists health_documents_insert_authorized on storage.objects;
create policy health_documents_insert_authorized on storage.objects for insert to authenticated with check (
 bucket_id='health-documents' and (
  exists(select 1 from public.health_profiles hp where hp.id=case when split_part(name,'/',1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then split_part(name,'/',1)::uuid else null end and hp.owner_user_id=(select auth.uid()))
  or exists(select 1 from public.health_profile_grants g where g.profile_id=case when split_part(name,'/',1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then split_part(name,'/',1)::uuid else null end and g.grantee_user_id=(select auth.uid()) and g.revoked_at is null and g.starts_at<=now() and (g.expires_at is null or g.expires_at>now()) and g.actions @> array['create']::text[] and (g.scope_keys @> array['documents']::text[] or g.scope_keys @> array['all']::text[]))
 ));
drop policy if exists health_documents_update_authorized on storage.objects;
create policy health_documents_update_authorized on storage.objects for update to authenticated using (
 bucket_id='health-documents' and (
  exists(select 1 from public.health_profiles hp where hp.id=case when split_part(name,'/',1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then split_part(name,'/',1)::uuid else null end and hp.owner_user_id=(select auth.uid()))
  or exists(select 1 from public.health_profile_grants g where g.profile_id=case when split_part(name,'/',1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then split_part(name,'/',1)::uuid else null end and g.grantee_user_id=(select auth.uid()) and g.revoked_at is null and g.starts_at<=now() and (g.expires_at is null or g.expires_at>now()) and g.actions @> array['update']::text[] and (g.scope_keys @> array['documents']::text[] or g.scope_keys @> array['all']::text[]))
 )) with check (
 bucket_id='health-documents' and (
  exists(select 1 from public.health_profiles hp where hp.id=case when split_part(name,'/',1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then split_part(name,'/',1)::uuid else null end and hp.owner_user_id=(select auth.uid()))
  or exists(select 1 from public.health_profile_grants g where g.profile_id=case when split_part(name,'/',1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then split_part(name,'/',1)::uuid else null end and g.grantee_user_id=(select auth.uid()) and g.revoked_at is null and g.starts_at<=now() and (g.expires_at is null or g.expires_at>now()) and g.actions @> array['update']::text[] and (g.scope_keys @> array['documents']::text[] or g.scope_keys @> array['all']::text[]))
 ));
drop policy if exists health_documents_delete_authorized on storage.objects;
create policy health_documents_delete_authorized on storage.objects for delete to authenticated using (
 bucket_id='health-documents' and (
  exists(select 1 from public.health_profiles hp where hp.id=case when split_part(name,'/',1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then split_part(name,'/',1)::uuid else null end and hp.owner_user_id=(select auth.uid()))
  or exists(select 1 from public.health_profile_grants g where g.profile_id=case when split_part(name,'/',1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then split_part(name,'/',1)::uuid else null end and g.grantee_user_id=(select auth.uid()) and g.revoked_at is null and g.starts_at<=now() and (g.expires_at is null or g.expires_at>now()) and g.actions @> array['delete']::text[] and (g.scope_keys @> array['documents']::text[] or g.scope_keys @> array['all']::text[]))
 ));