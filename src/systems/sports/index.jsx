import React, { useCallback, useMemo, useState } from "react";
import { osSectionLevel } from "../../core/core.js";
import { useRecordStore, arr, live } from "../../core/records.jsx";
import { AccessDenied } from "../../core/ui.jsx";
import { publishOSEvent } from "../integrationEvents.js";
import {
  SPORTS_SECTIONS, EXERCISE_CATEGORIES, TRACKING_MODES, PROGRAM_TYPES,
  emptySportsData, normalizeSportsData, todayInZone, makeSportsId,
  validateExercise, validateProgram, validateExerciseSet, sessionMetrics, sportsSummary,
} from "./domain.js";

const C = { ink:"#172033", muted:"#64748B", line:"#E2E8F0", bg:"#F8FAFC", accent:"#DC2626", soft:"#FEF2F2", green:"#047857", amber:"#B45309", red:"#B91C1C", white:"#FFFFFF" };
const now = () => new Date().toISOString();
const today = (zone) => todayInZone(zone || "Africa/Cairo");
const starterExercises = () => [
  { id:"sports-seed-pushup", name:"ضغط أرضي", nameEn:"Push-up", category:"Strength", trackingMode:"Reps", loadType:"Bodyweight", movementPattern:"Push", difficulty:"Beginner", instructions:"حافظ على الجسم في خط مستقيم ونفّذ الحركة بمدى مريح.", isSystemExercise:true, status:"Active" },
  { id:"sports-seed-squat", name:"قرفصاء", nameEn:"Bodyweight Squat", category:"Strength", trackingMode:"Reps", loadType:"Bodyweight", movementPattern:"Squat", difficulty:"Beginner", instructions:"حافظ على اتزان القدمين وتحكم في النزول.", isSystemExercise:true, status:"Active" },
  { id:"sports-seed-row", name:"سحب بالشنطة", nameEn:"Backpack Row", category:"Strength", trackingMode:"Weight-Reps", loadType:"Improvised", movementPattern:"Pull", difficulty:"Beginner", instructions:"تأكد من سلامة الشنطة وثبات محتوياتها قبل البدء.", isSystemExercise:true, status:"Active" },
  { id:"sports-seed-run", name:"جري", nameEn:"Run", category:"Cardio", trackingMode:"Time-Distance", loadType:"None", movementPattern:"Locomotion", difficulty:"Beginner", instructions:"ابدأ بوتيرة مناسبة لقدرتك الحالية.", isSystemExercise:true, status:"Active" },
  { id:"sports-seed-mobility", name:"حركة ومرونة", nameEn:"Mobility Flow", category:"Mobility", trackingMode:"Duration", loadType:"None", movementPattern:"Other", difficulty:"Beginner", instructions:"تحرك ببطء دون إجبار المفاصل على مدى مؤلم.", isSystemExercise:true, status:"Active" },
];
const seed = () => ({ exercises:starterExercises(), programs:[], workoutDays:[], plannedExercises:[], sessions:[], exerciseSets:[], goals:[], measurements:[], recoveryLogs:[], personalRecords:[], settings:[{ id:"settings", ...emptySportsData().preferences }] });
const getActive = rows => rows.filter(x => !x.deleted_at && x.status !== "Archived");
const fmtDate = value => value ? new Date(value + (String(value).length === 10 ? "T12:00:00" : "")).toLocaleDateString("ar-EG",{day:"numeric",month:"short",year:"numeric"}) : "—";

function Button({children,onClick,kind="default",disabled=false,type="button"}) {
  const palette = kind==="primary" ? {background:C.accent,color:"#fff",borderColor:C.accent} : kind==="danger" ? {background:"#fff",color:C.red,borderColor:"#FECACA"} : {background:"#fff",color:C.ink,borderColor:C.line};
  return <button type={type} disabled={disabled} onClick={onClick} style={{...palette,border:"1px solid "+palette.borderColor,borderRadius:10,padding:"9px 12px",fontFamily:"inherit",fontSize:12,fontWeight:750,cursor:disabled?"not-allowed":"pointer",opacity:disabled?.55:1}}>{children}</button>;
}
function Field({label,value,onChange,type="text",required=false,placeholder="",min,max,step,disabled=false}) {
  return <label style={{display:"grid",gap:5,minWidth:0,color:C.muted,fontSize:12}}><span>{label}</span><input type={type} value={value??""} onChange={e=>onChange(e.target.value)} required={required} placeholder={placeholder} min={min} max={max} step={step} disabled={disabled} style={{width:"100%",boxSizing:"border-box",padding:"10px 11px",border:"1px solid "+C.line,borderRadius:10,font:"inherit",fontSize:13,color:C.ink,background:disabled?C.bg:"#fff"}}/></label>;
}
function Select({label,value,onChange,options,disabled=false}) {
  return <label style={{display:"grid",gap:5,minWidth:0,color:C.muted,fontSize:12}}><span>{label}</span><select value={value??""} onChange={e=>onChange(e.target.value)} disabled={disabled} style={{width:"100%",boxSizing:"border-box",padding:"10px 11px",border:"1px solid "+C.line,borderRadius:10,font:"inherit",fontSize:13,color:C.ink,background:"#fff"}}>{options.map(o=>typeof o==="string"?<option key={o} value={o}>{o}</option>:<option key={o.value} value={o.value}>{o.label}</option>)}</select></label>;
}
function Panel({title,hint,action,children}) {
  return <section style={{background:C.white,border:"1px solid "+C.line,borderRadius:16,padding:17,marginBottom:14,minWidth:0}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"start",gap:10,flexWrap:"wrap",marginBottom:13}}><div><h2 style={{margin:0,fontSize:16,color:C.ink}}>{title}</h2>{hint&&<p style={{margin:"5px 0 0",fontSize:12,color:C.muted,lineHeight:1.7}}>{hint}</p>}</div>{action}</div>{children}</section>;
}
function Metric({label,value,detail}) {
  return <div style={{background:"#fff",border:"1px solid "+C.line,borderRadius:14,padding:15,minWidth:0}}><div style={{fontSize:12,color:C.muted}}>{label}</div><div style={{fontSize:26,fontWeight:850,color:C.ink,marginTop:5,overflowWrap:"anywhere"}}>{value}</div>{detail&&<div style={{fontSize:11,color:C.muted,marginTop:4}}>{detail}</div>}</div>;
}
function Empty({title,body,action}) {
  return <div style={{padding:25,textAlign:"center",border:"1px dashed "+C.line,borderRadius:13,background:C.bg}}><div style={{fontSize:26,marginBottom:6}}>🏋️</div><b style={{color:C.ink}}>{title}</b><p style={{fontSize:12,color:C.muted,lineHeight:1.8}}>{body}</p>{action}</div>;
}
function RecordRow({title,sub,badges,action}) {
  return <div style={{display:"flex",alignItems:"center",gap:12,padding:"12px 0",borderBottom:"1px solid "+C.line,flexWrap:"wrap"}}><div style={{flex:1,minWidth:180}}><div style={{fontWeight:750,fontSize:13,color:C.ink}}>{title}</div>{sub&&<div style={{fontSize:11,color:C.muted,marginTop:4,lineHeight:1.7}}>{sub}</div>}{badges&&<div style={{display:"flex",gap:5,flexWrap:"wrap",marginTop:5}}>{badges.map((x,i)=><span key={i} style={{fontSize:10,padding:"3px 7px",borderRadius:8,background:C.soft,color:C.accent}}>{x}</span>)}</div>}</div>{action}</div>;
}

