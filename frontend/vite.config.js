import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// ローカルサーバー (api/src/local/server.js) の待ち受けポート。
// ラズパイ側 (.env の PORT) を変えたときは、開発時も同じ値を渡す:
//   PORT=9000 npm run dev
const apiPort = process.env.PORT || process.env.VITE_API_PORT || 8787;
const apiTarget = `http://localhost:${apiPort}`;

export default defineConfig({
  plugins: [react()],
  build: { outDir: "dist", assetsDir: "assets" },
  server: {
    // ローカルサーバーが /api と /.auth の両方を提供する。
    // Azure Functions Core Tools / SWA CLI は不要。
    proxy: {
      "/api": apiTarget,
      "/.auth": apiTarget,
    },
  },
});
