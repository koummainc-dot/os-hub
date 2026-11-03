import React, { useMemo, useState } from "react";

const card={background:"#fff",border:"1px solid #E2E8F0",borderRadius:14,padding:16,marginBottom:14};
const muted={color:"#64748B",fontSize:12};
const fmt=(v)=>new Intl.DateTimeFormat("ar-EG",{dateStyle:"medium"}).format(new Date(v));
const csvCell=(v)=>'"'+String(v??"").replace(/"/g,'""')+'"';
function downloadCsv(rows, filename){
  const csv="\\uFEFF"+rows.map(row=>row.map(csvCell).join(",")).join("\\r\\n");
  const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));
  const a=document.createElement("a");a.href=url;a.download=filename;a.click();URL.revokeObjectURL(url);
}
function Trend({title,unit,rows,period}){
  const points=rows.filter(r=>Number.isFinite(Number(r.value))&&r.value!==null&&r.value!=="")
    .filter(r=>new Date(r.date).getTime()>=Date.now()-period*86400000).sort((a,b)=>new Date(a.date)-new Date(b.date));
  const values=points.map(p=>Number(p.value)),min=Math.min(...values),max=Math.max(...values),range=max-min||1;
  const coords=values.map((v,i)=>[18+i*(264/Math.max(1,values.length-1)),92-((v-min)/range)*72]);
  const path=coords.map(([x,y],i)=>(i?"L":"M")+x+" "+y).join(" ");
  return <article style={{border:"1px solid #E2E8F0",borderRadius:12,padding:12,minWidth:0}}>
    <strong>{title}</strong><div style={muted}>{period} يومًا · الوحدة: {unit||"بدون وحدة"} · المصدر: Health OS · {points.length} نقطة</div>
    {points.length>=2?<svg viewBox="0 0 300 112" role="img" aria-label={"اتجاه "+title} style={{width:"100%",height:130,marginTop:8}}><line x1="18" y1="92" x2="282" y2="92" stroke="#CBD5E1"/><path d={path} fill="none" stroke="#0284C7" strokeWidth="2.5"/>{coords.map(([x,y],i)=><circle key={i} cx={x} cy={y} r="3.5" fill="#0284C7"/>)}</svg>:<p style={muted}>تحتاج إلى نقطتين على الأقل لعرض الاتجاه. المتاح: {points.length}.</p>}
    {points.length>0&&<div style={muted}>الأحدث: {values.at(-1)} {unit||""} · المتوسط: {(values.reduce((a,b)=>a+b,0)/values.length).toFixed(2)} {unit||""}</div>}
  </article>;
}
export default function HealthAnalytics({profile,checkins,factors,factorLogs,canRead}){
 const [period,setPeriod]=useState(90);
 const visibleLogs=useMemo(()=>factorLogs.filter(log=>factors.some(f=>f.id===log.factor_id&&f.status==="active"&&(!f.is_sensitive||canRead("sensitive_trackers","read")))),[factorLogs,factors,canRead]);
 const cutoff=Date.now()-period*86400000;
 const recentCheckins=checkins.filter(r=>new Date(r.entry_date+"T23:59:59").getTime()>=cutoff);
 const numericFactors=factors.filter(f=>f.status==="active"&&(f.value_type==="scale"||f.value_type==="number")&&(!f.is_sensitive||canRead("sensitive_trackers","read")));
 const chartRows=numericFactors.map(f=>({factor:f,rows:visibleLogs.filter(l=>l.factor_id===f.id).map(l=>({date:l.recorded_at,value:l.value_numeric}))}));
 const summary=[
  ["المتابعات اليومية",recentCheckins.length],
  ["قراءات المتتبّعات",visibleLogs.filter(l=>new Date(l.recorded_at).getTime()>=cutoff).length],
  ["الأعراض المسجلة",0],
  ["نوبات التهيّج",0]
 ];
 const reportRows=[
  ["نوع السجل","التاريخ","المؤشر","القيمة","الوحدة","المصدر"],
  ...recentCheckins.flatMap(r=>[["متابعة يومية",r.entry_date,"المزاج",r.mood_score,"1–5","Health OS"],["متابعة يومية",r.entry_date,"الطاقة",r.energy_score,"1–5","Health OS"],["متابعة يومية",r.entry_date,"الضغط",r.stress_score,"1–5","Health OS"],["متابعة يومية",r.entry_date,"ساعات النوم",r.sleep_hours,"ساعة","Health OS"]].filter(x=>x[3]!==null&&x[3]!==undefined&&x[3]!=="")),
  ...visibleLogs.filter(l=>new Date(l.recorded_at).getTime()>=cutoff).map(l=>{const f=factors.find(x=>x.id===l.factor_id);return ["متتبّع",l.recorded_at,f?.name||"متتبّع",l.value_numeric??l.value_boolean??l.value_choice??l.value_text,f?.unit||"", "Health OS"];})
 ];
 if(!profile||!canRead("reports","read"))return <section style={card}><h2>التقارير الصحية</h2><p>لا تملك صلاحية قراءة التقارير لهذا الملف الصحي.</p></section>;
 return <div dir="rtl">
  <section style={{...card,background:"linear-gradient(130deg,#fff,#F0F9FF)"}}>
   <h2 style={{marginTop:0}}>التحليلات والتقارير الصحية</h2><p style={muted}>ملف: {profile.display_name} · تقارير وصفية من السجلات التي يملكها Health OS فقط.</p>
   <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
    <label style={muted}>الفترة <select value={period} onChange={e=>setPeriod(Number(e.target.value))} style={{marginInlineStart:8,padding:8,border:"1px solid #CBD5E1",borderRadius:8}}><option value="30">آخر 30 يومًا</option><option value="90">آخر 90 يومًا</option><option value="365">آخر 12 شهرًا</option></select></label>
    <button type="button" onClick={()=>downloadCsv(reportRows,"health-report-"+new Date().toISOString().slice(0,10)+".csv")} style={{padding:"10px 13px",border:0,borderRadius:9,background:"#0284C7",color:"#fff",fontWeight:700}}>تصدير CSV</button>
    <button type="button" onClick={()=>window.print()} style={{padding:"10px 13px",border:"1px solid #CBD5E1",borderRadius:9,background:"#fff",fontWeight:700}}>طباعة / حفظ PDF</button>
   </div>
  </section>
  <section style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10,marginBottom:14}}>
   {summary.map(([label,value])=><div key={label} style={card}><div style={muted}>{label}</div><strong style={{fontSize:25}}>{value}</strong></div>)}
  </section>
  <section style={card}><h3 style={{marginTop:0}}>اتجاهات المتتبّعات الرقمية</h3><p style={muted}>كل رسم يوضح الفترة والوحدة والمصدر وعدد النقاط. لا تُستنتج علاقة سببية أو توصية علاجية.</p>
   {chartRows.length?<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:10}}>{chartRows.map(({factor,rows})=><Trend key={factor.id} title={factor.name} unit={factor.unit} rows={rows} period={period}/>)}</div>:<p style={muted}>لا توجد متتبّعات رقمية نشطة متاحة في هذا الملف.</p>}
  </section>
  <section style={card}><h3 style={{marginTop:0}}>ملخص المتابعة اليومية</h3>{recentCheckins.length?<div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}><thead><tr>{["التاريخ","المزاج","الطاقة","الضغط","النوم (ساعات)","جودة النوم"].map(x=><th key={x} style={{textAlign:"right",padding:8,borderBottom:"1px solid #E2E8F0"}}>{x}</th>)}</tr></thead><tbody>{[...recentCheckins].sort((a,b)=>b.entry_date.localeCompare(a.entry_date)).map(r=><tr key={r.id}>{[r.entry_date,r.mood_score??"—",r.energy_score??"—",r.stress_score??"—",r.sleep_hours??"—",r.sleep_quality??"—"].map((x,i)=><td key={i} style={{padding:8,borderBottom:"1px solid #F1F5F9"}}>{x}</td>)}</tr>)}</tbody></table></div>:<p style={muted}>لا توجد متابعة يومية في الفترة المحددة.</p>}</section>
  <section style={{...card,background:"#FFFBEB",borderColor:"#FDE68A"}}><strong>ملاحظات وحدود التقرير</strong><ul style={{fontSize:12,lineHeight:2,marginBottom:0}}><li>هذه إحصاءات وصفية للسجلات المتاحة وليست تشخيصًا أو تقييمًا طبيًا.</li><li>لا يتم استيراد أو نسخ الوجبات أو الماء أو التمارين من Nutrition OS أو Sports OS.</li><li>تُخفى المتتبّعات الحساسة ما لم يسمح نطاق التفويض بذلك؛ وتظل حماية RLS هي المرجع النهائي.</li><li>تصدير CSV يحتوي على القيم والتواريخ والمؤشرات فقط، ولا يضم الملاحظات الحرة أو بيانات الدورة.</li><li>يمكن استخدام طباعة المتصفح ثم اختيار “حفظ كـ PDF” لإخراج ملخص قابل للطباعة.</li></ul></section>
  <style>{'@media print{button,select{display:none!important}body{background:#fff!important}section{break-inside:avoid;box-shadow:none!important} }'}</style>
 </div>;
}
