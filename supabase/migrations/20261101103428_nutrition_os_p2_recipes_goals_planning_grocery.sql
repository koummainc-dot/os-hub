-- Nutrition OS P2: recipes, user-defined goal profiles, meal planning and grocery lists.
-- All entities are workspace-scoped; RLS uses the shared Nutrition access contract.
create table if not exists public.nutrition_recipes (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
 name text not null, description text, meal_type_code text, servings numeric(10,2) not null default 1 check(servings>0),
 preparation_minutes integer check(preparation_minutes is null or preparation_minutes>=0),
 cooking_minutes integer check(cooking_minutes is null or cooking_minutes>=0), instructions text, tags text[] not null default '{}',
 is_favorite boolean not null default false, status text not null default 'active' check(status in('active','archived')),
 nutrition_cache jsonb not null default '{}'::jsonb, nutrition_computed_at timestamptz,
 created_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(), unique(workspace_id,id)
);
create table if not exists public.nutrition_recipe_ingredients (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
 recipe_id uuid not null, food_id uuid, display_name text not null, quantity numeric(12,3) not null check(quantity>0),
 unit_code text not null, notes text, position integer not null default 0, created_at timestamptz not null default now(),
 foreign key(workspace_id,recipe_id) references public.nutrition_recipes(workspace_id,id) on delete cascade,
 foreign key(workspace_id,food_id) references public.nutrition_foods(workspace_id,id) on delete restrict
);
create table if not exists public.nutrition_recipe_steps (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
 recipe_id uuid not null, position integer not null, instruction text not null,
 foreign key(workspace_id,recipe_id) references public.nutrition_recipes(workspace_id,id) on delete cascade
);
create table if not exists public.nutrition_goal_profiles (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
 name text not null, goal_type text not null default 'custom' check(goal_type in('maintenance','fat_loss','muscle_gain','performance','general','custom')),
 notes text, is_active boolean not null default true, created_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(workspace_id,id)
);
create table if not exists public.nutrition_goal_targets (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
 goal_profile_id uuid not null, metric_code text not null, target_value numeric(14,3) not null check(target_value>=0),
 unit_code text not null, direction text not null default 'range' check(direction in('minimum','maximum','exact','range')),
 lower_value numeric(14,3), upper_value numeric(14,3), created_at timestamptz not null default now(),
 foreign key(workspace_id,goal_profile_id) references public.nutrition_goal_profiles(workspace_id,id) on delete cascade,
 unique(workspace_id,goal_profile_id,metric_code)
);
create table if not exists public.nutrition_goal_assignments (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
 goal_profile_id uuid not null, starts_on date not null, ends_on date,
 day_type text not null default 'all' check(day_type in('all','training','rest','custom')), created_at timestamptz not null default now(),
 foreign key(workspace_id,goal_profile_id) references public.nutrition_goal_profiles(workspace_id,id) on delete restrict,
 check(ends_on is null or ends_on>=starts_on)
);
create table if not exists public.nutrition_meal_plans (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
 name text not null, plan_type text not null default 'fixed' check(plan_type in('rolling','fixed','template')),
 starts_on date, ends_on date, status text not null default 'draft' check(status in('draft','active','completed','archived')),
 notes text, created_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(), unique(workspace_id,id), check(ends_on is null or starts_on is null or ends_on>=starts_on)
);
create table if not exists public.nutrition_plan_slots (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
 meal_plan_id uuid not null, planned_date date not null, meal_type_code text not null, title text,
 status text not null default 'suggested' check(status in('suggested','confirmed','skipped')), notes text, position integer not null default 0,
 foreign key(workspace_id,meal_plan_id) references public.nutrition_meal_plans(workspace_id,id) on delete cascade,
 unique(workspace_id,id)
);
create table if not exists public.nutrition_plan_items (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
 plan_slot_id uuid not null, recipe_id uuid, food_id uuid, display_name text not null, quantity numeric(12,3),
 unit_code text, notes text, position integer not null default 0,
 foreign key(workspace_id,plan_slot_id) references public.nutrition_plan_slots(workspace_id,id) on delete cascade,
 foreign key(workspace_id,recipe_id) references public.nutrition_recipes(workspace_id,id) on delete restrict,
 foreign key(workspace_id,food_id) references public.nutrition_foods(workspace_id,id) on delete restrict,
 check((recipe_id is not null)::int+(food_id is not null)::int<=1)
);
create table if not exists public.nutrition_grocery_lists (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
 meal_plan_id uuid, name text not null, status text not null default 'active' check(status in('active','completed','archived')),
 created_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(), unique(workspace_id,id),
 foreign key(workspace_id,meal_plan_id) references public.nutrition_meal_plans(workspace_id,id) on delete set null(meal_plan_id)
);
create table if not exists public.nutrition_grocery_items (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
 grocery_list_id uuid not null, display_name text not null, quantity numeric(12,3), unit_code text, category text,
 status text not null default 'needed' check(status in('needed','purchased','skipped')), source_recipe_id uuid, notes text,
 position integer not null default 0, created_at timestamptz not null default now(),
 foreign key(workspace_id,grocery_list_id) references public.nutrition_grocery_lists(workspace_id,id) on delete cascade,
 foreign key(workspace_id,source_recipe_id) references public.nutrition_recipes(workspace_id,id) on delete set null(source_recipe_id)
);
create index if not exists nutrition_recipe_workspace_name_idx on public.nutrition_recipes(workspace_id,name) where status='active';
create index if not exists nutrition_recipe_ingredients_recipe_idx on public.nutrition_recipe_ingredients(workspace_id,recipe_id,position);
create index if not exists nutrition_goal_assignments_date_idx on public.nutrition_goal_assignments(workspace_id,starts_on,ends_on);
create index if not exists nutrition_plan_slots_date_idx on public.nutrition_plan_slots(workspace_id,planned_date,meal_plan_id);
create index if not exists nutrition_grocery_items_list_idx on public.nutrition_grocery_items(workspace_id,grocery_list_id,status,position);
do $$
declare t text;
begin
 foreach t in array array['nutrition_recipes','nutrition_recipe_ingredients','nutrition_recipe_steps','nutrition_goal_profiles','nutrition_goal_targets','nutrition_goal_assignments','nutrition_meal_plans','nutrition_plan_slots','nutrition_plan_items','nutrition_grocery_lists','nutrition_grocery_items']
 loop
  execute format('alter table public.%I enable row level security',t);
  execute format('drop policy if exists %I on public.%I',t||'_select',t);
  execute format('create policy %I on public.%I for select to authenticated using(public.ws_access_level(workspace_id,''nutrition'',''main'') in(''view'',''edit''))',t||'_select',t);
  execute format('drop policy if exists %I on public.%I',t||'_insert',t);
  execute format('create policy %I on public.%I for insert to authenticated with check(public.ws_access_level(workspace_id,''nutrition'',''main'')=''edit'')',t||'_insert',t);
  execute format('drop policy if exists %I on public.%I',t||'_update',t);
  execute format('create policy %I on public.%I for update to authenticated using(public.ws_access_level(workspace_id,''nutrition'',''main'')=''edit'') with check(public.ws_access_level(workspace_id,''nutrition'',''main'')=''edit'')',t||'_update',t);
  execute format('drop policy if exists %I on public.%I',t||'_delete',t);
  execute format('create policy %I on public.%I for delete to authenticated using(public.ws_access_level(workspace_id,''nutrition'',''main'')=''edit'')',t||'_delete',t);
  execute format('revoke all on public.%I from anon,authenticated',t);
  execute format('grant select,insert,update,delete on public.%I to authenticated',t);
 end loop;
end $$;
