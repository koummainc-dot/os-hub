// Pure domain rules for Home OS. Keep derived values deterministic and storage-agnostic.
export const HOME_ITEM_TYPES = Object.freeze(["asset", "consumable", "tool", "furniture", "textile", "document", "misc"]);
export const HOME_ITEM_CONDITIONS = Object.freeze(["good", "broken", "dispose"]);
export const HOME_STOCK_UNITS = Object.freeze(["piece", "pack", "kg", "liter", "box"]);
export const HOME_ROOM_TYPES = Object.freeze(["bedroom", "kitchen", "bathroom", "living", "office", "balcony", "storage", "outdoor", "general"]);
export const HOME_MOVEMENT_TYPES = Object.freeze(["receive", "consume", "adjust", "move", "dispose"]);

export function normalizeHomeData(value = {}) {
  const data = value && typeof value === "object" ? value : {};
  const array = (key) => Array.isArray(data[key]) ? data[key] : [];
  return {
    schemaVersion: 1,
    properties: array("properties"),
    rooms: array("rooms"),
    items: array("items"),
    movements: array("movements"),
    settings: { currency: "EGP", timezone: "Africa/Cairo", ...(data.settings && typeof data.settings === "object" ? data.settings : {}) }
  };
}

export function deriveStockState(item) {
  const quantity = Number(item?.quantity ?? 0);
  const minimum = Number(item?.minimumQuantity ?? 0);
  if (!Number.isFinite(quantity) || quantity <= 0) return "out";
  if (quantity <= minimum) return "low";
  return "available";
}

export function deriveWarrantyState(item, today) {
  if (!item?.warrantyUntil) return "unknown";
  if (item.warrantyUntil < today) return "expired";
  const remaining = Math.ceil((Date.parse(item.warrantyUntil + "T00:00:00Z") - Date.parse(today + "T00:00:00Z")) / 86400000);
  return remaining <= 60 ? "expiring" : "active";
}

export function validateHomeProperty(record) {
  const errors = [];
  if (!String(record?.name || "").trim()) errors.push("اسم العقار مطلوب.");
  if (String(record?.name || "").trim().length > 120) errors.push("اسم العقار يجب ألا يتجاوز 120 حرفًا.");
  return errors;
}

export function validateHomeRoom(record, data) {
  const errors = [];
  if (!String(record?.name || "").trim()) errors.push("اسم الغرفة مطلوب.");
  if (!HOME_ROOM_TYPES.includes(record?.type)) errors.push("نوع الغرفة غير صالح.");
  if (!data.properties.some(p => p.id === record?.propertyId && !p.deletedAt)) errors.push("اختر عقارًا نشطًا.");
  return errors;
}

export function validateHomeItem(record, data) {
  const errors = [];
  if (!String(record?.name || "").trim()) errors.push("اسم العنصر مطلوب.");
  if (!HOME_ITEM_TYPES.includes(record?.type)) errors.push("نوع العنصر غير صالح.");
  if (!HOME_ITEM_CONDITIONS.includes(record?.condition)) errors.push("حالة العنصر غير صالحة.");
  if (!HOME_STOCK_UNITS.includes(record?.unit)) errors.push("وحدة القياس غير صالحة.");
  const quantity = Number(record?.quantity);
  const minimum = Number(record?.minimumQuantity ?? 0);
  if (!Number.isFinite(quantity) || quantity < 0) errors.push("الكمية يجب أن تكون رقمًا غير سالب.");
  if (!Number.isFinite(minimum) || minimum < 0) errors.push("الحد الأدنى يجب أن يكون رقمًا غير سالب.");
  if (record?.unitPrice !== "" && record?.unitPrice != null && (!Number.isFinite(Number(record.unitPrice)) || Number(record.unitPrice) < 0)) errors.push("سعر الوحدة يجب أن يكون رقمًا غير سالب.");
  if (record?.expiryDate && !/^\\d{4}-\\d{2}-\\d{2}$/.test(record.expiryDate)) errors.push("تاريخ الصلاحية غير صالح.");
  if (!data.properties.some(p => p.id === record?.propertyId && !p.deletedAt)) errors.push("اختر عقارًا نشطًا.");
  if (record?.roomId && !data.rooms.some(r => r.id === record.roomId && r.propertyId === record.propertyId && !r.deletedAt)) errors.push("الغرفة لا تتبع العقار المحدد.");
  return errors;
}

export function validateHomeMovement(movement, item) {
  const errors = [];
  if (!item || item.deletedAt) errors.push("العنصر غير موجود أو مؤرشف.");
  if (!HOME_MOVEMENT_TYPES.includes(movement?.type)) errors.push("نوع حركة المخزون غير صالح.");
  const quantity = Number(movement?.quantity);
  if (!Number.isFinite(quantity) || quantity <= 0) errors.push("كمية الحركة يجب أن تكون أكبر من صفر.");
  if (["consume", "dispose"].includes(movement?.type) && item && quantity > Number(item.quantity)) errors.push("لا يمكن صرف كمية أكبر من المتاح.");
  return errors;
}

export function applyHomeMovement(item, movement) {
  const quantity = Number(movement.quantity);
  let next = Number(item.quantity);
  if (movement.type === "receive") next += quantity;
  if (movement.type === "consume" || movement.type === "dispose") next -= quantity;
  if (movement.type === "adjust") next = quantity;
  if (movement.type === "move") return { ...item, roomId: movement.toRoomId || item.roomId, updatedAt: movement.occurredAt };
  if (!Number.isFinite(next) || next < 0) throw new Error("HOME_STOCK_NEGATIVE");
  return { ...item, quantity: next, updatedAt: movement.occurredAt };
}

export function deriveRoomHealth(roomId, data, today) {
  const roomItems = data.items.filter(item => item.roomId === roomId && !item.deletedAt);
  const lowStock = roomItems.filter(item => item.type === "consumable" && ["low", "out"].includes(deriveStockState(item))).length;
  const expired = roomItems.filter(item => item.expiryDate && item.expiryDate < today).length;
  const reasons = [];
  if (lowStock) reasons.push({ code: "low_stock", count: lowStock });
  if (expired) reasons.push({ code: "expired_items", count: expired });
  return { state: expired ? "red" : lowStock ? "yellow" : "green", reasons, lowStock, expired, itemCount: roomItems.length };
}
