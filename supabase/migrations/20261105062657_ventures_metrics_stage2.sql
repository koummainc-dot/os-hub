-- Ventures OS Phase 2 metrics foundation.
create table if not exists public.ventures_metric_values(
 workspace_id uuid not null, project_id text not null, period_type text not null check(period_type in('D','W','M','Q')),
 period_start date not null, key text not null, class text not null check(class in('ops','fin')),
 value_num numeric, value_text text, value_bool boolean, no_data boolean not null default false,
 source text not null default 'manual' check(source in('manual','paste','csv','import','finance','content','derived')),
 note text, version integer not null default 1, created_by uuid, updated_by uuid, updated_at timestamptz not null default now(),
 primary key(workspace_id,project_id,period_type,period_start,key)
);
create table if not exists public.ventures_sku_period_values(
 workspace_id uuid not null, project_id text not null, sku text not null, period_type text not null check(period_type in('D','W','M','Q')),
 period_start date not null, units numeric, revenue numeric, returns numeric, ad_spend numeric,
 version integer not null default 1, updated_at timestamptz not null default now(),
 primary key(workspace_id,project_id,sku,period_type,period_start)
);
create table if not exists public.ventures_counters(workspace_id uuid primary key,project_seq integer not null default 0);
alter table public.ventures_metric_values enable row level security;
alter table public.ventures_sku_period_values enable row level security;
alter table public.ventures_counters enable row level security;
create policy ventures_metric_values_select on public.ventures_metric_values for select to authenticated using(public.ws_access_level(workspace_id,'ventures','entry') in('view','edit') and(class<>'fin' or public.ws_access_level(workspace_id,'ventures','money') in('view','edit')));
create policy ventures_metric_values_insert on public.ventures_metric_values for insert to authenticated with check(public.ws_access_level(workspace_id,'ventures','entry')='edit' and(class<>'fin' or public.ws_access_level(workspace_id,'ventures','money')='edit'));
create policy ventures_metric_values_update on public.ventures_metric_values for update to authenticated using(public.ws_access_level(workspace_id,'ventures','entry')='edit' and(class<>'fin' or public.ws_access_level(workspace_id,'ventures','money')='edit')) with check(public.ws_access_level(workspace_id,'ventures','entry')='edit' and(class<>'fin' or public.ws_access_level(workspace_id,'ventures','money')='edit'));
create policy ventures_metric_values_delete on public.ventures_metric_values for delete to authenticated using(public.ws_access_level(workspace_id,'ventures','entry')='edit' and(class<>'fin' or public.ws_access_level(workspace_id,'ventures','money')='edit'));
create policy ventures_sku_select on public.ventures_sku_period_values for select to authenticated using(public.ws_access_level(workspace_id,'ventures','entry') in('view','edit'));
create policy ventures_sku_insert on public.ventures_sku_period_values for insert to authenticated with check(public.ws_access_level(workspace_id,'ventures','entry')='edit');
create policy ventures_sku_update on public.ventures_sku_period_values for update to authenticated using(public.ws_access_level(workspace_id,'ventures','entry')='edit') with check(public.ws_access_level(workspace_id,'ventures','entry')='edit');
create policy ventures_sku_delete on public.ventures_sku_period_values for delete to authenticated using(public.ws_access_level(workspace_id,'ventures','entry')='edit');
create policy ventures_counters_select on public.ventures_counters for select to authenticated using(public.ws_access_level(workspace_id,'ventures','edit') in('view','edit'));
create policy ventures_counters_insert on public.ventures_counters for insert to authenticated with check(public.ws_access_level(workspace_id,'ventures','edit')='edit');
create policy ventures_counters_update on public.ventures_counters for update to authenticated using(public.ws_access_level(workspace_id,'ventures','edit')='edit') with check(public.ws_access_level(workspace_id,'ventures','edit')='edit');
create policy ventures_counters_delete on public.ventures_counters for delete to authenticated using(public.ws_access_level(workspace_id,'ventures','edit')='edit');

