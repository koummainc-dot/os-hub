import assert from "node:assert/strict";
import {hobbyInsights,hobbySessionEvent,resurfaceHobbyMemories} from "../src/systems/hobbies/domain.js";
import {validateHobbySkill,validateHobbySkillLog,validateHobbyMilestone,validateHobbiesProgressImport,validateHobbyGoal,validateHobbyPlan,hobbyGoalProgress,hobbyPlanProgress,validateHobbyResource,validateHobbyEquipmentLink,validateHobbyJournalEntry} from "../src/systems/hobbies/domain.js";
import {HOBBY_STATUSES,HOBBY_CATEGORIES,validateHobby,validateHobbySession,hobbyMetrics,hobbiesSummary,validateHobbiesImport} from "../src/systems/hobbies/domain.js";
assert.deepEqual(HOBBY_STATUSES,["considering","active","paused","archived"]);
const hobby={id:"h1",name:"التصوير",categoryId:"creative",status:"active",enjoymentRating:5};
assert.equal(validateHobby(hobby).ok,true);
assert.equal(validateHobby({...hobby,name:" "}).ok,false);
assert.equal(validateHobby({...hobby,status:"unknown"}).ok,false);
assert.equal(validateHobby({...hobby,categoryId:"missing"}).ok,false);
assert.equal(validateHobby({...hobby,enjoymentRating:6}).ok,false);
assert.equal(validateHobbySession({localDate:"2026-11-01",durationMinutes:"45",satisfactionRating:"4"},hobby).ok,true);
assert.equal(validateHobbySession({localDate:"2026-02-31",durationMinutes:"45"},hobby).ok,false);
assert.equal(validateHobbySession({localDate:"2026-11-01",durationMinutes:"1441"},hobby).ok,false);
assert.equal(validateHobbySession({localDate:"2026-11-01",durationMinutes:"30",habitId:"habit-1"},hobby,{habits:[{id:"habit-1",status:"active"}]}).value.habitId,"habit-1");
assert.equal(validateHobbySession({localDate:"2026-11-01",durationMinutes:"30"},{...hobby,status:"archived"}).ok,false);
const sessions=[{id:"s1",hobbyId:"h1",localDate:"2026-10-31",durationMinutes:30},{id:"s2",hobbyId:"h1",localDate:"2026-11-01",durationMinutes:45},{id:"s3",hobbyId:"h2",localDate:"2026-11-01",durationMinutes:20}];
const metrics=hobbyMetrics("h1",[hobby],sessions);
assert.equal(metrics.sessionCount,2);assert.equal(metrics.totalMinutes,75);assert.equal(metrics.totalHours,1.3);assert.equal(metrics.practiceDays,2);
const summary=hobbiesSummary([hobby,{id:"h2",status:"considering"}],sessions,"2026-11-01");
assert.equal(summary.activeCount,1);assert.equal(summary.consideringCount,1);assert.equal(summary.weekSessions,3);assert.equal(summary.weekMinutes,95);
assert.equal(validateHobbiesImport({hobbies:[hobby,{id:"h2",name:"موسيقى",categoryId:"music",status:"active"}],sessions}).ok,true);
assert.equal(validateHobbiesImport({hobbies:[hobby],sessions:[{id:"s",hobbyId:"missing"}]}).ok,false);
assert.equal(validateHobbiesImport({hobbies:[{name:"no id"}],sessions:[]}).ok,false);
assert.equal(HOBBY_CATEGORIES.length>=8,true);
console.log("Hobbies OS domain tests passed.");

