"use strict";

const {
  validateAccount,
  validateCreditCard,
  validateFixedPayment,
  validateYearMonth,
  validateMonthlyRecords,
} = require("../shared/validators");

describe("validateAccount", () => {
  it("正常な入力でエラーなし", () => {
    expect(validateAccount({ name: "普通預金", balance: 100000 })).toEqual([]);
  });

  it("nameが欠損でエラー", () => {
    const errors = validateAccount({ balance: 100 });
    expect(errors).toContain("name は必須の文字列です");
  });

  it("nameが空文字でエラー", () => {
    const errors = validateAccount({ name: "" });
    expect(errors).toContain("name は必須の文字列です");
  });

  it("nameが100文字超でエラー", () => {
    const errors = validateAccount({ name: "a".repeat(101) });
    expect(errors).toContain("name は100文字以内にしてください");
  });

  it("balanceが文字列でエラー", () => {
    const errors = validateAccount({ name: "test", balance: "abc" });
    expect(errors).toContain("balance は数値にしてください");
  });

  it("balanceが範囲外でエラー", () => {
    const errors = validateAccount({ name: "test", balance: 9999999999 });
    expect(errors).toContain("balance の範囲が不正です");
  });

  it("balance: 0は正常", () => {
    expect(validateAccount({ name: "test", balance: 0 })).toEqual([]);
  });

  it("balanceなしは正常", () => {
    expect(validateAccount({ name: "test" })).toEqual([]);
  });
});

describe("validateCreditCard", () => {
  it("正常な入力でエラーなし", () => {
    expect(validateCreditCard({ name: "楽天カード" })).toEqual([]);
  });

  it("nameが欠損でエラー", () => {
    expect(validateCreditCard({})).toContain("name は必須の文字列です");
  });

  it("accountIdが数値でエラー", () => {
    const errors = validateCreditCard({ name: "test", accountId: 123 });
    expect(errors).toContain("accountId は文字列にしてください");
  });
});

describe("validateFixedPayment", () => {
  it("正常な入力でエラーなし", () => {
    expect(validateFixedPayment({ name: "家賃", amount: 80000 })).toEqual([]);
  });

  it("nameが欠損でエラー", () => {
    expect(validateFixedPayment({})).toContain("name は必須の文字列です");
  });

  it("amountが文字列でエラー", () => {
    const errors = validateFixedPayment({ name: "test", amount: "abc" });
    expect(errors).toContain("amount は数値にしてください");
  });

  it("amountが負でエラー", () => {
    const errors = validateFixedPayment({ name: "test", amount: -1 });
    expect(errors).toContain("amount の範囲が不正です");
  });

  it("bonusMonthsが数値でエラー", () => {
    const errors = validateFixedPayment({ name: "test", bonusMonths: 12 });
    expect(errors).toContain("bonusMonths は文字列にしてください");
  });

  it("bonusAmountが文字列でエラー", () => {
    const errors = validateFixedPayment({ name: "test", bonusAmount: "abc" });
    expect(errors).toContain("bonusAmount は数値にしてください");
  });
});

describe("validateYearMonth", () => {
  it("正常な形式はtrue", () => {
    expect(validateYearMonth("2025-01")).toBe(true);
    expect(validateYearMonth("2025-12")).toBe(true);
  });

  it("不正な形式はfalse", () => {
    expect(validateYearMonth("2025-13")).toBe(false);
    expect(validateYearMonth("2025-00")).toBe(false);
    expect(validateYearMonth("abc")).toBe(false);
    expect(validateYearMonth("' or 1 eq 1 or '")).toBe(false);
    expect(validateYearMonth("2025")).toBe(false);
  });
});

describe("validateMonthlyRecords", () => {
  it("正常な入力でエラーなし", () => {
    expect(
      validateMonthlyRecords({
        accountBalances: { acc_1: 100000 },
        cardPayments: { cc_1: 50000 },
      })
    ).toEqual([]);
  });

  it("accountBalancesが文字列でエラー", () => {
    const errors = validateMonthlyRecords({ accountBalances: "bad" });
    expect(errors).toContain("accountBalances はオブジェクトにしてください");
  });

  it("accountBalancesの値が文字列でエラー", () => {
    const errors = validateMonthlyRecords({ accountBalances: { acc_1: "bad" } });
    expect(errors.length).toBeGreaterThan(0);
  });

  it("cardPaymentsの値が文字列でエラー", () => {
    const errors = validateMonthlyRecords({ cardPayments: { cc_1: "bad" } });
    expect(errors.length).toBeGreaterThan(0);
  });

  it("空オブジェクトは正常", () => {
    expect(validateMonthlyRecords({})).toEqual([]);
  });
});
