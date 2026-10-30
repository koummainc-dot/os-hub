-- Runs after the Knowledge migration on a disposable PostgreSQL database.
insert into public.workspaces(id) values
 ('11111111-1111-4111-8111-111111111111'),
 ('22222222-2222-4222-8222-222222222222');
insert into auth.users(id) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');

insert into public.knowledge_categories(id,workspace_id,name) values
 ('cat-a','11111111-1111-4111-8111-111111111111','Workspace A'),
 ('cat-b','22222222-2222-4222-8222-222222222222','Workspace B');

do $$
declare t text; bad_count integer;
begin
  foreach t in array array[
    'knowledge_categories','knowledge_items','knowledge_tags','knowledge_item_tags',
    'knowledge_relations','knowledge_followups','knowledge_attachments','knowledge_external_links',
    'knowledge_reminders','knowledge_activity','knowledge_notifications','knowledge_workspace_state'
  ] loop
    select count(*) into bad_count from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and c.relname=t and c.relrowsecurity;
    if bad_count<>1 then raise exception 'RLS not enabled for %',t; end if;
  end loop;
end $$;

set role authenticated;
select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',false);
select set_config('test.allowed_workspace_id','11111111-1111-4111-8111-111111111111',false);
select set_config('test.access_level','view',false);
do $$
declare visible_count integer;
begin
  select count(*) into visible_count from public.knowledge_categories;
  if visible_count<>1 then raise exception 'Viewer should see only their permitted workspace row; got %',visible_count; end if;
  begin
    insert into public.knowledge_categories(id,workspace_id,name)
    values('viewer-write','11111111-1111-4111-8111-111111111111','Must fail');
    raise exception 'Viewer insert unexpectedly succeeded';
  exception when insufficient_privilege then
    null;
  end;
  begin
    insert into storage.objects(bucket_id,name)
    values('knowledge-attachments','11111111-1111-4111-8111-111111111111/cat-a/viewer.pdf');
    raise exception 'Viewer attachment upload unexpectedly succeeded';
  exception when insufficient_privilege then
    null;
  end;
end $$;

select set_config('test.access_level','edit',false);
insert into storage.objects(bucket_id,name)
values('knowledge-attachments','11111111-1111-4111-8111-111111111111/cat-a/editor.pdf');
do $$
declare visible_count integer;
begin
  select count(*) into visible_count from storage.objects where bucket_id='knowledge-attachments';
  if visible_count<>1 then raise exception 'Editor should upload only into its allowed workspace; got %',visible_count; end if;
  begin
    insert into storage.objects(bucket_id,name)
    values('knowledge-attachments','22222222-2222-4222-8222-222222222222/cat-b/cross-workspace.pdf');
    raise exception 'Cross-workspace attachment upload unexpectedly succeeded';
  exception when insufficient_privilege then
    null;
  end;
end $$;
reset role;

-- Ensure the preview is safe to run with both legacy and normalized tables present.
select count(*) from public.knowledge_items;
select count(*) from public.knowledge_notifications;
