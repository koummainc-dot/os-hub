import React,{useMemo,useState} from "react";
import {buildHealthTimeline,filterHealthTimeline,HEALTH_TIMELINE_TYPES as TYPES,HEALTH_TIMELINE_PAGES as PAGES} from "./healthTimelineDomain.js";
export default function HealthTimeline({data,canRead,timezone="Africa/Cairo",onOpen}){
 const [type,setType]=useState("all"),[from,setFrom]=useState(""),[to,setTo]=useState(""),[limit,setLimit]=useState(100);
 const events=useMemo(()=>buildHealthTimeline(data,canRead),[data,canRead]);
 const filtered=useMemo(()=>filterHealthTimeline(events,{type,from,to,timezone}),[events,type,from,to,timezone]);
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
