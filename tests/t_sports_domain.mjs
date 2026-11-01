import assert from "node:assert/strict";
import {
  emptySportsData, normalizeSportsData, validateExercise, validateProgram,
  validateExerciseSet, estimateOneRepMax, sessionMetrics, derivePersonalRecords,
  validateSportsImport,
} from "../src/systems/sports/domain.js";

const base = emptySportsData();
assert.equal(base.schemaVersion, 1);
assert.deepEqual(normalizeSportsData(null).sessions, []);
assert.equal(validateExercise({name:"",category:"Strength",trackingMode:"Reps"}).ok, false);
assert.equal(validateExercise({name:"Push-up",category:"Strength",trackingMode:"Reps"}).ok, true);
assert.equal(validateProgram({name:"Plan",durationWeeks:12,daysPerWeek:3,startDate:"2026-11-01"}).ok, true);
assert.equal(validateProgram({name:"Plan",durationWeeks:0,daysPerWeek:3,startDate:"2026-11-01"}).ok, false);
const exercise = {id:"ex-1",name:"Bench press",trackingMode:"Weight-Reps"};
assert.equal(validateExerciseSet({reps:8,weightKg:"",rpe:""},exercise).ok, false);
assert.equal(validateExerciseSet({reps:8,weightKg:"40",rpe:"8"},exercise).ok, true);
const cardio = {id:"run",name:"Run",trackingMode:"Time-Distance"};
const cardioSet = validateExerciseSet({reps:"10",weightKg:"",durationSeconds:"360",distanceMeters:"1000",rpe:""},cardio);
assert.equal(cardioSet.ok,true);
assert.equal(cardioSet.value.reps,null);
assert.equal(cardioSet.value.weightKg,null);
assert.equal(estimateOneRepMax(60,5),70);
assert.equal(estimateOneRepMax(60,20),null);
const session = {id:"s-1",status:"Completed",startedAt:"2026-11-01T10:00:00.000Z",endedAt:"2026-11-01T10:30:00.000Z",localDate:"2026-11-01"};
const sets = [
 {id:"set-1",sessionId:"s-1",exerciseId:"ex-1",weightKg:40,reps:8},
 {id:"set-2",sessionId:"s-1",exerciseId:"ex-1",weightKg:40,reps:6},
 {id:"set-3",sessionId:"s-1",exerciseId:"run",distanceMeters:1000,durationSeconds:360},
];
const metrics = sessionMetrics(session,sets);
assert.equal(metrics.setCount,3);
assert.equal(metrics.totalReps,14);
assert.equal(metrics.volumeKg,560);
assert.equal(metrics.durationMinutes,30);
assert.equal(metrics.avgPaceSecondsPerKm,360);
const prs = derivePersonalRecords({
 exercises:[exercise],
 sessions:[session],
 exerciseSets:sets,
});
assert.equal(prs.length,1);
assert.equal(prs[0].value,50.67);
assert.equal(validateSportsImport({data:{exercises:[{id:"x"}]}}).ok,true);
assert.equal(validateSportsImport({data:{exercises:[{name:"missing-id"}]}}).ok,false);

import { generateWorkoutDays, validatePlannedExercise, plannedSetProgress, calculateWorkoutAdherence } from "../src/systems/sports/domain.js";
const generated = generateWorkoutDays({id:"p1",name:"3-day plan",durationWeeks:2,daysPerWeek:3,startDate:"2026-11-02"}, prefix => prefix+"-"+Math.random());
assert.equal(generated.ok, true);
assert.equal(generated.value.length, 6);
assert.equal(generated.value[0].scheduledDate, "2026-11-02");
assert.equal(generated.value[3].weekNumber, 2);
assert.equal(new Set(generated.value.map(x=>x.id)).size, 6);
assert.equal(generateWorkoutDays({id:"p",name:"bad",durationWeeks:1,daysPerWeek:3,startDate:"2026-02-31"}).ok, false);
assert.equal(validatePlannedExercise({targetSets:3,targetReps:10,restSeconds:90},{id:"ex",name:"Squat"},{id:"day",programId:"p"}).ok,true);
assert.equal(validatePlannedExercise({targetSets:0,targetReps:10},{id:"ex"},{id:"day",programId:"p"}).ok,false);
const plannedExercise = {id:"planned-1",exerciseId:"ex-1",targetSets:3,targetReps:10};
const plannedActualSets = [
  {id:"actual-1",plannedExerciseId:"planned-1",plannedSetNumber:1,sequence:1,reps:10},
  {id:"actual-2",plannedExerciseId:"planned-1",plannedSetNumber:2,sequence:2,reps:8},
  {id:"actual-extra",plannedExerciseId:"planned-1",plannedSetNumber:4,sequence:4,reps:6},
  {id:"historical",sessionId:"old-session",exerciseId:"ex-1",reps:20},
];
const setProgress = plannedSetProgress(plannedExercise, plannedActualSets);
assert.equal(setProgress.targetSets,3);
assert.equal(setProgress.completedSets,2);
assert.equal(setProgress.remainingSets,1);
assert.equal(setProgress.extraSets,1);
assert.equal(setProgress.actualReps,18);
const originalActualSnapshot = JSON.stringify(plannedActualSets);
const adherence = calculateWorkoutAdherence([
  plannedExercise,
  {id:"planned-2",exerciseId:"run",targetSets:2,targetReps:5},
], plannedActualSets);
assert.equal(JSON.stringify(plannedActualSets),originalActualSnapshot); // Progress calculation is read-only and preserves historical rows.
assert.equal(adherence.targetSets,5);
assert.equal(adherence.completedSets,2);
assert.equal(adherence.percentage,40);
assert.equal(adherence.targetReps,40);
assert.equal(adherence.actualReps,18);
assert.equal(adherence.exercised,1);
const noPlan = calculateWorkoutAdherence([], plannedActualSets);
assert.equal(noPlan.percentage,0);
assert.equal(noPlan.completedSets,0);
console.log("Sports OS scheduling tests passed.");

console.log("Sports OS domain tests passed.");
