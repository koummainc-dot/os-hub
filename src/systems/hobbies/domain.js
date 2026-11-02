export const HOBBY_STATUSES = ["considering", "active", "paused", "archived"];
export const HOBBY_CATEGORIES = [
{id:"creative",label:"فنون وإبداع",icon:"🎨"},{id:"music",label:"موسيقى",icon:"🎵"},{id:"sports",label:"رياضة وحركة",icon:"🏃"},{id:"outdoors",label:"أنشطة خارجية",icon:"🌿"},{id:"crafts",label:"حرف وصناعة",icon:"🛠️"},{id:"technology",label:"تقنية",icon:"💻"},{id:"games",label:"ألعاب",icon:"🎮"},{id:"collecting",label:"جمع المقتنيات",icon:"📚"},{id:"culture",label:"ثقافة ومعرفة",icon:"🌍"},{id:"other",label:"أخرى",icon:"✨"}];
export const HOBBY_SECTIONS = [{id:"dashboard",label:"الرئيسية",icon:"⌂"},{id:"habit-library",label:"العادات",icon:"🌱"},{id:"habit-log",label:"سجل العادات",icon:"📒"},{id:"relapses",label:"التعافي",icon:"🛟"},{id:"books",label:"الكتب",icon:"📚"},{id:"reading",label:"جلسات القراءة",icon:"📖"},{id:"weekly-focus",label:"التركيز الأسبوعي",icon:"🎯"},{id:"achievements",label:"إنجازات العادات",icon:"🏅"},{id:"reminders",label:"التذكيرات",icon:"🔔"},{id:"trash",label:"المحذوفات",icon:"🗑️"},{id:"hobbies",label:"هواياتي",icon:"🎯"},{id:"explore",label:"اهتمامات مستقبلية",icon:"🔎"},{id:"sessions",label:"جلسات الممارسة",icon:"⏱️"},{id:"skills",label:"المهارات والتقدم",icon:"📈"},{id:"milestones",label:"إنجازات الهوايات",icon:"🏆"},{id:"goals",label:"الأهداف",icon:"🎯"},{id:"plans",label:"خطط الممارسة",icon:"🗓️"},{id:"resources",label:"الموارد والمراجع",icon:"📚"},{id:"equipment",label:"المعدات المرتبطة",icon:"🧰"},{id:"journal",label:"اليوميات والذكريات",icon:"📔"},{id:"insights",label:"التحليلات والرؤى",icon:"📊"},{id:"settings",label:"الإعدادات والخصوصية",icon:"⚙️"}];
export const emptyHobbiesData = () => ({schemaVersion:5,hobbies:[],sessions:[],skills:[],skillLogs:[],milestones:[],goals:[],plans:[],resources:[],equipmentLinks:[],journalEntries:[],settings:{timezone:"Africa/Cairo",weekStartDay:6}});
export const makeHobbyId = (prefix="hobby") => globalThis.crypto?.randomUUID?.() || prefix+"-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,8);
export function validateHobby(input) {
const name=String(input?.name||"").trim(); if(!name)return {ok:false,error:"اسم الهواية مطلوب."}; if(name.length>120)return {ok:false,error:"اسم الهواية يجب ألا يتجاوز 120 حرفًا."};
if(!HOBBY_STATUSES.includes(input.status))return {ok:false,error:"حالة الهواية غير صحيحة."}; if(!HOBBY_CATEGORIES.some(x=>x.id===input.categoryId))return {ok:false,error:"اختر تصنيفًا صحيحًا."};
const rating=input.enjoymentRating===""||input.enjoymentRating==null?null:Number(input.enjoymentRating); if(rating!==null&&(!Number.isInteger(rating)||rating<1||rating>5))return {ok:false,error:"تقييم الاستمتاع يجب أن يكون من 1 إلى 5."};
return {ok:true,value:{...input,name,description:String(input.description||"").trim(),motivation:String(input.motivation||"").trim(),enjoymentRating:rating}};}
export function validateHobbySession(input,hobby,related={}) {
if(!hobby||hobby.status==="archived")return {ok:false,error:"لا يمكن تسجيل جلسة لهواية غير متاحة."}; const date=String(input.localDate||"");
if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(date+"T12:00:00Z"))||new Date(date+"T12:00:00Z").toISOString().slice(0,10)!==date)return {ok:false,error:"تاريخ الجلسة غير صالح."};
const duration=input.durationMinutes===""||input.durationMinutes==null?null:Number(input.durationMinutes); if(duration!==null&&(!Number.isInteger(duration)||duration<1||duration>1440))return {ok:false,error:"مدة الجلسة يجب أن تكون من دقيقة إلى 24 ساعة."};
const rating=input.satisfactionRating===""||input.satisfactionRating==null?null:Number(input.satisfactionRating); if(rating!==null&&(!Number.isInteger(rating)||rating<1||rating>5))return {ok:false,error:"تقييم الجلسة يجب أن يكون من 1 إلى 5."};
const habitId=String(input.habitId||"").trim()||null,goalId=String(input.goalId||"").trim()||null,skillId=String(input.skillId||"").trim()||null;
if(habitId&&!((related.habits||[]).some(h=>h.id===habitId&&!h.deleted_at&&h.status!=="archived")))return {ok:false,error:"العادة المرتبطة غير متاحة."};
if(goalId&&!((related.goals||[]).some(g=>g.id===goalId&&g.hobbyId===hobby.id&&!g.deleted_at)))return {ok:false,error:"الهدف المرتبط لا يتبع هذه الهواية."};
if(skillId&&!((related.skills||[]).some(s=>s.id===skillId&&s.hobbyId===hobby.id&&!s.deleted_at)))return {ok:false,error:"المهارة المرتبطة لا تتبع هذه الهواية."};
return {ok:true,value:{...input,habitId,goalId,skillId,localDate:date,durationMinutes:duration,satisfactionRating:rating,notes:String(input.notes||"").trim()}};}
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
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(date+"T12:00:00Z"))||new Date(date+"T12:00:00Z").toISOString().slice(0,10)!==date) return {ok:false,error:"تاريخ التقدم غير صالح."};
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
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(date+"T12:00:00Z"))||new Date(date+"T12:00:00Z").toISOString().slice(0,10)!==date) return {ok:false,error:"تاريخ الإنجاز غير صالح."};
  return {ok:true,value:{...input,title,achievedAt:date,description:String(input.description||"").trim(),evidenceUrl:String(input.evidenceUrl||"").trim()}};
}
export function validateHobbiesProgressImport(value) {
  const base=validateHobbiesImport(value);
  if(!base.ok)return base;
  const source=value?.data&&typeof value.data==="object"?value.data:value;
  const collections=["skills","skillLogs","milestones","goals","plans","resources","equipmentLinks","journalEntries"];
  for(const key of collections) if(source[key]!==undefined&&!Array.isArray(source[key])) return {ok:false,error:"مجموعة "+key+" يجب أن تكون قائمة."};
  const skills=source.skills||[],logs=source.skillLogs||[],milestones=source.milestones||[],goals=source.goals||[],plans=source.plans||[],resources=source.resources||[],equipmentLinks=source.equipmentLinks||[],journalEntries=source.journalEntries||[];
  const unique=(rows,key)=>{const ids=new Set();for(const row of rows){if(!row||!String(row.id||"").trim()||ids.has(row.id))return false;ids.add(row.id);}return true;};
  if(!unique(skills,"id")||!unique(logs,"id")||!unique(milestones,"id")||!unique(goals,"id")||!unique(plans,"id")||!unique(resources,"id")||!unique(equipmentLinks,"id")||!unique(journalEntries,"id"))return {ok:false,error:"يوجد معرّف مفقود أو مكرر في بيانات التقدم."};
  const hobbyIds=new Set(base.value.hobbies.map(h=>h.id)),skillIds=new Set(skills.map(s=>s.id));
  if(skills.some(s=>!hobbyIds.has(s.hobbyId))||logs.some(l=>!skillIds.has(l.skillId))||milestones.some(m=>!hobbyIds.has(m.hobbyId)||(m.skillId&&!skillIds.has(m.skillId))))return {ok:false,error:"توجد علاقة غير صحيحة في بيانات المهارات أو الإنجازات."};
  const skillById=new Map(skills.map(s=>[s.id,s]));
  if(logs.some(l=>!skillById.has(l.skillId)))return {ok:false,error:"يوجد سجل تقدم لمهارة غير موجودة."};
  if(milestones.some(m=>m.skillId&&(!skillById.has(m.skillId)||skillById.get(m.skillId).hobbyId!==m.hobbyId)))return {ok:false,error:"المهارة المرتبطة بالإنجاز لا تتبع الهواية المحددة."};
  if(goals.some(g=>!hobbyIds.has(g.hobbyId)||(g.skillId&&(!skillById.has(g.skillId)||skillById.get(g.skillId).hobbyId!==g.hobbyId))))return {ok:false,error:"يوجد هدف مرتبط بهواية أو مهارة غير صحيحة."};
  if(plans.some(p=>!hobbyIds.has(p.hobbyId)))return {ok:false,error:"توجد خطة مرتبطة بهواية غير موجودة."};
  if(resources.some(r=>!hobbyIds.has(r.hobbyId)||(r.skillId&&(!skillById.has(r.skillId)||skillById.get(r.skillId).hobbyId!==r.hobbyId))||(r.goalId&&!goals.some(g=>g.id===r.goalId&&g.hobbyId===r.hobbyId))))return {ok:false,error:"يوجد مورد مرتبط بهواية أو مهارة أو هدف غير صحيح."};
  if(equipmentLinks.some(e=>!hobbyIds.has(e.hobbyId)||!['home','inventory'].includes(e.ownerSystem)||!String(e.ownerRecordId||'').trim()))return {ok:false,error:"يوجد رابط معدة غير صحيح."};
  const sessionById=new Map(base.value.sessions.map(s=>[s.id,s]));
  if(journalEntries.some(j=>!hobbyIds.has(j.hobbyId)||(j.sessionId&&sessionById.get(j.sessionId)?.hobbyId!==j.hobbyId)||(j.skillId&&(!skillById.has(j.skillId)||skillById.get(j.skillId).hobbyId!==j.hobbyId))||(j.milestoneId&&!milestones.some(m=>m.id===j.milestoneId&&m.hobbyId===j.hobbyId))))return {ok:false,error:"توجد يومية مرتبطة بهواية أو جلسة أو مهارة أو إنجاز غير صحيح."};
  return {ok:true,value:{...base.value,schemaVersion:5,skills,skillLogs:logs,milestones,goals,plans,resources,equipmentLinks,journalEntries}};
}


