import { SelectCellDisplay } from "../../../primitives/select-cell-display";
import type { CellProps } from "../types";

export function SelectCell({
  value,
  onChange,
  readonly,
  config,
  unwrapped,
  className,
}: CellProps<"select">) {
  return (
    <div className={className} data-wrap={unwrapped ? "false" : "true"}>
      <SelectCellDisplay
        value={value}
        options={config.options ?? []}
        onChange={onChange}
        readonly={readonly}
      />
    </div>
  );
}