const skill={id:"sk1",hobbyId:"h1",name:"التحكم في الكاميرا",measurementType:"level",currentValue:2,targetValue:5};
assert.equal(validateHobbySkill(skill,hobby).ok,true);
assert.equal(validateHobbySkill({...skill,name:""},hobby).ok,false);
assert.equal(validateHobbySkill({...skill,currentValue:2.5},hobby).ok,false);
assert.equal(validateHobbySkill({...skill,targetValue:1},hobby).ok,false);
assert.equal(validateHobbySkill({...skill,measurementType:"bad"},hobby).ok,false);
assert.equal(validateHobbySkill(skill,{...hobby,status:"archived"}).ok,false);
assert.equal(validateHobbySkillLog({localDate:"2026-11-01",newValue:3,previousValue:2},skill).ok,true);
assert.equal(validateHobbySkillLog({localDate:"2026-02-31",newValue:3},skill).ok,false);
assert.equal(validateHobbySkillLog({localDate:"2026-11-01",newValue:2.5},skill).ok,false);
assert.equal(validateHobbyMilestone({title:"أول معرض",hobbyId:"h1",skillId:"sk1",achievedAt:"2026-11-01",milestoneType:"achievement"},[hobby],[skill]).ok,true);
assert.equal(validateHobbyMilestone({title:"إنجاز",hobbyId:"h1",skillId:"missing",achievedAt:"2026-11-01"},[hobby],[skill]).ok,false);
assert.equal(validateHobbyMilestone({title:"إنجاز",hobbyId:"h1",achievedAt:"2026-02-31"},[hobby]).ok,false);
const progressImport=validateHobbiesProgressImport({hobbies:[hobby],sessions:[],skills:[skill],skillLogs:[{id:"log1",skillId:"sk1"}],milestones:[{id:"m1",hobbyId:"h1",skillId:"sk1"}]});
assert.equal(progressImport.ok,true);
assert.equal(validateHobbiesProgressImport({hobbies:[hobby],sessions:[],skills:[{...skill,hobbyId:"missing"}]}).ok,false);
assert.equal(validateHobbiesProgressImport({hobbies:[hobby],sessions:[],skills:[{...skill,hobbyId:"h1"}],milestones:[{id:"m2",hobbyId:"h1",skillId:"other"}]}).ok,false);
console.log("Hobbies OS Phase 2 domain tests passed.");

const goal={id:"g1",hobbyId:"h1",title:"إنهاء 20 جلسة",targetType:"sessions",targetValue:20,startDate:"2026-10-01",endDate:"2026-12-31",status:"active"};
assert.equal(validateHobbyGoal(goal,[hobby],[skill]).ok,true);
assert.equal(validateHobbyGoal({...goal,targetValue:0},[hobby],[skill]).ok,false);
assert.equal(validateHobbyGoal({...goal,targetType:"skill_value",skillId:"missing"},[hobby],[skill]).ok,false);
assert.equal(validateHobbyGoal({...goal,endDate:"2026-09-30"},[hobby],[skill]).ok,false);
assert.equal(validateHobbyGoal({...goal,hobbyId:"missing"},[hobby],[skill]).ok,false);
const goalProgress=hobbyGoalProgress(goal,{sessions:[{hobbyId:"h1",localDate:"2026-10-15"},{hobbyId:"h1",localDate:"2026-11-01"}]});
assert.equal(goalProgress.current,2);assert.equal(goalProgress.percent,10);
const plan={id:"p1",hobbyId:"h1",title:"ممارسة أسبوعية",cadence:"weekly",targetSessions:3,targetMinutes:120,startDate:"2026-11-01",status:"active"};
assert.equal(validateHobbyPlan(plan,[hobby]).ok,true);
assert.equal(validateHobbyPlan({...plan,targetSessions:0,targetMinutes:null},[hobby]).ok,false);
assert.equal(validateHobbyPlan({...plan,cadence:"daily"},[hobby]).ok,false);
const planProgress=hobbyPlanProgress(plan,[{hobbyId:"h1",localDate:"2026-11-01",durationMinutes:40},{hobbyId:"h1",localDate:"2026-11-02",durationMinutes:30}],"2026-11-01","2026-11-07");
assert.equal(planProgress.sessions,2);assert.equal(planProgress.minutes,70);
const phase3Import=validateHobbiesProgressImport({hobbies:[hobby],sessions:[],skills:[skill],skillLogs:[],milestones:[],goals:[goal],plans:[plan]});
assert.equal(phase3Import.ok,true);assert.equal(phase3Import.value.schemaVersion,5);
assert.equal(validateHobbiesProgressImport({hobbies:[hobby],sessions:[],skills:[skill],goals:[{...goal,hobbyId:"missing"}]}).ok,false);
console.log("Hobbies OS Phase 3 goals and plans tests passed.");

