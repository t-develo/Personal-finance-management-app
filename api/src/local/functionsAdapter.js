// Azure Functions v4 のハンドラを、Azure Functions ランタイムなしで Express 上で動かすアダプタ。
//
// api/src/functions/*.js は `app.http(name, { methods, route, handler })` で自身を登録する。
// ここでは require の解決を一時的に差し替えて `@azure/functions` をスタブに置き換え、
// その登録内容を収集して Express にマウントする。
// これにより Functions ハンドラ本体には一切手を入れずに済む。

const Module = require("module");
const path = require("path");
const fs = require("fs");
const stub = require("./azureFunctionsStub");

const FUNCTIONS_DIR = path.join(__dirname, "..", "functions");

/**
 * api/src/functions/*.js を読み込み、app.http() の登録内容を配列で返す。
 *
 * 読み込みは一度きり (モジュールキャッシュ) なので、複数回呼んでも登録は重複しない。
 * @returns {Array<{name: string, methods: string[], route: string, handler: Function}>}
 */
function collectRegistrations(functionsDir = FUNCTIONS_DIR) {
  // Functions ファイルが require("@azure/functions") したときにスタブを返すよう差し替える。
  // (Jest 実行時は jest.mock 側が同じスタブを注入するため、このフックは素通りする)
  const originalLoad = Module._load;
  Module._load = function (request, ...rest) {
    if (request === "@azure/functions") return stub;
    return originalLoad.call(this, request, ...rest);
  };

  try {
    for (const file of fs.readdirSync(functionsDir).sort()) {
      if (file.endsWith(".js")) require(path.join(functionsDir, file));
    }
  } finally {
    Module._load = originalLoad;
  }

  if (stub.registrations.length === 0) {
    throw new Error(
      `No functions were registered from ${functionsDir}. ` +
        `'@azure/functions' の差し替えが効いていない可能性があります。`
    );
  }

  return stub.registrations;
}

/**
 * Azure Functions のルートテンプレートを Express のパスに変換する。
 * "accounts/{id}" -> "/accounts/:id"
 */
function toExpressPath(route) {
  return `/${route.replace(/\{([^}]+)\}/g, ":$1")}`;
}

/**
 * SWA が注入する x-ms-client-principal ヘッダ相当の値を作る。
 * api/src/shared/auth.js はこれを base64 デコードして owner ロールを確認する。
 */
function encodePrincipal(principal) {
  return Buffer.from(JSON.stringify(principal)).toString("base64");
}

/**
 * Express の req を Azure Functions の HttpRequest 風オブジェクトに変換する。
 * 認証は行わず、常に指定された principal を注入する (ローカル・シングルユーザー前提)。
 */
function toFunctionsRequest(req, encodedPrincipal) {
  return {
    method: req.method,
    url: req.originalUrl,
    params: req.params,
    query: new URLSearchParams(req.query),
    headers: {
      get: (name) => {
        if (String(name).toLowerCase() === "x-ms-client-principal") {
          return encodedPrincipal;
        }
        const value = req.get(name);
        return value === undefined ? null : value;
      },
    },
    // ハンドラ側は不正 JSON を SyntaxError として捕捉し 400 に変換するため、
    // ここで JSON.parse をそのまま透過させる (express.json() は使わない)。
    json: async () => JSON.parse(req.body),
  };
}

function createContext(name) {
  const log = (...args) => console.log(`[${name}]`, ...args);
  log.error = (...args) => console.error(`[${name}]`, ...args);
  log.warn = (...args) => console.warn(`[${name}]`, ...args);
  log.info = (...args) => console.info(`[${name}]`, ...args);
  return { log, functionName: name };
}

/**
 * ハンドラの戻り値 { status, jsonBody, headers } を Express のレスポンスに反映する。
 */
function sendFunctionsResponse(res, result) {
  const { status = 200, jsonBody, headers } = result || {};
  if (headers) {
    for (const [key, value] of Object.entries(headers)) res.set(key, value);
  }
  if (jsonBody === undefined) {
    res.status(status).end();
    return;
  }
  res.status(status).json(jsonBody);
}

/**
 * 収集した登録内容を Express Router にマウントする。
 * @param {object} options
 * @param {object} options.principal 固定シングルユーザーの clientPrincipal
 * @param {Array} [options.registrations] 省略時は api/src/functions/*.js から収集
 */
function createApiRouter({ principal, registrations }) {
  const express = require("express");
  const router = express.Router();
  const encodedPrincipal = encodePrincipal(principal);

  // ボディは生テキストで受け取り、パースはハンドラ側の json() に任せる。
  router.use(express.text({ type: "*/*", limit: "1mb" }));

  for (const registration of registrations || collectRegistrations()) {
    const expressPath = toExpressPath(registration.route);
    for (const method of registration.methods) {
      router[method.toLowerCase()](expressPath, async (req, res) => {
        const context = createContext(registration.name);
        try {
          const result = await registration.handler(
            toFunctionsRequest(req, encodedPrincipal),
            context
          );
          sendFunctionsResponse(res, result);
        } catch (error) {
          context.log.error("Unhandled error:", error);
          res.status(500).json({ error: "内部サーバーエラー" });
        }
      });
    }
  }

  return router;
}

module.exports = {
  collectRegistrations,
  toExpressPath,
  encodePrincipal,
  createApiRouter,
};
