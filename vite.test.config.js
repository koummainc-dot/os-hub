// Test bundle: one IIFE file (runs inside jsdom). Supabase is replaced by a stub that reads
// globalThis.__SUPABASE_FACTORY__ so tests can inject a fake backend.
import { defineConfig } from "vite";
import { fileURLToPath } from "url";
export default defineConfig({
  esbuild: {
    jsx: "automatic",
    jsxImportSource: "react",
  },
  define: {
    "import.meta.env.VITE_SUPABASE_URL": JSON.stringify("https://test.local"),
    "import.meta.env.VITE_SUPABASE_ANON_KEY": JSON.stringify("test-key"),
    "process.env.NODE_ENV": JSON.stringify("development"),
  },
  resolve: { alias: { "@supabase/supabase-js": fileURLToPath(new URL("./tests/stubs/supabase.js", import.meta.url)) } },
  build: {
    outDir: "dist-test", emptyOutDir: true, minify: false, sourcemap: false,
    lib: { entry: "src/main.jsx", name: "OSApp", formats: ["iife"], fileName: () => "app.iife.js" },
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
});
