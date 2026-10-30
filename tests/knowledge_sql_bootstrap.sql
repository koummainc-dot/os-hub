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
create function public.ws_access_level(p_workspace_id uuid, p_system text, p_section text)
returns text language sql stable as $$
  select case
    when p_workspace_id::text = nullif(current_setting('test.allowed_workspace_id', true), '')
      then coalesce(nullif(current_setting('test.access_level', true), ''), 'none')
    else 'none'
  end
$$;
create function public.is_ws_owner(p_workspace_id uuid)
returns boolean language sql stable as $$
  select p_workspace_id::text = nullif(current_setting('test.owner_workspace_id', true), '')
$$;
