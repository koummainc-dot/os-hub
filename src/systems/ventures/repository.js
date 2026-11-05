import { supabase } from "../../core/supabase.js";

function unavailable(reason="supabase-client-unavailable"){return {available:false,reason};}
export async function loadVenturesMetrics(workspaceId,{projects=null,periodType=null,from=null,to=null}={}) {
  if(!workspaceId||!supabase||typeof supabase.rpc!=="function") return unavailable();
  const {data,error}=await supabase.rpc("ventures_metrics_get",{p_workspace_id:workspaceId,p_projects:projects,p_period_type:periodType,p_from:from,p_to:to});
  if(error) return {available:true,ok:false,error};
  return {available:true,ok:true,rows:data||[]};
}
export async function saveVenturesMetrics(workspaceId,rows) {
  if(!workspaceId||!supabase||typeof supabase.rpc!=="function") return unavailable();
  const {data,error}=await supabase.rpc("ventures_metrics_upsert",{p_workspace_id:workspaceId,p_rows:rows});
  if(error) return {available:true,ok:false,error};
  return {available:true,ok:true,...(data||{})};
}
export async function saveVenturesSku(workspaceId,rows) {
  if(!workspaceId||!supabase||typeof supabase.rpc!=="function") return unavailable();
  const {data,error}=await supabase.rpc("ventures_sku_upsert",{p_workspace_id:workspaceId,p_rows:rows});
  if(error) return {available:true,ok:false,error};
  return {available:true,ok:true,...(data||{})};
}
export async function nextVenturesCode(workspaceId) {
  if(!workspaceId||!supabase||typeof supabase.rpc!=="function") return unavailable();
  const {data,error}=await supabase.rpc("ventures_next_code",{p_workspace_id:workspaceId});
  if(error) return {available:true,ok:false,error};
  return {available:true,ok:true,code:data};
}
