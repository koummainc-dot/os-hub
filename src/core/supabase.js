import { createClient } from "@supabase/supabase-js";

// Public values (the anon/publishable key is designed to be public — Row Level Security protects the data).
// Override with VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY (env or Vercel). Defaults = the os-hub project (public values).
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://cvcngvlickozahecgmij.supabase.co";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_RTiy_YaiFQxF1TEQrZEvPA_gH5voyd3";

export let SUPABASE_SDK_FAILED = false;
export let supabase;
try {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new Error("VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set");
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
} catch (e) {
  SUPABASE_SDK_FAILED = true;
  console.error("Supabase init failed — app still renders (demo works), sign-in/sync disabled:", e);
  const failResult = () => Promise.resolve({ data: null, error: { message: "Supabase SDK failed to load" } });
  const stubQuery = {
    select() { return stubQuery; }, eq() { return stubQuery; }, order() { return stubQuery; }, limit() { return stubQuery; },
    maybeSingle: failResult, upsert: failResult, update() { return stubQuery; }, insert() { return stubQuery; }, delete() { return stubQuery; },
    then(res, rej) { return failResult().then(res, rej); },
  };
  supabase = {
    auth: {
      getSession: async () => ({ data: { session: null }, error: { message: "Supabase SDK failed to load" } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      signInWithPassword: failResult, signUp: failResult, resetPasswordForEmail: failResult, resend: failResult, updateUser: failResult,
      signOut: async () => ({ error: null }),
    },
    from() { return stubQuery; },
    rpc: failResult,
    channel() { const c = { on() { return c; }, subscribe(cb) { if (cb) cb("CLOSED"); return c; }, track: async () => ({}), untrack: async () => ({}), presenceState() { return {}; } }; return c; },
    removeChannel() {},
  };
}
