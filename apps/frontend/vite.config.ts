import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@cafe/shared-types": path.resolve(
        __dirname,
        "../../packages/shared-types/src/index.ts"
      ),
      "@cafe/ui-kit": path.resolve(
        __dirname,
        "../../packages/ui-kit/src/index.ts"
      ),
    },
  },

  server: {
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },

      "/sanctum": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
    },
  },

  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          query: ["@tanstack/react-query", "zustand"],
          motion: ["framer-motion"],
          ui: ["lucide-react", "sonner"],
        },
      },
    },
  },
});