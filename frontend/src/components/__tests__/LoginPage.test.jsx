import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import LoginPage from "../LoginPage";

vi.mock("../../api/client", () => ({
  registerOwner: vi.fn(),
  login: vi.fn(),
}));

describe("LoginPage", () => {
  describe("ログインモード", () => {
    it("ログインフォームを表示する", () => {
      render(<LoginPage isRegistration={false} onSuccess={() => {}} />);
      expect(
        screen.getByText("パスワードを入力してログイン")
      ).toBeInTheDocument();
      expect(screen.getByText("ログイン")).toBeInTheDocument();
    });

    it("パスワード確認フィールドを表示しない", () => {
      render(<LoginPage isRegistration={false} onSuccess={() => {}} />);
      expect(
        screen.queryByPlaceholderText("もう一度入力")
      ).not.toBeInTheDocument();
    });

    it("パスワード入力フィールドを表示する", () => {
      render(<LoginPage isRegistration={false} onSuccess={() => {}} />);
      expect(screen.getByPlaceholderText("8文字以上")).toBeInTheDocument();
    });
  });

  describe("登録モード", () => {
    it("登録フォームを表示する", () => {
      render(<LoginPage isRegistration={true} onSuccess={() => {}} />);
      expect(screen.getByText(/初回セットアップ/)).toBeInTheDocument();
      expect(screen.getByText("パスワードを設定")).toBeInTheDocument();
    });

    it("パスワード確認フィールドを表示する", () => {
      render(<LoginPage isRegistration={true} onSuccess={() => {}} />);
      expect(
        screen.getByPlaceholderText("もう一度入力")
      ).toBeInTheDocument();
    });
  });

  describe("共通", () => {
    it("アプリタイトルを表示する", () => {
      render(<LoginPage isRegistration={false} onSuccess={() => {}} />);
      expect(screen.getByText("家計管理")).toBeInTheDocument();
    });
  });
});
