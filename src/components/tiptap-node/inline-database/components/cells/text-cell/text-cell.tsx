import { TextCellDisplay } from "../../../primitives/text-cell-display";
import type { CellProps } from "../types";

export function TextCell({ value, onChange, unwrapped }: CellProps<"text">) {
  return (
    <div className="db-cell" data-wrap={unwrapped ? "false" : "true"}>
      <TextCellDisplay
        value={value || ""}
        onChange={onChange}
        placeholder="Add text..."
      />
    </div>
  );
}
