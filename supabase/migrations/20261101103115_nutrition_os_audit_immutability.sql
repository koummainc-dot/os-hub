begin;
drop policy if exists nutrition_ws_insert on public.nutrition_log_entry_history;
drop policy if exists nutrition_ws_update on public.nutrition_log_entry_history;
drop policy if exists nutrition_ws_delete on public.nutrition_log_entry_history;
revoke insert, update, delete, truncate, references, trigger on public.nutrition_log_entry_history from authenticated, anon;
grant select on public.nutrition_log_entry_history to authenticated;
commit;