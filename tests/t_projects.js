const {makeEnv,sleep,appJs}=require('./harness');
(async()=>{
  const {w,errors}=makeEnv(); w.eval(appJs); await sleep(500);
  const doc=w.document; const txt=()=>doc.getElementById('root').textContent;
  const all=(s,sc)=>[...(sc||doc).querySelectorAll(s)];
  let fails=0; const ok=(c,m)=>{if(!c)fails++;console.log(c?'  ✓':'  ✗',m);};
  const btn=(label,sc)=>all('button',sc).find(b=>b.textContent.includes(label));
  const click=async(label,sc,ms)=>{const b=btn(label,sc);if(!b)return false;b.click();await sleep(ms||150);return true;};
  const setVal=async(el,v)=>{const proto=el.tagName==='SELECT'?w.HTMLSelectElement.prototype:el.tagName==='TEXTAREA'?w.HTMLTextAreaElement.prototype:w.HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(el,v);el.dispatchEvent(new w.Event(el.tagName==='SELECT'?'change':'input',{bubbles:true}));await sleep(60);};
  const nav=()=>all('aside > div:nth-child(2) > button');
  const goSection=async(label)=>{const b=nav().find(x=>x.textContent.includes(label));if(!b)return false;b.click();await sleep(200);return true;};
  const toToday=async()=>{const c=all('aside button').find(x=>x.textContent.includes('▾'));c&&c.click();await sleep(60);const t=all('aside button').find(x=>x.textContent.includes('اليوم (كل الأنظمة)'));t&&t.click();await sleep(80);};
  const openProjects=async()=>{await toToday();const t=all('main button').find(b=>b.textContent.includes('Projects OS'));t.click();await sleep(500);};
  const viewAs=async(v)=>{const sel=all('select').find(s=>[...s.options].some(o=>o.value==='owner'));await setVal(sel,v);await sleep(300);};

  await click('جرّب الوضع التجريبي'); await sleep(200); await openProjects();
  console.log('— sections render real content');
  const markers={ 'الرئيسية':'صحة المشاريع','اليوم':'مستحقة اليوم','هذا الأسبوع':'اكتشافات قيد العمل','المشاريع':'تطبيق إدارة الوقت','مهامي':'مهمة ورقية','الاكتشاف':'ظهور التطبيق في نتائج المتجر','المواصفات':'مواصفة تطبيق إدارة الوقت','الأهداف (OKR)':'إطلاق منتج ناجح','المخرجات':'Wireframes','المخاطر والمشاكل والقرارات':'تعقيد المزامنة','الاجتماعات':'Knowledge OS','التحديثات':'تحديث الإدارة','الإنجازات':'اعتماد المواصفة','المراجعات الأسبوعية':'المراجعات الأسبوعية','جهات الاتصال':'ليلى المنصور','الفريق':'حِمل الأسبوع','القوالب':'قوالب المشاريع','الإعدادات':'المنطقة الزمنية' };
  for(const [label,marker] of Object.entries(markers)){
    const good=await goSection(label); const has=txt().includes(marker);
    ok(good&&has,`section «${label}» shows «${marker}»`+(good?'':' (nav missing)'));
  }
  ok(errors.length===0,'no console errors while walking sections ('+errors.length+')'); if(errors.length){console.log(errors.slice(0,4));errors.length=0;}

  console.log('— dashboard health');
  await goSection('الرئيسية'); ok(txt().includes('حرج'),'overdue/past-deadline project is Red (حرج)'); ok(txt().includes('مشاكل حرجة'),'critical issues card');

  console.log('— create project from template');
  await goSection('المشاريع'); ok(await click('من قالب'),'template picker opens');
  const card=all('div').find(d=>d.textContent.startsWith('🧩 تطبيق')&&d.style.cursor==='pointer'); card&&card.click(); await sleep(150);
  const nameIn=all('input[type=text],input:not([type])').find(i=>i.closest('[role=dialog]')); await setVal(nameIn,'مشروع اختبار القالب');
  await click('حفظ',doc.querySelector('[role=dialog]'),400);
  ok(txt().includes('مشروع اختبار القالب'),'project created and opened'); 
  await click('المهام'); await sleep(200); ok(txt().includes('الاكتشاف')&&txt().includes('كتابة المواصفة'),'template task tree copied (parents + children)');
  const checks=all('input[type=checkbox]'); ok(checks.length>10,'leaf checkboxes rendered ('+checks.length+')');
  console.log('— complete a task & progress');
  checks[0].click(); await sleep(250); await click('نظرة عامة'); await sleep(150); ok(/\d+\/\d+ مهمة/.test(txt()),'overview shows leaf counts after completing');
  console.log('— new task form');
  await click('المهام'); await sleep(150); await click('مهمة جديدة'); await sleep(150);
  const dlg=doc.querySelector('[role=dialog]'); const titleIn=all('input',dlg)[0]; await setVal(titleIn,'مهمة يدوية جديدة'); await click('حفظ',dlg,350);
  ok(txt().includes('مهمة يدوية جديدة'),'task created in tree');

  console.log('— task sheet + timer');
  const taskSpan=all('span').find(s=>s.textContent==='مهمة يدوية جديدة'); taskSpan&&taskSpan.click(); await sleep(250);
  ok(!!doc.querySelector('[role=dialog]'),'task sheet opens'); await click('ابدأ المؤقّت'); await sleep(250); ok(txt().includes('إيقاف'),'timer bar visible'); await click('أوقف المؤقّت',doc.querySelector('[role=dialog]'),250);
  ok(errors.length===0,'no errors in project/task flows ('+errors.length+')'); if(errors.length){console.log(errors.slice(0,4));errors.length=0;}
  const x=doc.querySelector('[role=dialog] button[aria-label="إغلاق"]'); x&&x.click(); await sleep(100);

  console.log('— permissions (view as Layla = Viewer)');
  await viewAs('demo_layla'); await toToday(); await openProjects();
  const lnav=nav().map(b=>b.textContent).join('|'); ok(!lnav.includes('جهات الاتصال')&&!lnav.includes('المراجعات الأسبوعية'),'Viewer: contacts + reviews hidden from menu');
  await goSection('المشاريع'); ok(!btn('➕ مشروع'),'Viewer: no create-project button'); 
  await goSection('مهامي'); ok(!btn('➕ مهمة'),'Viewer: no new-task button or still shows? ') ;
  console.log('— permissions (view as Sara = Admin on projects)');
  await viewAs('demo_sara'); await toToday(); await openProjects(); await goSection('المشاريع'); ok(!!btn('➕ مشروع'),'Sara (manager): can create projects'); await goSection('الإعدادات'); ok(!!btn('حفظ الإعدادات'),'Sara (manager): can save settings');
  ok(errors.length===0,'no errors in permission views ('+errors.length+')'); if(errors.length)console.log(errors.slice(0,4));
  console.log('FAILS',fails); process.exit(fails?1:0);
})().catch(e=>{console.log('HARNESS ERR',e);process.exit(2);});
