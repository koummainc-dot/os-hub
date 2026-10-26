import React,{useState,useEffect,useRef,useContext,useMemo,useCallback} from "react";
import { OS_GROUPS, OS_SYSTEMS, PLATFORM, osAccess, osAuthErr, osBuildDemoState, osClearLocalCaches, osIsSchemaMissing, osLoadIncoming, osLoadWorkspaces, osLoadWsAdmin, osMakeApi, osMakeDemoApi, osSectionLevel, osSections, osSystemById } from "../core/core.js";
import { SUPABASE_SDK_FAILED, supabase } from "../core/supabase.js";
import { A, AccessDenied, Logo, S, ToastContainer, ToastCtx } from "../core/ui.jsx";
import { OSAuthScreen, OSAvatar, OSOverlay, OSStatusScreen } from "./auth.jsx";
import { OSAccountPage, OSInvitesPage, OSScaffold, OSTeamPage, OSTodayPage } from "./pages.jsx";


// ════════════════ SYSTEM HOST (contract every system module follows) ════════════════
// Each system lives in src/systems/<id>/index.jsx and is loaded lazily the first time it is opened.
// Module contract:  export default function System(props)  +  optional  export const demoSeed = () => data
// props: api{load,save} · access{level,manage,sections,owner} · authUser · ws · members · isDemo
//        page/setPage (current section) · shell{publish,go,toast}
// The module renders ONLY its content: menu, workspace, user and demo bar belong to the shell.
const SYSTEM_LOADERS=import.meta.glob("../systems/*/index.jsx");
function OSSystemHost({sys,ws,acc,me,members,isDemo,demoStore,section,setSection,shell}){
  const [st,setSt]=useState({mod:null,err:null,tick:0});
  useEffect(()=>{
    let c=false; setSt(s=>({...s,mod:null,err:null}));
    const ld=SYSTEM_LOADERS["../systems/"+sys.id+"/index.jsx"];
    if(!ld){setSt(s=>({...s,mod:{scaffold:true}}));return;}
    ld().then(m=>{if(!c)setSt(s=>({...s,mod:m}));}).catch(e=>{if(!c)setSt(s=>({...s,err:e}));});
    return()=>{c=true;};
  },[sys.id,st.tick]);
  const mod=st.mod;
  const api=useMemo(()=>{
    if(!mod||mod.scaffold) return null;
    return isDemo?osMakeDemoApi(demoStore,ws.id+":"+sys.id,mod.demoSeed||null):osMakeApi(ws.id,sys.id,"main");
  },[mod,ws.id,sys.id,isDemo]);
  if(st.err) return(
    <div style={{...S.card,maxWidth:480,margin:"40px auto",textAlign:"center",padding:28}}>
      <div style={{fontSize:32,marginBottom:6}}>📡</div>
      <div style={{fontSize:15,fontWeight:700,marginBottom:6}}>تعذر تحميل هذا النظام</div>
      <div style={{fontSize:12,color:"#57606A",lineHeight:1.8,marginBottom:12}}>غالباً صدر تحديث جديد أو انقطع الاتصال. أعد التحميل.</div>
      <div style={{display:"flex",gap:8,justifyContent:"center"}}><button style={S.btnA} onClick={()=>setSt(s=>({...s,err:null,tick:s.tick+1}))}>🔄 إعادة المحاولة</button><button style={S.btn} onClick={()=>window.location.reload()}>تحديث الصفحة</button></div>
    </div>
  );
  if(!mod) return <div style={{textAlign:"center",padding:60,color:"#6E7781",fontSize:13}}><div style={{width:30,height:30,border:`3px solid ${A}30`,borderTopColor:A,borderRadius:"50%",margin:"0 auto 12px",animation:"spin 0.8s linear infinite"}}/>جاري تحميل {sys.title}...</div>;
  if(mod.scaffold) return <OSScaffold sys={sys} section={section} acc={acc} isDemo={isDemo}/>;
  const Comp=mod.default;
  return <Comp api={api} access={acc} authUser={me} ws={ws} members={members} isDemo={isDemo} demoStore={demoStore} page={section} setPage={setSection} shell={shell}/>;
}

