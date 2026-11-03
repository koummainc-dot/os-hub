import React, { useMemo, useState } from "react";
import { analyzeINCI, productsContainingIngredient, validateSkinIngredient } from "./domain.js";
import { INGREDIENT_CATALOG, INGREDIENT_CATALOG_VERSION, INGREDIENT_CATALOG_SOURCES } from "./ingredientCatalog.js";

const C = { ink: "#182230", muted: "#64748B", line: "#E2E8F0", white: "#FFFFFF", accent: "#A855F7", soft: "#FAF5FF", danger: "#B91C1C" };
const panel = { background: C.white, border: "1px solid " + C.line, borderRadius: 14, padding: 15, marginBottom: 12 };
const field = { width: "100%", boxSizing: "border-box", padding: "9px 10px", border: "1px solid " + C.line, borderRadius: 9, font: "inherit", color: C.ink, background: C.white };
const label = { display: "grid", gap: 5, color: C.muted, fontSize: 12, fontWeight: 650 };
const btn = (primary = false, danger = false) => ({ border: "1px solid " + (primary ? C.accent : danger ? "#FECACA" : C.line), background: primary ? C.accent : C.white, color: primary ? C.white : danger ? C.danger : C.ink, borderRadius: 9, padding: "8px 11px", font: "inherit", fontSize: 12, fontWeight: 700, cursor: "pointer" });
const EMPTY = { inciName: "", aliasesText: "", function: "", notes: "", flag: "none", source: "" };
const FLAG_LABELS = { none: "بدون وسم", favorite: "مفضل", sensitive: "حساس", avoid: "تجنب" };

