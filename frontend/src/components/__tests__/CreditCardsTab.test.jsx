import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import CreditCardsTab from "../CreditCardsTab";

vi.mock("../../hooks/useToast", () => ({
  useToast: () => vi.fn(),
}));

function makeData(overrides = {}) {
  return {
    accounts: [{ id: "acc1", name: "普通預金" }],
    creditCards: [],
    addCreditCard: vi.fn().mockResolvedValue({ id: "cc1", name: "テストカード" }),
    editCreditCard: vi.fn().mockResolvedValue({}),
    removeCreditCard: vi.fn().mockResolvedValue({}),
    ...overrides,
  };
}

describe("CreditCardsTab", () => {
  describe("空状態", () => {
    it("カードがない場合に空状態メッセージを表示する", () => {
      render(<CreditCardsTab data={makeData()} />);
      expect(screen.getByText("クレジットカードを追加してください")).toBeInTheDocument();
    });
  });

  describe("カード一覧", () => {
    it("カード名を表示する", () => {
      const data = makeData({
        creditCards: [{ id: "cc1", name: "楽天カード", accountId: "acc1" }],
      });
      render(<CreditCardsTab data={data} />);
      expect(screen.getByText("楽天カード")).toBeInTheDocument();
    });

    it("引落口座名を表示する", () => {
      const data = makeData({
        creditCards: [{ id: "cc1", name: "楽天カード", accountId: "acc1" }],
      });
      render(<CreditCardsTab data={data} />);
      expect(screen.getByText(/普通預金/)).toBeInTheDocument();
    });
  });

  describe("カード追加", () => {
    it("「+ 追加」ボタンをクリックするとモーダルが開く", () => {
      render(<CreditCardsTab data={makeData()} />);
      fireEvent.click(screen.getByText("+ 追加"));
      expect(screen.getByText("カードを追加")).toBeInTheDocument();
    });

    it("フォーム送信で addCreditCard が呼ばれる", async () => {
      const data = makeData();
      render(<CreditCardsTab data={data} />);
      fireEvent.click(screen.getByText("+ 追加"));
      fireEvent.change(screen.getByLabelText(/カード名/), {
        target: { value: "新しいカード" },
      });
      fireEvent.submit(screen.getByRole("dialog").querySelector("form"));

      await waitFor(() => {
        expect(data.addCreditCard).toHaveBeenCalledWith(
          expect.objectContaining({ name: "新しいカード" })
        );
      });
    });
  });

  describe("カード削除", () => {
    it("削除確認で OK を押すと removeCreditCard が呼ばれる", async () => {
      vi.spyOn(window, "confirm").mockReturnValue(true);
      const data = makeData({
        creditCards: [{ id: "cc1", name: "楽天カード", accountId: "acc1" }],
      });
      render(<CreditCardsTab data={data} />);
      fireEvent.click(screen.getByText("削除"));

      await waitFor(() => {
        expect(data.removeCreditCard).toHaveBeenCalledWith("cc1");
      });
      vi.restoreAllMocks();
    });
  });
});
