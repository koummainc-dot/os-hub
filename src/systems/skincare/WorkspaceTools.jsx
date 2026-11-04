import React, { useMemo, useState } from "react";
import { buildSkinComparisonMatrix, serializeSkinComparisonCsv, normalizeSkinSearchText } from "./domain.js";

const C={ink:"#182230",muted:"#64748B",line:"#E2E8F0",white:"#FFFFFF",accent:"#A855F7",soft:"#FAF5FF",danger:"#B91C1C"};
const panel={background:C.white,border:"1px solid "+C.line,borderRadius:14,padding:15,marginBottom:12};
const field={width:"100%",boxSizing:"border-box",padding:"9px 10px",border:"1px solid "+C.line,borderRadius:9,font:"inherit",color:C.ink,background:C.white};
const label={display:"grid",gap:5,color:C.muted,fontSize:12,fontWeight:650};
const btn=(primary=false,danger=false)=>({border:"1px solid "+(primary?C.accent:danger?"#FECACA":C.line),background:primary?C.accent:C.white,color:primary?C.white:danger?C.danger:C.ink,borderRadius:9,padding:"8px 11px",font:"inherit",fontSize:12,fontWeight:700,cursor:"pointer"});
const dateValue=v=>String(v||"").slice(0,10);
const fmt=v=>v==null||v===""?"—":String(v);

export function SkinCompareView({products=[],units=[],ingredients=[],todayKey=""}){
 const [selected,setSelected]=useState([]);
 const options=products.filter(p=>!p.deleted_at);
 const toggle=id=>setSelected(old=>old.includes(id)?old.filter(x=>x!==id):old.length<3?[...old,id]:old);
 const rows=selected.map(id=>options.find(p=>p.id===id)).filter(Boolean);
 const matrix=buildSkinComparisonMatrix(rows,units,ingredients,todayKey||new Date().toISOString().slice(0,10));
 const exportCsv=()=>{
  const blob=new Blob([serializeSkinComparisonCsv(matrix)],{type:"text/csv;charset=utf-8"});
  const url=URL.createObjectURL(blob);const link=document.createElement("a");link.href=url;link.download="skincare-product-comparison.csv";document.body.appendChild(link);link.click();link.remove();URL.revokeObjectURL(url);
 };
 return <section style={panel}>
  <div style={{display:"flex",justifyContent:"space-between",gap:8,flexWrap:"wrap",alignItems:"center"}}><b>مقارنة المنتجات</b><span style={{fontSize:11,color:C.muted}}>اختر حتى 3 منتجات</span></div>
  <div style={{display:"flex",gap:7,flexWrap:"wrap",marginTop:10}}>
   {options.map(p=><button key={p.id} type="button" onClick={()=>toggle(p.id)} style={btn(selected.includes(p.id))}>{selected.includes(p.id)?"✓ ":""}{p.name}</button>)}
  </div>
  {!rows.length?<p style={{fontSize:12,color:C.muted}}>اختر منتجات لعرض الفروقات المتاحة. لا يتم استنتاج الأفضل طبيًا من هذه المقارنة.</p>:<>
   <div style={{display:"flex",justifyContent:"flex-end",marginTop:10}}><button type="button" style={btn(true)} onClick={exportCsv}>تصدير المقارنة CSV</button></div>
   <div style={{overflowX:"auto",marginTop:12}}>
    <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:Math.max(520,rows.length*180)}}>
     <thead><tr>{matrix[0].map((cell,i)=><th key={i} style={{textAlign:"right",padding:8,borderBottom:"1px solid "+C.line}}>{cell}</th>)}</tr></thead>
     <tbody>{matrix.slice(1).map((row,i)=><tr key={row[0]}>{row.map((cell,j)=><td key={j} style={{padding:8,borderBottom:"1px solid "+C.line,verticalAlign:"top",color:j===0?C.muted:C.ink}}>{row[0]==="رابط المنتج"&&j>0&&rows[j-1]?.url?<a href={rows[j-1].url} target="_blank" rel="noreferrer">فتح الرابط</a>:cell}</td>)}</tr>)}</tbody>
    </table>
   </div>
  </>}
 </section>;
}

