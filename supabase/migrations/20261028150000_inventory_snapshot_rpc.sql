-- Inventory normalized snapshot RPCs.
-- Requires P0 + P1 schema migrations. Prepared for review; not applied to any database.
-- SECURITY INVOKER is intentional: table grants and RLS remain in force.
begin;

create or replace function public.inventory_load_snapshot(p_workspace_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  result jsonb;
begin
  if auth.uid() is null then
    raise exception 'INVENTORY_AUTH_REQUIRED' using errcode='42501';
  end if;
  if public.ws_access_level(p_workspace_id, 'inventory', 'main') not in ('view','edit') then
    raise exception 'INVENTORY_ACCESS_DENIED' using errcode='42501';
  end if;

  select jsonb_build_object(
    'schema_version', 1,
    'tables', jsonb_build_object(
      'inventory_settings', coalesce((select jsonb_agg(to_jsonb(x)) from public.inventory_settings x where x.workspace_id=p_workspace_id), '[]'::jsonb),
      'inventory_categories', coalesce((select jsonb_agg(to_jsonb(x)) from public.inventory_categories x where x.workspace_id=p_workspace_id), '[]'::jsonb),
      'inventory_locations', coalesce((select jsonb_agg(to_jsonb(x)) from public.inventory_locations x where x.workspace_id=p_workspace_id), '[]'::jsonb),
      'inventory_items', coalesce((select jsonb_agg(to_jsonb(x)) from public.inventory_items x where x.workspace_id=p_workspace_id), '[]'::jsonb),
      'inventory_ownership_events', coalesce((select jsonb_agg(to_jsonb(x)) from public.inventory_ownership_events x where x.workspace_id=p_workspace_id), '[]'::jsonb),
      'inventory_warranties', coalesce((select jsonb_agg(to_jsonb(x)) from public.inventory_warranties x where x.workspace_id=p_workspace_id), '[]'::jsonb),
      'inventory_loans', coalesce((select jsonb_agg(to_jsonb(x)) from public.inventory_loans x where x.workspace_id=p_workspace_id), '[]'::jsonb),
      'inventory_replacement_plans', coalesce((select jsonb_agg(to_jsonb(x)) from public.inventory_replacement_plans x where x.workspace_id=p_workspace_id), '[]'::jsonb),
      'inventory_service_logs', coalesce((select jsonb_agg(to_jsonb(x)) from public.inventory_service_logs x where x.workspace_id=p_workspace_id), '[]'::jsonb),
      'inventory_audit_log', coalesce((select jsonb_agg(to_jsonb(x)) from public.inventory_audit_log x where x.workspace_id=p_workspace_id and x.metadata ? 'legacy_event_id'), '[]'::jsonb)
    )
  ) into result;
  return result;
end;
$$;

create or replace function public.inventory_save_snapshot(p_workspace_id uuid, p_snapshot jsonb)
returns timestamptz
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_table_name text;
  update_columns text;
  rows_json jsonb;
  allowed_tables constant text[] := array[
    'inventory_categories','inventory_locations','inventory_items',
    'inventory_warranties','inventory_loans','inventory_replacement_plans',
    'inventory_service_logs'
  ];
begin
  if auth.uid() is null then
    raise exception 'INVENTORY_AUTH_REQUIRED' using errcode='42501';
  end if;
  if public.ws_access_level(p_workspace_id, 'inventory', 'main') <> 'edit' then
    raise exception 'INVENTORY_EDIT_REQUIRED' using errcode='42501';
  end if;
  if jsonb_typeof(p_snapshot) <> 'object'
     or jsonb_typeof(p_snapshot->'tables') <> 'object'
     or jsonb_typeof(p_snapshot->'tables'->'inventory_settings') <> 'array' then
    raise exception 'INVENTORY_INVALID_SNAPSHOT' using errcode='22023';
  end if;
  -- Every row must belong to the authorized workspace. Never trust workspace IDs
  -- supplied inside a client payload, even when RLS would also reject the write.
  foreach v_table_name in array array[
    'inventory_settings','inventory_categories','inventory_locations','inventory_items',
    'inventory_ownership_events','inventory_warranties','inventory_loans',
    'inventory_replacement_plans','inventory_service_logs','inventory_identifiers',
    'inventory_valuations','inventory_attachments','inventory_audit_log'
  ] loop
    rows_json := coalesce(p_snapshot->'tables'->v_table_name, '[]'::jsonb);
    if jsonb_typeof(rows_json) <> 'array' then
      raise exception 'INVENTORY_TABLE_ROWS_MUST_BE_ARRAY: %', v_table_name using errcode='22023';
    end if;
    if exists (
      select 1 from jsonb_array_elements(rows_json) as entry(row_json)
      where entry.row_json->>'workspace_id' is distinct from p_workspace_id::text
    ) then
      raise exception 'INVENTORY_WORKSPACE_MISMATCH: %', v_table_name using errcode='42501';
    end if;
  end loop;

  -- Serialize saves per workspace so legacy audit de-duplication is race-safe.
  perform pg_advisory_xact_lock(hashtextextended(p_workspace_id::text, 0));

  -- Settings are a workspace singleton; defaults are made explicit by the mapper.
  insert into public.inventory_settings (
    workspace_id, default_currency, timezone, week_start_day,
    warranty_reminder_days, warranty_expiring_window_days,
    replacement_reminder_days, loan_reminder_days, lost_followup_days,
    preferences, version, is_demo, created_at, updated_at, created_by, updated_by
  )
  select p_workspace_id,
    coalesce(s.default_currency, 'EGP'), coalesce(s.timezone, 'Africa/Cairo'),
    coalesce(s.week_start_day, 6), coalesce(s.warranty_reminder_days, array[30,7,1]),
    coalesce(s.warranty_expiring_window_days, 30), coalesce(s.replacement_reminder_days, 30),
    coalesce(s.loan_reminder_days, 1), coalesce(s.lost_followup_days, 7),
    coalesce(s.preferences, '{}'::jsonb), coalesce(s.version, 1), coalesce(s.is_demo, false),
    coalesce(s.created_at, clock_timestamp()), clock_timestamp(), auth.uid(), auth.uid()
  from jsonb_to_recordset(p_snapshot->'tables'->'inventory_settings') as s(
    workspace_id uuid, default_currency text, timezone text, week_start_day smallint,
    warranty_reminder_days integer[], warranty_expiring_window_days integer,
    replacement_reminder_days integer, loan_reminder_days integer, lost_followup_days integer,
    preferences jsonb, version integer, is_demo boolean, created_at timestamptz
  )
  on conflict (workspace_id) do update set
    default_currency=excluded.default_currency, timezone=excluded.timezone,
    week_start_day=excluded.week_start_day, warranty_reminder_days=excluded.warranty_reminder_days,
    warranty_expiring_window_days=excluded.warranty_expiring_window_days,
    replacement_reminder_days=excluded.replacement_reminder_days,
    loan_reminder_days=excluded.loan_reminder_days, lost_followup_days=excluded.lost_followup_days,
    preferences=excluded.preferences, version=public.inventory_settings.version+1,
    updated_at=clock_timestamp(), updated_by=auth.uid();

  -- Upsert mutable domain rows. No absent row is physically deleted: archive state is
  -- represented by deleted_at, and rows outside a caller's section permissions survive.
  foreach v_table_name in array allowed_tables loop
    rows_json := coalesce(p_snapshot->'tables'->v_table_name, '[]'::jsonb);
    if jsonb_typeof(rows_json) <> 'array' then
      raise exception 'INVENTORY_TABLE_ROWS_MUST_BE_ARRAY: %', v_table_name using errcode='22023';
    end if;
    select string_agg(format('%I = excluded.%I', c.column_name, c.column_name), ', ' order by c.ordinal_position)
      into update_columns
    from information_schema.columns c
    where c.table_schema='public' and c.table_name=v_table_name
      and c.column_name not in ('id','workspace_id','created_at','created_by');
    if jsonb_array_length(rows_json) > 0 then
      execute format(
        'insert into public.%I select * from jsonb_populate_recordset(null::public.%I, $1) on conflict (workspace_id,id) do update set %s',
        v_table_name, v_table_name, update_columns
      ) using rows_json;
    end if;
  end loop;

  -- Ownership history is append-only; replaying a snapshot is idempotent by stable row ID.
  rows_json := coalesce(p_snapshot->'tables'->'inventory_ownership_events', '[]'::jsonb);
  if jsonb_array_length(rows_json) > 0 then
    insert into public.inventory_ownership_events
    select * from jsonb_populate_recordset(null::public.inventory_ownership_events, rows_json)
    on conflict (workspace_id,id) do nothing;
  end if;

  -- These tables are append-only and not yet edited by this UI; preserve any planned rows.
  rows_json := coalesce(p_snapshot->'tables'->'inventory_identifiers', '[]'::jsonb);
  if jsonb_array_length(rows_json) > 0 then
    insert into public.inventory_identifiers
    select * from jsonb_populate_recordset(null::public.inventory_identifiers, rows_json)
    on conflict (workspace_id,id) do nothing;
  end if;
  rows_json := coalesce(p_snapshot->'tables'->'inventory_valuations', '[]'::jsonb);
  if jsonb_array_length(rows_json) > 0 then
    insert into public.inventory_valuations
    select * from jsonb_populate_recordset(null::public.inventory_valuations, rows_json)
    on conflict (workspace_id,id) do nothing;
  end if;
  rows_json := coalesce(p_snapshot->'tables'->'inventory_attachments', '[]'::jsonb);
  if jsonb_array_length(rows_json) > 0 then
    insert into public.inventory_attachments
    select * from jsonb_populate_recordset(null::public.inventory_attachments, rows_json)
    on conflict (workspace_id,id) do nothing;
  end if;

  -- Legacy non-ownership events are retained in the audit stream. The workspace lock
  -- makes the existence check safe across retries; the legacy event ID is the dedupe key.
  rows_json := coalesce(p_snapshot->'tables'->'inventory_audit_log', '[]'::jsonb);
  if jsonb_array_length(rows_json) > 0 then
    insert into public.inventory_audit_log (
      workspace_id, actor_id, action, entity_type, entity_id, occurred_at,
      request_id, metadata, sensitivity, is_demo
    )
    select r.workspace_id, auth.uid(), r.action, r.entity_type, r.entity_id,
      coalesce(r.occurred_at, clock_timestamp()), null, coalesce(r.metadata, '{}'::jsonb),
      coalesce(r.sensitivity, 'Normal'), coalesce(r.is_demo, false)
    from jsonb_to_recordset(rows_json) as r(
      workspace_id uuid, action text, entity_type text, entity_id uuid, occurred_at timestamptz,
      metadata jsonb, sensitivity text, is_demo boolean
    )
    where r.workspace_id=p_workspace_id
      and nullif(r.metadata->>'legacy_event_id','') is not null
      and not exists (
        select 1 from public.inventory_audit_log existing
        where existing.workspace_id=p_workspace_id
          and existing.metadata->>'legacy_event_id'=r.metadata->>'legacy_event_id'
      );
  end if;

  return clock_timestamp();
end;
$$;

revoke all on function public.inventory_load_snapshot(uuid) from public, anon;
revoke all on function public.inventory_save_snapshot(uuid, jsonb) from public, anon;
grant execute on function public.inventory_load_snapshot(uuid) to authenticated;
grant execute on function public.inventory_save_snapshot(uuid, jsonb) to authenticated;

commit;
