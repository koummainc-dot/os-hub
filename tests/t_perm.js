const {makeEnv,sleep,appJs}=require('./harness');
(async()=>{
  const {w,errors}=makeEnv(); w.eval(appJs); await sleep(500);
  const doc=w.document; const txt=()=>doc.getElementById('root').textContent;
  const all=(sel)=>[...doc.querySelectorAll(sel)];
  const clickBtn=async(label,scope)=>{const b=all(scope||'button').find(x=>x.textContent.includes(label)); if(!b)return false; b.click(); await sleep(150); return true;};
  const setVal=async(el,v)=>{const proto=el.tagName==='SELECT'?w.HTMLSelectElement.prototype:el.tagName==='TEXTAREA'?w.HTMLTextAreaElement.prototype:w.HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(el,v);el.dispatchEvent(new w.Event(el.tagName==='SELECT'?'change':'input',{bubbles:true}));await sleep(100);};
  const navItems=()=>all('aside > div:nth-child(2) > button').map(b=>b.textContent);
  const tileTitles=()=>all('main button').map(b=>b.textContent);
  const toToday=async()=>{const c=all('aside button').find(x=>x.textContent.includes('▾')); c&&c.click(); await sleep(60); const t=all('aside button').find(x=>x.textContent.includes('اليوم (كل الأنظمة)')); t&&t.click(); await sleep(80);};
  const openSys=async(name)=>{await toToday(); const t=all('main button').find(b=>b.textContent.includes(name)); if(!t) return false; t.click(); await sleep(350); return true;};
  const viewAs=async(v)=>{const sel=all('select').find(s=>[...s.options].some(o=>o.value==='owner')); await setVal(sel,v); await sleep(200);};
  let fails=0; const ok=(c,m)=>{if(!c)fails++; console.log(c?'  ✓':'  ✗',m);};
  await clickBtn('جرّب الوضع التجريبي'); await sleep(200);

  console.log('— owner');
  ok(tileTitles().filter(t=>/OS/.test(t)).length===14,'owner sees 14 system tiles');
  await openSys('Content OS'); const ownerNav=navItems(); ok(ownerNav.length===11,'owner: ContentOS nav has 11 sections ('+ownerNav.length+')');

  console.log('— view as Sara (edit; finance=view; spiritual/relationships none; content hides analytics/team/settings)');
  await viewAs('demo_sara'); await toToday();
  const sTiles=tileTitles(); ok(!sTiles.some(t=>t.includes('Spiritual'))&&!sTiles.some(t=>t.includes('Relationships')),'Sara: Spiritual & Relationships hidden');
  ok(sTiles.some(t=>t.includes('Finance OS')&&t.includes('عرض فقط')),'Sara: Finance tile labelled عرض فقط');
  await openSys('Content OS'); const sNav=navItems().join('|');
  ok(!sNav.includes('التحليلات')&&!sNav.includes('الفريق')&&!sNav.includes('الإعدادات'),'Sara: ContentOS hides analytics/team/settings → '+navItems().length+' sections');
  await openSys('Finance OS'); ok(!navItems().join('|').includes('الإعدادات والأمان'),'Sara: Finance settings hidden (no manage)');
  ok(txt().includes('عرض فقط'),'Sara: Finance banner shows عرض فقط');
  await openSys('Projects OS'); ok(navItems().join('|').includes('الإعدادات'),'Sara: Projects settings visible (manage=true)');
  await openSys('Habit OS'); const hn=navItems().join('|'); ok(!hn.includes('الجورنال')&&!hn.includes('التعافي')&&!hn.includes('الإعدادات')&&hn.includes('العادات'),'Sara: Habit OS hides journal + relapses + settings → '+navItems().length+' sections');

  console.log('— view as Layla (view only)');
  await viewAs('demo_layla'); await toToday();
  const lTiles=tileTitles(); ok(!lTiles.some(t=>t.includes('Finance OS'))&&!lTiles.some(t=>t.includes('Nutrition'))&&!lTiles.some(t=>t.includes('Habit OS')),'Layla: Finance, Nutrition & Habit hidden');
  await openSys('Content OS'); ok(txt().length>200&&errors.length===0,'Layla: ContentOS opens read-only without errors; nav='+navItems().length);
  const team=all('aside > div:nth-child(2) > button').find(b=>b.textContent.includes('الفريق')); ok(!team,'Layla: ContentOS team section hidden');

  console.log('— back to owner: Team page invite flow');
  await viewAs('owner'); await toToday();
  all('aside > div:nth-child(2) > button').find(b=>b.textContent.includes('الفريق والصلاحيات')).click(); await sleep(200);
  ok(txt().includes('سارة أحمد')&&txt().includes('ليلى حسن')&&txt().includes('omar@demo.app'),'Team page lists members + pending invite');
  const em=all('input[type=email]')[0]; await setVal(em,'new@person.com');
  await clickBtn('إرسال الدعوة'); ok(txt().includes('اختر نظاماً واحداً'),'invite without system → validation toast');
  await clickBtn('عرض (عدا الحساسة)'); await clickBtn('إرسال الدعوة'); await sleep(200);
  ok(txt().includes('new@person.com'),'invite created → appears in pending list');
  await clickBtn('✎ الصلاحيات'); ok(txt().includes('تخصيص الأقسام')||all('button').some(b=>b.textContent.includes('تخصيص الأقسام')),'access editor opens');
  const cust=all('button').find(b=>b.textContent.includes('تخصيص الأقسام')); cust&&cust.click(); await sleep(120);
  ok(all('select').length>3,'section-level overrides rendered');
  await clickBtn('إلغاء'); 
  ok(errors.length===0,'no console errors in team flows ('+errors.length+')'); if(errors.length)console.log(errors.slice(0,3));

  console.log('— Invitations: accept demo invite');
  all('aside > div:nth-child(2) > button').find(b=>b.textContent.includes('الدعوات')).click(); await sleep(150);
  ok(txt().includes('أحمد منصور')&&txt().includes('مشاريع الشركة'),'incoming invite shown with message');
  await clickBtn('✓ قبول'); await sleep(300);
  const wsSel=all('aside select')[0]; ok(!!wsSel&&[...wsSel.options].length===2,'workspace switcher now has 2 workspaces');
  ok(txt().includes('مساحة أحمد'),'switched into Ahmed workspace');
  const t2=tileTitles(); ok(t2.filter(t=>/OS/.test(t)).length===3,'Ahmed workspace: only 3 systems visible (projects/knowledge/content) → '+t2.filter(t=>/OS/.test(t)).length);
  await openSys('Content OS'); const n2=navItems().join('|'); ok(!n2.includes('الفريق')&&!n2.includes('الإعدادات'),'Ahmed/ContentOS: team+settings hidden, view-only');
  all('aside > div:nth-child(2) > button')[0]&&0;
  console.log('ERRORS',errors.slice(0,5));
  console.log('FAILS',fails);
})().catch(e=>console.log('HARNESS ERR',e));
