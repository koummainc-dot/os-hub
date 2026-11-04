import React, { useMemo, useState } from "react";
import { validateRoutine, validateRoutineStep, sortRoutineSteps, routineAdherence, isRoutineDue } from "./domain.js";

const C = { ink: "#182230", muted: "#64748B", line: "#E2E8F0", accent: "#A855F7", white: "#FFFFFF", soft: "#FAF5FF", danger: "#B91C1C" };
const panel = { background: C.white, border: "1px solid " + C.line, borderRadius: 16, padding: 16, marginBottom: 14 };
const field = { width: "100%", boxSizing: "border-box", padding: "10px 11px", border: "1px solid " + C.line, borderRadius: 10, font: "inherit" };
const label = { display: "grid", gap: 6, color: C.muted, fontSize: 12, fontWeight: 650 };
const btn = (primary = false) => ({ border: "1px solid " + (primary ? C.accent : C.line), background: primary ? C.accent : C.white, color: primary ? C.white : C.ink, borderRadius: 9, padding: "8px 11px", font: "inherit", fontSize: 12, fontWeight: 700, cursor: "pointer" });
const EMPTY = { name: "", timeOfDay: "am", frequency: "daily", days: [], timesPerWeek: 3, reminderEnabled: false, reminderTime: "08:00", status: "active", steps: [] };
const DAY_NAMES = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const STEP_TYPES = [["cleanser","غسول"],["toner","تونر"],["treatment","علاج"],["serum","سيروم"],["eye","العين"],["moisturizer","مرطب"],["sunscreen","واقي شمس"],["oil","زيت/بلسم"],["other","أخرى"]];
const Panel = ({ title, children, action }) => <section style={panel}><div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,marginBottom:12 }}><b>{title}</b>{action}</div>{children}</section>;

