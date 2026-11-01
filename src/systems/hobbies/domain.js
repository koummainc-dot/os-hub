export const HOBBY_STATUSES = ["considering", "active", "paused", "archived"];
export const HOBBY_CATEGORIES = [
{id:"creative",label:"فنون وإبداع",icon:"🎨"},{id:"music",label:"موسيقى",icon:"🎵"},{id:"sports",label:"رياضة وحركة",icon:"🏃"},{id:"outdoors",label:"أنشطة خارجية",icon:"🌿"},{id:"crafts",label:"حرف وصناعة",icon:"🛠️"},{id:"technology",label:"تقنية",icon:"💻"},{id:"games",label:"ألعاب",icon:"🎮"},{id:"collecting",label:"جمع المقتنيات",icon:"📚"},{id:"culture",label:"ثقافة ومعرفة",icon:"🌍"},{id:"other",label:"أخرى",icon:"✨"}];
export const HOBBY_SECTIONS = [{id:"dashboard",label:"الرئيسية",icon:"⌂"},{id:"hobbies",label:"هواياتي",icon:"🎯"},{id:"explore",label:"اهتمامات مستقبلية",icon:"🔎"},{id:"sessions",label:"جلسات الممارسة",icon:"⏱️"},{id:"skills",label:"المهارات والتقدم",icon:"📈"},{id:"milestones",label:"الإنجازات",icon:"🏆"},{id:"goals",label:"الأهداف",icon:"🎯"},{id:"plans",label:"خطط الممارسة",icon:"🗓️"},{id:"settings",label:"الإعدادات",icon:"⚙️"}];
export const emptyHobbiesData = () => ({schemaVersion:2,hobbies:[],sessions:[],skills:[],skillLogs:[],milestones:[],settings:{timezone:"Africa/Cairo",weekStartDay:6}});
export const makeHobbyId = (prefix="hobby") => globalThis.crypto?.randomUUID?.() || prefix+"-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,8);
export function validateHobby(input) {
const name=String(input?.name||"").trim(); if(!name)return {ok:false,error:"اسم الهواية مطلوب."}; if(name.length>120)return {ok:false,error:"اسم الهواية يجب ألا يتجاوز 120 حرفًا."};
if(!HOBBY_STATUSES.includes(input.status))return {ok:false,error:"حالة الهواية غير صحيحة."}; if(!HOBBY_CATEGORIES.some(x=>x.id===input.categoryId))return {ok:false,error:"اختر تصنيفًا صحيحًا."};
const rating=input.enjoymentRating===""||input.enjoymentRating==null?null:Number(input.enjoymentRating); if(rating!==null&&(!Number.isInteger(rating)||rating<1||rating>5))return {ok:false,error:"تقييم الاستمتاع يجب أن يكون من 1 إلى 5."};
return {ok:true,value:{...input,name,description:String(input.description||"").trim(),motivation:String(input.motivation||"").trim(),enjoymentRating:rating}};}
export function validateHobbySession(input,hobby) {
if(!hobby||hobby.status==="archived")return {ok:false,error:"لا يمكن تسجيل جلسة لهواية غير متاحة."}; const date=String(input.localDate||"");
if(!/^\\d{4}-\\d{2}-\\d{2}$/.test(date)||Number.isNaN(Date.parse(date+"T12:00:00Z"))||new Date(date+"T12:00:00Z").toISOString().slice(0,10)!==date)return {ok:false,error:"تاريخ الجلسة غير صالح."};
const duration=input.durationMinutes===""||input.durationMinutes==null?null:Number(input.durationMinutes); if(duration!==null&&(!Number.isInteger(duration)||duration<1||duration>1440))return {ok:false,error:"مدة الجلسة يجب أن تكون من دقيقة إلى 24 ساعة."};
const rating=input.satisfactionRating===""||input.satisfactionRating==null?null:Number(input.satisfactionRating); if(rating!==null&&(!Number.isInteger(rating)||rating<1||rating>5))return {ok:false,error:"تقييم الجلسة يجب أن يكون من 1 إلى 5."};
return {ok:true,value:{...input,localDate:date,durationMinutes:duration,satisfactionRating:rating,notes:String(input.notes||"").trim()}};}
export function hobbyMetrics(hobbyId,hobbies,sessions) {
const hobby=hobbies.find(x=>x.id===hobbyId); const rows=sessions.filter(x=>x.hobbyId===hobbyId&&!x.deleted_at); const minutes=rows.reduce((n,x)=>n+(Number(x.durationMinutes)||0),0);
const dates=new Set(rows.map(x=>x.localDate)); const last=rows.map(x=>x.localDate).sort().slice(-1)[0]||null;
return {hobbyId,sessionCount:rows.length,totalMinutes:minutes,totalHours:Math.round(minutes/60*10)/10,practiceDays:dates.size,lastPracticedAt:last,hobbyName:hobby?.name||"—"};}
export function hobbiesSummary(hobbies,sessions,date) {
const visible=hobbies.filter(x=>!x.deleted_at&&x.status!=="archived"); const completed=sessions.filter(x=>!x.deleted_at&&x.localDate<=date);
const weekStart=new Date(date+"T12:00:00Z"); weekStart.setUTCDate(weekStart.getUTCDate()-((weekStart.getUTCDay()-6+7)%7)); const from=weekStart.toISOString().slice(0,10); const week=completed.filter(x=>x.localDate>=from);
return {activeCount:visible.filter(x=>x.status==="active").length,consideringCount:visible.filter(x=>x.status==="considering").length,weekSessions:week.length,weekMinutes:week.reduce((n,x)=>n+(Number(x.durationMinutes)||0),0),recent:completed.slice().sort((a,b)=>(b.localDate||"").localeCompare(a.localDate||"")).slice(0,6),weekStart:from};}
export function validateHobbiesImport(value) {
const source=value?.data&&typeof value.data==="object"?value.data:value; if(!source||typeof source!=="object"||!Array.isArray(source.hobbies)||!Array.isArray(source.sessions))return {ok:false,error:"ملف الاستيراد يجب أن يحتوي على hobbies وsessions."};
for(const key of ["hobbies","sessions"]){const ids=new Set();for(const row of source[key]){if(!row||typeof row!=="object"||!String(row.id||"").trim())return {ok:false,error:"يوجد سجل بدون معرّف داخل "+key+"."};if(ids.has(row.id))return {ok:false,error:"يوجد معرّف مكرر داخل "+key+"."};ids.add(row.id);}}
const hobbyIds=new Set(source.hobbies.map(x=>x.id)); if(source.sessions.some(x=>!hobbyIds.has(x.hobbyId)))return {ok:false,error:"توجد جلسة مرتبطة بهواية غير موجودة."};
return {ok:true,value:{schemaVersion:1,hobbies:source.hobbies,sessions:source.sessions,settings:source.settings||{timezone:"Africa/Cairo",weekStartDay:6}}};}


