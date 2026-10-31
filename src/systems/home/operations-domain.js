// Home OS operations: task lifecycle, recurrence, maintenance and purchase workflows.
// Pure functions only; entities remain owned by Home OS. Finance/Projects/Today consume references/events.
export const HOME_TASK_STATUSES = Object.freeze(["active", "paused", "completed", "archived"]);
export const HOME_TASK_OUTCOMES = Object.freeze(["done", "skipped", "partial", "blocked"]);
export const HOME_MAINTENANCE_STATUSES = Object.freeze(["reported", "scheduled", "in_progress", "waiting_parts", "completed", "cancelled"]);
export const HOME_PURCHASE_STATUSES = Object.freeze(["draft", "needed", "approved", "ordered", "partially_received", "received", "cancelled"]);

const validDate = value => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value + "T00:00:00Z"));
const nonNegative = value => value == null || value === "" || (Number.isFinite(Number(value)) && Number(value) >= 0);

export function validateHomeTask(task, data = {}) {
  const errors = [];
  if (!String(task?.title || "").trim()) errors.push("عنوان المهمة المنزلية مطلوب.");
  if (!HOME_TASK_STATUSES.includes(task?.status || "active")) errors.push("حالة المهمة غير صالحة.");
  if (task?.dueDate && !validDate(task.dueDate)) errors.push("تاريخ استحقاق المهمة غير صالح.");
  if (!nonNegative(task?.estimatedMinutes)) errors.push("المدة التقديرية يجب ألا تكون سالبة.");
  if (task?.propertyId && !data.properties?.some(p => p.id === task.propertyId && !p.deletedAt)) errors.push("العقار المرتبط بالمهمة غير نشط.");
  if (task?.roomId && !data.rooms?.some(r => r.id === task.roomId && r.propertyId === task.propertyId && !r.deletedAt)) errors.push("الغرفة لا تتبع العقار المحدد.");
  const rule = task?.recurrenceRule || { frequency: "none" };
  if (!["none", "daily", "weekly", "monthly", "yearly", "interval"].includes(rule.frequency)) errors.push("قاعدة التكرار غير مدعومة.");
  if (rule.frequency === "interval" && (!Number.isInteger(Number(rule.intervalDays)) || Number(rule.intervalDays) < 1 || Number(rule.intervalDays) > 365)) errors.push("فاصل التكرار يجب أن يكون من 1 إلى 365 يومًا.");
  return errors;
}

export function nextHomeTaskDue(task, completedAt) {
  const rule = task?.recurrenceRule || { frequency: "none" };
  const date = new Date(completedAt || Date.now());
  if (Number.isNaN(date.getTime())) throw new Error("HOME_TASK_COMPLETION_DATE_INVALID");
  const next = new Date(date);
  if (rule.frequency === "daily") next.setUTCDate(next.getUTCDate() + 1);
  else if (rule.frequency === "weekly") next.setUTCDate(next.getUTCDate() + 7);
  else if (rule.frequency === "monthly") {
    const originalDay = next.getUTCDate();
    next.setUTCDate(1);
    next.setUTCMonth(next.getUTCMonth() + 1);
    const lastDay = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)).getUTCDate();
    next.setUTCDate(Math.min(originalDay, lastDay));
  } else if (rule.frequency === "yearly") {
    const month = next.getUTCMonth();
    const day = next.getUTCDate();
    next.setUTCDate(1);
    next.setUTCFullYear(next.getUTCFullYear() + 1);
    next.setUTCMonth(month);
    const lastDay = new Date(Date.UTC(next.getUTCFullYear(), month + 1, 0)).getUTCDate();
    next.setUTCDate(Math.min(day, lastDay));
  }
  else if (rule.frequency === "interval") {
    const days = Number(rule.intervalDays);
    if (!Number.isInteger(days) || days < 1 || days > 365) throw new Error("HOME_TASK_INTERVAL_INVALID");
    next.setUTCDate(next.getUTCDate() + days);
  } else return null;
  return next.toISOString();
}

