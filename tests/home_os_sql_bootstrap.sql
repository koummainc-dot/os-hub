-- Disposable PostgreSQL fixture for Home OS migration smoke tests only.
create role anon nologin;
create role authenticated nologin;

create schema auth;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
grant usage on schema auth to authenticated;
grant execute on function auth.uid() to authenticated;

create table public.workspaces (id uuid primary key);
create function public.ws_access_level(p_workspace_id uuid, p_system text, p_section text)
returns text language sql stable as $$
  select case
    when p_workspace_id::text = nullif(current_setting('test.allowed_workspace_id', true), '')
      then coalesce(nullif(current_setting('test.access_level', true), ''), 'none')
    else 'none'
  end
$$;
grant execute on function public.ws_access_level(uuid,text,text) to authenticated;
