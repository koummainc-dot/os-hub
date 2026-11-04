-- Health OS H1 completion: private document registry with scoped access.
create table if not exists public.health_documents (
 id uuid primary key default gen_random_uuid(),
 profile_id uuid not null references public.health_profiles(id) on delete cascade,
 object_path text not null unique,
 display_name text not null check(char_length(trim(display_name)) between 1 and 180),
 original_filename text not null check(char_length(trim(original_filename)) between 1 and 255),
 document_type text not null default 'other' check(document_type in ('lab_result','imaging','prescription','visit_summary','discharge_summary','insurance','other')),
 document_date date,
 mime_type text not null check(mime_type in ('application/pdf','image/jpeg','image/png','image/webp')),
 size_bytes bigint not null check(size_bytes between 1 and 10485760),
 notes text check(notes is null or char_length(notes)<=3000),
 uploaded_by uuid not null references auth.users(id) on delete restrict,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint health_documents_path_profile_check check(split_part(object_path,'/',1)=profile_id::text)
);
create index if not exists health_documents_profile_created_idx on public.health_documents(profile_id,created_at desc);
alter table public.health_documents enable row level security;
revoke all on table public.health_documents from anon,public;
grant select,insert,update,delete on table public.health_documents to authenticated;

drop policy if exists health_documents_select_scoped on public.health_documents;
create policy health_documents_select_scoped on public.health_documents for select to authenticated
using(public.health_has_access(profile_id,'documents','read'));
drop policy if exists health_documents_insert_scoped on public.health_documents;
create policy health_documents_insert_scoped on public.health_documents for insert to authenticated
with check(uploaded_by=(select auth.uid()) and public.health_has_access(profile_id,'documents','create'));
drop policy if exists health_documents_update_scoped on public.health_documents;
create policy health_documents_update_scoped on public.health_documents for update to authenticated
using(public.health_has_access(profile_id,'documents','update'))
with check(public.health_has_access(profile_id,'documents','update'));
drop policy if exists health_documents_delete_scoped on public.health_documents;
create policy health_documents_delete_scoped on public.health_documents for delete to authenticated
using(public.health_has_access(profile_id,'documents','delete'));

drop policy if exists health_audit_events_insert_authorized_actor on public.health_audit_events;
create policy health_audit_events_insert_authorized_actor on public.health_audit_events for insert to authenticated with check (
 actor_user_id=(select auth.uid()) and (
  exists(select 1 from public.health_profiles hp where hp.id=health_audit_events.profile_id and hp.owner_user_id=(select auth.uid()))
  or public.health_has_access(profile_id,
   case when resource_type in ('condition','allergy') then 'conditions'
        when resource_type in ('symptom_definition','symptom_log') then 'symptoms'
        when resource_type='document' then 'documents'
        else 'profile' end,
   case when action like '%_created' then 'create' when action like '%_uploaded' then 'create' when action like '%_deleted' then 'delete' else 'update' end)
 )
);
