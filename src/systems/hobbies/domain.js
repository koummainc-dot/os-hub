export const HOBBY_STATUSES = ["considering", "active", "paused", "archived"];
export const HOBBY_CATEGORIES = [
{id:"creative",label:"فنون وإبداع",icon:"🎨"},{id:"music",label:"موسيقى",icon:"🎵"},{id:"sports",label:"رياضة وحركة",icon:"🏃"},{id:"outdoors",label:"أنشطة خارجية",icon:"🌿"},{id:"crafts",label:"حرف وصناعة",icon:"🛠️"},{id:"technology",label:"تقنية",icon:"💻"},{id:"games",label:"ألعاب",icon:"🎮"},{id:"collecting",label:"جمع المقتنيات",icon:"📚"},{id:"culture",label:"ثقافة ومعرفة",icon:"🌍"},{id:"other",label:"أخرى",icon:"✨"}];
export const HOBBY_SECTIONS = [{id:"dashboard",label:"الرئيسية",icon:"⌂"},{id:"hobbies",label:"هواياتي",icon:"🎯"},{id:"explore",label:"اهتمامات مستقبلية",icon:"🔎"},{id:"sessions",label:"جلسات الممارسة",icon:"⏱️"},{id:"settings",label:"الإعدادات",icon:"⚙️"}];
export const emptyHobbiesData = () => ({schemaVersion:1,hobbies:[],sessions:[],settings:{timezone:"Africa/Cairo",weekStartDay:6}});
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
