import type { CellValue } from "src/types";
import { PhoneCellDisplay } from "../../../primitives/phone-cell-display";
import type { CellProps } from "../types";

export function PhoneCell({
  value,
  onChange,
  readonly,
  className,
}: CellProps<"phone">) {
  return (
    <div className={className}>
      <PhoneCellDisplay
        value={(value as string) ?? ""}
        onChange={(v) => onChange((v || null) as CellValue<"phone"> | null)}
        readonly={readonly}
      />
    </div>
  );
}