export function completeHomeTask(task, completion) {
  if (!task || task.deletedAt || task.status !== "active") throw new Error("HOME_TASK_NOT_ACTIVE");
  if (!HOME_TASK_OUTCOMES.includes(completion?.outcome || "done")) throw new Error("HOME_TASK_OUTCOME_INVALID");
  const outcome = completion?.outcome || "done";
  const completedAt = completion?.completedAt || new Date().toISOString();
  const isDone = outcome === "done";
  return {
    task: {
      ...task,
      lastCompletedAt: isDone ? completedAt : (task.lastCompletedAt || null),
      nextDueAt: isDone ? nextHomeTaskDue(task, completedAt) : (task.nextDueAt || null),
      dueDate: isDone ? (nextHomeTaskDue(task, completedAt)?.slice(0, 10) || null) : (task.dueDate || null),
      reminderAt: isDone ? null : (task.reminderAt || null),
      updatedAt: completedAt
    },
    completion: { ...completion, outcome, completedAt }
  };
}

export function validateHomeMaintenance(record, data = {}) {
  const errors = [];
  if (!String(record?.title || "").trim()) errors.push("عنوان الصيانة مطلوب.");
  if (!HOME_MAINTENANCE_STATUSES.includes(record?.status || "reported")) errors.push("حالة الصيانة غير صالحة.");
  if (!record?.propertyId || !data.properties?.some(p => p.id === record.propertyId && !p.deletedAt)) errors.push("اختر عقارًا نشطًا للصيانة.");
  if (record?.roomId && !data.rooms?.some(r => r.id === record.roomId && r.propertyId === record.propertyId && !r.deletedAt)) errors.push("الغرفة لا تتبع العقار المحدد.");
  if (record?.inventoryItemId && !data.items?.some(i => i.id === record.inventoryItemId && i.propertyId === record.propertyId && !i.deletedAt)) errors.push("عنصر المخزون المرتبط غير صالح.");
  if (!nonNegative(record?.costAmount)) errors.push("تكلفة الصيانة يجب ألا تكون غير سالبة.");
  if (record?.nextMaintenanceDate && !validDate(record.nextMaintenanceDate)) errors.push("تاريخ الصيانة القادمة غير صالح.");
  return errors;
}

export function validateHomePurchaseRequest(request, items = [], data = {}) {
  const errors = [];
  if (!String(request?.title || "").trim()) errors.push("عنوان طلب الشراء مطلوب.");
  if (!request?.propertyId || !data.properties?.some(p => p.id === request.propertyId && !p.deletedAt)) errors.push("اختر عقارًا نشطًا للشراء.");
  if (!HOME_PURCHASE_STATUSES.includes(request?.status || "draft")) errors.push("حالة طلب الشراء غير صالحة.");
  if (!items.length) errors.push("أضف عنصرًا واحدًا على الأقل إلى طلب الشراء.");
  for (const [index, item] of items.entries()) {
    if (!String(item?.name || "").trim()) errors.push(`اسم العنصر رقم ${index + 1} مطلوب.`);
    if (!Number.isFinite(Number(item?.quantity)) || Number(item.quantity) <= 0) errors.push(`كمية العنصر رقم ${index + 1} يجب أن تكون أكبر من صفر.`);
    if (!nonNegative(item?.estimatedUnitPrice)) errors.push(`السعر التقديري للعنصر رقم ${index + 1} غير صالح.`);
    if (Number(item?.receivedQuantity || 0) > Number(item?.quantity || 0)) errors.push(`الكمية المستلمة للعنصر رقم ${index + 1} تتجاوز المطلوبة.`);
  }
  if (!nonNegative(request?.budgetAmount)) errors.push("الميزانية يجب ألا تكون سالبة.");
  return errors;
}

export function deriveHomePurchaseTotal(items = [], priceKey = "estimatedUnitPrice") {
  return items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item[priceKey] || 0), 0);
}

export function deriveHomePurchaseStatus(items = []) {
  if (!items.length) return "needed";
  const requested = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const received = items.reduce((sum, item) => sum + Number(item.receivedQuantity || 0), 0);
  if (received <= 0) return "ordered";
  if (received < requested) return "partially_received";
  return "received";
}

export function homeTaskEvent(task, completion) {
  return {
    type: "home.task.completed",
    ownerSystem: "home",
    entityType: "home_task",
    entityId: task.id,
    occurredAt: completion.completedAt,
    payload: { outcome: completion.outcome, propertyId: task.propertyId || null, roomId: task.roomId || null, nextDueAt: task.nextDueAt || null }
  };
}
