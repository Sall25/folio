import type {
  DatabaseProperty,
  ConfigOf,
  CellValue,
  Page,
  ID,
} from "src/types";
import { evaluateFormula } from "../components/tiptap-node/inline-database/components/formula-editor/formula-evaluator";

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

/**
 * Returns a copy of `rows` (pages) with every formula property's value computed
 * into `page.values[formulaId]`. Formula values are derived, not persisted, so
 * the filter/sort/group pipeline must run on resolved rows.
 */
export function resolveRecordFormulas(
  rows: Page[],
  properties: DatabaseProperty[],
): Page[] {
  const formulaProps = properties.filter((p) => p.config.type === "formula");
  if (!formulaProps.length) return rows;

  return rows.map((row) => {
    const values: Record<ID, CellValue> = { ...(row.values ?? {}) };
    for (const prop of formulaProps) {
      const config = prop.config as ConfigOf<"formula">;
      values[prop.id] = evaluateFormula(config.expression, {
        properties,
        cellValues: values as Record<string, CellValue>,
      });
    }
    return { ...row, values };
  });
}
