-- Finance OS Phase 17: durable net-worth history snapshots.
CREATE TABLE IF NOT EXISTS public.finance_net_worth_snapshots (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE RESTRICT,
 snapshot_at timestamptz NOT NULL DEFAULT now(), period_type text NOT NULL CHECK(period_type IN ('Daily','Weekly','Monthly','Manual')),
 period_key text NOT NULL, base_currency text NOT NULL CHECK(base_currency ~ '^[A-Z]{3}$'), liquid_cash_base numeric(24,2),
 accounts_assets_base numeric(24,2) NOT NULL DEFAULT 0, accounts_liabilities_base numeric(24,2) NOT NULL DEFAULT 0,
 assets_base numeric(24,2) NOT NULL DEFAULT 0, receivables_base numeric(24,2) NOT NULL DEFAULT 0, payables_base numeric(24,2) NOT NULL DEFAULT 0,
 total_assets_base numeric(24,2) NOT NULL DEFAULT 0, total_liabilities_base numeric(24,2) NOT NULL DEFAULT 0,
 value_base numeric(24,2) NOT NULL, rates_used jsonb NOT NULL DEFAULT '[]'::jsonb, is_estimated boolean NOT NULL DEFAULT false,
 is_legacy_manual boolean NOT NULL DEFAULT false, created_by uuid, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(workspace_id,period_type,period_key)
);
CREATE TABLE IF NOT EXISTS public.finance_net_worth_snapshot_items (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE RESTRICT,
 snapshot_id uuid NOT NULL REFERENCES public.finance_net_worth_snapshots(id) ON DELETE RESTRICT,
 item_type text NOT NULL CHECK(item_type IN ('Account','Asset','Debt')), item_id uuid, name_at_time text NOT NULL,
 native_value numeric(24,2), currency text CHECK(currency IS NULL OR currency ~ '^[A-Z]{3}$'), rate_used numeric(24,10),
 value_base numeric(24,2), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS finance_net_worth_snapshots_history_idx ON public.finance_net_worth_snapshots(workspace_id,snapshot_at DESC);
CREATE INDEX IF NOT EXISTS finance_net_worth_snapshot_items_idx ON public.finance_net_worth_snapshot_items(workspace_id,snapshot_id);
ALTER TABLE public.finance_net_worth_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_net_worth_snapshot_items ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.finance_net_worth_snapshots,public.finance_net_worth_snapshot_items FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.fin_net_worth_snapshots_get(p_ws uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $function$
DECLARE result jsonb;
BEGIN
 PERFORM public.fin__need(p_ws,'networth','view');
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'snapshot_at',snapshot_at,'period_type',period_type,'period_key',period_key,
  'base_currency',base_currency,'liquid_cash_base',liquid_cash_base::text,'accounts_assets_base',accounts_assets_base::text,
  'accounts_liabilities_base',accounts_liabilities_base::text,'assets_base',assets_base::text,'receivables_base',receivables_base::text,
  'payables_base',payables_base::text,'total_assets_base',total_assets_base::text,'total_liabilities_base',total_liabilities_base::text,
  'value_base',value_base::text,'is_estimated',is_estimated,'is_legacy_manual',is_legacy_manual,'rates_used',rates_used)
  ORDER BY snapshot_at DESC),'[]'::jsonb) INTO result
 FROM (SELECT * FROM public.finance_net_worth_snapshots WHERE workspace_id=p_ws ORDER BY snapshot_at DESC LIMIT 100) s;
 RETURN result;
END
$function$;

