import { EmailCellDisplay } from "../../../primitives";
import type { CellProps } from "../types";

export function EmailCell({ value, onChange, readonly }: CellProps<"email">) {
  return (
    <EmailCellDisplay
      value={value ?? ""}
      onChange={onChange}
      readonly={readonly}
    />
  );
}
