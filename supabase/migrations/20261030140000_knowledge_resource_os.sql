-- Knowledge & Resource OS: normalized storage foundation.
-- Intentionally not applied to production until migration history reconciliation (Issue #85).
begin;

create table if not exists public.knowledge_categories (
  id text not null default gen_random_uuid()::text,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  color text not null default '#0284C7',
  description text,
  parent_id text,
  sort_order integer not null default 0,
  is_archived boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(workspace_id,id),
  unique(workspace_id,name),
  foreign key(workspace_id,parent_id) references public.knowledge_categories(workspace_id,id) on delete no action
);
create index if not exists knowledge_categories_ws_order_idx on public.knowledge_categories(workspace_id,sort_order,name);

create table if not exists public.knowledge_items (
  id text not null default gen_random_uuid()::text,
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
  category_id text,
  notes text,
  next_action text,
  decisions text,
  attendees jsonb not null default '[]'::jsonb check(jsonb_typeof(attendees)='array'),
  metadata jsonb not null default '{}'::jsonb check(jsonb_typeof(metadata)='object'),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(workspace_id,id),
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
  item_id text not null,
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
  from_item_id text not null,
  to_item_id text not null,
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
  item_id text not null,
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
create unique index if not exists knowledge_followups_item_title_uq on public.knowledge_followups(workspace_id,item_id,title);

create table if not exists public.knowledge_attachments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  item_id text not null,
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
  item_id text not null,
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
  item_id text not null,
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
  item_id text,
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
    execute format('create policy %I on public.%I for delete to authenticated using (public.ws_access_level(workspace_id, ''knowledge'', ''main'') = ''edit'')',t || '_delete',t);
  end loop;
end $$;

revoke all on public.knowledge_categories,public.knowledge_items,public.knowledge_tags,public.knowledge_item_tags,public.knowledge_relations,public.knowledge_followups,public.knowledge_attachments,public.knowledge_external_links,public.knowledge_reminders,public.knowledge_activity from anon;
grant select,insert,update,delete on public.knowledge_categories,public.knowledge_items,public.knowledge_tags,public.knowledge_item_tags,public.knowledge_relations,public.knowledge_followups,public.knowledge_attachments,public.knowledge_external_links,public.knowledge_reminders to authenticated;
grant select,insert on public.knowledge_activity to authenticated;
grant usage,select on sequence public.knowledge_activity_id_seq to authenticated;


create table if not exists public.knowledge_workspace_state (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  preferences jsonb not null default '{"defaultView":"hub","reviewReminderDays":7}'::jsonb,
  link_types jsonb not null default '[]'::jsonb
);
alter table public.knowledge_workspace_state enable row level security;
drop policy if exists knowledge_workspace_state_select on public.knowledge_workspace_state;
drop policy if exists knowledge_workspace_state_insert on public.knowledge_workspace_state;
drop policy if exists knowledge_workspace_state_update on public.knowledge_workspace_state;
drop policy if exists knowledge_workspace_state_delete on public.knowledge_workspace_state;
create policy knowledge_workspace_state_select on public.knowledge_workspace_state for select to authenticated using (public.ws_access_level(workspace_id, 'knowledge', 'main') in ('view','edit'));
create policy knowledge_workspace_state_insert on public.knowledge_workspace_state for insert to authenticated with check (public.ws_access_level(workspace_id, 'knowledge', 'main') = 'edit');
create policy knowledge_workspace_state_update on public.knowledge_workspace_state for update to authenticated using (public.ws_access_level(workspace_id, 'knowledge', 'main') = 'edit') with check (public.ws_access_level(workspace_id, 'knowledge', 'main') = 'edit');
create policy knowledge_workspace_state_delete on public.knowledge_workspace_state for delete to authenticated using (public.is_ws_owner(workspace_id));
revoke all on public.knowledge_workspace_state from anon;
grant select,insert,update,delete on public.knowledge_workspace_state to authenticated;

create or replace function public.knowledge_item_to_json(p_item public.knowledge_items, p_kind text, p_workspace_id uuid)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
 select jsonb_strip_nulls(jsonb_build_object(
   'id',p_item.id,'title',p_item.title,'summary',p_item.summary,'body',p_item.body,'url',p_item.canonical_url,
   'sourceType',p_item.source_type,'author',p_item.author,'publishedAt',p_item.published_at,'readAt',p_item.read_at,'reviewAt',p_item.review_at,
   'date',p_item.item_date,'startTime',p_item.start_time,'endTime',p_item.end_time,'timezone',p_item.timezone,'location',p_item.location,
   'status',case when p_item.is_archived then 'archived' else p_item.status end,'stage',p_item.idea_stage,'priority',p_item.priority,
   'rating',p_item.rating,'pinned',p_item.is_pinned,'archivedAt',p_item.archived_at,'categoryId',p_item.category_id,'notes',p_item.notes,
   'nextAction',p_item.next_action,'decisions',p_item.decisions,'attendees',p_item.attendees,'tags',
   coalesce((select jsonb_agg(t.name order by t.name) from public.knowledge_item_tags it join public.knowledge_tags t on t.id=it.tag_id and t.workspace_id=it.workspace_id where it.workspace_id=p_workspace_id and it.item_id=p_item.id),'[]'::jsonb),
   'followups',coalesce((select jsonb_agg(f.title order by f.sort_order) from public.knowledge_followups f where f.workspace_id=p_workspace_id and f.item_id=p_item.id and f.status<>'cancelled'),'[]'::jsonb),
   'relatedItemIds',coalesce((select jsonb_agg(r.to_item_id) from public.knowledge_relations r where r.workspace_id=p_workspace_id and r.from_item_id=p_item.id and r.relation_type='related'),'[]'::jsonb),
   'relatedSystem',p_item.metadata->>'relatedSystem','relatedId',p_item.metadata->>'relatedId','createdAt',p_item.created_at,'updatedAt',p_item.updated_at
 ))
$$;

create or replace function public.knowledge_load_snapshot(p_workspace_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare v_result jsonb;
begin
  if auth.uid() is null or public.ws_access_level(p_workspace_id, 'knowledge', 'main') not in ('view','edit') then
    raise exception 'Knowledge workspace access denied' using errcode='42501';
  end if;
  select jsonb_build_object(
    'version',1,
    'categories',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'name',c.name,'color',c.color,'description',c.description,'parentId',c.parent_id,'sortOrder',c.sort_order,'isArchived',c.is_archived) order by c.sort_order,c.name) from public.knowledge_categories c where c.workspace_id=p_workspace_id),'[]'::jsonb),
    'linkTypes',coalesce((select link_types from public.knowledge_workspace_state where workspace_id=p_workspace_id),(select coalesce(jsonb_agg(x.source_type order by x.source_type),'[]'::jsonb) from (select distinct source_type from public.knowledge_items where workspace_id=p_workspace_id and source_type is not null) x)),
    'resources',coalesce((select jsonb_agg(public.knowledge_item_to_json(i,'resource',p_workspace_id)) from public.knowledge_items i where i.workspace_id=p_workspace_id and i.item_type='resource'),'[]'::jsonb),
    'ideas',coalesce((select jsonb_agg(public.knowledge_item_to_json(i,'idea',p_workspace_id)) from public.knowledge_items i where i.workspace_id=p_workspace_id and i.item_type='idea'),'[]'::jsonb),
    'notes',coalesce((select jsonb_agg(public.knowledge_item_to_json(i,'note',p_workspace_id)) from public.knowledge_items i where i.workspace_id=p_workspace_id and i.item_type='note'),'[]'::jsonb),
    'meetings',coalesce((select jsonb_agg(public.knowledge_item_to_json(i,'meeting',p_workspace_id)) from public.knowledge_items i where i.workspace_id=p_workspace_id and i.item_type='meeting'),'[]'::jsonb),
    'events',coalesce((select jsonb_agg(public.knowledge_item_to_json(i,'event',p_workspace_id)) from public.knowledge_items i where i.workspace_id=p_workspace_id and i.item_type='event'),'[]'::jsonb),
    'inbox',coalesce((select jsonb_agg(public.knowledge_item_to_json(i,'inbox',p_workspace_id)) from public.knowledge_items i where i.workspace_id=p_workspace_id and i.item_type='inbox'),'[]'::jsonb),
    'preferences',coalesce((select preferences from public.knowledge_workspace_state where workspace_id=p_workspace_id),'{"defaultView":"hub","reviewReminderDays":7}'::jsonb)
  ) into v_result;
  return jsonb_build_object('data',v_result,'updatedAt',(select updated_at from public.knowledge_workspace_state where workspace_id=p_workspace_id));