export function SkinListsView({lists=[],deletedLists=[],products=[],canEdit=false,busy=false,onSave,onDelete,onRestore,onToggleProduct}){
 const [draft,setDraft]=useState({name:"",kind:"custom",notes:""});
 const [editing,setEditing]=useState("");
 const [active,setActive]=useState("");
 const [error,setError]=useState("");
 const save=async e=>{e.preventDefault();if(!draft.name.trim())return setError("اسم القائمة مطلوب.");const current=lists.find(x=>x.id===editing);const result=await onSave({...current,...draft,id:editing||undefined,productIds:current?.productIds||[]});if(result){setDraft({name:"",kind:"custom",notes:""});setEditing("");setError("");}};
 const edit=item=>{setEditing(item.id);setDraft({name:item.name||"",kind:item.kind||"custom",notes:item.notes||""});};
 return <><section style={panel}>
  <b>{editing?"تعديل قائمة":"إنشاء قائمة منتجات"}</b>
  {canEdit?<form onSubmit={save} style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:9,marginTop:10}}>
   <label style={label}>اسم القائمة<input style={field} required maxLength={100} value={draft.name} onChange={e=>setDraft(x=>({...x,name:e.target.value}))}/></label>
   <label style={label}>النوع<select style={field} value={draft.kind} onChange={e=>setDraft(x=>({...x,kind:e.target.value}))}>{[["wishlist","رغبات"],["favorites","مفضلة"],["empties","منتجات انتهت"],["custom","مخصصة"]].map(([v,t])=><option key={v} value={v}>{t}</option>)}</select></label>
   <label style={{...label,gridColumn:"1/-1"}}>ملاحظات<textarea style={field} value={draft.notes} maxLength={1000} onChange={e=>setDraft(x=>({...x,notes:e.target.value}))}/></label>
   <div style={{display:"flex",gap:7,gridColumn:"1/-1"}}><button style={btn(true)} disabled={busy}>{busy?"جارٍ الحفظ…":editing?"حفظ التعديلات":"إنشاء القائمة"}</button>{editing&&<button type="button" style={btn()} onClick={()=>{setEditing("");setDraft({name:"",kind:"custom",notes:""});}}>إلغاء</button>}</div>
  </form>:<p style={{fontSize:12,color:C.muted}}>صلاحية العرض فقط.</p>}
  {error&&<p role="alert" style={{fontSize:12,color:C.danger}}>{error}</p>}
 </section>
 <section style={panel}><b>قوائمك ({lists.length})</b>
  {!lists.length&&<p style={{fontSize:12,color:C.muted}}>لا توجد قوائم بعد.</p>}
  {lists.map(list=><article key={list.id} style={{borderTop:"1px solid "+C.line,padding:"12px 0"}}>
   <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}><b>{list.name}</b><span style={{fontSize:10,color:C.muted}}>{({wishlist:"رغبات",favorites:"مفضلة",empties:"منتهية",custom:"مخصصة"})[list.kind]||"مخصصة"} · {(list.productIds||[]).length} منتج</span><span style={{flex:1}}/><button style={btn()} onClick={()=>setActive(active===list.id?"":list.id)}>{active===list.id?"إغلاق":"إدارة المنتجات"}</button>{canEdit&&<><button style={btn()} onClick={()=>edit(list)}>تعديل</button><button style={btn(false,true)} onClick={()=>onDelete(list)}>حذف</button></>}</div>
   {list.notes&&<p style={{fontSize:11,color:C.muted}}>{list.notes}</p>}
   {active===list.id&&<div style={{display:"grid",gap:7,marginTop:9}}>{products.filter(p=>!p.deleted_at).map(p=>{const included=(list.productIds||[]).includes(p.id);return <label key={p.id} style={{display:"flex",gap:8,alignItems:"center",fontSize:12}}><input type="checkbox" checked={included} disabled={!canEdit || busy} onChange={()=>onToggleProduct(list,p)}/><span>{p.name}</span><span style={{color:C.muted,fontSize:10}}>{p.brand||""}</span></label>;})}</div>}
  </article>)}
  {!!deletedLists.length&&<details style={{marginTop:10}}><summary style={{cursor:"pointer",fontSize:11,color:C.muted}}>القوائم المحذوفة ({deletedLists.length})</summary>{deletedLists.map(item=><div key={item.id} style={{display:"flex",gap:8,alignItems:"center",padding:"8px 0",borderTop:"1px solid "+C.line,fontSize:12}}><span style={{flex:1}}>{item.name}</span>{canEdit&&<button style={btn()} onClick={()=>onRestore(item)}>استعادة</button>}</div>)}</details>}
 </section></>;
}

