import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Each system under src/systems/<id>/index.jsx becomes its own lazy chunk (see OSSystemHost).
export default defineConfig({
  plugins: [react()],
  build: {
    target: "es2019",
    sourcemap: false,
    chunkSizeWarningLimit: 2500,
    rollupOptions: {
      output: {
        manualChunks: { vendor: ["react", "react-dom"], supabase: ["@supabase/supabase-js"] },
      },
    },
  },
});
