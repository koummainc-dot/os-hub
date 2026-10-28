import React, { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../core/supabase.js";

const GREEN="#059669",INK="#17211D",MUTED="#718078",LINE="#E4EBE6",BG="#F5F8F5";
const today=()=>new Date().toLocaleDateString("en-CA",{timeZone:"Africa/Cairo"});
const input={width:"100%",minWidth:0,boxSizing:"border-box",border:"1px solid #D8E2DB",borderRadius:9,padding:"10px 11px",background:"#fff",color:INK,font:"inherit",fontSize:13};
const PROJECT_TYPES=[["Freelance","عمل حر"],["Startup","شركة ناشئة"],["Content","صناعة محتوى"],["Side Business","مشروع جانبي"],["Investment","استثمار"],["Other","أخرى"]];
const STATUSES=[["Planning","تخطيط"],["Active","نشط"],["On Hold","متوقف مؤقتًا"],["Completed","مكتمل"],["Cancelled","ملغي"]];
const STATUS_LABEL=Object.fromEntries(STATUSES);
const TYPE_LABEL=Object.fromEntries(PROJECT_TYPES);
const money=(v,c="EGP")=>{if(v===null||v===undefined||v==="")return "غير متاح";try{return new Intl.NumberFormat("ar-EG",{style:"currency",currency:c,maximumFractionDigits:2}).format(Number(v));}catch{return String(v)+" "+c;}};
const emptyForm=()=>({name:"",project_type:"Other",budget:"",currency:"EGP",start_date:today(),end_date:"",status:"Planning",scope:"Personal",project_ref:"",area_ref:"",roi_basis:"ExpensesLinked",invested_capital:"",notes:""});
function Field({label,children}){return <label style={{display:"grid",gap:6,color:"#46544B",fontSize:12,fontWeight:700}}>{label}{children}</label>}
function Btn({children,secondary=false,...props}){return <button {...props} style={{border:secondary?"1px solid "+LINE:"1px solid "+GREEN,background:secondary?"#fff":GREEN,color:secondary?INK:"#fff",borderRadius:9,padding:"9px 12px",fontWeight:750,cursor:props.disabled?"not-allowed":"pointer",opacity:props.disabled ? 0.6 : 1,fontFamily:"inherit",fontSize:12}}>{children}</button>}
function Card({children,style={}}){return <div style={{background:"#fff",border:"1px solid "+LINE,borderRadius:14,padding:15,...style}}>{children}</div>}
function Metric({label,value,detail}){return <div style={{background:BG,border:"1px solid "+LINE,borderRadius:10,padding:11,minWidth:0}}><div style={{fontSize:11,color:MUTED,marginBottom:5}}>{label}</div><b style={{fontSize:16,overflowWrap:"anywhere"}}>{value}</b>{detail&&<div style={{fontSize:10,color:MUTED,marginTop:4}}>{detail}</div>}</div>}

export default function FinanceProjects({ws,access,isDemo=false,currencies=[]}){
 const [projects,setProjects]=useState([]),[transactions,setTransactions]=useState([]),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false);
 const [error,setError]=useState(""),[notice,setNotice]=useState(""),[showForm,setShowForm]=useState(false),[editingId,setEditingId]=useState(null),[selectedId,setSelectedId]=useState(null);
 const [form,setForm]=useState(emptyForm()),[linkTxId,setLinkTxId]=useState("");
 const canEdit=!isDemo&&(access?.level==="edit"||access?.manage||access?.owner);
 const load=useCallback(async()=>{
  if(!ws?.id||isDemo){setLoading(false);return;}
  setLoading(true);setError("");
  try{
   const [p,t]=await Promise.all([
    supabase.rpc("fin_projects_get",{p_ws:ws.id}),
    supabase.from("finance_transactions").select("id,name,type,amount,currency,local_date,status,pnl_effect,base_missing").eq("workspace_id",ws.id).eq("status","Posted").in("type",["Income","Expense"]).order("local_date",{ascending:false}).limit(300)
   ]);
   if(p.error)throw p.error;
   setProjects(Array.isArray(p.data)?p.data:[]);
   if(t.error){setTransactions([]);setError("تم تحميل المشاريع، لكن تعذّر تحميل قائمة الحركات لربطها: "+t.error.message);}else setTransactions(t.data||[]);
  }catch(e){setError(e?.message||"تعذّر تحميل المشاريع المالية");}
  finally{setLoading(false);}
 },[ws?.id,isDemo]);
 useEffect(()=>{load();},[load]);
 const selected=projects.find(p=>p.id===selectedId)||projects[0]||null;
 const linkedIds=useMemo(()=>new Set(projects.flatMap(p=>(p.transactions||[]).map(t=>t.id))),[projects]);
 const availableTransactions=transactions.filter(t=>!linkedIds.has(t.id));
 function startCreate(){setEditingId(null);setForm({...emptyForm(),currency:projects[0]?.currency||"EGP"});setShowForm(true);setError("");}
 function startEdit(p){setEditingId(p.id);setForm({name:p.name||"",project_type:p.project_type||"Other",budget:p.budget??"",currency:p.currency||"EGP",start_date:p.start_date||today(),end_date:p.end_date||"",status:p.status||"Planning",scope:p.scope||"Personal",project_ref:p.project_ref||"",area_ref:p.area_ref||"",roi_basis:p.roi_basis||"ExpensesLinked",invested_capital:p.invested_capital??"",notes:p.notes||""});setShowForm(true);setError("");}
 async function save(e){e.preventDefault();if(!canEdit||saving)return;if(!form.name.trim()){setError("اكتب اسم المشروع.");return;}if(form.roi_basis==="DeclaredCapital"&&!(Number(form.invested_capital)>0)){setError("أدخل رأس المال المستثمر لحساب ROI بهذه الطريقة.");return;}
  setSaving(true);setError("");try{const p={workspace_id:ws.id,...form,id:editingId||undefined,name:form.name.trim(),budget:form.budget===""?null:String(form.budget),invested_capital:form.invested_capital===""?null:String(form.invested_capital),end_date:form.end_date||null,project_ref:form.project_ref||null,area_ref:form.area_ref||null,notes:form.notes||null};
   const {data,error:err}=await supabase.rpc("fin_project_save",{p});if(err)throw err;setNotice(editingId?"تم تحديث المشروع المالي.":"تم إنشاء المشروع المالي.");setSelectedId(data?.id||editingId);setShowForm(false);await load();
  }catch(e){setError(e?.message||"تعذّر حفظ المشروع.");}finally{setSaving(false);}}
 async function linkTransaction(e){e.preventDefault();if(!canEdit||saving||!selected||!linkTxId)return;setSaving(true);setError("");try{const {error:err}=await supabase.rpc("fin_project_transaction_link",{p:{workspace_id:ws.id,project_id:selected.id,transaction_id:linkTxId}});if(err)throw err;setLinkTxId("");setNotice("تم ربط الحركة بالمشروع؛ لم يتم إنشاء حركة مالية جديدة.");await load();}catch(e){setError(e?.message||"تعذّر ربط الحركة.");}finally{setSaving(false);}}
 async function unlinkTransaction(id){if(!canEdit||saving||!selected)return;setSaving(true);setError("");try{const {error:err}=await supabase.rpc("fin_project_transaction_unlink",{p:{workspace_id:ws.id,project_id:selected.id,transaction_id:id}});if(err)throw err;setNotice("تم فك ارتباط الحركة بالمشروع دون حذفها من الدفتر.");await load();}catch(e){setError(e?.message||"تعذّر فك الارتباط.");}finally{setSaving(false);}}
 if(isDemo)return <Card><h3 style={{marginTop:0}}>المشاريع المالية</h3><p style={{color:"#92400E",fontSize:13}}>وضع العرض التجريبي للقراءة فقط.</p></Card>;
 return <div style={{display:"grid",gap:14,direction:"rtl"}}>
  {notice&&<div role="status" style={{background:"#ECFDF3",color:"#067647",padding:11,borderRadius:10,fontSize:12}}>{notice}</div>}
  {error&&<div role="alert" style={{background:"#FEF3F2",color:"#B42318",padding:11,borderRadius:10,fontSize:12}}>{error}<button onClick={()=>setError("")} style={{float:"left",border:0,background:"transparent",cursor:"pointer"}}>×</button></div>}
  <Card><div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",flexWrap:"wrap"}}><div><h3 style={{margin:0}}>المشاريع المالية</h3><p style={{margin:"6px 0 0",color:MUTED,fontSize:12,lineHeight:1.8}}>عدسة مالية مستقلة لكل مشروع، مرتبطة بدفتر الحركات دون إنشاء دفتر منفصل أو تكرار المعاملات.</p></div><div style={{display:"flex",gap:8}}><Btn secondary onClick={load} disabled={loading}>↻ تحديث</Btn>{canEdit&&<Btn onClick={startCreate}>＋ مشروع مالي</Btn>}</div></div>
   {loading?<p style={{textAlign:"center",color:MUTED,padding:20}}>جارٍ تحميل المشاريع…</p>:!projects.length?<div style={{textAlign:"center",padding:30,color:MUTED}}><div style={{fontSize:28}}>📁</div><b>لا توجد مشاريع مالية بعد</b><p style={{fontSize:12}}>أنشئ مشروعًا ثم اربط به حركات الدخل والمصروف المسجلة بالفعل في الدفتر.</p>{canEdit&&<Btn onClick={startCreate}>إنشاء أول مشروع</Btn>}</div>:<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,280px),1fr))",gap:10,marginTop:15}}>{projects.map(p=><button key={p.id} onClick={()=>{setSelectedId(p.id);setShowForm(false);}} style={{textAlign:"right",fontFamily:"inherit",cursor:"pointer",background:selected?.id===p.id?"#F0FAF4":"#fff",border:"1px solid "+(selected?.id===p.id?"#86D3AE":LINE),borderRadius:12,padding:13,color:INK}}>
    <div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"start"}}><b>{p.name}</b><span style={{fontSize:10,background:p.status==="Active"?"#ECFDF3":"#F2F4F7",borderRadius:999,padding:"4px 7px",whiteSpace:"nowrap"}}>{STATUS_LABEL[p.status]||p.status}</span></div>
    <div style={{fontSize:11,color:MUTED,marginTop:5}}>{TYPE_LABEL[p.project_type]||p.project_type} · {p.scope==="Business"?"مشروع تجاري":"شخصي"} · {p.transactions?.length||0} حركة</div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:12}}><Metric label="صافي الربح" value={money(p.net_profit_base,p.base_currency||"EGP")}/><Metric label="ROI" value={p.roi_measurable?Number(p.roi_pct).toLocaleString("ar-EG")+"%":"غير قابل للقياس"}/></div>
   </button>)}</div>}
  </Card>
  {selected&&<Card><div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"start",flexWrap:"wrap"}}><div><h3 style={{margin:0}}>{selected.name}</h3><p style={{fontSize:11,color:MUTED,margin:"5px 0 0"}}>{TYPE_LABEL[selected.project_type]||selected.project_type} · {selected.start_date}{selected.end_date?" → "+selected.end_date:""} · {selected.scope==="Business"?"تجاري":"شخصي"}</p></div>{canEdit&&<Btn secondary onClick={()=>startEdit(selected)}>تعديل بيانات المشروع</Btn>}</div>
   <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(145px,1fr))",gap:9,marginTop:14}}>
    <Metric label="إجمالي الإيرادات" value={money(selected.revenue_base,selected.base_currency||"EGP")} detail={"عملة الأساس: "+(selected.base_currency||"EGP")}/>
    <Metric label="إجمالي المصروفات" value={money(selected.expenses_base,selected.base_currency||"EGP")}/>
    <Metric label="صافي الربح" value={money(selected.net_profit_base,selected.base_currency||"EGP")}/>
    <Metric label="الميزانية" value={selected.budget==null?"غير محددة":money(selected.budget,selected.currency)}/>
    <Metric label="استهلاك الميزانية" value={selected.budget_used_pct==null?"غير متاح":Number(selected.budget_used_pct).toLocaleString("ar-EG")+"%"}/>
    <Metric label="متوسط الحرق الشهري" value={money(selected.monthly_burn_base,selected.base_currency||"EGP")}/>
   </div>
   <div style={{marginTop:12,background:BG,borderRadius:10,padding:12,fontSize:12,lineHeight:1.8,color:MUTED}}>
    <b style={{color:INK}}>العائد على الاستثمار (ROI):</b> {selected.roi_measurable?Number(selected.roi_pct).toLocaleString("ar-EG")+"%":selected.roi_basis==="Disabled"?"معطّل حسب الإعداد.":"غير قابل للقياس حاليًا لعدم توفر مقام صالح."}
    <br/>المعادلة: {selected.roi_basis==="DeclaredCapital"?"(صافي الربح ÷ رأس المال المستثمر) × 100":"(صافي الربح ÷ المصروفات المرتبطة) × 100"}.
    {Number(selected.unvalued_transactions||0)>0&&<><br/><b style={{color:"#92400E"}}>تنبيه: {selected.unvalued_transactions} حركة مرتبطة بلا قيمة بعملة الأساس؛ الإجماليات قد تكون غير مكتملة.</b></>}
    {selected.project_ref&&<><br/>مرجع Projects OS: {selected.project_ref}</>}
    {selected.area_ref&&<><br/>مرجع المجال: {selected.area_ref}</>}
   </div>
   <div style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"center",flexWrap:"wrap",marginTop:18}}><h4 style={{margin:0}}>الحركات المرتبطة ({selected.transactions?.length||0})</h4></div>
   {canEdit&&<form onSubmit={linkTransaction} style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) auto",gap:8,marginTop:10}}><select style={input} value={linkTxId} onChange={e=>setLinkTxId(e.target.value)}><option value="">اختر حركة دخل/مصروف غير مرتبطة…</option>{availableTransactions.map(t=><option key={t.id} value={t.id}>{t.local_date} · {t.type==="Income"?"دخل":"مصروف"} · {t.name} · {money(t.amount,t.currency)}</option>)}</select><Btn type="submit" disabled={saving||!linkTxId}>ربط الحركة</Btn></form>}
   {!selected.transactions?.length?<p style={{color:MUTED,fontSize:12,padding:14,textAlign:"center"}}>لا توجد حركات مرتبطة بهذا المشروع حتى الآن.</p>:<div style={{overflowX:"auto",marginTop:10}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:500}}><thead><tr>{["التاريخ","الحركة","النوع","المبلغ","الحالة"].map(x=><th key={x} style={{textAlign:"right",padding:9,color:MUTED,fontSize:11,borderBottom:"1px solid "+LINE}}>{x}</th>)}{canEdit&&<th style={{borderBottom:"1px solid "+LINE}}/>}</tr></thead><tbody>{selected.transactions.map(t=><tr key={t.id}><td style={{padding:9,borderBottom:"1px solid #EEF2EF",fontSize:12}}>{t.local_date}</td><td style={{padding:9,borderBottom:"1px solid #EEF2EF",fontSize:12}}>{t.name}</td><td style={{padding:9,borderBottom:"1px solid #EEF2EF",fontSize:12}}>{t.type==="Income"?"دخل":"مصروف"}</td><td style={{padding:9,borderBottom:"1px solid #EEF2EF",fontSize:12}}>{money(t.amount,t.currency)}</td><td style={{padding:9,borderBottom:"1px solid #EEF2EF",fontSize:12}}>{t.base_missing?"غير مقيم":"مسجل"}</td>{canEdit&&<td style={{padding:9,borderBottom:"1px solid #EEF2EF"}}><Btn secondary disabled={saving} onClick={()=>unlinkTransaction(t.id)}>فك الارتباط</Btn></td>}</tr>)}</tbody></table></div>}
  </Card>}
  {showForm&&<Card><h3 style={{marginTop:0}}>{editingId?"تعديل المشروع المالي":"مشروع مالي جديد"}</h3><form onSubmit={save} style={{display:"grid",gap:12}}><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(175px,1fr))",gap:12}}>
   <Field label="اسم المشروع *"><input required maxLength={160} style={input} value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="مثال: قناة يوتيوب"/></Field>
   <Field label="نوع المشروع"><select style={input} value={form.project_type} onChange={e=>setForm({...form,project_type:e.target.value})}>{PROJECT_TYPES.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></Field>
   <Field label="النطاق"><select style={input} value={form.scope} onChange={e=>setForm({...form,scope:e.target.value})}><option value="Personal">شخصي</option><option value="Business">تجاري</option></select></Field>
   <Field label="الحالة"><select style={input} value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>{STATUSES.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></Field>
   <Field label="الميزانية"><input type="number" min="0" step="0.01" style={input} value={form.budget} onChange={e=>setForm({...form,budget:e.target.value})} placeholder="اختياري"/></Field>
   <Field label="العملة"><select required style={input} value={form.currency} onChange={e=>setForm({...form,currency:e.target.value})}>{!currencies.some(c=>c.currency===form.currency)&&form.currency&&<option value={form.currency}>{form.currency} · العملة الحالية</option>}{currencies.filter(c=>c.is_active).map(c=><option key={c.currency} value={c.currency}>{c.currency} · {c.display_name}</option>)}</select></Field>
   <Field label="تاريخ البداية"><input required type="date" style={input} value={form.start_date} onChange={e=>setForm({...form,start_date:e.target.value})}/></Field>
   <Field label="تاريخ النهاية"><input type="date" style={input} value={form.end_date} onChange={e=>setForm({...form,end_date:e.target.value})}/></Field>
   <Field label="أساس ROI"><select style={input} value={form.roi_basis} onChange={e=>setForm({...form,roi_basis:e.target.value})}><option value="ExpensesLinked">المصروفات المرتبطة</option><option value="DeclaredCapital">رأس مال معلن</option><option value="Disabled">تعطيل ROI</option></select></Field>
   {form.roi_basis==="DeclaredCapital"&&<Field label="رأس المال المستثمر *"><input required type="number" min="0.01" step="0.01" style={input} value={form.invested_capital} onChange={e=>setForm({...form,invested_capital:e.target.value})}/></Field>}
   <Field label="مرجع مشروع Projects OS"><input style={input} value={form.project_ref} onChange={e=>setForm({...form,project_ref:e.target.value})} placeholder="معرّف خارجي اختياري"/></Field>
   <Field label="مرجع المجال في Core"><input style={input} value={form.area_ref} onChange={e=>setForm({...form,area_ref:e.target.value})} placeholder="معرّف خارجي اختياري"/></Field>
  </div><Field label="ملاحظات"><textarea rows={3} style={{...input,resize:"vertical"}} value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></Field>
  <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn type="button" secondary onClick={()=>setShowForm(false)}>إلغاء</Btn><Btn type="submit" disabled={saving}>{saving?"جارٍ الحفظ…":"حفظ المشروع"}</Btn></div></form></Card>}
  <Card style={{fontSize:11,color:MUTED,lineHeight:1.8}}>مهم: الحركات تُسجّل في دفتر Finance مرة واحدة فقط؛ ربطها بالمشروع يضيف بُعدًا للتقرير ولا ينشئ دخلًا أو مصروفًا جديدًا. الإيرادات والمصروفات وصافي الربح وROI تُعرض بعملة الأساس. الميزانية تُحوّل بسعر الصرف الحالي عند حساب نسبة الاستخدام؛ هذه النسبة تقديرية ولا تعيد تقييم الحركات التاريخية.</Card>
 </div>;
}
