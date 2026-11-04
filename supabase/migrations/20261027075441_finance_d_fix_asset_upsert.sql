create or replace function public.fin_asset_upsert(p jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare ws uuid := (p->>'workspace_id')::uuid; aid uuid := coalesce(nullif(p->>'id', '')::uuid, gen_random_uuid()); old public.finance_assets; src text := coalesce(p->>'valuation_source', 'manual'); conf boolean; acc uuid := nullif(p->>'account_id', '')::uuid;
begin
  perform public.fin__need(ws, 'assets', 'edit');
  select * into old from public.finance_assets a where a.workspace_id = ws and a.id = aid;
  if coalesce(p->>'asset_type', 'Other') = 'Cash-like' and acc is not null then perform public.fin__err('CASH_LIKE_USE_ACCOUNT', 'cash belongs in an account'); end if;
  conf := case when src = 'inventory_estimate' then false else true end;
  if old.id is not null and src = 'inventory_estimate' and public.fin__num(p, 'current_value') is not distinct from old.current_value then conf := old.valuation_confirmed; end if;
  begin
    insert into public.finance_assets as fa(id, workspace_id, name, asset_type, currency, purchase_value, current_value, valuation_date, valuation_source, valuation_confirmed, inventory_item_ref, include_in_net_worth, account_id)
    values (aid, ws, p->>'name', coalesce(p->>'asset_type', 'Other'), upper(p->>'currency'), coalesce(public.fin__num(p, 'purchase_value'), 0), coalesce(public.fin__num(p, 'current_value'), 0), nullif(p->>'valuation_date', '')::date, src, conf, nullif(p->>'inventory_item_ref', ''), coalesce((p->>'include_in_net_worth')::boolean, true), acc)
    on conflict on constraint finance_assets_pkey do update set name = excluded.name, asset_type = excluded.asset_type, purchase_value = excluded.purchase_value, current_value = excluded.current_value, valuation_date = excluded.valuation_date,
      valuation_source = excluded.valuation_source, valuation_confirmed = excluded.valuation_confirmed, include_in_net_worth = excluded.include_in_net_worth, account_id = excluded.account_id, version = fa.version + 1, updated_at = now();
  exception when unique_violation then perform public.fin__err('SOURCE_IDENTITY_CONFLICT', 'this inventory item already has a finance asset'); end;
  perform public.fin__audit(ws, auth.uid(), 'asset', aid::text, case when old.id is null then 'create' else 'update' end, p->>'reason', to_jsonb(old), jsonb_build_object('value', p->>'current_value', 'source', src));
  return jsonb_build_object('asset_id', aid, 'valuation_confirmed', conf);
end $$;
revoke all on function public.fin_asset_upsert(jsonb) from public, anon;
grant execute on function public.fin_asset_upsert(jsonb) to authenticated;
