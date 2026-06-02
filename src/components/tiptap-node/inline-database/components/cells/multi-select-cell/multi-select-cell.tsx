import { MultiSelectCellDisplay } from "../../../primitives/multi-select-cell-display";
import type { CellProps } from "../types";

export function MultiSelectCell({
  value,
  onChange,
  config,
  readonly,
  unwrapped,
}: CellProps<"multi_select">) {
  return (
    <div className="db-cell" data-wrap={unwrapped ? "false" : "true"}>
      <MultiSelectCellDisplay
        value={value ?? []}
        onChange={onChange}
        options={config.options ?? []}
        readonly={readonly}
      />
    </div>
  );
}