export const HOBBY_SKILL_MEASUREMENT_TYPES = ["descriptive", "number", "level", "checklist"];
export const HOBBY_SKILL_LEVELS = ["beginner", "novice", "intermediate", "advanced", "expert"];
export const HOBBY_MILESTONE_TYPES = ["achievement", "first_time", "personal_best", "completion", "recognition", "other"];
export function validateHobbySkill(input, hobby) {
  if (!hobby || hobby.status === "archived") return {ok:false,error:"اختر هواية موجودة وغير مؤرشفة."};
  const name=String(input?.name||"").trim();
  if (!name || name.length>120) return {ok:false,error:"اسم المهارة مطلوب وبحد أقصى 120 حرفًا."};
  const measurementType=input.measurementType||"descriptive";
  if (!HOBBY_SKILL_MEASUREMENT_TYPES.includes(measurementType)) return {ok:false,error:"طريقة قياس المهارة غير صحيحة."};
  const unit=String(input.unit||"").trim();
  const parse=(v)=>v===""||v==null?null:Number(v);
  const currentValue=parse(input.currentValue), targetValue=parse(input.targetValue);
  if (["number","level"].includes(measurementType)) {
    for (const [label,value] of [["القيمة الحالية",currentValue],["المستهدف",targetValue]]) if(value!==null&&(!Number.isFinite(value)||value<0)) return {ok:false,error:label+" يجب أن تكون رقمًا موجبًا أو صفرًا."};
    if(measurementType==="level"&&[currentValue,targetValue].some(v=>v!==null&&!Number.isInteger(v))) return {ok:false,error:"المستوى يجب أن يكون عددًا صحيحًا."};
    if(currentValue!==null&&targetValue!==null&&targetValue<currentValue) return {ok:false,error:"المستهدف لا يمكن أن يقل عن القيمة الحالية."};
  }
  return {ok:true,value:{...input,name,measurementType,unit,currentValue:measurementType==="number"||measurementType==="level"?currentValue:null,targetValue:measurementType==="number"||measurementType==="level"?targetValue:null,description:String(input.description||"").trim()}};
}
export function validateHobbySkillLog(input, skill) {
  if(!skill) return {ok:false,error:"المهارة المرتبطة غير موجودة."};
  const date=String(input.localDate||"");
  if(!/^\\d{4}-\\d{2}-\\d{2}$/.test(date)||Number.isNaN(Date.parse(date+"T12:00:00Z"))||new Date(date+"T12:00:00Z").toISOString().slice(0,10)!==date) return {ok:false,error:"تاريخ التقدم غير صالح."};
  const parse=v=>v===""||v==null?null:Number(v);
  const previousValue=parse(input.previousValue),newValue=parse(input.newValue);
  if(skill.measurementType==="number"||skill.measurementType==="level"){
    if(newValue===null||!Number.isFinite(newValue)||newValue<0) return {ok:false,error:"القيمة الجديدة مطلوبة ويجب أن تكون صفرًا أو أكثر."};
    if(skill.measurementType==="level"&&!Number.isInteger(newValue)) return {ok:false,error:"المستوى الجديد يجب أن يكون عددًا صحيحًا."};
    if(previousValue!==null&&(!Number.isFinite(previousValue)||previousValue<0)) return {ok:false,error:"القيمة السابقة غير صحيحة."};
  }
  return {ok:true,value:{...input,localDate:date,previousValue,newValue,note:String(input.note||"").trim(),evidenceUrl:String(input.evidenceUrl||"").trim()}};
}
export function validateHobbyMilestone(input,hobbies,skills=[]) {
  const title=String(input?.title||"").trim();
  if(!title||title.length>160) return {ok:false,error:"عنوان الإنجاز مطلوب وبحد أقصى 160 حرفًا."};
  if(!hobbies.some(h=>h.id===input.hobbyId)) return {ok:false,error:"الهواية المرتبطة غير موجودة."};
  if(input.skillId&&!skills.some(s=>s.id===input.skillId&&s.hobbyId===input.hobbyId)) return {ok:false,error:"المهارة المرتبطة لا تتبع هذه الهواية."};
  if(!HOBBY_MILESTONE_TYPES.includes(input.milestoneType||"achievement")) return {ok:false,error:"نوع الإنجاز غير صحيح."};
  const date=String(input.achievedAt||"");
  if(!/^\\d{4}-\\d{2}-\\d{2}$/.test(date)||Number.isNaN(Date.parse(date+"T12:00:00Z"))||new Date(date+"T12:00:00Z").toISOString().slice(0,10)!==date) return {ok:false,error:"تاريخ الإنجاز غير صالح."};
  return {ok:true,value:{...input,title,achievedAt:date,description:String(input.description||"").trim(),evidenceUrl:String(input.evidenceUrl||"").trim()}};
}
export function validateHobbiesProgressImport(value) {
  const base=validateHobbiesImport(value);
  if(!base.ok)return base;
  const source=value?.data&&typeof value.data==="object"?value.data:value;
  const collections=["skills","skillLogs","milestones","goals","plans"];
  for(const key of collections) if(source[key]!==undefined&&!Array.isArray(source[key])) return {ok:false,error:"مجموعة "+key+" يجب أن تكون قائمة."};
  const skills=source.skills||[],logs=source.skillLogs||[],milestones=source.milestones||[],goals=source.goals||[],plans=source.plans||[];
  const unique=(rows,key)=>{const ids=new Set();for(const row of rows){if(!row||!String(row.id||"").trim()||ids.has(row.id))return false;ids.add(row.id);}return true;};
  if(!unique(skills,"id")||!unique(logs,"id")||!unique(milestones,"id")||!unique(goals,"id")||!unique(plans,"id"))return {ok:false,error:"يوجد معرّف مفقود أو مكرر في بيانات التقدم."};
  const hobbyIds=new Set(base.value.hobbies.map(h=>h.id)),skillIds=new Set(skills.map(s=>s.id));
  if(skills.some(s=>!hobbyIds.has(s.hobbyId))||logs.some(l=>!skillIds.has(l.skillId))||milestones.some(m=>!hobbyIds.has(m.hobbyId)||(m.skillId&&!skillIds.has(m.skillId))))return {ok:false,error:"توجد علاقة غير صحيحة في بيانات المهارات أو الإنجازات."};
  const skillById=new Map(skills.map(s=>[s.id,s]));
  if(logs.some(l=>!skillById.has(l.skillId)))return {ok:false,error:"يوجد سجل تقدم لمهارة غير موجودة."};
  if(milestones.some(m=>m.skillId&&(!skillById.has(m.skillId)||skillById.get(m.skillId).hobbyId!==m.hobbyId)))return {ok:false,error:"المهارة المرتبطة بالإنجاز لا تتبع الهواية المحددة."};
  return {ok:true,value:{...base.value,schemaVersion:2,skills,skillLogs:logs,milestones}};
}


