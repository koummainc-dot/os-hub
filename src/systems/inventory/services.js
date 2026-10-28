import { appendInventoryEvent, validateInventoryRecord } from "./domain.js";

const CURRENCIES = new Set(["EGP", "USD", "SAR", "AED", "EUR", "GBP"]);
const active = row => row && !row.deletedAt;
const normalizeName = value => String(value || "").trim().toLocaleLowerCase("ar");

export function inventoryToday(timeZone = "Africa/Cairo") {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit"
  }).formatToParts(new Date());
  const part = type => parts.find(x => x.type === type)?.value || "";
  return part("year") + "-" + part("month") + "-" + part("day");
}

export function inventoryDateOffset(days, timeZone = "Africa/Cairo") {
  const [year, month, day] = inventoryToday(timeZone).split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + Number(days || 0), 12, 0, 0));
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return y + "-" + m + "-" + d;
}

function validOptionalAmount(value) {
  if (value === "" || value === null || value === undefined) return true;
  const text = String(value).trim();
  return /^\d+(\.\d{1,4})?$/.test(text) && Number.isFinite(Number(text)) && Number(text) >= 0;
}

export function prepareInventoryItem(form, data, today, uid) {
  const errors = [];
  const name = String(form?.name || "").trim();
  if (!name) errors.push("اكتب اسم العنصر أولاً.");
  if (form?.quantity !== "" && form?.quantity !== null && form?.quantity !== undefined) {
    const quantity = Number(form.quantity);
    if (!Number.isFinite(quantity) || quantity < 0 || !/^\d+(\.\d{1,3})?$/.test(String(form.quantity))) {
      errors.push("الكمية يجب أن تكون رقمًا غير سالب وبحد أقصى 3 منازل عشرية.");
    }
  }
  if (!validOptionalAmount(form?.purchasePrice)) errors.push("سعر الشراء يجب أن يكون رقمًا غير سالب وبحد أقصى 4 منازل عشرية.");
  if (!validOptionalAmount(form?.estimatedValue)) errors.push("القيمة التقديرية يجب أن تكون رقمًا غير سالب وبحد أقصى 4 منازل عشرية.");
  if (form?.currency && !CURRENCIES.has(form.currency)) errors.push("اختر عملة مدعومة.");
  if (form?.categoryId && !data.categories.some(x => x.id === form.categoryId && active(x))) errors.push("التصنيف المختار غير متاح؛ اختر تصنيفًا نشطًا.");
  if (form?.placeId && !data.places.some(x => x.id === form.placeId && active(x))) errors.push("المكان المختار غير متاح؛ اختر مكانًا نشطًا.");
  if (errors.length) return { errors, item: null, data: null };

  const old = data.items.find(x => x.id === form.id);
  const item = {
    ...form,
    id: form.id || uid(),
    name,
    quantity: form.quantity === "" || form.quantity === null || form.quantity === undefined ? null : Number(form.quantity),
    purchasePrice: form.purchasePrice === "" ? "" : String(form.purchasePrice),
    estimatedValue: form.estimatedValue === "" ? "" : String(form.estimatedValue),
    currency: form.currency || data.settings?.currency || "EGP",
    sensitivity: ["Normal", "Sensitive", "Secret"].includes(form.sensitivity) ? form.sensitivity : "Normal",
    createdAt: old?.createdAt || today,
    updatedAt: today
  };
  let next = {
    ...data,
    items: old ? data.items.map(x => x.id === item.id ? item : x) : [item, ...data.items]
  };
  if (!old) {
    next = appendInventoryEvent(next, {
      id: uid(), itemId: item.id, type: "Acquired", date: today,
      toLocationId: item.placeId || null, currentStatus: item.status || "Owned",
      note: "تم إنشاء سجل الممتلكات."
    });
    if (item.status && item.status !== "Owned") {
      const initialType = ({ Loaned: "Loaned", Sold: "Sold", Disposed: "Disposed", Lost: "Lost" })[item.status] || "Corrected";
      next = appendInventoryEvent(next, {
        id: uid(), itemId: item.id, type: initialType, date: today,
        currentStatus: item.status, toLocationId: item.placeId || null,
        note: "تم تسجيل الحالة الأولية للممتلك."
      });
    }
  } else {
    const locationChanged = (old.placeId || "") !== (item.placeId || "");
    const statusChanged = (old.status || "Owned") !== (item.status || "Owned");
    if (locationChanged) {
      next = appendInventoryEvent(next, {
        id: uid(), itemId: item.id, type: "Moved", date: today,
        fromLocationId: old.placeId || null, toLocationId: item.placeId || null,
        previousStatus: old.status || "Owned", currentStatus: item.status || "Owned",
        note: "تم تغيير الموقع الحالي للممتلك."
      });
    }
    if (statusChanged) {
      const previousStatus = old.status || "Owned";
      const currentStatus = item.status || "Owned";
      let type = "Corrected";
      if (currentStatus === "Loaned") type = "Loaned";
      else if (previousStatus === "Loaned" && currentStatus === "Owned") type = "Returned";
      else if (currentStatus === "Sold") type = "Sold";
      else if (currentStatus === "Disposed") type = "Disposed";
      else if (currentStatus === "Lost") type = "Lost";
      else if (previousStatus === "Lost" && currentStatus === "Owned") type = "Found";
      next = appendInventoryEvent(next, {
        id: uid(), itemId: item.id, type, date: today,
        previousStatus, currentStatus,
        note: "تغيّرت حالة الملكية من " + previousStatus + " إلى " + currentStatus + "."
      });
    }
    if (!locationChanged && !statusChanged) {
      next = appendInventoryEvent(next, {
        id: uid(), itemId: item.id, type: "ItemUpdated", date: today,
        currentStatus: item.status || "Owned",
        note: "تم تحديث بيانات الممتلك."
      });
    }
  }
  return { errors: [], item, data: next };
}