export default function SportsOS({ api, access, ws, isDemo, demoStore, page="dashboard", setPage=()=>{}, shell }) {
  const store = useRecordStore({ wsId:ws?.id || api?.workspaceId || "demo", systemId:"sports", isDemo, demoStore:demoStore || {current:{}}, seed, onToast:msg=>shell?.toast?.(msg) });
  const [error,setError] = useState("");
  const [notice,setNotice] = useState("");
  const [query,setQuery] = useState("");
  const [selectedExerciseId,setSelectedExerciseId] = useState("");
  const [sessionId,setSessionId] = useState("");
  const [exerciseDraft,setExerciseDraft] = useState({name:"",nameEn:"",category:"Strength",trackingMode:"Weight-Reps",loadType:"External",movementPattern:"Other",difficulty:"Beginner",instructions:""});
  const [programDraft,setProgramDraft] = useState({name:"",programType:"General Fitness",durationWeeks:12,startDate:today(),daysPerWeek:3,description:""});
  const [goalDraft,setGoalDraft] = useState({name:"",type:"General Fitness",targetMetric:"Frequency",direction:"Increase",startValue:"0",targetValue:"3",unit:"جلسة/أسبوع",startDate:today(),targetDate:"",priority:"Medium"});
  const [measurementDraft,setMeasurementDraft] = useState({date:today(),weightKg:"",waistCm:"",chestCm:"",armCm:"",thighCm:"",notes:""});
  const [recoveryDraft,setRecoveryDraft] = useState({date:today(),sleepHours:"",energy:"3",stress:"3",soreness:"2",notes:""});
  const [setDraft,setSetDraft] = useState({reps:"10",weightKg:"",durationSeconds:"",distanceMeters:"",rpe:""});
  const [sessionNote,setSessionNote] = useState("");
  const [settingsDraft,setSettingsDraft] = useState(null);
  const [importText,setImportText] = useState("");
  const [showImport,setShowImport] = useState(false);

  const collections = useMemo(()=>{
    const out={};
    ["exercises","programs","workoutDays","plannedExercises","sessions","exerciseSets","goals","measurements","recoveryLogs","personalRecords","settings"].forEach(k=>out[k]=live(arr(store.recs,k)));
    return out;
  },[store.recs]);
  const settings = useMemo(()=>({...emptySportsData().preferences,...(collections.settings.find(x=>x.id==="settings")||{})}),[collections.settings]);
  const data = useMemo(()=>normalizeSportsData({...collections,preferences:settings}),[collections,settings]);
  const section = SPORTS_SECTIONS.some(x=>x.id===page)?page:"dashboard";
  const level = osSectionLevel(access,section);
  const canEdit = level==="edit";
  const exercises = useMemo(()=>getActive(data.exercises),[data.exercises]);
  const programs = useMemo(()=>getActive(data.programs),[data.programs]);
  const sessions = useMemo(()=>data.sessions.filter(s=>!s.deleted_at),[data.sessions]);
  const sets = useMemo(()=>data.exerciseSets.filter(s=>!s.deleted_at),[data.exerciseSets]);
  const exercisesById = useMemo(()=>Object.fromEntries(data.exercises.map(x=>[x.id,x])),[data.exercises]);
  const summary = useMemo(()=>sportsSummary(data,today(settings.timezone)),[data,settings.timezone]);
  const currentSession = sessions.find(s=>s.id===sessionId && s.status==="In Progress") || sessions.find(s=>s.status==="In Progress"&&!s.deleted_at) || null;
  const currentSessionSets = currentSession ? sets.filter(s=>s.sessionId===currentSession.id) : [];
  const filteredExercises = exercises.filter(e=>!query||[e.name,e.nameEn,e.category,e.movementPattern].some(v=>String(v||"").toLocaleLowerCase().includes(query.toLocaleLowerCase())));
  const selectedExercise = exercisesById[selectedExerciseId] || exercises[0] || null;

  const save = useCallback(async(collection,record)=> {
    if(!canEdit) { setError("صلاحية التعديل غير متاحة في هذا القسم."); return null; }
    setError(""); setNotice("");
    try {
      const saved=await store.api.put(collection,{...record,updatedAt:now()});
      if(!saved) throw new Error("لم يؤكد النظام حفظ السجل. أعد تحميل القسم قبل المحاولة مرة أخرى.");
      setNotice("تم الحفظ.");
      return saved;
    } catch(e) { setError(e?.message||"تعذر حفظ البيانات."); return null; }
  },[canEdit,store.api]);
  const archive = useCallback(async(collection,record)=>{
    if(!canEdit||!record?.id)return;
    if(!globalThis.confirm?.("أرشفة هذا السجل؟ ستبقى بيانات الجلسات التاريخية محفوظة."))return;
    try { await store.api.softDelete(collection,record.id,ws?.userId||null); setNotice("تمت الأرشفة."); setError(""); }
    catch(e){setError(e?.message||"تعذر الأرشفة.");}
  },[canEdit,store.api,ws?.userId]);
  const emit = (type,entityType,entityId,payload={}) => {
    try { publishOSEvent({type,entityType,entityId,payload},ws?.id||api?.workspaceId||"default","sports"); } catch {}
  };
  const startSession = async (sessionType="Free") => {
    const stamp=now(),id=makeSportsId("session");
    const saved=await save("sessions",{id,sessionType,status:"In Progress",startedAt:stamp,endedAt:null,timezone:settings.timezone||"Africa/Cairo",localDate:today(settings.timezone),overallRpe:null,energyBefore:null,energyAfter:null,pausedSeconds:0,notes:"",isRetroactive:false,clientGeneratedId:id});
    if(saved){setSessionId(id);setSelectedExerciseId(exercises[0]?.id||"");emit("sports.workout.started","workout_session",id,{sessionType,localDate:today(settings.timezone)});}
  };
  const finishSession = async () => {
    if(!currentSession)return;
    const saved=await save("sessions",{...currentSession,status:"Completed",endedAt:now(),notes:sessionNote||currentSession.notes||""});
    if(saved){setSessionNote("");emit("sports.workout.completed","workout_session",saved.id,{localDate:saved.localDate,setCount:currentSessionSets.length,exerciseCount:new Set(currentSessionSets.map(s=>s.exerciseId)).size});}
  };
  const addSet = async event => {
    event.preventDefault();
    if(!currentSession||!selectedExercise){setError("ابدأ جلسة واختر تمرينًا أولًا.");return;}
    const draft={...setDraft,sessionId:currentSession.id,exerciseId:selectedExercise.id,sequence:currentSessionSets.filter(s=>s.exerciseId===selectedExercise.id).length+1,setType:"Working",side:"Both",completedAt:now()};
    const valid=validateExerciseSet(draft,selectedExercise);
    if(!valid.ok){setError(valid.error);return;}
    const id=makeSportsId("set");
    const saved=await save("exerciseSets",{...valid.value,id,sessionId:currentSession.id,exerciseId:selectedExercise.id,sequence:draft.sequence,setType:draft.setType,side:draft.side,completedAt:draft.completedAt,clientGeneratedId:id});
    if(saved){setSetDraft({reps:"10",weightKg:"",durationSeconds:"",distanceMeters:"",rpe:""});emit("sports.exercise_set.logged","exercise_set",id,{sessionId:currentSession.id,exerciseId:selectedExercise.id});}
  };
  const createExercise = async event => {
    event.preventDefault();
    const valid=validateExercise(exerciseDraft);
    if(!valid.ok){setError(valid.error);return;}
    const id=makeSportsId("exercise");
    const saved=await save("exercises",{...valid.value,id,isSystemExercise:false,status:"Active",createdAt:now()});
    if(saved){setExerciseDraft({name:"",nameEn:"",category:"Strength",trackingMode:"Weight-Reps",loadType:"External",movementPattern:"Other",difficulty:"Beginner",instructions:""});setSelectedExerciseId(id);}
  };
  const createProgram = async event => {
    event.preventDefault();
    const valid=validateProgram(programDraft);
    if(!valid.ok){setError(valid.error);return;}
    const id=makeSportsId("program");
    const saved=await save("programs",{...valid.value,id,programType:programDraft.programType,status:"Draft",role:"Primary",createdAt:now()});
    if(saved)setProgramDraft({name:"",programType:"General Fitness",durationWeeks:12,startDate:today(settings.timezone),daysPerWeek:3,description:""});
  };
  const activateProgram = async program => {
    if(settings.activeProgramPolicy==="single") {
      const active=programs.filter(p=>p.status==="Active"&&p.id!==program.id);
      for(const p of active){const ok=await save("programs",{...p,status:"Paused",pausedAt:now()});if(!ok)return;}
    }
    await save("programs",{...program,status:program.status==="Active"?"Paused":"Active",startedAt:program.status==="Active"?program.startedAt:now(),pausedAt:program.status==="Active"?now():null});
  };
  const createGoal = async event => {
    event.preventDefault();
    if(!String(goalDraft.name).trim()){setError("اسم الهدف مطلوب.");return;}
    const start=Number(goalDraft.startValue),target=Number(goalDraft.targetValue);
    if(!Number.isFinite(start)||!Number.isFinite(target)){setError("قيم البداية والهدف يجب أن تكون رقمية.");return;}
    if(goalDraft.direction!=="Maintain"&&start===target){setError("يجب أن تختلف قيمة البداية عن الهدف في أهداف الزيادة أو النقصان.");return;}
    const saved=await save("goals",{...goalDraft,id:makeSportsId("goal"),name:goalDraft.name.trim(),startValue:start,targetValue:target,status:"Active",autoAchieve:false,createdAt:now()});
    if(saved)setGoalDraft({name:"",type:"General Fitness",targetMetric:"Frequency",direction:"Increase",startValue:"0",targetValue:"3",unit:"جلسة/أسبوع",startDate:today(settings.timezone),targetDate:"",priority:"Medium"});
  };
  const createMeasurement = async event => {
    event.preventDefault();
    const vals=["weightKg","waistCm","chestCm","armCm","thighCm"];
    if(!vals.some(k=>measurementDraft[k]!==""&&Number.isFinite(Number(measurementDraft[k]))&&Number(measurementDraft[k])>0)){setError("أدخل قياسًا واحدًا على الأقل بقيمة أكبر من صفر.");return;}
    const record={...measurementDraft,id:makeSportsId("measurement"),createdAt:now()};
    vals.forEach(k=>record[k]=measurementDraft[k]===""?null:Number(measurementDraft[k]));
    const saved=await save("measurements",record);
    if(saved)setMeasurementDraft({date:today(settings.timezone),weightKg:"",waistCm:"",chestCm:"",armCm:"",thighCm:"",notes:""});
  };
  const createRecovery = async event => {
    event.preventDefault();
    const record={...recoveryDraft,id:makeSportsId("recovery"),sleepHours:recoveryDraft.sleepHours===""?null:Number(recoveryDraft.sleepHours),energy:Number(recoveryDraft.energy),stress:Number(recoveryDraft.stress),soreness:Number(recoveryDraft.soreness),createdAt:now()};
    if(record.sleepHours!=null&&(record.sleepHours<0||record.sleepHours>24)){setError("ساعات النوم يجب أن تكون بين 0 و24.");return;}
    const saved=await save("recoveryLogs",record);
    if(saved)setRecoveryDraft({date:today(settings.timezone),sleepHours:"",energy:"3",stress:"3",soreness:"2",notes:""});
  };
  const saveSettings = async event => {
    event.preventDefault();
    const saved=await save("settings",{id:"settings",...settingsDraft,updatedAt:now()});
    if(saved)setSettingsDraft(null);
  };
  const exportJson = () => {
    const blob=new Blob([JSON.stringify({format:"os-hub-sports-backup",version:1,exportedAt:now(),data},null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="sports-os-backup-"+today(settings.timezone)+".json";a.click();URL.revokeObjectURL(url);
  };
  const importJson = async () => {
    try {
      const parsed=JSON.parse(importText),source=parsed.data||parsed;
      if(!source||typeof source!=="object"||!Array.isArray(source.exercises)&&!Array.isArray(source.sessions))throw new Error("الملف لا يبدو نسخة احتياطية من Sports OS.");
      const mapping={exercises:"exercises",programs:"programs",workoutDays:"workoutDays",plannedExercises:"plannedExercises",sessions:"sessions",exerciseSets:"exerciseSets",goals:"goals",measurements:"measurements",recoveryLogs:"recoveryLogs",personalRecords:"personalRecords"};
      for(const key of Object.keys(mapping)) for(const item of Array.isArray(source[key])?source[key]:[]) {
        if(!item?.id) throw new Error("يوجد سجل بدون معرّف في "+key+".");
      }
      for(const [key,coll] of Object.entries(mapping)) for(const item of Array.isArray(source[key])?source[key]:[]) {
        const saved=await save(coll,item);if(!saved)return;
      }
      if(source.preferences) await save("settings",{id:"settings",...source.preferences});
      setShowImport(false);setImportText("");setNotice("تم استيراد السجلات. لم تُحذف سجلات موجودة ولم يتم استبدالها.");await store.api.reload();
    } catch(e){setError(e?.message||"تعذر استيراد النسخة الاحتياطية.");}
  };

  if(level==="none") return <AccessDenied/>;
  const head = SPORTS_SECTIONS.find(s=>s.id===section)||SPORTS_SECTIONS[0];
  const sectionNav = <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:17}}>{SPORTS_SECTIONS.filter(s=>s.id!=="settings"||canEdit).map(s=><button key={s.id} onClick={()=>setPage(s.id)} style={{fontFamily:"inherit",border:"1px solid "+(section===s.id?C.accent:C.line),background:section===s.id?C.soft:"#fff",color:section===s.id?C.accent:C.ink,borderRadius:10,padding:"8px 10px",fontSize:11,fontWeight:750,cursor:"pointer"}}>{s.icon} {s.label}</button>)}</div>;
  const feedback = <>{error&&<div role="alert" style={{background:"#FEF2F2",border:"1px solid #FECACA",color:C.red,borderRadius:10,padding:11,marginBottom:12,fontSize:12}}>{error}</div>}{notice&&<div role="status" style={{background:"#ECFDF5",border:"1px solid #A7F3D0",color:C.green,borderRadius:10,padding:11,marginBottom:12,fontSize:12}}>{notice}</div>}{store.error&&<div role="alert" style={{background:"#FFF7ED",border:"1px solid #FED7AA",color:C.amber,borderRadius:10,padding:11,marginBottom:12,fontSize:12}}>تعذر تحميل بعض البيانات من الخادم. {store.error.message||""}</div>}</>;
  const dashboard = <><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(145px,1fr))",gap:10,marginBottom:14}}><Metric label="جلسات مكتملة" value={summary.completedCount} detail="إجمالي السجل المحفوظ"/><Metric label="جلسات هذا الأسبوع" value={summary.weekCount} detail={"من "+fmtDate(summary.weekStart)+" حتى اليوم"}/><Metric label="حجم الأوزان هذا الأسبوع" value={summary.weekVolumeKg.toLocaleString("ar-EG")+" كجم"} detail="وزن × تكرارات للمجموعات المسجلة بوزن"/><Metric label="دقائق التدريب هذا الأسبوع" value={summary.weekMinutes}/></div>
    <Panel title="التمرين الحالي" hint="ابدأ جلسة حرة وسجّل كل مجموعة أو فترة أثناء التمرين." action={canEdit&&!currentSession?<Button kind="primary" onClick={()=>startSession("Free")}>＋ بدء جلسة حرة</Button>:null}>{currentSession?<div><div style={{fontWeight:800,color:C.accent}}>جلسة جارية · بدأت {new Date(currentSession.startedAt).toLocaleTimeString("ar-EG",{hour:"2-digit",minute:"2-digit"})}</div><p style={{fontSize:12,color:C.muted}}>سُجّل حتى الآن {currentSessionSets.length} مجموعة/فترة.</p><Button kind="primary" onClick={()=>setPage("workout")}>متابعة التمرين ←</Button></div>:<Empty title="لا توجد جلسة جارية" body="ابدأ جلسة حرة الآن، أو أنشئ برنامجًا ثم استكمل ربط أيامه وتمارينه المخططة في مرحلة لاحقة."/>}</Panel>
    <Panel title="آخر الجلسات" action={<Button onClick={()=>setPage("history")}>عرض السجل</Button>}>{summary.recentSessions.length?summary.recentSessions.slice(0,5).map(x=><RecordRow key={x.session.id} title={fmtDate(x.session.localDate)+" · "+(x.session.sessionType==="Free"?"جلسة حرة":x.session.sessionType)} sub={x.session.notes||"لا توجد ملاحظات"} badges={[x.session.status,x.setCount+" مجموعة/فترة",x.volumeKg+" كجم"]}/>):<Empty title="لسه مفيش سجل" body="بعد تسجيل أول جلسة هتظهر هنا."/ >}</Panel>
    <Panel title="الأهداف النشطة" action={<Button onClick={()=>setPage("goals")}>إدارة الأهداف</Button>}>{data.goals.filter(g=>g.status==="Active"&&!g.deleted_at).slice(0,4).map(g=><RecordRow key={g.id} title={g.name} sub={"الهدف: "+g.targetValue+" "+(g.unit||"")+" · الموعد "+fmtDate(g.targetDate)} badges={[g.type,g.priority||"Medium"]}/>)}{!data.goals.some(g=>g.status==="Active"&&!g.deleted_at)&&<Empty title="لم تضف أهدافًا بعد" body="أنشئ أهداف القوة أو الجري أو التكرار الأسبوعي."/ >}</Panel>
  </>;
  const workout = <><Panel title={currentSession?"تسجيل التمرين الجاري":"بدء جلسة تدريب"} hint="كل مجموعة أو فترة تُحفظ كسجل مستقل؛ لا يتم وضع الأداء التاريخي داخل تعريف التمرين.">{!currentSession?<><p style={{fontSize:12,color:C.muted}}>ابدأ جلسة حرة لتسجيل المجموعات، حتى لو لم يكن لديك برنامج جاهز.</p>{canEdit&&<Button kind="primary" onClick={()=>startSession("Free")}>▶ بدء الجلسة</Button>}</>:<><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:10,marginBottom:12}}><div style={{padding:12,background:C.soft,borderRadius:10}}><div style={{fontSize:11,color:C.muted}}>وقت البدء</div><b>{new Date(currentSession.startedAt).toLocaleTimeString("ar-EG",{hour:"2-digit",minute:"2-digit"})}</b></div><div style={{padding:12,background:C.soft,borderRadius:10}}><div style={{fontSize:11,color:C.muted}}>المجموعات/الفترات</div><b>{currentSessionSets.length}</b></div><div style={{padding:12,background:C.soft,borderRadius:10}}><div style={{fontSize:11,color:C.muted}}>حجم التدريب المسجل</div><b>{sessionMetrics(currentSession,sets).volumeKg} كجم</b></div></div>
      {canEdit&&<form onSubmit={addSet} style={{display:"grid",gap:11}}><Select label="التمرين" value={selectedExerciseId||selectedExercise?.id||""} onChange={setSelectedExerciseId} options={exercises.map(e=>({value:e.id,label:e.name+" · "+e.category}))}/>{selectedExercise&&<div style={{fontSize:11,color:C.muted,lineHeight:1.7}}>{selectedExercise.instructions||"لا توجد تعليمات مضافة."} · طريقة التتبع: {selectedExercise.trackingMode}</div>}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:9}}>{["Weight-Reps","Reps"].includes(selectedExercise?.trackingMode)&&<Field label="التكرارات" value={setDraft.reps} onChange={v=>setSetDraft(p=>({...p,reps:v}))} type="number" min="1" max="10000" required/>}{selectedExercise?.trackingMode==="Weight-Reps"&&<Field label="الوزن (كجم)" value={setDraft.weightKg} onChange={v=>setSetDraft(p=>({...p,weightKg:v}))} type="number" min="0" max="2000" step="0.25"/>}{["Duration","Time-Distance"].includes(selectedExercise?.trackingMode)&&<Field label="المدة (ثانية)" value={setDraft.durationSeconds} onChange={v=>setSetDraft(p=>({...p,durationSeconds:v}))} type="number" min="1" required/>}{["Distance","Time-Distance"].includes(selectedExercise?.trackingMode)&&<Field label="المسافة (متر)" value={setDraft.distanceMeters} onChange={v=>setSetDraft(p=>({...p,distanceMeters:v}))} type="number" min="1" required/>}<Field label="RPE (اختياري)" value={setDraft.rpe} onChange={v=>setSetDraft(p=>({...p,rpe:v}))} type="number" min="1" max="10" step="0.5"/></div><Button kind="primary" type="submit">＋ تسجيل المجموعة / الفترة</Button></form>}
      <div style={{marginTop:16}}><h3 style={{fontSize:13}}>المجموعات المسجلة</h3>{currentSessionSets.map((s,i)=><RecordRow key={s.id} title={(i+1)+". "+(exercisesById[s.exerciseId]?.name||"تمرين مؤرشف")} sub={[s.reps!=null?s.reps+" تكرار":null,s.weightKg!=null?s.weightKg+" كجم":null,s.durationSeconds!=null?Math.round(s.durationSeconds/60*10)/10+" دقيقة":null,s.distanceMeters!=null?s.distanceMeters+" متر":null,s.rpe!=null?"RPE "+s.rpe:null].filter(Boolean).join(" · ")||"فترة مسجلة"} badges={[s.setType||"Working"]} action={canEdit?<Button kind="danger" onClick={()=>archive("exerciseSets",s)}>أرشفة</Button>:null}/>)}{!currentSessionSets.length&&<Empty title="ابدأ بأول مجموعة" body="اختَر التمرين وأدخل المقاييس المناسبة لطريقة تتبعه."/ >}</div>
      <div style={{marginTop:14,display:"grid",gap:8}}><Field label="ملاحظات الجلسة" value={sessionNote} onChange={setSessionNote} placeholder="إحساسك بالتمرين أو أي ملاحظة"/><Button kind="primary" onClick={finishSession}>✓ إنهاء الجلسة وحفظها كمكتملة</Button></div></>}</Panel></>;
  const exercisesPage = <><Panel title="إضافة تمرين إلى مكتبتك" hint="المكتبة تصف التمرين وطريقة تسجيله؛ كل أداء فعلي محفوظ في مجموعات الجلسات.">{canEdit&&<form onSubmit={createExercise} style={{display:"grid",gap:10}}><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:10}}><Field label="اسم التمرين بالعربية" value={exerciseDraft.name} onChange={v=>setExerciseDraft(p=>({...p,name:v}))} required/><Field label="الاسم بالإنجليزية (اختياري)" value={exerciseDraft.nameEn} onChange={v=>setExerciseDraft(p=>({...p,nameEn:v}))}/><Select label="التصنيف" value={exerciseDraft.category} onChange={v=>setExerciseDraft(p=>({...p,category:v}))} options={EXERCISE_CATEGORIES}/><Select label="طريقة التتبع" value={exerciseDraft.trackingMode} onChange={v=>setExerciseDraft(p=>({...p,trackingMode:v}))} options={TRACKING_MODES}/><Select label="نوع الحمل" value={exerciseDraft.loadType} onChange={v=>setExerciseDraft(p=>({...p,loadType:v}))} options={["External","Bodyweight","Weighted Bodyweight","Assisted","Improvised","None"]}/><Select label="نمط الحركة" value={exerciseDraft.movementPattern} onChange={v=>setExerciseDraft(p=>({...p,movementPattern:v}))} options={["Squat","Hinge","Push","Pull","Carry","Rotate","Locomotion","Other"]}/><Select label="الصعوبة" value={exerciseDraft.difficulty} onChange={v=>setExerciseDraft(p=>({...p,difficulty:v}))} options={["Beginner","Intermediate","Advanced"]}/></div><Field label="التعليمات وملاحظات السلامة" value={exerciseDraft.instructions} onChange={v=>setExerciseDraft(p=>({...p,instructions:v}))}/><Button kind="primary" type="submit">حفظ التمرين</Button></form>}</Panel>
    <Panel title="مكتبة التمارين" action={<span style={{fontSize:11,color:C.muted}}>{filteredExercises.length} تمرين</span>}><Field label="بحث بالاسم أو التصنيف أو نمط الحركة" value={query} onChange={setQuery} placeholder="مثال: ضغط، جري، Pull"/>{filteredExercises.map(e=><RecordRow key={e.id} title={e.name+(e.nameEn?" · "+e.nameEn:"")} sub={e.instructions||"لا توجد تعليمات"} badges={[e.category,e.trackingMode,e.difficulty||"Beginner",e.isSystemExercise?"تمرين نظامي":"تمرين مخصص"]} action={canEdit&&!e.isSystemExercise?<Button kind="danger" onClick={()=>archive("exercises",e)}>أرشفة</Button>:null}/>)}{!filteredExercises.length&&<Empty title="لا توجد تمارين مطابقة" body="جرّب تغيير البحث أو أضف تمرينًا جديدًا."/ >}</Panel></>;
  const programsPage = <><Panel title="إنشاء برنامج تدريبي" hint="البرنامج يُحفظ كخطة مستقلة؛ ربط الأيام والقوالب والتمارين المخططة سيُستكمل في المرحلة التالية.">{canEdit&&<form onSubmit={createProgram} style={{display:"grid",gap:10}}><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:10}}><Field label="اسم البرنامج" value={programDraft.name} onChange={v=>setProgramDraft(p=>({...p,name:v}))} required/><Select label="نوع البرنامج" value={programDraft.programType} onChange={v=>setProgramDraft(p=>({...p,programType:v}))} options={PROGRAM_TYPES}/><Field label="عدد الأسابيع" value={programDraft.durationWeeks} onChange={v=>setProgramDraft(p=>({...p,durationWeeks:v}))} type="number" min="1" max="104" required/><Field label="أيام التدريب أسبوعيًا" value={programDraft.daysPerWeek} onChange={v=>setProgramDraft(p=>({...p,daysPerWeek:v}))} type="number" min="1" max="7" required/><Field label="تاريخ البداية" value={programDraft.startDate} onChange={v=>setProgramDraft(p=>({...p,startDate:v}))} type="date" required/></div><Field label="الوصف" value={programDraft.description} onChange={v=>setProgramDraft(p=>({...p,description:v}))}/><Button kind="primary" type="submit">إنشاء البرنامج</Button></form>}</Panel>
    <Panel title="برامجي" hint="سياسة البرنامج النشط يمكن ضبطها من الإعدادات.">{programs.map(p=><RecordRow key={p.id} title={p.name} sub={p.description||p.programType+" · "+p.durationWeeks+" أسبوع"} badges={[p.status,p.programType,p.daysPerWeek+" أيام/أسبوع",fmtDate(p.startDate)]} action={canEdit?<div style={{display:"flex",gap:6,flexWrap:"wrap"}}><Button onClick={()=>activateProgram(p)}>{p.status==="Active"?"إيقاف مؤقت":"تفعيل"}</Button><Button kind="danger" onClick={()=>archive("programs",p)}>أرشفة</Button></div>:null}/>)}{!programs.length&&<Empty title="لا توجد برامج بعد" body="أنشئ برنامج قوة أو جري أو لياقة عامة لتوثيق خطتك."/ >}</Panel></>;
  const historyPage = <Panel title="سجل التدريب" hint="الجلسة المكتملة هي المصدر الأساسي للتاريخ؛ الأرقام المشتقة تُحسب من سجلات المجموعات.">{summary.recentSessions.map(x=><RecordRow key={x.session.id} title={fmtDate(x.session.localDate)+" · "+(x.session.sessionType==="Free"?"جلسة حرة":x.session.sessionType)} sub={x.session.notes||"—"} badges={[x.session.status,x.setCount+" مجموعة/فترة",x.totalReps+" تكرار",x.volumeKg+" كجم",x.durationMinutes==null?"المدة غير محسوبة":x.durationMinutes+" دقيقة"]}/>)}{!summary.recentSessions.length&&<Empty title="لا توجد جلسات محفوظة" body="سجّل أول جلسة تدريب لتكوين سجل تاريخي."/ >}</Panel>;
  const progressPage = <><Panel title="مؤشرات التقدم" hint="الحجم محسوب من الوزن × التكرارات للسجلات التي تحتوي على القيمتين. تمارين وزن الجسم لا تُحسب في حجم الأوزان افتراضيًا."><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:10}}><Metric label="أفضل أرقام تقديرية (1RM)" value={summary.prs.length} detail="لكل تمرين مسجل بوزن وتكرارات"/><Metric label="إجمالي مجموعات/فترات" value={sets.length}/><Metric label="إجمالي التكرارات" value={sets.reduce((n,s)=>n+(Number(s.reps)||0),0)}/><Metric label="مسافة مسجلة" value={(sets.reduce((n,s)=>n+(Number(s.distanceMeters)||0),0)/1000).toLocaleString("ar-EG",{maximumFractionDigits:2})+" كم"}/></div></Panel>
    <Panel title="الأرقام القياسية التقديرية" hint="تقدير Epley متاح فقط للمجموعات المسجلة بوزن وتكرارات من 1 إلى 12. لا يمثل اختبارًا فعليًا لأقصى وزن.">{summary.prs.map(pr=><RecordRow key={pr.exerciseId} title={pr.exerciseName} sub={"أفضل 1RM تقديري: "+pr.value+" كجم · "+fmtDate(pr.date)} badges={["Epley"]}/>)}{!summary.prs.length&&<Empty title="لا توجد أرقام بعد" body="سجّل مجموعة بوزن وتكرارات مناسبة لحساب تقدير اختياري."/ >}</Panel></>;
  const goalsPage = <><Panel title="إضافة هدف رياضي">{canEdit&&<form onSubmit={createGoal} style={{display:"grid",gap:10}}><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:10}}><Field label="اسم الهدف" value={goalDraft.name} onChange={v=>setGoalDraft(p=>({...p,name:v}))} required/><Select label="نوع الهدف" value={goalDraft.type} onChange={v=>setGoalDraft(p=>({...p,type:v}))} options={["Strength","Muscle","Fat Loss","Endurance","Distance","Speed","Mobility","General Fitness","Sport Performance"]}/><Select label="اتجاه التقدم" value={goalDraft.direction} onChange={v=>setGoalDraft(p=>({...p,direction:v}))} options={["Increase","Decrease","Maintain"]}/><Field label="قيمة البداية" value={goalDraft.startValue} onChange={v=>setGoalDraft(p=>({...p,startValue:v}))} type="number" step="any" required/><Field label="القيمة المستهدفة" value={goalDraft.targetValue} onChange={v=>setGoalDraft(p=>({...p,targetValue:v}))} type="number" step="any" required/><Field label="الوحدة" value={goalDraft.unit} onChange={v=>setGoalDraft(p=>({...p,unit:v}))}/><Field label="تاريخ البداية" value={goalDraft.startDate} onChange={v=>setGoalDraft(p=>({...p,startDate:v}))} type="date" required/><Field label="الموعد المستهدف" value={goalDraft.targetDate} onChange={v=>setGoalDraft(p=>({...p,targetDate:v}))} type="date"/></div><Button kind="primary" type="submit">حفظ الهدف</Button></form>}</Panel><Panel title="الأهداف النشطة">{data.goals.filter(g=>!g.deleted_at).map(g=><RecordRow key={g.id} title={g.name} sub={g.description||("من "+g.startValue+" إلى "+g.targetValue+" "+(g.unit||""))} badges={[g.status,g.direction,g.type]} action={canEdit?<Button onClick={()=>save("goals",{...g,status:g.status==="Active"?"Paused":"Active"})}>{g.status==="Active"?"إيقاف":"استئناف"}</Button>:null}/>)}{!data.goals.length&&<Empty title="ابدأ بهدف واضح" body="حدد مقياسًا وموعدًا، ثم راجع تقدمك دوريًا."/ >}</Panel></>;
  const recoveryPage = <><Panel title="سجل التعافي اليومي" hint="مؤشرات ذاتية لملاحظة الاتجاهات فقط، وليست تشخيصًا طبيًا.">{canEdit&&<form onSubmit={createRecovery} style={{display:"grid",gap:10}}><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:10}}><Field label="التاريخ" value={recoveryDraft.date} onChange={v=>setRecoveryDraft(p=>({...p,date:v}))} type="date" required/><Field label="النوم (ساعات)" value={recoveryDraft.sleepHours} onChange={v=>setRecoveryDraft(p=>({...p,sleepHours:v}))} type="number" min="0" max="24" step="0.25"/><Select label="الطاقة (1–5)" value={recoveryDraft.energy} onChange={v=>setRecoveryDraft(p=>({...p,energy:v}))} options={["1","2","3","4","5"]}/><Select label="التوتر (1–5)" value={recoveryDraft.stress} onChange={v=>setRecoveryDraft(p=>({...p,stress:v}))} options={["1","2","3","4","5"]}/><Select label="الإجهاد العضلي (1–5)" value={recoveryDraft.soreness} onChange={v=>setRecoveryDraft(p=>({...p,soreness:v}))} options={["1","2","3","4","5"]}/></div><Field label="ملاحظات" value={recoveryDraft.notes} onChange={v=>setRecoveryDraft(p=>({...p,notes:v}))}/><Button kind="primary" type="submit">تسجيل التعافي</Button></form>}</Panel><Panel title="آخر سجلات التعافي">{data.recoveryLogs.slice().sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,14).map(x=><RecordRow key={x.id} title={fmtDate(x.date)} sub={x.notes||"—"} badges={["النوم "+(x.sleepHours??"—")+" س","الطاقة "+x.energy+"/5","التوتر "+x.stress+"/5","الإجهاد "+x.soreness+"/5"]}/>)}{!data.recoveryLogs.length&&<Empty title="لا توجد سجلات تعافٍ" body="سجل النوم والطاقة والإجهاد لملاحظة الأنماط."/ >}</Panel></>;
  const measurementsPage = <><Panel title="إضافة قياسات جسم" hint="القياسات اختيارية؛ سجّل القيم التي تريد متابعتها فقط.">{canEdit&&<form onSubmit={createMeasurement} style={{display:"grid",gap:10}}><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10}}><Field label="التاريخ" value={measurementDraft.date} onChange={v=>setMeasurementDraft(p=>({...p,date:v}))} type="date" required/><Field label="الوزن (كجم)" value={measurementDraft.weightKg} onChange={v=>setMeasurementDraft(p=>({...p,weightKg:v}))} type="number" min="0.1" step="0.1"/><Field label="الخصر (سم)" value={measurementDraft.waistCm} onChange={v=>setMeasurementDraft(p=>({...p,waistCm:v}))} type="number" min="0.1" step="0.1"/><Field label="الصدر (سم)" value={measurementDraft.chestCm} onChange={v=>setMeasurementDraft(p=>({...p,chestCm:v}))} type="number" min="0.1" step="0.1"/><Field label="الذراع (سم)" value={measurementDraft.armCm} onChange={v=>setMeasurementDraft(p=>({...p,armCm:v}))} type="number" min="0.1" step="0.1"/><Field label="الفخذ (سم)" value={measurementDraft.thighCm} onChange={v=>setMeasurementDraft(p=>({...p,thighCm:v}))} type="number" min="0.1" step="0.1"/></div><Field label="ملاحظات" value={measurementDraft.notes} onChange={v=>setMeasurementDraft(p=>({...p,notes:v}))}/><Button kind="primary" type="submit">حفظ القياس</Button></form>}</Panel><Panel title="تاريخ القياسات">{data.measurements.slice().sort((a,b)=>String(b.date).localeCompare(String(a.date))).map(m=><RecordRow key={m.id} title={fmtDate(m.date)} sub={m.notes||"—"} badges={[m.weightKg!=null?"الوزن "+m.weightKg+" كجم":null,m.waistCm!=null?"الخصر "+m.waistCm+" سم":null,m.chestCm!=null?"الصدر "+m.chestCm+" سم":null,m.armCm!=null?"الذراع "+m.armCm+" سم":null,m.thighCm!=null?"الفخذ "+m.thighCm+" سم":null].filter(Boolean)}/>)}{!data.measurements.length&&<Empty title="لم تسجل قياسات بعد" body="ابدأ بقياس واحد فقط، وستظهر المقارنة التاريخية هنا."/ >}</Panel></>;
  const settingsPage = <><Panel title="تفضيلات التدريب" hint="تؤثر هذه الإعدادات على التواريخ والوحدات وطريقة التعامل مع البرامج النشطة.">{canEdit&&<form onSubmit={saveSettings} style={{display:"grid",gap:10}}><Select label="المنطقة الزمنية" value={(settingsDraft||settings).timezone} onChange={v=>setSettingsDraft(p=>({...settings,...p,timezone:v}))} options={["Africa/Cairo","UTC","Europe/London","America/New_York","Asia/Riyadh"]}/><Select label="وحدة الوزن" value={(settingsDraft||settings).weightUnit} onChange={v=>setSettingsDraft(p=>({...settings,...p,weightUnit:v}))} options={["kg","lb"]}/><Select label="وحدة المسافة" value={(settingsDraft||settings).distanceUnit} onChange={v=>setSettingsDraft(p=>({...settings,...p,distanceUnit:v}))} options={["km","mile"]}/><Select label="البرامج النشطة" value={(settingsDraft||settings).activeProgramPolicy} onChange={v=>setSettingsDraft(p=>({...settings,...p,activeProgramPolicy:v}))} options={[{value:"single",label:"برنامج أساسي واحد"},{value:"multiple",label:"السماح بأكثر من برنامج"}]}/><Field label="مؤقت الراحة الافتراضي (ثانية)" value={(settingsDraft||settings).defaultRestSeconds} onChange={v=>setSettingsDraft(p=>({...settings,...p,defaultRestSeconds:Number(v)}))} type="number" min="0" max="3600"/><Button kind="primary" type="submit">حفظ الإعدادات</Button></form>}</Panel><Panel title="النسخ الاحتياطي والاستعادة" hint="التصدير ينشئ ملف JSON. الاستيراد يضيف/يحدّث السجلات ذات المعرّفات نفسها دون حذف السجلات غير الموجودة في الملف."><div style={{display:"flex",gap:8,flexWrap:"wrap"}}><Button onClick={exportJson}>⬇ تصدير نسخة احتياطية</Button><Button onClick={()=>setShowImport(v=>!v)}>⬆ استيراد نسخة</Button></div>{showImport&&<div style={{marginTop:12,display:"grid",gap:8}}><label style={{display:"grid",gap:5,fontSize:12,color:C.muted}}>محتوى ملف JSON<textarea value={importText} onChange={e=>setImportText(e.target.value)} rows={7} style={{width:"100%",boxSizing:"border-box",border:"1px solid "+C.line,borderRadius:10,padding:10,font:"12px monospace"}}/></label><Button kind="primary" onClick={importJson}>تنفيذ الاستيراد</Button></div>}</Panel></>;

  return <div dir="rtl" style={{maxWidth:1180,margin:"0 auto",padding:"2px 0 26px",color:C.ink,fontFamily:"inherit"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"end",gap:12,flexWrap:"wrap",marginBottom:15}}><div><div style={{fontSize:23,fontWeight:900}}>{head.icon} {head.label}</div><div style={{fontSize:12,color:C.muted,marginTop:4}}>Sports OS · نظام التدريب الرياضي الشخصي {isDemo?"· وضع تجريبي":""}</div></div><div style={{display:"flex",gap:7,flexWrap:"wrap"}}>{!store.online&&!isDemo&&<span style={{fontSize:11,color:C.amber,alignSelf:"center"}}>قد توجد تغييرات تنتظر المزامنة</span>}<span style={{fontSize:11,padding:"5px 8px",borderRadius:9,background:canEdit?"#ECFDF5":"#EFF6FF",color:canEdit?C.green:"#1D4ED8"}}>{canEdit?"عرض وتعديل":"عرض فقط"}</span></div></div>
    {sectionNav}{feedback}
    {!store.ready?<Panel title="جاري تحميل بيانات الرياضة">جاري تحميل السجلات...</Panel>:null}
    {store.ready&&section==="dashboard"&&dashboard}
    {store.ready&&section==="workout"&&workout}
    {store.ready&&section==="programs"&&programsPage}
    {store.ready&&section==="exercises"&&exercisesPage}
    {store.ready&&section==="history"&&historyPage}
    {store.ready&&section==="progress"&&progressPage}
    {store.ready&&section==="goals"&&goalsPage}
    {store.ready&&section==="recovery"&&recoveryPage}
    {store.ready&&section==="measurements"&&measurementsPage}
    {store.ready&&section==="settings"&&settingsPage}
    <div style={{fontSize:10,color:C.muted,marginTop:12,lineHeight:1.8}}>تنبيه: مؤشرات الأداء والتعافي للتسجيل والمتابعة الشخصية فقط، وليست تشخيصًا أو توصية طبية. الجلسات والمجموعات المسجلة هي المصدر التاريخي للأداء؛ تعديل مكتبة التمارين لا يغيّر السجل السابق.</div>
  </div>;
}
