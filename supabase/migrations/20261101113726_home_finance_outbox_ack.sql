-- Mark a Home cost proposal consumed only after Finance has successfully posted/idempotently confirmed its transaction.
begin;

create or replace function public.home_finance_outbox_ack(
  p_workspace_id uuid,
  p_source_payment_id text
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_count integer;
begin
  if auth.uid() is null or public.ws_access_level(p_workspace_id, 'finance', 'main') <> 'edit' then
    raise exception 'FINANCE_ACCESS_DENIED' using errcode = '42501';
  end if;
  if p_source_payment_id is null or length(p_source_payment_id)<8 or length(p_source_payment_id)>200 then
    raise exception 'FINANCE_OUTBOX_SOURCE_ID_INVALID' using errcode = '22023';
  end if;
  update public.home_outbox_events
    set published_at=coalesce(published_at,now()),
        last_error=null
    where workspace_id=p_workspace_id
      and event_type in ('home.bill.payment.recorded','home.purchase.receipt.recorded','home.maintenance.cost.recorded')
      and payload->>'sourcePaymentId'=p_source_payment_id
      and published_at is null;
  get diagnostics v_count = row_count;
  return jsonb_build_object('acknowledged',v_count,'sourcePaymentId',p_source_payment_id);
end $$;

revoke all on function public.home_finance_outbox_ack(uuid,text) from public, anon;
grant execute on function public.home_finance_outbox_ack(uuid,text) to authenticated;

commit;
