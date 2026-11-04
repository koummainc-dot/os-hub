import React,{useEffect,useMemo,useState} from "react";
import {S} from "../../core/ui.jsx";
import {VENTURES_MODULES,VENTURES_PLATFORM} from "./config.js";

const COMMON=[
  {k:"name",l:"الاسم",t:"in",required:true},
  {k:"project_id",l:"المشروع المرتبط",t:"in"},
  {k:"status",l:"الحالة",t:"in",p:"Planned / In Progress / Completed"},
  {k:"priority",l:"الأولوية",t:"in",p:"Low / Medium / High"},
  {k:"notes",l:"ملاحظات",t:"ta"}
];
const FIELDS={
 profiles:[
  {k:"project_id",l:"Project ID",t:"in",required:true},{k:"code",l:"كود المشروع",t:"in"},
  {k:"unit_code",l:"كود الوحدة",t:"in"},{k:"kind",l:"نوع المشروع",t:"in"},
  {k:"subtype",l:"النوع الفرعي",t:"in"},{k:"currency",l:"العملة",t:"in"},
  {k:"area_sqm",l:"المساحة m²",t:"in"},{k:"modules_override",l:"الوحدات المخصصة",t:"ta"},
  {k:"thresholds_override",l:"عتبات مخصصة",t:"ta"},{k:"finance_ref",l:"مرجع Finance",t:"in"},
  {k:"content_account_ids",l:"حسابات Content IDs",t:"ta"},{k:"source",l:"مصدر الاستيراد",t:"ta"}
 ],
 keywords:[
  {k:"keyword",l:"الكلمة المفتاحية",t:"in",required:true},{k:"volume",l:"حجم البحث الشهري",t:"in"},
  {k:"kd",l:"صعوبة KD",t:"in"},{k:"cpc",l:"CPC",t:"in"},{k:"intent",l:"نية البحث",t:"in",p:"Informational / Commercial / Transactional / Navigational"},
  {k:"position",l:"الترتيب الحالي",t:"in"},{k:"target",l:"الترتيب المستهدف",t:"in"},{k:"cluster",l:"المجموعة",t:"in"},
  {k:"serp",l:"ميزات SERP",t:"in"},{k:"opportunity",l:"درجة الفرصة",t:"in"},{k:"cannibal",l:"تصادم داخلي",t:"in",p:"No / Yes"}
 ],
 seoAudit:[
  {k:"item",l:"بند الفحص",t:"in",required:true},{k:"category",l:"التصنيف",t:"in",required:true,p:"Metadata / Content Structure / Images / Schema / Core Web Vitals / Crawling & Indexing / Mobile & UX"},
  {k:"status",l:"الحالة",t:"in",p:"Todo / Done / N/A"},{k:"notes",l:"ملاحظات",t:"ta"}
 ],
 geo:[
  {k:"market",l:"السوق / المدينة",t:"in",required:true},{k:"priority",l:"الأولوية",t:"in"},
  {k:"pageType",l:"نوع الصفحة",t:"in",p:"Main Market / GEO Page / Language Variant"},{k:"url",l:"الرابط",t:"in"},
  {k:"keyword",l:"الكلمة المستهدفة",t:"in"},{k:"competition",l:"المنافسة",t:"in",p:"Low / Medium / High"},
  {k:"status",l:"الحالة",t:"in",p:"Planned / In Progress / Completed"}
 ],
 ai:[
  {k:"query",l:"الاستعلام",t:"in",required:true},{k:"engine",l:"المحرك",t:"in",required:true,p:"Google AI / ChatGPT / Perplexity / Gemini / Claude / Copilot"},
  {k:"result",l:"النتيجة",t:"in",p:"Mentioned / Cited / Recommended / Not Found"},{k:"position",l:"الترتيب",t:"in"},
  {k:"citation",l:"رابط الاقتباس",t:"in"},{k:"competitors",l:"المنافسون",t:"ta"},{k:"checked",l:"آخر فحص",t:"in",p:"YYYY-MM-DD"}
 ],
 links:[
  {k:"url",l:"الرابط",t:"in",required:true},{k:"domain",l:"الدومين",t:"in"},{k:"source_page",l:"صفحة المصدر",t:"in"},
  {k:"target_page",l:"الصفحة المستهدفة",t:"in"},{k:"anchor",l:"Anchor",t:"in"},{k:"type",l:"النوع",t:"in"},
  {k:"status",l:"الحالة",t:"in",p:"Prospect / Contacted / Acquired / Lost"},{k:"authority",l:"Authority",t:"in"},
  {k:"first_seen",l:"أول ظهور",t:"in"},{k:"last_checked",l:"آخر فحص",t:"in"}
 ],
 business:[
  {k:"audience",l:"الجمهور المستهدف",t:"in"},{k:"countries",l:"الدول",t:"in"},{k:"model",l:"نموذج العمل",t:"in",required:true},
  {k:"primary",l:"المصدر الأساسي للدخل",t:"in"},{k:"secondary",l:"المصدر الثانوي للدخل",t:"in"},
  {k:"monthlyRevenue",l:"الإيراد الشهري المستهدف",t:"in"},{k:"annualRevenue",l:"الإيراد السنوي المستهدف",t:"in"},
  {k:"traffic",l:"الزيارات المستهدفة",t:"in"},{k:"conversion",l:"نسبة التحويل %",t:"in"},{k:"epc",l:"EPC المستهدف",t:"in"},
  {k:"aov",l:"متوسط قيمة الطلب/الليد",t:"in"},{k:"breakEven",l:"نقطة التعادل",t:"in"},{k:"budget",l:"الميزانية الشهرية",t:"in"},
  {k:"cac",l:"الحد الأقصى CAC",t:"in"},{k:"exit",l:"استراتيجية الخروج",t:"ta"},{k:"valuation",l:"القيمة التقديرية",t:"in"},{k:"notes",l:"ملاحظات",t:"ta"}
 ],
 competitors:[
  {k:"name",l:"اسم المنافس",t:"in",required:true},{k:"domain",l:"الدومين",t:"in"},{k:"traffic",l:"الزيارات",t:"in"},
  {k:"keywords",l:"الكلمات المفتاحية",t:"in"},{k:"dr",l:"قوة الدومين DR",t:"in"},{k:"pages",l:"عدد الصفحات",t:"in"},
  {k:"revenueModel",l:"نموذج الربح",t:"in"},{k:"strength",l:"نقطة القوة",t:"ta"},{k:"weakness",l:"نقطة الضعف",t:"ta"},
  {k:"contentVelocity",l:"سرعة نشر المحتوى",t:"in"},{k:"keywordGaps",l:"فجوات الكلمات",t:"in"},{k:"contentGaps",l:"فجوات المحتوى",t:"in"},
  {k:"linkGaps",l:"فجوات الباك لينك",t:"in"},{k:"monetizationGaps",l:"فجوات التربيح",t:"in"}
 ],
 experiments:[
  {k:"name",l:"اسم التجربة",t:"in",required:true},{k:"hypothesis",l:"الفرضية",t:"ta"},{k:"variable",l:"المتغيّر",t:"in"},
  {k:"control",l:"Control",t:"ta"},{k:"variant",l:"Variant",t:"ta"},{k:"metric",l:"المقياس الأساسي",t:"in"},
  {k:"status",l:"الحالة",t:"in",p:"Planned / Running / Completed"},{k:"lift",l:"نسبة التحسن %",t:"in"},
  {k:"winner",l:"الفائز",t:"in"},{k:"decision",l:"القرار",t:"ta"},{k:"rollback",l:"خطة التراجع",t:"ta"}
 ],
 products:[
  {k:"name",l:"اسم المنتج",t:"in",required:true},{k:"sku",l:"SKU",t:"in"},{k:"type",l:"النوع",t:"in"},
  {k:"price",l:"السعر",t:"in"},{k:"cost",l:"التكلفة",t:"in"},{k:"margin",l:"الهامش",t:"in"},
  {k:"url",l:"الرابط",t:"in"},{k:"status",l:"الحالة",t:"in"},{k:"notes",l:"ملاحظات",t:"ta"}
 ],
 finance:[
  {k:"type",l:"النوع",t:"in",required:true,p:"Revenue / Expense"},{k:"category",l:"التصنيف",t:"in"},{k:"revenue",l:"الإيراد",t:"in"},{k:"expense",l:"المصروف",t:"in"},{k:"date",l:"التاريخ",t:"in"},{k:"note",l:"ملاحظة",t:"ta"},{k:"currency",l:"العملة",t:"in",p:"USD / EGP"}
 ],
 cro:[
  {k:"page",l:"الصفحة",t:"in",required:true},{k:"zone",l:"المكان",t:"in",p:"Top / Middle / Bottom"},{k:"affiliate",l:"نسبة نقر الأفلييت %",t:"in"},{k:"cta",l:"نسبة نقر CTA %",t:"in"},{k:"table",l:"نسبة نقر الجدول %",t:"in"},{k:"outbound",l:"نسبة النقر الخارجي %",t:"in"},{k:"signup",l:"نسبة التسجيل %",t:"in"},{k:"rps",l:"الربح لكل جلسة",t:"in"}
 ],
 affiliate:[
  {k:"type",l:"النوع",t:"in",required:true,p:"Program / Network"},{k:"name",l:"اسم البرنامج / الشبكة",t:"in",required:true},{k:"category",l:"التصنيف",t:"in"},{k:"network",l:"الشبكة / المنصة",t:"in"},
  {k:"commission",l:"العمولة",t:"in"},{k:"cookie",l:"مدة Cookie",t:"in"},{k:"balance",l:"الرصيد",t:"in"},
  {k:"status",l:"الحالة",t:"in"},{k:"notes",l:"ملاحظات",t:"ta"}
 ],
 checklist:[
  {k:"module",l:"الوحدة",t:"in",required:true,p:"compliance / security"},{k:"item",l:"البند",t:"in",required:true},
  {k:"status",l:"الحالة",t:"in",p:"Todo / Done / N/A"},{k:"notes",l:"ملاحظات",t:"ta"},{k:"converted_to",l:"تحويل إلى خطر/مشكلة",t:"in"}
 ],
 campaigns:[
  {k:"name",l:"اسم الحملة",t:"in",required:true},{k:"channel",l:"القناة",t:"in"},{k:"utm_campaign",l:"UTM Campaign",t:"in"},
  {k:"utm_source",l:"UTM Source",t:"in"},{k:"utm_medium",l:"UTM Medium",t:"in"},{k:"status",l:"الحالة",t:"in"},
  {k:"start_at",l:"البداية",t:"in"},{k:"end_at",l:"النهاية",t:"in"},{k:"notes",l:"ملاحظات",t:"ta"}
 ],
 portfolio:[
  {k:"project_id",l:"Project ID",t:"in",required:true},{k:"decision",l:"القرار",t:"in",p:"Scale / Fix / Pause / Kill"},
  {k:"reason",l:"السبب",t:"ta"},{k:"evidence",l:"الأدلة",t:"ta"},{k:"owner",l:"المسؤول",t:"in"},
  {k:"review_at",l:"موعد المراجعة",t:"in"},{k:"notes",l:"ملاحظات",t:"ta"}
 ]
};

