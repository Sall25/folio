import type { Page, DatabaseProperty, SortRule } from "src/types";
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
 * Returns a NEW sorted array (does not mutate). Records ARE Pages — the old
 * DataSourceRecord type was a leftover from when records lived inside the
 * DataSource.
 */
export function sortRecords(
  records: Page[],
  sorts: SortRule[],
  properties?: DatabaseProperty[],
): Page[] {
  if (!sorts || sorts.length === 0) return records;
  return [...records].sort((a, b) => {
    for (const sort of sorts) {
      const av = getCellValue(a, sort.propertyId, properties);
      const bv = getCellValue(b, sort.propertyId, properties);
      const cmp = compareValues(av, bv, sort.direction);
      if (cmp !== 0) return cmp;
    }
    return 0;
  });
}
