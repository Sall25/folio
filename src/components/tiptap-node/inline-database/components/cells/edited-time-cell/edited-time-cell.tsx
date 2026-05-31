import type { CellProps } from "../types";

export function EditedTimeCell({ value }: CellProps<"edited_time">) {
  return <span>{value}</span>;
}
