-- Disposable PostgreSQL fixture for Spiritual & Values OS migrations.
create role authenticated nologin;
create role anon nologin;
create schema auth;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
grant usage on schema auth to authenticated;
grant execute on function auth.uid() to authenticated;

create table public.workspaces (id uuid primary key);
create table public.collection_sections (
  system_id text not null,
  collection text not null,
  section_id text not null,
  primary key (system_id, collection)
);
grant select on public.collection_sections to authenticated;
