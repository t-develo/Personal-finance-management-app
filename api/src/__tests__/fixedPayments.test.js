"use strict";

const {
  createAuthenticatedRequest,
  createUnauthenticatedRequest,
  createMockContext,
  createMockTableClient,
  createAsyncIterable,
} = require("./helpers");

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
  v4: () => "test-uuid-1234",
}));

require("../functions/fixedPayments");

beforeEach(() => {
  jest.clearAllMocks();
  mockTableClient.listEntities.mockReturnValue(createAsyncIterable([]));
});

describe("fixedPayments-list", () => {
  const handler = handlers["fixedPayments-list"];

  it("認証なしで403を返す", async () => {
    const req = createUnauthenticatedRequest("GET");
    const result = await handler(req, createMockContext());
    expect(result.status).toBe(403);
  });

  it("正常にエンティティ一覧を返す", async () => {
    mockTableClient.listEntities.mockReturnValue(
      createAsyncIterable([
        { rowKey: "fp_1", name: "家賃", amount: 80000, accountId: "acc_1", bonusMonths: "", bonusAmount: 0, createdAt: "2025-01-01" },
      ])
    );
    const req = createAuthenticatedRequest("GET");
    const result = await handler(req, createMockContext());
    expect(result.jsonBody).toHaveLength(1);
    expect(result.jsonBody[0].name).toBe("家賃");
  });
});

describe("fixedPayments-create", () => {
  const handler = handlers["fixedPayments-create"];

  it("正常に201で作成する", async () => {
    const req = createAuthenticatedRequest("POST", { name: "家賃", amount: 80000 });
    const result = await handler(req, createMockContext());
    expect(result.status).toBe(201);
    expect(result.jsonBody.name).toBe("家賃");
    expect(result.jsonBody.amount).toBe(80000);
    expect(result.jsonBody.id).toMatch(/^fp_/);
  });

  it("nameなしで400を返す", async () => {
    const req = createAuthenticatedRequest("POST", { amount: 80000 });
    const result = await handler(req, createMockContext());
    expect(result.status).toBe(400);
  });

  it("amountが文字列で400を返す", async () => {
    const req = createAuthenticatedRequest("POST", { name: "家賃", amount: "abc" });
    const result = await handler(req, createMockContext());
    expect(result.status).toBe(400);
  });

  it("amount: 0を正しく保存する", async () => {
    const req = createAuthenticatedRequest("POST", { name: "test", amount: 0 });
    const result = await handler(req, createMockContext());
    expect(result.status).toBe(201);
    expect(result.jsonBody.amount).toBe(0);
  });
});

describe("fixedPayments-update", () => {
  const handler = handlers["fixedPayments-update"];

  it("正常に更新する", async () => {
    const req = createAuthenticatedRequest("PUT", { name: "更新後", amount: 90000 }, { id: "fp_1" });
    const result = await handler(req, createMockContext());
    expect(result.jsonBody.name).toBe("更新後");
  });

  it("存在しないIDで404を返す", async () => {
    const error = new Error("Not found");
    error.statusCode = 404;
    mockTableClient.updateEntity.mockRejectedValueOnce(error);
    const req = createAuthenticatedRequest("PUT", { name: "test", amount: 100 }, { id: "fp_notfound" });
    const result = await handler(req, createMockContext());
    expect(result.status).toBe(404);
  });
});

describe("fixedPayments-delete", () => {
  const handler = handlers["fixedPayments-delete"];

  it("正常に204で削除する", async () => {
    const req = createAuthenticatedRequest("DELETE", undefined, { id: "fp_1" });
    req.json = undefined;
    const result = await handler(req, createMockContext());
    expect(result.status).toBe(204);
  });
});
