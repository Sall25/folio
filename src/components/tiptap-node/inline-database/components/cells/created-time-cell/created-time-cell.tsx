import type { CellProps } from "../types";

export function CreatedTimeCell({ value }: CellProps<"created_time">) {
  return <span>{value}</span>;
}