export default function IngredientsView({ ingredients, deletedIngredients, products, canEdit, busy, onSave, onDelete, onRestore, onImportCatalog }) {
  const [draft, setDraft] = useState(EMPTY);
  const [editing, setEditing] = useState("");
  const [query, setQuery] = useState("");
  const [inciText, setInciText] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedIngredient, setSelectedIngredient] = useState("");
  const [importing, setImporting] = useState(false);
  const [importSummary, setImportSummary] = useState("");
  const analysis = useMemo(() => analyzeINCI(inciText, ingredients), [inciText, ingredients]);
  const filtered = useMemo(() => ingredients.filter(item => {
    const needle = query.trim().toLocaleLowerCase();
    return !needle || [item.inciName, ...(item.aliases || []), item.function].join(" ").toLocaleLowerCase().includes(needle);
  }), [ingredients, query]);
  const submit = async event => {
    event.preventDefault();
    const checked = validateSkinIngredient({ ...draft, aliases: draft.aliasesText.split(/[,،;؛\n]/) });
    if (!checked.ok) return window.alert(checked.error);
    const saved = await onSave({ ...checked.value, id: editing || undefined });
    if (saved) { setDraft(EMPTY); setEditing(""); }
  };
  const edit = item => {
    setEditing(item.id);
    setDraft({ ...EMPTY, ...item, aliasesText: (item.aliases || []).join("، ") });
  };
  const openProducts = item => setSelectedIngredient(selectedIngredient === item.id ? "" : item.id);
  return <>
    <section style={panel}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div><b>الكتالوج المرجعي</b><div style={{ color: C.muted, fontSize: 10, marginTop: 4 }}>الإصدار {INGREDIENT_CATALOG_VERSION} · {INGREDIENT_CATALOG.length} اسمًا مرجعيًا</div></div>
        {canEdit && <button type="button" style={btn(true)} disabled={busy || importing} onClick={async () => {
          setImporting(true); setImportSummary("");
          try {
            const result = await onImportCatalog(INGREDIENT_CATALOG);
            setImportSummary(result ? "أُضيف " + result.added + "، وتُرك " + result.skipped + " موجودًا دون تعديل." : "لم يكتمل الاستيراد؛ يمكنك المحاولة مرة أخرى.");
          } finally { setImporting(false); }
        }}>{importing ? "جارٍ الاستيراد…" : "استيراد الأسماء المرجعية"}</button>}
      </div>
      <p style={{ color: C.muted, fontSize: 11, lineHeight: 1.7, marginBottom: 6 }}>الاستيراد لا يغيّر المكونات الموجودة ولا وسومك أو ملاحظاتك. أضيفت الأسماء فقط؛ لم نضف تصنيف سلامة أو فعالية أو وظيفة غير موثقة.</p>
      {importSummary && <div role="status" style={{ fontSize: 11, marginTop: 8 }}>{importSummary}</div>}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, fontSize: 11, marginTop: 8 }}>
        <a href={INGREDIENT_CATALOG_SOURCES.cosing.url} target="_blank" rel="noreferrer">قاعدة CosIng التابعة للمفوضية الأوروبية</a>
        <a href={INGREDIENT_CATALOG_SOURCES.glossary.url} target="_blank" rel="noreferrer">Glossary للأسماء الشائعة</a>
        <a href={INGREDIENT_CATALOG_SOURCES.cir.url} target="_blank" rel="noreferrer">تقارير CIR لتقييمات المكونات</a>
      </div>
    </section>
    <section style={panel}>
      <b>{editing ? "تعديل المكوّن" : "إضافة مكوّن إلى مكتبتك"}</b>
      <p style={{ color: C.muted, fontSize: 11, lineHeight: 1.7 }}>المكتبة شخصية؛ الوسوم تخص تفضيلاتك وملاحظاتك ولا تمثل حكمًا طبيًا على سلامة المكوّن.</p>
      {canEdit ? <form onSubmit={submit} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10 }}>
        <label style={label}>اسم INCI<input required maxLength={120} style={field} value={draft.inciName} onChange={e => setDraft(d => ({ ...d, inciName: e.target.value }))} placeholder="Niacinamide" /></label>
        <label style={label}>الأسماء البديلة (Aliases)<input style={field} value={draft.aliasesText} onChange={e => setDraft(d => ({ ...d, aliasesText: e.target.value }))} placeholder="اسم بديل، اسم شائع" /></label>
        <label style={label}>الوظيفة العامة<input style={field} maxLength={300} value={draft.function} onChange={e => setDraft(d => ({ ...d, function: e.target.value }))} placeholder="مرطب، منظف..." /></label>
        <label style={label}>وسمك الشخصي<select style={field} value={draft.flag} onChange={e => setDraft(d => ({ ...d, flag: e.target.value }))}>{Object.entries(FLAG_LABELS).map(([value, title]) => <option key={value} value={value}>{title}</option>)}</select></label>
        <label style={{ ...label, gridColumn: "1 / -1" }}>ملاحظات<textarea style={{ ...field, minHeight: 60 }} maxLength={1200} value={draft.notes} onChange={e => setDraft(d => ({ ...d, notes: e.target.value }))} /></label>
        <label style={{ ...label, gridColumn: "1 / -1" }}>المصدر / مرجع المعلومة<input style={field} maxLength={500} value={draft.source} onChange={e => setDraft(d => ({ ...d, source: e.target.value }))} placeholder="رابط أو اسم مرجع" /></label>
        <div style={{ display: "flex", gap: 7, gridColumn: "1 / -1" }}>
          <button type="submit" style={btn(true)} disabled={busy}>{busy ? "جارٍ الحفظ…" : editing ? "حفظ التعديل" : "إضافة المكوّن"}</button>
          {editing && <button type="button" style={btn()} onClick={() => { setDraft(EMPTY); setEditing(""); }}>إلغاء</button>}
        </div>
      </form> : <p style={{ color: C.muted, fontSize: 12 }}>صلاحية العرض فقط.</p>}
    </section>

    <section style={panel}>
      <b>محلل قائمة INCI</b>
      <p style={{ color: C.muted, fontSize: 11, margin: "5px 0 10px" }}>الصق قائمة المكونات كما هي. تتم المطابقة بالاسم الكامل أو Alias مطابق بعد توحيد المسافات وحالة الأحرف؛ لا توجد مطابقة تخمينية.</p>
      <label style={{ ...label, marginBottom: 8 }}>تحميل قائمة المكونات من منتج مسجل
        <select style={field} value={selectedProductId} onChange={event => {
          const id = event.target.value;
          setSelectedProductId(id);
          const product = products.find(item => item.id === id);
          if (product) setInciText(product.ingredients || "");
        }}>
          <option value="">إدخال قائمة يدويًا</option>
          {products.map(product => <option key={product.id} value={product.id}>{product.name}</option>)}
        </select>
      </label>
      <textarea style={{ ...field, minHeight: 100, resize: "vertical" }} value={inciText} onChange={e => setInciText(e.target.value)} placeholder="Aqua, Glycerin, Niacinamide, ..." />
      {!!inciText.trim() && <div style={{ marginTop: 11 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", fontSize: 11, color: C.muted }}>
          <span>المكونات: {analysis.total}</span><span>مطابقة: {analysis.matched}</span><span>غير معروفة: {analysis.unknown.length}</span><span>وسوم تحتاج انتباهًا: {analysis.flagged.length}</span>
        </div>
        {!!analysis.matches.length && <div style={{ marginTop: 10 }}>
          <b style={{ fontSize: 12 }}>المكونات المطابقة لمكتبتك</b>
          {analysis.matches.map((match, index) => <div key={match.inputName + index} style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "8px 0", borderBottom: "1px solid " + C.line, fontSize: 12 }}>
            <span>{match.inputName} <span style={{ color: C.muted }}>→ {match.ingredient.inciName}</span></span>
            <span style={{ color: match.ingredient.flag === "avoid" ? C.danger : match.ingredient.flag === "sensitive" ? "#B45309" : C.muted }}>{FLAG_LABELS[match.ingredient.flag] || "بدون وسم"}</span>
          </div>)}
        </div>}
        {!!analysis.unknown.length && <div style={{ marginTop: 10 }}><b style={{ fontSize: 12 }}>أسماء غير موجودة في مكتبتك</b><p style={{ color: C.muted, fontSize: 11, margin: "5px 0" }}>{analysis.unknown.join("، ")}</p></div>}
        {!!analysis.flagged.length && <p style={{ background: C.soft, borderRadius: 8, padding: 9, color: C.ink, fontSize: 11, lineHeight: 1.6 }}>تحتوي القائمة على مكونات تحمل وسمًا شخصيًا «حساس» أو «تجنب». راجع ملاحظاتك ومصدر كل وسم؛ هذه النتيجة ليست تقييمًا طبيًا أو إثباتًا لضرر.</p>}
      </div>}
    </section>

    <section style={panel}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <b>مكتبتي ({ingredients.length})</b>
        <input style={{ ...field, maxWidth: 230 }} value={query} onChange={e => setQuery(e.target.value)} placeholder="ابحث عن مكوّن أو Alias" />
      </div>
      {!filtered.length && <p style={{ color: C.muted, fontSize: 12 }}>لا توجد مكونات مطابقة. أضف مكوناتك إلى المكتبة الشخصية.</p>}
      {filtered.map(item => {
        const matchedProducts = productsContainingIngredient(products, item);
        return <article key={item.id} style={{ borderTop: "1px solid " + C.line, padding: "11px 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
            <div style={{ minWidth: 160, flex: 1 }}>
              <b style={{ fontSize: 13 }}>{item.inciName}</b>
              <div style={{ color: C.muted, fontSize: 10, marginTop: 3 }}>{(item.aliases || []).join(" · ") || "لا توجد أسماء بديلة"} · {FLAG_LABELS[item.flag] || "بدون وسم"}</div>
              {item.function && <div style={{ fontSize: 11, marginTop: 5 }}>{item.function}</div>}
              {item.notes && <div style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>{item.notes}</div>}
              <button type="button" style={{ ...btn(), marginTop: 7 }} onClick={() => openProducts(item)}>المنتجات المحتوية ({matchedProducts.length})</button>
              {selectedIngredient === item.id && <div style={{ marginTop: 7, padding: 8, background: C.soft, borderRadius: 8, fontSize: 11 }}>{matchedProducts.length ? matchedProducts.map(product => <div key={product.id}>{product.name}</div>) : "لا توجد منتجات مسجلة تحتوي على تطابق حرفي لهذا المكوّن."}</div>}
              {item.source && <div style={{ color: C.muted, fontSize: 10, marginTop: 5 }}>المصدر: {item.source}</div>}
              {item.referenceUrl && <div style={{ fontSize: 10, marginTop: 4 }}><a href={item.referenceUrl} target="_blank" rel="noreferrer">فتح المرجع</a></div>}
            </div>
            {canEdit && <div style={{ display: "flex", gap: 6 }}>
              <button type="button" style={btn()} onClick={() => edit(item)}>تعديل</button>
              <button type="button" style={btn(false, true)} onClick={() => onDelete(item)}>حذف</button>
            </div>}
          </div>
        </article>;
      })}
      {!!deletedIngredients.length && <details style={{ borderTop: "1px solid " + C.line, paddingTop: 10 }}><summary style={{ cursor: "pointer", color: C.muted, fontSize: 12 }}>المحذوفات ({deletedIngredients.length})</summary>
        {deletedIngredients.map(item => <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, padding: "8px 0" }}><span style={{ fontSize: 12 }}>{item.inciName}</span>{canEdit && <button type="button" style={btn()} onClick={() => onRestore(item)}>استعادة</button>}</div>)}
      </details>}
    </section>
  </>;
}
