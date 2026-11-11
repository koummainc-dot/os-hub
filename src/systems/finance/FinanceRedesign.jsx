import React from "react";
import FinanceChart from "./FinanceChart.jsx";

const C = {
  bg: "#F5F4EF",
  surface: "#FFFFFF",
  ink: "#1F2A24",
  muted: "#6B756F",
  line: "#E5E7E3",
  green: "#176B4D",
  greenSoft: "#E8F2EC",
  greenLine: "#BFD9CB",
  red: "#B42318",
  redSoft: "#FFF0EE",
  amber: "#8A5A00",
  amberSoft: "#FFF7E3",
};

const money = (v, currency = "EGP") => {
  if (v === null || v === undefined || v === "") return "—";
  try {
    return new Intl.NumberFormat("ar-EG", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(Number(v));
  } catch {
    return Number(v).toLocaleString("ar-EG") + " " + currency;
  }
};

function Button({ children, onClick, secondary = false, danger = false, disabled = false }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        border: "1px solid " + (danger ? "#F3C1BC" : secondary ? C.line : C.green),
        background: danger ? C.redSoft : secondary ? C.surface : C.green,
        color: danger ? C.red : secondary ? C.ink : "#fff",
        borderRadius: 10,
        padding: "9px 13px",
        fontFamily: "inherit",
        fontSize: 12,
        fontWeight: 800,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.55 : 1,
      }}
    >
      {children}
    </button>
  );
}

function Card({ children, style = {}, onClick }) {
  return (
    <section
      style={{
        background: C.surface,
        border: "1px solid " + C.line,
        borderRadius: 16,
        padding: 18,
        minWidth: 0,
        ...style,
        ...(onClick ? { cursor: "pointer" } : {}),
      }}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") onClick(e); } : undefined}
    >
      {children}
    </section>
  );
}

function Stat({ label, value, note, tone = "default" }) {
  const color = tone === "positive" ? C.green : tone === "negative" ? C.red : C.ink;
  return (
    <Card>
      <div style={{ color: C.muted, fontSize: 11, fontWeight: 700 }}>{label}</div>
      <div style={{ marginTop: 7, color, fontSize: 25, fontWeight: 900, letterSpacing: "-.5px" }}>{value}</div>
      {note && <div style={{ marginTop: 6, color: C.muted, fontSize: 11 }}>{note}</div>}
    </Card>
  );
}

function Pill({ children, tone = "neutral" }) {
  const map = {
    neutral: [C.bg, C.muted],
    positive: [C.greenSoft, C.green],
    warning: [C.amberSoft, C.amber],
    negative: [C.redSoft, C.red],
  };
  const [bg, color] = map[tone] || map.neutral;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", borderRadius: 999, padding: "5px 9px", background: bg, color, fontSize: 10, fontWeight: 800, whiteSpace: "nowrap" }}>
      {children}
    </span>
  );
}

function Progress({ value, max, tone = "green" }) {
  const pct = Math.max(0, Math.min(100, max ? (Number(value) / Number(max)) * 100 : 0));
  return (
    <div style={{ height: 7, background: "#ECEEEA", borderRadius: 99, overflow: "hidden" }}>
      <div style={{ width: pct + "%", height: "100%", background: tone === "red" ? C.red : C.green, borderRadius: 99 }} />
    </div>
  );
}

function Segmented({ items, value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 5, padding: 4, background: "#ECEDE9", borderRadius: 11, overflowX: "auto" }}>
      {items.map(([id, label]) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          style={{
            border: 0,
            background: value === id ? C.surface : "transparent",
            color: value === id ? C.ink : C.muted,
            boxShadow: value === id ? "0 1px 4px rgba(0,0,0,.08)" : "none",
            borderRadius: 8,
            padding: "7px 11px",
            fontFamily: "inherit",
            fontSize: 11,
            fontWeight: 800,
            whiteSpace: "nowrap",
            cursor: "pointer",
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function Table({ columns, rows, empty = "لا توجد بيانات", onRowClick }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 650 }}>
        <thead>
          <tr>
            {columns.map(([key, label]) => (
              <th key={key} style={{ textAlign: "right", padding: "10px 8px", borderBottom: "1px solid " + C.line, color: C.muted, fontSize: 10, whiteSpace: "nowrap" }}>{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? rows.map((row, i) => (
            <tr key={row.id || i} onClick={() => onRowClick?.(row.raw || row)} style={{ cursor: onRowClick ? "pointer" : "default" }}>
              {columns.map(([key]) => (
                <td key={key} style={{ padding: "12px 8px", borderBottom: "1px solid #EFF1EE", color: C.ink, fontSize: 11, whiteSpace: "nowrap" }}>{row[key]}</td>
              ))}
            </tr>
          )) : (
            <tr><td colSpan={columns.length} style={{ padding: 30, textAlign: "center", color: C.muted, fontSize: 12 }}>{empty}</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function PageHead({ eyebrow, title, subtitle, actions }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", flexWrap: "wrap", marginBottom: 16 }}>
      <div>
        <div style={{ color: C.green, fontSize: 10, fontWeight: 900, letterSpacing: ".4px", marginBottom: 5 }}>{eyebrow || "الماليات"}</div>
        <h1 style={{ margin: 0, color: C.ink, fontSize: 25, fontWeight: 900, letterSpacing: "-.5px" }}>{title}</h1>
        {subtitle && <p style={{ margin: "6px 0 0", color: C.muted, fontSize: 11, lineHeight: 1.8 }}>{subtitle}</p>}
      </div>
      {actions && <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>{actions}</div>}
    </div>
  );
}

function Shell({ page, setPage, children, onAdd, onRefresh, hideBalances, setHideBalances, isDemo }) {
  const primary = [
    ["dashboard", "نظرة عامة"],
    ["transactions", "الحركات"],
    ["budgets", "التخطيط"],
    ["settings", "الإعدادات المالية"],
    ["family", "الأسرة"],
  ];
  const current = page === "dashboard" ? "dashboard"
    : ["transactions", "recurring", "inbox"].includes(page) ? "transactions"
    : ["budgets", "goals", "reports", "projects"].includes(page) ? "planning"
    : ["settings", "accounts", "categories", "currencies", "recurring", "context-tags"].includes(page) ? "settings" : page;

  return (
    <div dir="rtl" style={{ minHeight: "100%", background: C.bg, color: C.ink, fontFamily: "inherit" }}>
      <style>{`
        .finance-v2 { max-width: 1440px; margin: 0 auto; padding: 28px 34px 80px; }
        .finance-v2-grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:12px; }
        .finance-v2-two { display:grid; grid-template-columns:minmax(0,1.45fr) minmax(320px,.75fr); gap:12px; }
        .finance-v2-three { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:12px; }
        .finance-v2-mobile-nav { display:none; }
        @media(max-width:980px){.finance-v2-grid{grid-template-columns:repeat(2,minmax(0,1fr));}.finance-v2-two{grid-template-columns:1fr}.finance-v2-three{grid-template-columns:1fr}}
        @media(max-width:640px){.finance-v2{padding:18px 14px 86px}.finance-v2-grid{grid-template-columns:1fr 1fr;gap:8px}.finance-v2-three{grid-template-columns:1fr}.finance-v2-topnav{overflow-x:auto}.finance-v2-mobile-nav{display:flex;position:fixed;bottom:0;left:0;right:0;z-index:40;background:rgba(255,255,255,.96);border-top:1px solid #E5E7E3;padding:8px 8px calc(8px + env(safe-area-inset-bottom));justify-content:space-around}.finance-v2-mobile-nav button{border:0;background:transparent;font-family:inherit;color:#6B756F;font-size:10px;font-weight:800}.finance-v2-mobile-nav button.active{color:#176B4D}.finance-v2-desktop-only{display:block}}
        @media(max-width:640px){.finance-v2-desktop-only{display:none}}
      `}</style>
      <div className="finance-v2">
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 12, background: C.green, color: "#fff", display: "grid", placeItems: "center", fontWeight: 950 }}>₤</div>
            <div>
              <div style={{ fontSize: 10, color: C.muted, fontWeight: 800 }}>OS HUB · FINANCE</div>
              <div style={{ fontSize: 17, fontWeight: 950 }}>الماليات</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
            <button type="button" onClick={() => setHideBalances(!hideBalances)} style={{ border: "1px solid " + C.line, background: C.surface, borderRadius: 10, padding: "8px 10px", fontFamily: "inherit", fontSize: 11, fontWeight: 800, color: C.muted }}>
              {hideBalances ? "إظهار الأرصدة" : "إخفاء الأرصدة"}
            </button>
            <Button secondary onClick={onRefresh}>↻ تحديث</Button>
            <Button onClick={onAdd}>＋ حركة</Button>
          </div>
        </header>

        <nav className="finance-v2-topnav" style={{ display: "flex", gap: 4, padding: 4, background: "#E9EAE6", borderRadius: 13, marginBottom: 12 }}>
          {primary.map(([id, label]) => (
            <button key={id} type="button" onClick={() => setPage(id)} style={{ flex: "1 0 auto", border: 0, borderRadius: 10, background: current === id ? C.surface : "transparent", color: current === id ? C.ink : C.muted, boxShadow: current === id ? "0 1px 4px rgba(0,0,0,.07)" : "none", padding: "10px 13px", fontFamily: "inherit", fontSize: 11, fontWeight: 900, cursor: "pointer" }}>{label}</button>
          ))}
        </nav>

        <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 18, flexWrap: "wrap" }}>
          <Pill tone="positive">الدفتر: شخصي</Pill>
          <button type="button" onClick={() => setPage("dashboard")} style={{border:"1px solid "+C.line,background:C.surface,borderRadius:999,padding:"5px 10px",fontFamily:"inherit",fontSize:10,fontWeight:800,color:C.muted,cursor:"pointer"}}>مشاريع</button>
          <button type="button" onClick={() => setPage("dashboard")} style={{border:"1px solid "+C.line,background:C.surface,borderRadius:999,padding:"5px 10px",fontFamily:"inherit",fontSize:10,fontWeight:800,color:C.muted,cursor:"pointer"}}>الكل</button>
          {isDemo && <Pill tone="warning">وضع تجريبي</Pill>}
        </div>

        {children}
      </div>

      <nav className="finance-v2-mobile-nav">
        {primary.map(([id,label]) => (
          <button key={id} type="button" className={current === id ? "active" : ""} onClick={() => setPage(id)}>
            <div style={{fontSize:15,marginBottom:2}}>{id==="dashboard"?"⌂":id==="transactions"?"≡":id==="family"?"👪":id==="planning"?"◫":"⚙"}</div>
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}

function TransactionSheet({ transaction, categories, accounts, baseCurrency, contextTags = [], contextFamilyMembers = [], onSaveContext, onClose }) {
  const [contextDraft,setContextDraft]=React.useState({context_type:"Family",finance_project_id:"",family_member_id:""});
  const [contextSaving,setContextSaving]=React.useState(false);
  const [contextError,setContextError]=React.useState("");
  React.useEffect(()=>{
    const saved=contextTags.find(x=>x.transaction_id===transaction?.id);
    setContextDraft({context_type:"Family",finance_project_id:"",family_member_id:saved?.context_type==="Family"?saved.family_member_id:""
    });
    setContextError("");
  },[transaction,contextTags]);
  if (!transaction) return null;
  const category = categories.find(c => c.id === transaction.category_id)?.name || "بدون تصنيف";
  const account = accounts.find(a => a.id === transaction.from_account_id)?.name || accounts.find(a => a.id === transaction.to_account_id)?.name || "—";
  const typeLabel = transaction.type === "Income" ? "دخل" : transaction.type === "Transfer" ? "تحويل" : "مصروف";
  const statusLabel = transaction.status === "Posted" ? "تمت المراجعة" : transaction.status || "غير محددة";
  return (
    <div role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }} style={{ position:"fixed", inset:0, zIndex:1000, background:"rgba(20,37,29,.72)", display:"grid", placeItems:"center", padding:16, overflowY:"auto" }}>
      <div role="dialog" aria-modal="true" aria-label="تفاصيل الحركة المالية" style={{ background:C.surface, width:"min(620px,100%)", maxHeight:"calc(100vh - 32px)", overflowY:"auto", borderRadius:18, padding:22, boxSizing:"border-box", boxShadow:"0 18px 60px rgba(0,0,0,.18)" }}>
        <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"flex-start"}}>
          <div>
            <div style={{color:C.green,fontSize:10,fontWeight:900}}>تفاصيل الحركة</div>
            <h2 style={{margin:"5px 0 0",fontSize:20}}>{transaction.merchant || transaction.name || "حركة مالية"}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="إغلاق" style={{border:0,background:"transparent",fontSize:24,cursor:"pointer",color:C.muted}}>×</button>
        </div>
        <div style={{marginTop:18,padding:16,borderRadius:14,background:C.bg,border:"1px solid "+C.line}}>
          <div style={{fontSize:12,color:C.muted}}>المبلغ</div>
          <div style={{fontSize:30,fontWeight:950,marginTop:5,color:transaction.type==="Income"?C.green:C.ink}}>{money(transaction.amount, transaction.currency || baseCurrency)}</div>
          <div style={{marginTop:8,display:"flex",gap:7,flexWrap:"wrap"}}>
            <Pill tone={transaction.type==="Income"?"positive":"neutral"}>{typeLabel}</Pill>
            <Pill tone={transaction.status==="Posted"?"positive":"warning"}>{statusLabel}</Pill>
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:10,marginTop:14}}>
          {[
            ["التاريخ", transaction.local_date || "—"],
            ["الحساب", account],
            ["التصنيف", category],
            ["التاجر / المستفيد", transaction.merchant || "—"],
            ["الغرض", transaction.purpose || "—"],
            ["العملة", transaction.currency || baseCurrency],
          ].map(([label,value]) => (
            <div key={label} style={{border:"1px solid "+C.line,borderRadius:12,padding:12}}>
              <div style={{fontSize:10,color:C.muted}}>{label}</div>
              <div style={{fontSize:12,fontWeight:800,marginTop:5,overflowWrap:"anywhere"}}>{value}</div>
            </div>
          ))}
        </div>
        {transaction.notes && <div style={{marginTop:12,border:"1px solid "+C.line,borderRadius:12,padding:13}}><div style={{fontSize:10,color:C.muted}}>ملاحظات</div><div style={{fontSize:12,lineHeight:1.8,marginTop:5,whiteSpace:"pre-wrap"}}>{transaction.notes}</div></div>}
        <div style={{marginTop:14,border:"1px solid "+C.line,borderRadius:13,padding:13}}>
          <h3 style={{margin:"0 0 10px",fontSize:13}}>ربط المصروف بفرد من الأسرة</h3>
          {transaction.type==="Expense"&&transaction.status==="Posted"?<>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:9}}>
              <div style={{fontSize:11,color:C.muted,marginBottom:2}}>الربط يتم من خلال توزيع مصروفات الأسرة الحالي.</div>
              <label style={{display:"grid",gap:5,fontSize:11,color:C.muted}}>فرد الأسرة<select value={contextDraft.family_member_id} onChange={e=>setContextDraft(v=>({...v,family_member_id:e.target.value}))} style={{border:"1px solid "+C.line,borderRadius:9,padding:9,font:"inherit"}}><option value="">اختر فردًا</option>{contextFamilyMembers.map(m=><option key={m.id} value={m.id}>{m.display_name}</option>)}</select></label>
            </div>
            {contextError&&<div role="alert" style={{color:C.red,fontSize:11,marginTop:8}}>{contextError}</div>}
            <div style={{display:"flex",justifyContent:"flex-start",marginTop:10}}><Button disabled={contextSaving||!contextDraft.family_member_id} onClick={async()=>{setContextSaving(true);setContextError("");try{await onSaveContext?.(transaction.id,contextDraft);}catch(e){setContextError(e?.message||"تعذّر ربط المصروف بفرد الأسرة.");}finally{setContextSaving(false);}}}>{contextSaving?"جارٍ الحفظ…":"حفظ ربط الأسرة"}</Button></div>
          </>:<div style={{fontSize:11,color:C.muted,lineHeight:1.8}}>ربط الأسرة متاح للمصروفات المنشورة فقط، لأن دفتر الأسرة الحالي يوزّع المصروفات ولا يضيف حركة محاسبية مكررة.</div>}
        </div>
        <div style={{display:"flex",justifyContent:"flex-end",marginTop:16}}><Button secondary onClick={onClose}>إغلاق</Button></div>
      </div>
    </div>
  );
}


