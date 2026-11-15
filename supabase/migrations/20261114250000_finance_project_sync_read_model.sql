begin;

-- Pull-through Finance read model contract:
--   as_of: start of this read request
--   last_synced_at: completion time of the successful pull
--   sync_status: fresh only when the Finance-owned read model succeeded
-- The Projects client keeps the last successful response and marks it stale
-- on a subsequent transport/permission failure. No shadow Finance data is stored.

create or replace function public.fin_projects_sync_get(p_ws uuid)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $function$
declare
  v_as_of timestamptz := statement_timestamp();
  v_last_synced_at timestamptz;
  v_projects jsonb;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHENTICATED' using errcode = '42501';
  end if;
  if p_ws is null then
    raise exception 'WORKSPACE_REQUIRED' using errcode = '22023';
  end if;

  -- Existing Finance RPC retains its own Finance permission enforcement.
  v_projects := coalesce(public.fin_projects_get(p_ws), '[]'::jsonb);
  if jsonb_typeof(v_projects) is distinct from 'array' then
    raise exception 'FINANCE_PROJECT_READ_MODEL_INVALID' using errcode = '22023';
  end if;
  v_last_synced_at := clock_timestamp();

  return jsonb_build_object(
    'projects', v_projects,
    'as_of', v_as_of,
    'last_synced_at', v_last_synced_at,
    'sync_status', 'fresh',
    'sync_source', 'finance-ledger-read-model',
    'contract_version', 1
  );
end;
$function$;

revoke all on function public.fin_projects_sync_get(uuid) from public, anon;
grant execute on function public.fin_projects_sync_get(uuid) to authenticated;

commit;
