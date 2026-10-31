import React,{useEffect,useMemo,useState} from "react";

const KEY_PREFIX="learning-os-timer:";
const formatTime=ms=>{const total=Math.max(0,Math.floor(ms/1000)),h=Math.floor(total/3600),m=Math.floor(total%3600/60),s=total%60;return [h,m,s].map(x=>String(x).padStart(2,"0")).join(":");};

export default function LearningTimer({storageKey="default",lessons=[],canEdit=true,onFinish}) {
 const key=KEY_PREFIX+storageKey;
 const [timer,setTimer]=useState(()=>{try{return JSON.parse(localStorage.getItem(key)||"null")||{status:"idle",lessonId:"",elapsedMs:0,startedAt:null};}catch{return {status:"idle",lessonId:"",elapsedMs:0,startedAt:null};}});
 const [now,setNow]=useState(Date.now()),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
 useEffect(()=>{try{localStorage.setItem(key,JSON.stringify(timer));}catch{}},[key,timer]);
 useEffect(()=>{if(timer.status!=="running")return;const id=window.setInterval(()=>setNow(Date.now()),1000);return()=>window.clearInterval(id);},[timer.status]);
 const elapsed=timer.elapsedMs+(timer.status==="running"&&timer.startedAt?Math.max(0,now-timer.startedAt):0);
 const available=useMemo(()=>lessons.filter(x=>x.status!=="Archived"&&x.status!=="Skipped"),[lessons]);
 const start=()=>{if(!canEdit||!timer.lessonId)return;setMessage("");setTimer(t=>({...t,status:"running",startedAt:Date.now()}));};
 const pause=()=>setTimer(t=>({...t,status:"paused",elapsedMs:t.elapsedMs+Math.max(0,Date.now()-(t.startedAt||Date.now())),startedAt:null}));
 const reset=()=>{if(!window.confirm("إلغاء المؤقت الحالي دون تسجيل جلسة؟"))return;setTimer({status:"idle",lessonId:"",elapsedMs:0,startedAt:null});setMessage("");};
 const finish=async()=>{if(!canEdit||busy)return;const total=elapsed,minutes=Math.floor(total/60000);if(minutes<1){setMessage("سجّل المؤقت دقيقة واحدة على الأقل قبل الإنهاء.");return;}setBusy(true);setMessage("");try{const ok=await onFinish?.({lessonId:timer.lessonId,minutes,startedAt:new Date((timer.startedAt||Date.now())-timer.elapsedMs).toISOString(),endedAt:new Date().toISOString(),sessionDate:new Date().toLocaleDateString("en-CA",{timeZone:"Africa/Cairo"}),sessionType:"مؤقت دراسة",kind:"study",source:"persistent_timer"});if(ok){setTimer({status:"idle",lessonId:"",elapsedMs:0,startedAt:null});setMessage("تم حفظ جلسة المؤقت.");}}catch(e){setMessage(e?.message||"تعذر حفظ الجلسة؛ المؤقت محفوظ ويمكنك المحاولة مجددًا.");}finally{setBusy(false);}};
 return <section style={{background:"#fff",border:"1px solid #E2E8F0",borderRadius:16,padding:16,display:"grid",gap:12}}>
  <div style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"center",flexWrap:"wrap"}}><div><b>مؤقت الدراسة</b><div style={{fontSize:12,color:"#64748B",marginTop:4}}>يستمر بعد تحديث الصفحة أو إغلاقها، ويُسجّل الجلسة عند الإنهاء</div></div><span style={{fontSize:11,padding:"5px 9px",borderRadius:999,background:timer.status==="running"?"#DCFCE7":"#F1F5F9",color:timer.status==="running"?"#166534":"#475569"}}>{timer.status==="running"?"يعمل الآن":timer.status==="paused"?"متوقف مؤقتًا":"جاهز"}</span></div>
  <select aria-label="الدرس" disabled={!canEdit||timer.status!=="idle"} value={timer.lessonId} onChange={e=>setTimer(t=>({...t,lessonId:e.target.value}))} style={{width:"100%",border:"1px solid #E2E8F0",borderRadius:10,padding:10,font:"inherit",background:"#fff"}}><option value="">اختر الدرس الذي ستدرسه</option>{available.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select>
  <div style={{fontSize:36,fontWeight:850,textAlign:"center",fontVariantNumeric:"tabular-nums",letterSpacing:2}}>{formatTime(elapsed)}</div>
  <div style={{display:"flex",justifyContent:"center",gap:8,flexWrap:"wrap"}}>
   {timer.status==="idle"&&<button type="button" disabled={!canEdit||!timer.lessonId} onClick={start} style={primary}>بدء الدراسة</button>}
   {timer.status==="running"&&<button type="button" onClick={pause} style={secondary}>إيقاف مؤقت</button>}
   {timer.status==="paused"&&<button type="button" onClick={()=>setTimer(t=>({...t,status:"running",startedAt:Date.now()}))} style={primary}>استكمال</button>}
   {timer.status!=="idle"&&<><button type="button" disabled={busy} onClick={finish} style={primary}>{busy?"جارٍ الحفظ…":"إنهاء وحفظ الجلسة"}</button><button type="button" onClick={reset} style={secondary}>إلغاء</button></>}
  </div>{message&&<div role="status" style={{fontSize:12,color:"#475569",textAlign:"center"}}>{message}</div>}
 </section>;
}
const primary={border:0,background:"#7C3AED",color:"#fff",borderRadius:10,padding:"10px 16px",fontWeight:800,cursor:"pointer"};
const secondary={border:"1px solid #E2E8F0",background:"#fff",color:"#172033",borderRadius:10,padding:"10px 16px",fontWeight:700,cursor:"pointer"};