export default function RoutinesView({ routines, logs, products, reactions = [], canEdit, busy, onSave, onArchive, onCopy, onLog, onUndo, todayKey, timezone = "Africa/Cairo", weekStartDay = 6, requireConfirmAvoid = true }) {
  const [draft, setDraft] = useState(EMPTY);
  const [editing, setEditing] = useState("");
  const [stepProduct, setStepProduct] = useState("");
  const [stepType, setStepType] = useState("serum");
  const [stepInstruction, setStepInstruction] = useState("");
  const [preview, setPreview] = useState(false);
  const [previewSteps, setPreviewSteps] = useState([]);
  const today = todayKey || new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const [year, month, dayOfMonth] = today.split("-").map(Number);
  const dayIndex = new Date(Date.UTC(year, month - 1, dayOfMonth)).getUTCDay();
  const weekStartDate = new Date(Date.UTC(year, month - 1, dayOfMonth));
  weekStartDate.setUTCDate(weekStartDate.getUTCDate() - ((dayIndex - weekStartDay + 7) % 7));
  const weekStart = weekStartDate.toISOString().slice(0,10);
  const weekLogs = useMemo(() => logs.filter(x => x.date >= weekStart && x.date <= today), [logs, weekStart, today]);
  const weekDue = routines.filter(x => x.status === "active").reduce((n, r) => n + (r.frequency === "times_per_week" ? (r.timesPerWeek || 0) : r.frequency === "selected_days" ? (r.days || []).length : 7) * (r.steps || []).length, 0);
  const adherence = routineAdherence(weekLogs, weekDue);

  const reset = () => { setDraft(EMPTY); setEditing(""); setStepProduct(""); setStepInstruction(""); setPreview(false); setPreviewSteps([]); };
  const save = async e => {
    e.preventDefault();
    const checked = validateRoutine(draft);
    if (!checked.ok) return window.alert(checked.error);
    if (!draft.steps.length) return window.alert("أضف خطوة واحدة على الأقل قبل حفظ الروتين.");
    const saved = await onSave({ ...checked.value, id: editing || undefined, steps: draft.steps.map((s, i) => ({ ...s, order: i })) });
    if (saved) reset();
  };
  const addStep = () => {
    const checked = validateRoutineStep({ id: "step-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8), productId: stepProduct, category: stepType, instruction: stepInstruction, order: draft.steps.length, avoidConfirmed: !requireConfirmAvoid }, products);
    if (!checked.ok) {
      if (checked.requiresConfirmation && window.confirm(checked.error + "\nهل تريد الإضافة رغم التحذير؟")) {
        const confirmed = validateRoutineStep({ id: "step-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8), productId: stepProduct, category: stepType, instruction: stepInstruction, order: draft.steps.length, avoidConfirmed: true }, products);
        if (confirmed.ok) setDraft(d => ({ ...d, steps: [...d.steps, confirmed.value] }));
      } else if (!checked.requiresConfirmation) window.alert(checked.error);
      return;
    }
    setDraft(d => ({ ...d, steps: [...d.steps, checked.value] }));
    setStepProduct(""); setStepInstruction("");
  };
  const move = (index, delta) => setDraft(d => {
    const steps = [...d.steps]; const target = index + delta;
    if (target < 0 || target >= steps.length) return d;
    [steps[index], steps[target]] = [steps[target], steps[index]];
    return { ...d, steps: steps.map((s, i) => ({ ...s, order: i })) };
  });
  const startEdit = r => { setEditing(r.id); setDraft({ ...EMPTY, ...r, steps: [...(r.steps || [])] }); setPreview(false); setPreviewSteps([]); };
  const removeStep = step => {
    const hasHistory = logs.some(log => log.routineId === editing && log.stepId === step.id);
    if (hasHistory) {
      setDraft(d => ({ ...d, steps: d.steps.map(x => x.id === step.id ? { ...x, archived: true } : x) }));
      window.alert("لهذه الخطوة سجل تنفيذ سابق؛ تم أرشفتها للحفاظ على التاريخ.");
    } else {
      setDraft(d => ({ ...d, steps: d.steps.filter(x => x.id !== step.id) }));
    }
  };
  const todayLogs = logs.filter(x => x.date === today);
  const productName = id => products.find(p => p.id === id)?.name || "منتج غير متاح";
  return <div>
    <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:10,marginBottom:14 }}>
      <div style={panel}><div style={{fontSize:11,color:C.muted}}>الروتينات النشطة</div><b style={{fontSize:22}}>{routines.filter(r=>r.status==="active").length}</b></div>
      <div style={panel}><div style={{fontSize:11,color:C.muted}}>تنفيذ اليوم</div><b style={{fontSize:22}}>{todayLogs.filter(x=>x.status==="done").length}</b></div>
      <div style={panel}><div style={{fontSize:11,color:C.muted}}>الالتزام التقديري</div><b style={{fontSize:22}}>{adherence == null ? "—" : adherence + "%"}</b></div>
    </div>
    <Panel title={editing ? "تعديل الروتين" : "إنشاء روتين"}>
      {canEdit ? <form onSubmit={save} style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:11}}>
        <label style={label}>اسم الروتين<input style={field} value={draft.name} maxLength={120} onChange={e=>setDraft(d=>({...d,name:e.target.value}))} placeholder="مثال: روتين الصباح" required /></label>
        <label style={label}>الفترة<select style={field} value={draft.timeOfDay} onChange={e=>setDraft(d=>({...d,timeOfDay:e.target.value}))}><option value="am">صباح</option><option value="pm">مساء</option><option value="custom">مخصص</option></select></label>
        <label style={label}>التكرار<select style={field} value={draft.frequency} onChange={e=>setDraft(d=>({...d,frequency:e.target.value}))}><option value="daily">يومي</option><option value="selected_days">أيام محددة</option><option value="times_per_week">عدد مرات أسبوعيًا</option></select></label>
        {draft.frequency==="selected_days" && <div style={{gridColumn:"1 / -1",display:"flex",gap:8,flexWrap:"wrap"}}>{DAY_NAMES.map((day,i)=><label key={day} style={{fontSize:12,color:C.muted}}><input type="checkbox" checked={draft.days.includes(i)} onChange={e=>setDraft(d=>({...d,days:e.target.checked?[...d.days,i]:d.days.filter(x=>x!==i)}))}/> {day}</label>)}</div>}
        {draft.frequency==="times_per_week" && <label style={label}>مرات أسبوعيًا<input style={field} type="number" min="1" max="7" value={draft.timesPerWeek} onChange={e=>setDraft(d=>({...d,timesPerWeek:Number(e.target.value)}))}/></label>}
        <label style={label}>وقت التذكير (اختياري)<input style={field} type="time" value={draft.reminderTime || ""} onChange={e=>setDraft(d=>({...d,reminderTime:e.target.value}))}/></label>
        <label style={{...label,display:"flex",alignItems:"center",gap:8}}><input type="checkbox" checked={draft.reminderEnabled} onChange={e=>setDraft(d=>({...d,reminderEnabled:e.target.checked}))}/> تفعيل التذكير (يظهر في المتابعة ويتزامن مع خدمات OS Hub)</label>
        <div style={{gridColumn:"1 / -1",borderTop:"1px solid "+C.line,paddingTop:12}}>
          <b style={{fontSize:13}}>خطوات الروتين</b>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:8,marginTop:10}}>
            <label style={label}>المنتج<select style={field} value={stepProduct} onChange={e=>setStepProduct(e.target.value)}><option value="">اختر منتجًا</option>{products.filter(p=>!["paused","finished","discarded","stopped"].includes(p.status)).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
            <label style={label}>نوع الخطوة<select style={field} value={stepType} onChange={e=>setStepType(e.target.value)}>{STEP_TYPES.map(([v,t])=><option key={v} value={v}>{t}</option>)}</select></label>
            <label style={label}>تعليمات<input style={field} value={stepInstruction} onChange={e=>setStepInstruction(e.target.value)} maxLength={500}/></label>
            <div style={{display:"flex",alignItems:"end"}}><button type="button" style={btn()} onClick={addStep}>إضافة خطوة</button></div>
          </div>
          {draft.steps.map((step,i)=><div key={step.id} style={{display:"flex",alignItems:"center",gap:8,padding:"9px 0",borderTop:"1px solid "+C.line,flexWrap:"wrap"}}>
            <b style={{fontSize:12}}>{i+1}. {productName(step.productId)}</b><span style={{fontSize:11,color:C.muted}}>{STEP_TYPES.find(x=>x[0]===step.category)?.[1] || step.category}{step.instruction ? " · "+step.instruction : ""}</span><span style={{flex:1}}/>
            <button type="button" style={btn()} disabled={i===0} onClick={()=>move(i,-1)}>↑</button><button type="button" style={btn()} disabled={i===draft.steps.length-1} onClick={()=>move(i,1)}>↓</button><button type="button" style={{...btn(),color:C.danger}} onClick={()=>removeStep(step)}>إزالة</button>
          </div>)}
          {draft.steps.length>1 && <div style={{display:"flex",gap:8,marginTop:8}}><button type="button" style={btn()} onClick={()=>{setPreviewSteps(sortRoutineSteps(draft.steps));setPreview(true);}}>معاينة الترتيب المقترح</button>{preview && <><button type="button" style={btn(true)} onClick={()=>{setDraft(d=>({...d,steps:previewSteps}));setPreview(false);setPreviewSteps([]);}}>تطبيق الترتيب</button><button type="button" style={btn()} onClick={()=>{setPreview(false);setPreviewSteps([]);}}>إلغاء المعاينة</button></> }</div>}
          {preview && <p style={{fontSize:11,color:C.muted}}>ترتيب مقترح للمعاينة فقط. اضغط «تطبيق الترتيب» لاعتماده داخل المسودة، ثم احفظ الروتين.</p>}
        </div>
        <div style={{display:"flex",gap:8}}><button style={btn(true)} disabled={busy}>{editing?"حفظ التعديلات":"إنشاء الروتين"}</button>{editing && <button type="button" style={btn()} onClick={reset}>إلغاء</button>}</div>
      </form> : <p style={{fontSize:12,color:C.muted}}>صلاحية العرض فقط.</p>}
    </Panel>
    <Panel title={"روتيناتي ("+routines.length+")"}>
      {!routines.length && <p style={{fontSize:12,color:C.muted}}>لا توجد روتينات بعد. ابدأ بإنشاء روتين صباحي أو مسائي.</p>}
      {routines.map(r=>{
        const rlogs=logs.filter(x=>x.routineId===r.id);
        const dueToday=isRoutineDue(r,today,logs,timezone,weekStartDay);
        return <article key={r.id} style={{borderTop:"1px solid "+C.line,padding:"13px 0"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}><b>{r.name}</b><span style={{fontSize:11,color:C.muted}}>{r.timeOfDay==="am"?"صباح":r.timeOfDay==="pm"?"مساء":"مخصص"} · {r.status==="paused"?"متوقف مؤقتًا":"نشط"}</span><span style={{flex:1}}/>{canEdit && <><button type="button" style={btn()} onClick={()=>startEdit(r)}>تعديل</button><button type="button" style={btn()} onClick={()=>onCopy(r)}>نسخ</button><button type="button" style={btn()} onClick={()=>onArchive(r)}>{r.status==="paused"?"تفعيل":"إيقاف مؤقت"}</button></>}</div>
          <div style={{marginTop:8,display:"grid",gap:7}}>
            {(r.steps||[]).filter(step=>!step.archived).map(step=>{
              const log=todayLogs.find(x=>x.routineId===r.id&&x.stepId===step.id);
              const openReactions=reactions.filter(item=>item.productId===step.productId&&item.status==="open");
              return <div key={step.id} style={{display:"grid",gap:6,background:C.soft,borderRadius:9,padding:9}}>
                <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                  <span style={{fontSize:12,flex:1}}>{productName(step.productId)} {log?.status==="done"?"✓":log?.status==="skipped"?"—":""}</span>
                {canEdit && r.status==="active" && dueToday && !log && <><button type="button" style={btn(true)} disabled={busy} onClick={()=>onLog(r,step,"done")}>تم</button><button type="button" style={btn()} disabled={busy} onClick={()=>onLog(r,step,"skipped")}>تخطي</button></>}
                {canEdit && log && <span style={{fontSize:11,color:C.muted}}>تم تسجيل {log.status==="done"?"التنفيذ":"التخطي"}</span>}
                {canEdit && r.status==="active" && !dueToday && !log && <span style={{fontSize:11,color:C.muted}}>غير مستحق اليوم أو اكتمل هدف الأسبوع</span>}
                </div>
                {openReactions.length>0 && <div style={{borderTop:"1px solid "+C.line,paddingTop:6,color:openReactions.some(item=>item.severity==="severe")?C.danger:"#B45309",fontSize:11}}>
                  <b>تنبيه: يوجد تفاعل جلدي مفتوح مسجل لهذا المنتج</b>
                  <div style={{marginTop:3}}>{openReactions.map(item=>(item.dateStarted+" · "+({mild:"خفيف",moderate:"متوسط",severe:"شديد"}[item.severity]||item.severity))).join(" | ")}</div>
                  <span style={{color:C.muted}}>راجع سجل التفاعل وقرارك بشأن استخدام المنتج؛ لا يوقف التطبيق الخطوة تلقائيًا.</span>
                </div>}
              </div>;
            })}
          </div>
          {rlogs.length>0 && <div style={{fontSize:11,color:C.muted,marginTop:7}}>سجلات التنفيذ: {rlogs.length}</div>}
        </article>;
      })}
    </Panel>
    {canEdit && logs.length>0 && <Panel title="آخر سجل تنفيذ" action={<button type="button" style={btn()} onClick={onUndo}>تراجع عن آخر تسجيل</button>}>
      <p style={{fontSize:12,color:C.muted}}>التراجع يحذف منطقيًا أحدث تسجيل تنفيذ/تخطي فقط، ولا يحذف الروتين أو خطواته.</p>
    </Panel>}
  </div>;
}
