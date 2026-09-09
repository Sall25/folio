import type { CellValue, DatabaseProperty } from "src/types";
import { NONE_COLUMN_ID } from "../nodes/database-board-node-view/utils";

/** The cell value to store so a record lands in the given column. Inverse of
 *  columnKeyFor. For select/multi_select → the option object; status → item id;
 *  checkbox → boolean; value types → the raw string/number (best effort). */
export function groupValueForColumn(
  prop: DatabaseProperty,
  columnKey: string,
): CellValue | null {
  if (columnKey === NONE_COLUMN_ID) return null;
  const cfg = prop.config;

  if (cfg.type === "select") {
    return (cfg.options.find((o) => o.id === columnKey) ?? null) as CellValue;
  }
  if (cfg.type === "multi_select") {
    const opt = cfg.options.find((o) => o.id === columnKey);
    return (opt ? [opt] : []) as CellValue; // replace with single option
  }
  if (cfg.type === "status") {
    // status stores the item id; columnKey IS the item id
    return columnKey as CellValue;
  }
  if (cfg.type === "checkbox") {
    return (columnKey === "true") as CellValue;
  }
  if (cfg.type === "number") {
    const n = Number(columnKey);
    return (isNaN(n) ? null : n) as CellValue;
  }
  // text/url/email/phone → the raw string; date → the ISO day (best effort)
  return columnKey as CellValue;
}
