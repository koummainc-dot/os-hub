-- Home OS outbox reader for Finance review. The function exposes suggestions, never posts a transaction.
begin;

create or replace function public.home_finance_outbox_load(p_workspace_id uuid)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  v_events jsonb;
begin
  if auth.uid() is null or public.ws_access_level(p_workspace_id, 'finance', 'main') not in ('view','edit') then
    raise exception 'FINANCE_ACCESS_DENIED' using errcode = '42501';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',e.id,
    'type',e.event_type,
    'ownerSystem','home',
    'entityType',e.aggregate_type,
    'entityId',e.aggregate_id,
    'occurredAt',e.created_at,
    'workspaceId',e.workspace_id,
    'idempotencyKey',e.idempotency_key,
    'payload',e.payload
  ) order by e.created_at desc),'[]'::jsonb)
  into v_events
  from (
    select * from public.home_outbox_events
    where workspace_id=p_workspace_id
      and published_at is null
      and event_type in (
        'home.bill.payment.recorded',
        'home.purchase.receipt.recorded',
        'home.maintenance.cost.recorded'
      )
    order by created_at desc
    limit 100
  ) e;
  return v_events;
end $$;

revoke all on function public.home_finance_outbox_load(uuid) from public, anon;
grant execute on function public.home_finance_outbox_load(uuid) to authenticated;

commit;
