import { NumberCellDisplay } from "../../../primitives/number-cell-display";
import type { CellProps } from "../types";

export function NumberCell({
  value,
  config,
  onChange,
  columnValues,
  readonly,
}: CellProps<"number">) {
  const max =
    columnValues?.reduce<number>((m, v) => (v != null && v > m ? v : m), 0) ??
    0;

  return (
    <NumberCellDisplay
      value={value}
      onChange={onChange}
      format={config.format}
      prefix={config.prefix}
      suffix={config.suffix}
      decimalPlaces={config.decimalPlaces}
      showAs={config.showAs}
      max={max}
      readonly={readonly}
    />
  );
}
