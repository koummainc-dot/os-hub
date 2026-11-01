import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const nutrients = (list: any[] = []) => {
  const map = new Map<number, number>();
  for (const item of list) {
    const id = Number(item?.nutrient?.id ?? item?.nutrientId);
    const amount = Number(item?.amount ?? item?.value);
    if (Number.isFinite(id) && Number.isFinite(amount) && amount >= 0) map.set(id, amount);
  }
  const get = (id: number) => map.get(id) ?? 0;
  return { calories: get(1008) || get(2047) || get(2048), proteinG: get(1003), carbsG: get(1005), fatG: get(1004), fiberG: get(1079), sugarG: get(2000) || get(1063), sodiumMg: get(1093) };
};
const validGTIN = (raw: string) => {
  const code = raw.replace(/\s+/g, "");
  if (!/^(\d{8}|\d{12}|\d{13}|\d{14})$/.test(code)) return false;
  const ds = code.split("").map(Number), check = ds.pop()!;
  let sum = 0, weight = 3;
  for (let i = ds.length - 1; i >= 0; i--) { sum += ds[i] * weight; weight = weight === 3 ? 1 : 3; }
  return (10 - sum % 10) % 10 === check;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return reply({ ok: false, reason: "method-not-allowed" }, 405);
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const fdcKey = Deno.env.get("FDC_API_KEY");
  if (!supabaseUrl || !anonKey) return reply({ ok: false, reason: "platform-not-configured" }, 503);
  if (!fdcKey) return reply({ ok: false, reason: "catalog-not-configured", message: "FDC_API_KEY secret is not configured." }, 503);
  const auth = req.headers.get("Authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (!token || token === auth) return reply({ ok: false, reason: "unauthorized" }, 401);
  let body: any;
  try { body = await req.json(); } catch { return reply({ ok: false, reason: "invalid-json" }, 400); }
  const workspaceId = String(body?.workspaceId || "");
  const barcode = String(body?.barcode || "").replace(/\s+/g, "");
  if (!workspaceId || !validGTIN(barcode)) return reply({ ok: false, reason: "invalid-reference" }, 400);

  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } });
  const { data: userResult, error: userError } = await userClient.auth.getUser(token);
  if (userError || !userResult?.user) return reply({ ok: false, reason: "unauthorized" }, 401);
  const userId = userResult.user.id;
  const { data: workspace, error: workspaceError } = await userClient.from("workspaces").select("id,owner_id").eq("id", workspaceId).maybeSingle();
  if (workspaceError) return reply({ ok: false, reason: "workspace-access-check-failed" }, 403);
  let allowed = workspace?.owner_id === userId;
  if (!allowed) {
    const { data: membership, error: memberError } = await userClient.from("workspace_members").select("status").eq("workspace_id", workspaceId).eq("user_id", userId).maybeSingle();
    if (memberError) return reply({ ok: false, reason: "workspace-access-check-failed" }, 403);
    allowed = membership?.status === "active";
  }
  if (!allowed) return reply({ ok: false, reason: "workspace-forbidden" }, 403);

  try {
    const url = new URL("https://api.nal.usda.gov/fdc/v1/foods/search");
    url.searchParams.set("api_key", fdcKey);
    url.searchParams.set("query", barcode);
    url.searchParams.set("dataType", "Branded");
    url.searchParams.set("pageSize", "25");
    const upstream = await fetch(url, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(10000) });
    if (upstream.status === 429) return reply({ ok: false, reason: "catalog-rate-limited" }, 429);
    if (!upstream.ok) return reply({ ok: false, reason: "catalog-upstream-error", upstreamStatus: upstream.status }, 502);
    const result = await upstream.json();
    const match = (result?.foods || []).find((food: any) => String(food?.gtinUpc || "").replace(/\s+/g, "") === barcode);
    if (!match) return reply({ ok: false, reason: "product-not-found" }, 404);
    const food = {
      name: String(match.description || "").slice(0, 180),
      brand: String(match.brandOwner || match.brandName || "").slice(0, 120),
      basisAmount: 100,
      basisUnit: "g",
      servingAmount: Number.isFinite(Number(match.servingSize)) && Number(match.servingSize) > 0 ? Number(match.servingSize) : 0,
      servingUnit: String(match.servingSizeUnit || "").slice(0, 20),
      nutrients: nutrients(match.foodNutrients || []),
      fdcId: String(match.fdcId || ""),
      source: "USDA FoodData Central",
      verificationLevel: "unverified",
      barcode,
      attribution: "U.S. Department of Agriculture, Agricultural Research Service. FoodData Central.",
    };
    return reply({ ok: true, food });
  } catch (error) {
    console.error("nutrition-food-lookup failed", error);
    return reply({ ok: false, reason: "catalog-request-failed" }, 502);
  }
});
