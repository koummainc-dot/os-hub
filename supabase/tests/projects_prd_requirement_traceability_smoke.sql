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

-- Verified requirements require an active Final output linked to the exact requirement.
update public.workspace_records
   set data = jsonb_set(data, '{requirements}', '[{"id":"req1","title":"Requirement One","status":"Verified"}]'::jsonb)
 where workspace_id = '11111111-1111-4111-8111-111111111111'
   and system_id = 'projects' and collection = 'prds' and id = 'prd1';

do $block$ begin
  begin
    update public.workspace_records
       set data = jsonb_set(data, '{requirements}', '[{"id":"req2","title":"Requirement Two","status":"Verified"}]'::jsonb)
     where workspace_id = '11111111-1111-4111-8111-111111111111'
       and system_id = 'projects' and collection = 'prds' and id = 'prd2';
    raise exception 'expected Verified requirement without Final evidence rejection';
  exception when sqlstate '22023' then null;
  end;
end $block$;

do $block$ begin
  begin
    update public.workspace_records
       set data = jsonb_set(data, '{approval}', '"Draft"'::jsonb)
     where workspace_id = '11111111-1111-4111-8111-111111111111'
       and system_id = 'projects' and collection = 'outputs' and id = 'output1';
    raise exception 'expected last Final evidence downgrade rejection';
  exception when sqlstate '22023' then null;
  end;
end $block$;

do $block$ begin
  begin
    update public.workspace_records
       set data = jsonb_set(data, '{archived_at}', '"2026-10-31T00:00:00Z"'::jsonb)
     where workspace_id = '11111111-1111-4111-8111-111111111111'
       and system_id = 'projects' and collection = 'outputs' and id = 'output1';
    raise exception 'expected last Final evidence archive rejection';
  exception when sqlstate '22023' then null;
  end;
end $block$;

do $block$ begin
  begin
    update public.workspace_records
       set data = jsonb_set(data, '{requirements}', '[]'::jsonb)
     where workspace_id = '11111111-1111-4111-8111-111111111111'
       and system_id = 'projects' and collection = 'prds' and id = 'prd1';
    raise exception 'expected referenced PRD requirement removal rejection';
  exception when sqlstate '22023' then null;
  end;
end $block$;

do $block$ begin
  begin
    update public.workspace_records
       set data = jsonb_set(data, '{archived_at}', '"2026-10-31T00:00:00Z"'::jsonb)
     where workspace_id = '11111111-1111-4111-8111-111111111111'
       and system_id = 'projects' and collection = 'prds' and id = 'prd1';
    raise exception 'expected PRD archive with active references rejection';
  exception when sqlstate '22023' then null;
  end;
end $block$;

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

-- Additional entity-level relationships are validated in the same workspace/project.
insert into public.workspace_records (workspace_id, system_id, collection, id, data)
values
 ('11111111-1111-4111-8111-111111111111','projects','outputs','output2','{"project_id":"p1","approval":"Draft","name":"Draft output"}'),
 ('11111111-1111-4111-8111-111111111111','projects','outputs','output3','{"project_id":"p2","prd_id":"prd2","prd_requirement_id":"req2","approval":"Final","name":"Final evidence for requirement two"}'),

update public.workspace_records
   set data = jsonb_set(data, '{requirements}', '[{"id":"req2","title":"Requirement Two","status":"Verified"}]'::jsonb)
 where workspace_id = '11111111-1111-4111-8111-111111111111'
   and system_id = 'projects' and collection = 'prds' and id = 'prd2';

do $block$ begin
  begin
    update public.workspace_records
       set data = jsonb_set(data, '{approval}', '"Draft"'::jsonb)
     where workspace_id = '11111111-1111-4111-8111-111111111111'
       and system_id = 'projects' and collection = 'outputs' and id = 'output3';
    raise exception 'expected last Final evidence downgrade rejection for requirement two';
  exception when sqlstate '22023' then null;
  end;
end $block$;
 ('11111111-1111-4111-8111-111111111111','projects','objectives','obj1','{"name":"Objective One","project_ids":["p1"]}'),
 ('11111111-1111-4111-8111-111111111111','projects','krs','kr1','{"name":"KR One","objective_id":"obj1","project_ids":["p1"],"task_ids":["task1"]}'),
 ('11111111-1111-4111-8111-111111111111','projects','risks','risk1','{"project_id":"p1","title":"Risk One","task_ids":["task1"],"prd_id":"prd1"}'),
 ('11111111-1111-4111-8111-111111111111','projects','risks','risk2','{"project_id":"p2","title":"Risk Two","task_ids":["task2"]}'),
 ('11111111-1111-4111-8111-111111111111','projects','issues','issue1','{"project_id":"p1","title":"Issue One","task_ids":["task1"]}'),
 ('11111111-1111-4111-8111-111111111111','projects','issues','issue2','{"project_id":"p2","title":"Issue Two","task_ids":["task2"]}'),
 ('11111111-1111-4111-8111-111111111111','projects','discovery','discovery1','{"title":"Discovery One","project_ids":["p1"]}'),
 ('11111111-1111-4111-8111-111111111111','projects','discovery','discovery2','{"title":"Discovery Two","project_ids":["p2"]}');

insert into public.workspace_records (workspace_id, system_id, collection, id, data)
values ('11111111-1111-4111-8111-111111111111','projects','tasks','task3',
        '{"project_id":"p1","parent_task_id":"task1","issue_ids":["issue1"],"discovery_ids":["discovery1"],"title":"Linked child task"}');

