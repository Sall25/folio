import { CheckboxCellDisplay } from "../../../primitives/checkbox-cell-display";
import type { CellProps } from "../types";

export function CheckboxCell({
  value,
  onChange,
  readonly,
  unwrapped,
}: CellProps<"checkbox">) {
  return (
    <div className="db-cell" data-wrap={unwrapped ? "false" : "true"}>
      <CheckboxCellDisplay
        value={value as boolean}
        onChange={() => onChange(!value)}
        readonly={readonly}
      />
    </div>
  );
}
