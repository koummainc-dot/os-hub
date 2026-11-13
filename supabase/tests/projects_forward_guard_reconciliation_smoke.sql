\set ON_ERROR_STOP on

do $assert$
declare
  expected_triggers text[] := array[
    'projects_guard_final_outputs_trg',
    'projects_guard_work_sessions_trg',
    'projects_guard_task_references_trg',
    'projects_guard_prd_review_trg',
    'projects_guard_risk_issue_links_trg',
    'projects_guard_task_issue_references_trg',
    'projects_guard_prd_requirement_links_trg',
    'projects_guard_entity_relationships_trg',
    'projects_guard_prd_verified_requirement_evidence_trg'
  ];
  trigger_name text;
  deferrable boolean;
  initially_deferred boolean;
  function_oid oid;
  function_def text;
begin
  foreach trigger_name in array expected_triggers loop
    if not exists (
      select 1
        from pg_trigger t
        join pg_class c on c.oid=t.tgrelid
        join pg_namespace n on n.oid=c.relnamespace
       where n.nspname='public'
         and c.relname='workspace_records'
         and t.tgname=trigger_name
         and not t.tgisinternal
         and t.tgenabled in ('O','A')
    ) then
      raise exception 'Missing or disabled Projects guard trigger: %', trigger_name;
    end if;
  end loop;

  select t.tgdeferrable,t.tginitdeferred
    into deferrable,initially_deferred
    from pg_trigger t
    join pg_class c on c.oid=t.tgrelid
    join pg_namespace n on n.oid=c.relnamespace
   where n.nspname='public'
     and c.relname='workspace_records'
     and t.tgname='projects_guard_task_issue_references_trg'
     and not t.tgisinternal;
  if not coalesce(deferrable,false) or not coalesce(initially_deferred,false) then
    raise exception 'Task ↔ Issue guard must remain DEFERRABLE INITIALLY DEFERRED';
  end if;

  foreach trigger_name in array array[
    'projects_guard_final_outputs',
    'projects_guard_work_sessions',
    'projects_guard_task_references',
    'projects_guard_prd_review',
    'projects_guard_risk_issue_links',
    'projects_guard_task_issue_references',
    'projects_guard_prd_requirement_links',
    'projects_assert_linked_records',
    'projects_guard_entity_relationships',
    'projects_guard_prd_verified_requirement_evidence'
  ] loop
    select p.oid into function_oid
      from pg_proc p
      join pg_namespace n on n.oid=p.pronamespace
     where n.nspname='public' and p.proname=trigger_name
     order by p.oid desc limit 1;
    if function_oid is null then
      raise exception 'Missing Projects guard function: %', trigger_name;
    end if;
    if not (select prosecdef from pg_proc where oid=function_oid) then
      raise exception 'Projects guard must remain SECURITY DEFINER: %', trigger_name;
    end if;
    if has_function_privilege('authenticated',function_oid,'EXECUTE')
       or has_function_privilege('anon',function_oid,'EXECUTE') then
      raise exception 'Trigger-only guard must not be callable by app roles: %', trigger_name;
    end if;
  end loop;

  if has_function_privilege('anon','public.projects_apply_records_batch(uuid,jsonb)','EXECUTE')
     or not has_function_privilege('authenticated','public.projects_apply_records_batch(uuid,jsonb)','EXECUTE') then
    raise exception 'Atomic Projects batch RPC grants are incorrect';
  end if;

  function_def := pg_get_functiondef('public.projects_apply_records_batch(uuid,jsonb)'::regprocedure);
  if position('discovery' in function_def)=0 then
    raise exception 'Atomic Projects batch RPC does not allow discovery';
  end if;

  function_def := pg_get_functiondef('public.projects_guard_entity_relationships()'::regprocedure);
  if position('Objective.project_ids is deprecated' in function_def)=0 then
    raise exception 'The current OKR v4 Objective/KR relationship contract is not installed';
  end if;
end
$assert$;

select 'Projects forward guard reconciliation schema/ACL smoke passed' as result;
