import { EmailCellDisplay } from "../../../primitives";
import type { CellProps } from "../types";

export function EmailCell({ value, onChange, readonly }: CellProps<"email">) {
  return (
    <div className="db-cell">
      <EmailCellDisplay
        value={value ?? ""}
        onChange={onChange}
        readonly={readonly}
      />
    </div>
  );
}
