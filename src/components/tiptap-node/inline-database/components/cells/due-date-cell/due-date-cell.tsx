import { DateCellDisplay } from "../../../primitives/date-cell-display";
import type { CellProps } from "../types";

export function DueDateCell({
  value,
  onChange,
  config,
  readonly,
  unwrapped,
  className,
}: CellProps<"date">) {
  return (
    <div className={className} data-wrap={unwrapped ? "false" : "true"}>
      <DateCellDisplay
        value={value}
        onChange={onChange}
        format={config.format ?? "full"}
        timeFormat={config.timeFormat ?? "12h"}
        includeTime={config.includeTime ?? false}
        readonly={readonly}
      />
    </div>
  );
}
