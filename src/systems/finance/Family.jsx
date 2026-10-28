import React, { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../core/supabase.js";

const GREEN = "#059669", INK = "#17211D", MUTED = "#718078", LINE = "#E4EBE6", BG = "#F5F8F5";
const input = { width:"100%", minWidth:0, boxSizing:"border-box", border:"1px solid #D8E2DB", borderRadius:9, padding:"10px 11px", background:"#fff", color:INK, font:"inherit", fontSize:13 };
const RELATIONSHIPS = [{v:"Spouse",l:"زوج/زوجة"},{v:"Child",l:"ابن/ابنة"},{v:"Parent",l:"أب/أم"},{v:"Sibling",l:"أخ/أخت"},{v:"Relative",l:"قريب"},{v:"Other",l:"أخرى"}];
const RESPONSIBILITIES = [{v:"Personal",l:"شخصي"},{v:"Shared",l:"مشترك"},{v:"Unassigned",l:"غير محدد"}];
function Field({label,children}) { return <label style={{display:"grid",gap:6,color:"#46544B",fontSize:12,fontWeight:700}}>{label}{children}</label>; }
function Btn({children,secondary=false,...props}) { return <button {...props} style={{border:secondary?"1px solid "+LINE:"1px solid "+GREEN,background:secondary?"#fff":GREEN,color:secondary?INK:"#fff",borderRadius:9,padding:"10px 13px",fontWeight:750,cursor:props.disabled?"not-allowed":"pointer",opacity:props.disabled ? 0.6 : 1,fontFamily:"inherit",fontSize:12}}>{children}</button>; }
function Card({children,style={}}) { return <div style={{background:"#fff",border:"1px solid "+LINE,borderRadius:14,padding:16,...style}}>{children}</div>; }
const today = () => new Date().toLocaleDateString("en-CA",{timeZone:"Africa/Cairo"});
const money = (v,c="EGP") => { try { return new Intl.NumberFormat("ar-EG",{style:"currency",currency:c,maximumFractionDigits:2}).format(Number(v||0)); } catch { return String(v||0)+" "+c; } };

export default function FinanceFamily({ws,access,isDemo=false,currencies=[]}) {
  const [members,setMembers] = useState([]);
  const [budgets,setBudgets] = useState([]);
  const [allowances,setAllowances] = useState([]);
  const [loading,setLoading] = useState(true);
  const [saving,setSaving] = useState(false);
  const [error,setError] = useState("");
  const [notice,setNotice] = useState("");
  const [tab,setTab] = useState("overview");
  const [editing,setEditing] = useState(null);
  const [form,setForm] = useState({display_name:"",nickname:"",relationship_type:"Other",relationship_label:"",color:"#0D9488",default_responsibility:"Unassigned",linked_user_id:""});
  const [budgetForm,setBudgetForm] = useState({family_member_id:"",period:today().slice(0,7),amount:"",currency:"EGP",rollover_rule:"None"});
  const [allowanceForm,setAllowanceForm] = useState({family_member_id:"",amount:"",currency:"EGP",frequency:"Monthly",due_day:"",start_date:today()});
  const familyLevel = access?.sections?.family;
  const canView = !isDemo && (access?.owner || ((access?.level==="view" || access?.level==="edit") && familyLevel!=="none"));
  const canEdit = !isDemo && (access?.owner || (familyLevel!=="none" && familyLevel!=="view" && (access?.manage || access?.level==="edit")));
  const isOwner = !!(access?.owner || access?.manage);

  const load = useCallback(async()=>{
    if(isDemo || !ws?.id) { setMembers([]); setBudgets([]); setAllowances([]); setLoading(false); return; }
    setLoading(true); setError("");
    try {
      const [m,b,a] = await Promise.all([
        supabase.from("finance_family_members").select("id,display_name,nickname,relationship_type,relationship_label,color,default_responsibility,linked_user_id,status,created_at").eq("workspace_id",ws.id).order("status").order("display_name"),
        supabase.from("finance_family_budgets").select("id,family_member_id,period,start_date,end_date,amount,currency,rollover_rule,status").eq("workspace_id",ws.id).eq("status","Active").order("period",{ascending:false}),
        supabase.from("finance_family_allowances").select("id,family_member_id,amount,currency,frequency,due_day,start_date,end_date,status").eq("workspace_id",ws.id).neq("status","Archived").order("created_at",{ascending:false})
      ]);
      if(m.error) throw m.error; if(b.error) throw b.error; if(a.error) throw a.error;
      setMembers(m.data||[]); setBudgets(b.data||[]); setAllowances(a.data||[]);
    } catch(e) { setError(e?.message||"تعذّر تحميل مركز العائلة. تحقق من صلاحيات Finance/Family وتطبيق ترحيل قاعدة البيانات."); }
    finally { setLoading(false); }
  },[ws?.id,isDemo]);
  useEffect(()=>{load();},[load]);

  const activeMembers = useMemo(()=>members.filter(m=>m.status==="Active"),[members]);
  const memberName = id => members.find(m=>m.id===id)?.display_name || "ميزانية الأسرة";
  const resetMember = () => {setEditing(null);setForm({display_name:"",nickname:"",relationship_type:"Other",relationship_label:"",color:"#0D9488",default_responsibility:"Unassigned",linked_user_id:""});};
  function startEdit(m) {setEditing(m.id);setForm({display_name:m.display_name||"",nickname:m.nickname||"",relationship_type:m.relationship_type||"Other",relationship_label:m.relationship_label||"",color:m.color||"#0D9488",default_responsibility:m.default_responsibility||"Unassigned",linked_user_id:m.linked_user_id||""});setTab("members");}
  async function saveMember(e) {
    e.preventDefault(); if(!canEdit||saving) return;
    if(!form.display_name.trim()){setError("اكتب اسم الفرد.");return;}
    setSaving(true);setError("");setNotice("");
    try {
      const payload={workspace_id:ws.id,display_name:form.display_name.trim(),nickname:form.nickname.trim()||null,relationship_type:form.relationship_type,relationship_label:form.relationship_label.trim()||null,color:form.color,default_responsibility:form.default_responsibility,linked_user_id:form.linked_user_id||null,updated_by:(await supabase.auth.getUser()).data.user?.id};
      const result=editing
        ? await supabase.from("finance_family_members").update(payload).eq("workspace_id",ws.id).eq("id",editing).select("id").single()
        : await supabase.from("finance_family_members").insert({...payload,created_by:(await supabase.auth.getUser()).data.user?.id}).select("id").single();
      if(result.error) throw result.error;
      setNotice(editing?"تم تحديث بيانات الفرد.":"تمت إضافة فرد الأسرة.");resetMember();await load();
    } catch(e) {setError(e?.message||"تعذّر حفظ بيانات الفرد.");}
    finally {setSaving(false);}
  }
  async function archiveMember(m) {
    if(!canEdit||saving||!window.confirm("أرشفة "+m.display_name+"؟ ستظل السجلات التاريخية محفوظة.")) return;
    setSaving(true);setError("");setNotice("");
    try {
      const {error:e}=await supabase.from("finance_family_members").update({status:"Archived",archived_at:new Date().toISOString(),updated_by:(await supabase.auth.getUser()).data.user?.id}).eq("workspace_id",ws.id).eq("id",m.id);
      if(e) throw e;setNotice("تمت أرشفة الفرد مع الاحتفاظ بالسجل.");await load();
    } catch(e) {setError(e?.message||"تعذّرت الأرشفة.");}
    finally {setSaving(false);}
  }
  async function saveBudget(e) {
    e.preventDefault();if(!canEdit||saving)return;
    if(!/^[0-9]{4}-(0[1-9]|1[0-2])$/.test(budgetForm.period)||!(Number(budgetForm.amount)>0)){setError("أدخل شهرًا بصيغة YYYY-MM ومبلغًا أكبر من صفر.");return;}
    setSaving(true);setError("");setNotice("");
    try {
      const payload={workspace_id:ws.id,family_member_id:budgetForm.family_member_id||null,period:budgetForm.period,amount:Number(budgetForm.amount),currency:budgetForm.currency,rollover_rule:budgetForm.rollover_rule,updated_by:(await supabase.auth.getUser()).data.user?.id};
      const {error:e}=await supabase.from("finance_family_budgets").insert({...payload,created_by:(await supabase.auth.getUser()).data.user?.id});
      if(e)throw e;setNotice("تم حفظ الميزانية. سيتم احتساب الفعلي بعد استكمال ربط دفتر المعاملات.");setBudgetForm({...budgetForm,amount:""});await load();
    } catch(e) {setError(e?.message||"تعذّر حفظ الميزانية.");}
    finally {setSaving(false);}
  }
  async function saveAllowance(e) {
    e.preventDefault();if(!canEdit||saving)return;
    if(!allowanceForm.family_member_id||!(Number(allowanceForm.amount)>0)){setError("اختر فردًا وحدد مبلغًا أكبر من صفر.");return;}
    const day=allowanceForm.due_day?Number(allowanceForm.due_day):null;if(day!==null&&(!Number.isInteger(day)||day<1||day>31)){setError("يوم الاستحقاق من 1 إلى 31.");return;}
    setSaving(true);setError("");setNotice("");
    try {
      const actor=(await supabase.auth.getUser()).data.user?.id;
      const {error:e}=await supabase.from("finance_family_allowances").insert({workspace_id:ws.id,family_member_id:allowanceForm.family_member_id,amount:Number(allowanceForm.amount),currency:allowanceForm.currency,frequency:allowanceForm.frequency,due_day:day,start_date:allowanceForm.start_date,created_by:actor,updated_by:actor});
      if(e)throw e;setNotice("تم حفظ المخصص المخطط. لم يتم إنشاء حركة مالية أو تعديل رصيد.");setAllowanceForm({...allowanceForm,amount:""});await load();
    } catch(e) {setError(e?.message||"تعذّر حفظ المخصص.");}
    finally {setSaving(false);}
  }

  const tabs=[["overview","نظرة عامة","⌂"],["members","أفراد الأسرة","👪"],["budgets","الميزانيات","📊"],["allowances","المخصصات","💵"]];
  if(isDemo) return <div dir="rtl" style={{color:INK,fontFamily:"inherit",maxWidth:1100}}><Card><h2 style={{marginTop:0}}>👪 مركز مصاريف الأسرة — وضع تجريبي</h2><p style={{fontSize:13,color:MUTED,lineHeight:1.9}}>البيانات التجريبية غير متصلة بقاعدة الإنتاج. اربط قاعدة بيانات تطوير لاختبار الحفظ والصلاحيات.</p><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:10}}>{[["أفراد الأسرة",3],["الميزانيات",2],["المخصصات",2]].map(([l,v])=><Card key={l}><div style={{fontSize:12,color:MUTED}}>{l}</div><b style={{fontSize:24}}>{v}</b></Card>)}</div></Card></div>;
  if(!canView) return <div dir="rtl" style={{color:INK,fontFamily:"inherit",maxWidth:800}}><Card><h3 style={{marginTop:0}}>🔒 لا توجد صلاحية للوصول إلى مركز العائلة</h3><p style={{fontSize:13,color:MUTED,lineHeight:1.9}}>اطلب من صاحب المساحة منحك Finance OS → قسم العائلة: عرض أو تعديل. صلاحية الدخول إلى الماليات وحدها لا تكفي إذا كان الوصول لهذا القسم مستثنى.</p></Card></div>;

  return <div dir="rtl" style={{display:"grid",gap:14,color:INK,fontFamily:"inherit",maxWidth:1120}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",gap:12,flexWrap:"wrap"}}><div><div style={{fontSize:11,color:GREEN,fontWeight:800}}>FINANCE OS · FAMILY</div><h2 style={{margin:"5px 0",fontSize:24}}>مركز مصاريف الأسرة</h2><div style={{fontSize:12,color:MUTED}}>إدارة الأفراد والميزانيات والمخصصات — مع الحفاظ على دفتر مالي واحد.</div></div><Btn secondary onClick={load} disabled={loading}>↻ تحديث</Btn></div>
    {error&&<Card style={{borderColor:"#FDA29B",background:"#FFFBFA"}}><b style={{color:"#B42318"}}>تعذّر إكمال العملية</b><div style={{fontSize:12,marginTop:6,overflowWrap:"anywhere"}}>{error}</div></Card>}
    {notice&&<Card style={{borderColor:"#A6F4C5",background:"#F6FEF9"}}><div style={{color:"#067647",fontSize:13}}>{notice}</div></Card>}
    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{tabs.map(([id,label,icon])=><button key={id} onClick={()=>setTab(id)} style={{border:"1px solid "+(tab===id?"#A7DCC4":LINE),background:tab===id?"#E8F7EF":"#fff",color:tab===id?"#047857":MUTED,borderRadius:10,padding:"9px 13px",fontWeight:750,cursor:"pointer",fontFamily:"inherit"}}>{icon} {label}</button>)}</div>
    {loading?<Card>جارٍ تحميل بيانات العائلة…</Card>:<>
      {tab==="overview"&&<><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:10}}>{[["الأفراد النشطون",activeMembers.length],["الميزانيات النشطة",budgets.length],["المخصصات النشطة",allowances.filter(a=>a.status==="Active").length],["مصروفات تحتاج توزيعًا","—"]].map(([l,v])=><Card key={l}><div style={{fontSize:12,color:MUTED}}>{l}</div><div style={{fontSize:25,fontWeight:850,marginTop:7}}>{v}</div></Card>)}</div><Card><h3 style={{marginTop:0}}>قبل عرض إجمالي المصروفات</h3><p style={{fontSize:13,color:MUTED,lineHeight:1.9,marginBottom:0}}>توزيع المعاملات الفعلية وربطها بدفتر الحركات مرحلة مستقلة؛ لن نعرض أرقام إنفاق تقديرية أو نحسب التوزيعات مرتين. عند اكتمال ربط الدفتر ستظهر هنا مصروفات الأسرة حسب الفترة والفرد والتصنيف.</p></Card></>}
      {tab==="members"&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,300px),1fr))",gap:12,alignItems:"start"}}>
        {canEdit&&<Card><h3 style={{marginTop:0}}>{editing?"تعديل بيانات فرد":"إضافة فرد للأسرة"}</h3><form onSubmit={saveMember} style={{display:"grid",gap:11}}>
          <Field label="الاسم الظاهر *"><input required maxLength={120} style={input} value={form.display_name} onChange={e=>setForm({...form,display_name:e.target.value})} placeholder="مثال: أحمد"/></Field>
          <Field label="اسم مختصر (اختياري)"><input style={input} maxLength={80} value={form.nickname} onChange={e=>setForm({...form,nickname:e.target.value})}/></Field>
          <Field label="صلة القرابة"><select style={input} value={form.relationship_type} onChange={e=>setForm({...form,relationship_type:e.target.value})}>{RELATIONSHIPS.map(r=><option key={r.v} value={r.v}>{r.l}</option>)}</select></Field>
          {form.relationship_type==="Other"&&<Field label="توضيح الصلة"><input style={input} maxLength={100} value={form.relationship_label} onChange={e=>setForm({...form,relationship_label:e.target.value})}/></Field>}
          <Field label="المسؤولية الافتراضية"><select style={input} value={form.default_responsibility} onChange={e=>setForm({...form,default_responsibility:e.target.value})}>{RESPONSIBILITIES.map(r=><option key={r.v} value={r.v}>{r.l}</option>)}</select></Field>
          <Field label="لون التمييز"><input type="color" style={{...input,height:42,padding:4}} value={form.color} onChange={e=>setForm({...form,color:e.target.value})}/></Field>
          <Field label="ربط بمستخدم موجود (اختياري — لا يمنح صلاحية تلقائيًا)"><input style={input} value={form.linked_user_id} onChange={e=>setForm({...form,linked_user_id:e.target.value})} placeholder="UUID لمستخدم داخل المساحة"/></Field>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}><Btn type="submit" disabled={saving}>{saving?"جارٍ الحفظ…":editing?"حفظ التعديلات":"إضافة الفرد"}</Btn>{editing&&<Btn secondary type="button" onClick={resetMember}>إلغاء التعديل</Btn>}</div>
        </form></Card>}
        <Card><h3 style={{marginTop:0}}>أفراد الأسرة ({members.length})</h3>{!members.length?<div style={{fontSize:13,color:MUTED,lineHeight:1.8}}>لا يوجد أفراد بعد. أضف أفراد الأسرة لتتمكن من إعداد الميزانيات والمخصصات.</div>:<div style={{display:"grid",gap:9}}>{members.map(m=><div key={m.id} style={{border:"1px solid "+LINE,borderRadius:11,padding:12,display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
          <span style={{width:38,height:38,borderRadius:12,background:m.color+"20",color:m.color,display:"grid",placeItems:"center",fontWeight:850}}>{(m.display_name||"?").slice(0,1)}</span><div style={{flex:1,minWidth:140}}><b>{m.display_name}</b>{m.nickname&&<span style={{fontSize:11,color:MUTED}}> · {m.nickname}</span>}<div style={{fontSize:11,color:MUTED,marginTop:4}}>{RELATIONSHIPS.find(r=>r.v===m.relationship_type)?.l||m.relationship_label||"أخرى"} · {RESPONSIBILITIES.find(r=>r.v===m.default_responsibility)?.l||"غير محدد"} · {m.status==="Active"?"نشط":"مؤرشف"}</div></div>{canEdit&&m.status==="Active"&&<div style={{display:"flex",gap:6}}><Btn secondary onClick={()=>startEdit(m)}>تعديل</Btn><Btn secondary onClick={()=>archiveMember(m)} disabled={saving}>أرشفة</Btn></div>}</div>)}</div>}</Card>
      </div>}
      {tab==="budgets"&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,300px),1fr))",gap:12,alignItems:"start"}}>
        {canEdit&&<Card><h3 style={{marginTop:0}}>ميزانية الأسرة / الفرد</h3><form onSubmit={saveBudget} style={{display:"grid",gap:11}}><Field label="الفرد (اتركه فارغًا لميزانية الأسرة)"><select style={input} value={budgetForm.family_member_id} onChange={e=>setBudgetForm({...budgetForm,family_member_id:e.target.value})}><option value="">الأسرة كلها</option>{activeMembers.map(m=><option key={m.id} value={m.id}>{m.display_name}</option>)}</select></Field><Field label="الشهر (YYYY-MM) *"><input required pattern="[0-9]{4}-(0[1-9]|1[0-2])" style={input} value={budgetForm.period} onChange={e=>setBudgetForm({...budgetForm,period:e.target.value})} placeholder="2026-10"/></Field><Field label="المبلغ *"><input required type="number" min="0.01" step="0.01" style={input} value={budgetForm.amount} onChange={e=>setBudgetForm({...budgetForm,amount:e.target.value})}/></Field><Field label="العملة"><select style={input} value={budgetForm.currency} onChange={e=>setBudgetForm({...budgetForm,currency:e.target.value})}>{!currencies.some(c=>c.currency===budgetForm.currency)&&<option value={budgetForm.currency}>{budgetForm.currency}</option>}{currencies.map(c=><option key={c.currency} value={c.currency}>{c.currency} · {c.display_name}</option>)}</select></Field><Field label="ترحيل الفائض"><select style={input} value={budgetForm.rollover_rule} onChange={e=>setBudgetForm({...budgetForm,rollover_rule:e.target.value})}><option value="None">بدون</option><option value="CarryForward">ترحيل</option><option value="Capped">ترحيل بحد أقصى</option></select></Field><Btn type="submit" disabled={saving||!activeMembers.length&&!!budgetForm.family_member_id}>{saving?"جارٍ الحفظ…":"حفظ الميزانية"}</Btn></form></Card>}
        <Card><h3 style={{marginTop:0}}>الميزانيات النشطة</h3>{budgets.length?budgets.map(b=><div key={b.id} style={{padding:"11px 0",borderBottom:"1px solid "+LINE}}><b>{memberName(b.family_member_id)}</b><div style={{fontSize:12,color:MUTED,marginTop:4}}>{b.period||b.start_date+" — "+b.end_date} · {money(b.amount,b.currency)} · {b.rollover_rule==="None"?"بدون ترحيل":b.rollover_rule==="CarryForward"?"ترحيل":"ترحيل محدود"}</div></div>):<div style={{fontSize:13,color:MUTED}}>لا توجد ميزانيات نشطة.</div>}</Card>
      </div>}
      {tab==="allowances"&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,300px),1fr))",gap:12,alignItems:"start"}}>
        {canEdit&&<Card><h3 style={{marginTop:0}}>إضافة مخصص مخطط</h3><form onSubmit={saveAllowance} style={{display:"grid",gap:11}}><Field label="الفرد *"><select required style={input} value={allowanceForm.family_member_id} onChange={e=>setAllowanceForm({...allowanceForm,family_member_id:e.target.value})}><option value="">اختر فردًا</option>{activeMembers.map(m=><option key={m.id} value={m.id}>{m.display_name}</option>)}</select></Field><Field label="المبلغ *"><input required type="number" min="0.01" step="0.01" style={input} value={allowanceForm.amount} onChange={e=>setAllowanceForm({...allowanceForm,amount:e.target.value})}/></Field><Field label="العملة"><select style={input} value={allowanceForm.currency} onChange={e=>setAllowanceForm({...allowanceForm,currency:e.target.value})}>{!currencies.some(c=>c.currency===allowanceForm.currency)&&<option value={allowanceForm.currency}>{allowanceForm.currency}</option>}{currencies.map(c=><option key={c.currency} value={c.currency}>{c.currency} · {c.display_name}</option>)}</select></Field><Field label="الدورية"><select style={input} value={allowanceForm.frequency} onChange={e=>setAllowanceForm({...allowanceForm,frequency:e.target.value})}>{["Weekly","Monthly","Quarterly","Yearly"].map(f=><option key={f} value={f}>{({Weekly:"أسبوعي",Monthly:"شهري",Quarterly:"ربع سنوي",Yearly:"سنوي"})[f]}</option>)}</select></Field><Field label="يوم الاستحقاق (اختياري)"><input type="number" min="1" max="31" style={input} value={allowanceForm.due_day} onChange={e=>setAllowanceForm({...allowanceForm,due_day:e.target.value})}/></Field><Field label="تاريخ البداية"><input required type="date" style={input} value={allowanceForm.start_date} onChange={e=>setAllowanceForm({...allowanceForm,start_date:e.target.value})}/></Field><Btn type="submit" disabled={saving||!activeMembers.length}>{saving?"جارٍ الحفظ…":"حفظ المخصص"}</Btn></form></Card>}
        <Card><h3 style={{marginTop:0}}>المخصصات</h3>{allowances.length?allowances.map(a=><div key={a.id} style={{padding:"11px 0",borderBottom:"1px solid "+LINE}}><b>{memberName(a.family_member_id)}</b><div style={{fontSize:12,color:MUTED,marginTop:4}}>{money(a.amount,a.currency)} · {({Weekly:"أسبوعي",Monthly:"شهري",Quarterly:"ربع سنوي",Yearly:"سنوي"})[a.frequency]} · {a.due_day?"يوم "+a.due_day:"بدون يوم محدد"} · {a.status==="Active"?"نشط":"متوقف"}</div></div>):<div style={{fontSize:13,color:MUTED}}>لا توجد مخصصات.</div>}</Card>
      </div>}
    </>}
    <Card style={{fontSize:11,color:MUTED,lineHeight:1.8}}>الصلاحيات تُفحص في قاعدة البيانات كذلك. لا يمنح ربط الفرد بمستخدم صلاحية تلقائية. لا تُنشئ الميزانية أو المخصص حركة مالية أو تغيّر رصيد الحساب. تفاصيل الميلاد والملاحظات الحساسة محفوظة في جدول منفصل بصلاحية صريحة.</Card>
  </div>;
}
