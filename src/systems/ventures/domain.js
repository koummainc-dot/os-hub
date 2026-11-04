import {VENTURES_MODULES,VENTURES_PLATFORM} from "./config.js";
export function summarizeVentures(data={}){
 const records=Object.values(data).flatMap(v=>Array.isArray(v)?v.filter(x=>!x._deleted_at):[]);
 const types=VENTURES_PLATFORM.platform.contentTypes||[];
 return {records:records.length,modules:VENTURES_MODULES.length,contentTypes:types.length,workflowStages:types.reduce((n,x)=>n+(x.stages||[]).length,0),contentRecords:Array.isArray(data.content)?data.content.filter(x=>!x._deleted_at).length:0};
}
export function validateVenturesRecord(fields,value){return (fields||[]).filter(f=>f.required&&!String(value&&value[f.k]||"").trim()).map(f=>f.k);}
export function getContentWorkflow(typeId){const type=(VENTURES_PLATFORM.platform.contentTypes||[]).find(x=>x.id===typeId);return type?(type.stages||[]):[];}
