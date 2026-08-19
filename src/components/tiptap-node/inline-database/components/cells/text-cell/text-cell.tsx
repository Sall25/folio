import { memo } from "react";
import { TextCellDisplay } from "../../../primitives/text-cell-display";
import type { CellProps } from "../types";

function TextCellImpl({
  value,
  onChange,
  unwrapped,
  className,
}: CellProps<"text">) {
  return (
    <div className={className} data-wrap={unwrapped ? "false" : "true"}>
      <TextCellDisplay
        value={value || ""}
        onChange={onChange}
        placeholder="Add text..."
      />
    </div>
  );
}
export const TextCell = memo(TextCellImpl);
