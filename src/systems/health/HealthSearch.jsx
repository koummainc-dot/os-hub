import React,{useMemo,useState} from "react";
export function normalizeHealthSearch(value){
 return String(value??"").normalize("NFKC").toLocaleLowerCase("ar")
 .replace(/[\u064B-\u065F\u0670\u0640]/g,"").replace(/[أإآٱ]/g,"ا")
 .replace(/ى/g,"ي").replace(/ة/g,"ه")
 .replace(/[٠-٩]/g,d=>String(d.charCodeAt(0)-0x0660))
 .replace(/[۰-۹]/g,d=>String(d.charCodeAt(0)-0x06F0))
 .replace(/[\s\u200e\u200f]+/g," ").trim();
}
const LABELS={condition:"حالة طبية",allergy:"حساسية",symptom:"عرض",medication:"دواء",dose:"جرعة / خطة علاج",medication_event:"حدث دوائي",side_effect:"أثر جانبي",flare:"نوبة تهيّج",measurement:"قياس",checkin:"متابعة يومية",factor:"عامل / متتبّع",factor_log:"قراءة متتبّع",document:"وثيقة طبية"};
const PAGES={condition:"conditions",allergy:"conditions",symptom:"symptoms",medication:"medications",dose:"medications",medication_event:"medications",side_effect:"medications",flare:"flare_events",measurement:"measurements",checkin:"checkins",factor:"factors",factor_log:"factors",document:"documents"};
const dateOf=r=>r?.recorded_at||r?.started_at||r?.occurred_at||r?.effective_from||r?.document_date||r?.entry_date||r?.diagnosed_on||r?.first_observed_on||r?.start_date||r?.created_at||null;
const txt=(...v)=>v.filter(x=>x!==null&&x!==undefined&&x!=="").map(x=>typeof x==="object"?"":String(x)).join(" ");
function collect(d,canRead){
 const out=[],add=(scope,type,list,make)=>{if(!canRead(scope,"read"))return;(list||[]).forEach(raw=>{const x=make(raw);if(x.title)out.push({...x,type,scope,id:raw.id,date:dateOf(raw),raw});});};
 add("conditions","condition",d.conditions,r=>({title:r.name,search:txt(r.name,r.condition_type,r.status,r.diagnosed_by,r.notes),summary:txt(r.condition_type,r.status),source:"الحالات الطبية"}));
 add("conditions","allergy",d.allergies,r=>({title:r.allergen,search:txt(r.allergen,r.reaction,r.severity,r.status,r.notes),summary:txt(r.reaction,r.severity,r.status),source:"الحساسيات"}));
 add("symptoms","symptom",d.symptomLogs,r=>({title:r.symptom_name_snapshot||"عرض مسجل",search:txt(r.symptom_name_snapshot,r.severity,r.body_location,r.body_region_code,r.notes,r.source),summary:txt(r.severity!=null?"الشدة "+r.severity+"/10":"",r.body_location,r.body_region_code),source:r.source||"سجل الأعراض",region:r.body_region_code}));
 add("symptoms","symptom",d.symptomDefinitions,r=>({title:r.name,search:txt(r.name,r.category),summary:r.category,source:"تعريف الأعراض"}));
 add("medications","medication",d.medications,r=>({title:r.name,search:txt(r.name,r.brand,r.medication_type,r.status,r.instructions,r.prescribed_by),summary:txt(r.brand,r.status,r.medication_type),source:"الأدوية"}));
 add("medications","dose",d.medicationVersions,r=>({title:"جرعة دوائية",search:txt(r.dose_amount,r.dose_unit,r.route,r.frequency,r.instructions),summary:txt(r.dose_amount,r.dose_unit,r.route,r.frequency),source:"نسخ الجرعات"}));
 add("medications","medication_event",d.medicationEvents,r=>({title:r.medication_name_snapshot||"حدث دوائي",search:txt(r.medication_name_snapshot,r.event_status,r.dose_amount,r.dose_unit,r.notes),summary:txt(r.event_status,r.dose_amount,r.dose_unit),source:"سجل تناول الدواء"}));
 add("medications","side_effect",d.sideEffects,r=>({title:r.name,search:txt(r.name,r.severity,r.notes),summary:r.severity?"الشدة: "+r.severity:"أثر مسجل",source:"الآثار الجانبية"}));
 add("flare_events","flare",d.flareEvents,r=>({title:r.title||"نوبة تهيّج",search:txt(r.title,r.status,r.severity,r.symptoms,r.suspected_triggers,r.relief_actions,r.notes),summary:txt(r.status,r.severity),source:"نوبات التهيّج"}));
 add("measurements","measurement",d.measurements,r=>({title:({weight:"الوزن",height:"الطول",blood_pressure:"ضغط الدم",heart_rate:"النبض",temperature:"الحرارة",spo2:"الأكسجين",respiratory_rate:"معدل التنفس",waist:"محيط الخصر",body_fat:"نسبة الدهون"})[r.measurement_type]||r.measurement_type,search:txt(r.measurement_type,r.value_primary,r.value_secondary,r.unit,r.source,r.context,r.notes),summary:txt(r.value_primary,r.value_secondary,r.unit),source:r.source||r.context||"قياس يدوي"}));
 add("checkins","checkin",d.dailyCheckins,r=>({title:"متابعة يومية",search:txt(r.mood_score,r.energy_score,r.stress_score,r.sleep_hours,r.sleep_quality,r.digestion_status,r.digestion_severity,r.notes),summary:txt("مزاج "+r.mood_score,"طاقة "+r.energy_score,"نوم "+r.sleep_hours+" ساعة"),source:"المتابعة اليومية"}));
 add("trackers","factor",(d.factors||[]).filter(x=>!x.is_sensitive),r=>({title:r.name,search:txt(r.name,r.category,r.value_type,r.unit),summary:txt(r.category,r.value_type,r.unit),source:"العوامل والمتتبّعات"}));
 add("sensitive_trackers","factor",(d.factors||[]).filter(x=>x.is_sensitive),r=>({title:r.name,search:txt(r.name,r.category,r.value_type,r.unit),summary:txt(r.category,r.value_type,r.unit),source:"متتبّع حساس"}));
 const fm=new Map((d.factors||[]).map(x=>[x.id,x]));
 for(const [scope,sensitive] of [["trackers",false],["sensitive_trackers",true]])add(scope,"factor_log",(d.factorLogs||[]).filter(x=>!!fm.get(x.factor_id)?.is_sensitive===sensitive),r=>{const f=fm.get(r.factor_id);return{title:f?.name||"قراءة متتبّع",search:txt(f?.name,r.value_numeric,r.value_boolean,r.value_text,r.value_choice,r.notes),summary:txt(r.value_numeric,r.value_boolean,r.value_text,r.value_choice,f?.unit),source:sensitive?"قراءة متتبّع حساس":"قراءة متتبّع"};});
 add("documents","document",d.documents,r=>({title:r.display_name||r.original_filename,search:txt(r.display_name,r.original_filename,r.document_type,r.document_date,r.notes),summary:txt(r.document_type,r.mime_type),source:"بيانات الوثيقة فقط"}));
 return out;
}
export default function HealthSearch({data,canRead,onOpen}){
 const [q,setQ]=useState(""),[type,setType]=useState("all"),[from,setFrom]=useState(""),[to,setTo]=useState(""),[source,setSource]=useState("all"),[region,setRegion]=useState("all"),[limit,setLimit]=useState(100);
 const rows=useMemo(()=>collect(data,canRead),[data,canRead]),sources=useMemo(()=>[...new Set(rows.map(x=>x.source))].sort(),[rows]);
 const results=useMemo(()=>{const needle=normalizeHealthSearch(q);return rows.filter(r=>{if(type!=="all"&&r.type!==type)return false;if(source!=="all"&&r.source!==source)return false;if(region!=="all"&&r.region!==region)return false;const day=r.date?String(r.date).slice(0,10):"";if(from&&(!day||day<from))return false;if(to&&(!day||day>to))return false;return !needle||normalizeHealthSearch(txt(r.title,r.search,r.summary,r.source)).includes(needle);}).sort((a,b)=>new Date(b.date||0)-new Date(a.date||0));},[rows,q,type,from,to,source,region]);
 const field={width:"100%",boxSizing:"border-box",padding:"10px 12px",border:"1px solid #CBD5E1",borderRadius:9,fontSize:14},label={display:"block",fontSize:12,fontWeight:700,color:"#475569",marginBottom:5};
 return <section style={{display:"grid",gap:14}}>
 <div style={{background:"#fff",border:"1px solid #E2E8F0",borderRadius:14,padding:16}}>
 <h2 style={{margin:"0 0 6px",fontSize:18}}>البحث الصحي الموحّد</h2><p style={{margin:"0 0 14px",fontSize:12,color:"#64748B",lineHeight:1.8}}>يبحث في السجلات الصحية المصرح لك بقراءتها فقط. لا يبحث داخل محتوى ملفات PDF أو الصور، ولا يضمّن سجل الدورة الاختياري.</p>
 <label style={label}>ابحث في سجلاتك الصحية</label><input type="search" value={q} onChange={e=>setQ(e.target.value)} placeholder="مثال: صداع، حساسية، دواء، ضغط الدم…" style={field}/>
 <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(145px,1fr))",gap:10,marginTop:12}}>
 <label><span style={label}>نوع السجل</span><select value={type} onChange={e=>setType(e.target.value)} style={field}><option value="all">كل الأنواع</option>{Object.entries(LABELS).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
 <label><span style={label}>المصدر</span><select value={source} onChange={e=>setSource(e.target.value)} style={field}><option value="all">كل المصادر</option>{sources.map(s=><option key={s} value={s}>{s}</option>)}</select></label>
 <label><span style={label}>من تاريخ</span><input type="date" value={from} onChange={e=>setFrom(e.target.value)} style={field}/></label><label><span style={label}>إلى تاريخ</span><input type="date" value={to} onChange={e=>setTo(e.target.value)} style={field}/></label>
 <label><span style={label}>المنطقة التشريحية</span><select value={region} onChange={e=>setRegion(e.target.value)} style={field}><option value="all">كل المناطق</option>{[...new Set(rows.map(r=>r.region).filter(Boolean))].sort().map(x=><option key={x} value={x}>{x}</option>)}</select></label></div></div>
 <div style={{display:"flex",justifyContent:"space-between",gap:8,flexWrap:"wrap",fontSize:13,color:"#475569"}}><strong>{results.length} نتيجة</strong><span>عرض {Math.min(results.length,limit)} · الأحدث أولًا</span></div>
 {!results.length?<div style={{padding:28,textAlign:"center",border:"1px dashed #CBD5E1",borderRadius:12,color:"#64748B"}}>لا توجد نتائج مطابقة. جرّب كلمة أخرى أو أزل بعض الفلاتر.</div>:<div style={{display:"grid",gap:8}}>{results.slice(0,limit).map(r=><button key={r.type+":"+r.id} onClick={()=>onOpen(PAGES[r.type],r)} style={{textAlign:"right",background:"#fff",border:"1px solid #E2E8F0",borderRadius:12,padding:13,cursor:"pointer",color:"#182230"}}><div style={{display:"flex",justifyContent:"space-between",gap:10,flexWrap:"wrap"}}><strong>{r.title}</strong><span style={{fontSize:11,color:"#0369A1",background:"#E0F2FE",borderRadius:20,padding:"3px 8px"}}>{LABELS[r.type]}</span></div>{r.summary&&<div style={{fontSize:12,color:"#475569",marginTop:6}}>{r.summary}</div>}<div style={{fontSize:11,color:"#64748B",marginTop:7}}>{r.date?new Intl.DateTimeFormat("ar-EG",{dateStyle:"medium"}).format(new Date(r.date)):"دون تاريخ"} · {r.source} · فتح السجل الأصلي</div></button>)}</div>}
 {results.length>limit&&<button onClick={()=>setLimit(n=>n+100)} style={{padding:10,border:"1px solid #CBD5E1",borderRadius:9,background:"#fff",cursor:"pointer"}}>تحميل 100 نتيجة إضافية</button>}</section>;
}