export const HOBBY_GOAL_TARGET_TYPES=["sessions","minutes","skill_value","milestones"];
export const HOBBY_GOAL_STATUSES=["active","completed","paused","cancelled"];
export const HOBBY_PLAN_CADENCES=["weekly","monthly"];
const validISODate=value=>{const d=String(value||"");return /^\\d{4}-\\d{2}-\\d{2}$/.test(d)&&!Number.isNaN(Date.parse(d+"T12:00:00Z"))&&new Date(d+"T12:00:00Z").toISOString().slice(0,10)===d;};
export function validateHobbyGoal(input,hobbies,skills=[]){
 const title=String(input?.title||"").trim(),hobby=hobbies.find(h=>h.id===input.hobbyId);
 if(!title||title.length>160)return {ok:false,error:"عنوان الهدف مطلوب وبحد أقصى 160 حرفًا."};
 if(!hobby||hobby.status==="archived")return {ok:false,error:"اختر هواية موجودة وغير مؤرشفة."};
 const targetType=input.targetType||"sessions";
 if(!HOBBY_GOAL_TARGET_TYPES.includes(targetType))return {ok:false,error:"نوع مستهدف الهدف غير صحيح."};
 const targetValue=Number(input.targetValue);
 if(!Number.isFinite(targetValue)||targetValue<=0)return {ok:false,error:"قيمة المستهدف يجب أن تكون أكبر من صفر."};
 if(["sessions","minutes","milestones"].includes(targetType)&&!Number.isInteger(targetValue))return {ok:false,error:"المستهدف يجب أن يكون عددًا صحيحًا."};
 if(targetType==="skill_value"&&!skills.some(s=>s.id===input.skillId&&s.hobbyId===input.hobbyId))return {ok:false,error:"اختر مهارة تابعة لنفس الهواية."};
 if(!validISODate(input.startDate))return {ok:false,error:"تاريخ بداية الهدف غير صالح."};
 if(input.endDate&&(!validISODate(input.endDate)||input.endDate<input.startDate))return {ok:false,error:"تاريخ نهاية الهدف غير صالح أو يسبق البداية."};
 if(!HOBBY_GOAL_STATUSES.includes(input.status||"active"))return {ok:false,error:"حالة الهدف غير صحيحة."};
 return {ok:true,value:{...input,title,hobbyId:hobby.id,targetType,targetValue,skillId:targetType==="skill_value"?input.skillId:null,startDate:input.startDate,endDate:input.endDate||null,status:input.status||"active",description:String(input.description||"").trim()}};
}
export function validateHobbyPlan(input,hobbies){
 const title=String(input?.title||"").trim(),hobby=hobbies.find(h=>h.id===input.hobbyId);
 if(!title||title.length>160)return {ok:false,error:"اسم الخطة مطلوب وبحد أقصى 160 حرفًا."};
 if(!hobby||hobby.status==="archived")return {ok:false,error:"اختر هواية موجودة وغير مؤرشفة."};
 const cadence=input.cadence||"weekly";
 if(!HOBBY_PLAN_CADENCES.includes(cadence))return {ok:false,error:"دورية الخطة يجب أن تكون أسبوعية أو شهرية."};
 const targetSessions=input.targetSessions===""||input.targetSessions==null?null:Number(input.targetSessions);
 const targetMinutes=input.targetMinutes===""||input.targetMinutes==null?null:Number(input.targetMinutes);
 if(targetSessions===null&&targetMinutes===null)return {ok:false,error:"حدد مستهدف الجلسات أو الدقائق على الأقل."};
 if(targetSessions!==null&&(!Number.isInteger(targetSessions)||targetSessions<1||targetSessions>100))return {ok:false,error:"مستهدف الجلسات يجب أن يكون من 1 إلى 100."};
 if(targetMinutes!==null&&(!Number.isInteger(targetMinutes)||targetMinutes<1||targetMinutes>100000))return {ok:false,error:"مستهدف الدقائق يجب أن يكون عددًا موجبًا."};
 if(!validISODate(input.startDate))return {ok:false,error:"تاريخ بداية الخطة غير صالح."};
 if(input.endDate&&(!validISODate(input.endDate)||input.endDate<input.startDate))return {ok:false,error:"تاريخ نهاية الخطة غير صالح أو يسبق البداية."};
 const days=Array.isArray(input.daysOfWeek)?[...new Set(input.daysOfWeek.map(Number))]:[];
 if(days.some(d=>!Number.isInteger(d)||d<0||d>6))return {ok:false,error:"أيام الممارسة المختارة غير صحيحة."};
 return {ok:true,value:{...input,title,hobbyId:hobby.id,cadence,targetSessions,targetMinutes,startDate:input.startDate,endDate:input.endDate||null,daysOfWeek:days,notes:String(input.notes||"").trim(),status:["active","paused","completed","cancelled"].includes(input.status)?input.status:"active"}};
}
export function hobbyGoalProgress(goal,{sessions=[],skills=[],milestones=[]}={}){
 let current=0;
 if(goal.targetType==="sessions")current=sessions.filter(s=>s.hobbyId===goal.hobbyId&&!s.deleted_at&&s.localDate>=goal.startDate&&(!goal.endDate||s.localDate<=goal.endDate)).length;
 if(goal.targetType==="minutes")current=sessions.filter(s=>s.hobbyId===goal.hobbyId&&!s.deleted_at&&s.localDate>=goal.startDate&&(!goal.endDate||s.localDate<=goal.endDate)).reduce((n,s)=>n+(Number(s.durationMinutes)||0),0);
 if(goal.targetType==="skill_value")current=Number(skills.find(s=>s.id===goal.skillId)?.currentValue)||0;
 if(goal.targetType==="milestones")current=milestones.filter(m=>m.hobbyId===goal.hobbyId&&!m.deleted_at&&m.achievedAt>=goal.startDate&&(!goal.endDate||m.achievedAt<=goal.endDate)).length;
 return {current,target:goal.targetValue,percent:Math.min(100,Math.round(current/goal.targetValue*100)),remaining:Math.max(0,goal.targetValue-current),reached:current>=goal.targetValue};
}
export function hobbyPlanProgress(plan,sessions,periodStart,periodEnd){
 const rows=sessions.filter(s=>s.hobbyId===plan.hobbyId&&!s.deleted_at&&s.localDate>=periodStart&&s.localDate<=periodEnd);
 const minutes=rows.reduce((n,s)=>n+(Number(s.durationMinutes)||0),0);
 return {sessions:rows.length,minutes,targetSessions:plan.targetSessions,targetMinutes:plan.targetMinutes,sessionsPercent:plan.targetSessions?Math.min(100,Math.round(rows.length/plan.targetSessions*100)):null,minutesPercent:plan.targetMinutes?Math.min(100,Math.round(minutes/plan.targetMinutes*100)):null};
}
