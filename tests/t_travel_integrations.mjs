import assert from "node:assert/strict";
import {buildTravelCalendarReference,buildTravelReminderReference,travelSourceKey,getTravelIntegrationStatus} from "../src/systems/travel/integrations.js";

const first=travelSourceKey("ws 1","itinerary","item/1");
assert.equal(first,travelSourceKey("ws 1","itinerary","item/1"),"source key must be deterministic");
assert.notEqual(first,travelSourceKey("ws 1","itinerary","item/2"));
assert.equal(travelSourceKey("", "itinerary", "item"),null);

const reminder=buildTravelReminderReference("ws-1",{id:"booking:book-1",type:"cancellation",date:"2026-12-01",title:"Hotel"});
assert.equal(reminder.sourceSystem,"travel");
assert.equal(reminder.sourceRecordId,"book-1");
assert.equal(reminder.deliveryOwner,"notifications");
assert.equal(reminder.sourceKey,buildTravelReminderReference("ws-1",{id:"booking:book-1",type:"cancellation",date:"2026-12-01",title:"Hotel"}).sourceKey);
assert.equal(buildTravelReminderReference("ws-1",{id:"booking:book-1",type:"cancellation"}),null);
assert.equal(buildTravelReminderReference("ws-1",{id:"x",type:"unknown",date:"2026-12-01"}),null);

const calendar=buildTravelCalendarReference("ws-1",{id:"it-1",title:"Museum",date:"2026-12-01",startTime:"09:00",endTime:"10:00"},{timeZone:"Africa/Cairo"});
assert.equal(calendar.sourceSystem,"travel");
assert.equal(calendar.sourceRecordId,"it-1");
assert.equal(calendar.timeZone,"Africa/Cairo");
assert.equal(calendar.writeMode,"reference-only");
assert.equal(buildTravelCalendarReference("ws-1",{id:"it-1"}),null);

assert.deepEqual(getTravelIntegrationStatus({}).map(x=>x.available),[false,false,false]);
const status=getTravelIntegrationStatus({integrations:{files:{upload(){},getUrl(){},remove(){}},notifications:{upsert(){},cancel(){}},calendar:{upsert(){},remove(){}}}});
assert.deepEqual(status.map(x=>x.available),[true,true,true]);
assert.equal(getTravelIntegrationStatus({integrations:{files:{upload(){}}})[0].available,false,"partial file adapter must not be treated as ready");
console.log("Travel compatibility integration tests passed");
