import React, { useCallback, useEffect, useState } from "react";
import { supabase } from "../../core/supabase.js";

const GREEN="#059669",INK="#17211D",MUTED="#718078",LINE="#E4EBE6",BG="#F5F8F5";
const today=()=>new Date().toLocaleDateString("en-CA",{timeZone:"Africa/Cairo"});
const PERIODS=[["Manual","لقطة يدوية"],["Daily","يومية"],["Weekly","أسبوعية"],["Monthly","شهرية"]];
const PERIOD_LABEL=Object.fromEntries(PERIODS);
const money=(v,c="EGP")=>{if(v===null||v===undefined||v==="")return "غير متاح";try{return new Intl.NumberFormat("ar-EG",{style:"currency",currency:c,maximumFractionDigits:2}).format(Number(v));}catch{return String(v)+" "+c;}};
function Btn({children,secondary=false,...props}){return <button {...props} style={{border:secondary?"1px solid "+LINE:"1px solid "+GREEN,background:secondary?"#fff":GREEN,color:secondary?INK:"#fff",borderRadius:9,padding:"9px 12px",fontWeight:750,cursor:props.disabled?"not-allowed":"pointer",opacity:props.disabled?0.6:1,fontFamily:"inherit",fontSize:12}}>{children}</button>}
function Card({children,style={}}){return <div style={{background:"#fff",border:"1px solid "+LINE,borderRadius:14,padding:15,...style}}>{children}</div>}
function Metric({label,value,detail}){return <div style={{background:BG,border:"1px solid "+LINE,borderRadius:10,padding:11,minWidth:0}}><div style={{fontSize:11,color:MUTED,marginBottom:5}}>{label}</div><b style={{fontSize:17,overflowWrap:"anywhere"}}>{value}</b>{detail&&<div style={{fontSize:10,color:MUTED,marginTop:4}}>{detail}</div>}</div>}
function dateLabel(v){try{return new Date(v).toLocaleString("ar-EG",{dateStyle:"medium",timeStyle:"short"});}catch{return v||"—";}}

