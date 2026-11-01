begin;
-- Register Spiritual OS collections with the existing collection-level permission contract.
insert into public.collection_sections(system_id, collection, section_id)
values
 ('spiritual','values','values'),('spiritual','principles','principles'),
 ('spiritual','practices','practices'),('spiritual','practice_logs','dailylog'),
 ('spiritual','reflections','reflections'),('spiritual','goals','goals'),
 ('spiritual','commitments','commitments'),('spiritual','important_dates','dates'),
 ('spiritual','reviews','reviews'),('spiritual','seasons','seasons')
on conflict (system_id, collection) do update set section_id=excluded.section_id;

-- Explicit sensitivity registry. This table is metadata only and is not exposed to client roles.
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
commit;
