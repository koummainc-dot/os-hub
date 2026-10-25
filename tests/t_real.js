const {makeEnv,sleep,appJs}=require('./harness');
function fakeSupabase(cfg){
  const calls=[]; const listeners=[];
  const state={session:cfg.user?{user:cfg.user}:null};
  function from(table){
    const ctx={table,op:'select',filters:{},payload:null,opts:null};
    const run=()=>{
      calls.push({table:ctx.table,op:ctx.op,filters:{...ctx.filters},payload:ctx.payload,opts:ctx.opts});
      const h=cfg.tables[ctx.table]; if(!h) return {data:[],error:null};
      return h(ctx)||{data:[],error:null};
    };
    const o={select:()=>o,eq:(k,v)=>{ctx.filters[k]=v;return o;},order:()=>o,limit:()=>o,
      update:(p)=>{ctx.op='update';ctx.payload=p;return o;},insert:(p)=>{ctx.op='insert';ctx.payload=p;return o;},
      delete:()=>{ctx.op='delete';return o;},upsert:(p,opts)=>{ctx.op='upsert';ctx.payload=p;ctx.opts=opts;return Promise.resolve(run());},
      maybeSingle:()=>{const r=run();const d=Array.isArray(r.data)?(r.data[0]||null):r.data;return Promise.resolve({data:d,error:r.error||null});},
      then:(res,rej)=>Promise.resolve(run()).then(res,rej)};
    return o;
  }
  const auth={
    getSession:async()=>({data:{session:state.session}}),
    onAuthStateChange:(cb)=>{listeners.push(cb);return{data:{subscription:{unsubscribe(){}}}};},
    signInWithPassword:async(a)=>{calls.push({auth:'signIn',a});return cfg.signIn?cfg.signIn(a,state,listeners):{error:{message:'Invalid login credentials'}};},
    signUp:async(a)=>{calls.push({auth:'signUp',a});return {data:{user:{identities:[{}]},session:null},error:null};},
    resetPasswordForEmail:async(e,o)=>{calls.push({auth:'reset',e,o});return{error:null};},
    updateUser:async(a)=>{calls.push({auth:'updateUser',a});return{error:null};},
    signOut:async()=>{state.session=null;listeners.forEach(cb=>cb('SIGNED_OUT',null));return{error:null};},
    resend:async()=>({error:null})
  };
  return {createClient:()=>({auth,from,rpc:async(n,a)=>{calls.push({rpc:n,a});return cfg.rpc?cfg.rpc(n,a):{data:null,error:null};},channel:()=>({on(){return this},subscribe(){return this},track:async()=>{},untrack:async()=>{},presenceState(){return {}}}),removeChannel(){}}),calls,state,listeners};
}
const USER={id:'u1',email:'Owner@Mail.com',user_metadata:{name:'Owner'}};
const rows=(d)=>({data:d,error:null});
(async()=>{
  let fails=0; const ok=(c,m)=>{if(!c)fails++;console.log(c?'  ✓':'  ✗',m);};
  const mk=async(cfg,hash)=>{const stub=fakeSupabase(cfg);const env=makeEnv(stub); if(hash)env.dom.reconfigure({url:'https://os.example.app/'+hash}); env.w.eval(appJs); await sleep(700); return {...env,stub,doc:env.w.document,txt:()=>env.w.document.getElementById('root').textContent,all:(s)=>[...env.w.document.querySelectorAll(s)]};};

  console.log('A) owner signed in — bootstrap, ContentOS first open creates plan + owner profile');
  let wd=null;
  const A=await mk({user:USER,rpc:(n)=>n==='ensure_my_workspace'?{data:'w1',error:null}:{data:null,error:null},tables:{
    workspaces:()=>rows([{id:'w1',owner_id:'u1',name:'مساحتي',owner_name:'Owner'}]),
    workspace_members:(c)=>c.op==='select'?rows([]):rows([]),
    profiles:()=>rows([{name:'Owner',color:'#3B82F6'}]),
    invitations:(c)=>c.filters.invited_email?rows([{id:'i1',workspace_id:'w2',invited_email:'owner@mail.com',inviter_name:'Boss',workspace_name:'Boss space',message:'hi',access:{systems:{projects:{level:'edit'}}},status:'pending',created_at:new Date().toISOString(),expires_at:new Date(Date.now()+864e5).toISOString()}]):rows([]),
    workspace_data:(c)=>{ if(c.op==='select')return rows(wd?[wd]:[]); if(c.op==='upsert'){wd={data:c.payload.data,updated_at:c.payload.updated_at};return rows(null);} if(c.op==='update'){wd={data:c.payload.data,updated_at:c.payload.updated_at};return rows([{updated_at:c.payload.updated_at}]);} return rows([]); }
  }});
  ok(A.txt().includes('صباح')||A.txt().includes('مساء'),'Today page rendered after real login');
  ok(A.stub.calls.some(c=>c.rpc==='ensure_my_workspace'),'ensure_my_workspace RPC called');
  ok(A.txt().includes('لديك 1 دعوة'),'incoming invitation (email matched case-insensitively) shown on Today');
  const tile=A.all('main button').find(b=>b.textContent.includes('Content OS')); tile.click(); await sleep(900);
  const up=A.stub.calls.find(c=>c.table==='workspace_data'&&c.op==='upsert');
  ok(!!up&&up.payload.workspace_id==='w1'&&up.payload.system_id==='content'&&up.payload.part==='main','first ContentOS open upserts workspace_data(w1, content, main)');
  const users=up&&up.payload.data._users||[]; ok(users.length===1&&users[0].role==='admin'&&users[0].authUid==='u1','owner profile auto-created as admin with authUid');
  ok(A.errors.length===0,'no console errors ('+A.errors.length+')'); if(A.errors.length)console.log(A.errors.slice(0,3));

  console.log('B) schema missing → setup screen');
  const B=await mk({user:USER,rpc:()=>({data:null,error:{code:'PGRST202',message:'Could not find the function public.ensure_my_workspace'}}),tables:{}});
  ok(B.txt().includes('SUPABASE_PLATFORM_SCHEMA.sql'),'setup instructions shown');

  console.log('C) recovery link → set-new-password screen');
  const C=await mk({tables:{}},'#access_token=abc&type=recovery');
  ok(C.txt().includes('تعيين كلمة مرور جديدة'),'recovery screen shown from URL hash');
  const pw=C.all('input[type=password]'); const set=(el,v)=>{Object.getOwnPropertyDescriptor(C.w.HTMLInputElement.prototype,'value').set.call(el,v);el.dispatchEvent(new C.w.Event('input',{bubbles:true}));};
  set(pw[0],'newpass123'); set(pw[1],'newpass123'); await sleep(100);
  C.all('button').find(b=>b.textContent.includes('حفظ كلمة المرور')).click(); await sleep(300);
  ok(C.stub.calls.some(c=>c.auth==='updateUser'&&c.a.password==='newpass123'),'updateUser({password}) called');

  console.log('D) signup → verify screen; forgot password');
  const D=await mk({tables:{}});
  const sset=(el,v)=>{Object.getOwnPropertyDescriptor(D.w.HTMLInputElement.prototype,'value').set.call(el,v);el.dispatchEvent(new D.w.Event('input',{bubbles:true}));};
  D.all('button').find(b=>b.textContent==='إنشاء حساب').click(); await sleep(100);
  sset(D.all('input')[0],'Ali'); sset(D.all('input[type=email]')[0],'ali@x.com'); const pp=D.all('input[type=password]'); sset(pp[0],'short'); sset(pp[1],'short'); await sleep(50);
  D.all('button').find(b=>b.textContent.includes('إنشاء الحساب')).click(); await sleep(100);
  ok(D.txt().includes('8 أحرف'),'short password rejected');
  sset(pp[0],'longenough1'); sset(pp[1],'longenough1'); await sleep(50);
  D.all('button').find(b=>b.textContent.includes('إنشاء الحساب')).click(); await sleep(300);
  const su=D.stub.calls.find(c=>c.auth==='signUp'); ok(!!su&&su.a.email==='ali@x.com'&&su.a.options.data.name==='Ali','signUp called with name metadata');
  ok(D.txt().includes('تحقق من بريدك'),'verify-email screen shown');

  console.log('E) accept real invitation → RPC + workspace reload + switch');
  let accepted=false;
  const E=await mk({user:USER,rpc:(n,a)=>{if(n==='ensure_my_workspace')return{data:'w1',error:null}; if(n==='accept_invitation'){accepted=true;return{data:'w2',error:null};} return{data:null,error:null};},tables:{
    workspaces:()=>rows([{id:'w1',owner_id:'u1',name:'مساحتي',owner_name:'Owner'}].concat(accepted?[{id:'w2',owner_id:'u9',name:'Boss space',owner_name:'Boss'}]:[])),
    workspace_members:(c)=>c.filters.user_id?rows(accepted?[{workspace_id:'w2',status:'active',access:{systems:{projects:{level:'edit'},content:{level:'view',sections:{team:'none'}}}}}]:[]):rows([]),
    profiles:()=>rows([{name:'Owner',color:'#3B82F6'}]),
    invitations:(c)=>c.filters.invited_email?rows(accepted?[]:[{id:'i1',workspace_id:'w2',invited_email:'owner@mail.com',inviter_name:'Boss',workspace_name:'Boss space',message:'hi',access:{systems:{projects:{level:'edit'}}},status:'pending',created_at:new Date().toISOString(),expires_at:new Date(Date.now()+864e5).toISOString()}]):rows([]),
    workspace_data:()=>rows([])
  }});
  E.all('aside > div:nth-child(2) > button').find(b=>b.textContent.includes('الدعوات')).click(); await sleep(150);
  E.all('button').find(b=>b.textContent.includes('✓ قبول')).click(); await sleep(900);
  ok(E.stub.calls.some(c=>c.rpc==='accept_invitation'&&c.a.inv==='i1'),'accept_invitation RPC called with invitation id');
  const sel=E.all('aside select')[0]; ok(!!sel&&sel.value==='w2','switched to the new workspace after accepting');
  ok(E.all('main button').filter(b=>/OS/.test(b.textContent)).length===2,'member sees only granted systems (projects, content)');
  console.log('FAILS',fails);
  process.exit(fails?1:0);
})().catch(e=>console.log('HARNESS ERR',e));