export const HOBBY_GOAL_TARGET_TYPES=["sessions","minutes","skill_value","milestones"];
export const HOBBY_GOAL_STATUSES=["active","completed","paused","cancelled"];
export const HOBBY_PLAN_CADENCES=["weekly","monthly"];
const validISODate=value=>{const d=String(value||"");return /^\d{4}-\d{2}-\d{2}$/.test(d)&&!Number.isNaN(Date.parse(d+"T12:00:00Z"))&&new Date(d+"T12:00:00Z").toISOString().slice(0,10)===d;};
export function validateHobbyGoal(input,hobbies,skills=[]){
 const title=String(input?.title||"").trim(),hobby=hobbies.find(h=>h.id===input.hobbyId);
 if(!title||title.length>160)return {ok:false,error:"عنوان الهدف مطلوب وبحد أقصى 160 حرفًا."};
 if(!hobby||hobby.status==="archived")return {ok:false,error:"اختر هواية موجودة وغير مؤرشفة."};
 const targetType=input.targetType||"sessions";
 if(!HOBBY_GOAL_TARGET_TYPES.includes(targetType))return {ok:false,error:"نوع مستهدف الهدف غير صحيح."};
 const targetValue=Number(input.targetValue);
 if(!Number.isFinite(targetValue)||targetValue<=0)return {ok:false,error:"قيمة المستهدف يجب أن تكون أكبر من صفر."};
 if(["sessions","minutes","milestones"].includes(targetType)&&!Number.isInteger(targetValue))return {ok:false,error:"المستهدف يجب أن يكون عددًا صحيحًا."};
 const targetSkill=skills.find(s=>s.id===input.skillId&&s.hobbyId===input.hobbyId);
 if(targetType==="skill_value"&&(!targetSkill||!["number","level"].includes(targetSkill.measurementType)))return {ok:false,error:"اختر مهارة رقمية أو ذات مستوى تابعة لنفس الهواية."};
 if(targetType==="skill_value"&&targetSkill.measurementType==="level"&&!Number.isInteger(targetValue))return {ok:false,error:"مستهدف المستوى يجب أن يكون عددًا صحيحًا."};
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
 const from=plan.startDate>periodStart?plan.startDate:periodStart;
 const to=plan.endDate&&plan.endDate<periodEnd?plan.endDate:periodEnd;
 const rows=plan.status==="active"&&from<=to?sessions.filter(s=>s.hobbyId===plan.hobbyId&&!s.deleted_at&&s.localDate>=from&&s.localDate<=to):[];
 const minutes=rows.reduce((n,s)=>n+(Number(s.durationMinutes)||0),0);
 return {sessions:rows.length,minutes,targetSessions:plan.targetSessions,targetMinutes:plan.targetMinutes,sessionsPercent:plan.targetSessions?Math.min(100,Math.round(rows.length/plan.targetSessions*100)):null,minutesPercent:plan.targetMinutes?Math.min(100,Math.round(minutes/plan.targetMinutes*100)):null};
}


