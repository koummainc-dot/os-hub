const {makeEnv,sleep,appJs}=require('./harness');
(async()=>{
  const {w,errors}=makeEnv();
  w.eval(appJs);
  await sleep(600);
  const doc=w.document; const txt=()=>doc.getElementById('root').textContent;
  const btn=(label)=>[...doc.querySelectorAll('button,a,select,div[onclick]')].find(b=>b.textContent&&b.textContent.includes(label));
  const click=async(label)=>{const b=[...doc.querySelectorAll('button')].find(x=>x.textContent.includes(label)); if(!b){console.log('  !! no button',label);return false;} b.click(); await sleep(150); return true;};
  console.log('AUTH screen:',txt().includes('إنشاء حساب'),txt().includes('الوضع التجريبي'));
  await click('جرّب الوضع التجريبي'); await sleep(200);
  console.log('TODAY:',txt().includes('أنظمتك (14)'), txt().includes('Content OS'), 'errors so far:',errors.length);
  console.log(txt().slice(0,300));
  console.log('ERRORS',errors.slice(0,10));
})();
