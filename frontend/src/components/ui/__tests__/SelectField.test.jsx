import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import SelectField from "../SelectField";

const sampleOptions = [
  { value: "", label: "選択してください" },
  { value: "acc1", label: "普通預金" },
  { value: "acc2", label: "定期預金" },
];

describe("SelectField", () => {
  describe("レンダリング", () => {
    it("ラベルを表示する", () => {
      render(
        <SelectField
          label="引落口座"
          value=""
          onChange={() => {}}
          options={sampleOptions}
        />
      );

      expect(screen.getByText("引落口座")).toBeInTheDocument();
    });

    it("すべての選択肢を表示する", () => {
      render(
        <SelectField
          label="引落口座"
          value=""
          onChange={() => {}}
          options={sampleOptions}
        />
      );

      expect(screen.getByText("選択してください")).toBeInTheDocument();
      expect(screen.getByText("普通預金")).toBeInTheDocument();
      expect(screen.getByText("定期預金")).toBeInTheDocument();
    });

    it("指定された値が選択された状態で表示する", () => {
      render(
        <SelectField
          label="引落口座"
          value="acc1"
          onChange={() => {}}
          options={sampleOptions}
        />
      );

      expect(screen.getByRole("combobox")).toHaveValue("acc1");
    });
  });

  describe("ユーザー操作", () => {
    it("選択肢を変更したとき onChangeを選択値で呼び出す", async () => {
      const handleChange = vi.fn();
      const user = userEvent.setup();

      render(
        <SelectField
          label="引落口座"
          value=""
          onChange={handleChange}
          options={sampleOptions}
        />
      );

      await user.selectOptions(screen.getByRole("combobox"), "acc2");

      expect(handleChange).toHaveBeenCalledWith("acc2");
    });
  });

  describe("選択肢が空の場合", () => {
    it("選択肢なしでも正常に描画される", () => {
      render(
        <SelectField label="引落口座" value="" onChange={() => {}} options={[]} />
      );

      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });
  });
});
