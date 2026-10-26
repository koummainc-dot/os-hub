-- Maps each record collection to the UI section that owns it, so hiding a section hides ALL its collections server-side.
-- (Collections not listed use their own name as the section id; core collections like projects/tasks follow the system level only.)
create table if not exists public.collection_sections (
  system_id   text not null,
  collection  text not null,
  section_id  text not null,
  primary key (system_id, collection)
);
alter table public.collection_sections enable row level security;
drop policy if exists cs_select on public.collection_sections;
create policy cs_select on public.collection_sections for select to authenticated using (true);
revoke all on public.collection_sections from anon;
grant select on public.collection_sections to authenticated;

insert into public.collection_sections(system_id, collection, section_id) values
  ('projects','issues','risks'), ('projects','decisions','risks'),
  ('projects','objectives','okrs'), ('projects','krs','okrs'), ('projects','checkins','okrs'),
  ('projects','teams','team'), ('projects','profiles','team')
on conflict do nothing;

create or replace function public.ws_access_level(ws uuid, sys text, part text default 'main')
returns text language plpgsql stable security definer set search_path = public as $$
declare a jsonb; lvl text; sec text; sid text;
begin
  if auth.uid() is null then return 'none'; end if;
  if exists (select 1 from public.workspaces w where w.id = ws and w.owner_id = auth.uid()) then
    return 'edit';
  end if;
  select m.access into a from public.workspace_members m
   where m.workspace_id = ws and m.user_id = auth.uid() and m.status = 'active';
  if a is null then return 'none'; end if;
  lvl := coalesce(a->'systems'->sys->>'level', 'none');
  if lvl not in ('view','edit') then return 'none'; end if;
  select cs.section_id into sid from public.collection_sections cs where cs.system_id = sys and cs.collection = part;
  sec := a->'systems'->sys->'sections'->>coalesce(sid, part);
  if sec = 'none' then return 'none'; end if;
  if sec = 'view' and lvl = 'edit' then return 'view'; end if;
  return lvl;
end $$;
