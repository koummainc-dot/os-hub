import React, { useMemo, useState } from "react";

const card={background:"#fff",border:"1px solid #E2E8F0",borderRadius:14,padding:16,marginBottom:14};
const muted={color:"#64748B",fontSize:12};
const field={width:"100%",boxSizing:"border-box",padding:10,border:"1px solid #CBD5E1",borderRadius:9};
const dateOf=(value,timezone)=>{if(!value)return "";const raw=String(value);if(raw.length>=10&&raw[4]==="-"&&raw[7]==="-")return raw.slice(0,10);const parts=new Intl.DateTimeFormat("en-CA",{timeZone:timezone||"Africa/Cairo",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date(value));const p=Object.fromEntries(parts.map(x=>[x.type,x.value]));return p.year+"-"+p.month+"-"+p.day;};
const inRange=(value,from,to,timezone)=>{const d=dateOf(value,timezone);return !d||(d>=from&&d<=to);};
const dateLabel=(value,timezone)=>value?new Intl.DateTimeFormat("ar-EG",{dateStyle:"medium",timeZone:timezone||"Africa/Cairo"}).format(new Date(String(value).length===10?String(value)+"T12:00:00":value)):"غير محدد";
const noteOf=(row)=>row?.notes||row?.instructions||"";
const item=(id,title,meta,row,notes)=>({id,title,meta,row,notes:notes||""});

export default function HealthVisitSummary({
 profile,conditions,allergies,symptomLogs,medications,medicationVersions,sideEffects,
 flareEvents,checkins,factors,factorLogs,canRead
}){
 const today=new Date().toISOString().slice(0,10);
 const initialFrom=new Date(Date.now()-30*86400000).toISOString().slice(0,10);
 const [from,setFrom]=useState(initialFrom),[to,setTo]=useState(today);
 const [visitDate,setVisitDate]=useState(today),[doctor,setDoctor]=useState(""),[facility,setFacility]=useState("");
 const [reason,setReason]=useState(""),[questions,setQuestions]=useState("");
 const [includeNotes,setIncludeNotes]=useState(false),[includeSensitive,setIncludeSensitive]=useState(false);
 const [sections,setSections]=useState({conditions:false,allergies:false,symptoms:false,medications:false,sideEffects:false,flares:false,checkins:false,trackers:false});
 const [selected,setSelected]=useState({});
 const [reviewed,setReviewed]=useState(false);
 const readable={
  conditions:canRead("conditions","read"),symptoms:canRead("symptoms","read"),medications:canRead("medications","read"),
  flares:canRead("flare_events","read"),checkins:canRead("checkins","read"),trackers:canRead("trackers","read"),
  sensitive:canRead("sensitive_trackers","read")
 };
 const groups=useMemo(()=>{
  const medicationItems=medications.map(m=>{
   const v=medicationVersions.filter(x=>x.medication_id===m.id).sort((a,b)=>Number(b.version_no)-Number(a.version_no))[0];
   return item("med:"+m.id,m.name,
    [m.status==="active"?"نشط":m.status==="paused"?"موقوف مؤقتًا":m.status==="stopped"?"متوقف":m.status,
     v?[v.dose_amount,v.dose_unit,v.route,v.frequency].filter(Boolean).join(" · "):"لا توجد نسخة جرعة"].filter(Boolean).join(" — "),m,noteOf(m)||v?.instructions);
  });
  const data={
   conditions:conditions.map(x=>item("condition:"+x.id,x.name,[x.condition_type,x.status==="active"?"نشطة":"منتهية",x.diagnosed_on?"التشخيص: "+dateLabel(x.diagnosed_on,profile.timezone):""].filter(Boolean).join(" · "),x,x.notes)),
   allergies:allergies.map(x=>item("allergy:"+x.id,x.allergen,[x.severity==="severe"?"شديدة":x.severity==="moderate"?"متوسطة":x.severity==="mild"?"خفيفة":"الشدة غير معروفة",x.reaction].filter(Boolean).join(" · "),x,x.notes)),
   symptoms:symptomLogs.filter(x=>inRange(x.recorded_at,from,to,profile.timezone)).map(x=>item("symptom:"+x.id,x.symptom_name_snapshot,"الشدة "+x.severity+"/10 · "+dateLabel(x.recorded_at,profile.timezone)+(x.duration_minutes?" · "+x.duration_minutes+" دقيقة":"")+(x.body_location?" · "+x.body_location:""),x,x.notes)),
   medications:medicationItems,
   sideEffects:sideEffects.filter(x=>inRange(x.occurred_at,from,to,profile.timezone)).map(x=>item("side:"+x.id,x.name,[x.severity,dateLabel(x.occurred_at,profile.timezone),medications.find(m=>m.id===x.medication_id)?.name].filter(Boolean).join(" · "),x,x.notes)),
   flares:flareEvents.filter(x=>inRange(x.started_at,from,to,profile.timezone)).map(x=>item("flare:"+x.id,x.title||"نوبة تهيّج","الشدة "+x.severity+" · "+dateLabel(x.started_at,profile.timezone)+(x.ended_at?" إلى "+dateLabel(x.ended_at,profile.timezone):" · مستمرة"),x,[x.symptoms,x.suspected_triggers,x.relief_actions,x.notes].filter(Boolean).join("\n"))),
   checkins:checkins.filter(x=>inRange(x.entry_date,from,to,profile.timezone)).map(x=>item("checkin:"+x.id,"متابعة "+dateLabel(x.entry_date,profile.timezone),[x.mood_score!=null?"المزاج "+x.mood_score+"/5":"",x.energy_score!=null?"الطاقة "+x.energy_score+"/5":"",x.stress_score!=null?"الضغط "+x.stress_score+"/5":"",x.sleep_hours!=null?"النوم "+x.sleep_hours+" ساعة":"",x.sleep_quality?"جودة النوم "+x.sleep_quality:"",x.digestion_status?"الهضم "+x.digestion_status:""].filter(Boolean).join(" · "),x,x.notes)),
   trackers:factorLogs.filter(x=>inRange(x.recorded_at,from,to)).filter(x=>{const f=factors.find(y=>y.id===x.factor_id);return f&&!f.is_sensitive;}).map(x=>{const f=factors.find(y=>y.id===x.factor_id);return item("factor:"+x.id,f.name,[x.value_numeric??x.value_boolean??x.value_choice??x.value_text,f.unit,dateLabel(x.recorded_at)].filter(v=>v!==null&&v!==undefined&&v!=="").join(" · "),x,x.notes);}),
   sensitive:factorLogs.filter(x=>inRange(x.recorded_at,from,to)).filter(x=>{const f=factors.find(y=>y.id===x.factor_id);return f?.is_sensitive;}).map(x=>{const f=factors.find(y=>y.id===x.factor_id);return item("sensitive:"+x.id,f.name,[x.value_numeric??x.value_boolean??x.value_choice??x.value_text,f.unit,dateLabel(x.recorded_at)].filter(v=>v!==null&&v!==undefined&&v!=="").join(" · "),x,x.notes);})
  };
  return data;
 },[conditions,allergies,symptomLogs,medications,medicationVersions,sideEffects,flareEvents,checkins,factors,factorLogs,from,to]);
 const labels={conditions:"الحالات الطبية",allergies:"الحساسيات",symptoms:"الأعراض خلال الفترة",medications:"الأدوية والعلاجات",sideEffects:"الآثار الجانبية المسجلة",flares:"نوبات التهيّج",checkins:"المتابعة اليومية",trackers:"المتتبّعات العادية"};
 const allowed={conditions:readable.conditions,allergies:readable.conditions,symptoms:readable.symptoms,medications:readable.medications,sideEffects:readable.medications,flares:readable.flares,checkins:readable.checkins,trackers:readable.trackers};
 const selectedItems=Object.entries(sections).flatMap(([key,on])=>{
  if(!on)return [];
  if(key==="trackers")return [...groups.trackers,...(includeSensitive&&readable.sensitive?groups.sensitive:[])].filter(x=>selected[x.id]!==false);
  if(!allowed[key])return [];
  return (groups[key]||[]).filter(x=>selected[x.id]!==false);
 });
 const totalAvailable=Object.entries(sections).reduce((n,[key,on])=>n+(on?(key==="trackers"?groups.trackers.length+(includeSensitive&&readable.sensitive?groups.sensitive.length:0):(groups[key]||[]).length):0),0);
 const setSection=(key,on)=>{setSections(s=>({...s,[key]:on}));setReviewed(false);};
 const setItem=(id,on)=>{setSelected(s=>({...s,[id]:on}));setReviewed(false);};
 const exportReady=!!profile&&from<=to&&visitDate&&selectedItems.length>0;
 const printReport=()=>{if(!exportReady||!reviewed)return;window.print();};
 if(!profile||!canRead("reports","read"))return <section style={card}><h2>ملخص زيارة الطبيب</h2><p>لا تملك صلاحية إعداد ملخص لهذا الملف الصحي.</p></section>;
 return <div dir="rtl" style={{color:"#182230"}}>
  <section style={{...card,background:"#F0F9FF",borderColor:"#BAE6FD"}}>
   <h2 style={{marginTop:0}}>إعداد ملخص زيارة الطبيب</h2>
   <p style={muted}>اختر السجلات التي تريد مشاركتها فقط. لا يتم حفظ هذا الملخص في قاعدة البيانات؛ يُنشأ محليًا للمعاينة والطباعة.</p>
   <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:10}}>
    <label style={muted}>تاريخ الزيارة<input type="date" value={visitDate} onChange={e=>{setVisitDate(e.target.value);setReviewed(false);}} style={field}/></label>
    <label style={muted}>اسم الطبيب / المختص<input value={doctor} maxLength={120} onChange={e=>{setDoctor(e.target.value);setReviewed(false);}} placeholder="اختياري" style={field}/></label>
    <label style={muted}>المنشأة الطبية<input value={facility} maxLength={120} onChange={e=>{setFacility(e.target.value);setReviewed(false);}} placeholder="اختياري" style={field}/></label>
    <label style={muted}>من تاريخ<input type="date" value={from} max={to} onChange={e=>{setFrom(e.target.value);setReviewed(false);}} style={field}/></label>
    <label style={muted}>إلى تاريخ<input type="date" value={to} min={from} max={today} onChange={e=>{setTo(e.target.value);setReviewed(false);}} style={field}/></label>
   </div>
   <label style={{display:"block",marginTop:12,fontSize:13}}>سبب الزيارة / ما أريد مناقشته<textarea value={reason} maxLength={2000} onChange={e=>{setReason(e.target.value);setReviewed(false);}} rows={3} style={{...field,marginTop:5}} placeholder="اكتب وصفك أنت دون طلب تشخيص آلي."/></label>
   <label style={{display:"block",marginTop:12,fontSize:13}}>أسئلة أريد طرحها<textarea value={questions} maxLength={2000} onChange={e=>{setQuestions(e.target.value);setReviewed(false);}} rows={3} style={{...field,marginTop:5}} placeholder="يمكنك كتابة أسئلتك للطبيب."/></label>
  </section>
  <section style={card}>
   <h3 style={{marginTop:0}}>1. اختر أقسام السجل</h3>
   <p style={muted}>لا يُضاف أي قسم تلقائيًا. الأقسام غير المصرح بها لا تظهر في الاختيارات.</p>
   <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(210px,1fr))",gap:8}}>
    {Object.entries(labels).map(([key,label])=>allowed[key]&&<label key={key} style={{display:"flex",gap:9,alignItems:"center",border:"1px solid #E2E8F0",borderRadius:10,padding:10,fontSize:13}}><input type="checkbox" checked={!!sections[key]} onChange={e=>setSection(key,e.target.checked)}/><span>{label} <small style={muted}>({(groups[key]||[]).length})</small></span></label>)}
   </div>
   {sections.trackers&&readable.sensitive&&<label style={{display:"flex",gap:9,alignItems:"center",marginTop:12,fontSize:13}}><input type="checkbox" checked={includeSensitive} onChange={e=>{setIncludeSensitive(e.target.checked);setReviewed(false);}}/> تضمين المتتبّعات الحساسة ({groups.sensitive.length})</label>}
   <label style={{display:"flex",gap:9,alignItems:"center",marginTop:12,fontSize:13,borderTop:"1px solid #E2E8F0",paddingTop:12}}><input type="checkbox" checked={includeNotes} onChange={e=>{setIncludeNotes(e.target.checked);setReviewed(false);}}/> تضمين الملاحظات النصية الحرة من السجلات المختارة (راجعها بعناية قبل المشاركة)</label>
  </section>
  <section style={card}>
   <h3 style={{marginTop:0}}>2. راجع السجلات التي ستُدرج</h3>
   {Object.entries(sections).filter(([,on])=>on).map(([key])=>{
    const rows=key==="trackers"?[...groups.trackers,...(includeSensitive&&readable.sensitive?groups.sensitive:[])]:groups[key]||[];
    return <div key={key} style={{marginBottom:14}}><strong>{key==="trackers"?"المتتبّعات":labels[key]}</strong>{rows.length?<div style={{display:"grid",gap:7,marginTop:7}}>{rows.map(x=><label key={x.id} style={{display:"flex",gap:9,alignItems:"flex-start",border:"1px solid #E2E8F0",borderRadius:9,padding:10,fontSize:12}}><input type="checkbox" checked={selected[x.id]!==false} onChange={e=>setItem(x.id,e.target.checked)}/><span><strong>{x.title}</strong><br/><span style={muted}>{x.meta}</span>{includeNotes&&x.notes&&<div style={{whiteSpace:"pre-wrap",marginTop:5}}>{x.notes}</div>}</span></label>)}</div>:<p style={muted}>لا توجد سجلات ضمن القسم والفترة المحددين.</p>}</div>;
   })}
   <p style={muted}>عدد السجلات المختارة: {selectedItems.length} من {totalAvailable} سجل متاح في الأقسام المحددة.</p>
  </section>
  <section style={{...card,borderColor:"#A7F3D0"}}>
   <h3 style={{marginTop:0}}>3. معاينة التقرير قبل التصدير</h3>
   <article id="health-visit-print" style={{border:"1px solid #CBD5E1",borderRadius:10,padding:16,background:"#fff"}}>
    <h2 style={{marginTop:0}}>ملخص صحي لزيارة طبية</h2>
    <p>الملف: <strong>{profile.display_name}</strong> · تاريخ الزيارة: <strong>{dateLabel(visitDate,profile.timezone)}</strong></p>
    {(doctor||facility)&&<p>{doctor&&"الطبيب: "+doctor}{doctor&&facility?" · ":""}{facility&&"المنشأة: "+facility}</p>}
    <p>الفترة المغطاة: {dateLabel(from,profile.timezone)} — {dateLabel(to,profile.timezone)}</p>
    {reason&&<><h3>سبب الزيارة</h3><p style={{whiteSpace:"pre-wrap"}}>{reason}</p></>}
    {questions&&<><h3>أسئلة للطبيب</h3><p style={{whiteSpace:"pre-wrap"}}>{questions}</p></>}
    {selectedItems.length?<><h3>السجلات المختارة ({selectedItems.length})</h3>{selectedItems.map(x=><div key={x.id} style={{borderBottom:"1px solid #E2E8F0",padding:"8px 0",breakInside:"avoid"}}><strong>{x.title}</strong><div style={{fontSize:12,color:"#475569",marginTop:3}}>{x.meta}</div>{includeNotes&&x.notes&&<p style={{fontSize:12,whiteSpace:"pre-wrap"}}>{x.notes}</p>}</div>)}</>:<p>لم يتم اختيار سجلات بعد.</p>}
    <p style={{fontSize:11,color:"#64748B",marginTop:16}}>هذا ملخص للسجلات التي اختارها المستخدم، وليس تقريرًا تشخيصيًا أو توصية علاجية. تسجيل أثر جانبي لا يثبت أن الدواء سببه. يُرجى التحقق من دقة المعلومات مع مقدم الرعاية.</p>
   </article>
   <label style={{display:"flex",gap:9,alignItems:"center",marginTop:14,fontSize:13,fontWeight:700}}><input type="checkbox" checked={reviewed} onChange={e=>setReviewed(e.target.checked)}/> راجعت المعاينة وأؤكد أنني اخترت المعلومات المناسبة للمشاركة.</label>
   <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:12}}><button type="button" disabled={!exportReady||!reviewed} onClick={printReport} style={{border:0,borderRadius:9,padding:"11px 15px",background:exportReady&&reviewed?"#0284C7":"#94A3B8",color:"#fff",fontWeight:800,cursor:exportReady&&reviewed?"pointer":"not-allowed"}}>طباعة / حفظ PDF بعد المراجعة</button><button type="button" onClick={()=>{setSelected({});setSections({conditions:false,allergies:false,symptoms:false,medications:false,sideEffects:false,flares:false,checkins:false,trackers:false});setIncludeNotes(false);setIncludeSensitive(false);setReviewed(false);}} style={{border:"1px solid #CBD5E1",borderRadius:9,padding:"10px 13px",background:"#fff"}}>مسح الاختيارات</button></div>
  </section>
  <style>{'@media print{body{background:#fff!important}body *{visibility:hidden!important}#health-visit-print,#health-visit-print *{visibility:visible!important}#health-visit-print{position:absolute;inset:0;width:100%;border:0!important;padding:0!important} }'}</style>
 </div>;
}
