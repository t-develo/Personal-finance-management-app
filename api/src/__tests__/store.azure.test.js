"use strict";

// Azure Table Storage バックエンド (本番稼働中) が、ストア API を
// これまでと同じ OData フィルタ / 操作に翻訳することを検証する。

const mockTableClient = {
  createEntity: jest.fn().mockResolvedValue({}),
  updateEntity: jest.fn().mockResolvedValue({}),
  upsertEntity: jest.fn().mockResolvedValue({}),
  deleteEntity: jest.fn().mockResolvedValue({}),
  listEntities: jest.fn(),
};
// jest.mock のファクトリから参照するため、変数名は mock で始める必要がある
const mockGetTableClient = jest.fn(() => mockTableClient);

jest.mock("../shared/tableClient", () => ({
  getTableClient: (...args) => mockGetTableClient(...args),
  escapeODataString: (v) => String(v).replace(/'/g, "''"),
}));

const store = require("../shared/store.azure");

function asyncIterable(items) {
  return {
    [Symbol.asyncIterator]: async function* () {
      yield* items;
    },
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockTableClient.listEntities.mockReturnValue(asyncIterable([]));
});

function filterOf() {
  return mockTableClient.listEntities.mock.calls[0][0].queryOptions.filter;
}

describe("list", () => {
  it("PartitionKey で絞り込む", async () => {
    await store.list("accounts", "user-1");
    expect(mockGetTableClient).toHaveBeenCalledWith("accounts");
    expect(filterOf()).toBe("PartitionKey eq 'user-1'");
  });

  it("非同期イテレータを配列にまとめる", async () => {
    mockTableClient.listEntities.mockReturnValue(
      asyncIterable([{ rowKey: "acc_1" }, { rowKey: "acc_2" }])
    );
    expect(await store.list("accounts", "user-1")).toEqual([
      { rowKey: "acc_1" },
      { rowKey: "acc_2" },
    ]);
  });

  it("userId のシングルクォートをエスケープする", async () => {
    await store.list("accounts", "user'1");
    expect(filterOf()).toBe("PartitionKey eq 'user''1'");
  });
});

describe("listByField", () => {
  it("PartitionKey と指定フィールドで絞り込む", async () => {
    await store.listByField("fixedPayments", "user-1", "accountId", "acc_1");
    expect(mockGetTableClient).toHaveBeenCalledWith("fixedPayments");
    expect(filterOf()).toBe("PartitionKey eq 'user-1' and accountId eq 'acc_1'");
  });

  it("値のシングルクォートをエスケープする", async () => {
    await store.listByField("fixedPayments", "user-1", "accountId", "a' or '1' eq '1");
    expect(filterOf()).toBe(
      "PartitionKey eq 'user-1' and accountId eq 'a'' or ''1'' eq ''1'"
    );
  });
});

describe("listByRowKeyPrefix", () => {
  it("RowKey の範囲で絞り込む", async () => {
    await store.listByRowKeyPrefix("monthlyRecords", "user-1", "2025-01");
    expect(filterOf()).toBe(
      "PartitionKey eq 'user-1' and RowKey ge '2025-01_' and RowKey lt '2025-01~'"
    );
  });
});

describe("書き込み系", () => {
  const entity = { partitionKey: "user-1", rowKey: "acc_1", name: "普通預金" };

  it("create は createEntity を呼ぶ", async () => {
    await store.create("accounts", entity);
    expect(mockTableClient.createEntity).toHaveBeenCalledWith(entity);
  });

  it("merge は Merge モードの updateEntity を呼ぶ", async () => {
    await store.merge("accounts", entity);
    expect(mockTableClient.updateEntity).toHaveBeenCalledWith(entity, "Merge");
  });

  it("upsert は Merge モードの upsertEntity を呼ぶ", async () => {
    await store.upsert("monthlyRecords", entity);
    expect(mockTableClient.upsertEntity).toHaveBeenCalledWith(entity, "Merge");
  });

  it("remove は deleteEntity を呼ぶ", async () => {
    await store.remove("accounts", "user-1", "acc_1");
    expect(mockTableClient.deleteEntity).toHaveBeenCalledWith("user-1", "acc_1");
  });

  it("エラーはそのまま伝播する (statusCode を保つ)", async () => {
    const error = Object.assign(new Error("Not found"), { statusCode: 404 });
    mockTableClient.updateEntity.mockRejectedValueOnce(error);
    await expect(store.merge("accounts", entity)).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});