function TransactionCreateModal({
  open,
  draft,
  setDraft,
  splitMode,
  setSplitMode,
  splitRows,
  setSplitRows,
  accounts = [],
  categories = [],
  goals = [],
  contextFamilyMembers = [],
  baseCurrency = "EGP",
  saving = false,
  error = "",
  onSave,
  onClose,
}) {
  if (!open) return null;
  const update = (key, value) => setDraft(prev => ({ ...prev, [key]: value }));
  const activeAccounts = accounts.filter(a => a.status !== "Archived");
  return (
    <div role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }} style={{ position:"fixed", inset:0, zIndex:1400, background:"rgba(20,37,29,.72)", display:"grid", placeItems:"center", padding:16, overflowY:"auto" }}>
      <div role="dialog" aria-modal="true" aria-label="إضافة حركة مالية" style={{ background:C.surface, width:"min(720px,100%)", maxHeight:"calc(100vh - 32px)", overflowY:"auto", borderRadius:18, padding:22, boxSizing:"border-box", boxShadow:"0 18px 60px rgba(0,0,0,.18)" }}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12}}>
          <div><div style={{color:C.green,fontSize:10,fontWeight:900}}>الماليات · الحركات</div><h2 style={{margin:"5px 0 0",fontSize:20}}>إضافة حركة</h2><div style={{marginTop:5,color:C.muted,fontSize:11}}>تُحفظ مباشرة في نفس دفتر الحركات.</div></div>
          <button type="button" onClick={onClose} aria-label="إغلاق" style={{border:0,background:"transparent",fontSize:24,cursor:"pointer",color:C.muted}}>×</button>
        </div>
        {error && <div role="alert" style={{marginTop:14,background:C.redSoft,color:C.red,border:"1px solid #F3C1BC",borderRadius:10,padding:10,fontSize:11}}>{error}</div>}
        <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:10,marginTop:16}}>
          <label style={{display:"grid",gap:6,fontSize:11,color:C.muted}}>النوع
            <select value={draft.type} onChange={e=>update("type",e.target.value)} style={{border:"1px solid "+C.line,borderRadius:9,padding:10,font:"inherit"}}>
              <option value="Expense">مصروف</option><option value="Income">دخل</option><option value="Transfer">تحويل</option>
            </select>
          </label>
          <label style={{display:"grid",gap:6,fontSize:11,color:C.muted}}>التاريخ
            <input type="date" value={draft.local_date} onChange={e=>update("local_date",e.target.value)} style={{border:"1px solid "+C.line,borderRadius:9,padding:10,font:"inherit"}}/>
          </label>
          <label style={{display:"grid",gap:6,fontSize:11,color:C.muted}}>المبلغ
            <input type="number" min="0" step="0.01" value={draft.amount} onChange={e=>update("amount",e.target.value)} placeholder="0.00" style={{border:"1px solid "+C.line,borderRadius:9,padding:10,font:"inherit"}}/>
          </label>
          <label style={{display:"grid",gap:6,fontSize:11,color:C.muted}}>العملة
            <input value={draft.currency || baseCurrency} onChange={e=>update("currency",e.target.value.toUpperCase())} maxLength={3} style={{border:"1px solid "+C.line,borderRadius:9,padding:10,font:"inherit"}}/>
          </label>
          <label style={{display:"grid",gap:6,fontSize:11,color:C.muted}}>الحساب المصدر
            <select value={draft.from_account_id} onChange={e=>update("from_account_id",e.target.value)} style={{border:"1px solid "+C.line,borderRadius:9,padding:10,font:"inherit"}}>
              <option value="">اختر الحساب</option>{activeAccounts.map(a=><option key={a.id} value={a.id}>{a.name} · {a.currency}</option>)}
            </select>
          </label>
          {draft.type==="Transfer" ? <label style={{display:"grid",gap:6,fontSize:11,color:C.muted}}>الحساب المستلم
            <select value={draft.to_account_id} onChange={e=>update("to_account_id",e.target.value)} style={{border:"1px solid "+C.line,borderRadius:9,padding:10,font:"inherit"}}>
              <option value="">اختر الحساب</option>{activeAccounts.filter(a=>a.id!==draft.from_account_id).map(a=><option key={a.id} value={a.id}>{a.name} · {a.currency}</option>)}
            </select>
          </label> : <label style={{display:"grid",gap:6,fontSize:11,color:C.muted}}>التصنيف
            <select value={draft.category_id} onChange={e=>update("category_id",e.target.value)} disabled={splitMode} style={{border:"1px solid "+C.line,borderRadius:9,padding:10,font:"inherit",opacity:splitMode?.55:1}}>
              <option value="">اختر التصنيف</option>{categories.filter(c=>c.kind===draft.type||c.kind==="Both").map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>}
          <label style={{display:"grid",gap:6,fontSize:11,color:C.muted}}>التاجر / المستفيد
            <input value={draft.merchant} onChange={e=>update("merchant",e.target.value)} placeholder="اختياري" style={{border:"1px solid "+C.line,borderRadius:9,padding:10,font:"inherit"}}/>
          </label>
          <label style={{display:"grid",gap:6,fontSize:11,color:C.muted}}>الغرض
            <select value={draft.purpose} onChange={e=>update("purpose",e.target.value)} style={{border:"1px solid "+C.line,borderRadius:9,padding:10,font:"inherit"}}><option value="Regular">عادي</option><option value="Essential">أساسي</option><option value="Discretionary">اختياري</option></select>
          </label>
        </div>
        {draft.type!=="Transfer" && <div style={{marginTop:12,border:"1px solid "+C.line,borderRadius:12,padding:12}}>
          <label style={{display:"flex",alignItems:"center",gap:8,fontSize:11,fontWeight:800}}><input type="checkbox" checked={splitMode} onChange={e=>setSplitMode(e.target.checked)}/> تقسيم الحركة على أكثر من تصنيف</label>
          {splitMode && <div style={{display:"grid",gap:8,marginTop:10}}>
            {splitRows.map((row,i)=><div key={i} style={{display:"grid",gridTemplateColumns:"1fr 150px auto",gap:8}}>
              <select value={row.category_id} onChange={e=>setSplitRows(rows=>rows.map((r,j)=>j===i?{...r,category_id:e.target.value}:r))} style={{border:"1px solid "+C.line,borderRadius:9,padding:9,font:"inherit"}}><option value="">التصنيف</option>{categories.filter(c=>c.kind===draft.type||c.kind==="Both").map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
              <input type="number" min="0" step="0.01" value={row.amount} onChange={e=>setSplitRows(rows=>rows.map((r,j)=>j===i?{...r,amount:e.target.value}:r))} placeholder="المبلغ" style={{border:"1px solid "+C.line,borderRadius:9,padding:9,font:"inherit"}}/>
              <button type="button" onClick={()=>setSplitRows(rows=>rows.filter((_,j)=>j!==i))} disabled={splitRows.length<=2} style={{border:"1px solid "+C.line,background:C.surface,borderRadius:9,padding:"0 10px",cursor:splitRows.length<=2?"not-allowed":"pointer"}}>×</button>
            </div>)}
            <Button secondary onClick={()=>setSplitRows(rows=>[...rows,{category_id:"",amount:""}])}>＋ تصنيف آخر</Button>
          </div>}
        </div>}
        <div style={{marginTop:12,border:"1px solid "+C.line,borderRadius:12,padding:12}}>
          <div style={{fontSize:11,fontWeight:900,marginBottom:8}}>ربط السياق</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:10}}>
            <label style={{display:"grid",gap:6,fontSize:11,color:C.muted}}>السياق
              <select value={draft.context_type} onChange={e=>update("context_type",e.target.value)} style={{border:"1px solid "+C.line,borderRadius:9,padding:10,font:"inherit"}}><option value="">بدون سياق</option><option value="Family">الأسرة</option><option value="Project">المشروع</option></select>
            </label>
            {draft.context_type==="Family" && <label style={{display:"grid",gap:6,fontSize:11,color:C.muted}}>فرد الأسرة
              <select value={draft.context_family_member_id} onChange={e=>update("context_family_member_id",e.target.value)} style={{border:"1px solid "+C.line,borderRadius:9,padding:10,font:"inherit"}}><option value="">اختر فردًا</option>{contextFamilyMembers.map(m=><option key={m.id} value={m.id}>{m.display_name}</option>)}</select>
            </label>}
          </div>
        </div>
        <label style={{display:"grid",gap:6,fontSize:11,color:C.muted,marginTop:12}}>ملاحظات<textarea value={draft.notes} onChange={e=>update("notes",e.target.value)} rows={3} style={{border:"1px solid "+C.line,borderRadius:9,padding:10,font:"inherit",resize:"vertical"}}/></label>
        <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:16}}><Button secondary onClick={onClose}>إلغاء</Button><Button disabled={saving} onClick={onSave}>{saving?"جارٍ الحفظ…":"حفظ الحركة"}</Button></div>
      </div>
    </div>
  );
}