const resource={id:"r1",hobbyId:"h1",title:"دليل التصوير",resourceType:"book",status:"in_progress",url:"https://example.com/book",skillId:"sk1",goalId:"g1",rating:5};
const goalForResource={id:"g1",hobbyId:"h1",title:"هدف",targetType:"sessions",targetValue:5,startDate:"2026-11-01"};
assert.equal(validateHobbyResource(resource,[hobby],[skill],[goalForResource]).ok,true);
assert.equal(validateHobbyResource({...resource,url:"javascript:alert(1)"},[hobby],[skill],[goalForResource]).ok,false);
assert.equal(validateHobbyResource({...resource,rating:6},[hobby],[skill],[goalForResource]).ok,false);
assert.equal(validateHobbyResource({...resource,skillId:"missing"},[hobby],[skill],[goalForResource]).ok,false);
assert.equal(validateHobbyResource({...resource,goalId:"missing"},[hobby],[skill],[goalForResource]).ok,false);
assert.equal(validateHobbyResource({...resource,hobbyId:"missing"},[hobby],[skill],[goalForResource]).ok,false);
const equipment={id:"e1",hobbyId:"h1",ownerSystem:"home",ownerRecordId:"asset-123",role:"التصوير الخارجي"};
assert.equal(validateHobbyEquipmentLink(equipment,[hobby]).ok,true);
assert.equal(validateHobbyEquipmentLink({...equipment,ownerSystem:"finance"},[hobby]).ok,false);
assert.equal(validateHobbyEquipmentLink({...equipment,ownerRecordId:" "},[hobby]).ok,false);
const phase4Import=validateHobbiesProgressImport({hobbies:[hobby],sessions:[],skills:[skill],skillLogs:[],milestones:[],goals:[goalForResource],plans:[],resources:[resource],equipmentLinks:[equipment]});
assert.equal(phase4Import.ok,true);assert.equal(phase4Import.value.schemaVersion,5);
assert.equal(validateHobbiesProgressImport({hobbies:[hobby],sessions:[],resources:[{...resource,hobbyId:"missing"}]}).ok,false);
assert.equal(validateHobbiesProgressImport({hobbies:[hobby],sessions:[],equipmentLinks:[{...equipment,ownerSystem:"finance"}]}).ok,false);
console.log("Hobbies OS Phase 4 resources and equipment tests passed.");

const journalSession={id:"session-j1",hobbyId:"h1",localDate:"2026-11-01",sessionType:"practice"};
const journalSkill={id:"skill-j1",hobbyId:"h1",name:"التكوين"};
const journalMilestone={id:"mile-j1",hobbyId:"h1",title:"أول معرض"};
const journalInput={id:"journal-j1",hobbyId:"h1",entryType:"journal",title:"تجربة جميلة",body:"تعلمت اليوم شيئًا جديدًا.",localDate:"2026-11-01",mood:"proud",sessionId:"session-j1",skillId:"skill-j1",milestoneId:"mile-j1",tags:["تصوير","تعلم"],attachments:["https://example.com/photo.jpg"]};
assert.equal(validateHobbyJournalEntry(journalInput,[hobby],[journalSession],[journalSkill],[journalMilestone]).ok,true);

