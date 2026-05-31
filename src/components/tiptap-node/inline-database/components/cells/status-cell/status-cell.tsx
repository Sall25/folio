import { StatusCellDisplay } from "../../../primitives/status-cell-display";
import type { CellProps } from "../types";

export function StatusCell({ value, onChange, config }: CellProps<"status">) {
  return (
    <StatusCellDisplay
      value={value}
      groups={config.groups}
      onChange={(item) => onChange(item.id)}
    />
  );
}
