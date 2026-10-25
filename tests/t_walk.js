const {makeEnv,sleep,appJs}=require('./harness');
(async()=>{
  const {w,errors}=makeEnv(); w.eval(appJs); await sleep(500);
  const doc=w.document; const root=()=>doc.getElementById('root'); const txt=()=>root().textContent;
  const bt=(label,scope)=>[...(scope||doc).querySelectorAll('button')].find(x=>x.textContent.includes(label));
  const click=async(label,scope)=>{const b=bt(label,scope); if(!b){return false;} b.click(); await sleep(120); return true;};
  const setSel=async(sel,v)=>{const set=Object.getOwnPropertyDescriptor(w.HTMLSelectElement.prototype,'value').set;set.call(sel,v);sel.dispatchEvent(new w.Event('change',{bubbles:true}));await sleep(150);};
  const navLabels=()=>[...doc.querySelectorAll('aside button')].map(b=>b.textContent);
  const toToday=async()=>{const c=[...doc.querySelectorAll('aside button')].find(x=>x.textContent.includes('▾')); if(c){c.click();await sleep(60);} const t=[...doc.querySelectorAll('aside button')].find(x=>x.textContent.includes('اليوم (كل الأنظمة)')); if(t){t.click();await sleep(80);}};
  let fails=0; const ok=(c,m)=>{if(!c){fails++;console.log('  ✗',m);} else console.log('  ✓',m);};
  await click('جرّب الوضع التجريبي'); await sleep(200);
  // 1) every system: open from Today tile and walk all sections
  const SYS=['Projects OS','Habit OS','Knowledge OS','Learning OS','Finance OS','Home OS','Personal Inventory OS','Shopping & Wishlist OS','Nutrition OS','Sports OS','Relationships OS','Travel & Experiences OS','Spiritual & Values OS','Content OS'];
  for(const s of SYS){
    await toToday();
    const tile=[...doc.querySelectorAll('main button')].find(b=>b.textContent.includes(s));
    if(!tile){ok(false,'tile '+s);continue;}
    tile.click(); await sleep(s==='Content OS'?400:120);
    const navBtns=()=>[...doc.querySelectorAll('aside > div:nth-child(2) > button')]; const items=navBtns();
    let n=0,bad=0;
    for(let i=0;i<items.length;i++){
      const cur=navBtns();
      if(!cur[i])break; cur[i].click(); await sleep(s==='Content OS'?150:30); n++;
      const t=txt(); if(/حدث خطأ|Something went wrong|AppErrorBoundary/.test(t)){bad++;console.log('   boundary at',s,i,t.slice(0,200));}
    }
    ok(n>=7&&bad===0&&errors.length===0,`${s}: ${n} sections walked, boundary=${bad}, errors=${errors.length}`);
    if(errors.length){console.log(errors.slice(0,4));errors.length=0;}
  }
  // 2) platform pages
  for(const p of ['الفريق والصلاحيات','الدعوات','حسابي']){ await toToday(); const b=[...doc.querySelectorAll('aside > div:nth-child(2) > button')].find(x=>x.textContent.includes(p)); b&&b.click(); await sleep(150); ok(!!b&&errors.length===0,'page '+p+' errors='+errors.length); if(errors.length){console.log(errors.slice(0,3));errors.length=0;} }
  console.log('FAILS',fails);
})().catch(e=>{console.log('HARNESS ERR',e);});