export const HOBBY_RESOURCE_TYPES=["book","video","article","website","course","lesson","reference","tool","other"];
export const HOBBY_RESOURCE_STATUSES=["new","in_progress","completed","deferred","not_suitable"];
export const HOBBY_EQUIPMENT_OWNER_SYSTEMS=["home","inventory"];
export function validateHobbyResource(input,hobbies,skills=[],goals=[]){
 const title=String(input?.title||"").trim(),hobby=hobbies.find(h=>h.id===input.hobbyId);
 if(!title||title.length>180)return {ok:false,error:"عنوان المورد مطلوب وبحد أقصى 180 حرفًا."};
 if(!hobby||hobby.status==="archived")return {ok:false,error:"اختر هواية موجودة وغير مؤرشفة."};
 const resourceType=input.resourceType||"other",status=input.status||"new";
 if(!HOBBY_RESOURCE_TYPES.includes(resourceType))return {ok:false,error:"نوع المورد غير صحيح."};
 if(!HOBBY_RESOURCE_STATUSES.includes(status))return {ok:false,error:"حالة المورد غير صحيحة."};
 const url=String(input.url||"").trim();
 if(url){try{const parsed=new URL(url);if(!["http:","https:"].includes(parsed.protocol))throw new Error();}catch{return {ok:false,error:"رابط المورد يجب أن يبدأ بـ http أو https."};}}
 if(input.skillId&&!skills.some(s=>s.id===input.skillId&&s.hobbyId===input.hobbyId))return {ok:false,error:"المهارة المرتبطة لا تتبع هذه الهواية."};
 if(input.goalId&&!goals.some(g=>g.id===input.goalId&&g.hobbyId===input.hobbyId))return {ok:false,error:"الهدف المرتبط لا يتبع هذه الهواية."};
 const rating=input.rating===""||input.rating==null?null:Number(input.rating);
 if(rating!==null&&(!Number.isInteger(rating)||rating<1||rating>5))return {ok:false,error:"تقييم المورد يجب أن يكون من 1 إلى 5."};
 return {ok:true,value:{...input,title,resourceType,status,url,notes:String(input.notes||"").trim(),skillId:input.skillId||null,goalId:input.goalId||null,rating}};
}
export function validateHobbyEquipmentLink(input,hobbies){
 const hobby=hobbies.find(h=>h.id===input.hobbyId);
 if(!hobby||hobby.status==="archived")return {ok:false,error:"اختر هواية موجودة وغير مؤرشفة."};
 if(!HOBBY_EQUIPMENT_OWNER_SYSTEMS.includes(input.ownerSystem))return {ok:false,error:"النظام المالك للمعدة غير مدعوم."};
 const ownerRecordId=String(input.ownerRecordId||"").trim();
 if(!ownerRecordId||ownerRecordId.length>180)return {ok:false,error:"معرّف سجل المعدة في النظام المالك مطلوب."};
 const role=String(input.role||"").trim();
 if(role.length>100)return {ok:false,error:"وصف الاستخدام يجب ألا يتجاوز 100 حرف."};
 return {ok:true,value:{...input,ownerRecordId,role,notes:String(input.notes||"").trim()}};
}