export function prepareInventoryCategory(form, data, today, uid) {
  const name = String(form?.name || "").trim();
  if (!name) return { error: "اكتب اسم التصنيف." };
  const duplicate = data.categories.some(x => active(x) && x.id !== form.id && normalizeName(x.name) === normalizeName(name));
  if (duplicate) return { error: "يوجد تصنيف نشط بالاسم نفسه بالفعل." };
  const old = data.categories.find(x => x.id === form.id);
  const row = { ...form, id: form.id || uid(), name, createdAt: old?.createdAt || today, updatedAt: today, deletedAt: null };
  const key = form.id ? data.categories.map(x => x.id === row.id ? row : x) : [row, ...data.categories];
  const events = [{ id: uid(), type: form.id ? "CategoryUpdated" : "CategoryCreated", date: today, note: form.id ? "تم تحديث تصنيف." : "تم إنشاء تصنيف.", entityType: "category", entityId: row.id }, ...(data.events || [])];
  return { row, data: { ...data, categories: key, events } };
}

export function prepareInventoryPlace(form, data, today, uid) {
  const name = String(form?.name || "").trim();
  if (!name) return { error: "اكتب اسم المكان." };
  if (form.parentId && !data.places.some(x => x.id === form.parentId && active(x))) return { error: "المكان الأب غير موجود أو مؤرشف." };
  if (form.parentId === form.id && form.id) return { error: "لا يمكن جعل المكان أبًا لنفسه." };
  const duplicate = data.places.some(x => active(x) && x.id !== form.id && x.parentId === (form.parentId || "") && normalizeName(x.name) === normalizeName(name));
  if (duplicate) return { error: "يوجد مكان نشط بالاسم نفسه داخل هذا المكان الأب." };
  let parentId = form.parentId || "";
  const seen = new Set(form.id ? [form.id] : []);
  while (parentId) {
    if (seen.has(parentId)) return { error: "هذا التعديل ينشئ دورة في تسلسل الأماكن." };
    seen.add(parentId);
    parentId = data.places.find(x => x.id === parentId)?.parentId || "";
  }
  const old = data.places.find(x => x.id === form.id);
  const row = { ...form, id: form.id || uid(), name, parentId: form.parentId || "", createdAt: old?.createdAt || today, updatedAt: today, deletedAt: null };
  const places = form.id ? data.places.map(x => x.id === row.id ? row : x) : [row, ...data.places];
  const events = [{ id: uid(), type: form.id ? "PlaceUpdated" : "PlaceCreated", date: today, note: form.id ? "تم تحديث مكان." : "تم إنشاء مكان.", entityType: "place", entityId: row.id }, ...(data.events || [])];
  return { row, data: { ...data, places, events } };
}

export function archiveInventoryItem(data, id, today, uid) {
  const row = data.items.find(x => x.id === id && active(x));
  if (!row) return { error: "العنصر غير موجود أو مؤرشف بالفعل." };
  return { data: appendInventoryEvent({
    ...data,
    items: data.items.map(x => x.id === id ? { ...x, deletedAt: today, updatedAt: today } : x)
  }, { id: uid(), itemId: id, type: "Archived", date: today, note: "نُقل العنصر إلى الأرشيف." }) };
}

export function restoreInventoryItem(data, id, today, uid) {
  const row = data.items.find(x => x.id === id && x.deletedAt);
  if (!row) return { error: "العنصر غير موجود في الأرشيف." };
  return { data: appendInventoryEvent({
    ...data,
    items: data.items.map(x => x.id === id ? { ...x, deletedAt: null, updatedAt: today } : x)
  }, { id: uid(), itemId: id, type: "Restored", date: today, note: "تمت استعادة العنصر من الأرشيف." }) };
}

