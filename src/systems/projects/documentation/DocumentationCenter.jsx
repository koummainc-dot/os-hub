import React, { useMemo, useState } from "react";
import { DOCUMENTATION_CATALOG, DOCUMENTATION_SECTIONS, DOCUMENTATION_STATUS, searchDocumentation } from "./documentationCatalog.js";
import "./documentation.css";

function Status({value}) {
  const label=DOCUMENTATION_STATUS.find(x=>x.id===value)?.label||value;
  return <span className={"pd-status pd-status-"+value}>{label}</span>;
}

export default function DocumentationCenter({onNavigate, initialArticleId="overview"}) {
  const [query,setQuery]=useState("");
  const [section,setSection]=useState("");
  const [status,setStatus]=useState("");
  const [audience,setAudience]=useState("");
  const [articleId,setArticleId]=useState(initialArticleId);
  const results=useMemo(()=>searchDocumentation(query,{section,status,audience}),[query,section,status,audience]);
  const article=DOCUMENTATION_CATALOG.find(x=>x.id===articleId)||DOCUMENTATION_CATALOG[0];
  const openTarget=()=>article?.targetPage && article.targetPage!=="documentation" && onNavigate?.(article.targetPage);
  return <div className="projects-documentation" dir="rtl">
    <header className="pd-hero">
      <div>
        <div className="pd-eyebrow">PROJECTS OS · DOCUMENTATION</div>
        <h1>مركز توثيق Projects OS</h1>
        <p>مرجع القراءة فقط مبني على الكود والاختبارات الحالية، مع فصل واضح بين المثبت والجزئي وما يحتاج تحققًا.</p>
      </div>
      <div className="pd-coverage"><strong>{DOCUMENTATION_CATALOG.length}</strong><span>سجل توثيق</span></div>
    </header>
    <div className="pd-layout">
      <aside className="pd-sidebar">
        <input aria-label="بحث التوثيق" value={query} onChange={e=>setQuery(e.target.value)} placeholder="ابحث بالعنوان أو ID أو المرجع..." />
        <select aria-label="القسم" value={section} onChange={e=>setSection(e.target.value)}><option value="">كل الأقسام</option>{DOCUMENTATION_SECTIONS.map(x=><option key={x.id} value={x.id}>{x.label}</option>)}</select>
        <select aria-label="الحالة" value={status} onChange={e=>setStatus(e.target.value)}><option value="">كل الحالات</option>{DOCUMENTATION_STATUS.map(x=><option key={x.id} value={x.id}>{x.label}</option>)}</select>
        <select aria-label="الجمهور" value={audience} onChange={e=>setAudience(e.target.value)}><option value="">كل الجماهير</option><option value="all">كل المستخدمين</option><option value="editors">المحررون</option><option value="admins">المشرفون</option></select>
        <div className="pd-results">{results.length} نتيجة</div>
        <nav aria-label="مقالات التوثيق">{results.map(item=><button key={item.id} className={"pd-result "+(item.id===article.id?"active":"")} onClick={()=>setArticleId(item.id)}><span>{item.title}</span><small>{item.id}</small></button>)}</nav>
      </aside>
      <main className="pd-article">
        <div className="pd-article-head">
          <div><span className="pd-type">{article.type}</span><Status value={article.status}/><h2>{article.title}</h2><p>{article.summary}</p></div>
          {article.targetPage && article.targetPage!=="documentation" && <button className="pd-target" onClick={openTarget}>فتح الشاشة المرتبطة ↗</button>}
        </div>
        <section className="pd-section"><h3>ما هو المثبت؟</h3><p>{article.status==="verified"?"هذا السجل مرتبط مباشرة بملفات التنفيذ المذكورة أدناه. وجوده في المركز لا يعني أن كل حالة تشغيلية حية تم قبولها؛ القبول الحي يظل منفصلًا عندما يذكر المصدر ذلك.":article.status==="partial"?"التنفيذ موجود جزئيًا، لكن جزءًا من القبول يحتاج دليلًا إضافيًا.":"لا توجد أدلة كافية في المصدر الحالي لإغلاق هذا العنصر؛ لا يتم اختراع قاعدة أو سلوك غير مثبت."}</p></section>
        <section className="pd-section"><h3>المراجع المصدرية</h3><ul>{(article.sourceRefs||[]).map(x=><li key={x}><code>{x}</code></li>)}</ul></section>
        <section className="pd-section"><h3>التصنيف</h3><div className="pd-meta"><span>القسم: {DOCUMENTATION_SECTIONS.find(x=>x.id===article.section)?.label||article.section}</span><span>الجمهور: {article.audience}</span><span>الحالة: <Status value={article.status}/></span></div></section>
        {article.id==="overview" && <section className="pd-section"><h3>قاعدة التوثيق</h3><p>النصوص التشغيلية في هذا المركز لا تعتمد على اسم الزر وحده. عند وصف وظيفة، يجب أن يمكن تتبعها إلى component وhandler/store/domain أو اختبار. العناصر التي لم يمكن إثباتها تُصنف needs-verification أو planned.</p></section>}
        {article.id==="needs-verification" && <section className="pd-section"><h3>بوابة الإغلاق</h3><p>العناصر المفتوحة تشمل القبول الحقيقي لـStorage/RLS، اختبار الحسابات المتعددة، اختبارات 360px/tablet/desktop وRTL/accessibility، offline/conflict، no-loss migration وproduction approval. لا يتم تحويلها إلى verified بمجرد وجود contract test.</p></section>}
      </main>
    </div>
  </div>;
}
