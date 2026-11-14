-- Harden the pure Output Storage path parser.
-- Parsing the opaque object key does not require elevated table privileges.
create or replace function public.projects_output_workspace_id(object_name text)
returns uuid
language plpgsql
immutable
security invoker
set search_path = ''
as $function$
declare
  matched text[];
begin
  matched := pg_catalog.regexp_match(
    coalesce(object_name, ''),
    '^workspace/([0-9a-fA-F-]{36})/project/[^/]+/output/[^/]+/[^/]+$'
  );

  if matched is null then
    return null;
  end if;

  return matched[1]::uuid;
exception
  when others then
    return null;
end;
$function$;

revoke all on function public.projects_output_workspace_id(text) from public, anon;
grant execute on function public.projects_output_workspace_id(text) to authenticated;
