import type { CellProps } from "../types";
import type { FormulaCellAttrs } from "src/types";

function formatValue(value: FormulaCellAttrs["value"]): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "☑" : "☐";
  return String(value);
}

export function FormulaCell({ value, unwrapped }: CellProps<"formula">) {
  const isEmpty = value === null || value === undefined || value === "";

  return (
    <div className="db-cell" data-wrap={unwrapped ? "false" : "true"}>
      <span className="formula-cell__value" data-empty={isEmpty}>
        {isEmpty ? "" : formatValue(value)}
      </span>
    </div>
  );
}
