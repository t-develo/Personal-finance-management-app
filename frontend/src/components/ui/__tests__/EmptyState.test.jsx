import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import EmptyState from "../EmptyState";

describe("EmptyState", () => {
  describe("レンダリング", () => {
    it("指定したメッセージを表示する", () => {
      render(<EmptyState message="データがありません" />);

      expect(screen.getByText("データがありません")).toBeInTheDocument();
    });

    it("指定したアイコンを表示する", () => {
      render(<EmptyState icon="🏦" message="口座なし" />);

      expect(screen.getByText("🏦")).toBeInTheDocument();
    });

    it("アイコン未指定の場合はデフォルトアイコン（📭）を表示する", () => {
      render(<EmptyState message="データがありません" />);

      expect(screen.getByText("📭")).toBeInTheDocument();
    });

    it("メッセージ未指定の場合はデフォルトメッセージを表示する", () => {
      render(<EmptyState />);

      expect(screen.getByText("データがありません")).toBeInTheDocument();
    });
  });
});
