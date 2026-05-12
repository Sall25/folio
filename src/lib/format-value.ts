import type { NumberFormat } from "src/components/tiptap-node/inline-database/ui/number/number-format-dropdown/types";
import type { NumberDecimal } from "src/components/tiptap-node/inline-database/ui/number/number-decimal-dropdown/number-decimal-dropdown";

export function formatValue(
  value: number,
  format: NumberFormat,
  decimal: NumberDecimal,
): string {
  const fractionDigits = decimal;

  switch (format) {
    case "number":
      return new Intl.NumberFormat("en-US", {
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits,
      }).format(value);
    case "dollar":
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits,
      }).format(value);
    case "euro":
      return new Intl.NumberFormat("de-DE", {
        style: "currency",
        currency: "EUR",
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits,
      }).format(value);
    case "pound":
      return new Intl.NumberFormat("en-GB", {
        style: "currency",
        currency: "GBP",
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits,
      }).format(value);
    case "percent":
      return new Intl.NumberFormat("en-US", {
        style: "percent",
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits,
      }).format(value / 100);
    case "compact":
      return new Intl.NumberFormat("en-US", {
        notation: "compact",
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits,
      }).format(value);
    default:
      return String(value);
  }
}