export default function FinanceRedesign({
  page = "dashboard",
  setPage,
  data,
  actions = {},
  legacyDebt = null,
  legacyAssets = null,
  legacyGoals = null,
  legacyRecurring = null,
  legacyProjects = null,
  legacyFamily = null,
  legacyFamilyCash = null,
  legacyReports = null,
  legacyCurrencies = null,
  isDemo = false,
}) {
  const [hideBalances, setHideBalances] = React.useState(false);
  // FinanceRedesign owns the internal navigation state as a fallback when the host shell
  // does not immediately reflect a nested Finance page change. The external page setter
  // is still called so OS Hub routing remains the source of truth when available.
  const [internalPage, setInternalPage] = React.useState(page);
  React.useEffect(() => { setInternalPage(page); }, [page]);
  const navigate = React.useCallback((id) => {
    setInternalPage(id);
    setPage?.(id);
  }, [setPage]);
  const activePage = internalPage || page || "dashboard";
  const [planningTab, setPlanningTab] = React.useState(activePage === "reports" || activePage === "networth" ? "reports" : activePage === "goals" ? "goals" : "budgets");
  const [wealthTab, setWealthTab] = React.useState(page === "assets" ? "investments" : page === "debts" ? "debts" : "overview");
  const [familyTab, setFamilyTab] = React.useState(page === "family-cash" ? "allocations" : "overview");
  const [txTab, setTxTab] = React.useState("all");
  const [txSearch, setTxSearch] = React.useState("");
  const [txAccountFilter, setTxAccountFilter] = React.useState("");
  const [txFromDate, setTxFromDate] = React.useState("");
  const [txToDate, setTxToDate] = React.useState("");
  const [performancePeriod, setPerformancePeriod] = React.useState("month");
  const [contextSearch, setContextSearch] = React.useState("");
  const [contextMemberFilter, setContextMemberFilter] = React.useState("");
  const [accountSearch,setAccountSearch]=React.useState("");
  const [accountTypeFilter,setAccountTypeFilter]=React.useState("all");
  const [categorySearch,setCategorySearch]=React.useState("");
  const [categoryKindFilter,setCategoryKindFilter]=React.useState("all");
  const [budgetSearch,setBudgetSearch]=React.useState("");
  const [budgetRiskFilter,setBudgetRiskFilter]=React.useState("all");
  const [txSubTab, setTxSubTab] = React.useState(page === "recurring" ? "recurring" : "ledger");
  const [showAddChooser, setShowAddChooser] = React.useState(false);
  const [showTransactionForm, setShowTransactionForm] = React.useState(false);
  const [transactionDraft, setTransactionDraft] = React.useState(() => ({ type:"Expense", purpose:"Regular", amount:"", currency:"EGP", local_date:new Date().toLocaleDateString("en-CA",{timeZone:"Africa/Cairo"}), from_account_id:"", to_account_id:"", category_id:"", goal_id:"", merchant:"", notes:"", context_type:"", context_project_id:"", context_family_member_id:"" }));
  const [transactionSplitMode, setTransactionSplitMode] = React.useState(false);
  const [transactionSplitRows, setTransactionSplitRows] = React.useState([{category_id:"",amount:""},{category_id:"",amount:""}]);
  const [showBudgetForm, setShowBudgetForm] = React.useState(false);
  const [budgetSaveError, setBudgetSaveError] = React.useState("");
  const [autoOpenAddType, setAutoOpenAddType] = React.useState("");
  const [budgetPeriod, setBudgetPeriod] = React.useState(new Date().toLocaleDateString("en-CA",{timeZone:"Africa/Cairo"}).slice(0,7));
  const [budgetDraft, setBudgetDraft] = React.useState({category_id:"",budget_amount:"",notes:""});
  const [selectedTransaction, setSelectedTransaction] = React.useState(null);
  React.useEffect(()=>{
    if(activePage==="debts")setWealthTab("debts");
    else if(activePage==="assets")setWealthTab("investments");
    else if(activePage==="reports"||activePage==="networth")setPlanningTab("reports");
    else if(activePage==="goals")setPlanningTab("goals");
    else if(activePage==="budgets")setPlanningTab("budgets");
    else if(activePage==="planning")setPlanningTab("budgets");
    else if(activePage==="recurring")setTxSubTab("recurring");
    else if(activePage==="transactions")setTxSubTab("ledger");
  },[page]);

  const {
    accounts = [], transactions = [], categories = [], balances = [], summary = null,
    netWorth = null, budgets = [], budgetInsights = null, goals = [],
    reconciliations = [], baseCurrency = "EGP", recurring = [], projects = [],
    family = [], assets = [], debts = [], reports = null, contextTags = [], netWorthSnapshots = [], recurringItems = [], contextFamilyMembers = [],
  } = data || {};

  const displayMoney = (v, c = baseCurrency) => hideBalances ? "••••••" : money(v, c);
  const posted = transactions.filter(t => t.status === "Posted");
  const income = Number(summary?.income ?? posted.filter(t => t.pnl_effect === "Income").reduce((s,t)=>s+Number(t.base_amount||t.amount||0),0));
  const expense = Number(summary?.expense ?? posted.filter(t => t.pnl_effect === "Expense").reduce((s,t)=>s+Number(t.base_amount||t.amount||0),0));
  const net = income - expense;
  const netValue = Number(netWorth?.net_worth ?? netWorth?.netWorth ?? 0);
  const month = new Date().toLocaleDateString("ar-EG",{month:"long"});
  const balanceTotal = balances.reduce((s,b)=>s+Number(b.base_value||0),0);

  function dashboard() {
    const budgetRows = (budgetInsights?.categories?.length ? budgetInsights.categories.filter(b=>b.budget_id||Number(b.spent||0)>0) : budgets.filter(b=>b.category_id)).slice(0,4);
    const todayKey = new Date().toLocaleDateString("en-CA",{timeZone:"Africa/Cairo"});
    const monthKey = todayKey.slice(0,7);
    const monthKeys = Array.from({length:12},(_,i)=>{const d=new Date(Date.UTC(Number(monthKey.slice(0,4)),Number(monthKey.slice(5,7))-1-(11-i),1));return d.toISOString().slice(0,7);});
    const monthlyFlows = monthKeys.map(key=>{
      const rows=posted.filter(t=>(t.local_date||"").slice(0,7)===key);
      return {key,income:rows.filter(t=>t.type==="Income").reduce((sum,t)=>sum+Number(t.base_amount||t.amount||0),0),expense:rows.filter(t=>t.type==="Expense").reduce((sum,t)=>sum+Number(t.base_amount||t.amount||0),0),count:rows.length};
    });
    const snapshotRows=[...netWorthSnapshots].sort((a,b)=>new Date(a.snapshot_at)-new Date(b.snapshot_at)).slice(-12);
    const snapshotValues=snapshotRows.map(x=>Number(x.value_base)).filter(Number.isFinite);
    const snapshotMin=snapshotValues.length?Math.min(...snapshotValues):0,snapshotMax=snapshotValues.length?Math.max(...snapshotValues):0,snapshotRange=Math.max(1,snapshotMax-snapshotMin);
    const periodStart=()=>{const now=new Date(todayKey+"T12:00:00");if(performancePeriod==="day")return todayKey;if(performancePeriod==="week"){const d=new Date(now);d.setDate(d.getDate()-6);return d.toLocaleDateString("en-CA",{timeZone:"Africa/Cairo"});}if(performancePeriod==="year")return todayKey.slice(0,4)+"-01-01";return todayKey.slice(0,7)+"-01";};
    const from=periodStart(),periodRows=posted.filter(t=>(t.local_date||"")>=from&&(t.local_date||"")<=todayKey);
    const periodIncome=periodRows.filter(t=>t.type==="Income").reduce((sum,t)=>sum+Number(t.base_amount||t.amount||0),0),periodExpense=periodRows.filter(t=>t.type==="Expense").reduce((sum,t)=>sum+Number(t.base_amount||t.amount||0),0);
    const upcoming=[...recurringItems].filter(r=>r.active!==false&&r.next_payment_date>=todayKey).sort((a,b)=>String(a.next_payment_date).localeCompare(String(b.next_payment_date))).slice(0,5);
    return <>
      <PageHead eyebrow="الماليات · نظرة عامة" title="لوحة القيادة" subtitle="مؤشرات حقيقية من دفتر الحركات والأرصدة المحفوظة، دون بيانات افتراضية." actions={<Button onClick={()=>setShowAddChooser(true)}>＋ إضافة</Button>} />
      <div className="finance-v2-grid">
        <Stat label="صافي الثروة" value={netWorth?.net_worth==null?"غير متاح":displayMoney(netValue)} note="القيمة الحالية المحسوبة" tone="positive" />
        <Stat label={"الدخل · "+month} value={displayMoney(income)} note="من الحركات المنشورة" tone="positive" />
        <Stat label={"المصروف · "+month} value={displayMoney(expense)} note="بدون التحويلات" tone="negative" />
        <Stat label="صافي التدفق · هذا الشهر" value={displayMoney(net)} note="الدخل ناقص المصروف المسجل" />
      </div>
      <div className="finance-v2-two" style={{marginTop:12}}>
        <Card>
          <div style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"center",marginBottom:14}}>
            <div><h2 style={{margin:0,fontSize:15}}>صافي الثروة · سجل اللقطات</h2><div style={{color:C.muted,fontSize:10,marginTop:4}}>اللقطات المحفوظة فقط؛ لا يتم توليد تاريخ تقديري</div></div>
            <Button secondary onClick={()=>setPage("networth")}>فتح الثروة ←</Button>
          </div>
          {snapshotRows.length?<div style={{height:170,display:"flex",alignItems:"flex-end",gap:7,padding:"12px 4px",borderBottom:"1px solid "+C.line}}>
            {snapshotRows.map((point,i)=>{const value=Number(point.value_base),height=12+((value-snapshotMin)/snapshotRange)*78;return <div key={point.id||point.snapshot_at} title={new Date(point.snapshot_at).toLocaleDateString("ar-EG")+": "+displayMoney(value,point.base_currency||baseCurrency)} style={{flex:1,minWidth:5,height:height+"%",background:i===snapshotRows.length-1?C.green:"#D7E5DC",borderRadius:"6px 6px 0 0"}}/>;})}
          </div>:<div style={{padding:24,textAlign:"center",color:C.muted,fontSize:12}}>لا توجد لقطات محفوظة بعد. احفظ أول لقطة من صفحة صافي الثروة لبدء الرسم البياني.</div>}
          <div style={{display:"flex",justifyContent:"space-between",marginTop:10,fontSize:10,color:C.muted,flexWrap:"wrap",gap:8}}><span>الأصول {netWorth?.assets_total==null?"غير متاح":displayMoney(netWorth.assets_total)}</span><span>الديون {netWorth?.payables_total==null?"غير متاح":displayMoney(netWorth.payables_total)}</span><span>السيولة {displayMoney(balanceTotal)}</span></div>
        </Card>
        <Card>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <div><h2 style={{margin:0,fontSize:15}}>أخطر الميزانيات</h2><div style={{color:C.muted,fontSize:10,marginTop:4}}>حسب الإنفاق الفعلي مقارنة بالمحدد</div></div>
            <Button secondary onClick={()=>setPage("budgets")}>التخطيط ←</Button>
          </div>
          {budgetRows.length ? budgetRows.map((b,i)=>{
            const planned=Number(b.budget_amount||b.planned||0),spent=Number(b.spent||b.actual||0),over=planned>0&&spent>planned,ratio=planned>0?spent/planned:0;
            return <div key={b.id||i} style={{padding:"10px 0",borderTop:i?"1px solid "+C.line:"0"}}>
              <div style={{display:"flex",justifyContent:"space-between",gap:8,fontSize:11,fontWeight:800}}><span>{b.category_name||b.category?.name||"فئة"}</span><span>{displayMoney(spent)} / {displayMoney(planned)}</span></div>
              {planned>0?<div style={{marginTop:7}}><Progress value={spent} max={planned} tone={over?"red":"green"}/></div>:<div style={{fontSize:10,color:C.muted,marginTop:6}}>لم يتم تحديد حد لهذه الميزانية</div>}
              <div style={{marginTop:5}}><Pill tone={over?"negative":ratio>=.8?"warning":planned>0?"positive":"neutral"}>{over?"تجاوز ✕":ratio>=.8?"قريب من الحد ▲":planned>0?"ضمن الحد ●":"بلا حد محدد"}</Pill></div>
            </div>
          }) : <div style={{padding:20,color:C.muted,fontSize:12}}>لا توجد ميزانيات فعلية للفترة الحالية.</div>}
        </Card>
      </div>
      <div className="finance-v2-two" style={{marginTop:12}}>
        <Card>
          <div style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"center",marginBottom:12,flexWrap:"wrap"}}>
            <h2 style={{margin:0,fontSize:15}}>أداء الفترة</h2>
            <Segmented items={[["day","يوم"],["week","7 أيام"],["month","شهر"],["year","سنة"]]} value={performancePeriod} onChange={setPerformancePeriod}/>
          </div>
          <div className="finance-v2-grid" style={{gridTemplateColumns:"repeat(2,minmax(0,1fr))"}}>
            <Stat label="الدخل المسجل" value={displayMoney(periodIncome)} note={"من "+periodRows.length+" حركة منشورة"} tone="positive"/>
            <Stat label="المصروف المسجل" value={displayMoney(periodExpense)} note={"صافي التدفق "+displayMoney(periodIncome-periodExpense)} tone="negative"/>
          </div>
          <div style={{marginTop:14}}>
            <div style={{fontSize:11,fontWeight:800,marginBottom:8}}>الدخل والمصروف · آخر 12 شهرًا</div>
            {monthlyFlows.some(x=>x.count>0)?<div style={{height:112,display:"flex",alignItems:"flex-end",gap:5,borderBottom:"1px solid "+C.line,padding:"8px 2px"}}>
              {monthlyFlows.map(point=>{const max=Math.max(1,...monthlyFlows.flatMap(x=>[x.income,x.expense]));return <div key={point.key} title={point.key+" · دخل "+displayMoney(point.income)+" · مصروف "+displayMoney(point.expense)} style={{flex:1,display:"flex",alignItems:"flex-end",justifyContent:"center",gap:2,height:"100%"}}><div style={{width:"45%",height:Math.max(point.income?4:0,point.income/max*100)+"%",background:C.green,borderRadius:"4px 4px 0 0"}}/><div style={{width:"45%",height:Math.max(point.expense?4:0,point.expense/max*100)+"%",background:"#D7A59D",borderRadius:"4px 4px 0 0"}}/></div>;})}
            </div>:<div style={{padding:16,textAlign:"center",color:C.muted,fontSize:11}}>لا توجد حركات منشورة ضمن البيانات المحمّلة لعرض الرسم.</div>}
            <div style={{display:"flex",gap:14,marginTop:7,fontSize:10,color:C.muted}}><span>● الدخل</span><span style={{color:"#B42318"}}>● المصروف</span><span>المصدر: آخر 150 حركة محمّلة</span></div>
          </div>
        </Card>
        <Card>
          <h2 style={{margin:"0 0 12px",fontSize:15}}>المدفوعات القادمة</h2>
          {upcoming.length?upcoming.map(r=><div key={r.id} style={{display:"flex",justifyContent:"space-between",gap:10,padding:"11px 0",borderTop:"1px solid "+C.line,fontSize:11}}><div><b>{r.name||"دفعة متكررة"}</b><div style={{color:C.muted,marginTop:3}}>{r.next_payment_date} · {r.frequency||"—"}</div></div><b style={{color:r.type==="Income"?C.green:C.ink,whiteSpace:"nowrap"}}>{r.type==="Income"?"+":"−"}{displayMoney(r.amount,r.currency||baseCurrency)}</b></div>):<div style={{padding:24,textAlign:"center",color:C.muted,fontSize:12}}>لا توجد مدفوعات أو إيرادات متكررة قادمة مسجلة.</div>}
          <div style={{display:"flex",justifyContent:"flex-end",marginTop:10}}><Button secondary onClick={()=>setPage("recurring")}>فتح المتكرر ←</Button></div>
        </Card>
      </div>
      <Card style={{marginTop:12}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}><div><h2 style={{margin:0,fontSize:15}}>آخر الحركات</h2><div style={{color:C.muted,fontSize:10,marginTop:4}}>نفس مصدر الحقيقة الذي يظهر في دفتر الحركات</div></div><Button secondary onClick={()=>setPage("transactions")}>فتح الحركات ←</Button></div>
        <Table columns={[["date","التاريخ"],["name","الحركة"],["category","التصنيف"],["account","الحساب"],["amount","المبلغ"],["status","الحالة"]]} rows={posted.slice(0,7).map(t=>({id:t.id,raw:t,date:t.local_date,name:t.merchant||t.name||"حركة",category:categories.find(c=>c.id===t.category_id)?.name||"—",account:accounts.find(a=>a.id===t.from_account_id)?.name||accounts.find(a=>a.id===t.to_account_id)?.name||"—",amount:displayMoney(t.amount,t.currency),status:<Pill tone={t.status==="Posted"?"positive":"warning"}>{t.status==="Posted"?"تمت المراجعة":"تحتاج مراجعة"}</Pill>}))} onRowClick={setSelectedTransaction}/>
      </Card>
    </>;
  }
  
