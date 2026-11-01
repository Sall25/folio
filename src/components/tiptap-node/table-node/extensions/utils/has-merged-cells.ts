import type { Node as PMNode } from "@tiptap/pm/model";

/** Whether any cell of the table spans several rows or columns. Moving,
 *  sorting or duplicating rows and columns cell by cell would tear such a
 *  table apart, so those commands do nothing on it (and their menu items
 *  hide). */
export function hasMergedCells(table: PMNode): boolean {
  let merged = false;
  table.forEach((row) => {
    row.forEach((cell) => {
      if ((cell.attrs.colspan ?? 1) > 1 || (cell.attrs.rowspan ?? 1) > 1) {
        merged = true;
      }
    });
  });
  return merged;
}
