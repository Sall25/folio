import { NumberCellDisplay } from "../../../primitives/number-cell-display";
import type { CellProps } from "../types";

export function NumberCell({
  value,
  config,
  onChange,
  columnValues,
  readonly,
  unwrapped,
  align,
  className,
}: CellProps<"number"> & { align?: "left" | "right" }) {
  const max =
    columnValues?.reduce<number>((m, v) => (v != null && v > m ? v : m), 0) ??
    0;

  return (
    <div className={className} data-wrap={unwrapped ? "false" : "true"}>
      <NumberCellDisplay
        value={value ?? 0}
        onChange={onChange}
        format={config.format}
        prefix={config.prefix}
        suffix={config.suffix}
        decimalPlaces={config.decimalPlaces}
        showAs={config.showAs}
        max={max}
        readonly={readonly}
        align={align}
      />
    </div>
  );
}
