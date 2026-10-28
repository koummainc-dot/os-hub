import React,{useMemo,useState} from "react";
import {supabase} from "../../core/supabase.js";

const LINE="#E4EBE6",INK="#17211D",MUTED="#718078",GREEN="#059669";
const input={width:"100%",minWidth:0,boxSizing:"border-box",border:"1px solid #D8E2DB",borderRadius:9,padding:"9px 10px",background:"#fff",color:INK,font:"inherit",fontSize:12};
const fieldNames=[["date","التاريخ"],["name","اسم الحركة"],["type","النوع"],["amount","المبلغ"],["currency","العملة"],["account","الحساب"],["category","التصنيف"],["merchant","التاجر"],["notes","ملاحظات"]];
function parseCsv(text){
 const clean=String(text||"").replace(/^\uFEFF/,"");
 const firstLine=clean.split(/\r?\n/,1)[0]||"";
 const delimiter=(firstLine.match(/;/g)||[]).length>(firstLine.match(/,/g)||[]).length?";":",";
 const rows=[];let row=[],cell="",quoted=false;
 for(let i=0;i<clean.length;i++){
  const ch=clean[i];
  if(quoted){if(ch==='"'&&clean[i+1]==='"'){cell+='"';i++;}else if(ch==='"')quoted=false;else cell+=ch;continue;}
  if(ch==='"'&&cell===""){quoted=true;continue;}
  if(ch===delimiter){row.push(cell);cell="";continue;}
  if(ch==="\n"||ch==="\r"){if(ch==="\r"&&clean[i+1]==="\n")i++;row.push(cell);if(row.some(v=>v.trim()!==""))rows.push(row);row=[];cell="";continue;}
  cell+=ch;
 }
 row.push(cell);if(row.some(v=>v.trim()!==""))rows.push(row);
 if(!rows.length)return {headers:[],records:[]};
 const headers=rows[0].map((v,i)=>v.trim()||("عمود "+(i+1)));
 return {headers,records:rows.slice(1).map(values=>Object.fromEntries(headers.map((h,i)=>[h,(values[i]??"").trim()])))};
}
function autoColumn(headers,keys){return headers.find(h=>keys.some(k=>h.toLowerCase().includes(k.toLowerCase())))||"";}
function parseDate(value){
 const s=String(value||"").trim();
 if(/^\d{4}-\d{2}-\d{2}$/.test(s))return s;
 const m=s.match(/^(\d{1,2})[/. -](\d{1,2})[/. -](\d{4})$/);
 if(m){const a=Number(m[1]),b=Number(m[2]),y=Number(m[3]);const d=a>12?a:b>12?b:a;const mo=a>12?b:b>12?a:b;return y+"-"+String(mo).padStart(2,"0")+"-"+String(d).padStart(2,"0");}
 return "";
}
function parseAmount(value){const s=String(value??"").replace(/[\s\u00a0]/g,"").replace(/(EGP|USD|SAR|جنيه|ج\.م|ر\.س|£|\$|€)/gi,"").replace(/,/g,"");if(!/^\d+(\.\d+)?$/.test(s))return NaN;return Number(s);}
function normalizeType(value){const s=String(value||"").trim().toLowerCase();if(["income","دخل","إيراد","ايراد","credit","deposit"].includes(s))return "Income";if(["expense","مصروف","مصروفات","debit","withdrawal"].includes(s))return "Expense";return "";}
function signature(t){return [t.local_date,String(t.name||"").trim().toLowerCase(),Number(t.amount||0).toFixed(2),String(t.currency||"").toUpperCase(),t.from_account_id||t.to_account_id||""].join("|");}
async function fingerprint(text){if(globalThis.crypto?.subtle){const digest=await globalThis.crypto.subtle.digest("SHA-256",new TextEncoder().encode(text));return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,"0")).join("");}let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}return (h>>>0).toString(16).padStart(8,"0");}
function Button({children,secondary=false,...props}){return <button {...props} style={{border:secondary?"1px solid "+LINE:"1px solid "+GREEN,background:secondary?"#fff":GREEN,color:secondary?INK:"#fff",borderRadius:9,padding:"9px 12px",fontWeight:750,cursor:props.disabled?"not-allowed":"pointer",opacity:props.disabled?.55:1,fontFamily:"inherit",fontSize:12}}>{children}</button>}
export default function TransactionImport({ws,accounts,categories,existingTransactions=[],canEdit=false,onDone}){
 const [open,setOpen]=useState(false),[headers,setHeaders]=useState([]),[records,setRecords]=useState([]),[fileText,setFileText]=useState(""),[fileName,setFileName]=useState("");
 const [mapping,setMapping]=useState({date:"",name:"",type:"",amount:"",currency:"",account:"",category:"",merchant:"",notes:""});
 const [defaultAccount,setDefaultAccount]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState(""),[result,setResult]=useState(null);
 const accountByName=useMemo(()=>new Map(accounts.map(a=>[String(a.name||"").trim().toLowerCase(),a])),[accounts]);
 const categoryByName=useMemo(()=>new Map(categories.map(c=>[String(c.name||"").trim().toLowerCase(),c])),[categories]);
 const existingKeys=useMemo(()=>new Set(existingTransactions.map(t=>signature(t))),[existingTransactions]);
 const preview=useMemo(()=>{
  const seen=new Set();return records.map((raw,index)=>{
   const value=(key)=>mapping[key]?raw[mapping[key]]||"": "";
   const name=value("name").trim(),date=parseDate(value("date")),type=normalizeType(value("type")),amount=parseAmount(value("amount"));
   const foundAccount=accountByName.get(value("account").trim().toLowerCase());
   const account=foundAccount||accounts.find(a=>a.id===defaultAccount);
   const currency=(value("currency").trim().toUpperCase()||account?.currency||"EGP");
   const category=categoryByName.get(value("category").trim().toLowerCase());
   const errors=[];
   if(!date)errors.push("تاريخ غير صالح");
   if(!name)errors.push("اسم الحركة فارغ");
   if(!type)errors.push("النوع يجب أن يكون دخلًا أو مصروفًا؛ التحويلات غير مدعومة هنا");
   if(!(amount>0)||!Number.isFinite(amount))errors.push("المبلغ غير صالح");
   if(!account)errors.push("اختر حسابًا افتراضيًا أو اربط عمود الحساب");
   if(!/^[A-Z]{3}$/.test(currency))errors.push("رمز العملة غير صالح");
   if(account&&account.currency!==currency)errors.push("عملة الحركة لا تطابق عملة الحساب");
   if(category&&category.kind!=="Both"&&category.kind!==type)errors.push("التصنيف لا يطابق نوع الحركة");
   const row={index,raw,date,name,type,amount,currency,account,category,merchant:value("merchant"),notes:value("notes"),errors};
   const key=signature({local_date:date,name,amount,currency,from_account_id:account?.id});
   if(!errors.length&&(existingKeys.has(key)||seen.has(key))){row.duplicate=true;row.errors.push("تبدو مكررة — لن تُستورد");}
   if(!errors.length&&!row.duplicate)seen.add(key);
   return row;
  });
 },[records,mapping,accountByName,categoryByName,accounts,defaultAccount,existingKeys]);
 const validRows=preview.filter(r=>!r.errors.length&&!r.duplicate);
 const duplicateCount=preview.filter(r=>r.duplicate).length;
 const errorCount=preview.filter(r=>r.errors.length&&!r.duplicate).length;
 async function chooseFile(file){
  if(!file)return;if(file.size>5*1024*1024){setError("حجم الملف أكبر من 5 ميجابايت.");return;}
  setError("");setResult(null);setFileName(file.name);
  try{const text=await file.text();const parsed=parseCsv(text);if(!parsed.headers.length)throw new Error("الملف لا يحتوي على صف عناوين صالح.");
   if(parsed.records.length>500)throw new Error("الحد الأقصى في هذه النسخة 500 صف في الملف الواحد.");
   setFileText(text);setHeaders(parsed.headers);setRecords(parsed.records);
   setMapping({
    date:autoColumn(parsed.headers,["التاريخ","date","posted date","transaction date"]),
    name:autoColumn(parsed.headers,["اسم الحركة","الوصف","البيان","name","description","details"]),
    type:autoColumn(parsed.headers,["النوع","type","direction"]),
    amount:autoColumn(parsed.headers,["المبلغ","amount","value"]),
    currency:autoColumn(parsed.headers,["العملة","currency","ccy"]),
    account:autoColumn(parsed.headers,["الحساب","account"]),
    category:autoColumn(parsed.headers,["التصنيف","category"]),
    merchant:autoColumn(parsed.headers,["التاجر","merchant","payee"]),
    notes:autoColumn(parsed.headers,["ملاحظات","notes","memo"])
   });
  }catch(e){setHeaders([]);setRecords([]);setFileText("");setError(e.message||"تعذّر قراءة CSV.");}
 }
 async function importRows(){
  if(!canEdit||busy||!ws?.id||!validRows.length)return;
  if(!globalThis.confirm("سيتم تسجيل "+validRows.length+" حركة منشورة في الدفتر المالي. راجع المعاينة أولًا؛ لا يمكن التراجع عن الاستيراد كدفعة واحدة. هل تريد المتابعة؟"))return;
  setBusy(true);setError("");let imported=0,failed=0;const failures=[];
  try{
   const batch=await fingerprint(fileText);
   for(const row of validRows){
    const key="csv-import-"+batch+"-"+row.index;
    const payload={workspace_id:ws.id,name:row.name,type:row.type,purpose:"Regular",status:"Posted",amount:String(row.amount),currency:row.currency,local_date:row.date,from_account_id:row.account.id,to_account_id:null,category_id:row.category?.id||null,goal_id:null,merchant:row.merchant||null,notes:row.notes||null,splits:[],client_generated_id:"csv-"+batch+"-"+row.index,idempotency_key:key};
    try{const {data,error:rpcError}=await supabase.rpc("fin_post_transaction_with_splits",{p:payload});if(rpcError)throw rpcError;if(data?.duplicate){failed++;failures.push("صف "+(row.index+2)+": النظام اكتشف تكرارًا.");}else imported++;}
    catch(e){failed++;failures.push("صف "+(row.index+2)+": "+(e?.message||"فشل الحفظ"));}
   }
   setResult({imported,failed,duplicates:duplicateCount,errors:errorCount,failures});
   if(imported>0)await onDone?.("تم استيراد "+imported+" حركة. الفاشل: "+failed+"، المكرر المتجاوز: "+duplicateCount+".");
  }finally{setBusy(false);}
 }
 if(!canEdit)return null;
 return <div style={{display:"grid",gap:10}}>
  <div><Button secondary onClick={()=>setOpen(v=>!v)}>{open?"إغلاق استيراد CSV":"⇧ استيراد حركات من CSV"}</Button></div>
  {open&&<div style={{border:"1px solid "+LINE,borderRadius:12,padding:14,display:"grid",gap:12,background:"#FCFDFC"}}>
   <div><b style={{fontSize:13}}>استيراد حركات مالية من CSV</b><p style={{fontSize:11,color:MUTED,lineHeight:1.8,margin:"5px 0 0"}}>تعمل المعاينة قبل الحفظ. مدعوم: الدخل والمصروف فقط، حتى 500 صف و5 ميجابايت. التحويلات غير مدعومة. كشف التكرار المحلي يعتمد على الحركات المحمّلة فقط؛ ويُستخدم مفتاح ثابت لمنع إعادة إرسال الصف نفسه من الملف نفسه. لا يُسجَّل سجل استيراد قابل للتراجع كدفعة واحدة في هذه المرحلة.</p></div>
   <input type="file" accept=".csv,text/csv" onChange={e=>chooseFile(e.target.files?.[0])} style={{font:"inherit",fontSize:12}}/>
   {!!headers.length&&<>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:10}}>{fieldNames.map(([key,label])=><label key={key} style={{display:"grid",gap:5,fontSize:11,fontWeight:700,color:INK}}>{label}{key==="account"&&<span style={{fontWeight:400,color:MUTED}}>اختياري إذا اخترت حسابًا افتراضيًا</span>}<select value={mapping[key]} onChange={e=>setMapping(v=>({...v,[key]:e.target.value}))} style={input}><option value="">— غير محدد —</option>{headers.map(h=><option key={h} value={h}>{h}</option>)}</select></label>)}</div>
    <label style={{display:"grid",gap:5,fontSize:11,fontWeight:700,color:INK}}>الحساب الافتراضي عند غياب حساب مطابق<select value={defaultAccount} onChange={e=>setDefaultAccount(e.target.value)} style={input}><option value="">اختر حسابًا</option>{accounts.filter(a=>a.status==="Active").map(a=><option key={a.id} value={a.id}>{a.name} · {a.currency}</option>)}</select></label>
    <div style={{display:"flex",gap:8,flexWrap:"wrap",fontSize:11}}><span style={{background:"#ECFDF3",padding:"6px 9px",borderRadius:8,color:"#067647"}}>جاهز: {validRows.length}</span><span style={{background:"#FFFAEB",padding:"6px 9px",borderRadius:8,color:"#92400E"}}>مكرر: {duplicateCount}</span><span style={{background:"#FEF3F2",padding:"6px 9px",borderRadius:8,color:"#B42318"}}>به أخطاء: {errorCount}</span></div>
    <div style={{overflowX:"auto",border:"1px solid "+LINE,borderRadius:9}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:680,fontSize:11}}><thead><tr>{["الصف","التاريخ","الحركة","النوع","المبلغ","الحساب","التصنيف","الحالة"].map(x=><th key={x} style={{padding:8,textAlign:"right",background:"#F5F8F5",borderBottom:"1px solid "+LINE}}>{x}</th>)}</tr></thead><tbody>{preview.slice(0,30).map(r=><tr key={r.index}><td style={{padding:8,borderBottom:"1px solid "+LINE}}>{r.index+2}</td><td style={{padding:8,borderBottom:"1px solid "+LINE}}>{r.date||"—"}</td><td style={{padding:8,borderBottom:"1px solid "+LINE}}>{r.name||"—"}</td><td style={{padding:8,borderBottom:"1px solid "+LINE}}>{r.type==="Income"?"دخل":r.type==="Expense"?"مصروف":"—"}</td><td style={{padding:8,borderBottom:"1px solid "+LINE}}>{Number.isFinite(r.amount)?r.amount:"—"} {r.currency}</td><td style={{padding:8,borderBottom:"1px solid "+LINE}}>{r.account?.name||"—"}</td><td style={{padding:8,borderBottom:"1px solid "+LINE}}>{r.category?.name||"بدون تصنيف"}</td><td style={{padding:8,borderBottom:"1px solid "+LINE,color:r.duplicate?"#92400E":r.errors.length?"#B42318":"#067647"}}>{r.duplicate?"مكرر":r.errors.length?r.errors.join("، "):"جاهز"}</td></tr>)}</tbody></table></div>
    {preview.length>30&&<p style={{fontSize:11,color:MUTED}}>المعاينة تعرض أول 30 صفًا؛ سيتم فحص كل الصفوف وعددها {preview.length}.</p>}
    {error&&<div role="alert" style={{fontSize:12,color:"#B42318"}}>{error}</div>}
    <div style={{display:"flex",gap:8,justifyContent:"flex-end",flexWrap:"wrap"}}><Button secondary onClick={()=>{setRecords([]);setHeaders([]);setResult(null);setFileText("");}}>مسح الملف</Button><Button disabled={busy||!validRows.length} onClick={importRows}>{busy?"جارٍ الاستيراد…":"تأكيد استيراد "+validRows.length+" حركة"}</Button></div>
   </>}
   {result&&<div role="status" style={{background:"#ECFDF3",borderRadius:9,padding:12,fontSize:12}}><b>انتهى الاستيراد</b><div>نجح: {result.imported} · فشل: {result.failed} · مكرر تم تجاوزه قبل الحفظ: {result.duplicates} · صفوف غير صالحة: {result.errors}</div>{result.failures.length>0&&<details style={{marginTop:8}}><summary>تفاصيل الصفوف الفاشلة</summary><ul>{result.failures.slice(0,20).map((f,i)=><li key={i}>{f}</li>)}</ul></details>}</div>}
  </div>}
 </div>;
}
