create schema if not exists auth;
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated; end if;
end $$;
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
create or replace function public.ws_access_level(uuid, text, text) returns text
language sql stable as $$ select 'edit'::text $$;
create table public.workspace_records (
  workspace_id uuid not null,
  system_id text not null,
  collection text not null,
  id text not null,
  data jsonb not null default '{}'::jsonb,
  deleted boolean not null default false,
  visible_to uuid[],
  primary key (workspace_id, system_id, collection, id)
);
