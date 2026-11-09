const {makeEnv,sleep,appJs}=require('./harness');
(async()=>{
  const {w,errors}=makeEnv(); w.eval(appJs); await sleep(500);
  const doc=w.document; const txt=()=>doc.getElementById('root').textContent;
  const all=(s,sc)=>[...(sc||doc).querySelectorAll(s)];
  let fails=0; const ok=(c,m)=>{if(!c)fails++;console.log(c?'  ✓':'  ✗',m);};
  const btn=(label,sc)=>all('button',sc).find(b=>b.textContent.includes(label));
  const click=async(label,sc,ms)=>{const b=btn(label,sc);if(!b)return false;b.click();await sleep(ms||150);return true;};
  const setVal=async(el,v)=>{if(!el)throw new Error('Acceptance harness could not find the expected form control');const proto=el.tagName==='SELECT'?w.HTMLSelectElement.prototype:el.tagName==='TEXTAREA'?w.HTMLTextAreaElement.prototype:w.HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(el,v);el.dispatchEvent(new w.Event(el.tagName==='SELECT'?'change':'input',{bubbles:true}));await sleep(60);};
  const nav=()=>all('aside button');
  const isSectionButton=(button,label)=>[...button.querySelectorAll('span')].some(span=>span.textContent.trim().startsWith(label));
  const goSection=async(label)=>{const b=nav().find(x=>x.getAttribute('aria-label')===label)||nav().find(x=>isSectionButton(x,label));if(!b)return false;b.click();await sleep(450);return true;};
  const toToday=async()=>{const c=all('aside button').find(x=>x.textContent.includes('▾'));c&&c.click();await sleep(60);const t=all('aside button').find(x=>x.textContent.includes('اليوم (كل الأنظمة)'));t&&t.click();await sleep(80);};
  const openProjects=async()=>{
    await toToday();
    let t=all('main button').find(b=>b.textContent.trim()==='Projects OS' || b.textContent.includes('Projects OS'));
    if(t){t.click();await sleep(500);}
    if(!nav().some(b=>isSectionButton(b,'المشاريع'))){
      const switcher=all('aside button').find(b=>b.textContent.includes('OS Hub') || b.textContent.includes('المشاريع'));
      if(switcher){switcher.click();await sleep(80);}
      const p=all('button').find(b=>b.textContent.includes('Projects OS'));
      if(p){p.click();await sleep(500);}
    }
    return nav().some(b=>b.textContent.includes('المشاريع'));
  };
  const viewAs=async(v)=>{const sel=all('select').find(s=>[...s.options].some(o=>o.value==='owner'));await setVal(sel,v);await sleep(300);};

  await click('جرّب الوضع التجريبي'); await sleep(200); ok(await openProjects(),'Projects OS opens before section acceptance');
  console.log('— sections render real content');
  const markers={ 'الرئيسية':'صحة المشاريع','اليوم':'مستحقة اليوم','هذا الأسبوع':'اكتشافات قيد العمل','المشاريع':'تطبيق إدارة الوقت','مهامي':'كل المهام','الاكتشاف':'ظهور التطبيق في نتائج المتجر','المواصفات':'مواصفة تطبيق إدارة الوقت','الأهداف (OKR)':'إطلاق منتج ناجح','المخرجات':'Wireframes','المخاطر والمشاكل والقرارات':'تعقيد المزامنة','الاجتماعات':'Knowledge OS','التحديثات':'تحديث الإدارة','الإنجازات':'اعتماد المواصفة','المراجعات الأسبوعية':'المراجعات الأسبوعية','جهات الاتصال':'ليلى المنصور','الفريق':'حِمل الأسبوع','القوالب':'قوالب المشاريع','الإعدادات':'المنطقة الزمنية' };
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
    if(!(opened&&!!dialog&&dialog.textContent.includes(expected))) console.log('  DEBUG detail',title,{opened,dialog:dialog?.textContent?.slice(0,500),buttons:all('button').map(b=>b.textContent.trim()).filter(x=>x.includes('عرض')||x.includes('تفاصيل')).slice(0,12),section:txt().slice(-900)});
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
  if(!projectRow) console.log('  DEBUG projects',{nav:nav().map(b=>b.textContent.trim()),rows:all('tr').map(r=>r.textContent.trim()).slice(0,12),main:all('main').map(m=>m.textContent.slice(-1600)),buttons:all('main button').map(x=>x.textContent.trim()).slice(0,35)});
  if(projectRow){projectRow.click();await sleep(350);}
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
  if(projectRowForKr){projectRowForKr.click();await sleep(350);}
  const goalsGroupForKr=all('main button').find(b=>b.textContent.trim().startsWith('الأهداف'));
  if(goalsGroupForKr){goalsGroupForKr.click();await sleep(100);}
  const krLink=all('main button').find(b=>b.textContent.includes('إكمال مشروعَي الإطلاق'));
  ok(!!krLink,'Project Goals exposes the linked Key Result as a link');
  if(krLink){krLink.click();await sleep(250);}
  ok(txt().includes('الأهداف والنتائج الرئيسية'),'Key Result link opens the global OKR destination');
  ok(!!doc.getElementById('projects-okr-kr-kr_proj'),'Key Result navigation focuses the exact KR record');
  await goSection('المشاريع');
  const projectRowForGovernance=all('tr').find(el=>el.textContent.includes('تطبيق إدارة الوقت'));
  if(projectRowForGovernance){projectRowForGovernance.click();await sleep(350);}
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
  ok(!!tdlg,'custom template editor dialog is rendered');
  const templateNameInput=all('input',tdlg).find(x=>x.type==='text'||!x.type);
  ok(!!templateNameInput,'custom template editor exposes its name input');
  if(tdlg&&templateNameInput) await setVal(templateNameInput,'قالب اختبار غير صالح');
  const treeInput=all('textarea',tdlg).find(x=>x.parentElement?.textContent.includes('شجرة المهام')) || all('textarea',tdlg)[0]; ok(!!treeInput,'template editor exposes task tree input'); if(treeInput) await setVal(treeInput,'مهمة رئيسية\n    مستوى متخطى');
  if(tdlg){
    await click('حفظ',tdlg,200);
    ok(tdlg.textContent.includes('لا يمكن تخطي مستوى كامل'),'invalid task-tree indentation is rejected with a useful message');
    w.confirm=()=>true; await click('إلغاء',tdlg,100);
  }

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
  const timelineMode=all('main button').find(b=>b.textContent.trim()==='خط زمني'); ok(!!timelineMode,'task timeline view is available'); if(timelineMode){timelineMode.click();await sleep(100);ok(txt().includes('الخط الزمني للمهام'),'task timeline renders');}
  const tableMode=all('main button').find(b=>b.textContent.trim()==='جدول');
  ok(!!tableMode,'task table view is available');
  if(tableMode){tableMode.click();await sleep(120);}
  const taskRow=all('tr').find(r=>r.textContent.includes('مهمة إضافة سريعة'));
  ok(!!taskRow,'table view renders the quick-added task');
  let taskTitleForAcceptance='مهمة إضافة سريعة';
  if(taskRow){
    const title=taskRow.querySelector('span');
    if(title){title.dispatchEvent(new w.MouseEvent('dblclick',{bubbles:true}));await sleep(60);}
    const editInput=[...taskRow.querySelectorAll('input')].find(input=>input.type==='text');
    ok(!!editInput,'task title supports inline editing');
    if(editInput){await setVal(editInput,'مهمة إضافة سريعة — معدلة');editInput.blur();await sleep(450);}
  }
  const editedTaskRow=all('tr').find(r=>r.textContent.includes('مهمة إضافة سريعة — معدلة'));
  ok(!!editedTaskRow,'inline task title edit persists after blur');
  if(editedTaskRow) taskTitleForAcceptance='مهمة إضافة سريعة — معدلة';
  const rowForSheet=editedTaskRow||all('tr').find(r=>r.textContent.includes('مهمة إضافة سريعة'));
  if(rowForSheet){
    const taskTitle=rowForSheet.querySelector('span');
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
      const closeSheet=sheet.querySelector('button[aria-label="إغلاق"]'); closeSheet&&closeSheet.click(); await sleep(120);
    }
  }
  const taskStatusFilter=all('select').find(s=>[...s.options].some(o=>o.value==='open')&&[...s.options].some(o=>o.value==='all'));
  ok(!!taskStatusFilter,'task status filter is available for bulk acceptance');
  if(taskStatusFilter) await setVal(taskStatusFilter,'all');
  const freshTaskRow=all('tr').find(r=>r.textContent.includes(taskTitleForAcceptance));
  const rowCheck=freshTaskRow?.querySelector('input[type="checkbox"]');
  if(rowCheck) rowCheck.click();
  await sleep(50);
  ok(txt().includes('تم تحديد 1'),'bulk selection toolbar appears after selecting a task');
  if(!txt().includes('تم تحديد 1')) console.log('  DEBUG bulk',{title:taskTitleForAcceptance,row:freshTaskRow?.textContent,rows:all('tr').map(r=>r.textContent.trim()),checkboxes:all('input[type=checkbox]').length,selected:all('main').map(m=>m.textContent.slice(0,800))});
  ok(!!btn('✔ إكمال'),'bulk completion action is available');
  if(btn('✔ إكمال')){w.confirm=()=>true;await click('✔ إكمال',null,180);}
  const quickTaskAfter=all('tr').find(r=>r.textContent.includes(taskTitleForAcceptance));
  ok(!!quickTaskAfter,'bulk action keeps the task in the table after status update');
  if(quickTaskAfter) ok(quickTaskAfter.textContent.includes('مكتملة'),'bulk completion updates task status');
  await goSection('المشاريع');
  const pRow=all('tr').find(r=>r.textContent.includes('تطبيق إدارة الوقت'));
  if(pRow){pRow.querySelector('td')?.click();await sleep(180);}
  await click('التخطيط',null,120);
  const taskTab=all('button').find(b=>b.textContent.trim().startsWith('المهام'));
  if(taskTab){taskTab.click();await sleep(120);}
  const taskLink=all('span').find(s=>s.textContent===taskTitleForAcceptance);
  if(taskLink){taskLink.click();await sleep(120);}
  ok(typeof w.location.hash==='string'&&w.location.hash.includes('/p/')&&w.location.hash.includes('task='),'opening an exact task writes a deep-link hash');
  ok(w.location.hash.includes('task='),'task deep link preserves exact task focus');
  const hashBefore=w.location.hash;
  if(hashBefore){w.location.hash=hashBefore.replace('task=','task=missing-');w.dispatchEvent(new w.PopStateEvent('popstate'));await sleep(60);}
  await click('← المشاريع',null,120);
  ok(errors.length===0,'no console errors in Phase A task UX flow ('+errors.length+')'); if(errors.length){console.log(errors.slice(0,4));errors.length=0;}

  console.log('— task search recovery');
  const myWorkOpened = await goSection('مهامي');
  const allTasksOpened = await click('كل المهام',null,120);
  ok(myWorkOpened && allTasksOpened,'My Work opens its all-tasks view before search recovery');
  const taskSearch=all('input').find(i=>i.placeholder==='بحث في المهام…');
  if(!myWorkOpened || !allTasksOpened || !taskSearch) console.log('DEBUG My Work navigation',{myWorkOpened,allTasksOpened,nav:nav().map(b=>({label:b.getAttribute('aria-label'),id:b.getAttribute('data-section-id'),text:b.textContent.trim()})),main:all('main').map(m=>m.textContent.slice(0,1500)),inputs:all('input').map(x=>({placeholder:x.placeholder,type:x.type}))});
  await setVal(taskSearch,'no-task-will-match-xyz');
  ok(!!btn('مسح الفلاتر'),'clear-filters action appears after narrowing task search');
  await click('مسح الفلاتر',null,150);
  ok(taskSearch.value==='','clear-filters resets the task search input');

  console.log('— dashboard health');
  await goSection('الرئيسية'); ok(txt().includes('حرج'),'overdue/past-deadline project is Red (حرج)'); ok(txt().includes('مشاكل حرجة'),'critical issues card');

  console.log('— create project from template');
  
  await goSection('المشاريع'); ok(await click('من قالب'),'template picker opens');
  let picker=doc.querySelector('[role=dialog]');
  const card=all('[role="dialog"] > div > div > div').find(d=>d.style.cursor==='pointer'&&d.textContent.includes('تطبيق'));
  ok(!!card,'template picker exposes a selectable project template');
  if(card)card.click(); await sleep(180);
  picker=doc.querySelector('[role=dialog]');
  ok(!!picker&&picker.textContent.includes('معاينة القالب'),'selecting a template opens its preview');
  await click('متابعة الإعداد',picker,180);
  const setupDlg=doc.querySelector('[role=dialog]');
  const nameIn=all('input',setupDlg).find(i=>i.type==='text'||!i.type);
  ok(!!nameIn,'template setup exposes the project name input');
  if(nameIn) await setVal(nameIn,'مشروع اختبار القالب');
  await click('حفظ',doc.querySelector('[role=dialog]'),400);
  ok(txt().includes('مشروع اختبار القالب'),'project created and opened'); 
  await click('التخطيط'); await sleep(100); await click('المهام'); await sleep(200); ok(txt().includes('الاكتشاف')&&txt().includes('كتابة المواصفة'),'template task tree copied (parents + children)');
  ok(!!btn('＋ فرعية'),'child-task action is visible without opening the overflow menu');
  const checks=all('input[type=checkbox]'); ok(checks.length>10,'leaf checkboxes rendered ('+checks.length+')');
  console.log('— complete a task & progress');
  if(checks[0]){ checks[0].click(); await sleep(250); await click('نظرة عامة'); await sleep(150); ok(/\d+\/\d+ مهمة/.test(txt()),'overview shows leaf counts after completing'); }
  else ok(false,'a leaf checkbox is available for completion acceptance');
  console.log('— new task form');
  await click('التخطيط'); await sleep(100); await click('المهام'); await sleep(150); await click('مهمة جديدة'); await sleep(150);
  const dlg=doc.querySelector('[role=dialog]');
  ok(!!dlg&& !dlg.textContent.includes('المواصفة (PRD)'),'advanced task fields start collapsed');
  if(dlg){
    await click('تفاصيل إضافية',dlg,100); ok(dlg.textContent.includes('المواصفة (PRD)'),'advanced task fields can be expanded');
    const titleIn=all('input',dlg)[0]; ok(!!titleIn,'new task form exposes a title input');
    if(titleIn) await setVal(titleIn,'مهمة يدوية جديدة');
    await click('حفظ',dlg,350);
  }
  ok(txt().includes('مهمة يدوية جديدة'),'task created in tree');

  console.log('— task sheet + timer');
  const taskSpan=all('span').find(s=>s.textContent==='مهمة يدوية جديدة'); taskSpan&&taskSpan.click(); await sleep(250);
  ok(!!doc.querySelector('[role=dialog]'),'task sheet opens'); await click('ابدأ المؤقّت'); await sleep(250); ok(txt().includes('إيقاف'),'timer bar visible'); await click('أوقف المؤقّت',doc.querySelector('[role=dialog]'),250);
  ok(errors.length===0,'no errors in project/task flows ('+errors.length+')'); if(errors.length){console.log(errors.slice(0,4));errors.length=0;}
  const x=doc.querySelector('[role=dialog] button[aria-label="إغلاق"]'); x&&x.click(); await sleep(100);

  console.log('— Ventures Email Check → Projects Risk bridge');
  await goSection('المشاريع'); await click('← المشاريع',null,100);
  const bridgeProjectRow=all('tr').find(r=>r.textContent.includes('تطبيق إدارة الوقت'));
  ok(!!bridgeProjectRow,'bridge test project is available');
  if(bridgeProjectRow) bridgeProjectRow.click();
  await sleep(220); await click('الحوكمة',null,100); await click('المخاطر',null,120);
  const bridgePayload={id:'email-check-acceptance-1',title:'Email Check bridge acceptance',status:'Open',kind:'Risk',source:'ventures_email',source_record_id:'email-check-acceptance-1',project_id:'p_app',risk:'High',probability:4,impact:4,description:'Risk created from Ventures Email Check acceptance',module:'Email'};
  const bridgeEvent={workspaceId:'demo_ws',systemId:'projects',action:'create_risk',recordId:bridgePayload.id,payload:bridgePayload,source:'ventures'};
  let bridgeResult=null; const captureBridgeResult=e=>{if(e.detail?.systemId==='projects'&&e.detail?.source==='ventures')bridgeResult=e.detail;};
  w.addEventListener('os:source-write-result',captureBridgeResult);
  w.dispatchEvent(new w.CustomEvent('os:source-write',{detail:bridgeEvent})); await sleep(450);
  ok(bridgeResult?.ok===true,'Ventures Email Check receives a successful Projects write acknowledgement'+(bridgeResult?.error?': '+bridgeResult.error:''));
  ok(txt().includes(bridgePayload.title),'Ventures Email Check event creates a permission-checked Projects risk');
  if(!bridgeResult?.ok||!txt().includes(bridgePayload.title)) console.log('  DEBUG Ventures bridge',{bridgeResult,workspace:'demo_ws',text:txt().slice(-1800),errors:errors.slice(-8),nav:nav().map(b=>b.textContent.trim())});
  w.dispatchEvent(new w.CustomEvent('os:source-write',{detail:bridgeEvent})); await sleep(250);
  ok(txt().split(bridgePayload.title).length-1===1,'repeated Ventures Email Check does not create a duplicate risk');
  w.removeEventListener('os:source-write-result',captureBridgeResult);

  console.log('— Knowledge meeting follow-ups → Projects tasks');
  const meetingTaskPayload={meeting_id:'knowledge-meeting-acceptance',project_id:'p_app',tasks:[{title:'متابعة اجتماع: مراجعة خطة الإطلاق',project_id:'p_app',status:'Not Started',priority:'Medium',planning_bucket:'Inbox',source_record_id:'knowledge-meeting-acceptance:0'}]};
  const meetingTaskEvent={workspaceId:'demo_ws',systemId:'projects',action:'create_meeting_tasks',recordId:'knowledge-meeting:acceptance:followups',payload:meetingTaskPayload,source:'knowledge'};
  let meetingTaskResult=null; const captureMeetingTaskResult=e=>{if(e.detail?.systemId==='projects'&&e.detail?.source==='knowledge')meetingTaskResult=e.detail;};
  w.addEventListener('os:source-write-result',captureMeetingTaskResult);
  w.dispatchEvent(new w.CustomEvent('os:source-write',{detail:meetingTaskEvent})); await sleep(350);
  ok(meetingTaskResult?.ok===true,'Knowledge meeting action receives a successful Projects task acknowledgement'+(meetingTaskResult?.error?': '+meetingTaskResult.error:''));
  await goSection('مهامي'); await sleep(260);
  const assigneeFilter=all('select').find(s=>[...s.options].some(o=>o.value==='none')&&[...s.options].some(o=>o.value==='all'));
  if(assigneeFilter) { await setVal(assigneeFilter,'all'); await sleep(120); }
  if(!txt().includes('متابعة اجتماع: مراجعة خطة الإطلاق')) console.log('  DEBUG Knowledge task visibility',{meetingTaskResult,text:txt().slice(-2600),nav:nav().map(b=>b.textContent.trim()),errors:errors.slice(-8)});
  ok(txt().includes('متابعة اجتماع: مراجعة خطة الإطلاق'),'meeting follow-up is visible as a Projects task');
  w.dispatchEvent(new w.CustomEvent('os:source-write',{detail:meetingTaskEvent})); await sleep(220);
  ok(txt().split('متابعة اجتماع: مراجعة خطة الإطلاق').length-1===1,'repeated meeting action does not create a duplicate task');
  w.removeEventListener('os:source-write-result',captureMeetingTaskResult);

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
