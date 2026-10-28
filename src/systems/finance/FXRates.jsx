import React, { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../core/supabase.js";

const GREEN="#059669",INK="#17211D",MUTED="#718078",LINE="#E4EBE6",BG="#F5F8F5";
const today=()=>new Date().toLocaleDateString("en-CA",{timeZone:"Africa/Cairo"});
const input={width:"100%",minWidth:0,boxSizing:"border-box",border:"1px solid #D8E2DB",borderRadius:9,padding:"10px 11px",background:"#fff",color:INK,font:"inherit",fontSize:13};
const money=(v,c="EGP")=>{if(v===null||v===undefined||v==="")return "غير متاح";try{return new Intl.NumberFormat("ar-EG",{style:"currency",currency:c,maximumFractionDigits:4}).format(Number(v));}catch{return String(v)+" "+c;}};
function Field({label,children}){return <label style={{display:"grid",gap:6,color:"#46544B",fontSize:12,fontWeight:700}}>{label}{children}</label>}
function Btn({children,secondary=false,...props}){return <button {...props} style={{border:secondary?"1px solid "+LINE:"1px solid "+GREEN,background:secondary?"#fff":GREEN,color:secondary?INK:"#fff",borderRadius:9,padding:"9px 12px",fontWeight:750,cursor:props.disabled?"not-allowed":"pointer",opacity:props.disabled?0.6:1,fontFamily:"inherit",fontSize:12}}>{children}</button>}
function Card({children,style={}}){return <div style={{background:"#fff",border:"1px solid "+LINE,borderRadius:14,padding:15,...style}}>{children}</div>}

export default function FinanceFXRates({ws,access,isDemo=false,baseCurrency="EGP"}){
 const [rates,setRates]=useState([]),[currencies,setCurrencies]=useState([]),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false);\n const [currencyForm,setCurrencyForm]=useState({currency:"USD",display_name:"US Dollar",symbol:"$",minor_units:"2"}),[editingCurrency,setEditingCurrency]=useState("");
 const [error,setError]=useState(""),[notice,setNotice]=useState(""),[form,setForm]=useState({currency:"USD",rate_to_base:"",effective_on:today(),source:"manual"});
 const [previewAmount,setPreviewAmount]=useState("1"),[previewCurrency,setPreviewCurrency]=useState("USD");
 const canEdit=!isDemo&&(access?.level==="edit"||access?.manage||access?.owner);
 const load=useCallback(async()=>{if(!ws?.id||isDemo){setLoading(false);return;}setLoading(true);setError("");try{
  const [ratesRes,currenciesRes]=await Promise.all([
   supabase.from("finance_exchange_rates").select("id,currency,rate_to_base,effective_on,source,created_at").eq("workspace_id",ws.id).lte("effective_on",today()).order("effective_on",{ascending:false}).order("created_at",{ascending:false}).limit(300),
   supabase.rpc("fin_currencies_get",{p_ws:ws.id})
  ]);
  if(ratesRes.error)throw ratesRes.error;if(currenciesRes.error)throw currenciesRes.error;
  setRates(ratesRes.data||[]);setCurrencies(Array.isArray(currenciesRes.data)?currenciesRes.data:[]);
 }catch(e){setError(e?.message||"تعذّر تحميل العملات وأسعار الصرف.");}finally{setLoading(false);}},[ws?.id,isDemo]);
 useEffect(()=>{load();},[load]);
 const currentRates=useMemo(()=>{const map=new Map([[baseCurrency,{currency:baseCurrency,rate_to_base:"1",effective_on:today(),source:"base"}]]);for(const r of rates){if(!map.has(r.currency))map.set(r.currency,r);}return [...map.values()].sort((a,b)=>a.currency.localeCompare(b.currency));},[rates,baseCurrency]);
 const rateMap=useMemo(()=>new Map(currentRates.map(r=>[r.currency,Number(r.rate_to_base)])),[currentRates]);
 async function save(e){e.preventDefault();if(!canEdit||saving)return;const c=form.currency.trim().toUpperCase();if(!/^[A-Z]{3}$/.test(c)||!(Number(form.rate_to_base)>0)||!form.effective_on){setError("راجع العملة والسعر وتاريخ السريان.");return;}if(c===baseCurrency){setError("عملة الأساس سعرها ثابت 1 ولا تحتاج إلى سجل.");return;}if(form.effective_on>today()){setError("لا يمكن إدخال سعر بتاريخ مستقبلي.");return;}
  setSaving(true);setError("");setNotice("");try{const p={workspace_id:ws.id,currency:c,rate_to_base:String(form.rate_to_base),effective_on:form.effective_on,source:form.source.trim()||"manual"};const {error:err}=await supabase.rpc("fin_add_rate",{p});if(err)throw err;setNotice("تمت إضافة سعر صرف جديد كسجل تاريخي؛ لم يتم تعديل الحركات أو اللقطات القديمة.");setForm({...form,rate_to_base:"",effective_on:today()});await load();}catch(e){setError(e?.message||"تعذّر إضافة سعر الصرف.");}finally{setSaving(false);}}
 const previewRate=rateMap.get(previewCurrency);
 async function saveCurrency(e){
  e.preventDefault();if(!canEdit||saving)return;
  const code=currencyForm.currency.trim().toUpperCase(),name=currencyForm.display_name.trim(),units=Number(currencyForm.minor_units);
  if(!/^[A-Z]{3}$/.test(code)||!name||!Number.isInteger(units)||units<0||units>4){setError("أدخل رمزًا من 3 أحرف واسمًا صحيحًا وعدد منازل من 0 إلى 4.");return;}
  setSaving(true);setError("");setNotice("");
  try{
   const {error:err}=await supabase.rpc("fin_currency_save",{p:{workspace_id:ws.id,currency:code,display_name:name,symbol:currencyForm.symbol.trim()||null,minor_units:units,is_active:true}});
   if(err)throw err;
   setNotice(editingCurrency?"تم تحديث بيانات العملة.":"تمت إضافة العملة إلى قائمة العملات المتاحة.");
   setCurrencyForm({currency:"",display_name:"",symbol:"",minor_units:"2"});setEditingCurrency("");await load();
  }catch(e){setError(e?.message||"تعذّر حفظ العملة.");}finally{setSaving(false);}
 }
 async function removeCurrency(row){
  if(!canEdit||saving||row.is_base)return;
  if(!globalThis.confirm("ستُزال العملة من الاختيارات الجديدة مع الاحتفاظ بسجلاتها التاريخية. إذا كان هناك حساب نشط بهذه العملة سيرفض النظام العملية. هل تريد المتابعة؟"))return;
  setSaving(true);setError("");setNotice("");
  try{const {error:err}=await supabase.rpc("fin_currency_remove",{p:{workspace_id:ws.id,currency:row.currency}});if(err)throw err;setNotice("تمت إزالة العملة من الاختيارات الجديدة مع الحفاظ على بياناتها التاريخية.");await load();}
  catch(e){setError(e?.message||"تعذّر إزالة العملة.");}finally{setSaving(false);}
 }
 async function reactivateCurrency(row){
  if(!canEdit||saving)return;setSaving(true);setError("");setNotice("");
  try{const {error:err}=await supabase.rpc("fin_currency_save",{p:{workspace_id:ws.id,currency:row.currency,display_name:row.display_name,symbol:row.symbol,minor_units:row.minor_units,is_active:true}});if(err)throw err;setNotice("تمت إعادة تفعيل العملة.");await load();}
  catch(e){setError(e?.message||"تعذّرت إعادة تفعيل العملة.");}finally{setSaving(false);}
 }
 function editCurrency(row){setEditingCurrency(row.currency);setCurrencyForm({currency:row.currency,display_name:row.display_name||row.currency,symbol:row.symbol||"",minor_units:String(row.minor_units??2)});setError("");}
 if(isDemo)return <Card><h3 style={{marginTop:0}}>أسعار الصرف</h3><p style={{color:"#92400E",fontSize:13}}>وضع العرض التجريبي للقراءة فقط.</p></Card>;
 return <div style={{display:"grid",gap:14,direction:"rtl"}}>
  {notice&&<div role="status" style={{background:"#ECFDF3",color:"#067647",padding:11,borderRadius:10,fontSize:12}}>{notice}</div>}
  {error&&<div role="alert" style={{background:"#FEF3F2",color:"#B42318",padding:11,borderRadius:10,fontSize:12}}>{error}<button onClick={()=>setError("")} style={{float:"left",border:0,background:"transparent",cursor:"pointer"}}>×</button></div>}
  {canEdit&&<Card><div style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"center",flexWrap:"wrap"}}><div><h3 style={{margin:0}}>إدارة العملات</h3><p style={{margin:"6px 0 0",fontSize:12,color:MUTED,lineHeight:1.8}}>أضف العملات التي تحتاجها وعدّل الاسم والرمز. إزالة العملة تخفيها من الاختيارات الجديدة ولا تحذف السجلات التاريخية.</p></div></div>
   <form onSubmit={saveCurrency} style={{display:"grid",gap:10,marginTop:13}}><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10}}>
    <Field label="رمز العملة *"><input required maxLength={3} disabled={!!editingCurrency} style={input} value={currencyForm.currency} onChange={e=>setCurrencyForm({...currencyForm,currency:e.target.value.toUpperCase()})} placeholder="USD"/></Field>
    <Field label="اسم العملة *"><input required style={input} value={currencyForm.display_name} onChange={e=>setCurrencyForm({...currencyForm,display_name:e.target.value})} placeholder="الدولار الأمريكي"/></Field>
    <Field label="الرمز المعروض"><input style={input} value={currencyForm.symbol} onChange={e=>setCurrencyForm({...currencyForm,symbol:e.target.value})} placeholder="$"/></Field>
    <Field label="المنازل العشرية"><select style={input} value={currencyForm.minor_units} onChange={e=>setCurrencyForm({...currencyForm,minor_units:e.target.value})}>{[0,1,2,3,4].map(n=><option key={n} value={n}>{n}</option>)}</select></Field>
   </div><div style={{display:"flex",gap:8,justifyContent:"flex-start"}}><Btn type="submit" disabled={saving}>{saving?"جارٍ الحفظ…":editingCurrency?"حفظ التعديلات":"إضافة العملة"}</Btn>{editingCurrency&&<Btn type="button" secondary onClick={()=>{setEditingCurrency("");setCurrencyForm({currency:"",display_name:"",symbol:"",minor_units:"2"});}}>إلغاء التعديل</Btn>}</div></form>
   <div style={{display:"grid",gap:8,marginTop:15}}>{currencies.map(c=><div key={c.currency} style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,flexWrap:"wrap",border:"1px solid "+LINE,borderRadius:10,padding:11,background:c.is_active?BG:"#F8FAFC"}}>
    <div><b>{c.currency}</b> <span style={{fontSize:12,color:MUTED}}>· {c.display_name}{c.symbol?" ("+c.symbol+")":""}</span><div style={{fontSize:10,color:MUTED,marginTop:4}}>{c.is_base?"عملة الأساس":c.is_active?"متاحة للاستخدام":"مزالة من الاختيارات"}</div></div>
    <div style={{display:"flex",gap:6}}>{c.is_active&&<Btn type="button" secondary onClick={()=>editCurrency(c)}>تعديل</Btn>}{!c.is_base&&(c.is_active?<Btn type="button" secondary disabled={saving} onClick={()=>removeCurrency(c)}>إزالة</Btn>:<Btn type="button" secondary disabled={saving} onClick={()=>reactivateCurrency(c)}>إعادة تفعيل</Btn>)}</div>
   </div>)}</div>
  </Card>}
  <Card><div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",flexWrap:"wrap"}}><div><h3 style={{margin:0}}>أسعار الصرف</h3><p style={{margin:"6px 0 0",color:MUTED,fontSize:12,lineHeight:1.8}}>كل سعر يوضح قيمة وحدة واحدة من العملة مقابل عملة الأساس ({baseCurrency}). الأسعار التاريخية تُضاف كسجلات جديدة ولا تُعدّل أو تُحذف.</p></div><Btn secondary onClick={load} disabled={loading}>↻ تحديث</Btn></div>
   <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:9,marginTop:14}}>{currentRates.map(r=><div key={r.currency} style={{border:"1px solid "+LINE,borderRadius:11,padding:12,background:BG}}><div style={{display:"flex",justifyContent:"space-between",gap:8}}><b>{r.currency}</b><span style={{fontSize:10,color:MUTED}}>{r.source==="base"?"عملة الأساس":r.effective_on}</span></div><div style={{fontSize:18,fontWeight:800,marginTop:8}}>{Number(r.rate_to_base).toLocaleString("ar-EG",{maximumFractionDigits:6})}</div><div style={{fontSize:10,color:MUTED,marginTop:4}}>لكل 1 {r.currency} · {baseCurrency}</div></div>)}</div>
   {!currentRates.length&&<p style={{color:MUTED,fontSize:12}}>لا توجد أسعار مسجلة بعد.</p>}
  </Card>
  <Card><h4 style={{margin:"0 0 12px"}}>حاسبة تحويل سريعة</h4><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:10,alignItems:"end"}}><Field label="المبلغ"><input type="number" min="0" step="any" style={input} value={previewAmount} onChange={e=>setPreviewAmount(e.target.value)}/></Field><Field label="العملة"><select style={input} value={previewCurrency} onChange={e=>setPreviewCurrency(e.target.value)}>{currentRates.map(r=><option key={r.currency} value={r.currency}>{r.currency}</option>)}</select></Field><div style={{background:BG,border:"1px solid "+LINE,borderRadius:9,padding:11}}><div style={{fontSize:10,color:MUTED}}>القيمة التقريبية بعملة الأساس</div><b>{previewRate==null?"لا يوجد سعر متاح":money(Number(previewAmount||0)*previewRate,baseCurrency)}</b></div></div><p style={{fontSize:10,color:MUTED,marginBottom:0}}>هذه حاسبة تقديرية تستخدم أحدث سعر مسجل حتى اليوم؛ لا تُستخدم لإعادة تقييم الحركات التاريخية.</p></Card>
  {canEdit&&<Card><h4 style={{margin:"0 0 12px"}}>إضافة سعر جديد</h4><form onSubmit={save} style={{display:"grid",gap:12}}><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(165px,1fr))",gap:12}}><Field label="رمز العملة *"><input required maxLength={3} style={input} value={form.currency} onChange={e=>setForm({...form,currency:e.target.value.toUpperCase()})} placeholder="USD"/></Field><Field label={"سعر 1 وحدة إلى "+baseCurrency+" *"}><input required type="number" min="0.00000001" step="any" style={input} value={form.rate_to_base} onChange={e=>setForm({...form,rate_to_base:e.target.value})} placeholder="مثال: 50.25"/></Field><Field label="تاريخ السريان *"><input required type="date" max={today()} style={input} value={form.effective_on} onChange={e=>setForm({...form,effective_on:e.target.value})}/></Field><Field label="المصدر"><input style={input} value={form.source} onChange={e=>setForm({...form,source:e.target.value})} placeholder="manual / مصدر موثوق"/></Field></div><div style={{display:"flex",justifyContent:"flex-end"}}><Btn type="submit" disabled={saving}>{saving?"جارٍ الحفظ…":"إضافة سجل السعر"}</Btn></div></form></Card>}
  <Card><div style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"center",flexWrap:"wrap"}}><h4 style={{margin:0}}>السجل التاريخي</h4><span style={{fontSize:10,color:MUTED}}>أحدث 300 سجل · إضافة فقط</span></div>
   {loading?<p style={{textAlign:"center",color:MUTED,padding:15}}>جارٍ تحميل السجل…</p>:!rates.length?<p style={{textAlign:"center",color:MUTED,padding:20,fontSize:12}}>لا توجد أسعار مسجلة حتى الآن.</p>:<div style={{overflowX:"auto",marginTop:10}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:560}}><thead><tr>{["العملة","السعر إلى "+baseCurrency,"تاريخ السريان","المصدر","تاريخ الإدخال"].map(x=><th key={x} style={{textAlign:"right",padding:10,color:MUTED,fontSize:11,borderBottom:"1px solid "+LINE,whiteSpace:"nowrap"}}>{x}</th>)}</tr></thead><tbody>{rates.map(r=><tr key={r.id}><td style={{padding:10,borderBottom:"1px solid #EEF2EF",fontSize:12}}><b>{r.currency}</b></td><td style={{padding:10,borderBottom:"1px solid #EEF2EF",fontSize:12}}>{Number(r.rate_to_base).toLocaleString("ar-EG",{maximumFractionDigits:10})}</td><td style={{padding:10,borderBottom:"1px solid #EEF2EF",fontSize:12}}>{r.effective_on}</td><td style={{padding:10,borderBottom:"1px solid #EEF2EF",fontSize:12}}>{r.source}</td><td style={{padding:10,borderBottom:"1px solid #EEF2EF",fontSize:12,whiteSpace:"nowrap"}}>{new Date(r.created_at).toLocaleString("ar-EG",{dateStyle:"short",timeStyle:"short"})}</td></tr>)}</tbody></table></div>}
  </Card>
  <Card style={{fontSize:11,color:MUTED,lineHeight:1.8}}>لا يوجد حتى الآن مزوّد أسعار تلقائي أو جدول تحديث مجدول. الأسعار الحالية يدويّة، وسعر التحويل في التقارير يعتمد على منطق Finance الحالي؛ إضافة سعر جديد لا تغيّر أسعار الحركات واللقطات السابقة.</Card>
 </div>;
}
