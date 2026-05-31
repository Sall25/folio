import { CheckboxCellDisplay } from "../../../primitives/checkbox-cell-display";
import type { CellProps } from "../types";

export function CheckboxCell({
  value,
  onChange,
  readonly,
}: CellProps<"checkbox">) {
  return (
    <CheckboxCellDisplay
      value={value as boolean}
      onChange={() => onChange(!value)}
      readonly={readonly}
    />
  );
}
