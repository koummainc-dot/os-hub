-- Record-level privacy: when visible_to is set, only those users can read/write the record
-- (even the workspace owner/admin). NULL = visible to everyone who has access to the system.
alter table public.workspace_records add column if not exists visible_to uuid[];
create index if not exists workspace_records_visible_idx on public.workspace_records using gin (visible_to);

-- Server-trusted timestamps / author (used for optimistic concurrency by the client)
create or replace function public.records_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at := clock_timestamp();
  new.updated_by := auth.uid();
  return new;
end $$;
drop trigger if exists records_touch_trg on public.workspace_records;
create trigger records_touch_trg before insert or update on public.workspace_records
  for each row execute function public.records_touch();

drop policy if exists wr_select on public.workspace_records;
drop policy if exists wr_insert on public.workspace_records;
drop policy if exists wr_update on public.workspace_records;
drop policy if exists wr_delete on public.workspace_records;
create policy wr_select on public.workspace_records for select to authenticated
  using (public.ws_access_level(workspace_id, system_id, collection) in ('view','edit')
         and (visible_to is null or auth.uid() = any(visible_to)));
create policy wr_insert on public.workspace_records for insert to authenticated
  with check (public.ws_access_level(workspace_id, system_id, collection) = 'edit'
              and (visible_to is null or auth.uid() = any(visible_to)));
create policy wr_update on public.workspace_records for update to authenticated
  using (public.ws_access_level(workspace_id, system_id, collection) = 'edit'
         and (visible_to is null or auth.uid() = any(visible_to)))
  with check (public.ws_access_level(workspace_id, system_id, collection) = 'edit'
              and (visible_to is null or auth.uid() = any(visible_to)));
create policy wr_delete on public.workspace_records for delete to authenticated
  using (public.is_ws_owner(workspace_id) and (visible_to is null or auth.uid() = any(visible_to)));

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'workspace_records') then
    alter publication supabase_realtime add table public.workspace_records;
  end if;
end $$;