insert into public.workspace_records (workspace_id, system_id, collection, id, data)
values ('11111111-1111-4111-8111-111111111111','projects','decisions','decision1',
        '{"project_id":"p1","title":"Decision One","status":"Approved","affected_task_ids":["task1"],"implementation_task_ids":["task1"],"affected_prd_ids":["prd1"],"affected_risk_ids":["risk1"],"affected_issue_ids":["issue1"],"affected_discovery_ids":["discovery1"]}');

insert into public.workspace_records (workspace_id, system_id, collection, id, data)
values ('11111111-1111-4111-8111-111111111111','projects','wins','win1',
        '{"project_id":"p1","title":"Win One","objective_id":"obj1","kr_id":"kr1","task_ids":["task1"],"output_ids":["output1"]}');

insert into public.workspace_records (workspace_id, system_id, collection, id, data)
values ('11111111-1111-4111-8111-111111111111','projects','updates','update1',
        '{"project_id":"p1","title":"Update One","related_task_ids":["task1"],"related_risk_ids":["risk1"],"related_issue_ids":["issue1"],"related_decision_ids":["decision1"],"related_prd_ids":["prd1"],"related_output_ids":["output1"],"related_win_ids":["win1"]}');

-- Decision, risk, issue, KR, objective, win and update links cannot cross project boundaries.
do $$ begin
  begin
    insert into public.workspace_records (workspace_id, system_id, collection, id, data)
    values ('11111111-1111-4111-8111-111111111111','projects','decisions','bad-decision',
            '{"project_id":"p1","title":"Bad decision","affected_task_ids":["task2"]}');
    raise exception 'expected cross-project decision task rejection';
  exception when sqlstate '22023' then null;
  end;
end $$;

do $$ begin
  begin
    insert into public.workspace_records (workspace_id, system_id, collection, id, data)
    values ('11111111-1111-4111-8111-111111111111','projects','risks','bad-risk',
            '{"project_id":"p1","title":"Bad risk","task_ids":["task2"]}');
    raise exception 'expected cross-project risk task rejection';
  exception when sqlstate '22023' then null;
  end;
end $$;

do $$ begin
  begin
    insert into public.workspace_records (workspace_id, system_id, collection, id, data)
    values ('11111111-1111-4111-8111-111111111111','projects','wins','bad-win',
            '{"project_id":"p1","title":"Bad win","output_ids":["output2"]}');
    raise exception 'expected non-final win output rejection';
  exception when sqlstate '22023' then null;
  end;
end $$;

do $$ begin
  begin
    insert into public.workspace_records (workspace_id, system_id, collection, id, data)
    values ('11111111-1111-4111-8111-111111111111','projects','updates','bad-update',
            '{"project_id":"p1","title":"Bad update","related_risk_ids":["risk2"]}');
    raise exception 'expected cross-project update risk rejection';
  exception when sqlstate '22023' then null;
  end;
end $$;

do $$ begin
  begin
    insert into public.workspace_records (workspace_id, system_id, collection, id, data)
    values ('11111111-1111-4111-8111-111111111111','projects','objectives','bad-objective',
            '{"name":"Bad objective","project_ids":["missing-project"]}');
    raise exception 'expected missing objective project rejection';
  exception when sqlstate '22023' then null;
  end;
end $$;

do $$ begin
  begin
    insert into public.workspace_records (workspace_id, system_id, collection, id, data)
    values ('11111111-1111-4111-8111-111111111111','projects','krs','bad-kr',
            '{"name":"Bad KR","objective_id":"obj1","project_ids":["p1"],"task_ids":["task2"]}');
    raise exception 'expected KR task/project mismatch rejection';
  exception when sqlstate '22023' then null;
  end;
end $$;

do $$ begin
  begin
    insert into public.workspace_records (workspace_id, system_id, collection, id, data)
    values ('11111111-1111-4111-8111-111111111111','projects','issues','bad-issue',
            '{"project_id":"p1","title":"Bad issue","task_ids":["task2"]}');
    raise exception 'expected issue task/project mismatch rejection';
  exception when sqlstate '22023' then null;
  end;
end $$;

do $$ begin
  begin
    insert into public.workspace_records (workspace_id, system_id, collection, id, data)
    values ('11111111-1111-4111-8111-111111111111','projects','tasks','bad-parent',
            '{"project_id":"p1","parent_task_id":"task2"}');
    raise exception 'expected cross-project parent rejection';
  exception when sqlstate '22023' then null;
  end;
end $$;

do $$ begin
  begin
    insert into public.workspace_records (workspace_id, system_id, collection, id, data)
    values ('11111111-1111-4111-8111-111111111111','projects','tasks','bad-issue-link',
            '{"project_id":"p1","issue_ids":["issue2"]}');
    raise exception 'expected cross-project task issue rejection';
  exception when sqlstate '22023' then null;
  end;
end $$;

do $$ begin
  begin
    insert into public.workspace_records (workspace_id, system_id, collection, id, data)
    values ('11111111-1111-4111-8111-111111111111','projects','tasks','bad-discovery-link',
            '{"project_id":"p1","discovery_ids":["discovery2"]}');
    raise exception 'expected cross-project task discovery rejection';
  exception when sqlstate '22023' then null;
  end;
end $$;

do $$ begin
  begin
    delete from public.workspace_records
     where workspace_id = '11111111-1111-4111-8111-111111111111'
       and system_id = 'projects' and collection = 'outputs' and id = 'output1';
    raise exception 'expected deletion of last Final evidence rejection';
  exception when sqlstate '22023' then null;
  end;
end $$;

do $$ begin
  begin
    delete from public.workspace_records
     where workspace_id = '11111111-1111-4111-8111-111111111111'
       and system_id = 'projects' and collection = 'prds' and id = 'prd1';
    raise exception 'expected PRD deletion with active references rejection';
  exception when sqlstate '22023' then null;
  end;
end $$;
