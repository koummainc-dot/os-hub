-- Nutrition OS P0/P1 normalized foundation.
-- Workspace-scoped; authorization is delegated to the platform's existing ws_access_level contract.
begin;

create table public.nutrition_units (
  code text primary key, kind text not null check(kind in ('mass','volume','count','serving')),
  name_ar text not null, name_en text not null, symbol text not null, to_base_factor numeric(18,8),
  is_system boolean not null default true,
  check ((kind in ('mass','volume') and to_base_factor > 0) or (kind in ('count','serving') and to_base_factor is null))
);
insert into public.nutrition_units(code,kind,name_ar,name_en,symbol,to_base_factor) values
('g','mass','جرام','Gram','g',1),('kg','mass','كيلوجرام','Kilogram','kg',1000),('mg','mass','مليجرام','Milligram','mg',0.001),
('ml','volume','ملليلتر','Milliliter','ml',1),('l','volume','لتر','Liter','l',1000),('tsp','volume','ملعقة صغيرة','Teaspoon','tsp',5),
('tbsp','volume','ملعقة كبيرة','Tablespoon','tbsp',15),('cup','volume','كوب','Cup','cup',240),('piece','count','حبة','Piece','pc',null),
('serving','serving','حصة','Serving','srv',null),('custom','count','وحدة مخصصة','Custom unit','',null);

create table public.nutrition_nutrient_defs (
  code text primary key, name_ar text not null, name_en text not null, unit text not null,
  category text not null default 'Core' check(category in ('Core','Mineral','Vitamin','Other')),
  tracked_in_summary boolean not null default false, position integer not null default 0
);
insert into public.nutrition_nutrient_defs(code,name_ar,name_en,unit,category,tracked_in_summary,position) values
('calories_kcal','السعرات الحرارية','Calories','kcal','Core',true,1),('protein_g','البروتين','Protein','g','Core',true,2),
('carbs_g','الكربوهيدرات','Carbohydrates','g','Core',true,3),('fat_g','الدهون','Fat','g','Core',true,4),
('fiber_g','الألياف','Fiber','g','Core',true,5),('sugar_g','السكريات','Sugar','g','Core',true,6),('sodium_mg','الصوديوم','Sodium','mg','Core',true,7);