export const HOBBY_JOURNAL_TYPES=["journal","memory"];
export const HOBBY_JOURNAL_MOODS=["great","good","neutral","difficult","proud","inspired"];
export function validateHobbyJournalEntry(input,hobbies,sessions=[],skills=[],milestones=[],habits=[]){
 const title=String(input?.title||"").trim(),body=String(input?.body||"").trim(),hobby=hobbies.find(h=>h.id===input.hobbyId);
 if(!hobby||hobby.status==="archived")return {ok:false,error:"اختر هواية موجودة وغير مؤرشفة."};
 if(!title||title.length>180)return {ok:false,error:"عنوان اليومية مطلوب وبحد أقصى 180 حرفًا."};
 if(!body||body.length>12000)return {ok:false,error:"اكتب محتوى لليومية بحد أقصى 12000 حرف."};
 const entryType=input.entryType||"journal";if(!HOBBY_JOURNAL_TYPES.includes(entryType))return {ok:false,error:"نوع الإدخال غير صحيح."};
 const localDate=String(input.localDate||"");if(!validISODate(localDate))return {ok:false,error:"تاريخ اليومية غير صالح."};
 if(input.mood&&!HOBBY_JOURNAL_MOODS.includes(input.mood))return {ok:false,error:"الحالة المزاجية غير صحيحة."};
 if(input.sessionId&&!sessions.some(s=>s.id===input.sessionId&&s.hobbyId===input.hobbyId))return {ok:false,error:"جلسة الممارسة المرتبطة لا تتبع هذه الهواية."};
 if(input.skillId&&!skills.some(s=>s.id===input.skillId&&s.hobbyId===input.hobbyId))return {ok:false,error:"المهارة المرتبطة لا تتبع هذه الهواية."};
 if(input.milestoneId&&!milestones.some(m=>m.id===input.milestoneId&&m.hobbyId===input.hobbyId))return {ok:false,error:"الإنجاز المرتبط لا يتبع هذه الهواية."};
 if(input.habitId&&!habits.some(h=>h.id===input.habitId&&!h.deleted_at&&h.status!=="archived"))return {ok:false,error:"العادة المرتبطة غير متاحة أو مؤرشفة."};
 const tags=Array.isArray(input.tags)?input.tags.map(x=>String(x).trim()).filter(Boolean).slice(0,10):String(input.tags||"").split(",").map(x=>x.trim()).filter(Boolean).slice(0,10);
 if(tags.some(t=>t.length>30))return {ok:false,error:"كل وسم يجب ألا يتجاوز 30 حرفًا."};
 const attachments=Array.isArray(input.attachments)?input.attachments:[];if(attachments.length>8)return {ok:false,error:"يمكن إضافة 8 روابط مرفقات كحد أقصى."};
 for(const value of attachments){if(value&&typeof value==="object"){if(value.kind!=="storage"||typeof value.path!=="string"||value.path.startsWith("/")||value.path.split("/").includes("..")||String(value.name||"").length>200||!Number.isFinite(Number(value.size))||Number(value.size)>10*1024*1024||!["image/jpeg","image/png","image/webp","application/pdf"].includes(value.mimeType))return {ok:false,error:"بيانات المرفق المخزن غير صالحة."};continue;}try{const u=new URL(String(value));if(!["https:","http:"].includes(u.protocol)||String(value).length>2048)throw new Error();}catch{return {ok:false,error:"روابط المرفقات يجب أن تكون http أو https وبحد أقصى 2048 حرفًا."};}}
 return {ok:true,value:{...input,title,body,entryType,localDate,mood:input.mood||null,sessionId:input.sessionId||null,skillId:input.skillId||null,milestoneId:input.milestoneId||null,habitId:input.habitId||null,tags,attachments,privacy:"private"}};
}


