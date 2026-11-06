export function normalizeVenturesNumber(value){
  if(value==null) return "";
  let s=String(value).trim().replace(/[٠-٩]/g,d=>String(d.charCodeAt(0)-1632)).replace(/[۰-۹]/g,d=>String(d.charCodeAt(0)-1776));
  s=s.replace(/[٫٬]/g,m=>m==="٫"?".":"").replace(/,/g,"");
  const n=Number(s); return Number.isFinite(n)?n:null;
}
export function parseDelimitedText(text){
  const input=String(text??"").replace(/^\uFEFF/,"").replace(/\r\n?/g,"\n");
  const rows=[]; let row=[], cell="", quoted=false;
  for(let i=0;i<input.length;i++){ const ch=input[i],next=input[i+1];
    if(ch==='"'){ if(quoted&&next==='"'){cell+='"';i++;continue} quoted=!quoted;continue; }
    if(!quoted&&(ch==="\t"||ch===",")){row.push(cell);cell="";continue}
    if(!quoted&&ch==="\n"){row.push(cell);rows.push(row);row=[];cell="";continue}
    cell+=ch;
  }
  if(cell!==""||row.length){row.push(cell);rows.push(row);}
  return rows.filter(r=>r.some(v=>String(v).trim()!==""));
}
export function parseVenturesEntryPaste(text){
  const rows=parseDelimitedText(text); if(!rows.length)return {headers:[],rows:[],errors:["لا توجد بيانات."]};
  const headers=rows[0].map(x=>String(x).trim());
  const required=["project_id","key","value"]; const missing=required.filter(k=>!headers.includes(k));
  if(missing.length)return {headers,rows:[],errors:["الأعمدة المطلوبة: "+missing.join("، ")]};
  const ix=Object.fromEntries(headers.map((h,i)=>[h,i])); const out=[],errors=[];
  rows.slice(1).forEach((r,i)=>{ const project_id=String(r[ix.project_id]??"").trim(),key=String(r[ix.key]??"").trim(),raw=String(r[ix.value]??"").trim();
    if(!project_id||!key){errors.push("الصف "+(i+2)+": project_id/key ناقص.");return}
    const value=normalizeVenturesNumber(raw); if(value===null&&raw!==""){errors.push("الصف "+(i+2)+": قيمة رقمية غير صالحة.");return}
    out.push({project_id,key,value_num:value,no_data:raw===""}); });
  return {headers,rows:out,errors:errors.slice(0,100)};
}

export function parseVenturesProjectBatchCsv(text){
  const rows=parseDelimitedText(text);
  if(!rows.length)return {headers:[],rows:[],errors:["لا توجد بيانات."]};
  const headers=rows[0].map(x=>String(x).trim());
  const required=["unit_code","name","kind","subtype","owner_email","currency","status","link","area_sqm"];
  const missing=required.filter(k=>!headers.includes(k));
  if(missing.length)return {headers,rows:[],errors:["الأعمدة المطلوبة: "+missing.join("، ")]};
  const ix=Object.fromEntries(headers.map((h,i)=>[h,i])),out=[],errors=[];
  rows.slice(1).forEach((r,i)=>{
    const row=Object.fromEntries(headers.map((h,j)=>[h,String(r[j]??"").trim()]));
    if(!row.unit_code||!row.name){errors.push("الصف "+(i+2)+": unit_code/name ناقص.");return;}
    const area=row.area_sqm===""?null:normalizeVenturesNumber(row.area_sqm);
    if(row.area_sqm!==""&&area===null){errors.push("الصف "+(i+2)+": area_sqm غير رقمي.");return;}
    out.push({...row,area_sqm:area});
  });
  if(out.length>27)errors.push("دفعة Masterplan الأساسية حدها 27 مشروعًا؛ راجع الملف.");
  return {headers,rows:out,errors:errors.slice(0,100)};
}

export function parseVenturesEspEmailCsv(text,{mapping={}}={}){
 const rows=parseDelimitedText(text); if(!rows.length)return {headers:[],rows:[],errors:["لا توجد بيانات."]};
 const headers=rows[0].map(x=>String(x).trim()); const ix=Object.fromEntries(headers.map((h,i)=>[h,i]));
 const aliases={campaign_code:["campaign_code","campaign","campaign_id"],project_id:["project_id","project"],sent:["sent","sends"],delivered:["delivered"],opens:["opens","open"],clicks:["clicks","click"],unsubs:["unsubs","unsubscribes","unsubscribe"],bounces_hard:["bounces_hard","hard_bounces","hard_bounce"],bounces_soft:["bounces_soft","soft_bounces","soft_bounce"],spam_complaints:["spam_complaints","spam","complaints"],conversions:["conversions","conversion"],revenue:["revenue","attributed_revenue"],sent_at:["sent_at","date","send_date"]};
 const resolve=k=>mapping[k]||aliases[k].find(h=>ix[h]!=null)||null; const errors=[],out=[];
 rows.slice(1).forEach((r,n)=>{const row={}; for(const k of Object.keys(aliases)){const h=resolve(k); if(h) row[k]=k.endsWith("_at")?String(r[ix[h]]??"").trim():normalizeVenturesNumber(r[ix[h]]??"");} if(!row.campaign_code&& !row.project_id){errors.push("الصف "+(n+2)+": campaign_code أو project_id مطلوب.");return;} if(row.sent==null&&row.delivered==null&&row.opens==null&&row.clicks==null){errors.push("الصف "+(n+2)+": لا توجد مقاييس ESP.");return;} row.import_source="esp_csv"; row.import_row_hash=[row.campaign_code||"",row.project_id||"",row.sent_at||"",row.sent||"",row.delivered||"",row.opens||"",row.clicks||""].join("|"); out.push(row);});
 return {headers,rows:out,errors:errors.slice(0,100),mapping:Object.fromEntries(Object.keys(aliases).map(k=>[k,resolve(k)]))};
}
