begin;

-- RLS policies evaluate this predicate as the authenticated caller.
-- The helper exposes only a boolean manager check, no membership payload.
grant execute on function public.core_saved_views_can_manage(uuid,uuid,text) to authenticated;

commit;
