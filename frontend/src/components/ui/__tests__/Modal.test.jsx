import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import Modal from "../Modal";

describe("Modal", () => {
  describe("レンダリング", () => {
    it("タイトルを表示する", () => {
      render(
        <Modal title="口座を追加" onClose={() => {}} onSubmit={() => {}}>
          <div>コンテンツ</div>
        </Modal>
      );

      expect(screen.getByText("口座を追加")).toBeInTheDocument();
    });

    it("子要素（フォームコンテンツ）を表示する", () => {
      render(
        <Modal title="テスト" onClose={() => {}} onSubmit={() => {}}>
          <input type="text" aria-label="テスト入力" />
        </Modal>
      );

      expect(screen.getByRole("textbox", { name: "テスト入力" })).toBeInTheDocument();
    });

    it("デフォルトの送信ボタンラベルは「保存」である", () => {
      render(
        <Modal title="テスト" onClose={() => {}} onSubmit={() => {}}>
          <div />
        </Modal>
      );

      expect(screen.getByRole("button", { name: "保存" })).toBeInTheDocument();
    });

    it("submitLabelを指定した場合は送信ボタンに反映する", () => {
      render(
        <Modal
          title="テスト"
          onClose={() => {}}
          onSubmit={() => {}}
          submitLabel="作成"
        >
          <div />
        </Modal>
      );

      expect(screen.getByRole("button", { name: "作成" })).toBeInTheDocument();
    });

    it("キャンセルボタンを表示する", () => {
      render(
        <Modal title="テスト" onClose={() => {}} onSubmit={() => {}}>
          <div />
        </Modal>
      );

      expect(screen.getByRole("button", { name: "キャンセル" })).toBeInTheDocument();
    });

    it("閉じるボタン（✕）を表示する", () => {
      render(
        <Modal title="テスト" onClose={() => {}} onSubmit={() => {}}>
          <div />
        </Modal>
      );

      expect(screen.getByRole("button", { name: "閉じる" })).toBeInTheDocument();
    });
  });

  describe("ユーザー操作", () => {
    it("キャンセルボタンを押すと onCloseが呼ばれる", async () => {
      const handleClose = vi.fn();
      const user = userEvent.setup();

      render(
        <Modal title="テスト" onClose={handleClose} onSubmit={() => {}}>
          <div />
        </Modal>
      );

      await user.click(screen.getByRole("button", { name: "キャンセル" }));

      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it("閉じるボタン（✕）を押すと onCloseが呼ばれる", async () => {
      const handleClose = vi.fn();
      const user = userEvent.setup();

      render(
        <Modal title="テスト" onClose={handleClose} onSubmit={() => {}}>
          <div />
        </Modal>
      );

      await user.click(screen.getByRole("button", { name: "閉じる" }));

      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it("オーバーレイ部分をクリックすると onCloseが呼ばれる", async () => {
      const handleClose = vi.fn();
      const user = userEvent.setup();

      const { container } = render(
        <Modal title="テスト" onClose={handleClose} onSubmit={() => {}}>
          <div />
        </Modal>
      );

      // オーバーレイ（最外層div）をクリック
      await user.click(container.firstChild);

      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it("フォームを送信すると onSubmitが呼ばれる", async () => {
      const handleSubmit = vi.fn();
      const user = userEvent.setup();

      render(
        <Modal title="テスト" onClose={() => {}} onSubmit={handleSubmit}>
          <div />
        </Modal>
      );

      await user.click(screen.getByRole("button", { name: "保存" }));

      expect(handleSubmit).toHaveBeenCalledTimes(1);
    });

    it("Escapeキーを押すと onCloseが呼ばれる", async () => {
      const handleClose = vi.fn();
      const user = userEvent.setup();

      render(
        <Modal title="テスト" onClose={handleClose} onSubmit={() => {}}>
          <div />
        </Modal>
      );

      await user.keyboard("{Escape}");

      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });
});
