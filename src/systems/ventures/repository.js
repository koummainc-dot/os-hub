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

const QUEUE_KEY="ventures.metric.offline.queue.v1";
function readQueue(){try{return JSON.parse(localStorage.getItem(QUEUE_KEY)||"[]");}catch{return []}}
function writeQueue(q){try{localStorage.setItem(QUEUE_KEY,JSON.stringify(q));return true}catch{return false}}
export function venturesMetricQueueStatus(){const q=readQueue();return {count:q.length,available:typeof localStorage!=="undefined"}}
export function enqueueVenturesMetrics(workspaceId,rows){const q=readQueue();q.push({id:(typeof crypto!=="undefined"&&crypto.randomUUID?crypto.randomUUID():String(Date.now())+"-"+Math.random()),workspaceId,rows,createdAt:new Date().toISOString()});writeQueue(q);return {queued:true,count:q.length};}
export async function replayVenturesMetricsQueue(){
  const q=readQueue(),remaining=[],results=[];
  for(const item of q){const r=await saveVenturesMetrics(item.workspaceId,item.rows);results.push(r);if(!r.ok) remaining.push(item);}
  writeQueue(remaining);return {replayed:q.length-remaining.length,remaining:remaining.length,results};
}

let replayPromise=null;
export function installVenturesMetricOfflineReplay({intervalMs=30000}={}){
  if(typeof window==="undefined") return ()=>{};
  const replay=async()=>{
    if(replayPromise) return replayPromise;
    replayPromise=replayVenturesMetricsQueue().catch(error=>({replayed:0,remaining:venturesMetricQueueStatus().count,results:[{ok:false,error}]})).finally(()=>{replayPromise=null;});
    return replayPromise;
  };
  const onOnline=()=>{void replay();};
  window.addEventListener("online",onOnline);
  const timer=window.setInterval(()=>{if(window.navigator?.onLine!==false) void replay();},Math.max(5000,Number(intervalMs)||30000));
  if(window.navigator?.onLine!==false) void replay();
  return ()=>{window.removeEventListener("online",onOnline);window.clearInterval(timer);};
}
