// ローカル (ラズパイ) 稼働用のエントリポイント。
//
// Azure Static Web Apps が担っていた 3 つの役割を 1 プロセスで肩代わりする:
//   1. /api/*      … Azure Functions のハンドラ (functionsAdapter 経由)
//   2. /.auth/*    … EasyAuth の代わりに固定シングルユーザーを返す
//   3. それ以外     … frontend/dist の静的配信 + SPA フォールバック
//
// これに加えて /healthz を提供する。自動アップデート (deploy/update.sh) が
// 再起動後の生存確認と、反映された commit の確認に使う。
//
// 認証は行わない。LAN 内からのみアクセスできる前提で運用すること。

const path = require("path");
const fs = require("fs");
const express = require("express");
const { createApiRouter } = require("./functionsAdapter");

// 既定 8787。ラズパイでは 8080 を別のアプリが使っていることがあるため、
// よくある値を避けている。変更するときは .env の PORT を設定する。
const DEFAULT_PORT = 8787;
const PORT = Number(process.env.PORT) || DEFAULT_PORT;
const HOST = process.env.HOST || "0.0.0.0";
const REPO_ROOT = path.join(__dirname, "..", "..", "..");
const FRONTEND_DIST =
  process.env.FRONTEND_DIST || path.join(REPO_ROOT, "frontend", "dist");

// LOCAL_USER_ID は Azure 稼働時の PartitionKey (SWA の GitHub principal ID) と
// 同じ値にしておくこと。移行したデータがそのまま見えるようになる。
const principal = {
  userId: process.env.LOCAL_USER_ID || "local-user",
  identityProvider: "local",
  userDetails: process.env.LOCAL_USER_DETAILS || "local",
  userRoles: ["anonymous", "authenticated", "owner"],
};

const STARTED_AT = Date.now();

/**
 * 稼働中のコードの commit を .git から直接読む (git コマンドは起動しない)。
 *
 * 更新時は必ずサービスが再起動されるので、プロセスの生存中に値は変わらない。
 * git 管理外に配置された場合など、読めないときは null を返す。
 * @returns {string|null}
 */
function readCommit(repoRoot = REPO_ROOT) {
  try {
    const gitDir = path.join(repoRoot, ".git");
    const head = fs.readFileSync(path.join(gitDir, "HEAD"), "utf8").trim();
    if (!head.startsWith("ref:")) return head || null;

    const ref = head.slice(4).trim();
    const refFile = path.join(gitDir, ref);
    if (fs.existsSync(refFile)) {
      return fs.readFileSync(refFile, "utf8").trim() || null;
    }
    // 未 gc の ref はファイルではなく packed-refs にまとまっている。
    const packed = path.join(gitDir, "packed-refs");
    if (fs.existsSync(packed)) {
      for (const line of fs.readFileSync(packed, "utf8").split("\n")) {
        if (line.startsWith("#") || line.startsWith("^")) continue;
        const [sha, name] = line.split(" ");
        if (name === ref) return sha;
      }
    }
    return null;
  } catch {
    return null;
  }
}

// 起動時に一度だけ解決する。
const COMMIT = readCommit();

/**
 * /healthz のレスポンス本体。
 *
 * DB へは問い合わせない。15 分ごとに叩かれるため、SQLite に余計なロックを
 * 掛けないようにしている。あくまで「プロセスが応答している」ことの表明。
 */
function buildHealth() {
  return {
    status: "ok",
    commit: COMMIT,
    backend: process.env.STORE_BACKEND || "azure",
    frontendDist: fs.existsSync(FRONTEND_DIST),
    uptimeSec: Math.floor((Date.now() - STARTED_AT) / 1000),
  };
}

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

  // --- 死活監視 (deploy/update.sh が更新後の確認に使う) ---
  // SPA フォールバックより前に登録すること。
  app.get("/healthz", (req, res) => {
    const body = buildHealth();
    res.status(body.status === "ok" ? 200 : 503).json(body);
  });

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
    console.log(`[server] commit        : ${COMMIT || "unknown"}`);
  });
}

module.exports = { createServer, principal, buildHealth, readCommit };