CREATE OR REPLACE FUNCTION public.fin_net_worth_snapshot_create(p jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $function$
DECLARE
 ws uuid:=(p->>'workspace_id')::uuid; pt text:=coalesce(nullif(p->>'period_type',''),'Manual');
 st public.finance_settings; d date; k text; nw jsonb; comps jsonb; sid uuid; inserted_id uuid;
 account_assets numeric:=0; account_liabilities numeric:=0; asset_total numeric:=0; receivable_total numeric:=0; payable_total numeric:=0;
 total_assets numeric:=0; total_liabilities numeric:=0;
BEGIN
 PERFORM public.fin__need(ws,'networth','edit');
 IF pt NOT IN ('Daily','Weekly','Monthly','Manual') THEN PERFORM public.fin__err('VALIDATION_FAILED','invalid snapshot period'); END IF;
 st:=public.fin__settings(ws); d:=coalesce(nullif(p->>'as_of','')::date,(now() AT TIME ZONE st.timezone)::date);
 nw:=public.fin_net_worth(ws,d); comps:=coalesce(nw->'components','[]'::jsonb);
 IF pt='Daily' THEN k:=to_char(d,'YYYY-MM-DD'); ELSIF pt='Weekly' THEN k:=to_char(d,'IYYY-"W"IW');
 ELSIF pt='Monthly' THEN k:=to_char(d,'YYYY-MM'); ELSE k:=to_char(clock_timestamp(),'YYYY-MM-DD"T"HH24:MI:SS.US'); END IF;
 SELECT coalesce(sum((x->>'base_value')::numeric) FILTER(WHERE x->>'kind'='account' AND nullif(x->>'base_value','')::numeric>0),0),
  coalesce(abs(sum((x->>'base_value')::numeric) FILTER(WHERE x->>'kind'='account' AND nullif(x->>'base_value','')::numeric<0)),0),
  coalesce(sum((x->>'base_value')::numeric) FILTER(WHERE x->>'kind'='asset'),0),
  coalesce(sum((x->>'base_value')::numeric) FILTER(WHERE x->>'kind'='receivable'),0),
  coalesce(abs(sum((x->>'base_value')::numeric) FILTER(WHERE x->>'kind'='payable')),0)
 INTO account_assets,account_liabilities,asset_total,receivable_total,payable_total
 FROM jsonb_array_elements(comps) x WHERE nullif(x->>'base_value','') IS NOT NULL;
 total_assets:=account_assets+asset_total+receivable_total; total_liabilities:=account_liabilities+payable_total;
 INSERT INTO public.finance_net_worth_snapshots(workspace_id,period_type,period_key,base_currency,accounts_assets_base,accounts_liabilities_base,
  assets_base,receivables_base,payables_base,total_assets_base,total_liabilities_base,value_base,rates_used,is_estimated,created_by)
 VALUES(ws,pt,k,coalesce(nw->>'base_currency',st.base_currency),account_assets,account_liabilities,asset_total,receivable_total,payable_total,
  total_assets,total_liabilities,coalesce((nw->>'net_worth')::numeric,total_assets-total_liabilities),
  coalesce((SELECT jsonb_agg(jsonb_build_object('name',x->>'name','kind',x->>'kind','currency',x->>'currency','rate',x->>'rate','value_base',x->>'base_value')) FROM jsonb_array_elements(comps) x),'[]'::jsonb),
  NOT coalesce((nw->>'complete')::boolean,false),auth.uid())
 ON CONFLICT(workspace_id,period_type,period_key) DO NOTHING RETURNING id INTO inserted_id;
 IF inserted_id IS NULL THEN
  SELECT id INTO sid FROM public.finance_net_worth_snapshots WHERE workspace_id=ws AND period_type=pt AND period_key=k;
  RETURN jsonb_build_object('created',false,'duplicate',true,'snapshot_id',sid,'period_type',pt,'period_key',k);
 END IF;
 sid:=inserted_id;
 INSERT INTO public.finance_net_worth_snapshot_items(workspace_id,snapshot_id,item_type,item_id,name_at_time,native_value,currency,rate_used,value_base)
 SELECT ws,sid,CASE WHEN x->>'kind'='account' THEN 'Account' WHEN x->>'kind'='asset' THEN 'Asset' ELSE 'Debt' END,
  nullif(x->>'item_id','')::uuid,coalesce(x->>'name','عنصر مالي'),nullif(x->>'amount','')::numeric,
  nullif(x->>'currency',''),nullif(x->>'rate','')::numeric,nullif(x->>'base_value','')::numeric FROM jsonb_array_elements(comps) x;
 PERFORM public.fin__audit(ws,auth.uid(),'net_worth_snapshot',sid::text,'create',null,null,
  jsonb_build_object('period_type',pt,'period_key',k,'value_base',nw->>'net_worth','is_estimated',NOT coalesce((nw->>'complete')::boolean,false)));
 RETURN jsonb_build_object('created',true,'duplicate',false,'snapshot_id',sid,'period_type',pt,'period_key',k,'value_base',nw->>'net_worth');
END
$function$;

REVOKE ALL ON FUNCTION public.fin_net_worth_snapshots_get(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fin_net_worth_snapshots_get(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.fin_net_worth_snapshot_create(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fin_net_worth_snapshot_create(jsonb) TO authenticated;
