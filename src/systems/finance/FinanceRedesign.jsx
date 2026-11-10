import React from "react";

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
    ["planning", "التخطيط"],
    ["settings", "الإعدادات المالية"],
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
            <div style={{fontSize:15,marginBottom:2}}>{id==="dashboard"?"⌂":id==="transactions"?"≡":id==="planning"?"◫":"⚙"}</div>
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}

function TransactionSheet({ transaction, categories, accounts, baseCurrency, onClose }) {
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
        <div style={{display:"flex",justifyContent:"flex-end",marginTop:16}}><Button secondary onClick={onClose}>إغلاق</Button></div>
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
  const [planningTab, setPlanningTab] = React.useState(page === "reports" ? "reports" : page === "goals" ? "goals" : "budgets");
  const [wealthTab, setWealthTab] = React.useState(page === "assets" ? "investments" : page === "debts" ? "debts" : "overview");
  const [familyTab, setFamilyTab] = React.useState(page === "family-cash" ? "allocations" : "overview");
  const [txTab, setTxTab] = React.useState("all");
  const [selectedTransaction, setSelectedTransaction] = React.useState(null);

  const {
    accounts = [], transactions = [], categories = [], balances = [], summary = null,
    netWorth = null, budgets = [], budgetInsights = null, goals = [],
    reconciliations = [], baseCurrency = "EGP", recurring = [], projects = [],
    family = [], assets = [], debts = [], reports = null,
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
    const budgetRows = (budgetInsights?.categories || budgets.filter(b=>b.category_id)).slice(0,4);
    return <>
      <PageHead eyebrow="الماليات · نظرة عامة" title="لوحة القيادة" subtitle="صورة واحدة لما يحدث في أموالك الآن، بدون فتح كل قسم على حدة." actions={<Button onClick={actions.onAdd}>＋ حركة</Button>} />
      <div className="finance-v2-grid">
        <Stat label="صافي الثروة" value={displayMoney(netValue)} note="هذا الشهر · افتح الثروة" tone="positive" />
        <Stat label={"الدخل · " + month} value={displayMoney(income)} note="من الحركات المنشورة" tone="positive" />
        <Stat label={"المصروف · " + month} value={displayMoney(expense)} note="بدون التحويلات" tone="negative" />
        <Stat label="المتاح للصرف" value={displayMoney(net)} note="حصة اليوم تُحسب من الخطة" />
      </div>

      <div className="finance-v2-two" style={{marginTop:12}}>
        <Card>
          <div style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"center",marginBottom:14}}>
            <div><h2 style={{margin:0,fontSize:15}}>صافي الثروة · 12 شهرًا</h2><div style={{color:C.muted,fontSize:10,marginTop:4}}>أصول − ديون · آخر قيمة مسجلة</div></div>
            <Button secondary onClick={()=>setPage("networth")}>فتح الثروة ←</Button>
          </div>
          <div style={{height:170,display:"flex",alignItems:"flex-end",gap:7,padding:"12px 4px",borderBottom:"1px solid "+C.line}}>
            {[42,48,45,53,58,62,59,70,73,78,82,92].map((h,i)=><div key={i} style={{flex:1,height:h+"%",background:i===11?C.green:"#D7E5DC",borderRadius:"6px 6px 0 0"}} />)}
          </div>
          <div style={{display:"flex",justifyContent:"space-between",marginTop:10,fontSize:10,color:C.muted}}><span>أصول {displayMoney(netWorth?.assets||balanceTotal)}</span><span>ديون {displayMoney(netWorth?.liabilities||0)}</span><span>السيولة {displayMoney(balanceTotal)}</span></div>
        </Card>

        <Card>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <div><h2 style={{margin:0,fontSize:15}}>أخطر الميزانيات</h2><div style={{color:C.muted,fontSize:10,marginTop:4}}>الخط الأخضر = وضعك الحالي</div></div>
            <Button secondary onClick={()=>setPage("budgets")}>التخطيط ←</Button>
          </div>
          {budgetRows.length ? budgetRows.map((b,i)=>{
            const planned=Number(b.budget_amount||b.planned||0); const spent=Number(b.spent||b.actual||0); const over=spent>planned;
            return <div key={b.id||i} style={{padding:"10px 0",borderTop:i?"1px solid "+C.line:"0"}}>
              <div style={{display:"flex",justifyContent:"space-between",gap:8,fontSize:11,fontWeight:800}}><span>{b.category_name||b.category?.name||"فئة"}</span><span>{displayMoney(spent)} / {displayMoney(planned)}</span></div>
              <div style={{marginTop:7}}><Progress value={spent} max={planned} tone={over?"red":"green"}/></div>
              <div style={{marginTop:5}}><Pill tone={over?"negative":spent/planned>.8?"warning":"positive"}>{over?"تجاوز ✕":spent/planned>.8?"قريب من الحد ▲":"ضمن الحد ●"}</Pill></div>
            </div>
          }) : <div style={{padding:20,color:C.muted,fontSize:12}}>لا توجد ميزانيات متاحة للفترة الحالية.</div>}
        </Card>
      </div>

      <div className="finance-v2-two" style={{marginTop:12}}>
        <Card>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <h2 style={{margin:0,fontSize:15}}>أداء الفترة</h2>
            <Segmented items={[["day","يوم"],["week","أسبوع"],["month","شهر"],["year","سنة"]]} value="month" onChange={()=>{}}/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Stat label="تغيّر صافي الثروة" value="+35,000" note="السوق 62% · الادخار 25% · سداد الدين 13%" tone="positive"/>
            <Stat label="العائد الكلي للاستثمارات" value="+1.1%" note="رأس مال +0.7 · توزيعات +0.3 · عملة +0.1" tone="positive"/>
          </div>
        </Card>
        <Card>
          <h2 style={{margin:"0 0 12px",fontSize:15}}>المدفوعات القادمة</h2>
          {[["قسط السيارة","−6,500","10 نوفمبر"],["فاتورة الكهرباء","−850","15 نوفمبر"],["الراتب","+42,000","28 نوفمبر"]].map(([name,amount,date])=><div key={name} style={{display:"flex",justifyContent:"space-between",padding:"11px 0",borderTop:"1px solid "+C.line,fontSize:11}}><div><b>{name}</b><div style={{color:C.muted,marginTop:3}}>{date}</div></div><b style={{color:amount.startsWith("+")?C.green:C.ink}}>{hideBalances?"••••":amount}</b></div>)}
        </Card>
      </div>

      <Card style={{marginTop:12}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}><div><h2 style={{margin:0,fontSize:15}}>آخر الحركات</h2><div style={{color:C.muted,fontSize:10,marginTop:4}}>نفس مصدر الحقيقة الذي يظهر في دفتر الحركات</div></div><Button secondary onClick={()=>setPage("transactions")}>فتح الحركات ←</Button></div>
        <Table columns={[["date","التاريخ"],["name","الحركة"],["category","التصنيف"],["account","الحساب"],["amount","المبلغ"],["status","الحالة"]]} rows={posted.slice(0,7).map(t=>({id:t.id,raw:t,date:t.local_date,name:t.merchant||t.name||"حركة",category:categories.find(c=>c.id===t.category_id)?.name||"—",account:accounts.find(a=>a.id===t.from_account_id)?.name||"—",amount:displayMoney(t.amount,t.currency),status:<Pill tone={t.status==="Posted"?"positive":"warning"}>{t.status==="Posted"?"تمت المراجعة":"تحتاج مراجعة"}</Pill>}))} onRowClick={setSelectedTransaction}/>
      </Card>
    </>;
  }

  function transactionsPage() {
    const rows = transactions.filter(t=>txTab==="all" || (txTab==="expense"&&t.type==="Expense") || (txTab==="income"&&t.type==="Income") || (txTab==="review"&&t.status!=="Posted"));
    return <>
      <PageHead eyebrow="الماليات · الحركات" title="دفتر الحركات" subtitle="تسجيل يومي سريع، ثم مراجعة وتدقيق من نفس الشاشة." actions={<Button onClick={actions.onAdd}>＋ حركة</Button>} />
      <Card>
        <div style={{display:"flex",gap:8,alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",marginBottom:14}}>
          <Segmented items={[["all","الكل"],["expense","مصروف"],["income","دخل"],["review","تحتاج مراجعة"]]} value={txTab} onChange={setTxTab}/>
          <div style={{display:"flex",gap:6}}><Pill>هذا الشهر</Pill><Pill>بلا تحويلات</Pill><Pill>بإيصال · 3</Pill></div>
        </div>
        <Table columns={[["date","التاريخ"],["name","الحركة"],["category","التصنيف"],["account","الحساب"],["amount","المبلغ"],["status","الحالة"]]} rows={rows.map(t=>({id:t.id,raw:t,date:t.local_date,name:t.merchant||t.name||"حركة",category:categories.find(c=>c.id===t.category_id)?.name||"—",account:accounts.find(a=>a.id===t.from_account_id)?.name||accounts.find(a=>a.id===t.to_account_id)?.name||"—",amount:<b style={{color:t.type==="Income"?C.green:t.type==="Expense"?C.ink:C.muted}}>{displayMoney(t.amount,t.currency)}</b>,status:<Pill tone={t.status==="Posted"?"positive":"warning"}>{t.status==="Posted"?"تمت المراجعة":"تحتاج مراجعة"}</Pill>}))} onRowClick={setSelectedTransaction}/>
        <div style={{display:"flex",justifyContent:"flex-end",gap:16,paddingTop:12,fontSize:11,fontWeight:800}}><span>مصروف {displayMoney(rows.filter(t=>t.type==="Expense").reduce((s,t)=>s+Number(t.amount||0),0))}</span><span>دخل {displayMoney(rows.filter(t=>t.type==="Income").reduce((s,t)=>s+Number(t.amount||0),0))}</span></div>
      </Card>
    </>;
  }

  function settingsPage() {
    const settingsItems = [
      ["الحسابات والأصول","إضافة وتعديل الحسابات والأصول والرصيد الافتتاحي","accounts"],
      ["التصنيفات","إدارة التصنيفات وقواعد الربط المحاسبي","categories"],
      ["العملات وأسعار الصرف","العملة الأساسية والأسعار التلقائية","currencies"],
      ["المتكرر والاشتراكات","الحركات المتكررة والاشتراكات والتنبيهات","recurring"],
      ["وسوم السياق","وسوم شخصي / مشروع / أسرة وربطها بالحركة","context-tags"],
    ];
    return <>
      <PageHead eyebrow="الماليات · الإعدادات" title="الإعدادات المالية" subtitle="إعداد نادر الاستخدام؛ كل شيء هنا يغيّر طريقة عمل الدفتر، وليس تسجيل حركة يومية." />
      <div className="finance-v2-three" style={{marginTop:12}}>
        {settingsItems.map(([title,desc,target])=><Card key={target} style={{cursor:"pointer"}} onClick={()=>setPage(target)}>
          <div style={{fontSize:14,fontWeight:900}}>{title}</div>
          <div style={{marginTop:7,color:C.muted,fontSize:11,lineHeight:1.7}}>{desc}</div>
          <div style={{marginTop:12,color:C.green,fontSize:11,fontWeight:900}}>فتح الإعداد ←</div>
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
    return <>
      <PageHead eyebrow="الماليات · الإعدادات" title="التصنيفات" subtitle="تصنيفات الحركة تُستخدم يوميًا من Quick Add، وهنا تتم إدارتها نادرًا." actions={<Button onClick={actions.onAddCategory}>＋ تصنيف</Button>} />
      <Card style={{marginTop:12}}>
        <Table columns={[["name","التصنيف"],["kind","النوع"],["parent","الرئيسي"],["status","الحالة"],["action",""]]} rows={categories.map(c=>({id:c.id,name:c.name,kind:c.kind==="Expense"?"مصروف":c.kind==="Income"?"دخل":"مشترك",parent:c.parent_id?(categories.find(p=>p.id===c.parent_id)?.name||"—"):"—",status:<Pill tone={c.archived?"neutral":"positive"}>{c.archived?"مؤرشف":"نشط"}</Pill>,action:<div style={{display:"flex",gap:6}}><Button secondary onClick={()=>actions.onEditCategory?.(c)}>تعديل</Button><Button secondary onClick={()=>actions.onToggleCategory?.(c)}>{c.archived?"إعادة تفعيل":"أرشفة"}</Button></div>}))}/>
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
      <PageHead eyebrow="الماليات · الإعدادات" title="المتكرر والاشتراكات" subtitle="إعداد الحركات المتكررة من مكان واحد؛ التسجيل اليومي يظل داخل الحركات." actions={<Button onClick={actions.onAdd}>＋ حركة</Button>} />
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
    return <>
      <PageHead eyebrow="الماليات · الإعدادات" title="وسوم السياق" subtitle="وسم واحد يوضح سياق الحركة: شخصي، مشروع، أو أسرة، بدل إنشاء أنظمة منفصلة." />
      <Card style={{marginTop:12}}>
        <div className="finance-v2-three">
          {[["شخصي","الحركات الشخصية اليومية"],["مشروع","حركة مرتبطة بمشروع مالي"],["أسرة","حركة مرتبطة بالأسرة أو أحد أفرادها"]].map(([name,desc])=><div key={name} style={{border:"1px solid "+C.line,borderRadius:14,padding:15}}><Pill tone="positive">{name}</Pill><div style={{fontSize:11,color:C.muted,lineHeight:1.8,marginTop:8}}>{desc}</div></div>)}
        </div>
        <div style={{marginTop:14,padding:12,borderRadius:12,background:C.bg,color:C.muted,fontSize:11,lineHeight:1.8}}>السياق ليس دفترًا جديدًا؛ هو فلتر وربط على نفس الحركات ومصدر الحقيقة المالي.</div>
      </Card>
    </>;
  }

  function accountsPage() {
    return <>
      <PageHead eyebrow="الماليات · الحسابات" title="الحسابات" subtitle="كل حساب مالي مستقل، مع رصيد وتسوية واضحة." actions={<Button onClick={actions.onAddAccount}>＋ حساب</Button>} />
      <div className="finance-v2-grid">
        <Stat label="النقد والحسابات" value={displayMoney(balanceTotal)} note="الرصيد المجمع" />
        <Stat label="التزامات البطاقات" value={displayMoney(accounts.filter(a=>a.account_type==="Credit Card").reduce((s,a)=>s+Math.min(0,Number(a.balance||0)),0))} note="داخل الحد الائتماني" tone="negative" />
        <Stat label="المتاح بعد الالتزامات" value={displayMoney(balanceTotal)} note="القيمة الحالية" />
        <Stat label="تحتاج تسوية" value={String(accounts.filter(a=>a.needs_reconciliation).length||0)} note="حسابات بفروق غير مسواة" />
      </div>
      <Card style={{marginTop:12}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}><h2 style={{margin:0,fontSize:15}}>كل الحسابات</h2><Pill tone="positive">أرصدة مشتقة من الدفتر</Pill></div>
        <Table columns={[["name","الحساب"],["type","النوع"],["balance","الرصيد"],["recon","التسوية"],["action",""]]} rows={accounts.map(a=>({id:a.id,name:a.name,type:a.account_type||"—",balance:displayMoney(a.balance,a.currency),recon:a.needs_reconciliation?<Pill tone="warning">تحتاج تسوية</Pill>:<Pill tone="positive">متطابق</Pill>,action:<Button secondary onClick={()=>actions.onOpenAccount?.(a)}>فتح</Button>}))}/>
      </Card>
    </>;
  }

  function budgetsPage() {
    const rows=(budgetInsights?.categories||budgets.filter(b=>b.category_id));
    const planned=rows.reduce((s,b)=>s+Number(b.budget_amount||0),0);
    const spent=rows.reduce((s,b)=>s+Number(b.spent||0),0);
    return <>
      <div className="finance-v2-grid">
        <Stat label="المتبقي للتخصيص" value={displayMoney(Math.max(0,planned-spent))} note="بعد المصروف المسجل" tone="positive"/>
        <Stat label="وتيرة الشهر" value="23%" note="اليوم 7 من 30"/>
        <Stat label="فئات تحتاج انتباهًا" value={String(rows.filter(b=>Number(b.spent||0)>Number(b.budget_amount||0)).length)} note="تجاوزات أو اقتراب من الحد"/>
        <Stat label="المصروف" value={displayMoney(spent)} note={"من "+displayMoney(planned)} tone="negative"/>
      </div>
      <Card style={{marginTop:12}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}><h2 style={{margin:0,fontSize:15}}>الفئات</h2><Pill>وضع التحرير</Pill></div>
        <Table columns={[["name","الفئة"],["planned","المحدد"],["spent","المصروف"],["remaining","المتبقي"],["progress","التقدم"],["status","الحالة"]]} rows={rows.map((b,i)=>{const planned=Number(b.budget_amount||0),spent=Number(b.spent||0),remaining=planned-spent,over=remaining<0;return{id:b.id||i,name:b.category_name||"فئة",planned:displayMoney(planned),spent:displayMoney(spent),remaining:displayMoney(remaining),progress:<div style={{minWidth:130}}><Progress value={spent} max={planned} tone={over?"red":"green"}/></div>,status:<Pill tone={over?"negative":spent/planned>.8?"warning":"positive"}>{over?"تجاوز ✕":spent/planned>.8?"قريب من الحد ▲":"ضمن الحد ●"}</Pill>}})}/>
      </Card>
    </>;
  }

  function wealthPage() {
    const tab = wealthTab;
    return <>
      <PageHead eyebrow="الماليات · الثروة" title="الثروة" subtitle="الأصول والاستثمارات والديون وصافي الثروة في مسار واحد." />
      <Segmented items={[["overview","نظرة عامة"],["investments","الاستثمارات"],["debts","الديون"],["networth","صافي الثروة"]]} value={tab} onChange={setWealthTab}/>
      {tab==="overview" && <div className="finance-v2-grid" style={{marginTop:12}}><Stat label="صافي الثروة" value={displayMoney(netValue)} tone="positive"/><Stat label="الأصول" value={displayMoney(netWorth?.assets||0)}/><Stat label="الديون" value={displayMoney(netWorth?.liabilities||0)} tone="negative"/><Stat label="السيولة" value={displayMoney(balanceTotal)} /></div>}
      {tab==="investments" && (legacyAssets || <Card style={{marginTop:12}}><h2 style={{marginTop:0,fontSize:15}}>المراكز</h2><Table columns={[["name","المركز"],["type","النوع"],["qty","الكمية"],["value","القيمة"],["return","العائد"]]} rows={assets.map((a,i)=>({id:a.id||i,name:a.name||a.asset_name||"أصل",type:a.asset_type||"استثمار",qty:a.quantity||"—",value:displayMoney(a.current_value||a.value||0,a.currency),return:<Pill tone="positive">+{a.return_pct||"—"}%</Pill>}))}/></Card>)}
      {tab==="debts" && (legacyDebt || <Card style={{marginTop:12}}><h2 style={{marginTop:0,fontSize:15}}>الديون والأقساط</h2><Table columns={[["name","الدين"],["balance","الرصيد"],["installment","القسط"],["due","الاستحقاق"],["status","الحالة"]]} rows={debts.map((d,i)=>({id:d.id||i,name:d.name||"دين",balance:displayMoney(d.remaining_balance||d.balance||0,d.currency),installment:displayMoney(d.installment_amount||0,d.currency),due:d.next_due_date||"—",status:<Pill tone="warning">قائم</Pill>}))}/></Card>)}
      {tab==="networth" && <Card style={{marginTop:12}}><div style={{fontSize:11,color:C.muted}}>صافي الثروة الحالي</div><div style={{fontSize:34,fontWeight:950,marginTop:6}}>{displayMoney(netValue)}</div><div style={{height:170,marginTop:16,display:"flex",alignItems:"flex-end",gap:7}}>{[35,42,39,48,55,58,62,68,71,76,82,90].map((h,i)=><div key={i} style={{flex:1,height:h+"%",background:i===11?C.green:"#D7E5DC",borderRadius:"6px 6px 0 0"}}/>)}</div></Card>}
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
          ? <><Button secondary onClick={actions.onRollover}>نسخ من الشهر السابق</Button><Button onClick={actions.onAdd}>＋ حركة</Button></>
          : planningTab === "reports"
            ? <Button secondary onClick={actions.onExport}>تصدير</Button>
            : <Button onClick={actions.onAdd}>＋ حركة</Button>}
      />
      <Segmented items={[["budgets","الميزانيات"],["goals","الأهداف"],["reports","التقارير"]]} value={planningTab} onChange={setPlanningTab}/>
      {planningTab==="budgets" && budgetsPage()}
      {planningTab==="goals" && (legacyGoals || <Card style={{marginTop:12}}>
        <h2 style={{marginTop:0,fontSize:15}}>الأهداف المالية</h2>
        <Table columns={[["name","الهدف"],["type","النوع"],["progress","التقدم"],["target","المستهدف"],["status","الحالة"]]} rows={goals.map((g,i)=>({id:g.id||i,name:g.name,type:g.goal_type||"ادخار",progress:<div style={{minWidth:130}}><Progress value={g.current_amount||g.progress||0} max={g.target_amount||g.target||1}/></div>,target:displayMoney(g.target_amount||g.target||0,g.currency||baseCurrency),status:<Pill tone="positive">في المسار</Pill>}))}/>
      </Card>)}
      {planningTab==="reports" && (legacyReports || <Card style={{marginTop:12}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div><h2 style={{margin:0,fontSize:15}}>مركز التقارير</h2><div style={{color:C.muted,fontSize:10,marginTop:4}}>دخل مقابل مصروف · الأداء · التنوع · الدخل المستقبلي</div></div>
          <Pill tone="positive">من نفس دفتر الحركات</Pill>
        </div>
        <div className="finance-v2-three" style={{marginTop:14}}>
          <Stat label="الدخل" value={displayMoney(income)} tone="positive"/>
          <Stat label="المصروف" value={displayMoney(expense)} tone="negative"/>
          <Stat label="صافي التدفق" value={displayMoney(net)} tone={net>=0?"positive":"negative"}/>
        </div>
      </Card>)}
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

  const pageNode = page==="dashboard" ? dashboard()
    : page==="transactions" || page==="inbox" ? transactionsPage()
    : page==="projects" ? (legacyProjects || fallback())
    : page==="planning" || page==="budgets" || page==="goals" || page==="reports" ? planningPage()
    : page==="settings" ? settingsPage()
    : page==="accounts" ? accountsPage()
    : page==="categories" ? categoriesPage()
    : page==="currencies" ? (legacyCurrencies || currenciesPage())
    : page==="recurring" ? (legacyRecurring || recurringPage())
    : page==="context-tags" ? contextTagsPage()
    : page==="wealth" || page==="assets" || page==="debts" || page==="networth" ? wealthPage()
    : page==="family-cash" ? (legacyFamilyCash || familyPage())
    : page==="family" ? (legacyFamily || familyPage())
    : page==="projects" ? (legacyProjects || fallback())
    : fallback();

  return (
    <Shell
      page={page}
      setPage={setPage}
      onAdd={actions.onAdd}
      onRefresh={actions.onRefresh}
      hideBalances={hideBalances}
      setHideBalances={setHideBalances}
      isDemo={isDemo}
    >
      {pageNode}
      <TransactionSheet transaction={selectedTransaction} categories={categories} accounts={accounts} baseCurrency={baseCurrency} onClose={() => setSelectedTransaction(null)} />
    </Shell>
  );
}