end;
$$;

create or replace function public.knowledge_save_snapshot(p_workspace_id uuid,p_snapshot jsonb,p_expected_updated_at timestamptz default null)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare v_now timestamptz := clock_timestamp(); v_current timestamptz; v_kind text; v_collection text; v_item jsonb; v_cat jsonb; v_id text; v_tag text; v_tag_id uuid; v_related text;
begin
  if auth.uid() is null or public.ws_access_level(p_workspace_id, 'knowledge', 'main') <> 'edit' then
    raise exception 'Knowledge workspace edit access denied' using errcode='42501';
  end if;
  if jsonb_typeof(p_snapshot) <> 'object' then raise exception 'Invalid snapshot'; end if;
  perform pg_advisory_xact_lock(hashtext(p_workspace_id::text));
  select updated_at into v_current from public.knowledge_workspace_state where workspace_id=p_workspace_id for update;
  if v_current is distinct from p_expected_updated_at then
    if not (v_current is null and p_expected_updated_at is null) then
      return jsonb_build_object('ok',false,'conflict',true,'updatedAt',v_current);
    end if;
  end if;

  delete from public.knowledge_relations where workspace_id=p_workspace_id and relation_type='related';
  delete from public.knowledge_item_tags where workspace_id=p_workspace_id;
  delete from public.knowledge_followups f where f.workspace_id=p_workspace_id and f.status='open' and f.due_at is null and f.assigned_to is null and exists (select 1 from public.knowledge_items i where i.workspace_id=f.workspace_id and i.id=f.item_id) and not exists (select 1 from jsonb_array_elements(coalesce(p_snapshot->'meetings','[]'::jsonb)) m cross join lateral jsonb_array_elements_text(coalesce(m->'followups','[]'::jsonb)) title where m->>'id'=f.item_id and trim(title.value)=f.title);
  delete from public.knowledge_items i where i.workspace_id=p_workspace_id and not exists (
    select 1 from jsonb_array_elements(
      coalesce(p_snapshot->'resources','[]'::jsonb)||coalesce(p_snapshot->'ideas','[]'::jsonb)||
      coalesce(p_snapshot->'notes','[]'::jsonb)||coalesce(p_snapshot->'meetings','[]'::jsonb)||
      coalesce(p_snapshot->'events','[]'::jsonb)||coalesce(p_snapshot->'inbox','[]'::jsonb)
    ) q where q->>'id'=i.id
  );
  update public.knowledge_categories c set parent_id=null where c.workspace_id=p_workspace_id and c.parent_id is not null and not exists (
    select 1 from jsonb_array_elements(coalesce(p_snapshot->'categories','[]'::jsonb)) q where q->>'id'=c.parent_id
  );
  update public.knowledge_items i set category_id=null where i.workspace_id=p_workspace_id and i.category_id is not null and not exists (
    select 1 from jsonb_array_elements(coalesce(p_snapshot->'categories','[]'::jsonb)) q where q->>'id'=i.category_id
  );
  delete from public.knowledge_categories c where c.workspace_id=p_workspace_id and not exists (
    select 1 from jsonb_array_elements(coalesce(p_snapshot->'categories','[]'::jsonb)) q where q->>'id'=c.id
  );

  for v_cat in select value from jsonb_array_elements(coalesce(p_snapshot->'categories','[]'::jsonb)) loop
    insert into public.knowledge_categories(id,workspace_id,name,color,description,parent_id,sort_order,is_archived,created_by,updated_at)
    values(coalesce(v_cat->>'id',gen_random_uuid()::text),p_workspace_id,coalesce(v_cat->>'name','غير مصنف'),coalesce(v_cat->>'color','#0284C7'),v_cat->>'description',null,coalesce((v_cat->>'sortOrder')::int,0),coalesce((v_cat->>'isArchived')::boolean,false),auth.uid(),v_now)
    on conflict(workspace_id,id) do update set name=excluded.name,color=excluded.color,description=excluded.description,sort_order=excluded.sort_order,is_archived=excluded.is_archived,updated_at=excluded.updated_at;
  end loop;
  for v_cat in select value from jsonb_array_elements(coalesce(p_snapshot->'categories','[]'::jsonb)) loop
    if nullif(v_cat->>'parentId','') is not null then
      update public.knowledge_categories set parent_id=v_cat->>'parentId' where workspace_id=p_workspace_id and id=v_cat->>'id';
    end if;
  end loop;

  for v_collection,v_kind in select * from (values ('resources','resource'),('ideas','idea'),('notes','note'),('meetings','meeting'),('events','event'),('inbox','inbox')) as x(collection,kind) loop
    for v_item in select value from jsonb_array_elements(coalesce(p_snapshot->v_collection,'[]'::jsonb)) loop
      v_id:=coalesce(v_item->>'id',gen_random_uuid()::text);
      insert into public.knowledge_items(id,workspace_id,item_type,title,summary,body,canonical_url,source_type,author,published_at,read_at,review_at,item_date,start_time,end_time,timezone,location,status,idea_stage,priority,rating,is_pinned,is_archived,archived_at,category_id,notes,next_action,decisions,attendees,metadata,created_by,updated_by,created_at,updated_at)
      values(v_id,p_workspace_id,v_kind,coalesce(v_item->>'title','(بدون عنوان)'),v_item->>'summary',v_item->>'body',v_item->>'url',v_item->>'sourceType',v_item->>'author',nullif(v_item->>'publishedAt','')::date,nullif(v_item->>'readAt','')::date,nullif(v_item->>'reviewAt','')::date,nullif(v_item->>'date','')::date,nullif(v_item->>'startTime','')::time,nullif(v_item->>'endTime','')::time,coalesce(v_item->>'timezone','Africa/Cairo'),v_item->>'location',coalesce(v_item->>'status',case when v_kind='inbox' then 'inbox' else 'active' end),v_item->>'stage',coalesce(v_item->>'priority','normal'),nullif(v_item->>'rating','')::smallint,coalesce((v_item->>'pinned')::boolean,false),coalesce((v_item->>'status'='archived'),false),nullif(v_item->>'archivedAt','')::timestamptz,case when exists(select 1 from public.knowledge_categories c where c.workspace_id=p_workspace_id and c.id=v_item->>'categoryId') then v_item->>'categoryId' else null end,v_item->>'notes',v_item->>'nextAction',v_item->>'decisions',coalesce(v_item->'attendees','[]'::jsonb),jsonb_build_object('relatedSystem',v_item->>'relatedSystem','relatedId',v_item->>'relatedId'),auth.uid(),auth.uid(),coalesce(nullif(v_item->>'createdAt','')::timestamptz,v_now),v_now)
      on conflict(workspace_id,id) do update set item_type=excluded.item_type,title=excluded.title,summary=excluded.summary,body=excluded.body,canonical_url=excluded.canonical_url,source_type=excluded.source_type,author=excluded.author,published_at=excluded.published_at,read_at=excluded.read_at,review_at=excluded.review_at,item_date=excluded.item_date,start_time=excluded.start_time,end_time=excluded.end_time,timezone=excluded.timezone,location=excluded.location,status=excluded.status,idea_stage=excluded.idea_stage,priority=excluded.priority,rating=excluded.rating,is_pinned=excluded.is_pinned,is_archived=excluded.is_archived,archived_at=excluded.archived_at,category_id=excluded.category_id,notes=excluded.notes,next_action=excluded.next_action,decisions=excluded.decisions,attendees=excluded.attendees,metadata=excluded.metadata,updated_by=excluded.updated_by,updated_at=excluded.updated_at;
      for v_tag in select value from jsonb_array_elements_text(coalesce(v_item->'tags','[]'::jsonb)) loop
        insert into public.knowledge_tags(workspace_id,name) values(p_workspace_id,trim(v_tag)) on conflict(workspace_id,normalized_name) do update set name=excluded.name returning id into v_tag_id;
        insert into public.knowledge_item_tags(workspace_id,item_id,tag_id) values(p_workspace_id,v_id,v_tag_id) on conflict do nothing;
      end loop;
      for v_tag in select value from jsonb_array_elements_text(coalesce(v_item->'followups','[]'::jsonb)) loop
        insert into public.knowledge_followups(workspace_id,item_id,title,created_by) values(p_workspace_id,v_id,trim(v_tag),auth.uid()) on conflict(workspace_id,item_id,title) do nothing;
      end loop;
    end loop;
  end loop;

  for v_collection,v_kind in select * from (values ('resources','resource'),('ideas','idea'),('notes','note'),('meetings','meeting'),('events','event'),('inbox','inbox')) as x(collection,kind) loop
    for v_item in select value from jsonb_array_elements(coalesce(p_snapshot->v_collection,'[]'::jsonb)) loop
      v_id:=coalesce(v_item->>'id',gen_random_uuid()::text);
      for v_related in select value from jsonb_array_elements_text(coalesce(v_item->'relatedItemIds','[]'::jsonb)) loop
        if v_related<>v_id and exists(select 1 from public.knowledge_items where workspace_id=p_workspace_id and id=v_related) then
          insert into public.knowledge_relations(workspace_id,from_item_id,to_item_id,relation_type,created_by) values(p_workspace_id,v_id,v_related,'related',auth.uid()) on conflict do nothing;
        end if;
      end loop;
    end loop;
  end loop;

  insert into public.knowledge_activity(workspace_id,item_id,actor_id,action,change_summary) values(p_workspace_id,null,auth.uid(),'updated','Knowledge workspace snapshot saved');
  insert into public.knowledge_workspace_state(workspace_id,updated_at,updated_by,preferences,link_types) values(p_workspace_id,v_now,auth.uid(),coalesce(p_snapshot->'preferences','{"defaultView":"hub","reviewReminderDays":7}'::jsonb),coalesce(p_snapshot->'linkTypes','[]'::jsonb))
  on conflict(workspace_id) do update set updated_at=excluded.updated_at,updated_by=excluded.updated_by,preferences=excluded.preferences,link_types=excluded.link_types;
  return jsonb_build_object('ok',true,'conflict',false,'updatedAt',v_now);
end;
$$;

revoke all on function public.knowledge_load_snapshot(uuid) from public,anon;
revoke all on function public.knowledge_save_snapshot(uuid,jsonb,timestamptz) from public,anon;
revoke all on function public.knowledge_item_to_json(public.knowledge_items,text,uuid) from public,anon;
grant execute on function public.knowledge_item_to_json(public.knowledge_items,text,uuid) to authenticated;
grant execute on function public.knowledge_load_snapshot(uuid) to authenticated;
grant execute on function public.knowledge_save_snapshot(uuid,jsonb,timestamptz) to authenticated;


commit;
