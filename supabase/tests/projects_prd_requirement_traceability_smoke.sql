\set ON_ERROR_STOP on
insert into public.workspace_records (workspace_id, system_id, collection, id, data)
values
 ('11111111-1111-4111-8111-111111111111','projects','projects','p1','{"name":"Project One"}'),
 ('11111111-1111-4111-8111-111111111111','projects','projects','p2','{"name":"Project Two"}'),
 ('11111111-1111-4111-8111-111111111111','projects','prds','prd1','{"project_id":"p1","requirements":[{"id":"req1","title":"Requirement One"}]}'),
 ('11111111-1111-4111-8111-111111111111','projects','prds','prd2','{"project_id":"p2","requirements":[{"id":"req2","title":"Requirement Two"}]}'),
 ('11111111-1111-4111-8111-111111111111','projects','tasks','task2','{"project_id":"p2","title":"Other project task"}');

-- Valid task and output links are accepted.
insert into public.workspace_records (workspace_id, system_id, collection, id, data)
values ('11111111-1111-4111-8111-111111111111','projects','tasks','task1',
        '{"project_id":"p1","prd_id":"prd1","prd_requirement_id":"req1","title":"Implement requirement"}');
insert into public.workspace_records (workspace_id, system_id, collection, id, data)
values ('11111111-1111-4111-8111-111111111111','projects','outputs','output1',
        '{"project_id":"p1","task_id":"task1","prd_id":"prd1","prd_requirement_id":"req1","approval":"Final"}');

-- A requirement cannot be linked without its PRD.
do $$ begin
  begin
    insert into public.workspace_records (workspace_id, system_id, collection, id, data)
    values ('11111111-1111-4111-8111-111111111111','projects','tasks','bad-no-prd',
            '{"project_id":"p1","prd_requirement_id":"req1"}');
    raise exception 'expected requirement-without-PRD rejection';
  exception when sqlstate '22023' then null;
  end;
end $$;

-- A requirement ID must belong to the selected PRD.
do $$ begin
  begin
    insert into public.workspace_records (workspace_id, system_id, collection, id, data)
    values ('11111111-1111-4111-8111-111111111111','projects','tasks','bad-req',
            '{"project_id":"p1","prd_id":"prd1","prd_requirement_id":"req2"}');
    raise exception 'expected foreign-requirement rejection';
  exception when sqlstate '22023' then null;
  end;
end $$;

-- PRDs and output tasks must belong to the same project as the task/output.
do $$ begin
  begin
    insert into public.workspace_records (workspace_id, system_id, collection, id, data)
    values ('11111111-1111-4111-8111-111111111111','projects','tasks','bad-project',
            '{"project_id":"p1","prd_id":"prd2","prd_requirement_id":"req2"}');
    raise exception 'expected cross-project PRD rejection';
  exception when sqlstate '22023' then null;
  end;
end $$;

do $$ begin
  begin
    insert into public.workspace_records (workspace_id, system_id, collection, id, data)
    values ('11111111-1111-4111-8111-111111111111','projects','outputs','bad-task',
            '{"project_id":"p1","task_id":"task2"}');
    raise exception 'expected cross-project task rejection';
  exception when sqlstate '22023' then null;
  end;
end $$;

do $$ begin
  if (select count(*) from public.workspace_records where collection = 'tasks' and id = 'task1') <> 1 then
    raise exception 'valid task link was not persisted';
  end if;
  if (select count(*) from public.workspace_records where collection = 'outputs' and id = 'output1') <> 1 then
    raise exception 'valid output link was not persisted';
  end if;
end $$;
