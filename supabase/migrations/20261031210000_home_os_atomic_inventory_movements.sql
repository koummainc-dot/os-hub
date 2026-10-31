-- Home OS: atomic inventory movement commands.
begin;

create or replace function public.home_record_inventory_movement(
  p_workspace_id uuid,
  p_item_id uuid,
  p_movement_type text,
  p_quantity numeric,
  p_idempotency_key text,
  p_note text default '',
  p_to_room_id uuid default null,
  p_occurred_at timestamptz default now()
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_item public.home_inventory_items%rowtype;
  v_existing public.home_inventory_movements%rowtype;
  v_movement_id uuid;
  v_next_quantity numeric(14,3);
  v_previous_quantity numeric(14,3);
  v_next_room_id uuid;
  v_occurred_at timestamptz := coalesce(p_occurred_at,now());
begin
  if auth.uid() is null or public.ws_access_level(p_workspace_id, 'home', 'main') <> 'edit' then
    raise exception 'HOME_ACCESS_DENIED' using errcode = '42501';
  end if;
  if p_idempotency_key is null or length(p_idempotency_key)<8 or length(p_idempotency_key)>200 then
    raise exception 'HOME_MOVEMENT_IDEMPOTENCY_KEY_INVALID' using errcode = '22023';
  end if;
  if p_movement_type not in ('receive','consume','adjust','move','dispose') then
    raise exception 'HOME_MOVEMENT_TYPE_INVALID' using errcode = '22023';
  end if;
  if p_quantity is null or (p_movement_type='adjust' and p_quantity<0)
     or (p_movement_type<>'adjust' and p_quantity<=0) then
    raise exception 'HOME_MOVEMENT_QUANTITY_INVALID' using errcode = '22023';
  end if;

  select * into v_item from public.home_inventory_items
    where workspace_id=p_workspace_id and id=p_item_id and deleted_at is null
    for update;
  if not found then raise exception 'HOME_INVENTORY_ITEM_NOT_FOUND' using errcode = 'P0002'; end if;

  select * into v_existing from public.home_inventory_movements
    where workspace_id=p_workspace_id and idempotency_key=p_idempotency_key;
  if found then
    if v_existing.item_id<>p_item_id or v_existing.movement_type<>p_movement_type
      or v_existing.quantity<>p_quantity or coalesce(v_existing.note,'')<>coalesce(p_note,'')
      or v_existing.to_room_id is distinct from p_to_room_id then
      raise exception 'HOME_MOVEMENT_IDEMPOTENCY_MISMATCH' using errcode = '23505';
    end if;
    return jsonb_build_object(
      'replayed',true,
      'movement',jsonb_build_object('id',v_existing.id,'itemId',v_existing.item_id,'type',v_existing.movement_type,
        'quantity',v_existing.quantity,'occurredAt',v_existing.occurred_at,'note',v_existing.note,
        'idempotencyKey',v_existing.idempotency_key,'toRoomId',v_existing.to_room_id),
      'item',jsonb_build_object('id',v_item.id,'quantity',v_item.quantity,'roomId',v_item.room_id,'version',v_item.version)
    );
  end if;

  v_previous_quantity := v_item.quantity;
  v_next_quantity := v_item.quantity;
  v_next_room_id := v_item.room_id;
  if p_movement_type='receive' then v_next_quantity := v_item.quantity + p_quantity; end if;
  if p_movement_type in ('consume','dispose') then
    if p_quantity>v_item.quantity then
      raise exception 'HOME_STOCK_INSUFFICIENT' using errcode = '23514';
    end if;
    v_next_quantity := v_item.quantity - p_quantity;
  end if;
  if p_movement_type='adjust' then v_next_quantity := p_quantity; end if;
  if p_movement_type='move' then
    if p_to_room_id is null then raise exception 'HOME_MOVE_TARGET_REQUIRED' using errcode = '22023'; end if;
    if not exists(select 1 from public.home_rooms r where r.workspace_id=p_workspace_id
      and r.id=p_to_room_id and r.property_id=v_item.property_id and r.deleted_at is null) then
      raise exception 'HOME_MOVE_TARGET_INVALID' using errcode = '23503';
    end if;
    v_next_room_id := p_to_room_id;
  end if;

  insert into public.home_inventory_movements(
    workspace_id,item_id,movement_type,quantity,occurred_at,note,idempotency_key,to_room_id,created_by
  ) values (
    p_workspace_id,p_item_id,p_movement_type,p_quantity,v_occurred_at,coalesce(p_note,''),
    p_idempotency_key,case when p_movement_type='move' then p_to_room_id else null end,auth.uid()
  ) returning id into v_movement_id;

  perform set_config('app.home_inventory_movement','on',true);
  update public.home_inventory_items set quantity=v_next_quantity,room_id=v_next_room_id,
    version=version+1,updated_at=v_occurred_at,updated_by=auth.uid()
    where workspace_id=p_workspace_id and id=p_item_id
    returning * into v_item;

  insert into public.home_audit_log(workspace_id,actor_id,action,entity_type,entity_id,metadata)
  values(p_workspace_id,auth.uid(),'inventory_movement_recorded','home_inventory_item',p_item_id,
    jsonb_build_object('movementId',v_movement_id,'type',p_movement_type,'quantity',p_quantity,
      'previousQuantity',v_previous_quantity,'nextQuantity',v_next_quantity,'idempotencyKey',p_idempotency_key));

  return jsonb_build_object(
    'replayed',false,
    'movement',jsonb_build_object('id',v_movement_id,'itemId',p_item_id,'type',p_movement_type,
      'quantity',p_quantity,'occurredAt',v_occurred_at,'note',coalesce(p_note,''),'idempotencyKey',p_idempotency_key,
      'toRoomId',case when p_movement_type='move' then p_to_room_id else null end),
    'item',jsonb_build_object('id',v_item.id,'quantity',v_item.quantity,'roomId',v_item.room_id,'version',v_item.version)
  );
end $$;

revoke all on function public.home_record_inventory_movement(uuid,uuid,text,numeric,text,text,uuid,timestamptz) from public, anon;
grant execute on function public.home_record_inventory_movement(uuid,uuid,text,numeric,text,text,uuid,timestamptz) to authenticated;

commit;