function transactionsPage() {
    const rows = transactions.filter(t=>
      (txTab==="all" || (txTab==="expense"&&t.type==="Expense") || (txTab==="income"&&t.type==="Income") || (txTab==="review"&&t.status!=="Posted")) &&
      (!txAccountFilter||t.from_account_id===txAccountFilter||t.to_account_id===txAccountFilter) &&
      (!txFromDate||(t.local_date||"")>=txFromDate) && (!txToDate||(t.local_date||"")<=txToDate) &&
      (!txSearch||[t.name,t.merchant,t.notes].filter(Boolean).join(" ").toLowerCase().includes(txSearch.trim().toLowerCase()))
    );
    const counts=[{label:"مصروف",value:rows.filter(t=>t.type==="Expense").length},{label:"دخل",value:rows.filter(t=>t.type==="Income").length},{label:"تحويل",value:rows.filter(t=>t.type==="Transfer").length}].filter(x=>x.value>0);
    return <>
      <PageHead eyebrow="الماليات · الحركات" title="الحركات والمدفوعات" subtitle="الحركات اليومية والمتكررة والاشتراكات في مساحة واحدة، مع نفس دفتر الحسابات." actions={<Button onClick={actions.onAdd}>＋ إضافة حركة</Button>} />
      <Segmented items={[["ledger","الحركات"],["recurring","المتكرر والاشتراكات"]]} value={txSubTab} onChange={setTxSubTab}/>
      {txSubTab === "recurring" ? (legacyRecurring ? React.cloneElement(legacyRecurring,{openCreate:autoOpenAddType==="recurring",onCreateHandled:()=>setAutoOpenAddType(""),onRequestAdd:()=>setAutoOpenAddType("recurring")}) : <Card style={{marginTop:12}}>قسم المتكرر غير متصل حاليًا.</Card>) : <>
        <Card style={{marginTop:12}}>
          <div style={{display:"flex",gap:8,alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",marginBottom:14}}>
            <Segmented items={[["all","الكل"],["expense","مصروف"],["income","دخل"],["review","تحتاج مراجعة"]]} value={txTab} onChange={setTxTab}/>
            <Pill>{rows.length} حركة</Pill>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(155px,1fr))",gap:8,marginBottom:12}}>
            <input value={txSearch} onChange={e=>setTxSearch(e.target.value)} placeholder="ابحث في الحركة أو المستفيد" style={{border:"1px solid "+C.line,borderRadius:9,padding:"9px 10px",font:"inherit",minWidth:0}}/>
            <select value={txAccountFilter} onChange={e=>setTxAccountFilter(e.target.value)} style={{border:"1px solid "+C.line,borderRadius:9,padding:"9px 10px",font:"inherit"}}><option value="">كل الحسابات</option>{accounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select>
            <input aria-label="من تاريخ" type="date" value={txFromDate} onChange={e=>setTxFromDate(e.target.value)} style={{border:"1px solid "+C.line,borderRadius:9,padding:"9px 10px",font:"inherit"}}/>
            <input aria-label="إلى تاريخ" type="date" value={txToDate} onChange={e=>setTxToDate(e.target.value)} style={{border:"1px solid "+C.line,borderRadius:9,padding:"9px 10px",font:"inherit"}}/>
            <Button secondary onClick={()=>{setTxSearch("");setTxAccountFilter("");setTxFromDate("");setTxToDate("");setTxTab("all");}}>مسح الفلاتر</Button>
          </div>
          <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:14,flexWrap:"wrap"}}>
            {counts.map(x=><div key={x.label} style={{flex:1,minWidth:90,background:C.bg,borderRadius:10,padding:10}}><div style={{fontSize:10,color:C.muted}}>{x.label}</div><b style={{fontSize:18}}>{x.value}</b></div>)}
          </div>
          <Table columns={[["date","التاريخ"],["name","الحركة"],["category","التصنيف"],["account","الحساب"],["amount","المبلغ"],["status","الحالة"]]} rows={rows.map(t=>({id:t.id,raw:t,date:t.local_date,name:t.merchant||t.name||"حركة",category:categories.find(c=>c.id===t.category_id)?.name||"—",account:accounts.find(a=>a.id===t.from_account_id)?.name||accounts.find(a=>a.id===t.to_account_id)?.name||"—",amount:<b style={{color:t.type==="Income"?C.green:t.type==="Expense"?C.ink:C.muted}}>{displayMoney(t.amount,t.currency)}</b>,status:<Pill tone={t.status==="Posted"?"positive":"warning"}>{t.status==="Posted"?"تمت المراجعة":"تحتاج مراجعة"}</Pill>}))} onRowClick={setSelectedTransaction}/>
          <div style={{display:"flex",justifyContent:"flex-end",gap:16,paddingTop:12,fontSize:11,fontWeight:800}}><span>مصروف {displayMoney(rows.filter(t=>t.type==="Expense").reduce((sum,t)=>sum+Number(t.base_amount||t.amount||0),0))}</span><span>دخل {displayMoney(rows.filter(t=>t.type==="Income").reduce((sum,t)=>sum+Number(t.base_amount||t.amount||0),0))}</span></div>
        </Card>
      </>}
    </>;
  }

  function settingsPage() {
    const settingsItems = [
      ["الحسابات والأصول","إضافة وتعديل الحسابات والأصول والرصيد الافتتاحي","accounts"],
      ["التصنيفات","إدارة التصنيفات وقواعد الربط المحاسبي","categories"],
      ["العملات وأسعار الصرف","العملة الأساسية والأسعار التلقائية","fx"],
      ["وسوم السياق","ربط الحركات بأفراد الأسرة ومتابعة إنفاقهم","context-tags"],
    ];
    return <>
      <PageHead eyebrow="الماليات · الإعدادات" title="الإعدادات المالية" subtitle="إعداد نادر الاستخدام؛ كل شيء هنا يغيّر طريقة عمل الدفتر، وليس تسجيل حركة يومية." />
      <div className="finance-v2-three" style={{marginTop:12}}>
        {settingsItems.map(([title,desc,target])=><Card key={target} style={{cursor:"default"}}>
          <div style={{fontSize:14,fontWeight:900}}>{title}</div>
          <div style={{marginTop:7,color:C.muted,fontSize:11,lineHeight:1.7}}>{desc}</div>
          <div style={{marginTop:12}}>
            <Button secondary type="button" onClick={(e)=>{e.preventDefault();e.stopPropagation();navigate(target);}}>
              فتح الإعداد ←
            </Button>
          </div>
        </Card>)}
      </div>
      <Card style={{marginTop:12}}>
        <h2 style={{margin:"0 0 10px",fontSize:15}}>صلاحيات الماليات</h2>
        <div style={{display:"grid",gap:9}}>
          <div style={{display:"flex",justifyContent:"space-between",padding:"11px 0",borderTop:"1px solid "+C.line,fontSize:11}}><span><b>أنا · Owner</b><div style={{color:C.muted,marginTop:3}}>صلاحية كاملة على الدفتر</div></span><Pill tone="positive">كاملة</Pill></div>
          <div style={{display:"flex",justifyContent:"space-between",padding:"11px 0",borderTop:"1px solid "+C.line,fontSize:11}}><span><b>أفراد الأسرة</b><div style={{color:C.muted,marginTop:3}}>كل فرد بحسابه وبياناته وفق الصلاحية</div></span><Pill>حسب الصلاحية</Pill></div>
          <div style={{display:"flex",justifyContent:"space-between",padding:"11px 0",borderTop:"1px solid "+C.line,fontSize:11}}><span><b>المحاسبين</b><div style={{color:C.muted,marginTop:3}}>تُمنح الصلاحيات لكل Book / Action بشكل صريح</div></span><Pill tone="warning">مقيدة</Pill></div>
        </div>
      </Card>
    </>;
  }

  function categoriesPage() {
    const filteredCategories=categories.filter(c=>(categoryKindFilter==="all"||c.kind===categoryKindFilter)&&(!categorySearch||c.name.toLowerCase().includes(categorySearch.trim().toLowerCase())));
    const chartRows=[{label:"مصروف",value:categories.filter(c=>c.kind==="Expense").length},{label:"دخل",value:categories.filter(c=>c.kind==="Income").length},{label:"مشترك",value:categories.filter(c=>c.kind==="Both").length}].filter(x=>x.value>0);
    return <>
      <PageHead eyebrow="الماليات · الإعدادات" title="التصنيفات" subtitle="تصنيفات الحركة تُستخدم يوميًا من Quick Add، وهنا تتم إدارتها نادرًا." actions={<Button onClick={actions.onAddCategory}>＋ تصنيف</Button>} />
      <FinanceChart title="توزيع التصنيفات حسب النوع" rows={chartRows} empty="لا توجد تصنيفات لعرض الرسم بعد."/>
      <Card style={{marginTop:12}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:8,marginBottom:12}}><input value={categorySearch} onChange={e=>setCategorySearch(e.target.value)} placeholder="ابحث باسم التصنيف" style={{border:"1px solid "+C.line,borderRadius:9,padding:9,font:"inherit"}}/><select value={categoryKindFilter} onChange={e=>setCategoryKindFilter(e.target.value)} style={{border:"1px solid "+C.line,borderRadius:9,padding:9,font:"inherit"}}><option value="all">كل الأنواع</option><option value="Expense">مصروف</option><option value="Income">دخل</option><option value="Both">مشترك</option></select></div>
        <Table columns={[["name","التصنيف"],["kind","النوع"],["parent","الرئيسي"],["status","الحالة"],["action",""]]} rows={filteredCategories.map(c=>({id:c.id,name:c.name,kind:c.kind==="Expense"?"مصروف":c.kind==="Income"?"دخل":"مشترك",parent:c.parent_id?(categories.find(p=>p.id===c.parent_id)?.name||"—"):"—",status:<Pill tone={c.archived?"neutral":"positive"}>{c.archived?"مؤرشف":"نشط"}</Pill>,action:<div style={{display:"flex",gap:6}}><Button secondary onClick={()=>actions.onEditCategory?.(c)}>تعديل</Button><Button secondary onClick={()=>actions.onToggleCategory?.(c)}>{c.archived?"إعادة تفعيل":"أرشفة"}</Button></div>}))}/>
      </Card>
    </>;
  }

  function currenciesPage() {
    return <>
      <PageHead eyebrow="الماليات · الإعدادات" title="العملات وأسعار الصرف" subtitle="العملة الأساسية والأسعار المستخدمة عند تجميع الأرصدة والتقارير." />
      <div className="finance-v2-grid">
        <Stat label="العملة الأساسية" value={baseCurrency} note="عملة التقارير والملخصات" />
        <Stat label="العملات المتاحة" value={String((data?.currencies||[]).length)} note="المصدر الحالي من Finance" />
        <Stat label="تحديث الأسعار" value="تلقائي" note="حسب مصدر أسعار الصرف المتاح" />
        <Stat label="تأثير التحويل" value="محاسبي" note="لا يغيّر أصل الحركة" />
      </div>
      <Card style={{marginTop:12}}>
        <Table columns={[["currency","العملة"],["name","الاسم"],["rate","سعر الصرف"],["status","الحالة"]]} rows={(data?.currencies||[]).map((c,i)=>({id:c.currency||i,currency:c.currency,name:c.display_name||c.name||"—",rate:c.rate==null?"—":String(c.rate),status:<Pill tone="positive">متاحة</Pill>}))}/>
      </Card>
    </>;
  }

  function recurringPage() {
    return <>
      <PageHead eyebrow="الماليات · الإعدادات" title="المتكرر والاشتراكات" subtitle="إعداد الحركات المتكررة من مكان واحد؛ التسجيل اليومي يظل داخل الحركات." actions={<Button onClick={()=>setShowAddChooser(true)}>＋ إضافة</Button>} />
      <Card style={{marginTop:12}}>
        <div className="finance-v2-three">
          <Stat label="المتكرر" value={String((data?.recurring||[]).length)} note="عناصر محمّلة حاليًا" />
          <Stat label="الاشتراكات" value={String((data?.recurring||[]).filter(r=>r.subscription).length)} note="بحسب بيانات السجل" />
          <Stat label="الحالة" value="مراجعة" note="لا يتم إنشاء حركة دون قواعد الدفتر" />
        </div>
        <div style={{marginTop:12}}>
          <Table columns={[["name","العنصر"],["amount","المبلغ"],["frequency","التكرار"],["next","القادم"],["status","الحالة"]]} rows={(data?.recurring||[]).map((r,i)=>({id:r.id||i,name:r.name||r.merchant||"متكرر",amount:displayMoney(r.amount||0,r.currency),frequency:r.frequency||r.cadence||"—",next:r.next_date||r.next_run_at||"—",status:<Pill tone={r.active===false?"neutral":"positive"}>{r.active===false?"متوقف":"نشط"}</Pill>}))}/>
        </div>
      </Card>
    </>;
  }

  function contextTagsPage() {
    const familyTags=contextTags.filter(tag=>tag.context_type==="Family"&&tag.family_member_id);
    const filtered=familyTags.filter(tag=>{
      const tx=transactions.find(t=>t.id===tag.transaction_id);
      const haystack=[tx?.merchant,tx?.name,tag.transaction_name,tag.local_date,tag.family_member_name,tag.family_member_nickname].filter(Boolean).join(" ").toLowerCase();
      return (!contextMemberFilter||tag.family_member_id===contextMemberFilter)&&(!contextSearch||haystack.includes(contextSearch.trim().toLowerCase()));
    });
    const memberTotals=contextFamilyMembers.map(member=>({member,count:familyTags.filter(tag=>tag.family_member_id===member.id).length})).filter(x=>x.count>0);
    const maxTotal=Math.max(1,...memberTotals.map(x=>x.count));
    return <>
      <PageHead eyebrow="الماليات · الأسرة" title="سياق حركات الأسرة" subtitle="اربط المصروفات المنشورة بأفراد الأسرة من خلال توزيع المصروفات، وتابع السجل من نفس دفتر Finance." actions={<Button onClick={()=>navigate("family")}>إدارة الأسرة ←</Button>} />
      <Card style={{marginTop:12}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,flexWrap:"wrap",marginBottom:12}}><h2 style={{margin:0,fontSize:15}}>إنفاق الأسرة حسب الفرد</h2><Pill>{String(familyTags.length)} حركة مرتبطة</Pill></div>
        {memberTotals.length?<div style={{display:"grid",gap:10}}>{memberTotals.map(({member,total,count})=><div key={member.id}><div style={{display:"flex",justifyContent:"space-between",fontSize:11,gap:10}}><b>{member.display_name}</b><span>{count} حركة</span></div><div style={{height:8,background:"#ECEEEA",borderRadius:99,overflow:"hidden",marginTop:6}}><div style={{height:"100%",width:(count/maxTotal*100)+"%",background:C.green,borderRadius:99}}/></div></div>)}</div>:<div style={{padding:18,textAlign:"center",color:C.muted,fontSize:12}}>لا توجد حركات أسرة مرتبطة بعد. أضف أفراد الأسرة أولًا، ثم اربط الحركة بالفرد عند تسجيلها.</div>}
      </Card>
      <Card style={{marginTop:12}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,flexWrap:"wrap",marginBottom:12}}><h2 style={{margin:0,fontSize:15}}>الحركات المرتبطة بأفراد الأسرة</h2><Pill>{String(filtered.length)} نتيجة</Pill></div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:8,marginBottom:12}}>
          <input value={contextSearch} onChange={e=>setContextSearch(e.target.value)} placeholder="ابحث باسم الحركة أو الفرد" style={{border:"1px solid "+C.line,borderRadius:9,padding:"9px 10px",font:"inherit",minWidth:0}}/>
          <select value={contextMemberFilter} onChange={e=>setContextMemberFilter(e.target.value)} style={{border:"1px solid "+C.line,borderRadius:9,padding:"9px 10px",font:"inherit"}}><option value="">كل أفراد الأسرة</option>{contextFamilyMembers.map(m=><option key={m.id} value={m.id}>{m.display_name}</option>)}</select>
        </div>
        <Table columns={[["date","التاريخ"],["transaction","الحركة"],["member","فرد الأسرة"],["amount","المبلغ"],["type","النوع"]]} rows={filtered.map((tag,i)=>{const tx=transactions.find(t=>t.id===tag.transaction_id)||tag;return{id:tag.transaction_id||i,date:tx?.local_date||"—",transaction:tx?.merchant||tx?.name||tag.transaction_name||"حركة مالية",member:tag.family_member_name||contextFamilyMembers.find(m=>m.id===tag.family_member_id)?.display_name||"—",amount:tx?.amount!=null?displayMoney(tx.amount,tx.currency):displayMoney(tag.amount,tag.currency),type:"مصروف",raw:tx};})} empty="لا توجد حركات مرتبطة بأفراد الأسرة بهذه الفلاتر"/>
        <div style={{marginTop:10,color:C.muted,fontSize:11,lineHeight:1.8}}>إدارة الأفراد والميزانيات والمخصصات والتقارير من قسم الأسرة. لا يوجد وسم شخصي منفصل، وربط المشاريع سيُضاف عند اكتمال Projects OS.</div>
      </Card>
    </>;
  }

  function accountsPage() {
    const filteredAccounts=accounts.filter(a=>(accountTypeFilter==="all"||a.account_type===accountTypeFilter)&&(!accountSearch||a.name.toLowerCase().includes(accountSearch.trim().toLowerCase())));
    const chartRows=[...new Set(accounts.map(a=>a.account_type||"Other"))].map(type=>({label:({Bank:"بنك",Cash:"نقدي","Mobile Wallet":"محفظة موبايل","Credit Card":"بطاقة ائتمان","E-Wallet":"محفظة إلكترونية",Investment:"استثمار",Savings:"ادخار",Other:"أخرى"})[type]||type,value:accounts.filter(a=>a.account_type===type).length})).filter(x=>x.value>0);
    return <>
      <PageHead eyebrow="الماليات · الحسابات" title="الحسابات" subtitle="كل حساب مالي مستقل، مع رصيد وتسوية واضحة." actions={<Button onClick={actions.onAddAccount}>＋ حساب</Button>} />
      <div className="finance-v2-grid">
        <Stat label="النقد والحسابات" value={displayMoney(balanceTotal)} note="الرصيد المجمع" />
        <Stat label="التزامات البطاقات" value={displayMoney(accounts.filter(a=>a.account_type==="Credit Card").reduce((sum,a)=>sum+Math.min(0,Number(a.balance||0)),0))} note="داخل الحد الائتماني" tone="negative" />
        <Stat label="المتاح بعد الالتزامات" value={displayMoney(balanceTotal)} note="القيمة الحالية" />
        <Stat label="تحتاج تسوية" value={String(accounts.filter(a=>a.needs_reconciliation).length)} note="حسابات بفروق غير مسواة" />
      </div>
      <FinanceChart title="عدد الحسابات حسب النوع" rows={chartRows} empty="لا توجد حسابات لعرض الرسم بعد."/>
      <Card style={{marginTop:12}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:8,marginBottom:12}}><input value={accountSearch} onChange={e=>setAccountSearch(e.target.value)} placeholder="ابحث باسم الحساب" style={{border:"1px solid "+C.line,borderRadius:9,padding:9,font:"inherit"}}/><select value={accountTypeFilter} onChange={e=>setAccountTypeFilter(e.target.value)} style={{border:"1px solid "+C.line,borderRadius:9,padding:9,font:"inherit"}}><option value="all">كل أنواع الحسابات</option>{[...new Set(accounts.map(a=>a.account_type).filter(Boolean))].map(type=><option key={type} value={type}>{type}</option>)}</select></div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}><h2 style={{margin:0,fontSize:15}}>كل الحسابات</h2><Pill tone="positive">أرصدة مشتقة من الدفتر</Pill></div>
        <Table columns={[["name","الحساب"],["type","النوع"],["balance","الرصيد"],["recon","التسوية"],["action",""]]} rows={filteredAccounts.map(a=>({id:a.id,name:a.name,type:a.account_type||"—",balance:displayMoney(a.balance,a.currency),recon:a.needs_reconciliation?<Pill tone="warning">تحتاج تسوية</Pill>:<Pill tone="positive">متطابق</Pill>,action:<Button secondary onClick={()=>actions.onOpenAccount?.(a)}>فتح</Button>}))}/>
      </Card>
    </>;
  }

  function budgetsPage() {
    const rows=(budgetInsights?.categories?.length?budgetInsights.categories.filter(b=>b.budget_id||Number(b.spent||0)>0):budgets.filter(b=>b.category_id));
    const filteredRows=rows.filter(b=>(!budgetSearch||(b.category_name||"").toLowerCase().includes(budgetSearch.trim().toLowerCase()))&&(budgetRiskFilter==="all"||(budgetRiskFilter==="unbudgeted"&&!b.budget_id)||(budgetRiskFilter==="over"&&b.budget_id&&Number(b.spent||0)>Number(b.budget_amount||0))||(budgetRiskFilter==="near"&&b.budget_id&&Number(b.spent||0)<=Number(b.budget_amount||0)&&Number(b.spent||0)/Math.max(1,Number(b.budget_amount||0))>=.8)));
    const planned=rows.reduce((sum,b)=>sum+Number(b.budget_amount||0),0),spent=rows.reduce((sum,b)=>sum+Number(b.spent||0),0);
    const now=new Date(),daysInMonth=new Date(now.getFullYear(),now.getMonth()+1,0).getDate(),monthPace=Math.round(now.getDate()/daysInMonth*100);
    const chartRows=rows.filter(b=>b.budget_id&&Number(b.budget_amount)>0).map(b=>({label:b.category_name||"فئة",value:Math.max(0,Math.min(100,Number(b.spent||0)/Number(b.budget_amount)*100))}));
    return <>
      <div className="finance-v2-grid">
        <Stat label="المتبقي للتخصيص" value={displayMoney(Math.max(0,planned-spent))} note="بعد المصروف المسجل" tone="positive"/>
        <Stat label="وتيرة الشهر" value={monthPace+"%"} note={"اليوم "+now.getDate()+" من "+daysInMonth}/>
        <Stat label="فئات تحتاج انتباهًا" value={String(rows.filter(b=>b.budget_id&&Number(b.spent||0)>Number(b.budget_amount||0)).length)} note="تجاوزات أو اقتراب من الحد"/>
        <Stat label="المصروف" value={displayMoney(spent)} note={"من "+displayMoney(planned)} tone="negative"/>
      </div>
      <FinanceChart title="نسبة استهلاك الميزانية حسب الفئة" rows={chartRows} valueLabel={v=>v.toFixed(0)+"%"} empty="لا توجد ميزانيات محددة لعرض الرسم بعد."/>
      <Card style={{marginTop:12}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}><h2 style={{margin:0,fontSize:15}}>الفئات</h2><Pill>وضع التحرير</Pill></div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:8,marginBottom:12}}><input value={budgetSearch} onChange={e=>setBudgetSearch(e.target.value)} placeholder="ابحث باسم الفئة" style={{border:"1px solid "+C.line,borderRadius:9,padding:9,font:"inherit"}}/><select value={budgetRiskFilter} onChange={e=>setBudgetRiskFilter(e.target.value)} style={{border:"1px solid "+C.line,borderRadius:9,padding:9,font:"inherit"}}><option value="all">كل الحالات</option><option value="over">متجاوزة الحد</option><option value="near">قريبة من الحد</option><option value="unbudgeted">إنفاق بلا ميزانية</option></select></div>
        <Table columns={[["name","الفئة"],["planned","المحدد"],["spent","المصروف"],["remaining","المتبقي"],["progress","التقدم"],["status","الحالة"]]} rows={filteredRows.map((b,i)=>{const amount=Number(b.budget_amount||0),actual=Number(b.spent||0),remaining=amount-actual,over=amount>0&&remaining<0;return{id:b.budget_id||i,name:b.category_name||"فئة",planned:b.budget_id?displayMoney(amount):"غير محدد",spent:displayMoney(actual),remaining:b.budget_id?displayMoney(remaining):"—",progress:<div style={{minWidth:130}}>{amount>0?<Progress value={actual} max={amount} tone={over?"red":"green"}/>:"—"}</div>,status:<Pill tone={over?"negative":amount>0&&actual/amount>.8?"warning":amount>0?"positive":"neutral"}>{over?"تجاوز ✕":amount>0&&actual/amount>.8?"قريب من الحد ▲":amount>0?"ضمن الحد ●":"إنفاق بلا ميزانية"}</Pill>}})}/>
      </Card>
    </>;
  }

  function wealthPage() {
    const tab = wealthTab;
    return <>
      <PageHead eyebrow="الماليات · الثروة" title="الثروة" subtitle="الأصول والاستثمارات والديون وصافي الثروة في مسار واحد." />
      <Segmented items={[["overview","نظرة عامة"],["investments","الاستثمارات"],["debts","الديون"]]} value={tab} onChange={setWealthTab}/>
      {tab==="overview" && <><div className="finance-v2-grid" style={{marginTop:12}}><Stat label="صافي الثروة" value={netWorth?.net_worth==null?"غير متاح":displayMoney(netValue)} tone="positive"/><Stat label="الأصول" value={netWorth?.assets_total==null?"غير متاح":displayMoney(netWorth.assets_total)}/><Stat label="الديون" value={netWorth?.payables_total==null?"غير متاح":displayMoney(netWorth.payables_total)} tone="negative"/><Stat label="السيولة" value={displayMoney(balanceTotal)} /></div><FinanceChart title="مكونات الثروة الحالية" rows={[{label:"الأصول",value:Number(netWorth?.assets_total||0)},{label:"الديون",value:Number(netWorth?.payables_total||0)},{label:"السيولة",value:balanceTotal}].filter(x=>x.value>0)} empty="لا توجد قيم مالية متاحة لعرض الرسم."/><Card style={{marginTop:12}}><div style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"center"}}><div><h2 style={{margin:0,fontSize:15}}>صافي الثروة</h2><div style={{color:C.muted,fontSize:10,marginTop:4}}>القيمة الحالية وسجل اللقطات المحفوظة في نفس قسم الثروة.</div></div><Pill tone="positive">{netWorth?.net_worth==null?"غير متاح":displayMoney(netValue)}</Pill></div><FinanceChart title="تغير صافي الثروة عبر اللقطات" rows={netWorthSnapshots.slice(-12).map(x=>({id:x.id,label:new Date(x.snapshot_at).toLocaleDateString("ar-EG",{month:"short",year:"2-digit"}),value:Number(x.value_base)}))} valueLabel={v=>displayMoney(v)} empty="لا توجد لقطات محفوظة لعرض الرسم بعد."/></Card></>}
      {tab==="investments" && (legacyAssets ? React.cloneElement(legacyAssets,{openCreate:autoOpenAddType==="asset",onCreateHandled:()=>setAutoOpenAddType(""),onRequestAdd:()=>setAutoOpenAddType("asset")}) : <Card style={{marginTop:12}}><h2 style={{marginTop:0,fontSize:15}}>المراكز</h2><Table columns={[["name","المركز"],["type","النوع"],["qty","الكمية"],["value","القيمة"],["return","العائد"]]} rows={assets.map((a,i)=>({id:a.id||i,name:a.name||a.asset_name||"أصل",type:a.asset_type||"استثمار",qty:a.quantity||"—",value:displayMoney(a.current_value||a.value||0,a.currency),return:a.return_pct==null?"غير متاح":<Pill tone="positive">+{a.return_pct}%</Pill>}))}/></Card>)}
      {tab==="debts" && (legacyDebt ? React.cloneElement(legacyDebt,{openCreate:autoOpenAddType==="debt",onCreateHandled:()=>setAutoOpenAddType(""),onRequestAdd:()=>setAutoOpenAddType("debt")}) : <Card style={{marginTop:12}}><h2 style={{marginTop:0,fontSize:15}}>الديون والأقساط</h2><Table columns={[["name","الدين"],["balance","الرصيد"],["installment","القسط"],["due","الاستحقاق"],["status","الحالة"]]} rows={debts.map((d,i)=>({id:d.id||i,name:d.name||"دين",balance:displayMoney(d.remaining_balance||d.balance||0,d.currency),installment:displayMoney(d.installment_amount||0,d.currency),due:d.next_due_date||"—",status:<Pill tone="warning">قائم</Pill>}))}/></Card>)}
      
    </>;
  }

  function planningPage() {
    const title = planningTab === "budgets" ? "الميزانيات" : planningTab === "goals" ? "الأهداف المالية" : "التقارير";
    const subtitle = planningTab === "budgets" ? "راقب حدود الإنفاق والمصروف الفعلي من نفس مصدر الحركات." : planningTab === "goals" ? "اربط الادخار والتقدم المالي بأهدافك دون إنشاء دفتر منفصل." : "تقارير الماليات تُقرأ من نفس الحركات والأرصدة، ولا تنشئ مصدر حقيقة آخر.";
    return <>
      <PageHead
        eyebrow="الماليات · التخطيط"
        title={title}
        subtitle={subtitle}
        actions={planningTab === "budgets"
          ? <><Button secondary onClick={actions.onRollover}>نسخ من الشهر السابق</Button><Button onClick={()=>{setBudgetSaveError("");setShowBudgetForm(true);}}>＋ إضافة ميزانية</Button></>
          : planningTab === "reports"
            ? <Button secondary onClick={actions.onExport}>تصدير</Button>
             : <Button onClick={()=>setAutoOpenAddType("goal")}>＋ إضافة هدف</Button>}
      />
      <Segmented items={[["budgets","الميزانيات"],["goals","الأهداف"],["reports","التقارير"]]} value={planningTab} onChange={value=>{setPlanningTab(value);if(value==="budgets")navigate("budgets");else if(value==="goals")navigate("goals");else navigate("reports");}}/>
      {planningTab==="budgets" && budgetsPage()}
      {planningTab==="goals" && (legacyGoals ? React.cloneElement(legacyGoals,{openCreate:autoOpenAddType==="goal",onCreateHandled:()=>setAutoOpenAddType(""),onRequestAdd:()=>setAutoOpenAddType("goal")}) : <Card style={{marginTop:12}}>
        <h2 style={{marginTop:0,fontSize:15}}>الأهداف المالية</h2>
        <Table columns={[["name","الهدف"],["type","النوع"],["progress","التقدم"],["target","المستهدف"],["status","الحالة"]]} rows={goals.map((g,i)=>({id:g.id||i,name:g.name,type:g.goal_type||"ادخار",progress:<div style={{minWidth:130}}><Progress value={g.current_amount||g.progress||0} max={g.target_amount||g.target||1}/></div>,target:displayMoney(g.target_amount||g.target||0,g.currency||baseCurrency),status:<Pill tone="positive">في المسار</Pill>}))}/>
      </Card>)}
      {planningTab==="reports" && <div style={{display:"grid",gap:14}}>
        {legacyReports || <Card style={{marginTop:12}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div><h2 style={{margin:0,fontSize:15}}>مركز التقارير</h2><div style={{color:C.muted,fontSize:10,marginTop:4}}>دخل مقابل مصروف · الأداء · التنوع · الدخل المستقبلي</div></div>
            <Pill tone="positive">من نفس دفتر الحركات</Pill>
          </div>
          <div className="finance-v2-three" style={{marginTop:14}}>
            <Stat label="الدخل" value={displayMoney(income)} tone="positive"/>
            <Stat label="المصروف" value={displayMoney(expense)} tone="negative"/>
            <Stat label="صافي التدفق" value={displayMoney(net)} tone={net>=0?"positive":"negative"}/>
          </div>
        </Card>}
      </div>}
    </>;
  }

  function familyPage() {
    return <>
      <PageHead eyebrow="الماليات · الأسرة والتقارير" title="الأسرة" subtitle="المخصصات والإنفاق والحسابات المنفصلة لكل فرد، مع خصوصية واضحة." actions={<Button onClick={actions.onAddFamily}>＋ فرد</Button>} />
      <Segmented items={[["overview","نظرة عامة"],["people","الأفراد"],["allocations","الميزانيات والمخصصات"],["reports","التقارير"]]} value={familyTab} onChange={setFamilyTab}/>
      {familyTab==="overview" && <><div className="finance-v2-grid" style={{marginTop:12}}><Stat label={"إنفاق الأسرة · "+month} value={displayMoney(family.total_spend||0)} note={"من "+displayMoney(family.total_budget||0)}/><Stat label="مخصصات مستحقة" value={String(family.due_allocations||0)} /><Stat label="عهد مفتوحة" value={String(family.open_custodies||0)} /><Stat label="تحتاج توزيعًا" value={String(family.needs_distribution||0)} /></div><Card style={{marginTop:12}}><h2 style={{marginTop:0,fontSize:15}}>الأفراد</h2><Table columns={[["name","الفرد"],["budget","الميزانية"],["spent","المصروف"],["status","الحالة"]]} rows={(family.members||[]).map((m,i)=>({id:m.id||i,name:m.name||"فرد",budget:displayMoney(m.budget||0),spent:displayMoney(m.spent||0),status:<Pill tone={Number(m.spent||0)>Number(m.budget||0)?"negative":"positive"}>{Number(m.spent||0)>Number(m.budget||0)?"تجاوز":"ضمن الحد"}</Pill>}))}/></Card></>}
      {familyTab==="people" && <Card style={{marginTop:12}}><h2 style={{marginTop:0,fontSize:15}}>أفراد الأسرة</h2><Table columns={[["name","الاسم"],["relation","الصلة"],["budget","إنفاق نوفمبر"],["allocation","المخصص"],["action",""]]} rows={(family.members||[]).map((m,i)=>({id:m.id||i,name:m.name||"—",relation:m.relation||"—",budget:displayMoney(m.spent||0)+" من "+displayMoney(m.budget||0),allocation:m.allocation||"لا يوجد",action:<Button secondary onClick={()=>actions.onOpenFamily?.(m)}>فتح</Button>}))}/></Card>}
      {familyTab==="allocations" && <Card style={{marginTop:12}}><h2 style={{marginTop:0,fontSize:15}}>المخصصات</h2><Table columns={[["member","الفرد"],["amount","المبلغ"],["cadence","الدورية"],["next","القادم"],["status","الحالة"]]} rows={(family.allocations||[]).map((a,i)=>({id:a.id||i,member:a.member_name||"—",amount:displayMoney(a.amount||0,a.currency),cadence:a.cadence||"شهري",next:a.next_date||"—",status:<Pill tone="positive">مؤكد</Pill>}))}/></Card>}
      {familyTab==="reports" && <Card style={{marginTop:12}}><h2 style={{marginTop:0,fontSize:15}}>تقارير الأسرة</h2><div className="finance-v2-three"><Stat label="إجمالي الإنفاق" value={displayMoney(family.total_spend||0)}/><Stat label="الميزانية" value={displayMoney(family.total_budget||0)}/><Stat label="المتبقي" value={displayMoney((family.total_budget||0)-(family.total_spend||0))} tone="positive"/></div></Card>}
    </>;
  }

  function fallback() {
    return <Card><PageHead eyebrow="الماليات" title="هذه الصفحة جزء من النسخة الجديدة" subtitle="تم توحيد تجربة الماليات حول التبويبات الجديدة. استخدم التنقل العلوي للوصول إلى القسم المطلوب."/><Button onClick={()=>setPage("dashboard")}>العودة للنظرة العامة</Button></Card>;
  }

  const pageNode = activePage==="dashboard" ? dashboard()
    : activePage==="transactions" || activePage==="inbox" || activePage==="recurring" ? transactionsPage()
    : activePage==="projects" ? (legacyProjects || fallback())
    : activePage==="planning" || activePage==="budgets" || activePage==="goals" || activePage==="reports" ? planningPage()
    : activePage==="settings" ? settingsPage()
    : activePage==="accounts" ? accountsPage()
    : activePage==="categories" ? categoriesPage()
    : activePage==="fx" || activePage==="currencies" ? (legacyCurrencies || currenciesPage())
    : activePage==="context-tags" ? contextTagsPage()
    : activePage==="wealth" || activePage==="assets" || activePage==="debts" ? wealthPage()
    : ["family","family-cash"].includes(activePage) ? <><Segmented items={[["family","مركز الأسرة"],["family-cash","العُهد ومصروفات الأفراد"]]} value={activePage} onChange={value=>navigate(value)}/>{activePage==="family"?(legacyFamily||fallback()):(legacyFamilyCash||fallback())}</>
    : activePage==="projects" ? (legacyProjects || fallback())
    : fallback();

  return (
    <Shell
      page={activePage}
      setPage={navigate}
      onAdd={()=>setShowAddChooser(true)}
      onRefresh={actions.onRefresh}
      hideBalances={hideBalances}
      setHideBalances={setHideBalances}
      isDemo={isDemo}
    >
      {pageNode}
      <div role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setShowBudgetForm(false);}} style={{position:"fixed",inset:0,zIndex:1300,background:"rgba(20,37,29,.72)",display:showBudgetForm?"grid":"none",placeItems:"center",padding:16}}><div role="dialog" aria-modal="true" aria-label="إضافة ميزانية" style={{background:C.surface,width:"min(620px,100%)",maxHeight:"calc(100vh - 32px)",overflowY:"auto",borderRadius:18,padding:20,boxShadow:"0 18px 60px rgba(0,0,0,.18)"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}><h2 style={{margin:0,fontSize:17}}>إعداد ميزانية الفترة</h2><button type="button" onClick={()=>setShowBudgetForm(false)} style={{border:0,background:"transparent",fontSize:24,cursor:"pointer"}}>×</button></div>
        {budgetSaveError&&<div role="alert" style={{background:C.redSoft,color:C.red,padding:10,borderRadius:9,fontSize:11,marginBottom:10}}>{budgetSaveError}</div>}<form onSubmit={async e=>{e.preventDefault();setBudgetSaveError("");const result=await actions.onSaveBudget?.({period:budgetPeriod,category_id:budgetDraft.category_id,budget_amount:budgetDraft.budget_amount,notes:budgetDraft.notes});if(result?.ok){setShowBudgetForm(false);setBudgetDraft({category_id:"",budget_amount:"",notes:""});}else setBudgetSaveError(result?.error||"تعذّر حفظ الميزانية.");}} style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:10,alignItems:"end"}}>
          <label style={{display:"grid",gap:6,fontSize:11,color:C.muted}}>الشهر<input type="month" value={budgetPeriod} onChange={e=>setBudgetPeriod(e.target.value)} style={{border:"1px solid "+C.line,borderRadius:9,padding:10,font:"inherit",minWidth:0}}/></label>
          <label style={{display:"grid",gap:6,fontSize:11,color:C.muted}}>التصنيف<select required value={budgetDraft.category_id} onChange={e=>setBudgetDraft(v=>({...v,category_id:e.target.value}))} style={{border:"1px solid "+C.line,borderRadius:9,padding:10,font:"inherit",minWidth:0}}><option value="">اختر فئة المصروف</option>{categories.filter(c=>c.kind==="Expense"||c.kind==="Both").map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
          <label style={{display:"grid",gap:6,fontSize:11,color:C.muted}}>الحد المالي<input required type="number" min="0" step="0.01" value={budgetDraft.budget_amount} onChange={e=>setBudgetDraft(v=>({...v,budget_amount:e.target.value}))} placeholder="0.00" style={{border:"1px solid "+C.line,borderRadius:9,padding:10,font:"inherit",minWidth:0}}/></label>
          <label style={{display:"grid",gap:6,fontSize:11,color:C.muted}}>ملاحظات<input value={budgetDraft.notes} onChange={e=>setBudgetDraft(v=>({...v,notes:e.target.value}))} style={{border:"1px solid "+C.line,borderRadius:9,padding:10,font:"inherit",minWidth:0}}/></label>
          <div><Button disabled={!budgetDraft.category_id||budgetDraft.budget_amount===""}>＋ حفظ الميزانية</Button></div>
        </form></div></div>
      {showAddChooser && <div role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setShowAddChooser(false);}} style={{position:"fixed",inset:0,zIndex:1200,background:"rgba(20,37,29,.68)",display:"grid",placeItems:"center",padding:16}}>
        <div role="dialog" aria-modal="true" aria-label="اختيار نوع الإضافة" style={{background:C.surface,width:"min(560px,100%)",borderRadius:18,padding:20,boxShadow:"0 18px 60px rgba(0,0,0,.18)"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10}}><div><div style={{fontSize:10,color:C.green,fontWeight:900}}>إضافة جديدة</div><h2 style={{margin:"5px 0 0",fontSize:19}}>ما نوع العملية التي تريد إضافتها؟</h2></div><button type="button" onClick={()=>setShowAddChooser(false)} style={{border:0,background:"transparent",fontSize:24,cursor:"pointer",color:C.muted}}>×</button></div>
          <div className="finance-v2-three" style={{marginTop:16}}>
            {[
              ["transaction","حركة مالية","دخل أو مصروف أو تحويل"],
              ["debt","دين / قسط","دين جديد أو التزام"],
              ["budget","ميزانية","حد إنفاق لفئة وفترة"],
              ["asset","أصل","أصل أو استثمار جديد"],
              ["recurring","متكرر / اشتراك","دفعة دورية وتنبيهاتها"]
            ].map(([kind,label,desc])=><button key={kind} type="button" onClick={()=>{setShowAddChooser(false);if(kind==="transaction"){setTransactionDraft({ type:"Expense", purpose:"Regular", amount:"", currency:baseCurrency, local_date:new Date().toLocaleDateString("en-CA",{timeZone:"Africa/Cairo"}), from_account_id:"", to_account_id:"", category_id:"", goal_id:"", merchant:"", notes:"", context_type:"", context_project_id:"", context_family_member_id:"" });setTransactionSplitMode(false);setTransactionSplitRows([{category_id:"",amount:""},{category_id:"",amount:""}]);setShowTransactionForm(true);return;}setAutoOpenAddType(kind);if(kind==="budget"){setPlanningTab("budgets");setBudgetSaveError("");setShowBudgetForm(true);return;}if(kind==="recurring"){setTxSubTab("recurring");return;}}} style={{textAlign:"right",border:"1px solid "+C.line,background:C.surface,borderRadius:13,padding:14,cursor:"pointer",fontFamily:"inherit",minHeight:92}}>
              <div style={{fontSize:13,fontWeight:900,color:C.ink}}>{label}</div><div style={{fontSize:10,color:C.muted,lineHeight:1.7,marginTop:6}}>{desc}</div>
            </button>)}
          </div>
        </div>
      </div>}
      {autoOpenAddType==="debt" && activePage!=="debts" && legacyDebt ? React.cloneElement(legacyDebt,{openCreate:true,onCreateHandled:()=>setAutoOpenAddType(""),onRequestAdd:()=>setAutoOpenAddType("debt")}) : null}
      {autoOpenAddType==="asset" && activePage!=="assets" && legacyAssets ? React.cloneElement(legacyAssets,{openCreate:true,onCreateHandled:()=>setAutoOpenAddType(""),onRequestAdd:()=>setAutoOpenAddType("asset")}) : null}
      {autoOpenAddType==="recurring" && activePage!=="recurring" && legacyRecurring ? React.cloneElement(legacyRecurring,{openCreate:true,onCreateHandled:()=>setAutoOpenAddType(""),onRequestAdd:()=>setAutoOpenAddType("recurring")}) : null}
      <TransactionCreateModal open={showTransactionForm} draft={transactionDraft} setDraft={setTransactionDraft} splitMode={transactionSplitMode} setSplitMode={setTransactionSplitMode} splitRows={transactionSplitRows} setSplitRows={setTransactionSplitRows} accounts={accounts} categories={categories} goals={goals} contextFamilyMembers={contextFamilyMembers} baseCurrency={baseCurrency} saving={actions.transactionSaving} error={data?.error||""} onSave={async()=>{const result=await actions.onSaveTransaction?.(transactionDraft,transactionSplitMode,transactionSplitRows);if(result?.ok){setShowTransactionForm(false);setTransactionDraft({ type:"Expense", purpose:"Regular", amount:"", currency:baseCurrency, local_date:new Date().toLocaleDateString("en-CA",{timeZone:"Africa/Cairo"}), from_account_id:"", to_account_id:"", category_id:"", goal_id:"", merchant:"", notes:"", context_type:"", context_project_id:"", context_family_member_id:"" });setTransactionSplitMode(false);setTransactionSplitRows([{category_id:"",amount:""},{category_id:"",amount:""}]);}}} onClose={()=>setShowTransactionForm(false)} />
      <TransactionSheet transaction={selectedTransaction} categories={categories} accounts={accounts} baseCurrency={baseCurrency} contextTags={contextTags} contextFamilyMembers={data?.contextFamilyMembers||[]} onSaveContext={actions.onSaveContext} onClose={() => setSelectedTransaction(null)} />
    </Shell>
  );
}
