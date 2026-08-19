// ローカル (ラズパイ) 稼働用のエントリポイント。
//
// Azure Static Web Apps が担っていた 3 つの役割を 1 プロセスで肩代わりする:
//   1. /api/*      … Azure Functions のハンドラ (functionsAdapter 経由)
//   2. /.auth/*    … EasyAuth の代わりに固定シングルユーザーを返す
//   3. それ以外     … frontend/dist の静的配信 + SPA フォールバック
//
// 認証は行わない。LAN 内からのみアクセスできる前提で運用すること。

const path = require("path");
const fs = require("fs");
const express = require("express");
const { createApiRouter } = require("./functionsAdapter");

const PORT = Number(process.env.PORT) || 8080;
const HOST = process.env.HOST || "0.0.0.0";
const FRONTEND_DIST =
  process.env.FRONTEND_DIST ||
  path.join(__dirname, "..", "..", "..", "frontend", "dist");

// LOCAL_USER_ID は Azure 稼働時の PartitionKey (SWA の GitHub principal ID) と
// 同じ値にしておくこと。移行したデータがそのまま見えるようになる。
const principal = {
  userId: process.env.LOCAL_USER_ID || "local-user",
  identityProvider: "local",
  userDetails: process.env.LOCAL_USER_DETAILS || "local",
  userRoles: ["anonymous", "authenticated", "owner"],
};

// staticwebapp.config.json の globalHeaders と同じ内容を再現する。
const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Content-Security-Policy":
    "default-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; script-src 'self' 'unsafe-inline'",
  "Referrer-Policy": "strict-origin-when-cross-origin",
};

function createServer() {
  const app = express();
  app.disable("x-powered-by");

  app.use((req, res, next) => {
    res.set(SECURITY_HEADERS);
    next();
  });

  // --- 認証エミュレーション (SWA EasyAuth 互換の最小限) ---
  app.get("/.auth/me", (req, res) => {
    res.json({ clientPrincipal: principal });
  });
  app.get("/.auth/login/:provider", (req, res) => res.redirect("/"));
  app.get("/.auth/logout", (req, res) => res.redirect("/"));

  // --- API ---
  app.use("/api", createApiRouter({ principal }));

  // --- 静的配信 + SPA フォールバック ---
  if (fs.existsSync(FRONTEND_DIST)) {
    app.use(express.static(FRONTEND_DIST));
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api") || req.path.startsWith("/.auth")) return next();
      res.sendFile(path.join(FRONTEND_DIST, "index.html"));
    });
  } else {
    console.warn(
      `[server] frontend dist が見つかりません: ${FRONTEND_DIST}\n` +
        `         'cd frontend && npm run build' を実行するか FRONTEND_DIST を設定してください。`
    );
  }

  return app;
}

if (require.main === module) {
  createServer().listen(PORT, HOST, () => {
    console.log(`[server] listening on http://${HOST}:${PORT}`);
    console.log(`[server] store backend : ${process.env.STORE_BACKEND || "azure"}`);
    console.log(`[server] user id       : ${principal.userId}`);
    console.log(`[server] frontend dist : ${FRONTEND_DIST}`);
  });
}

module.exports = { createServer, principal };
