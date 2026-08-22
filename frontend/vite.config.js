import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: { outDir: "dist", assetsDir: "assets" },
  server: {
    // ローカルサーバー (api/src/local/server.js) が /api と /.auth の両方を提供する。
    // Azure Functions Core Tools / SWA CLI は不要。
    proxy: {
      "/api": "http://localhost:8080",
      "/.auth": "http://localhost:8080",
    },
  },
});
