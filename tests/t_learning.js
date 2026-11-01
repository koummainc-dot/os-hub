const {makeEnv,sleep,appJs}=require('./harness');
(async()=>{
  const {w,errors}=makeEnv(); w.eval(appJs); await sleep(500);
  const doc=w.document; const txt=()=>doc.getElementById('root').textContent;
  const all=(s,sc)=>[...(sc||doc).querySelectorAll(s)];
  let fails=0; const ok=(c,m)=>{if(!c)fails++;console.log(c?'  ✓':'  ✗',m);};
  const btn=(label,sc)=>all('button',sc).find(b=>b.textContent.includes(label));
  const click=async(label,sc,ms)=>{const b=btn(label,sc);if(!b)return false;b.click();await sleep(ms||150);return true;};
  const setVal=async(el,v)=>{const proto=el.tagName==='SELECT'?w.HTMLSelectElement.prototype:el.tagName==='TEXTAREA'?w.HTMLTextAreaElement.prototype:w.HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(el,v);el.dispatchEvent(new w.Event(el.tagName==='SELECT'?'change':'input',{bubbles:true}));await sleep(30);};
  const nav=()=>all('aside > div:nth-child(2) > button');
  const goSection=async(label)=>{const b=nav().find(x=>x.textContent.includes(label));if(!b)return false;b.click();await sleep(250);return true;};
  const toToday=async()=>{const c=all('aside button').find(x=>x.textContent.includes('▾'));c&&c.click();await sleep(60);const t=all('aside button').find(x=>x.textContent.includes('اليوم (كل الأنظمة)'));t&&t.click();await sleep(250);};
  await click('جرّب الوضع التجريبي'); await sleep(200); await toToday();
  const t=all('main button').find(b=>b.textContent.includes('Learning OS')); ok(!!t,'Learning OS card is openable'); t&&t.click(); await sleep(600);
  console.log('— sections render');
  const markers={'الرئيسية':'هدف اليوم','المجالات':'اللغة الإنجليزية','الدورات':'English from Zero','المهارات':'Reading','اختبارات المستوى':'المستوى المؤكَّد','الأهداف المهنية':'B2','المفردات':'مراجعة اليوم','التاريخ':'السجل','الإعدادات':'هدف اليوم'};
  for(const [l,m] of Object.entries(markers)){const g=await goSection(l); ok(g&&txt().includes(m),`«${l}» shows «${m}»`+(g?'':' (nav missing)'));}
  ok(errors.length===0,'no console errors ('+errors.length+')'); if(errors.length){console.log(errors.slice(0,4));errors.length=0;}
  console.log('— dashboard numbers (demo §11.3)');
  await goSection('الرئيسية'); const T=txt();
  ok(T.includes('20 / 30'),'today = 20 / 30'); ok(T.includes('3 يوم'),'streak = 3'); ok(T.includes('1س 42د'),'last 7 days = 102 min');
  console.log('— log a session');
  ok(await click('سجّل جلسة'),'log button'); const dlg=doc.querySelector('[role=dialog]');
  const sel=all('select',dlg)[0]; await setVal(sel,'l_en2'); const mins=all('input[type=number]',dlg)[0]; await setVal(mins,'15');
  await click('سجّل',dlg,400); ok(txt().includes('35 / 30')||txt().includes('35 /'),'today becomes 35 after +15');
  ok(txt().includes('تراجع'),'undo bar shown'); await click('تراجع',null,300); ok(txt().includes('20 / 30'),'undo restores 20');
  console.log('— validation');
  await click('سجّل جلسة'); const d2=doc.querySelector('[role=dialog]'); await click('سجّل',d2,200); ok(txt().includes('مطلوب'),'lesson required'); const x=doc.querySelector('[role=dialog] button[aria-label="إغلاق"]'); x&&x.click(); await sleep(100);
  console.log('— course detail');
  await goSection('الدورات'); const card=all('div').find(d=>d.style.cursor==='pointer'&&d.textContent.includes('English from Zero')); card&&card.click(); await sleep(250);
  ok(txt().includes('التحيات والتعارف')&&txt().includes('40 / 80')||txt().includes('50%'),'course detail lists lessons with 40/80');
  ok(errors.length===0,'no errors in flows ('+errors.length+')'); if(errors.length)console.log(errors.slice(0,4));
  console.log('FAILS',fails); process.exit(fails?1:0);
})();
