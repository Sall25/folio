import type {
  DatabaseProperty,
  DataSourceRecord,
  ConfigOf,
  CellValue,
} from "../../types/types";
import { evaluateFormula } from "./formula-evaluator";

/**
 * Returns a copy of `records` with every formula property's value computed
 * into `record.values[formulaId]`.
 *
 * Formula values are derived (computed at render), not persisted — so the
 * filter / sort / group pipeline must run on *resolved* records, or it
 * compares against stale/empty stored values. Call this once at the top of
 * the render pipeline, before applyFilters / applySorts / grouping.
 *
 * Each formula is evaluated against the record's own raw values. (Formulas
 * that reference other formula columns would need topological resolution;
 * that's not handled here — flag if you need it.)
 */
export function resolveRecordFormulas(
  records: DataSourceRecord[],
  properties: DatabaseProperty[],
): DataSourceRecord[] {
  const formulaProps = properties.filter((p) => p.config.type === "formula");
  if (!formulaProps.length) return records;

  return records.map((record) => {
    const values = { ...record.values };
    for (const prop of formulaProps) {
      const config = prop.config as ConfigOf<"formula">;
      values[prop.id] = evaluateFormula(config.expression, {
        properties,
        cellValues: record.values as Record<string, CellValue>,
      });
    }
    return { ...record, values };
  });
}
