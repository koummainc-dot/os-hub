const {JSDOM}=require('jsdom');const fs=require('fs');
const path=require('path');
const appJs=fs.readFileSync(path.join(__dirname,'..','dist-test','app.iife.js'),'utf8');
function makeEnv(supaStub){
  const dom=new JSDOM('<!DOCTYPE html><html><body><div id="root"></div></body></html>',{runScripts:'outside-only',url:'https://os.example.app/',pretendToBeVisual:true});
  const w=dom.window; const errors=[];
  w.console.error=(...a)=>{errors.push(a.map(x=>x&&x.message?x.message:String(x)).join(' ').slice(0,300));};
  w.console.warn=()=>{}; w.console.log=()=>{};
  w.addEventListener('error',e=>errors.push('WINERR '+e.message));
  w.matchMedia=w.matchMedia||(()=>({matches:false,addEventListener(){},removeEventListener(){}}));
  w.scrollTo=()=>{}; w.confirm=()=>true;
  w.__SUPABASE_FACTORY__=(supaStub&&supaStub.createClient)||(()=>makeFake());
  return {dom,w,errors};
}
function makeFake(){
  const q=()=>{const o={select:()=>o,eq:()=>o,order:()=>o,limit:()=>o,update:()=>o,insert:()=>o,delete:()=>o,upsert:()=>Promise.resolve({data:null,error:null}),maybeSingle:()=>Promise.resolve({data:null,error:null}),then:(r)=>Promise.resolve({data:[],error:null}).then(r)};return o;};
  return {auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),signInWithPassword:async()=>({error:{message:'Invalid login credentials'}}),signUp:async()=>({data:{user:{identities:[{}]},session:null},error:null}),resetPasswordForEmail:async()=>({error:null}),signOut:async()=>({error:null}),resend:async()=>({error:null}),updateUser:async()=>({error:null})},from:q,rpc:async()=>({data:null,error:null}),channel:()=>({on(){return this},subscribe(){return this},track:async()=>{},untrack:async()=>{},presenceState(){return {}}}),removeChannel(){}};
}
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
module.exports={makeEnv,makeFake,sleep,appJs};
