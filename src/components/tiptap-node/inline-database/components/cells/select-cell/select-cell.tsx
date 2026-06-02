import { SelectCellDisplay } from "../../../primitives/select-cell-display";
import type { CellProps } from "../types";

export function SelectCell({
  value,
  onChange,
  readonly,
  config,
  unwrapped,
}: CellProps<"select">) {
  return (
    <div className="db-cell" data-wrap={unwrapped ? "false" : "true"}>
      <SelectCellDisplay
        value={value}
        options={config.options ?? []}
        onChange={onChange}
        readonly={readonly}
      />
    </div>
  );
}