// ════════════════ PLATFORM ROOT + SHELL ════════════════
function Platform(){
  const [auth,setAuth]=useState({status:"loading",user:null});
  const [recovery,setRecovery]=useState(()=>/type=recovery/.test(window.location.hash||""));
  const [boot,setBoot]=useState({state:"idle",error:null,setup:false});
  const [data,setData]=useState({workspaces:[],profile:null,incoming:[]});
  const [wsId,setWsId]=useState(null);
  const [wsAdmin,setWsAdmin]=useState({members:[],sent:[],loading:false});
  const [adminTick,setAdminTick]=useState(0);
  const [demo,setDemo]=useState(null);
  const [route,setRoute]=useState({view:"today",system:null});
  const [sectionBy,setSectionBy]=useState({});
  const [bridge,setBridge]=useState({});
  const [narrow,setNarrow]=useState(typeof window!=="undefined"&&window.innerWidth<860);
  const [navOpen,setNavOpen]=useState(false);
  const [pop,setPop]=useState(null);
  const [toasts,setToasts]=useState([]);
  const demoStore=useRef({});
  const bootRef=useRef(null);
  const isDemo=!!demo;

  const toast=useMemo(()=>(msg)=>{const id=Date.now()+Math.random();setToasts(t=>[...t,{id,msg}]);setTimeout(()=>setToasts(t=>t.filter(x=>x.id!==id)),5500);},[]);
  const removeToast=(id)=>setToasts(t=>t.filter(x=>x.id!==id));
  const shellApi=useMemo(()=>({
    toast,
    go:(view,sysId,section)=>{setRoute({view,system:sysId||null});if(sysId&&section)setSectionBy(p=>({...p,[sysId]:section}));setNavOpen(false);},
    publish:(sysId,patch)=>setBridge(b=>{
      const cur=b[sysId]||{}; const nx={...cur}; let ch=false;
      Object.keys(patch).forEach(k=>{const v=patch[k]; if(typeof v==="function"){if(cur[k]!==v){nx[k]=v;ch=true;}} else if(JSON.stringify(cur[k])!==JSON.stringify(v)){nx[k]=v;ch=true;}});
      return ch?{...b,[sysId]:nx}:b;
    })
  }),[toast]);

  // ── responsive ──
  useEffect(()=>{const f=()=>setNarrow(window.innerWidth<860);window.addEventListener("resize",f);return()=>window.removeEventListener("resize",f);},[]);
  // ── cross-module navigation (ContentOS team page → platform team page) ──
  useEffect(()=>{const f=(e)=>{const d=(e&&e.detail)||{};setRoute({view:d.view||"today",system:d.system||null});setNavOpen(false);};window.addEventListener("os:goto",f);return()=>window.removeEventListener("os:goto",f);},[]);

  // ── auth session ──
  useEffect(()=>{
    let cancelled=false;
    (async()=>{try{const {data:d}=await supabase.auth.getSession();if(!cancelled)setAuth(d&&d.session&&d.session.user?{status:"in",user:d.session.user}:{status:"out",user:null});}catch(e){if(!cancelled)setAuth({status:"out",user:null});}})();
    const {data:sub}=supabase.auth.onAuthStateChange((event,session)=>{
      setTimeout(()=>{ // never run Supabase calls inside the callback (auth lock)
        if(cancelled) return;
        if(event==="PASSWORD_RECOVERY") setRecovery(true);
        setAuth(prev=>{const u=session&&session.user?session.user:null; if(!u) return {status:"out",user:null}; if(prev.user&&prev.user.id===u.id&&prev.status==="in") return {status:"in",user:u}; return {status:"in",user:u};});
      },0);
    });
    return()=>{cancelled=true;try{sub&&sub.subscription&&sub.subscription.unsubscribe();}catch(e){}};
  },[]);

  async function bootstrap(sbUser,preferWs){
    setBoot(b=>({...b,state:"loading",error:null,setup:false}));
    try{
      const {data:personalId,error}=await supabase.rpc("ensure_my_workspace"); if(error) throw error;
      const [wsl,profRes,inc]=await Promise.all([
        osLoadWorkspaces(sbUser),
        supabase.from("profiles").select("name,color").eq("id",sbUser.id).maybeSingle(),
        osLoadIncoming(sbUser)
      ]);
      setData({workspaces:wsl,profile:(profRes&&profRes.data)||null,incoming:inc});
      let saved=null; try{saved=localStorage.getItem("os_current_ws");}catch(e){}
      const pick=[preferWs,saved,personalId].find(id=>id&&wsl.some(w=>w.id===id))||(wsl[0]&&wsl[0].id)||null;
      setWsId(pick); setBoot({state:"ready",error:null,setup:false});
    }catch(e){console.error("Platform bootstrap failed:",e);setBoot({state:"error",error:e,setup:osIsSchemaMissing(e)});}
  }
  bootRef.current=bootstrap;
  const uid=auth.user&&auth.user.id;
  useEffect(()=>{if(auth.status==="in"&&auth.user&&!recovery){bootRef.current(auth.user);} else if(auth.status==="out"){setBoot({state:"idle",error:null,setup:false});setData({workspaces:[],profile:null,incoming:[]});setWsId(null);}},[uid,auth.status,recovery]);
  useEffect(()=>{if(wsId&&!isDemo){try{localStorage.setItem("os_current_ws",wsId);}catch(e){}}},[wsId,isDemo]);

  // ── derived ──
  const authMe=auth.user?{id:auth.user.id,email:String(auth.user.email||"").toLowerCase(),name:(data.profile&&data.profile.name)||(auth.user.user_metadata&&auth.user.user_metadata.name)||String(auth.user.email||"").split("@")[0]}:null;
  const me=isDemo?demo.me:authMe;
  const workspaces=isDemo?demo.workspaces:data.workspaces;
  const incoming=isDemo?demo.incoming:data.incoming;
  const baseWs=workspaces.find(w=>w.id===wsId)||workspaces[0]||null;
  let ws=baseWs;
  if(isDemo&&baseWs&&baseWs.id==="demo_ws"&&demo.viewAs!=="owner"){const m=demo.members.find(x=>x.userId===demo.viewAs);if(m)ws={...baseWs,isOwner:false,access:m.access,ownerName:demo.me.name};}
  const realWsId=baseWs&&baseWs.id; const realIsOwner=!!(ws&&ws.isOwner);
  const admin=isDemo?(realWsId==="demo_ws"?{members:demo.members,sent:demo.sent,loading:false}:{members:[],sent:[],loading:false}):wsAdmin;

  // ── members / invitations of the current workspace ──
  useEffect(()=>{
    if(isDemo||!realWsId||auth.status!=="in"||boot.state!=="ready") return; let c=false;
    setWsAdmin(a=>({...a,loading:true}));
    osLoadWsAdmin(realWsId,realIsOwner).then(r=>{if(!c)setWsAdmin({...r,loading:false});}).catch(e=>{console.warn("members load failed",e);if(!c)setWsAdmin({members:[],sent:[],loading:false,error:e});});
    return()=>{c=true;};
  },[realWsId,realIsOwner,adminTick,isDemo,auth.status,boot.state]);
  // ── poll incoming invitations ──
  useEffect(()=>{
    if(isDemo||auth.status!=="in"||boot.state!=="ready"||!auth.user) return;
    const u=auth.user; const f=()=>osLoadIncoming(u).then(inc=>setData(d=>({...d,incoming:inc}))).catch(()=>{});
    const iv=setInterval(f,60000); window.addEventListener("focus",f);
    return()=>{clearInterval(iv);window.removeEventListener("focus",f);};
  },[isDemo,auth.status,boot.state,uid]);

  // ── actions ──
  const reloadAll=async(prefer)=>{if(auth.user)await bootRef.current(auth.user,prefer);};
  const fail=(e)=>({ok:false,error:(e&&e.message)||String(e)});
  const actions={
    async invite({email,message,access}){
      if(isDemo){
        if(demo.sent.some(i=>i.email===email&&i.status==="pending")) return {ok:false,error:"توجد دعوة معلّقة لهذا البريد بالفعل"};
        setDemo(d=>({...d,sent:[{id:"demo_inv_"+Date.now(),wsId:"demo_ws",email,message,access,status:"pending",createdAt:new Date().toISOString(),inviterName:d.me.name,wsName:"مساحتي التجريبية"},...d.sent]}));
        return {ok:true};
      }
      try{
        const {error}=await supabase.from("invitations").insert({workspace_id:ws.id,invited_email:email,invited_by:auth.user.id,inviter_name:me.name,workspace_name:ws.name,message:message||null,access});
        if(error){ if(error.code==="23505") return {ok:false,error:"توجد دعوة معلّقة لهذا البريد بالفعل"}; throw error; }
        setAdminTick(t=>t+1); return {ok:true};
      }catch(e){return fail(e);}
    },
    async saveMember(userId,access){
      if(isDemo){setDemo(d=>({...d,members:d.members.map(m=>m.userId===userId?{...m,access}:m)}));return {ok:true};}
      try{const {error}=await supabase.from("workspace_members").update({access}).eq("workspace_id",ws.id).eq("user_id",userId); if(error) throw error; setAdminTick(t=>t+1); return {ok:true};}catch(e){return fail(e);}
    },
    async removeMember(userId){
      if(isDemo){setDemo(d=>({...d,members:d.members.filter(m=>m.userId!==userId),viewAs:d.viewAs===userId?"owner":d.viewAs}));return {ok:true};}
      try{const {error}=await supabase.from("workspace_members").delete().eq("workspace_id",ws.id).eq("user_id",userId); if(error) throw error; setAdminTick(t=>t+1); return {ok:true};}catch(e){return fail(e);}
    },
    async revoke(id){
      if(isDemo){setDemo(d=>({...d,sent:d.sent.map(i=>i.id===id?{...i,status:"revoked"}:i)}));return {ok:true};}
      try{const {error}=await supabase.from("invitations").update({status:"revoked",responded_at:new Date().toISOString()}).eq("id",id).eq("status","pending"); if(error) throw error; setAdminTick(t=>t+1); return {ok:true};}catch(e){return fail(e);}
    },
    async saveInvite(id,access){
      if(isDemo){setDemo(d=>({...d,sent:d.sent.map(i=>i.id===id?{...i,access}:i)}));return {ok:true};}
      try{const {error}=await supabase.from("invitations").update({access}).eq("id",id).eq("status","pending"); if(error) throw error; setAdminTick(t=>t+1); return {ok:true};}catch(e){return fail(e);}
    },
    async rename(name){
      if(isDemo){setDemo(d=>({...d,workspaces:d.workspaces.map(w=>w.id==="demo_ws"?{...w,name}:w)}));return {ok:true};}
      try{const {error}=await supabase.from("workspaces").update({name}).eq("id",ws.id); if(error) throw error; setData(d=>({...d,workspaces:d.workspaces.map(w=>w.id===ws.id?{...w,name}:w)})); return {ok:true};}catch(e){return fail(e);}
    },
    async accept(inv){
      if(isDemo){
        setDemo(d=>({...d,incoming:d.incoming.filter(i=>i.id!==inv.id),workspaces:[...d.workspaces,{id:inv.wsId,name:inv.wsName,ownerId:"demo_owner2",ownerName:inv.inviterName,isOwner:false,access:inv.access}]}));
        setWsId(inv.wsId); setRoute({view:"today",system:null}); return {ok:true};
      }
      try{const {data:newWs,error}=await supabase.rpc("accept_invitation",{inv:inv.id}); if(error) throw error; await reloadAll(newWs); setRoute({view:"today",system:null}); return {ok:true};}
      catch(e){const m=String((e&&e.message)||""); return {ok:false,error:m.includes("EMAIL_NOT_VERIFIED")?"لازم تؤكد بريدك أولاً":m.includes("INVITATION_NOT_FOUND")?"الدعوة لم تعد متاحة (ملغاة أو منتهية)":m};}
    },
    async decline(inv){
      if(isDemo){setDemo(d=>({...d,incoming:d.incoming.filter(i=>i.id!==inv.id)}));return {ok:true};}
      try{const {error}=await supabase.rpc("decline_invitation",{inv:inv.id}); if(error) throw error; setData(d=>({...d,incoming:d.incoming.filter(i=>i.id!==inv.id)})); return {ok:true};}catch(e){return fail(e);}
    },
    async leave(id){
      if(!confirm("مغادرة هذه المساحة؟ ستفقد الوصول إليها.")) return;
      if(isDemo){setDemo(d=>({...d,workspaces:d.workspaces.filter(w=>w.id!==id)}));setWsId("demo_ws");setRoute({view:"today",system:null});return;}
      try{const {error}=await supabase.from("workspace_members").delete().eq("workspace_id",id).eq("user_id",auth.user.id); if(error) throw error; await reloadAll(); setRoute({view:"today",system:null}); toast("تمت المغادرة");}catch(e){toast("❌ "+((e&&e.message)||e));}
    },
    async updateName(name){
      if(isDemo){setDemo(d=>({...d,me:{...d.me,name}}));return {ok:true};}
      try{
        const {error}=await supabase.from("profiles").update({name,updated_at:new Date().toISOString()}).eq("id",auth.user.id); if(error) throw error;
        await supabase.auth.updateUser({data:{name}}); await supabase.rpc("ensure_my_workspace");
        setData(d=>({...d,profile:{...(d.profile||{}),name}})); return {ok:true};
      }catch(e){return fail(e);}
    },
    async signOut(){
      if(isDemo){setDemo(null);setRoute({view:"today",system:null});setSectionBy({});setBridge({});demoStore.current={};setWsId(null);return;}
      try{await supabase.auth.signOut();}catch(e){}
      osClearLocalCaches(); setAuth({status:"out",user:null}); setRoute({view:"today",system:null}); setSectionBy({}); setBridge({}); setPop(null);
    },
    async signOutOthers(){try{const {error}=await supabase.auth.signOut({scope:"others"}); if(error) throw error; toast("✅ تم تسجيل الخروج من الأجهزة الأخرى");}catch(e){toast("❌ "+osAuthErr(e));}}
  };
  function startDemo(){
    demoStore.current={}; const d=osBuildDemoState();
    setDemo(d); setWsId("demo_ws"); setRoute({view:"today",system:null}); setSectionBy({}); setBridge({});
  }

  // ═══ early screens ═══
  if(!isDemo){
    if(auth.status==="loading") return <OSOverlay><Logo/><div style={{textAlign:"center",padding:"14px 0"}}><div style={{width:34,height:34,border:`3px solid ${A}30`,borderTopColor:A,borderRadius:"50%",margin:"0 auto 12px",animation:"spin 0.8s linear infinite"}}/><div style={{fontSize:13,color:"#6E7781"}}>جاري التحميل...</div></div></OSOverlay>;
    if(recovery) return <OSAuthScreen recovery={true} onRecoveryDone={()=>{setRecovery(false);toast("✅ تم تغيير كلمة المرور");}} onDemo={startDemo} sdkFailed={SUPABASE_SDK_FAILED}/>;
    if(auth.status==="out") return <OSAuthScreen onDemo={startDemo} sdkFailed={SUPABASE_SDK_FAILED}/>;
    if(boot.state==="error") return <OSStatusScreen kind={boot.setup?"setup":"error"} error={boot.error} onRetry={()=>bootstrap(auth.user)} onSignOut={actions.signOut}/>;
    if(boot.state!=="ready"||!ws) return <OSOverlay><Logo/><div style={{textAlign:"center",padding:"14px 0"}}><div style={{width:34,height:34,border:`3px solid ${A}30`,borderTopColor:A,borderRadius:"50%",margin:"0 auto 12px",animation:"spin 0.8s linear infinite"}}/><div style={{fontSize:13,color:"#6E7781"}}>جاري تجهيز مساحتك...</div></div></OSOverlay>;
  }
  if(!ws||!me) return null;

  // ═══ shell ═══
  const visibleSystems=OS_SYSTEMS.filter(s=>osAccess(ws,s.id).level!=="none");
  const sys=route.view==="system"?osSystemById(route.system):null;
  const acc=sys?osAccess(ws,sys.id):null;
  const br=sys?(bridge[sys.id]||{}):{};
  const defSection=(s)=>{const l=osSections(s);return l[0]?l[0].id:"";};
  const currentSection=sys?(sectionBy[sys.id]||defSection(sys)):"";
  const setSection=(sysId,v)=>setSectionBy(p=>({...p,[sysId]:typeof v==="function"?v(p[sysId]||defSection(osSystemById(sysId))):v}));
  const navSections=sys&&acc.level!=="none"?osSections(sys).filter(s=>osSectionLevel(acc,s.id)!=="none"&&(!br.visible||br.visible.indexOf(s.id)>-1)):[];
  const viewMember=isDemo&&demo.viewAs!=="owner"?demo.members.find(x=>x.userId===demo.viewAs):null;
  const hostMe=viewMember?{id:viewMember.userId,email:viewMember.email,name:viewMember.name}:me;
  const invCount=incoming.length;
  const teamLabel=ws.isOwner?"الفريق والصلاحيات":"أعضاء المساحة";
  const platformItems=[{id:"today",label:"اليوم",icon:"📅"},{id:"team",label:teamLabel,icon:"👥"},{id:"invites",label:"الدعوات",icon:"✉️",badge:invCount},{id:"account",label:"حسابي",icon:"👤"}];
  const ctxLabel=sys?{icon:sys.icon,title:sys.title,sub:sys.name}:(()=>{const p=platformItems.find(x=>x.id===route.view)||platformItems[0];return route.view==="today"?{icon:"📅",title:"اليوم",sub:PLATFORM.name}:{icon:p.icon,title:p.label,sub:PLATFORM.name};})();
  const topOffset=isDemo?36:0;
  const itemStyle=(active)=>({display:"flex",alignItems:"center",gap:9,padding:"8px 14px",cursor:"pointer",borderRadius:8,margin:"1px 8px",width:"calc(100% - 16px)",background:active?"rgba(239,159,39,0.12)":"transparent",color:active?"#16181D":"#57606A",fontWeight:active?600:400,fontSize:13,border:"none",fontFamily:"inherit",textAlign:"right"});
  const badge=(n)=><span style={{background:"#F87171",color:"#fff",borderRadius:"50%",minWidth:16,height:16,padding:"0 3px",display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:900}}>{n}</span>;
  const wsLabel=(w)=>w.isOwner?"مساحتي — "+w.name:"مساحة "+(w.ownerName||w.name);

  const popBackdrop=pop&&<div onClick={()=>setPop(null)} style={{position:"fixed",inset:0,zIndex:3900}}/>;
  const sysPopover=pop==="sys"&&(
    <div style={{position:"absolute",top:"100%",insetInline:8,marginTop:4,zIndex:4000,background:"#fff",border:"1px solid rgba(0,0,0,0.1)",borderRadius:12,boxShadow:"0 12px 32px rgba(0,0,0,0.16)",maxHeight:"70vh",overflowY:"auto",padding:6}}>
      <button onClick={()=>{setRoute({view:"today",system:null});setPop(null);setNavOpen(false);}} style={{...itemStyle(route.view==="today"),margin:0,width:"100%"}}><span>📅</span><span style={{flex:1}}>اليوم (كل الأنظمة)</span></button>
      {OS_GROUPS.map(g=>{const list=visibleSystems.filter(s=>s.group===g.id);if(!list.length)return null;return(
        <div key={g.id}><div style={{fontSize:10,color:"#94A3B8",fontWeight:700,padding:"8px 10px 3px"}}>{g.label}</div>
          {list.map(s=><button key={s.id} onClick={()=>{setRoute({view:"system",system:s.id});setPop(null);setNavOpen(false);}} style={{...itemStyle(sys&&sys.id===s.id),margin:0,width:"100%"}}><span style={{fontSize:15}}>{s.icon}</span><span style={{flex:1}}>{s.title}</span><span style={{width:7,height:7,borderRadius:"50%",background:s.status==="live"?"#10B981":"#CBD5E1"}} title={s.status==="live"?"جاهز":"قيد البناء"}/></button>)}
        </div>);})}
    </div>
  );
  const userPopover=pop==="user"&&(
    <div style={{position:"absolute",top:"100%",insetInlineEnd:8,marginTop:4,zIndex:4000,background:"#fff",border:"1px solid rgba(0,0,0,0.1)",borderRadius:12,boxShadow:"0 12px 32px rgba(0,0,0,0.16)",padding:6,minWidth:200}}>
      <div style={{padding:"8px 10px",borderBottom:"1px solid rgba(0,0,0,0.06)",marginBottom:4}}><div style={{fontSize:13,fontWeight:700}}>{me.name}</div><div dir="ltr" style={{fontSize:10.5,color:"#6E7781",textAlign:"right"}}>{me.email}</div></div>
      <button onClick={()=>{setRoute({view:"account",system:null});setPop(null);setNavOpen(false);}} style={{...itemStyle(false),margin:0,width:"100%"}}>👤 حسابي</button>
      <button onClick={()=>{setRoute({view:"invites",system:null});setPop(null);setNavOpen(false);}} style={{...itemStyle(false),margin:0,width:"100%"}}>✉️ الدعوات {invCount>0&&badge(invCount)}</button>
      <button onClick={()=>{setPop(null);actions.signOut();}} style={{...itemStyle(false),margin:0,width:"100%",color:"#DC2626"}}>↩ {isDemo?"الخروج من الوضع التجريبي":"تسجيل خروج"}</button>
    </div>
  );

  const nav=(
    <aside style={{width:narrow?280:220,maxWidth:"85vw",background:"#FFFFFF",borderInlineEnd:"1px solid rgba(0,0,0,0.06)",display:"flex",flexDirection:"column",flexShrink:0,position:narrow?"fixed":"sticky",top:topOffset,insetInlineStart:narrow?0:undefined,height:`calc(100vh - ${topOffset}px)`,overflowY:"auto",zIndex:narrow?4500:1,boxShadow:narrow?"0 0 40px rgba(0,0,0,0.25)":"none"}}>
      <div style={{padding:"14px 12px 10px",borderBottom:"1px solid rgba(0,0,0,0.06)",position:"relative"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
          <div style={{fontSize:16,fontWeight:800,color:"#16181D",display:"flex",alignItems:"center",gap:7}}><span style={{display:"inline-block",width:8,height:8,borderRadius:"50%",background:A}}/>{PLATFORM.name}</div>
          <button onClick={()=>setPop(pop==="user"?null:"user")} title={me.name} style={{background:"none",border:"none",cursor:"pointer",padding:0,position:"relative"}}>
            <OSAvatar name={me.name} color={(data.profile&&data.profile.color)||A} size={30}/>
            {invCount>0&&<span style={{position:"absolute",top:-3,insetInlineStart:-3}}>{badge(invCount)}</span>}
          </button>
        </div>
        {workspaces.length>1?(
          <select value={ws.id} onChange={e=>{setWsId(e.target.value);setRoute({view:"today",system:null});setSectionBy({});}} style={{width:"100%",fontSize:11.5,padding:"6px 8px",borderRadius:8,border:"1px solid rgba(0,0,0,0.1)",fontFamily:"inherit",background:"#F8FAFC",marginBottom:8,cursor:"pointer"}}>
            {workspaces.map(w=><option key={w.id} value={w.id}>{wsLabel(w)}</option>)}
          </select>
        ):<div style={{fontSize:10.5,color:"#6E7781",marginBottom:8}}>📂 {ws.name}</div>}
        <button onClick={()=>setPop(pop==="sys"?null:"sys")} style={{width:"100%",display:"flex",alignItems:"center",gap:9,padding:"9px 10px",borderRadius:10,border:`1px solid ${(sys?sys.color:A)+"55"}`,background:(sys?sys.color:A)+"10",cursor:"pointer",fontFamily:"inherit",textAlign:"right"}}>
          <span style={{fontSize:18}}>{ctxLabel.icon}</span>
          <span style={{flex:1,minWidth:0}}><span style={{display:"block",fontSize:13,fontWeight:700,color:"#16181D",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ctxLabel.title}</span><span dir="ltr" style={{display:"block",fontSize:9.5,color:"#6E7781",textAlign:"right"}}>{ctxLabel.sub}</span></span>
          <span style={{fontSize:10,color:"#6E7781"}}>▾</span>
        </button>
        {sysPopover}{userPopover}
        {sys&&br.openCmd&&(
          <div onClick={br.openCmd} style={{display:"flex",alignItems:"center",gap:7,padding:"6px 10px",borderRadius:8,border:"1px solid rgba(0,0,0,0.08)",cursor:"pointer",background:"rgba(0,0,0,0.03)",marginTop:8}}>
            <span style={{fontSize:12,color:"#6E7781"}}>⌘</span><span style={{fontSize:11,color:"#6E7781",flex:1}}>بحث سريع...</span><span style={{fontSize:9,padding:"1px 5px",borderRadius:4,border:"1px solid rgba(0,0,0,0.08)",color:"#6E7781"}}>K</span>
          </div>
        )}
      </div>
      <div style={{padding:"8px 0",flex:1}}>
        {sys?navSections.map(n=>(
          <button key={n.id} onClick={()=>{setSection(sys.id,n.id);setNavOpen(false);}} style={itemStyle(currentSection===n.id)}>
            <span style={{fontSize:13,minWidth:18,textAlign:"center"}}>{n.icon}</span><span style={{flex:1}}>{n.label}</span>
            {br.badges&&br.badges[n.id]>0&&badge(br.badges[n.id])}
          </button>
        )):platformItems.map(n=>(
          <button key={n.id} onClick={()=>{setRoute({view:n.id,system:null});setNavOpen(false);}} style={itemStyle(route.view===n.id)}>
            <span style={{fontSize:13,minWidth:18,textAlign:"center"}}>{n.icon}</span><span style={{flex:1}}>{n.label}</span>{n.badge>0&&badge(n.badge)}
          </button>
        ))}
        {sys&&acc.level==="none"&&<div style={{padding:"10px 16px",fontSize:11,color:"#94A3B8"}}>لا صلاحية على هذا النظام</div>}
        {sys&&acc.level==="view"&&<div style={{margin:"10px 12px",padding:"6px 10px",borderRadius:8,background:"rgba(59,130,246,0.08)",color:"#2563EB",fontSize:10.5,fontWeight:600}}>👁 عرض فقط</div>}
      </div>
      <div style={{padding:"10px 12px",borderTop:"1px solid rgba(0,0,0,0.06)"}}>
        {sys&&br.openNotifs&&(
          <button onClick={br.openNotifs} style={{width:"100%",display:"flex",alignItems:"center",gap:6,padding:"6px 10px",borderRadius:8,border:"1px solid rgba(0,0,0,0.07)",background:"transparent",color:"#57606A",cursor:"pointer",fontFamily:"inherit",fontSize:12,position:"relative"}}>
            <span>🔔</span><span>التنبيهات</span>{br.notifCount>0&&<span style={{marginInlineStart:"auto"}}>{badge(br.notifCount)}</span>}
          </button>
        )}
        {sys&&br.autosave&&<div style={{fontSize:9,color:br.autosave==="saved"?"#4ADE80":"#6E7781",marginTop:5,textAlign:"center"}}>{br.autosave==="saving"?"⟳ جارٍ الحفظ...":br.autosave==="conflict"?"⚠ تعارض — تم التحديث":"✓ تم الحفظ تلقائياً"}</div>}
        {(!sys||!br.openNotifs)&&<div style={{fontSize:9,color:"#94A3B8",textAlign:"center"}}>{PLATFORM.name} · v{PLATFORM.version}</div>}
      </div>
    </aside>
  );

  let content=null;
  if(route.view==="today") content=<OSTodayPage me={me} ws={ws} systems={visibleSystems} go={(v,id)=>setRoute({view:v,system:id})} incoming={incoming} onInvites={()=>setRoute({view:"invites",system:null})}/>;
  else if(route.view==="team") content=<OSTeamPage ws={ws} me={me} admin={admin} isDemo={isDemo} onInvite={actions.invite} onSaveMember={actions.saveMember} onRemoveMember={actions.removeMember} onRevoke={actions.revoke} onSaveInvite={actions.saveInvite} onRename={actions.rename} onLeave={actions.leave} toast={toast}/>;
  else if(route.view==="invites") content=<OSInvitesPage incoming={incoming} onAccept={actions.accept} onDecline={actions.decline} toast={toast} isDemo={isDemo}/>;
  else if(route.view==="account") content=<OSAccountPage me={me} profile={data.profile} isDemo={isDemo} workspaces={workspaces} onUpdateName={actions.updateName} onLeave={actions.leave} onSignOut={actions.signOut} onSignOutOthers={actions.signOutOthers} toast={toast}/>;
  else if(route.view==="system") content=(sys&&acc.level!=="none")
    ?<OSSystemHost key={ws.id+":"+sys.id+":"+(isDemo?demo.viewAs:"")} sys={sys} ws={ws} acc={acc} me={hostMe} members={admin.members} isDemo={isDemo} demoStore={demoStore} section={currentSection} setSection={(v)=>setSection(sys.id,v)} shell={shellApi}/>
    :<AccessDenied/>;

  return(
    <ToastCtx.Provider value={toast}>
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast}/>
      {isDemo&&(
        <div style={{position:"fixed",top:0,insetInlineStart:0,insetInlineEnd:0,height:36,zIndex:5500,background:"#16181D",color:"#fff",padding:"0 12px",display:"flex",alignItems:"center",justifyContent:"center",gap:10,fontSize:12,flexWrap:"nowrap",overflow:"hidden"}}>
          <span style={{whiteSpace:"nowrap"}}>🎬 وضع تجريبي — كل الأنظمة{narrow?"":" — البيانات مؤقتة ولن تُحفظ"}</span>
          {ws.id==="demo_ws"&&(
            <label style={{display:"flex",alignItems:"center",gap:5,fontSize:11}}>اعرض كـ
              <select value={demo.viewAs} onChange={e=>{setDemo(d=>({...d,viewAs:e.target.value}));setRoute({view:"today",system:null});}} style={{fontSize:11,padding:"2px 4px",borderRadius:6,border:"none",fontFamily:"inherit"}}>
                <option value="owner">صاحب المساحة</option>
                {demo.members.map(m=><option key={m.userId} value={m.userId}>{m.name}</option>)}
              </select>
            </label>
          )}
          <button onClick={actions.signOut} style={{background:A,border:"none",color:"#1a0f00",padding:"3px 12px",borderRadius:6,cursor:"pointer",fontSize:11,fontWeight:700,fontFamily:"inherit",whiteSpace:"nowrap"}}>خروج</button>
        </div>
      )}
      <div style={{display:"flex",minHeight:"100vh",fontFamily:"'SF Pro Display',-apple-system,BlinkMacSystemFont,'Segoe UI',Tahoma,sans-serif",direction:"rtl",background:"#F1F3F5",fontSize:14,color:"#16181D",paddingTop:topOffset}}>
        {!narrow&&nav}
        {narrow&&navOpen&&<><div onClick={()=>{setNavOpen(false);setPop(null);}} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:4400}}/>{nav}</>}
        {popBackdrop}
        <div style={{flex:1,minWidth:0,display:"flex",flexDirection:"column"}}>
          {narrow&&(
            <div style={{position:"sticky",top:topOffset,zIndex:3000,background:"#fff",borderBottom:"1px solid rgba(0,0,0,0.07)",padding:"9px 12px",display:"flex",alignItems:"center",gap:10}}>
              <button onClick={()=>setNavOpen(true)} style={{background:"none",border:"1px solid rgba(0,0,0,0.1)",borderRadius:8,fontSize:18,padding:"2px 9px",cursor:"pointer"}}>☰</button>
              <span style={{fontSize:16}}>{ctxLabel.icon}</span><span style={{fontSize:14,fontWeight:700,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ctxLabel.title}{sys&&navSections.length>0&&(()=>{const c=navSections.find(n=>n.id===currentSection);return c?" · "+c.label:"";})()}</span>
              {invCount>0&&<button onClick={()=>setRoute({view:"invites",system:null})} style={{background:"none",border:"none",cursor:"pointer",fontSize:16,position:"relative"}}>✉️<span style={{position:"absolute",top:-6,insetInlineStart:-4}}>{badge(invCount)}</span></button>}
            </div>
          )}
          <main style={{flex:1,padding:narrow?"16px 14px":"28px 32px",background:"#F1F3F5",minWidth:0}}>{content}</main>
        </div>
      </div>
    </>
    </ToastCtx.Provider>
  );
}


export { OSSystemHost, Platform, SYSTEM_LOADERS };