const FIELD_ALIAS={content:"content",links:"links",seoAudit:"seoAudit",geo:"geo",ai:"ai",business:"business",competitors:"competitors",experiments:"experiments",products:"products",affiliate:"affiliate",compliance:"checklist",security:"checklist",portfolio:"portfolio",phases:"profiles"};
const clone=o=>JSON.parse(JSON.stringify(o));
function fieldsFor(id){return FIELDS[id]||COMMON;}
function makeWorkflow(type){const ct=VENTURES_PLATFORM.platform.contentTypes.find(x=>x.id===type)||VENTURES_PLATFORM.platform.contentTypes[0];return {content_type_id:ct.id,content_type_name:ct.name,stages:clone(ct.stages||[]).map(s=>({...s,status:"Todo",completed:false,values:{},taskState:(s.tasks||[]).reduce((a,t)=>(a[t.id]=false,a),{})}))};}
function validate(fields,v){const missing=fields.filter(f=>f.required&&!String(v[f.k]??"").trim()).map(f=>f.l);return missing;}
function useData(api){const [data,setData]=useState({});const [busy,setBusy]=useState(true);useEffect(()=>{let dead=false;(async()=>{try{const r=await api.load();if(!dead)setData(r?.data||{});}catch(e){}finally{if(!dead)setBusy(false);}})();return()=>{dead=true;};},[api]);const save=async next=>{setData(next);return api.save(next)};return{data,busy,save};}
function Card({label,value}){return <div style={{...S.card,padding:14}}><div style={{fontSize:10,color:"#6E7781"}}>{label}</div><div style={{fontSize:22,fontWeight:800,color:"#0F766E"}}>{value}</div></div>}
function Editor({fields,item,onClose,onSave}){const [v,setV]=useState(item||{});const [error,setError]=useState("");const submit=()=>{const m=validate(fields,v);if(m.length){setError("أكمل: "+m.join("، "));return}onSave(v)};return <div style={{position:"fixed",inset:0,zIndex:5000,background:"rgba(0,0,0,.45)",display:"flex",alignItems:"center",justifyContent:"center",padding:18}}><div style={{...S.card,width:"min(900px,100%)",maxHeight:"92vh",overflow:"auto",padding:20}}><h3 style={{marginTop:0}}>إضافة / تعديل</h3>{error&&<div style={{...S.card,padding:10,marginBottom:10,border:"1px solid #f2c"}}>{error}</div>}<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:10}}>{fields.map(f=><label key={f.k} style={{display:"grid",gap:5,fontSize:11,fontWeight:700}}><span>{f.l}{f.required?" *":""}</span>{f.t==="ta"?<textarea style={{...S.input,minHeight:80}} value={v[f.k]??""} placeholder={f.p||""} onChange={e=>setV({...v,[f.k]:e.target.value})}/>:<input style={S.input} value={v[f.k]??""} placeholder={f.p||""} onChange={e=>setV({...v,[f.k]:e.target.value})}/>}</label>)}</div><div style={{display:"flex",gap:8,marginTop:15}}><button style={S.btnA} onClick={submit}>حفظ</button><button style={S.btn} onClick={onClose}>إلغاء</button></div></div></div>}
function ContentModule({data,save,access}){const rows=Array.isArray(data.content)?data.content:[];const [editing,setEditing]=useState(null);const [type,setType]=useState(VENTURES_PLATFORM.platform.contentTypes[0]?.id);const [stage,setStage]=useState(0);const [q,setQ]=useState("");const can=access.level==="edit";const types=VENTURES_PLATFORM.platform.contentTypes;const selectedType=types.find(x=>x.id===type)||types[0];const fields=(selectedType?.stages?.[stage]?.fields||[]);const filtered=rows.filter(r=>JSON.stringify(r).toLowerCase().includes(q.toLowerCase()));const add=()=>setEditing({id:"",content_type_id:type,title:"",workflow:makeWorkflow(type)});const saveItem=async(v)=>{const item={id:v.id||"v_content_"+Date.now(),updated_at:new Date().toISOString(),...v};await save({...data,content:v.id?rows.map(r=>r.id===v.id?item:r):[item,...rows]});setEditing(null)};return <div><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:8,marginBottom:12}}><Card label="أنواع المحتوى" value={types.length}/><Card label="المراحل المعرفة" value={types.reduce((n,t)=>n+t.stages.length,0)}/><Card label="السجلات" value={rows.length}/><Card label="مسارات المتابعة" value={rows.filter(r=>r.workflow?.stages?.some(s=>s.name?.includes("متابعة"))).length}/></div><div style={{...S.card,padding:12,marginBottom:12}}><div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}><select style={S.input} value={type} onChange={e=>{setType(e.target.value);setStage(0)}}>{types.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select><select style={S.input} value={stage} onChange={e=>setStage(Number(e.target.value))}>{selectedType.stages.map((s,i)=><option key={s.id} value={i}>{s.order}. {s.name}</option>)}</select><span style={{fontSize:11,color:"#6E7781"}}>{selectedType.stages[stage]?.deliverable}</span></div><div style={{marginTop:10,fontSize:11,color:"#6E7781"}}>المهام: {(selectedType.stages[stage]?.tasks||[]).length} · الحقول: {fields.length}</div></div><div style={{display:"flex",gap:8,marginBottom:10}}><input style={{...S.input,flex:1}} placeholder="بحث..." value={q} onChange={e=>setQ(e.target.value)}/>{can&&<button style={S.btnA} onClick={add}>＋ إضافة محتوى</button>}</div><div style={{...S.card,overflow:"auto"}}>{filtered.length===0?<div style={{padding:35,textAlign:"center",color:"#94A3B8"}}>لا توجد سجلات.</div>:<table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}><thead><tr><th style={{padding:9,textAlign:"right"}}>العنوان</th><th>النوع</th><th>المرحلة الحالية</th><th>الحالة</th><th>إجراء</th></tr></thead><tbody>{filtered.map(r=>{const wf=r.workflow?.stages||[];const cur=wf.find(s=>!s.completed)||wf[wf.length-1];return <tr key={r.id}><td style={{padding:9,fontWeight:700}}>{r.title||r.name||r.id}</td><td>{r.workflow?.content_type_name||r.content_type_id||"—"}</td><td>{cur?.name||"—"}</td><td>{cur?.status||"Todo"}</td><td>{can&&<button style={S.btn} onClick={()=>setEditing(r)}>تعديل</button>}</td></tr>})}</tbody></table>}</div>{editing&&<Editor fields={[{k:"title",l:"عنوان المحتوى",t:"in",required:true},{k:"project_id",l:"Project ID",t:"in"},...fields]} item={editing} onClose={()=>setEditing(null)} onSave={saveItem}/>}</div>}
function Module({m,data,save,access}){if(m.id==="content")return <ContentModule data={data} save={save} access={access}/>;const [q,setQ]=useState("");const [editing,setEditing]=useState(null);const key=FIELD_ALIAS[m.id]||m.id;const rows=Array.isArray(data[key])?data[key]:[];const fields=fieldsFor(key);const can=access.level==="edit";const active=rows.filter(r=>!r._deleted_at);const filtered=active.filter(r=>JSON.stringify(r).toLowerCase().includes(q.toLowerCase()));const commit=async(v)=>{const missing=validate(fields,v);if(missing.length)return;const item={id:v.id||"v_"+key+"_"+Date.now(),updated_at:new Date().toISOString(),...v};await save({...data,[key]:v.id?rows.map(r=>r.id===v.id?item:r):[item,...rows]});setEditing(null)};const softDelete=async(id)=>{if(!confirm("حذف ناعم؟ يمكنك الاسترجاع لاحقًا."))return;await save({...data,[key]:rows.map(r=>r.id===id?{...r,_deleted_at:new Date().toISOString()}:r)})};const restore=async id=>save({...data,[key]:rows.map(r=>r.id===id?{...r,_deleted_at:null}:r)});return <div><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:8,marginBottom:12}}><Card label="السجلات" value={active.length}/><Card label="الحقول" value={fields.length}/><Card label="المحذوفة مؤقتًا" value={rows.filter(r=>r._deleted_at).length}/></div><div style={{display:"flex",gap:8,marginBottom:10}}><input style={{...S.input,flex:1}} placeholder="بحث في كل الحقول..." value={q} onChange={e=>setQ(e.target.value)}/>{can&&<button style={S.btnA} onClick={()=>setEditing({})}>＋ إضافة</button>}</div><div style={{...S.card,overflow:"auto"}}>{filtered.length===0?<div style={{padding:35,textAlign:"center",color:"#94A3B8"}}>لا توجد سجلات.</div>:<table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}><thead><tr><th style={{padding:8,textAlign:"right"}}>السجل</th>{fields.slice(0,8).map(f=><th key={f.k} style={{padding:8,textAlign:"right"}}>{f.l}</th>)}<th>إجراء</th></tr></thead><tbody>{filtered.map(r=><tr key={r.id}><td style={{padding:8,fontWeight:700}}>{r.name||r.keyword||r.item||r.market||r.query||r.url||r.project_id||r.id}</td>{fields.slice(0,8).map(f=><td key={f.k} style={{padding:8,maxWidth:180}}>{String(r[f.k]??"—").slice(0,80)}</td>)}<td style={{padding:8,whiteSpace:"nowrap"}}>{can&&<><button style={S.btn} onClick={()=>setEditing(r)}>تعديل</button>{" "}<button style={S.btn} onClick={()=>softDelete(r.id)}>حذف</button></>}</td></tr>)}</tbody></table>}</div>{rows.filter(r=>r._deleted_at).length>0&&<div style={{...S.card,padding:10,marginTop:10}}><b>السلة</b>{rows.filter(r=>r._deleted_at).map(r=><div key={r.id} style={{display:"flex",justifyContent:"space-between",padding:"7px 0"}}><span>{r.name||r.keyword||r.id}</span>{can&&<button style={S.btn} onClick={()=>restore(r.id)}>استرجاع</button>}</div>)}</div>}{editing!==null&&<Editor fields={fields} item={editing} onClose={()=>setEditing(null)} onSave={commit}/>}</div>}
function Dashboard({data,setPage}){const counts=VENTURES_MODULES.map(m=>({m,n:Array.isArray(data[FIELD_ALIAS[m.id]||m.id])?data[FIELD_ALIAS[m.id]||m.id].filter(x=>!x._deleted_at).length:0}));return <div><div style={{...S.card,padding:20,marginBottom:12}}><div style={{fontSize:11,color:"#0F766E",fontWeight:800}}>VENTURES OS · FLOWSTEP IA</div><h1 style={{margin:"5px 0"}}>محفظة المشاريع التجارية</h1><div style={{fontSize:12,color:"#6E7781"}}>التنقل والهيكل وسير العمل أولًا؛ كل وحدة مرتبطة بمالكها بدل إنشاء مصدر بيانات موازٍ.</div></div><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:8}}><Card label="الوحدات" value={VENTURES_MODULES.length}/><Card label="أنواع المحتوى" value={VENTURES_PLATFORM.platform.contentTypes.length}/><Card label="المراحل" value={VENTURES_PLATFORM.platform.contentTypes.reduce((n,x)=>n+x.stages.length,0)}/><Card label="سجلات المحفظة" value={counts.reduce((n,x)=>n+x.n,0)}/></div><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:8,marginTop:12}}>{counts.filter(x=>x.m.id!=="dashboard").map(x=><button key={x.m.id} onClick={()=>setPage(x.m.id)} style={{...S.card,padding:14,textAlign:"right",cursor:"pointer"}}><div style={{fontSize:10,color:"#6E7781"}}>{x.m.group}</div><div style={{fontWeight:800}}>{x.m.label}</div><div style={{fontSize:12,color:"#0F766E",marginTop:5}}>{x.n} سجل</div></button>)}</div></div>}
export default function VenturesOS({api,access,page,setPage}){const {data,busy,save}=useData(api);const current=VENTURES_MODULES.find(x=>x.id===page)||VENTURES_MODULES[0];return <div dir="rtl"><div style={{...S.card,padding:8,marginBottom:12,display:"flex",gap:5,overflowX:"auto",flexWrap:"wrap"}}>{VENTURES_MODULES.map(m=><button key={m.id} onClick={()=>setPage(m.id)} style={{...S.btn,background:current.id===m.id?"#0F766E":"#fff",color:current.id===m.id?"#fff":"#57606A"}}>{m.label}</button>)}</div>{busy?<div style={{padding:40,textAlign:"center"}}>جاري التحميل...</div>:current.id==="dashboard"?<Dashboard data={data} setPage={setPage}/>:<Module m={current} data={data} save={save} access={access}/>}</div>}
export const demoSeed=()=>({});