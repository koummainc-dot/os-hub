import React,{useState,useEffect,useRef,useContext,useMemo,useCallback} from "react";
import { OS_LEVEL_COLOR, OS_LEVEL_LABEL, OS_SYSTEMS, PLATFORM, osAccessEntries, osAuthErr, osCountHidden, osSectionLevel, osSections } from "../core/core.js";
import { supabase } from "../core/supabase.js";
import { A, ErrBox, Logo, S } from "../core/ui.jsx";


// ════════════════ AUTH SCREENS ════════════════
const osInp={...S.inp,fontSize:14,padding:"11px 14px",marginBottom:12};
const osLbl={fontSize:11,color:"#6E7781",display:"block",marginBottom:4};
function OSOverlay({children,wide}){
  return(
    <div style={{position:"fixed",inset:0,background:"#F1F3F5",zIndex:5000,overflowY:"auto",direction:"rtl",padding:16,display:"flex"}}>
      <div style={{...S.card,width:"100%",maxWidth:wide?600:420,padding:"30px 26px",margin:"auto",border:`1px solid ${A}25`,boxShadow:`0 0 60px ${A}10`}}>{children}</div>
    </div>
  );
}
function OSNotice({kind,children}){
  const c=kind==="ok"?{bg:"rgba(52,211,153,0.08)",bd:"rgba(52,211,153,0.3)",tx:"#10B981"}:kind==="warn"?{bg:"rgba(239,159,39,0.08)",bd:"rgba(239,159,39,0.3)",tx:"#B7791F"}:{bg:"rgba(59,130,246,0.07)",bd:"rgba(59,130,246,0.25)",tx:"#2563EB"};
  return <div style={{padding:"10px 13px",background:c.bg,border:`1px solid ${c.bd}`,borderRadius:8,marginBottom:14,fontSize:12,color:c.tx,lineHeight:1.9}}>{children}</div>;
}
function OSAuthScreen({recovery,onRecoveryDone,onDemo,sdkFailed}){
  const [mode,setMode]=useState(recovery?"recovery":"login");
  const [name,setName]=useState(""); const [email,setEmail]=useState("");
  const [pass,setPass]=useState(""); const [pass2,setPass2]=useState("");
  const [err,setErr]=useState(""); const [busy,setBusy]=useState(false);
  const [sent,setSent]=useState(false); const [needConfirm,setNeedConfirm]=useState(false);
  useEffect(()=>{if(recovery)setMode("recovery");},[recovery]);
  const redirect=()=>window.location.origin+window.location.pathname;
  const go=(m)=>{setMode(m);setErr("");setSent(false);setNeedConfirm(false);};
  const validEmail=()=>/^\S+@\S+\.\S+$/.test(email.trim());

  async function doLogin(){
    setErr(""); setNeedConfirm(false);
    if(!validEmail()) return setErr("أدخل بريداً إلكترونياً صحيحاً");
    if(!pass) return setErr("أدخل كلمة المرور");
    setBusy(true);
    try{const {error}=await supabase.auth.signInWithPassword({email:email.trim().toLowerCase(),password:pass}); if(error) throw error;}
    catch(e){setErr(osAuthErr(e)); if(String((e&&e.message)||"").toLowerCase().includes("not confirmed"))setNeedConfirm(true);}
    setBusy(false);
  }
  async function doSignup(){
    setErr("");
    if(!name.trim()) return setErr("الاسم مطلوب");
    if(!validEmail()) return setErr("أدخل بريداً إلكترونياً صحيحاً");
    if(pass.length<8) return setErr("كلمة المرور 8 أحرف على الأقل");
    if(pass!==pass2) return setErr("كلمتا المرور غير متطابقتين");
    setBusy(true);
    try{
      const {data,error}=await supabase.auth.signUp({email:email.trim().toLowerCase(),password:pass,options:{data:{name:name.trim()},emailRedirectTo:redirect()}});
      if(error) throw error;
      if(data&&data.session){/* email confirmation is off: the auth listener signs the user in */}
      else if(data&&data.user&&Array.isArray(data.user.identities)&&data.user.identities.length===0) setErr("هذا البريد مسجّل بالفعل — جرّب تسجيل الدخول أو استعادة كلمة المرور");
      else setMode("verify");
    }catch(e){setErr(osAuthErr(e));}
    setBusy(false);
  }
  async function resend(){
    setErr(""); setBusy(true);
    try{const {error}=await supabase.auth.resend({type:"signup",email:email.trim().toLowerCase(),options:{emailRedirectTo:redirect()}}); if(error) throw error; setSent(true);}
    catch(e){setErr(osAuthErr(e));}
    setBusy(false);
  }
  async function doForgot(){
    setErr(""); setSent(false);
    if(!validEmail()) return setErr("أدخل بريداً إلكترونياً صحيحاً");
    setBusy(true);
    try{const {error}=await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(),{redirectTo:redirect()}); if(error) throw error; setSent(true);}
    catch(e){const m=String((e&&e.message)||"").toLowerCase(); if(m.includes("rate")||m.includes("too many")||m.includes("sdk")||m.includes("fetch")) setErr(osAuthErr(e)); else setSent(true);}
    setBusy(false);
  }
  async function doRecovery(){
    setErr("");
    if(pass.length<8) return setErr("كلمة المرور الجديدة 8 أحرف على الأقل");
    if(pass!==pass2) return setErr("كلمتا المرور غير متطابقتين");
    setBusy(true);
    try{
      const {error}=await supabase.auth.updateUser({password:pass}); if(error) throw error;
      try{window.history.replaceState(null,"",window.location.pathname+window.location.search);}catch(e){}
      setPass("");setPass2("");
      onRecoveryDone&&onRecoveryDone();
    }catch(e){setErr(osAuthErr(e));}
    setBusy(false);
  }
  const btn={...S.btnA,width:"100%",padding:13,fontSize:14,justifyContent:"center"};
  const link={fontSize:12,color:A,cursor:"pointer",background:"none",border:"none",fontFamily:"inherit",padding:0};
  const onEnter=(fn)=>(e)=>{if(e.key==="Enter")fn();};

  if(mode==="verify") return(
    <OSOverlay><Logo/>
      <div style={{textAlign:"center",fontSize:38,marginBottom:6}}>📧</div>
      <div style={{fontSize:16,fontWeight:700,textAlign:"center",marginBottom:8}}>تحقق من بريدك</div>
      <div style={{fontSize:12,color:"#57606A",lineHeight:1.9,textAlign:"center",marginBottom:16}}>أرسلنا رابط تأكيد إلى <b dir="ltr">{email.trim().toLowerCase()}</b>.<br/>افتح الرابط ثم ارجع هنا وسجّل الدخول.</div>
      {sent&&<OSNotice kind="ok">✅ تم إرسال رسالة التأكيد مرة أخرى.</OSNotice>}
      {err&&<ErrBox msg={err}/>}
      <button style={btn} onClick={()=>go("login")}>الذهاب لتسجيل الدخول</button>
      <div style={{textAlign:"center",marginTop:12}}><button style={link} onClick={resend} disabled={busy}>لم تصلك الرسالة؟ أعد الإرسال</button></div>
    </OSOverlay>
  );
  if(mode==="recovery") return(
    <OSOverlay><Logo/>
      <div style={{fontSize:15,fontWeight:700,marginBottom:6}}>تعيين كلمة مرور جديدة</div>
      <div style={{fontSize:12,color:"#57606A",lineHeight:1.8,marginBottom:14}}>اكتب كلمة المرور الجديدة لحسابك.</div>
      <label style={osLbl}>كلمة المرور الجديدة (8 أحرف على الأقل)</label>
      <input style={osInp} type="password" dir="ltr" value={pass} onChange={e=>setPass(e.target.value)} autoFocus/>
      <label style={osLbl}>تأكيد كلمة المرور</label>
      <input style={osInp} type="password" dir="ltr" value={pass2} onChange={e=>setPass2(e.target.value)} onKeyDown={onEnter(doRecovery)}/>
      {err&&<ErrBox msg={err}/>}
      <button style={btn} onClick={doRecovery} disabled={busy}>{busy?"جاري الحفظ...":"حفظ كلمة المرور"}</button>
    </OSOverlay>
  );
  if(mode==="forgot") return(
    <OSOverlay><Logo/>
      <div style={{fontSize:15,fontWeight:700,marginBottom:6}}>استعادة كلمة المرور</div>
      <div style={{fontSize:12,color:"#57606A",lineHeight:1.8,marginBottom:14}}>أدخل بريدك وسنرسل لك رابطاً لتعيين كلمة مرور جديدة.</div>
      {sent?<OSNotice kind="ok">✅ إذا كان هذا البريد مسجّلاً لدينا فسيصلك الرابط خلال دقائق. افحص صندوق الوارد ومجلد الرسائل غير المرغوبة.</OSNotice>:<>
        <label style={osLbl}>البريد الإلكتروني</label>
        <input style={osInp} type="email" dir="ltr" placeholder="example@mail.com" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={onEnter(doForgot)} autoFocus/>
        {err&&<ErrBox msg={err}/>}
        <button style={btn} onClick={doForgot} disabled={busy}>{busy?"جاري الإرسال...":"إرسال رابط الاستعادة"}</button>
      </>}
      <div style={{textAlign:"center",marginTop:14}}><button style={link} onClick={()=>go("login")}>← العودة لتسجيل الدخول</button></div>
    </OSOverlay>
  );
  const isSignup=mode==="signup";
  return(
    <OSOverlay><Logo/>
      {sdkFailed&&<OSNotice kind="warn">تعذر تحميل مكتبة الاتصال (Supabase). تحقق من الإنترنت ثم أعد تحميل الصفحة — الوضع التجريبي يعمل بدونها.</OSNotice>}
      <div style={{display:"flex",gap:6,marginBottom:16,background:"rgba(0,0,0,0.04)",padding:3,borderRadius:10}}>
        {[["login","تسجيل الدخول"],["signup","إنشاء حساب"]].map(([m,l])=>(
          <button key={m} onClick={()=>go(m)} style={{flex:1,padding:"8px 6px",border:"none",borderRadius:8,cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:mode===m?700:500,background:mode===m?"#fff":"transparent",color:mode===m?"#16181D":"#57606A",boxShadow:mode===m?"0 1px 3px rgba(0,0,0,0.08)":"none"}}>{l}</button>
        ))}
      </div>
      {isSignup&&<><label style={osLbl}>الاسم</label><input style={osInp} placeholder="اسمك" value={name} onChange={e=>setName(e.target.value)} autoFocus/></>}
      <label style={osLbl}>البريد الإلكتروني</label>
      <input style={osInp} type="email" dir="ltr" placeholder="example@mail.com" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={onEnter(isSignup?doSignup:doLogin)} autoFocus={!isSignup}/>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <label style={osLbl}>كلمة المرور{isSignup?" (8 أحرف على الأقل)":""}</label>
        {!isSignup&&<button style={{...link,marginBottom:4,fontSize:11}} onClick={()=>go("forgot")}>نسيت كلمة المرور؟</button>}
      </div>
      <input style={osInp} type="password" dir="ltr" placeholder="••••••••" value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={onEnter(isSignup?doSignup:doLogin)}/>
      {isSignup&&<><label style={osLbl}>تأكيد كلمة المرور</label><input style={osInp} type="password" dir="ltr" placeholder="••••••••" value={pass2} onChange={e=>setPass2(e.target.value)} onKeyDown={onEnter(doSignup)}/></>}
      {err&&<ErrBox msg={err}/>}
      {needConfirm&&<div style={{marginBottom:12}}>{sent?<OSNotice kind="ok">✅ أُعيد إرسال رسالة التأكيد.</OSNotice>:<button style={link} onClick={resend} disabled={busy}>إعادة إرسال رسالة التأكيد</button>}</div>}
      <button style={btn} onClick={isSignup?doSignup:doLogin} disabled={busy}>{busy?"لحظة...":isSignup?"إنشاء الحساب":"دخول →"}</button>
      {isSignup&&<div style={{fontSize:10,color:"#94A3B8",marginTop:10,lineHeight:1.7,textAlign:"center"}}>سيتم إنشاء مساحة خاصة بك. تقدر تدعو غيرك لاحقاً وتحدد ما يراه وما يعدّله.</div>}
      <div style={{borderTop:"1px solid rgba(0,0,0,0.06)",paddingTop:12,marginTop:16,textAlign:"center"}}>
        <button onClick={onDemo} style={{background:"transparent",border:"1px dashed rgba(0,0,0,0.15)",color:"#57606A",cursor:"pointer",fontSize:12,fontFamily:"inherit",padding:"9px 14px",borderRadius:8}}>🎬 جرّب الوضع التجريبي (لكل الأنظمة — بدون حساب)</button>
        <div style={{fontSize:9,color:"#94A3B8",marginTop:6,lineHeight:1.6}}>بيانات وهمية في المتصفح فقط، لا تُحفظ ولا ترتبط بأي حساب.</div>
      </div>
    </OSOverlay>
  );
}
function OSStatusScreen({kind,error,onRetry,onSignOut}){
  const setup=kind==="setup";
  return(
    <OSOverlay wide><Logo/>
      <div style={{textAlign:"center",fontSize:34,marginBottom:6}}>{setup?"🛠️":"⚠️"}</div>
      <div style={{fontSize:16,fontWeight:700,textAlign:"center",marginBottom:8}}>{setup?"قاعدة البيانات تحتاج إعداداً لمرة واحدة":"تعذر تحميل مساحتك"}</div>
      {setup?(
        <div style={{fontSize:12,color:"#57606A",lineHeight:2,marginBottom:14}}>
          <ol style={{margin:0,paddingInlineStart:18}}>
            <li>افتح Supabase ← <b>SQL Editor</b> ← New query.</li>
            <li>الصق محتوى الملف <b dir="ltr">SUPABASE_PLATFORM_SCHEMA.sql</b> وشغّله (Run).</li>
            <li>ارجع هنا واضغط «إعادة المحاولة».</li>
          </ol>
        </div>
      ):(
        <div style={{fontSize:12,color:"#57606A",lineHeight:1.9,marginBottom:14,textAlign:"center"}}>لم نستطع قراءة بياناتك الآن. هذا لا يعني أن بياناتك فُقدت.</div>
      )}
      {error&&<div dir="ltr" style={{fontSize:10,color:"#94A3B8",background:"rgba(0,0,0,0.03)",borderRadius:6,padding:"6px 8px",marginBottom:12,wordBreak:"break-word"}}>{String(error.message||error)}{error.code?" ["+error.code+"]":""}</div>}
      <div style={{display:"flex",gap:8}}>
        <button style={{...S.btnA,flex:1,justifyContent:"center",padding:11}} onClick={onRetry}>🔄 إعادة المحاولة</button>
        <button style={{...S.btn,padding:11}} onClick={onSignOut}>تسجيل خروج</button>
      </div>
    </OSOverlay>
  );
}

