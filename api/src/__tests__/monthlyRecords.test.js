"use strict";

const {
  createAuthenticatedRequest,
  createUnauthenticatedRequest,
  createMockContext,
  createMockStore,
  resetMockStore,
} = require("./helpers");

const handlers = {};
jest.mock("@azure/functions", () => ({
  app: {
    http: (name, config) => {
      handlers[name] = config.handler;
    },
  },
}));

const mockStore = createMockStore();
jest.mock("../shared/store", () => mockStore);

require("../functions/monthlyRecords");

beforeEach(() => {
  jest.clearAllMocks();
  resetMockStore(mockStore);
});

describe("monthlyRecords-get", () => {
  const handler = handlers["monthlyRecords-get"];

  it("認証なしで403を返す", async () => {
    const req = createUnauthenticatedRequest("GET", undefined, { yearMonth: "2025-01" });
    const result = await handler(req, createMockContext());
    expect(result.status).toBe(403);
  });

  it("正常にデータを返す", async () => {
    mockStore.listByRowKeyPrefix.mockResolvedValue([
      { recordType: "accountBalance", targetId: "acc_1", amount: 100000 },
      { recordType: "cardPayment", targetId: "cc_1", amount: 50000 },
    ]);
    const req = createAuthenticatedRequest("GET", undefined, { yearMonth: "2025-01" });
    req.json = jest.fn();
    const result = await handler(req, createMockContext());
    expect(mockStore.listByRowKeyPrefix).toHaveBeenCalledWith(
      "monthlyRecords",
      "user-test123",
      "2025-01"
    );
    expect(result.jsonBody.yearMonth).toBe("2025-01");
    expect(result.jsonBody.accountBalances.acc_1).toBe(100000);
    expect(result.jsonBody.cardPayments.cc_1).toBe(50000);
  });

  it("不正なyearMonthで400を返す", async () => {
    const req = createAuthenticatedRequest("GET", undefined, { yearMonth: "2025-13" });
    req.json = jest.fn();
    const result = await handler(req, createMockContext());
    expect(result.status).toBe(400);
  });

  it("インジェクション風文字列で400を返す", async () => {
    const req = createAuthenticatedRequest("GET", undefined, { yearMonth: "' or 1 eq 1 or '" });
    req.json = jest.fn();
    const result = await handler(req, createMockContext());
    expect(result.status).toBe(400);
  });
});

describe("monthlyRecords-put", () => {
  const handler = handlers["monthlyRecords-put"];

  it("正常にupsertする", async () => {
    const req = createAuthenticatedRequest(
      "PUT",
      { accountBalances: { acc_1: 200000 }, cardPayments: { cc_1: 30000 } },
      { yearMonth: "2025-01" }
    );
    const result = await handler(req, createMockContext());
    expect(result.jsonBody.yearMonth).toBe("2025-01");
    expect(mockStore.upsert).toHaveBeenCalledTimes(2);
    expect(mockStore.upsert).toHaveBeenCalledWith("monthlyRecords", {
      partitionKey: "user-test123",
      rowKey: "2025-01_balance_acc_1",
      recordType: "accountBalance",
      targetId: "acc_1",
      amount: 200000,
      yearMonth: "2025-01",
    });
  });

  it("不正なyearMonthで400を返す", async () => {
    const req = createAuthenticatedRequest("PUT", { accountBalances: {} }, { yearMonth: "abc" });
    const result = await handler(req, createMockContext());
    expect(result.status).toBe(400);
  });

  it("値がnumberでない場合400を返す", async () => {
    const req = createAuthenticatedRequest(
      "PUT",
      { accountBalances: { acc_1: "bad" } },
      { yearMonth: "2025-01" }
    );
    const result = await handler(req, createMockContext());
    expect(result.status).toBe(400);
  });

  it("空ボディで正常に処理する", async () => {
    const req = createAuthenticatedRequest("PUT", {}, { yearMonth: "2025-01" });
    const result = await handler(req, createMockContext());
    expect(result.jsonBody.yearMonth).toBe("2025-01");
    expect(mockStore.upsert).not.toHaveBeenCalled();
  });

  it("不正なJSONで400を返す", async () => {
    const req = createAuthenticatedRequest("PUT", undefined, { yearMonth: "2025-01" });
    // json() will throw SyntaxError from helper
    const result = await handler(req, createMockContext());
    expect(result.status).toBe(400);
  });
});