create table public.nutrition_settings (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  timezone text not null default 'Africa/Cairo', day_start_time time not null default '00:00',
  week_start_day smallint not null default 6 check(week_start_day between 0 and 6),
  energy_unit text not null default 'kcal' check(energy_unit in ('kcal','kJ')),
  display_mode text not null default 'Full' check(display_mode in ('Full','Hidden','Qualitative')),
  tolerance_pct numeric(5,2) not null default 10 check(tolerance_pct between 0 and 100),
  include_partial_in_analytics boolean not null default false,
  created_by uuid references auth.users(id) on delete set null, updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.nutrition_meal_types (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  code text not null, label_ar text not null, label_en text, position integer not null default 0,
  default_time time, is_active boolean not null default true, created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(), unique(workspace_id,id), unique(workspace_id,code)
);

create table public.nutrition_foods (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null check(length(trim(name)) between 1 and 160), name_norm text not null, brand text,
  origin text not null default 'Custom' check(origin in ('Custom','CatalogCopy','Barcode','Imported','OutOfHome')),
  basis_type text not null default 'per_100g' check(basis_type in ('per_100g','per_100ml','per_serving')),
  basis_qty numeric(12,3) not null default 100 check(basis_qty > 0),
  serving_size numeric(12,3) check(serving_size is null or serving_size > 0), serving_unit text,
  density_g_per_ml numeric(12,6) check(density_g_per_ml is null or density_g_per_ml > 0),
  state text not null default 'na' check(state in ('raw','cooked','dry','prepared','packaged','na')),
  calories_kcal numeric(12,3) check(calories_kcal is null or calories_kcal >= 0),
  protein_g numeric(12,3) check(protein_g is null or protein_g >= 0), carbs_g numeric(12,3) check(carbs_g is null or carbs_g >= 0),
  fat_g numeric(12,3) check(fat_g is null or fat_g >= 0), fiber_g numeric(12,3) check(fiber_g is null or fiber_g >= 0),
  sugar_g numeric(12,3) check(sugar_g is null or sugar_g >= 0), sodium_mg numeric(12,3) check(sodium_mg is null or sodium_mg >= 0),
  micronutrients jsonb not null default '{}'::jsonb,
  data_quality text not null default 'Reported' check(data_quality in ('Reference','Reported','Estimated','Unverified')),
  barcode text, is_beverage boolean not null default false, is_favorite boolean not null default false,
  archived_at timestamptz, version integer not null default 1 check(version > 0),
  created_by uuid references auth.users(id) on delete set null, updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(workspace_id,id)
);
create index nutrition_foods_name_idx on public.nutrition_foods(workspace_id,name_norm) where archived_at is null;
create index nutrition_foods_barcode_idx on public.nutrition_foods(workspace_id,barcode) where barcode is not null;

create table public.nutrition_meals (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  local_date date not null, name text, meal_type_id uuid, time_at timestamptz, tz text not null default 'Africa/Cairo',
  status text not null default 'Open' check(status in ('Open','Closed','Skipped')), venue_label text, notes text,
  created_by uuid references auth.users(id) on delete set null, updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(workspace_id,id),
  constraint nutrition_meals_type_fk foreign key(workspace_id,meal_type_id)
    references public.nutrition_meal_types(workspace_id,id) on delete restrict
);
create index nutrition_meals_day_idx on public.nutrition_meals(workspace_id,local_date,time_at);

create table public.nutrition_food_log_entries (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  meal_id uuid, food_id uuid, logged_at timestamptz not null default now(), local_date date not null default current_date,
  tz text not null default 'Africa/Cairo', entry_kind text not null default 'Food' check(entry_kind in ('Food','QuickMacros','OutOfHome')),
  display_name text not null, food_version integer, quantity numeric(12,3) not null check(quantity > 0),
  unit_code text not null references public.nutrition_units(code), quantity_base numeric(12,3) check(quantity_base is null or quantity_base > 0),
  calories_kcal numeric(12,2) not null check(calories_kcal >= 0), protein_g numeric(12,2) check(protein_g is null or protein_g >= 0),
  carbs_g numeric(12,2) check(carbs_g is null or carbs_g >= 0), fat_g numeric(12,2) check(fat_g is null or fat_g >= 0),
  fiber_g numeric(12,2) check(fiber_g is null or fiber_g >= 0), sugar_g numeric(12,2) check(sugar_g is null or sugar_g >= 0),
  sodium_mg numeric(12,2) check(sodium_mg is null or sodium_mg >= 0), micronutrients_snapshot jsonb not null default '{}'::jsonb,
  snapshot_basis jsonb not null default '{}'::jsonb, confidence text not null default 'Exact' check(confidence in ('Exact','Estimated','Rough')),
  range_min_kcal numeric(12,2), range_max_kcal numeric(12,2),
  estimation_method text check(estimation_method is null or estimation_method in ('Menu','SimilarItem','Visual','Guess')),
  source text not null default 'Manual' check(source in ('Manual','Search','Barcode','Recent','Favorite','QuickAdd','Copy','Import')),
  notes text check(notes is null or length(notes)<=1000), client_op_id uuid,
  created_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(), unique(workspace_id,id), unique(workspace_id,client_op_id),
  constraint nutrition_log_meal_fk foreign key(workspace_id,meal_id) references public.nutrition_meals(workspace_id,id) on delete restrict,
  constraint nutrition_log_food_fk foreign key(workspace_id,food_id) references public.nutrition_foods(workspace_id,id) on delete restrict,
  constraint nutrition_log_range_ck check(range_min_kcal is null or range_max_kcal is null or (range_min_kcal<=calories_kcal and calories_kcal<=range_max_kcal)),
  constraint nutrition_log_source_ck check((entry_kind='Food' and food_id is not null) or (entry_kind in ('QuickMacros','OutOfHome') and food_id is null))
);
create index nutrition_log_day_idx on public.nutrition_food_log_entries(workspace_id,local_date,logged_at desc);
create index nutrition_log_food_idx on public.nutrition_food_log_entries(workspace_id,food_id,logged_at desc);

create table public.nutrition_water_logs (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  logged_at timestamptz not null default now(), local_date date not null default current_date, tz text not null default 'Africa/Cairo',
  amount_ml numeric(9,1) not null check(amount_ml>0 and amount_ml<=10000),
  source text not null default 'Manual' check(source in ('Manual','QuickButton','Preset','Import')),
  note text, client_op_id uuid, created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(), unique(workspace_id,client_op_id)
);
create index nutrition_water_day_idx on public.nutrition_water_logs(workspace_id,local_date,logged_at desc);

create table public.nutrition_log_entry_history (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  entry_id uuid not null, action text not null check(action in ('Edit','Delete','Restore')),
  before_data jsonb, after_data jsonb, changed_by uuid references auth.users(id) on delete set null, changed_at timestamptz not null default now()
);
create index nutrition_log_history_idx on public.nutrition_log_entry_history(workspace_id,entry_id,changed_at desc);

do $$
declare t text;
begin
  foreach t in array array['nutrition_settings','nutrition_meal_types','nutrition_foods','nutrition_meals','nutrition_food_log_entries','nutrition_water_logs','nutrition_log_entry_history'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('create policy nutrition_ws_select on public.%I for select to authenticated using (public.ws_access_level(workspace_id, ''nutrition'', ''main'') in (''view'',''edit''))',t);
    execute format('create policy nutrition_ws_insert on public.%I for insert to authenticated with check (public.ws_access_level(workspace_id, ''nutrition'', ''main'') = ''edit'')',t);
    execute format('create policy nutrition_ws_update on public.%I for update to authenticated using (public.ws_access_level(workspace_id, ''nutrition'', ''main'') = ''edit'') with check (public.ws_access_level(workspace_id, ''nutrition'', ''main'') = ''edit'')',t);
    execute format('create policy nutrition_ws_delete on public.%I for delete to authenticated using (public.ws_access_level(workspace_id, ''nutrition'', ''main'') = ''edit'')',t);
    execute format('grant select,insert,update,delete on public.%I to authenticated',t);
  end loop;
end $$;
alter table public.nutrition_units enable row level security;
alter table public.nutrition_nutrient_defs enable row level security;
create policy nutrition_units_read on public.nutrition_units for select to authenticated using(true);
create policy nutrition_nutrients_read on public.nutrition_nutrient_defs for select to authenticated using(true);
grant select on public.nutrition_units,public.nutrition_nutrient_defs to authenticated;

commit;
