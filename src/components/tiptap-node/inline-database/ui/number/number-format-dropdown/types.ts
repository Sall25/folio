export type NumberFormat =
  | "number"
  | "dollar"
  | "euro"
  | "pound"
  | "percent"
  | "decimal"
  | "compact";

export interface NumberFormatDropdownProps {
  format: NumberFormat;
  onSelect: (format: NumberFormat) => void;
}
