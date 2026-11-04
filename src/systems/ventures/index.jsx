import React,{useEffect,useMemo,useState} from "react";
import {S} from "../../core/ui.jsx";
import {VENTURES_MODULES,VENTURES_PLATFORM} from "./config.js";
import {publishOSEvent} from "../integrationEvents.js";
import {loadVenturesSourceSnapshot,sourceSummary} from "./integrations.js";

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
 phases:[
  {k:"project_id",l:"Project ID",t:"in",required:true},{k:"phase",l:"المرحلة",t:"in",required:true},
  {k:"objective",l:"الهدف",t:"ta"},{k:"status",l:"الحالة",t:"in",p:"Planned / Active / Completed / Blocked"},
  {k:"start_at",l:"البداية",t:"in"},{k:"due_at",l:"الموعد",t:"in"},{k:"owner",l:"المسؤول",t:"in"},
  {k:"project_ref",l:"مرجع Projects",t:"in"},{k:"notes",l:"ملاحظات",t:"ta"}
 ],
 team:[
  {k:"project_id",l:"Project ID",t:"in",required:true},{k:"member_id",l:"معرّف العضو",t:"in",required:true},
  {k:"role",l:"الدور",t:"in",required:true},{k:"responsibility",l:"المسؤولية",t:"ta"},
  {k:"allocation",l:"نسبة التخصيص %",t:"in"},{k:"status",l:"الحالة",t:"in",p:"Active / Paused / Ended"}
 ],
 members:[
  {k:"name",l:"اسم العضو",t:"in",required:true},{k:"email",l:"البريد",t:"in"},{k:"role",l:"الدور",t:"in"},
  {k:"skills",l:"المهارات",t:"ta"},{k:"availability",l:"التوفر",t:"in"},{k:"notes",l:"ملاحظات",t:"ta"}
 ],
 calendar:[
  {k:"project_id",l:"Project ID",t:"in",required:true},{k:"title",l:"العنوان",t:"in",required:true},
  {k:"start_at",l:"البداية",t:"in",required:true},{k:"end_at",l:"النهاية",t:"in"},
  {k:"type",l:"النوع",t:"in",p:"Review / Launch / Content / Campaign / Finance / Meeting"},
  {k:"calendar_ref",l:"مرجع Calendar",t:"in"},{k:"status",l:"الحالة",t:"in",p:"Planned / Done / Cancelled"},
  {k:"notes",l:"ملاحظات",t:"ta"}
 ],
 notes:[
  {k:"title",l:"عنوان الملاحظة",t:"in",required:true},{k:"body",l:"المحتوى",t:"ta",required:true},
  {k:"project_id",l:"Project ID",t:"in"},{k:"knowledge_ref",l:"مرجع Knowledge",t:"in"},
  {k:"tags",l:"الوسوم",t:"in"},{k:"status",l:"الحالة",t:"in",p:"Draft / Active / Archived"}
 ],
 tech:[
  {k:"project_id",l:"Project ID",t:"in",required:true},{k:"technology",l:"التقنية",t:"in",required:true},
  {k:"category",l:"التصنيف",t:"in",p:"Frontend / Backend / CMS / Analytics / SEO / Hosting / Payments / Other"},
  {k:"version",l:"الإصدار",t:"in"},{k:"status",l:"الحالة",t:"in",p:"Active / Planned / Deprecated"},
  {k:"url",l:"الرابط",t:"in"},{k:"notes",l:"ملاحظات",t:"ta"}
 ],
 assets:[
  {k:"project_id",l:"Project ID",t:"in",required:true},{k:"name",l:"اسم الأصل",t:"in",required:true},
  {k:"type",l:"النوع",t:"in",p:"Logo / Image / Copy / Template / Document / Other"},
  {k:"url",l:"الرابط",t:"in"},{k:"storage_ref",l:"مرجع التخزين",t:"in"},{k:"owner",l:"المالك",t:"in"},
  {k:"status",l:"الحالة",t:"in",p:"Draft / Active / Archived"},{k:"notes",l:"ملاحظات",t:"ta"}
 ],
 email:[
  {k:"project_id",l:"Project ID",t:"in",required:true},{k:"name",l:"اسم الأتمتة",t:"in",required:true},
  {k:"trigger",l:"المشغّل",t:"in"},{k:"audience",l:"الجمهور",t:"in"},{k:"sequence",l:"التسلسل",t:"ta"},
  {k:"status",l:"الحالة",t:"in",p:"Draft / Active / Paused"},{k:"content_ref",l:"مرجع ContentOS",t:"in"},
  {k:"notes",l:"ملاحظات",t:"ta"}
 ],
 distribution:[
  {k:"project_id",l:"Project ID",t:"in",required:true},{k:"channel",l:"القناة",t:"in",required:true},
  {k:"asset_ref",l:"مرجع الأصل",t:"in"},{k:"campaign_ref",l:"مرجع الحملة",t:"in"},{k:"audience",l:"الجمهور",t:"in"},
  {k:"status",l:"الحالة",t:"in",p:"Planned / Active / Completed"},{k:"published_at",l:"تاريخ النشر",t:"in"},
  {k:"url",l:"الرابط",t:"in"},{k:"notes",l:"ملاحظات",t:"ta"}
 ],
 health:[
  {k:"project_id",l:"Project ID",t:"in",required:true},{k:"metric",l:"المؤشر",t:"in",required:true},
  {k:"value",l:"القيمة",t:"in",required:true},{k:"unit",l:"الوحدة",t:"in"},{k:"period",l:"الفترة",t:"in"},
  {k:"source_ref",l:"مرجع المصدر",t:"in"},{k:"status",l:"الحالة",t:"in",p:"Healthy / Watch / Critical"},
  {k:"notes",l:"ملاحظات",t:"ta"}
 ],
 kpi:[
  {k:"project_id",l:"Project ID",t:"in",required:true},{k:"name",l:"اسم KPI",t:"in",required:true},
  {k:"target",l:"الهدف",t:"in",required:true},{k:"actual",l:"الفعلي",t:"in"},{k:"unit",l:"الوحدة",t:"in"},
  {k:"period",l:"الفترة",t:"in"},{k:"source_ref",l:"مرجع المصدر",t:"in"},{k:"status",l:"الحالة",t:"in",p:"On Track / At Risk / Off Track"},
  {k:"notes",l:"ملاحظات",t:"ta"}
 ],
 alerts:[
  {k:"project_id",l:"Project ID",t:"in",required:true},{k:"title",l:"عنوان التنبيه",t:"in",required:true},
  {k:"severity",l:"الخطورة",t:"in",p:"Info / Warning / Critical"},{k:"trigger",l:"المحفز",t:"in"},
  {k:"owner",l:"المسؤول",t:"in"},{k:"status",l:"الحالة",t:"in",p:"Open / Snoozed / Resolved"},
  {k:"due_at",l:"الموعد",t:"in"},{k:"notes",l:"ملاحظات",t:"ta"}
 ],
 priority:[
  {k:"project_id",l:"Project ID",t:"in",required:true},{k:"item",l:"العنصر",t:"in",required:true},
  {k:"score",l:"درجة الأولوية",t:"in",required:true},{k:"reason",l:"السبب",t:"ta"},
  {k:"owner",l:"المسؤول",t:"in"},{k:"status",l:"الحالة",t:"in",p:"Now / Next / Later / Blocked"},
  {k:"project_ref",l:"مرجع Projects",t:"in"},{k:"notes",l:"ملاحظات",t:"ta"}
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

const FIELD_ALIAS={content:"content",links:"links",seoAudit:"seoAudit",geo:"geo",ai:"ai",business:"business",competitors:"competitors",experiments:"experiments",products:"products",affiliate:"affiliate",compliance:"checklist",security:"checklist",portfolio:"portfolio"};
const clone=o=>JSON.parse(JSON.stringify(o));
function fieldsFor(id){return FIELDS[id]||COMMON;}
function makeWorkflow(type){const ct=VENTURES_PLATFORM.platform.contentTypes.find(x=>x.id===type)||VENTURES_PLATFORM.platform.contentTypes[0];return {content_type_id:ct.id,content_type_name:ct.name,stages:clone(ct.stages||[]).map(s=>({...s,status:"Todo",completed:false,values:{},taskState:(s.tasks||[]).reduce((a,t)=>(a[t.id]=false,a),{})}))};}
function validate(fields,v){const missing=fields.filter(f=>f.required&&!String(v[f.k]??"").trim()).map(f=>f.l);return missing;}
function useData(api){const [data,setData]=useState({});const [busy,setBusy]=useState(true);useEffect(()=>{let dead=false;(async()=>{try{const r=await api.load();if(!dead)setData(r?.data||{});}catch(e){}finally{if(!dead)setBusy(false);}})();return()=>{dead=true;};},[api]);const save=async next=>{setData(next);return api.save(next)};return{data,busy,save};}
function Card({label,value}){return <div style={{...S.card,padding:14}}><div style={{fontSize:10,color:"#6E7781"}}>{label}</div><div style={{fontSize:22,fontWeight:800,color:"#0F766E"}}>{value}</div></div>}
function Editor({fields,item,onClose,onSave}){const [v,setV]=useState(item||{});const [error,setError]=useState("");const submit=()=>{const m=validate(fields,v);if(m.length){setError("أكمل: "+m.join("، "));return}onSave(v)};return <div style={{position:"fixed",inset:0,zIndex:5000,background:"rgba(0,0,0,.45)",display:"flex",alignItems:"center",justifyContent:"center",padding:18}}><div style={{...S.card,width:"min(900px,100%)",maxHeight:"92vh",overflow:"auto",padding:20}}><h3 style={{marginTop:0}}>إضافة / تعديل</h3>{error&&<div style={{...S.card,padding:10,marginBottom:10,border:"1px solid #f2c"}}>{error}</div>}<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:10}}>{fields.map(f=><label key={f.k} style={{display:"grid",gap:5,fontSize:11,fontWeight:700}}><span>{f.l}{f.required?" *":""}</span>{f.t==="ta"?<textarea style={{...S.input,minHeight:80}} value={v[f.k]??""} placeholder={f.p||""} onChange={e=>setV({...v,[f.k]:e.target.value})}/>:<input style={S.input} value={v[f.k]??""} placeholder={f.p||""} onChange={e=>setV({...v,[f.k]:e.target.value})}/>}</label>)}</div><div style={{display:"flex",gap:8,marginTop:15}}><button style={S.btnA} onClick={submit}>حفظ</button><button style={S.btn} onClick={onClose}>إلغاء</button></div></div></div>}
function ContentModule({data,save,access}){const rows=Array.isArray(data.content)?data.content:[];const [editing,setEditing]=useState(null);const [type,setType]=useState(VENTURES_PLATFORM.platform.contentTypes[0]?.id);const [stage,setStage]=useState(0);const [q,setQ]=useState("");const can=access.level==="edit";const types=VENTURES_PLATFORM.platform.contentTypes;const selectedType=types.find(x=>x.id===type)||types[0];const fields=(selectedType?.stages?.[stage]?.fields||[]);const filtered=rows.filter(r=>JSON.stringify(r).toLowerCase().includes(q.toLowerCase()));const add=()=>setEditing({id:"",content_type_id:type,title:"",workflow:makeWorkflow(type)});const saveItem=async(v)=>{const item={id:v.id||"v_content_"+Date.now(),updated_at:new Date().toISOString(),...v};await save({...data,content:v.id?rows.map(r=>r.id===v.id?item:r):[item,...rows]});setEditing(null)};return <div><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:8,marginBottom:12}}><Card label="أنواع المحتوى" value={types.length}/><Card label="المراحل المعرفة" value={types.reduce((n,t)=>n+t.stages.length,0)}/><Card label="السجلات" value={rows.length}/><Card label="مسارات المتابعة" value={rows.filter(r=>r.workflow?.stages?.some(s=>s.name?.includes("متابعة"))).length}/></div><div style={{...S.card,padding:12,marginBottom:12}}><div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}><select style={S.input} value={type} onChange={e=>{setType(e.target.value);setStage(0)}}>{types.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select><select style={S.input} value={stage} onChange={e=>setStage(Number(e.target.value))}>{selectedType.stages.map((s,i)=><option key={s.id} value={i}>{s.order}. {s.name}</option>)}</select><span style={{fontSize:11,color:"#6E7781"}}>{selectedType.stages[stage]?.deliverable}</span></div><div style={{marginTop:10,fontSize:11,color:"#6E7781"}}>المهام: {(selectedType.stages[stage]?.tasks||[]).length} · الحقول: {fields.length}</div></div><div style={{display:"flex",gap:8,marginBottom:10}}><input style={{...S.input,flex:1}} placeholder="بحث..." value={q} onChange={e=>setQ(e.target.value)}/>{can&&<button style={S.btnA} onClick={add}>＋ إضافة محتوى</button>}</div><div style={{...S.card,overflow:"auto"}}>{filtered.length===0?<div style={{padding:35,textAlign:"center",color:"#94A3B8"}}>لا توجد سجلات.</div>:<table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}><thead><tr><th style={{padding:9,textAlign:"right"}}>العنوان</th><th>النوع</th><th>المرحلة الحالية</th><th>الحالة</th><th>إجراء</th></tr></thead><tbody>{filtered.map(r=>{const wf=r.workflow?.stages||[];const cur=wf.find(s=>!s.completed)||wf[wf.length-1];return <tr key={r.id}><td style={{padding:9,fontWeight:700}}>{r.title||r.name||r.id}</td><td>{r.workflow?.content_type_name||r.content_type_id||"—"}</td><td>{cur?.name||"—"}</td><td>{cur?.status||"Todo"}</td><td>{can&&<button style={S.btn} onClick={()=>setEditing(r)}>تعديل</button>}</td></tr>})}</tbody></table>}</div>{editing&&<Editor fields={[{k:"title",l:"عنوان المحتوى",t:"in",required:true},{k:"project_id",l:"Project ID",t:"in"},...fields]} item={editing} onClose={()=>setEditing(null)} onSave={saveItem}/>}</div>}
function Module({m,data,save,access,workspaceId}){if(m.id==="content")return <ContentModule data={data} save={save} access={access}/>;const [q,setQ]=useState("");const [editing,setEditing]=useState(null);const key=FIELD_ALIAS[m.id]||m.id;const rows=Array.isArray(data[key])?data[key]:[];const fields=fieldsFor(key);const can=access.level==="edit";const active=rows.filter(r=>!r._deleted_at);const filtered=active.filter(r=>JSON.stringify(r).toLowerCase().includes(q.toLowerCase()));const commit=async(v)=>{const missing=validate(fields,v);if(missing.length)return;const normalized={...v};if(m.id==="finance"){if(normalized.type==="Revenue")normalized.expense="";if(normalized.type==="Expense")normalized.revenue="";}if(m.id==="cro"){["affiliate","cta","table","outbound","signup"].forEach(k=>{if(normalized[k]!==""&&normalized[k]!=null)normalized[k]=Math.max(0,Math.min(100,Number(normalized[k])||0));});}const item={id:v.id||"v_"+key+"_"+Date.now(),updated_at:new Date().toISOString(),...v};await save({...data,[key]:v.id?rows.map(r=>r.id===v.id?item:r):[item,...rows]});publishOSEvent({type:`ventures.${m.id}.record.saved`,entityType:m.id,entityId:item.id,payload:{projectId:item.project_id||null,name:item.name||item.title||item.page||null}},workspaceId||"default","ventures");setEditing(null)};const softDelete=async(id)=>{if(!confirm("حذف ناعم؟ يمكنك الاسترجاع لاحقًا."))return;await save({...data,[key]:rows.map(r=>r.id===id?{...r,_deleted_at:new Date().toISOString()}:r)})};const restore=async id=>save({...data,[key]:rows.map(r=>r.id===id?{...r,_deleted_at:null}:r)});return <div><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:8,marginBottom:12}}><Card label="السجلات" value={active.length}/><Card label="الحقول" value={fields.length}/><Card label="المحذوفة مؤقتًا" value={rows.filter(r=>r._deleted_at).length}/></div><div style={{display:"flex",gap:8,marginBottom:10}}><input style={{...S.input,flex:1}} placeholder="بحث في كل الحقول..." value={q} onChange={e=>setQ(e.target.value)}/>{can&&<button style={S.btnA} onClick={()=>setEditing({})}>＋ إضافة</button>}</div><div style={{...S.card,overflow:"auto"}}>{filtered.length===0?<div style={{padding:35,textAlign:"center",color:"#94A3B8"}}>لا توجد سجلات.</div>:<table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}><thead><tr><th style={{padding:8,textAlign:"right"}}>السجل</th>{fields.slice(0,8).map(f=><th key={f.k} style={{padding:8,textAlign:"right"}}>{f.l}</th>)}<th>إجراء</th></tr></thead><tbody>{filtered.map(r=><tr key={r.id}><td style={{padding:8,fontWeight:700}}>{r.name||r.keyword||r.item||r.market||r.query||r.url||r.project_id||r.id}</td>{fields.slice(0,8).map(f=><td key={f.k} style={{padding:8,maxWidth:180}}>{String(r[f.k]??"—").slice(0,80)}</td>)}<td style={{padding:8,whiteSpace:"nowrap"}}>{can&&<><button style={S.btn} onClick={()=>setEditing(r)}>تعديل</button>{" "}<button style={S.btn} onClick={()=>softDelete(r.id)}>حذف</button></>}</td></tr>)}</tbody></table>}</div>{rows.filter(r=>r._deleted_at).length>0&&<div style={{...S.card,padding:10,marginTop:10}}><b>السلة</b>{rows.filter(r=>r._deleted_at).map(r=><div key={r.id} style={{display:"flex",justifyContent:"space-between",padding:"7px 0"}}><span>{r.name||r.keyword||r.id}</span>{can&&<button style={S.btn} onClick={()=>restore(r.id)}>استرجاع</button>}</div>)}</div>}{editing!==null&&<Editor fields={fields} item={editing} onClose={()=>setEditing(null)} onSave={commit}/>}</div>}
function Dashboard({data,setPage,save,access,workspaceId}){const counts=VENTURES_MODULES.map(m=>({m,n:Array.isArray(data[FIELD_ALIAS[m.id]||m.id])?data[FIELD_ALIAS[m.id]||m.id].filter(x=>!x._deleted_at).length:0}));const [preview,setPreview]=useState(null);const [previous,setPrevious]=useState(null);const [sources,setSources]=useState({loading:true,summary:{}});useEffect(()=>{let alive=true;(async()=>{const snapshot=await loadVenturesSourceSnapshot(workspaceId);if(alive)setSources({loading:false,summary:sourceSummary(snapshot)});})();return()=>{alive=false;};},[workspaceId]);const can=access?.level==="edit";const exportData=()=>{const blob=new Blob([JSON.stringify({schema:"ventures-os-v1",exported_at:new Date().toISOString(),data},null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="ventures-os-export.json";a.click();URL.revokeObjectURL(a.href)};const readImport=e=>{const file=e.target.files?.[0];if(!file)return;const fr=new FileReader();fr.onload=()=>{try{const raw=JSON.parse(String(fr.result||""));const incoming=raw?.data&&typeof raw.data==="object"?raw.data:raw;if(!incoming||typeof incoming!=="object"||Array.isArray(incoming))throw new Error("invalid");const counts=Object.entries(incoming).filter(([,v])=>Array.isArray(v)).map(([k,v])=>({k,n:v.length}));setPreview({incoming,counts});}catch(err){alert("ملف الاستيراد غير صالح.")}};fr.readAsText(file);e.target.value=""};const mergeData=(base,incoming)=>{const out={...base};Object.entries(incoming).forEach(([k,v])=>{if(!Array.isArray(v)){out[k]=v;return}const existing=Array.isArray(base[k])?base[k]:[];const byId=new Map(existing.map(x=>[x.id,x]));v.forEach(x=>{const id=x?.id||"import_"+btoa(unescape(encodeURIComponent(JSON.stringify(x)))).slice(0,24);byId.set(id,{...x,id})});out[k]=Array.from(byId.values());});return out};const applyImport=async(mode)=>{if(!preview)return;setPrevious(data);const next=mode==="replace"?preview.incoming:mergeData(data,preview.incoming);await save(next);setPreview(null)};const undo=async()=>{if(!previous)return;const current=data;await save(previous);setPrevious(current)};return <div><div style={{...S.card,padding:20,marginBottom:12}}><div style={{fontSize:11,color:"#0F766E",fontWeight:800}}>VENTURES OS · FLOWSTEP IA</div><h1 style={{margin:"5px 0"}}>محفظة المشاريع التجارية</h1><div style={{fontSize:12,color:"#6E7781"}}>التنقل والهيكل وسير العمل أولًا؛ كل وحدة مرتبطة بمالكها بدل إنشاء مصدر بيانات موازٍ.</div><div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:12}}>{can&&<label style={S.btnA}>استيراد JSON<input type="file" accept=".json,application/json" style={{display:"none"}} onChange={readImport}/></label>}<button style={S.btn} onClick={exportData}>تصدير نسخة</button>{previous&&can&&<button style={S.btn} onClick={undo}>تراجع عن آخر استيراد</button>}</div></div><div style={{...S.card,padding:14,marginBottom:12}}><div style={{fontWeight:800,marginBottom:8}}>مصادر الحقيقة المرتبطة</div><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:8}}><Card label="Projects" value={sources.loading?"…":sources.summary.projects||0}/><Card label="ContentOS" value={sources.loading?"…":sources.summary.content||0}/><Card label="Finance OS" value={sources.loading?"…":sources.summary.finance||0}/><Card label="Knowledge OS" value={sources.loading?"…":sources.summary.knowledge||0}/></div>{sources.summary.errors?.length>0&&<div style={{fontSize:11,color:"#B45309",marginTop:8}}>تعذر قراءة: {sources.summary.errors.join("، ")} — لا يتم إنشاء نسخة محلية بديلة.</div>}</div><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:8}}><Card label="الوحدات" value={VENTURES_MODULES.length}/><Card label="أنواع المحتوى" value={VENTURES_PLATFORM.platform.contentTypes.length}/><Card label="المراحل" value={VENTURES_PLATFORM.platform.contentTypes.reduce((n,x)=>n+x.stages.length,0)}/><Card label="سجلات المحفظة" value={counts.reduce((n,x)=>n+x.n,0)}/></div><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:8,marginTop:12}}>{counts.filter(x=>x.m.id!=="dashboard").map(x=><button key={x.m.id} onClick={()=>setPage(x.m.id)} style={{...S.card,padding:14,textAlign:"right",cursor:"pointer"}}><div style={{fontSize:10,color:"#6E7781"}}>{x.m.group}</div><div style={{fontWeight:800}}>{x.m.label}</div><div style={{fontSize:12,color:"#0F766E",marginTop:5}}>{x.n} سجل</div></button>)}</div>{preview&&<div style={{...S.card,padding:14,marginTop:12,border:"1px solid #0F766E"}}><b>معاينة الاستيراد</b><div style={{fontSize:11,color:"#6E7781",margin:"6px 0"}}>{preview.counts.map(x=>x.k+": "+x.n).join(" · ")||"لا توجد مجموعات سجلات"}</div><div style={{display:"flex",gap:8,flexWrap:"wrap"}}><button style={S.btnA} onClick={()=>applyImport("merge")}>دمج مع الموجود (بدون تكرار IDs)</button><button style={S.btn} onClick={()=>applyImport("replace")}>استبدال البيانات</button><button style={S.btn} onClick={()=>setPreview(null)}>إلغاء</button></div></div>}</div>}
export default function VenturesOS({api,access,page,setPage,ws}){const {data,busy,save}=useData(api);const current=VENTURES_MODULES.find(x=>x.id===page)||VENTURES_MODULES[0];return <div dir="rtl"><div style={{...S.card,padding:8,marginBottom:12,display:"flex",gap:5,overflowX:"auto",flexWrap:"wrap"}}>{VENTURES_MODULES.map(m=><button key={m.id} onClick={()=>setPage(m.id)} style={{...S.btn,background:current.id===m.id?"#0F766E":"#fff",color:current.id===m.id?"#fff":"#57606A"}}>{m.label}</button>)}</div>{busy?<div style={{padding:40,textAlign:"center"}}>جاري التحميل...</div>:current.id==="dashboard"?<Dashboard data={data} setPage={setPage} save={save} access={access} workspaceId={ws?.id}/>:<Module m={current} data={data} save={save} access={access} workspaceId={ws?.id}/>}</div>}
export const demoSeed=()=>({});