export default function FinanceNetWorthHistory({ws,access,isDemo=false}){
 const [current,setCurrent]=useState(null),[snapshots,setSnapshots]=useState([]),[periodType,setPeriodType]=useState("Manual");
 const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const canEdit=!isDemo&&(access?.level==="edit"||access?.manage||access?.owner);
 const load=useCallback(async()=>{
  if(!ws?.id||isDemo){setLoading(false);return;}
  setLoading(true);setError("");
  try{
   const [n,s]=await Promise.all([supabase.rpc("fin_net_worth",{p_ws:ws.id,p_as_of:today()}),supabase.rpc("fin_net_worth_snapshots_get",{p_ws:ws.id})]);
   if(n.error)throw n.error;if(s.error)throw s.error;
   setCurrent(n.data);setSnapshots(Array.isArray(s.data)?s.data:[]);
  }catch(e){setError(e?.message||"تعذّر تحميل سجل صافي الثروة.");}
  finally{setLoading(false);}
 },[ws?.id,isDemo]);
 useEffect(()=>{load();},[load]);
 async function createSnapshot(){if(!canEdit||saving)return;setSaving(true);setError("");setNotice("");
  try{const {data,error:err}=await supabase.rpc("fin_net_worth_snapshot_create",{p:{workspace_id:ws.id,period_type:periodType,as_of:today()}});
   if(err)throw err;
   setNotice(data?.duplicate?"توجد لقطة من النوع نفسه لهذه الفترة بالفعل؛ لم يتم إنشاء نسخة مكررة.":"تم حفظ لقطة صافي الثروة بنجاح.");
   await load();
  }catch(e){setError(e?.message||"تعذّر حفظ اللقطة.");}finally{setSaving(false);}}
 const currency=current?.base_currency||snapshots[0]?.base_currency||"EGP";
 const previous=snapshots.length>0?Number(snapshots[0].value_base):null;
 const nowValue=current?.net_worth==null?null:Number(current.net_worth);
 const change=nowValue===null||previous===null?null:nowValue-previous;
 if(isDemo)return <Card><h3 style={{marginTop:0}}>صافي الثروة وتاريخها</h3><p style={{color:"#92400E",fontSize:13}}>وضع العرض التجريبي للقراءة فقط.</p></Card>;
 return <div style={{display:"grid",gap:14,direction:"rtl"}}>
  {notice&&<div role="status" style={{background:"#ECFDF3",color:"#067647",padding:11,borderRadius:10,fontSize:12}}>{notice}</div>}
  {error&&<div role="alert" style={{background:"#FEF3F2",color:"#B42318",padding:11,borderRadius:10,fontSize:12}}>{error}<button onClick={()=>setError("")} style={{float:"left",border:0,background:"transparent",cursor:"pointer"}}>×</button></div>}
  <Card><div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",flexWrap:"wrap"}}><div><h3 style={{margin:0}}>صافي الثروة وسجل اللقطات</h3><p style={{margin:"6px 0 0",color:MUTED,fontSize:12,lineHeight:1.8}}>القيمة الحالية مشتقة من الحسابات والأصول والديون. اللقطة تحفظ القيم وسياق أسعار الصرف المتاح وقت الالتقاط ولا تُعاد كتابتها لاحقًا.</p></div><Btn secondary onClick={load} disabled={loading}>↻ تحديث</Btn></div>
   {loading?<p style={{textAlign:"center",color:MUTED,padding:20}}>جارٍ حساب صافي الثروة…</p>:current?<><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(165px,1fr))",gap:9,marginTop:14}}>
    <Metric label="صافي الثروة الحالي" value={money(current.net_worth,currency)} detail={"حتى "+today()}/>
    <Metric label="إجمالي الحسابات" value={money(current.accounts_total,currency)}/>
    <Metric label="الأصول" value={money(current.assets_total,currency)}/>
    <Metric label="المستحقات لك" value={money(current.receivables_total,currency)}/>
    <Metric label="الالتزامات" value={money(current.payables_total,currency)}/>
    <Metric label="اكتمال التقييم" value={current.complete?"مكتمل":"توجد قيم غير محسومة"} detail={current.unvalued?.length?("عناصر غير مقيمة: "+current.unvalued.length):"لا توجد عناصر غير مقيمة معروفة"}/>
   </div>
   {!current.complete&&<div style={{marginTop:10,padding:11,borderRadius:9,background:"#FFFAEB",color:"#92400E",fontSize:11,lineHeight:1.7}}>صافي الثروة الحالي تقديري/غير مكتمل بسبب عناصر لم يتوفر لها تقييم أو سعر صرف. اللقطة ستحفظ علامة عدم الاكتمال بدل افتراض أن القيم المجهولة تساوي صفرًا.</div>}
   </>:<p style={{color:MUTED,fontSize:12}}>تعذّر حساب صافي الثروة الحالية.</p>}
  </Card>
  <Card><h4 style={{margin:"0 0 8px"}}>التقاط لقطة جديدة</h4><p style={{margin:"0 0 12px",fontSize:11,color:MUTED,lineHeight:1.7}}>اليومية والأسبوعية والشهرية لا تُكرر لقطة الفترة نفسها. اللقطة اليدوية يمكن تكرارها أكثر من مرة.</p>
   <div style={{display:"grid",gridTemplateColumns:"minmax(180px,260px) auto",gap:9,alignItems:"end"}}><label style={{display:"grid",gap:6,fontSize:12,fontWeight:700,color:"#46544B"}}>نوع اللقطة<select value={periodType} onChange={e=>setPeriodType(e.target.value)} style={{width:"100%",boxSizing:"border-box",border:"1px solid #D8E2DB",borderRadius:9,padding:"10px 11px",background:"#fff",font:"inherit"}}>{PERIODS.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label><div><Btn onClick={createSnapshot} disabled={!canEdit||saving||loading}>{saving?"جارٍ الحفظ…":"حفظ لقطة صافي الثروة"}</Btn></div></div>
   {!canEdit&&<p style={{fontSize:11,color:MUTED,marginBottom:0}}>تحتاج صلاحية تعديل صافي الثروة لإنشاء لقطة.</p>}
  </Card>
  <Card><div style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"center",flexWrap:"wrap"}}><h4 style={{margin:0}}>سجل صافي الثروة</h4><span style={{fontSize:11,color:MUTED}}>آخر 100 لقطة</span></div>
   {!snapshots.length?<p style={{textAlign:"center",color:MUTED,padding:25,fontSize:12}}>لا توجد لقطات محفوظة بعد. احفظ أول لقطة لبدء تتبع التغير عبر الزمن.</p>:<div style={{overflowX:"auto",marginTop:10}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:660}}><thead><tr>{["تاريخ الالتقاط","النوع","صافي الثروة","الأصول","الالتزامات","الاكتمال"].map(x=><th key={x} style={{textAlign:"right",padding:10,color:MUTED,fontSize:11,borderBottom:"1px solid "+LINE,whiteSpace:"nowrap"}}>{x}</th>)}</tr></thead><tbody>{snapshots.map((s,i)=>{const delta=i<snapshots.length-1?Number(s.value_base)-Number(snapshots[i+1].value_base):null;return <tr key={s.id}><td style={{padding:10,borderBottom:"1px solid #EEF2EF",fontSize:12,whiteSpace:"nowrap"}}>{dateLabel(s.snapshot_at)}</td><td style={{padding:10,borderBottom:"1px solid #EEF2EF",fontSize:12}}>{PERIOD_LABEL[s.period_type]||s.period_type}</td><td style={{padding:10,borderBottom:"1px solid #EEF2EF",fontSize:12}}><b>{money(s.value_base,s.base_currency)}</b>{delta!==null&&<div style={{fontSize:10,color:delta>=0?"#047857":"#B42318"}}>{delta>=0?"+":""}{money(delta,s.base_currency)} مقارنة باللقطة التالية</div>}</td><td style={{padding:10,borderBottom:"1px solid #EEF2EF",fontSize:12}}>{money(s.total_assets_base,s.base_currency)}</td><td style={{padding:10,borderBottom:"1px solid #EEF2EF",fontSize:12}}>{money(s.total_liabilities_base,s.base_currency)}</td><td style={{padding:10,borderBottom:"1px solid #EEF2EF",fontSize:12}}><span style={{background:s.is_estimated?"#FFFAEB":"#ECFDF3",color:s.is_estimated?"#92400E":"#067647",padding:"4px 7px",borderRadius:999,fontSize:10}}>{s.is_estimated?"تقديرية":"مكتملة"}</span></td></tr>})}</tbody></table></div>}
  </Card>
  <Card style={{fontSize:11,color:MUTED,lineHeight:1.8}}>ملاحظة دقة: اللقطات تحفظ مكونات صافي الثروة المتاحة وقت الالتقاط وأسعارها، لكن ربط كل مكون بمعرّف ثابت في سجل اللقطة سيُستكمل لاحقًا؛ لذلك لا تزال تفاصيل التركيب التاريخي على مستوى كل حساب/أصل محدودة. لا توجد حتى الآن مهمة خلفية تنشئ اللقطات تلقائيًا؛ الالتقاط في هذه المرحلة يدوي من الشاشة.</Card>
 </div>;
}