export function RoutineLogsView({logs=[],deletedLogs=[],routines=[],products=[],canEdit=false,busy=false,onUndo,onRestore}){
 const [status,setStatus]=useState("all");
 const [routineId,setRoutineId]=useState("all");
 const [query,setQuery]=useState("");
 const [from,setFrom]=useState("");
 const [to,setTo]=useState("");
 const rows=useMemo(()=>logs.filter(x=>{
  const routine=routines.find(r=>r.id===x.routineId);
  const step=routine?.steps?.find(s=>s.id===x.stepId);
  const product=products.find(p=>p.id===step?.productId);
  const needle=normalizeSkinSearchText(query);
  const matchesQuery=!needle||[routine?.name,product?.name,step?.category,x.date,x.status].some(value=>normalizeSkinSearchText(value).includes(needle));
  return matchesQuery&&(status==="all"||x.status===status)&&(routineId==="all"||x.routineId===routineId)&&(!from||x.date>=from)&&(!to||x.date<=to);
 }).sort((a,b)=>String(b.date).localeCompare(String(a.date))||String(b.createdAt||"").localeCompare(String(a.createdAt||""))),[logs,routines,products,query,status,routineId,from,to]);
 return <section style={panel}>
  <div style={{display:"flex",justifyContent:"space-between",gap:8,flexWrap:"wrap"}}><b>سجل إنجاز الروتين</b><span style={{fontSize:11,color:C.muted}}>{rows.length} سجل</span></div>
  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:8,margin:"12px 0"}}>
   <label style={label}>بحث في السجلات<input aria-label="البحث في سجل الروتين" style={field} value={query} onChange={e=>setQuery(e.target.value)} placeholder="اسم الروتين أو المنتج أو التاريخ"/></label>
   <label style={label}>الروتين<select style={field} value={routineId} onChange={e=>setRoutineId(e.target.value)}><option value="all">كل الروتينات</option>{routines.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
   <label style={label}>الحالة<select style={field} value={status} onChange={e=>setStatus(e.target.value)}><option value="all">الكل</option><option value="done">تم</option><option value="skipped">تم التخطي</option></select></label>
   <label style={label}>من تاريخ<input style={field} type="date" value={from} onChange={e=>setFrom(e.target.value)}/></label>
   <label style={label}>إلى تاريخ<input style={field} type="date" value={to} onChange={e=>setTo(e.target.value)}/></label>
  </div>
  {from&&to&&from>to&&<p role="alert" style={{fontSize:12,color:C.danger}}>تاريخ البداية يجب ألا يتجاوز تاريخ النهاية.</p>}
  {!rows.length&&<p style={{fontSize:12,color:C.muted}}>لا توجد سجلات مطابقة للبحث والفلاتر.</p>}
  {rows.map(log=>{const routine=routines.find(r=>r.id===log.routineId);const step=routine?.steps?.find(s=>s.id===log.stepId);const product=products.find(p=>p.id===step?.productId);return <article key={log.id} style={{borderTop:"1px solid "+C.line,padding:"10px 0",display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}><span>{log.status==="done"?"✓":"↷"}</span><div style={{flex:1,minWidth:170}}><b style={{fontSize:12}}>{routine?.name||"روتين محذوف"}</b><div style={{fontSize:11,color:C.muted}}>{product?.name||step?.category||"خطوة"} · {log.date} · {log.status==="done"?"تم التنفيذ":"تم التخطي"}</div></div>{canEdit&&<button style={btn()} disabled={busy} onClick={()=>onUndo(log)}>نقل السجل إلى المحذوفات</button>}</article>;})}
  {!!deletedLogs.length&&<details style={{marginTop:10}}><summary style={{cursor:"pointer",fontSize:11,color:C.muted}}>سجلات محذوفة ({deletedLogs.length})</summary>{deletedLogs.map(log=><div key={log.id} style={{display:"flex",gap:8,alignItems:"center",padding:"8px 0",borderTop:"1px solid "+C.line,fontSize:11}}><span style={{flex:1}}>{log.date} · {log.status} · {log.id}</span>{canEdit&&<button style={btn()} disabled={busy} onClick={()=>onRestore(log)}>استعادة</button>}</div>)}</details>}
 </section>;
}

const DEFAULT_SETTINGS={timezone:"Africa/Cairo",weekStartDay:6,trialDays:28,expirySoonDays:30,photoReminderDays:14,comparisonWindowDays:30,quietStart:"22:00",quietEnd:"08:00",unitsSystem:"metric",requireConfirmAvoid:true,adherenceThreshold:80,minDaysForCorrelation:14,minDaysForAverage:3};
export function SkinSettingsView({settings,canEdit=false,busy=false,onSave}){
 const [draft,setDraft]=useState({...DEFAULT_SETTINGS,...settings});
 const [message,setMessage]=useState("");
 React.useEffect(()=>setDraft({...DEFAULT_SETTINGS,...settings}),[settings]);
 const set=(key,value)=>setDraft(x=>({...x,[key]:value}));
 const save=async e=>{e.preventDefault();const result=await onSave(draft);setMessage(result?"تم حفظ الإعدادات.":"تعذر حفظ الإعدادات؛ راجع القيم والصلاحيات.");};
 return <section style={panel}>
  <b>إعدادات Skincare OS</b><p style={{fontSize:11,color:C.muted,lineHeight:1.7}}>تؤثر هذه الإعدادات على حساب الأيام والتذكيرات وحدود المقارنة. لا تُرسل إشعارات خارج التطبيق إلا عند ربط مزود الإشعارات الموحد.</p>
  <form onSubmit={save} style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:10}}>
   <label style={label}>المنطقة الزمنية<select style={field} value={draft.timezone} onChange={e=>set("timezone",e.target.value)}>{["Africa/Cairo","Asia/Riyadh","Asia/Dubai","Europe/London","Europe/Paris","America/New_York","UTC"].map(x=><option key={x}>{x}</option>)}</select></label>
   <label style={label}>بداية الأسبوع<select style={field} value={draft.weekStartDay} onChange={e=>set("weekStartDay",Number(e.target.value))}><option value="0">الأحد</option><option value="1">الاثنين</option><option value="6">السبت</option></select></label>
   <label style={label}>مدة التجربة الافتراضية (يوم)<input style={field} type="number" min="1" max="180" value={draft.trialDays} onChange={e=>set("trialDays",Number(e.target.value))}/></label>
   <label style={label}>نافذة قرب الانتهاء (يوم)<input style={field} type="number" min="1" max="180" value={draft.expirySoonDays} onChange={e=>set("expirySoonDays",Number(e.target.value))}/></label>
   <label style={label}>تذكير الصور (يوم)<input style={field} type="number" min="1" max="365" value={draft.photoReminderDays} onChange={e=>set("photoReminderDays",Number(e.target.value))}/></label>
   <label style={label}>نافذة المقارنة (يوم)<input style={field} type="number" min="7" max="180" value={draft.comparisonWindowDays} onChange={e=>set("comparisonWindowDays",Number(e.target.value))}/></label>
   <label style={label}>ساعات الهدوء — البداية<input style={field} type="time" value={draft.quietStart} onChange={e=>set("quietStart",e.target.value)}/></label>
   <label style={label}>ساعات الهدوء — النهاية<input style={field} type="time" value={draft.quietEnd} onChange={e=>set("quietEnd",e.target.value)}/></label>
   <label style={label}>وحدات القياس<select style={field} value={draft.unitsSystem} onChange={e=>set("unitsSystem",e.target.value)}><option value="metric">متري</option><option value="imperial">إمبراطوري</option></select></label>
   <label style={label}>عتبة الالتزام (%)<input style={field} type="number" min="1" max="100" value={draft.adherenceThreshold} onChange={e=>set("adherenceThreshold",Number(e.target.value))}/></label>
   <label style={label}>أقل أيام للارتباط<input style={field} type="number" min="5" max="90" value={draft.minDaysForCorrelation} onChange={e=>set("minDaysForCorrelation",Number(e.target.value))}/></label>
   <label style={label}>أقل أيام للمتوسط<input style={field} type="number" min="1" max="30" value={draft.minDaysForAverage} onChange={e=>set("minDaysForAverage",Number(e.target.value))}/></label>
   <label style={{display:"flex",alignItems:"center",gap:8,fontSize:12,gridColumn:"1/-1"}}><input type="checkbox" checked={!!draft.requireConfirmAvoid} onChange={e=>set("requireConfirmAvoid",e.target.checked)}/> طلب تأكيد إضافي عند استخدام منتج موسوم «تجنب»</label>
   {canEdit&&<div style={{gridColumn:"1/-1"}}><button style={btn(true)} disabled={busy}>{busy?"جارٍ الحفظ…":"حفظ الإعدادات"}</button></div>}
  </form>
  {!canEdit&&<p style={{fontSize:12,color:C.muted}}>صلاحية العرض فقط.</p>}
  {message&&<p role="status" style={{fontSize:12,color:C.accent}}>{message}</p>}
 </section>;
}
