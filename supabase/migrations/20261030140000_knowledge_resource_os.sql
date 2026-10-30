-- Knowledge & Resource OS: normalized storage foundation.
-- Intentionally not applied to production until migration history reconciliation (Issue #85).
begin;

create table if not exists public.knowledge_categories (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  color text not null default '#0284C7',
  description text,
  parent_id uuid,
  sort_order integer not null default 0,
  is_archived boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(workspace_id,id),
  unique(workspace_id,name),
  foreign key(workspace_id,parent_id) references public.knowledge_categories(workspace_id,id) on delete no action
);
create index if not exists knowledge_categories_ws_order_idx on public.knowledge_categories(workspace_id,sort_order,name);

create table if not exists public.knowledge_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  item_type text not null check(item_type in ('resource','idea','meeting','event','note','inbox')),
  title text not null check(length(trim(title)) > 0),
  summary text,
  body text,
  canonical_url text,
  source_type text,
  author text,
  published_at date,
  read_at date,
  review_at date,
  item_date date,
  start_time time,
  end_time time,
  timezone text not null default 'Africa/Cairo',
  location text,
  status text not null default 'active',
  idea_stage text check(idea_stage is null or idea_stage in ('captured','exploring','validated','planned','implemented','rejected')),
  priority text not null default 'normal' check(priority in ('low','normal','high','urgent')),
  rating smallint check(rating is null or rating between 1 and 5),
  is_pinned boolean not null default false,
  is_archived boolean not null default false,
  archived_at timestamptz,
  category_id uuid,
  notes text,
  next_action text,
  decisions text,
  attendees jsonb not null default '[]'::jsonb check(jsonb_typeof(attendees)='array'),
  metadata jsonb not null default '{}'::jsonb check(jsonb_typeof(metadata)='object'),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(workspace_id,id),
  foreign key(workspace_id,category_id) references public.knowledge_categories(workspace_id,id) on delete no action,
  check(end_time is null or start_time is null or end_time >= start_time)
);
create index if not exists knowledge_items_ws_type_updated_idx on public.knowledge_items(workspace_id,item_type,updated_at desc) where is_archived=false;
create index if not exists knowledge_items_ws_date_idx on public.knowledge_items(workspace_id,item_date,start_time) where is_archived=false;
create index if not exists knowledge_items_ws_review_idx on public.knowledge_items(workspace_id,review_at) where review_at is not null and is_archived=false;
create index if not exists knowledge_items_search_idx on public.knowledge_items using gin (to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(summary,'') || ' ' || coalesce(body,'') || ' ' || coalesce(notes,'')));

create table if not exists public.knowledge_tags (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  normalized_name text generated always as (lower(trim(name))) stored,
  created_at timestamptz not null default now(),
  unique(workspace_id,id),
  unique(workspace_id,normalized_name)
);
create table if not exists public.knowledge_item_tags (
  workspace_id uuid not null,
  item_id uuid not null,
  tag_id uuid not null,
  created_at timestamptz not null default now(),
  primary key(workspace_id,item_id,tag_id),
  foreign key(workspace_id,item_id) references public.knowledge_items(workspace_id,id) on delete cascade,
  foreign key(workspace_id,tag_id) references public.knowledge_tags(workspace_id,id) on delete cascade
);
create index if not exists knowledge_item_tags_tag_idx on public.knowledge_item_tags(workspace_id,tag_id);

create table if not exists public.knowledge_relations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  from_item_id uuid not null,
  to_item_id uuid not null,
  relation_type text not null check(relation_type in ('related','derived_from','supports','contradicts','follow_up_to','duplicate_of','uses')),
  label text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(workspace_id,from_item_id,to_item_id,relation_type),
  foreign key(workspace_id,from_item_id) references public.knowledge_items(workspace_id,id) on delete cascade,
  foreign key(workspace_id,to_item_id) references public.knowledge_items(workspace_id,id) on delete cascade,
  check(from_item_id <> to_item_id)
);
create index if not exists knowledge_relations_to_idx on public.knowledge_relations(workspace_id,to_item_id);

create table if not exists public.knowledge_followups (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  item_id uuid not null,
  title text not null check(length(trim(title)) > 0),
  details text,
  due_at timestamptz,
  status text not null default 'open' check(status in ('open','in_progress','done','cancelled')),
  assigned_to uuid references auth.users(id) on delete set null,
  completed_at timestamptz,
  sort_order integer not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key(workspace_id,item_id) references public.knowledge_items(workspace_id,id) on delete cascade
);
create index if not exists knowledge_followups_due_idx on public.knowledge_followups(workspace_id,due_at) where status in ('open','in_progress');

