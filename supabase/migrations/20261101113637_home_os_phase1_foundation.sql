-- Home OS phase 1: property/room/inventory foundation.
-- Review and test in an isolated Supabase project before applying to production.
begin;

create table if not exists public.home_settings (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  currency text not null default 'EGP' check (currency ~ '^[A-Z]{3}$'),
  timezone text not null default 'Africa/Cairo',
  preferences jsonb not null default '{}'::jsonb check (jsonb_typeof(preferences) = 'object'),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

create table if not exists public.home_properties (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 120),
  address text not null default '',
  notes text not null default '',
  is_default boolean not null default false,
  deleted_at timestamptz,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  unique (workspace_id, id)
);
create unique index if not exists home_properties_one_default_idx
  on public.home_properties(workspace_id) where is_default and deleted_at is null;
create index if not exists home_properties_active_idx on public.home_properties(workspace_id, name) where deleted_at is null;

create table if not exists public.home_rooms (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  property_id uuid not null,
  name text not null check (length(btrim(name)) between 1 and 120),
  room_type text not null check (room_type in ('bedroom','kitchen','bathroom','living','office','balcony','storage','outdoor','general')),
  floor text not null default '',
  notes text not null default '',
  deleted_at timestamptz,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  unique (workspace_id, id),
  foreign key (workspace_id, property_id) references public.home_properties(workspace_id, id) on delete restrict
);
create index if not exists home_rooms_property_idx on public.home_rooms(workspace_id, property_id, name) where deleted_at is null;

create table if not exists public.home_inventory_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  property_id uuid not null,
  room_id uuid,
  name text not null check (length(btrim(name)) between 1 and 160),
  item_type text not null check (item_type in ('asset','consumable','tool','furniture','textile','document','misc')),
  category text not null default '',
  condition text not null default 'good' check (condition in ('good','broken','dispose')),
  unit text not null default 'piece' check (unit in ('piece','pack','kg','liter','box')),
  quantity numeric(14,3) not null default 0 check (quantity >= 0),
  minimum_quantity numeric(14,3) not null default 0 check (minimum_quantity >= 0),
  unit_price numeric(14,2) check (unit_price is null or unit_price >= 0),
  currency text not null default 'EGP' check (currency ~ '^[A-Z]{3}$'),
  purchase_date date,
  warranty_until date,
  expiry_date date,
  model text not null default '',
  serial_number text not null default '',
  notes text not null default '',
  deleted_at timestamptz,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  unique (workspace_id, id),
  foreign key (workspace_id, property_id) references public.home_properties(workspace_id, id) on delete restrict,
  foreign key (workspace_id, room_id) references public.home_rooms(workspace_id, id) on delete restrict
);
create index if not exists home_inventory_property_idx on public.home_inventory_items(workspace_id, property_id, name) where deleted_at is null;
create index if not exists home_inventory_room_idx on public.home_inventory_items(workspace_id, room_id) where deleted_at is null;
create index if not exists home_inventory_stock_idx on public.home_inventory_items(workspace_id, quantity, minimum_quantity) where deleted_at is null;

create table if not exists public.home_inventory_movements (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  item_id uuid not null,
  movement_type text not null check (movement_type in ('receive','consume','adjust','move','dispose')),
  quantity numeric(14,3) not null,
  occurred_at timestamptz not null default now(),
  note text not null default '',
  idempotency_key text not null check (length(idempotency_key) between 8 and 200),
  to_room_id uuid,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  unique (workspace_id, id),
  unique (workspace_id, idempotency_key),
  check ((movement_type = 'adjust' and quantity >= 0) or (movement_type <> 'adjust' and quantity > 0)),
  foreign key (workspace_id, item_id) references public.home_inventory_items(workspace_id, id) on delete restrict,
  foreign key (workspace_id, to_room_id) references public.home_rooms(workspace_id, id) on delete restrict
);
create index if not exists home_inventory_movements_item_idx on public.home_inventory_movements(workspace_id, item_id, occurred_at desc);

create table if not exists public.home_audit_log (
  id bigint generated always as identity primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  occurred_at timestamptz not null default clock_timestamp(),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object')
);
create index if not exists home_audit_workspace_time_idx on public.home_audit_log(workspace_id, occurred_at desc);