/**
 * Event contract consumed by the unified Today activity stream.
 * The event points back to the source session; it never creates a second activity record.
 */
export function hobbySessionEvent(session,hobby){
 if(!session?.id||!session?.hobbyId||!hobby?.id||session.hobbyId!==hobby.id)throw new Error("HOBBY_SESSION_EVENT_SOURCE_INVALID");
 return {
  type:"hobbies.practice_session.completed",
  entityType:"practice_session",
  entityId:String(session.id),
  occurredAt:session.updated_at||session.created_at||new Date().toISOString(),
  payload:{
   sourceRef:{system:"hobbies",type:"practice_session",id:String(session.id)},
   hobbyId:String(hobby.id),
   hobbyName:String(hobby.name||"هواية"),
   sessionDate:String(session.localDate||""),
   minutes:Number.isFinite(Number(session.durationMinutes))?Number(session.durationMinutes):0,
   sessionType:String(session.sessionType||"practice"),
   timezone:"Africa/Cairo"
  }
 };
}

/**
 * Local Hobbies OS analytics only. Dates are ISO local dates supplied by the app;
 * no external OS data is read or copied here.
 */
export function hobbyInsights(hobbies=[],sessions=[],goals=[],skills=[],milestones=[],asOf){
 const date=validISODate(asOf)?asOf:new Date().toISOString().slice(0,10);
 const shift=(value,days)=>{const d=new Date(value+"T12:00:00Z");d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);};
 const start30=shift(date,-29),priorStart=shift(date,-59),priorEnd=shift(date,-30);
 const rows=sessions.filter(s=>!s.deleted_at&&validISODate(s.localDate)&&s.localDate<=date);
 const recent=rows.filter(s=>s.localDate>=start30),prior=rows.filter(s=>s.localDate>=priorStart&&s.localDate<=priorEnd);
 const sumMinutes=list=>list.reduce((n,s)=>n+(Number.isFinite(Number(s.durationMinutes))&&Number(s.durationMinutes)>0?Number(s.durationMinutes):0),0);
 const rated=rows.filter(s=>s.satisfactionRating!==null&&s.satisfactionRating!==undefined&&s.satisfactionRating!==""&&Number.isInteger(Number(s.satisfactionRating))&&Number(s.satisfactionRating)>=1&&Number(s.satisfactionRating)<=5);
 const hobbyRows=hobbies.filter(h=>!h.deleted_at&&h.status!=="archived").map(h=>{
  const own=rows.filter(s=>s.hobbyId===h.id);
  return {hobbyId:h.id,name:h.name||"هواية",sessions:own.length,minutes:sumMinutes(own),lastPracticedAt:own.map(s=>s.localDate).sort().at(-1)||null};
 }).sort((a,b)=>b.minutes-a.minutes||b.sessions-a.sessions);
 const goalRows=goals.filter(g=>!g.deleted_at&&g.status==="active").map(g=>{
  let current=0;
  if(g.targetType==="sessions")current=rows.filter(s=>s.hobbyId===g.hobbyId&&s.localDate>=g.startDate&&(!g.endDate||s.localDate<=g.endDate)).length;
  if(g.targetType==="minutes")current=sumMinutes(rows.filter(s=>s.hobbyId===g.hobbyId&&s.localDate>=g.startDate&&(!g.endDate||s.localDate<=g.endDate)));
  if(g.targetType==="milestones")current=milestones.filter(m=>!m.deleted_at&&m.hobbyId===g.hobbyId&&m.achievedAt>=g.startDate&&(!g.endDate||m.achievedAt<=g.endDate)).length;
  if(g.targetType==="skill_value")current=Number(skills.find(s=>s.id===g.skillId)?.currentValue)||0;
  return {id:g.id,title:g.title,hobbyName:hobbies.find(h=>h.id===g.hobbyId)?.name||"هواية",current,target:Number(g.targetValue)||0,percent:Number(g.targetValue)>0?Math.min(100,Math.round(current/Number(g.targetValue)*100)):0};
 });
 const recentMinutes=sumMinutes(recent),priorMinutes=sumMinutes(prior);
 const delta=priorMinutes===0?(recentMinutes>0?null:0):Math.round((recentMinutes-priorMinutes)/priorMinutes*100);
 return {
  asOf:date,windowStart:start30,previousWindowStart:priorStart,previousWindowEnd:priorEnd,
  totalSessions:rows.length,totalMinutes:sumMinutes(rows),practiceDays:new Set(rows.map(s=>s.localDate)).size,
  recentSessions:recent.length,recentMinutes,previousSessions:prior.length,previousMinutes:priorMinutes,
  minutesChangePercent:delta,averageSatisfaction:rated.length?Math.round(rated.reduce((n,s)=>n+Number(s.satisfactionRating),0)/rated.length*10)/10:null,
  ratedSessions:rated.length,activeHobbies:hobbyRows.filter(h=>h.sessions>0).length,
  topHobbies:hobbyRows.slice(0,5),goals:goalRows
 };
}


