import { defineConfig } from "vite";

// Each system under src/systems/<id>/index.jsx becomes its own lazy chunk (see OSSystemHost).
// Keep Rollup's default chunk graph so ESM execution order remains intact.
// Explicit vendor/supabase manual chunks previously introduced a production-only
// temporal-dead-zone failure ("Cannot access 'W' before initialization").
export default defineConfig({
  esbuild: {
    jsx: "automatic",
    jsxImportSource: "react",
  },
  build: {
    target: "es2019",
    sourcemap: false,
    chunkSizeWarningLimit: 2500,
  },
});
