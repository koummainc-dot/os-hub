\set ON_ERROR_STOP on

-- The project records are written by Projects, while Meetings remain Knowledge-owned.
-- This test exercises the canonical external link table and the server-side project filter.
insert into public.workspace_records(workspace_id,system_id,collection,id,data,deleted)
values
 ('11111111-1111-4111-8111-111111111111','projects','projects','project-a','{"name":"Project A"}',false),
 ('11111111-1111-4111-8111-111111111111','projects','projects','project-b','{"name":"Project B"}',false);

set role authenticated;
select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',false);
select set_config('test.allowed_workspace_id','11111111-1111-4111-8111-111111111111',false);
select set_config('test.access_level','edit',false);
select set_config('test.projects_access_level','view',false);

insert into public.knowledge_items(id,workspace_id,item_type,title,metadata,created_by,updated_by)
values
 ('meeting-a','11111111-1111-4111-8111-111111111111','meeting','Meeting A','{"relatedSystem":"projects","relatedId":"project-a"}',auth.uid(),auth.uid()),
 ('meeting-b','11111111-1111-4111-8111-111111111111','meeting','Meeting B','{"relatedSystem":"projects","relatedId":"project-b"}',auth.uid(),auth.uid()),
 ('meeting-general','11111111-1111-4111-8111-111111111111','meeting','General Meeting','{}',auth.uid(),auth.uid());

do $assert$
declare
  linked_count integer;
  meeting_count integer;
  project_ref text;
begin
  select count(*) into linked_count
    from public.knowledge_external_links
   where workspace_id='11111111-1111-4111-8111-111111111111'
     and target_system='projects' and relation_type='related';
  if linked_count<>2 then
    raise exception 'Expected two canonical project links after Knowledge save; got %',linked_count;
  end if;

  select count(*) into meeting_count
    from public.knowledge_list_project_meetings('11111111-1111-4111-8111-111111111111','project-a');
  if meeting_count<>1 then
    raise exception 'Project A query should return only Meeting A; got %',meeting_count;
  end if;

  select meeting->>'project_ref' into project_ref
    from public.knowledge_list_project_meetings('11111111-1111-4111-8111-111111111111','project-a')
   where meeting->>'id'='meeting-a';
  if project_ref is distinct from 'project-a' then
    raise exception 'Project-scoped meeting should expose canonical project_ref; got %',project_ref;
  end if;

  select count(*) into meeting_count
    from public.knowledge_list_project_meetings('11111111-1111-4111-8111-111111111111','project-b');
  if meeting_count<>1 then
    raise exception 'Project B query should return only Meeting B; got %',meeting_count;
  end if;

  select count(*) into meeting_count
    from public.knowledge_list_project_meetings('11111111-1111-4111-8111-111111111111',null);
  if meeting_count<>3 then
    raise exception 'Unfiltered Knowledge query should return all three visible meetings; got %',meeting_count;
  end if;
end
$assert$;

-- Reassigning the project replaces the canonical link; it must not leave an old backlink.
update public.knowledge_items
   set metadata='{"relatedSystem":"projects","relatedId":"project-b"}'::jsonb
 where workspace_id='11111111-1111-4111-8111-111111111111'
   and id='meeting-a';

do $assert$
declare
  old_count integer;
  new_count integer;
begin
  select count(*) into old_count
    from public.knowledge_external_links
   where workspace_id='11111111-1111-4111-8111-111111111111'
     and item_id='meeting-a' and target_system='projects' and target_id='project-a';
  select count(*) into new_count
    from public.knowledge_external_links
   where workspace_id='11111111-1111-4111-8111-111111111111'
     and item_id='meeting-a' and target_system='projects' and target_id='project-b';
  if old_count<>0 or new_count<>1 then
    raise exception 'Reassign must replace the old project link without duplication';
  end if;
end
$assert$;

-- Removing the external relation clears only the primary related row.
update public.knowledge_items
   set metadata='{}'::jsonb
 where workspace_id='11111111-1111-4111-8111-111111111111'
   and id='meeting-a';
do $assert$
begin
  if exists (
    select 1 from public.knowledge_external_links
     where workspace_id='11111111-1111-4111-8111-111111111111'
       and item_id='meeting-a' and relation_type='related'
  ) then
    raise exception 'Unlinking a meeting must clear its primary external relation';
  end if;
end
$assert$;

-- An unknown project cannot be linked by forging metadata.
do $assert$
begin
  begin
    insert into public.knowledge_items(id,workspace_id,item_type,title,metadata,created_by,updated_by)
    values ('meeting-invalid','11111111-1111-4111-8111-111111111111','meeting','Invalid Meeting',
            '{"relatedSystem":"projects","relatedId":"not-a-project"}',auth.uid(),auth.uid());
    raise exception 'Expected invalid project link rejection';
  exception when sqlstate '42501' then
    null;
  end;
end
$assert$;

-- Project-scoped reads require the caller to retain Projects visibility.
select set_config('test.projects_access_level','none',false);
do $assert$
begin
  begin
    perform * from public.knowledge_list_project_meetings('11111111-1111-4111-8111-111111111111','project-b');
    raise exception 'Expected denied project-scoped meeting read';
  exception when sqlstate '42501' then
    null;
  end;
end
$assert$;

-- Knowledge access is independently required, even if Projects access is granted.
select set_config('test.projects_access_level','view',false);
select set_config('test.access_level','none',false);
do $assert$
begin
  begin
    perform * from public.knowledge_list_project_meetings('11111111-1111-4111-8111-111111111111',null);
    raise exception 'Expected denied Knowledge meeting read';
  exception when sqlstate '42501' then
    null;
  end;
end
$assert$;

reset role;
select 'Knowledge canonical project links and project-scoped meeting reads passed' as result;
