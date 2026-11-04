create or replace function public.fin__err(code text, detail text default null) returns void language plpgsql as $$
begin raise exception '%', code using detail = coalesce(detail, ''), errcode = 'P0001'; end $$;
revoke all on function public.fin__err(text, text) from public, anon, authenticated;