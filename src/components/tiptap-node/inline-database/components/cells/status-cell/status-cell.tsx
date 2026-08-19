import { StatusCellDisplay } from "../../../primitives/status-cell-display";
import type { CellProps } from "../types";

export function StatusCell({
  value,
  onChange,
  config,
  unwrapped,
  className,
}: CellProps<"status">) {
  return (
    <div className={className} data-wrap={unwrapped ? "false" : "true"}>
      <StatusCellDisplay
        value={value}
        groups={config.groups}
        onChange={(item) => onChange(item.id)}
      />
    </div>
  );
}
