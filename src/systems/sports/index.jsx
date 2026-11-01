import React, { useCallback, useEffect, useMemo, useState } from "react";
import { osSectionLevel } from "../../core/core.js";
import { useRecordStore, arr, live } from "../../core/records.jsx";
import { AccessDenied } from "../../core/ui.jsx";
import { publishOSEvent } from "../integrationEvents.js";
import {
  SPORTS_SECTIONS, EXERCISE_CATEGORIES, TRACKING_MODES, PROGRAM_TYPES,
  emptySportsData, normalizeSportsData, todayInZone, makeSportsId,
  validateExercise, validateProgram, validateExerciseSet, sessionMetrics, sportsSummary, generateWorkoutDays, validatePlannedExercise,
} from "./domain.js";

const C = { ink:"#172033", muted:"#64748B", line:"#E2E8F0", bg:"#F8FAFC", accent:"#DC2626", soft:"#FEF2F2", green:"#047857", amber:"#B45309", red:"#B91C1C", white:"#FFFFFF" };
const now = () => new Date().toISOString();
const youtubeEmbedUrl = value => { const raw=String(value||"").trim(); if(!raw)return ""; try { const u=new URL(raw); let id=""; if(u.hostname==="youtu.be")id=u.pathname.slice(1); else if(u.hostname.endsWith("youtube.com")){if(u.pathname==="/watch")id=u.searchParams.get("v")||"";else if(u.pathname.startsWith("/embed/")||u.pathname.startsWith("/shorts/"))id=u.pathname.split("/")[2]||"";} return /^[\w-]{11}$/.test(id)?"https://www.youtube-nocookie.com/embed/"+id:"";}catch{return "";} };
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
  const [exerciseVideoDrafts,setExerciseVideoDrafts] = useState({});
  const [sessionId,setSessionId] = useState("");
  const [selectedScheduledDayId,setSelectedScheduledDayId] = useState("");
  const [restRemaining,setRestRemaining] = useState(0);
  const [comparisonBeforeId,setComparisonBeforeId] = useState("");
  const [comparisonAfterId,setComparisonAfterId] = useState("");
  const [exerciseDraft,setExerciseDraft] = useState({name:"",nameEn:"",category:"Strength",trackingMode:"Weight-Reps",loadType:"External",movementPattern:"Other",difficulty:"Beginner",instructions:"",youtubeUrl:""});
  const [programDraft,setProgramDraft] = useState({name:"",programType:"General Fitness",durationWeeks:12,startDate:today(),daysPerWeek:3,description:""});
  const [plannedDraft,setPlannedDraft] = useState({workoutDayId:"",exerciseId:"",targetSets:"3",targetReps:"10",restSeconds:"90",notes:""});
  const [goalDraft,setGoalDraft] = useState({name:"",type:"General Fitness",targetMetric:"Frequency",direction:"Increase",startValue:"0",targetValue:"3",unit:"جلسة/أسبوع",startDate:today(),targetDate:"",priority:"Medium"});
  const [measurementDraft,setMeasurementDraft] = useState({date:today(),weightKg:"",bodyFatPct:"",muscleMassKg:"",waistCm:"",hipCm:"",neckCm:"",chestCm:"",armCm:"",thighCm:"",frontPhotoUrl:"",sidePhotoUrl:"",backPhotoUrl:"",notes:""});
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
  const currentSession = sessions.find(s=>s.id===sessionId && ["In Progress","Paused"].includes(s.status)) || sessions.find(s=>["In Progress","Paused"].includes(s.status)&&!s.deleted_at) || null;
  const currentSessionSets = currentSession ? sets.filter(s=>s.sessionId===currentSession.id) : [];
  const filteredExercises = exercises.filter(e=>!query||[e.name,e.nameEn,e.category,e.movementPattern].some(v=>String(v||"").toLocaleLowerCase().includes(query.toLocaleLowerCase())));
  const selectedExercise = exercisesById[selectedExerciseId] || exercises[0] || null;
  const currentPlannedExercises = currentSession?.workoutDayId ? data.plannedExercises.filter(x=>x.workoutDayId===currentSession.workoutDayId&&!x.deleted_at).sort((a,b)=>(a.sortOrder||0)-(b.sortOrder||0)) : [];
  const selectedPlannedExercise = currentPlannedExercises.find(x=>x.exerciseId===selectedExerciseId) || null;
  useEffect(()=>{if(!currentSession?.restTimerEndsAt||currentSession.status!=="In Progress"){if(!currentSession?.restTimerEndsAt)setRestRemaining(0);return;}const tick=()=>setRestRemaining(Math.max(0,Math.ceil((Date.parse(currentSession.restTimerEndsAt)-Date.now())/1000)));tick();const timer=setInterval(tick,250);return()=>clearInterval(timer);},[currentSession?.id,currentSession?.restTimerEndsAt,currentSession?.status]);
  useEffect(()=>{if(selectedPlannedExercise?.targetReps!=null)setSetDraft(p=>({...p,reps:String(selectedPlannedExercise.targetReps)}));},[selectedPlannedExercise?.id,selectedPlannedExercise?.targetReps]);

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
  const startSession = async (sessionType="Free", workoutDay=null) => {
    if(currentSession){setError("هناك جلسة مفتوحة بالفعل. أنهِها أو استأنفها قبل بدء جلسة أخرى.");return;}
    const stamp=now(),id=makeSportsId("session"),planned=workoutDay?data.plannedExercises.filter(x=>x.workoutDayId===workoutDay.id&&!x.deleted_at).sort((a,b)=>(a.sortOrder||0)-(b.sortOrder||0)):[];
    const saved=await save("sessions",{id,sessionType:workoutDay?"Scheduled":sessionType,status:"In Progress",startedAt:stamp,endedAt:null,timezone:settings.timezone||"Africa/Cairo",localDate:today(settings.timezone),overallRpe:null,energyBefore:null,energyAfter:null,pausedSeconds:0,notes:"",isRetroactive:false,programId:workoutDay?.programId||null,workoutDayId:workoutDay?.id||null,plannedExerciseCount:new Set(planned.map(x=>x.exerciseId)).size,restTimerEndsAt:null,restTimerRemainingSeconds:0,clientGeneratedId:id});
    if(saved){setSessionId(id);setSelectedExerciseId(planned[0]?.exerciseId||exercises[0]?.id||"");setPage("workout");emit("sports.workout.started","workout_session",id,{sessionType:workoutDay?"Scheduled":sessionType,workoutDayId:workoutDay?.id||null,localDate:today(settings.timezone)});}
  };
  const pauseSession=async()=>{if(!currentSession||currentSession.status!=="In Progress")return;const saved=await save("sessions",{...currentSession,status:"Paused",pausedAt:now(),restTimerRemainingSeconds:restRemaining,restTimerEndsAt:null});if(saved)setRestRemaining(0);};
  const resumeSession=async()=>{if(!currentSession||currentSession.status!=="Paused")return;const p=Date.parse(currentSession.pausedAt||""),extra=Number.isFinite(p)?Math.max(0,Math.floor((Date.now()-p)/1000)):0;const saved=await save("sessions",{...currentSession,status:"In Progress",pausedAt:null,pausedSeconds:(Number(currentSession.pausedSeconds)||0)+extra,restTimerEndsAt:null});if(saved&&Number(currentSession.restTimerRemainingSeconds)>0){setRestRemaining(Number(currentSession.restTimerRemainingSeconds));await save("sessions",{...saved,restTimerEndsAt:new Date(Date.now()+Number(currentSession.restTimerRemainingSeconds)*1000).toISOString(),restTimerRemainingSeconds:0});}};
  const endRestEarly=async()=>{if(currentSession){const saved=await save("sessions",{...currentSession,restTimerEndsAt:null,restTimerRemainingSeconds:0});if(saved)setRestRemaining(0);}};
  const finishSession = async () => {
    if(!currentSession)return;
    const saved=await save("sessions",{...currentSession,status:"Completed",endedAt:now(),restTimerEndsAt:null,restTimerRemainingSeconds:0,notes:sessionNote||currentSession.notes||""});
    if(saved){setSessionNote("");emit("sports.workout.completed","workout_session",saved.id,{localDate:saved.localDate,setCount:currentSessionSets.length,exerciseCount:new Set(currentSessionSets.map(s=>s.exerciseId)).size});}
  };
  const addSet = async event => {
    event.preventDefault();
    if(!currentSession||!selectedExercise){setError("ابدأ جلسة واختر تمرينًا أولًا.");return;}
    if(currentSession.status!=="In Progress"){setError("استأنف الجلسة أولًا لتسجيل مجموعة.");return;}
    const draft={...setDraft,sessionId:currentSession.id,exerciseId:selectedExercise.id,sequence:currentSessionSets.filter(s=>s.exerciseId===selectedExercise.id).length+1,setType:"Working",side:"Both",completedAt:now(),plannedExerciseId:selectedPlannedExercise?.id||null,targetSetsSnapshot:selectedPlannedExercise?.targetSets??null,targetRepsSnapshot:selectedPlannedExercise?.targetReps??null};
    const valid=validateExerciseSet(draft,selectedExercise);
    if(!valid.ok){setError(valid.error);return;}
    const id=makeSportsId("set");
    const saved=await save("exerciseSets",{...valid.value,id,sessionId:currentSession.id,exerciseId:selectedExercise.id,sequence:draft.sequence,setType:draft.setType,side:draft.side,completedAt:draft.completedAt,plannedExerciseId:draft.plannedExerciseId,targetSetsSnapshot:draft.targetSetsSnapshot,targetRepsSnapshot:draft.targetRepsSnapshot,clientGeneratedId:id});
    if(saved){setSetDraft({reps:"10",weightKg:"",durationSeconds:"",distanceMeters:"",rpe:""});emit("sports.exercise_set.logged","exercise_set",id,{sessionId:currentSession.id,exerciseId:selectedExercise.id,plannedExerciseId:draft.plannedExerciseId});const rest=Number(selectedPlannedExercise?.restSeconds??settings.defaultRestSeconds??90);if(rest>0)await save("sessions",{...currentSession,restTimerEndsAt:new Date(Date.now()+rest*1000).toISOString(),restTimerRemainingSeconds:0});}
  };
  const saveExerciseVideo = async exercise => {
    const url=String(exerciseVideoDrafts[exercise.id]??exercise.youtubeUrl??"").trim();
    if(url&&!youtubeEmbedUrl(url)){setError("رابط يوتيوب غير صالح. استخدم رابط فيديو أو Shorts صالحًا.");return;}
    const saved=await save("exercises",{...exercise,youtubeUrl:url||null});
    if(saved){setExerciseVideoDrafts(p=>({...p,[exercise.id]:url}));setNotice("تم حفظ فيديو التمرين.");}
  };
  const createExercise = async event => {
    event.preventDefault();
    const valid=validateExercise(exerciseDraft);
    if(!valid.ok){setError(valid.error);return;}
    const id=makeSportsId("exercise");
    const video=String(exerciseDraft.youtubeUrl||"").trim();if(video&&!youtubeEmbedUrl(video)){setError("رابط يوتيوب غير صالح. استخدم رابط فيديو أو Shorts صالحًا.");return;}
    const saved=await save("exercises",{...valid.value,youtubeUrl:video||null,id,isSystemExercise:false,status:"Active",createdAt:now()});
    if(saved){setExerciseDraft({name:"",nameEn:"",category:"Strength",trackingMode:"Weight-Reps",loadType:"External",movementPattern:"Other",difficulty:"Beginner",instructions:"",youtubeUrl:""});setSelectedExerciseId(id);}
  };
  const createProgram = async event => {
    event.preventDefault();
    const valid=validateProgram(programDraft);
    if(!valid.ok){setError(valid.error);return;}
    const id=makeSportsId("program");
    const saved=await save("programs",{...valid.value,id,programType:programDraft.programType,status:"Draft",role:"Primary",createdAt:now()});
    if(saved) {
      const generated=generateWorkoutDays({...valid.value,id,programType:programDraft.programType});
      if(!generated.ok){setError(generated.error);return;}
      for(const day of generated.value) {
        const daySaved=await save("workoutDays",{...day,createdAt:now(),updatedAt:now()});
        if(!daySaved)return;
      }
      setProgramDraft({name:"",programType:"General Fitness",durationWeeks:12,startDate:today(settings.timezone),daysPerWeek:3,description:""});
      setNotice("تم إنشاء البرنامج وتوليد "+generated.value.length+" يومًا تدريبيًا تلقائيًا.");
    }
  };
  const activateProgram = async program => {
    if(settings.activeProgramPolicy==="single") {
      const active=programs.filter(p=>p.status==="Active"&&p.id!==program.id);
      for(const p of active){const ok=await save("programs",{...p,status:"Paused",pausedAt:now()});if(!ok)return;}
    }
    await save("programs",{...program,status:program.status==="Active"?"Paused":"Active",startedAt:program.status==="Active"?program.startedAt:now(),pausedAt:program.status==="Active"?now():null});
  };
  const addPlannedExercise = async event => {
    event.preventDefault();
    const day=data.workoutDays.find(x=>x.id===plannedDraft.workoutDayId);
    const exercise=exercisesById[plannedDraft.exerciseId];
    const valid=validatePlannedExercise(plannedDraft,exercise,day);
    if(!valid.ok){setError(valid.error);return;}
    const id=makeSportsId("planned-exercise");
    const saved=await save("plannedExercises",{...valid.value,id,sortOrder:data.plannedExercises.filter(x=>x.workoutDayId===day.id).length+1,createdAt:now()});
    if(saved)setPlannedDraft(p=>({...p,targetSets:"3",targetReps:"10",restSeconds:"90",notes:""}));
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
    const vals=["weightKg","bodyFatPct","muscleMassKg","waistCm","hipCm","neckCm","chestCm","armCm","thighCm"];
    if(!vals.some(k=>measurementDraft[k]!==""&&Number.isFinite(Number(measurementDraft[k]))&&Number(measurementDraft[k])>0)&&!measurementDraft.frontPhotoUrl&&!measurementDraft.sidePhotoUrl&&!measurementDraft.backPhotoUrl){setError("أدخل قياسًا واحدًا على الأقل أو رابط صورة للمقارنة.");return;}
    const record={...measurementDraft,id:makeSportsId("measurement"),createdAt:now()};vals.forEach(k=>record[k]=measurementDraft[k]===""?null:Number(record[k]));
    for(const key of ["frontPhotoUrl","sidePhotoUrl","backPhotoUrl"]){const url=String(record[key]||"").trim();if(url&&!/^https:\/\//i.test(url)){setError("روابط الصور يجب أن تبدأ بـ https://");return;}record[key]=url||null;}
    const saved=await save("measurements",record);
    if(saved)setMeasurementDraft({date:today(settings.timezone),weightKg:"",bodyFatPct:"",muscleMassKg:"",waistCm:"",hipCm:"",neckCm:"",chestCm:"",armCm:"",thighCm:"",frontPhotoUrl:"",sidePhotoUrl:"",backPhotoUrl:"",notes:""});
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
  const sessionExerciseOptions = currentPlannedExercises.length ? currentPlannedExercises.map(p=>exercisesById[p.exerciseId]).filter(Boolean) : exercises;
  const workout = (
    <>
      <Panel title={currentSession ? "تسجيل التمرين الجاري" : "بدء جلسة تدريب"} hint="كل مجموعة أو فترة تُحفظ كسجل مستقل؛ لا يتم وضع الأداء التاريخي داخل تعريف التمرين.">
        {!currentSession ? (
          <>
            <p style={{fontSize:12,color:C.muted}}>ابدأ جلسة من يوم مجدول أو جلسة حرة.</p>
            {canEdit && (
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:8,alignItems:"end"}}>
                <div>
                  <Select
                    label="اختر يومًا من الجدول"
                    value={selectedScheduledDayId}
                    onChange={setSelectedScheduledDayId}
                    options={[
                      {value:"",label:"اختيار اليوم التدريبي"},
                      ...data.workoutDays
                        .filter(d=>!d.deleted_at&&programs.some(p=>p.id===d.programId))
                        .sort((a,b)=>String(a.scheduledDate).localeCompare(String(b.scheduledDate)))
                        .map(d=>({
                          value:d.id,
                          label:(programs.find(p=>p.id===d.programId)?.name||"برنامج")+" · الأسبوع "+d.weekNumber+" · "+fmtDate(d.scheduledDate)+" · "+data.plannedExercises.filter(x=>x.workoutDayId===d.id&&!x.deleted_at).length+" تمرين"
                        }))
                    ]}
                  />
                </div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  <Button kind="primary" onClick={()=>startSession("Free")}>▶ بدء جلسة حرة</Button>
                  <Button disabled={!selectedScheduledDayId} onClick={()=>startSession("Scheduled",data.workoutDays.find(d=>d.id===selectedScheduledDayId))}>▶ بدء اليوم المحدد</Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:10,marginBottom:12}}>
              <div style={{padding:12,background:C.soft,borderRadius:10}}>
                <div style={{fontSize:11,color:C.muted}}>وقت البدء</div>
                <b>{new Date(currentSession.startedAt).toLocaleTimeString("ar-EG",{hour:"2-digit",minute:"2-digit"})}</b>
              </div>
              <div style={{padding:12,background:C.soft,borderRadius:10}}>
                <div style={{fontSize:11,color:C.muted}}>المجموعات/الفترات</div>
                <b>{currentSessionSets.length}</b>
              </div>
              <div style={{padding:12,background:C.soft,borderRadius:10}}>
                <div style={{fontSize:11,color:C.muted}}>حجم التدريب المسجل</div>
                <b>{sessionMetrics(currentSession,sets).volumeKg} كجم</b>
              </div>
            </div>
            {currentSession.status==="Paused" && (
              <div style={{display:"flex",gap:8,marginBottom:12}}>
                <Button kind="primary" onClick={resumeSession}>▶ استئناف الجلسة</Button>
              </div>
            )}
            {currentSession.status==="In Progress" && (
              <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12}}>
                <Button onClick={pauseSession}>Ⅱ إيقاف مؤقت</Button>
                <Button kind="danger" onClick={finishSession}>✓ إنهاء الجلسة</Button>
              </div>
            )}
            {currentSession.status==="In Progress" && currentSession.workoutDayId && (
              <Panel title="تمارين اليوم المجدول" hint="اختَر تمرينًا مخططًا؛ سيُربط الأداء الفعلي بالخطة.">
                {currentPlannedExercises.map(p=>{
                  const ex=exercisesById[p.exerciseId];
                  const done=currentSessionSets.filter(x=>x.plannedExerciseId===p.id).length;
                  return <RecordRow key={p.id} title={p.exerciseNameSnapshot||ex?.name||"تمرين"} sub={p.notes||"—"} badges={[done+"/"+p.targetSets+" مجموعات",p.targetReps!=null?p.targetReps+" تكرار مستهدف":"هدف مخصص","راحة "+p.restSeconds+"ث"]} action={<Button onClick={()=>setSelectedExerciseId(p.exerciseId)}>اختيار التمرين</Button>} />;
                })}
              </Panel>
            )}
            {canEdit && currentSession.status==="In Progress" && (
              <form onSubmit={addSet} style={{display:"grid",gap:11}}>
                <Select
                  label="التمرين"
                  value={selectedExerciseId||selectedExercise?.id||""}
                  onChange={setSelectedExerciseId}
                  options={sessionExerciseOptions.map(e=>({value:e.id,label:e.name+" · "+e.category}))}
                />
                {selectedPlannedExercise && (
                  <div style={{fontSize:11,color:C.accent}}>
                    الخطة: {selectedPlannedExercise.targetSets} مجموعات × {selectedPlannedExercise.targetReps??"—"} تكرار · راحة {selectedPlannedExercise.restSeconds} ثانية
                  </div>
                )}
                {selectedExercise && (
                  <div style={{fontSize:11,color:C.muted,lineHeight:1.7}}>
                    {selectedExercise.instructions||"لا توجد تعليمات مضافة."} · طريقة التتبع: {selectedExercise.trackingMode}
                    {youtubeEmbedUrl(selectedExercise.youtubeUrl) && (
                      <div style={{marginTop:8,position:"relative",paddingTop:"56.25%",borderRadius:10,overflow:"hidden",background:"#0F172A"}}>
                        <iframe title={"فيديو "+selectedExercise.name} src={youtubeEmbedUrl(selectedExercise.youtubeUrl)} style={{position:"absolute",inset:0,width:"100%",height:"100%",border:0}} loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
                      </div>
                    )}
                  </div>
                )}
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:9}}>
                  {["Weight-Reps","Reps"].includes(selectedExercise?.trackingMode) && <Field label="التكرارات" value={setDraft.reps} onChange={v=>setSetDraft(p=>({...p,reps:v}))} type="number" min="1" max="10000" required/>}
                  {selectedExercise?.trackingMode==="Weight-Reps" && <Field label="الوزن (كجم)" value={setDraft.weightKg} onChange={v=>setSetDraft(p=>({...p,weightKg:v}))} type="number" min="0" max="2000" step="0.25"/>}
                  {["Duration","Time-Distance"].includes(selectedExercise?.trackingMode) && <Field label="المدة (ثانية)" value={setDraft.durationSeconds} onChange={v=>setSetDraft(p=>({...p,durationSeconds:v}))} type="number" min="1" required/>}
                  {["Distance","Time-Distance"].includes(selectedExercise?.trackingMode) && <Field label="المسافة (متر)" value={setDraft.distanceMeters} onChange={v=>setSetDraft(p=>({...p,distanceMeters:v}))} type="number" min="1" required/>}
                  <Field label="RPE (اختياري)" value={setDraft.rpe} onChange={v=>setSetDraft(p=>({...p,rpe:v}))} type="number" min="1" max="10" step="0.5"/>
                </div>
                <Button kind="primary" type="submit">＋ تسجيل المجموعة / الفترة</Button>
              </form>
            )}
            {currentSession.status==="In Progress" && (
              <Panel title={"مؤقت الراحة · "+Math.floor(restRemaining/60)+":"+String(restRemaining%60).padStart(2,"0")} hint="يبدأ تلقائيًا بعد تسجيل المجموعة.">
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  <Button onClick={()=>{const secs=Number(selectedPlannedExercise?.restSeconds??settings.defaultRestSeconds??90);save("sessions",{...currentSession,restTimerEndsAt:secs?new Date(Date.now()+secs*1000).toISOString():null,restTimerRemainingSeconds:0});}}>بدء/إعادة المؤقت</Button>
                  <Button onClick={endRestEarly}>إنهاء الراحة</Button>
                </div>
              </Panel>
            )}
            <div style={{marginTop:16}}>
              <h3 style={{fontSize:13}}>المجموعات المسجلة</h3>
              {currentSessionSets.map((set,i)=><RecordRow key={set.id} title={(i+1)+". "+(exercisesById[set.exerciseId]?.name||"تمرين مؤرشف")} sub={[set.reps!=null?set.reps+" تكرار":null,set.weightKg!=null?set.weightKg+" كجم":null,set.durationSeconds!=null?Math.round(set.durationSeconds/60*10)/10+" دقيقة":null,set.distanceMeters!=null?set.distanceMeters+" متر":null,set.rpe!=null?"RPE "+set.rpe:null].filter(Boolean).join(" · ")||"فترة مسجلة"} badges={[set.setType||"Working"]} action={canEdit?<Button kind="danger" onClick={()=>archive("exerciseSets",set)}>أرشفة</Button>:null}/>)}
              {!currentSessionSets.length && <Empty title="ابدأ بأول مجموعة" body="اختَر التمرين وأدخل المقاييس المناسبة لطريقة تتبعه."/>}
            </div>
            <div style={{marginTop:14,display:"grid",gap:8}}>
              <Field label="ملاحظات الجلسة" value={sessionNote} onChange={setSessionNote} placeholder="إحساسك بالتمرين أو أي ملاحظة"/>
              <Button kind="primary" onClick={finishSession} disabled={currentSession.status!=="In Progress"}>✓ إنهاء الجلسة وحفظها كمكتملة</Button>
            </div>
          </>
        )}
      </Panel>
    </>
  );
  const exercisesPage = <><Panel title="إضافة تمرين إلى مكتبتك" hint="المكتبة تصف التمرين وطريقة تسجيله؛ كل أداء فعلي محفوظ في مجموعات الجلسات.">{canEdit&&<form onSubmit={createExercise} style={{display:"grid",gap:10}}><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:10}}><Field label="اسم التمرين بالعربية" value={exerciseDraft.name} onChange={v=>setExerciseDraft(p=>({...p,name:v}))} required/><Field label="الاسم بالإنجليزية (اختياري)" value={exerciseDraft.nameEn} onChange={v=>setExerciseDraft(p=>({...p,nameEn:v}))}/><Select label="التصنيف" value={exerciseDraft.category} onChange={v=>setExerciseDraft(p=>({...p,category:v}))} options={EXERCISE_CATEGORIES}/><Select label="طريقة التتبع" value={exerciseDraft.trackingMode} onChange={v=>setExerciseDraft(p=>({...p,trackingMode:v}))} options={TRACKING_MODES}/><Select label="نوع الحمل" value={exerciseDraft.loadType} onChange={v=>setExerciseDraft(p=>({...p,loadType:v}))} options={["External","Bodyweight","Weighted Bodyweight","Assisted","Improvised","None"]}/><Select label="نمط الحركة" value={exerciseDraft.movementPattern} onChange={v=>setExerciseDraft(p=>({...p,movementPattern:v}))} options={["Squat","Hinge","Push","Pull","Carry","Rotate","Locomotion","Other"]}/><Select label="الصعوبة" value={exerciseDraft.difficulty} onChange={v=>setExerciseDraft(p=>({...p,difficulty:v}))} options={["Beginner","Intermediate","Advanced"]}/></div><Field label="التعليمات وملاحظات السلامة" value={exerciseDraft.instructions} onChange={v=>setExerciseDraft(p=>({...p,instructions:v}))}/><Field label="رابط فيديو YouTube للتمرين (اختياري)" value={exerciseDraft.youtubeUrl} onChange={v=>setExerciseDraft(p=>({...p,youtubeUrl:v}))} placeholder="https://www.youtube.com/watch?v=..."/><Button kind="primary" type="submit">حفظ التمرين</Button></form>}</Panel>
    <Panel title="مكتبة التمارين" action={<span style={{fontSize:11,color:C.muted}}>{filteredExercises.length} تمرين</span>}><Field label="بحث بالاسم أو التصنيف أو نمط الحركة" value={query} onChange={setQuery} placeholder="مثال: ضغط، جري، Pull"/>{filteredExercises.map(e=><div key={e.id} style={{borderBottom:"1px solid "+C.line,paddingBottom:10,marginBottom:10}}><RecordRow title={e.name+(e.nameEn?" · "+e.nameEn:"")} sub={e.instructions||"لا توجد تعليمات"} badges={[e.category,e.trackingMode,e.difficulty||"Beginner",e.isSystemExercise?"تمرين نظامي":"تمرين مخصص"]} action={canEdit&&!e.isSystemExercise?<Button kind="danger" onClick={()=>archive("exercises",e)}>أرشفة</Button>:null}/>{canEdit&&<div style={{display:"grid",gridTemplateColumns:"minmax(180px,1fr) auto",gap:8,alignItems:"end",marginTop:8}}><Field label="رابط فيديو YouTube لهذا التمرين" value={exerciseVideoDrafts[e.id]??e.youtubeUrl??""} onChange={v=>setExerciseVideoDrafts(p=>({...p,[e.id]:v}))} placeholder="https://www.youtube.com/watch?v=..."/><Button onClick={()=>saveExerciseVideo(e)}>حفظ الفيديو</Button></div>}{youtubeEmbedUrl(exerciseVideoDrafts[e.id]??e.youtubeUrl)&&<div style={{marginTop:8,position:"relative",paddingTop:"56.25%",borderRadius:10,overflow:"hidden",background:"#0F172A"}}><iframe title={"فيديو "+e.name} src={youtubeEmbedUrl(exerciseVideoDrafts[e.id]??e.youtubeUrl)} style={{position:"absolute",inset:0,width:"100%",height:"100%",border:0}} loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"/></div>}</div>)}{!filteredExercises.length&&<Empty title="لا توجد تمارين مطابقة" body="جرّب تغيير البحث أو أضف تمرينًا جديدًا."/ >}</Panel></>;
  const programsPage = <><Panel title="إنشاء برنامج تدريبي" hint="يتم توليد أيام التدريب تلقائيًا عند إنشاء البرنامج؛ يمكنك مراجعة تاريخ كل يوم وعدد التمارين المخططة.">{canEdit&&<form onSubmit={createProgram} style={{display:"grid",gap:10}}><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:10}}><Field label="اسم البرنامج" value={programDraft.name} onChange={v=>setProgramDraft(p=>({...p,name:v}))} required/><Select label="نوع البرنامج" value={programDraft.programType} onChange={v=>setProgramDraft(p=>({...p,programType:v}))} options={PROGRAM_TYPES}/><Field label="عدد الأسابيع" value={programDraft.durationWeeks} onChange={v=>setProgramDraft(p=>({...p,durationWeeks:v}))} type="number" min="1" max="104" required/><Field label="أيام التدريب أسبوعيًا" value={programDraft.daysPerWeek} onChange={v=>setProgramDraft(p=>({...p,daysPerWeek:v}))} type="number" min="1" max="7" required/><Field label="تاريخ البداية" value={programDraft.startDate} onChange={v=>setProgramDraft(p=>({...p,startDate:v}))} type="date" required/></div><Field label="الوصف" value={programDraft.description} onChange={v=>setProgramDraft(p=>({...p,description:v}))}/><Button kind="primary" type="submit">إنشاء البرنامج</Button></form>}</Panel>
    <Panel title="إضافة تمرين إلى يوم تدريبي" hint="اربط تمرينًا من المكتبة بيوم محدد مع المجموعات والتكرارات ووقت الراحة المستهدف.">
      {canEdit&&<form onSubmit={addPlannedExercise} style={{display:"grid",gap:10}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:10}}>
          <Select label="اليوم التدريبي" value={plannedDraft.workoutDayId} onChange={v=>setPlannedDraft(p=>({...p,workoutDayId:v}))} options={[{value:"",label:"اختر اليوم"},...data.workoutDays.filter(d=>!d.deleted_at&&programs.some(p=>p.id===d.programId)).sort((a,b)=>String(a.scheduledDate).localeCompare(String(b.scheduledDate))).map(d=>({value:d.id,label:(programs.find(p=>p.id===d.programId)?.name||"برنامج")+" · الأسبوع "+d.weekNumber+" · "+fmtDate(d.scheduledDate)}))]}/>
          <Select label="التمرين" value={plannedDraft.exerciseId} onChange={v=>setPlannedDraft(p=>({...p,exerciseId:v}))} options={[{value:"",label:"اختر التمرين"},...exercises.map(e=>({value:e.id,label:e.name}))]}/>
          <Field label="المجموعات المستهدفة" value={plannedDraft.targetSets} onChange={v=>setPlannedDraft(p=>({...p,targetSets:v}))} type="number" min="1" max="30" required/>
          <Field label="التكرارات المستهدفة" value={plannedDraft.targetReps} onChange={v=>setPlannedDraft(p=>({...p,targetReps:v}))} type="number" min="1" max="10000"/>
          <Field label="الراحة (ثانية)" value={plannedDraft.restSeconds} onChange={v=>setPlannedDraft(p=>({...p,restSeconds:v}))} type="number" min="0" max="3600"/>
          <Field label="ملاحظات" value={plannedDraft.notes} onChange={v=>setPlannedDraft(p=>({...p,notes:v}))}/>
        </div><Button kind="primary" type="submit" disabled={!data.workoutDays.length||!exercises.length}>＋ إضافة التمرين المخطط</Button>
      </form>}
    </Panel>
    <Panel title="برامجي" hint="سياسة البرنامج النشط يمكن ضبطها من الإعدادات.">{programs.map(p=><div key={p.id} style={{border:"1px solid "+C.line,borderRadius:12,padding:10,marginBottom:10}}><RecordRow title={p.name} sub={p.description||p.programType+" · "+p.durationWeeks+" أسبوع"} badges={[p.status,p.programType,p.daysPerWeek+" أيام/أسبوع",fmtDate(p.startDate)]} action={canEdit?<div style={{display:"flex",gap:6,flexWrap:"wrap"}}><Button onClick={()=>activateProgram(p)}>{p.status==="Active"?"إيقاف مؤقت":"تفعيل"}</Button><Button kind="danger" onClick={()=>archive("programs",p)}>أرشفة</Button></div>:null}/><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(145px,1fr))",gap:7,marginTop:8}}>{data.workoutDays.filter(d=>d.programId===p.id&&!d.deleted_at).sort((a,b)=>String(a.scheduledDate).localeCompare(String(b.scheduledDate))).slice(0,Math.max(7,Number(p.daysPerWeek)||3)).map(d=><div key={d.id} style={{background:C.bg,border:"1px solid "+C.line,borderRadius:9,padding:8,fontSize:11}}><b>{d.title} · الأسبوع {d.weekNumber}</b><div style={{color:C.muted,marginTop:4}}>{fmtDate(d.scheduledDate)}</div><div style={{color:C.accent,marginTop:4}}>{data.plannedExercises.filter(x=>x.workoutDayId===d.id&&!x.deleted_at).length} تمرين مخطط</div>{data.plannedExercises.filter(x=>x.workoutDayId===d.id&&!x.deleted_at).sort((a,b)=>(a.sortOrder||0)-(b.sortOrder||0)).map(x=><div key={x.id} style={{marginTop:5,color:C.muted,lineHeight:1.6}}>{x.exerciseNameSnapshot||exercisesById[x.exerciseId]?.name||"تمرين"} · {x.targetSets} × {x.targetReps??"—"} · راحة {x.restSeconds}ث</div>)}{canEdit&&<div style={{marginTop:9}}><Button kind="primary" disabled={!data.plannedExercises.some(x=>x.workoutDayId===d.id&&!x.deleted_at)} onClick={()=>startSession("Scheduled",d)}>▶ بدء هذا اليوم</Button></div>}</div>)}</div></div>)}{!programs.length&&<Empty title="لا توجد برامج بعد" body="أنشئ برنامج قوة أو جري أو لياقة عامة لتوثيق خطتك."/ >}</Panel></>;
  const historyPage = <Panel title="سجل التدريب" hint="الجلسة المكتملة هي المصدر الأساسي للتاريخ؛ الأرقام المشتقة تُحسب من سجلات المجموعات.">{summary.recentSessions.map(x=><RecordRow key={x.session.id} title={fmtDate(x.session.localDate)+" · "+(x.session.sessionType==="Free"?"جلسة حرة":x.session.sessionType)} sub={x.session.notes||"—"} badges={[x.session.status,x.setCount+" مجموعة/فترة",x.totalReps+" تكرار",x.volumeKg+" كجم",x.durationMinutes==null?"المدة غير محسوبة":x.durationMinutes+" دقيقة"]}/>)}{!summary.recentSessions.length&&<Empty title="لا توجد جلسات محفوظة" body="سجّل أول جلسة تدريب لتكوين سجل تاريخي."/ >}</Panel>;
  const adherenceSessions = sessions.filter(x=>x.workoutDayId&&["Completed","In Progress","Paused"].includes(x.status));
  const adherenceRows = adherenceSessions.map(session=>{const planned=data.plannedExercises.filter(p=>p.workoutDayId===session.workoutDayId&&!p.deleted_at);const actual=sets.filter(set=>set.sessionId===session.id&&!set.deleted_at);const plannedSets=planned.reduce((n,p)=>n+(Number(p.targetSets)||0),0);const targetReps=planned.reduce((n,p)=>n+(Number(p.targetSets)||0)*(Number(p.targetReps)||0),0);const completedPlannedSets=actual.filter(set=>set.plannedExerciseId).length;const actualReps=actual.filter(set=>set.plannedExerciseId).reduce((n,set)=>n+(Number(set.reps)||0),0);const plannedExercises=planned.length;const exercised=new Set(actual.map(set=>set.plannedExerciseId).filter(Boolean)).size;return {session,plannedSets,targetReps,actualReps,completedPlannedSets,plannedExercises,exercised,percentage:plannedSets?Math.min(100,Math.round(completedPlannedSets/plannedSets*100)):0};});
  const progressPage = <><Panel title="مؤشرات التقدم" hint="الحجم محسوب من الوزن × التكرارات للسجلات التي تحتوي على القيمتين. تمارين وزن الجسم لا تُحسب في حجم الأوزان افتراضيًا."><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:10}}><Metric label="أفضل أرقام تقديرية (1RM)" value={summary.prs.length} detail="لكل تمرين مسجل بوزن وتكرارات"/><Metric label="إجمالي مجموعات/فترات" value={sets.length}/><Metric label="إجمالي التكرارات" value={sets.reduce((n,s)=>n+(Number(s.reps)||0),0)}/><Metric label="مسافة مسجلة" value={(sets.reduce((n,s)=>n+(Number(s.distanceMeters)||0),0)/1000).toLocaleString("ar-EG",{maximumFractionDigits:2})+" كم"}/></div></Panel>
    <Panel title="الالتزام بالخطة التدريبية" hint="تُحسب المجموعات المنفذة من سجلات الأداء المرتبطة بالتمرين المخطط؛ السجلات القديمة غير المرتبطة بخطة لا تُعدّل ولا تُحتسب ضمن هذا القياس."><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:10,marginBottom:10}}><Metric label="جلسات مجدولة بدأ تنفيذها" value={adherenceRows.length}/><Metric label="مجموعات مستهدفة" value={adherenceRows.reduce((n,x)=>n+x.plannedSets,0)}/><Metric label="مجموعات مرتبطة بالأداء الفعلي" value={adherenceRows.reduce((n,x)=>n+x.completedPlannedSets,0)}/><Metric label="التكرارات المستهدفة" value={adherenceRows.reduce((n,x)=>n+x.targetReps,0)}/><Metric label="التكرارات الفعلية المرتبطة" value={adherenceRows.reduce((n,x)=>n+x.actualReps,0)}/></div>{adherenceRows.slice().sort((a,b)=>String(b.session.startedAt).localeCompare(String(a.session.startedAt))).map(x=><RecordRow key={x.session.id} title={fmtDate(x.session.localDate)+" · "+(data.programs.find(p=>p.id===x.session.programId)?.name||"برنامج تدريبي")} sub={"تم تنفيذ "+x.completedPlannedSets+" من "+x.plannedSets+" مجموعة مستهدفة · "+x.actualReps+" من "+x.targetReps+" تكرار مستهدف · "+x.exercised+" من "+x.plannedExercises+" تمرين"} badges={[x.session.status,x.percentage+"% من المجموعات"]}/>)}{!adherenceRows.length&&<Empty title="لا توجد بيانات التزام بعد" body="ابدأ جلسة من يوم مجدول وسجّل المجموعات المخططة لعرض مقارنة الهدف بالأداء."/ >}</Panel><Panel title="الأرقام القياسية التقديرية" hint="تقدير Epley متاح فقط للمجموعات المسجلة بوزن وتكرارات من 1 إلى 12. لا يمثل اختبارًا فعليًا لأقصى وزن.">{summary.prs.map(pr=><RecordRow key={pr.exerciseId} title={pr.exerciseName} sub={"أفضل 1RM تقديري: "+pr.value+" كجم · "+fmtDate(pr.date)} badges={["Epley"]}/>)}{!summary.prs.length&&<Empty title="لا توجد أرقام بعد" body="سجّل مجموعة بوزن وتكرارات مناسبة لحساب تقدير اختياري."/ >}</Panel></>;
  const goalsPage = <><Panel title="إضافة هدف رياضي">{canEdit&&<form onSubmit={createGoal} style={{display:"grid",gap:10}}><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:10}}><Field label="اسم الهدف" value={goalDraft.name} onChange={v=>setGoalDraft(p=>({...p,name:v}))} required/><Select label="نوع الهدف" value={goalDraft.type} onChange={v=>setGoalDraft(p=>({...p,type:v}))} options={["Strength","Muscle","Fat Loss","Endurance","Distance","Speed","Mobility","General Fitness","Sport Performance"]}/><Select label="اتجاه التقدم" value={goalDraft.direction} onChange={v=>setGoalDraft(p=>({...p,direction:v}))} options={["Increase","Decrease","Maintain"]}/><Field label="قيمة البداية" value={goalDraft.startValue} onChange={v=>setGoalDraft(p=>({...p,startValue:v}))} type="number" step="any" required/><Field label="القيمة المستهدفة" value={goalDraft.targetValue} onChange={v=>setGoalDraft(p=>({...p,targetValue:v}))} type="number" step="any" required/><Field label="الوحدة" value={goalDraft.unit} onChange={v=>setGoalDraft(p=>({...p,unit:v}))}/><Field label="تاريخ البداية" value={goalDraft.startDate} onChange={v=>setGoalDraft(p=>({...p,startDate:v}))} type="date" required/><Field label="الموعد المستهدف" value={goalDraft.targetDate} onChange={v=>setGoalDraft(p=>({...p,targetDate:v}))} type="date"/></div><Button kind="primary" type="submit">حفظ الهدف</Button></form>}</Panel><Panel title="الأهداف النشطة">{data.goals.filter(g=>!g.deleted_at).map(g=><RecordRow key={g.id} title={g.name} sub={g.description||("من "+g.startValue+" إلى "+g.targetValue+" "+(g.unit||""))} badges={[g.status,g.direction,g.type]} action={canEdit?<Button onClick={()=>save("goals",{...g,status:g.status==="Active"?"Paused":"Active"})}>{g.status==="Active"?"إيقاف":"استئناف"}</Button>:null}/>)}{!data.goals.length&&<Empty title="ابدأ بهدف واضح" body="حدد مقياسًا وموعدًا، ثم راجع تقدمك دوريًا."/ >}</Panel></>;
  const recoveryPage = <><Panel title="سجل التعافي اليومي" hint="مؤشرات ذاتية لملاحظة الاتجاهات فقط، وليست تشخيصًا طبيًا.">{canEdit&&<form onSubmit={createRecovery} style={{display:"grid",gap:10}}><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:10}}><Field label="التاريخ" value={recoveryDraft.date} onChange={v=>setRecoveryDraft(p=>({...p,date:v}))} type="date" required/><Field label="النوم (ساعات)" value={recoveryDraft.sleepHours} onChange={v=>setRecoveryDraft(p=>({...p,sleepHours:v}))} type="number" min="0" max="24" step="0.25"/><Select label="الطاقة (1–5)" value={recoveryDraft.energy} onChange={v=>setRecoveryDraft(p=>({...p,energy:v}))} options={["1","2","3","4","5"]}/><Select label="التوتر (1–5)" value={recoveryDraft.stress} onChange={v=>setRecoveryDraft(p=>({...p,stress:v}))} options={["1","2","3","4","5"]}/><Select label="الإجهاد العضلي (1–5)" value={recoveryDraft.soreness} onChange={v=>setRecoveryDraft(p=>({...p,soreness:v}))} options={["1","2","3","4","5"]}/></div><Field label="ملاحظات" value={recoveryDraft.notes} onChange={v=>setRecoveryDraft(p=>({...p,notes:v}))}/><Button kind="primary" type="submit">تسجيل التعافي</Button></form>}</Panel><Panel title="آخر سجلات التعافي">{data.recoveryLogs.slice().sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,14).map(x=><RecordRow key={x.id} title={fmtDate(x.date)} sub={x.notes||"—"} badges={["النوم "+(x.sleepHours??"—")+" س","الطاقة "+x.energy+"/5","التوتر "+x.stress+"/5","الإجهاد "+x.soreness+"/5"]}/>)}{!data.recoveryLogs.length&&<Empty title="لا توجد سجلات تعافٍ" body="سجل النوم والطاقة والإجهاد لملاحظة الأنماط."/ >}</Panel></>;
  const measurementsPage = <><Panel title="إضافة قياسات جسم وصور تقدم" hint="سجّل الدهون والكتلة العضلية ومحيطات الجسم وروابط الصور. حافظ على إضاءة ووضعية متقاربة للمقارنة.">{canEdit&&<form onSubmit={createMeasurement} style={{display:"grid",gap:10}}><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10}}><Field label="التاريخ" value={measurementDraft.date} onChange={v=>setMeasurementDraft(p=>({...p,date:v}))} type="date" required/><Field label="الوزن (كجم)" value={measurementDraft.weightKg} onChange={v=>setMeasurementDraft(p=>({...p,weightKg:v}))} type="number" min="0.1" step="0.1"/><Field label="نسبة الدهون (%)" value={measurementDraft.bodyFatPct} onChange={v=>setMeasurementDraft(p=>({...p,bodyFatPct:v}))} type="number" min="0.1" max="75" step="0.1"/><Field label="الكتلة العضلية (كجم)" value={measurementDraft.muscleMassKg} onChange={v=>setMeasurementDraft(p=>({...p,muscleMassKg:v}))} type="number" min="0.1" step="0.1"/><Field label="الخصر (سم)" value={measurementDraft.waistCm} onChange={v=>setMeasurementDraft(p=>({...p,waistCm:v}))} type="number" min="0.1" step="0.1"/><Field label="الورك (سم)" value={measurementDraft.hipCm} onChange={v=>setMeasurementDraft(p=>({...p,hipCm:v}))} type="number" min="0.1" step="0.1"/><Field label="الرقبة (سم)" value={measurementDraft.neckCm} onChange={v=>setMeasurementDraft(p=>({...p,neckCm:v}))} type="number" min="0.1" step="0.1"/><Field label="الصدر (سم)" value={measurementDraft.chestCm} onChange={v=>setMeasurementDraft(p=>({...p,chestCm:v}))} type="number" min="0.1" step="0.1"/><Field label="الذراع (سم)" value={measurementDraft.armCm} onChange={v=>setMeasurementDraft(p=>({...p,armCm:v}))} type="number" min="0.1" step="0.1"/><Field label="الفخذ (سم)" value={measurementDraft.thighCm} onChange={v=>setMeasurementDraft(p=>({...p,thighCm:v}))} type="number" min="0.1" step="0.1"/></div><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:10}}><Field label="رابط صورة أمامية (HTTPS)" value={measurementDraft.frontPhotoUrl} onChange={v=>setMeasurementDraft(p=>({...p,frontPhotoUrl:v}))} placeholder="https://..."/><Field label="رابط صورة جانبية (HTTPS)" value={measurementDraft.sidePhotoUrl} onChange={v=>setMeasurementDraft(p=>({...p,sidePhotoUrl:v}))} placeholder="https://..."/><Field label="رابط صورة خلفية (HTTPS)" value={measurementDraft.backPhotoUrl} onChange={v=>setMeasurementDraft(p=>({...p,backPhotoUrl:v}))} placeholder="https://..."/></div><Field label="ملاحظات" value={measurementDraft.notes} onChange={v=>setMeasurementDraft(p=>({...p,notes:v}))}/><Button kind="primary" type="submit">حفظ القياس والصور</Button></form>}</Panel><Panel title="مقارنة قبل وبعد" hint="اختر سجلين لعرض التغيّر في الوزن والدهون والكتلة العضلية والمحيطات والصور."><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:10}}><Select label="قبل" value={comparisonBeforeId} onChange={setComparisonBeforeId} options={[{value:"",label:"اختر القياس الأول"},...data.measurements.slice().sort((a,b)=>String(a.date).localeCompare(String(b.date))).map(m=>({value:m.id,label:fmtDate(m.date)}))]}/><Select label="بعد" value={comparisonAfterId} onChange={setComparisonAfterId} options={[{value:"",label:"اختر القياس الثاني"},...data.measurements.slice().sort((a,b)=>String(a.date).localeCompare(String(b.date))).map(m=>({value:m.id,label:fmtDate(m.date)}))]}/></div>{(()=>{const before=data.measurements.find(m=>m.id===comparisonBeforeId),after=data.measurements.find(m=>m.id===comparisonAfterId);if(!before||!after)return <p style={{fontSize:12,color:C.muted}}>اختَر تاريخين لعرض المقارنة.</p>;const metrics=[["weightKg","الوزن","كجم"],["bodyFatPct","نسبة الدهون","%"],["muscleMassKg","الكتلة العضلية","كجم"],["waistCm","الخصر","سم"],["hipCm","الورك","سم"],["neckCm","الرقبة","سم"],["chestCm","الصدر","سم"],["armCm","الذراع","سم"],["thighCm","الفخذ","سم"]];return <><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:8,marginTop:12}}>{metrics.map(([key,label,unit])=>{if(before[key]==null&&after[key]==null)return null;const delta=before[key]!=null&&after[key]!=null?Math.round((Number(after[key])-Number(before[key]))*100)/100:null;return <div key={key} style={{border:"1px solid "+C.line,borderRadius:10,padding:10}}><div style={{fontSize:11,color:C.muted}}>{label}</div><b>{before[key]??"—"} → {after[key]??"—"} {unit}</b><div style={{fontSize:11,color:delta==null?C.muted:delta>0?C.accent:delta<0?C.green:C.muted,marginTop:4}}>{delta==null?"لا توجد قيمتان":(delta>0?"+":"")+delta+" "+unit}</div></div>})}</div><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:12,marginTop:14}}>{[["أمامي","frontPhotoUrl"],["جانبي","sidePhotoUrl"],["خلفي","backPhotoUrl"]].map(([label,key])=><div key={key}><b style={{fontSize:12}}>{label}</b><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginTop:6}}>{[before,after].map((m,i)=><div key={m.id} style={{minWidth:0}}><div style={{fontSize:10,color:C.muted,marginBottom:4}}>{i===0?"قبل":"بعد"} · {fmtDate(m.date)}</div>{m[key]?<img src={m[key]} alt={label+" "+(i===0?"قبل":"بعد")} loading="lazy" style={{width:"100%",aspectRatio:"3/4",objectFit:"cover",borderRadius:8,border:"1px solid "+C.line}}/>:<div style={{aspectRatio:"3/4",display:"grid",placeItems:"center",background:C.bg,borderRadius:8,color:C.muted,fontSize:11}}>لا توجد صورة</div>}</div>)}</div></div>)}</div></>})()}</Panel><Panel title="سجل القياسات">{data.measurements.slice().sort((a,b)=>String(b.date).localeCompare(String(a.date))).map(m=><RecordRow key={m.id} title={fmtDate(m.date)} sub={m.notes||"—"} badges={[m.weightKg!=null?"الوزن "+m.weightKg+" كجم":null,m.bodyFatPct!=null?"الدهون "+m.bodyFatPct+"%":null,m.muscleMassKg!=null?"العضلات "+m.muscleMassKg+" كجم":null,m.waistCm!=null?"الخصر "+m.waistCm+" سم":null,m.hipCm!=null?"الورك "+m.hipCm+" سم":null,m.chestCm!=null?"الصدر "+m.chestCm+" سم":null,m.armCm!=null?"الذراع "+m.armCm+" سم":null,m.thighCm!=null?"الفخذ "+m.thighCm+" سم":null].filter(Boolean)}/>)}{!data.measurements.length&&<Empty title="لم تسجل قياسات بعد" body="ابدأ بقياس واحد فقط، وستظهر المقارنة التاريخية هنا."/ >}</Panel></>;
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
