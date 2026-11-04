\set ON_ERROR_STOP on
DO $$ BEGIN
  EXECUTE 'CREATE ROLE anon NOLOGIN';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  EXECUTE 'CREATE ROLE authenticated NOLOGIN';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS storage;
CREATE TABLE IF NOT EXISTS auth.users (id uuid PRIMARY KEY);
CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid LANGUAGE sql STABLE
AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;

CREATE TABLE IF NOT EXISTS public.workspaces (id uuid PRIMARY KEY, owner_id uuid);
CREATE TABLE IF NOT EXISTS public.collection_sections (
  system_id text NOT NULL, collection text NOT NULL, section_id text NOT NULL,
  PRIMARY KEY(system_id,collection)
);
CREATE TABLE IF NOT EXISTS public.workspace_records (
  workspace_id uuid NOT NULL, system_id text NOT NULL, collection text NOT NULL,
  id text NOT NULL, data jsonb NOT NULL DEFAULT '{}'::jsonb, deleted boolean NOT NULL DEFAULT false,
  PRIMARY KEY(workspace_id,system_id,collection,id)
);

CREATE TABLE IF NOT EXISTS storage.buckets (
  id text PRIMARY KEY, name text NOT NULL, public boolean NOT NULL DEFAULT false,
  file_size_limit bigint, allowed_mime_types text[]
);
CREATE TABLE IF NOT EXISTS storage.objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), bucket_id text NOT NULL REFERENCES storage.buckets(id),
  name text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(bucket_id,name)
);
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION storage.foldername(object_name text)
RETURNS text[] LANGUAGE sql IMMUTABLE
AS $$
  SELECT CASE WHEN cardinality(string_to_array(object_name,'/')) > 1
    THEN (string_to_array(object_name,'/'))[1:cardinality(string_to_array(object_name,'/'))-1]
    ELSE ARRAY[]::text[] END
$$;
CREATE OR REPLACE FUNCTION storage.filename(object_name text)
RETURNS text LANGUAGE sql IMMUTABLE
AS $$ SELECT split_part(object_name,'/',cardinality(string_to_array(object_name,'/'))) $$;

CREATE OR REPLACE FUNCTION public.ws_access_level(p_workspace_id uuid, p_system_id text, p_section_id text)
RETURNS text LANGUAGE sql STABLE
AS $$
  SELECT CASE
    WHEN p_workspace_id::text = nullif(current_setting('test.workspace_id', true), '')
      THEN coalesce(nullif(current_setting('test.skincare_access', true), ''), 'edit')
    ELSE 'none'
  END
$$;

GRANT USAGE ON SCHEMA public, auth, storage TO authenticated;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;
GRANT EXECUTE ON FUNCTION public.ws_access_level(uuid,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION storage.foldername(text), storage.filename(text) TO authenticated;
GRANT SELECT, INSERT, DELETE ON storage.objects TO authenticated;
