import React,{useState} from "react";
import {supabase} from "../../core/supabase.js";
export default function RecurringDueAction({ws,item,onDone,disabled=false}){
 const [busy,setBusy]=useState(false);
 async function advance(){
  if(busy||disabled)return;
  if(!globalThis.confirm("سيتم تسجيل الاستحقاق الحالي كمؤجل دون إنشاء حركة مالية، ثم نقل الموعد التالي. هل تريد المتابعة؟"))return;
  setBusy(true);
  try{
   const p={workspace_id:ws.id,recurring_id:item.id,reason:"Deferred by user from recurring screen",idempotency_key:"recurring-defer-"+globalThis.crypto.randomUUID()};
   const {data,error}=await supabase.rpc("fin_recurring_defer",{p});
   if(error)throw error;
   onDone?.("تم تأجيل الاستحقاق دون تسجيل حركة مالية. الموعد التالي: "+(data?.next_payment_date||"تم التحديث"));
  }catch(e){onDone?.(e?.message||"تعذّر تأجيل الاستحقاق",true);}
  finally{setBusy(false);}
 }
 return <button type="button" disabled={busy||disabled} onClick={advance} style={{border:"1px solid #E4EBE6",background:"#fff",color:"#17211D",borderRadius:9,padding:"10px 13px",fontWeight:750,cursor:busy||disabled?"not-allowed":"pointer",opacity:busy||disabled?.6:1,fontFamily:"inherit",fontSize:12}}>{busy?"جارٍ التأجيل…":"تأجيل الاستحقاق"}</button>;
}