create table if not exists public.knowledge_attachments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  item_id uuid not null,
  storage_path text not null,
  file_name text not null,
  mime_type text,
  byte_size bigint check(byte_size is null or byte_size >= 0),
  checksum text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key(workspace_id,item_id) references public.knowledge_items(workspace_id,id) on delete cascade
);
create index if not exists knowledge_attachments_item_idx on public.knowledge_attachments(workspace_id,item_id);

create table if not exists public.knowledge_external_links (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  item_id uuid not null,
  target_system text not null check(target_system in ('projects','learning','content','habits','finance','home','relationships','travel','inventory','shopping')),
  target_id text not null check(length(trim(target_id)) > 0),
  relation_type text not null default 'related' check(relation_type in ('related','derived_from','supports','used_in','follow_up_to')),
  label text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key(workspace_id,item_id) references public.knowledge_items(workspace_id,id) on delete cascade,
  unique(workspace_id,item_id,target_system,target_id,relation_type)
);
create index if not exists knowledge_external_links_target_idx on public.knowledge_external_links(workspace_id,target_system,target_id);

create table if not exists public.knowledge_reminders (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  item_id uuid not null,
  reminder_type text not null check(reminder_type in ('review','event','followup','custom')),
  title text not null,
  due_at timestamptz not null,
  status text not null default 'pending' check(status in ('pending','snoozed','sent','done','dismissed','failed')),
  snoozed_until timestamptz,
  delivery_channel text not null default 'in_app' check(delivery_channel in ('in_app','email','push')),
  delivered_at timestamptz,
  last_error text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key(workspace_id,item_id) references public.knowledge_items(workspace_id,id) on delete cascade
);
create index if not exists knowledge_reminders_due_idx on public.knowledge_reminders(workspace_id,due_at) where status in ('pending','snoozed');

create table if not exists public.knowledge_activity (
  id bigint generated always as identity primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  item_id uuid,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null check(action in ('created','updated','archived','restored','pinned','unpinned','reviewed','related','exported','imported')),
  change_summary text,
  created_at timestamptz not null default now()
);
create index if not exists knowledge_activity_ws_created_idx on public.knowledge_activity(workspace_id,created_at desc);

-- All normalized Knowledge tables use the same server-side workspace access contract.
do $$
declare t text;
begin
  foreach t in array array['knowledge_categories','knowledge_items','knowledge_tags','knowledge_item_tags','knowledge_relations','knowledge_followups','knowledge_attachments','knowledge_external_links','knowledge_reminders','knowledge_activity'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('drop policy if exists %I on public.%I',t || '_select',t);
    execute format('drop policy if exists %I on public.%I',t || '_insert',t);
    execute format('drop policy if exists %I on public.%I',t || '_update',t);
    execute format('drop policy if exists %I on public.%I',t || '_delete',t);
    execute format('create policy %I on public.%I for select to authenticated using (public.ws_access_level(workspace_id, ''knowledge'', ''main'') in (''view'',''edit''))',t || '_select',t);
    execute format('create policy %I on public.%I for insert to authenticated with check (public.ws_access_level(workspace_id, ''knowledge'', ''main'') = ''edit'')',t || '_insert',t);
    execute format('create policy %I on public.%I for update to authenticated using (public.ws_access_level(workspace_id, ''knowledge'', ''main'') = ''edit'') with check (public.ws_access_level(workspace_id, ''knowledge'', ''main'') = ''edit'')',t || '_update',t);
    execute format('create policy %I on public.%I for delete to authenticated using (public.is_ws_owner(workspace_id))',t || '_delete',t);
  end loop;
end $$;

revoke all on public.knowledge_categories,public.knowledge_items,public.knowledge_tags,public.knowledge_item_tags,public.knowledge_relations,public.knowledge_followups,public.knowledge_attachments,public.knowledge_external_links,public.knowledge_reminders,public.knowledge_activity from anon;
grant select,insert,update,delete on public.knowledge_categories,public.knowledge_items,public.knowledge_tags,public.knowledge_item_tags,public.knowledge_relations,public.knowledge_followups,public.knowledge_attachments,public.knowledge_external_links,public.knowledge_reminders to authenticated;
grant select on public.knowledge_activity to authenticated;
grant usage,select on sequence public.knowledge_activity_id_seq to authenticated;

commit;
