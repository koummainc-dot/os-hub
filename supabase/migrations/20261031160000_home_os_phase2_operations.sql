-- Home OS phase 2: tasks, recurrence, maintenance, providers and purchase workflow.
-- Apply only after reviewing/testing against an isolated Supabase project.
begin;

create table if not exists public.home_tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  property_id uuid,
  room_id uuid,
  title text not null check (length(btrim(title)) between 1 and 180),
  description text not null default '',
  task_type text not null default 'routine' check (task_type in ('routine','one_time','seasonal','inspection')),
  status text not null default 'active' check (status in ('active','paused','completed','archived')),
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  assigned_to uuid references auth.users(id) on delete set null,
  due_date date,
  recurrence_rule jsonb not null default '{"frequency":"none"}'::jsonb check (jsonb_typeof(recurrence_rule) = 'object'),
  estimated_minutes integer check (estimated_minutes is null or estimated_minutes >= 0),
  last_completed_at timestamptz,
  next_due_at timestamptz,
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
create index if not exists home_tasks_due_idx on public.home_tasks(workspace_id, next_due_at, priority) where deleted_at is null and status = 'active';
create index if not exists home_tasks_room_idx on public.home_tasks(workspace_id, room_id) where deleted_at is null;

create table if not exists public.home_task_completions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  task_id uuid not null,
  completed_by uuid references auth.users(id) on delete set null,
  outcome text not null default 'done' check (outcome in ('done','skipped','partial','blocked')),
  completed_at timestamptz not null default now(),
  duration_minutes integer check (duration_minutes is null or duration_minutes >= 0),
  note text not null default '',
  idempotency_key text not null check (length(idempotency_key) between 8 and 200),
  created_at timestamptz not null default now(),
  unique (workspace_id, idempotency_key),
  foreign key (workspace_id, task_id) references public.home_tasks(workspace_id, id) on delete restrict
);
create index if not exists home_task_completions_history_idx on public.home_task_completions(workspace_id, task_id, completed_at desc);

create table if not exists public.home_service_providers (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 160),
  service_category text not null default '',
  phone text not null default '',
  email text not null default '',
  notes text not null default '',
  rating smallint check (rating is null or rating between 1 and 5),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id)
);
create index if not exists home_service_providers_category_idx on public.home_service_providers(workspace_id, service_category) where archived_at is null;

create table if not exists public.home_maintenance_records (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  property_id uuid not null,
  room_id uuid,
  inventory_item_id uuid,
  provider_id uuid,
  title text not null check (length(btrim(title)) between 1 and 180),
  description text not null default '',
  status text not null default 'reported' check (status in ('reported','scheduled','in_progress','waiting_parts','completed','cancelled')),
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  reported_at timestamptz not null default now(),
  scheduled_at timestamptz,
  completed_at timestamptz,
  next_maintenance_date date,
  cost_amount numeric(14,2) check (cost_amount is null or cost_amount >= 0),
  currency text not null default 'EGP' check (currency ~ '^[A-Z]{3}$'),
  finance_transaction_id uuid,
  notes text not null default '',
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  foreign key (workspace_id, property_id) references public.home_properties(workspace_id, id) on delete restrict,
  foreign key (workspace_id, room_id) references public.home_rooms(workspace_id, id) on delete restrict,
  foreign key (workspace_id, inventory_item_id) references public.home_inventory_items(workspace_id, id) on delete restrict,
  foreign key (workspace_id, provider_id) references public.home_service_providers(workspace_id, id) on delete restrict
);
create index if not exists home_maintenance_due_idx on public.home_maintenance_records(workspace_id, next_maintenance_date, status);
create index if not exists home_maintenance_property_idx on public.home_maintenance_records(workspace_id, property_id, reported_at desc);

create table if not exists public.home_purchase_requests (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  property_id uuid not null,
  requested_by uuid references auth.users(id) on delete set null,
  title text not null check (length(btrim(title)) between 1 and 180),
  status text not null default 'draft' check (status in ('draft','needed','approved','ordered','partially_received','received','cancelled')),
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  needed_by date,
  budget_amount numeric(14,2) check (budget_amount is null or budget_amount >= 0),
  currency text not null default 'EGP' check (currency ~ '^[A-Z]{3}$'),
  finance_transaction_id uuid,
  notes text not null default '',
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  ordered_at timestamptz,
  received_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  foreign key (workspace_id, property_id) references public.home_properties(workspace_id, id) on delete restrict
);
create index if not exists home_purchase_requests_status_idx on public.home_purchase_requests(workspace_id, status, needed_by);

create table if not exists public.home_purchase_request_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  request_id uuid not null,
  inventory_item_id uuid,
  name text not null check (length(btrim(name)) between 1 and 180),
  quantity numeric(14,3) not null check (quantity > 0),
  estimated_unit_price numeric(14,2) check (estimated_unit_price is null or estimated_unit_price >= 0),
  actual_unit_price numeric(14,2) check (actual_unit_price is null or actual_unit_price >= 0),
  received_quantity numeric(14,3) not null default 0 check (received_quantity >= 0 and received_quantity <= quantity),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (workspace_id, request_id) references public.home_purchase_requests(workspace_id, id) on delete cascade,
  foreign key (workspace_id, inventory_item_id) references public.home_inventory_items(workspace_id, id) on delete restrict
);
create index if not exists home_purchase_items_request_idx on public.home_purchase_request_items(workspace_id, request_id);

do $$
declare t text;
begin
  foreach t in array array['home_tasks','home_task_completions','home_service_providers','home_maintenance_records','home_purchase_requests','home_purchase_request_items'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_select', t);
    execute format('create policy %I on public.%I for select to authenticated using (public.ws_access_level(workspace_id, ''home'', ''main'') in (''view'',''edit''))', t || '_select', t);
    execute format('drop policy if exists %I on public.%I', t || '_insert', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (public.ws_access_level(workspace_id, ''home'', ''main'') = ''edit'')', t || '_insert', t);
    execute format('drop policy if exists %I on public.%I', t || '_update', t);
    execute format('create policy %I on public.%I for update to authenticated using (public.ws_access_level(workspace_id, ''home'', ''main'') = ''edit'') with check (public.ws_access_level(workspace_id, ''home'', ''main'') = ''edit'')', t || '_update', t);
  end loop;
end $$;
grant select, insert, update on public.home_tasks, public.home_task_completions, public.home_service_providers, public.home_maintenance_records, public.home_purchase_requests, public.home_purchase_request_items to authenticated;
revoke all on public.home_tasks, public.home_task_completions, public.home_service_providers, public.home_maintenance_records, public.home_purchase_requests, public.home_purchase_request_items from anon;

commit;
