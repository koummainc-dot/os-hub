-- Keep snapshot versions monotonic when an independent stock command changes the normalized snapshot.
begin;

create or replace function public.home_bump_snapshot_version_after_stock_change()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.quantity is distinct from old.quantity or new.room_id is distinct from old.room_id then
    insert into public.home_snapshot_versions(workspace_id,version,updated_at,updated_by)
    values(new.workspace_id,1,now(),auth.uid())
    on conflict(workspace_id) do update set
      version=public.home_snapshot_versions.version+1,
      updated_at=now(),
      updated_by=auth.uid();
  end if;
  return new;
end $$;

drop trigger if exists home_bump_snapshot_version_after_stock_change on public.home_inventory_items;
create trigger home_bump_snapshot_version_after_stock_change
after update of quantity, room_id on public.home_inventory_items
for each row execute function public.home_bump_snapshot_version_after_stock_change();

revoke all on function public.home_bump_snapshot_version_after_stock_change() from public, anon, authenticated;

commit;
