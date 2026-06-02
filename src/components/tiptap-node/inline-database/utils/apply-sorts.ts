import type { DataSourceRecord, SortRule } from "../types/types";
import { getCellValue } from "./apply-filters";

function compareValues(
  a: unknown,
  b: unknown,
  direction: "asc" | "desc",
): number {
  const mult = direction === "asc" ? 1 : -1;

  if (a == null && b == null) return 0;
  if (a == null) return mult;
  if (b == null) return -mult;

  if (typeof a === "boolean" && typeof b === "boolean") {
    return mult * (Number(a) - Number(b));
  }

  if (typeof a === "number" && typeof b === "number") {
    return mult * (a - b);
  }

  // Date strings
  const da = new Date(String(a));
  const db = new Date(String(b));
  if (!isNaN(da.getTime()) && !isNaN(db.getTime())) {
    return mult * (da.getTime() - db.getTime());
  }

  return mult * String(a).localeCompare(String(b));
}

/**
 * Returns a NEW sorted array (does not mutate). Use in the table render —
 * sort source.records before mapping. Reuses the same compareValues as
 * getSortOrder so the two stay consistent.
 */
export function sortRecords(
  records: DataSourceRecord[],
  sorts: SortRule[],
): DataSourceRecord[] {
  if (!sorts || sorts.length === 0) return records;
  return [...records].sort((a, b) => {
    for (const sort of sorts) {
      const av = getCellValue(a, sort.propertyId);
      const bv = getCellValue(b, sort.propertyId);
      const cmp = compareValues(av, bv, sort.direction);
      if (cmp !== 0) return cmp;
    }
    return 0;
  });
}

/**
 * Returns the CSS `order` value for this record given the active sorts.
 * Call in DatabaseRecordNodeView and apply to the NodeViewWrapper style.
 */
export function getSortOrder(
  record: DataSourceRecord,
  allRecords: DataSourceRecord[],
  sorts: SortRule[],
): number {
  if (!sorts || sorts.length === 0) return 0;
  const sorted = sortRecords(allRecords, sorts);
  return sorted.findIndex((r) => r.id === record.id);
}
