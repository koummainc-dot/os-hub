export const INGREDIENT_CATALOG_VERSION = "2026.11.03.1";

export const INGREDIENT_CATALOG_SOURCES = Object.freeze({
  cosing: {
    label: "European Commission — CosIng",
    url: "https://single-market-economy.ec.europa.eu/sectors/cosmetics/cosmetic-ingredient-database_en",
  },
  glossary: {
    label: "European Commission — CosIng Glossary",
    url: "https://single-market-economy.ec.europa.eu/sectors/cosmetics/cosmetic-ingredient-database/cosing-glossary-ingredients_en",
  },
  cir: {
    label: "Cosmetic Ingredient Review — Ingredient Reports",
    url: "https://www.cir-safety.org/ingredients/reports",
  },
});

const sourceText = "مرجع الاسم: European Commission CosIng / glossary. هذا السجل لا يثبت السماح التنظيمي أو سلامة المكوّن أو فعاليته.";
const entry = (key, inciName, aliases = []) => ({
  catalogKey: key,
  catalogVersion: INGREDIENT_CATALOG_VERSION,
  inciName,
  aliases,
  function: "",
  notes: "سجل مرجعي للاسم فقط. لم تُضف وظيفة أو درجة أمان أو توصية استخدام دون مرجع خاص بالمادة والتركيز وطريقة الاستخدام.",
  flag: "none",
  source: sourceText,
  referenceUrl: INGREDIENT_CATALOG_SOURCES.glossary.url,
  sourceType: "curated_reference",
});

export const INGREDIENT_CATALOG = Object.freeze([
  entry("aqua", "Aqua", ["Water"]),
  entry("glycerin", "Glycerin", ["Glycerol"]),
  entry("niacinamide", "Niacinamide", ["Nicotinamide"]),
  entry("panthenol", "Panthenol", ["D-Panthenol"]),
  entry("sodium-hyaluronate", "Sodium Hyaluronate", []),
  entry("tocopherol", "Tocopherol", []),
  entry("allantoin", "Allantoin", []),
  entry("squalane", "Squalane", []),
  entry("dimethicone", "Dimethicone", []),
  entry("ceramide-np", "Ceramide NP", ["Ceramide 3"]),
  entry("salicylic-acid", "Salicylic Acid", []),
  entry("lactic-acid", "Lactic Acid", []),
  entry("zinc-oxide", "Zinc Oxide", []),
  entry("titanium-dioxide", "Titanium Dioxide", []),
  entry("caprylic-capric-triglyceride", "Caprylic/Capric Triglyceride", []),
  entry("cetearyl-alcohol", "Cetearyl Alcohol", []),
  entry("butyrospermum-parkii-butter", "Butyrospermum Parkii (Shea) Butter", ["Shea Butter"]),
  entry("camellia-sinensis-leaf-extract", "Camellia Sinensis Leaf Extract", []),
]);
