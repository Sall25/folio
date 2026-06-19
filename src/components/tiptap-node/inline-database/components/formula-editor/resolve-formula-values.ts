import type {
  DatabaseProperty,
  Page,
  ID,
  ConfigOf,
  CellValue,
} from "src/types";
import { evaluateFormula } from "./formula-evaluator";

/**
 * Recomputes every formula property's value for the given records and writes
 * changed results back through `setCellValue`.
 *
 * DataSource model: records are plain `Page`s (values keyed by
 * propertyId via `record.values`), not ProseMirror nodes — so this no longer
 * walks the doc or runs a transaction. The owning data source persists writes.
 *
 * Should be called:
 *  - After the expression changes (FormulaEditor → handleDone)
 *  - After any cell value change a formula depends on
 */
export function resolveFormulaValues(
  records: Page[],
  properties: DatabaseProperty[],
  setCellValue: (recordId: ID, propertyId: ID, value: CellValue) => void,
): void {
  const formulaProps = properties.filter((p) => p.config.type === "formula");
  if (!formulaProps.length) return;

  for (const record of records) {
    // The evaluator consumes the per-property value map directly — the same
    // shape apply-filters / apply-sorts read (`record.values[propertyId]`).
    const cellValues = record.values as Record<string, CellValue>;

    for (const prop of formulaProps) {
      const config = prop.config as ConfigOf<"formula">;
      const result = evaluateFormula(config.expression, {
        properties,
        cellValues,
      }) as CellValue;

      if (record.values?.[prop.id] === result) continue; // skip if unchanged
      setCellValue(record.id, prop.id, result);
    }
  }
}
