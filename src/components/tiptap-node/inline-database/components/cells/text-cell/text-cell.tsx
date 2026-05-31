import { TextCellDisplay } from "../../../primitives/text-cell-display";
import type { CellProps } from "../types";

export function TextCell({ value, onChange }: CellProps<"text">) {
  return (
    <TextCellDisplay
      value={value || "Add text..."}
      onChange={onChange}
      placeholder="Add text..."
    />
  );
}
