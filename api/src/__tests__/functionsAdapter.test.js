"use strict";

// Express アダプタ + ローカルサーバーを、実 HTTP リクエストで検証する。
// ストアは SQLite のインメモリ DB を使い、Azure には一切接続しない。
process.env.STORE_BACKEND = "sqlite";
process.env.SQLITE_PATH = ":memory:";
process.env.LOCAL_USER_ID = "local-test-user";
process.env.LOCAL_USER_DETAILS = "ローカルユーザー";
process.env.FRONTEND_DIST = "/nonexistent-dist-for-tests";

// Jest は Node の Module._load を経由しないため、スタブはこちらから注入する
// (functionsAdapter が本番 Node で注入するものと同じモジュール)。
jest.mock("@azure/functions", () => require("../local/azureFunctionsStub"));

const { toExpressPath, collectRegistrations } = require("../local/functionsAdapter");
const { createServer } = require("../local/server");
const sqliteStore = require("../shared/store.sqlite");

let server;
let baseUrl;

beforeAll(async () => {
  // dist 無しの警告はテスト出力を汚すだけなので黙らせる
  jest.spyOn(console, "warn").mockImplementation(() => {});
  jest.spyOn(console, "error").mockImplementation(() => {});
  await new Promise((resolve) => {
    server = createServer().listen(0, "127.0.0.1", resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
  sqliteStore.closeDb();
  jest.restoreAllMocks();
});

beforeEach(() => {
  const db = sqliteStore.getDb();
  for (const { table } of Object.values(sqliteStore.TABLES)) {
    db.exec(`DELETE FROM ${table}`);
  }
});

describe("toExpressPath", () => {
  it("Functions のルートテンプレートを Express のパスに変換する", () => {
    expect(toExpressPath("accounts")).toBe("/accounts");
    expect(toExpressPath("accounts/{id}")).toBe("/accounts/:id");
    expect(toExpressPath("monthly/{yearMonth}")).toBe("/monthly/:yearMonth");
  });
});

describe("collectRegistrations", () => {
  it("既存の Functions をすべて収集する", () => {
    const names = collectRegistrations().map((r) => r.name);
    expect(names).toEqual(
      expect.arrayContaining([
        "accounts-list",
        "accounts-create",
        "accounts-update",
        "accounts-delete",
        "creditCards-list",
        "fixedPayments-list",
        "monthlyRecords-get",
        "monthlyRecords-put",
      ])
    );
  });
});

describe("/.auth (EasyAuth エミュレーション)", () => {
  it("/.auth/me が固定 principal を返す", async () => {
    const res = await fetch(`${baseUrl}/.auth/me`);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.clientPrincipal.userId).toBe("local-test-user");
    expect(body.clientPrincipal.userRoles).toContain("owner");
  });

  it("/.auth/logout はトップにリダイレクトする", async () => {
    const res = await fetch(`${baseUrl}/.auth/logout`, { redirect: "manual" });
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/");
  });

  it("/.auth/login/github はトップにリダイレクトする", async () => {
    const res = await fetch(`${baseUrl}/.auth/login/github`, { redirect: "manual" });
    expect(res.status).toBe(302);
  });
});

describe("セキュリティヘッダー", () => {
  it("すべてのレスポンスに付与される", async () => {
    const res = await fetch(`${baseUrl}/.auth/me`);
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("x-frame-options")).toBe("DENY");
    expect(res.headers.get("content-security-policy")).toContain("default-src 'self'");
  });
});

describe("/api (認証注入 + CRUD)", () => {
  it("principal が注入され 403 にならない", async () => {
    const res = await fetch(`${baseUrl}/api/accounts`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it("作成 → 一覧 → 更新 → 削除が一通り動く", async () => {
    const created = await fetch(`${baseUrl}/api/accounts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "普通預金", balance: 100000 }),
    });
    expect(created.status).toBe(201);
    const account = await created.json();
    expect(account.id).toMatch(/^acc_/);

    const listed = await (await fetch(`${baseUrl}/api/accounts`)).json();
    expect(listed).toHaveLength(1);
    expect(listed[0].name).toBe("普通預金");

    const updated = await fetch(`${baseUrl}/api/accounts/${account.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "更新後", balance: 200000 }),
    });
    expect(updated.status).toBe(200);

    const afterUpdate = await (await fetch(`${baseUrl}/api/accounts`)).json();
    expect(afterUpdate[0].name).toBe("更新後");
    // Merge 意味論: createdAt は保持される
    expect(afterUpdate[0].createdAt).toBe(account.createdAt);

    const deleted = await fetch(`${baseUrl}/api/accounts/${account.id}`, {
      method: "DELETE",
    });
    expect(deleted.status).toBe(204);
    expect(await deleted.text()).toBe("");

    expect(await (await fetch(`${baseUrl}/api/accounts`)).json()).toEqual([]);
  });

  it("ルートパラメータ ({yearMonth}) が渡る", async () => {
    await fetch(`${baseUrl}/api/monthly/2025-01`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountBalances: { acc_1: 12345 } }),
    });
    const res = await fetch(`${baseUrl}/api/monthly/2025-01`);
    const body = await res.json();
    expect(body.yearMonth).toBe("2025-01");
    expect(body.accountBalances.acc_1).toBe(12345);

    // 別の月には漏れない
    const other = await (await fetch(`${baseUrl}/api/monthly/2025-02`)).json();
    expect(other.accountBalances).toEqual({});
  });

  it("不正な JSON は 400 を返す", async () => {
    const res = await fetch(`${baseUrl}/api/accounts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{bad json",
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("リクエストの形式が不正です");
  });

  it("バリデーションエラーは 400 を返す", async () => {
    const res = await fetch(`${baseUrl}/api/accounts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ balance: 1 }),
    });
    expect(res.status).toBe(400);
    expect((await res.json()).errors).toBeDefined();
  });

  it("存在しないエンティティの更新は 404 を返す", async () => {
    const res = await fetch(`${baseUrl}/api/accounts/acc_missing`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "x", balance: 1 }),
    });
    expect(res.status).toBe(404);
  });

  it("口座削除で固定費・クレカの accountId がクリアされる", async () => {
    const account = await (
      await fetch(`${baseUrl}/api/accounts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "引落口座", balance: 0 }),
      })
    ).json();

    await fetch(`${baseUrl}/api/fixed-payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "家賃", amount: 80000, accountId: account.id }),
    });
    await fetch(`${baseUrl}/api/credit-cards`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "カード", accountId: account.id }),
    });

    const res = await fetch(`${baseUrl}/api/accounts/${account.id}`, { method: "DELETE" });
    expect(res.status).toBe(204);

    const fixedPayments = await (await fetch(`${baseUrl}/api/fixed-payments`)).json();
    const creditCards = await (await fetch(`${baseUrl}/api/credit-cards`)).json();
    expect(fixedPayments[0].accountId).toBe("");
    expect(creditCards[0].accountId).toBe("");
    // 他のフィールドは保持されている
    expect(fixedPayments[0].amount).toBe(80000);
  });
});
