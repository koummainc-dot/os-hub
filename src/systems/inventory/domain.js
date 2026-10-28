// Pure domain rules for Personal Inventory OS.
// These helpers are intentionally storage-agnostic so the same rules can later
// be enforced by API/database services as well as by the UI.

export function deriveWarrantyState(warranty, today) {
  if (warranty?.status === "Void") return "Void";
  if (warranty?.status === "ClaimOpen") return "ClaimOpen";
  if (!warranty?.endDate) return "Unknown";
  if (warranty.endDate < today) return "Expired";
  if (warranty.startDate && warranty.startDate > today) return "Upcoming";
  return "Active";
}

export function deriveLoanState(loan, today) {
  if (loan?.returnedAt) return "Returned";
  if (!loan?.loanedAt) return "Unknown";
  if (loan.dueDate && loan.dueDate < today) return "Overdue";
  return "Open";
}

export function deriveReplacementState(plan, today) {
  if (plan?.status === "Completed" || plan?.status === "Cancelled") return plan.status;
  if (plan?.status === "Deferred") return "Deferred";
  if (!plan?.expectedDate) return plan?.status || "Planned";
  if (plan.expectedDate < today) return "Due";
  return plan?.status || "Planned";
}

export function validateInventoryRecord(kind, record, data) {
  const errors = [];
  const existsItem = id => Boolean(id && data.items.some(item => item.id === id && !item.deletedAt));
  if (!existsItem(record?.itemId)) errors.push("اختر عنصرًا نشطًا موجودًا في الجرد.");
  if (kind === "warranty") {
    if (record.startDate && record.endDate && record.endDate < record.startDate) {
      errors.push("تاريخ نهاية الضمان لا يمكن أن يسبق تاريخ بدايته.");
    }
  }
  if (kind === "loan") {
    if (!String(record.person || "").trim()) errors.push("اسم الشخص مطلوب لتسجيل الإعارة.");
    if (record.loanedAt && record.dueDate && record.dueDate < record.loanedAt) {
      errors.push("موعد الإرجاع لا يمكن أن يسبق تاريخ الإعارة.");
    }
  }
  if (kind === "replacement") {
    if (record.budget !== "" && record.budget !== null && record.budget !== undefined) {
      const amount = Number(record.budget);
      if (!Number.isFinite(amount) || amount < 0) errors.push("الميزانية المتوقعة يجب أن تكون رقمًا غير سالب.");
    }
  }
  if (kind === "service") {
    if (record.cost !== "" && record.cost !== null && record.cost !== undefined) {
      const amount = Number(record.cost);
      if (!Number.isFinite(amount) || amount < 0) errors.push("تكلفة الخدمة يجب أن تكون رقمًا غير سالب.");
    }
    if (record.date && record.nextDueDate && record.nextDueDate < record.date) {
      errors.push("موعد الخدمة القادمة لا يمكن أن يسبق تاريخ الخدمة الحالية.");
    }
  }
  return errors;
}

export function appendInventoryEvent(data, event) {
  return {
    ...data,
    events: [{ ...event }, ...(Array.isArray(data.events) ? data.events : [])]
  };
}
