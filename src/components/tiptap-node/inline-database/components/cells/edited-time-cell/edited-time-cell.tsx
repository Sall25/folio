import type { CellProps } from "../types";

export function EditedTimeCell({ value }: CellProps<"edited_time">) {
  return (
    <div className="db-cell">
      <span>{value}</span>
    </div>
  );
}
