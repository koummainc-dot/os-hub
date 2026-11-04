begin;

-- Strengthen normalized practice-log integrity: a log must point to a private
-- record owned by the same user in the same workspace. This migration does not
-- apply to production automatically; validate against a non-production DB first.
do $$
begin
  if exists (
    select 1
    from public.spiritual_practice_logs l
    left join public.spiritual_private_records p
      on p.user_id = l.user_id
     and p.workspace_id = l.workspace_id
     and p.id = l.practice_id
     and p.collection = 'practices'
    where p.id is null
  ) then
    raise exception 'Spiritual practice-log integrity check failed: orphaned or cross-workspace practice references exist. Repair them before applying this migration.'
      using errcode = '23503';
  end if;
end
$$;

-- Include collection in the referenced key so a log cannot point at a values/principles row.
alter table public.spiritual_practice_logs
  add column if not exists practice_collection text not null default 'practices'
  check (practice_collection = 'practices');

create unique index if not exists spiritual_private_records_user_workspace_id_collection_uidx
  on public.spiritual_private_records(user_id, workspace_id, id, collection);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.spiritual_practice_logs'::regclass
      and conname = 'spiritual_practice_logs_user_workspace_practice_fk'
  ) then
    alter table public.spiritual_practice_logs
      add constraint spiritual_practice_logs_user_workspace_practice_fk
      foreign key (user_id, workspace_id, practice_id, practice_collection)
      references public.spiritual_private_records(user_id, workspace_id, id, collection)
      on delete cascade
      not valid;
  end if;
end
$$;

-- Validate only after the explicit preflight above; this fails closed if state
-- changed between preflight and validation.
alter table public.spiritual_practice_logs
  validate constraint spiritual_practice_logs_user_workspace_practice_fk;

commit;