alter table public.home_settings enable row level security;
alter table public.home_properties enable row level security;
alter table public.home_rooms enable row level security;
alter table public.home_inventory_items enable row level security;
alter table public.home_inventory_movements enable row level security;
alter table public.home_audit_log enable row level security;

do $$
declare t text;
begin
  foreach t in array array['home_settings','home_properties','home_rooms','home_inventory_items','home_inventory_movements','home_audit_log'] loop
    execute format('drop policy if exists %I on public.%I', t || '_select', t);
    execute format('create policy %I on public.%I for select to authenticated using (public.ws_access_level(workspace_id, ''home'', ''main'') in (''view'',''edit''))', t || '_select', t);
  end loop;
end $$;

drop policy if exists home_settings_insert on public.home_settings;
create policy home_settings_insert on public.home_settings for insert to authenticated with check (public.ws_access_level(workspace_id, 'home', 'main') = 'edit');
drop policy if exists home_settings_update on public.home_settings;
create policy home_settings_update on public.home_settings for update to authenticated using (public.ws_access_level(workspace_id, 'home', 'main') = 'edit') with check (public.ws_access_level(workspace_id, 'home', 'main') = 'edit');

drop policy if exists home_properties_insert on public.home_properties;
create policy home_properties_insert on public.home_properties for insert to authenticated with check (public.ws_access_level(workspace_id, 'home', 'main') = 'edit');
drop policy if exists home_properties_update on public.home_properties;
create policy home_properties_update on public.home_properties for update to authenticated using (public.ws_access_level(workspace_id, 'home', 'main') = 'edit') with check (public.ws_access_level(workspace_id, 'home', 'main') = 'edit');

drop policy if exists home_rooms_insert on public.home_rooms;
create policy home_rooms_insert on public.home_rooms for insert to authenticated with check (public.ws_access_level(workspace_id, 'home', 'main') = 'edit');
drop policy if exists home_rooms_update on public.home_rooms;
create policy home_rooms_update on public.home_rooms for update to authenticated using (public.ws_access_level(workspace_id, 'home', 'main') = 'edit') with check (public.ws_access_level(workspace_id, 'home', 'main') = 'edit');

drop policy if exists home_inventory_items_insert on public.home_inventory_items;
create policy home_inventory_items_insert on public.home_inventory_items for insert to authenticated with check (public.ws_access_level(workspace_id, 'home', 'main') = 'edit');
drop policy if exists home_inventory_items_update on public.home_inventory_items;
create policy home_inventory_items_update on public.home_inventory_items for update to authenticated using (public.ws_access_level(workspace_id, 'home', 'main') = 'edit') with check (public.ws_access_level(workspace_id, 'home', 'main') = 'edit');

drop policy if exists home_inventory_movements_insert on public.home_inventory_movements;
create policy home_inventory_movements_insert on public.home_inventory_movements for insert to authenticated with check (public.ws_access_level(workspace_id, 'home', 'main') = 'edit');
drop policy if exists home_audit_log_insert on public.home_audit_log;
create policy home_audit_log_insert on public.home_audit_log for insert to authenticated with check (public.ws_access_level(workspace_id, 'home', 'main') = 'edit');

grant select, insert, update on public.home_settings, public.home_properties, public.home_rooms, public.home_inventory_items to authenticated;
grant select, insert on public.home_inventory_movements, public.home_audit_log to authenticated;
revoke all on public.home_settings, public.home_properties, public.home_rooms, public.home_inventory_items, public.home_inventory_movements, public.home_audit_log from anon;

