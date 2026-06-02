import type { CellProps } from "../types";

export function CreatedTimeCell({
  value,
  unwrapped,
}: CellProps<"created_time">) {
  return (
    <div className="db-cell" data-wrap={unwrapped ? "false" : "true"}>
      {" "}
      <span>{value}</span>
    </div>
  );
}
