import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import MonthlyTab from "../MonthlyTab";

vi.mock("../../hooks/useToast", () => ({
  useToast: () => vi.fn(),
}));

function makeData(overrides = {}) {
  return {
    accounts: [],
    creditCards: [],
    monthlyRecords: { accountBalances: {}, cardPayments: {} },
    saveMonthly: vi.fn().mockResolvedValue({}),
    ...overrides,
  };
}

describe("MonthlyTab", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("空状態", () => {
    it("口座がない場合にメッセージを表示する", () => {
      render(<MonthlyTab data={makeData()} yearMonth="2025-03" setYearMonth={vi.fn()} />);
      expect(screen.getByText("口座が登録されていません")).toBeInTheDocument();
    });

    it("クレジットカードがない場合にメッセージを表示する", () => {
      render(<MonthlyTab data={makeData()} yearMonth="2025-03" setYearMonth={vi.fn()} />);
      expect(screen.getByText("クレジットカードが登録されていません")).toBeInTheDocument();
    });
  });

  describe("月ナビゲーション", () => {
    it("年月を正しく表示する", () => {
      render(<MonthlyTab data={makeData()} yearMonth="2025-03" setYearMonth={vi.fn()} />);
      expect(screen.getByText("2025年3月")).toBeInTheDocument();
    });

    it("「前月」ボタンで setYearMonth が呼ばれる", () => {
      const setYearMonth = vi.fn();
      render(<MonthlyTab data={makeData()} yearMonth="2025-03" setYearMonth={setYearMonth} />);
      fireEvent.click(screen.getByLabelText("前月"));
      expect(setYearMonth).toHaveBeenCalled();
    });

    it("「翌月」ボタンで setYearMonth が呼ばれる", () => {
      const setYearMonth = vi.fn();
      render(<MonthlyTab data={makeData()} yearMonth="2025-03" setYearMonth={setYearMonth} />);
      fireEvent.click(screen.getByLabelText("翌月"));
      expect(setYearMonth).toHaveBeenCalled();
    });
  });

  describe("口座残高入力", () => {
    it("口座名と入力欄を表示する", () => {
      const data = makeData({
        accounts: [{ id: "acc1", name: "普通預金", balance: 100000 }],
      });
      render(<MonthlyTab data={data} yearMonth="2025-03" setYearMonth={vi.fn()} />);
      expect(screen.getByText("普通預金")).toBeInTheDocument();
      expect(screen.getByLabelText("普通預金の残高")).toBeInTheDocument();
    });

    it("残高入力後デバウンスで saveMonthly が呼ばれる", async () => {
      const data = makeData({
        accounts: [{ id: "acc1", name: "普通預金", balance: 100000 }],
      });
      render(<MonthlyTab data={data} yearMonth="2025-03" setYearMonth={vi.fn()} />);

      fireEvent.change(screen.getByLabelText("普通預金の残高"), {
        target: { value: "90000" },
      });

      // デバウンス (800ms) を進める
      await act(async () => {
        vi.advanceTimersByTime(1000);
      });

      expect(data.saveMonthly).toHaveBeenCalledWith(
        expect.objectContaining({ accountBalances: { acc1: 90000 } })
      );
    });
  });

  describe("カード支払額入力", () => {
    it("カード名と入力欄を表示する", () => {
      const data = makeData({
        creditCards: [{ id: "cc1", name: "楽天カード" }],
      });
      render(<MonthlyTab data={data} yearMonth="2025-03" setYearMonth={vi.fn()} />);
      expect(screen.getByText("楽天カード")).toBeInTheDocument();
      expect(screen.getByLabelText("楽天カードの支払額")).toBeInTheDocument();
    });

    it("カード支払額を入力するとデバウンスで saveMonthly が呼ばれる", async () => {
      const data = makeData({
        creditCards: [{ id: "cc1", name: "楽天カード" }],
      });
      render(<MonthlyTab data={data} yearMonth="2025-03" setYearMonth={vi.fn()} />);

      fireEvent.change(screen.getByLabelText("楽天カードの支払額"), {
        target: { value: "25000" },
      });

      await act(async () => {
        vi.advanceTimersByTime(1000);
      });

      expect(data.saveMonthly).toHaveBeenCalledWith(
        expect.objectContaining({ cardPayments: { cc1: 25000 } })
      );
    });
  });

  describe("保存済み表示", () => {
    it("保存成功後に「保存しました」が表示される", async () => {
      const data = makeData({
        accounts: [{ id: "acc1", name: "普通預金", balance: 100000 }],
      });
      render(<MonthlyTab data={data} yearMonth="2025-03" setYearMonth={vi.fn()} />);

      fireEvent.change(screen.getByLabelText("普通預金の残高"), {
        target: { value: "90000" },
      });

      await act(async () => {
        vi.advanceTimersByTime(1000);
      });

      expect(screen.getByText("保存しました")).toBeInTheDocument();
    });
  });
});
