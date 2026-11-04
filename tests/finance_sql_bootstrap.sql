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
CREATE TABLE IF NOT EXISTS public.finance_family_members (
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  id uuid NOT NULL,
  status text NOT NULL DEFAULT 'Active',
  PRIMARY KEY(workspace_id,id)
);
CREATE TABLE IF NOT EXISTS public.finance_transactions (
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  id uuid NOT NULL,
  status text NOT NULL,
  type text NOT NULL,
  amount numeric(20,4) NOT NULL,
  currency text NOT NULL,
  local_date date NOT NULL,
  PRIMARY KEY(workspace_id,id)
);
CREATE TABLE IF NOT EXISTS public.finance_categories (
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  id uuid NOT NULL,
  kind text NOT NULL,
  archived boolean NOT NULL DEFAULT false,
  PRIMARY KEY(workspace_id,id)
);

CREATE OR REPLACE FUNCTION public.ws_access_level(p_workspace_id uuid, p_system_id text, p_section_id text)
RETURNS text LANGUAGE sql STABLE
AS $$
  SELECT CASE
    WHEN p_workspace_id::text = nullif(current_setting('test.workspace_id', true), '')
      THEN coalesce(nullif(current_setting('test.finance_access', true), ''), 'edit')
    ELSE 'none'
  END
$$;
CREATE OR REPLACE FUNCTION public.fin_family_need(p_workspace_id uuid, p_access text, p_allow_private boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
BEGIN
  IF public.ws_access_level(p_workspace_id,'finance','family') <> 'edit' THEN
    RAISE EXCEPTION 'FINANCE_FAMILY_EDIT_REQUIRED' USING ERRCODE='42501';
  END IF;
END
$$;
CREATE OR REPLACE FUNCTION public.fin__audit(
  p_workspace_id uuid,p_actor_id uuid,p_entity_type text,p_entity_id text,
  p_action text,p_reason text,p_before jsonb,p_after jsonb
) RETURNS void LANGUAGE plpgsql AS $ BEGIN RETURN; END $;

GRANT USAGE ON SCHEMA public, auth TO authenticated;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;
GRANT EXECUTE ON FUNCTION public.ws_access_level(uuid,text,text) TO authenticated;
