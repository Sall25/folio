import type { CellProps } from "../types";
import type { FormulaCellAttrs } from "../../../types/types";

function formatValue(value: FormulaCellAttrs["value"]): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "☑" : "☐";
  return String(value);
}

export function FormulaCell({ value }: CellProps<"formula">) {
  const isEmpty = value === null || value === undefined || value === "";

  return (
    <div className="db-cell">
      <span className="formula-cell__value" data-empty={isEmpty}>
        {isEmpty ? "" : formatValue(value)}
      </span>
    </div>
  );
}
