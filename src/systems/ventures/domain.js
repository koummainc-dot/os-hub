import {VENTURES_MODULES,VENTURES_PLATFORM} from "./config.js";
export function summarizeVentures(data={}){
 const records=Object.values(data).flatMap(v=>Array.isArray(v)?v.filter(x=>!x._deleted_at):[]);
 const types=VENTURES_PLATFORM.platform.contentTypes||[];
 const moduleCounts={}; VENTURES_MODULES.forEach(m=>{const key=m.id==="compliance"||m.id==="security"?"checklist":m.id; moduleCounts[m.id]=Array.isArray(data[key])?data[key].filter(x=>!x._deleted_at).length:0;});
 return {records:records.length,modules:VENTURES_MODULES.length,contentTypes:types.length,workflowStages:types.reduce((n,x)=>n+(x.stages||[]).length,0),contentRecords:Array.isArray(data.content)?data.content.filter(x=>!x._deleted_at).length:0,moduleCounts};
}
export function validateVenturesRecord(fields,value){return (fields||[]).filter(f=>f.required&&!String(value&&value[f.k]||"").trim()).map(f=>f.k);}
export function getContentWorkflow(typeId){const type=(VENTURES_PLATFORM.platform.contentTypes||[]).find(x=>x.id===typeId);return type?(type.stages||[]):[];}


export function validateVenturesImport(incoming={}) {
  const errors=[];
  if(!incoming || typeof incoming!=="object" || Array.isArray(incoming)) return ["البيانات المستوردة يجب أن تكون كائنًا."];
  const allowed=VENTURES_MODULES.map(m=>m.id).filter(id=>id!=="dashboard");
  for(const [key,value] of Object.entries(incoming)){
    if(key==="__ventures_imports" || key==="schema" || key==="exported_at") continue;
    if(!Array.isArray(value)){ errors.push(`المجموعة ${key} يجب أن تكون قائمة.`); continue; }
    if(!allowed.includes(key) && key!=="checklist" && key!=="content") errors.push(`مجموعة غير معروفة: ${key}`);
    value.forEach((row,index)=>{
      if(!row || typeof row!=="object" || Array.isArray(row)) errors.push(`${key}[${index}] سجل غير صالح.`);
      else if(row.id!=null && typeof row.id!=="string") errors.push(`${key}[${index}] المعرّف يجب أن يكون نصًا.`);
    });
  }
  return errors.slice(0,100);
}

export function mergeVenturesData(base={},incoming={}) {
  const out={...base};
  const importedIds=[];
  Object.entries(incoming).forEach(([k,v])=>{
    if(k==="schema"||k==="exported_at"||k==="__ventures_imports") return;
    if(!Array.isArray(v)){out[k]=v;return;}
    const existing=Array.isArray(base[k])?base[k]:[];
    const byId=new Map(existing.map(x=>[String(x?.id||""),x]));
    v.forEach((x,index)=>{
      const id=String(x?.id||`import_${k}_${index}_${JSON.stringify(x).length}`);
      byId.set(id,{...x,id});
      importedIds.push(id);
    });
    out[k]=Array.from(byId.values());
  });
  return {data:out,importedIds};
}

export async function buildVenturesImportFingerprint(incoming={}) {
  const canonical=JSON.stringify(Object.keys(incoming).sort().reduce((o,k)=>{
    const v=incoming[k];
    o[k]=Array.isArray(v)?v.map(x=>x&&typeof x==="object"?Object.keys(x).sort().reduce((a,key)=>(a[key]=x[key],a),{}):x):v;
    return o;
  },{}));
  if(typeof crypto!=="undefined"&&crypto.subtle){
    const bytes=new TextEncoder().encode(canonical);
    const digest=await crypto.subtle.digest("SHA-256",bytes);
    return Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,"0")).join("");
  }
  return `fallback-${canonical.length}-${btoa(unescape(encodeURIComponent(canonical))).slice(0,32)}`;
}
