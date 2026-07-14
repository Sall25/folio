import type { CellValue, PropertyConfig } from "src/types";
import { PhoneCellDisplay } from "../../../primitives/phone-cell-display";

export function PhoneCell({
  value,
  onChange,
  readonly,
}: {
  value: CellValue<"phone"> | null;
  config: Extract<PropertyConfig, { type: "phone" }>;
  onChange: (value: CellValue<"phone"> | null) => void;
  readonly?: boolean;
}) {
  return (
    <div className="db-cell">
      <PhoneCellDisplay
        value={(value as string) ?? ""}
        onChange={(v) => onChange((v || null) as CellValue<"phone"> | null)}
        readonly={readonly}
      />
    </div>
  );
}
