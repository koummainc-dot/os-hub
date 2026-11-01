alter table public.nutrition_foods
  add column if not exists name_aliases text[] not null default '{}',
  add column if not exists source_notes text;
create table if not exists public.nutrition_food_portions (
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid not null references public.workspaces(id) on delete cascade,
 food_id uuid not null,
 label_ar text not null,
 unit_code text not null,
 grams numeric(12,3),
 milliliters numeric(12,3),
 is_default boolean not null default false,
 created_at timestamptz not null default now(),
 foreign key (workspace_id,food_id) references public.nutrition_foods(workspace_id,id) on delete cascade,
 check ((grams is not null and grams > 0) or (milliliters is not null and milliliters > 0)),
 unique (workspace_id,food_id,label_ar)
);
create index if not exists nutrition_food_portions_food_idx on public.nutrition_food_portions(workspace_id,food_id);
alter table public.nutrition_food_portions enable row level security;
drop policy if exists nutrition_food_portions_select on public.nutrition_food_portions;
create policy nutrition_food_portions_select on public.nutrition_food_portions for select to authenticated using(public.ws_access_level(workspace_id,'nutrition','main') in ('view','edit'));
drop policy if exists nutrition_food_portions_insert on public.nutrition_food_portions;
create policy nutrition_food_portions_insert on public.nutrition_food_portions for insert to authenticated with check(public.ws_access_level(workspace_id,'nutrition','main')='edit');
drop policy if exists nutrition_food_portions_update on public.nutrition_food_portions;
create policy nutrition_food_portions_update on public.nutrition_food_portions for update to authenticated using(public.ws_access_level(workspace_id,'nutrition','main')='edit') with check(public.ws_access_level(workspace_id,'nutrition','main')='edit');
drop policy if exists nutrition_food_portions_delete on public.nutrition_food_portions;
create policy nutrition_food_portions_delete on public.nutrition_food_portions for delete to authenticated using(public.ws_access_level(workspace_id,'nutrition','main')='edit');
revoke all on public.nutrition_food_portions from anon, authenticated;
grant select,insert,update,delete on public.nutrition_food_portions to authenticated;