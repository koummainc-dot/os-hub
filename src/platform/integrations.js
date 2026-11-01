import { supabase } from "../core/supabase.js";

const emptyState=()=>({schemaVersion:1,notifications:[],calendar:[],groceryHandoffs:[]});
const safeArray=x=>Array.isArray(x)?x:[];
const keyOf=x=>String(x?.sourceKey||"");
const upsert=(rows,item)=>{const key=keyOf(item);if(!key)return rows;const next=rows.filter(x=>keyOf(x)!==key);return [...next,{...item,updatedAt:new Date().toISOString()}];};
const scoped=(items,workspaceId)=>safeArray(items).filter(x=>String(x.workspaceId)===String(workspaceId));
function createMemoryAdapter(store,key){return {async load(){if(!store.current[key])store.current[key]=emptyState();return {data:store.current[key],source:"demo",updatedAt:null,error:null};},async save(data){store.current[key]=data;return {ok:true,conflict:false,updatedAt:null};}};}
async function mutate(adapter,fn){for(let attempt=0;attempt<2;attempt++){const loaded=await adapter.load();if(loaded.error)return {ok:false,reason:"storage-unavailable",error:loaded.error};const state={...emptyState(),...(loaded.data||{})};const next=fn(state);const saved=await adapter.save(next,loaded.updatedAt||undefined);if(saved?.ok)return {ok:true,data:next,updatedAt:saved.updatedAt||null};if(!saved?.conflict)return {ok:false,reason:"storage-write-failed",error:saved?.error||null};}return {ok:false,reason:"concurrent-update-conflict"};}
export function createPlatformIntegrationServices({workspaceId,isDemo=false,demoStore,adapter}={}){
 const ws=String(workspaceId||"");const store=adapter||(isDemo?createMemoryAdapter(demoStore||{current:{}},ws+":platform-integrations"):null);
 const ready=!!ws&&!!store;
 const guarded=async(fn)=>{if(!ready)return {ok:false,reason:"integration-unavailable"};return fn();};
 const validate=(p)=>ready&&p&&String(p.workspaceId)===ws&&p.sourceSystem&&p.sourceKey;
 const notifications={
  async upsert(p){if(!validate(p)||!p.dueAt||!p.title)return {ok:false,reason:"invalid-reference"};return guarded(()=>mutate(store,s=>({...s,notifications:upsert(scoped(s.notifications,ws),{...p,workspaceId:ws,sourceSystem:String(p.sourceSystem),sourceKey:String(p.sourceKey)}) .concat(safeArray(s.notifications).filter(x=>String(x.workspaceId)!==ws))})));},
  async cancel(p){if(!ready||!p?.sourceKey||String(p.workspaceId)!==ws)return {ok:false,reason:"invalid-reference"};return guarded(()=>mutate(store,s=>({...s,notifications:safeArray(s.notifications).filter(x=>!(String(x.workspaceId)===ws&&keyOf(x)===String(p.sourceKey)))})));}
 };
 const calendar={
  async upsert(p){if(!validate(p)||!p.date||!p.sourceRecordId)return {ok:false,reason:"invalid-reference"};return guarded(()=>mutate(store,s=>({...s,calendar:upsert(scoped(s.calendar,ws),{...p,workspaceId:ws,sourceSystem:String(p.sourceSystem),sourceKey:String(p.sourceKey)}).concat(safeArray(s.calendar).filter(x=>String(x.workspaceId)!==ws))})));},
  async remove(p){if(!ready||!p?.sourceKey||String(p.workspaceId)!==ws)return {ok:false,reason:"invalid-reference"};return guarded(()=>mutate(store,s=>({...s,calendar:safeArray(s.calendar).filter(x=>!(String(x.workspaceId)===ws&&keyOf(x)===String(p.sourceKey)))})));}
 };
 const home={
  async upsertGroceryNeeds(p){if(!ready||String(p?.workspaceId)!==ws||p?.sourceSystem!=="nutrition"||!Array.isArray(p.needs)||!p.needs.length)return {ok:false,reason:"invalid-reference"};const sourceRecordIds=[...new Set((p.sourceRecordIds||[]).map(String))];const handoff={workspaceId:ws,sourceSystem:"nutrition",sourceKey:"nutrition:"+ws+":grocery-handoff",sourceRecordIds,needs:p.needs,contractVersion:1,updatedAt:new Date().toISOString(),status:"pending-review"};return guarded(()=>mutate(store,s=>({...s,groceryHandoffs:upsert(scoped(s.groceryHandoffs,ws),handoff).concat(safeArray(s.groceryHandoffs).filter(x=>String(x.workspaceId)!==ws))})));},
 };
 const sports={
  async getNutritionContext(p={}){if(!ready||String(p.workspaceId||ws)!==ws)return {ok:false,reason:"invalid-reference"};try{const {data,error}=await supabase.from("workspace_records").select("collection,id,data,updated_at").eq("workspace_id",ws).eq("system_id","sports").eq("deleted",false).limit(500);if(error)return {ok:false,reason:"sports-context-unavailable",error};const rows=data||[];const sessions=rows.filter(r=>/session|workout|training/i.test(String(r.collection))).map(r=>({id:r.id,...(r.data||{})}));const completed=sessions.filter(r=>["completed","complete","done"].includes(String(r.status||r.state||"").toLowerCase()));const weights=rows.filter(r=>/weight|body|measurement/i.test(String(r.collection))).map(r=>r.data||{});return {ok:true,data:{workspaceId:ws,sourceSystem:"sports",readOnly:true,trainingSessionsLast90Days:sessions.filter(r=>{const t=Date.parse(r.completedAt||r.date||r.updatedAt||"");return Number.isFinite(t)&&t>Date.now()-90*86400000;}).length,completedSessions:completed.length,hasBodyMeasurements:weights.length>0,disclaimer:"سياق تدريبي فقط؛ ليس توصية طبية أو خطة تغذية تلقائية."}};}catch(error){return {ok:false,reason:"sports-context-unavailable",error};}}
 };
 const foodCatalog={
  async lookupBarcode(p){if(!ready||String(p?.workspaceId)!==ws||p?.sourceSystem!=="nutrition"||!/^\d{8}$|^\d{12,14}$/.test(String(p?.barcode||"")))return {ok:false,reason:"invalid-reference"};try{const {data,error}=await supabase.functions.invoke("nutrition-food-lookup",{body:{workspaceId:ws,barcode:String(p.barcode)}});if(error)return {ok:false,reason:"catalog-unavailable",error};if(!data?.ok)return {ok:false,reason:data?.reason||"catalog-unavailable"};return {ok:true,data:{...data.food,source:"USDA FoodData Central",verificationLevel:"unverified",barcode:String(p.barcode)}};}catch(error){return {ok:false,reason:"catalog-unavailable",error};}}
 };
 return {workspaceId:ws,notifications,calendar,home,sports,foodCatalog,status:{available:ready,storage:isDemo?"demo":"workspace-data",foodCatalogRequiresSecret:true}};
}
