export const SKINCARE_COLLECTIONS = Object.freeze({
  profile: "skin_profile",
  products: "skin_products",
  units: "skin_units",
});

const text = (value, max = 160) => String(value ?? "").trim().slice(0, max);

export function validateSkinProfile(input = {}) {
  const skinType = text(input.skinType, 40);
  const concerns = Array.isArray(input.concerns) ? input.concerns.map(x => text(x, 60)).filter(Boolean).slice(0, 20) : [];
  const sensitivities = Array.isArray(input.sensitivities) ? input.sensitivities.map(x => text(x, 80)).filter(Boolean).slice(0, 20) : [];
  if (skinType && !["normal", "dry", "oily", "combination", "sensitive", "unknown"].includes(skinType)) {
    return { ok: false, error: "نوع البشرة غير صحيح." };
  }
  return { ok: true, value: {
    id: "profile",
    skinType: skinType || "unknown",
    concerns,
    sensitivities,
    notes: text(input.notes, 2000),
    updatedAt: new Date().toISOString(),
  }};
}

export function validateSkinProduct(input = {}) {
  const name = text(input.name, 120);
  const brand = text(input.brand, 100);
  const category = text(input.category || "other", 40);
  const status = text(input.status || "active", 30);
  if (!name) return { ok: false, error: "اسم المنتج مطلوب." };
  if (!["cleanser", "moisturizer", "sunscreen", "serum", "treatment", "toner", "mask", "other"].includes(category)) {
    return { ok: false, error: "تصنيف المنتج غير صحيح." };
  }
  if (!["active", "paused", "finished", "discarded"].includes(status)) return { ok: false, error: "حالة المنتج غير صحيحة." };
  const startDate = text(input.startDate, 10);
  const expiryDate = text(input.expiryDate, 10);
  for (const [label, value] of [["تاريخ البدء", startDate], ["تاريخ الانتهاء", expiryDate]]) {
    if (value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) return { ok: false, error: label + " غير صالح." };
  }
  return { ok: true, value: {
    ...input, name, brand, category, status, startDate, expiryDate,
    ingredients: text(input.ingredients, 2000),
    instructions: text(input.instructions, 1000),
    notes: text(input.notes, 2000),
  }};
}

export function validateSkinUnit(input = {}) {
  const name = text(input.name, 100);
  const productId = text(input.productId, 100);
  const openedOn = text(input.openedOn, 10);
  const expiresOn = text(input.expiresOn, 10);
  if (!name) return { ok: false, error: "اسم العبوة مطلوب." };
  for (const [label, value] of [["تاريخ الفتح", openedOn], ["تاريخ الانتهاء", expiresOn]]) {
    if (value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) return { ok: false, error: label + " غير صالح." };
  }
  return { ok: true, value: { ...input, name, productId, openedOn, expiresOn, notes: text(input.notes, 1000) }};
}