/**
 * Deterministic, privacy-preserving resurfacing from Journal records already
 * visible to the current workspace member. Does not mutate records or widen access.
 */
export function resurfaceHobbyMemories(entries=[], asOf, context={}) {
 if(!validISODate(asOf))return {asOf:null,onThisDay:[],related:[]};
 const date=asOf;
 const active=entries.filter(entry=>entry&&entry.entryType==="memory"&&!entry.deleted_at&&!entry.archivedAt&&validISODate(entry.localDate)&&entry.localDate<date);
 const seen=new Set();
 const unique=(rows,limit=4)=>rows.filter(row=>{if(seen.has(row.id))return false;seen.add(row.id);return true;}).slice(0,limit);
 const monthDay=date.slice(5);
 const onThisDay=unique(active.filter(entry=>entry.localDate.slice(5)===monthDay)
  .sort((a,b)=>b.localDate.localeCompare(a.localDate)||(b.created_at||"").localeCompare(a.created_at||"")),4);
 const hobbyId=context.hobbyId||null, skillIds=new Set(context.skillIds||[]), milestoneIds=new Set(context.milestoneIds||[]);
 const related=unique(active.filter(entry=>
   (hobbyId&&entry.hobbyId===hobbyId)||
   (entry.skillId&&skillIds.has(entry.skillId))||
   (entry.milestoneId&&milestoneIds.has(entry.milestoneId)))
  .sort((a,b)=>b.localDate.localeCompare(a.localDate)||(b.created_at||"").localeCompare(a.created_at||"")),4);
 return {asOf:date,onThisDay,related};
}
