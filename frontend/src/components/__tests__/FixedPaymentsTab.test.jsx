import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import FixedPaymentsTab from "../FixedPaymentsTab";

vi.mock("../../hooks/useToast", () => ({
  useToast: () => vi.fn(),
}));

function makeData(overrides = {}) {
  return {
    accounts: [{ id: "acc1", name: "普通預金" }],
    fixedPayments: [],
    addFixedPayment: vi.fn().mockResolvedValue({ id: "fp1" }),
    editFixedPayment: vi.fn().mockResolvedValue({}),
    removeFixedPayment: vi.fn().mockResolvedValue({}),
    ...overrides,
  };
}

describe("FixedPaymentsTab", () => {
  describe("空状態", () => {
    it("固定支払いがない場合に空状態メッセージを表示する", () => {
      render(<FixedPaymentsTab data={makeData()} />);
      expect(screen.getByText("固定支払いを追加してください")).toBeInTheDocument();
    });
  });

  describe("固定支払い一覧", () => {
    it("固定支払い名と金額を表示する", () => {
      const data = makeData({
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
      });
      render(<FixedPaymentsTab data={data} />);
      expect(screen.getByText("家賃")).toBeInTheDocument();
      expect(screen.getByText("¥80,000")).toBeInTheDocument();
    });

    it("引落口座名を表示する", () => {
      const data = makeData({
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
      });
      render(<FixedPaymentsTab data={data} />);
      expect(screen.getByText(/普通預金/)).toBeInTheDocument();
    });
  });

  describe("固定支払い追加", () => {
    it("「+ 追加」ボタンでモーダルが開く", () => {
      render(<FixedPaymentsTab data={makeData()} />);
      fireEvent.click(screen.getByText("+ 追加"));
      expect(screen.getByText("固定支払いを追加")).toBeInTheDocument();
    });

    it("フォーム送信で addFixedPayment が呼ばれる", async () => {
      const data = makeData();
      render(<FixedPaymentsTab data={data} />);
      fireEvent.click(screen.getByText("+ 追加"));
      fireEvent.change(screen.getByLabelText(/項目名/), {
        target: { value: "電気代" },
      });
      fireEvent.submit(screen.getByRole("dialog").querySelector("form"));

      await waitFor(() => {
        expect(data.addFixedPayment).toHaveBeenCalledWith(
          expect.objectContaining({ name: "電気代" })
        );
      });
    });
  });

  describe("固定支払い削除", () => {
    it("削除確認で OK を押すと removeFixedPayment が呼ばれる", async () => {
      vi.spyOn(window, "confirm").mockReturnValue(true);
      const data = makeData({
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
      });
      render(<FixedPaymentsTab data={data} />);
      fireEvent.click(screen.getByText("削除"));

      await waitFor(() => {
        expect(data.removeFixedPayment).toHaveBeenCalledWith("fp1");
      });
      vi.restoreAllMocks();
    });
  });
});