export function archiveInventoryReference(data, kind, id, today, uid) {
  const key = kind === "category" ? "categories" : "places";
  const record = data[key].find(x => x.id === id && active(x));
  if (!record) return { error: "السجل غير موجود أو مؤرشف بالفعل." };
  const usedByItems = data.items.some(x => active(x) && (kind === "category" ? x.categoryId === id : x.placeId === id));
  const hasChildren = kind === "place" && data.places.some(x => active(x) && x.parentId === id);
  if (usedByItems || hasChildren) {
    return { error: kind === "place"
      ? "لا يمكن أرشفة المكان قبل نقل العناصر المرتبطة به والأماكن التابعة إلى أماكن أخرى."
      : "لا يمكن أرشفة التصنيف قبل نقل العناصر المرتبطة به إلى تصنيف آخر." };
  }
  const events = [{ id: uid(), type: kind === "category" ? "CategoryArchived" : "PlaceArchived", date: today, note: kind === "category" ? "تمت أرشفة تصنيف." : "تمت أرشفة مكان.", entityType: kind, entityId: id }, ...(data.events || [])];
  return { data: { ...data, [key]: data[key].map(x => x.id === id ? { ...x, deletedAt: today, updatedAt: today } : x), events } };
}

export function prepareRelatedInventoryRecord(kind, form, data, today, uid) {
  const validation = validateInventoryRecord(kind, form, data);
  if (validation.length) return { error: validation[0] };
  const key = kind === "warranty" ? "warranties" : kind === "loan" ? "loans" : kind === "replacement" ? "replacements" : "services";
  const isNew = !form.id || !data[key].some(x => x.id === form.id);
  const row = { ...form, id: form.id || uid(), updatedAt: today, ...(isNew ? { createdAt: today } : {}) };
  delete row.kind;
  if (kind === "loan" && row.returnedAt && row.loanedAt && row.returnedAt < row.loanedAt) {
    return { error: "تاريخ الإرجاع لا يمكن أن يسبق تاريخ الإعارة." };
  }
  if (kind === "warranty" && row.startDate && row.endDate && row.endDate < row.startDate) {
    return { error: "تاريخ نهاية الضمان لا يمكن أن يسبق تاريخ بدايته." };
  }
  if (kind === "loan" && isNew) {
    const openLoan = data.loans.some(x => x.itemId === row.itemId && !x.returnedAt && x.status !== "Returned");
    if (openLoan) return { error: "لهذا العنصر إعارة مفتوحة بالفعل؛ سجّل إرجاعها أولًا." };
    if (row.direction !== "Borrowed") {
      const item = data.items.find(x => x.id === row.itemId && active(x));
      if (item?.status === "Loaned") return { error: "العنصر مسجل بالفعل على أنه مُعار." };
      if (item && item.status !== "Owned") return { error: "لا يمكن إعارة عنصر حالته الحالية " + item.status + "." };
    }
  }
  const typeByKind = { warranty: "Warranty", loan: "Loan", replacement: "Replacement", service: "Service" };
  const type = typeByKind[kind] + (isNew ? ({ warranty: "Added", loan: "Created", replacement: "Planned", service: "Recorded" })[kind] : "Updated");
  const label = ({ warranty: "ضمان", loan: "إعارة", replacement: "استبدال", service: "صيانة" })[kind];
  let next = {
    ...data,
    [key]: isNew ? [row, ...data[key]] : data[key].map(x => x.id === row.id ? row : x)
  };
  next = appendInventoryEvent(next, {
    id: uid(), itemId: row.itemId, type, date: today,
    note: isNew ? "تم إنشاء سجل " + label + "." : "تم تحديث سجل " + label + "."
  });
  if (kind === "loan" && isNew && row.direction !== "Borrowed") {
    next = {
      ...next,
      items: next.items.map(item => item.id === row.itemId ? { ...item, status: "Loaned", updatedAt: today } : item)
    };
    next = appendInventoryEvent(next, {
      id: uid(), itemId: row.itemId, type: "Loaned", date: today,
      previousStatus: "Owned", currentStatus: "Loaned",
      note: "تم إعارة الممتلك وتحديث حالته إلى مُعار."
    });
  }
  return { row, data: next, isNew };
}

export function returnInventoryLoan(data, loanId, today, uid) {
  const loan = data.loans.find(x => x.id === loanId);
  if (!loan) return { error: "سجل الإعارة غير موجود." };
  if (loan.returnedAt || loan.status === "Returned") return { error: "تم تسجيل إرجاع هذه الإعارة بالفعل." };
  if (loan.loanedAt && today < loan.loanedAt) return { error: "تاريخ الإرجاع لا يمكن أن يسبق تاريخ الإعارة." };
  let next = {
    ...data,
    loans: data.loans.map(x => x.id === loanId ? { ...x, returnedAt: today, updatedAt: today } : x)
  };
  if (loan.direction !== "Borrowed") {
    const item = next.items.find(x => x.id === loan.itemId && active(x));
    if (item?.status === "Loaned") {
      next = {
        ...next,
        items: next.items.map(x => x.id === loan.itemId ? { ...x, status: "Owned", updatedAt: today } : x)
      };
      next = appendInventoryEvent(next, {
        id: uid(), itemId: loan.itemId, type: "Returned", date: today,
        previousStatus: "Loaned", currentStatus: "Owned",
        note: "عاد الممتلك بعد الإعارة وتحدّثت حالته إلى مملوك."
      });
    }
  }
  next = appendInventoryEvent(next, {
    id: uid(), itemId: loan.itemId, type: "LoanReturned", date: today, note: "تم تسجيل إرجاع الإعارة."
  });
  return { data: next };
}