create or replace function public.home_load_snapshot(p_workspace_id uuid)
returns jsonb language plpgsql security invoker set search_path = public
as $$
declare result jsonb;
begin
  if auth.uid() is null or public.ws_access_level(p_workspace_id, 'home', 'main') not in ('view','edit') then
    raise exception 'HOME_ACCESS_DENIED' using errcode = '42501';
  end if;
  select jsonb_build_object(
    'schemaVersion', 1,
    'properties', coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'address',address,'notes',notes,'isDefault',is_default,'deletedAt',deleted_at,'createdAt',created_at,'updatedAt',updated_at)) from public.home_properties where workspace_id=p_workspace_id), '[]'::jsonb),
    'rooms', coalesce((select jsonb_agg(jsonb_build_object('id',id,'propertyId',property_id,'name',name,'type',room_type,'floor',floor,'notes',notes,'deletedAt',deleted_at,'createdAt',created_at,'updatedAt',updated_at)) from public.home_rooms where workspace_id=p_workspace_id), '[]'::jsonb),
    'items', coalesce((select jsonb_agg(jsonb_build_object('id',id,'propertyId',property_id,'roomId',room_id,'name',name,'type',item_type,'category',category,'condition',condition,'unit',unit,'quantity',quantity,'minimumQuantity',minimum_quantity,'unitPrice',unit_price,'currency',currency,'purchaseDate',purchase_date,'warrantyUntil',warranty_until,'expiryDate',expiry_date,'model',model,'serialNumber',serial_number,'notes',notes,'deletedAt',deleted_at,'createdAt',created_at,'updatedAt',updated_at)) from public.home_inventory_items where workspace_id=p_workspace_id), '[]'::jsonb),
    'movements', coalesce((select jsonb_agg(jsonb_build_object('id',id,'itemId',item_id,'type',movement_type,'quantity',quantity,'occurredAt',occurred_at,'note',note,'idempotencyKey',idempotency_key,'toRoomId',to_room_id)) from public.home_inventory_movements where workspace_id=p_workspace_id), '[]'::jsonb),
    'settings', coalesce((select jsonb_build_object('currency',currency,'timezone',timezone,'preferences',preferences) from public.home_settings where workspace_id=p_workspace_id), jsonb_build_object('currency','EGP','timezone','Africa/Cairo'))
  ) into result;
  return result;
end $$;

