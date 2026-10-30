-- Defer bidirectional task/issue validation until the end of the transaction.
-- A repair-task write creates the task and updates the issue atomically; immediate
-- row triggers would incorrectly reject the first row before the other link exists.
drop trigger if exists projects_guard_task_issue_references_trg on public.workspace_records;

create constraint trigger projects_guard_task_issue_references_trg
after insert or update of data on public.workspace_records
deferrable initially deferred
for each row execute function public.projects_guard_task_issue_references();
