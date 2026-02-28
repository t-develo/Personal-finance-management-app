import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import Dashboard from "../Dashboard";

// テストデータのデフォルト値（空状態）
const emptyData = {
  accounts: [],
  fixedPayments: [],
  creditCards: [],
  monthlyRecords: { accountBalances: {}, cardPayments: {} },
  loading: false,
};

describe("Dashboard", () => {
  describe("ローディング中", () => {
    it("「読み込み中...」を表示する", () => {
      const loadingData = { ...emptyData, loading: true };
      render(<Dashboard data={loadingData} yearMonth="2025-03" />);

      expect(screen.getByText("読み込み中...")).toBeInTheDocument();
    });

    it("ローディング中はダッシュボード本体を表示しない", () => {
      const loadingData = { ...emptyData, loading: true };
      render(<Dashboard data={loadingData} yearMonth="2025-03" />);

      expect(screen.queryByText("ダッシュボード")).not.toBeInTheDocument();
    });
  });

  describe("データが空の場合の空状態表示", () => {
    it("口座が未登録の旨を表示する", () => {
      render(<Dashboard data={emptyData} yearMonth="2025-03" />);

      expect(screen.getByText("口座が登録されていません")).toBeInTheDocument();
    });

    it("固定支払いが未登録の旨を表示する", () => {
      render(<Dashboard data={emptyData} yearMonth="2025-03" />);

      expect(
        screen.getByText("固定支払いが登録されていません")
      ).toBeInTheDocument();
    });

    it("クレジットカードが未登録の旨を表示する", () => {
      render(<Dashboard data={emptyData} yearMonth="2025-03" />);

      expect(
        screen.getByText("クレジットカードが登録されていません")
      ).toBeInTheDocument();
    });
  });

  describe("残高計算", () => {
    it("単一口座の残高を正しく表示する", () => {
      const data = {
        ...emptyData,
        accounts: [{ id: "acc1", name: "普通預金", balance: 100000 }],
      };

      render(<Dashboard data={data} yearMonth="2025-03" />);

      // 総残高カードに反映されることを確認
      expect(screen.getAllByText("¥100,000").length).toBeGreaterThan(0);
    });

    it("複数口座の残高合計を正しく計算して表示する", () => {
      const data = {
        ...emptyData,
        accounts: [
          { id: "acc1", name: "普通預金", balance: 100000 },
          { id: "acc2", name: "定期預金", balance: 50000 },
        ],
      };

      render(<Dashboard data={data} yearMonth="2025-03" />);

      // 合計 150,000 円が表示されることを確認
      expect(screen.getAllByText("¥150,000").length).toBeGreaterThan(0);
    });

    it("月次記録がある場合はマスター残高より月次残高を優先する", () => {
      const data = {
        ...emptyData,
        accounts: [{ id: "acc1", name: "普通預金", balance: 100000 }],
        monthlyRecords: {
          accountBalances: { acc1: 80000 },
          cardPayments: {},
        },
      };

      render(<Dashboard data={data} yearMonth="2025-03" />);

      // 月次記録の 80,000 円が表示される
      expect(screen.getAllByText("¥80,000").length).toBeGreaterThan(0);
    });

    it("月次記録がない口座はマスター残高を使用する", () => {
      const data = {
        ...emptyData,
        accounts: [
          { id: "acc1", name: "普通預金", balance: 100000 },
          { id: "acc2", name: "定期預金", balance: 50000 },
        ],
        monthlyRecords: {
          accountBalances: { acc1: 80000 }, // acc2 は月次記録なし
          cardPayments: {},
        },
      };

      render(<Dashboard data={data} yearMonth="2025-03" />);

      // acc1: 80,000 + acc2: 50,000 = 130,000
      expect(screen.getAllByText("¥130,000").length).toBeGreaterThan(0);
    });
  });

  describe("固定支払い計算", () => {
    it("ボーナス月でない場合は通常金額のみを計算する", () => {
      const data = {
        ...emptyData,
        accounts: [{ id: "acc1", name: "普通預金", balance: 200000 }],
        fixedPayments: [
          {
            id: "fp1",
            name: "家賃",
            amount: 80000,
            accountId: "acc1",
            bonusMonths: "6,12",
            bonusAmount: 20000,
          },
        ],
      };

      // 3月はボーナス月ではない
      render(<Dashboard data={data} yearMonth="2025-03" />);

      // ¥80,000 は複数箇所（サマリーカード・テーブル）に表示される
      expect(screen.getAllByText("¥80,000").length).toBeGreaterThan(0);
      expect(screen.queryByText("ボーナス月")).not.toBeInTheDocument();
    });

    it("ボーナス月の場合は通常金額にボーナス金額を加算した合計を表示する", () => {
      const data = {
        ...emptyData,
        accounts: [{ id: "acc1", name: "普通預金", balance: 200000 }],
        fixedPayments: [
          {
            id: "fp1",
            name: "家賃",
            amount: 80000,
            accountId: "acc1",
            bonusMonths: "6,12",
            bonusAmount: 20000,
          },
        ],
      };

      // 6月はボーナス月
      render(<Dashboard data={data} yearMonth="2025-06" />);

      // ¥100,000 はサマリーカード・テーブル等の複数箇所に表示される
      expect(screen.getAllByText("¥100,000").length).toBeGreaterThan(0);
      expect(screen.getByText("ボーナス月")).toBeInTheDocument();
    });

    it("複数の固定支払いの合計を正しく計算する", () => {
      const data = {
        ...emptyData,
        accounts: [{ id: "acc1", name: "普通預金", balance: 500000 }],
        fixedPayments: [
          {
            id: "fp1",
            name: "家賃",
            amount: 80000,
            accountId: "acc1",
            bonusMonths: "",
            bonusAmount: 0,
          },
          {
            id: "fp2",
            name: "光熱費",
            amount: 15000,
            accountId: "acc1",
            bonusMonths: "",
            bonusAmount: 0,
          },
        ],
      };

      render(<Dashboard data={data} yearMonth="2025-03" />);

      // 合計: 80,000 + 15,000 = 95,000
      expect(screen.getAllByText("¥95,000").length).toBeGreaterThan(0);
    });
  });

  describe("差引残高計算", () => {
    it("残高が支出予定を上回る場合に正の差引残高を計算する", () => {
      const data = {
        ...emptyData,
        accounts: [{ id: "acc1", name: "普通預金", balance: 300000 }],
        fixedPayments: [
          {
            id: "fp1",
            name: "家賃",
            amount: 80000,
            accountId: "acc1",
            bonusMonths: "",
            bonusAmount: 0,
          },
        ],
      };

      render(<Dashboard data={data} yearMonth="2025-03" />);

      // 差引残高: 300,000 - 80,000 = 220,000
      expect(screen.getAllByText("¥220,000").length).toBeGreaterThan(0);
    });

    it("クレジットカード支払いを含む総支出予定を正しく計算する", () => {
      const data = {
        ...emptyData,
        accounts: [{ id: "acc1", name: "普通預金", balance: 200000 }],
        creditCards: [{ id: "cc1", name: "Visaカード", accountId: "acc1" }],
        monthlyRecords: {
          accountBalances: {},
          cardPayments: { cc1: 30000 },
        },
      };

      render(<Dashboard data={data} yearMonth="2025-03" />);

      // カード支払い合計: 30,000
      expect(screen.getAllByText("¥30,000").length).toBeGreaterThan(0);
      // 差引残高: 200,000 - 30,000 = 170,000
      expect(screen.getAllByText("¥170,000").length).toBeGreaterThan(0);
    });
  });

  describe("口座別サマリーテーブル", () => {
    it("口座名を表示する", () => {
      const data = {
        ...emptyData,
        accounts: [{ id: "acc1", name: "メイン口座", balance: 100000 }],
      };

      render(<Dashboard data={data} yearMonth="2025-03" />);

      expect(screen.getByText("メイン口座")).toBeInTheDocument();
    });
  });

  describe("固定支払いテーブル", () => {
    it("固定支払い項目名を表示する", () => {
      const data = {
        ...emptyData,
        accounts: [{ id: "acc1", name: "普通預金", balance: 100000 }],
        fixedPayments: [
          {
            id: "fp1",
            name: "インターネット代",
            amount: 5000,
            accountId: "acc1",
            bonusMonths: "",
            bonusAmount: 0,
          },
        ],
      };

      render(<Dashboard data={data} yearMonth="2025-03" />);

      expect(screen.getByText("インターネット代")).toBeInTheDocument();
    });

    it("引落口座名が未設定の場合は「未設定」と表示する", () => {
      const data = {
        ...emptyData,
        fixedPayments: [
          {
            id: "fp1",
            name: "サブスク",
            amount: 1000,
            accountId: "",
            bonusMonths: "",
            bonusAmount: 0,
          },
        ],
      };

      render(<Dashboard data={data} yearMonth="2025-03" />);

      expect(screen.getByText("未設定")).toBeInTheDocument();
    });
  });
});
