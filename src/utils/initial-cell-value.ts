import type { CellValue, DatabaseProperty } from "../types";

// The initial cell value for a freshly-created row, per property type.
// This is the content-seeding-at-creation decision: what does an empty cell
// hold before the user touches it?
export function initialCellValue(property: DatabaseProperty): CellValue {
  switch (property.config.type) {
    case "relation":
      return []; // no linked records yet — empty id array
    case "rollup":
      return null; // computed/derived; nothing to seed
    case "checkbox":
      return false; // unchecked
    case "number":
      return null; // empty, NOT 0 — 0 is a real value, null = "no value"
    case "text":
    case "select":
    case "date":
      return null; // empty
    default:
      return null;
  }
}
