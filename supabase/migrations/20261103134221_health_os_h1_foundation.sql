-- Health & Wellness OS H1: private profiles, explicit grants, append-only audit, private documents.
-- No existing OS tables are modified. All client access is authenticated + RLS protected.

create table if not exists public.health_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null default 'ملفي الصحي' check (char_length(display_name) between 1 and 120),
  profile_type text not null default 'self' check (profile_type in ('self','dependent')),
  status text not null default 'active' check (status in ('active','archived')),
  timezone text not null default 'Africa/Cairo' check (char_length(timezone) between 1 and 80),
  locale text not null default 'ar-EG' check (char_length(locale) between 2 and 20),
  settings jsonb not null default '{}'::jsonb check (jsonb_typeof(settings) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint health_profiles_owner_id_id_key unique (owner_user_id, id)
);
create index if not exists health_profiles_owner_status_idx on public.health_profiles(owner_user_id, status, created_at desc);

create table if not exists public.health_profile_grants (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.health_profiles(id) on delete cascade,
  grantee_user_id uuid not null references auth.users(id) on delete cascade,
  granted_by uuid not null references auth.users(id) on delete restrict,
  grant_role text not null default 'viewer' check (grant_role in ('viewer','editor','custom')),
  scope_keys text[] not null default array['profile']::text[],
  actions text[] not null default array['read']::text[],
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint health_profile_grants_scope_keys_check check (cardinality(scope_keys) > 0 and scope_keys <@ array['profile','symptoms','flare_events','medications','measurements','conditions','documents','reports','care_team','all']::text[]),
  constraint health_profile_grants_actions_check check (cardinality(actions) > 0 and actions <@ array['read','create','update','delete','export']::text[]),
  constraint health_profile_grants_role_actions_check check (
    (grant_role = 'viewer' and actions <@ array['read','export']::text[]) or
    (grant_role = 'editor' and actions <@ array['read','create','update','delete','export']::text[]) or grant_role = 'custom'
  ),
  constraint health_profile_grants_dates_check check (expires_at is null or expires_at > starts_at),
  constraint health_profile_grants_profile_grantee_key unique (profile_id, grantee_user_id)
);
create index if not exists health_profile_grants_grantee_active_idx on public.health_profile_grants(grantee_user_id, profile_id, expires_at) where revoked_at is null;

create table if not exists public.health_audit_events (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.health_profiles(id) on delete cascade,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  action text not null check (action in ('profile_created','profile_updated','grant_created','grant_updated','grant_revoked','document_uploaded','document_deleted','export_requested','export_completed')),
  resource_type text not null check (char_length(resource_type) between 1 and 80),
  resource_id uuid,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);
create index if not exists health_audit_events_profile_created_idx on public.health_audit_events(profile_id, created_at desc);

alter table public.health_profiles enable row level security;
alter table public.health_profile_grants enable row level security;
alter table public.health_audit_events enable row level security;
revoke all on table public.health_profiles from anon, public;
revoke all on table public.health_profile_grants from anon, public;
revoke all on table public.health_audit_events from anon, public;
grant select, insert, update on table public.health_profiles to authenticated;
grant select, insert, update on table public.health_profile_grants to authenticated;
grant select, insert on table public.health_audit_events to authenticated;

drop policy if exists health_profiles_select_owner_or_grantee on public.health_profiles;
create policy health_profiles_select_owner_or_grantee on public.health_profiles for select to authenticated
using (
  owner_user_id = (select auth.uid()) or exists (
    select 1 from public.health_profile_grants g
    where g.profile_id = health_profiles.id and g.grantee_user_id = (select auth.uid())
      and g.revoked_at is null and g.starts_at <= now() and (g.expires_at is null or g.expires_at > now())
      and g.actions @> array['read']::text[]
      and (g.scope_keys @> array['profile']::text[] or g.scope_keys @> array['all']::text[])
  )
);
drop policy if exists health_profiles_insert_owner_only on public.health_profiles;
create policy health_profiles_insert_owner_only on public.health_profiles for insert to authenticated
with check (owner_user_id = (select auth.uid()));
drop policy if exists health_profiles_update_owner_only on public.health_profiles;
create policy health_profiles_update_owner_only on public.health_profiles for update to authenticated
using (owner_user_id = (select auth.uid())) with check (owner_user_id = (select auth.uid()));

drop policy if exists health_profile_grants_select_grantor_or_grantee on public.health_profile_grants;
create policy health_profile_grants_select_grantor_or_grantee on public.health_profile_grants for select to authenticated
using (granted_by = (select auth.uid()) or grantee_user_id = (select auth.uid()));
drop policy if exists health_profile_grants_insert_owner_only on public.health_profile_grants;
create policy health_profile_grants_insert_owner_only on public.health_profile_grants for insert to authenticated
with check (granted_by = (select auth.uid()) and exists (
  select 1 from public.health_profiles hp where hp.id = health_profile_grants.profile_id and hp.owner_user_id = (select auth.uid())
));
drop policy if exists health_profile_grants_update_owner_only on public.health_profile_grants;
create policy health_profile_grants_update_owner_only on public.health_profile_grants for update to authenticated
using (granted_by = (select auth.uid()) and exists (
  select 1 from public.health_profiles hp where hp.id = health_profile_grants.profile_id and hp.owner_user_id = (select auth.uid())
))
with check (granted_by = (select auth.uid()) and exists (
  select 1 from public.health_profiles hp where hp.id = health_profile_grants.profile_id and hp.owner_user_id = (select auth.uid())
));

