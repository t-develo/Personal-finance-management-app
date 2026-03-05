"use strict";

const {
  createAuthenticatedRequest,
  createUnauthenticatedRequest,
  createMockContext,
  createMockTableClient,
  createAsyncIterable,
} = require("./helpers");

// Capture handler registrations
const handlers = {};
jest.mock("@azure/functions", () => ({
  app: {
    http: (name, config) => {
      handlers[name] = config.handler;
    },
  },
}));

const mockTableClient = createMockTableClient();
jest.mock("../shared/tableClient", () => ({
  getTableClient: () => mockTableClient,
  escapeODataString: (v) => String(v).replace(/'/g, "''"),
}));

jest.mock("uuid", () => ({
  v4: () => "test-uuid-1234-5678-abcd-efghijklmnop",
}));

// Load module to register handlers
require("../functions/accounts");

beforeEach(() => {
  jest.clearAllMocks();
  mockTableClient.listEntities.mockReturnValue(createAsyncIterable([]));
});

describe("accounts-list", () => {
  const handler = handlers["accounts-list"];

  it("認証なしで403を返す", async () => {
    const req = createUnauthenticatedRequest("GET");
    const result = await handler(req, createMockContext());
    expect(result.status).toBe(403);
  });

  it("正常にエンティティ一覧を返す", async () => {
    mockTableClient.listEntities.mockReturnValue(
      createAsyncIterable([
        { rowKey: "acc_1", name: "普通預金", balance: 100000, createdAt: "2025-01-01", updatedAt: "2025-01-01" },
        { rowKey: "acc_2", name: "貯蓄", balance: 500000, createdAt: "2025-01-01", updatedAt: "2025-01-01" },
      ])
    );
    const req = createAuthenticatedRequest("GET");
    const result = await handler(req, createMockContext());
    expect(result.jsonBody).toHaveLength(2);
    expect(result.jsonBody[0].id).toBe("acc_1");
  });

  it("DB障害時に500を返す", async () => {
    mockTableClient.listEntities.mockReturnValue({
      [Symbol.asyncIterator]: () => ({
        next: () => Promise.reject(new Error("DB error")),
      }),
    });
    const ctx = createMockContext();
    const req = createAuthenticatedRequest("GET");
    const result = await handler(req, ctx);
    expect(result.status).toBe(500);
    expect(ctx.log.error).toHaveBeenCalled();
  });
});

describe("accounts-create", () => {
  const handler = handlers["accounts-create"];

  it("認証なしで403を返す", async () => {
    const req = createUnauthenticatedRequest("POST", { name: "test" });
    const result = await handler(req, createMockContext());
    expect(result.status).toBe(403);
  });

  it("正常に201で作成する", async () => {
    const req = createAuthenticatedRequest("POST", { name: "普通預金", balance: 100000 });
    const result = await handler(req, createMockContext());
    expect(result.status).toBe(201);
    expect(result.jsonBody.name).toBe("普通預金");
    expect(result.jsonBody.balance).toBe(100000);
    expect(result.jsonBody.id).toMatch(/^acc_/);
    expect(mockTableClient.createEntity).toHaveBeenCalled();
  });

  it("nameなしで400を返す", async () => {
    const req = createAuthenticatedRequest("POST", { balance: 100 });
    const result = await handler(req, createMockContext());
    expect(result.status).toBe(400);
    expect(result.jsonBody.errors).toBeDefined();
  });

  it("不正なJSONで400を返す", async () => {
    const req = createAuthenticatedRequest("POST");
    const result = await handler(req, createMockContext());
    expect(result.status).toBe(400);
  });

  it("balance: 0を正しく保存する", async () => {
    const req = createAuthenticatedRequest("POST", { name: "test", balance: 0 });
    const result = await handler(req, createMockContext());
    expect(result.status).toBe(201);
    expect(result.jsonBody.balance).toBe(0);
  });

  it("balanceなしでデフォルト0を使う", async () => {
    const req = createAuthenticatedRequest("POST", { name: "test" });
    const result = await handler(req, createMockContext());
    expect(result.status).toBe(201);
    expect(result.jsonBody.balance).toBe(0);
  });
});

describe("accounts-update", () => {
  const handler = handlers["accounts-update"];

  it("正常に更新する", async () => {
    const req = createAuthenticatedRequest("PUT", { name: "更新後", balance: 200000 }, { id: "acc_1" });
    const result = await handler(req, createMockContext());
    expect(result.jsonBody.name).toBe("更新後");
    expect(mockTableClient.updateEntity).toHaveBeenCalled();
  });

  it("nameなしで400を返す", async () => {
    const req = createAuthenticatedRequest("PUT", { balance: 100 }, { id: "acc_1" });
    const result = await handler(req, createMockContext());
    expect(result.status).toBe(400);
  });

  it("存在しないIDで404を返す", async () => {
    const error = new Error("Not found");
    error.statusCode = 404;
    mockTableClient.updateEntity.mockRejectedValueOnce(error);
    const req = createAuthenticatedRequest("PUT", { name: "test", balance: 100 }, { id: "acc_notfound" });
    const ctx = createMockContext();
    const result = await handler(req, ctx);
    expect(result.status).toBe(404);
  });
});

describe("accounts-delete", () => {
  const handler = handlers["accounts-delete"];

  it("正常に204で削除する", async () => {
    const req = createAuthenticatedRequest("DELETE", undefined, { id: "acc_1" });
    req.json = undefined; // DELETE has no body
    const result = await handler(req, createMockContext());
    expect(result.status).toBe(204);
    expect(mockTableClient.deleteEntity).toHaveBeenCalledWith("user-test123", "acc_1");
  });

  it("カスケード更新の部分失敗で207を返す", async () => {
    // First listEntities call (fixedPayments) returns items
    mockTableClient.listEntities
      .mockReturnValueOnce(createAsyncIterable([{ rowKey: "fp_1" }]))
      .mockReturnValueOnce(createAsyncIterable([]));
    mockTableClient.updateEntity.mockRejectedValueOnce(new Error("cascade fail"));

    const req = createAuthenticatedRequest("DELETE", undefined, { id: "acc_1" });
    req.json = undefined;
    const ctx = createMockContext();
    const result = await handler(req, ctx);
    expect(result.status).toBe(207);
    expect(result.jsonBody.warning).toBeDefined();
    expect(result.jsonBody.failedIds).toContain("fp_1");
    expect(ctx.log.error).toHaveBeenCalled();
  });

  it("存在しないIDで404を返す", async () => {
    const error = new Error("Not found");
    error.statusCode = 404;
    mockTableClient.deleteEntity.mockRejectedValueOnce(error);
    const req = createAuthenticatedRequest("DELETE", undefined, { id: "acc_notfound" });
    req.json = undefined;
    const ctx = createMockContext();
    const result = await handler(req, ctx);
    expect(result.status).toBe(404);
  });
});
