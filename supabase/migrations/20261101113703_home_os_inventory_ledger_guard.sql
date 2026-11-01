-- Home OS: inventory balance can change only through a ledger-backed server command.
begin;

create or replace function public.home_guard_inventory_balance()
returns trigger language plpgsql set search_path = public
as $$
begin
  if new.quantity is distinct from old.quantity
    and current_setting('app.home_inventory_movement', true) is distinct from 'on' then
    raise exception 'HOME_STOCK_CHANGE_REQUIRES_MOVEMENT'
      using errcode = '23514',
        hint = 'Use home_record_inventory_movement or home_record_purchase_receipt; do not edit stock balance directly.';
  end if;
  return new;
end $$;

drop trigger if exists home_inventory_balance_ledger_guard on public.home_inventory_items;
create trigger home_inventory_balance_ledger_guard
before update of quantity on public.home_inventory_items
for each row execute function public.home_guard_inventory_balance();

revoke all on function public.home_guard_inventory_balance() from public, anon, authenticated;

commit;