drop policy if exists health_audit_events_select_owner_only on public.health_audit_events;
create policy health_audit_events_select_owner_only on public.health_audit_events for select to authenticated
using (exists (select 1 from public.health_profiles hp where hp.id = health_audit_events.profile_id and hp.owner_user_id = (select auth.uid())));
drop policy if exists health_audit_events_insert_authorized_actor on public.health_audit_events;
create policy health_audit_events_insert_authorized_actor on public.health_audit_events for insert to authenticated
with check (
  actor_user_id = (select auth.uid()) and exists (
    select 1 from public.health_profiles hp where hp.id = health_audit_events.profile_id and (
      hp.owner_user_id = (select auth.uid()) or exists (
        select 1 from public.health_profile_grants g
        where g.profile_id = hp.id and g.grantee_user_id = (select auth.uid())
          and g.revoked_at is null and g.starts_at <= now() and (g.expires_at is null or g.expires_at > now())
          and g.actions && array['create','update','delete']::text[]
          and (g.scope_keys @> array['profile']::text[] or g.scope_keys @> array['all']::text[])
      )
    )
  )
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('health-documents','health-documents',false,10485760,array['application/pdf','image/jpeg','image/png','image/webp']::text[])
on conflict (id) do nothing;

drop policy if exists health_documents_select_authorized on storage.objects;
create policy health_documents_select_authorized on storage.objects for select to authenticated using (
  bucket_id = 'health-documents' and (
    exists (select 1 from public.health_profiles hp where hp.id = case when split_part(name,'/',1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then split_part(name,'/',1)::uuid else null end and hp.owner_user_id = (select auth.uid()))
    or exists (select 1 from public.health_profile_grants g where g.profile_id = case when split_part(name,'/',1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then split_part(name,'/',1)::uuid else null end and g.grantee_user_id = (select auth.uid()) and g.revoked_at is null and g.starts_at <= now() and (g.expires_at is null or g.expires_at > now()) and g.actions @> array['read']::text[] and (g.scope_keys @> array['documents']::text[] or g.scope_keys @> array['all']::text[]))
  )
);
drop policy if exists health_documents_insert_authorized on storage.objects;
create policy health_documents_insert_authorized on storage.objects for insert to authenticated with check (
  bucket_id = 'health-documents' and (
    exists (select 1 from public.health_profiles hp where hp.id = case when split_part(name,'/',1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then split_part(name,'/',1)::uuid else null end and hp.owner_user_id = (select auth.uid()))
    or exists (select 1 from public.health_profile_grants g where g.profile_id = case when split_part(name,'/',1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then split_part(name,'/',1)::uuid else null end and g.grantee_user_id = (select auth.uid()) and g.revoked_at is null and g.starts_at <= now() and (g.expires_at is null or g.expires_at > now()) and g.actions @> array['create']::text[] and (g.scope_keys @> array['documents']::text[] or g.scope_keys @> array['all']::text[]))
  )
);
drop policy if exists health_documents_update_authorized on storage.objects;
create policy health_documents_update_authorized on storage.objects for update to authenticated using (
  bucket_id = 'health-documents' and (
    exists (select 1 from public.health_profiles hp where hp.id = case when split_part(name,'/',1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then split_part(name,'/',1)::uuid else null end and hp.owner_user_id = (select auth.uid()))
    or exists (select 1 from public.health_profile_grants g where g.profile_id = case when split_part(name,'/',1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then split_part(name,'/',1)::uuid else null end and g.grantee_user_id = (select auth.uid()) and g.revoked_at is null and g.starts_at <= now() and (g.expires_at is null or g.expires_at > now()) and g.actions @> array['update']::text[] and (g.scope_keys @> array['documents']::text[] or g.scope_keys @> array['all']::text[]))
  )
) with check (
  bucket_id = 'health-documents' and (
    exists (select 1 from public.health_profiles hp where hp.id = case when split_part(name,'/',1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then split_part(name,'/',1)::uuid else null end and hp.owner_user_id = (select auth.uid()))
    or exists (select 1 from public.health_profile_grants g where g.profile_id = case when split_part(name,'/',1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then split_part(name,'/',1)::uuid else null end and g.grantee_user_id = (select auth.uid()) and g.revoked_at is null and g.starts_at <= now() and (g.expires_at is null or g.expires_at > now()) and g.actions @> array['update']::text[] and (g.scope_keys @> array['documents']::text[] or g.scope_keys @> array['all']::text[]))
  )
);
drop policy if exists health_documents_delete_authorized on storage.objects;
create policy health_documents_delete_authorized on storage.objects for delete to authenticated using (
  bucket_id = 'health-documents' and (
    exists (select 1 from public.health_profiles hp where hp.id = case when split_part(name,'/',1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then split_part(name,'/',1)::uuid else null end and hp.owner_user_id = (select auth.uid()))
    or exists (select 1 from public.health_profile_grants g where g.profile_id = case when split_part(name,'/',1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then split_part(name,'/',1)::uuid else null end and g.grantee_user_id = (select auth.uid()) and g.revoked_at is null and g.starts_at <= now() and (g.expires_at is null or g.expires_at > now()) and g.actions @> array['delete']::text[] and (g.scope_keys @> array['documents']::text[] or g.scope_keys @> array['all']::text[]))
  )
);
comment on table public.health_profiles is 'Health OS private profile root; workspace membership never grants access.';
comment on table public.health_profile_grants is 'Explicit, revocable per-profile grants, independent from workspace permissions.';
comment on table public.health_audit_events is 'Health access/action audit trail; metadata must not contain clinical content.';
