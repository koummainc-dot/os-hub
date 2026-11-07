create schema if not exists auth;
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated; end if;
end $$;
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
create or replace function public.ws_access_level(uuid, text, text) returns text
language sql stable as $fn$
  select case
    when current_setting('test.deny_collection', true) = $3 then 'view'::text
    else 'edit'::text
  end
$fn$;
create or replace function public.is_ws_owner(uuid) returns boolean
language sql stable as $fn$ select false $fn$;
create table public.workspace_records (
  workspace_id uuid not null,
  system_id text not null,
  collection text not null,
  id text not null,
  data jsonb not null default '{}'::jsonb,
  deleted boolean not null default false,
  visible_to uuid[],
  updated_at timestamptz not null default clock_timestamp(),
  updated_by uuid,
  primary key (workspace_id, system_id, collection, id)
);

-- Mirror the production record-visibility environment for isolated two-identity smoke tests.
alter table public.workspace_records enable row level security;
do $$ begin
  if not exists (select 1 from pg_publication where pubname='supabase_realtime') then
    create publication supabase_realtime;
  end if;
end $$;
grant usage on schema auth to authenticated;
grant execute on function auth.uid() to authenticated;
grant select, insert, update, delete on public.workspace_records to authenticated;


-- Minimal disposable Storage surface for Projects Outputs RLS smoke.
-- This mirrors only the storage tables/columns the migration and policies touch;
-- no real Supabase Storage service is used in CI.
create schema if not exists storage;
create table if not exists storage.buckets (
  id text primary key,
  name text not null,
  public boolean not null default false,
  file_size_limit bigint,
  allowed_mime_types text[]
);
create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text not null,
  name text not null,
  owner_id uuid,
  created_at timestamptz not null default clock_timestamp()
);
alter table storage.objects enable row level security;
grant usage on schema storage to authenticated;
grant select on storage.buckets to authenticated;
grant select, insert, delete on storage.objects to authenticated;
