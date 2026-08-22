"use strict";

// SQLite バックエンド (ラズパイ稼働用) の振る舞いを、インメモリ DB で検証する。
process.env.SQLITE_PATH = ":memory:";
const store = require("../shared/store.sqlite");

const USER = "user-test123";

beforeEach(() => {
  const db = store.getDb();
  for (const { table } of Object.values(store.TABLES)) {
    db.exec(`DELETE FROM ${table}`);
  }
});

afterAll(() => {
  store.closeDb();
});

describe("create / list", () => {
  it("作成したエンティティを取得できる", async () => {
    await store.create("accounts", {
      partitionKey: USER,
      rowKey: "acc_1",
      name: "普通預金",
      balance: 100000,
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-01T00:00:00.000Z",
    });

    const entities = await store.list("accounts", USER);
    expect(entities).toEqual([
      {
        partitionKey: USER,
        rowKey: "acc_1",
        name: "普通預金",
        balance: 100000,
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-01T00:00:00.000Z",
      },
    ]);
  });

  it("他ユーザーのエンティティは返さない", async () => {
    await store.create("accounts", { partitionKey: USER, rowKey: "acc_1", name: "自分" });
    await store.create("accounts", { partitionKey: "other", rowKey: "acc_2", name: "他人" });

    const entities = await store.list("accounts", USER);
    expect(entities).toHaveLength(1);
    expect(entities[0].rowKey).toBe("acc_1");
  });

  it("整数はそのまま整数で返る", async () => {
    await store.create("fixedPayments", {
      partitionKey: USER,
      rowKey: "fp_1",
      name: "家賃",
      amount: 80000,
    });
    const [entity] = await store.list("fixedPayments", USER);
    expect(entity.amount).toBe(80000);
    expect(Number.isInteger(entity.amount)).toBe(true);
  });

  it("bonusMonths は文字列のまま保持される", async () => {
    await store.create("fixedPayments", {
      partitionKey: USER,
      rowKey: "fp_1",
      name: "保険",
      bonusMonths: "6,12",
    });
    const [entity] = await store.list("fixedPayments", USER);
    expect(entity.bonusMonths).toBe("6,12");
  });

  it("重複作成は statusCode 409 を投げる", async () => {
    await store.create("accounts", { partitionKey: USER, rowKey: "acc_1", name: "A" });
    await expect(
      store.create("accounts", { partitionKey: USER, rowKey: "acc_1", name: "B" })
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it("未知のフィールドは拒否する", async () => {
    await expect(
      store.create("accounts", { partitionKey: USER, rowKey: "acc_1", bogus: 1 })
    ).rejects.toThrow(/Unknown field/);
  });
});

describe("merge", () => {
  it("渡されたフィールドだけを更新し、他は保持する", async () => {
    await store.create("accounts", {
      partitionKey: USER,
      rowKey: "acc_1",
      name: "元の名前",
      balance: 1000,
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-01T00:00:00.000Z",
    });

    await store.merge("accounts", {
      partitionKey: USER,
      rowKey: "acc_1",
      name: "新しい名前",
      updatedAt: "2025-06-01T00:00:00.000Z",
    });

    const [entity] = await store.list("accounts", USER);
    expect(entity.name).toBe("新しい名前");
    expect(entity.updatedAt).toBe("2025-06-01T00:00:00.000Z");
    // 未指定のフィールドは元のまま
    expect(entity.balance).toBe(1000);
    expect(entity.createdAt).toBe("2025-01-01T00:00:00.000Z");
  });

  it("存在しない行は statusCode 404 を投げる", async () => {
    await expect(
      store.merge("accounts", { partitionKey: USER, rowKey: "acc_missing", name: "x" })
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("他ユーザーの行は更新できない", async () => {
    await store.create("accounts", { partitionKey: "other", rowKey: "acc_1", name: "他人" });
    await expect(
      store.merge("accounts", { partitionKey: USER, rowKey: "acc_1", name: "乗っ取り" })
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe("upsert", () => {
  it("存在しなければ作成する", async () => {
    await store.upsert("monthlyRecords", {
      partitionKey: USER,
      rowKey: "2025-01_balance_acc_1",
      recordType: "accountBalance",
      targetId: "acc_1",
      amount: 100000,
      yearMonth: "2025-01",
    });
    const entities = await store.list("monthlyRecords", USER);
    expect(entities).toHaveLength(1);
    expect(entities[0].amount).toBe(100000);
  });

  it("存在すれば更新する (二度呼んでも重複しない)", async () => {
    const entity = {
      partitionKey: USER,
      rowKey: "2025-01_balance_acc_1",
      recordType: "accountBalance",
      targetId: "acc_1",
      amount: 100000,
      yearMonth: "2025-01",
    };
    await store.upsert("monthlyRecords", entity);
    await store.upsert("monthlyRecords", { ...entity, amount: 250000 });

    const entities = await store.list("monthlyRecords", USER);
    expect(entities).toHaveLength(1);
    expect(entities[0].amount).toBe(250000);
  });
});

describe("listByField", () => {
  it("accountId でカスケード対象を絞り込める", async () => {
    await store.create("fixedPayments", {
      partitionKey: USER, rowKey: "fp_1", name: "家賃", accountId: "acc_1",
    });
    await store.create("fixedPayments", {
      partitionKey: USER, rowKey: "fp_2", name: "電気", accountId: "acc_2",
    });

    const entities = await store.listByField("fixedPayments", USER, "accountId", "acc_1");
    expect(entities).toHaveLength(1);
    expect(entities[0].rowKey).toBe("fp_1");
  });
});

describe("listByRowKeyPrefix", () => {
  it("指定した年月のレコードだけを返す", async () => {
    const rows = [
      ["2025-01_balance_acc_1", "2025-01"],
      ["2025-01_card_cc_1", "2025-01"],
      ["2025-02_balance_acc_1", "2025-02"],
      ["2025-10_balance_acc_1", "2025-10"],
    ];
    for (const [rowKey, yearMonth] of rows) {
      await store.upsert("monthlyRecords", {
        partitionKey: USER,
        rowKey,
        recordType: "accountBalance",
        targetId: "acc_1",
        amount: 1,
        yearMonth,
      });
    }

    const entities = await store.listByRowKeyPrefix("monthlyRecords", USER, "2025-01");
    expect(entities.map((e) => e.rowKey)).toEqual([
      "2025-01_balance_acc_1",
      "2025-01_card_cc_1",
    ]);
  });
});

describe("remove", () => {
  it("削除できる", async () => {
    await store.create("accounts", { partitionKey: USER, rowKey: "acc_1", name: "A" });
    await store.remove("accounts", USER, "acc_1");
    expect(await store.list("accounts", USER)).toHaveLength(0);
  });

  it("存在しない行は statusCode 404 を投げる", async () => {
    await expect(store.remove("accounts", USER, "acc_missing")).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});

describe("schemaFor", () => {
  it("未知のテーブル名は拒否する", async () => {
    await expect(store.list("bogusTable", USER)).rejects.toThrow(/Unknown table/);
  });
});
