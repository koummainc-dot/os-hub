// Test stub for @supabase/supabase-js — the harness injects the fake via globalThis.__SUPABASE_FACTORY__
export function createClient(...args) {
  const f = globalThis.__SUPABASE_FACTORY__;
  if (!f) throw new Error("No __SUPABASE_FACTORY__ injected");
  return f(...args);
}
