import { SelectCellDisplay } from "../../../primitives/select-cell-display";
import type { CellProps } from "../types";

export function SelectCell({
  value,
  onChange,
  readonly,
  config,
}: CellProps<"select">) {
  return (
    <SelectCellDisplay
      value={value}
      options={config.options ?? []}
      onChange={onChange}
      readonly={readonly}
    />
  );
}