create or replace function public.home_save_snapshot(p_workspace_id uuid, p_snapshot jsonb)
returns timestamptz language plpgsql security invoker set search_path = public
as $$
begin
  if auth.uid() is null or public.ws_access_level(p_workspace_id, 'home', 'main') <> 'edit' then
    raise exception 'HOME_ACCESS_DENIED' using errcode = '42501';
  end if;
  if jsonb_typeof(p_snapshot) <> 'object' then raise exception 'HOME_INVALID_SNAPSHOT'; end if;

  insert into public.home_properties(id,workspace_id,name,address,notes,is_default,deleted_at,created_at,updated_at,created_by,updated_by)
  select x.id,p_workspace_id,x.name,coalesce(x.address,''),coalesce(x.notes,''),coalesce(x."isDefault",false),x."deletedAt",coalesce(x."createdAt",now()),now(),auth.uid(),auth.uid()
  from jsonb_to_recordset(coalesce(p_snapshot->'properties','[]'::jsonb)) as x(id uuid,name text,address text,notes text,"isDefault" boolean,"deletedAt" timestamptz,"createdAt" timestamptz)
  on conflict (workspace_id,id) do update set name=excluded.name,address=excluded.address,notes=excluded.notes,is_default=excluded.is_default,deleted_at=excluded.deleted_at,updated_at=now(),updated_by=auth.uid(),version=home_properties.version+1;

  insert into public.home_rooms(id,workspace_id,property_id,name,room_type,floor,notes,deleted_at,created_at,updated_at,created_by,updated_by)
  select x.id,p_workspace_id,x."propertyId",x.name,x.type,coalesce(x.floor,''),coalesce(x.notes,''),x."deletedAt",coalesce(x."createdAt",now()),now(),auth.uid(),auth.uid()
  from jsonb_to_recordset(coalesce(p_snapshot->'rooms','[]'::jsonb)) as x(id uuid,"propertyId" uuid,name text,type text,floor text,notes text,"deletedAt" timestamptz,"createdAt" timestamptz)
  on conflict (workspace_id,id) do update set property_id=excluded.property_id,name=excluded.name,room_type=excluded.room_type,floor=excluded.floor,notes=excluded.notes,deleted_at=excluded.deleted_at,updated_at=now(),updated_by=auth.uid(),version=home_rooms.version+1;

  insert into public.home_inventory_items(id,workspace_id,property_id,room_id,name,item_type,category,condition,unit,quantity,minimum_quantity,unit_price,currency,purchase_date,warranty_until,expiry_date,model,serial_number,notes,deleted_at,created_at,updated_at,created_by,updated_by)
  select x.id,p_workspace_id,x."propertyId",x."roomId",x.name,x.type,coalesce(x.category,''),x.condition,x.unit,x.quantity,coalesce(x."minimumQuantity",0),x."unitPrice",coalesce(x.currency,'EGP'),x."purchaseDate",x."warrantyUntil",x."expiryDate",coalesce(x.model,''),coalesce(x."serialNumber",''),coalesce(x.notes,''),x."deletedAt",coalesce(x."createdAt",now()),now(),auth.uid(),auth.uid()
  from jsonb_to_recordset(coalesce(p_snapshot->'items','[]'::jsonb)) as x(id uuid,"propertyId" uuid,"roomId" uuid,name text,type text,category text,condition text,unit text,quantity numeric,"minimumQuantity" numeric,"unitPrice" numeric,currency text,"purchaseDate" date,"warrantyUntil" date,"expiryDate" date,model text,"serialNumber" text,notes text,"deletedAt" timestamptz,"createdAt" timestamptz)
  on conflict (workspace_id,id) do update set property_id=excluded.property_id,room_id=excluded.room_id,name=excluded.name,item_type=excluded.item_type,category=excluded.category,condition=excluded.condition,unit=excluded.unit,quantity=excluded.quantity,minimum_quantity=excluded.minimum_quantity,unit_price=excluded.unit_price,currency=excluded.currency,purchase_date=excluded.purchase_date,warranty_until=excluded.warranty_until,expiry_date=excluded.expiry_date,model=excluded.model,serial_number=excluded.serial_number,notes=excluded.notes,deleted_at=excluded.deleted_at,updated_at=now(),updated_by=auth.uid(),version=home_inventory_items.version+1;

  insert into public.home_inventory_movements(id,workspace_id,item_id,movement_type,quantity,occurred_at,note,idempotency_key,to_room_id,created_by)
  select x.id,p_workspace_id,x."itemId",x.type,x.quantity,coalesce(x."occurredAt",now()),coalesce(x.note,''),x."idempotencyKey",x."toRoomId",auth.uid()
  from jsonb_to_recordset(coalesce(p_snapshot->'movements','[]'::jsonb)) as x(id uuid,"itemId" uuid,type text,quantity numeric,"occurredAt" timestamptz,note text,"idempotencyKey" text,"toRoomId" uuid)
  on conflict (workspace_id,idempotency_key) do nothing;

  insert into public.home_settings(workspace_id,currency,timezone,preferences,updated_at,updated_by)
  values(p_workspace_id,coalesce(p_snapshot#>>'{settings,currency}','EGP'),coalesce(p_snapshot#>>'{settings,timezone}','Africa/Cairo'),coalesce(p_snapshot#>'{settings,preferences}','{}'::jsonb),now(),auth.uid())
  on conflict (workspace_id) do update set currency=excluded.currency,timezone=excluded.timezone,preferences=excluded.preferences,updated_at=now(),updated_by=auth.uid();

  insert into public.home_audit_log(workspace_id,actor_id,action,entity_type,metadata)
  values(p_workspace_id,auth.uid(),'snapshot_saved','home_snapshot',jsonb_build_object('properties',jsonb_array_length(coalesce(p_snapshot->'properties','[]'::jsonb)),'rooms',jsonb_array_length(coalesce(p_snapshot->'rooms','[]'::jsonb)),'items',jsonb_array_length(coalesce(p_snapshot->'items','[]'::jsonb))));
  return now();
end $$;

revoke all on function public.home_load_snapshot(uuid) from public, anon;
revoke all on function public.home_save_snapshot(uuid,jsonb) from public, anon;
grant execute on function public.home_load_snapshot(uuid) to authenticated;
grant execute on function public.home_save_snapshot(uuid,jsonb) to authenticated;

commit;
