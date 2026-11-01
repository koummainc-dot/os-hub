import assert from "node:assert/strict";
import {buildTravelCalendarReference,buildTravelReminderReference,travelSourceKey,getTravelIntegrationStatus,createTravelIntegrationBridge} from "../src/systems/travel/integrations.js";

const first=travelSourceKey("ws 1","itinerary","item/1");
assert.equal(first,travelSourceKey("ws 1","itinerary","item/1"),"source key must be deterministic");
assert.notEqual(first,travelSourceKey("ws 1","itinerary","item/2"));
assert.equal(travelSourceKey("", "itinerary", "item"),null);

const reminder=buildTravelReminderReference("ws-1",{id:"booking:book-1",type:"cancellation",date:"2026-12-01",title:"Hotel"});
assert.equal(reminder.sourceSystem,"travel");
assert.equal(reminder.workspaceId,"ws-1");
assert.equal(reminder.sourceRecordId,"book-1");
assert.equal(reminder.deliveryOwner,"notifications");
assert.equal(reminder.sourceKey,buildTravelReminderReference("ws-1",{id:"booking:book-1",type:"cancellation",date:"2026-12-01",title:"Hotel"}).sourceKey);
assert.equal(buildTravelReminderReference("ws-1",{id:"booking:book-1",type:"cancellation"}),null);
assert.equal(buildTravelReminderReference("ws-1",{id:"x",type:"unknown",date:"2026-12-01"}),null);
assert.equal(buildTravelReminderReference("",{id:"booking:1",type:"cancellation",date:"2026-12-01"}),null);

const calendar=buildTravelCalendarReference("ws-1",{id:"it-1",title:"Museum",date:"2026-12-01",startTime:"09:00",endTime:"10:00"},{timeZone:"Africa/Cairo"});
assert.equal(calendar.sourceSystem,"travel");
assert.equal(calendar.workspaceId,"ws-1");
assert.equal(calendar.sourceRecordId,"it-1");
assert.equal(calendar.timeZone,"Africa/Cairo");
assert.equal(calendar.writeMode,"reference-only");
assert.equal(buildTravelCalendarReference("ws-1",{id:"it-1"}),null);

assert.deepEqual(getTravelIntegrationStatus({}).map(x=>x.available),[false,false,false]);
const status=getTravelIntegrationStatus({integrations:{files:{upload(){},getUrl(){},remove(){}},notifications:{upsert(){},cancel(){}},calendar:{upsert(){},remove(){}}}});
assert.deepEqual(status.map(x=>x.available),[true,true,true]);
assert.equal(getTravelIntegrationStatus({integrations:{files:{upload(){}}})[0].available,false,"partial file adapter must not be treated as ready");

const unavailableBridge=createTravelIntegrationBridge({}, "ws-1");
assert.deepEqual(unavailableBridge.status,{files:false,notifications:false,calendar:false});
assert.equal((await unavailableBridge.upsertReminder(reminder)).reason,"integration-unavailable","missing services fail closed");

const calls=[];
const services={integrations:{
  files:{
    async upload(payload){calls.push(["upload",payload]);return {ok:true,fileRef:{id:"file-1"}};},
    async getUrl(payload){calls.push(["getUrl",payload]);return {ok:true,url:"signed://temporary"};},
    async remove(payload){calls.push(["removeFile",payload]);return {ok:true};}
  },
  notifications:{
    async upsert(payload){calls.push(["reminderUpsert",payload]);return {ok:true};},
    async cancel(payload){calls.push(["reminderCancel",payload]);return {ok:true};}
  },
  calendar:{
    async upsert(payload){calls.push(["calendarUpsert",payload]);return {ok:true};},
    async remove(payload){calls.push(["calendarRemove",payload]);return {ok:true};}
  }
}};
const bridge=createTravelIntegrationBridge(services,"ws-1");
assert.deepEqual(bridge.status,{files:true,notifications:true,calendar:true});
assert.equal((await bridge.upsertReminder({...reminder,workspaceId:"other-ws"})).reason,"invalid-reference","cross-workspace reminder references must be rejected");
assert.equal((await bridge.upsertCalendarEvent({...calendar,workspaceId:"other-ws"})).reason,"invalid-reference","cross-workspace calendar references must be rejected");
assert.equal((await bridge.uploadFile({recordType:"document",recordId:"doc-1",file:{name:"passport.pdf"}})).ok,true);
assert.equal((await bridge.getFileUrl({id:"file-1"})).ok,true);
assert.equal((await bridge.removeFile({id:"file-1"})).ok,true);
assert.equal((await bridge.upsertReminder(reminder)).ok,true);
assert.equal((await bridge.cancelReminder(reminder)).ok,true);
assert.equal((await bridge.upsertCalendarEvent(calendar)).ok,true);
assert.equal((await bridge.removeCalendarEvent(calendar)).ok,true);
assert.equal(calls.length,7);
assert.equal(calls[0][1].workspaceId,"ws-1");
assert.equal(calls[0][1].sourceSystem,"travel");
assert.equal(calls[3][1].sourceKey,reminder.sourceKey,"reminder upsert must retain the stable idempotency key");

const throwingBridge=createTravelIntegrationBridge({integrations:{files:{upload:async()=>{throw new Error("denied")},getUrl(){},remove(){}}}},"ws-1");
assert.equal((await throwingBridge.uploadFile({recordType:"document",recordId:"d1",file:{}})).reason,"integration-error");
console.log("Travel compatibility integration tests passed");
