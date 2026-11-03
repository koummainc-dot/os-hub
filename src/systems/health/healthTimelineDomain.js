const TYPES={condition:"حالة طبية",allergy:"حساسية",symptom:"عرض",medication:"بدء علاج",dose:"تغيير جرعة",medication_event:"حدث دوائي",side_effect:"أثر جانبي",flare:"نوبة تهيّج",measurement:"قياس حيوي",checkin:"متابعة يومية",document:"وثيقة طبية"};
const PAGES={condition:"conditions",allergy:"conditions",symptom:"symptoms",medication:"medications",dose:"medications",medication_event:"medications",side_effect:"medications",flare:"flare_events",measurement:"measurements",checkin:"checkins",document:"documents"};
const text=(...v)=>v.filter(x=>x!==null&&x!==undefined&&x!=="").map(x=>typeof x==="object"?"":String(x)).join(" · ");
const add=(out,scope,type,items,map)=>{if(!Array.isArray(items))return;for(const row of items){const x=map(row);if(x?.date&&Number.isFinite(new Date(x.date).getTime()))out.push({...x,id:row.id,type,scope});}};
export function buildHealthTimeline(data={},canRead=()=>false){
 const out=[];
 add(out,"conditions","condition",data.conditions,r=>({date:r.diagnosed_on||r.created_at,title:r.name,summary:text(r.condition_type,r.status),source:"الحالات الطبية"}));
 add(out,"conditions","allergy",data.allergies,r=>({date:r.first_observed_on||r.created_at,title:r.allergen,summary:text(r.reaction,r.severity,r.status),source:"الحساسيات"}));
 add(out,"symptoms","symptom",data.symptomLogs,r=>({date:r.recorded_at,title:r.symptom_name_snapshot||"عرض مسجل",summary:text(r.severity!=null?"الشدة "+r.severity+"/10":null,r.body_location,r.body_region_code,r.duration_minutes?r.duration_minutes+" دقيقة":null),source:r.source||"سجل الأعراض"}));
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
export function healthTimelineLocalDay(value,timezone="Africa/Cairo"){
 const parts=new Intl.DateTimeFormat("en",{timeZone:timezone,year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date(value));
 const part=type=>parts.find(x=>x.type===type)?.value||"";
 return part("year")+"-"+part("month")+"-"+part("day");
}
export function filterHealthTimeline(events,{type="all",from="",to="",timezone="Africa/Cairo"}={}){
 return events.filter(e=>{if(type!=="all"&&e.type!==type)return false;const day=healthTimelineLocalDay(e.date,timezone);return(!from||day>=from)&&(!to||day<=to);});
}
export const HEALTH_TIMELINE_TYPES=TYPES;
export const HEALTH_TIMELINE_PAGES=PAGES;