const journalLinkedHabit = { id: "habit-j1", name: "القراءة", status: "active" };
const linkedJournal = validateHobbyJournalEntry({ ...journalInput, habitId: "habit-j1" }, [hobby], [journalSession], [journalSkill], [journalMilestone], [journalLinkedHabit]);
assert.equal(linkedJournal.ok, true);
assert.equal(linkedJournal.value.habitId, "habit-j1");
assert.equal(validateHobbyJournalEntry({ ...journalInput, habitId: "missing-habit" }, [hobby], [journalSession], [journalSkill], [journalMilestone], [journalLinkedHabit]).ok, false);

assert.equal(validateHobbyJournalEntry({...journalInput,attachments:[{kind:"storage",path:"user/workspace/journal/file.webp",name:"file.webp",mimeType:"image/webp",size:1200}]},[hobby],[journalSession],[journalSkill],[journalMilestone]).ok,true);
assert.equal(validateHobbyJournalEntry({...journalInput,attachments:[{kind:"storage",path:"user/../secret",name:"file.webp",mimeType:"image/webp",size:1200}]},[hobby],[journalSession],[journalSkill],[journalMilestone]).ok,false);
assert.equal(validateHobbyJournalEntry({...journalInput,body:" "},[hobby],[journalSession],[journalSkill],[journalMilestone]).ok,false);
assert.equal(validateHobbyJournalEntry({...journalInput,localDate:"2026-02-31"},[hobby],[journalSession],[journalSkill],[journalMilestone]).ok,false);
assert.equal(validateHobbyJournalEntry({...journalInput,sessionId:"foreign"},[hobby],[journalSession],[journalSkill],[journalMilestone]).ok,false);
assert.equal(validateHobbyJournalEntry({...journalInput,skillId:"foreign"},[hobby],[journalSession],[journalSkill],[journalMilestone]).ok,false);
assert.equal(validateHobbyJournalEntry({...journalInput,milestoneId:"foreign"},[hobby],[journalSession],[journalSkill],[journalMilestone]).ok,false);
assert.equal(validateHobbyJournalEntry({...journalInput,attachments:["javascript:alert(1)"]},[hobby],[journalSession],[journalSkill],[journalMilestone]).ok,false);
assert.equal(validateHobbyJournalEntry({...journalInput,attachments:Array(9).fill("https://example.com/a")},[hobby],[journalSession],[journalSkill],[journalMilestone]).ok,false);
const phase5Import=validateHobbiesProgressImport({hobbies:[hobby],sessions:[journalSession],skills:[journalSkill],skillLogs:[],milestones:[journalMilestone],goals:[],plans:[],resources:[],equipmentLinks:[],journalEntries:[journalInput]});
assert.equal(phase5Import.ok,true);assert.equal(phase5Import.value.schemaVersion,5);
assert.equal(validateHobbiesProgressImport({hobbies:[hobby],sessions:[],journalEntries:[{...journalInput,sessionId:"session-j1"}]}).ok,false);
console.log("Hobbies OS Phase 5 journal and memories tests passed.");


const insightSessions=[
 {id:"a",hobbyId:"h1",localDate:"2026-11-01",durationMinutes:60,satisfactionRating:5},
 {id:"b",hobbyId:"h1",localDate:"2026-10-20",durationMinutes:30,satisfactionRating:3},
 {id:"c",hobbyId:"h2",localDate:"2026-09-25",durationMinutes:90},
 {id:"deleted",hobbyId:"h1",localDate:"2026-10-31",durationMinutes:500,deleted_at:"2026-11-01"}
];
const insightData=hobbyInsights([{id:"h1",name:"تصوير",status:"active"},{id:"h2",name:"موسيقى",status:"paused"}],insightSessions,[{id:"g1",hobbyId:"h1",title:"10 جلسات",targetType:"sessions",targetValue:10,startDate:"2026-10-01",status:"active"}],[],[],"2026-11-01");
assert.equal(insightData.totalSessions,3);
assert.equal(insightData.totalMinutes,180);
assert.equal(insightData.recentSessions,2);
assert.equal(insightData.recentMinutes,90);
assert.equal(insightData.previousMinutes,90);
assert.equal(insightData.minutesChangePercent,0);
assert.equal(insightData.averageSatisfaction,4);
assert.equal(hobbyInsights([{id:"h1",status:"active"}],[{hobbyId:"h1",localDate:"2026-11-01",durationMinutes:20,satisfactionRating:null}],[],[],[],"2026-11-01").averageSatisfaction,null);
assert.equal(insightData.goals[0].current,2);
assert.equal(hobbyInsights([],[],[],[],[],"2026-11-01").minutesChangePercent,0);
console.log("Hobbies OS Phase 6 insights tests passed.");

