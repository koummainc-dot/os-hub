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
  const goSection=async(label)=>{const b=nav().find(x=>x.textContent.trim()===label || x.textContent.trim().startsWith(label+' '));if(!b)return false;b.click();await sleep(350);return txt().length>0;};
  const toToday=async()=>{const c=all('aside button').find(x=>x.textContent.includes('▾'));c&&c.click();await sleep(60);const t=all('aside button').find(x=>x.textContent.includes('اليوم (كل الأنظمة)'));t&&t.click();await sleep(80);};
  const openProjects=async()=>{await toToday();const t=all('main button').find(b=>b.textContent.trim()==='Projects OS' || b.textContent.includes('Projects OS'));if(!t)return false;t.click();await sleep(500);return nav().some(b=>b.textContent.trim()==='المشاريع');};
  const viewAs=async(v)=>{const sel=all('select').find(s=>[...s.options].some(o=>o.value==='owner'));await setVal(sel,v);await sleep(300);};

  await click('جرّب الوضع التجريبي'); await sleep(200); await openProjects();
  console.log('— sections render real content');
  const markers={ 'الرئيسية':'صحة المشاريع','اليوم':'مستحقة اليوم','هذا الأسبوع':'اكتشافات قيد العمل','المشاريع':'تطبيق إدارة الوقت','مهامي':'مهمة ورقية','الاكتشاف':'ظهور التطبيق في نتائج المتجر','المواصفات':'مواصفة تطبيق إدارة الوقت','الأهداف (OKR)':'إطلاق منتج ناجح','المخرجات':'Wireframes','المخاطر والمشاكل والقرارات':'تعقيد المزامنة','الاجتماعات':'Knowledge OS','التحديثات':'تحديث الإدارة','الإنجازات':'اعتماد المواصفة','المراجعات الأسبوعية':'المراجعات الأسبوعية','جهات الاتصال':'ليلى المنصور','الفريق':'حِمل الأسبوع','القوالب':'قوالب المشاريع','الإعدادات':'المنطقة الزمنية' };
  for(const [label,marker] of Object.entries(markers)){
    const good=await goSection(label); const has=txt().includes(marker);
    ok(good&&has,`section «${label}» shows «${marker}»`+(good?'':' (nav missing)'));
  }
  ok(errors.length===0,'no console errors while walking sections ('+errors.length+')'); if(errors.length){console.log(errors.slice(0,4));errors.length=0;}

  console.log('— read-only detail modal UI flows');
  const closeDetail=async()=>{const close=doc.querySelector('[role="dialog"] button[aria-label="إغلاق"]');if(close)close.click();await sleep(100);};
  const detailFlow=async(section,openLabel,expected,title)=>{
    await goSection(section);
    const opened=await click(openLabel,null,150);
    const dialog=doc.querySelector('[role="dialog"]');
    ok(opened&&!!dialog&&dialog.textContent.includes(expected),title+' opens a read-only detail modal');
    await closeDetail();
    ok(!doc.querySelector('[role="dialog"]'),title+' detail modal closes cleanly');
  };
  await detailFlow('المخرجات','عرض التفاصيل','تفاصيل المخرج','Output');
  await detailFlow('المخاطر والمشاكل والقرارات','عرض التفاصيل','تفاصيل الخطر','Risk');
  await detailFlow('المواصفات','عرض التفاصيل','تفاصيل المواصفة','PRD');
  await detailFlow('الاكتشاف','عرض التفاصيل','تفاصيل الاكتشاف','Discovery');
  await goSection('المشاريع');
  const projectRow=all('tr').find(el=>el.textContent.includes('تطبيق إدارة الوقت'));
  ok(!!projectRow,'project list exposes the seeded project row');
  if(projectRow){projectRow.querySelector('td')?.click();await sleep(250);}
  ok(txt().includes('الحوكمة')&&txt().includes('تطبيق إدارة الوقت'),'opening the project row enters Project Detail');
  const goalsGroup=all('main button').find(b=>b.textContent.trim().startsWith('الأهداف'));
  ok(!!goalsGroup,'Project Detail exposes its Goals group tab');
  if(goalsGroup){goalsGroup.click();await sleep(100);}
  const objectiveLink=all('main button').find(b=>b.textContent.includes('إطلاق منتج ناجح هذا الربع'));
  ok(!!objectiveLink,'Project Goals exposes the linked Objective as a link');
  if(objectiveLink){objectiveLink.click();await sleep(250);}
  ok(txt().includes('الأهداف والنتائج الرئيسية'),'Objective link opens the global OKR destination');
  ok(!!doc.getElementById('projects-okr-objective-ob_q'),'Objective navigation focuses the exact Objective record');
  await goSection('المشاريع');
  const projectRowForKr=all('tr').find(el=>el.textContent.includes('تطبيق إدارة الوقت'));
  if(projectRowForKr){projectRowForKr.querySelector('td')?.click();await sleep(250);}
  const goalsGroupForKr=all('main button').find(b=>b.textContent.trim().startsWith('الأهداف'));
  if(goalsGroupForKr){goalsGroupForKr.click();await sleep(100);}
  const krLink=all('main button').find(b=>b.textContent.includes('إكمال مشروعَي الإطلاق'));
  ok(!!krLink,'Project Goals exposes the linked Key Result as a link');
  if(krLink){krLink.click();await sleep(250);}
  ok(txt().includes('الأهداف والنتائج الرئيسية'),'Key Result link opens the global OKR destination');
  ok(!!doc.getElementById('projects-okr-kr-kr_proj'),'Key Result navigation focuses the exact KR record');
  await goSection('المشاريع');
  const projectRowForGovernance=all('tr').find(el=>el.textContent.includes('تطبيق إدارة الوقت'));
  if(projectRowForGovernance){projectRowForGovernance.querySelector('td')?.click();await sleep(250);}
  ok(await click('الحوكمة',null,100),'Project Detail exposes the Governance group');
  const decisionTab=all('button').find(b=>b.textContent.trim().startsWith('القرارات'));
  ok(!!decisionTab,'Governance exposes the exact Decisions subtab');
  if(decisionTab){decisionTab.click();await sleep(120);}
  ok(txt().includes('اعتماد Supabase كقاعدة بيانات'),'project-scoped Decisions list is visible');
  const decisionOpened=await click('عرض التفاصيل',null,150);
  const decisionDialog=doc.querySelector('[role="dialog"]');
  ok(decisionOpened&&!!decisionDialog&&decisionDialog.textContent.includes('تفاصيل القرار'),'Project Governance → Decision opens a read-only detail modal');
  await closeDetail();
  const issueTab=all('button').find(b=>b.textContent.trim().startsWith('المشاكل'));
  ok(!!issueTab,'Governance exposes the exact Issues subtab');
  if(issueTab){issueTab.click();await sleep(120);}
  ok(txt().includes('توقف التطبيق عند فتح التقارير على Android'),'project-scoped Issues list is visible');
  const issueOpened=await click('عرض التفاصيل',null,150);
  const issueDialog=doc.querySelector('[role="dialog"]');
  ok(issueOpened&&!!issueDialog&&issueDialog.textContent.includes('تفاصيل المشكلة'),'Project Governance → Issue opens a read-only detail modal');
  await closeDetail();
  await click('← المشاريع',null,100);
  ok(errors.length===0,'no console errors while opening detail modals ('+errors.length+')'); if(errors.length){console.log(errors.slice(0,4));errors.length=0;}

  console.log('— template editor validation');
  await goSection('القوالب'); ok(await click('＋ إنشاء قالب مخصص'),'custom template editor opens');
  let tdlg=doc.querySelector('[role=dialog]');
  await setVal(all('input',tdlg)[0],'قالب اختبار غير صالح');
  await setVal(all('textarea',tdlg)[1],'مهمة رئيسية\n    مستوى متخطى');
  await click('حفظ',tdlg,200);
  ok(tdlg.textContent.includes('لا يمكن تخطي مستوى كامل'),'invalid task-tree indentation is rejected with a useful message');
  await click('إلغاء',tdlg,100);

  console.log('— Phase A task UX: quick add, inline edit, bulk actions, custom fields');
  await goSection('مهامي');
  ok(!!btn('⚡ إضافة سريعة'),'quick add action is visible');
  if(await click('⚡ إضافة سريعة',null,120)){
    const qdlg=doc.querySelector('[role=dialog]');
    ok(!!qdlg&&qdlg.textContent.includes('المشروع'),'quick add opens with an explicit project picker');
    const selects=all('select',qdlg);
    ok(selects.some(s=>[...s.options].some(o=>o.textContent.includes('تطبيق إدارة الوقت'))),'quick add project picker contains seeded project');
    const qtitle=all('input',qdlg).find(i=>i.type==='text'||!i.type);
    if(qtitle) await setVal(qtitle,'مهمة إضافة سريعة');
    if(selects[0]) await setVal(selects[0],'p_app');
    await click('حفظ',qdlg,300);
    ok(txt().includes('مهمة إضافة سريعة'),'quick add persists a task with the selected project');
  }
  const tableMode=all('button').find(b=>b.textContent.trim()==='جدول');
  ok(!!tableMode,'task table view is available');
  if(tableMode){tableMode.click();await sleep(120);}
  const taskRow=all('tr').find(r=>r.textContent.includes('مهمة إضافة سريعة'));
  ok(!!taskRow,'table view renders the quick-added task');
  if(taskRow){
    const title=taskRow.querySelector('span');
    if(title){title.dispatchEvent(new w.MouseEvent('dblclick',{bubbles:true}));await sleep(60);}
    const editInput=taskRow.querySelector('input');
    ok(!!editInput,'task title supports inline editing');
    if(editInput){await setVal(editInput,'مهمة إضافة سريعة — معدلة');editInput.dispatchEvent(new w.Event('blur',{bubbles:true}));await sleep(180);}
  }
  if(taskRow){
    const taskTitle=taskRow.querySelector('span');
    if(taskTitle){taskTitle.click();await sleep(120);}
    const sheet=doc.querySelector('[role="dialog"]');
    if(sheet){
      ok(!!btn('✎ تعديل',sheet),'task sheet exposes edit action');
      await click('✎ تعديل',sheet,120);
      const editDlg=doc.querySelector('[role="dialog"]');
      if(editDlg){
        await click('⚙ تفاصيل إضافية',editDlg,80);
        const customInput=all('input',editDlg).find(i=>i.placeholder?.includes('حقل') || i.parentElement?.textContent?.includes('حقل مخصص'));
        ok(!!customInput,'advanced task editor exposes custom fields');
        if(customInput){await setVal(customInput,'QA-CUSTOM');await click('حفظ',editDlg,180);}
      }
      const closeSheet=sheet.querySelector('button[aria-label="إغلاق"]'); closeSheet&&closeSheet.click(); await sleep(80);
    }
  }
  const rowCheck=taskRow?.querySelector('input[type="checkbox"]');
  if(rowCheck) rowCheck.click();
  await sleep(50);
  ok(!!btn('تم تحديد 1'),'bulk selection toolbar appears after selecting a task');
  ok(!!btn('✔ إكمال'),'bulk completion action is available');
  if(btn('✔ إكمال')){w.confirm=()=>true;await click('✔ إكمال',null,180);}
  const quickTaskAfter=all('tr').find(r=>r.textContent.includes('مهمة إضافة سريعة — معدلة'));
  ok(!!quickTaskAfter,'bulk action keeps the task in the table after status update');
  if(quickTaskAfter) ok(quickTaskAfter.textContent.includes('مكتملة'),'bulk completion updates task status');
  await goSection('المشاريع');
  const pRow=all('tr').find(r=>r.textContent.includes('تطبيق إدارة الوقت'));
  if(pRow){pRow.querySelector('td')?.click();await sleep(180);}
  const taskTab=all('button').find(b=>b.textContent.trim().startsWith('المهام'));
  if(taskTab){taskTab.click();await sleep(120);}
  const taskLink=all('span').find(s=>s.textContent==='مهمة إضافة سريعة — معدلة');
  if(taskLink){taskLink.click();await sleep(120);}
  ok(typeof w.location.hash==='string'&&w.location.hash.includes('/p/')&&w.location.hash.includes('task='),'opening an exact task writes a deep-link hash');
  ok(w.location.hash.includes('task='),'task deep link preserves exact task focus');
  const hashBefore=w.location.hash;
  if(hashBefore){w.location.hash=hashBefore.replace('task=','task=missing-');w.dispatchEvent(new w.PopStateEvent('popstate'));await sleep(60);}
  ok(errors.length===0,'no console errors in Phase A task UX flow ('+errors.length+')'); if(errors.length){console.log(errors.slice(0,4));errors.length=0;}

  console.log('— task search recovery');
  await goSection('مهامي');
  const taskSearch=all('input').find(i=>i.placeholder==='بحث في المهام…');
  await setVal(taskSearch,'no-task-will-match-xyz');
  ok(!!btn('مسح الفلاتر'),'clear-filters action appears after narrowing task search');
  await click('مسح الفلاتر',null,150);
  ok(taskSearch.value==='','clear-filters resets the task search input');

  console.log('— dashboard health');
  await goSection('الرئيسية'); ok(txt().includes('حرج'),'overdue/past-deadline project is Red (حرج)'); ok(txt().includes('مشاكل حرجة'),'critical issues card');

  console.log('— create project from template');
  await goSection('المشاريع'); ok(await click('من قالب'),'template picker opens');
  const card=all('div').find(d=>d.textContent.startsWith('🧩 تطبيق')&&d.style.cursor==='pointer'); card&&card.click(); await sleep(150);
  await click('متابعة الإعداد',doc.querySelector('[role=dialog]'),150);
  const nameIn=all('input[type=text],input:not([type])').find(i=>i.closest('[role=dialog]')); await setVal(nameIn,'مشروع اختبار القالب');
  await click('حفظ',doc.querySelector('[role=dialog]'),400);
  ok(txt().includes('مشروع اختبار القالب'),'project created and opened'); 
  await click('التخطيط'); await sleep(100); await click('المهام'); await sleep(200); ok(txt().includes('الاكتشاف')&&txt().includes('كتابة المواصفة'),'template task tree copied (parents + children)');
  ok(!!btn('＋ فرعية'),'child-task action is visible without opening the overflow menu');
  const checks=all('input[type=checkbox]'); ok(checks.length>10,'leaf checkboxes rendered ('+checks.length+')');
  console.log('— complete a task & progress');
  checks[0].click(); await sleep(250); await click('نظرة عامة'); await sleep(150); ok(/\d+\/\d+ مهمة/.test(txt()),'overview shows leaf counts after completing');
  console.log('— new task form');
  await click('التخطيط'); await sleep(100); await click('المهام'); await sleep(150); await click('مهمة جديدة'); await sleep(150);
  const dlg=doc.querySelector('[role=dialog]');
  ok(!dlg.textContent.includes('المواصفة (PRD)'),'advanced task fields start collapsed');
  await click('تفاصيل إضافية',dlg,100); ok(dlg.textContent.includes('المواصفة (PRD)'),'advanced task fields can be expanded');
  const titleIn=all('input',dlg)[0]; await setVal(titleIn,'مهمة يدوية جديدة'); await click('حفظ',dlg,350);
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

  console.log('— unsaved form changes');
  await viewAs('demo_sara'); await toToday(); await openProjects(); await goSection('مهامي');
  await click('➕ مهمة'); await sleep(120);
  const dirtyDlg=doc.querySelector('[role=dialog]');
  if(dirtyDlg){
    const dirtyInput=all('input',dirtyDlg).find(i=>i.type==='text'||!i.type);
    if(dirtyInput) await setVal(dirtyInput,'تغيير لم يتم حفظه');
    let confirmCalls=0; w.confirm=()=>{confirmCalls++;return false;};
    await click('إلغاء',dirtyDlg,100);
    ok(!!doc.querySelector('[role=dialog]')&&confirmCalls===1,'cancel warns and keeps dirty form open when discard is declined');
    w.confirm=()=>{confirmCalls++;return true;};
    await click('إلغاء',doc.querySelector('[role=dialog]'),100);
    ok(!doc.querySelector('[role=dialog]')&&confirmCalls===2,'dirty form closes only after discard is confirmed');
  } else ok(false,'task form opens for unsaved-change acceptance test');
  console.log('FAILS',fails); process.exit(fails?1:0);
})().catch(e=>{console.log('HARNESS ERR',e);process.exit(2);});
