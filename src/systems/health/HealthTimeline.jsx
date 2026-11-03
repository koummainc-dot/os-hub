import React,{useMemo,useState} from "react";
const TYPES={condition:"حالة طبية",allergy:"حساسية",symptom:"عرض",medication:"بدء علاج",dose:"تغيير جرعة",medication_event:"حدث دوائي",side_effect:"أثر جانبي",flare:"نوبة تهيّج",measurement:"قياس حيوي",checkin:"متابعة يومية",document:"وثيقة طبية"};
const PAGES={condition:"conditions",allergy:"conditions",symptom:"symptoms",medication:"medications",dose:"medications",medication_event:"medications",side_effect:"medications",flare:"flare_events",measurement:"measurements",checkin:"checkins",document:"documents"};
const add=(out,scope,type,items,map)=>{if(!Array.isArray(items))return;for(const row of items){const x=map(row);if(x?.date&&Number.isFinite(new Date(x.date).getTime()))out.push({...x,id:row.id,type,scope,raw:row});}};
const text=(...v)=>v.filter(x=>x!==null&&x!==undefined&&x!=="").map(x=>typeof x==="object"?"":String(x)).join(" · ");
function collect(data,canRead){
 const out=[];
 add(out,"conditions","condition",data.conditions,r=>({date:r.diagnosed_on||r.created_at,title:r.name,summary:text(r.condition_type,r.status),source:"الحالات الطبية"}));
 add(out,"conditions","allergy",data.allergies,r=>({date:r.first_observed_on||r.created_at,title:r.allergen,summary:text(r.reaction,r.severity,r.status),source:"الحساسيات"}));
 add(out,"symptoms","symptom",data.symptomLogs,r=>({date:r.recorded_at,title:r.symptom_name_snapshot||"عرض مسجل",summary:text(r.severity!=null?"الشدة "+r.severity+"/10":null,r.body_location,r.body_region_code,r.duration_minutes? r.duration_minutes+" دقيقة":null),source:r.source||"سجل الأعراض"}));
 add(out,"medications","medication",data.medications,r=>({date:r.start_date||r.created_at,title:r.name,summary:text(r.brand,r.medication_type,r.status),source:"بدء العلاج"}));
 add(out,"medications","dose",data.medicationVersions,r=>({date:r.effective_from||r.created_at,title:"تحديث جرعة دوائية",summary:text(r.dose_amount,r.dose_unit,r.route,r.frequency),source:"نسخة الجرعة"}));
 add(out,"medications","medication_event",data.medicationEvents,r=>({date:r.occurred_at||r.scheduled_for||r.created_at,title:r.medication_name_snapshot||"حدث دوائي",summary:text(r.event_status,r.dose_amount,r.dose_unit),source:"سجل تناول الدواء"}));
 add(out,"medications","side_effect",data.sideEffects,r=>({date:r.occurred_at||r.created_at,title:r.name,summary:text(r.severity?"الشدة "+r.severity:null),source:"الآثار الجانبية"}));
 add(out,"flare_events","flare",data.flareEvents,r=>({date:r.started_at||r.created_at,title:r.title||"نوبة تهيّج",summary:text(r.status,r.severity!=null?"الشدة "+r.severity:null,r.ended_at?"انتهت":"مستمرة / غير محدد"),source:"نوبات التهيّج"}));
 add(out,"measurements","measurement",data.measurements,r=>({date:r.recorded_at,title:({weight:"الوزن",height:"الطول",blood_pressure:"ضغط الدم",heart_rate:"النبض",body_temperature:"درجة الحرارة",oxygen_saturation:"تشبع الأكسجين",respiratory_rate:"معدل التنفس",waist_circumference:"محيط الخصر",body_fat_percentage:"نسبة الدهون"})[r.measurement_type]||r.measurement_type,summary:text(r.value_primary,r.value_secondary,r.unit),source:r.source||"قياس يدوي"}));
 add(out,"checkins","checkin",data.dailyCheckins,r=>({date:r.recorded_at||r.entry_date,title:"متابعة يومية",summary:text(r.mood_score!=null?"المزاج "+r.mood_score+"/5":null,r.energy_score!=null?"الطاقة "+r.energy_score+"/5":null,r.stress_score!=null?"الضغط "+r.stress_score+"/5":null,r.sleep_hours!=null?"النوم "+r.sleep_hours+" ساعة":null),source:"المتابعة اليومية"}));
 add(out,"documents","document",data.documents,r=>({date:r.document_date||r.created_at,title:r.display_name||r.original_filename,summary:text(r.document_type,r.mime_type),source:"بيانات الوثيقة"}));
 return out.filter(x=>canRead(x.scope,"read")).sort((a,b)=>new Date(b.date)-new Date(a.date));
}
export default function HealthTimeline({data,canRead,timezone="Africa/Cairo",onOpen}){
 const [type,setType]=useState("all"),[from,setFrom]=useState(""),[to,setTo]=useState(""),[limit,setLimit]=useState(100);
 const events=useMemo(()=>collect(data,canRead),[data,canRead]);
 const filtered=useMemo(()=>events.filter(e=>{if(type!=="all"&&e.type!==type)return false;const day=new Intl.DateTimeFormat("en-CA",{timeZone:timezone,year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(e.date));return (!from||day>=from)&&(!to||day<=to);}),[events,type,from,to,timezone]);
 const dateLabel=value=>{try{return new Intl.DateTimeFormat("ar-EG",{timeZone:timezone,dateStyle:"full",timeStyle:"short"}).format(new Date(value));}catch{return new Date(value).toLocaleString("ar-EG");}};
 return <section dir="rtl" style={{display:"grid",gap:14}}>
 <div style={{background:"#fff",border:"1px solid #E2E8F0",borderRadius:14,padding:16}}>
 <h2 style={{margin:"0 0 6px",fontSize:19}}>الخط الزمني الصحي</h2><p style={{margin:"0 0 14px",fontSize:12,color:"#64748B",lineHeight:1.8}}>عرض موحّد للأحداث من سجلاتها الأصلية، حسب صلاحيات الملف الصحي والمنطقة الزمنية المحددة. لا ينشئ هذا العرض سجلًا جديدًا ولا يستنتج علاقة سببية بين الأحداث.</p>
 <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:10}}>
 <label style={{fontSize:12,fontWeight:700,color:"#475569"}}>نوع الحدث<select value={type} onChange={e=>setType(e.target.value)} style={field}>{/* options */}<option value="all">كل الأحداث المصرح بها</option>{Object.entries(TYPES).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
 <label style={{fontSize:12,fontWeight:700,color:"#475569"}}>من تاريخ<input type="date" value={from} onChange={e=>setFrom(e.target.value)} style={field}/></label>
 <label style={{fontSize:12,fontWeight:700,color:"#475569"}}>إلى تاريخ<input type="date" value={to} onChange={e=>setTo(e.target.value)} style={field}/></label>
 </div></div>
 <div style={{fontSize:13,color:"#475569"}}><strong>{filtered.length} حدث</strong> · الأحدث أولًا · {timezone}</div>
 {!filtered.length?<div style={{padding:28,textAlign:"center",border:"1px dashed #CBD5E1",borderRadius:12,color:"#64748B"}}>لا توجد أحداث في الفترة المحددة أو لا توجد سجلات متاحة ضمن صلاحياتك.</div>:
 <div style={{display:"grid",gap:0}}>{filtered.slice(0,limit).map((e,i)=><div key={e.type+":"+e.id} style={{display:"grid",gridTemplateColumns:"18px minmax(0,1fr)",gap:10}}>
 <div style={{display:"flex",flexDirection:"column",alignItems:"center"}}><span style={{width:10,height:10,borderRadius:10,background:"#0284C7",marginTop:17}}/>{i<Math.min(filtered.length,limit)-1&&<span style={{width:2,flex:1,minHeight:55,background:"#CBD5E1"}}/>}</div>
 <button onClick={()=>onOpen(PAGES[e.type])} style={{textAlign:"right",background:"#fff",border:"1px solid #E2E8F0",borderRadius:12,padding:13,marginBottom:9,cursor:"pointer",color:"#182230"}}>
 <div style={{display:"flex",justifyContent:"space-between",gap:10,flexWrap:"wrap"}}><strong>{e.title}</strong><span style={{fontSize:11,color:"#0369A1",background:"#E0F2FE",borderRadius:20,padding:"3px 8px"}}>{TYPES[e.type]}</span></div>
 {e.summary&&<div style={{fontSize:12,color:"#475569",marginTop:6}}>{e.summary}</div>}
 <div style={{fontSize:11,color:"#64748B",marginTop:7}}>{dateLabel(e.date)} · {e.source} · فتح القسم الأصلي</div>
 </button></div>)}</div>}
 {filtered.length>limit&&<button onClick={()=>setLimit(n=>n+100)} style={{padding:10,border:"1px solid #CBD5E1",borderRadius:9,background:"#fff",cursor:"pointer"}}>تحميل 100 حدث إضافي</button>}
 </section>;
}
const field={width:"100%",boxSizing:"border-box",display:"block",marginTop:5,padding:"10px 12px",border:"1px solid #CBD5E1",borderRadius:9,fontSize:14};
