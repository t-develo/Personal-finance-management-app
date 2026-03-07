import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import AccountsTab from "../AccountsTab";

// useToast のモック
vi.mock("../../hooks/useToast", () => ({
  useToast: () => vi.fn(),
}));

function makeData(overrides = {}) {
  return {
    accounts: [],
    addAccount: vi.fn().mockResolvedValue({ id: "acc1", name: "テスト口座", balance: 0 }),
    editAccount: vi.fn().mockResolvedValue({}),
    removeAccount: vi.fn().mockResolvedValue({}),
    ...overrides,
  };
}

describe("AccountsTab", () => {
  describe("空状態", () => {
    it("口座がない場合に空状態メッセージを表示する", () => {
      render(<AccountsTab data={makeData()} />);
      expect(screen.getByText("口座を追加してください")).toBeInTheDocument();
    });
  });

  describe("口座一覧", () => {
    it("口座名と残高を表示する", () => {
      const data = makeData({
        accounts: [{ id: "acc1", name: "普通預金", balance: 100000 }],
      });
      render(<AccountsTab data={data} />);
      expect(screen.getByText("普通預金")).toBeInTheDocument();
      expect(screen.getByText("¥100,000")).toBeInTheDocument();
    });

    it("複数の口座をすべて表示する", () => {
      const data = makeData({
        accounts: [
          { id: "acc1", name: "普通預金", balance: 100000 },
          { id: "acc2", name: "定期預金", balance: 500000 },
        ],
      });
      render(<AccountsTab data={data} />);
      expect(screen.getByText("普通預金")).toBeInTheDocument();
      expect(screen.getByText("定期預金")).toBeInTheDocument();
    });
  });

  describe("口座追加", () => {
    it("「+ 追加」ボタンをクリックするとモーダルが開く", () => {
      render(<AccountsTab data={makeData()} />);
      fireEvent.click(screen.getByText("+ 追加"));
      expect(screen.getByText("口座を追加")).toBeInTheDocument();
    });

    it("フォーム送信で addAccount が呼ばれる", async () => {
      const data = makeData();
      render(<AccountsTab data={data} />);
      fireEvent.click(screen.getByText("+ 追加"));

      fireEvent.change(screen.getByLabelText(/口座名/), {
        target: { value: "新しい口座" },
      });
      fireEvent.submit(screen.getByRole("dialog").querySelector("form"));

      await waitFor(() => {
        expect(data.addAccount).toHaveBeenCalledWith(
          expect.objectContaining({ name: "新しい口座" })
        );
      });
    });

    it("送信中はモーダルの保存ボタンが無効になる", async () => {
      let resolveAdd;
      const addAccount = vi.fn(
        () => new Promise((resolve) => { resolveAdd = resolve; })
      );
      const data = makeData({ addAccount });
      render(<AccountsTab data={data} />);
      fireEvent.click(screen.getByText("+ 追加"));
      await act(async () => {
        fireEvent.submit(screen.getByRole("dialog").querySelector("form"));
      });

      expect(screen.getByRole("button", { name: /保存中/ })).toBeDisabled();
      await act(async () => { resolveAdd({}); });
    });
  });

  describe("口座編集", () => {
    it("「編集」ボタンをクリックするとモーダルが開き既存値が入力されている", () => {
      const data = makeData({
        accounts: [{ id: "acc1", name: "普通預金", balance: 100000 }],
      });
      render(<AccountsTab data={data} />);
      fireEvent.click(screen.getByText("編集"));
      expect(screen.getByText("口座を編集")).toBeInTheDocument();
      expect(screen.getByLabelText(/口座名/).value).toBe("普通預金");
    });

    it("編集フォーム送信で editAccount が呼ばれる", async () => {
      const data = makeData({
        accounts: [{ id: "acc1", name: "普通預金", balance: 100000 }],
      });
      render(<AccountsTab data={data} />);
      fireEvent.click(screen.getByText("編集"));
      fireEvent.submit(screen.getByRole("dialog").querySelector("form"));

      await waitFor(() => {
        expect(data.editAccount).toHaveBeenCalledWith(
          "acc1",
          expect.objectContaining({ name: "普通預金" })
        );
      });
    });
  });

  describe("口座削除", () => {
    it("削除確認ダイアログで OK を押すと removeAccount が呼ばれる", async () => {
      vi.spyOn(window, "confirm").mockReturnValue(true);
      const data = makeData({
        accounts: [{ id: "acc1", name: "普通預金", balance: 100000 }],
      });
      render(<AccountsTab data={data} />);
      fireEvent.click(screen.getByText("削除"));

      await waitFor(() => {
        expect(data.removeAccount).toHaveBeenCalledWith("acc1");
      });
      vi.restoreAllMocks();
    });

    it("削除確認ダイアログでキャンセルすると removeAccount が呼ばれない", () => {
      vi.spyOn(window, "confirm").mockReturnValue(false);
      const data = makeData({
        accounts: [{ id: "acc1", name: "普通預金", balance: 100000 }],
      });
      render(<AccountsTab data={data} />);
      fireEvent.click(screen.getByText("削除"));

      expect(data.removeAccount).not.toHaveBeenCalled();
      vi.restoreAllMocks();
    });
  });
});