// ════════════════ PERMISSION EDITOR + CHIPS ════════════════
function OSAccessChips({access,limit}){
  const entries=osAccessEntries(access); const max=limit||99;
  if(!entries.length) return <span style={{fontSize:11,color:"#94A3B8"}}>لا توجد صلاحيات</span>;
  return(
    <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
      {entries.slice(0,max).map(e=>(
        <span key={e.sys.id} title={OS_LEVEL_LABEL[e.level]+(e.manage?" + إدارة":"")+(e.hidden?" · "+e.hidden+" قسم مخفي":"")} style={{fontSize:10,padding:"2px 8px",borderRadius:10,background:OS_LEVEL_COLOR[e.level]+"14",color:OS_LEVEL_COLOR[e.level],border:`1px solid ${OS_LEVEL_COLOR[e.level]}30`,fontWeight:600,whiteSpace:"nowrap"}}>
          {e.sys.icon} {e.sys.name.replace(" OS","")} · {e.level==="edit"?"تعديل":"عرض"}{e.manage?" ★":""}{e.hidden?" ⊘"+e.hidden:""}
        </span>
      ))}
      {entries.length>max&&<span style={{fontSize:10,color:"#6E7781",alignSelf:"center"}}>+{entries.length-max}</span>}
    </div>
  );
}
function OSAccessEditor({value,onChange}){
  const systems=(value&&value.systems)||{};
  const [open,setOpen]=useState(null);
  function put(id,patch){const cur=systems[id]||{level:"view",manage:false,sections:{}};const next={...cur,...patch};const all={...systems};if(next.level==="none")delete all[id];else all[id]=next;onChange({systems:all});}
  function setLevel(id,lvl){
    if(lvl==="none"){put(id,{level:"none"});return;}
    const cur=systems[id]; const secs={...((cur&&cur.sections)||{})};
    if(lvl==="view")Object.keys(secs).forEach(k=>{if(secs[k]==="edit")delete secs[k];});
    put(id,{level:lvl,sections:secs,manage:lvl==="view"?false:!!(cur&&cur.manage)});
  }
  function setSection(id,sec,val){const cur=systems[id];if(!cur)return;const secs={...(cur.sections||{})};if(!val)delete secs[sec];else secs[sec]=val;put(id,{sections:secs});}
  function preset(kind){const all={};OS_SYSTEMS.forEach(s=>{if(kind==="none")return;if(kind.indexOf("safe")>-1&&s.sensitive)return;all[s.id]={level:kind.indexOf("edit")===0?"edit":"view",manage:false,sections:{}};});onChange({systems:all});}
  const presets=[["none","بدون أي نظام"],["view_safe","عرض (عدا الحساسة)"],["view_all","عرض الكل"],["edit_safe","تعديل (عدا الحساسة)"]];
  return(
    <div>
      <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:10,alignItems:"center"}}>
        <span style={{fontSize:11,color:"#6E7781"}}>اختصارات:</span>
        {presets.map(([k,l])=><button key={k} type="button" onClick={()=>preset(k)} style={{...S.btn,padding:"4px 10px",fontSize:11}}>{l}</button>)}
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {OS_SYSTEMS.map(s=>{
          const a=systems[s.id]; const lvl=a?a.level:"none"; const secs=osSections(s); const hidden=a?osCountHidden(a):0;
          return(
            <div key={s.id} style={{border:`1px solid ${a?OS_LEVEL_COLOR[lvl]+"40":"rgba(0,0,0,0.07)"}`,borderRadius:10,background:a?OS_LEVEL_COLOR[lvl]+"06":"#fff",padding:"9px 11px"}}>
              <div style={{display:"flex",alignItems:"center",gap:9,flexWrap:"wrap"}}>
                <span style={{width:28,height:28,borderRadius:8,background:s.color+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0}}>{s.icon}</span>
                <div style={{flex:1,minWidth:130}}>
                  <div style={{fontSize:12.5,fontWeight:700,color:"#16181D"}}>{s.title}{s.sensitive&&<span title="نظام حساس — يبدأ بدون صلاحية افتراضياً" style={{marginInlineStart:6,fontSize:10,color:"#B7791F"}}>🔒 حساس</span>}{s.scope==="personal"&&<span title="نظام شخصي: الدعوة تعني السماح له برؤية/تعديل بياناتك أنت" style={{marginInlineStart:6,fontSize:10,color:"#6E7781"}}>👤 شخصي</span>}</div>
                  <div style={{fontSize:10,color:"#6E7781"}}>{s.name}{s.status!=="live"&&<span> · قيد البناء</span>}</div>
                </div>
                <div style={{display:"flex",gap:0,border:"1px solid rgba(0,0,0,0.1)",borderRadius:8,overflow:"hidden",flexShrink:0}}>
                  {["none","view","edit"].map(l=>(
                    <button key={l} type="button" onClick={()=>setLevel(s.id,l)} style={{padding:"5px 11px",border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:11.5,fontWeight:lvl===l?700:500,background:lvl===l?OS_LEVEL_COLOR[l]:"transparent",color:lvl===l?"#fff":"#57606A"}}>{l==="none"?"بدون":l==="view"?"عرض":"تعديل"}</button>
                  ))}
                </div>
              </div>
              {a&&(
                <div style={{display:"flex",alignItems:"center",gap:12,marginTop:8,paddingTop:8,borderTop:"1px dashed rgba(0,0,0,0.08)",flexWrap:"wrap"}}>
                  {lvl==="edit"&&<label style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:"#57606A",cursor:"pointer"}}><input type="checkbox" checked={!!a.manage} onChange={e=>put(s.id,{manage:e.target.checked})}/>إدارة النظام (الإعدادات وفريق النظام)</label>}
                  <button type="button" onClick={()=>setOpen(open===s.id?null:s.id)} style={{...S.btn,padding:"3px 10px",fontSize:11,marginInlineStart:"auto"}}>{open===s.id?"▲ إخفاء الأقسام":"▼ تخصيص الأقسام"}{hidden>0?` (${hidden} مخفي)`:""}</button>
                </div>
              )}
              {a&&open===s.id&&(
                <div style={{marginTop:8,display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(230px,1fr))",gap:6}}>
                  {secs.map(sec=>{
                    const cur=(a.sections||{})[sec.id]||"";
                    const eff=osSectionLevel({level:a.level,manage:a.manage,sections:a.sections||{},owner:false},sec.id);
                    return(
                      <div key={sec.id} style={{display:"flex",alignItems:"center",gap:6,padding:"4px 8px",borderRadius:7,background:"rgba(0,0,0,0.025)"}}>
                        <span style={{fontSize:12,width:18,textAlign:"center"}}>{sec.icon}</span>
                        <span style={{flex:1,fontSize:11,color:eff==="none"?"#94A3B8":"#16181D",textDecoration:eff==="none"?"line-through":"none",minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{sec.label}</span>
                        <select value={cur} onChange={e=>setSection(s.id,sec.id,e.target.value)} style={{fontSize:10.5,padding:"2px 4px",borderRadius:6,border:"1px solid rgba(0,0,0,0.1)",fontFamily:"inherit",background:"#fff",cursor:"pointer"}}>
                          <option value="">{sec.id==="settings"&&!a.manage?"افتراضي (مخفي)":"كما النظام"}</option>
                          <option value="none">مخفي</option>
                          <option value="view">عرض فقط</option>
                          {lvl==="edit"&&<option value="edit">تعديل</option>}
                        </select>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
function OSAccessDetail({access}){
  const entries=osAccessEntries(access);
  if(!entries.length) return <div style={{fontSize:12,color:"#94A3B8"}}>لا توجد أنظمة مُتاحة.</div>;
  return(
    <div style={{display:"flex",flexDirection:"column",gap:7}}>
      {entries.map(e=>{
        const secs=osSections(e.sys); const a=access.systems[e.sys.id]; const hid=secs.filter(s=>osSectionLevel({level:a.level,manage:a.manage,sections:a.sections||{},owner:false},s.id)==="none");
        const ro=secs.filter(s=>a.level==="edit"&&(a.sections||{})[s.id]==="view");
        return(
          <div key={e.sys.id} style={{fontSize:12,lineHeight:1.8}}>
            <span style={{fontWeight:700}}>{e.sys.icon} {e.sys.title}</span> — <span style={{color:OS_LEVEL_COLOR[e.level],fontWeight:600}}>{OS_LEVEL_LABEL[e.level]}</span>{e.manage&&<span style={{color:"#B7791F"}}> · إدارة النظام</span>}
            {hid.length>0&&<div style={{fontSize:11,color:"#6E7781"}}>مخفي عنك: {hid.map(s=>s.label).join("، ")}</div>}
            {ro.length>0&&<div style={{fontSize:11,color:"#6E7781"}}>عرض فقط: {ro.map(s=>s.label).join("، ")}</div>}
          </div>
        );
      })}
    </div>
  );
}
function OSModal({title,onClose,children,footer}){
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",zIndex:6000,display:"flex",alignItems:"center",justifyContent:"center",padding:14}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:"#F1F3F5",borderRadius:14,width:"100%",maxWidth:720,maxHeight:"90vh",display:"flex",flexDirection:"column",overflow:"hidden",direction:"rtl"}}>
        <div style={{padding:"13px 16px",borderBottom:"1px solid rgba(0,0,0,0.07)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontSize:14,fontWeight:700}}>{title}</div>
          <button onClick={onClose} style={{background:"none",border:"none",fontSize:22,lineHeight:1,cursor:"pointer",color:"#57606A"}}>×</button>
        </div>
        <div style={{padding:16,overflowY:"auto",flex:1}}>{children}</div>
        {footer&&<div style={{padding:"11px 16px",borderTop:"1px solid rgba(0,0,0,0.07)",display:"flex",gap:8}}>{footer}</div>}
      </div>
    </div>
  );
}
function OSAvatar({name,color,size}){
  const sz=size||34; const c=color||A; const ch=(String(name||"?").trim()[0]||"?").toUpperCase();
  return <div style={{width:sz,height:sz,borderRadius:"50%",background:c+"22",border:`1.5px solid ${c}66`,color:c,display:"flex",alignItems:"center",justifyContent:"center",fontSize:sz*0.42,fontWeight:800,flexShrink:0}}>{ch}</div>;
}
function osMailto(inv,wsName,me){
  const url=window.location.origin+window.location.pathname;
  const subject="دعوة للانضمام إلى مساحة «"+wsName+"» على "+PLATFORM.name;
  const body="مرحباً،\n\nدعوتك للانضمام إلى مساحة «"+wsName+"» على "+PLATFORM.name+".\n\nافتح الرابط التالي وسجّل الدخول (أو أنشئ حساباً) بنفس هذا البريد ("+inv.email+") وستجد الدعوة بانتظارك داخل التطبيق:\n"+url+"\n\n"+(inv.message?inv.message+"\n\n":"")+"— "+((me&&me.name)||"");
  return "mailto:"+encodeURIComponent(inv.email)+"?subject="+encodeURIComponent(subject)+"&body="+encodeURIComponent(body);
}


export { OSAccessChips, OSAccessDetail, OSAccessEditor, OSAuthScreen, OSAvatar, OSModal, OSNotice, OSOverlay, OSStatusScreen, osInp, osLbl, osMailto };
