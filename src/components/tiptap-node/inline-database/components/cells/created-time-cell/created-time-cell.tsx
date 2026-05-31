import type { CellProps } from "../types";

export function CreatedTimeCell({ value }: CellProps<"created_time">) {
  return (
    <div className="db-cell">
      {" "}
      <span>{value}</span>
    </div>
  );
}
