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

require("../functions/creditCards");

beforeEach(() => {
  jest.clearAllMocks();
  mockTableClient.listEntities.mockReturnValue(createAsyncIterable([]));
});

describe("creditCards-list", () => {
  const handler = handlers["creditCards-list"];

  it("認証なしで403を返す", async () => {
    const req = createUnauthenticatedRequest("GET");
    const result = await handler(req, createMockContext());
    expect(result.status).toBe(403);
  });

  it("正常にエンティティ一覧を返す", async () => {
    mockTableClient.listEntities.mockReturnValue(
      createAsyncIterable([
        { rowKey: "cc_1", name: "楽天カード", accountId: "acc_1", createdAt: "2025-01-01" },
      ])
    );
    const req = createAuthenticatedRequest("GET");
    const result = await handler(req, createMockContext());
    expect(result.jsonBody).toHaveLength(1);
    expect(result.jsonBody[0].name).toBe("楽天カード");
  });
});

describe("creditCards-create", () => {
  const handler = handlers["creditCards-create"];

  it("正常に201で作成する", async () => {
    const req = createAuthenticatedRequest("POST", { name: "楽天カード", accountId: "acc_1" });
    const result = await handler(req, createMockContext());
    expect(result.status).toBe(201);
    expect(result.jsonBody.name).toBe("楽天カード");
    expect(result.jsonBody.id).toMatch(/^cc_/);
  });

  it("nameなしで400を返す", async () => {
    const req = createAuthenticatedRequest("POST", {});
    const result = await handler(req, createMockContext());
    expect(result.status).toBe(400);
  });

  it("不正なJSONで400を返す", async () => {
    const req = createAuthenticatedRequest("POST");
    const result = await handler(req, createMockContext());
    expect(result.status).toBe(400);
  });
});

describe("creditCards-update", () => {
  const handler = handlers["creditCards-update"];

  it("正常に更新する", async () => {
    const req = createAuthenticatedRequest("PUT", { name: "更新カード" }, { id: "cc_1" });
    const result = await handler(req, createMockContext());
    expect(result.jsonBody.name).toBe("更新カード");
  });

  it("存在しないIDで404を返す", async () => {
    const error = new Error("Not found");
    error.statusCode = 404;
    mockTableClient.updateEntity.mockRejectedValueOnce(error);
    const req = createAuthenticatedRequest("PUT", { name: "test" }, { id: "cc_notfound" });
    const result = await handler(req, createMockContext());
    expect(result.status).toBe(404);
  });
});

describe("creditCards-delete", () => {
  const handler = handlers["creditCards-delete"];

  it("正常に204で削除する", async () => {
    const req = createAuthenticatedRequest("DELETE", undefined, { id: "cc_1" });
    req.json = undefined;
    const result = await handler(req, createMockContext());
    expect(result.status).toBe(204);
  });

  it("存在しないIDで404を返す", async () => {
    const error = new Error("Not found");
    error.statusCode = 404;
    mockTableClient.deleteEntity.mockRejectedValueOnce(error);
    const req = createAuthenticatedRequest("DELETE", undefined, { id: "cc_notfound" });
    req.json = undefined;
    const result = await handler(req, createMockContext());
    expect(result.status).toBe(404);
  });
});
