const EVENT_KEY="os-hub:integration-events:v1";
const MAX_EVENTS=500;
const safeParse=value=>{try{return JSON.parse(value||"[]");}catch{return [];}};
export function publishOSEvent(event,workspaceId="default"){
 const item={id:globalThis.crypto?.randomUUID?.()||"evt-"+Date.now()+"-"+Math.random().toString(36).slice(2),workspaceId,source:"learning",type:event.type,entityType:event.entityType||null,entityId:event.entityId||null,occurredAt:event.occurredAt||new Date().toISOString(),payload:event.payload||{},version:1};
 try{const old=safeParse(localStorage.getItem(EVENT_KEY));localStorage.setItem(EVENT_KEY,JSON.stringify([...old,item].slice(-MAX_EVENTS)));}catch{}
 if(typeof window!=="undefined"){try{window.dispatchEvent(new CustomEvent("os-hub:integration-event",{detail:item}));}catch{}}
 return item;
}
export function readOSEvents({workspaceId="default",after=null,limit=100}={}){
 const items=typeof localStorage==="undefined"?[]:safeParse(localStorage.getItem(EVENT_KEY));
 return items.filter(x=>x.workspaceId===workspaceId&&(!after||x.occurredAt>after)).slice(-Math.max(1,Math.min(500,limit)));
}
export function subscribeOSEvents(handler){
 if(typeof window==="undefined")return()=>{};
 const listener=e=>{if(e?.detail)handler(e.detail);};
 window.addEventListener("os-hub:integration-event",listener);
 return()=>window.removeEventListener("os-hub:integration-event",listener);
}
