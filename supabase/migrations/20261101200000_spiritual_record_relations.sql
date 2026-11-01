begin;

-- Normalized, content-free relationship edges between encrypted Spiritual records.
-- Text and sensitive payloads remain in client-side encrypted envelopes.
create table if not exists public.spiritual_record_relations (
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null,
  source_id uuid not null,
  source_collection text not null,
  target_id uuid not null,
  target_collection text not null,
  relation_type text not null check (relation_type in (
    'principle_value','practice_value','goal_practice',
    'commitment_value','commitment_principle','commitment_practice',
    'reflection_commitment'
  )),
  created_at timestamptz not null default now(),
  primary key (user_id, workspace_id, source_id, source_collection, target_id, target_collection, relation_type),
  constraint spiritual_record_relations_pair_check check (
    (relation_type='principle_value' and source_collection='principles' and target_collection='values') or
    (relation_type='practice_value' and source_collection='practices' and target_collection='values') or
    (relation_type='goal_practice' and source_collection='goals' and target_collection='practices') or
    (relation_type='commitment_value' and source_collection='commitments' and target_collection='values') or
    (relation_type='commitment_principle' and source_collection='commitments' and target_collection='principles') or
    (relation_type='commitment_practice' and source_collection='commitments' and target_collection='practices') or
    (relation_type='reflection_commitment' and source_collection='reflections' and target_collection='commitments')
  ),
  constraint spiritual_record_relations_source_fk
    foreign key (user_id,workspace_id,source_id,source_collection)
    references public.spiritual_private_records(user_id,workspace_id,id,collection) on delete cascade,
  constraint spiritual_record_relations_target_fk
    foreign key (user_id,workspace_id,target_id,target_collection)
    references public.spiritual_private_records(user_id,workspace_id,id,collection) on delete cascade
);
create index if not exists spiritual_record_relations_target_idx
  on public.spiritual_record_relations(user_id,workspace_id,target_collection,target_id);
alter table public.spiritual_record_relations enable row level security;
revoke all on public.spiritual_record_relations from public,anon;
grant select,insert,delete on public.spiritual_record_relations to authenticated;
drop policy if exists spiritual_record_relations_select_own on public.spiritual_record_relations;
create policy spiritual_record_relations_select_own on public.spiritual_record_relations
  for select to authenticated using(user_id=(select auth.uid()));
drop policy if exists spiritual_record_relations_insert_own on public.spiritual_record_relations;
create policy spiritual_record_relations_insert_own on public.spiritual_record_relations
  for insert to authenticated with check(user_id=(select auth.uid()));
drop policy if exists spiritual_record_relations_delete_own on public.spiritual_record_relations;
create policy spiritual_record_relations_delete_own on public.spiritual_record_relations
  for delete to authenticated using(user_id=(select auth.uid()));

create or replace function public.spiritual_replace_record_relations(
  p_workspace_id uuid,
  p_source_collection text,
  p_source_id uuid,
  p_relations jsonb default '[]'::jsonb
) returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode='42501';
  end if;
  if jsonb_typeof(coalesce(p_relations,'[]'::jsonb)) <> 'array' then
    raise exception 'Relations must be an array' using errcode='22023';
  end if;
  if not exists (
    select 1 from public.spiritual_private_records r
    where r.user_id=v_user_id and r.workspace_id=p_workspace_id
      and r.id=p_source_id and r.collection=p_source_collection and r.deleted=false
  ) then
    raise exception 'Source record not found or not owned' using errcode='42501';
  end if;
  delete from public.spiritual_record_relations
  where user_id=v_user_id and workspace_id=p_workspace_id
    and source_id=p_source_id and source_collection=p_source_collection;
  insert into public.spiritual_record_relations
    (user_id,workspace_id,source_id,source_collection,target_id,target_collection,relation_type)
  select v_user_id,p_workspace_id,p_source_id,p_source_collection,
         x.target_id,x.target_collection,x.relation_type
  from jsonb_to_recordset(coalesce(p_relations,'[]'::jsonb))
    as x(target_id uuid,target_collection text,relation_type text);
end;
$$;
revoke all on function public.spiritual_replace_record_relations(uuid,text,uuid,jsonb) from public,anon;
grant execute on function public.spiritual_replace_record_relations(uuid,text,uuid,jsonb) to authenticated;

commit;
