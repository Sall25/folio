import type { Node } from "@tiptap/pm/model";
import type { SortRule } from "../types/types";

function getCellValue(record: Node, propertyId: string): unknown {
  let value: unknown = null;
  record.forEach((cell) => {
    if (cell.attrs.propertyId !== propertyId) return;
    value =
      cell.type.name === "textCell"
        ? (cell.attrs.value ?? cell.textContent)
        : cell.attrs.value;
  });
  return value;
}

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
 * Returns the CSS `order` value for this record given the active sorts.
 * Call in DatabaseRecordNodeView and apply to the NodeViewWrapper style.
 */
export function getSortOrder(
  record: Node,
  allRecords: Node[],
  sorts: SortRule[],
): number {
  if (!sorts || sorts.length === 0) return 0;

  const sorted = [...allRecords].sort((a, b) => {
    for (const sort of sorts) {
      const av = getCellValue(a, sort.propertyId);
      const bv = getCellValue(b, sort.propertyId);
      const cmp = compareValues(av, bv, sort.direction);
      if (cmp !== 0) return cmp;
    }
    return 0;
  });

  return sorted.findIndex((r) => r.attrs.id === record.attrs.id);
}
