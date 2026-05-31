import { DateCellDisplay } from "../../../primitives/date-cell-display";
import type { CellProps } from "../types";

export function DueDateCell({
  value,
  onChange,
  config,
  readonly,
}: CellProps<"date">) {
  return (
    <DateCellDisplay
      value={value}
      onChange={onChange}
      format={config.format ?? "full"}
      timeFormat={config.timeFormat ?? "12h"}
      includeTime={config.includeTime ?? false}
      readonly={readonly}
    />
  );
}