create or replace function public.ventures_metrics_upsert(p_workspace_id uuid,p_rows jsonb) returns jsonb language plpgsql security invoker set search_path=public as $$
declare r jsonb; existing_version integer; new_version integer; cls text; conflicts jsonb:='[]'::jsonb; written integer:=0;
begin
 if public.ws_access_level(p_workspace_id,'ventures','entry')<>'edit' then raise exception 'VENTURES_ENTRY_FORBIDDEN'; end if;
 if jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows)>500 then raise exception 'VENTURES_METRICS_BATCH_INVALID'; end if;
 for r in select value from jsonb_array_elements(p_rows) loop
  cls:=coalesce(r->>'class','ops');
  if cls='fin' and public.ws_access_level(p_workspace_id,'ventures','money')<>'edit' then raise exception 'VENTURES_FIN_FORBIDDEN'; end if;
  select version into existing_version from public.ventures_metric_values where workspace_id=p_workspace_id and project_id=coalesce(r->>'project_id','') and period_type=coalesce(r->>'period_type','') and period_start=(r->>'period_start')::date and key=coalesce(r->>'key','') for update;
  if existing_version is not null and r ? 'version' and (r->>'version')::integer<>existing_version then
   conflicts:=conflicts||jsonb_build_array(jsonb_build_object('project_id',r->>'project_id','period_type',r->>'period_type','period_start',r->>'period_start','key',r->>'key','server_version',existing_version,'client_version',(r->>'version')::integer)); continue;
  end if;
  new_version:=coalesce(existing_version,0)+1;
  insert into public.ventures_metric_values(workspace_id,project_id,period_type,period_start,key,class,value_num,value_text,value_bool,no_data,source,note,version,created_by,updated_by,updated_at)
  values(p_workspace_id,r->>'project_id',r->>'period_type',(r->>'period_start')::date,r->>'key',cls,nullif(r->>'value_num','')::numeric,r->>'value_text',case when r ? 'value_bool' then (r->>'value_bool')::boolean else null end,coalesce((r->>'no_data')::boolean,false),coalesce(r->>'source','manual'),r->>'note',new_version,(select auth.uid()),(select auth.uid()),now())
  on conflict(workspace_id,project_id,period_type,period_start,key) do update set class=excluded.class,value_num=excluded.value_num,value_text=excluded.value_text,value_bool=excluded.value_bool,no_data=excluded.no_data,source=excluded.source,note=excluded.note,version=excluded.version,updated_by=excluded.updated_by,updated_at=excluded.updated_at;
  written:=written+1;
 end loop;
 return jsonb_build_object('ok',true,'written',written,'conflicts',conflicts);
end $$;
create or replace function public.ventures_metrics_get(p_workspace_id uuid,p_projects text[] default null,p_period_type text default null,p_from date default null,p_to date default null) returns setof public.ventures_metric_values language sql security invoker set search_path=public as $$
 select v.* from public.ventures_metric_values v where v.workspace_id=p_workspace_id and public.ws_access_level(p_workspace_id,'ventures','entry') in('view','edit') and(v.class<>'fin' or public.ws_access_level(p_workspace_id,'ventures','money') in('view','edit')) and(p_projects is null or v.project_id=any(p_projects)) and(p_period_type is null or v.period_type=p_period_type) and(p_from is null or v.period_start>=p_from) and(p_to is null or v.period_start<=p_to) order by v.period_start desc,v.project_id,v.key $$;
create or replace function public.ventures_sku_upsert(p_workspace_id uuid,p_rows jsonb) returns jsonb language plpgsql security invoker set search_path=public as $$
declare r jsonb; existing_version integer; new_version integer; written integer:=0;
begin
 if public.ws_access_level(p_workspace_id,'ventures','entry')<>'edit' then raise exception 'VENTURES_ENTRY_FORBIDDEN'; end if;
 if jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows)>500 then raise exception 'VENTURES_SKU_BATCH_INVALID'; end if;
 for r in select value from jsonb_array_elements(p_rows) loop
  select version into existing_version from public.ventures_sku_period_values where workspace_id=p_workspace_id and project_id=r->>'project_id' and sku=r->>'sku' and period_type=r->>'period_type' and period_start=(r->>'period_start')::date for update;
  if existing_version is not null and r ? 'version' and (r->>'version')::integer<>existing_version then raise exception 'VENTURES_SKU_VERSION_CONFLICT'; end if;
  new_version:=coalesce(existing_version,0)+1;
  insert into public.ventures_sku_period_values(workspace_id,project_id,sku,period_type,period_start,units,revenue,returns,ad_spend,version,updated_at)
  values(p_workspace_id,r->>'project_id',r->>'sku',r->>'period_type',(r->>'period_start')::date,nullif(r->>'units','')::numeric,nullif(r->>'revenue','')::numeric,nullif(r->>'returns','')::numeric,nullif(r->>'ad_spend','')::numeric,new_version,now())
  on conflict(workspace_id,project_id,sku,period_type,period_start) do update set units=excluded.units,revenue=excluded.revenue,returns=excluded.returns,ad_spend=excluded.ad_spend,version=excluded.version,updated_at=excluded.updated_at;
  written:=written+1;
 end loop; return jsonb_build_object('ok',true,'written',written);
end $$;
create or replace function public.ventures_next_code(p_workspace_id uuid) returns text language plpgsql security invoker set search_path=public as $$
declare n integer;
begin
 if public.ws_access_level(p_workspace_id,'ventures','edit')<>'edit' then raise exception 'VENTURES_CODE_FORBIDDEN'; end if;
 insert into public.ventures_counters(workspace_id,project_seq) values(p_workspace_id,1) on conflict(workspace_id) do update set project_seq=public.ventures_counters.project_seq+1 returning project_seq into n;
 return 'PRJ-'||lpad(n::text,3,'0');
end $$;
grant execute on function public.ventures_metrics_upsert(uuid,jsonb) to authenticated;
grant execute on function public.ventures_metrics_get(uuid,text[],text,date,date) to authenticated;
grant execute on function public.ventures_sku_upsert(uuid,jsonb) to authenticated;
grant execute on function public.ventures_next_code(uuid) to authenticated;