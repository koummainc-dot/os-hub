import React,{useState,useEffect,useRef,useContext,useMemo,useCallback} from "react";
import { OS_GROUPS, OS_LEVEL_COLOR, OS_LEVEL_LABEL, osAccess, osAccessEntries, osAuthErr, osSectionLevel, osSections } from "../core/core.js";
import { supabase } from "../core/supabase.js";
import { A, AccessDenied, ErrBox, S } from "../core/ui.jsx";
import { OSAccessChips, OSAccessDetail, OSAccessEditor, OSAvatar, OSModal, osMailto } from "./auth.jsx";


// ════════════════ PLATFORM PAGES ════════════════
function OSPageHead({title,sub,right}){
  return(
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",gap:10,flexWrap:"wrap",marginBottom:18}}>
      <div><div style={{fontSize:22,fontWeight:700}}>{title}</div>{sub&&<div style={{fontSize:12,color:"#6E7781",marginTop:2}}>{sub}</div>}</div>
      {right}
    </div>
  );
}
function OSTodayPage({me,ws,systems,go,incoming,onInvites}){
  const hr=new Date().getHours(); const greet=hr<12?"صباح الخير":hr<18?"مساء الخير":"مساء النور";
  let dateStr=""; try{dateStr=new Date().toLocaleDateString("ar-EG",{weekday:"long",day:"numeric",month:"long",year:"numeric"});}catch(e){}
  const live=systems.filter(s=>s.status==="live").length;
  return(
    <div style={{animation:"fadeIn 0.4s ease-out",maxWidth:1100}}>
      <OSPageHead title={`${greet}، ${me.name||""} 👋`} sub={`${dateStr}${ws?" · "+(ws.isOwner?"مساحتي":"مساحة "+(ws.ownerName||ws.name)):""}`}/>
      {incoming.length>0&&(
        <div onClick={onInvites} style={{...S.card,cursor:"pointer",marginBottom:18,border:`1px solid ${A}55`,background:"rgba(239,159,39,0.06)",display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:20}}>✉️</span>
          <div style={{flex:1}}><div style={{fontSize:13,fontWeight:700}}>لديك {incoming.length} {incoming.length>1?"دعوات":"دعوة"} بانتظار ردك</div><div style={{fontSize:11,color:"#6E7781"}}>اضغط لعرضها وقبولها أو رفضها</div></div>
          <span style={{color:A,fontSize:12,fontWeight:700}}>عرض ←</span>
        </div>
      )}
      <div style={{fontSize:12,color:"#6E7781",marginBottom:12}}>أنظمتك ({systems.length}) · {live} جاهز · {systems.length-live} قيد البناء</div>
      {systems.length===0&&<div style={{...S.card,textAlign:"center",padding:36,color:"#6E7781"}}><div style={{fontSize:34,marginBottom:8}}>🔒</div>لا توجد أنظمة متاحة لك في هذه المساحة بعد. اطلب من صاحب المساحة منحك صلاحية.</div>}
      {OS_GROUPS.map(g=>{
        const list=systems.filter(s=>s.group===g.id); if(!list.length) return null;
        return(
          <div key={g.id} style={{marginBottom:22}}>
            <div style={{fontSize:13,fontWeight:700,color:"#57606A",marginBottom:10}}>{g.label}</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(250px,1fr))",gap:12}}>
              {list.map(s=>{
                const acc=osAccess(ws,s.id);
                return(
                  <button key={s.id} onClick={()=>go("system",s.id)} style={{...S.card,textAlign:"right",cursor:"pointer",fontFamily:"inherit",border:`1px solid ${s.color}30`,display:"flex",flexDirection:"column",gap:8,padding:"14px 16px"}} onMouseEnter={e=>{e.currentTarget.style.borderColor=s.color+"99";e.currentTarget.style.transform="translateY(-2px)";}} onMouseLeave={e=>{e.currentTarget.style.borderColor=s.color+"30";e.currentTarget.style.transform="none";}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <span style={{width:40,height:40,borderRadius:11,background:s.color+"1c",display:"flex",alignItems:"center",justifyContent:"center",fontSize:21,flexShrink:0}}>{s.icon}</span>
                      <div style={{minWidth:0}}><div style={{fontSize:14,fontWeight:700,color:"#16181D"}}>{s.title}</div><div style={{fontSize:10.5,color:"#6E7781"}} dir="ltr">{s.name}</div></div>
                    </div>
                    <div style={{fontSize:11.5,color:"#57606A",lineHeight:1.7,minHeight:38}}>{s.desc}</div>
                    <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                      <span style={{fontSize:10,padding:"2px 8px",borderRadius:10,background:s.status==="live"?"rgba(16,185,129,0.12)":"rgba(0,0,0,0.05)",color:s.status==="live"?"#059669":"#6E7781",fontWeight:700}}>{s.status==="live"?"● جاهز":"قيد البناء · "+s.phase}</span>
                      {!acc.owner&&<span style={{fontSize:10,padding:"2px 8px",borderRadius:10,background:OS_LEVEL_COLOR[acc.level]+"14",color:OS_LEVEL_COLOR[acc.level],fontWeight:700}}>{OS_LEVEL_LABEL[acc.level]}</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
      <div style={{border:"1px dashed rgba(0,0,0,0.15)",borderRadius:12,padding:"14px 18px",color:"#6E7781",fontSize:12,lineHeight:1.9}}>
        🧭 <b>باقي لوحة اليوم</b> (الانتباه، المهام المستحقة، العادات، الملخصات…) ستُبنى في المرحلة الأخيرة بعد اكتمال الأنظمة، لأنها تقرأ من كل نظام عبر عقود الـ feeds.
      </div>
    </div>
  );
}

function OSScaffold({sys,section,acc,isDemo}){
  const secs=osSections(sys); const sec=secs.find(s=>s.id===section)||secs[0];
  if(!sec) return <AccessDenied/>;
  const lvl=osSectionLevel(acc,sec.id);
  if(lvl==="none") return <AccessDenied/>;
  return(
    <div style={{animation:"fadeIn 0.3s ease-out",maxWidth:820}}>
      <OSPageHead title={`${sec.icon} ${sec.label}`} sub={`${sys.icon} ${sys.title} · ${sys.name}`} right={<span style={{fontSize:11,padding:"3px 10px",borderRadius:10,background:OS_LEVEL_COLOR[lvl]+"14",color:OS_LEVEL_COLOR[lvl],fontWeight:700}}>{acc.owner?"صاحب المساحة":OS_LEVEL_LABEL[lvl]}</span>}/>
      <div style={{...S.card,padding:"26px 24px",textAlign:"center",border:`1px dashed ${sys.color}66`}}>
        <div style={{fontSize:40,marginBottom:8}}>🚧</div>
        <div style={{fontSize:16,fontWeight:700,marginBottom:6}}>هذا القسم قيد البناء — {sys.phase}</div>
        <div style={{fontSize:12.5,color:"#57606A",lineHeight:1.9,maxWidth:520,margin:"0 auto"}}>{sys.desc}<br/>القائمة الجانبية والصلاحيات والوضع التجريبي لهذا النظام جاهزة بالفعل، وتُضاف شاشاته ومنطقه حسب خطته.</div>
      </div>
      <div style={{...S.card,marginTop:14,fontSize:12,color:"#57606A",lineHeight:2}}>
        <div><b>الخطة المرجعية:</b> <span dir="ltr" style={{fontFamily:"monospace",fontSize:11}}>plans/{sys.plan}</span></div>
        <div><b>مستوى صلاحيتك في هذا القسم:</b> {acc.owner?"كامل (صاحب المساحة)":OS_LEVEL_LABEL[lvl]+(acc.manage?" + إدارة النظام":"")}</div>
        <div><b>عدد أقسام النظام:</b> {secs.length}{isDemo?" · الوضع التجريبي: جرّب «اعرض كـ» من الشريط العلوي لترى كيف تتغير القائمة حسب الصلاحية":""}</div>
      </div>
    </div>
  );
}

function OSTeamPage({ws,me,admin,isDemo,onInvite,onSaveMember,onRemoveMember,onRevoke,onSaveInvite,onRename,onLeave,toast}){
  const [email,setEmail]=useState(""); const [message,setMessage]=useState("");
  const [access,setAccess]=useState({systems:{}}); const [busy,setBusy]=useState(false);
  const [editing,setEditing]=useState(null); const [renaming,setRenaming]=useState(false); const [wsName,setWsName]=useState(ws.name);
  const [showForm,setShowForm]=useState(true);
  useEffect(()=>{setWsName(ws.name);},[ws.id,ws.name]);
  const members=admin.members||[]; const sent=admin.sent||[];
  const pending=sent.filter(i=>i.status==="pending");
  const history=sent.filter(i=>i.status!=="pending").slice(0,8);
  const STATUS={accepted:["✅ مقبولة","#059669"],declined:["⛔ مرفوضة","#DC2626"],revoked:["🚫 ملغاة","#6E7781"]};

  if(!ws.isOwner){
    return(
      <div style={{animation:"fadeIn 0.3s ease-out",maxWidth:820}}>
        <OSPageHead title="أعضاء المساحة" sub={`مساحة «${ws.name}» — المالك: ${ws.ownerName||"—"}`}/>
        <div style={{...S.card,marginBottom:14}}>
          <div style={{fontSize:13,fontWeight:700,marginBottom:10}}>صلاحياتك في هذه المساحة</div>
          <OSAccessDetail access={ws.access}/>
          <div style={{fontSize:11,color:"#94A3B8",marginTop:10}}>تعديل الصلاحيات أو دعوة آخرين من صلاحية صاحب المساحة فقط.</div>
        </div>
        <div style={{...S.card,marginBottom:14}}>
          <div style={{fontSize:13,fontWeight:700,marginBottom:10}}>الأعضاء ({members.length+1})</div>
          <div style={{display:"flex",alignItems:"center",gap:9,padding:"6px 0"}}><OSAvatar name={ws.ownerName} size={30}/><div style={{fontSize:13,fontWeight:600}}>{ws.ownerName||"المالك"}</div><span style={{fontSize:10,padding:"1px 8px",borderRadius:10,background:A+"22",color:A,fontWeight:700}}>المالك</span></div>
          {members.map(m=><div key={m.userId} style={{display:"flex",alignItems:"center",gap:9,padding:"6px 0"}}><OSAvatar name={m.name||m.email} size={30}/><div style={{fontSize:13}}>{m.name||m.email}</div></div>)}
        </div>
        <button style={{...S.btn,color:"#DC2626",borderColor:"rgba(220,38,38,0.3)"}} onClick={()=>onLeave(ws.id)}>🚪 مغادرة هذه المساحة</button>
      </div>
    );
  }

  async function submit(){
    const em=email.trim().toLowerCase();
    if(!/^\S+@\S+\.\S+$/.test(em)) return toast("❌ أدخل بريداً إلكترونياً صحيحاً");
    if(em===String(me.email||"").toLowerCase()) return toast("❌ لا يمكنك دعوة نفسك");
    if(members.some(m=>String(m.email||"").toLowerCase()===em)) return toast("❌ هذا الشخص عضو بالفعل — عدّل صلاحياته من القائمة");
    if(!osAccessEntries(access).length) return toast("❌ اختر نظاماً واحداً على الأقل (عرض أو تعديل)");
    setBusy(true); const r=await onInvite({email:em,message:message.trim(),access}); setBusy(false);
    if(r.ok){setEmail("");setMessage("");setAccess({systems:{}});toast("✅ تم إنشاء الدعوة — ستظهر للمدعو داخل التطبيق عند دخوله بهذا البريد");}
    else toast("❌ "+r.error);
  }
  async function saveEditing(){
    if(!osAccessEntries(editing.access).length&&editing.kind==="invite") return toast("❌ اختر نظاماً واحداً على الأقل");
    setBusy(true);
    const r=editing.kind==="member"?await onSaveMember(editing.id,editing.access):await onSaveInvite(editing.id,editing.access);
    setBusy(false);
    if(r.ok){toast("✅ تم حفظ الصلاحيات");setEditing(null);} else toast("❌ "+r.error);
  }
  async function doRename(){ if(!wsName.trim()) return; const r=await onRename(wsName.trim()); if(r.ok){setRenaming(false);toast("✅ تم تغيير الاسم");} else toast("❌ "+r.error); }
  return(
    <div style={{animation:"fadeIn 0.3s ease-out",maxWidth:900}}>
      <OSPageHead title="الفريق والصلاحيات" sub={`${members.length} عضو · ${pending.length} دعوة معلّقة`} right={<button style={S.btnA} onClick={()=>setShowForm(s=>!s)}>{showForm?"إخفاء نموذج الدعوة":"✉️ دعوة شخص"}</button>}/>
      <div style={{...S.card,marginBottom:14,display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
        <span style={{fontSize:12,color:"#6E7781"}}>اسم المساحة:</span>
        {renaming?<><input style={{...S.inp,width:220}} value={wsName} onChange={e=>setWsName(e.target.value)} autoFocus onKeyDown={e=>e.key==="Enter"&&doRename()}/><button style={S.btnA} onClick={doRename}>حفظ</button><button style={S.btn} onClick={()=>{setRenaming(false);setWsName(ws.name);}}>إلغاء</button></>:<><b style={{fontSize:14}}>{ws.name}</b><button style={{...S.btn,padding:"3px 10px",fontSize:11}} onClick={()=>setRenaming(true)}>✎ تغيير</button></>}
      </div>
      {showForm&&(
        <div style={{...S.card,marginBottom:18,border:`1px solid ${A}35`}}>
          <div style={{fontSize:14,fontWeight:700,marginBottom:4}}>✉️ دعوة شخص إلى مساحتك</div>
          <div style={{fontSize:11.5,color:"#6E7781",lineHeight:1.8,marginBottom:12}}>تُرسل الدعوة لبريده داخل النظام: يراها عند دخوله بهذا البريد ويقبلها أو يرفضها. لا تُنشأ كلمات مرور — كل شخص يملك حسابه الخاص. اختر ما يراه وما يعدّله في كل نظام.</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:10,marginBottom:12}}>
            <div><span style={S.lbl}>البريد الإلكتروني *</span><input style={{...S.inp,direction:"ltr"}} type="email" placeholder="person@mail.com" value={email} onChange={e=>setEmail(e.target.value)}/></div>
            <div><span style={S.lbl}>رسالة (اختياري)</span><input style={S.inp} placeholder="مثال: ضفتك على مشروع المحتوى" value={message} onChange={e=>setMessage(e.target.value)}/></div>
          </div>
          <span style={S.lbl}>الأنظمة والصلاحيات</span>
          <OSAccessEditor value={access} onChange={setAccess}/>
          <div style={{display:"flex",gap:8,marginTop:14,alignItems:"center",flexWrap:"wrap"}}>
            <button style={S.btnA} onClick={submit} disabled={busy}>{busy?"جاري الإنشاء...":"إرسال الدعوة"}</button>
            <span style={{fontSize:11,color:"#94A3B8"}}>{osAccessEntries(access).length} نظام محدد</span>
          </div>
        </div>
      )}
      {pending.length>0&&(
        <div style={{...S.card,marginBottom:14}}>
          <div style={{fontSize:13,fontWeight:700,marginBottom:10}}>⏳ دعوات معلّقة</div>
          {pending.map(i=>(
            <div key={i.id} style={{padding:"10px 0",borderTop:"1px solid rgba(0,0,0,0.06)"}}>
              <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:6}}>
                <span dir="ltr" style={{fontSize:13,fontWeight:600}}>{i.email}</span>
                <span style={{fontSize:10,color:"#94A3B8"}}>{new Date(i.createdAt).toLocaleDateString("ar-EG")}</span>
                <span style={{marginInlineStart:"auto",display:"flex",gap:6,flexWrap:"wrap"}}>
                  <a href={osMailto(i,ws.name,me)} style={{...S.btn,padding:"3px 10px",fontSize:11,textDecoration:"none"}}>✉️ إشعاره بالإيميل</a>
                  <button style={{...S.btn,padding:"3px 10px",fontSize:11}} onClick={()=>setEditing({kind:"invite",id:i.id,title:"تعديل دعوة "+i.email,access:i.access})}>✎ الصلاحيات</button>
                  <button style={{...S.btn,padding:"3px 10px",fontSize:11,color:"#DC2626"}} onClick={()=>{if(confirm("إلغاء هذه الدعوة؟"))onRevoke(i.id).then(r=>toast(r.ok?"تم إلغاء الدعوة":"❌ "+r.error));}}>إلغاء</button>
                </span>
              </div>
              <OSAccessChips access={i.access} limit={8}/>
            </div>
          ))}
        </div>
      )}
      <div style={{...S.card,marginBottom:14}}>
        <div style={{fontSize:13,fontWeight:700,marginBottom:10}}>👥 الأعضاء</div>
        <div style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0"}}>
          <OSAvatar name={me.name} color={A} size={34}/>
          <div style={{flex:1}}><div style={{fontSize:13,fontWeight:700}}>{me.name} <span style={{fontSize:10,padding:"1px 8px",borderRadius:10,background:A+"22",color:A}}>المالك — صلاحيات كاملة</span></div><div dir="ltr" style={{fontSize:11,color:"#6E7781",textAlign:"right"}}>{me.email}</div></div>
        </div>
        {admin.loading&&<div style={{fontSize:12,color:"#94A3B8",padding:"8px 0"}}>جاري التحميل...</div>}
        {!admin.loading&&members.length===0&&<div style={{fontSize:12,color:"#94A3B8",padding:"10px 0",borderTop:"1px solid rgba(0,0,0,0.06)"}}>لا يوجد أعضاء بعد. ادعُ شخصاً من النموذج أعلاه.</div>}
        {members.map(m=>(
          <div key={m.userId} style={{padding:"10px 0",borderTop:"1px solid rgba(0,0,0,0.06)"}}>
            <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",marginBottom:6}}>
              <OSAvatar name={m.name||m.email} size={34}/>
              <div style={{flex:1,minWidth:150}}><div style={{fontSize:13,fontWeight:700}}>{m.name||m.email}</div><div dir="ltr" style={{fontSize:11,color:"#6E7781",textAlign:"right"}}>{m.email}</div></div>
              <button style={{...S.btn,padding:"4px 11px",fontSize:11}} onClick={()=>setEditing({kind:"member",id:m.userId,title:"صلاحيات "+(m.name||m.email),access:m.access})}>✎ الصلاحيات</button>
              <button style={{...S.btn,padding:"4px 11px",fontSize:11,color:"#DC2626"}} onClick={()=>{if(confirm("إزالة "+(m.name||m.email)+" من المساحة؟ سيفقد الوصول فوراً."))onRemoveMember(m.userId).then(r=>toast(r.ok?"تمت الإزالة":"❌ "+r.error));}}>إزالة</button>
            </div>
            <OSAccessChips access={m.access} limit={10}/>
          </div>
        ))}
      </div>
      {history.length>0&&(
        <div style={{...S.card,marginBottom:14}}>
          <div style={{fontSize:13,fontWeight:700,marginBottom:8}}>سجل الدعوات</div>
          {history.map(i=>{const st=STATUS[i.status]||[i.status,"#6E7781"];return <div key={i.id} style={{display:"flex",gap:8,fontSize:12,padding:"4px 0",alignItems:"center"}}><span dir="ltr">{i.email}</span><span style={{color:st[1],fontWeight:600}}>{st[0]}</span></div>;})}
        </div>
      )}
      <div style={{fontSize:11,color:"#94A3B8",lineHeight:1.8}}>ملاحظة: الصلاحية على مستوى النظام (عرض/تعديل) تُطبَّق في قاعدة البيانات نفسها. إخفاء أقسام داخل النظام يُطبَّق في الواجهة حالياً.</div>
      {editing&&(
        <OSModal title={editing.title} onClose={()=>setEditing(null)} footer={<><button style={S.btnA} onClick={saveEditing} disabled={busy}>{busy?"جاري الحفظ...":"حفظ"}</button><button style={S.btn} onClick={()=>setEditing(null)}>إلغاء</button></>}>
          <OSAccessEditor value={editing.access} onChange={a=>setEditing({...editing,access:a})}/>
        </OSModal>
      )}
    </div>
  );
}

function OSInvitesPage({incoming,onAccept,onDecline,toast,isDemo}){
  const [busy,setBusy]=useState(null);
  async function act(fn,i,okMsg){setBusy(i.id);const r=await fn(i);setBusy(null);toast(r.ok?okMsg:"❌ "+r.error);}
  return(
    <div style={{animation:"fadeIn 0.3s ease-out",maxWidth:820}}>
      <OSPageHead title="الدعوات" sub={incoming.length?`${incoming.length} دعوة بانتظار ردك`:"لا توجد دعوات حالياً"}/>
      {incoming.length===0&&<div style={{...S.card,textAlign:"center",padding:40,color:"#6E7781"}}><div style={{fontSize:36,marginBottom:8}}>📭</div>عندما يدعوك أحد إلى مساحته ببريدك ستظهر الدعوة هنا.{!isDemo&&<div style={{fontSize:11,marginTop:8,color:"#94A3B8"}}>الدعوات تصل فقط للبريد المؤكَّد لحسابك.</div>}</div>}
      {incoming.map(i=>(
        <div key={i.id} style={{...S.card,marginBottom:12,border:`1px solid ${A}40`}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
            <OSAvatar name={i.inviterName} size={38}/>
            <div style={{flex:1}}><div style={{fontSize:14,fontWeight:700}}>{i.inviterName||"شخص"} يدعوك إلى «{i.wsName||"مساحة"}»</div><div style={{fontSize:11,color:"#94A3B8"}}>{new Date(i.createdAt).toLocaleDateString("ar-EG")}</div></div>
          </div>
          {i.message&&<div style={{fontSize:12.5,color:"#57606A",background:"rgba(0,0,0,0.03)",borderRadius:8,padding:"8px 11px",marginBottom:10}}>“{i.message}”</div>}
          <div style={{fontSize:11,fontWeight:700,color:"#6E7781",marginBottom:6}}>ما ستحصل عليه:</div>
          <OSAccessDetail access={i.access}/>
          <div style={{display:"flex",gap:8,marginTop:14}}>
            <button style={S.btnA} disabled={busy===i.id} onClick={()=>act(onAccept,i,"✅ تم قبول الدعوة — تم فتح المساحة")}>✓ قبول</button>
            <button style={S.btn} disabled={busy===i.id} onClick={()=>act(onDecline,i,"تم رفض الدعوة")}>رفض</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function OSAccountPage({me,profile,isDemo,workspaces,onUpdateName,onLeave,onSignOut,onSignOutOthers,toast}){
  const [name,setName]=useState(me.name||""); const [cur,setCur]=useState(""); const [p1,setP1]=useState(""); const [p2,setP2]=useState("");
  const [busy,setBusy]=useState(false); const [err,setErr]=useState("");
  useEffect(()=>{setName(me.name||"");},[me.name]);
  async function savePass(){
    setErr("");
    if(isDemo) return setErr("غير متاح في الوضع التجريبي");
    if(!cur) return setErr("اكتب كلمة المرور الحالية");
    if(p1.length<8) return setErr("كلمة المرور الجديدة 8 أحرف على الأقل");
    if(p1!==p2) return setErr("كلمتا المرور غير متطابقتين");
    if(p1===cur) return setErr("كلمة المرور الجديدة لازم تختلف عن الحالية");
    setBusy(true);
    try{
      const {error:e1}=await supabase.auth.signInWithPassword({email:me.email,password:cur});
      if(e1) throw new Error("كلمة المرور الحالية غير صحيحة");
      const {error}=await supabase.auth.updateUser({password:p1}); if(error) throw error;
      setCur("");setP1("");setP2("");toast("✅ تم تغيير كلمة المرور");
    }catch(e){setErr(e.message&&e.message.indexOf("كلمة")===0?e.message:osAuthErr(e));}
    setBusy(false);
  }
  const memberships=workspaces.filter(w=>!w.isOwner);
  return(
    <div style={{animation:"fadeIn 0.3s ease-out",maxWidth:620}}>
      <OSPageHead title="حسابي"/>
      <div style={{...S.card,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}><OSAvatar name={me.name} color={profile&&profile.color} size={48}/><div><div style={{fontSize:15,fontWeight:700}}>{me.name}</div><div dir="ltr" style={{fontSize:12,color:"#6E7781",textAlign:"right"}}>{me.email}</div></div></div>
        <span style={S.lbl}>الاسم</span>
        <div style={{display:"flex",gap:8}}><input style={S.inp} value={name} onChange={e=>setName(e.target.value)}/><button style={S.btnA} onClick={async()=>{if(!name.trim())return;const r=await onUpdateName(name.trim());toast(r.ok?"✅ تم حفظ الاسم":"❌ "+r.error);}}>حفظ</button></div>
      </div>
      <div style={{...S.card,marginBottom:14}}>
        <div style={{fontSize:14,fontWeight:700,marginBottom:10}}>🔑 تغيير كلمة المرور</div>
        <span style={S.lbl}>كلمة المرور الحالية</span><input style={{...S.inp,direction:"ltr",marginBottom:10}} type="password" value={cur} onChange={e=>setCur(e.target.value)}/>
        <span style={S.lbl}>كلمة المرور الجديدة (8 أحرف على الأقل)</span><input style={{...S.inp,direction:"ltr",marginBottom:10}} type="password" value={p1} onChange={e=>setP1(e.target.value)}/>
        <span style={S.lbl}>تأكيد كلمة المرور الجديدة</span><input style={{...S.inp,direction:"ltr",marginBottom:10}} type="password" value={p2} onChange={e=>setP2(e.target.value)} onKeyDown={e=>e.key==="Enter"&&savePass()}/>
        {err&&<ErrBox msg={err}/>}
        <button style={S.btnA} onClick={savePass} disabled={busy}>{busy?"جاري الحفظ...":"تغيير كلمة المرور"}</button>
        <div style={{fontSize:11,color:"#94A3B8",marginTop:8}}>نسيتها؟ سجّل خروجك واختر «نسيت كلمة المرور» من شاشة الدخول.</div>
      </div>
      {memberships.length>0&&(
        <div style={{...S.card,marginBottom:14}}>
          <div style={{fontSize:14,fontWeight:700,marginBottom:10}}>المساحات التي أنا عضو فيها</div>
          {memberships.map(w=><div key={w.id} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 0",borderTop:"1px solid rgba(0,0,0,0.06)"}}><div style={{flex:1}}><div style={{fontSize:13,fontWeight:600}}>{w.name}</div><div style={{fontSize:11,color:"#6E7781"}}>المالك: {w.ownerName||"—"}</div></div><button style={{...S.btn,fontSize:11,padding:"4px 10px",color:"#DC2626"}} onClick={()=>onLeave(w.id)}>مغادرة</button></div>)}
        </div>
      )}
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        <button style={S.btn} onClick={onSignOutOthers}>🔒 تسجيل الخروج من الأجهزة الأخرى</button>
        <button style={{...S.btn,color:"#DC2626",borderColor:"rgba(220,38,38,0.3)"}} onClick={onSignOut}>↩ تسجيل خروج</button>
      </div>
    </div>
  );
}


export { OSAccountPage, OSInvitesPage, OSPageHead, OSScaffold, OSTeamPage, OSTodayPage };
