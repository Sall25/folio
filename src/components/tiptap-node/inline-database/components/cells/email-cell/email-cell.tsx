import { EmailCellDisplay } from "../../../primitives";
import type { CellProps } from "../types";

export function EmailCell({
  value,
  onChange,
  readonly,
  unwrapped,
}: CellProps<"email">) {
  return (
    <div className="db-cell" data-wrap={unwrapped ? "false" : "true"}>
      <EmailCellDisplay
        value={value ?? ""}
        onChange={onChange}
        readonly={readonly}
      />
    </div>
  );
}
