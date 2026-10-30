import React, { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../core/supabase.js";
const INK="#17211D", MUTED="#718078", LINE="#E4EBE6", GREEN="#059669";
const input={width:"100%",boxSizing:"border-box",border:"1px solid #D8E2DB",borderRadius:9,padding:"10px 11px",font:"inherit",fontSize:13,background:"#fff"};
const today=()=>new Date().toLocaleDateString("en-CA",{timeZone:"Africa/Cairo"});
const money=(v,c="EGP")=>{try{return new Intl.NumberFormat("ar-EG",{style:"currency",currency:c,maximumFractionDigits:2}).format(Number(v||0));}catch{return String(v||0)+" "+c;}};
function Field({label,children}){return <label style={{display:"grid",gap:6,fontSize:12,fontWeight:700,color:"#46544B"}}>{label}{children}</label>}
function Card({children,style={}}){return <section style={{background:"#fff",border:"1px solid "+LINE,borderRadius:14,padding:16,...style}}>{children}</section>}
function Btn({children,secondary=false,...props}){return <button {...props} style={{border:"1px solid "+(secondary?LINE:GREEN),background:secondary?"#fff":GREEN,color:secondary?INK:"#fff",borderRadius:9,padding:"10px 13px",fontWeight:750,cursor:props.disabled?"not-allowed":"pointer",fontFamily:"inherit",fontSize:12,opacity:props.disabled ? 0.6 : 1}}>{children}</button>}
export default function FinanceFamilyCash({ws,access,isDemo=false}){
 const [members,setMembers]=useState([]),[transactions,setTransactions]=useState([]),[advances,setAdvances]=useState([]),[entries,setEntries]=useState([]),[categories,setCategories]=useState([]);
 const [memberId,setMemberId]=useState(""),[transactionId,setTransactionId]=useState(""),[note,setNote]=useState("");
 const [advanceId,setAdvanceId]=useState(""),[entryType,setEntryType]=useState("Expense"),[amount,setAmount]=useState(""),[date,setDate]=useState(today()),[categoryId,setCategoryId]=useState(""),[description,setDescription]=useState(""),[receipt,setReceipt]=useState("");
 const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const canView=!isDemo&&!!ws?.id&&(access?.owner||access?.level==="view"||access?.level==="edit");
 const canEdit=!isDemo&&!!ws?.id&&(access?.owner||access?.level==="edit"||access?.manage);
 const load=useCallback(async()=>{
  if(!ws?.id||isDemo){setMembers([]);setTransactions([]);setAdvances([]);setEntries([]);setCategories([]);setLoading(false);return;}
  setLoading(true);setError("");
  try{
   const [m,t,a,e,c]=await Promise.all([
    supabase.from("finance_family_members").select("id,display_name,status").eq("workspace_id",ws.id).eq("status","Active").order("display_name"),
    supabase.from("finance_transactions").select("id,name,type,status,amount,currency,local_date,merchant").eq("workspace_id",ws.id).in("type",["Expense","Transfer"]).eq("status","Posted").order("local_date",{ascending:false}).limit(300),
    supabase.from("finance_family_cash_advances").select("id,family_member_id,disbursement_transaction_id,amount,currency,disbursed_on,note,status,created_at").eq("workspace_id",ws.id).order("disbursed_on",{ascending:false}),
    supabase.from("finance_family_cash_entries").select("id,advance_id,entry_type,amount,currency,entry_date,category_id,description,receipt_reference,created_at").eq("workspace_id",ws.id).order("entry_date",{ascending:false}),
    supabase.from("finance_categories").select("id,name,kind,archived").eq("workspace_id",ws.id).eq("archived",false).in("kind",["Expense","Both"]).order("name")
   ]);
   for(const r of [m,t,a,e])if(r.error)throw r.error;
   setMembers(m.data||[]);setTransactions(t.data||[]);setAdvances(a.data||[]);setEntries(e.data||[]);setCategories(c.error?[]:c.data||[]);
  }catch(err){setError(err?.message||"تعذّر تحميل سجل النقود المصروفة للأفراد. تحقق من تطبيق ترحيل قاعدة البيانات وصلاحيات Family.");}
  finally{setLoading(false);}
 },[ws?.id,isDemo]);
 useEffect(()=>{load();},[load]);
 const memberName=id=>members.find(m=>m.id===id)?.display_name||"فرد مؤرشف";
 const txById=useMemo(()=>Object.fromEntries(transactions.map(t=>[t.id,t])),[transactions]);
 const linked=new Set(advances.map(a=>a.disbursement_transaction_id));
 const availableTransactions=transactions.filter(t=>!linked.has(t.id));
 const selected=advances.find(a=>a.id===advanceId);
 const selectedEntries=entries.filter(e=>e.advance_id===advanceId);
 const remaining=a=>Number(a.amount)-entries.filter(e=>e.advance_id===a.id).reduce((s,e)=>s+Number(e.amount),0);
 async function linkTransaction(e){
  e.preventDefault();if(!canEdit||saving)return;if(!memberId||!transactionId){setError("اختر فردًا وحركة مالية مسجلة.");return;}
  setSaving(true);setError("");setNotice("");
  try{const {error:err}=await supabase.rpc("fin_family_cash_link_transaction",{p_workspace_id:ws.id,p_family_member_id:memberId,p_transaction_id:transactionId,p_note:note.trim()||null});if(err)throw err;setNotice("تم ربط حركة الصرف بالفرد. لم يتم إنشاء حركة مالية مكررة.");setTransactionId("");setNote("");await load();}
  catch(err){setError(err?.message||"تعذّر ربط حركة الصرف.");}finally{setSaving(false);}
 }
 async function addEntry(e){
  e.preventDefault();if(!canEdit||saving||!advanceId)return;
  if(!(Number(amount)>0)||!date||!description.trim()){setError("أدخل مبلغًا وتاريخًا ووصفًا.");return;}
  setSaving(true);setError("");setNotice("");
  try{const {error:err}=await supabase.rpc("fin_family_cash_add_entry",{p_workspace_id:ws.id,p_advance_id:advanceId,p_entry_type:entryType,p_amount:Number(amount),p_entry_date:date,p_category_id:categoryId||null,p_description:description.trim(),p_receipt_reference:receipt.trim()||null});if(err)throw err;setNotice(entryType==="Expense"?"تم تسجيل مصروف من العهدة.":"تم تسجيل المبلغ المرتجع.");setAmount("");setDescription("");setReceipt("");await load();}
  catch(err){setError(err?.message||"تعذّر تسجيل الحركة. قد يكون المبلغ أكبر من الرصيد المتبقي.");}finally{setSaving(false);}
 }
 if(isDemo)return <div dir="rtl" style={{color:INK}}><Card><h2>💵 عهد ومصروفات الأفراد</h2><p>اربط حركة صرف مسجلة بفرد، ثم سجّل مصروفاته أو المبلغ الذي أعاده. لا تُحفظ بيانات حقيقية في الوضع التجريبي.</p></Card></div>;
 return <div dir="rtl" style={{display:"grid",gap:14,color:INK}}>
  <div><h2 style={{margin:"0 0 6px"}}>💵 عهد ومصروفات الأفراد</h2><p style={{margin:0,color:MUTED,fontSize:13,lineHeight:1.8}}>اربط حركة صرف موجودة في دفتر الماليات بفرد، ثم سجّل ما أنفقه وما أعاده واعرف الرصيد المتبقي. مصروفات العهدة هنا سجل توثيقي ولا تُضاف مرة ثانية إلى دفتر الماليات.</p></div>
  {error&&<div role="alert" style={{padding:12,borderRadius:10,background:"#FFF1F0",color:"#B42318"}}>{error}</div>}{notice&&<div role="status" style={{padding:12,borderRadius:10,background:"#ECFDF3",color:"#067647"}}>{notice}</div>}
  {loading?<Card>جارٍ التحميل…</Card>:<>
   {canEdit&&<Card><h3 style={{marginTop:0}}>١. ربط مبلغ تم صرفه</h3><form onSubmit={linkTransaction} style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:11}}>
    <Field label="الفرد"><select required style={input} value={memberId} onChange={e=>setMemberId(e.target.value)}><option value="">اختر فردًا</option>{members.map(m=><option key={m.id} value={m.id}>{m.display_name}</option>)}</select></Field>
    <Field label="حركة الصرف المسجلة"><select required style={input} value={transactionId} onChange={e=>setTransactionId(e.target.value)}><option value="">اختر حركة Expense/Transfer</option>{availableTransactions.map(t=><option key={t.id} value={t.id}>{t.local_date} · {t.name||t.merchant||t.type} · {money(t.amount,t.currency)} · {t.type==="Transfer"?"تحويل":"مصروف"}</option>)}</select></Field>
    <Field label="ملاحظة (اختياري)"><input style={input} value={note} maxLength={500} onChange={e=>setNote(e.target.value)} placeholder="مصروف أسبوعي / عهدة مشتريات"/></Field>
    <div style={{alignSelf:"end"}}><Btn type="submit" disabled={saving||!members.length||!availableTransactions.length}>{saving?"جارٍ الربط…":"ربط الحركة بالفرد"}</Btn></div>
   </form>{!members.length&&<p style={{color:MUTED,fontSize:12}}>أضف أفراد الأسرة أولًا من مركز الأسرة.</p>}{!availableTransactions.length&&<p style={{color:MUTED,fontSize:12}}>لا توجد حركات صرف متاحة للربط. سجّل حركة Expense أو Transfer من صفحة الحركات المالية أولًا.</p>}</Card>}
   <Card><h3 style={{marginTop:0}}>٢. سجل العُهد</h3>{advances.length?<div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}><thead><tr>{["الفرد","تاريخ الصرف","المبلغ","المسجل","المتبقي","الحركة","التفاصيل"].map(h=><th key={h} style={{textAlign:"right",padding:10,borderBottom:"1px solid "+LINE,color:MUTED,whiteSpace:"nowrap"}}>{h}</th>)}</tr></thead><tbody>{advances.map(a=>{const used=entries.filter(e=>e.advance_id===a.id).reduce((s,e)=>s+Number(e.amount),0);const t=txById[a.disbursement_transaction_id];return <tr key={a.id}><td style={{padding:10,borderBottom:"1px solid "+LINE}}>{memberName(a.family_member_id)}</td><td style={{padding:10,borderBottom:"1px solid "+LINE}}>{a.disbursed_on}</td><td style={{padding:10,borderBottom:"1px solid "+LINE}}>{money(a.amount,a.currency)}</td><td style={{padding:10,borderBottom:"1px solid "+LINE}}>{money(used,a.currency)}</td><td style={{padding:10,borderBottom:"1px solid "+LINE,fontWeight:800,color:remaining(a)<0?"#B42318":GREEN}}>{money(remaining(a),a.currency)}</td><td style={{padding:10,borderBottom:"1px solid "+LINE}}>{t?.name||t?.merchant||"حركة مسجلة"}</td><td style={{padding:10,borderBottom:"1px solid "+LINE}}><Btn secondary onClick={()=>setAdvanceId(a.id)}>عرض/إضافة مصروفات</Btn></td></tr>})}</tbody></table></div>:<p style={{color:MUTED,fontSize:13}}>لم يتم ربط أي حركات صرف بأفراد بعد.</p>}</Card>
   {selected&&<Card><h3 style={{marginTop:0}}>٣. مصروفات {memberName(selected.family_member_id)} — المتبقي {money(remaining(selected),selected.currency)}</h3>{canEdit&&<form onSubmit={addEntry} style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(155px,1fr))",gap:10,marginBottom:16}}>
    <Field label="نوع الحركة"><select style={input} value={entryType} onChange={e=>setEntryType(e.target.value)}><option value="Expense">مصروف</option><option value="Return">مبلغ مرتجع</option></select></Field>
    <Field label="المبلغ"><input required type="number" min="0.01" step="0.01" style={input} value={amount} onChange={e=>setAmount(e.target.value)}/></Field>
    <Field label="التاريخ"><input required type="date" style={input} value={date} onChange={e=>setDate(e.target.value)}/></Field>
    <Field label="التصنيف"><select style={input} value={categoryId} onChange={e=>setCategoryId(e.target.value)}><option value="">بدون تصنيف</option>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
    <Field label="الوصف"><input required maxLength={300} style={input} value={description} onChange={e=>setDescription(e.target.value)} placeholder="مثال: مشتريات منزل"/></Field>
    <Field label="مرجع إيصال (اختياري)"><input maxLength={500} style={input} value={receipt} onChange={e=>setReceipt(e.target.value)} placeholder="رقم إيصال أو رابط آمن"/></Field>
    <div style={{alignSelf:"end"}}><Btn type="submit" disabled={saving||remaining(selected)<=0}>{saving?"جارٍ الحفظ…":"تسجيل الحركة"}</Btn></div>
   </form>}
   {selectedEntries.length?<div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}><thead><tr>{["التاريخ","النوع","الوصف","التصنيف","المبلغ","الإيصال"].map(h=><th key={h} style={{textAlign:"right",padding:10,borderBottom:"1px solid "+LINE,color:MUTED,whiteSpace:"nowrap"}}>{h}</th>)}</tr></thead><tbody>{selectedEntries.map(e=><tr key={e.id}><td style={{padding:10,borderBottom:"1px solid "+LINE}}>{e.entry_date}</td><td style={{padding:10,borderBottom:"1px solid "+LINE}}>{e.entry_type==="Expense"?"مصروف":"مرتجع"}</td><td style={{padding:10,borderBottom:"1px solid "+LINE}}>{e.description}</td><td style={{padding:10,borderBottom:"1px solid "+LINE}}>{categories.find(c=>c.id===e.category_id)?.name||"—"}</td><td style={{padding:10,borderBottom:"1px solid "+LINE}}>{money(e.amount,e.currency)}</td><td style={{padding:10,borderBottom:"1px solid "+LINE}}>{e.receipt_reference||"—"}</td></tr>)}</tbody></table></div>:<p style={{color:MUTED,fontSize:13}}>لا توجد مصروفات مسجلة لهذه العهدة بعد.</p>}
   </Card>}
  </>}
 </div>;
}
