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