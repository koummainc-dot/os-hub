-- Read-only Knowledge OS migration preview.
-- Run in the SQL editor before applying the Knowledge migration. No persistent objects or rows are changed.
-- Reports counts and payload sizes only; it never prints titles, notes, URLs, or user content.
create temporary table if not exists knowledge_migration_preview (
  workspace_id uuid,
  source_part text,
  legacy_updated_at timestamptz,
  legacy_bytes bigint,
  legacy_resources integer not null default 0,
  legacy_ideas integer not null default 0,
  legacy_notes integer not null default 0,
  legacy_meetings integer not null default 0,
  legacy_events integer not null default 0,
  legacy_inbox integer not null default 0,
  normalized_items integer,
  normalized_categories integer,
  preview_status text not null default 'legacy_only'
);
truncate table knowledge_migration_preview;

do $$
declare
  v_has_legacy boolean := to_regclass('public.workspace_data') is not null;
  v_has_items boolean := to_regclass('public.knowledge_items') is not null;
  v_has_categories boolean := to_regclass('public.knowledge_categories') is not null;
begin
  if v_has_legacy then
    execute $q$
      insert into knowledge_migration_preview(
        workspace_id,source_part,legacy_updated_at,legacy_bytes,
        legacy_resources,legacy_ideas,legacy_notes,legacy_meetings,legacy_events,legacy_inbox
      )
      select workspace_id, part, updated_at, pg_column_size(data),
        case when jsonb_typeof(data->'resources')='array' then jsonb_array_length(data->'resources') else 0 end,
        case when jsonb_typeof(data->'ideas')='array' then jsonb_array_length(data->'ideas') else 0 end,
        case when jsonb_typeof(data->'notes')='array' then jsonb_array_length(data->'notes') else 0 end,
        case when jsonb_typeof(data->'meetings')='array' then jsonb_array_length(data->'meetings') else 0 end,
        case when jsonb_typeof(data->'events')='array' then jsonb_array_length(data->'events') else 0 end,
        case when jsonb_typeof(data->'inbox')='array' then jsonb_array_length(data->'inbox') else 0 end
      from public.workspace_data
      where system_id='knowledge'
    $q$;
  else
    raise notice 'workspace_data not found: legacy source cannot be previewed in this database.';
  end if;

  if v_has_items then
    if v_has_legacy then
      execute $q$
        insert into knowledge_migration_preview(workspace_id,source_part,preview_status)
        select distinct i.workspace_id,'normalized_only','normalized_only'
        from public.knowledge_items i
        where not exists (
          select 1 from knowledge_migration_preview p where p.workspace_id=i.workspace_id
        )
      $q$;
    else
      execute $q$
        insert into knowledge_migration_preview(workspace_id,source_part,preview_status)
        select distinct i.workspace_id,'normalized_only','normalized_only'
        from public.knowledge_items i
      $q$;
    end if;

    execute $q$
      update knowledge_migration_preview p
      set normalized_items = (
        select count(*)::integer from public.knowledge_items i where i.workspace_id=p.workspace_id
      ),
      preview_status=case when p.source_part='normalized_only' then 'normalized_only' else 'legacy_and_normalized' end
    $q$;
  end if;
  if v_has_categories then
    execute $q$
      update knowledge_migration_preview p
      set normalized_categories = (
        select count(*)::integer from public.knowledge_categories c where c.workspace_id=p.workspace_id
      )
    $q$;
  end if;
  if not v_has_legacy and not v_has_items then
    raise notice 'Neither legacy nor normalized Knowledge storage exists; no workspace rows to report.';
  end if;
end $$;

select *,
  (legacy_resources+legacy_ideas+legacy_notes+legacy_meetings+legacy_events+legacy_inbox) as legacy_item_count,
  case
    when normalized_items is null then 'Normalized schema not installed; preview only'
    when normalized_items=0 and (legacy_resources+legacy_ideas+legacy_notes+legacy_meetings+legacy_events+legacy_inbox)>0 then 'Backfill candidate'
    when normalized_items>0 then 'Compare counts and sample records before cutover'
    else 'No captured items'
  end as recommendation
from knowledge_migration_preview
order by workspace_id,source_part;
