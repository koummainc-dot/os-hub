\set ON_ERROR_STOP on
DO $$ BEGIN
  EXECUTE 'CREATE ROLE anon NOLOGIN';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  EXECUTE 'CREATE ROLE authenticated NOLOGIN';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE SCHEMA IF NOT EXISTS auth;
CREATE TABLE IF NOT EXISTS auth.users (id uuid PRIMARY KEY);
CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid LANGUAGE sql STABLE
AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;

CREATE TABLE IF NOT EXISTS public.workspaces (
  id uuid PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Test workspace'
);

CREATE OR REPLACE FUNCTION public.ws_access_level(p_workspace_id uuid, p_system_id text, p_section_id text)
RETURNS text LANGUAGE sql STABLE
AS $$
  SELECT CASE
    WHEN p_workspace_id::text = nullif(current_setting('test.workspace_id', true), '')
      THEN coalesce(nullif(current_setting('test.inventory_access', true), ''), 'edit')
    ELSE 'none'
  END
$$;

GRANT USAGE ON SCHEMA public, auth TO authenticated;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;
GRANT EXECUTE ON FUNCTION public.ws_access_level(uuid,text,text) TO authenticated;
