import type { CellProps } from "../types";

export function EditedTimeCell({ value, unwrapped }: CellProps<"edited_time">) {
  return (
    <div className="db-cell" data-wrap={unwrapped ? "false" : "true"}>
      <span>{value}</span>
    </div>
  );
}
