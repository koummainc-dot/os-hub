import React, { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../core/supabase.js";

const GREEN = "#16A36A";
const INK = "#17231D";
const MUTED = "#718078";
const LINE = "#E4EBE6";
const BG = "#F5F8F5";
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo" }).format(new Date());
const localDate = (v) => v || today();
const uid = () => globalThis.crypto?.randomUUID?.() || "op-" + Date.now() + "-" + Math.random().toString(16).slice(2);
const normalizeName = (v) => String(v || "").normalize("NFKC").toLowerCase().replace(/[\u064B-\u065F\u0670\u0640]/g, "").replace(/[أإآ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه").replace(/\s+/g, " ").trim();
const emptyFood = () => ({ name: "", name_aliases: "", brand: "", basis_type: "per_100g", basis_qty: "100", serving_size: "", serving_unit: "", density_g_per_ml: "", state: "na", calories_kcal: "", protein_g: "", carbs_g: "", fat_g: "", fiber_g: "", sugar_g: "", sodium_mg: "", is_beverage: false });
const emptyQuick = () => ({ display_name: "", calories_kcal: "", protein_g: "", carbs_g: "", fat_g: "", venue_label: "", range_min_kcal: "", range_max_kcal: "", estimation_method: "visual_estimate", notes: "" });
const demoSeed = () => ({ foods: [], meals: [], entries: [], water: [], settings: { display_mode: "Full", energy_unit: "kcal", timezone: "Africa/Cairo" }, mealTypes: [{ id: "demo-breakfast", code: "breakfast", label_ar: "فطار", position: 0 }, { id: "demo-lunch", code: "lunch", label_ar: "غداء", position: 1 }, { id: "demo-dinner", code: "dinner", label_ar: "عشاء", position: 2 }, { id: "demo-snack", code: "snack", label_ar: "سناك", position: 3 }] });

function Card({ children, style = {} }) { return <section style={{ background: "#fff", border: "1px solid " + LINE, borderRadius: 16, padding: 18, ...style }}>{children}</section>; }
function Button({ children, onClick, secondary = false, disabled = false, style = {}, type = "button", form }) { return <button type={type} form={form} disabled={disabled} onClick={onClick} style={{ border: "1px solid " + (secondary ? LINE : GREEN), background: secondary ? "#fff" : GREEN, color: secondary ? INK : "#fff", borderRadius: 10, padding: "10px 14px", fontWeight: 750, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? .55 : 1, fontFamily: "inherit", fontSize: 13, ...style }}>{children}</button>; }
function Field({ label, children }) { return <label style={{ display: "grid", gap: 6, color: "#46544B", fontSize: 12, fontWeight: 700 }}>{label}{children}</label>; }
const inputStyle = { width: "100%", minWidth: 0, border: "1px solid #D8E2DB", borderRadius: 9, padding: "10px 11px", background: "#fff", color: INK, font: "inherit", fontSize: 13, boxSizing: "border-box" };
function Input(props) { return <input {...props} style={{ ...inputStyle, ...(props.style || {}) }} />; }
function Select(props) { return <select {...props} style={{ ...inputStyle, ...(props.style || {}) }}>{props.children}</select>; }
function Metric({ label, value, suffix = "" }) { return <div style={{ minWidth: 0 }}><div style={{ fontSize: 11, color: MUTED, marginBottom: 5 }}>{label}</div><div style={{ fontSize: 21, fontWeight: 800, color: INK, overflowWrap: "anywhere" }}>{value}{suffix && <small style={{ fontSize: 11, color: MUTED, marginRight: 4 }}>{suffix}</small>}</div></div>; }
function Empty({ title, detail }) { return <div style={{ textAlign: "center", padding: "34px 12px", color: MUTED }}><div style={{ fontSize: 30, marginBottom: 8 }}>🥗</div><b style={{ color: INK }}>{title}</b><div style={{ marginTop: 6, fontSize: 12 }}>{detail}</div></div>; }
function Modal({ title, onClose, children, footer }) { return <div onMouseDown={e => e.target === e.currentTarget && onClose()} style={{ position: "fixed", inset: 0, background: "#0f172a66", zIndex: 1000, display: "grid", placeItems: "center", padding: 14 }}><div style={{ width: "min(620px,100%)", maxHeight: "92vh", overflow: "auto", background: "#fff", borderRadius: 18, boxShadow: "0 20px 70px #0003" }}><div style={{ padding: "16px 18px", borderBottom: "1px solid " + LINE, display: "flex", alignItems: "center" }}><b style={{ flex: 1 }}>{title}</b><button onClick={onClose} style={{ border: 0, background: "transparent", fontSize: 22, cursor: "pointer" }}>×</button></div><div style={{ padding: 18 }}>{children}</div>{footer && <div style={{ padding: 16, borderTop: "1px solid " + LINE, display: "flex", gap: 8, flexWrap: "wrap" }}>{footer}</div>}</div></div>; }

export default function NutritionOS({ ws, access, isDemo = false, api, page = "today", setPage, shell }) {
  const [foods, setFoods] = useState([]);
  const [meals, setMeals] = useState([]);
  const [entries, setEntries] = useState([]);
  const [water, setWater] = useState([]);
  const [mealTypes, setMealTypes] = useState([]);
  const [settings, setSettings] = useState({ display_mode: "Full", energy_unit: "kcal", timezone: "Africa/Cairo" });
  const [selectedDate, setSelectedDate] = useState(today());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [foodFilter, setFoodFilter] = useState("all");
  const [showFood, setShowFood] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [showQuick, setShowQuick] = useState(false);
  const [editEntry, setEditEntry] = useState(null);
  const [editForm, setEditForm] = useState({ display_name: "", calories_kcal: "", protein_g: "", carbs_g: "", fat_g: "", notes: "" });
  const [foodForm, setFoodForm] = useState(emptyFood);
  const [logForm, setLogForm] = useState({ food_id: "", quantity: "100", unit_code: "g", meal_type_id: "", logged_at: new Date().toISOString().slice(0,16) });
  const [quickForm, setQuickForm] = useState(emptyQuick);
  const [waterAmount, setWaterAmount] = useState("250");
  const canEdit = isDemo || access?.level === "edit" || access?.manage || access?.owner;
  const section = page || "today";
  const go = id => setPage && setPage(id);
  const notify = msg => { setNotice(msg); if (shell?.toast) shell.toast(msg); };

  const persistDemo = useCallback(async (patch) => {
    if (!isDemo || !api?.save) return;
    await api.save({ foods, meals, entries, water, settings, mealTypes, ...patch });
  }, [isDemo, api, foods, meals, entries, water, settings, mealTypes]);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      if (isDemo) {
        const r = await api?.load?.();
        const d = r?.data || demoSeed();
        setFoods(d.foods || []); setMeals(d.meals || []); setEntries(d.entries || []); setWater(d.water || []);
        setSettings(d.settings || demoSeed().settings); setMealTypes(d.mealTypes || demoSeed().mealTypes);
        setLoading(false); return;
      }
      if (!ws?.id) throw new Error("لم يتم تحديد مساحة العمل");
      const [fr, mr, er, wr, tr, sr] = await Promise.all([
        supabase.from("nutrition_foods").select("*").eq("workspace_id", ws.id).is("archived_at", null).order("name"),
        supabase.from("nutrition_meals").select("*").eq("workspace_id", ws.id).eq("local_date", selectedDate).order("time_at"),
        supabase.from("nutrition_food_log_entries").select("*").eq("workspace_id", ws.id).eq("local_date", selectedDate).order("logged_at"),
        supabase.from("nutrition_water_logs").select("*").eq("workspace_id", ws.id).eq("local_date", selectedDate).order("logged_at"),
        supabase.from("nutrition_meal_types").select("*").eq("workspace_id", ws.id).eq("is_active", true).order("position"),
        supabase.from("nutrition_settings").select("*").eq("workspace_id", ws.id).maybeSingle()
      ]);
      for (const r of [fr,mr,er,wr,tr]) if (r.error) throw r.error;
      setFoods(fr.data || []); setMeals(mr.data || []); setEntries(er.data || []); setWater(wr.data || []); setMealTypes(tr.data || []);
      let st = sr.data;
      if (!st && canEdit) {
        const { data, error: se } = await supabase.from("nutrition_settings").insert({ workspace_id: ws.id, created_by: (await supabase.auth.getUser()).data.user?.id }).select("*").single();
        if (se) throw se; st = data;
      }
      setSettings(st || { display_mode: "Full", energy_unit: "kcal", timezone: "Africa/Cairo" });
      if (!(tr.data || []).length && canEdit) {
        const defaults = [{code:"breakfast",label_ar:"فطار",position:0},{code:"lunch",label_ar:"غداء",position:1},{code:"dinner",label_ar:"عشاء",position:2},{code:"snack",label_ar:"سناك",position:3}].map(x=>({ ...x, workspace_id: ws.id }));
        const { data: seeded, error: te } = await supabase.from("nutrition_meal_types").insert(defaults).select("*");
        if (te) throw te; setMealTypes(seeded || []);
      }
    } catch (e) {
      setError(e?.message || "تعذر تحميل بيانات التغذية");
      if (!isDemo) {
        try {
          const cached = JSON.parse(localStorage.getItem("nutrition-cache:" + ws?.id + ":" + selectedDate) || "null");
          if (cached) { setFoods(cached.foods || []); setMeals(cached.meals || []); setEntries(cached.entries || []); setWater(cached.water || []); setNotice("تعرض نسخة محفوظة محليًا؛ تحقق من الاتصال قبل اعتبار التغييرات متزامنة."); }
        } catch {}
      }
    } finally { setLoading(false); }
  }, [ws?.id, isDemo, api, selectedDate, canEdit]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setLogForm(v => ({ ...v, logged_at: selectedDate + "T" + ((v.logged_at || "").slice(11,16) || "12:00") })); }, [selectedDate]);
  useEffect(() => {
    if (isDemo || !ws?.id || loading || error) return;
    try { localStorage.setItem("nutrition-cache:" + ws.id + ":" + selectedDate, JSON.stringify({ foods, meals, entries, water })); } catch {}
  }, [isDemo, ws?.id, selectedDate, foods, meals, entries, water, loading, error]);

  const dayEntries = useMemo(() => entries.filter(x => x.local_date === selectedDate), [entries, selectedDate]);
  const summary = useMemo(() => dayEntries.reduce((a,x) => ({ calories:a.calories+Number(x.calories_kcal||0), protein:a.protein+Number(x.protein_g||0), carbs:a.carbs+Number(x.carbs_g||0), fat:a.fat+Number(x.fat_g||0), fiber:a.fiber+Number(x.fiber_g||0) }), {calories:0,protein:0,carbs:0,fat:0,fiber:0}), [dayEntries]);
  const waterTotal = water.filter(x=>x.local_date===selectedDate).reduce((s,x)=>s+Number(x.amount_ml||0),0);
  const filteredFoods = useMemo(() => {
    const q=normalizeName(search);
    return foods.filter(f => !q || normalizeName([f.name,f.brand||"",...(f.name_aliases||[])].join(" ")).includes(q));
  }, [foods,search]);
  const mealById = useMemo(() => Object.fromEntries(mealTypes.map(m=>[m.id,m])), [mealTypes]);
  const entryMealName = e => meals.find(m=>m.id===e.meal_id)?.name || mealById[meals.find(m=>m.id===e.meal_id)?.meal_type_id]?.label_ar || "بدون وجبة";
  const hideNumbers = settings.display_mode !== "Full";
  const qualitative = settings.display_mode === "Qualitative";
  const fmt = n => hideNumbers ? "••••" : Number(n||0).toLocaleString("en-US",{maximumFractionDigits:1});
  const fmtCalories = n => fmt(settings.energy_unit === "kJ" ? Number(n||0) * 4.184 : n);
  const caloriesLabel = qualitative ? (summary.calories===0?"لم تسجّل بعد":"تم تسجيل الطعام اليوم") : fmtCalories(summary.calories);

  async function addFood(e) {
    e.preventDefault(); if (!canEdit || !foodForm.name.trim()) return;
    const required = ["calories_kcal","protein_g","carbs_g","fat_g"];
    if (required.some(k => foodForm[k] === "" || Number(foodForm[k]) < 0)) return setError("أدخل السعرات والبروتين والكربوهيدرات والدهون بقيم صحيحة.");
    setSaving(true); setError("");
    const aliases = String(foodForm.name_aliases || "").split(/[،,؛;]/).map(x => x.trim()).filter(Boolean);
    const row = { id: uid(), workspace_id: ws?.id, name: foodForm.name.trim(), name_norm: normalizeName(foodForm.name), name_aliases: aliases, brand: foodForm.brand.trim() || null, origin:"Custom", basis_type:foodForm.basis_type, basis_qty:Number(foodForm.basis_qty||100), serving_size:foodForm.serving_size?Number(foodForm.serving_size):null, serving_unit:foodForm.serving_unit||null, density_g_per_ml:foodForm.density_g_per_ml?Number(foodForm.density_g_per_ml):null, state:foodForm.state, calories_kcal:Number(foodForm.calories_kcal), protein_g:Number(foodForm.protein_g), carbs_g:Number(foodForm.carbs_g), fat_g:Number(foodForm.fat_g), fiber_g:foodForm.fiber_g===""?null:Number(foodForm.fiber_g), sugar_g:foodForm.sugar_g===""?null:Number(foodForm.sugar_g), sodium_mg:foodForm.sodium_mg===""?null:Number(foodForm.sodium_mg), is_beverage:foodForm.is_beverage, created_by:null };
    try {
      if (isDemo) { const next=[...foods,row]; setFoods(next); await api?.save?.({foods:next,meals,entries,water,settings,mealTypes}); }
      else { const {data,error:e1}=await supabase.from("nutrition_foods").insert(row).select("*").single(); if(e1) throw e1; setFoods(a=>[...a,data].sort((x,y)=>x.name.localeCompare(y.name,"ar"))); }
      setFoodForm(emptyFood()); setShowFood(false); notify("تم حفظ الغذاء.");
    } catch(e1) { setError(e1.message||"تعذر حفظ الغذاء"); }
    finally { setSaving(false); }
  }

  async function addFoodLog(e) {
    e.preventDefault(); if (!canEdit) return;
    const food=foods.find(f=>f.id===logForm.food_id); const qty=Number(logForm.quantity);
    if (!food || !(qty>0)) return setError("اختر غذاءً وأدخل كمية صحيحة.");
    if (food.basis_type==="per_100g" && logForm.unit_code==="ml" && !food.density_g_per_ml) return setError("هذا الغذاء لا يحتوي على كثافة لتحويل الملليلتر إلى جرام.");
    if (food.basis_type==="per_100ml" && logForm.unit_code==="g" && !food.density_g_per_ml) return setError("هذا الغذاء لا يحتوي على كثافة لتحويل الجرام إلى ملليلتر.");
    let factor=0, baseQty=null;
    if (food.basis_type==="per_serving") {
      if (logForm.unit_code==="serving") factor=qty/food.basis_qty;
      else { if(!food.serving_size) return setError("لم تُحدد حصة افتراضية لتحويل هذه الوحدة."); factor=(qty/Number(food.serving_size))/food.basis_qty; }
      baseQty=logForm.unit_code==="serving"?(food.serving_size?qty*Number(food.serving_size):null):qty;
    } else {
      if (logForm.unit_code==="serving") {
        if(!food.serving_size) return setError("لم تُحدد حصة افتراضية لهذا الغذاء.");
        baseQty=qty*Number(food.serving_size);
      } else if (logForm.unit_code==="ml" && food.basis_type==="per_100g") baseQty=qty*Number(food.density_g_per_ml);
      else if (logForm.unit_code==="g" && food.basis_type==="per_100ml") baseQty=qty/Number(food.density_g_per_ml);
      else baseQty=qty;
      factor=baseQty/food.basis_qty;
    }
    const snap = key => food[key] == null ? null : Number(food[key])*factor;
    setSaving(true); setError("");
    try {
      let mealId=null;
      let mealsAfter=meals;
      if (logForm.meal_type_id) {
        const existingMeal=meals.find(m=>m.meal_type_id===logForm.meal_type_id && m.local_date===selectedDate && m.status!=="Skipped");
        if (existingMeal) mealId=existingMeal.id;
        else {
          const mealType=mealTypes.find(x=>x.id===logForm.meal_type_id);
          if (isDemo) {
            const meal={id:uid(),workspace_id:ws?.id,local_date:selectedDate,meal_type_id:logForm.meal_type_id,name:mealType?.label_ar||"",time_at:new Date(logForm.logged_at).toISOString(),tz:settings.timezone||"Africa/Cairo",status:"Open"};
            mealId=meal.id; mealsAfter=[...meals,meal]; setMeals(mealsAfter);
          } else {
            const {data:meal,error:me}=await supabase.from("nutrition_meals").insert({workspace_id:ws.id,local_date:selectedDate,meal_type_id:logForm.meal_type_id,name:mealType?.label_ar||null,time_at:new Date(logForm.logged_at).toISOString(),tz:settings.timezone||"Africa/Cairo"}).select("*").single();
            if(me) throw me; mealId=meal.id; mealsAfter=[...meals,meal]; setMeals(mealsAfter);
          }
        }
      }
      const row = { id:uid(), workspace_id:ws?.id, food_id:food.id, meal_id:mealId, logged_at:new Date(logForm.logged_at).toISOString(), local_date:selectedDate, tz:settings.timezone||"Africa/Cairo", entry_kind:"Food", display_name:food.name, food_version:food.version||1, quantity:qty, unit_code:logForm.unit_code, quantity_base:baseQty, calories_kcal:Number((snap("calories_kcal")||0).toFixed(2)), protein_g:snap("protein_g")===null?null:Number(snap("protein_g").toFixed(2)), carbs_g:snap("carbs_g")===null?null:Number(snap("carbs_g").toFixed(2)), fat_g:snap("fat_g")===null?null:Number(snap("fat_g").toFixed(2)), fiber_g:snap("fiber_g")===null?null:Number(snap("fiber_g").toFixed(2)), sugar_g:snap("sugar_g")===null?null:Number(snap("sugar_g").toFixed(2)), sodium_mg:snap("sodium_mg")===null?null:Number(snap("sodium_mg").toFixed(2)), micronutrients_snapshot:food.micronutrients||{}, snapshot_basis:{basis_type:food.basis_type,basis_qty:food.basis_qty,per_values:{calories_kcal:food.calories_kcal,protein_g:food.protein_g,carbs_g:food.carbs_g,fat_g:food.fat_g},source_kind:food.origin,source_version:food.version||1,density:food.density_g_per_ml,state:food.state,rounding_ver:1}, confidence:"Exact", source:"Manual", client_op_id:uid() };
      if (isDemo) { const next=[...entries,row]; setEntries(next); await api?.save?.({foods,meals:mealsAfter,entries:next,water,settings,mealTypes}); }
      else { const {data,error:e1}=await supabase.from("nutrition_food_log_entries").insert(row).select("*").single(); if(e1) throw e1; setEntries(a=>[...a,data]); }
      setShowLog(false); setLogForm({food_id:"",quantity:"100",unit_code:"g",meal_type_id:"",logged_at:new Date().toISOString().slice(0,16)}); notify("تم تسجيل الوجبة.");
    } catch(e1) { setError(e1.message||"تعذر تسجيل الطعام"); }
    finally { setSaving(false); }
  }

  async function addQuick(e) {
    e.preventDefault(); if(!canEdit) return;
    const name=quickForm.display_name.trim(), kcal=Number(quickForm.calories_kcal);
    if(!name || quickForm.calories_kcal==="" || kcal<0) return setError("أدخل اسم الإدخال والسعرات.");
    const outside = Boolean(quickForm.venue_label.trim());
    const low = quickForm.range_min_kcal === "" ? null : Number(quickForm.range_min_kcal);
    const high = quickForm.range_max_kcal === "" ? null : Number(quickForm.range_max_kcal);
    if (low !== null && high !== null && high < low) return setError("الحد الأعلى للتقدير يجب ألا يقل عن الحد الأدنى.");
    const row={id:uid(),workspace_id:ws?.id,food_id:null,meal_id:null,logged_at:new Date().toISOString(),local_date:selectedDate,tz:settings.timezone||"Africa/Cairo",entry_kind:outside?"OutsideFood":"QuickMacros",display_name:name,quantity:1,unit_code:"serving",quantity_base:null,calories_kcal:kcal,protein_g:quickForm.protein_g===""?null:Number(quickForm.protein_g),carbs_g:quickForm.carbs_g===""?null:Number(quickForm.carbs_g),fat_g:quickForm.fat_g===""?null:Number(quickForm.fat_g),range_min_kcal:low,range_max_kcal:high,estimation_method:outside?quickForm.estimation_method:null,confidence:"Estimated",source:outside?"OutsideHome":"QuickAdd",venue_label:outside?quickForm.venue_label.trim():null,notes:quickForm.notes.trim()||null,snapshot_basis:{source_kind:outside?"OutsideHome":"QuickMacros",rounding_ver:1},client_op_id:uid()};
    setSaving(true); setError("");
    try {
      if(isDemo){const next=[...entries,row];setEntries(next);await api?.save?.({foods,meals,entries:next,water,settings,mealTypes});}
      else {const {data,error:e1}=await supabase.from("nutrition_food_log_entries").insert(row).select("*").single();if(e1)throw e1;setEntries(a=>[...a,data]);}
      setShowQuick(false);setQuickForm(emptyQuick());notify("تمت إضافة الإدخال السريع.");
    }catch(e1){setError(e1.message||"تعذر الحفظ");}finally{setSaving(false);}
  }

  async function addWater(amount) {
    if(!canEdit || !(Number(amount)>0)) return;
    const row={id:uid(),workspace_id:ws?.id,logged_at:new Date().toISOString(),local_date:selectedDate,tz:settings.timezone||"Africa/Cairo",amount_ml:Number(amount),source:"QuickButton",client_op_id:uid()};
    try {
      if(isDemo){const next=[...water,row];setWater(next);await api?.save?.({foods,meals,entries,water:next,settings,mealTypes});}
      else {const {data,error:e1}=await supabase.from("nutrition_water_logs").insert(row).select("*").single();if(e1)throw e1;setWater(a=>[...a,data]);}
      notify("تم تسجيل الماء.");
    }catch(e1){setError(e1.message||"تعذر تسجيل الماء");}
  }

  async function saveEntryEdit(e) {
    e.preventDefault(); if(!canEdit || !editEntry) return;
    const kcal=Number(editForm.calories_kcal);
    if(!editForm.display_name.trim() || editForm.calories_kcal==="" || kcal<0) return setError("أدخل الاسم والسعرات بشكل صحيح.");
    const patch={display_name:editForm.display_name.trim(),calories_kcal:kcal,protein_g:editForm.protein_g===""?null:Number(editForm.protein_g),carbs_g:editForm.carbs_g===""?null:Number(editForm.carbs_g),fat_g:editForm.fat_g===""?null:Number(editForm.fat_g),notes:editForm.notes.trim()||null,updated_at:new Date().toISOString(),snapshot_basis:{...(editEntry.snapshot_basis||{}),manual_correction:true,corrected_at:new Date().toISOString()}};
    try {
      if(isDemo){const next=entries.map(x=>x.id===editEntry.id?{...x,...patch}:x);setEntries(next);await api?.save?.({foods,meals,entries:next,water,settings,mealTypes});}
      else {const {data,error:e1}=await supabase.from("nutrition_food_log_entries").update(patch).eq("workspace_id",ws.id).eq("id",editEntry.id).select("*").single();if(e1)throw e1;setEntries(a=>a.map(x=>x.id===editEntry.id?data:x));}
      setEditEntry(null);notify("تم تحديث الإدخال مع تسجيل أنه تعديل يدوي على اللقطة.");
    }catch(e1){setError(e1.message||"تعذر تعديل الإدخال");}
  }

  async function toggleFavorite(food) {
    if (!canEdit) return;
    const nextValue = !food.is_favorite;
    try {
      if (isDemo) { const next=foods.map(x=>x.id===food.id?{...x,is_favorite:nextValue}:x); setFoods(next); await api?.save?.({foods:next,meals,entries,water,settings,mealTypes}); }
      else { const {error:e1}=await supabase.from("nutrition_foods").update({is_favorite:nextValue,updated_at:new Date().toISOString()}).eq("workspace_id",ws.id).eq("id",food.id); if(e1) throw e1; setFoods(a=>a.map(x=>x.id===food.id?{...x,is_favorite:nextValue}:x)); }
      notify(nextValue?"أضيف إلى المفضلة.":"أزيل من المفضلة.");
    } catch(e1) { setError(e1.message||"تعذر تحديث المفضلة"); }
  }

  async function copyMealToTomorrow(mealId) {
    if (!canEdit) return;
    const source = entries.filter(x=>x.meal_id===mealId && x.local_date===selectedDate);
    if (!source.length) return setError("لا توجد إدخالات في هذه الوجبة لنسخها.");
    const targetDate = new Date(selectedDate+"T12:00:00"); targetDate.setDate(targetDate.getDate()+1);
    const date = targetDate.toLocaleDateString("en-CA");
    try {
      const copies = source.map(x=>({...x,id:uid(),local_date:date,logged_at:new Date(date+"T"+new Date(x.logged_at).toISOString().slice(11,16)+":00").toISOString(),client_op_id:uid(),created_at:undefined,updated_at:undefined}));
      if(isDemo){const next=[...entries,...copies];setEntries(next);await api?.save?.({foods,meals,entries:next,water,settings,mealTypes});}
      else {const {data,error:e1}=await supabase.from("nutrition_food_log_entries").insert(copies.map(({created_at,updated_at,...x})=>x)).select("*");if(e1)throw e1;setEntries(a=>[...a,...(data||[])]);}
      notify("تم نسخ الوجبة إلى "+date+" مع الاحتفاظ بلقطة القيم الغذائية.");
    } catch(e1) { setError(e1.message||"تعذر نسخ الوجبة"); }
  }

  async function removeEntry(id) {
    if(!canEdit || !confirm("حذف هذا الإدخال من سجل الطعام؟")) return;
    try {
      if(isDemo){const next=entries.filter(x=>x.id!==id);setEntries(next);await api?.save?.({foods,meals,entries:next,water,settings,mealTypes});}
      else {const {error:e1}=await supabase.from("nutrition_food_log_entries").delete().eq("workspace_id",ws.id).eq("id",id);if(e1)throw e1;setEntries(a=>a.filter(x=>x.id!==id));}
      notify("تم حذف الإدخال.");
    }catch(e1){setError(e1.message||"تعذر الحذف");}
  }

  const tabs=[["today","اليوم","📅"],["log","سجل الأكل","📒"],["foods","الأغذية","🥑"],["water","الماء","💧"],["settings","الإعدادات","⚙️"]];
  const heading={today:"اليوم",log:"سجل الأكل",foods:"الأغذية",water:"الماء",settings:"الإعدادات"}[section]||"التغذية";
  const dayEntriesSorted=[...dayEntries].sort((a,b)=>new Date(b.logged_at)-new Date(a.logged_at));
  if(loading) return <div style={{padding:36,textAlign:"center",color:MUTED}}>جاري تحميل بيانات التغذية…</div>;

  return <div dir="rtl" style={{maxWidth:1120,margin:"0 auto",color:INK,fontFamily:"inherit"}}>
    <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap",marginBottom:18}}>
      <div style={{flex:1,minWidth:180}}><div style={{fontSize:22,fontWeight:850}}>🍽️ التغذية</div><div style={{fontSize:12,color:MUTED,marginTop:4}}>{heading} · تسجيل ومتابعة الطعام والماء بدون أحكام</div></div>
      <input aria-label="تاريخ السجل" type="date" value={selectedDate} onChange={e=>setSelectedDate(e.target.value)} style={{...inputStyle,width:"auto"}}/>
      {canEdit&&<><Button onClick={()=>setShowLog(true)}>＋ تسجيل طعام</Button><Button secondary onClick={()=>setShowQuick(true)}>إضافة سريعة</Button></>}
    </div>
    <nav style={{display:"flex",gap:7,overflowX:"auto",paddingBottom:12,marginBottom:12,borderBottom:"1px solid "+LINE}}>{tabs.map(([id,label,icon])=><button key={id} onClick={()=>go(id)} style={{whiteSpace:"nowrap",border:"1px solid "+(section===id?GREEN:LINE),background:section===id?"#EAF7EF":"#fff",color:section===id?GREEN:INK,borderRadius:10,padding:"9px 13px",fontFamily:"inherit",fontWeight:750,cursor:"pointer"}}>{icon} {label}</button>)}</nav>
    {error&&<div role="alert" style={{background:"#FFF4F1",border:"1px solid #F1C4B9",color:"#9A3412",padding:11,borderRadius:10,marginBottom:12,fontSize:12}}>{error}<button onClick={()=>setError("")} style={{float:"left",border:0,background:"transparent",cursor:"pointer"}}>×</button></div>}
    {notice&&<div style={{background:"#EFF8F1",border:"1px solid #CDE8D4",color:"#24613B",padding:10,borderRadius:10,marginBottom:12,fontSize:12}}>{notice}</div>}

    {section==="today"&&<div style={{display:"grid",gap:14}}>
      <Card><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:18,alignItems:"center"}}><Metric label="السعرات المسجلة" value={caloriesLabel} suffix={!hideNumbers&&!qualitative?(settings.energy_unit||"kcal"):""}/><Metric label="البروتين" value={qualitative?"تم التسجيل":fmt(summary.protein)} suffix={!hideNumbers&&!qualitative?"جم":""}/><Metric label="الكربوهيدرات" value={qualitative?"تم التسجيل":fmt(summary.carbs)} suffix={!hideNumbers&&!qualitative?"جم":""}/><Metric label="الدهون" value={qualitative?"تم التسجيل":fmt(summary.fat)} suffix={!hideNumbers&&!qualitative?"جم":""}/><Metric label="الماء" value={hideNumbers?"••••":fmt(waterTotal)} suffix={hideNumbers?"":"مل"}/></div><div style={{fontSize:11,color:MUTED,marginTop:14}}>هذه أرقام الإدخالات المسجلة فقط؛ لا توجد أهداف افتراضية ولا تقييمات صحية.</div></Card>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:14}}>
        <Card><div style={{fontWeight:800,marginBottom:12}}>وجبات اليوم</div>{mealTypes.length===0?<Empty title="لا توجد أنواع وجبات" detail="يمكنك إضافة أنواع الوجبات في إعدادات النظام لاحقًا."/>:mealTypes.map(m=><div key={m.id} style={{padding:"9px 0",borderBottom:"1px solid "+LINE,display:"flex",justifyContent:"space-between",gap:8}}><span>{m.label_ar}</span><span style={{fontSize:12,color:MUTED}}>{meals.filter(x=>x.meal_type_id===m.id).length} وجبة</span></div>)}</Card>
        <Card><div style={{fontWeight:800,marginBottom:12}}>الماء</div><div style={{fontSize:25,fontWeight:850,marginBottom:10}}>{hideNumbers?"••••":fmt(waterTotal)+" مل"}</div><div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{[150,250,330,500].map(n=><Button key={n} secondary onClick={()=>addWater(n)} disabled={!canEdit}>+{n} مل</Button>)}</div><div style={{display:"flex",gap:8,marginTop:12}}><Input type="number" min="1" value={waterAmount} onChange={e=>setWaterAmount(e.target.value)}/><Button onClick={()=>addWater(waterAmount)} disabled={!canEdit}>إضافة</Button></div></Card>
      </div>
      <Card><div style={{fontWeight:800,marginBottom:12}}>آخر ما سجلته</div>{dayEntriesSorted.length===0?<Empty title="لم تسجل طعامًا بعد" detail="ابدأ بإضافة طعام من مكتبتك أو استخدم الإضافة السريعة."/>:dayEntriesSorted.slice(0,8).map(e=><div key={e.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:"1px solid "+LINE}}><div style={{flex:1,minWidth:0}}><div style={{fontWeight:700,fontSize:13}}>{e.display_name}</div><div style={{fontSize:11,color:MUTED}}>{entryMealName(e)} · {new Date(e.logged_at).toLocaleTimeString("ar-EG",{hour:"2-digit",minute:"2-digit"})}</div></div><b style={{fontSize:13}}>{hideNumbers?"••••":fmtCalories(e.calories_kcal)+" "+(settings.energy_unit||"kcal")}</b></div>)}</Card>
    </div>}

    {section==="log"&&<Card><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}><b>سجل الطعام · {selectedDate}</b><Button onClick={()=>setShowLog(true)} disabled={!canEdit}>＋ تسجيل طعام</Button></div>{dayEntriesSorted.length===0?<Empty title="لا توجد إدخالات في هذا اليوم" detail="يمكنك اختيار يوم آخر أو إضافة طعام."/>:dayEntriesSorted.map(e=><div key={e.id} style={{display:"flex",alignItems:"center",gap:10,padding:"12px 0",borderBottom:"1px solid "+LINE}}><div style={{flex:1}}><b style={{fontSize:13}}>{e.display_name}</b><div style={{fontSize:11,color:MUTED}}>{e.quantity} {e.unit_code} · {new Date(e.logged_at).toLocaleTimeString("ar-EG",{hour:"2-digit",minute:"2-digit"})} · {e.confidence==="Exact"?"قيمة مسجلة":"قيمة تقديرية"}</div></div><div style={{fontWeight:750,fontSize:13}}>{hideNumbers?"••••":fmt(e.calories_kcal)+" kcal"}</div>{canEdit&&<button onClick={()=>{setEditEntry(e);setEditForm({display_name:e.display_name||"",calories_kcal:String(e.calories_kcal??""),protein_g:e.protein_g==null?"":String(e.protein_g),carbs_g:e.carbs_g==null?"":String(e.carbs_g),fat_g:e.fat_g==null?"":String(e.fat_g),notes:e.notes||""});}} title="تعديل الإدخال" style={{border:0,background:"transparent",cursor:"pointer"}}>✎</button>}{canEdit&&e.meal_id&&<button onClick={()=>copyMealToTomorrow(e.meal_id)} title="نسخ الوجبة إلى الغد" style={{border:0,background:"transparent",cursor:"pointer"}}>⧉</button>}{canEdit&&<button onClick={()=>removeEntry(e.id)} title="حذف" style={{border:0,background:"transparent",color:"#9A6258",cursor:"pointer",fontSize:17}}>×</button>}</div>)}</Card>}

    {section==="foods"&&<Card><div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap",marginBottom:14}}><div style={{fontWeight:800,flex:1}}>مكتبة الأغذية</div><div style={{minWidth:180,flex:1}}><Input placeholder="ابحث عن غذاء أو اسم بديل…" value={search} onChange={e=>setSearch(e.target.value)}/></div><Button onClick={()=>setShowFood(true)} disabled={!canEdit}>＋ إضافة غذاء</Button></div><div style={{display:"flex",gap:7,flexWrap:"wrap",marginBottom:12}}><Button secondary onClick={()=>setFoodFilter("all")}>الكل</Button><Button secondary onClick={()=>setFoodFilter("favorite")}>★ المفضلة</Button><Button secondary onClick={()=>setFoodFilter("recent")}>الأخيرة</Button></div>{(foodFilter==="favorite"?filteredFoods.filter(f=>f.is_favorite):foodFilter==="recent"?filteredFoods.filter(f=>entries.some(e=>e.food_id===f.id)).sort((a,b)=>new Date(Math.max(...entries.filter(e=>e.food_id===b.id).map(e=>new Date(e.logged_at))))-new Date(Math.max(...entries.filter(e=>e.food_id===a.id).map(e=>new Date(e.logged_at))))):filteredFoods).length===0?<Empty title={search?"لا توجد نتائج مطابقة":"كتالوجك فارغ حاليًا"} detail="أضف الأطعمة التي تستخدمها. لن نعرض بيانات غذائية من مصدر غير موثّق."/>:(foodFilter==="favorite"?filteredFoods.filter(f=>f.is_favorite):foodFilter==="recent"?filteredFoods.filter(f=>entries.some(e=>e.food_id===f.id)).sort((a,b)=>new Date(Math.max(...entries.filter(e=>e.food_id===b.id).map(e=>new Date(e.logged_at))))-new Date(Math.max(...entries.filter(e=>e.food_id===a.id).map(e=>new Date(e.logged_at))))):filteredFoods).map(f=><div key={f.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 0",borderBottom:"1px solid "+LINE}}><div style={{flex:1}}><b style={{fontSize:13}}>{f.name}</b><div style={{fontSize:11,color:MUTED}}>{f.brand||"غذاء مخصص"} · {f.name_aliases?.length?("مرادفات: "+f.name_aliases.join("، ")+" · "):""}لكل {f.basis_qty} {f.basis_type==="per_100ml"?"مل":f.basis_type==="per_serving"?"حصة":"جم"}</div></div><div style={{textAlign:"left",fontSize:12,fontWeight:750}}>{hideNumbers?"••••":fmtCalories(f.calories_kcal)+" "+(settings.energy_unit||"kcal")}</div><button onClick={()=>toggleFavorite(f)} title="المفضلة" style={{border:0,background:"transparent",cursor:"pointer",fontSize:18}}>{f.is_favorite?"★":"☆"}</button></div>)}</Card>}

    {section==="water"&&<Card><div style={{fontWeight:800,marginBottom:8}}>سجل الماء</div><div style={{fontSize:25,fontWeight:850,marginBottom:12}}>{hideNumbers?"••••":fmt(waterTotal)+" مل"}</div><div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:14}}>{[150,250,330,500].map(n=><Button key={n} secondary onClick={()=>addWater(n)} disabled={!canEdit}>+{n} مل</Button>)}</div><div style={{display:"flex",gap:8,marginBottom:18}}><Input type="number" min="1" value={waterAmount} onChange={e=>setWaterAmount(e.target.value)}/><Button onClick={()=>addWater(waterAmount)} disabled={!canEdit}>تسجيل كمية</Button></div>{water.filter(x=>x.local_date===selectedDate).length===0?<Empty title="لا توجد سجلات ماء" detail="يمكنك تسجيل الكمية التي شربتها."/>:water.filter(x=>x.local_date===selectedDate).map(w=><div key={w.id} style={{padding:"10px 0",borderBottom:"1px solid "+LINE,display:"flex",justifyContent:"space-between"}}><span>{new Date(w.logged_at).toLocaleTimeString("ar-EG",{hour:"2-digit",minute:"2-digit"})}</span><b>{hideNumbers?"••••":fmt(w.amount_ml)+" مل"}</b></div>)}</Card>}

    {section==="settings"&&<Card><b>إعدادات العرض والخصوصية</b><div style={{display:"grid",gap:14,marginTop:16,maxWidth:400}}><Field label="طريقة عرض القيم الغذائية"><Select value={settings.display_mode||"Full"} onChange={async e=>{const v=e.target.value;const next={...settings,display_mode:v};setSettings(next);if(!isDemo){const {error:e1}=await supabase.from("nutrition_settings").update({display_mode:v,updated_at:new Date().toISOString()}).eq("workspace_id",ws.id);if(e1){setError(e1.message);return;}}else await api?.save?.({foods,meals,entries,water,settings:next,mealTypes});notify("تم تحديث طريقة العرض.");}}><option value="Full">عرض الأرقام</option><option value="Qualitative">وصف نوعي دون أرقام</option><option value="Hidden">إخفاء الأرقام</option></Select></Field><Field label="وحدة الطاقة"><Select value={settings.energy_unit||"kcal"} onChange={async e=>{const v=e.target.value;const next={...settings,energy_unit:v};setSettings(next);if(!isDemo){const {error:e1}=await supabase.from("nutrition_settings").update({energy_unit:v,updated_at:new Date().toISOString()}).eq("workspace_id",ws.id);if(e1)setError(e1.message);}else await api?.save?.({foods,meals,entries,water,settings:next,mealTypes});}}><option value="kcal">كيلو كالوري (kcal)</option><option value="kJ">كيلوجول (kJ)</option></Select></Field><div style={{fontSize:11,color:MUTED,lineHeight:1.8}}>تسجيل الطعام لا يتطلب إظهار الأرقام. يمكنك إخفاء القيم أو عرض وصف نوعي في جميع شاشات هذا القسم.</div></div></Card>}

    {showFood&&<Modal title="إضافة غذاء" onClose={()=>setShowFood(false)} footer={<><Button type="submit" form="nutrition-food-form" disabled={saving}>حفظ الغذاء</Button><Button secondary onClick={()=>setShowFood(false)}>إلغاء</Button></>}><form id="nutrition-food-form" onSubmit={addFood} style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:11}}><Field label="اسم الغذاء *"><Input required value={foodForm.name} onChange={e=>setFoodForm({...foodForm,name:e.target.value})}/></Field><Field label="العلامة التجارية"><Input value={foodForm.brand} onChange={e=>setFoodForm({...foodForm,brand:e.target.value})}/></Field><Field label="أسماء بديلة للبحث (افصل بينها بفاصلة)"><Input value={foodForm.name_aliases||""} onChange={e=>setFoodForm({...foodForm,name_aliases:e.target.value})} placeholder="ملوخيه، ملوخية"/></Field><Field label="أساس القيم"><Select value={foodForm.basis_type} onChange={e=>setFoodForm({...foodForm,basis_type:e.target.value,basis_qty:e.target.value==="per_serving"?"1":"100"})}><option value="per_100g">لكل 100 جرام</option><option value="per_100ml">لكل 100 مل</option><option value="per_serving">لكل حصة</option></Select></Field><Field label="كمية الأساس"><Input type="number" min="0.001" step="0.001" value={foodForm.basis_qty} onChange={e=>setFoodForm({...foodForm,basis_qty:e.target.value})}/></Field>{foodForm.basis_type==="per_serving"&&<Field label="وزن/حجم الحصة (اختياري)"><Input type="number" min="0.001" step="0.001" value={foodForm.serving_size} onChange={e=>setFoodForm({...foodForm,serving_size:e.target.value})}/></Field><Field label="اسم الحصة (مثل رغيف/كوب/ملعقة)"><Input value={foodForm.serving_unit} onChange={e=>setFoodForm({...foodForm,serving_unit:e.target.value})} placeholder="رغيف"/></Field>}<Field label="الحالة"><Select value={foodForm.state} onChange={e=>setFoodForm({...foodForm,state:e.target.value})}><option value="na">غير محدد</option><option value="raw">نيء</option><option value="cooked">مطبوخ</option><option value="dry">جاف</option><option value="prepared">مجهز</option><option value="packaged">معبأ</option></Select></Field>{[["calories_kcal","السعرات (kcal) *"],["protein_g","البروتين (جم) *"],["carbs_g","الكربوهيدرات (جم) *"],["fat_g","الدهون (جم) *"],["fiber_g","الألياف (جم)"],["sugar_g","السكريات (جم)"],["sodium_mg","الصوديوم (ملجم)"]].map(([k,l])=><Field key={k} label={l}><Input type="number" min="0" step="0.001" required={["calories_kcal","protein_g","carbs_g","fat_g"].includes(k)} value={foodForm[k]} onChange={e=>setFoodForm({...foodForm,[k]:e.target.value})}/></Field>)}</form></Modal>}

    {showLog&&<Modal title="تسجيل طعام" onClose={()=>setShowLog(false)} footer={<><Button type="submit" form="nutrition-log-form" disabled={saving}>تسجيل</Button><Button secondary onClick={()=>setShowLog(false)}>إلغاء</Button></>}><form id="nutrition-log-form" onSubmit={addFoodLog} style={{display:"grid",gap:12}}><Field label="ابحث واختر الغذاء"><Select required value={logForm.food_id} onChange={e=>{const f=foods.find(x=>x.id===e.target.value);setLogForm({...logForm,food_id:e.target.value,unit_code:f?.basis_type==="per_100ml"?"ml":"g"});}}><option value="">اختر غذاءً</option>{foods.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</Select></Field><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}><Field label="الكمية"><Input type="number" min="0.001" step="0.001" value={logForm.quantity} onChange={e=>setLogForm({...logForm,quantity:e.target.value})}/></Field><Field label="الوحدة"><Select value={logForm.unit_code} onChange={e=>setLogForm({...logForm,unit_code:e.target.value})}><option value="g">جرام</option><option value="ml">ملليلتر</option><option value="serving">{foods.find(f=>f.id===logForm.food_id)?.serving_unit||"حصة"}</option></Select></Field></div><Field label="نوع الوجبة"><Select value={logForm.meal_type_id} onChange={e=>setLogForm({...logForm,meal_type_id:e.target.value})}><option value="">بدون تحديد</option>{mealTypes.map(m=><option key={m.id} value={m.id}>{m.label_ar}</option>)}</Select></Field><div style={{fontSize:11,color:MUTED}}>سيتم حفظ لقطة من القيم الغذائية الحالية حتى لا تتغير إدخالات الماضي عند تعديل الغذاء.</div></form></Modal>}

    {editEntry&&<Modal title="تعديل إدخال الطعام" onClose={()=>setEditEntry(null)} footer={<><Button type="submit" form="nutrition-edit-form" disabled={saving}>حفظ التعديل</Button><Button secondary onClick={()=>setEditEntry(null)}>إلغاء</Button></>}><form id="nutrition-edit-form" onSubmit={saveEntryEdit} style={{display:"grid",gap:10}}><Field label="اسم الإدخال"><Input required value={editForm.display_name} onChange={e=>setEditForm({...editForm,display_name:e.target.value})}/></Field>{[["calories_kcal","السعرات"],["protein_g","البروتين"],["carbs_g","الكربوهيدرات"],["fat_g","الدهون"]].map(([k,l])=><Field key={k} label={l}><Input type="number" min="0" step="0.01" value={editForm[k]} onChange={e=>setEditForm({...editForm,[k]:e.target.value})}/></Field>)}<Field label="ملاحظات"><Input value={editForm.notes} onChange={e=>setEditForm({...editForm,notes:e.target.value})}/></Field><div style={{fontSize:11,color:MUTED}}>التعديل يصحح سجل هذا الإدخال فقط ولا يغير بيانات الغذاء الأصلية أو بقية السجلات.</div></form></Modal>}

    {showQuick&&<Modal title="إضافة سريعة" onClose={()=>setShowQuick(false)} footer={<><Button type="submit" form="nutrition-quick-form" disabled={saving}>إضافة</Button><Button secondary onClick={()=>setShowQuick(false)}>إلغاء</Button></>}><form id="nutrition-quick-form" onSubmit={addQuick} style={{display:"grid",gap:11}}><Field label="اسم الطعام أو الوجبة"><Input required value={quickForm.display_name} onChange={e=>setQuickForm({...quickForm,display_name:e.target.value})}/></Field><Field label="السعرات (kcal)"><Input required type="number" min="0" value={quickForm.calories_kcal} onChange={e=>setQuickForm({...quickForm,calories_kcal:e.target.value})}/></Field><div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>{[["protein_g","بروتين"],["carbs_g","كربوهيدرات"],["fat_g","دهون"]].map(([k,l])=><Field key={k} label={l}><Input type="number" min="0" value={quickForm[k]} onChange={e=>setQuickForm({...quickForm,[k]:e.target.value})}/></Field>)}</div><Field label="مكان تناول الطعام خارج المنزل (اختياري)"><Input value={quickForm.venue_label} onChange={e=>setQuickForm({...quickForm,venue_label:e.target.value})} placeholder="مطعم / كافيه"/></Field>{quickForm.venue_label.trim()&&<><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}><Field label="أقل تقدير للسعرات"><Input type="number" min="0" value={quickForm.range_min_kcal} onChange={e=>setQuickForm({...quickForm,range_min_kcal:e.target.value})}/></Field><Field label="أعلى تقدير للسعرات"><Input type="number" min="0" value={quickForm.range_max_kcal} onChange={e=>setQuickForm({...quickForm,range_max_kcal:e.target.value})}/></Field></div><Field label="طريقة التقدير"><Select value={quickForm.estimation_method} onChange={e=>setQuickForm({...quickForm,estimation_method:e.target.value})}><option value="visual_estimate">تقدير بصري</option><option value="restaurant_info">معلومات المطعم</option><option value="user_estimate">تقديري الشخصي</option></Select></Field></>}<Field label="ملاحظات"><Input value={quickForm.notes} onChange={e=>setQuickForm({...quickForm,notes:e.target.value})}/></Field><div style={{fontSize:11,color:MUTED}}>هذا الإدخال تقديري ولا يُضاف إلى مكتبة الأغذية. إذا أدخلت مكانًا، سيُسجل كطعام خارج المنزل مع نطاق تقديري اختياري.</div></form></Modal>}
  </div>;
}

export { demoSeed };