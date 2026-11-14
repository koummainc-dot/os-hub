\set ON_ERROR_STOP on

-- The project records are written by Projects, while Meetings remain Knowledge-owned.
-- This test exercises the canonical external link table and the server-side project filter.
-- Two authenticated identities are used below. Project A is visible only to the
-- first identity; Project B is visible to every member with Projects read access.
insert into auth.users(id)
values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')
on conflict (id) do nothing;

insert into public.workspace_records(workspace_id,system_id,collection,id,data,deleted,visible_to)
values
 ('11111111-1111-4111-8111-111111111111','projects','projects','project-a','{"name":"Project A"}',false,array['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid]),
 ('11111111-1111-4111-8111-111111111111','projects','projects','project-b','{"name":"Project B"}',false,null);

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

-- Direct PostgREST writes to knowledge_external_links must enforce the same
-- Projects visibility rule; they cannot bypass the Knowledge item metadata trigger.
insert into public.knowledge_external_links
  (workspace_id,item_id,target_system,target_id,relation_type,created_by)
values
  ('11111111-1111-4111-8111-111111111111','meeting-general','projects','project-a','supports',auth.uid());

select set_config('test.projects_access_level','none',false);
do $assert$
begin
  begin
    insert into public.knowledge_external_links
      (workspace_id,item_id,target_system,target_id,relation_type,created_by)
    values
      ('11111111-1111-4111-8111-111111111111','meeting-general','projects','project-b','used_in',auth.uid());
    raise exception 'Direct external-link INSERT bypassed Projects visibility';
  exception when sqlstate '42501' then
    null;
  end;

  begin
    update public.knowledge_external_links
       set target_id='project-b'
     where workspace_id='11111111-1111-4111-8111-111111111111'
       and item_id='meeting-general' and target_system='projects'
       and target_id='project-a' and relation_type='supports';
    raise exception 'Direct external-link UPDATE bypassed Projects visibility';
  exception when sqlstate '42501' then
    null;
  end;
end
$assert$;
select set_config('test.projects_access_level','view',false);

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

-- A second identity has Knowledge edit and Projects view, but Project A is
-- explicitly private to the first identity through workspace_records.visible_to.
select set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',false);
select set_config('test.access_level','edit',false);
select set_config('test.projects_access_level','view',false);
do $assert$
declare
  meeting_count integer;
begin
  select count(*) into meeting_count
    from public.knowledge_list_project_meetings('11111111-1111-4111-8111-111111111111','project-b');
  if meeting_count<>1 then
    raise exception 'Second identity should see the meeting for its visible Project B; got %',meeting_count;
  end if;

  begin
    perform * from public.knowledge_list_project_meetings('11111111-1111-4111-8111-111111111111','project-a');
    raise exception 'Second identity unexpectedly read the private Project A meeting through Projects';
  exception when sqlstate '42501' then
    null;
  end;

  begin
    insert into public.knowledge_items(id,workspace_id,item_type,title,metadata,created_by,updated_by)
    values ('meeting-private-forged','11111111-1111-4111-8111-111111111111','meeting','Private Project Forgery',
            '{"relatedSystem":"projects","relatedId":"project-a"}',auth.uid(),auth.uid());
    raise exception 'Second identity unexpectedly linked a Knowledge meeting to private Project A';
  exception when sqlstate '42501' then
    null;
  end;

  begin
    insert into public.knowledge_external_links
      (workspace_id,item_id,target_system,target_id,relation_type,created_by)
    values
      ('11111111-1111-4111-8111-111111111111','meeting-general','projects','project-a','supports',auth.uid());
    raise exception 'Second identity bypassed Project A visibility through direct external-link insert';
  exception when sqlstate '42501' then
    null;
  end;
end
$assert$;

reset role;
select 'Knowledge canonical project links and project-scoped meeting reads passed' as result;
