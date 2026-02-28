import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import InputField from "../InputField";

describe("InputField", () => {
  describe("レンダリング", () => {
    it("ラベルを表示する", () => {
      render(
        <InputField label="口座名" value="" onChange={() => {}} />
      );

      expect(screen.getByText("口座名")).toBeInTheDocument();
    });

    it("指定された値を入力欄に表示する", () => {
      render(
        <InputField label="残高" type="number" value="50000" onChange={() => {}} />
      );

      expect(screen.getByDisplayValue("50000")).toBeInTheDocument();
    });

    it("プレースホルダーを表示する", () => {
      render(
        <InputField
          label="口座名"
          value=""
          onChange={() => {}}
          placeholder="例: 普通預金"
        />
      );

      expect(
        screen.getByPlaceholderText("例: 普通預金")
      ).toBeInTheDocument();
    });

    it("type属性を正しく設定する", () => {
      render(
        <InputField label="金額" type="number" value="0" onChange={() => {}} />
      );

      expect(screen.getByRole("spinbutton")).toBeInTheDocument();
    });

    it("type指定がない場合はtextタイプになる", () => {
      render(
        <InputField label="名前" value="" onChange={() => {}} />
      );

      expect(screen.getByRole("textbox")).toBeInTheDocument();
    });
  });

  describe("ユーザー操作", () => {
    it("入力値が変更されたとき onChangeを入力値で呼び出す", async () => {
      const handleChange = vi.fn();
      const user = userEvent.setup();

      render(
        <InputField label="口座名" value="" onChange={handleChange} />
      );

      // 1文字入力して onChange が呼ばれることを確認
      // (controlled componentのため value prop が更新されない限り蓄積されない)
      await user.type(screen.getByRole("textbox"), "a");

      expect(handleChange).toHaveBeenCalledWith("a");
    });
  });

  describe("バリデーション属性", () => {
    it("required属性が設定されている場合は必須入力になる", () => {
      render(
        <InputField label="口座名" value="" onChange={() => {}} required />
      );

      expect(screen.getByRole("textbox")).toBeRequired();
    });

    it("step属性を正しく設定する", () => {
      render(
        <InputField
          label="金額"
          type="number"
          value="0"
          onChange={() => {}}
          step="1000"
        />
      );

      expect(screen.getByRole("spinbutton")).toHaveAttribute("step", "1000");
    });
  });
});
