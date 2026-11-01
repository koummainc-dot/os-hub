begin;

-- Collection-to-section mapping consumed by the platform's existing permission resolver.
insert into public.collection_sections(system_id, collection, section_id)
values
 ('spiritual','values','values'),('spiritual','principles','principles'),
 ('spiritual','practices','practices'),('spiritual','practice_logs','dailylog'),
 ('spiritual','reflections','reflections'),('spiritual','goals','goals'),
 ('spiritual','commitments','commitments'),('spiritual','important_dates','dates'),
 ('spiritual','reviews','reviews'),('spiritual','seasons','seasons')
on conflict (system_id, collection) do update set section_id=excluded.section_id;

-- Internal classification metadata; client roles intentionally receive no privileges.
create table if not exists public.spiritual_collection_policy (
 collection text primary key check (collection in ('values','principles','practices','practice_logs','reflections','goals','commitments','important_dates','reviews','seasons')),
 section_id text not null,
 sensitive boolean not null default false,
 allow_external_summary boolean not null default false,
 created_at timestamptz not null default now()
);
insert into public.spiritual_collection_policy(collection,section_id,sensitive,allow_external_summary) values
 ('values','values',false,true),('principles','principles',false,true),('practices','practices',false,true),
 ('practice_logs','dailylog',true,false),('reflections','reflections',true,false),
 ('goals','goals',false,true),('commitments','commitments',true,false),
 ('important_dates','dates',false,true),('reviews','reviews',true,false),('seasons','seasons',false,true)
on conflict(collection) do update set section_id=excluded.section_id,sensitive=excluded.sensitive,allow_external_summary=excluded.allow_external_summary;
alter table public.spiritual_collection_policy enable row level security;
revoke all on public.spiritual_collection_policy from public, anon, authenticated;

-- Sensitive spiritual records are user-owned, not merely workspace-visible.
-- This prevents workspace collaborators from reading another user's reflections,
-- practice logs, commitments, or reviews through the generic workspace_records policies.
create table if not exists public.spiritual_private_records (
 user_id uuid not null references auth.users(id) on delete cascade,
 workspace_id uuid not null references public.workspaces(id) on delete cascade,
 id text not null,
 collection text not null check (collection in ('practice_logs','reflections','commitments','reviews')),
 data jsonb not null default '{}'::jsonb,
 deleted boolean not null default false,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 primary key (user_id, id)
);
create index if not exists spiritual_private_records_workspace_collection_updated_idx
 on public.spiritual_private_records(workspace_id, collection, updated_at desc)
 where deleted = false;
alter table public.spiritual_private_records enable row level security;
revoke all on public.spiritual_private_records from public, anon;
grant select, insert, update, delete on public.spiritual_private_records to authenticated;

create policy spiritual_private_records_select_own
 on public.spiritual_private_records for select to authenticated
 using (user_id = (select auth.uid()));
create policy spiritual_private_records_insert_own
 on public.spiritual_private_records for insert to authenticated
 with check (user_id = (select auth.uid()));
create policy spiritual_private_records_update_own
 on public.spiritual_private_records for update to authenticated
 using (user_id = (select auth.uid()))
 with check (user_id = (select auth.uid()));
create policy spiritual_private_records_delete_own
 on public.spiritual_private_records for delete to authenticated
 using (user_id = (select auth.uid()));

commit;