const sessionEvent=hobbySessionEvent({id:"session-123",hobbyId:"h1",localDate:"2026-11-01",durationMinutes:45,sessionType:"practice",created_at:"2026-11-01T10:00:00.000Z"},{id:"h1",name:"تصوير"});
assert.equal(sessionEvent.type,"hobbies.practice_session.completed");
assert.equal(sessionEvent.entityType,"practice_session");
assert.equal(sessionEvent.entityId,"session-123");
assert.deepEqual(sessionEvent.payload.sourceRef,{system:"hobbies",type:"practice_session",id:"session-123"});
assert.equal(sessionEvent.payload.hobbyName,"تصوير");
assert.equal(sessionEvent.payload.minutes,45);
assert.equal(sessionEvent.payload.timezone,"Africa/Cairo");
assert.throws(()=>hobbySessionEvent({id:"session-123",hobbyId:"h2"},{id:"h1",name:"تصوير"}),/HOBBY_SESSION_EVENT_SOURCE_INVALID/);
console.log("Hobbies OS Phase 6B Today event contract tests passed.");

const memoryRows=[
 {id:"m-old-1",entryType:"memory",hobbyId:"h1",localDate:"2024-11-02",title:"معرض قديم",body:"تفاصيل المعرض",created_at:"2024-11-02T10:00:00Z"},
 {id:"m-old-2",entryType:"memory",hobbyId:"h1",skillId:"sk1",localDate:"2025-08-10",title:"تعلمت الإضاءة",body:"تجربة الإضاءة"},
 {id:"m-old-3",entryType:"memory",hobbyId:"h2",localDate:"2025-11-02",title:"رحلة موسيقية",body:"تفاصيل"},
 {id:"m-today",entryType:"memory",hobbyId:"h1",localDate:"2026-11-02",title:"اليوم",body:"لا تعرض ذكرى اليوم نفسه"},
 {id:"m-future",entryType:"memory",hobbyId:"h1",localDate:"2027-11-02",title:"مستقبل",body:"لا تعرض المستقبل"},
 {id:"m-deleted",entryType:"memory",hobbyId:"h1",localDate:"2023-11-02",deleted_at:"2024-01-01",title:"محذوف",body:""},
 {id:"m-archived",entryType:"memory",hobbyId:"h1",localDate:"2022-11-02",archivedAt:"2025-01-01",title:"مؤرشف",body:""},
 {id:"j-not-memory",entryType:"journal",hobbyId:"h1",localDate:"2021-11-02",title:"يومية",body:""}
];
const resurfaced=resurfaceHobbyMemories(memoryRows,"2026-11-02",{hobbyId:"h1",skillIds:["sk1"]});
assert.deepEqual(resurfaced.onThisDay.map(x=>x.id),["m-old-3","m-old-1"]);
assert.deepEqual(resurfaced.related.map(x=>x.id),["m-old-2"]);
assert.equal(new Set([...resurfaced.onThisDay,...resurfaced.related].map(x=>x.id)).size,3);
assert.deepEqual(resurfaceHobbyMemories(memoryRows,"2026-11-02",{hobbyId:"missing"}).related,[]);
assert.deepEqual(resurfaceHobbyMemories(memoryRows,"2026-02-29").onThisDay,[]);
console.log("Hobbies OS Phase 5B-5 memory resurfacing tests passed.");
