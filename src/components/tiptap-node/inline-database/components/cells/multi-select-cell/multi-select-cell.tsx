import { MultiSelectCellDisplay } from "../../../primitives/multi-select-cell-display";
import type { CellProps } from "../types";

export function MultiSelectCell({
  value,
  onChange,
  config,
  readonly,
}: CellProps<"multi_select">) {
  return (
    <MultiSelectCellDisplay
      value={value ?? []}
      onChange={onChange}
      options={config.options}
      readonly={readonly}
    />
  );
}
