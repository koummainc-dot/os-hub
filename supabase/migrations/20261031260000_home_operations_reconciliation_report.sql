-- Read-only reconciliation report before retiring the operations snapshot fallback.
begin;

create or replace function public.home_operations_reconciliation_report(p_workspace_id uuid)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  v_snapshot jsonb;
  v_version integer;
  v_report jsonb;
begin
  if auth.uid() is null or public.ws_access_level(p_workspace_id, 'home', 'main') <> 'edit' then
    raise exception 'HOME_ACCESS_DENIED' using errcode = '42501';
  end if;
  select data,version into v_snapshot,v_version
    from public.home_operations_snapshot where workspace_id=p_workspace_id;
  v_snapshot := coalesce(v_snapshot,'{}'::jsonb);

  select jsonb_build_object(
    'workspaceId',p_workspace_id,
    'snapshotVersion',coalesce(v_version,0),
    'snapshotUpdatedAt',(select updated_at from public.home_operations_snapshot where workspace_id=p_workspace_id),
    'collections',jsonb_build_object(
      'tasks',jsonb_build_object(
        'legacyCount',jsonb_array_length(coalesce(v_snapshot->'tasks','[]'::jsonb)),
        'relationalCount',(select count(*) from public.home_tasks where workspace_id=p_workspace_id),
        'legacyIdHash',md5(coalesce((select string_agg(x->>'id',',' order by x->>'id') from jsonb_array_elements(coalesce(v_snapshot->'tasks','[]'::jsonb)) x),'') ),
        'relationalIdHash',md5(coalesce((select string_agg(id::text,',' order by id::text) from public.home_tasks where workspace_id=p_workspace_id),''))
      ),
      'completions',jsonb_build_object(
        'legacyCount',jsonb_array_length(coalesce(v_snapshot->'completions','[]'::jsonb)),
        'relationalCount',(select count(*) from public.home_task_completions where workspace_id=p_workspace_id),
        'legacyIdHash',md5(coalesce((select string_agg(x->>'id',',' order by x->>'id') from jsonb_array_elements(coalesce(v_snapshot->'completions','[]'::jsonb)) x),'') ),
        'relationalIdHash',md5(coalesce((select string_agg(id::text,',' order by id::text) from public.home_task_completions where workspace_id=p_workspace_id),''))
      ),
      'providers',jsonb_build_object(
        'legacyCount',jsonb_array_length(coalesce(v_snapshot->'providers','[]'::jsonb)),
        'relationalCount',(select count(*) from public.home_service_providers where workspace_id=p_workspace_id),
        'legacyIdHash',md5(coalesce((select string_agg(x->>'id',',' order by x->>'id') from jsonb_array_elements(coalesce(v_snapshot->'providers','[]'::jsonb)) x),'') ),
        'relationalIdHash',md5(coalesce((select string_agg(id::text,',' order by id::text) from public.home_service_providers where workspace_id=p_workspace_id),''))
      ),
      'maintenance',jsonb_build_object(
        'legacyCount',jsonb_array_length(coalesce(v_snapshot->'maintenance','[]'::jsonb)),
        'relationalCount',(select count(*) from public.home_maintenance_records where workspace_id=p_workspace_id),
        'legacyIdHash',md5(coalesce((select string_agg(x->>'id',',' order by x->>'id') from jsonb_array_elements(coalesce(v_snapshot->'maintenance','[]'::jsonb)) x),'') ),
        'relationalIdHash',md5(coalesce((select string_agg(id::text,',' order by id::text) from public.home_maintenance_records where workspace_id=p_workspace_id),''))
      ),
      'purchaseRequests',jsonb_build_object(
        'legacyCount',jsonb_array_length(coalesce(v_snapshot->'purchaseRequests','[]'::jsonb)),
        'relationalCount',(select count(*) from public.home_purchase_requests where workspace_id=p_workspace_id),
        'legacyIdHash',md5(coalesce((select string_agg(x->>'id',',' order by x->>'id') from jsonb_array_elements(coalesce(v_snapshot->'purchaseRequests','[]'::jsonb)) x),'') ),
        'relationalIdHash',md5(coalesce((select string_agg(id::text,',' order by id::text) from public.home_purchase_requests where workspace_id=p_workspace_id),''))
      ),
      'purchaseItems',jsonb_build_object(
        'legacyCount',jsonb_array_length(coalesce(v_snapshot->'purchaseItems','[]'::jsonb)),
        'relationalCount',(select count(*) from public.home_purchase_request_items where workspace_id=p_workspace_id),
        'legacyIdHash',md5(coalesce((select string_agg(x->>'id',',' order by x->>'id') from jsonb_array_elements(coalesce(v_snapshot->'purchaseItems','[]'::jsonb)) x),'') ),
        'relationalIdHash',md5(coalesce((select string_agg(id::text,',' order by id::text) from public.home_purchase_request_items where workspace_id=p_workspace_id),''))
      ),
      'bills',jsonb_build_object(
        'legacyCount',jsonb_array_length(coalesce(v_snapshot->'bills','[]'::jsonb)),
        'relationalCount',(select count(*) from public.home_bills where workspace_id=p_workspace_id),
        'legacyIdHash',md5(coalesce((select string_agg(x->>'id',',' order by x->>'id') from jsonb_array_elements(coalesce(v_snapshot->'bills','[]'::jsonb)) x),'') ),
        'relationalIdHash',md5(coalesce((select string_agg(id::text,',' order by id::text) from public.home_bills where workspace_id=p_workspace_id),''))
      ),
      'billPayments',jsonb_build_object(
        'legacyComparable',false,
        'reason','payment history was introduced as a relational-only append-only record',
        'relationalCount',(select count(*) from public.home_bill_payments where workspace_id=p_workspace_id)
      )
    )
  ) into v_report;

  return jsonb_set(v_report,'{readyToRemoveLegacyFallback}',
    to_jsonb((
      (v_report->'collections'->'tasks'->>'legacyCount')::integer=(v_report->'collections'->'tasks'->>'relationalCount')::integer
      and v_report->'collections'->'tasks'->>'legacyIdHash'=v_report->'collections'->'tasks'->>'relationalIdHash'
      and (v_report->'collections'->'completions'->>'legacyCount')::integer=(v_report->'collections'->'completions'->>'relationalCount')::integer
      and v_report->'collections'->'completions'->>'legacyIdHash'=v_report->'collections'->'completions'->>'relationalIdHash'
      and (v_report->'collections'->'providers'->>'legacyCount')::integer=(v_report->'collections'->'providers'->>'relationalCount')::integer
      and v_report->'collections'->'providers'->>'legacyIdHash'=v_report->'collections'->'providers'->>'relationalIdHash'
      and (v_report->'collections'->'maintenance'->>'legacyCount')::integer=(v_report->'collections'->'maintenance'->>'relationalCount')::integer
      and v_report->'collections'->'maintenance'->>'legacyIdHash'=v_report->'collections'->'maintenance'->>'relationalIdHash'
      and (v_report->'collections'->'purchaseRequests'->>'legacyCount')::integer=(v_report->'collections'->'purchaseRequests'->>'relationalCount')::integer
      and v_report->'collections'->'purchaseRequests'->>'legacyIdHash'=v_report->'collections'->'purchaseRequests'->>'relationalIdHash'
      and (v_report->'collections'->'purchaseItems'->>'legacyCount')::integer=(v_report->'collections'->'purchaseItems'->>'relationalCount')::integer
      and v_report->'collections'->'purchaseItems'->>'legacyIdHash'=v_report->'collections'->'purchaseItems'->>'relationalIdHash'
      and (v_report->'collections'->'bills'->>'legacyCount')::integer=(v_report->'collections'->'bills'->>'relationalCount')::integer
      and v_report->'collections'->'bills'->>'legacyIdHash'=v_report->'collections'->'bills'->>'relationalIdHash'
    )),true);
end $$;

revoke all on function public.home_operations_reconciliation_report(uuid) from public, anon;
grant execute on function public.home_operations_reconciliation_report(uuid) to authenticated;

commit;
