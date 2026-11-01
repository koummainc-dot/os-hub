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
console.log("Sports OS domain tests passed.");
