import React, { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../core/supabase.js";

const GREEN="#059669",INK="#17211D",MUTED="#718078",LINE="#E4EBE6",BG="#F5F8F5";
const today=()=>new Date().toLocaleDateString("en-CA",{timeZone:"Africa/Cairo"});
const input={width:"100%",minWidth:0,boxSizing:"border-box",border:"1px solid #D8E2DB",borderRadius:9,padding:"10px 11px",background:"#fff",color:INK,font:"inherit",fontSize:13};
const ASSET_TYPES=[["Property","عقار"],["Vehicle","مركبة"],["Electronics","إلكترونيات"],["Jewelry","مجوهرات"],["Investment","استثمار"],["Cash-like","نقد وما يشبهه"],["Other","أخرى"]];
const TYPE_LABEL=Object.fromEntries(ASSET_TYPES);
const SOURCE_LABEL={manual:"تقييم يدوي",market:"سعر سوق",inventory_estimate:"تقدير من الجرد — يحتاج تأكيدًا"};
const money=(v,c="EGP")=>{if(v===null||v===undefined||v==="")return "غير متاح";try{return new Intl.NumberFormat("ar-EG",{style:"currency",currency:c,maximumFractionDigits:2}).format(Number(v));}catch{return String(v)+" "+c;}};
function Field({label,children}){return <label style={{display:"grid",gap:6,color:"#46544B",fontSize:12,fontWeight:700}}>{label}{children}</label>}
function Btn({children,secondary=false,...props}){return <button {...props} style={{border:secondary?"1px solid "+LINE:"1px solid "+GREEN,background:secondary?"#fff":GREEN,color:secondary?INK:"#fff",borderRadius:9,padding:"9px 12px",fontWeight:750,cursor:props.disabled?"not-allowed":"pointer",opacity:props.disabled?0.6:1,fontFamily:"inherit",fontSize:12}}>{children}</button>}
function Card({children,style={}}){return <div style={{background:"#fff",border:"1px solid "+LINE,borderRadius:14,padding:15,...style}}>{children}</div>}
const emptyForm=(currency="EGP")=>({name:"",asset_type:"Other",currency,purchase_value:"",current_value:"",valuation_date:today(),valuation_source:"manual",inventory_item_ref:"",account_id:"",include_in_net_worth:true});

export default function FinanceAssets({ws,access,isDemo=false,currencies=[]}){
 const [assets,setAssets]=useState([]),[accounts,setAccounts]=useState([]),[incomeTransactions,setIncomeTransactions]=useState([]),[netWorth,setNetWorth]=useState(null);
 const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const [showForm,setShowForm]=useState(false),[editingId,setEditingId]=useState(null),[form,setForm]=useState(emptyForm());
 const [confirmTarget,setConfirmTarget]=useState(null),[confirmForm,setConfirmForm]=useState({current_value:"",reason:""});
 const [historyTarget,setHistoryTarget]=useState(null),[historyRows,setHistoryRows]=useState([]),[historyLoading,setHistoryLoading]=useState(false);
 const [disposalTarget,setDisposalTarget]=useState(null),[disposalForm,setDisposalForm]=useState({status:"Sold",sale_transaction_id:"",effective_date:today(),reason:""});
 const canEdit=!isDemo&&(access?.level==="edit"||access?.manage||access?.owner);
 const load=useCallback(async()=>{
  if(!ws?.id||isDemo){setLoading(false);return;}
  setLoading(true);setError("");
  try{
   const [a,ac,nw,tx]=await Promise.all([
    supabase.from("finance_assets").select("*").eq("workspace_id",ws.id).order("updated_at",{ascending:false}),
    supabase.from("finance_accounts").select("id,name,currency,status").eq("workspace_id",ws.id).order("name"),
    supabase.rpc("fin_net_worth",{p_ws:ws.id,p_as_of:today()}),
    supabase.from("finance_transactions").select("id,name,amount,currency,local_date,status,type").eq("workspace_id",ws.id).eq("status","Posted").eq("type","Income").order("local_date",{ascending:false}).limit(500)
   ]);
   if(a.error)throw a.error;
   if(ac.error)throw ac.error;
   setAssets(a.data||[]);setAccounts(ac.data||[]);setIncomeTransactions(tx.error?[]:(tx.data||[]));setNetWorth(nw.error?null:nw.data);
   if(tx.error)setNotice("تم تحميل الأصول، لكن قائمة حركات الدخل غير متاحة؛ يلزم صلاحية عرض الدفتر لربط متحصلات البيع.");
   else if(nw.error)setNotice("تم تحميل الأصول، لكن تعذّر تحميل ملخص صافي الثروة: "+nw.error.message);
  }catch(e){setError(e?.message||"تعذّر تحميل الأصول");}
  finally{setLoading(false);}
 },[ws?.id,isDemo]);
 useEffect(()=>{load();},[load]);
 const baseAssetValue=useMemo(()=>{const parts=netWorth?.components||[];return parts.filter(x=>x.kind==="asset").reduce((sum,x)=>sum+Number(x.base_value||0),0);},[netWorth]);
 function startCreate(){setEditingId(null);setForm(emptyForm(accounts.find(a=>a.status==="Active")?.currency||"EGP"));setShowForm(true);setError("");}
 function startEdit(a){setEditingId(a.id);setForm({name:a.name||"",asset_type:a.asset_type||"Other",currency:a.currency||"EGP",purchase_value:String(a.purchase_value??0),current_value:String(a.current_value??0),valuation_date:a.valuation_date||today(),valuation_source:a.valuation_source||"manual",inventory_item_ref:a.inventory_item_ref||"",account_id:a.account_id||"",include_in_net_worth:!!a.include_in_net_worth});setShowForm(true);setError("");}
 async function save(e){e.preventDefault();if(!canEdit||saving)return;
  if(!form.name.trim()||Number(form.purchase_value)<0||Number(form.current_value)<0||!/^[A-Z]{3}$/.test(form.currency)){setError("راجع الاسم والقيم والعملة.");return;}
  if(form.valuation_source==="inventory_estimate"&&!form.inventory_item_ref.trim()){setError("تقدير الجرد يحتاج مرجع الصنف.");return;}
  if(form.asset_type==="Cash-like"&&form.account_id){setError("النقد وما يشبهه يُدار من الحسابات؛ لا تربطه بحساب هنا لتجنب العد المزدوج.");return;}
  if(form.account_id&&accounts.find(a=>a.id===form.account_id)?.currency!==form.currency){setError("عملة الحساب المرتبط يجب أن تطابق عملة الأصل.");return;}
  setSaving(true);setError("");try{
   const p={workspace_id:ws.id,id:editingId||undefined,name:form.name.trim(),asset_type:form.asset_type,currency:form.currency,
    purchase_value:String(form.purchase_value||0),current_value:String(form.current_value||0),valuation_date:form.valuation_date||null,
    valuation_source:form.valuation_source,inventory_item_ref:form.inventory_item_ref||null,account_id:form.account_id||null,
    include_in_net_worth:form.include_in_net_worth};
   const {error:err}=await supabase.rpc("fin_asset_upsert",{p});if(err)throw err;
   setNotice(editingId?"تم تحديث الأصل.":"تم إنشاء الأصل.");setShowForm(false);await load();
  }catch(e){setError(e?.message||"تعذّر حفظ الأصل.");}finally{setSaving(false);}}
 async function openHistory(asset){
  setHistoryTarget(asset);setHistoryRows([]);setHistoryLoading(true);setError("");
  try{const {data,error:err}=await supabase.rpc("fin_asset_valuation_history_get",{p:{workspace_id:ws.id,asset_id:asset.id}});if(err)throw err;setHistoryRows(Array.isArray(data)?data:[]);}
  catch(e){setError(e?.message||"تعذّر تحميل سجل تقييم الأصل.");}
  finally{setHistoryLoading(false);}
 }
 function openDisposal(asset,status){setDisposalTarget(asset);setDisposalForm({status,sale_transaction_id:"",effective_date:today(),reason:status==="Sold"?"تم بيع الأصل":"تم شطب الأصل"});setError("");}
 async function saveDisposal(e){e.preventDefault();if(!canEdit||saving||!disposalTarget)return;
  if(disposalForm.reason.trim().length<3){setError("اكتب سبب البيع أو الشطب.");return;}
  if(disposalForm.status==="Sold"&&!disposalForm.sale_transaction_id){setError("اختر حركة دخل مسجلة تمثل متحصلات البيع.");return;}
  setSaving(true);setError("");
  try{
   const {error:err}=await supabase.rpc("fin_asset_status_update",{p:{workspace_id:ws.id,asset_id:disposalTarget.id,status:disposalForm.status,sale_transaction_id:disposalForm.status==="Sold"?disposalForm.sale_transaction_id:null,effective_date:disposalForm.effective_date,reason:disposalForm.reason.trim()}});
   if(err)throw err;
   setNotice(disposalForm.status==="Sold"?"تم تسجيل الأصل كمباع وربطه بحركة الدخل المحددة.":"تم شطب الأصل واستبعاده من صافي الثروة.");
   setDisposalTarget(null);await load();
  }catch(e){setError(e?.message||"تعذّر تحديث حالة الأصل.");}finally{setSaving(false);}
 }
 async function confirmValuation(e){e.preventDefault();if(!canEdit||saving||!confirmTarget)return;
  if(!(Number(confirmForm.current_value)>=0)||confirmForm.reason.trim().length<3){setError("أدخل قيمة صحيحة وسببًا لا يقل عن 3 أحرف.");return;}
  setSaving(true);setError("");try{const {error:err}=await supabase.rpc("fin_asset_confirm_valuation",{p:{workspace_id:ws.id,asset_id:confirmTarget.id,current_value:String(confirmForm.current_value),reason:confirmForm.reason.trim()}});if(err)throw err;
   setNotice("تم تأكيد التقييم اليدوي وإدخاله في صافي الثروة.");setConfirmTarget(null);setConfirmForm({current_value:"",reason:""});await load();
  }catch(e){setError(e?.message||"تعذّر تأكيد التقييم.");}finally{setSaving(false);}}
 if(isDemo)return <Card><h3 style={{marginTop:0}}>الأصول</h3><p style={{color:"#92400E",fontSize:13}}>وضع العرض التجريبي للقراءة فقط.</p></Card>;
 return <div style={{display:"grid",gap:14,direction:"rtl"}}>
  {notice&&<div role="status" style={{background:"#ECFDF3",color:"#067647",padding:11,borderRadius:10,fontSize:12}}>{notice}</div>}
  {error&&<div role="alert" style={{background:"#FEF3F2",color:"#B42318",padding:11,borderRadius:10,fontSize:12}}>{error}<button onClick={()=>setError("")} style={{float:"left",border:0,background:"transparent",cursor:"pointer"}}>×</button></div>}
  <Card><div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",flexWrap:"wrap"}}><div><h3 style={{margin:0}}>الأصول والتقييمات</h3><p style={{margin:"6px 0 0",color:MUTED,fontSize:12,lineHeight:1.8}}>سجّل الأصول وقيمتها الحالية ومصدر التقييم، وحدّد ما يدخل في صافي الثروة. لا تُعامل التقديرات غير المؤكدة كقيمة معتمدة.</p></div><div style={{display:"flex",gap:8}}><Btn secondary onClick={load} disabled={loading}>↻ تحديث</Btn>{canEdit&&<Btn onClick={startCreate}>＋ أصل جديد</Btn>}</div></div>
   <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:9,marginTop:14}}><div style={{background:BG,border:"1px solid "+LINE,borderRadius:10,padding:12}}><div style={{fontSize:11,color:MUTED}}>قيمة الأصول المحتسبة في صافي الثروة</div><b style={{fontSize:20}}>{netWorth?money(baseAssetValue,netWorth.base_currency||"EGP"):"غير متاح"}</b></div><div style={{background:BG,border:"1px solid "+LINE,borderRadius:10,padding:12}}><div style={{fontSize:11,color:MUTED}}>عدد الأصول</div><b style={{fontSize:20}}>{assets.length}</b></div><div style={{background:BG,border:"1px solid "+LINE,borderRadius:10,padding:12}}><div style={{fontSize:11,color:MUTED}}>تقييمات تحتاج تأكيدًا</div><b style={{fontSize:20,color:assets.filter(a=>!a.valuation_confirmed).length?"#B54708":INK}}>{assets.filter(a=>!a.valuation_confirmed).length}</b></div></div>
   {loading?<p style={{textAlign:"center",color:MUTED,padding:20}}>جارٍ تحميل الأصول…</p>:!assets.length?<div style={{textAlign:"center",padding:30,color:MUTED}}><div style={{fontSize:28}}>📈</div><b>لا توجد أصول مسجلة</b><p style={{fontSize:12}}>أضف عقارًا أو مركبة أو أصلًا آخر لتتبّع قيمته.</p></div>:<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,280px),1fr))",gap:10,marginTop:14}}>{assets.map(a=><div key={a.id} style={{border:"1px solid "+LINE,borderRadius:12,padding:13}}>
    <div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"start"}}><div><b>{a.name}</b><div style={{fontSize:11,color:MUTED,marginTop:4}}>{TYPE_LABEL[a.asset_type]||a.asset_type} · {a.currency}</div></div><span style={{fontSize:10,borderRadius:999,padding:"4px 7px",background:!a.valuation_confirmed?"#FFFAEB":a.include_in_net_worth?"#ECFDF3":"#F2F4F7",color:a.status!=="Held"?MUTED:!a.valuation_confirmed?"#92400E":a.include_in_net_worth?"#067647":MUTED}}>{a.status==="Sold"?"مباع":a.status==="WrittenOff"?"مشطوب":!a.valuation_confirmed?"يحتاج تأكيدًا":a.include_in_net_worth?"ضمن صافي الثروة":"مستبعد من الثروة"}</span></div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:12}}><div style={{background:BG,borderRadius:9,padding:10}}><div style={{fontSize:10,color:MUTED}}>قيمة الشراء</div><b>{money(a.purchase_value,a.currency)}</b></div><div style={{background:BG,borderRadius:9,padding:10}}><div style={{fontSize:10,color:MUTED}}>القيمة الحالية</div><b>{money(a.current_value,a.currency)}</b></div></div>
    <div style={{fontSize:11,color:MUTED,marginTop:9}}>مصدر التقييم: {SOURCE_LABEL[a.valuation_source]||a.valuation_source} · {a.valuation_date||"لا يوجد تاريخ"}</div>
    {a.inventory_item_ref&&<div style={{fontSize:10,color:MUTED,marginTop:3}}>مرجع الجرد: {a.inventory_item_ref}</div>}
    {canEdit&&<div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:11}}><Btn secondary onClick={()=>openHistory(a)}>سجل التقييم</Btn>{a.status==="Held"&&<><Btn secondary onClick={()=>startEdit(a)}>تعديل</Btn>{!a.valuation_confirmed&&<Btn onClick={()=>{setConfirmTarget(a);setConfirmForm({current_value:String(a.current_value??0),reason:""});}}>تأكيد التقييم</Btn>}<Btn secondary onClick={()=>openDisposal(a,"Sold")}>بيع الأصل</Btn><Btn secondary onClick={()=>openDisposal(a,"WrittenOff")}>شطب الأصل</Btn></>}</div>}{a.status!=="Held"&&<div style={{fontSize:11,color:MUTED,marginTop:8}}>السبب: {a.status_reason||"—"}{a.sale_transaction_id&&" · حركة البيع: "+(incomeTransactions.find(t=>t.id===a.sale_transaction_id)?.name||"مرتبطة")}</div>}
   </div>)}</div>}
  </Card>
  {disposalTarget&&<Card><h3 style={{marginTop:0}}>{disposalForm.status==="Sold"?"تسجيل بيع الأصل":"شطب الأصل"}</h3><p style={{fontSize:12,color:MUTED,lineHeight:1.8}}>{disposalForm.status==="Sold"?"سجّل متحصلات البيع كحركة دخل منشورة في دفتر الحركات أولًا، ثم اخترها هنا لربطها بالأصل. لن ينشئ هذا الإجراء حركة دخل ثانية؛ وسيظل المبلغ مصنفًا كدخل شخصي، ولا يحسب النظام ربح/خسارة البيع المحاسبية بشكل مستقل.":"الشطب يستبعد الأصل من صافي الثروة ويصفّر قيمته الحالية، دون إنشاء حركة نقدية."}</p><form onSubmit={saveDisposal} style={{display:"grid",gap:12}}><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12}}>
   {disposalForm.status==="Sold"?<Field label="حركة الدخل التي تمثل متحصلات البيع *"><select required style={input} value={disposalForm.sale_transaction_id} onChange={e=>setDisposalForm({...disposalForm,sale_transaction_id:e.target.value})}><option value="">اختر حركة دخل منشورة بنفس العملة</option>{incomeTransactions.filter(t=>t.currency===disposalTarget.currency).map(t=><option key={t.id} value={t.id}>{t.local_date} · {t.name} · {money(t.amount,t.currency)}</option>)}</select></Field>:<Field label="تاريخ الشطب"><input required type="date" max={today()} style={input} value={disposalForm.effective_date} onChange={e=>setDisposalForm({...disposalForm,effective_date:e.target.value})}/></Field>}
   <Field label="السبب *"><input required minLength={3} maxLength={300} style={input} value={disposalForm.reason} onChange={e=>setDisposalForm({...disposalForm,reason:e.target.value})}/></Field>
  </div><div style={{display:"flex",gap:8,flexWrap:"wrap"}}><Btn type="submit" disabled={saving}>{saving?"جارٍ الحفظ…":disposalForm.status==="Sold"?"تأكيد البيع":"تأكيد الشطب"}</Btn><Btn secondary type="button" onClick={()=>setDisposalTarget(null)}>إلغاء</Btn></div></form></Card>}
  {historyTarget&&<Card><div style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"center",flexWrap:"wrap"}}><div><h3 style={{margin:"0 0 5px"}}>سجل تقييم الأصل: {historyTarget.name}</h3><p style={{margin:0,fontSize:11,color:MUTED}}>القيم المسجلة تاريخيًا؛ لا يعاد حسابها باستخدام أسعار صرف حالية.</p></div><Btn secondary onClick={()=>setHistoryTarget(null)}>إغلاق السجل</Btn></div>
   {historyLoading?<p style={{textAlign:"center",color:MUTED,padding:18}}>جارٍ تحميل سجل التقييم…</p>:!historyRows.length?<p style={{textAlign:"center",color:MUTED,padding:18}}>لا توجد سجلات لهذا الأصل.</p>:<div style={{overflowX:"auto",marginTop:10}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:700}}><thead><tr>{["تاريخ التقييم","القيمة الحالية","قيمة الشراء","المصدر","الحالة","نوع السجل","وقت التسجيل"].map(x=><th key={x} style={{textAlign:"right",padding:10,color:MUTED,fontSize:11,borderBottom:"1px solid "+LINE,whiteSpace:"nowrap"}}>{x}</th>)}</tr></thead><tbody>{historyRows.map(v=><tr key={v.id}><td style={{padding:10,borderBottom:"1px solid #EEF2EF",fontSize:12}}>{v.valuation_date}</td><td style={{padding:10,borderBottom:"1px solid #EEF2EF",fontSize:12,fontWeight:800}}>{money(v.current_value,v.currency)}</td><td style={{padding:10,borderBottom:"1px solid #EEF2EF",fontSize:12}}>{money(v.purchase_value,v.currency)}</td><td style={{padding:10,borderBottom:"1px solid #EEF2EF",fontSize:12}}>{SOURCE_LABEL[v.valuation_source]||v.valuation_source}</td><td style={{padding:10,borderBottom:"1px solid #EEF2EF",fontSize:12}}>{v.valuation_confirmed?"معتمد":"غير مؤكد"} · {v.include_in_net_worth?"ضمن الثروة":"مستبعد"}</td><td style={{padding:10,borderBottom:"1px solid #EEF2EF",fontSize:12}}>{{Created:"إنشاء",Revalued:"إعادة تقييم",Confirmed:"تأكيد",LegacyBaseline:"سجل سابق عند التفعيل",Sold:"بيع الأصل",WrittenOff:"شطب الأصل"}[v.event_type]||v.event_type}</td><td style={{padding:10,borderBottom:"1px solid #EEF2EF",fontSize:11,whiteSpace:"nowrap"}}>{v.recorded_at?new Date(v.recorded_at).toLocaleString("ar-EG",{dateStyle:"short",timeStyle:"short"}):"—"}</td></tr>)}</tbody></table></div>}
  </Card>}
  {showForm&&<Card><h3 style={{marginTop:0}}>{editingId?"تعديل الأصل":"إضافة أصل"}</h3><form onSubmit={save} style={{display:"grid",gap:12}}><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(175px,1fr))",gap:12}}>
   <Field label="اسم الأصل *"><input required maxLength={160} style={input} value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="مثال: لابتوب العمل"/></Field>
   <Field label="نوع الأصل"><select style={input} value={form.asset_type} onChange={e=>setForm({...form,asset_type:e.target.value,account_id:e.target.value==="Cash-like"?"":form.account_id})}>{ASSET_TYPES.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></Field>
   <Field label="العملة"><select required disabled={!!editingId} style={{...input,background:editingId?"#F2F4F7":"#fff"}} value={form.currency} onChange={e=>setForm({...form,currency:e.target.value})}>{!currencies.some(c=>c.currency===form.currency)&&form.currency&&<option value={form.currency}>{form.currency} · العملة الحالية</option>}{currencies.filter(c=>c.is_active).map(c=><option key={c.currency} value={c.currency}>{c.currency} · {c.display_name}</option>)}</select></Field>
   <Field label="قيمة الشراء"><input required type="number" min="0" step="0.01" style={input} value={form.purchase_value} onChange={e=>setForm({...form,purchase_value:e.target.value})}/></Field>
   <Field label="القيمة الحالية *"><input required type="number" min="0" step="0.01" style={input} value={form.current_value} onChange={e=>setForm({...form,current_value:e.target.value})}/></Field>
   <Field label="تاريخ التقييم"><input type="date" style={input} value={form.valuation_date} onChange={e=>setForm({...form,valuation_date:e.target.value})}/></Field>
   <Field label="مصدر التقييم"><select style={input} value={form.valuation_source} onChange={e=>setForm({...form,valuation_source:e.target.value})}><option value="manual">تقييم يدوي</option><option value="market">سعر سوق</option><option value="inventory_estimate">تقدير من الجرد</option></select></Field>
   {form.valuation_source==="inventory_estimate"&&<Field label="مرجع الصنف في الجرد *"><input required style={input} value={form.inventory_item_ref} onChange={e=>setForm({...form,inventory_item_ref:e.target.value})}/></Field>}
   {form.asset_type!=="Cash-like"&&<Field label="حساب مرتبط (اختياري)"><select style={input} value={form.account_id} onChange={e=>setForm({...form,account_id:e.target.value,currency:accounts.find(a=>a.id===e.target.value)?.currency||form.currency})}><option value="">بدون حساب</option>{accounts.filter(a=>a.status==="Active"&&a.currency===form.currency).map(a=><option key={a.id} value={a.id}>{a.name} · {a.currency}</option>)}</select></Field>}
  </div><label style={{display:"flex",gap:8,alignItems:"center",fontSize:12}}><input type="checkbox" checked={form.include_in_net_worth} onChange={e=>setForm({...form,include_in_net_worth:e.target.checked})}/> تضمين الأصل في صافي الثروة بعد تأكيد تقييمه</label>
  {form.valuation_source==="inventory_estimate"&&<div style={{fontSize:11,color:"#92400E",background:"#FFFAEB",padding:10,borderRadius:9}}>سيُحفظ التقدير غير مؤكد ولن يدخل في صافي الثروة حتى تراجع القيمة وتؤكدها.</div>}
  {editingId&&<div style={{fontSize:11,color:MUTED}}>عملة الأصل لا يمكن تغييرها من التعديل؛ تغيير العملة يتطلب مسار تحويل موثق غير متاح في هذه المرحلة.</div>}
  <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn type="button" secondary onClick={()=>setShowForm(false)}>إلغاء</Btn><Btn type="submit" disabled={saving}>{saving?"جارٍ الحفظ…":"حفظ الأصل"}</Btn></div></form></Card>}
  {confirmTarget&&<Card><h3 style={{marginTop:0}}>تأكيد تقييم — {confirmTarget.name}</h3><p style={{fontSize:12,color:MUTED}}>التأكيد يحوّل التقدير غير المؤكد إلى تقييم يدوي ويتيح احتسابه في صافي الثروة.</p><form onSubmit={confirmValuation} style={{display:"grid",gap:12}}><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12}}><Field label={"القيمة المعتمدة ("+confirmTarget.currency+") *"}><input required type="number" min="0" step="0.01" style={input} value={confirmForm.current_value} onChange={e=>setConfirmForm({...confirmForm,current_value:e.target.value})}/></Field><Field label="سبب التأكيد *"><input required minLength={3} style={input} value={confirmForm.reason} onChange={e=>setConfirmForm({...confirmForm,reason:e.target.value})} placeholder="مثال: راجعت السعر الحالي"/></Field></div><div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn type="button" secondary onClick={()=>setConfirmTarget(null)}>إلغاء</Btn><Btn type="submit" disabled={saving}>{saving?"جارٍ التأكيد…":"تأكيد التقييم"}</Btn></div></form></Card>}
  <Card style={{fontSize:11,color:MUTED,lineHeight:1.8}}>سجل التقييمات محفوظ بالتاريخ. عند البيع، سجّل متحصلات البيع أولًا كحركة دخل ثم اربطها هنا؛ لا ينشئ النظام حركة نقدية تلقائيًا عند الشطب. الإهلاك المحاسبي التفصيلي ما زال خارج هذه المرحلة.</Card>
 </div>;
}
