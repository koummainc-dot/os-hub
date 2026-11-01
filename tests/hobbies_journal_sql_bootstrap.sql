-- Disposable PostgreSQL fixture for Hobbies Journal privacy and private storage.
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
create function public.ws_access_level(p_workspace_id uuid, p_system text, p_section text)
returns text language sql stable as $$ select 'edit'::text $$;
grant execute on function public.ws_access_level(uuid,text,text) to authenticated;

create table public.workspace_records (
  workspace_id uuid not null,
  system_id text not null,
  collection text not null,
  id text not null,
  data jsonb not null default '{}'::jsonb,
  deleted boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  visible_to uuid[],
  primary key(workspace_id,system_id,collection,id)
);
alter table public.workspace_records enable row level security;
create policy wr_select on public.workspace_records for select to authenticated
using(public.ws_access_level(workspace_id,system_id,collection) in ('view','edit') and (visible_to is null or auth.uid()=any(visible_to)));
create policy wr_insert on public.workspace_records for insert to authenticated
with check(public.ws_access_level(workspace_id,system_id,collection)='edit' and (visible_to is null or auth.uid()=any(visible_to)));
create policy wr_update on public.workspace_records for update to authenticated
using(public.ws_access_level(workspace_id,system_id,collection)='edit' and (visible_to is null or auth.uid()=any(visible_to)))
with check(public.ws_access_level(workspace_id,system_id,collection)='edit' and (visible_to is null or auth.uid()=any(visible_to)));
grant select,insert,update,delete on public.workspace_records to authenticated;

create schema storage;
create table storage.buckets(id text primary key,name text not null,public boolean not null default false,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text not null references storage.buckets(id),name text not null);
alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[] language sql immutable as $$
  select string_to_array(name,'/')
$$;
grant usage on schema storage to authenticated;
grant select,insert,update,delete on storage.objects to authenticated;
