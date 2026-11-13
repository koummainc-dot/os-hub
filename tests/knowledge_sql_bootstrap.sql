-- Minimal disposable PostgreSQL contract fixture for the Knowledge migration.
-- This is test-only scaffolding, never applied to Supabase production.
create role anon nologin;
create role authenticated nologin;

create schema auth;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
grant usage on schema auth to authenticated;
grant execute on function auth.uid() to authenticated;

create schema storage;
create table storage.buckets (
  id text primary key,
  name text not null,
  public boolean not null default false,
  file_size_limit bigint,
  allowed_mime_types text[]
);
create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text not null references storage.buckets(id),
  name text not null
);
alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[]
language sql immutable as $$
  select (string_to_array(name, '/'))[1:2]
$$;
grant usage on schema storage to authenticated;
grant select,insert,update,delete on storage.objects to authenticated;

create table public.workspaces (id uuid primary key);
create table public.workspace_data (
  workspace_id uuid not null,
  system_id text not null,
  part text not null default 'main',
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key(workspace_id,system_id,part)
);
create table public.workspace_records (
  workspace_id uuid not null,
  system_id text not null,
  collection text not null,
  id text not null,
  data jsonb not null default '{}'::jsonb,
  deleted boolean not null default false,
  visible_to uuid[],
  updated_at timestamptz not null default now(),
  primary key(workspace_id,system_id,collection,id)
);
alter table public.workspace_records enable row level security;
grant select,insert,update,delete on public.workspace_records to authenticated;

create or replace function public.ws_access_level(p_workspace_id uuid, p_system text, p_section text)
returns text language sql stable as $
  select case
    when p_workspace_id::text <> nullif(current_setting('test.allowed_workspace_id', true), '') then 'none'
    when p_system = 'projects' then coalesce(
      nullif(current_setting('test.projects_access_level', true), ''),
      nullif(current_setting('test.access_level', true), ''),
      'none'
    )
    else coalesce(nullif(current_setting('test.access_level', true), ''), 'none')
  end
$;
create policy workspace_records_select on public.workspace_records
for select to authenticated
using (
  public.ws_access_level(workspace_id, system_id, collection) in ('view','edit')
  and (visible_to is null or auth.uid() = any(visible_to))
);
create policy workspace_records_insert on public.workspace_records
for insert to authenticated
with check (public.ws_access_level(workspace_id, system_id, collection) = 'edit');
create policy workspace_records_update on public.workspace_records
for update to authenticated
using (public.ws_access_level(workspace_id, system_id, collection) = 'edit')
with check (public.ws_access_level(workspace_id, system_id, collection) = 'edit');
create policy workspace_records_delete on public.workspace_records
for delete to authenticated
using (public.ws_access_level(workspace_id, system_id, collection) = 'edit');
create function public.is_ws_owner(p_workspace_id uuid)
returns boolean language sql stable as $$
  select p_workspace_id::text = nullif(current_setting('test.owner_workspace_id', true), '')
$$;
